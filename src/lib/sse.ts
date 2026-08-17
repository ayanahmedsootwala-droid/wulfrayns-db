/**
 * sse.ts — SSE streaming utilities for Gemini Edge Function calls.
 * ALL requests (streamLLM and streamLLMQueued) go through the shared
 * queue in ai-client.ts to prevent concurrent gateway calls that cause 429s.
 */
import { streamLLMQueued } from '@/lib/ai-client';

export interface StreamRequestOptions {
  functionName: string;
  requestBody: unknown;
  supabaseUrl: string;
  supabaseAnonKey: string;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

/** Parse a single SSE data frame and extract the text chunk */
export function extractTextFromFrame(data: string): string {
  try {
    const parsed = JSON.parse(data);
    return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch {
    return '';
  }
}

/**
 * Stream a Gemini request via an Edge Function.
 * Routes through the shared ai-client queue so all AI calls
 * (copilot + page-level LLM calls) are serialized and rate-limited together.
 */
export function streamLLM(options: StreamRequestOptions): void {
  streamLLMQueued({
    functionName: options.functionName,
    requestBody: options.requestBody,
    onChunk: options.onChunk,
    onComplete: options.onComplete,
    onError: options.onError,
    signal: options.signal,
  });
}
