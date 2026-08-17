import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitCompare, Plus, X, ChevronDown, Car, Sparkles, Send,
  Check, RefreshCw, Star, Zap, AlertTriangle, DollarSign,
  Activity, Fuel, Settings2, Calendar, Tag, Shield,
  CheckCircle2, XCircle, Building2, Phone, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchVehicles, fetchVehicle } from '@/lib/api';
import { formatCurrency, formatMileage, getStatusColor, cn } from '@/lib/utils';
import { streamLLMQueued } from '@/lib/ai-client';
import type { Vehicle, Dealer } from '@/types/types';
import { toast } from 'sonner';

// ─── Vehicle Picker ───────────────────────────────────────────────────────────
function VehiclePicker({ onSelect, exclude }: { onSelect: (v: Vehicle) => void; exclude: string[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await fetchVehicles({ search, pageSize: 10 });
      setResults(data.filter(v => !exclude.includes(v.id)));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, exclude]);

  useEffect(() => {
    if (!open) { setSearch(''); setResults([]); }
  }, [open]);

  return (
    <div className="relative">
      <Button variant="outline" className="h-full w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/3 transition-all min-h-[200px]"
        onClick={() => setOpen(true)}>
        <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Add Vehicle</p>
          <p className="text-xs text-muted-foreground mt-0.5">Search inventory to compare</p>
        </div>
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="absolute top-0 left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle…"
                  className="h-7 bg-transparent border-none shadow-none text-sm p-0 focus-visible:ring-0" autoFocus />
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loading && <div className="p-3 text-xs text-muted-foreground text-center">Searching…</div>}
                {!loading && results.length === 0 && search.trim() && (
                  <div className="p-3 text-xs text-muted-foreground text-center">No results for "{search}"</div>
                )}
                {results.map(v => (
                  <button key={v.id} onClick={() => { onSelect(v); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left">
                    <div className="w-10 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {v.cover_image_url
                        ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
                        : <Car className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.make} {v.model} {v.variant}</p>
                      <p className="text-xs text-muted-foreground">{v.model_year} · {formatCurrency(v.expected_selling_price)}</p>
                    </div>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', getStatusColor(v.status))}>{v.status}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Comparison Row ───────────────────────────────────────────────────────────
function CompRow({ label, values, highlight }: {
  label: string;
  values: (string | undefined | null)[];
  highlight?: boolean;
}) {
  if (values.every(v => !v)) return null;
  const best = highlight ? values.indexOf([...values].sort((a, b) => (parseFloat(b ?? '0') - parseFloat(a ?? '0')))[0]) : -1;
  return (
    <div className={cn('grid gap-0 border-b border-border/30 last:border-0', values.length === 2 ? 'grid-cols-[140px_1fr_1fr]' : 'grid-cols-[140px_1fr_1fr_1fr]')}>
      <div className="px-3 py-2.5 text-xs text-muted-foreground font-medium bg-muted/10">{label}</div>
      {values.map((val, i) => (
        <div key={i} className={cn('px-3 py-2.5 text-sm font-semibold text-center border-l border-border/30',
          !val ? 'text-muted-foreground/40' : 'text-foreground',
          best === i && 'text-green-400 bg-green-400/5')}>
          {val ?? '—'}
        </div>
      ))}
    </div>
  );
}

function BoolRow({ label, values }: { label: string; values: (boolean | undefined | null)[] }) {
  if (values.every(v => v == null)) return null;
  return (
    <div className={cn('grid gap-0 border-b border-border/30 last:border-0', values.length === 2 ? 'grid-cols-[140px_1fr_1fr]' : 'grid-cols-[140px_1fr_1fr_1fr]')}>
      <div className="px-3 py-2.5 text-xs text-muted-foreground font-medium bg-muted/10">{label}</div>
      {values.map((val, i) => (
        <div key={i} className="px-3 py-2.5 text-center border-l border-border/30 flex items-center justify-center">
          {val ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/30" />}
        </div>
      ))}
    </div>
  );
}

// ─── AI Verdict Panel ─────────────────────────────────────────────────────────
function AIVerdictPanel({ vehicles }: { vehicles: Vehicle[] }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = () => {
    if (loading || vehicles.length < 2) return;
    setText(''); setLoading(true); setRan(true);
    abortRef.current = new AbortController();
    const vData = vehicles.map(v => `
Vehicle: ${v.make} ${v.model} ${v.variant ?? ''} (${v.model_year})
Price: PKR ${formatCurrency(v.expected_selling_price)} | Cost: PKR ${formatCurrency(v.purchase_price)}
Mileage: ${formatMileage(v.mileage)} | Fuel: ${v.fuel_type} | Trans: ${v.transmission}
Engine: ${v.engine_capacity} | Body: ${v.body_type} | Color: ${v.color}
Condition: ${v.vehicle_condition} | Inspection Score: ${v.inspection_score ?? 'N/A'}/100
Days in Stock: ${v.created_at ? Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000) : '?'}
Status: ${v.status} | Origin: ${v.origin ?? 'N/A'}
Features: ${[v.has_sunroof && 'Sunroof', v.has_android_panel && 'Android Panel', v.has_abs && 'ABS', v.has_push_start && 'Push Start', v.has_climate_control && 'Climate Control'].filter(Boolean).join(', ') || 'N/A'}
`).join('\n---\n');

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are Wulfrayn\'s DB AI — a senior Pakistani automotive market expert. Give a detailed comparison verdict covering: Best Value, Best Condition, Best Resale, Recommendation for a typical buyer, and Dealer/Sales Strategy for each car. Use clear headings and bullet points. Be specific with PKR prices.',
        contents: [{ role: 'user', parts: [{ text: `Compare these ${vehicles.length} vehicles for me:\n${vData}\n\nGive me a verdict on which is the best buy and why. Include sales strategy for each.` }] }],
      },
      onChunk: c => setText(p => p + c),
      onComplete: () => setLoading(false),
      onError: e => { setLoading(false); setText(`❌ ${e.message}`); },
      signal: abortRef.current.signal,
    });
  };

  return (
    <Card className="bg-card border-primary/20 border">
      <CardHeader className="px-4 py-3 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />AI Comparison Verdict
          <Badge className="bg-purple-400/15 text-purple-400 border-purple-400/25 text-[10px] ml-auto">Gemini 2.5 Flash</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {!ran ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">Get an AI-powered comparison verdict with buy/sell strategy for each vehicle</p>
            <Button size="sm" className="gap-2" onClick={run} disabled={vehicles.length < 2}>
              <Sparkles className="w-3.5 h-3.5" />Generate AI Verdict
            </Button>
          </div>
        ) : (
          <>
            {loading && !text && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 bg-muted" />)}
              </div>
            )}
            {text && (
              <div className="bg-muted/20 border border-border rounded-xl p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {text}
                {loading && <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse align-middle ml-0.5" />}
              </div>
            )}
            {!loading && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border" onClick={() => { setText(''); setRan(false); }}>
                <RefreshCw className="w-3 h-3" />Regenerate
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function VehicleComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const MAX = 3;

  // Load initial vehicle from URL
  useEffect(() => {
    const a = searchParams.get('a');
    if (a) {
      setLoading(true);
      fetchVehicle(a).then(v => {
        if (v) setVehicles([v]);
        setLoading(false);
      });
    }
  }, [searchParams]);

  const addVehicle = (v: Vehicle) => {
    if (vehicles.length >= MAX) { toast.error(`Maximum ${MAX} vehicles for comparison`); return; }
    setVehicles(prev => [...prev, v]);
  };

  const removeVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const vals = (fn: (v: Vehicle) => string | undefined | null) => vehicles.map(fn);
  const bools = (fn: (v: Vehicle) => boolean | undefined | null) => vehicles.map(fn);
  const n = vehicles.length;

  const colWidth = n === 1 ? 'grid-cols-[140px_1fr]' : n === 2 ? 'grid-cols-[140px_1fr_1fr]' : 'grid-cols-[140px_1fr_1fr_1fr]';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-3 md:p-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <GitCompare className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vehicle Comparison</h1>
            <p className="text-xs text-muted-foreground">Side-by-side comparison of up to 3 vehicles with AI verdict</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {vehicles.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs border-border gap-1.5" onClick={() => setVehicles([])}>
                <X className="w-3 h-3" />Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Vehicle Header Cards */}
        <div className={cn('grid gap-3 mb-4', n === 0 ? 'grid-cols-1 md:grid-cols-3' : n === 1 ? 'grid-cols-1 md:grid-cols-2' : n === 2 ? 'grid-cols-3' : 'grid-cols-3')}>
          {vehicles.map(v => {
            const days = v.created_at ? Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000) : 0;
            return (
              <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-card border-border hover:border-primary/30 transition-colors relative overflow-hidden">
                  <button onClick={() => removeVehicle(v.id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                  {/* Image */}
                  <div className="aspect-[16/9] bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/inventory/${v.id}`)}>
                    {v.cover_image_url
                      ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      : <Car className="w-10 h-10 text-muted-foreground/30" />}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.variant} · {v.model_year}</p>
                      </div>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', getStatusColor(v.status))}>{v.status}</span>
                    </div>
                    {/* Price highlight */}
                    <p className="text-base font-bold text-primary mb-2">{formatCurrency(v.expected_selling_price)}</p>
                    {/* Key specs row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Activity className="w-3 h-3" />{formatMileage(v.mileage)}</span>
                      <span className="flex items-center gap-0.5"><Fuel className="w-3 h-3" />{v.fuel_type}</span>
                      <span className="flex items-center gap-0.5"><Settings2 className="w-3 h-3" />{v.transmission}</span>
                    </div>
                    {/* Dealer */}
                    {v.dealer && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{(v.dealer as Dealer).name}</span>
                        {(v.dealer as Dealer).phone && (
                          <a href={`tel:${(v.dealer as Dealer).phone}`}
                            className="ml-auto text-[11px] text-primary hover:underline shrink-0 flex items-center gap-0.5"
                            onClick={e => e.stopPropagation()}>
                            <Phone className="w-2.5 h-2.5" />{(v.dealer as Dealer).phone}
                          </a>
                        )}
                      </div>
                    )}
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {v.is_hot_deal && <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">Hot Deal</span>}
                      {v.is_featured && <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">Featured</span>}
                      {days > 60 && <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full">{days}d old</span>}
                      {v.inspection_score != null && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">Score: {v.inspection_score}</span>}
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2.5 h-7 text-xs border-border" onClick={() => navigate(`/inventory/${v.id}`)}>
                      View Full Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Add slots */}
          {vehicles.length < MAX && Array.from({ length: Math.max(1, n === 0 ? 3 : n === 1 ? 1 : 1) }).map((_, i) => (
            <VehiclePicker key={i} onSelect={addVehicle} exclude={vehicles.map(v => v.id)} />
          ))}
        </div>

        {/* Comparison Tables */}
        {vehicles.length >= 2 && (
          <div className="space-y-4">
            {/* AI Verdict */}
            <AIVerdictPanel vehicles={vehicles} />

            {/* Pricing */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 py-3 pb-2 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />Pricing & Value
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CompRow label="Asking Price" values={vals(v => formatCurrency(v.expected_selling_price))} />
                <CompRow label="Purchase Cost" values={vals(v => formatCurrency(v.purchase_price))} />
                <CompRow label="Market Price" values={vals(v => formatCurrency(v.market_price))} />
                <CompRow label="Min. Sell Price" values={vals(v => formatCurrency(v.min_selling_price))} />
                <CompRow label="Est. Profit" values={vals(v => formatCurrency(v.profit_estimate))} highlight />
                <CompRow label="Negotiable" values={vals(v => v.is_negotiable ? 'Yes' : 'No')} />
              </CardContent>
            </Card>

            {/* Core Specs */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 py-3 pb-2 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />Core Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CompRow label="Year" values={vals(v => v.model_year?.toString())} />
                <CompRow label="Engine" values={vals(v => v.engine_capacity)} />
                <CompRow label="Fuel Type" values={vals(v => v.fuel_type)} />
                <CompRow label="Transmission" values={vals(v => v.transmission)} />
                <CompRow label="Drive Type" values={vals(v => v.drive_type)} />
                <CompRow label="Body Type" values={vals(v => v.body_type)} />
                <CompRow label="Mileage" values={vals(v => formatMileage(v.mileage))} />
                <CompRow label="Color" values={vals(v => v.color)} />
                <CompRow label="Origin" values={vals(v => v.origin)} />
                <CompRow label="Auction Grade" values={vals(v => v.auction_grade)} />
              </CardContent>
            </Card>

            {/* Condition */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 py-3 pb-2 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />Condition & History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CompRow label="Condition" values={vals(v => v.vehicle_condition)} />
                <CompRow label="Inspection Score" values={vals(v => v.inspection_score?.toString())} highlight />
                <CompRow label="Engine Health" values={vals(v => v.engine_health?.toString())} />
                <CompRow label="Original Paint" values={vals(v => v.original_paint_pct ? `${v.original_paint_pct}%` : undefined)} />
                <CompRow label="Panels Painted" values={vals(v => v.panels_painted?.toString())} />
                <BoolRow label="Accident History" values={bools(v => v.has_accident_history)} />
                <BoolRow label="Flood Damage" values={bools(v => v.has_flood_damage)} />
                <BoolRow label="Rust" values={bools(v => v.has_rust)} />
              </CardContent>
            </Card>

            {/* Safety & Tech */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 py-3 pb-2 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />Safety & Technology
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BoolRow label="ABS" values={bools(v => v.has_abs)} />
                <BoolRow label="Airbags" values={bools(v => (v.airbag_count ?? 0) > 0)} />
                <BoolRow label="ESP" values={bools(v => v.has_esp)} />
                <BoolRow label="Cruise Control" values={bools(v => v.has_cruise_control)} />
                <BoolRow label="Parking Sensors" values={bools(v => v.has_parking_sensors)} />
                <BoolRow label="Reverse Camera" values={bools(v => v.has_reverse_camera)} />
                <BoolRow label="Sunroof" values={bools(v => v.has_sunroof)} />
                <BoolRow label="Android Panel" values={bools(v => v.has_android_panel)} />
                <BoolRow label="Apple CarPlay" values={bools(v => v.has_apple_carplay)} />
                <BoolRow label="Push Start" values={bools(v => v.has_push_start)} />
                <BoolRow label="Climate Control" values={bools(v => v.has_climate_control)} />
                <BoolRow label="Keyless Entry" values={bools(v => v.has_keyless_entry)} />
              </CardContent>
            </Card>

            {/* Dealer Info */}
            {vehicles.some(v => v.dealer) && (
              <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="px-4 py-3 pb-2 border-b border-border/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />Dealer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CompRow label="Dealer" values={vals(v => (v.dealer as Dealer | undefined)?.name)} />
                  <CompRow label="Phone" values={vals(v => (v.dealer as Dealer | undefined)?.phone)} />
                  <CompRow label="City" values={vals(v => (v.dealer as Dealer | undefined)?.city)} />
                  <CompRow label="Rating" values={vals(v => (v.dealer as Dealer | undefined)?.rating?.toFixed(1))} />
                  <CompRow label="Deals Done" values={vals(v => (v.dealer as Dealer | undefined)?.deals_done?.toString())} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty state */}
        {vehicles.length === 0 && !loading && (
          <div className="py-16 text-center">
            <GitCompare className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-foreground mb-1">Compare vehicles side-by-side</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Search and add up to 3 vehicles above to compare specs, pricing, condition, features, and get an AI verdict on which is the best buy.
            </p>
          </div>
        )}

        {vehicles.length === 1 && (
          <div className="py-8 text-center border-2 border-dashed border-border/50 rounded-xl">
            <p className="text-sm text-muted-foreground">Add at least 1 more vehicle to start comparing</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
