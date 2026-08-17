import React, { useState, useRef, useCallback } from 'react';
import { Zap, X, RefreshCw, AlertTriangle, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, formatMileage, cn } from '@/lib/utils';
import type { Vehicle } from '@/types/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Props { vehicle: Vehicle }

const SYSTEM_PROMPT = `You are an expert car deal analyst for a Pakistani automotive dealer.
Score this deal and provide negotiation advice.

RESPOND IN THIS EXACT FORMAT (no deviations):

SCORE: [number 0-100]
VERDICT: [one of: Excellent Deal | Good Deal | Fair Deal | Overpriced | Poor Deal]

SCORE_BREAKDOWN:
- Price vs Market: [score/25] — [one-line reason]
- Condition Quality: [score/25] — [one-line reason]
- Demand Potential: [score/25] — [one-line reason]
- Financial Upside: [score/25] — [one-line reason]

NEGOTIATION_SCRIPT:
[3-4 sentences as if YOU are the dealer talking to a buyer. Use Pakistani conversational style. Reference specific vehicle details. End with the ideal counter-offer price.]

QUICK_TIPS:
- [tip 1]
- [tip 2]
- [tip 3]

Keep total response under 250 words. Be blunt and market-specific.`;

function buildContext(v: Vehicle): string {
  const ageDays = v.created_at ? Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000) : 0;
  return [
    `${v.make} ${v.model} ${v.variant ?? ''} ${v.model_year ?? ''}`,
    `Mileage: ${v.mileage != null ? formatMileage(v.mileage) : 'N/A'}`,
    `Purchase price: ${formatCurrency(v.purchase_price)}, Demand: ${formatCurrency(v.expected_selling_price)}, Market price: ${formatCurrency(v.market_price)}`,
    `Last offer: ${formatCurrency(v.last_offer)}, Highest offer: ${formatCurrency(v.highest_offer)}, Lowest offer: ${formatCurrency(v.lowest_offer)}`,
    `Listed ${ageDays} days ago, Status: ${v.status}`,
    `Condition: ${v.vehicle_condition}, Inspection: ${v.inspection_score ?? 'N/A'}/10`,
    `Accident history: ${v.has_accident_history ? 'Yes' : 'No'}, Rust: ${v.has_rust ? 'Yes' : 'No'}`,
    `Engine: ${v.engine_health ?? 'N/A'}/10, Body paint: ${v.original_paint_pct ?? 'N/A'}%`,
    `Hot deal: ${v.is_hot_deal ? 'Yes' : 'No'}, Urgent: ${v.is_urgent ? 'Yes' : 'No'}`,
    `City: ${v.dealer_city ?? 'N/A'}`,
  ].join('\n');
}

function parseScore(raw: string): number | null {
  const m = raw.match(/SCORE:\s*(\d+)/);
  return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : null;
}

function parseVerdict(raw: string): string {
  const m = raw.match(/VERDICT:\s*(.+)/);
  return m ? m[1].trim() : '';
}

function verdictColor(verdict: string): string {
  if (/excellent/i.test(verdict)) return 'text-green-400 bg-green-400/10 border-green-400/20';
  if (/good/i.test(verdict)) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (/fair/i.test(verdict)) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  if (/overpriced/i.test(verdict)) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
}

function scoreArcColor(score: number): string {
  if (score >= 75) return '#4ade80';
  if (score >= 55) return '#facc15';
  if (score >= 35) return '#fb923c';
  return '#f87171';
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;
  const color = scoreArcColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-14">
        <svg viewBox="0 0 100 56" className="w-full h-full">
          {/* Background arc */}
          <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" stroke="currentColor" strokeWidth="8"
            className="text-muted/40" strokeLinecap="round" />
          {/* Score arc */}
          <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${offset}`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-2xl font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-[9px] text-muted-foreground">/ 100</span>
        </div>
      </div>
    </div>
  );
}

export default function AIDealScorer({ vehicle }: Props) {
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showScript, setShowScript] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText('');
    setError('');
    setDone(false);
    setStreaming(true);
    setShowScript(false);

    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: SYSTEM_PROMPT,
        contents: [{ role: 'user', parts: [{ text: `Score this deal:\n\n${buildContext(vehicle)}` }] }],
      },
      onChunk: (chunk) => setText(prev => prev + chunk),
      onComplete: () => { setStreaming(false); setDone(true); },
      onError: (err) => { setError(err.message); setStreaming(false); },
      signal: ctrl.signal,
    });
  }, [vehicle]);

  const score = done ? parseScore(text) : null;
  const verdict = done ? parseVerdict(text) : '';

  // Extract sections
  const scriptMatch = text.match(/NEGOTIATION_SCRIPT:\n([\s\S]*?)(?:\nQUICK_TIPS:|$)/);
  const negotiationScript = scriptMatch?.[1]?.trim() ?? '';
  const tipsMatch = text.match(/QUICK_TIPS:\n([\s\S]*?)$/);
  const tips = tipsMatch?.[1]?.trim().split('\n').filter(l => l.startsWith('-')).map(l => l.slice(2)) ?? [];
  const breakdownMatch = text.match(/SCORE_BREAKDOWN:\n([\s\S]*?)(?:\n\nNEGOTIATION_SCRIPT:|$)/);
  const breakdownLines = breakdownMatch?.[1]?.trim().split('\n').filter(l => l.startsWith('-')) ?? [];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-amber-400" />
            </div>
            AI Deal Scorer
          </CardTitle>
          <div className="flex gap-1.5">
            {!streaming && (
              <Button size="sm" onClick={run} className="h-7 text-xs px-2.5 bg-amber-500 hover:bg-amber-600 text-white border-0">
                {done ? <><RefreshCw className="w-3 h-3 mr-1" />Re-score</> : <><Zap className="w-3 h-3 mr-1" />Score Deal</>}
              </Button>
            )}
            {streaming && (
              <Button size="sm" variant="outline" onClick={() => { abortRef.current?.abort(); setStreaming(false); }} className="h-7 text-xs px-2.5 border-border">
                <X className="w-3 h-3 mr-1" />Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {!text && !streaming && !error && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-amber-400/60 shrink-0" />
            <span>Score this deal 0–100 and get a negotiation script tailored to the vehicle.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        {streaming && !score && (
          <div className="flex items-center gap-1.5 py-3">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">Scoring deal…</span>
          </div>
        )}

        {score !== null && (
          <div className="space-y-3">
            {/* Score + verdict */}
            <div className="flex items-center gap-4">
              <ScoreGauge score={score} />
              <div className="flex-1 min-w-0">
                {verdict && (
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border inline-block', verdictColor(verdict))}>
                    {verdict}
                  </span>
                )}
                {breakdownLines.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {breakdownLines.map((line, i) => {
                      const [cat, rest] = line.split(': ');
                      return (
                        <div key={i} className="text-[10px] text-muted-foreground">
                          <span className="text-foreground font-medium">{cat.slice(2)}</span>
                          {rest && <span>: {rest}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick tips */}
            {tips.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Quick Tips</p>
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Negotiation script toggle */}
            {negotiationScript && (
              <div>
                <button
                  onClick={() => setShowScript(s => !s)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {showScript ? 'Hide' : 'Show'} negotiation script
                </button>
                {showScript && (
                  <div className="mt-2 bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 text-xs text-muted-foreground italic leading-relaxed">
                    "{negotiationScript}"
                  </div>
                )}
              </div>
            )}

            {streaming && (
              <div className="flex items-center gap-1 pt-1">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
