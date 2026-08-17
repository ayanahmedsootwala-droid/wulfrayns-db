/**
 * AI Client — single shared queue for ALL gateway calls (copilot + LLM pages).
 * MAX_CONCURRENT=1 ensures no two Gemini requests run at the same time,
 * which is the primary cause of 429 rate-limit errors.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Forward user-supplied Gemini key so the edge function bypasses the gateway
function geminiKeyHeader(): Record<string, string> {
  try {
    const k = localStorage.getItem('rpm_settings_geminiApiKey');
    return k && k.startsWith('AIza') ? { 'X-Gemini-Key': k } : {};
  } catch { return {}; }
}
function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
    ...geminiKeyHeader(),
  };
}

// ─── Request Queue ────────────────────────────────────────────────────────────
type QueueEntry = {
  fn: () => Promise<void>;
  resolve: () => void;
  reject: (e: unknown) => void;
};

const queue: QueueEntry[] = [];
let running = 0;
// ONE concurrent AI request at a time — prevents concurrent 429s at the gateway
const MAX_CONCURRENT = 1;
// Minimum gap between requests: 1.5s gives ~40 rpm headroom vs 100 rpm limit
const MIN_INTERVAL_MS = 1500;
let lastCallAt = 0;

function drainQueue() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const now = Date.now();
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - now);
    if (wait > 0) {
      setTimeout(drainQueue, wait);
      return;
    }
    const entry = queue.shift()!;
    running++;
    lastCallAt = Date.now();
    entry.fn()
      .then(entry.resolve)
      .catch(entry.reject)
      .finally(() => { running--; drainQueue(); });
  }
}

function enqueue(fn: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    drainQueue();
  });
}

// ─── Error categories (never collapse 429 → 502) ─────────────────────────────
export type AIErrorKind =
  | 'RATE_LIMITED'      // 429 temporary — retry after back-off
  | 'QUOTA_EXCEEDED'    // 429/402 quota exhausted — do not retry
  | 'AUTH_ERROR'        // 401/403 — key/permission issue
  | 'TIMEOUT'           // request timed out
  | 'PROVIDER_ERROR'    // 5xx from Gemini gateway
  | 'NETWORK_ERROR'     // fetch failed entirely
  | 'DATABASE_ERROR'    // Supabase query failed
  | 'UNKNOWN';

function categoriseError(status: number, body: string): AIErrorKind {
  if (status === 401 || status === 403) return 'AUTH_ERROR';
  if (status === 402) return 'QUOTA_EXCEEDED';
  if (status === 429) {
    // Distinguish hard quota (daily/monthly) from soft rate limit (per-minute)
    if (body.includes('quota') || body.includes('billing') || body.includes('insufficient')) {
      return 'QUOTA_EXCEEDED';
    }
    return 'RATE_LIMITED';
  }
  if (status >= 500) return 'PROVIDER_ERROR';
  return 'UNKNOWN';
}

function userFacingMessage(kind: AIErrorKind): string {
  switch (kind) {
    case 'RATE_LIMITED':    return '⏳ AI is busy — your request will retry automatically in a moment.';
    case 'QUOTA_EXCEEDED':  return '⚠️ AI service quota reached. Please try again later or contact support.';
    case 'AUTH_ERROR':      return '🔑 AI authentication error — please contact support.';
    case 'TIMEOUT':         return '⏱️ AI request timed out — please try again.';
    case 'PROVIDER_ERROR':  return '🔧 AI service is temporarily unavailable — please try again in a moment.';
    case 'NETWORK_ERROR':   return '📡 Network error — please check your connection and try again.';
    default:                return '❌ An unexpected error occurred — please try again.';
  }
}

// ─── Retry with back-off (respects Retry-After header, skips quota errors) ───
async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  maxAttempts = 4,
): Promise<Response> {
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Use Retry-After header if provided, else exponential back-off + jitter
      const retryAfterSecs = lastResp?.headers.get('Retry-After');
      const delay = retryAfterSecs
        ? Math.min(parseFloat(retryAfterSecs) * 1000, 30_000)
        : Math.min(1000 * 2 ** attempt + Math.random() * 300, 30_000);
      console.warn(`[AI] 429 on attempt ${attempt}/${maxAttempts} — waiting ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
    const r = await fetch(url, { ...init, signal: AbortSignal.any
      ? AbortSignal.any([(init.signal as AbortSignal | undefined), AbortSignal.timeout(90_000)].filter(Boolean) as AbortSignal[])
      : init.signal });
    if (r.status !== 429) return r;
    // Hard quota errors — don't retry
    const body = await r.clone().text();
    const kind = categoriseError(429, body);
    if (kind === 'QUOTA_EXCEEDED') return r;
    lastResp = r;
  }
  return lastResp!;
}

// ─── Core fetch wrapper (for non-streaming edge function calls) ───────────────
export async function callEdgeFunction(
  functionName: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });
}

// ─── Queued copilot call ──────────────────────────────────────────────────────
export interface CopilotCallOptions {
  messages: { role: string; parts: { text: string }[] }[];
  sessionId?: string;
  context?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;       // called word-by-word during streaming
  onResponse: (text: string, toolLog: ToolLogEntry[]) => void;
  onError: (msg: string) => void;
  onQueued?: () => void;
}

export interface ToolLogEntry {
  tool: string;
  args: unknown;
  result: unknown;
}

function parseToolLog(text: string): { toolLog: ToolLogEntry[]; cleanText: string } {
  const match = text.match(/__TOOL_LOG__([\s\S]*?)__TOOL_LOG_END__\n\n/);
  if (!match) return { toolLog: [], cleanText: text };
  try {
    const toolLog = JSON.parse(match[1]) as ToolLogEntry[];
    const cleanText = text.replace(/__TOOL_LOG__[\s\S]*?__TOOL_LOG_END__\n\n/, '');
    return { toolLog, cleanText };
  } catch {
    return { toolLog: [], cleanText: text };
  }
}

export function callCopilot(opts: CopilotCallOptions): void {
  opts.onQueued?.();

  enqueue(async () => {
    if (opts.signal?.aborted) return;
    try {
      const resp = await fetchWithBackoff(
        `${SUPABASE_URL}/functions/v1/rpm-copilot`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ messages: opts.messages, session_id: opts.sessionId, context: opts.context ?? '' }),
          signal: opts.signal,
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        const kind = categoriseError(resp.status, errText);
        opts.onError(userFacingMessage(kind));
        return;
      }

      const contentType = resp.headers.get('content-type') ?? '';

      // ── SSE streaming path ───────────────────────────────────────────────
      if (contentType.includes('text/event-stream') && resp.body) {
        const reader  = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = '';
        let toolLog: ToolLogEntry[] = [];
        let fullText  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const frame = JSON.parse(data);
              if (frame._toolLog) { toolLog = frame._toolLog as ToolLogEntry[]; continue; }
              const chunk = frame?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
              if (chunk) { fullText += chunk; opts.onChunk?.(chunk); }
            } catch { /* skip malformed frames */ }
          }
        }
        opts.onResponse(fullText, toolLog);
        return;
      }

      // ── Fallback: plain-text ─────────────────────────────────────────────
      const raw = await resp.text();
      const { toolLog, cleanText } = parseToolLog(raw);
      opts.onResponse(cleanText, toolLog);

    } catch (err: unknown) {
      if (opts.signal?.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      const kind: AIErrorKind = msg.includes('timeout') || msg.includes('Timeout') ? 'TIMEOUT'
        : msg.includes('fetch') ? 'NETWORK_ERROR' : 'UNKNOWN';
      opts.onError(userFacingMessage(kind));
    }
  });
}

// ─── Queued LLM stream (for pages using streamLLM pattern) ────────────────────
export interface StreamQueuedOptions {
  functionName: string;
  requestBody: unknown;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export function streamLLMQueued(opts: StreamQueuedOptions): void {
  enqueue(async () => {
    if (opts.signal?.aborted) return;
    try {
      const resp = await fetchWithBackoff(
        `${SUPABASE_URL}/functions/v1/${opts.functionName}`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(opts.requestBody),
          signal: opts.signal,
        },
      );

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => '');
        const kind = categoriseError(resp.status, errText);
        opts.onError(new Error(userFacingMessage(kind)));
        return;
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (text) opts.onChunk(text);
          } catch { /* skip malformed */ }
        }
      }
      opts.onComplete();
    } catch (err: unknown) {
      if (opts.signal?.aborted) return;
      opts.onError(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ─── Queue status helpers ─────────────────────────────────────────────────────
export function getQueueDepth(): number { return queue.length; }
export function getRunningCount(): number { return running; }
