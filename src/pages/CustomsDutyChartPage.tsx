import React, { useState, useMemo } from 'react';
import { Pencil, Save, X, Info, RotateCcw, Download, Calculator, TrendingDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_USD_PKR = 280;
const DEFAULT_USD_GBP = 0.79;
const DEFAULT_USD_AED = 3.67;
const DEFAULT_USD_JPY = 150;

const INITIAL_SLABS = [
  { id: 1, cc: 'Up to 800cc',                   usd: 4800  },
  { id: 2, cc: '801cc – 1000cc',                 usd: 6000  },
  { id: 3, cc: '1001cc – 1300cc',                usd: 13200 },
  { id: 4, cc: '1301cc – 1500cc',                usd: 18590 },
  { id: 5, cc: '1501cc – 1600cc',                usd: 22550 },
  { id: 6, cc: '1601cc – 1800cc (excl. Jeeps)',  usd: 27940 },
];

const SLAB_COLORS = [
  'text-green-400','text-blue-400','text-yellow-400',
  'text-orange-400','text-orange-400','text-red-400',
];

const VEHICLE_CATEGORIES = [
  { id: 'passenger', label: 'Passenger Car' },
  { id: 'suv', label: 'SUV / Jeep (+10%)' },
  { id: 'hybrid', label: 'HEV (up to 1800cc) −50%' },
  { id: 'hybrid_large', label: 'HEV (1800–2500cc) −25%' },
  { id: 'ev', label: 'Electric Vehicle (EV) −75%' },
];

const CURRENCIES = [
  { id: 'pkr', label: 'PKR', symbol: '₨' },
  { id: 'usd', label: 'USD', symbol: '$' },
  { id: 'gbp', label: 'GBP', symbol: '£' },
  { id: 'aed', label: 'AED', symbol: 'د.إ' },
  { id: 'jpy', label: 'JPY', symbol: '¥' },
];

function fmtPkr(pkr: number) {
  if (pkr >= 1_000_000) return `PKR ${(pkr / 1_000_000).toFixed(2)}M`;
  if (pkr >= 100_000)   return `PKR ${(pkr / 100_000).toFixed(2)}L`;
  return `PKR ${Math.round(pkr).toLocaleString()}`;
}

export default function CustomsDutyChartPage() {
  const [slabs, setSlabs] = useState(INITIAL_SLABS.map(s => ({ ...s })));
  const [usdPkr, setUsdPkr]     = useState(DEFAULT_USD_PKR);
  const [depMonths, setDepMonths] = useState(0);
  const [category, setCategory] = useState('passenger');
  const [steeringHand, setSteeringHand] = useState<'rhd' | 'lhd'>('rhd');
  const [displayCurrency, setDisplayCurrency] = useState('pkr');
  const [customCC, setCustomCC] = useState('');
  const [editId, setEditId]     = useState<number | null>(null);
  const [editUsd, setEditUsd]   = useState('');

  const startEdit = (s: typeof INITIAL_SLABS[0]) => { setEditId(s.id); setEditUsd(s.usd.toString()); };
  const cancelEdit = () => { setEditId(null); setEditUsd(''); };
  const saveEdit = () => {
    const val = parseFloat(editUsd);
    if (!isNaN(val) && val >= 0) {
      setSlabs(prev => prev.map(s => s.id === editId ? { ...s, usd: val } : s));
    }
    setEditId(null); setEditUsd('');
  };
  const resetSlabs = () => { setSlabs(INITIAL_SLABS.map(s => ({ ...s }))); toast.success('Slabs reset to FBR defaults'); };

  const depRate = Math.min(depMonths * 0.01, 0.5);

  const getCategoryMultiplier = () => {
    switch (category) {
      case 'suv': return 1.10;
      case 'hybrid': return 0.50;
      case 'hybrid_large': return 0.75;
      case 'ev': return 0.25;
      default: return 1.0;
    }
  };

  const getLhdSurcharge = () => steeringHand === 'lhd' ? 1.05 : 1.0;

  const toDisplayCurrency = (pkrAmount: number) => {
    switch (displayCurrency) {
      case 'usd': return pkrAmount / usdPkr;
      case 'gbp': return (pkrAmount / usdPkr) * DEFAULT_USD_GBP;
      case 'aed': return (pkrAmount / usdPkr) / DEFAULT_USD_AED;
      case 'jpy': return (pkrAmount / usdPkr) / (1 / DEFAULT_USD_JPY);
      default: return pkrAmount;
    }
  };

  const fmtDisplay = (pkrAmount: number) => {
    const curr = CURRENCIES.find(c => c.id === displayCurrency)!;
    const val = toDisplayCurrency(pkrAmount);
    if (displayCurrency === 'pkr') {
      if (val >= 1_000_000) return `${curr.symbol}${(val / 1_000_000).toFixed(2)}M`;
      if (val >= 100_000) return `${curr.symbol}${(val / 100_000).toFixed(2)}L`;
      return `${curr.symbol}${Math.round(val).toLocaleString()}`;
    }
    return `${curr.symbol}${Math.round(val).toLocaleString()}`;
  };

  // Custom CC finder
  const customCCNum = parseInt(customCC);
  const matchedSlab = useMemo(() => {
    if (!customCCNum || isNaN(customCCNum)) return null;
    if (customCCNum <= 800) return slabs[0];
    if (customCCNum <= 1000) return slabs[1];
    if (customCCNum <= 1300) return slabs[2];
    if (customCCNum <= 1500) return slabs[3];
    if (customCCNum <= 1600) return slabs[4];
    if (customCCNum <= 1800) return slabs[5];
    return null;
  }, [customCCNum, slabs]);

  const computeRow = (usdBase: number) => {
    const basePkr = usdBase * usdPkr;
    const afterDep = basePkr * (1 - depRate);
    const afterCat = afterDep * getCategoryMultiplier();
    const afterLhd = afterCat * getLhdSurcharge();
    return afterLhd;
  };

  const exportCSV = () => {
    const rows = slabs.map(s => {
      const final = computeRow(s.usd);
      return `"${s.cc}","${s.usd}","${Math.round(s.usd * usdPkr).toLocaleString()}","${Math.round(final).toLocaleString()}"`;
    });
    const csv = `CC Slab,USD (Base),PKR (Base),PKR (Adjusted)\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `duty_chart_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url); toast.success('Duty chart exported');
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Customs Duty Chart
            </h1>
            <p className="text-sm text-muted-foreground">FBR Pakistan 2026 — fully customisable duty slabs</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={resetSlabs} className="h-8 text-xs gap-1.5 border-border">
              <RotateCcw className="w-3 h-3" />Reset FBR
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5 border-border">
              <Download className="w-3 h-3" />Export CSV
            </Button>
          </div>
        </div>

        {/* Full Customisation Panel */}
        <Card className="bg-card border-border">
          <CardHeader className="px-5 py-3 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary"/>Customisation Options</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">USD / PKR Rate</Label>
                <Input type="number" value={usdPkr} onChange={e => setUsdPkr(parseFloat(e.target.value) || DEFAULT_USD_PKR)}
                  className="h-8 text-xs border-border" placeholder="280" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vehicle Age (months)</Label>
                <Input type="number" value={depMonths} min={0} max={50}
                  onChange={e => setDepMonths(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="h-8 text-xs border-border" placeholder="0" />
                <p className="text-[10px] text-muted-foreground">Depreciation: {(depRate*100).toFixed(0)}%</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vehicle Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Steering</Label>
                <Select value={steeringHand} onValueChange={v => setSteeringHand(v as 'rhd' | 'lhd')}>
                  <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rhd" className="text-xs">RHD — Right Hand Drive</SelectItem>
                    <SelectItem value="lhd" className="text-xs">LHD — Left Hand Drive (+5%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display Currency</Label>
                <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                  <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label} ({c.symbol})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Find My CC</Label>
                <Input type="number" value={customCC} onChange={e => setCustomCC(e.target.value)}
                  className="h-8 text-xs border-border" placeholder="e.g. 1496" />
                {matchedSlab && <p className="text-[10px] text-primary">→ Slab: {matchedSlab.cc}</p>}
                {customCC && !matchedSlab && <p className="text-[10px] text-red-400">Above 1800cc not in standard slabs</p>}
              </div>
            </div>

            {/* Active multipliers summary */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {depRate > 0 && <Badge className="text-[10px] bg-blue-400/10 text-blue-400 border-blue-400/20 gap-1"><TrendingDown className="w-2.5 h-2.5"/>−{(depRate*100).toFixed(0)}% depreciation</Badge>}
              {category !== 'passenger' && <Badge className="text-[10px] bg-amber-400/10 text-amber-400 border-amber-400/20">{VEHICLE_CATEGORIES.find(c=>c.id===category)?.label}</Badge>}
              {steeringHand === 'lhd' && <Badge className="text-[10px] bg-orange-400/10 text-orange-400 border-orange-400/20">+5% LHD surcharge</Badge>}
              {displayCurrency !== 'pkr' && <Badge className="text-[10px] bg-purple-400/10 text-purple-400 border-purple-400/20">Display: {CURRENCIES.find(c=>c.id===displayCurrency)?.label}</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Duty Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Engine CC Slab</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Base (USD)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Base (PKR)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-primary whitespace-nowrap">Adjusted Duty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Edit</th>
              </tr>
            </thead>
            <tbody>
              {slabs.map((s, i) => {
                const finalPkr = computeRow(s.usd);
                const isMatched = matchedSlab?.id === s.id;
                return (
                  <tr key={s.id} className={cn('border-t border-border transition-colors', isMatched ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/20')}>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', SLAB_COLORS[i])}>{s.cc}</span>
                      {isMatched && <Badge className="ml-2 text-[9px] bg-primary/15 text-primary border-primary/30">Your CC</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono">
                      {editId === s.id ? (
                        <Input value={editUsd} onChange={e => setEditUsd(e.target.value)}
                          className="h-7 text-xs w-24 text-right ml-auto border-border" type="number" />
                      ) : (
                        `$${s.usd.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {fmtPkr(s.usd * usdPkr)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-sm font-bold font-mono whitespace-nowrap', SLAB_COLORS[i])}>
                        {fmtDisplay(finalPkr)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editId === s.id ? (
                        <span className="flex items-center justify-center gap-1">
                          <button onClick={saveEdit} className="text-green-400 hover:text-green-300 transition-colors"><Save className="w-3.5 h-3.5"/></button>
                          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5"/></button>
                        </span>
                      ) : (
                        <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ Depreciation:</span> Duty &amp; taxes reducible at <span className="text-primary font-semibold">1% per month</span> based on vehicle age from manufacture date. Enter age in months above to see effective amounts.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ HEV 50% Exemption:</span> Applicable on import of Hybrid Electric Vehicles (HEVs) of engine capacity <span className="text-emerald-400 font-semibold">up to 1800cc</span>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ HEV 25% Exemption:</span> Applicable on import of HEVs of engine capacity <span className="text-yellow-400 font-semibold">1800cc to 2500cc</span>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ EV 75% Exemption:</span> Select Electric Vehicle category above.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ LHD Surcharge:</span> Left-hand drive vehicles attract an additional 5% levy.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">★ PKR Rate:</span> Computed at your entered USD/PKR rate. Default: 1 USD = PKR 280. Adjust above to current SBP rate on filing date.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Source:</span> FBR Pakistan Customs Tariff 2026 — Asian makes, passenger vehicles for transportation of persons. USD amounts are fixed per FBR SRO 2026.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
