// RPM Motors AI Copilot — Gemini 2.5 Flash (platform gateway, INTEGRATIONS_API_KEY)
//
// Architecture — ONE API call per logical step, never two:
//   • Tool-calling rounds → generateContent (sync JSON, no SSE overhead)
//   • Final answer        → streamGenerateContent (SSE pass-through to client)
//
// Rate-limit strategy:
//   • 429 with per-minute message → exponential back-off, up to 4 attempts
//   • 429/402 quota-exhausted      → return immediately, no retry
//   • All errors carry typed category (RATE_LIMITED / QUOTA_EXCEEDED / …)
//   • Never re-cast a 429 as 502
//
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ───────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY_KEY      = Deno.env.get("INTEGRATIONS_API_KEY")!;
const GEMINI_API_KEY   = Deno.env.get("GEMINI_API_KEY");

// ─── Per-request key resolution (supports user-supplied key via header) ───────
function resolveGeminiKey(req: Request): string | null {
  // Priority: 1) X-Gemini-Key header from client, 2) GEMINI_API_KEY secret, 3) null → use gateway
  const headerKey = req.headers.get("X-Gemini-Key");
  if (headerKey && headerKey.startsWith("AIza")) return headerKey;
  return GEMINI_API_KEY ?? null;
}

function buildEndpoints(userKey: string | null) {
  const base = userKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash`
    : `https://app-d5k5oivwhxj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash`;
  return {
    sync:   userKey ? `${base}:generateContent?key=${userKey}` : `${base}:generateContent`,
    stream: userKey ? `${base}:streamGenerateContent?alt=sse&key=${userKey}` : `${base}:streamGenerateContent?alt=sse`,
    authHeaders: userKey
      ? { "Content-Type": "application/json" }
      : { "Content-Type": "application/json", "X-Gateway-Authorization": `Bearer ${GATEWAY_KEY}` },
  };
}

// ─── Error categories ─────────────────────────────────────────────────────────
type ErrorKind = "RATE_LIMITED" | "QUOTA_EXCEEDED" | "AUTH_ERROR" | "PROVIDER_ERROR" | "TIMEOUT" | "UNKNOWN";

function classifyError(status: number, body: string): ErrorKind {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 402) return "QUOTA_EXCEEDED";
  if (status === 429) {
    // Hard quota: daily/monthly exhaustion — do not retry
    if (/quota|billing|insufficient|credit/i.test(body)) return "QUOTA_EXCEEDED";
    return "RATE_LIMITED";
  }
  if (status >= 500) return "PROVIDER_ERROR";
  return "UNKNOWN";
}

