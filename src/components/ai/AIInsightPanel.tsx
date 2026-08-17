import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, X, RefreshCw, AlertTriangle, TrendingUp, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, formatMileage } from '@/lib/utils';
import type { Vehicle } from '@/types/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Props { vehicle: Vehicle }

function buildVehicleContext(v: Vehicle): string {
  const fields: string[] = [
    `${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}, ${v.model_year ?? '—'}`,
    `Mileage: ${v.mileage != null ? formatMileage(v.mileage) : 'N/A'}`,
    `Color: ${v.color ?? 'N/A'}`,
    `Engine: ${v.engine_capacity ?? 'N/A'}, Fuel: ${v.fuel_type ?? 'N/A'}, Trans: ${v.transmission ?? 'N/A'}`,
    `Body: ${v.body_type ?? 'N/A'}, Drive: ${v.drive_type ?? 'N/A'}`,
    `Condition: ${v.vehicle_condition ?? 'N/A'}, Inspection score: ${v.inspection_score ?? 'N/A'}/10`,
    `Purchase price: ${formatCurrency(v.purchase_price)}, Demand: ${formatCurrency(v.expected_selling_price)}`,
    `Listed: ${v.created_at ? Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000) + ' days ago' : 'N/A'}`,
    `Status: ${v.status ?? 'N/A'}`,
    `City: ${v.dealer_city ?? 'N/A'}`,
    `Accident history: ${v.has_accident_history ? 'Yes' : 'No'}`,
    `Original paint: ${v.original_paint_pct != null ? v.original_paint_pct + '%' : 'N/A'}`,
    `Rust: ${v.has_rust ? 'Yes' : 'No'}, Flood: ${v.has_flood_damage ? 'Yes' : 'No'}`,
    `Panels painted: ${v.panels_painted ?? 0}, replaced: ${v.panels_replaced ?? 0}`,
    `Engine health: ${v.engine_health ?? 'N/A'}/10, Transmission: ${v.transmission_health ?? 'N/A'}/10`,
    `AC: ${v.ac_condition ?? 'N/A'}/10, Tyres: ${v.tyres_condition ?? 'N/A'}/10`,
    `Has sunroof: ${v.has_sunroof ? 'Yes' : 'No'}, Android panel: ${v.has_android_panel ? 'Yes' : 'No'}`,
    `Is hot deal: ${v.is_hot_deal ? 'Yes' : 'No'}, Urgent: ${v.is_urgent ? 'Yes' : 'No'}`,
    v.mechanical_notes ? `Mechanical notes: ${v.mechanical_notes}` : '',
    v.private_notes ? `Private notes: ${v.private_notes}` : '',
  ].filter(Boolean);
  return fields.join('\n');
}

const SYSTEM_PROMPT = `You are an expert Pakistani automotive market analyst and dealer assistant. 
Analyze vehicle data and provide concise, actionable insights. 
Always structure your response as:

**Market Valuation** (2-3 sentences on pricing vs market)
**Condition Assessment** (2-3 sentences on mechanical/cosmetic condition)  
**Risk Flags** (bullet list of any red flags — write "None detected" if clean)
**Sell Recommendation** (1-2 sentences on best strategy)
**Estimated Fair Price Range** (give a PKR range, e.g. PKR 3.2M – 3.6M)

Be direct, specific, and actionable. Use Pakistani market context. Keep it under 300 words.`;

export default function AIInsightPanel({ vehicle }: Props) {
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText('');
    setError('');
    setDone(false);
    setStreaming(true);
    setCollapsed(false);

    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: SYSTEM_PROMPT,
        contents: [{
          role: 'user',
          parts: [{ text: `Analyze this vehicle:\n\n${buildVehicleContext(vehicle)}` }],
        }],
      },
      onChunk: (chunk) => setText(prev => prev + chunk),
      onComplete: () => { setStreaming(false); setDone(true); },
      onError: (err) => { setError(err.message); setStreaming(false); },
      signal: ctrl.signal,
    });
  }, [vehicle]);

  const stop = () => { abortRef.current?.abort(); setStreaming(false); };

  // Parse sections from markdown-style text
  const renderText = (raw: string) => {
    if (!raw) return null;
    return raw.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.includes('**')) {
        const title = line.replace(/\*\*/g, '');
        return <p key={i} className="text-xs font-semibold text-foreground mt-3 first:mt-0">{title}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.slice(2);
        const isRisk = /accident|rust|flood|damage|paint|panel|high mileage/i.test(content);
        return (
          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground pl-1">
            <span className={isRisk ? 'text-red-400 mt-0.5' : 'text-green-400 mt-0.5'}>
              {isRisk ? '⚠' : '✓'}
            </span>
            <span>{content}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>
            AI Vehicle Analysis
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {done && (
              <button onClick={() => setCollapsed(c => !c)} className="text-muted-foreground hover:text-foreground p-1">
                {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
            {!streaming && (
              <Button size="sm" onClick={run} className="h-7 text-xs px-2.5 bg-purple-500 hover:bg-purple-600 text-white border-0">
                {done ? <><RefreshCw className="w-3 h-3 mr-1" />Re-analyze</> : <><Sparkles className="w-3 h-3 mr-1" />Analyze</>}
              </Button>
            )}
            {streaming && (
              <Button size="sm" variant="outline" onClick={stop} className="h-7 text-xs px-2.5 border-border">
                <X className="w-3 h-3 mr-1" />Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-4 pb-4">
          {!text && !streaming && !error && (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-purple-400/60 shrink-0" />
              <span>Get an AI-powered valuation, condition assessment, and risk analysis for this vehicle.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Analysis failed — {error}. Please try again.</span>
            </div>
          )}

          {(text || streaming) && (
            <div className="space-y-0.5">
              {renderText(text)}
              {streaming && (
                <div className="flex items-center gap-1 mt-2">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">Analyzing…</span>
                </div>
              )}
            </div>
          )}

          {done && (
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border">
              <ShieldCheck className="w-3 h-3 text-green-400 shrink-0" />
              <span className="text-[10px] text-muted-foreground">Powered by Gemini 2.5 Flash · Analysis is advisory only</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
