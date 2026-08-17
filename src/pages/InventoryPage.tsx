import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, LayoutGrid, List, Table2, Car, Star, Zap,
  Eye, Edit2, Trash2, MoreHorizontal, X, CheckSquare,
  SlidersHorizontal, RefreshCw, Clock, Bot, Phone, Mail,
  MapPin, Building2, User, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, AlertTriangle, DollarSign, Send, Bookmark,
  BookmarkCheck, GitCompare, MessageSquare, Shield, Fuel,
  Activity, ChevronLeft, ChevronRight, Tag, Filter, Download,
  Upload, FileUp, ClipboardPaste, Check, Info, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import AppLayout from '@/components/layouts/AppLayout';
import { fetchVehicles, deleteVehicle, updateVehicle, bulkDeleteVehicles, fetchDealers } from '@/lib/api';
import { formatCurrency, formatMileage, getStatusColor, cn } from '@/lib/utils';
import type { Vehicle, VehicleStatus, Dealer } from '@/types/types';
import { toast } from 'sonner';
import { streamLLMQueued } from '@/lib/ai-client';
import { supabase } from '@/db/supabase';

type ViewMode = 'table' | 'grid' | 'list';

interface SavedPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
}

function agingDays(v: Vehicle): number {
  if (!v.created_at) return 0;
  return Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000);
}

function AgingBadge({ days }: { days: number }) {
  if (days < 30) return null;
  if (days > 90) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-semibold whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" />{days}d
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/15 border border-orange-400/30 text-orange-400 font-medium whitespace-nowrap">
      <Clock className="w-2.5 h-2.5" />{days}d
    </span>
  );
}

function colorToHex(color?: string): string {
  const map: Record<string, string> = {
    White: '#f8fafc', Black: '#0f172a', Silver: '#94a3b8', Grey: '#6b7280', Gray: '#6b7280',
    Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Brown: '#92400e',
    Beige: '#d4b896', Gold: '#d4a017', Orange: '#f97316', Yellow: '#eab308',
    Champagne: '#e8d5a3', 'Pearl White': '#f0f0e8', 'Midnight Blue': '#1e3a5f',
  };
  return map[color ?? ''] ?? '#374151';
}

