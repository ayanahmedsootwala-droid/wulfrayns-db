import React, { useEffect, useState } from 'react';
import {
  Wallet, Plus, Trash2, RefreshCw, Calculator, Bot, Sparkles,
  CheckCircle2, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchFinancePlans, createFinancePlan, calcMonthlyInstalment, type FinancePlan } from '@/lib/rpm-api';
import { streamLLMQueued } from '@/lib/ai-client';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function FinancePage() {
  const [plans, setPlans] = useState<FinancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPlan, setNewPlan] = useState({ bank_name: '', plan_name: '', interest_rate_pct: '', tenure_months: '60', min_down_pct: '20', is_islamic: false });

  // Calculator state
  const [vehiclePrice, setVehiclePrice] = useState('');
  const [downPct, setDownPct] = useState('20');
  const [calcResults, setCalcResults] = useState<{ plan: FinancePlan; monthly: number; total: number; downAmount: number }[]>([]);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setPlans(await fetchFinancePlans()); }
    finally { setLoading(false); }
  };

  const calculate = () => {
    const price = Number(vehiclePrice);
    const down = Number(downPct);
    if (!price) { toast.error('Enter vehicle price'); return; }
    const results = plans.map(p => {
      const monthly = calcMonthlyInstalment(price, down, p.interest_rate_pct, p.tenure_months);
      const downAmount = price * (down / 100);
      const total = downAmount + monthly * p.tenure_months;
      return { plan: p, monthly, total, downAmount };
    }).sort((a, b) => a.monthly - b.monthly);
    setCalcResults(results);
  };

  const getAIAdvice = () => {
    if (!calcResults.length) { toast.error('Calculate first'); return; }
    setAiLoading(true); setAiAdvice('');
    abortRef.current = new AbortController();
    const price = Number(vehiclePrice);
    const top3 = calcResults.slice(0, 3);
    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are Wulfrayn\'s DB AI Copilot specializing in Pakistani car financing.',
        contents: [{ role: 'user', parts: [{ text:
          `Vehicle: PKR ${formatCurrency(price)}, Down Payment: ${downPct}%
Top finance options:
${top3.map(r => `- ${r.plan.bank_name} ${r.plan.is_islamic ? '(Islamic)' : ''}: ${r.plan.interest_rate_pct}% · ${r.plan.tenure_months/12}yr · Monthly PKR ${formatCurrency(r.monthly)}`).join('\n')}

Advise which plan is best and why. Consider Islamic finance preference common in Pakistan. Keep concise (4-5 lines).`
        }] }],
      },
      onChunk: c => setAiAdvice(p => p + c),
      onComplete: () => setAiLoading(false),
      onError: (e) => { setAiLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — please wait and retry' : 'AI failed'); },
      signal: abortRef.current.signal,
    });
  };

  const savePlan = async () => {
    if (!newPlan.bank_name || !newPlan.interest_rate_pct) return;
    setSaving(true);
    try {
      await createFinancePlan({
        bank_name: newPlan.bank_name, plan_name: newPlan.plan_name || undefined,
        interest_rate_pct: Number(newPlan.interest_rate_pct),
        tenure_months: Number(newPlan.tenure_months),
        min_down_pct: Number(newPlan.min_down_pct),
        is_islamic: newPlan.is_islamic, is_active: true,
      });
      toast.success('Plan added'); setDialogOpen(false); load();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Finance Plans
            </h1>
            <p className="text-xs text-muted-foreground">Compare bank financing options · EMI calculator</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Bank
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Calculator */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" /> EMI Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Vehicle Price (PKR)</Label>
                  <Input type="number" value={vehiclePrice} onChange={e => setVehiclePrice(e.target.value)} placeholder="8000000" className="h-8 text-xs bg-muted/40" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Down Payment %</Label>
                  <Input type="number" value={downPct} onChange={e => setDownPct(e.target.value)} placeholder="20" className="h-8 text-xs bg-muted/40" />
                  {vehiclePrice && <p className="text-xs text-primary mt-1">= {formatCurrency(Number(vehiclePrice) * Number(downPct) / 100)}</p>}
                </div>
                <Button className="w-full gap-2" onClick={calculate} disabled={!vehiclePrice || !plans.length}>
                  <Calculator className="w-4 h-4" /> Calculate All Banks
                </Button>
                {calcResults.length > 0 && (
                  <Button variant="outline" className="w-full gap-2" onClick={getAIAdvice} disabled={aiLoading}>
                    <Bot className="w-4 h-4 text-primary" /> {aiLoading ? 'Analyzing...' : 'AI Recommendation'}
                  </Button>
                )}
                {aiAdvice && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-primary mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Advice</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {aiAdvice}{aiLoading && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results + Plans list */}
          <div className="lg:col-span-3 space-y-3">
            {calcResults.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comparison Results</p>
                {calcResults.map((r, i) => (
                  <motion.div key={r.plan.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={cn('bg-card border-border', i === 0 && 'border-primary/40 bg-primary/5')}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {i === 0 && <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{r.plan.bank_name}</span>
                              {r.plan.is_islamic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 border border-green-400/20 text-green-400">Islamic</span>}
                              {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">Best Rate</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Monthly</p>
                                <p className="text-sm font-bold text-primary">{formatCurrency(r.monthly)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Down</p>
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(r.downAmount)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Total Cost</p>
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(r.total)}</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">{r.plan.interest_rate_pct}% p.a. · {r.plan.tenure_months / 12} years · Min {r.plan.min_down_pct}% down</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Finance Plans ({plans.length})</p>
                {loading ? (
                  <div className="flex items-center justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2">
                    {plans.map(p => (
                      <Card key={p.id} className="bg-card border-border">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{p.bank_name}</span>
                                {p.is_islamic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 border border-green-400/20 text-green-400">Islamic</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">{p.plan_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">{p.interest_rate_pct}% p.a.</p>
                              <p className="text-[10px] text-muted-foreground">{p.tenure_months / 12}yr · {p.min_down_pct}% down</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>Add Finance Plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            {[
              { label: 'Bank Name *', key: 'bank_name' },
              { label: 'Plan Name', key: 'plan_name' },
              { label: 'Interest Rate % p.a.', key: 'interest_rate_pct' },
              { label: 'Tenure (months)', key: 'tenure_months' },
              { label: 'Min Down %', key: 'min_down_pct' },
            ].map(({ label, key }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                <Input value={(newPlan as unknown as Record<string, string>)[key] ?? ''} onChange={e => setNewPlan(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-xs bg-muted/40" />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="islamic" checked={newPlan.is_islamic} onChange={e => setNewPlan(p => ({ ...p, is_islamic: e.target.checked }))} />
              <Label htmlFor="islamic" className="text-xs">Islamic Finance</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePlan} disabled={saving || !newPlan.bank_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
