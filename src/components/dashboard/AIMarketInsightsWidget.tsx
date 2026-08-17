import React, { useState, useRef } from 'react';
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { streamLLM } from '@/lib/sse';
import type { StreamRequestOptions } from '@/lib/sse';import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MarketInsight {
  type: 'valuation' | 'triage' | 'trend';
  title: string;
  summary: string;
  loading: boolean;
  expanded: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function AIMarketInsightsWidget() {
  const [insights, setInsights] = useState<MarketInsight[]>([
    { type: 'valuation',  title: 'Stock Valuation Snapshot', summary: '', loading: false, expanded: false },
    { type: 'triage',     title: 'Inquiry Triage',           summary: '', loading: false, expanded: false },
    { type: 'trend',      title: 'Market Trend Brief',       summary: '', loading: false, expanded: false },
  ]);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    setGenerating(true);
    setInsights(i => i.map(x => ({ ...x, loading: true, summary: '' })));

    try {
      // Fetch live data in parallel
      const [{ data: vehicles }, { data: inquiries }] = await Promise.all([
        supabase.from('vehicles')
          .select('make,model,model_year,expected_selling_price,status,fuel_type,mileage,origin')
          .in('status', ['available', 'reserved', 'booked'])
          .limit(40),
        supabase.from('inquiries')
          .select('customer_name,req_make,req_model,req_budget_max,priority,status,created_at')
          .in('status', ['new', 'active'])
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const stockSummary = (vehicles ?? []).slice(0, 15).map(v =>
        `${v.make} ${v.model} ${v.model_year ?? ''} (${v.status}) PKR ${v.expected_selling_price ? (v.expected_selling_price / 100000).toFixed(0) + 'L' : '?'} ${v.fuel_type ?? ''} ${v.mileage ? v.mileage + 'km' : ''}`
      ).join('\n');

      const inquirySummary = (inquiries ?? []).slice(0, 10).map(i =>
        `${i.customer_name ?? 'Customer'} wants ${i.req_make ?? ''} ${i.req_model ?? ''} budget ≤PKR ${i.req_budget_max ? (i.req_budget_max / 100000).toFixed(0) + 'L' : '?'} [${i.priority ?? 'medium'}]`
      ).join('\n');

      const prompts: { idx: number; prompt: string }[] = [
        {
          idx: 0,
          prompt: `You are a car market analyst for a Pakistani dealership. Analyze this stock list and give a 3-bullet valuation snapshot (under 80 words): which cars are priced right, which are over/under priced vs current JDM market, and 1 pricing recommendation.\n\nSTOCK:\n${stockSummary}`,
        },
        {
          idx: 1,
          prompt: `You are a sales triage AI for a Pakistani car dealership. Review these active inquiries and give a 3-bullet triage summary (under 80 words): top 2 hottest leads to follow up today, any budget mismatch issues, and 1 quick win opportunity.\n\nINQUIRIES:\n${inquirySummary}`,
        },
        {
          idx: 2,
          prompt: `You are a Pakistani car market trend analyst. Based on the stock mix and active inquiry budgets below, give a 3-bullet market trend brief (under 80 words): most in-demand segment, biggest supply gap, and 1 sourcing recommendation for next auction.\n\nSTOCK:\n${stockSummary}\n\nINQUIRIES:\n${inquirySummary}`,
        },
      ];

      // Fire all 3 streams in parallel
      await Promise.all(prompts.map(({ idx, prompt }) => {
        return new Promise<void>((resolve) => {
          const controller = new AbortController();
          let text = '';
          const options: StreamRequestOptions = {
            functionName: 'ai-chat',
            supabaseUrl: SUPABASE_URL,
            supabaseAnonKey: ANON_KEY,
            requestBody: {
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 600,
            },
            onChunk: (chunk: string) => {
              text += chunk;
              setInsights(prev => prev.map((x, i) => i === idx ? { ...x, summary: text, loading: false } : x));
            },
            onComplete: () => resolve(),
            onError: () => {
              setInsights(prev => prev.map((x, i) => i === idx ? { ...x, summary: 'AI unavailable — check API key in Settings.', loading: false } : x));
              resolve();
            },
            signal: controller.signal,
          };
          streamLLM(options);
        });
      }));
    } catch (e) {
      toast.error('Market insights failed');
      setInsights(i => i.map(x => ({ ...x, loading: false, summary: 'Failed to generate. Check AI settings.' })));
    } finally {
      setGenerating(false);
    }
  };

  const toggle = (idx: number) => setInsights(prev => prev.map((x, i) => i === idx ? { ...x, expanded: !x.expanded } : x));

  const TYPE_COLORS: Record<string, string> = {
    valuation: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    triage:    'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    trend:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />AI Market Insights
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={generate} disabled={generating}>
            {generating
              ? <><RefreshCw className="w-3 h-3 animate-spin" />Analysing…</>
              : <><Sparkles className="w-3 h-3 text-primary" />{insights[0].summary ? 'Refresh' : 'Generate'}</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {!insights[0].summary && !generating && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
            <TrendingUp className="w-7 h-7 opacity-20" />
            <p className="text-xs text-center">Click Generate to get AI-powered<br/>valuation, triage & market insights</p>
          </div>
        )}
        {insights.map((ins, idx) => (
          ins.loading || ins.summary ? (
            <div key={idx} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between px-3 py-2 bg-card hover:bg-muted/30 transition-colors text-left gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0 capitalize', TYPE_COLORS[ins.type])}>
                    {ins.type}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground truncate">{ins.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ins.loading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                  {ins.expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>
              {(ins.expanded || idx === 0) && ins.summary && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/10">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{ins.summary}</p>
                </div>
              )}
              {ins.loading && (
                <div className="px-3 pb-2 pt-1 border-t border-border/50">
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
            </div>
          ) : null
        ))}
      </CardContent>
    </Card>
  );
}
