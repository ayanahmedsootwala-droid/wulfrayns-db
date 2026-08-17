import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2, Minimize2, RefreshCw, Settings2, X,
  Car, Users, StickyNote, Wifi, WifiOff, Save, Check, Megaphone, Plus,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StockItem {
  id: string; make: string; model: string;
  variant?: string | null; model_year?: number | null; color?: string | null;
  expected_selling_price?: number | null; mileage?: number | null;
  status: string; fuel_type?: string | null; transmission?: string | null;
  origin?: string | null; dealer_city?: string | null;
}
interface RequirementItem {
  id: string; customer_name?: string | null; customer_phone?: string | null;
  req_make?: string | null; req_model?: string | null; req_variant?: string | null;
  req_model_year?: number | null; req_budget_max?: number | null;
  req_color?: string | null; req_fuel_type?: string | null;
  req_transmission?: string | null; priority?: string | null;
  status: string; created_at: string;
}
interface DealerNote { id: string; vehicleOrReqId: string; note: string; dealer: string; ts: number; }
type DisplayMode = 'stock' | 'inquiries';
type ThemeStyle = 'dark' | 'light' | 'amber' | 'green' | 'blue';

interface DisplaySettings {
  theme: ThemeStyle; refreshInterval: number; title: string;
  showPrice: boolean; showMileage: boolean; showOrigin: boolean; showAnnouncements: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NOTES_KEY        = 'wulfrayn_live_dealer_notes';
const SETTINGS_KEY     = 'wulfrayn_live_display_settings';
const ANN_KEY          = 'wulfrayn_live_announcements';

const DEFAULT: DisplaySettings = {
  theme: 'dark', refreshInterval: 20, title: "Wulfrayn's DB — Live",
  showPrice: true, showMileage: true, showOrigin: true, showAnnouncements: true,
};

const STATUS_INFO: Record<string, { bar: string; text: string; label: string }> = {
  available:   { bar: 'bg-emerald-500',  text: 'text-emerald-400', label: 'AVAILABLE'  },
  reserved:    { bar: 'bg-amber-400',    text: 'text-amber-300',   label: 'RESERVED'   },
  booked:      { bar: 'bg-orange-500',   text: 'text-orange-400',  label: 'BOOKED'     },
  incoming:    { bar: 'bg-blue-500',     text: 'text-blue-400',    label: 'INCOMING'   },
  urgent_sale: { bar: 'bg-red-500',      text: 'text-red-400',     label: 'URGENT'     },
  sold:        { bar: 'bg-zinc-600',     text: 'text-zinc-400',    label: 'SOLD'       },
};
const PRI_INFO: Record<string, { bar: string; text: string }> = {
  urgent: { bar: 'bg-red-500',     text: 'text-red-400'     },
  high:   { bar: 'bg-orange-500',  text: 'text-orange-400'  },
  medium: { bar: 'bg-yellow-500',  text: 'text-yellow-400'  },
  low:    { bar: 'bg-zinc-500',    text: 'text-zinc-400'    },
  new:    { bar: 'bg-cyan-500',    text: 'text-cyan-400'    },
  active: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
};

const THEMES = {
  dark:  { bg:'bg-[#060609]', panel:'bg-[#0e0e12]', hdr:'bg-[#060609]/95', border:'border-white/8',       txt:'text-white',     sub:'text-white/55',      dim:'text-white/30',  acc:'text-amber-400',  odd:'bg-white/[0.02]', hvr:'hover:bg-white/[0.04]' },
  light: { bg:'bg-slate-50',  panel:'bg-white',      hdr:'bg-slate-50/95',  border:'border-slate-200',     txt:'text-slate-900', sub:'text-slate-500',     dim:'text-slate-400', acc:'text-blue-600',   odd:'bg-slate-50',    hvr:'hover:bg-blue-50/50'   },
  amber: { bg:'bg-[#090600]', panel:'bg-[#120d00]',  hdr:'bg-[#090600]/95', border:'border-amber-500/15',  txt:'text-amber-100', sub:'text-amber-400/60',  dim:'text-amber-500/35',acc:'text-amber-400', odd:'bg-amber-500/[0.03]', hvr:'hover:bg-amber-500/[0.06]' },
  green: { bg:'bg-[#010a04]', panel:'bg-[#021208]',  hdr:'bg-[#010a04]/95', border:'border-green-500/15',  txt:'text-green-100', sub:'text-green-400/60',  dim:'text-green-500/35',acc:'text-green-400', odd:'bg-green-500/[0.03]', hvr:'hover:bg-green-500/[0.06]' },
  blue:  { bg:'bg-[#010408]', panel:'bg-[#020810]',  hdr:'bg-[#010408]/95', border:'border-blue-500/15',   txt:'text-blue-100',  sub:'text-blue-400/60',   dim:'text-blue-500/35', acc:'text-cyan-400',  odd:'bg-blue-500/[0.03]',  hvr:'hover:bg-blue-500/[0.06]'  },
};
type TK = typeof THEMES.dark;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtP(n?: number | null) {
  if (!n) return '—';
  if (n >= 10000000) return `${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000)   return `${(n/100000).toFixed(1)} Lac`;
  return n.toLocaleString();
}
function fmtM(n?: number | null) { return n ? (n>=1000 ? `${(n/1000).toFixed(0)}k` : `${n}`) + ' km' : null; }
function hhmmss() { return new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}); }
function loadNotes(): DealerNote[] { try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]'); } catch { return []; } }
function saveNotes(n: DealerNote[]) { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); }
function loadSettings(): DisplaySettings { try { const s = localStorage.getItem(SETTINGS_KEY); return s ? {...DEFAULT,...JSON.parse(s)} : DEFAULT; } catch { return DEFAULT; } }
function loadAnn(): string[] { try { return JSON.parse(localStorage.getItem(ANN_KEY) ?? '[]'); } catch { return []; } }
function saveAnn(a: string[]) { localStorage.setItem(ANN_KEY, JSON.stringify(a)); }

// ─── Inline note panel ───────────────────────────────────────────────────────
function NotePanel({ itemId, t, notes, onUpdate }: { itemId:string; t:TK; notes:DealerNote[]; onUpdate:(n:DealerNote[])=>void }) {
  const mine = notes.filter(n => n.vehicleOrReqId === itemId);
  const [text, setText] = useState('');
  const [dealer, setDealer] = useState('');
  const [ok, setOk] = useState(false);
  const add = () => {
    if (!text.trim()) return;
    const next = [...notes, { id: Math.random().toString(36).slice(2), vehicleOrReqId: itemId, note: text.trim(), dealer: dealer.trim() || 'Me', ts: Date.now() }];
    onUpdate(next); saveNotes(next); setText(''); setOk(true); setTimeout(()=>setOk(false),1500);
  };
  const del = (id:string) => { const next = notes.filter(n=>n.id!==id); onUpdate(next); saveNotes(next); };
  return (
    <div className={cn('mt-1.5 pt-2 border-t space-y-1', t.border)}>
      {mine.map(n => (
        <div key={n.id} className="flex items-start gap-2 text-xs">
          <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
          <span className={cn('flex-1 min-w-0 leading-snug', t.sub)}><span className="font-semibold">{n.dealer}:</span> {n.note}</span>
          <button onClick={()=>del(n.id)} className="shrink-0 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <div className="flex gap-1">
        <input value={dealer} onChange={e=>setDealer(e.target.value)} placeholder="Dealer" className={cn('h-6 text-[10px] px-2 rounded border bg-transparent w-20 shrink-0', t.border, t.txt, 'placeholder:opacity-40 focus:outline-none')} />
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Note…" className={cn('h-6 text-[10px] px-2 rounded border bg-transparent flex-1 min-w-0', t.border, t.txt, 'placeholder:opacity-40 focus:outline-none')} />
        <button onClick={add} className={cn('h-6 w-6 rounded border flex items-center justify-center shrink-0', t.border, t.sub, 'hover:text-primary hover:border-primary/40')}>
          {ok ? <Check className="w-3 h-3 text-emerald-400" /> : <Save className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Stock Monitor Row ───────────────────────────────────────────────────────
function StockRow({ item, t, settings, notes, onNotes, idx }:{
  item:StockItem; t:TK; settings:DisplaySettings; notes:DealerNote[]; onNotes:(n:DealerNote[])=>void; idx:number;
}) {
  const [open, setOpen] = useState(false);
  const mine = notes.filter(n=>n.vehicleOrReqId===item.id);
  const sc = STATUS_INFO[item.status] ?? STATUS_INFO.available;
  return (
    <div className={cn('group relative transition-colors', idx%2===0?'bg-transparent':t.odd, t.hvr)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', sc.bar)} />
      <div className="flex items-center gap-3 pl-4 pr-3 py-2.5 min-w-0">
        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <span className={cn('font-bold text-sm truncate', t.txt)}>
            {item.make} {item.model}{item.variant ? ` ${item.variant}` : ''}
          </span>
          {item.model_year && <span className={cn('text-xs tabular-nums shrink-0', t.dim)}>{item.model_year}</span>}
          {item.color && <span className={cn('hidden md:inline text-xs shrink-0', t.sub)}>{item.color}</span>}
          {item.fuel_type && <span className={cn('hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border shrink-0', t.border, t.dim)}>{item.fuel_type}</span>}
          {item.transmission && <span className={cn('hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border shrink-0', t.border, t.dim)}>{item.transmission}</span>}
          {settings.showOrigin && item.origin && <span className={cn('hidden xl:inline text-[10px] shrink-0', t.dim)}>{item.origin}</span>}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {settings.showMileage && item.mileage && <span className={cn('text-xs font-mono tabular-nums', t.sub)}>{fmtM(item.mileage)}</span>}
          {settings.showPrice && item.expected_selling_price && <span className={cn('text-sm font-black font-mono tabular-nums', t.acc)}>PKR {fmtP(item.expected_selling_price)}</span>}
          <span className={cn('text-[10px] font-bold tracking-widest w-20 text-right', sc.text)}>{sc.label}</span>
          <button onClick={()=>setOpen(v=>!v)} className={cn('p-1 rounded shrink-0 transition-colors', mine.length>0?'text-yellow-400':t.dim,'hover:text-yellow-400')}>
            <StickyNote className="w-3.5 h-3.5" />{mine.length>0&&<span className="text-[10px] ml-0.5">{mine.length}</span>}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden px-4 pb-2">
            <NotePanel itemId={item.id} t={t} notes={notes} onUpdate={onNotes} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Requirement Monitor Row ──────────────────────────────────────────────────
function ReqRow({ item, t, settings, notes, onNotes, idx }:{
  item:RequirementItem; t:TK; settings:DisplaySettings; notes:DealerNote[]; onNotes:(n:DealerNote[])=>void; idx:number;
}) {
  const [open, setOpen] = useState(false);
  const mine = notes.filter(n=>n.vehicleOrReqId===item.id);
  const pc = PRI_INFO[item.priority ?? 'medium'] ?? PRI_INFO.medium;
  return (
    <div className={cn('group relative transition-colors', idx%2===0?'bg-transparent':t.odd, t.hvr)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', pc.bar)} />
      <div className="flex items-center gap-3 pl-4 pr-3 py-2.5 min-w-0">
        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <span className={cn('font-bold text-sm truncate', t.txt)}>{item.customer_name ?? '—'}</span>
          {item.customer_phone && <span className={cn('hidden md:inline text-xs font-mono shrink-0', t.dim)}>{item.customer_phone}</span>}
          <span className={cn('font-bold text-sm shrink-0', t.acc)}>
            {[item.req_make,item.req_model,item.req_variant].filter(Boolean).join(' ') || 'Any'}
          </span>
          {item.req_model_year && <span className={cn('text-xs shrink-0', t.dim)}>{item.req_model_year}+</span>}
          {item.req_color && <span className={cn('hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border shrink-0', t.border, t.dim)}>{item.req_color}</span>}
          {item.req_fuel_type && <span className={cn('hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border shrink-0', t.border, t.dim)}>{item.req_fuel_type}</span>}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {item.req_budget_max && <span className={cn('text-sm font-black font-mono tabular-nums', t.acc)}>≤ PKR {fmtP(item.req_budget_max)}</span>}
          <span className={cn('text-[10px] font-bold tracking-widest w-16 text-right', pc.text)}>{(item.priority ?? 'MEDIUM').toUpperCase()}</span>
          <button onClick={()=>setOpen(v=>!v)} className={cn('p-1 rounded shrink-0 transition-colors', mine.length>0?'text-yellow-400':t.dim,'hover:text-yellow-400')}>
            <StickyNote className="w-3.5 h-3.5" />{mine.length>0&&<span className="text-[10px] ml-0.5">{mine.length}</span>}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden px-4 pb-2">
            <NotePanel itemId={item.id} t={t} notes={notes} onUpdate={onNotes} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ticker ───────────────────────────────────────────────────────────────────
function Ticker({ items, t }: { items:string[]; t:TK }) {
  const text = items.join('   •   ');
  if (!text) return null;
  return (
    <div className={cn('flex items-center gap-2 border-b py-1.5 overflow-hidden', t.border, t.panel)}>
      <div className={cn('shrink-0 flex items-center gap-1.5 px-3', t.acc)}>
        <Megaphone className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">NOTICE</span>
      </div>
      <div className="overflow-hidden flex-1">
        <motion.div className={cn('text-xs font-medium whitespace-nowrap', t.txt)}
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: Math.max(15, text.length * 0.12), repeat: Infinity, ease: 'linear' }}>
          {text}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Section + Column headers ─────────────────────────────────────────────────
function SecHdr({ label, count, bar, t }:{ label:string; count:number; bar:string; t:TK }) {
  return (
    <div className={cn('sticky top-0 z-10 flex items-center gap-3 px-4 py-2 border-b', t.panel, t.border)}>
      <div className={cn('w-2 h-2 rounded-full', bar)} />
      <span className={cn('text-[10px] font-bold uppercase tracking-[0.15em]', t.sub)}>{label}</span>
      <span className={cn('ml-auto text-[10px] font-mono tabular-nums', t.dim)}>{count} records</span>
    </div>
  );
}
function ColHdr({ mode, t }:{ mode:DisplayMode; t:TK }) {
  return (
    <div className={cn('flex items-center gap-3 pl-4 pr-3 py-1.5 border-b text-[9px] font-bold uppercase tracking-[0.12em]', t.border, t.dim)}>
      {mode==='stock' ? (
        <><span className="flex-1">VEHICLE</span><span className="w-24 text-right shrink-0 hidden md:block">MILEAGE</span><span className="w-28 text-right shrink-0">PRICE</span><span className="w-20 text-right shrink-0">STATUS</span><span className="w-8 shrink-0" /></>
      ) : (
        <><span className="flex-1">CUSTOMER / WANTS</span><span className="w-28 text-right shrink-0">BUDGET</span><span className="w-16 text-right shrink-0">PRIORITY</span><span className="w-8 shrink-0" /></>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
const STATUS_ORDER = ['available','reserved','booked','incoming','urgent_sale'];

export default function LiveDisplayPage() {
  const [mode, setMode]       = useState<DisplayMode>('stock');
  const [cfg, setCfg]         = useState<DisplaySettings>(() => loadSettings());
  const [stock, setStock]     = useState<StockItem[]>([]);
  const [reqs, setReqs]       = useState<RequirementItem[]>([]);
  const [notes, setNotes]     = useState<DealerNote[]>(() => loadNotes());
  const [ann, setAnn]         = useState<string[]>(() => loadAnn());
  const [newAnn, setNewAnn]   = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLR]  = useState<Date|null>(null);
  const [connected, setConn]  = useState(true);
  const [fs, setFs]           = useState(false);
  const [showCfg, setShowCfg] = useState(false);
  const [filter, setFilter]   = useState('');
  const [clock, setClock]     = useState(hhmmss());
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const t = THEMES[cfg.theme];

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(hhmmss()), 1000);
    return () => clearInterval(id);
  }, []);

  const upd = useCallback(<K extends keyof DisplaySettings>(key:K, val:DisplaySettings[K]) => {
    setCfg(prev => { const next = {...prev,[key]:val}; localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); return next; });
  }, []);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchStock = useCallback(async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id,make,model,variant,model_year,color,expected_selling_price,mileage,status,fuel_type,transmission,origin,dealer_city')
      .in('status', ['available','reserved','booked','incoming','urgent_sale'])
      .order('status').order('created_at', { ascending: false });
    if (!error) setStock((data ?? []) as StockItem[]);
  }, []);

  const fetchReqs = useCallback(async () => {
    const { data, error } = await supabase
      .from('inquiries')
      .select('id,customer_name,customer_phone,req_make,req_model,req_variant,req_model_year,req_budget_max,req_color,req_fuel_type,req_transmission,priority,status,created_at')
      .in('status', ['new','active','matched'])
      .order('priority', { ascending: false }).order('created_at', { ascending: false });
    if (!error) setReqs((data ?? []) as RequirementItem[]);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      await Promise.all([fetchStock(), fetchReqs()]);
      setConn(true); setLR(new Date());
    } catch { setConn(false); } finally { setLoading(false); }
  }, [fetchStock, fetchReqs]);

  // ── Initial load + realtime subscriptions ─────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchAll();

    // Realtime: vehicles channel
    const vehiclesChan = supabase
      .channel('live_display_vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchStock();
        setConn(true); setLR(new Date());
      })
      .subscribe((status) => { setConn(status === 'SUBSCRIBED'); });

    // Realtime: inquiries channel
    const inquiriesChan = supabase
      .channel('live_display_inquiries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => {
        fetchReqs();
        setConn(true); setLR(new Date());
      })
      .subscribe();

    // Fallback polling (every refreshInterval seconds) in case realtime isn't available
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(fetchAll, cfg.refreshInterval * 1000);

    return () => {
      supabase.removeChannel(vehiclesChan);
      supabase.removeChannel(inquiriesChan);
      if (timer.current) clearInterval(timer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update polling interval when cfg changes (without re-subscribing realtime)
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(fetchAll, cfg.refreshInterval * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchAll, cfg.refreshInterval]);

  // Fullscreen
  const toggleFs = useCallback(async () => {
    try { if (!document.fullscreenElement) await ref.current?.requestFullscreen(); else await document.exitFullscreen(); } catch {}
  }, []);
  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const addAnn = () => { if (!newAnn.trim()) return; const u=[...ann,newAnn.trim()]; setAnn(u); saveAnn(u); setNewAnn(''); };
  const delAnn = (i:number) => { const u=ann.filter((_,x)=>x!==i); setAnn(u); saveAnn(u); };

  const fStock = filter ? stock.filter(v=>`${v.make} ${v.model} ${v.variant??''} ${v.color??''} ${v.status}`.toLowerCase().includes(filter.toLowerCase())) : stock;
  const fReqs  = filter ? reqs.filter(r=>`${r.customer_name??''} ${r.req_make??''} ${r.req_model??''} ${r.req_variant??''}`.toLowerCase().includes(filter.toLowerCase())) : reqs;

  const groups: Record<string,StockItem[]> = {};
  fStock.forEach(s => (groups[s.status] = groups[s.status] ?? []).push(s));

  const content = (
    <div ref={ref} className={cn('flex flex-col min-h-screen overflow-x-hidden', t.bg)}>
      {/* Top bar */}
      <div className={cn('sticky top-0 z-30 border-b backdrop-blur-md', t.hdr, t.border)}>
        <div className="flex items-center gap-2 px-3 py-2 min-w-0">
          <span className={cn('font-black text-sm tracking-tight shrink-0', t.txt)}>{cfg.title}</span>
          <div className="flex-1 min-w-0" />
          {/* Mode tabs */}
          {(['stock','inquiries'] as DisplayMode[]).map(m => (
            <button key={m} onClick={()=>setMode(m)}
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors border shrink-0',
                mode===m ? (m==='stock'?'bg-emerald-500/15 text-emerald-400 border-emerald-500/25':'bg-cyan-500/15 text-cyan-400 border-cyan-500/25') : cn('border-transparent',t.dim))}>
              {m==='stock'?<Car className="w-3 h-3"/>:<Users className="w-3 h-3"/>}
              {m==='stock'?`Stock (${stock.length})`:`Inquiries (${reqs.length})`}
            </button>
          ))}
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter…"
            className={cn('h-7 text-xs px-2.5 rounded border bg-transparent w-24 focus:w-36 transition-all shrink-0', t.border, t.txt, 'placeholder:opacity-30 focus:outline-none')} />
          <button onClick={fetchAll} className={cn('p-1.5 rounded border shrink-0', t.border, t.dim)}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button onClick={()=>setShowCfg(v=>!v)} className={cn('p-1.5 rounded border shrink-0', t.border, showCfg?'text-primary border-primary/30':t.dim)}>
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <div className={cn('w-2 h-2 rounded-full shrink-0', connected?'bg-emerald-500':'bg-red-500')} title={connected?'Live':'Offline'} />
          <span className={cn('text-xs font-mono tabular-nums shrink-0 hidden md:block', t.sub)}>{clock}</span>
          <button onClick={toggleFs} className={cn('p-1.5 rounded border shrink-0', t.border, t.dim)}>
            {fs?<Minimize2 className="w-3.5 h-3.5"/>:<Maximize2 className="w-3.5 h-3.5"/>}
          </button>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {showCfg && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className={cn('overflow-hidden border-t', t.border)}>
              <div className={cn('px-3 py-3 flex flex-wrap gap-3 items-start', t.panel)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', t.sub)}>Theme</span>
                  {(['dark','light','amber','green','blue'] as ThemeStyle[]).map(th=>(
                    <button key={th} onClick={()=>upd('theme',th)} className={cn('w-5 h-5 rounded-full border-2 transition-transform', th==='dark'?'bg-zinc-800':th==='light'?'bg-white':th==='amber'?'bg-amber-500':th==='green'?'bg-green-500':'bg-blue-500', cfg.theme===th?'border-white scale-125':'border-transparent')} />
                  ))}
                </div>
                <Separator orientation="vertical" className="h-6 opacity-20 hidden md:block" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', t.sub)}>Refresh</span>
                  {[10,20,30,60].map(s=>(
                    <button key={s} onClick={()=>upd('refreshInterval',s)} className={cn('px-2 py-0.5 rounded text-[10px] border', cfg.refreshInterval===s?'bg-primary/20 text-primary border-primary/30':cn('border-transparent',t.dim))}>
                      {s}s
                    </button>
                  ))}
                </div>
                <Separator orientation="vertical" className="h-6 opacity-20 hidden md:block" />
                {(['showPrice','showMileage','showOrigin','showAnnouncements'] as const).map(k=>(
                  <button key={k} onClick={()=>upd(k,!cfg[k])} className={cn('px-2 py-0.5 rounded border text-[10px] font-medium', cfg[k]?'bg-primary/15 text-primary border-primary/30':cn('border-transparent',t.dim))}>
                    {k==='showPrice'?'Price':k==='showMileage'?'Mileage':k==='showOrigin'?'Origin':'Ticker'}
                  </button>
                ))}
                <Separator orientation="vertical" className="h-6 opacity-20 hidden md:block" />
                <input value={cfg.title} onChange={e=>upd('title',e.target.value)} placeholder="Display title"
                  className={cn('h-7 text-xs px-2 rounded border bg-transparent w-48', t.border, t.txt, 'focus:outline-none')} />
                <Separator orientation="vertical" className="h-6 opacity-20 hidden md:block" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider shrink-0', t.sub)}>Announcements</span>
                  <input value={newAnn} onChange={e=>setNewAnn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAnn()} placeholder="Add notice…"
                    className={cn('h-7 text-xs px-2 rounded border bg-transparent w-40', t.border, t.txt, 'placeholder:opacity-30 focus:outline-none')} />
                  <button onClick={addAnn} className={cn('h-7 w-7 rounded border flex items-center justify-center', t.border, t.dim, 'hover:text-primary hover:border-primary/40')}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {ann.map((a,i)=>(
                    <div key={i} className={cn('flex items-center gap-1 px-2 py-0.5 rounded border text-[10px]', t.border, t.sub)}>
                      <span className="max-w-[120px] truncate">{a}</span>
                      <button onClick={()=>delAnn(i)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ticker */}
      {cfg.showAnnouncements && ann.length > 0 && <Ticker items={ann} t={t} />}

      {/* Monitor body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className={cn('flex items-center justify-center h-48 gap-3', t.sub)}>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading live data…</span>
          </div>
        ) : mode === 'stock' ? (
          <>
            {STATUS_ORDER.filter(s=>(groups[s]?.length??0)>0).map(status=>{
              const sc = STATUS_INFO[status] ?? STATUS_INFO.available;
              const items = groups[status] ?? [];
              return (
                <div key={status}>
                  <SecHdr label={sc.label} count={items.length} bar={sc.bar} t={t} />
                  <ColHdr mode="stock" t={t} />
                  {items.map((item,i)=><StockRow key={item.id} item={item} t={t} settings={cfg} notes={notes} onNotes={setNotes} idx={i} />)}
                </div>
              );
            })}
            {fStock.length === 0 && (
              <div className={cn('flex flex-col items-center justify-center py-24 gap-3', t.dim)}>
                <Car className="w-12 h-12 opacity-20" /><p className="text-sm">No available stock</p>
              </div>
            )}
          </>
        ) : (
          <>
            {fReqs.length > 0 && (
              <>
                <SecHdr label="ACTIVE INQUIRIES" count={fReqs.length} bar="bg-cyan-500" t={t} />
                <ColHdr mode="inquiries" t={t} />
                {fReqs.map((item,i)=><ReqRow key={item.id} item={item} t={t} settings={cfg} notes={notes} onNotes={setNotes} idx={i} />)}
              </>
            )}
            {fReqs.length === 0 && (
              <div className={cn('flex flex-col items-center justify-center py-24 gap-3', t.dim)}>
                <Users className="w-12 h-12 opacity-20" /><p className="text-sm">No active inquiries</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={cn('shrink-0 flex items-center justify-between px-4 py-1 border-t text-[10px]', t.border, t.panel)}>
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1.5', connected?'text-emerald-400':'text-red-400')}>
            {connected?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}
            <span>{connected?'Live':'Offline'}</span>
          </div>
          {lastRefresh && <span className={cn('font-mono', t.dim)}>Updated {lastRefresh.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('tabular-nums', t.dim)}>{mode==='stock'?`${fStock.length} vehicles`:`${fReqs.length} inquiries`}</span>
          <span className={cn('font-bold tracking-widest uppercase', t.dim)}>Wulfrayn's DB</span>
        </div>
      </div>
    </div>
  );

  if (fs) return content;
  return <AppLayout>{content}</AppLayout>;
}
