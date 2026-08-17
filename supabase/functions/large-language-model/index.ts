import { serve } from "https://deno.land/std/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  let contents: unknown[];
  let systemInstruction: string | undefined;
  try {
    const body = await req.json();
    contents = body.contents;
    systemInstruction = body.systemInstruction;
    if (!Array.isArray(contents) || contents.length === 0) throw new Error("Missing contents");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const geminiKey  = Deno.env.get("GEMINI_API_KEY");
  const gatewayKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!geminiKey && !gatewayKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const endpoint = geminiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`
    : "https://app-d5k5oivwhxj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

  const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (!geminiKey && gatewayKey) authHeaders["X-Gateway-Authorization"] = `Bearer ${gatewayKey}`;

  const requestBody: Record<string, unknown> = { contents };
  if (systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(requestBody),
  });

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