function errorResponse(kind: ErrorKind, detail: string, httpStatus: number): Response {
  const messages: Record<ErrorKind, string> = {
    RATE_LIMITED:    "AI is temporarily rate-limited. Please wait a moment and try again.",
    QUOTA_EXCEEDED:  "AI service quota has been reached. Please try again later.",
    AUTH_ERROR:      "AI authentication error — please contact support.",
    PROVIDER_ERROR:  "AI service is temporarily unavailable. Please try again.",
    TIMEOUT:         "AI request timed out. Please try again.",
    UNKNOWN:         "An unexpected AI error occurred. Please try again.",
  };
  // Never return 502 for a 429 — preserve meaningful status
  const outStatus = kind === "RATE_LIMITED" || kind === "QUOTA_EXCEEDED" ? 429
    : kind === "AUTH_ERROR" ? 401
    : httpStatus >= 500 ? 503
    : 500;
  return new Response(JSON.stringify({ error: messages[kind], kind, detail: detail.slice(0, 200) }), {
    status: outStatus,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ─── Retry with back-off — per-request endpoints ─────────────────────────────
async function fetchSync(
  eps: ReturnType<typeof buildEndpoints>,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const maxAttempts = 4;
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new Error("Aborted");
    if (attempt > 0) {
      const retryAfter = lastResp?.headers.get("Retry-After");
      const delay = retryAfter
        ? Math.min(parseFloat(retryAfter) * 1000, 30_000)
        : Math.min(1_000 * 2 ** attempt + Math.random() * 400, 30_000);
      console.log(`[rpm-copilot] 429 — attempt ${attempt}/${maxAttempts - 1}, waiting ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
    const resp = await fetch(eps.sync, {
      method: "POST",
      headers: eps.authHeaders,
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(60_000),
    });
    if (resp.status !== 429) return resp;
    const txt = await resp.clone().text();
    const kind = classifyError(429, txt);
    if (kind === "QUOTA_EXCEEDED") return resp;
    lastResp = resp;
  }
  return lastResp!;
}

// ─── Streaming pass-through ───────────────────────────────────────────────────
async function fetchStream(
  eps: ReturnType<typeof buildEndpoints>,
  body: Record<string, unknown>,
): Promise<Response> {
  return await fetch(eps.stream, {
    method: "POST",
    headers: eps.authHeaders,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
}

// ─── Tool declarations ────────────────────────────────────────────────────────
const FUNCTION_DECLARATIONS = [
  { name: "search_leads",        description: "Search leads/customers by name, phone, requirements, budget, or score", parameters: { type: "object", properties: { query: { type: "string" }, score: { type: "string", enum: ["hot","warm","cold","all"] }, status: { type: "string", enum: ["active","converted","lost","on_hold","all"] }, limit: { type: "number" } } } },
  { name: "search_vehicles",     description: "Search vehicle inventory by make, model, status, price range, or days in stock", parameters: { type: "object", properties: { query: { type: "string" }, status: { type: "string", enum: ["available","reserved","sold","in_transit","under_repair","all"] }, min_days_in_stock: { type: "number" }, max_price_pkr: { type: "number" }, limit: { type: "number" } } } },
  { name: "create_lead",         description: "Create a new lead/customer record", parameters: { type: "object", required: ["customer_name"], properties: { customer_name: { type: "string" }, phone: { type: "string" }, whatsapp: { type: "string" }, budget_min: { type: "number" }, budget_max: { type: "number" }, req_make: { type: "string" }, req_model: { type: "string" }, req_body_type: { type: "string" }, req_year_min: { type: "number" }, req_year_max: { type: "number" }, req_color: { type: "string" }, lead_score: { type: "string", enum: ["hot","warm","cold"] }, source: { type: "string" }, notes: { type: "string" } } } },
  { name: "create_vehicle",      description: "Add a new vehicle to inventory", parameters: { type: "object", properties: { make: { type: "string" }, model: { type: "string" }, variant: { type: "string" }, year: { type: "number" }, registration: { type: "string" }, chassis_no: { type: "string" }, color: { type: "string" }, mileage: { type: "number" }, fuel_type: { type: "string" }, transmission: { type: "string" }, engine_cc: { type: "number" }, body_type: { type: "string" }, condition: { type: "string" }, auction_grade: { type: "string" }, purchase_price_pkr: { type: "number" }, purchase_price_jpy: { type: "number" }, total_investment_pkr: { type: "number" }, asking_price_pkr: { type: "number" }, supplier: { type: "string" }, auction_house: { type: "string" }, purchase_date: { type: "string" }, notes: { type: "string" } } } },
  { name: "update_lead",         description: "Update an existing lead record", parameters: { type: "object", required: ["id"], properties: { id: { type: "string" }, lead_score: { type: "string", enum: ["hot","warm","cold"] }, status: { type: "string", enum: ["active","converted","lost","on_hold"] }, follow_up_at: { type: "string" }, notes: { type: "string" }, interested_vehicle_id: { type: "string" } } } },
  { name: "update_vehicle",      description: "Update an existing vehicle record", parameters: { type: "object", required: ["id"], properties: { id: { type: "string" }, status: { type: "string", enum: ["available","reserved","sold","in_transit","under_repair"] }, asking_price_pkr: { type: "number" }, sold_price_pkr: { type: "number" }, sold_date: { type: "string" }, ai_tags: { type: "array", items: { type: "string" } }, notes: { type: "string" }, repair_cost_pkr: { type: "number" } } } },
  { name: "create_journal_entry",description: "Save a journal entry", parameters: { type: "object", required: ["raw_text"], properties: { raw_text: { type: "string" }, mode: { type: "string", enum: ["daily","vehicle","customer","decision","reflection","monthly"] }, summary: { type: "string" }, parsed_entities: { type: "object" } } } },
  { name: "create_task",         description: "Create a task, follow-up, reminder, or appointment", parameters: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, task_type: { type: "string", enum: ["task","follow_up","commitment","reminder","appointment"] }, priority: { type: "string", enum: ["urgent","high","medium","low"] }, due_date: { type: "string" }, linked_lead_id: { type: "string" }, linked_vehicle_id: { type: "string" }, source: { type: "string" } } } },
  { name: "get_analytics",       description: "Get analytics: expenses, leads, inventory, aging vehicles, tasks, journal, shipments", parameters: { type: "object", properties: { type: { type: "string", enum: ["expenses_summary","leads_summary","inventory_summary","vehicles_aging","shipments","quotations_summary","tasks_pending","journal_recent"] }, month: { type: "string" }, limit: { type: "number" } } } },
  { name: "add_lead_interaction",description: "Log an interaction with a lead (call, WhatsApp, visit, note)", parameters: { type: "object", required: ["lead_id","type"], properties: { lead_id: { type: "string" }, type: { type: "string", enum: ["call","whatsapp","visit","email","sms","note"] }, notes: { type: "string" }, outcome: { type: "string" }, next_action: { type: "string" } } } },
  { name: "log_audit",           description: "Log an AI action to the audit trail", parameters: { type: "object", required: ["action_type","description"], properties: { action_type: { type: "string" }, entity_type: { type: "string" }, entity_id: { type: "string" }, description: { type: "string" }, confidence: { type: "number" }, source_ref: { type: "string" } } } },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>, db: ReturnType<typeof createClient>): Promise<unknown> {
  const t0 = Date.now();
  let result: unknown;
  try {
    switch (name) {
      case "search_leads": {
        let q = db.from("rpm_leads").select("id,customer_name,phone,whatsapp,budget_min,budget_max,req_make,req_model,lead_score,status,last_contact_at,follow_up_at,notes,created_at").order("created_at", { ascending: false });
        if (args.score  && args.score  !== "all") q = q.eq("lead_score", args.score);
        if (args.status && args.status !== "all") q = q.eq("status", args.status);
        if (args.query) q = q.or(`customer_name.ilike.%${args.query}%,phone.ilike.%${args.query}%,req_make.ilike.%${args.query}%,req_model.ilike.%${args.query}%,notes.ilike.%${args.query}%`);
        const { data, error } = await q.limit(Number(args.limit) || 20);
        result = error ? { error: error.message } : { leads: data, count: data?.length ?? 0 };
        break;
      }
      case "search_vehicles": {
        let q = db.from("rpm_vehicles").select("id,make,model,variant,year,color,mileage,status,asking_price_pkr,total_investment_pkr,purchase_date,ai_tags,auction_grade,notes,created_at").order("created_at", { ascending: false });
        if (args.status && args.status !== "all") q = q.eq("status", args.status);
        if (args.max_price_pkr) q = q.lte("asking_price_pkr", args.max_price_pkr);
        if (args.query) q = q.or(`make.ilike.%${args.query}%,model.ilike.%${args.query}%,variant.ilike.%${args.query}%,color.ilike.%${args.query}%`);
        const { data, error } = await q.limit(Number(args.limit) || 20);
        if (error) { result = { error: error.message }; break; }
        let vehicles = data ?? [];
        if (args.min_days_in_stock) {
          const minDays = Number(args.min_days_in_stock), now = new Date();
          vehicles = vehicles.filter((v: Record<string,unknown>) => v.purchase_date && Math.floor((now.getTime() - new Date(v.purchase_date as string).getTime()) / 86400000) >= minDays);
        }
        result = { vehicles, count: vehicles.length };
        break;
      }
      case "create_lead": {
        if (args.phone || args.customer_name) {
          let dq = db.from("rpm_leads").select("id,customer_name,phone").limit(3);
          dq = args.phone ? dq.eq("phone", args.phone) : dq.ilike("customer_name", `%${args.customer_name}%`);
          const { data: dups } = await dq;
          if (dups?.length) { result = { duplicate: true, existing: dups, message: `Possible duplicate: ${(dups[0] as Record<string,unknown>).customer_name}` }; break; }
        }
        const { data, error } = await db.from("rpm_leads").insert({ ...args, lead_score: args.lead_score ?? "warm", status: "active" }).select().single();
        result = error ? { error: error.message } : { created: true, lead: data };
        break;
      }
      case "create_vehicle": {
        if (args.chassis_no || args.registration) {
          let dq = db.from("rpm_vehicles").select("id,make,model,year").limit(3);
          dq = args.chassis_no ? dq.eq("chassis_no", args.chassis_no) : dq.eq("registration", args.registration);
          const { data: dups } = await dq;
          if (dups?.length) { result = { duplicate: true, existing: dups }; break; }
        }
        const p = { ...args } as Record<string,unknown>;
        if (p.asking_price_pkr && p.total_investment_pkr) {
          const ask = Number(p.asking_price_pkr), inv = Number(p.total_investment_pkr);
          p.expected_profit_pkr = ask - inv;
          p.profit_margin_pct   = ask > 0 ? (ask - inv) / ask * 100 : 0;
          p.roi_pct             = inv > 0 ? (ask - inv) / inv * 100 : 0;
        }
        const { data, error } = await db.from("rpm_vehicles").insert(p).select().single();
        result = error ? { error: error.message } : { created: true, vehicle: data };
        break;
      }
      case "update_lead": {
        const { id, ...rest } = args as Record<string,unknown>;
        const { data, error } = await db.from("rpm_leads").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).select().single();
        result = error ? { error: error.message } : { updated: true, lead: data };
        break;
      }
      case "update_vehicle": {
        const { id, ...rest } = args as Record<string,unknown>;
        const { data, error } = await db.from("rpm_vehicles").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).select().single();
        result = error ? { error: error.message } : { updated: true, vehicle: data };
        break;
      }
      case "create_journal_entry": {
        const { data, error } = await db.from("rpm_journal").insert({ ...args, entry_date: new Date().toISOString().split("T")[0] }).select().single();
        result = error ? { error: error.message } : { created: true, entry: data };
        break;
      }
      case "create_task": {
        const { data, error } = await db.from("rpm_tasks").insert(args).select().single();
        result = error ? { error: error.message } : { created: true, task: data };
        break;
      }
      case "get_analytics": {
        const { type, month, limit = 30 } = args as { type: string; month?: string; limit?: number };
        if (type === "expenses_summary") {
          let q = db.from("rpm_expenses").select("category,amount_pkr,date,description").order("date", { ascending: false }).limit(limit);
          if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
          const { data, error } = await q;
          if (error) { result = { error: error.message }; break; }
          const total = (data ?? []).reduce((s: number, r: Record<string,unknown>) => s + Number(r.amount_pkr), 0);
          const byCat: Record<string,number> = {};
          for (const r of (data ?? []) as Record<string,unknown>[]) byCat[String(r.category)] = (byCat[String(r.category)] || 0) + Number(r.amount_pkr);
          result = { total_pkr: total, by_category: byCat, records: data };
        } else if (type === "leads_summary") {
          const { data } = await db.from("rpm_leads").select("lead_score,status,source,created_at");
          result = { total: data?.length ?? 0, hot: (data ?? []).filter((r: Record<string,unknown>) => r.lead_score === "hot").length, warm: (data ?? []).filter((r: Record<string,unknown>) => r.lead_score === "warm").length, cold: (data ?? []).filter((r: Record<string,unknown>) => r.lead_score === "cold").length, active: (data ?? []).filter((r: Record<string,unknown>) => r.status === "active").length };
        } else if (type === "inventory_summary") {
          const { data } = await db.from("rpm_vehicles").select("make,status,asking_price_pkr,purchase_date");
          const now = new Date(), avail = (data ?? []).filter((r: Record<string,unknown>) => r.status === "available");
          result = { total: data?.length ?? 0, available: avail.length, sold: (data ?? []).filter((r: Record<string,unknown>) => r.status === "sold").length, aging_over_30: avail.filter((r: Record<string,unknown>) => r.purchase_date && Math.floor((now.getTime() - new Date(r.purchase_date as string).getTime()) / 86400000) >= 30).length, total_inventory_value_pkr: avail.reduce((s: number, r: Record<string,unknown>) => s + Number(r.asking_price_pkr || 0), 0) };
        } else if (type === "vehicles_aging") {
          const { data } = await db.from("rpm_vehicles").select("id,make,model,year,color,asking_price_pkr,purchase_date,status,notes").eq("status", "available").order("purchase_date", { ascending: true }).limit(limit);
          const now = new Date();
          result = { vehicles: (data ?? []).map((r: Record<string,unknown>) => ({ ...r, days_in_stock: r.purchase_date ? Math.floor((now.getTime() - new Date(r.purchase_date as string).getTime()) / 86400000) : 0 })) };
        } else if (type === "tasks_pending") {
          const { data } = await db.from("rpm_tasks").select("*").in("status", ["pending","in_progress"]).order("due_date", { ascending: true }).limit(limit);
          result = { tasks: data, count: data?.length ?? 0 };
        } else if (type === "journal_recent") {
          const { data } = await db.from("rpm_journal").select("id,entry_date,mode,raw_text,summary,created_at").order("created_at", { ascending: false }).limit(limit);
          result = { entries: data, count: data?.length ?? 0 };
        } else if (type === "shipments") {
          const { data } = await db.from("rpm_shipments").select("*").order("created_at", { ascending: false }).limit(limit);
          result = { shipments: data, count: data?.length ?? 0 };
        } else if (type === "quotations_summary") {
          const { data } = await db.from("rpm_quotations").select("status,total,created_at");
          result = { total: data?.length ?? 0, pending: (data ?? []).filter((r: Record<string,unknown>) => r.status === "draft" || r.status === "sent").length };
        } else {
          result = { error: "Unknown analytics type" };
        }
        break;
      }
      case "add_lead_interaction": {
        const { data, error } = await db.from("rpm_lead_interactions").insert(args).select().single();
        if (error) { result = { error: error.message }; break; }
        await db.from("rpm_leads").update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", args.lead_id);
        result = { created: true, interaction: data };
        break;
      }
      case "log_audit": {
        await db.from("rpm_ai_audit").insert(args);
        result = { logged: true };
        break;
      }
      default:
        result = { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    result = { error: e instanceof Error ? e.message : String(e) };
  }
  console.log(`[rpm-copilot] tool=${name} duration=${Date.now() - t0}ms`);
  return result;
}

// ─── System prompt (compact — only send what the model needs) ─────────────────
function buildSystemPrompt(ctx: string): string {
  return `You are the RPM Motors AI Copilot for a Pakistani car dealership.
TODAY: ${new Date().toLocaleDateString("en-PK", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
CURRENCY: PKR (Pakistan), JPY (Japan auction).
MARKET: Lahore, Karachi, Islamabad. PakWheels/OLX pricing. USS/JAA/TAA auctions. FBR duty tables.

RULES:
- ALWAYS use tools; never fabricate DB data
- Search before create (duplicate check)
- Audit all creates/updates via log_audit
- One clear recommendation — not multiple options
- Reports: 800-1200 words minimum with live DB data
- Label sources: FACT(DB) / ESTIMATE / RECOMMENDATION

CONTEXT: ${ctx || "None."}`;
}

// ─── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")   return new Response("Method Not Allowed", { status: 405, headers: CORS });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let messages: unknown[], sessionId: string, context: string;
  try {
    const body = await req.json();
    messages  = body.messages;
    sessionId = body.session_id ?? "default";
    context   = body.context ?? "";
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("Empty messages");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const db       = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const sysText  = buildSystemPrompt(context);
  const toolLog: unknown[] = [];

  // ── Per-request Gemini key resolution ────────────────────────────────────
  const userKey = resolveGeminiKey(req);
  const eps     = buildEndpoints(userKey);
  console.log(`[rpm-copilot] key=${userKey ? "custom" : "gateway"}`);

  // Trim history to last 10 turns to keep token count low
  const trimmed = (messages as Array<{ role: string; parts: unknown[] }>).slice(-10);
  const contents: Array<{ role: string; parts: unknown[] }> = [...trimmed];

  // Shared generation config
  const genConfig = { temperature: 0.35, maxOutputTokens: 8192 };

  // ── Agentic loop — tool rounds use sync generateContent (no SSE) ───────────
  for (let round = 0; round < 8; round++) {
    const reqBody = {
      systemInstruction: { parts: [{ text: sysText }] },
      contents,
      tools:      [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      generationConfig: genConfig,
    };

    // ── Sync call ──────────────────────────────────────────────────────────
    const t0 = Date.now();
    let syncResp: Response;
    try {
      syncResp = await fetchSync(eps, reqBody, req.signal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const kind: ErrorKind = msg.toLowerCase().includes("timeout") ? "TIMEOUT" : "PROVIDER_ERROR";
      return errorResponse(kind, msg, 503);
    }

    // ── Handle non-200 from sync endpoint ─────────────────────────────────
    if (!syncResp.ok) {
      const body = await syncResp.text();
      const kind = classifyError(syncResp.status, body);
      console.error(`[rpm-copilot] round=${round} status=${syncResp.status} kind=${kind} duration=${Date.now()-t0}ms`);
      return errorResponse(kind, body, syncResp.status);
    }

    let json: Record<string, unknown>;
    try {
      json = await syncResp.json();
    } catch {
      return errorResponse("PROVIDER_ERROR", "Invalid JSON from Gemini", 502);
    }

    console.log(`[rpm-copilot] round=${round} duration=${Date.now()-t0}ms`);

    const candidate = (json.candidates as Record<string,unknown>[])?.[0];
    const parts = ((candidate?.content as Record<string,unknown>)?.parts ?? []) as Record<string,unknown>[];
    const fnCalls = parts.filter(p => p.functionCall);
    const textParts = parts.filter(p => p.text);

    // ── No function calls → stream the final answer ────────────────────────
    if (fnCalls.length === 0) {
      // If the sync response already has a text answer, re-request as stream
      // so the client gets word-by-word output. Contents already has the full
      // conversation — streamGenerateContent will reproduce the answer.
      const streamResp = await fetchStream(eps, {
        systemInstruction: { parts: [{ text: sysText }] },
        contents,
        generationConfig: genConfig,
      });

      if (!streamResp.ok || !streamResp.body) {
        // Fallback: return the sync text as plain response
        const fallback = textParts.map(p => p.text as string).join("");
        const meta = toolLog.length > 0 ? `data: ${JSON.stringify({ _toolLog: toolLog })}\n\n` : "";
        return new Response(meta + fallback, {
          headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      // Pipe metadata frame + upstream SSE directly to client
      const metaFrame = toolLog.length > 0
        ? `data: ${JSON.stringify({ _toolLog: toolLog })}\n\n`
        : "";

      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const enc = new TextEncoder();

      (async () => {
        try {
          if (metaFrame) await writer.write(enc.encode(metaFrame));
          const reader = streamResp.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        } finally {
          writer.close().catch(() => {});
        }
      })();

      return new Response(readable, {
        headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // ── Execute all tool calls in parallel ─────────────────────────────────
    contents.push({ role: "model", parts });

    const toolResults = await Promise.all(
      fnCalls.map(async (fc) => {
        const fn   = fc.functionCall as { name: string; args: Record<string, unknown> };
        const res  = await executeTool(fn.name, fn.args ?? {}, db);
        toolLog.push({ tool: fn.name, args: fn.args, result: res });

        // Audit write operations
        if (["create_lead","create_vehicle","update_lead","update_vehicle"].includes(fn.name)) {
          await executeTool("log_audit", {
            action_type: fn.name,
            entity_type: fn.name.includes("lead") ? "lead" : "vehicle",
            description: `AI ${fn.name}: ${JSON.stringify(fn.args).slice(0, 200)}`,
            source_ref: sessionId, confidence: 0.9,
          }, db);
        }
        return { functionResponse: { name: fn.name, response: { content: JSON.stringify(res) } } };
      })
    );
    contents.push({ role: "user", parts: toolResults });
  }

  return new Response(JSON.stringify({ error: "Max agentic rounds reached" }), {
    status: 500, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
