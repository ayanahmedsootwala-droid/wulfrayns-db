import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle,
  Car, Users, ChevronDown, ChevronUp, Copy, ExternalLink,
  Zap, Filter, Search, Phone, MapPin, Banknote, Calendar,
  ArrowRight, Inbox, ClipboardPaste, FolderOpen, X, TrendingUp,
  ShieldCheck, Info, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WaGroup {
  id: string;
  name: string;
  description: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface WaListing {
  id: string;
  capture_id: string | null;
  group_id: string | null;
  raw_message: string | null;
  make: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  mileage: number | null;
  color: string | null;
  transmission: string | null;
  fuel_type: string | null;
  body_type: string | null;
  condition: string | null;
  asking_price: number | null;
  negotiable: boolean;
  currency: string;
  city: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  confidence: number;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

interface WaRequirement {
  id: string;
  capture_id: string | null;
  group_id: string | null;
  raw_message: string | null;
  buyer_name: string | null;
  contact_phone: string | null;
  city: string | null;
  make: string | null;
  model: string | null;
  variant: string | null;
  year_min: number | null;
  year_max: number | null;
  mileage_max: number | null;
  color_pref: string | null;
  transmission: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  financing: boolean;
  exchange: boolean;
  urgency: string;
  status: string;
  confidence: number;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtPrice = (n: number | null, cur = 'PKR') => {
  if (!n) return '—';
  if (n >= 10_000_000) return `${cur} ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `${cur} ${(n / 100_000).toFixed(2)} Lac`;
  return `${cur} ${n.toLocaleString()}`;
};
const fmtMileage = (n: number | null) => n ? `${n.toLocaleString()} km` : '—';
const confidenceColor = (c: number) =>
  c >= 80 ? 'text-emerald-400' : c >= 50 ? 'text-amber-400' : 'text-red-400';
const confidenceBg = (c: number) =>
  c >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : c >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

const GROUP_TYPE_COLORS: Record<string, string> = {
  sourcing:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  buyers:    'bg-purple-500/15 text-purple-400 border-purple-500/20',
  auction:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  wholesale: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  general:   'bg-muted/50 text-muted-foreground border-border',
};

// ─── Sample paste templates ───────────────────────────────────────────────────
const STOCK_SAMPLE = `Toyota Corolla Altis X 2022 white 45k KHI 4.85m
Honda Vezel Z 2021 black 18k Karachi 92 demand contact 03xx-xxxxxxx
Suzuki Alto VXL AGS 2023 silver 12000km Lahore 2650000 negotiable
Civic RS 2023 Sonic Gray 8k ISB 7.5 million
BYD Atto 3 2024 white 5k KHI asking 11.5 crore
Cultus VXL 2022 beige 35k Rawalpindi 23 lac`;

const REQ_SAMPLE = `Need Corolla Grande 2021 or newer white automatic Karachi budget 65 lac
Looking for Honda City 1.5 Aspire 2020-2022 silver or white LHR max 38 lac urgent
Want Vezel RS hybrid 2021+ any color Islamabad budget 8 million exchange possible
Client needs Suzuki Alto 2022-2023 VXL AGS under 25 lac Karachi
Buyer wants Toyota Fortuner Sigma 3 2020+ 7 seater white ISB budget 1.1 crore financing OK`;

// ─── Paste Extractor Component ────────────────────────────────────────────────
function PasteExtractor({
  mode,
  groups,
  onExtracted,
}: {
  mode: 'stock' | 'requirement';
  groups: WaGroup[];
  onExtracted: () => void;
}) {
  const [text, setText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; errors?: string[] } | null>(null);

  const isStock = mode === 'stock';
  const placeholder = isStock
    ? 'Paste WhatsApp messages here...\n\nExample:\nToyota Corolla Altis X 2022 white 45k KHI 4.85m\nHonda Vezel Z 2021 black 18k Karachi 92 demand'
    : 'Paste buyer requirement messages here...\n\nExample:\nNeed Corolla Grande 2021+ white automatic Karachi budget 65 lac\nLooking for Vezel RS hybrid 2021+ Islamabad budget 8 million';

  const handleExtract = async () => {
    if (!text.trim()) { toast.error('Paste some messages first'); return; }
    setLoading(true);
    setLastResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          text,
          capture_type: mode,
          group_id: selectedGroup !== 'none' ? selectedGroup : null,
          save_capture: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Extraction failed');
      }

      const data = await res.json();
      const count = isStock
        ? (data.listings?.length ?? 0)
        : (data.requirements?.length ?? 0);

      setLastResult({ count, errors: data.errors });

      if (count > 0) {
        toast.success(`Extracted ${count} ${isStock ? 'vehicle listing' : 'buyer requirement'}${count !== 1 ? 's' : ''}`);
        setText('');
        onExtracted();
      } else {
        toast.warning('No records extracted — try more detailed messages or check format');
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Group selector */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Source Group (optional)
          </Label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="h-8 text-xs border-border bg-muted/30">
              <SelectValue placeholder="Select a WhatsApp group…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No group / unassigned</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                  <span className="text-muted-foreground ml-1.5 text-[10px]">({g.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0 flex items-end">
          <Button size="sm" variant="outline" className="h-8 text-xs border-border gap-1.5"
            onClick={() => setText(isStock ? STOCK_SAMPLE : REQ_SAMPLE)}>
            <ClipboardPaste className="w-3 h-3" />
            Load Sample
          </Button>
        </div>
      </div>

      {/* Paste area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono leading-relaxed"
        />
        {text && (
          <button onClick={() => setText('')}
            className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        <Button onClick={handleExtract} disabled={loading || !text.trim()} className="h-9 text-sm gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" />Extracting with AI…</>
            : <><Zap className="w-4 h-4" />Extract {isStock ? 'Stock Listings' : 'Buyer Requirements'}</>
          }
        </Button>
        {text && (
          <span className="text-[10px] text-muted-foreground">
            {text.split('\n').filter(l => l.trim()).length} lines
          </span>
        )}
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {lastResult && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={cn('rounded-xl border px-4 py-3 flex items-start gap-3 text-sm',
              lastResult.count > 0
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20')}>
            {lastResult.count > 0
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              {lastResult.count > 0
                ? <p className="text-emerald-400 font-medium">
                    {lastResult.count} {isStock ? 'listing' : 'requirement'}{lastResult.count !== 1 ? 's' : ''} saved to database
                  </p>
                : <p className="text-amber-400 font-medium">No records could be extracted</p>}
              {lastResult.errors?.map((e, i) => (
                <p key={i} className="text-[10px] text-muted-foreground mt-0.5">{e}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ l, onStatusChange }: { l: WaListing; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const handleWA = () => {
    if (!l.contact_phone) return;
    const clean = l.contact_phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi, I'm interested in the ${l.year ?? ''} ${l.make ?? ''} ${l.model ?? ''} ${l.variant ?? ''} you listed for ${fmtPrice(l.asking_price, l.currency)}.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(p => !p)}>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Car className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {[l.year, l.make, l.model, l.variant].filter(Boolean).join(' ') || 'Unknown Vehicle'}
            </p>
            {l.color && <span className="text-[10px] text-muted-foreground">{l.color}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-sm font-bold text-primary">{fmtPrice(l.asking_price, l.currency)}</span>
            {l.negotiable && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5">Negotiable</span>}
            {l.city && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{l.city}</span>}
            {l.mileage && <span className="text-[10px] text-muted-foreground">{fmtMileage(l.mileage)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-[9px] font-bold', confidenceColor(l.confidence))}>{l.confidence}%</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/50">
            <div className="px-4 py-3 space-y-3">
              {/* Specs grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Transmission', value: l.transmission },
                  { label: 'Fuel', value: l.fuel_type },
                  { label: 'Body', value: l.body_type },
                  { label: 'Condition', value: l.condition },
                ].map(s => s.value ? (
                  <div key={s.label} className="bg-muted/30 rounded-lg px-3 py-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    <p className="text-xs font-medium text-foreground">{s.value}</p>
                  </div>
                ) : null)}
              </div>

              {/* Raw message */}
              {l.raw_message && (
                <div className="bg-muted/20 border border-border/40 rounded-lg px-3 py-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Original Message</p>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{l.raw_message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {l.contact_phone && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleWA}>
                    <MessageSquare className="w-3 h-3" />WhatsApp
                  </Button>
                )}
                {l.contact_phone && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-border"
                    onClick={() => { navigator.clipboard.writeText(l.contact_phone!); toast.success('Phone copied'); }}>
                    <Phone className="w-3 h-3" />{l.contact_phone}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-border"
                  onClick={async () => {
                    await supabase.from('rpm_wa_listings').update({ is_verified: !l.is_verified }).eq('id', l.id);
                    toast.success(l.is_verified ? 'Marked unverified' : 'Marked verified');
                    onStatusChange();
                  }}>
                  <ShieldCheck className={cn('w-3 h-3', l.is_verified ? 'text-emerald-400' : 'text-muted-foreground')} />
                  {l.is_verified ? 'Verified' : 'Mark Verified'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Requirement Card ─────────────────────────────────────────────────────────
function RequirementCard({ r, onStatusChange }: { r: WaRequirement; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const URGENCY_STYLES: Record<string, string> = {
    urgent:   'bg-red-500/15 text-red-400 border-red-500/20',
    normal:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    flexible: 'bg-muted/50 text-muted-foreground border-border',
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <div className="px-4 py-3 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(p => !p)}>
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {[r.make, r.model, r.variant].filter(Boolean).join(' ') || 'Vehicle Required'}
            </p>
            {r.year_min && <span className="text-[10px] text-muted-foreground">{r.year_min}{r.year_max ? `–${r.year_max}` : '+'}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {r.budget_max && <span className="text-sm font-bold text-purple-400">Budget: {fmtPrice(r.budget_max, r.currency)}</span>}
            {r.city && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{r.city}</span>}
            <span className={cn('text-[9px] font-semibold border rounded-full px-1.5 py-0.5', URGENCY_STYLES[r.urgency] ?? URGENCY_STYLES.normal)}>
              {r.urgency}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-[9px] font-bold', confidenceColor(r.confidence))}>{r.confidence}%</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/50">
            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Color Pref', value: r.color_pref },
                  { label: 'Transmission', value: r.transmission },
                  { label: 'Max Mileage', value: r.mileage_max ? fmtMileage(r.mileage_max) : null },
                  { label: 'Budget Min', value: r.budget_min ? fmtPrice(r.budget_min, r.currency) : null },
                ].map(s => s.value ? (
                  <div key={s.label} className="bg-muted/30 rounded-lg px-3 py-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    <p className="text-xs font-medium text-foreground">{s.value}</p>
                  </div>
                ) : null)}
              </div>

              {(r.financing || r.exchange) && (
                <div className="flex gap-2">
                  {r.financing && <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full px-2 py-0.5">Financing OK</span>}
                  {r.exchange && <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full px-2 py-0.5">Exchange OK</span>}
                </div>
              )}

              {r.raw_message && (
                <div className="bg-muted/20 border border-border/40 rounded-lg px-3 py-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Original Message</p>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{r.raw_message}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {r.contact_phone && (
                  <Button size="sm" className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700"
                    onClick={() => window.open(`https://wa.me/${r.contact_phone!.replace(/\D/g, '')}`, '_blank')}>
                    <MessageSquare className="w-3 h-3" />WhatsApp Buyer
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-border"
                  onClick={async () => {
                    const next = r.status === 'active' ? 'matched' : 'active';
                    await supabase.from('rpm_wa_requirements').update({ status: next }).eq('id', r.id);
                    toast.success(`Marked as ${next}`);
                    onStatusChange();
                  }}>
                  <Star className={cn('w-3 h-3', r.status === 'matched' ? 'text-emerald-400' : 'text-muted-foreground')} />
                  {r.status === 'matched' ? 'Matched' : 'Mark Matched'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppHubPage() {
  const [groups, setGroups]           = useState<WaGroup[]>([]);
  const [listings, setListings]       = useState<WaListing[]>([]);
  const [requirements, setRequirements] = useState<WaRequirement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('extract');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQ, setSearchQ]         = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup]       = useState({ name: '', description: '', type: 'sourcing' });
  const [savingGroup, setSavingGroup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [g, l, r] = await Promise.all([
      supabase.from('rpm_wa_groups').select('*').order('created_at', { ascending: false }),
      supabase.from('rpm_wa_listings').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('rpm_wa_requirements').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (g.data) setGroups(g.data);
    if (l.data) setListings(l.data as WaListing[]);
    if (r.data) setRequirements(r.data as WaRequirement[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveGroup = async () => {
    if (!newGroup.name.trim()) { toast.error('Group name required'); return; }
    setSavingGroup(true);
    const { error } = await supabase.from('rpm_wa_groups').insert({
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      type: newGroup.type,
    });
    if (error) { toast.error('Failed to save group'); }
    else {
      toast.success('Group added');
      setShowAddGroup(false);
      setNewGroup({ name: '', description: '', type: 'sourcing' });
      load();
    }
    setSavingGroup(false);
  };

  const filteredListings = listings.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || `${l.make} ${l.model} ${l.variant} ${l.city} ${l.color}`.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredRequirements = requirements.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || `${r.make} ${r.model} ${r.variant} ${r.city}`.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    listings:     listings.length,
    requirements: requirements.length,
    available:    listings.filter(l => l.status === 'available').length,
    activeReqs:   requirements.filter(r => r.status === 'active').length,
    highConf:     listings.filter(l => l.confidence >= 80).length,
    urgent:       requirements.filter(r => r.urgency === 'urgent').length,
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0 bg-background">
        {/* ── Page header ─────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-green-400" />
              </div>
              <h1 className="text-base md:text-lg font-bold text-foreground">WhatsApp Sourcing Hub</h1>
              <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[9px]">AI-Powered</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-9">
              Paste messages → AI extracts structured vehicle listings &amp; buyer requirements
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border shrink-0"
            onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />Refresh
          </Button>
        </div>

        {/* ── Stats strip ─────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-5 py-3 border-b border-border shrink-0">
          {[
            { label: 'Total Listings', value: stats.listings, color: 'text-primary', icon: Car },
            { label: 'Available', value: stats.available, color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'High Confidence', value: stats.highConf, color: 'text-blue-400', icon: Star },
            { label: 'Requirements', value: stats.requirements, color: 'text-purple-400', icon: Users },
            { label: 'Active Buyers', value: stats.activeReqs, color: 'text-orange-400', icon: TrendingUp },
            { label: 'Urgent', value: stats.urgent, color: 'text-red-400', icon: Zap },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={cn('text-lg font-black leading-tight', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Main tabs ───────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
            <div className="px-5 pt-3 shrink-0">
              <TabsList className="bg-muted/30 border border-border h-8">
                <TabsTrigger value="extract" className="text-xs h-7 gap-1.5">
                  <ClipboardPaste className="w-3 h-3" />Extract
                </TabsTrigger>
                <TabsTrigger value="listings" className="text-xs h-7 gap-1.5">
                  <Car className="w-3 h-3" />Listings
                  {stats.listings > 0 && <span className="bg-primary/20 text-primary text-[9px] rounded-full px-1.5">{stats.listings}</span>}
                </TabsTrigger>
                <TabsTrigger value="requirements" className="text-xs h-7 gap-1.5">
                  <Users className="w-3 h-3" />Buyers
                  {stats.requirements > 0 && <span className="bg-purple-500/20 text-purple-400 text-[9px] rounded-full px-1.5">{stats.requirements}</span>}
                </TabsTrigger>
                <TabsTrigger value="groups" className="text-xs h-7 gap-1.5">
                  <FolderOpen className="w-3 h-3" />Groups
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs h-7 gap-1.5">
                  <Star className="w-3 h-3" />Notes
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Extract tab ─── */}
            <TabsContent value="extract" className="flex-1 px-5 py-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Stock extraction */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                        <Car className="w-3.5 h-3.5 text-primary" />
                      </div>
                      Stock Availability
                      <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-[9px]">Available for sale</Badge>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Paste messages from sourcing groups — dealer offers, available cars, price lists
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <PasteExtractor mode="stock" groups={groups} onExtracted={load} />
                  </CardContent>
                </Card>

                {/* Requirement extraction */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      Buyer Requirements
                      <Badge className="ml-auto bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px]">Wanted to buy</Badge>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Paste messages from buyer groups — what people are looking for, budgets, preferences
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <PasteExtractor mode="requirement" groups={groups} onExtracted={load} />
                  </CardContent>
                </Card>
              </div>

              {/* How it works */}
              <Card className="mt-5 border-border bg-muted/10">
                <CardContent className="px-4 py-4">
                  <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-primary" />How It Works
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { step: '1', label: 'Copy', desc: 'Copy messages from your WhatsApp groups', icon: Copy },
                      { step: '2', label: 'Paste', desc: 'Paste them into the text area above', icon: ClipboardPaste },
                      { step: '3', label: 'Extract', desc: 'AI reads Pakistani market shorthand & extracts data', icon: Zap },
                      { step: '4', label: 'Saved', desc: 'Structured records saved — searchable & matchable', icon: CheckCircle2 },
                    ].map(s => (
                      <div key={s.step} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">{s.step}</div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Listings tab ─── */}
            <TabsContent value="listings" className="flex-1 px-5 py-4 mt-0">
              <div className="flex gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search make, model, city…" className="h-8 pl-8 text-xs border-border" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-36 text-xs border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No listings yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Paste stock messages in the Extract tab to get started</p>
                  <Button size="sm" variant="outline" className="mt-4 border-border text-xs gap-1.5" onClick={() => setTab('extract')}>
                    <ArrowRight className="w-3 h-3" />Go to Extract
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredListings.map(l => <ListingCard key={l.id} l={l} onStatusChange={load} />)}
                </div>
              )}
            </TabsContent>

            {/* ── Requirements tab ─── */}
            <TabsContent value="requirements" className="flex-1 px-5 py-4 mt-0">
              <div className="flex gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search make, model, city…" className="h-8 pl-8 text-xs border-border" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-36 text-xs border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredRequirements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No buyer requirements yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Paste buyer request messages in the Extract tab</p>
                  <Button size="sm" variant="outline" className="mt-4 border-border text-xs gap-1.5" onClick={() => setTab('extract')}>
                    <ArrowRight className="w-3 h-3" />Go to Extract
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRequirements.map(r => <RequirementCard key={r.id} r={r} onStatusChange={load} />)}
                </div>
              )}
            </TabsContent>

            {/* ── Groups tab ─── */}
            <TabsContent value="groups" className="flex-1 px-5 py-4 mt-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">Sourcing Groups</p>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddGroup(p => !p)}>
                  <Plus className="w-3.5 h-3.5" />Add Group
                </Button>
              </div>

              <AnimatePresence>
                {showAddGroup && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-card border border-border rounded-xl px-4 py-4 mb-4 space-y-3">
                    <p className="text-xs font-semibold text-foreground">New Group</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Group Name *</Label>
                        <Input value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
                          placeholder="Car Dealers Karachi" className="h-8 text-xs border-border" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Type</Label>
                        <Select value={newGroup.type} onValueChange={v => setNewGroup(p => ({ ...p, type: v }))}>
                          <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sourcing">Sourcing</SelectItem>
                            <SelectItem value="buyers">Buyers</SelectItem>
                            <SelectItem value="auction">Auction</SelectItem>
                            <SelectItem value="wholesale">Wholesale</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Description</Label>
                        <Input value={newGroup.description} onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))}
                          placeholder="Optional description" className="h-8 text-xs border-border" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveGroup} disabled={savingGroup} className="h-7 text-xs">Save Group</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddGroup(false)} className="h-7 text-xs border-border">Cancel</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groups.map(g => (
                  <div key={g.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                        <span className={cn('text-[9px] border rounded-full px-1.5 py-0.5 font-medium', GROUP_TYPE_COLORS[g.type] ?? GROUP_TYPE_COLORS.general)}>
                          {g.type}
                        </span>
                      </div>
                      {g.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{g.description}</p>}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {listings.filter(l => l.group_id === g.id).length} listings ·{' '}
                        {requirements.filter(r => r.group_id === g.id).length} requirements
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            {/* ── Notes tab ─── */}
            <TabsContent value="notes" className="flex-1 px-5 py-4 mt-0">
              <WhatsAppNotesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── WhatsApp Notes Tab ───────────────────────────────────────────────────────
interface WaNote { id: string; title: string; body: string; tag: string; pinned: boolean; created_at: string; }
const NOTE_TAGS = ['General','Lead','Follow-up','Price','Negotiation','Reminder','Done'] as const;
const TAG_COLORS: Record<string, string> = {
  General:'text-muted-foreground border-border bg-muted/30',
  Lead:'text-blue-400 border-blue-400/20 bg-blue-400/10',
  'Follow-up':'text-amber-400 border-amber-400/20 bg-amber-400/10',
  Price:'text-green-400 border-green-400/20 bg-green-400/10',
  Negotiation:'text-purple-400 border-purple-400/20 bg-purple-400/10',
  Reminder:'text-orange-400 border-orange-400/20 bg-orange-400/10',
  Done:'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
};

function WhatsAppNotesTab() {
  const LS_KEY = 'wa_notes_v1';
  const load = (): WaNote[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; } };
  const [notes, setNotes] = useState<WaNote[]>(load);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [editing, setEditing] = useState<WaNote | null>(null);
  const [form, setForm] = useState({ title: '', body: '', tag: 'General' });
  const [open, setOpen] = useState(false);

  const save = (updated: WaNote[]) => { localStorage.setItem(LS_KEY, JSON.stringify(updated)); setNotes(updated); };

  const handleSave = () => {
    if (!form.body.trim()) { toast.error('Note body required'); return; }
    if (editing) {
      save(notes.map(n => n.id === editing.id ? { ...editing, ...form } : n));
      toast.success('Note updated');
    } else {
      const n: WaNote = { id: crypto.randomUUID(), ...form, title: form.title || form.body.slice(0,40), pinned: false, created_at: new Date().toISOString() };
      save([n, ...notes]);
      toast.success('Note saved');
    }
    setOpen(false); setEditing(null); setForm({ title: '', body: '', tag: 'General' });
  };

  const togglePin = (id: string) => save(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const del = (id: string) => { save(notes.filter(n => n.id !== id)); toast.success('Note deleted'); };

  const filtered = notes
    .filter(n => (tagFilter === 'all' || n.tag === tagFilter) && (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 h-8 text-xs border-border" />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="h-8 text-xs w-36 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {NOTE_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => { setEditing(null); setForm({ title:'', body:'', tag:'General' }); setOpen(true); }}>
          <Plus className="w-3.5 h-3.5" />New Note
        </Button>
      </div>

      {open && (
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">{editing ? 'Edit Note' : 'New Note'}</p>
          <Input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Title (optional)" className="h-8 text-xs border-border" />
          <textarea value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))}
            placeholder="Paste WhatsApp message, write a follow-up note, record a price…"
            className="w-full min-h-[100px] text-xs px-3 py-2 rounded-lg border border-border bg-muted/40 text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={form.tag} onValueChange={v => setForm(f=>({...f,tag:v}))}>
              <SelectTrigger className="h-8 text-xs w-36 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{NOTE_TAGS.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} className="h-8 text-xs">Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); setEditing(null); }} className="h-8 text-xs border-border">Cancel</Button>
          </div>
        </motion.div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{notes.length === 0 ? 'No notes yet — tap New Note to start' : 'No notes match your filter'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map(n => (
            <motion.div key={n.id} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              className={cn('bg-card border rounded-xl px-4 py-3 space-y-2 relative', n.pinned ? 'border-primary/30' : 'border-border')}>
              {n.pinned && <span className="absolute top-2 right-2 text-primary text-xs">📌</span>}
              <div className="flex items-start justify-between gap-2 pr-4">
                <p className="text-sm font-semibold text-foreground truncate">{n.title || n.body.slice(0,40)}</p>
                <span className={cn('text-[9px] border rounded-full px-1.5 py-0.5 font-medium shrink-0', TAG_COLORS[n.tag] ?? TAG_COLORS.General)}>{n.tag}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{n.body}</p>
              <p className="text-[10px] text-muted-foreground/50">{new Date(n.created_at).toLocaleDateString()}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => togglePin(n.id)}>
                  {n.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => { navigator.clipboard.writeText(n.body); toast.success('Copied'); }}>
                  <Copy className="w-2.5 h-2.5" />Copy
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => { setEditing(n); setForm({ title:n.title, body:n.body, tag:n.tag }); setOpen(true); }}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-400 hover:text-red-400" onClick={() => del(n.id)}>
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
