import { serve } from "https://deno.land/std/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let baseCurrency: string;
  try {
    const body = await req.json();
    baseCurrency = body.base_currency;
    if (!baseCurrency) throw new Error("Missing base_currency");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `https://app-d5k5oivwhxj5-api-w9Rbo8E7p2b9.gateway.appmedo.com/v6/latest/${baseCurrency.toUpperCase()}`,
    { method: "GET", headers: { "Accept": "application/json", "X-Gateway-Authorization": `Bearer ${apiKey}` } }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, { status: upstream.status, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
