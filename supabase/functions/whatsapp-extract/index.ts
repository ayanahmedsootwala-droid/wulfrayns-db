// RPM Motors — WhatsApp Message AI Extraction
// Uses user's own GEMINI_API_KEY (direct Google API) or falls back to INTEGRATIONS_API_KEY (platform gateway)
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY   = Deno.env.get("GEMINI_API_KEY");
const GATEWAY_KEY      = Deno.env.get("INTEGRATIONS_API_KEY");

// Use user's key direct to Google if available, else platform gateway
const getEndpoint = () => GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
  : "https://app-d5k5oivwhxj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:generateContent";

const getAuthHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (!GEMINI_API_KEY && GATEWAY_KEY) h["X-Gateway-Authorization"] = `Bearer ${GATEWAY_KEY}`;
  return h;
};

// ─── AI call (non-streaming, returns JSON) ────────────────────────────────────
async function geminiGenerate(prompt: string): Promise<string> {
  const res = await fetch(getEndpoint(), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── Extraction prompts ───────────────────────────────────────────────────────
const STOCK_PROMPT = (text: string) => `
You are an automotive data extraction AI for RPM Motors Pakistan.
Extract ALL vehicle stock/availability listings from this WhatsApp message dump.
Each listing is someone offering a car for sale. Ignore non-vehicle messages.

Rules:
- Pakistani market: prices in PKR (lac = 100,000). "92" means 92 lac = 9,200,000 PKR.
- Common shorthand: "Vezel Z 2022 black 18k KHI 92 demand" → Honda Vezel Z 2022, Black, 18000km, Karachi, 9200000 PKR
- "KHI"/"Khi"=Karachi, "LHR"/"Lhr"=Lahore, "ISB"/"Isb"=Islamabad, "RWP"=Rawalpindi
- Mileage: "18k"=18000, "1.2lac km"=120000
- Years: "22"=2022, "21"=2021 etc
- Transmission: "auto"/"at"=Automatic, "manual"/"mt"=Manual
- Condition: assume "used" unless stated otherwise
- confidence: 0-100 based on how complete/clear the listing is

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "raw_message": "original text of this listing",
    "make": "Toyota",
    "model": "Corolla",
    "variant": "Altis X",
    "year": 2022,
    "mileage": 45000,
    "color": "White",
    "transmission": "Automatic",
    "fuel_type": "Petrol",
    "body_type": "Sedan",
    "condition": "used",
    "asking_price": 4800000,
    "negotiable": true,
    "currency": "PKR",
    "city": "Karachi",
    "contact_name": null,
    "contact_phone": null,
    "status": "available",
    "confidence": 85,
    "notes": null
  }
]

If no stock listings found, return: []

WhatsApp messages:
${text}
`;

const REQUIREMENT_PROMPT = (text: string) => `
You are an automotive buyer-requirement extraction AI for RPM Motors Pakistan.
Extract ALL buyer requirement/wanted vehicle listings from this WhatsApp message dump.
Each requirement is someone WANTING to BUY a car. Ignore seller/offer messages.

Rules:
- Pakistani market: budgets in PKR (lac = 100,000). "budget 65" = 6,500,000 PKR
- "KHI"=Karachi, "LHR"=Lahore, "ISB"=Islamabad etc
- Year range: "2021+" means year_min=2021, year_max=null
- urgency: detect from words like "urgent","ASAP","need today" vs "flexible","anytime"
- confidence: 0-100 based on completeness

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "raw_message": "original text",
    "buyer_name": null,
    "contact_phone": null,
    "city": "Karachi",
    "make": "Toyota",
    "model": "Corolla",
    "variant": "Grande",
    "year_min": 2021,
    "year_max": null,
    "mileage_max": null,
    "color_pref": "White",
    "transmission": "Automatic",
    "budget_min": null,
    "budget_max": 6500000,
    "currency": "PKR",
    "financing": false,
    "exchange": false,
    "urgency": "normal",
    "status": "active",
    "confidence": 80,
    "notes": null
  }
]

If no buyer requirements found, return: []

WhatsApp messages:
${text}
`;

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  try {
    const { text, capture_type, group_id, save_capture } = await req.json();

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const type: "stock" | "requirement" | "both" = capture_type ?? "both";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

    // Optionally persist the raw capture
    let captureId: string | null = null;
    if (save_capture) {
      const { data: cap } = await supabase
        .from("rpm_wa_captures")
        .insert({ raw_text: text, capture_type: type === "both" ? "general" : type, group_id: group_id ?? null })
        .select("id")
        .single();
      captureId = cap?.id ?? null;
    }

    const results: { listings?: unknown[]; requirements?: unknown[]; errors?: string[] } = {};
    const errors: string[] = [];

    // Run extractions in parallel when type = "both"
    const tasks: Promise<void>[] = [];

    if (type === "stock" || type === "both") {
      tasks.push((async () => {
        try {
          const raw = await geminiGenerate(STOCK_PROMPT(text));
          // Strip markdown fences if present
          const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
          const listings: unknown[] = JSON.parse(clean);
          results.listings = listings;

          if (listings.length > 0) {
            const rows = listings.map((l: unknown) => ({
              ...(l as object),
              capture_id: captureId,
              group_id: group_id ?? null,
            }));
            await supabase.from("rpm_wa_listings").insert(rows);
            if (captureId) {
              await supabase.from("rpm_wa_captures")
                .update({ ai_extracted: true, extracted_count: listings.length })
                .eq("id", captureId);
            }
          }
        } catch (e) {
          errors.push(`Stock extraction: ${(e as Error).message}`);
          results.listings = [];
        }
      })());
    }

    if (type === "requirement" || type === "both") {
      tasks.push((async () => {
        try {
          const raw = await geminiGenerate(REQUIREMENT_PROMPT(text));
          const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
          const requirements: unknown[] = JSON.parse(clean);
          results.requirements = requirements;

          if (requirements.length > 0) {
            const rows = requirements.map((r: unknown) => ({
              ...(r as object),
              capture_id: captureId,
              group_id: group_id ?? null,
            }));
            await supabase.from("rpm_wa_requirements").insert(rows);
          }
        } catch (e) {
          errors.push(`Requirement extraction: ${(e as Error).message}`);
          results.requirements = [];
        }
      })());
    }

    await Promise.all(tasks);

    return new Response(JSON.stringify({ ...results, errors: errors.length ? errors : undefined, capture_id: captureId }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-extract error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
