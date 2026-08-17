import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('REMOVE_BG_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Forward the multipart form data directly to remove.bg
    const formData = await req.formData();
    formData.set('size', 'auto');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ errors: [{ title: `HTTP ${res.status}` }] }));
      const msg = errJson?.errors?.[0]?.title ?? `API error ${res.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Stream the PNG blob back to the client
    const blob = await res.blob();
    return new Response(blob, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'image/png',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