function AgingBar({ days }: { days: number }) {
  const pct = Math.min(100, (days / 120) * 100);
  const color = days > 90 ? 'bg-red-500' : days > 60 ? 'bg-orange-400' : days > 30 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Inline Dealer Contact Card ──────────────────────────────────────────────
function DealerContactCard({ dealer }: { dealer: Dealer }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{dealer.name}</p>
          {dealer.dealership?.name && (
            <p className="text-[10px] text-muted-foreground truncate">{dealer.dealership.name}</p>
          )}
        </div>
        {dealer.rating != null && (
          <span className="ml-auto text-xs text-yellow-400 font-medium shrink-0">★ {dealer.rating.toFixed(1)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {dealer.phone && (
          <a href={`tel:${dealer.phone}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="w-3 h-3 text-primary" />{dealer.phone}
          </a>
        )}
        {dealer.whatsapp && (
          <a href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors">
            <MessageSquare className="w-3 h-3" />WA: {dealer.whatsapp}
          </a>
        )}
        {dealer.email && (
          <a href={`mailto:${dealer.email}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="w-3 h-3 text-primary" />{dealer.email}
          </a>
        )}
        {(dealer.city || dealer.area) && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            {[dealer.area, dealer.city].filter(Boolean).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── AI Inventory Intelligence Panel ─────────────────────────────────────────
function AIInventoryPanel({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const QUICK_PROMPTS = [
    { label: 'Aging Stock', icon: Clock, prompt: 'Flag all vehicles over 45 days in stock and recommend specific actions for each.' },
    { label: 'Price Strategy', icon: TrendingUp, prompt: 'Suggest price adjustments for slow-moving inventory to maximize sales velocity.' },
    { label: 'Buy Recommendations', icon: Sparkles, prompt: 'Based on our current stock mix, what types of vehicles should we source next?' },
    { label: 'Profit Analysis', icon: DollarSign, prompt: 'Which vehicles have the best profit margin potential? Rank top 5.' },
    { label: 'Market Alert', icon: AlertTriangle, prompt: 'Which cars might be overpriced for the current Pakistani market? Be specific.' },
    { label: 'Portfolio Summary', icon: Activity, prompt: 'Give me a concise executive summary of our inventory health and key metrics.' },
  ];

  const run = useCallback((q: string) => {
    if (loading) return;
    setAiText('');
    setLoading(true);
    abortRef.current = new AbortController();
    const summary = vehicles.slice(0, 40).map(v =>
      `${v.make} ${v.model} ${v.variant ?? ''} ${v.model_year} | ${v.status} | PKR ${formatCurrency(v.expected_selling_price)} | ${formatMileage(v.mileage)} | ${agingDays(v)}d stock | ${v.fuel_type ?? ''}`
    ).join('\n');
    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are Wulfrayn\'s DB AI Copilot — a senior automotive business consultant for a Pakistani dealership. Be concise, specific, and actionable. Use bullet points. Focus on ROI and cash flow.',
        contents: [{ role: 'user', parts: [{ text: `INVENTORY (${vehicles.length} total):\n${summary}\n\nQUESTION: ${q}` }] }],
      },
      onChunk: c => setAiText(p => p + c),
      onComplete: () => setLoading(false),
      onError: (e) => {
        setLoading(false);
        setAiText(e.message.includes('429') ? '⏳ Rate limit hit — please wait a moment and retry.' : `❌ ${e.message}`);
      },
      signal: abortRef.current.signal,
    });
  }, [vehicles, loading]);

  return (
    <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground hover:bg-primary/8 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span>AI Inventory Intelligence</span>
          <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 px-1.5">LIVE</Badge>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="px-4 pb-4 space-y-3" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  onClick={() => { setPrompt(qp.prompt); run(qp.prompt); }}>
                  <qp.icon className="w-3 h-3 text-primary" />{qp.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask anything about your inventory…"
                className="h-8 text-xs bg-muted/40 border-border" onKeyDown={e => e.key === 'Enter' && prompt.trim() && run(prompt)} />
              <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => prompt.trim() && run(prompt)} disabled={loading || !prompt.trim()}>
                {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {loading ? 'Thinking…' : 'Ask AI'}
              </Button>
              {loading && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-red-400 shrink-0" onClick={() => abortRef.current?.abort()}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            {aiText && (
              <div className="bg-card border border-primary/20 rounded-xl p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
                <div className="flex items-center gap-1.5 mb-2 text-primary font-semibold">
                  <Sparkles className="w-3 h-3" /> AI Analysis
                </div>
                {aiText}
                {loading && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse align-middle ml-0.5" />}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hover Preview Card (shown on grid hover) ────────────────────────────────
function VehicleHoverPreview({ vehicle }: { vehicle: Vehicle }) {
  const days = agingDays(vehicle);
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg z-10 p-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white text-sm font-bold">{vehicle.make} {vehicle.model}</p>
          <p className="text-white/60 text-xs">{vehicle.variant} · {vehicle.model_year}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(vehicle.status))}>{vehicle.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex items-center gap-1 text-white/70"><Fuel className="w-3 h-3 text-primary/80" />{vehicle.fuel_type ?? '—'}</div>
        <div className="flex items-center gap-1 text-white/70"><Activity className="w-3 h-3 text-primary/80" />{formatMileage(vehicle.mileage)}</div>
        <div className="flex items-center gap-1 text-white/70"><Tag className="w-3 h-3 text-primary/80" />{vehicle.engine_capacity ?? '—'}</div>
        <div className="flex items-center gap-1 text-white/70"><Clock className="w-3 h-3 text-primary/80" />{days}d in stock</div>
      </div>
      {vehicle.dealer && (
        <div className="pt-1 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-white/60">
          <Building2 className="w-3 h-3 text-primary/60" />
          <span className="truncate">{vehicle.dealer.name}</span>
          {vehicle.dealer.phone && <span className="ml-auto shrink-0">{vehicle.dealer.phone}</span>}
        </div>
      )}
      <div className="mt-auto">
        <p className="text-primary font-bold text-base">{formatCurrency(vehicle.expected_selling_price)}</p>
        {vehicle.inspection_score != null && (
          <div className="mt-1">
            <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
              <span>Inspection</span><span>{vehicle.inspection_score}/100</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${vehicle.inspection_score}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────
const MAKE_OPTIONS = ['all', 'Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'BMW', 'Mercedes', 'Audi', 'Mitsubishi', 'Nissan', 'Daihatsu', 'Changan', 'MG', 'Haval', 'Isuzu', 'Peugeot', 'Subaru', 'Mazda'];
const BODY_OPTIONS = ['all', 'Sedan', 'SUV', 'Hatchback', 'Pickup', 'Crossover', 'Wagon', 'Van', 'Coupe', 'Convertible', 'MPV'];
const FUEL_OPTIONS = ['all', 'Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG', 'LPG'];
const TRANS_OPTIONS = ['all', 'Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'expected_selling_price:asc', label: 'Price: Low → High' },
  { value: 'expected_selling_price:desc', label: 'Price: High → Low' },
  { value: 'model_year:desc', label: 'Year: New → Old' },
  { value: 'model_year:asc', label: 'Year: Old → New' },
  { value: 'mileage:asc', label: 'Mileage: Low → High' },
];

// ─── Status color map for filter pills ───────────────────────────────────────
const STATUS_PILL_COLORS: Record<string, string> = {
  all: 'bg-muted/60 text-foreground',
  available: 'bg-green-500/10 text-green-400 border-green-500/20',
  reserved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  booked: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  sold: 'bg-muted text-muted-foreground',
  incoming: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  inspection: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  archived: 'bg-muted/40 text-muted-foreground',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [makeFilter, setMakeFilter] = useState('all');
  const [bodyFilter, setBodyFilter] = useState('all');
  const [fuelFilter, setFuelFilter] = useState('all');
  const [transFilter, setTransFilter] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [mileageMax, setMileageMax] = useState('');
  const [sortVal, setSortVal] = useState('created_at:desc');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('rpm_inv_presets') ?? '[]'); } catch { return []; }
  });
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  // ── CSV Import state ───────────────────────────────────────────────────────
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvTab, setCsvTab] = useState<'paste' | 'file'>('paste');
  const [csvPaste, setCsvPaste] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // CSV column → Vehicle field mapping (order matters for template)
  const CSV_COLUMNS = [
    'make','model','variant','model_year','color','fuel_type','transmission',
    'body_type','mileage','expected_selling_price','purchase_price','status',
    'vehicle_condition','engine_capacity','registration_city','owner_type',
    'stock_number','registration_number','source','private_notes','features',
  ] as const;

  const CSV_TEMPLATE_HEADER = CSV_COLUMNS.join(',');
  const CSV_TEMPLATE_EXAMPLE = [
    'Toyota','Corolla','Altis X CVT','2022','White','Petrol','Automatic',
    'Sedan','0','4200000','3800000','available','new','1800cc',
    'Karachi','first','STK-001','ABC-123','walk_in','','Push Start|ABS|Climate Control|Reverse Camera',
  ].join(',');

  const downloadCsvTemplate = () => {
    const content = [CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rpm-vehicle-import-template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const parseCsvText = (text: string): Record<string, string>[] => {
    // Strip BOM, normalise line endings
    const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    // RFC-4180 tokeniser: handles quoted fields with embedded commas and escaped quotes ("")
    const tokenise = (line: string): string[] => {
      const fields: string[] = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i++; }   // escaped quote ""
            else { inQ = false; }                            // closing quote
          } else { cur += ch; }
        } else {
          if (ch === '"') { inQ = true; }
          else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
      }
      fields.push(cur.trim());
      return fields;
    };

    // Normalise header names: lowercase, spaces→_, strip non-alphanum except _
    const rawHeaders = tokenise(lines[0]).map(h =>
      h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );

    // Column aliases — map common alternate names to canonical field names
    const ALIASES: Record<string, string> = {
      car_make: 'make', vehicle_make: 'make', brand: 'make',
      car_model: 'model', vehicle_model: 'model',
      trim: 'variant', grade: 'variant', version: 'variant',
      year: 'model_year', yr: 'model_year', manufacture_year: 'model_year',
      colour: 'color', ext_color: 'color',
      fuel: 'fuel_type', engine_type: 'fuel_type',
      trans: 'transmission', gearbox: 'transmission',
      body: 'body_type', type: 'body_type',
      km: 'mileage', odometer: 'mileage', kms: 'mileage',
      price: 'expected_selling_price', selling_price: 'expected_selling_price',
      asking_price: 'expected_selling_price', sale_price: 'expected_selling_price',
      cost: 'purchase_price', buy_price: 'purchase_price',
      ex_factory_price: 'market_price', ex_factory: 'market_price',
      booking_price: 'market_price', factory_price: 'market_price',
      booking: 'market_price', official_price: 'market_price',
      condition: 'vehicle_condition', cond: 'vehicle_condition',
      engine: 'engine_capacity', engine_cc: 'engine_capacity', cc: 'engine_capacity',
      city: 'registration_city', reg_city: 'registration_city',
      owner: 'owner_type', ownership: 'owner_type',
      stock: 'stock_number', stock_no: 'stock_number',
      reg: 'registration_number', reg_no: 'registration_number', plate: 'registration_number',
      notes: 'private_notes', remarks: 'private_notes', description: 'private_notes',
    };

    const normHeaders = rawHeaders.map(h => ALIASES[h] ?? h);

    return lines.slice(1).map(line => {
      const vals = tokenise(line);
      const obj: Record<string, string> = {};
      normHeaders.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    }).filter(r => r.make?.trim());
  };

  const buildVehiclePayload = (row: Record<string, string>) => {
    const num = (v: string) => v ? (Number(v.replace(/[^0-9.]/g, '')) || undefined) : undefined;
    const str = (v: string) => v?.trim() || undefined;

    // Parse features: accept pipe-separated, semicolon-separated, or comma-separated
    const rawFeatures = row.features ?? row.feature_list ?? row.equipment ?? '';
    const parsedFeatures: string[] = rawFeatures
      ? rawFeatures.split(/[|;,]/).map((f: string) => f.trim()).filter(Boolean)
      : [];

    // Map feature names to boolean fields on Vehicle
    const featureFlags: Record<string, boolean> = {};
    const FEATURE_MAP: Record<string, string> = {
      'abs': 'has_abs', 'anti-lock brakes': 'has_abs',
      'sunroof': 'has_sunroof', 'moon roof': 'has_sunroof',
      'panoramic': 'has_panoramic_roof', 'panoramic roof': 'has_panoramic_roof',
      'push start': 'has_push_start', 'keyless start': 'has_push_start', 'smart key': 'has_push_start',
      'keyless entry': 'has_keyless_entry', 'remote start': 'has_keyless_entry',
      'cruise control': 'has_cruise_control',
      'adaptive cruise': 'has_adaptive_cruise',
      'lane assist': 'has_lane_assist', 'lane keeping': 'has_lane_assist',
      'blind spot': 'has_blind_spot', 'blind spot monitoring': 'has_blind_spot',
      '360 camera': 'has_360_camera', '360': 'has_360_camera',
      'parking sensors': 'has_parking_sensors', 'pdc': 'has_parking_sensors',
      'reverse camera': 'has_reverse_camera', 'backup camera': 'has_reverse_camera',
      'climate control': 'has_climate_control', 'dual zone': 'has_dual_zone_ac',
      'rear ac': 'has_rear_ac', 'rear air': 'has_rear_ac',
      'carplay': 'has_apple_carplay', 'apple carplay': 'has_apple_carplay',
      'android auto': 'has_android_auto',
      'navigation': 'has_navigation', 'gps': 'has_navigation',
      'bluetooth': 'has_bluetooth',
      'wireless charging': 'has_wireless_charging',
      'alloy wheels': 'has_alloy_wheels', 'alloys': 'has_alloy_wheels',
      'led lights': 'has_led_lights', 'led headlights': 'has_led_lights',
      'fog lamps': 'has_fog_lamps', 'fog lights': 'has_fog_lamps',
      'electric seats': 'has_electric_seats', 'power seats': 'has_electric_seats',
      'heated seats': 'has_heated_seats',
      'ventilated seats': 'has_ventilated_seats', 'cooled seats': 'has_ventilated_seats',
      'memory seats': 'has_memory_seats',
      'premium audio': 'has_premium_audio', 'bose': 'has_premium_audio', 'harman': 'has_premium_audio',
      'steering controls': 'has_steering_controls', 'steering mounted': 'has_steering_controls',
      'ambient lighting': 'has_ambient_lighting',
      'tpms': 'has_tpms', 'tyre pressure': 'has_tpms',
      'hill assist': 'has_hill_assist', 'hill hold': 'has_hill_assist',
      'auto hold': 'has_auto_hold',
      'power tailgate': 'has_power_tailgate', 'electric tailgate': 'has_power_tailgate',
      'roof rails': 'has_roof_rails',
      'side steps': 'has_side_steps', 'running boards': 'has_side_steps',
      'esp': 'has_esp', 'stability control': 'has_esp',
      'traction control': 'has_traction_control', 'tcs': 'has_traction_control',
    };
    for (const feat of parsedFeatures) {
      const key = feat.toLowerCase();
      const field = FEATURE_MAP[key];
      if (field) featureFlags[field] = true;
    }

    // Airbag count
    const airbagMatch = parsedFeatures.find(f => /airbag/i.test(f));
    const airbagCount = airbagMatch ? parseInt(airbagMatch.replace(/\D/g, '')) || 2 : undefined;

    return {
      make: row.make?.trim() || 'Unknown',
      model: str(row.model) ?? '',
      variant: str(row.variant),
      model_year: num(row.model_year),
      color: str(row.color),
      fuel_type: str(row.fuel_type),
      transmission: str(row.transmission),
      body_type: str(row.body_type),
      mileage: num(row.mileage) ?? 0,
      expected_selling_price: num(row.expected_selling_price ?? row.price ?? row.selling_price ?? ''),
      purchase_price: num(row.purchase_price ?? row.cost ?? ''),
      // Ex-factory / booking price maps to market_price so it shows in inventory listing
      market_price: num(row.market_price ?? row.ex_factory_price ?? row.booking_price ?? row.factory_price ?? row.ex_factory ?? row.booking ?? row.expected_selling_price ?? row.price ?? row.selling_price ?? ''),
      status: (str(row.status) ?? 'available') as VehicleStatus,
      vehicle_condition: (str(row.vehicle_condition) ?? 'new') as 'new' | 'used',
      engine_capacity: str(row.engine_capacity ?? row.engine_cc),
      registration_city: str(row.registration_city ?? row.city),
      owner_type: str(row.owner_type) as 'first' | 'second' | 'third' | undefined,
      stock_number: str(row.stock_number),
      registration_number: str(row.registration_number ?? row.reg_number),
      source: str(row.source),
      private_notes: str(row.private_notes ?? row.notes),
      custom_features: parsedFeatures.filter((f: string) => {
        // keep features that didn't map to a known boolean field
        const key = f.toLowerCase();
        return !Object.keys(FEATURE_MAP).some(k => k === key);
      }).join(', ') || undefined,
      ...(airbagCount ? { airbag_count: airbagCount } : {}),
      ...featureFlags,
    };
  };

  const handleCsvImport = async (text: string) => {
    const rows = parseCsvText(text);
    if (!rows.length) {
      // Give a diagnostic hint: show what headers were detected
      const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const firstLine = clean.split('\n').find(l => l.trim());
      toast.error(
        firstLine
          ? `No valid rows found. Detected header: "${firstLine.slice(0, 80)}". Ensure a "make" or "brand" column is present.`
          : 'CSV appears empty — paste content with a header row first.'
      );
      return;
    }
    setCsvPreview(rows.slice(0, 5));
    setCsvImporting(true);
    try {
      const payloads = rows.map(buildVehiclePayload);
      const { data, error } = await supabase.from('vehicles').insert(payloads).select('id');
      if (error) throw error;
      toast.success(`✅ Imported ${data?.length ?? payloads.length} vehicles`);
      setShowCsvImport(false);
      setCsvPaste('');
      setCsvPreview([]);
      loadVehicles();
    } catch (e: any) {
      toast.error('Import failed: ' + (e.message ?? 'Unknown error'));
    } finally {
      setCsvImporting(false);
    }
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await handleCsvImport(text);
    e.target.value = '';
  };

  useEffect(() => {
    fetchDealers({ pageSize: 200 }).then(r => setDealers(r.data));
  }, []);

  const [orderBy, orderDir] = sortVal.split(':') as [string, 'asc' | 'desc'];

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchVehicles({
        page, pageSize, search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        vehicle_condition: conditionFilter !== 'all' ? conditionFilter : undefined,
        owner_type: ownerFilter !== 'all' ? ownerFilter : undefined,
        make: makeFilter !== 'all' ? makeFilter : undefined,
        body_type: bodyFilter !== 'all' ? bodyFilter : undefined,
        fuel_type: fuelFilter !== 'all' ? fuelFilter : undefined,
        dealer_id: dealerFilter !== 'all' ? dealerFilter : undefined,
        min_price: priceMin ? Number(priceMin) : undefined,
        max_price: priceMax ? Number(priceMax) : undefined,
        orderBy, orderDir,
      });
      let filtered = data;
      if (yearMin) filtered = filtered.filter(v => (v.model_year ?? 0) >= Number(yearMin));
      if (yearMax) filtered = filtered.filter(v => (v.model_year ?? 9999) <= Number(yearMax));
      if (mileageMax) filtered = filtered.filter(v => (v.mileage ?? 0) <= Number(mileageMax));
      if (transFilter !== 'all') filtered = filtered.filter(v => v.transmission?.toLowerCase().includes(transFilter.toLowerCase()));
      setVehicles(filtered);
      setTotal(count);
    } finally { setLoading(false); }
  }, [page, pageSize, search, statusFilter, conditionFilter, ownerFilter, makeFilter, bodyFilter, fuelFilter, transFilter, dealerFilter, priceMin, priceMax, yearMin, yearMax, mileageMax, orderBy, orderDir]);

  useEffect(() => {
    const t = setTimeout(loadVehicles, 300);
    return () => clearTimeout(t);
  }, [loadVehicles]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => {
    setSelected(selected.size === vehicles.length ? new Set() : new Set(vehicles.map(v => v.id)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    await deleteVehicle(id);
    toast.success('Vehicle deleted');
    loadVehicles();
  };

  const handleBulkStatus = async (status: VehicleStatus) => {
    await Promise.all([...selected].map(id => updateVehicle(id, { status })));
    toast.success(`Updated ${selected.size} vehicles to "${status}"`);
    setSelected(new Set()); loadVehicles();
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const cnt = selected.size;
      await bulkDeleteVehicles([...selected]);
      toast.success(`Deleted ${cnt} vehicle${cnt !== 1 ? 's' : ''}`);
      setSelected(new Set()); loadVehicles();
    } catch { toast.error('Failed to delete selected vehicles'); }
    finally { setBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  const clearFilters = () => {
    setStatusFilter('all'); setConditionFilter('all'); setOwnerFilter('all');
    setMakeFilter('all'); setBodyFilter('all'); setFuelFilter('all');
    setTransFilter('all'); setDealerFilter('all');
    setYearMin(''); setYearMax(''); setPriceMin(''); setPriceMax(''); setMileageMax('');
    setSortVal('created_at:desc');
  };

  const currentFilters = { statusFilter, conditionFilter, ownerFilter, makeFilter, bodyFilter, fuelFilter, transFilter, dealerFilter, yearMin, yearMax, priceMin, priceMax, mileageMax, sortVal };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const preset: SavedPreset = { id: Date.now().toString(), name: presetName.trim(), filters: currentFilters as Record<string, string> };
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('rpm_inv_presets', JSON.stringify(updated));
    setPresetName(''); setShowPresetInput(false);
    toast.success(`Preset "${preset.name}" saved`);
  };

  const loadPreset = (preset: SavedPreset) => {
    const f = preset.filters;
    setStatusFilter(f.statusFilter ?? 'all'); setConditionFilter(f.conditionFilter ?? 'all');
    setOwnerFilter(f.ownerFilter ?? 'all'); setMakeFilter(f.makeFilter ?? 'all');
    setBodyFilter(f.bodyFilter ?? 'all'); setFuelFilter(f.fuelFilter ?? 'all');
    setTransFilter(f.transFilter ?? 'all'); setDealerFilter(f.dealerFilter ?? 'all');
    setYearMin(f.yearMin ?? ''); setYearMax(f.yearMax ?? '');
    setPriceMin(f.priceMin ?? ''); setPriceMax(f.priceMax ?? '');
    setMileageMax(f.mileageMax ?? ''); setSortVal(f.sortVal ?? 'created_at:desc');
    setPage(1); toast.success(`Preset "${preset.name}" applied`);
  };

  const deletePreset = (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated); localStorage.setItem('rpm_inv_presets', JSON.stringify(updated));
  };

  const activeFilters = Object.entries(currentFilters).filter(([k, v]) =>
    ['statusFilter', 'conditionFilter', 'ownerFilter', 'makeFilter', 'bodyFilter', 'fuelFilter', 'transFilter', 'dealerFilter'].includes(k) ? v !== 'all' :
      ['yearMin', 'yearMax', 'priceMin', 'priceMax', 'mileageMax'].includes(k) ? !!v : false
  ).length;

  const totalPages = Math.ceil(total / pageSize);
  const selectedDealerName = dealers.find(d => d.id === dealerFilter)?.name;

  // ─── Stats derived from current vehicles ────────────────────────────────
  const stats = {
    available: vehicles.filter(v => v.status === 'available').length,
    hot: vehicles.filter(v => v.is_hot_deal).length,
    aging: vehicles.filter(v => agingDays(v) > 45).length,
    totalValue: vehicles.reduce((s, v) => s + (v.expected_selling_price ?? 0), 0),
  };

  return (
    <>
      <AppLayout>
        <div className="flex flex-col h-full min-h-0">

          {/* ─── Top Toolbar ─── */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
            {/* Row 1: Search + actions */}
            <div className="flex items-center gap-2 px-3 md:px-4 py-2.5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search make, model, stock #, color, reg…"
                  className="pl-9 h-8 bg-muted/50 border-border text-sm" />
                {search && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Saved presets */}
              {savedPresets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border shrink-0">
                      <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">Presets</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">Saved Filter Presets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {savedPresets.map(p => (
                      <DropdownMenuItem key={p.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate cursor-pointer flex-1" onClick={() => loadPreset(p)}>{p.name}</span>
                        <button className="text-muted-foreground hover:text-destructive shrink-0" onClick={e => { e.stopPropagation(); deletePreset(p.id); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Filters toggle */}
              <Button variant="outline" size="sm" className={cn('h-8 gap-1.5 text-xs border-border shrink-0', showFilters && 'bg-primary/10 border-primary/30 text-primary')}
                onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilters > 0 && <Badge className="w-4 h-4 p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground">{activeFilters}</Badge>}
              </Button>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 shrink-0">
                {([['table', Table2], ['grid', LayoutGrid], ['list', List]] as [ViewMode, React.ElementType][]).map(([v, Icon]) => (
                  <button key={v} onClick={() => setView(v)}
                    className={cn('p-1.5 rounded transition-colors', view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => navigate('/inventory/new')}>
                <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Vehicle</span>
              </Button>
              {/* Add by CSV */}
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border shrink-0"
                title="Import vehicles from CSV"
                onClick={() => { setCsvPreview([]); setCsvPaste(''); setShowCsvImport(true); }}
              >
                <FileUp className="w-3.5 h-3.5" /><span className="hidden sm:inline">Import CSV</span>
              </Button>
              {/* CSV Export */}
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border shrink-0"
                title="Export CSV"
                onClick={() => {
                  const headers = ['Stock #','Make','Model','Variant','Year','Color','Fuel','Trans','Mileage','Price (PKR)','Status','Days In Stock','Dealer','Dealer Phone'];
                  const rows = vehicles.map(v => [
                    v.stock_number ?? '',
                    v.make ?? '', v.model ?? '', v.variant ?? '',
                    v.model_year?.toString() ?? '',
                    v.color ?? '', v.fuel_type ?? '', v.transmission ?? '',
                    v.mileage?.toString() ?? '',
                    v.expected_selling_price?.toString() ?? '',
                    v.status ?? '',
                    agingDays(v).toString(),
                    (v.dealer as Dealer | null)?.name ?? '',
                    (v.dealer as Dealer | null)?.phone ?? '',
                  ]);
                  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `rpm-inventory-${new Date().toISOString().slice(0,10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                  toast.success(`Exported ${vehicles.length} vehicles to CSV`);
                }}
              >
                <Download className="w-3.5 h-3.5" /><span className="hidden md:inline">Export</span>
              </Button>
            </div>

            {/* Row 2: Quick status pills */}
            <div className="flex items-center gap-1.5 px-3 md:px-4 pb-2 overflow-x-auto scrollbar-none">
              {['all', 'available', 'reserved', 'booked', 'sold', 'incoming', 'inspection', 'archived'].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0',
                    statusFilter === s ? (STATUS_PILL_COLORS[s] ?? 'bg-primary/10 text-primary border-primary/20') + ' border' : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                  {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <div className="w-px h-4 bg-border shrink-0 mx-1" />
              {[{ v: 'all', l: 'All' }, { v: 'used', l: 'Used' }, { v: 'new', l: 'New' }].map(({ v, l }) => (
                <button key={v} onClick={() => { setConditionFilter(v); setPage(1); }}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0',
                    conditionFilter === v ? 'bg-primary/10 text-primary border-primary/20' : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                  {l}
                </button>
              ))}
              {dealerFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground whitespace-nowrap shrink-0 border border-primary">
                  <Building2 className="w-3 h-3" />{selectedDealerName}
                  <button onClick={() => { setDealerFilter('all'); setPage(1); }} className="opacity-70 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {/* Row 3: Advanced filters (collapsible) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                  <div className="px-3 md:px-4 py-3 space-y-2.5 bg-muted/10">
                    {/* Row A */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={sortVal} onValueChange={v => { setSortVal(v); setPage(1); }}>
                        <SelectTrigger className="h-7 w-44 text-xs bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {[
                        { lbl: 'Owner', val: ownerFilter, fn: setOwnerFilter, opts: [{ v: 'all', l: 'All Ownership' }, { v: 'own', l: 'Own Stock' }, { v: 'dealer', l: 'Dealer Stock' }, { v: 'party', l: 'Party Stock' }] },
                        { lbl: 'Make', val: makeFilter, fn: setMakeFilter, opts: MAKE_OPTIONS.map(v => ({ v, l: v === 'all' ? 'All Makes' : v })) },
                        { lbl: 'Body', val: bodyFilter, fn: setBodyFilter, opts: BODY_OPTIONS.map(v => ({ v, l: v === 'all' ? 'All Body Types' : v })) },
                        { lbl: 'Fuel', val: fuelFilter, fn: setFuelFilter, opts: FUEL_OPTIONS.map(v => ({ v, l: v === 'all' ? 'All Fuels' : v })) },
                        { lbl: 'Trans.', val: transFilter, fn: setTransFilter, opts: TRANS_OPTIONS.map(v => ({ v, l: v === 'all' ? 'All Transmissions' : v })) },
                      ].map(f => (
                        <Select key={f.lbl} value={f.val} onValueChange={v => { f.fn(v); setPage(1); }}>
                          <SelectTrigger className="h-7 w-36 text-xs bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>{f.opts.map(o => <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>)}</SelectContent>
                        </Select>
                      ))}
                      <Select value={dealerFilter} onValueChange={v => { setDealerFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-7 w-44 text-xs bg-muted/50 border-border">
                          <Building2 className="w-3 h-3 mr-1 text-muted-foreground shrink-0" />
                          <SelectValue placeholder="All Dealers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">All Dealers</SelectItem>
                          {dealers.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}{d.city ? ` · ${d.city}` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Row B: Ranges */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Year:</span>
                        <Input value={yearMin} onChange={e => { setYearMin(e.target.value); setPage(1); }} placeholder="From" className="h-7 w-20 text-xs bg-muted/50 border-border" />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input value={yearMax} onChange={e => { setYearMax(e.target.value); setPage(1); }} placeholder="To" className="h-7 w-20 text-xs bg-muted/50 border-border" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Price (PKR):</span>
                        <Input value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1); }} placeholder="Min" className="h-7 w-28 text-xs bg-muted/50 border-border" />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1); }} placeholder="Max" className="h-7 w-28 text-xs bg-muted/50 border-border" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Max km:</span>
                        <Input value={mileageMax} onChange={e => { setMileageMax(e.target.value); setPage(1); }} placeholder="e.g. 50000" className="h-7 w-28 text-xs bg-muted/50 border-border" />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {activeFilters > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
                            <X className="w-3 h-3 mr-1" />Clear all
                          </Button>
                        )}
                        {/* Save preset */}
                        {showPresetInput ? (
                          <div className="flex items-center gap-1.5">
                            <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name…" className="h-7 w-32 text-xs bg-muted/50 border-border"
                              onKeyDown={e => e.key === 'Enter' && savePreset()} />
                            <Button size="sm" className="h-7 text-xs" onClick={savePreset}>Save</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPresetInput(false)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-border" onClick={() => setShowPresetInput(true)}>
                            <Bookmark className="w-3 h-3 mr-1" />Save Preset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Bulk Actions Bar ─── */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 flex-wrap overflow-hidden shrink-0">
                <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
                <Separator orientation="vertical" className="h-4" />
                {(['available', 'reserved', 'booked', 'sold'] as VehicleStatus[]).map(s => (
                  <Button key={s} size="sm" variant="outline" className="h-6 text-xs border-border gap-1" onClick={() => handleBulkStatus(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive gap-1" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="w-3 h-3" />Delete
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground ml-auto" onClick={() => setSelected(new Set())}>
                  <X className="w-3 h-3 mr-1" />Deselect
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Stats + count bar ─── */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-border bg-muted/10 text-xs shrink-0">
            <span className="font-semibold text-foreground">{total.toLocaleString()} vehicles</span>
            <span className="text-muted-foreground hidden sm:inline">·</span>
            <span className="text-green-400 hidden sm:flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{stats.available} available</span>
            {stats.hot > 0 && <span className="text-red-400 hidden md:flex items-center gap-1"><Zap className="w-3 h-3" />{stats.hot} hot</span>}
            {stats.aging > 0 && <span className="text-orange-400 hidden md:flex items-center gap-1"><Clock className="w-3 h-3" />{stats.aging} aging</span>}
            <span className="hidden lg:inline text-muted-foreground">·</span>
            <span className="hidden lg:inline text-muted-foreground">Value: <span className="text-foreground font-medium">{formatCurrency(stats.totalValue)}</span></span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground">Pg {page}/{Math.max(1, totalPages)}</span>
              <button onClick={loadVehicles} className="text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-3 h-3" /></button>
            </div>
          </div>

          {/* ─── AI Tools Panel ─── */}
          <AIInventoryPanel vehicles={vehicles} />

          {/* ─── Content ─── */}
          <div className="flex-1 overflow-auto min-h-0">
            {view === 'table' && <TableView vehicles={vehicles} loading={loading} selected={selected} onToggleSelect={toggleSelect} onSelectAll={selectAll} onDelete={handleDelete} />}
            {view === 'grid' && <GridView vehicles={vehicles} loading={loading} />}
            {view === 'list' && <ListView vehicles={vehicles} loading={loading} selected={selected} onToggleSelect={toggleSelect} onDelete={handleDelete} />}
          </div>

          {/* ─── Pagination ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border bg-background shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : Math.max(1, page - 3) + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('w-7 h-7 rounded text-xs font-medium transition-colors', p === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                    {p}
                  </button>
                );
              })}
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </AppLayout>

      {/* ─── Bulk Delete Dialog ─── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Vehicle{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All selected vehicles and their data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? 'Deleting…' : `Delete ${selected.size} vehicles`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── CSV Import Dialog ─── */}
      <input ref={csvFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvFile} />
      <Dialog open={showCsvImport} onOpenChange={setShowCsvImport}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" /> Import Vehicles from CSV
            </DialogTitle>
          </DialogHeader>

          {/* Column reference */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" /> Required CSV columns
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-border shrink-0" onClick={downloadCsvTemplate}>
                <Download className="w-3 h-3" /> Download Template
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="flex flex-wrap gap-1.5">
                {CSV_COLUMNS.map(col => (
                  <span key={col} className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded border',
                    ['make','model'].includes(col)
                      ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                      : 'bg-muted/60 text-muted-foreground border-border/60'
                  )}>{col}</span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                <span className="text-primary font-semibold">Bold</span> = required. Extra columns are ignored. First row must be headers.
              </p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {(['paste','file'] as const).map(t => (
              <button key={t} onClick={() => setCsvTab(t)}
                className={cn('flex-1 h-8 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                  csvTab === t ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground')}>
                {t === 'paste' ? <><ClipboardPaste className="w-3.5 h-3.5" />Paste CSV</> : <><Upload className="w-3.5 h-3.5" />Upload File</>}
              </button>
            ))}
          </div>

          {csvTab === 'paste' ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Paste your CSV content below (with header row)</Label>
              <Textarea
                value={csvPaste}
                onChange={e => { setCsvPaste(e.target.value); setCsvPreview(parseCsvText(e.target.value).slice(0,5)); }}
                placeholder={`make,model,variant,model_year,color,fuel_type,…\nToyota,Corolla,Altis X,2022,White,Petrol,…`}
                className="font-mono text-xs min-h-[160px] resize-y bg-muted/20 border-border"
              />
              {csvPreview.length > 0 && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <p className="text-[10px] font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Preview — {parseCsvText(csvPaste).length} rows detected (showing first {csvPreview.length})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-[10px]">
                      <thead><tr className="border-b border-border/40">
                        {['make','model','variant','model_year','color','fuel_type','price'].map(h => (
                          <th key={h} className="px-2 py-1 text-left text-muted-foreground whitespace-nowrap font-semibold">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          {['make','model','variant','model_year','color','fuel_type','expected_selling_price'].map(k => (
                            <td key={k} className="px-2 py-1 text-foreground whitespace-nowrap max-w-[100px] truncate">{row[k] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-10 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => csvFileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (!file) return;
                file.text().then(text => handleCsvImport(text));
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-sm font-semibold text-foreground">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground">.csv files supported</p>
                <span className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground bg-background">
                  <FileUp className="w-3.5 h-3.5" /> Choose CSV File
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-row">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setShowCsvImport(false)}>
              Cancel
            </Button>
            {csvTab === 'paste' && (
              <Button
                className="flex-1 h-9 text-xs gap-1.5"
                disabled={!csvPaste.trim() || csvImporting}
                onClick={() => handleCsvImport(csvPaste)}
              >
                {csvImporting
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                  : <><FileUp className="w-3.5 h-3.5" /> Import {parseCsvText(csvPaste).length || ''} Vehicles</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TableView({ vehicles, loading, selected, onToggleSelect, onSelectAll, onDelete }: {
  vehicles: Vehicle[]; loading: boolean; selected: Set<string>;
  onToggleSelect: (id: string) => void; onSelectAll: () => void; onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full min-w-max">
        <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10">
          <tr>
            <th className="w-10 px-4 py-2.5">
              <Checkbox checked={selected.size > 0 && selected.size === vehicles.length} onCheckedChange={onSelectAll} className="border-border" />
            </th>
            {['Stock #', 'Vehicle', 'Color', 'Year / CC', 'Mileage', 'Fuel', 'Price (PKR)', 'Status', 'Days', 'Owner / Dealer', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 11 }).map((_, j) => (
                <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full bg-muted" /></td>
              ))}</tr>
            ))
            : vehicles.map((v) => {
              const days = agingDays(v);
              return (
                <React.Fragment key={v.id}>
                  <tr
                    className={cn('hover:bg-muted/20 transition-colors group cursor-pointer', selected.has(v.id) && 'bg-primary/5 border-l-2 border-l-primary')}
                    onClick={() => navigate(`/inventory/${v.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); onToggleSelect(v.id); }}>
                      <Checkbox checked={selected.has(v.id)} className="border-border" onCheckedChange={() => onToggleSelect(v.id)} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-muted-foreground">{v.stock_number || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {v.cover_image_url
                            ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <Car className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-foreground whitespace-nowrap">{v.make} {v.model}</p>
                            {v.is_hot_deal && <span title="Hot Deal"><Zap className="w-3 h-3 text-red-400 shrink-0" /></span>}
                            {v.is_featured && <span title="Featured"><Star className="w-3 h-3 text-yellow-400 shrink-0" /></span>}
                            {v.is_urgent && <span title="Urgent"><AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" /></span>}
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{v.variant || '—'} · {v.transmission || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0" style={{ background: colorToHex(v.color) }} />
                        <span className="text-sm text-foreground">{v.color || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-foreground">{v.model_year || '—'}</p>
                      {v.engine_capacity && <p className="text-xs text-muted-foreground">{v.engine_capacity}</p>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">{formatMileage(v.mileage)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">{v.fuel_type || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(v.expected_selling_price)}</p>
                      {v.is_negotiable && <p className="text-[10px] text-muted-foreground">Negotiable</p>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', getStatusColor(v.status))}>{v.status}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 w-16">
                        <AgingBadge days={days} />
                        <AgingBar days={days} />
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {v.owner_type === 'dealer' && v.dealer ? (
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setExpandedDealer(expandedDealer === v.id ? null : v.id)}>
                          <Building2 className="w-3 h-3 text-primary" />
                          <span className="max-w-[100px] truncate">{(v.dealer as Dealer).name}</span>
                          {expandedDealer === v.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : v.owner_type === 'party' && v.party ? (
                        <span className="flex items-center gap-1 text-xs text-violet-400">
                          <Users className="w-3 h-3" />
                          <span className="max-w-[100px] truncate">{(v.party as {name:string}).name}</span>
                        </span>
                      ) : (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', v.owner_type === 'own' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border')}>
                          {v.owner_type ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* WhatsApp quick contact */}
                        {v.dealer && (v.dealer as Dealer).whatsapp || v.dealer && (v.dealer as Dealer).phone ? (
                          <a
                            href={`https://wa.me/${((v.dealer as Dealer).whatsapp || (v.dealer as Dealer).phone)!.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi, interested in ${v.make} ${v.model} ${v.model_year ?? ''} – Stock #${v.stock_number ?? 'N/A'}`)}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                            title="WhatsApp dealer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => navigate(`/inventory/${v.id}`)}><Eye className="w-3.5 h-3.5 mr-2" />View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/inventory/${v.id}/edit`)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/compare?a=${v.id}`)}><GitCompare className="w-3.5 h-3.5 mr-2" />Compare</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(v.id)}><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded dealer row */}
                  {expandedDealer === v.id && v.dealer && (
                    <tr className="bg-primary/3">
                      <td colSpan={12} className="px-16 py-3">
                        <DealerContactCard dealer={v.dealer as Dealer} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
        </tbody>
      </table>
      {!loading && vehicles.length === 0 && (
        <div className="py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No vehicles found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters or add a new vehicle</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRID VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function GridView({ vehicles, loading }: { vehicles: Vehicle[]; loading: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {loading
        ? Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-0">
              <Skeleton className="aspect-[4/3] w-full rounded-t-lg bg-muted" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-3 w-1/2 bg-muted" />
                <Skeleton className="h-4 w-2/3 bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))
        : vehicles.map((v) => {
          const days = agingDays(v);
          return (
            <motion.div key={v.id} whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
              <Card className="bg-card border-border hover:border-primary/40 cursor-pointer transition-all overflow-hidden relative group shadow-sm hover:shadow-md"
                onClick={() => navigate(`/inventory/${v.id}`)}>
                {/* Image */}
                <div className="aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
                  {v.cover_image_url
                    ? <img src={v.cover_image_url} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <Car className="w-10 h-10 text-muted-foreground/40" />}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {v.is_hot_deal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold">HOT</span>}
                    {v.is_featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500 text-black font-bold">★</span>}
                    {v.is_urgent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-white font-bold">URGENT</span>}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', getStatusColor(v.status))}>{v.status}</span>
                  </div>
                  {days > 30 && (
                    <div className="absolute bottom-2 left-2">
                      <AgingBadge days={days} />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <VehicleHoverPreview vehicle={v} />
                </div>
                {/* Info */}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p className="text-sm font-bold text-foreground truncate">{v.make} {v.model}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0', getStatusColor(v.status))}>{v.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">{[v.variant, v.color, v.model_year].filter(Boolean).join(' · ')}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    {v.fuel_type && <span className="flex items-center gap-0.5"><Fuel className="w-3 h-3" />{v.fuel_type}</span>}
                    {v.mileage != null && <span className="flex items-center gap-0.5 ml-auto">{formatMileage(v.mileage)}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(v.expected_selling_price)}</p>
                    {v.inspection_score != null && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                        v.inspection_score >= 75 ? 'bg-green-500/10 text-green-400' :
                        v.inspection_score >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400',
                      )}>{v.inspection_score}/100</span>
                    )}
                  </div>
                  {v.owner_type === 'dealer' && v.dealer && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-primary shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate flex-1">{(v.dealer as Dealer).name}</span>
                      {((v.dealer as Dealer).whatsapp || (v.dealer as Dealer).phone) ? (
                        <a
                          href={`https://wa.me/${((v.dealer as Dealer).whatsapp || (v.dealer as Dealer).phone)!.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi, interested in ${v.make} ${v.model} ${v.model_year ?? ''}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 w-6 h-6 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                          title="WhatsApp dealer"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      ) : (v.dealer as Dealer).phone && (
                        <a href={`tel:${(v.dealer as Dealer).phone}`} onClick={e => e.stopPropagation()}
                          className="text-[10px] text-primary ml-auto shrink-0 hover:underline">{(v.dealer as Dealer).phone}</a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIST VIEW (dense, rich, with full dealer info)
// ═══════════════════════════════════════════════════════════════════════════════
function ListView({ vehicles, loading, selected, onToggleSelect, onDelete }: {
  vehicles: Vehicle[]; loading: boolean; selected: Set<string>;
  onToggleSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return (
    <div className="divide-y divide-border/40">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-16 h-12 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-48 bg-muted" />
            <Skeleton className="h-3 w-72 bg-muted" />
          </div>
          <Skeleton className="h-5 w-20 bg-muted shrink-0" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="divide-y divide-border/40">
      {vehicles.map((v) => {
        const days = agingDays(v);
        const isExp = expanded === v.id;
        return (
          <React.Fragment key={v.id}>
            <div className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/15 transition-colors cursor-pointer', selected.has(v.id) && 'bg-primary/5 border-l-2 border-l-primary')}
              onClick={() => navigate(`/inventory/${v.id}`)}>
              <div onClick={e => { e.stopPropagation(); onToggleSelect(v.id); }}>
                <Checkbox checked={selected.has(v.id)} className="border-border" onCheckedChange={() => onToggleSelect(v.id)} />
              </div>
              {/* Thumbnail */}
              <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {v.cover_image_url
                  ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
                  : <Car className="w-5 h-5 text-muted-foreground/50" />}
              </div>
              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{v.make} {v.model}</span>
                  {v.variant && <span className="text-xs text-muted-foreground">{v.variant}</span>}
                  {v.is_hot_deal && <Zap className="w-3 h-3 text-red-400" />}
                  {v.is_featured && <Star className="w-3 h-3 text-yellow-400" />}
                  <AgingBadge days={days} />
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span>{v.model_year}</span>
                  {v.engine_capacity && <span>{v.engine_capacity}</span>}
                  <span>{v.fuel_type}</span>
                  <span>{v.transmission}</span>
                  <span className="hidden md:inline">{formatMileage(v.mileage)}</span>
                  <span className="hidden md:inline">{v.color}</span>
                  {v.stock_number && <span className="font-mono hidden lg:inline">{v.stock_number}</span>}
                </div>
              </div>
              {/* Dealer badge (click to expand) */}
              {v.owner_type === 'dealer' && v.dealer && (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : v.id); }}
                  className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 border border-border rounded-lg px-2 py-1">
                  <Building2 className="w-3 h-3 text-primary" />
                  <span className="max-w-[80px] truncate">{(v.dealer as Dealer).name}</span>
                  {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              {/* Status + price */}
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 hidden sm:inline', getStatusColor(v.status))}>{v.status}</span>
              <span className="text-sm font-bold text-foreground shrink-0">{formatCurrency(v.expected_selling_price)}</span>
              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground shrink-0">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => navigate(`/inventory/${v.id}`)}><Eye className="w-3.5 h-3.5 mr-2" />View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/inventory/${v.id}/edit`)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(v.id)}><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Expanded dealer contact */}
            {isExp && v.dealer && (
              <div className="px-16 py-2.5 bg-muted/10">
                <DealerContactCard dealer={v.dealer as Dealer} />
              </div>
            )}
          </React.Fragment>
        );
      })}
      {vehicles.length === 0 && (
        <div className="py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No vehicles found</p>
        </div>
      )}
    </div>
  );
}
