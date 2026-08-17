import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calculator, Save, RefreshCw, History, Sparkles, X,
  Car, DollarSign, TrendingUp, BarChart3, Target, Zap,
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Printer, RotateCcw, ArrowUpRight, Info, Flame, Share2, Edit3,
  Plus, Pencil, Trash2, Package, Globe, Clipboard, FileText, ExternalLink, Bot,
  ClipboardCopy, ClipboardCheck,
} from 'lucide-react';

// ─── Ex-Factory Price type ────────────────────────────────────────────────────
interface ExFactoryPrice {
  id: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  ex_factory: number;
  on_road: number | null;
  on_road_filer: number | null;
  on_road_non_filer: number | null;
  on_road_breakdown: string | null; // free-text PakWheels-style breakdown
  currency: string;
  source: string | null;
  notes: string | null;
  features: string[] | null;
  fuel_type: string | null;
  engine_cc: number | null;
  transmission: string | null;
  body_type: string | null;
  color_options: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ─── Shared RFC-4180 CSV parser ───────────────────────────────────────────────
// Handles: quoted fields with embedded commas/newlines/quotes, BOM, \r\n, mixed line endings
function parseCSVText(raw: string): string[][] {
  // Strip BOM
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        // peek ahead for escaped quote ""
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cur += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { row.push(cur.trim()); cur = ''; i++; continue; }
    if (ch === '\n') {
      row.push(cur.trim()); rows.push(row);
      row = []; cur = ''; i++; continue;
    }
    cur += ch; i++;
  }
  row.push(cur.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

// Map a parsed row object → ExFactoryPrice fields
function mapCSVRow(obj: Record<string, string>): Partial<ExFactoryPrice> {
  // on_road column: detect if it's a breakdown string or a number
  const onRoadRaw = obj.on_road ?? '';
  const onRoadNum = onRoadRaw ? Number(onRoadRaw.replace(/[^0-9.]/g, '')) : 0;
  const onRoadIsBreakdown = onRoadRaw.includes('Filer') || onRoadRaw.includes('|') || onRoadRaw.includes(':');
  return {
    brand:             obj.brand        || obj['make']           || '',
    model:             obj.model        || '',
    variant:           obj.variant      || obj['trim']           || '',
    year:              parseInt(obj.year || '2026') || 2026,
    ex_factory:        Number((obj.ex_factory || obj['price'] || '0').replace(/[^0-9.]/g, '')) || 0,
    on_road:           (!onRoadIsBreakdown && onRoadNum) ? onRoadNum : null,
    on_road_filer:     obj.on_road_filer     ? Number(obj.on_road_filer.replace(/[^0-9.]/g, ''))     : null,
    on_road_non_filer: obj.on_road_non_filer ? Number(obj.on_road_non_filer.replace(/[^0-9.]/g, '')) : null,
    // prefer explicit breakdown col, fall back to on_road if it's a breakdown string
    on_road_breakdown: obj.on_road_breakdown || obj['breakdown'] || (onRoadIsBreakdown ? onRoadRaw : null) || null,
    fuel_type:         obj.fuel_type    || obj['fuel']           || null,
    engine_cc:         obj.engine_cc    ? parseInt(obj.engine_cc) : null,
    transmission:      obj.transmission || obj['trans']          || null,
    body_type:         obj.body_type    || obj['type']           || null,
    color_options:     obj.color_options || obj['colors'] || obj['colour_options'] || null,
    image_url:         obj.image_url    || obj['img_url'] || obj['image']          || null,
    features:          obj.features
      ? obj.features.split(/[;|]/).map((f: string) => f.trim()).filter(Boolean)
      : null,
    currency:          obj.currency     || 'PKR',
    source:            obj.source       || null,
    notes:             obj.notes        || null,
    is_active:         true,
  };
}
// Format: "Filer: 7509800 / Non-Filer: 7655600 | WHT Filer 72900 / Non-Filer 218700 |
//          PayOrder Filer 7417900 | Token 15000 + Reg 72900 + Plate 2500 + Smart 1500"
interface BreakdownRow { label: string; filer?: string; nonFiler?: string; value?: string }
function parseBreakdown(raw: string | null): BreakdownRow[] {
  if (!raw?.trim()) return [];
  const rows: BreakdownRow[] = [];
  const segments = raw.split('|').map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    // "Filer: 7509800 / Non-Filer: 7655600"
    const dualMatch = seg.match(/^(.+?):\s*([\d,]+)\s*\/\s*(.+?):\s*([\d,]+)$/i);
    if (dualMatch) {
      rows.push({
        label: dualMatch[1].trim(),
        filer: `PKR ${Number(dualMatch[2].replace(/,/g,'')).toLocaleString()}`,
        nonFiler: `PKR ${Number(dualMatch[4].replace(/,/g,'')).toLocaleString()}`,
      });
      continue;
    }
    // "WHT Filer 72900 / Non-Filer 218700"
    const whtMatch = seg.match(/^(.+?)\s+Filer\s+([\d,]+)\s*\/\s*Non.?Filer\s+([\d,]+)$/i);
    if (whtMatch) {
      rows.push({
        label: whtMatch[1].trim(),
        filer: `PKR ${Number(whtMatch[2].replace(/,/g,'')).toLocaleString()}`,
        nonFiler: `PKR ${Number(whtMatch[3].replace(/,/g,'')).toLocaleString()}`,
      });
      continue;
    }
    // "PayOrder Filer 7417900"
    const soloFilerMatch = seg.match(/^(.+?)\s+Filer\s+([\d,]+)$/i);
    if (soloFilerMatch) {
      rows.push({ label: soloFilerMatch[1].trim(), filer: `PKR ${Number(soloFilerMatch[2].replace(/,/g,'')).toLocaleString()}` });
      continue;
    }
    // "Token 15000 + Reg 72900 + Plate 2500 + Smart 1500 = Total …" or generic label: value
    const additive = seg.split('+').map(p => {
      const m = p.trim().match(/^(.+?)\s+([\d,]+)(?:\s*=.*)?$/);
      return m ? { label: m[1].trim(), value: `PKR ${Number(m[2].replace(/,/g,'')).toLocaleString()}` } : null;
    }).filter(Boolean) as BreakdownRow[];
    if (additive.length > 1) { rows.push(...additive); continue; }
    // "Label: value" or "Label value"
    const simpleColon = seg.match(/^(.+?):\s*([\d,]+)$/);
    if (simpleColon) {
      rows.push({ label: simpleColon[1].trim(), value: `PKR ${Number(simpleColon[2].replace(/,/g,'')).toLocaleString()}` });
      continue;
    }
    // fallback — store as plain label row
    rows.push({ label: seg });
  }
  return rows;
}

// ─── Color swatch helper ──────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  white: '#FFFFFF', pearl: '#F5F0E8', ivory: '#FFFFF0', cream: '#FFFDD0',
  silver: '#C0C0C0', platinum: '#E5E4E2', grey: '#808080', gray: '#808080',
  'dark grey': '#404040', 'dark gray': '#404040', charcoal: '#36454F',
  black: '#1C1C1C', 'midnight black': '#1C1C1C',
  red: '#CC0000', 'passion red': '#CC2200', maroon: '#800000', burgundy: '#800020',
  blue: '#1A4C8B', 'deep blue': '#00246B', 'navy blue': '#001F5B', navy: '#001F5B',
  'sky blue': '#87CEEB', 'aqua blue': '#00BFFF', cyan: '#00BCD4',
  green: '#2E7D32', 'olive green': '#6B7C3C', 'dark green': '#1B5E20',
  brown: '#795548', bronze: '#CD7F32', gold: '#FFD700', 'golden': '#DAA520',
  orange: '#F57C00', yellow: '#FDD835', beige: '#F5F5DC', sand: '#C2B280',
  purple: '#7B1FA2', violet: '#8B00FF', lavender: '#E6E6FA',
  pink: '#E91E63', rose: '#FF007F', magenta: '#FF00FF',
};
function parseColors(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,;|\/]/).map(s => s.trim()).filter(Boolean);
}
function getColorHex(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
function ColorSwatch({ color }: { color: string }) {
  const hex = getColorHex(color);
  const isLight = hex ? parseInt(hex.slice(1, 3), 16) > 200 : false;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-foreground bg-muted/40 border border-border/60 rounded-full pl-1 pr-2 py-0.5 leading-tight">
      <span
        className="w-3 h-3 rounded-full border border-black/15 shrink-0"
        style={{ background: hex ?? '#888', boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : undefined }}
      />
      {color}
    </span>
  );
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/components/layouts/AppLayout';
import {
  saveImportCost, fetchSavedImportCosts, fetchExchangeRate, updateExchangeRate,
  type ImportCost,
} from '@/lib/rpm-api';
import { fetchImportPresets, type ImportPreset } from '@/lib/api';
import { supabase } from '@/db/supabase';
import { streamLLMQueued } from '@/lib/ai-client';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ─── Pakistani Duty Slabs ────────────────────────────────────────────────────
const DUTY_SLABS = [
  { label: 'Up to 660cc',    ccMin: 0,    ccMax: 660,   cd: 50,  st: 17, rd: 5  },
  { label: '661 – 800cc',    ccMin: 661,  ccMax: 800,   cd: 55,  st: 17, rd: 5  },
  { label: '801 – 1000cc',   ccMin: 801,  ccMax: 1000,  cd: 60,  st: 17, rd: 10 },
  { label: '1001 – 1300cc',  ccMin: 1001, ccMax: 1300,  cd: 75,  st: 17, rd: 10 },
  { label: '1301 – 1500cc',  ccMin: 1301, ccMax: 1500,  cd: 100, st: 17, rd: 15 },
  { label: '1501 – 1800cc',  ccMin: 1501, ccMax: 1800,  cd: 125, st: 17, rd: 20 },
  { label: '1801 – 2000cc',  ccMin: 1801, ccMax: 2000,  cd: 150, st: 17, rd: 25 },
  { label: '2001 – 2500cc',  ccMin: 2001, ccMax: 2500,  cd: 175, st: 17, rd: 30 },
  { label: '2501 – 3000cc',  ccMin: 2501, ccMax: 3000,  cd: 200, st: 17, rd: 40 },
  { label: 'Above 3000cc',   ccMin: 3001, ccMax: 99999, cd: 225, st: 17, rd: 50 },
];
const EV_SLAB  = { cd: 1,  st: 17, rd: 0 };
const HEV_SLAB = { cd: 50, st: 17, rd: 0 };

interface FormState {
  vehicleName: string; manufacturer: string; modelYear: string;
  engineCC: string; fuelType: string; isHybrid: boolean; isElectric: boolean;
  driveType: string; auctionGrade: string; mileage: string; auctionHouse: string;
  auctionBidJpy: string; auctionFeeJpy: string; auctionServiceFeeJpy: string;
  freightJpy: string; marineInsuranceJpy: string; exportCertFeeJpy: string;
  deregistrationFeeJpy: string; radiationCertJpy: string; containerChargesJpy: string;
  exchangeRate: string;
  customDutyPct: string; salesTaxPct: string; addCustomDutyPct: string;
  incomeTaxPct: string; regulatoryDutyPct: string; exciseDutyPct: string;
  portHandlingPkr: string; clearingAgentPkr: string; documentationPkr: string;
  portStoragePkr: string; transportationPkr: string; inspectionPkr: string;
  scanningPkr: string; passportPkr: string; bankChargesPkr: string;
  ttChargesPkr: string; miscPkr: string;
  dealerMarginPkr: string; desiredProfitPct: string;
}

const BLANK: FormState = {
  vehicleName: '', manufacturer: '', modelYear: '', engineCC: '', fuelType: 'Petrol',
  isHybrid: false, isElectric: false, driveType: '2WD', auctionGrade: '', mileage: '', auctionHouse: '',
  auctionBidJpy: '', auctionFeeJpy: '35000', auctionServiceFeeJpy: '15000',
  freightJpy: '185000', marineInsuranceJpy: '12000', exportCertFeeJpy: '8000',
  deregistrationFeeJpy: '5000', radiationCertJpy: '3000', containerChargesJpy: '0',
  exchangeRate: '1.88',
  customDutyPct: '', salesTaxPct: '17', addCustomDutyPct: '1',
  incomeTaxPct: '2', regulatoryDutyPct: '', exciseDutyPct: '0',
  portHandlingPkr: '15000', clearingAgentPkr: '35000', documentationPkr: '5000',
  portStoragePkr: '8000', transportationPkr: '12000', inspectionPkr: '5000',
  scanningPkr: '3500', passportPkr: '2000', bankChargesPkr: '3000',
  ttChargesPkr: '4000', miscPkr: '10000',
  dealerMarginPkr: '150000', desiredProfitPct: '15',
};

function n(v: string | number) { return Number(v) || 0; }

function computeAll(f: FormState) {
  const rate = n(f.exchangeRate);
  const auctionBid = n(f.auctionBidJpy);
  const auctionFee = n(f.auctionFeeJpy);
  const svcFee     = n(f.auctionServiceFeeJpy);
  const freight    = n(f.freightJpy);
  const marIns     = n(f.marineInsuranceJpy);
  const exportCert = n(f.exportCertFeeJpy);
  const dereg      = n(f.deregistrationFeeJpy);
  const radCert    = n(f.radiationCertJpy);
  const container  = n(f.containerChargesJpy);
  const exportChargesJpy = exportCert + dereg + radCert;
  const cifJpy = auctionBid + auctionFee + svcFee + freight + marIns + exportChargesJpy + container;
  const cifPkr = cifJpy * rate;

  const cdPkr  = cifPkr * n(f.customDutyPct) / 100;
  const rdPkr  = cifPkr * n(f.regulatoryDutyPct) / 100;
  const acdPkr = (cifPkr + cdPkr + rdPkr) * n(f.addCustomDutyPct) / 100;
  const stBase = cifPkr + cdPkr + rdPkr + acdPkr;
  const stPkr  = stBase * n(f.salesTaxPct) / 100;
  const itPkr  = stBase * n(f.incomeTaxPct) / 100;
  const edPkr  = cifPkr * n(f.exciseDutyPct) / 100;
  const totalGovt = cdPkr + rdPkr + acdPkr + stPkr + itPkr + edPkr;

  const portHandling   = n(f.portHandlingPkr);
  const clearingAgent  = n(f.clearingAgentPkr);
  const documentation  = n(f.documentationPkr);
  const portStorage    = n(f.portStoragePkr);
  const transportation = n(f.transportationPkr);
  const inspection     = n(f.inspectionPkr);
  const scanning       = n(f.scanningPkr);
  const passport       = n(f.passportPkr);
  const bankCharges    = n(f.bankChargesPkr);
  const ttCharges      = n(f.ttChargesPkr);
  const misc           = n(f.miscPkr);
  const totalLocal = portHandling + clearingAgent + documentation + portStorage +
    transportation + inspection + scanning + passport + bankCharges + ttCharges + misc;

  const totalImport = cifPkr + totalGovt + totalLocal;
  const dealerMargin = n(f.dealerMarginPkr);
  const dealerCost = totalImport + dealerMargin;
  const desiredProfit = dealerCost * n(f.desiredProfitPct) / 100;
  const recommendedSellingPrice = dealerCost + desiredProfit;
  const grossProfit = recommendedSellingPrice - totalImport;
  const profitPct = totalImport > 0 ? (grossProfit / totalImport) * 100 : 0;
  const roi = totalImport > 0 ? (grossProfit / totalImport) * 100 : 0;

  const nonAuctionCosts = cifPkr - auctionBid * rate;
  const maxBreakevenBidPkr = totalImport - nonAuctionCosts - totalGovt - totalLocal;
  const maxBreakevenBidJpy = rate > 0 ? maxBreakevenBidPkr / rate : 0;
  const targetProfitBidPkr = maxBreakevenBidPkr - desiredProfit;
  const targetProfitBidJpy = rate > 0 ? targetProfitBidPkr / rate : 0;
  const maxSafeBidJpy      = targetProfitBidJpy * 0.95;
  const maxRecommendedBidJpy = targetProfitBidJpy * 1.02;
  const idealSellingPrice  = recommendedSellingPrice;
  const lowestAcceptableSellingPrice = dealerCost * 1.05;

  return {
    rate, cifJpy, cifPkr,
    cdPkr, rdPkr, acdPkr, stPkr, itPkr, edPkr, totalGovt,
    portHandling, clearingAgent, documentation, portStorage, transportation,
    inspection, scanning, passport, bankCharges, ttCharges, misc, totalLocal,
    totalImport, dealerMargin, dealerCost,
    desiredProfit, recommendedSellingPrice, grossProfit, profitPct, roi,
    maxBreakevenBidJpy: Math.max(0, maxBreakevenBidJpy),
    targetProfitBidJpy: Math.max(0, targetProfitBidJpy),
    maxSafeBidJpy: Math.max(0, maxSafeBidJpy),
    maxRecommendedBidJpy: Math.max(0, maxRecommendedBidJpy),
    idealSellingPrice, lowestAcceptableSellingPrice,
    auctionFee, svcFee, freight, marIns, exportChargesJpy, container, auctionBid,
  };
}

function calcScores(profitPct: number, roi: number) {
  const feasibility = Math.min(100, Math.max(0, 40 + roi * 1.5));
  const profitScore = Math.min(100, Math.max(0, 30 + profitPct * 2));
  return { feasibility: Math.round(feasibility), profitScore: Math.round(profitScore) };
}

// ─── Mini donut SVG chart ─────────────────────────────────────────────────────
function DonutChart({ segments }: {
  segments: { value: number; color: string; label: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  let cumulative = 0;
  const r = 40; const cx = 50; const cy = 50; const stroke = 14;
  const circumference = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const offset = circumference * (1 - cumulative / total);
        const dash = circumference * pct;
        cumulative += seg.value;
        return (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)', transition: 'stroke-dasharray 0.6s ease' }}
          />
        );
      })}
    </svg>
  );
}

// ─── Field input ───────────────────────────────────────────────────────────────
function Field({ label, tooltip, children }: {
  label: string; tooltip?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-2.5 h-2.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Label>
      {children}
    </div>
  );
}

// ─── Result row ────────────────────────────────────────────────────────────────
function Row({ label, jpy, pkr, bold, highlight, green, rateEditable, rateValue, onRateChange }: {
  label: string; jpy?: number; pkr: number; bold?: boolean; highlight?: boolean; green?: boolean;
  rateEditable?: boolean; rateValue?: string; onRateChange?: (v: string) => void;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg text-xs transition-colors',
      highlight && 'bg-primary/8 border border-primary/15',
      green && 'bg-green-500/8 border border-green-500/15',
    )}>
      <span className={cn('text-muted-foreground flex-1 min-w-0 truncate', bold && 'text-foreground font-semibold')}>{label}</span>
      {jpy !== undefined && (
        <span className="font-mono text-muted-foreground/60 shrink-0 hidden lg:inline text-[10px]">¥{jpy.toLocaleString()}</span>
      )}
      {rateEditable && onRateChange ? (
        <div className="flex items-center gap-1 shrink-0">
          <Edit3 className="w-3 h-3 text-muted-foreground" />
          <input
            type="number"
            value={rateValue ?? ''}
            onChange={e => onRateChange(e.target.value)}
            className="w-16 h-5 text-[11px] font-mono bg-background border border-primary/30 rounded px-1 text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            step="0.001"
          />
          <span className="text-[10px] text-muted-foreground">PKR/¥</span>
        </div>
      ) : (
        <span className={cn('font-mono shrink-0 font-medium', bold ? (green ? 'text-green-400 font-bold' : 'text-primary font-bold') : 'text-foreground')}>{formatCurrency(pkr)}</span>
      )}
    </div>
  );
}

// ─── Bid tier chip ─────────────────────────────────────────────────────────────
function BidTier({ label, jpy, color, icon: Icon, sub }: {
  label: string; jpy: number; color: string; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className={cn('rounded-xl p-3 border flex items-start gap-2.5', color)}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        <p className="font-mono font-bold text-sm text-foreground">¥{Math.round(jpy).toLocaleString()}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── AI Valuation Tab ─────────────────────────────────────────────────────────
function AIValuationTab({ form, calcResult }: {
  form: FormState;
  calcResult: ReturnType<typeof computeAll> | null;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const run = () => {
    if (loading) { abortRef.current?.abort(); setLoading(false); return; }
    setText(''); setLoading(true); setRan(true);
    abortRef.current = new AbortController();

    const r = calcResult;
    const prompt = `You are a senior Pakistani automotive import expert and valuation analyst.

Vehicle being assessed for import:
- Name: ${form.vehicleName || `${form.manufacturer} ${form.modelYear}`}
- Engine: ${form.engineCC}cc | Fuel: ${form.fuelType}${form.isHybrid ? ' (Hybrid)' : ''}${form.isElectric ? ' (Electric)' : ''}
- Mileage: ${form.mileage || 'unknown'} km | Auction Grade: ${form.auctionGrade || 'N/A'}
- Auction Bid: ¥${Number(form.auctionBidJpy).toLocaleString()} @ PKR ${form.exchangeRate}/JPY

${r ? `Calculated Import Costs:
- CIF Cost (PKR): ${r.cifPkr.toLocaleString()}
- Govt Duties & Taxes: PKR ${r.totalGovt.toLocaleString()}
- Local Port/Clearing Costs: PKR ${r.totalLocal.toLocaleString()}
- Total Import Cost: PKR ${r.totalImport.toLocaleString()}
- Dealer Cost (with margin): PKR ${r.dealerCost.toLocaleString()}
- Recommended Selling Price: PKR ${r.recommendedSellingPrice.toLocaleString()}
- Gross Profit: PKR ${r.grossProfit.toLocaleString()} (${r.profitPct.toFixed(1)}%)
- Max Safe Bid: ¥${r.maxSafeBidJpy.toFixed(0)}` : 'No cost calculation yet — fill in vehicle details first.'}

Please provide:
1. **Market Valuation Assessment** — is the calculated selling price competitive in the Pakistani market?
2. **Auction Bid Evaluation** — is the auction bid price good, fair, or too high for this vehicle?
3. **Profit Margin Opinion** — is the margin realistic and sustainable?
4. **Pakistan Market Demand** — how is demand for this vehicle type/year in Pakistan?
5. **Import Risk Factors** — any specific risks (duty changes, parts availability, resale challenges)?
6. **Final Verdict** — proceed, negotiate, or avoid?

Be specific, practical, and concise.`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are an expert Pakistani automotive import analyst with deep knowledge of JDM vehicle valuations, FBR duties, and Pakistan used car market pricing.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: c => setText(p => p + c),
      onComplete: () => setLoading(false),
      onError: e => { setLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry shortly' : 'AI analysis failed'); },
      signal: abortRef.current.signal,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">AI Import Valuation</p>
          <p className="text-xs text-muted-foreground mt-0.5">Get an AI-powered assessment of your import — market competitiveness, bid evaluation, profit margin analysis, and final verdict.</p>
        </div>
        <Badge className="bg-purple-400/15 text-purple-400 border-purple-400/25 text-[10px] shrink-0">Gemini 2.5 Flash</Badge>
      </div>

      {!ran ? (
        <div className="text-center py-6 space-y-3">
          {!calcResult && <p className="text-xs text-amber-400">💡 Fill in vehicle details and calculate first for a more accurate analysis</p>}
          <Button size="sm" className="gap-2" onClick={run}>
            <Sparkles className="w-3.5 h-3.5" /> Analyse This Import
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {loading && !text && (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-3 bg-muted/50 rounded animate-pulse" style={{ width: `${55 + i * 8}%` }} />)}
            </div>
          )}
          {text && (
            <div className="bg-muted/20 border border-border rounded-xl p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {text}
              {loading && <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
          {!loading && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 border-border" onClick={run}>
                <RefreshCw className="w-3 h-3" /> Re-analyse
              </Button>
              {text && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border" onClick={() => { navigator.clipboard.writeText(text); toast.success('Analysis copied'); }}>
                  <Save className="w-3 h-3" /> Copy
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportCalculatorPage() {
  const [form, setForm] = useState<FormState>(BLANK);
  const [calcResult, setCalcResult] = useState<ReturnType<typeof computeAll> | null>(null);
  const [savedRate, setSavedRate] = useState(1.88);
  const [rateUpdatedAt, setRateUpdatedAt] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [history, setHistory] = useState<ImportCost[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('vehicle');
  const [breakdownRate, setBreakdownRate] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  // Presets
  const [presets, setPresets] = useState<ImportPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  // Duty mode: 'pct' | 'fixed'
  const [dutyMode, setDutyMode] = useState<'pct' | 'fixed'>('pct');
  const [fixedDutyPkr, setFixedDutyPkr] = useState('');
  // Ex-Factory tab
  const [exFactoryPrices, setExFactoryPrices] = useState<ExFactoryPrice[]>([]);
  const [exFactoryLoading, setExFactoryLoading] = useState(false);
  const [exFactoryFilter, setExFactoryFilter] = useState('');
  const [exFactoryBrand, setExFactoryBrand] = useState('all');
  const [editingEF, setEditingEF] = useState<ExFactoryPrice | null>(null);
  const [efForm, setEfForm] = useState<Partial<ExFactoryPrice>>({});
  const [selectedEF, setSelectedEF] = useState<ExFactoryPrice | null>(null);
  const [copiedEFId, setCopiedEFId] = useState<string | null>(null);
  const [savingEF, setSavingEF] = useState(false);
  const [pageTab, setPageTab] = useState<'calculator' | 'exfactory'>('calculator');
  const efImportRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showCsvPaste, setShowCsvPaste] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');

  // Load presets once
  useEffect(() => { fetchImportPresets().then(setPresets).catch(() => {}); }, []);

  const applyPreset = (p: ImportPreset) => {
    setForm(prev => ({
      ...prev,
      manufacturer: p.make ?? prev.manufacturer,
      vehicleName:  p.model ?? prev.vehicleName,
      engineCC:     p.engine_cc?.toString() ?? prev.engineCC,
      fuelType:     p.fuel_type ?? prev.fuelType,
      isHybrid:     p.is_hybrid ?? prev.isHybrid,
      isElectric:   p.is_ev ?? prev.isElectric,
      customDutyPct:    p.cd_pct.toString(),
      regulatoryDutyPct: p.rd_pct.toString(),
      salesTaxPct:      p.st_pct.toString(),
      addCustomDutyPct: p.acd_pct.toString(),
      incomeTaxPct:     p.it_pct.toString(),
      exciseDutyPct:    p.ed_pct.toString(),
    }));
    setShowPresets(false);
    toast.success(`Preset applied: ${p.name}`);
  };

  // When calc result changes, sync breakdown rate display
  useEffect(() => {
    if (calcResult) setBreakdownRate(calcResult.rate.toString());
  }, [calcResult]);

  // Load ex-factory prices when tab active
  useEffect(() => {
    if (pageTab === 'exfactory' && exFactoryPrices.length === 0) loadExFactory();
  }, [pageTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExFactory = async () => {
    setExFactoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('rpm_ex_factory_prices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('brand', { ascending: true });
      if (error) throw error;
      setExFactoryPrices((data ?? []) as ExFactoryPrice[]);
    } catch { toast.error('Failed to load ex-factory prices'); }
    finally { setExFactoryLoading(false); }
  };

  const handleSaveEF = async () => {
    if (!efForm.brand?.trim() || !efForm.model?.trim() || !efForm.variant?.trim() || !efForm.ex_factory) {
      toast.error('Brand, Model, Variant and Ex-Factory price are required');
      return;
    }
    setSavingEF(true);
    try {
      if (editingEF?.id) {
        const { error } = await supabase
          .from('rpm_ex_factory_prices')
          .update({ ...efForm, updated_at: new Date().toISOString() })
          .eq('id', editingEF.id);
        if (error) throw error;
        setExFactoryPrices(prev => prev.map(p => p.id === editingEF.id ? { ...p, ...efForm } as ExFactoryPrice : p));
        toast.success('Price updated');
      } else {
        const { data, error } = await supabase
          .from('rpm_ex_factory_prices')
          .insert({ ...efForm, currency: 'PKR', is_active: true, sort_order: exFactoryPrices.length })
          .select()
          .single();
        if (error) throw error;
        setExFactoryPrices(prev => [...prev, data as ExFactoryPrice]);
        toast.success('Price added');
      }
      setEditingEF(null);
      setEfForm({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('EF save error:', msg);
      toast.error(`Failed to save price: ${msg.slice(0, 80)}`);
    } finally { setSavingEF(false); }
  };

  const handleDeleteEF = async (id: string) => {
    try {
      await supabase.from('rpm_ex_factory_prices').update({ is_active: false }).eq('id', id);
      setExFactoryPrices(prev => prev.filter(p => p.id !== id));
      toast.success('Entry removed');
    } catch { toast.error('Failed to remove'); }
  };

  // ── Copy single EF entry as CSV row to clipboard ─────────────────────────
  const copyEFAsCSV = useCallback((p: ExFactoryPrice) => {
    const headers = ['brand','model','variant','year','ex_factory','on_road','on_road_filer','on_road_non_filer','on_road_breakdown','fuel_type','engine_cc','transmission','body_type','color_options','image_url','features','notes','source'];
    const row = [
      p.brand, p.model, p.variant,
      p.year ?? '',
      p.ex_factory,
      p.on_road ?? '',
      p.on_road_filer ?? '',
      p.on_road_non_filer ?? '',
      p.on_road_breakdown ?? '',
      p.fuel_type ?? '',
      p.engine_cc ?? '',
      p.transmission ?? '',
      p.body_type ?? '',
      p.color_options ?? '',
      p.image_url ?? '',
      Array.isArray(p.features) ? p.features.join(' | ') : (p.features ?? ''),
      p.notes ?? '',
      p.source ?? '',
    ];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), row.map(escape).join(',')].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
      setCopiedEFId(p.id);
      toast.success(`Copied CSV for ${p.brand} ${p.variant}`);
      setTimeout(() => setCopiedEFId(prev => prev === p.id ? null : prev), 2200);
    }).catch(() => toast.error('Clipboard access denied'));
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      let rows: Partial<ExFactoryPrice>[] = [];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const grid = parseCSVText(text);
        if (grid.length < 2) { toast.error('CSV is empty or missing headers'); return; }
        const headers = grid[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
        rows = grid.slice(1)
          .filter(r => r.some(c => c))
          .map(r => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
            return mapCSVRow(obj);
          });
      } else {
        toast.error('Only .json or .csv files supported');
        return;
      }

      const valid = rows.filter(r => r.brand && r.model && r.variant && r.ex_factory && r.ex_factory > 0);
      if (!valid.length) { toast.error('No valid rows found — check brand/model/variant/ex_factory columns'); return; }

      const payload = valid.map((r, i) => ({
        brand:             r.brand,
        model:             r.model,
        variant:           r.variant,
        year:              r.year ?? 2026,
        ex_factory:        r.ex_factory!,
        on_road:           r.on_road ?? null,
        on_road_filer:     (r as Partial<ExFactoryPrice>).on_road_filer ?? null,
        on_road_non_filer: (r as Partial<ExFactoryPrice>).on_road_non_filer ?? null,
        on_road_breakdown: (r as Partial<ExFactoryPrice>).on_road_breakdown ?? null,
        fuel_type:         (r as Partial<ExFactoryPrice>).fuel_type ?? null,
        engine_cc:         (r as Partial<ExFactoryPrice>).engine_cc ?? null,
        transmission:      (r as Partial<ExFactoryPrice>).transmission ?? null,
        body_type:         (r as Partial<ExFactoryPrice>).body_type ?? null,
        currency:          r.currency ?? 'PKR',
        source:            r.source ?? null,
        notes:             r.notes ?? null,
        color_options:     (r as Partial<ExFactoryPrice>).color_options ?? null,
        image_url:         (r as Partial<ExFactoryPrice>).image_url ?? null,
        features:          (r as Partial<ExFactoryPrice>).features ?? null,
        is_active:         true,
        sort_order:        exFactoryPrices.length + i,
      }));

      const { data, error } = await supabase
        .from('rpm_ex_factory_prices')
        .insert(payload)
        .select();
      if (error) throw error;
      setExFactoryPrices(prev => [...prev, ...(data as ExFactoryPrice[])]);
      toast.success(`Imported ${valid.length} price entries`);
      if (rows.length !== valid.length) {
        toast.warning(`${rows.length - valid.length} rows skipped (missing required fields)`);
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed — check file format');
    } finally {
      setImporting(false);
      if (efImportRef.current) efImportRef.current.value = '';
    }
  }, [exFactoryPrices.length]);

  const handleCsvPaste = useCallback(async () => {
    if (!csvPasteText.trim()) { toast.error('Paste some CSV text first'); return; }
    setImporting(true);
    try {
      const grid = parseCSVText(csvPasteText);
      if (!grid.length) { toast.error('No rows found'); return; }

      // auto-detect header vs data
      const firstLower = grid[0].map(c => c.toLowerCase()).join(',');
      const hasHeader = firstLower.includes('brand') || firstLower.includes('model') || firstLower.includes('variant') || firstLower.includes('ex_factory');
      const headers = hasHeader
        ? grid[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
        : ['brand','model','variant','year','ex_factory','on_road','on_road_filer','on_road_non_filer','on_road_breakdown','fuel_type','engine_cc','transmission','body_type','color_options','image_url','features','notes','source'];
      const dataRows = (hasHeader ? grid.slice(1) : grid).filter(r => r.some(c => c));

      const rows = dataRows.map(r => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        return mapCSVRow(obj);
      });

      const valid = rows.filter(r => r.brand && r.model && r.variant && (r.ex_factory ?? 0) > 0);
      if (!valid.length) {
        toast.error('No valid rows — need brand, model, variant, ex_factory columns');
        return;
      }
      const payload = valid.map((r, i) => ({ ...r, sort_order: exFactoryPrices.length + i }));
      const { data, error } = await supabase.from('rpm_ex_factory_prices').insert(payload).select();
      if (error) throw error;
      setExFactoryPrices(prev => [...prev, ...(data as ExFactoryPrice[])]);
      toast.success(`Imported ${valid.length} price entr${valid.length === 1 ? 'y' : 'ies'}`);
      if (rows.length !== valid.length)
        toast.warning(`${rows.length - valid.length} rows skipped (missing required fields)`);
      setCsvPasteText(''); setShowCsvPaste(false);
    } catch (err) {
      console.error('CSV paste error:', err);
      toast.error('Import failed — check CSV format');
    } finally { setImporting(false); }
  }, [csvPasteText, exFactoryPrices.length]);

  const efBrands = ['all', ...Array.from(new Set(exFactoryPrices.map(p => p.brand))).sort()];
  const filteredEF = exFactoryPrices.filter(p => {
    const q = exFactoryFilter.toLowerCase();
    const matchBrand = exFactoryBrand === 'all' || p.brand === exFactoryBrand;
    const matchSearch = !q || `${p.brand} ${p.model} ${p.variant}`.toLowerCase().includes(q);
    return matchBrand && matchSearch;
  });
  // Re-compute when breakdown rate is edited inline
  const handleBreakdownRateChange = useCallback((val: string) => {
    setBreakdownRate(val);
    const r = Number(val);
    if (r > 0) {
      setForm(p => ({ ...p, exchangeRate: val }));
      setSavedRate(r);
      // Immediately recompute with updated rate
      setCalcResult(prev => {
        if (!prev) return prev;
        return computeAll({ ...form, exchangeRate: val });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = useCallback(<K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [key]: e.target.value })), []);
  const noWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  useEffect(() => {
    fetchExchangeRate().then(r => {
      setSavedRate(r);
      setForm(p => ({ ...p, exchangeRate: r.toString() }));
    });
  }, []);

  useEffect(() => {
    const cc = n(form.engineCC);
    if (!cc) return;
    const slab = DUTY_SLABS.find(s => cc >= s.ccMin && cc <= s.ccMax);
    if (!slab) return;
    if (form.isElectric) {
      setForm(p => ({ ...p, customDutyPct: EV_SLAB.cd.toString(), salesTaxPct: EV_SLAB.st.toString(), regulatoryDutyPct: EV_SLAB.rd.toString() }));
    } else if (form.isHybrid) {
      setForm(p => ({ ...p, customDutyPct: HEV_SLAB.cd.toString(), salesTaxPct: HEV_SLAB.st.toString(), regulatoryDutyPct: HEV_SLAB.rd.toString() }));
    } else {
      setForm(p => ({ ...p, customDutyPct: slab.cd.toString(), salesTaxPct: slab.st.toString(), regulatoryDutyPct: slab.rd.toString() }));
    }
  }, [form.engineCC, form.isHybrid, form.isElectric]);

  const handleCalculate = useCallback(() => {
    if (!n(form.auctionBidJpy)) { toast.error('Enter Auction Bid (¥) to calculate'); return; }
    if (!n(form.exchangeRate))  { toast.error('Enter Exchange Rate'); return; }
    setCalcResult(computeAll(form));
    toast.success('Calculation complete');
  }, [form]);

  const fetchLiveRate = async () => {
    setFetchingRate(true);
    try {
      const { data, error } = await supabase.functions.invoke('exchange-rate', { body: { base_currency: 'JPY' } });
      if (error) throw error;
      if (data?.result === 'error') throw new Error(data['error-type']);
      const pkrRate: number = data?.conversion_rates?.PKR;
      if (!pkrRate) throw new Error('PKR rate not found');
      const rounded = Math.round(pkrRate * 1000) / 1000;
      setSavedRate(rounded);
      setForm(p => ({ ...p, exchangeRate: rounded.toString() }));
      setRateUpdatedAt(new Date().toLocaleTimeString());
      await updateExchangeRate(rounded);
      toast.success(`Live rate: ¥1 = PKR ${rounded}`);
    } catch { toast.error('Live rate fetch failed — using stored rate'); }
    finally { setFetchingRate(false); }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try { setHistory(await fetchSavedImportCosts()); } finally { setLoadingHistory(false); }
  };

  const handleSave = async () => {
    if (!calcResult) { toast.error('Run Calculate first'); return; }
    const calc = calcResult;
    try {
      const rate = n(form.exchangeRate) || calc.rate;
      // NOTE: fob_pkr and total_landing_pkr are GENERATED columns — never insert them
      await saveImportCost({
        make: form.manufacturer || undefined,
        model: form.vehicleName || undefined,
        model_year: form.modelYear ? n(form.modelYear) : undefined,
        auction_grade: form.auctionGrade || undefined,
        fob_jpy: calc.auctionBid || 0,
        exchange_rate: rate,
        freight_pkr: Math.round(calc.freight * rate),
        insurance_pkr: Math.round(calc.marIns * rate),
        customs_duty_pkr: Math.round(calc.cdPkr),
        sales_tax_pkr: Math.round(calc.stPkr),
        withholding_tax_pkr: Math.round(calc.itPkr),
        clearing_charges_pkr: Math.round(calc.clearingAgent),
        expected_selling_pkr: Math.round(calc.recommendedSellingPrice),
        estimated_profit_pkr: Math.round(calc.grossProfit),
        saved: true,
      });
      toast.success('Calculation saved to history');
      loadHistory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Save error:', msg);
      toast.error(`Failed to save: ${msg.slice(0, 80)}`);
    }
  };

  const handleShare = useCallback(async () => {
    if (!calcResult) { toast.error('Run Calculate first'); return; }
    const rate = n(form.exchangeRate) || calcResult.rate;
    const vehicle = [form.manufacturer, form.vehicleName, form.modelYear, form.auctionGrade && `Grade ${form.auctionGrade}`].filter(Boolean).join(' ') || 'Vehicle';
    const { feasibility, profitScore } = calcScores(calcResult.profitPct, calcResult.roi);
    const text = `🚗 *Wulfrayn\'s DB — Import Cost Report*
━━━━━━━━━━━━━━━━━━━━
*Vehicle:* ${vehicle}
*Engine:* ${form.engineCC ? form.engineCC + 'cc' : 'N/A'} | ${form.fuelType}${form.isHybrid ? ' Hybrid' : ''}${form.isElectric ? ' Electric' : ''}
*Mileage:* ${form.mileage ? form.mileage + ' km' : 'N/A'}

*Exchange Rate:* ¥1 = PKR ${rate}

💴 *Japan Costs*
• Auction Bid: ¥${calcResult.auctionBid.toLocaleString()} = PKR ${formatCurrency(calcResult.auctionBid * rate)}
• CIF Total: ¥${calcResult.cifJpy.toLocaleString()} = PKR ${formatCurrency(calcResult.cifPkr)}

🏛️ *Pakistan Duties & Taxes*
• Custom Duty (${form.customDutyPct}%): ${formatCurrency(calcResult.cdPkr)}
• Regulatory Duty (${form.regulatoryDutyPct}%): ${formatCurrency(calcResult.rdPkr)}
• Sales Tax (${form.salesTaxPct}%): ${formatCurrency(calcResult.stPkr)}
• Income Tax (${form.incomeTaxPct}%): ${formatCurrency(calcResult.itPkr)}
• Total Govt Duties: ${formatCurrency(calcResult.totalGovt)}

🏗️ *Local Charges:* ${formatCurrency(calcResult.totalLocal)}

✅ *TOTAL LANDED COST: ${formatCurrency(calcResult.totalImport)}*

💰 *Profit Analysis*
• Dealer Cost: ${formatCurrency(calcResult.dealerCost)}
• Recommended Selling Price: ${formatCurrency(calcResult.recommendedSellingPrice)}
• Gross Profit: ${calcResult.grossProfit >= 0 ? '+' : ''}${formatCurrency(calcResult.grossProfit)}
• ROI: ${calcResult.roi.toFixed(1)}%

🎯 *Bid Strategy*
• Max Safe Bid: ¥${Math.round(calcResult.maxSafeBidJpy).toLocaleString()}
• Target Profit Bid: ¥${Math.round(calcResult.targetProfitBidJpy).toLocaleString()}
• Break-even Limit: ¥${Math.round(calcResult.maxBreakevenBidJpy).toLocaleString()}

📊 *Scores:* Feasibility ${feasibility}/100 | Profitability ${profitScore}/100

_Generated by Wulfrayn\'s DB Import Calculator_`;

    try {
      if (navigator.share) {
        await navigator.share({ title: `Import Cost — ${vehicle}`, text });
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Report copied to clipboard');
      }
    } catch {
      // user cancelled share — no error toast
    }
  }, [calcResult, form]);

  const generateReport = () => {
    if (!calcResult) { toast.error('Run Calculate first'); return; }
    const calc = calcResult;
    setAiText(''); setAiLoading(true); setShowReport(true);
    abortRef.current = new AbortController();
    const vehicle = [form.manufacturer, form.vehicleName, form.modelYear, form.auctionGrade && `Grade ${form.auctionGrade}`].filter(Boolean).join(' ') || 'Unknown Vehicle';
    const { feasibility, profitScore } = calcScores(calc.profitPct, calc.roi);

    const prompt = `Generate a comprehensive import feasibility report for Wulfrayn\'s DB.

VEHICLE: ${vehicle}
Engine: ${form.engineCC}cc | Hybrid: ${form.isHybrid} | Electric: ${form.isElectric} | Grade: ${form.auctionGrade || 'N/A'} | Mileage: ${form.mileage || 'N/A'}km

EXCHANGE RATE: ¥1 = PKR ${n(form.exchangeRate)}

JAPAN COSTS:
- Auction Bid: ¥${calc.auctionBid.toLocaleString()} = ${formatCurrency(calc.auctionBid * n(form.exchangeRate))}
- CIF Total: ¥${calc.cifJpy.toLocaleString()} = ${formatCurrency(calc.cifPkr)}

PAKISTAN DUTIES: Total ${formatCurrency(calc.totalGovt)} (CD: ${form.customDutyPct}%, RD: ${form.regulatoryDutyPct}%, ST: ${form.salesTaxPct}%)
LOCAL CHARGES: ${formatCurrency(calc.totalLocal)}
GRAND TOTAL LANDED COST: ${formatCurrency(calc.totalImport)}

PROFIT ANALYSIS:
- Recommended Selling Price: ${formatCurrency(calc.recommendedSellingPrice)}
- Gross Profit: ${formatCurrency(calc.grossProfit)} | Profit: ${calc.profitPct.toFixed(1)}% | ROI: ${calc.roi.toFixed(1)}%

BID STRATEGY:
- Max Safe Bid: ¥${Math.round(calc.maxSafeBidJpy).toLocaleString()}
- Target Profit Bid: ¥${Math.round(calc.targetProfitBidJpy).toLocaleString()}
- Max Recommended: ¥${Math.round(calc.maxRecommendedBidJpy).toLocaleString()}
- Break-even: ¥${Math.round(calc.maxBreakevenBidJpy).toLocaleString()}

PRE-COMPUTED SCORES: Feasibility ${feasibility}/100 | Profitability ${profitScore}/100

Please provide:
1. ✅ VEHICLE ASSESSMENT: Brief assessment for Pakistani market
2. 📊 IMPORT FEASIBILITY (${feasibility}/100): Explain the score
3. 🎯 MARKET DEMAND: High/Medium/Low with reasoning
4. ⏱️ ESTIMATED SELLING TIME: Based on vehicle type
5. ⚠️ RISK LEVEL: Low/Medium/High with specific risks
6. 💰 PROFITABILITY SCORE (${profitScore}/100): Explain
7. 🏷️ PRICE COMPETITIVENESS: vs Pakistan market
8. 🎪 BID RECOMMENDATION: Exactly what bid to place and why
9. 💡 FINAL RECOMMENDATION: Clear action (Import / Do Not Import / Negotiate)
10. 📝 ADDITIONAL NOTES: Key considerations

Format professionally. Use PKR for Pakistan prices, ¥ for Japan prices.`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are Wulfrayn\'s DB Import Cost AI. Provide accurate, data-driven import feasibility analysis for Pakistani automotive dealerships.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: c => setAiText(p => p + c),
      onComplete: () => setAiLoading(false),
      onError: (e) => { setAiLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry in a moment' : 'AI report failed'); },
      signal: abortRef.current.signal,
    });
  };

  const { feasibility, profitScore } = calcResult
    ? calcScores(calcResult.profitPct, calcResult.roi)
    : { feasibility: 0, profitScore: 0 };

  const vehicleLabel = [form.manufacturer, form.vehicleName, form.modelYear].filter(Boolean).join(' ') || 'Your Vehicle';

  // Cost breakdown for donut
  const donutSegments = calcResult ? [
    { value: calcResult.cifPkr,    color: 'hsl(var(--primary))',    label: 'Japan CIF' },
    { value: calcResult.totalGovt, color: '#ef4444',                label: 'Duties & Tax' },
    { value: calcResult.totalLocal,color: '#f59e0b',                label: 'Local Charges' },
    { value: calcResult.dealerMargin, color: '#8b5cf6',             label: 'Dealer Margin' },
    { value: calcResult.desiredProfit, color: '#22c55e',            label: 'Profit' },
  ] : [];

  const TABS = [
    { id: 'vehicle',   label: 'Vehicle',  icon: Car },
    { id: 'japan',     label: 'Japan',    icon: DollarSign },
    { id: 'duties',    label: 'Duties',   icon: BarChart3 },
    { id: 'local',     label: 'Local',    icon: Target },
    { id: 'profit',    label: 'Profit',   icon: TrendingUp },
    { id: 'ai',        label: 'AI',       icon: Sparkles },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4 min-h-screen">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              Import Cost Calculator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 ml-10.5">
              Full landed cost · JPY→PKR · FBR duty slabs · Bid strategy · AI feasibility
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
              onClick={() => { setShowHistory(true); loadHistory(); }}>
              <History className="w-3.5 h-3.5" />History
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={!calcResult}>
              <Save className="w-3.5 h-3.5" />Save
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleShare} disabled={!calcResult}>
              <Share2 className="w-3.5 h-3.5" />Share
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />Print
            </Button>
            <Button size="sm" className="h-8 text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4"
              onClick={handleCalculate}>
              <Zap className="w-3.5 h-3.5" />Calculate
            </Button>
          </div>
        </div>

        {/* ── Page-level tab switcher ── */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
          <button
            onClick={() => setPageTab('calculator')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              pageTab === 'calculator'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Calculator className="w-3.5 h-3.5" />Import Calculator
          </button>
          <button
            onClick={() => setPageTab('exfactory')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              pageTab === 'exfactory'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Package className="w-3.5 h-3.5" />Ex-Factory Prices
          </button>
        </div>

        {/* ── Rate banner ── */}
        {pageTab === 'calculator' && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Live Rate:</span>
            <span className="text-sm font-bold text-foreground font-mono">¥1 = PKR {savedRate}</span>
            {rateUpdatedAt && <Badge variant="outline" className="text-[10px] h-4">Updated {rateUpdatedAt}</Badge>}
            {(form.isHybrid || form.isElectric) && (
              <Badge className="text-[10px] h-4 bg-green-500/15 text-green-400 border-green-500/20">
                {form.isElectric ? '⚡ EV — 1% CD' : '🌿 Hybrid — 50% CD'}
              </Badge>
            )}
            {form.engineCC && (
              <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30">
                {DUTY_SLABS.find(s => n(form.engineCC) >= s.ccMin && n(form.engineCC) <= s.ccMax)?.label ?? ''} slab
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 shrink-0" onClick={fetchLiveRate} disabled={fetchingRate}>
            <RefreshCw className={cn('w-3 h-3', fetchingRate && 'animate-spin')} />
            {fetchingRate ? 'Fetching...' : 'Refresh Rate'}
          </Button>
        </div>
        )}

        {/* ── Main grid ── */}
        {pageTab === 'calculator' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">

          {/* LEFT: Tabbed input wizard */}
          <div className="xl:col-span-2 space-y-3">
            <Card className="bg-card border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="px-4 pt-3 pb-0">
                  <TabsList className="w-full bg-muted/50 h-9 grid grid-cols-6 gap-0.5">
                    {TABS.map(t => (
                      <TabsTrigger key={t.id} value={t.id} className="text-[10px] gap-1 px-1">
                        <t.icon className="w-3 h-3" /><span className="hidden sm:inline">{t.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Vehicle tab */}
                <TabsContent value="vehicle" className="px-4 pb-4 pt-3 space-y-3">
                  {/* Preset selector */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">Vehicle Details</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowPresets(v => !v)}>
                      <Package className="w-3 h-3" />{showPresets ? 'Hide' : 'Presets'}
                    </Button>
                  </div>
                  {showPresets && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground px-1 pb-1">Tap a preset to auto-fill duties &amp; vehicle info</p>
                      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                        {presets.map(p => (
                          <button key={p.id} onClick={() => applyPreset(p)}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/10 text-left transition-colors">
                            <span className="text-xs text-foreground font-medium truncate">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">CD {p.cd_pct}% · RD {p.rd_pct}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'manufacturer', label: 'Manufacturer', placeholder: 'Toyota', tooltip: 'Vehicle brand / make' },
                      { key: 'vehicleName',  label: 'Model',        placeholder: 'Prado TX', tooltip: 'Model name / variant' },
                      { key: 'modelYear',    label: 'Year',         placeholder: '2022' },
                      { key: 'engineCC',     label: 'Engine CC',    placeholder: '2700', tooltip: 'Used to auto-apply FBR duty slab' },
                      { key: 'auctionGrade', label: 'Grade',        placeholder: '4.5', tooltip: 'Japan auction grade' },
                      { key: 'mileage',      label: 'Mileage (km)', placeholder: '45000' },
                      { key: 'auctionHouse', label: 'Auction House', placeholder: 'USS Tokyo' },
                    ] as { key: keyof FormState; label: string; placeholder: string; tooltip?: string }[]).map(({ key, label, placeholder, tooltip }) => (
                      <Field key={key} label={label} tooltip={tooltip}>
                        <Input value={form[key] as string} onChange={set(key)} placeholder={placeholder}
                          className="h-8 text-xs bg-muted/40 px-2" />
                      </Field>
                    ))}
                    <Field label="Fuel Type">
                      <Select value={form.fuelType} onValueChange={v => setForm(p => ({ ...p, fuelType: v }))}>
                        <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Hybrid-Diesel'].map(t =>
                            <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Drive Type">
                      <Select value={form.driveType} onValueChange={v => setForm(p => ({ ...p, driveType: v }))}>
                        <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['2WD', '4WD', 'AWD'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={form.isHybrid}
                        onCheckedChange={v => setForm(p => ({ ...p, isHybrid: v, isElectric: v ? false : p.isElectric }))} />
                      <span className="text-xs">Hybrid <span className="text-green-400">(50% CD)</span></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={form.isElectric}
                        onCheckedChange={v => setForm(p => ({ ...p, isElectric: v, isHybrid: v ? false : p.isHybrid }))} />
                      <span className="text-xs">Electric <span className="text-blue-400">(1% CD)</span></span>
                    </label>
                  </div>
                </TabsContent>

                {/* Japan tab */}
                <TabsContent value="japan" className="px-4 pb-4 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Japan Costs (JPY ¥)</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Rate: ¥1 = PKR {savedRate}</span>
                    </div>
                  </div>

                  {/* Auction bid — hero input */}
                  <div className="rounded-xl bg-primary/8 border border-primary/20 p-3">
                    <Field label="⭐ Auction Bid Price (¥)" tooltip="The winning bid amount at Japan auction">
                      <Input type="number" onWheel={noWheel} value={form.auctionBidJpy}
                        onChange={set('auctionBidJpy')} placeholder="1250000"
                        className="h-9 text-sm bg-background font-mono px-3 border-primary/30 font-semibold" />
                    </Field>
                    {n(form.auctionBidJpy) > 0 && (
                      <p className="text-xs text-primary mt-1.5 font-semibold">
                        ≈ {formatCurrency(n(form.auctionBidJpy) * n(form.exchangeRate))} PKR
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'auctionFeeJpy',        label: 'Auction Fee ¥',     placeholder: '35000' },
                      { key: 'auctionServiceFeeJpy',  label: 'Service Fee ¥',     placeholder: '15000' },
                      { key: 'freightJpy',            label: 'Ocean Freight ¥',   placeholder: '185000', tooltip: 'RoRo or container sea freight to Karachi' },
                      { key: 'marineInsuranceJpy',    label: 'Marine Ins. ¥',     placeholder: '12000' },
                      { key: 'exportCertFeeJpy',      label: 'Export Cert ¥',     placeholder: '8000' },
                      { key: 'deregistrationFeeJpy',  label: 'Deregistration ¥',  placeholder: '5000' },
                      { key: 'radiationCertJpy',      label: 'Radiation Cert ¥',  placeholder: '3000', tooltip: 'Mandatory radiation-free certificate' },
                      { key: 'containerChargesJpy',   label: 'Container ¥',       placeholder: '0' },
                    ] as { key: keyof FormState; label: string; placeholder: string; tooltip?: string }[]).map(({ key, label, placeholder, tooltip }) => (
                      <Field key={key} label={label} tooltip={tooltip}>
                        <Input type="number" onWheel={noWheel} value={form[key] as string}
                          onChange={set(key)} placeholder={placeholder}
                          className="h-8 text-xs bg-muted/40 font-mono px-2" />
                      </Field>
                    ))}
                  </div>

                  {/* Exchange rate sub-section */}
                  <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Exchange Rate</p>
                    <Field label={`JPY → PKR (stored: ${savedRate})`}>
                      <Input type="number" onWheel={noWheel} value={form.exchangeRate}
                        onChange={set('exchangeRate')} placeholder="1.88"
                        className="h-8 text-xs bg-background font-mono px-2" />
                    </Field>
                    <p className="text-[10px] text-amber-400/80">⚠ Rates are estimates — verify with your bank for exact TT rate.</p>
                  </div>
                </TabsContent>

                {/* Duties tab */}
                <TabsContent value="duties" className="px-4 pb-4 pt-3 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-foreground">Pakistan Duties &amp; Taxes</p>
                    <div className="flex items-center gap-2">
                      {form.engineCC && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 shrink-0">
                          Auto: {DUTY_SLABS.find(s => n(form.engineCC) >= s.ccMin && n(form.engineCC) <= s.ccMax)?.label}
                        </Badge>
                      )}
                      {/* Duty mode toggle */}
                      <div className="flex items-center rounded-lg border border-border overflow-hidden text-[10px]">
                        <button onClick={() => setDutyMode('pct')}
                          className={cn('px-2 py-1 transition-colors', dutyMode === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          %
                        </button>
                        <button onClick={() => setDutyMode('fixed')}
                          className={cn('px-2 py-1 transition-colors', dutyMode === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          PKR Fixed
                        </button>
                      </div>
                    </div>
                  </div>
                  {dutyMode === 'fixed' ? (
                    <div className="space-y-2">
                      <Field label="Total Customs Duty (PKR Fixed)" tooltip="Enter exact duty amount from your clearing agent">
                        <Input type="number" onWheel={noWheel} value={fixedDutyPkr}
                          onChange={e => setFixedDutyPkr(e.target.value)} placeholder="e.g. 850000"
                          className="h-8 text-xs bg-muted/40 font-mono px-2" />
                      </Field>
                      <p className="text-[10px] text-muted-foreground">Fixed mode: enter total duty as a lump sum. Percentage breakdown is ignored in calculation.</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'customDutyPct',    label: 'Custom Duty %',       tooltip: 'Based on engine CC slab — auto-filled' },
                      { key: 'regulatoryDutyPct', label: 'Regulatory Duty %',  tooltip: 'Based on engine CC slab — auto-filled' },
                      { key: 'salesTaxPct',       label: 'Sales Tax %',        tooltip: 'Standard 17% GST' },
                      { key: 'addCustomDutyPct',  label: 'Add. Customs Duty %', tooltip: 'Additional Customs Duty — typically 1–7%' },
                      { key: 'incomeTaxPct',      label: 'Income Tax %',        tooltip: 'Advance income tax on import' },
                      { key: 'exciseDutyPct',     label: 'Excise Duty %',       tooltip: 'Federal excise duty if applicable' },
                    ] as { key: keyof FormState; label: string; tooltip?: string }[]).map(({ key, label, tooltip }) => (
                      <Field key={key} label={label} tooltip={tooltip}>
                        <Input type="number" onWheel={noWheel} value={form[key] as string}
                          onChange={set(key)} placeholder="0"
                          className="h-8 text-xs bg-muted/40 font-mono px-2" />
                      </Field>
                    ))}
                  </div>
                  )}
                  <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
                    <p className="text-[10px] text-amber-400 leading-relaxed">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Duty rates are auto-filled estimates based on FBR CC slabs. Verify exact rates with your clearing agent or FBR portal before bidding.
                    </p>
                  </div>
                </TabsContent>

                {/* Local charges tab */}
                <TabsContent value="local" className="px-4 pb-4 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Pakistan Local Charges (PKR)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'portHandlingPkr',   label: 'Port Handling' },
                      { key: 'clearingAgentPkr',  label: 'Clearing Agent', tooltip: 'Agent fee for customs clearance' },
                      { key: 'documentationPkr',  label: 'Documentation' },
                      { key: 'portStoragePkr',    label: 'Port Storage' },
                      { key: 'transportationPkr', label: 'Transport (Port→City)' },
                      { key: 'inspectionPkr',     label: 'Inspection' },
                      { key: 'scanningPkr',       label: 'Scanning Fee' },
                      { key: 'passportPkr',       label: 'Passport Charges' },
                      { key: 'bankChargesPkr',    label: 'Bank Charges' },
                      { key: 'ttChargesPkr',      label: 'TT Charges', tooltip: 'Telegraphic Transfer bank fee' },
                      { key: 'miscPkr',           label: 'Miscellaneous' },
                    ] as { key: keyof FormState; label: string; tooltip?: string }[]).map(({ key, label, tooltip }) => (
                      <Field key={key} label={label} tooltip={tooltip}>
                        <Input type="number" onWheel={noWheel} value={form[key] as string}
                          onChange={set(key)} placeholder="0"
                          className="h-8 text-xs bg-muted/40 font-mono px-2" />
                      </Field>
                    ))}
                  </div>
                </TabsContent>

                {/* Profit tab */}
                <TabsContent value="profit" className="px-4 pb-4 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Profit & Margin Targets</p>
                  <div className="rounded-xl bg-primary/8 border border-primary/20 p-3 space-y-3">
                    <Field label="Dealer Margin (PKR)" tooltip="Fixed overhead/margin added to landed cost before profit calculation">
                      <Input type="number" onWheel={noWheel} value={form.dealerMarginPkr}
                        onChange={set('dealerMarginPkr')} placeholder="150000"
                        className="h-9 text-sm bg-background font-mono px-3 border-primary/30" />
                    </Field>
                    <Field label="Desired Profit %" tooltip="Target profit percentage on dealer cost">
                      <Input type="number" onWheel={noWheel} value={form.desiredProfitPct}
                        onChange={set('desiredProfitPct')} placeholder="15"
                        className="h-9 text-sm bg-background font-mono px-3 border-primary/30" />
                    </Field>
                  </div>
                  {n(form.dealerMarginPkr) > 0 && n(form.desiredProfitPct) > 0 && (
                    <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs space-y-1 text-muted-foreground">
                      <p>Dealer Margin: <span className="text-foreground font-medium">{formatCurrency(n(form.dealerMarginPkr))}</span></p>
                      <p>Profit Target: <span className="text-foreground font-medium">{n(form.desiredProfitPct)}% on cost</span></p>
                    </div>
                  )}
                </TabsContent>

                {/* AI Valuation Tab */}
                <TabsContent value="ai" className="px-4 pb-4 pt-3 space-y-3">
                  <AIValuationTab form={form} calcResult={calcResult} />
                </TabsContent>
              </Tabs>

              {/* Tab nav footer */}
              <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                  disabled={activeTab === 'vehicle'}
                  onClick={() => {
                    const i = TABS.findIndex(t => t.id === activeTab);
                    if (i > 0) setActiveTab(TABS[i - 1].id);
                  }}>
                  <ChevronLeft className="w-3 h-3" />Back
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  {TABS.findIndex(t => t.id === activeTab) + 1} / {TABS.length}
                </span>
                {activeTab !== 'profit' ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => {
                      const i = TABS.findIndex(t => t.id === activeTab);
                      if (i < TABS.length - 1) setActiveTab(TABS[i + 1].id);
                    }}>
                    Next<ChevronRight className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                    onClick={handleCalculate}>
                    <Zap className="w-3 h-3" />Calculate
                  </Button>
                )}
              </div>
            </Card>

            {/* Quick action strip */}
            <div className="grid grid-cols-4 gap-2">
              <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-9 text-xs col-span-4"
                onClick={handleCalculate}>
                <Zap className="w-3.5 h-3.5" />Calculate Landed Cost
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleSave} disabled={!calcResult}>
                <Save className="w-3 h-3" />Save
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={generateReport} disabled={aiLoading || !calcResult}>
                <Sparkles className="w-3 h-3 text-primary" />{aiLoading ? 'Generating...' : 'AI Report'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-green-400 border-green-400/30 hover:bg-green-400/10" onClick={handleShare} disabled={!calcResult}>
                <Share2 className="w-3 h-3" />Share
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs text-muted-foreground"
                onClick={() => { abortRef.current?.abort(); setForm({ ...BLANK, exchangeRate: savedRate.toString() }); setCalcResult(null); setAiText(''); setShowReport(false); }}>
                <RotateCcw className="w-3 h-3" />Reset
              </Button>
            </div>
          </div>

          {/* RIGHT: Results dashboard */}
          <div className="xl:col-span-3 space-y-3">
            <AnimatePresence mode="wait">
              {calcResult ? (
                <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

                  {/* Hero summary card */}
                  <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-border overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Donut */}
                        <div className="w-24 h-24 shrink-0 relative">
                          <DonutChart segments={donutSegments} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[8px] text-muted-foreground leading-tight text-center">Total</span>
                            <span className="text-[10px] font-bold text-foreground leading-tight">
                              {(calcResult.totalImport / 1e6).toFixed(1)}M
                            </span>
                          </div>
                        </div>

                        {/* Key numbers */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">{vehicleLabel}</p>
                            <p className="text-xl font-bold text-foreground">{formatCurrency(calcResult.totalImport)}</p>
                            <p className="text-xs text-muted-foreground">Total Landed Cost</p>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Selling Price</p>
                              <p className="text-sm font-bold text-primary">{formatCurrency(calcResult.recommendedSellingPrice)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Gross Profit</p>
                              <p className={cn('text-sm font-bold', calcResult.grossProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                                {calcResult.grossProfit >= 0 ? '+' : ''}{formatCurrency(calcResult.grossProfit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">ROI</p>
                              <p className={cn('text-sm font-bold', calcResult.roi >= 10 ? 'text-green-400' : calcResult.roi >= 5 ? 'text-yellow-400' : 'text-red-400')}>
                                {calcResult.roi.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Feasibility badge */}
                        <div className={cn('rounded-xl p-3 text-center shrink-0 min-w-16', feasibility >= 70 ? 'bg-green-500/10 border border-green-500/20' : feasibility >= 45 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20')}>
                          <p className={cn('text-2xl font-black', feasibility >= 70 ? 'text-green-400' : feasibility >= 45 ? 'text-yellow-400' : 'text-red-400')}>{feasibility}</p>
                          <p className="text-[9px] text-muted-foreground">Feasibility</p>
                          <p className="text-[9px] font-semibold mt-0.5">
                            {feasibility >= 70 ? '✓ Good' : feasibility >= 45 ? '⚠ Marginal' : '✗ Risky'}
                          </p>
                        </div>
                      </div>

                      {/* Cost legend */}
                      <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t border-border/50">
                        {donutSegments.map(s => (
                          <div key={s.label} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-[10px] text-muted-foreground">{s.label}</span>
                            <span className="text-[10px] font-medium text-foreground">{((s.value / (calcResult.recommendedSellingPrice || 1)) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score meters */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-card border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Import Feasibility</span>
                          <span className={cn('text-lg font-black', feasibility >= 70 ? 'text-green-400' : feasibility >= 45 ? 'text-yellow-400' : 'text-red-400')}>{feasibility}</span>
                        </div>
                        <Progress value={feasibility} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {feasibility >= 70 ? 'Strong import candidate' : feasibility >= 45 ? 'Borderline — negotiate' : 'High risk — reconsider'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Profitability</span>
                          <span className={cn('text-lg font-black', profitScore >= 70 ? 'text-green-400' : profitScore >= 45 ? 'text-yellow-400' : 'text-red-400')}>{profitScore}</span>
                        </div>
                        <Progress value={profitScore} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {profitScore >= 70 ? 'Excellent margins' : profitScore >= 45 ? 'Acceptable profit' : 'Thin margins — review costs'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost breakdown */}
                  <Card className="bg-card border-border">
                    <CardHeader className="px-4 py-3 pb-2">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-0.5">
                      {/* Editable exchange rate row */}
                      <Row
                        label="Exchange Rate (JPY→PKR)"
                        pkr={0}
                        rateEditable
                        rateValue={breakdownRate}
                        onRateChange={handleBreakdownRateChange}
                      />
                      <div className="h-0.5" />
                      <Row label="Auction Bid" jpy={calcResult.auctionBid} pkr={calcResult.auctionBid * calcResult.rate} />
                      <Row label="Auction Fee" jpy={calcResult.auctionFee} pkr={calcResult.auctionFee * calcResult.rate} />
                      <Row label="Service Fee" jpy={calcResult.svcFee} pkr={calcResult.svcFee * calcResult.rate} />
                      <Row label="Ocean Freight" jpy={calcResult.freight} pkr={calcResult.freight * calcResult.rate} />
                      <Row label="Marine Insurance" jpy={calcResult.marIns} pkr={calcResult.marIns * calcResult.rate} />
                      <Row label="Export Charges" jpy={calcResult.exportChargesJpy} pkr={calcResult.exportChargesJpy * calcResult.rate} />
                      {calcResult.container > 0 && <Row label="Container" jpy={calcResult.container} pkr={calcResult.container * calcResult.rate} />}
                      <Row label="CIF Total" jpy={calcResult.cifJpy} pkr={calcResult.cifPkr} bold highlight />
                      <div className="h-1" />
                      <Row label={`Custom Duty (${form.customDutyPct}%)`} pkr={calcResult.cdPkr} />
                      <Row label={`Regulatory Duty (${form.regulatoryDutyPct}%)`} pkr={calcResult.rdPkr} />
                      <Row label={`Add. Customs (${form.addCustomDutyPct}%)`} pkr={calcResult.acdPkr} />
                      <Row label={`Sales Tax (${form.salesTaxPct}%)`} pkr={calcResult.stPkr} />
                      <Row label={`Income Tax (${form.incomeTaxPct}%)`} pkr={calcResult.itPkr} />
                      {calcResult.edPkr > 0 && <Row label={`Excise Duty (${form.exciseDutyPct}%)`} pkr={calcResult.edPkr} />}
                      <Row label="Total Govt Duties" pkr={calcResult.totalGovt} bold />
                      <div className="h-1" />
                      <Row label="All Local Charges" pkr={calcResult.totalLocal} />
                      <Separator className="my-1.5" />
                      <Row label="TOTAL LANDED COST" pkr={calcResult.totalImport} bold highlight />
                      <div className="h-1" />
                      <Row label="Dealer Margin" pkr={calcResult.dealerMargin} />
                      <Row label="Dealer Cost" pkr={calcResult.dealerCost} bold />
                      <Row label="Desired Profit" pkr={calcResult.desiredProfit} />
                      <Row label="Recommended Selling Price" pkr={calcResult.recommendedSellingPrice} bold highlight />
                      <Row label="Gross Profit" pkr={calcResult.grossProfit} bold green />
                    </CardContent>
                  </Card>

                  {/* Bid strategy */}
                  <Card className="bg-card border-border">
                    <CardHeader className="px-4 py-3 pb-2">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-primary" />Auction Bid Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <BidTier label="Max Safe Bid" jpy={calcResult.maxSafeBidJpy} color="bg-green-500/8 border-green-500/20 text-green-400" icon={CheckCircle2} sub="5% buffer from target" />
                        <BidTier label="Target Profit Bid" jpy={calcResult.targetProfitBidJpy} color="bg-primary/8 border-primary/20 text-primary" icon={Target} sub={`${form.desiredProfitPct}% profit`} />
                        <BidTier label="Max Recommended" jpy={calcResult.maxRecommendedBidJpy} color="bg-yellow-500/8 border-yellow-500/20 text-yellow-400" icon={TrendingUp} sub="2% over target" />
                        <BidTier label="Break-even Limit" jpy={calcResult.maxBreakevenBidJpy} color="bg-red-500/8 border-red-500/20 text-red-400" icon={AlertTriangle} sub="Do not exceed" />
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-muted/30 border border-border p-2.5">
                          <p className="text-muted-foreground text-[10px]">Ideal Selling Price</p>
                          <p className="font-bold text-primary">{formatCurrency(calcResult.idealSellingPrice)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 border border-border p-2.5">
                          <p className="text-muted-foreground text-[10px]">Lowest Acceptable</p>
                          <p className="font-bold text-foreground">{formatCurrency(calcResult.lowestAcceptableSellingPrice)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI report trigger */}
                  <Button className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold h-10"
                    onClick={generateReport} disabled={aiLoading}>
                    <Bot className="w-4 h-4" />
                    {aiLoading ? 'Generating AI Feasibility Report...' : 'Generate Full AI Feasibility Report'}
                    {!aiLoading && <ArrowUpRight className="w-3.5 h-3.5 ml-auto" />}
                  </Button>

                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="bg-card border-dashed border-border">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Calculator className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Results will appear here</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-56 mx-auto">Fill in vehicle details and costs, then press <span className="text-primary font-medium">Calculate</span></p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center text-[10px] text-muted-foreground w-full max-w-72">
                        {[
                          { icon: DollarSign, label: 'Full landed cost' },
                          { icon: BarChart3,  label: 'Duty breakdown' },
                          { icon: Target,     label: 'Bid strategy' },
                        ].map(({ icon: Icon, label }) => (
                          <div key={label} className="rounded-lg bg-muted/30 border border-border p-2.5 space-y-1">
                            <Icon className="w-4 h-4 text-primary mx-auto" />
                            <p>{label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}

        {/* AI Report Panel */}
        {pageTab === 'calculator' && (
        <AnimatePresence>
          {showReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-card border-primary/20">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />AI Import Feasibility Report
                    {aiLoading && <span className="text-xs text-muted-foreground font-normal animate-pulse">— generating…</span>}
                  </CardTitle>
                  <div className="flex gap-2">
                    {aiLoading && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { abortRef.current?.abort(); setAiLoading(false); }}>Stop</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowReport(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[120px] max-h-[600px] overflow-y-auto bg-muted/20 rounded-xl p-4 border border-border">
                    {!aiText && aiLoading && (
                      <div className="flex items-center gap-3 py-4">
                        <span className="flex gap-1">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </span>
                        <span className="text-xs text-muted-foreground">Generating comprehensive analysis…</span>
                      </div>
                    )}
                    {aiText && (
                      <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                        {aiText}
                        {aiLoading && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
                      </pre>
                    )}
                  </div>
                  {aiText && !aiLoading && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { navigator.clipboard.writeText(aiText); toast.success('Report copied'); }}>
                        <Share2 className="w-3 h-3" />Copy Report
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {/* ── Ex-Factory Prices Tab ── */}
        {pageTab === 'exfactory' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <Card className="bg-card border-border">
              <CardContent className="px-4 py-3">
                {/* hidden file input for JSON/CSV import */}
                <input
                  ref={efImportRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                    <input
                      value={exFactoryFilter}
                      onChange={e => setExFactoryFilter(e.target.value)}
                      placeholder="Search brand / model / variant…"
                      className="h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-52"
                    />
                    <select
                      value={exFactoryBrand}
                      onChange={e => setExFactoryBrand(e.target.value)}
                      className="h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      {efBrands.map(b => <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={loadExFactory} disabled={exFactoryLoading}>
                      <RefreshCw className={cn('w-3.5 h-3.5', exFactoryLoading && 'animate-spin')} />
                    </Button>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border"
                      onClick={() => setShowCsvPaste(v => !v)}>
                      <Clipboard className="w-3 h-3" />Paste CSV
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border"
                      onClick={() => efImportRef.current?.click()} disabled={importing}>
                      {importing
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Importing…</>
                        : <><FileText className="w-3 h-3" />Upload File</>}
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1.5"
                      onClick={() => { setEditingEF({ id: '' } as ExFactoryPrice); setEfForm({ year: 2026, currency: 'PKR', is_active: true, features: [] }); }}>
                      <Plus className="w-3.5 h-3.5" />Add Entry
                    </Button>
                  </div>
                </div>

                {/* CSV paste panel */}
                <AnimatePresence>
                  {showCsvPaste && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 mt-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <Clipboard className="w-3.5 h-3.5" /> Paste CSV Text
                          </p>
                          <button onClick={() => { setShowCsvPaste(false); setCsvPasteText(''); }}
                            className="w-5 h-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <Textarea
                          value={csvPasteText}
                          onChange={e => setCsvPasteText(e.target.value)}
                          placeholder={"brand,model,variant,year,ex_factory,on_road,fuel_type,engine_cc,transmission,body_type,features,notes,source\nBYD,Seal,EV Long Range,2026,15999000,16900000,Electric,0,Auto,Sedan,\"Sunroof;ADAS;Android\",Updated Jan 2026,BYD Pakistan\nSuzuki,Alto,660cc VXL AGS,2026,2549000,2700000,Petrol,660,Auto,Hatchback,\"AGS;USB Charging\",Price revised,Suzuki Pakistan"}
                          className="font-mono text-[11px] bg-muted/40 border-border min-h-[90px] resize-y"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] text-muted-foreground">
                            Required: <code className="bg-muted px-1 rounded">brand, model, variant, ex_factory</code> — header row optional, auto-detected
                          </p>
                          <Button size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={handleCsvPaste} disabled={importing || !csvPasteText.trim()}>
                            {importing
                              ? <><RefreshCw className="w-3 h-3 animate-spin" />Importing…</>
                              : <><Clipboard className="w-3 h-3" />Import Pasted CSV</>}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-muted-foreground">
                  CSV columns: <code className="bg-muted px-1 rounded">brand, model, variant, year, ex_factory, on_road, on_road_filer, on_road_non_filer, on_road_breakdown, fuel_type, engine_cc, transmission, body_type, color_options, image_url, features, notes, source</code>
                  &nbsp;—&nbsp;<code className="bg-muted px-1 rounded">on_road_breakdown</code>: PakWheels-style text e.g. <code className="bg-muted px-1 rounded">Filer: 7509800 / Non-Filer: 7655600 | WHT Filer 72900 / Non-Filer 218700 | Token 15000 + Reg 72900 + Plate 2500 + Smart 1500</code>. <code className="bg-muted px-1 rounded">image_url</code>: direct URL to cover image.
                </p>
              </CardContent>
            </Card>

            {/* ── Add / Edit form (slide-in card) ── */}
            <AnimatePresence>
              {editingEF && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                  <Card className="bg-card border-primary/40 shadow-lg">
                    <CardHeader className="px-4 py-3 pb-0 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                        {editingEF.id ? <><Pencil className="w-3.5 h-3.5" />Edit Entry</> : <><Plus className="w-3.5 h-3.5" />Add New Entry</>}
                      </CardTitle>
                      <button onClick={() => { setEditingEF(null); setEfForm({}); }}
                        className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-3 space-y-3">
                      {/* Row 1: identity */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {([
                          { key: 'brand',   label: 'Brand *',   ph: 'Toyota' },
                          { key: 'model',   label: 'Model *',   ph: 'Corolla' },
                          { key: 'variant', label: 'Variant *', ph: 'Altis X CVT' },
                          { key: 'year',    label: 'Year',      ph: '2026', num: true },
                        ] as {key: keyof ExFactoryPrice; label: string; ph: string; num?: boolean}[]).map(f => (
                          <div key={String(f.key)}>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</Label>
                            <input type={f.num ? 'number' : 'text'}
                              value={(efForm[f.key] as string | number) ?? ''}
                              onChange={e => setEfForm(p => ({ ...p, [f.key]: f.num ? (parseInt(e.target.value) || 0) : e.target.value }))}
                              placeholder={f.ph}
                              className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                        ))}
                      </div>
                      {/* Row 2: pricing */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {([
                          { key: 'ex_factory',        label: 'Ex-Factory PKR *',   ph: '7299000',  num: true },
                          { key: 'on_road_filer',     label: 'On-Road (Filer)',     ph: '7800000',  num: true },
                          { key: 'on_road_non_filer', label: 'On-Road (Non-Filer)', ph: '8100000',  num: true },
                        ] as {key: keyof ExFactoryPrice; label: string; ph: string; num?: boolean}[]).map(f => (
                          <div key={String(f.key)}>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</Label>
                            <input type="number"
                              step="1"
                              value={(efForm[f.key] as number) ?? ''}
                              onChange={e => setEfForm(p => ({ ...p, [f.key]: Number(e.target.value) || undefined }))}
                              placeholder={f.ph}
                              className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            {((efForm[f.key] as number) ?? 0) > 0 && (
                              <p className="text-[9px] text-primary/70 mt-0.5 pl-1">
                                = PKR {((efForm[f.key] as number) || 0).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Row 2b: on-road breakdown text */}
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">
                          On-Road Breakdown (PakWheels format)
                        </Label>
                        <input type="text"
                          value={(efForm.on_road_breakdown as string) ?? ''}
                          onChange={e => setEfForm(p => ({ ...p, on_road_breakdown: e.target.value }))}
                          placeholder="Filer: 7509800 / Non-Filer: 7655600 | WHT Filer 72900 / Non-Filer 218700 | PayOrder Filer 7417900 | Token 15000 + Reg 72900 + Plate 2500 + Smart 1500"
                          className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5 pl-1">Separate sections with <code>|</code> — dual values with <code>/</code></p>
                      </div>
                      {/* Row 2c: engine + fuel + image */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {([
                          { key: 'fuel_type',  label: 'Fuel Type',  ph: 'Petrol / Electric / Hybrid' },
                          { key: 'engine_cc',  label: 'Engine CC',  ph: '1498', num: true },
                        ] as {key: keyof ExFactoryPrice; label: string; ph: string; num?: boolean}[]).map(f => (
                          <div key={String(f.key)}>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</Label>
                            <input type={f.num ? 'number' : 'text'}
                              step={f.num ? '1' : undefined}
                              value={(efForm[f.key] as string | number) ?? ''}
                              onChange={e => setEfForm(p => ({ ...p, [f.key]: f.num ? (Number(e.target.value) || undefined) : e.target.value }))}
                              placeholder={f.ph}
                              className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                        ))}
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Cover Image URL</Label>
                          <input type="url"
                            value={(efForm.image_url as string) ?? ''}
                            onChange={e => setEfForm(p => ({ ...p, image_url: e.target.value }))}
                            placeholder="https://…/car.jpg"
                            className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          {efForm.image_url && (
                            <img src={efForm.image_url as string} alt="preview"
                              className="mt-1.5 w-full h-16 object-cover rounded-lg border border-border/50" />
                          )}
                        </div>
                      </div>
                      {/* Row 3: vehicle meta */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {([
                          { key: 'transmission', label: 'Transmission', ph: 'Automatic / CVT / Manual' },
                          { key: 'body_type',    label: 'Body Type',    ph: 'Sedan / SUV / Hatchback / Crossover' },
                          { key: 'currency',     label: 'Currency',     ph: 'PKR' },
                          { key: 'source',       label: 'Source / URL', ph: 'Toyota Pakistan / Pakwheels' },
                        ] as {key: keyof ExFactoryPrice; label: string; ph: string}[]).map(f => (
                          <div key={String(f.key)}>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</Label>
                            <input type="text"
                              value={(efForm[f.key] as string) ?? ''}
                              onChange={e => setEfForm(p => ({ ...p, [f.key]: e.target.value }))}
                              placeholder={f.ph}
                              className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                        ))}
                      </div>
                      {/* Features, colors & notes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Key Features (comma-separated)</Label>
                          <input type="text"
                            value={(efForm.features ?? []).join(', ')}
                            onChange={e => setEfForm(p => ({ ...p, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                            placeholder="Sunroof, Wireless Charging, ADAS, 7 Airbags"
                            className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Official Color Options (comma-separated)</Label>
                          <input type="text"
                            value={(efForm.color_options as string) ?? ''}
                            onChange={e => setEfForm(p => ({ ...p, color_options: e.target.value }))}
                            placeholder="White, Silver, Black, Red, Blue"
                            className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          {/* Live swatch preview */}
                          {efForm.color_options && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {parseColors(efForm.color_options as string).slice(0, 8).map(c => (
                                <ColorSwatch key={c} color={c} />
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Notes / Remarks</Label>
                          <input type="text"
                            value={(efForm.notes as string) ?? ''}
                            onChange={e => setEfForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="e.g. Price revised Jan 2026, includes PDC"
                            className="w-full h-8 rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                      </div>
                      {/* Active toggle */}
                      <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox"
                            checked={efForm.is_active !== false}
                            onChange={e => setEfForm(p => ({ ...p, is_active: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-primary rounded" />
                          <span className="text-xs text-muted-foreground">Active (visible in directory)</span>
                        </label>
                      </div>
                      <div className="flex gap-2 pt-1 border-t border-border">
                        <Button size="sm" onClick={handleSaveEF} disabled={savingEF} className="h-8 text-xs gap-1.5">
                          <Save className="w-3.5 h-3.5" />{savingEF ? 'Saving…' : editingEF.id ? 'Update Entry' : 'Add Entry'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-border"
                          onClick={() => { setEditingEF(null); setEfForm({}); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Price Directory ── */}
            {exFactoryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse border border-border" />
                ))}
              </div>
            ) : filteredEF.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No price entries found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Price" or import a JSON/CSV file</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                {Array.from(new Set(filteredEF.map(p => p.brand))).sort().map(brand => {
                  const brandEntries = filteredEF.filter(p => p.brand === brand);
                  // Group by model
                  const models = Array.from(new Set(brandEntries.map(p => p.model))).sort();
                  return (
                    <div key={brand}>
                      {/* Brand header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-lg px-3 py-1.5">
                          <Car className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary uppercase tracking-wide">{brand}</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {brandEntries.length} variant{brandEntries.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Model sections */}
                      {models.map(model => {
                        const variants = brandEntries.filter(p => p.model === model);
                        return (
                          <div key={model} className="mb-4">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">{model}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {variants.map(price => {
                                const exLac = price.ex_factory >= 10_000_000
                                  ? `${(price.ex_factory / 10_000_000).toFixed(3).replace(/\.?0+$/, '')} Cr  (PKR ${price.ex_factory.toLocaleString()})`
                                  : price.ex_factory >= 100_000
                                  ? `${(price.ex_factory / 100_000).toFixed(2).replace(/\.?0+$/, '')} Lac  (PKR ${price.ex_factory.toLocaleString()})`
                                  : `PKR ${price.ex_factory.toLocaleString()}`;
                                const onRoadLac = price.on_road
                                  ? price.on_road >= 10_000_000
                                    ? `${(price.on_road / 10_000_000).toFixed(3).replace(/\.?0+$/, '')} Cr  (PKR ${price.on_road.toLocaleString()})`
                                    : price.on_road >= 100_000
                                    ? `${(price.on_road / 100_000).toFixed(2).replace(/\.?0+$/, '')} Lac  (PKR ${price.on_road.toLocaleString()})`
                                    : `PKR ${price.on_road.toLocaleString()}`
                                  : null;
                                const fuelColor =
                                  price.fuel_type === 'Electric' ? 'text-cyan-400 bg-cyan-400/10' :
                                  price.fuel_type === 'Hybrid' || price.fuel_type === 'PHEV' || price.fuel_type === 'Mild Hybrid' ? 'text-emerald-400 bg-emerald-400/10' :
                                  price.fuel_type === 'Diesel' ? 'text-purple-400 bg-purple-400/10' :
                                  'text-orange-400 bg-orange-400/10';
                                return (
                                  <Card
                                    key={price.id}
                                    className="bg-card border-border hover:border-primary/40 transition-all duration-200 group hover:shadow-md hover:shadow-primary/5 cursor-pointer"
                                    onClick={() => setSelectedEF(price)}
                                  >
                                    <CardContent className="p-0">
                                      {/* Card header strip */}
                                      <div className="px-3 pt-3 pb-2 border-b border-border/60">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground leading-tight truncate">{price.variant}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                              <span className="text-[10px] text-muted-foreground">{price.year}</span>
                                              {price.fuel_type && (
                                                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', fuelColor)}>
                                                  {price.fuel_type}
                                                </span>
                                              )}
                                              {price.transmission && (
                                                <span className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full">
                                                  {price.transmission}
                                                </span>
                                              )}
                                              {price.body_type && (
                                                <span className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full">
                                                  {price.body_type}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Action buttons — stop propagation so they don't open modal */}
                                          <div className="flex gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button
                                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-400/10 text-emerald-400 border border-transparent hover:border-emerald-400/20 transition-colors"
                                              onClick={() => copyEFAsCSV(price)}
                                              title="Copy as CSV">
                                              {copiedEFId === price.id
                                                ? <ClipboardCheck className="w-3 h-3" />
                                                : <ClipboardCopy className="w-3 h-3" />}
                                            </button>
                                            <button
                                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary border border-transparent hover:border-primary/20 transition-colors"
                                              onClick={() => { setEditingEF(price); setEfForm({ ...price }); }}
                                              title="Edit">
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-400/10 text-red-400 border border-transparent hover:border-red-400/20 transition-colors"
                                              onClick={() => handleDeleteEF(price.id)}
                                              title="Remove">
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Price block */}
                                      <div className="px-3 py-2 bg-primary/5 border-b border-border/60">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Ex-Factory</p>
                                            <p className="text-sm font-black text-primary leading-tight">{exLac}</p>
                                          </div>
                                          <div className="text-right space-y-0.5 shrink-0">
                                            {price.on_road_filer && (
                                              <div>
                                                <p className="text-[8px] text-emerald-400/80 uppercase tracking-wide leading-none">Filer</p>
                                                <p className="text-xs font-semibold text-emerald-400 leading-tight">
                                                  {price.on_road_filer >= 10_000_000
                                                    ? `${(price.on_road_filer/10_000_000).toFixed(3).replace(/\.?0+$/,'')} Cr`
                                                    : `${(price.on_road_filer/100_000).toFixed(2).replace(/\.?0+$/,'')} Lac`}
                                                </p>
                                              </div>
                                            )}
                                            {price.on_road_non_filer && (
                                              <div>
                                                <p className="text-[8px] text-orange-400/80 uppercase tracking-wide leading-none">Non-Filer</p>
                                                <p className="text-xs font-semibold text-orange-400 leading-tight">
                                                  {price.on_road_non_filer >= 10_000_000
                                                    ? `${(price.on_road_non_filer/10_000_000).toFixed(3).replace(/\.?0+$/,'')} Cr`
                                                    : `${(price.on_road_non_filer/100_000).toFixed(2).replace(/\.?0+$/,'')} Lac`}
                                                </p>
                                              </div>
                                            )}
                                            {!price.on_road_filer && !price.on_road_non_filer && onRoadLac && (
                                              <div>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">On-Road</p>
                                                <p className="text-xs font-semibold text-muted-foreground leading-tight">{onRoadLac}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {/* On-Road breakdown inline toggle */}
                                        {price.on_road_breakdown && (() => {
                                          const rows = parseBreakdown(price.on_road_breakdown);
                                          return rows.length > 0 ? (
                                            <div className="mt-2 pt-2 border-t border-border/40" onClick={e => e.stopPropagation()}>
                                              <details className="group/bd">
                                                <summary className="cursor-pointer text-[9px] font-semibold text-primary/70 hover:text-primary flex items-center gap-1 select-none list-none">
                                                  <ChevronDown className="w-2.5 h-2.5 transition-transform group-open/bd:rotate-180" />
                                                  On-Road Breakdown
                                                </summary>
                                                <div className="mt-1.5 space-y-0.5">
                                                  {rows.map((row, ri) => (
                                                    <div key={ri} className="grid grid-cols-3 text-[9px] leading-snug">
                                                      <span className="text-muted-foreground col-span-1 truncate">{row.label}</span>
                                                      {row.filer || row.nonFiler ? (
                                                        <>
                                                          <span className="text-emerald-400 font-medium text-right">{row.filer ?? '—'}</span>
                                                          <span className="text-orange-400 font-medium text-right">{row.nonFiler ?? '—'}</span>
                                                        </>
                                                      ) : (
                                                        <span className="text-foreground font-medium text-right col-span-2">{row.value}</span>
                                                      )}
                                                    </div>
                                                  ))}
                                                  <div className="flex justify-between text-[8px] text-muted-foreground/50 pt-0.5 border-t border-border/30">
                                                    <span className="text-emerald-400/60">● Filer</span>
                                                    <span className="text-orange-400/60">● Non-Filer</span>
                                                  </div>
                                                </div>
                                              </details>
                                            </div>
                                          ) : null;
                                        })()}
                                      </div>

                                      {/* Official color swatches */}
                                      {price.color_options && (
                                        <div className="px-3 pt-2 pb-1 border-b border-border/40">
                                          <div className="flex flex-wrap gap-1">
                                            {parseColors(price.color_options).map(c => (
                                              <ColorSwatch key={c} color={c} />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Features chips — first 4 + "View all" trigger */}
                                      {price.features && price.features.length > 0 && (
                                        <div className="px-3 py-2 border-b border-border/40">
                                          <div className="flex flex-wrap gap-1">
                                            {price.features.slice(0, 4).map((feat, fi) => (
                                              <span key={fi} className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full border border-border/60 leading-tight">
                                                {feat}
                                              </span>
                                            ))}
                                            {price.features.length > 4 && (
                                              <span className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full leading-tight">
                                                +{price.features.length - 4} more — tap to view all
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Notes + source footer */}
                                      {(price.notes || price.source) && (
                                        <div className="px-3 py-2">
                                          {price.notes && <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{price.notes}</p>}
                                          {price.source && (
                                            <p className="text-[9px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                                              <Globe className="w-2.5 h-2.5 shrink-0" />{price.source}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {/* Tap hint */}
                                      <div className="px-3 pb-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-2.5 h-2.5 text-primary/60" />
                                        <span className="text-[9px] text-primary/60">Tap to view full details</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground text-center pt-2 pb-1">
                  {filteredEF.length} variants across {Array.from(new Set(filteredEF.map(p => p.brand))).length} brands · 2026 prices · Source: official dealer sites &amp; Pakwheels
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ex-Factory Detail Modal ── */}
      <AnimatePresence>
        {selectedEF && (() => {
          const p = selectedEF;
          const fmtPrice = (v: number) =>
            v >= 10_000_000
              ? `${(v / 10_000_000).toFixed(3).replace(/\.?0+$/, '')} Cr  (PKR ${v.toLocaleString()})`
              : v >= 100_000
              ? `${(v / 100_000).toFixed(2).replace(/\.?0+$/, '')} Lac  (PKR ${v.toLocaleString()})`
              : `PKR ${v.toLocaleString()}`;
          const fuelColor =
            p.fuel_type === 'Electric' ? 'text-cyan-400 bg-cyan-400/10' :
            p.fuel_type === 'Hybrid' || p.fuel_type === 'PHEV' || p.fuel_type === 'Mild Hybrid' ? 'text-emerald-400 bg-emerald-400/10' :
            p.fuel_type === 'Diesel' ? 'text-purple-400 bg-purple-400/10' :
            'text-orange-400 bg-orange-400/10';
          return (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedEF(null)}
              />
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <motion.div
                  className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]"
                  initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{p.brand} · {p.model}</span>
                        {p.year && <span className="text-xs text-muted-foreground">{p.year}</span>}
                        {p.fuel_type && (
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', fuelColor)}>{p.fuel_type}</span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-foreground mt-0.5 leading-tight">{p.variant}</h2>
                    </div>
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      onClick={() => setSelectedEF(null)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable body */}
                  <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                    {/* Prices */}
                    <div className="space-y-2">
                      {/* Ex-Factory always shown */}
                      <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Ex-Factory Price</p>
                        <p className="text-base font-black text-primary leading-tight">{fmtPrice(p.ex_factory)}</p>
                      </div>
                      {/* Filer / Non-Filer on-road prices */}
                      {(p.on_road_filer || p.on_road_non_filer) ? (
                        <div className="grid grid-cols-2 gap-2">
                          {p.on_road_filer ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                              <p className="text-[9px] text-emerald-400/80 uppercase tracking-wider mb-1">On-Road — Filer</p>
                              <p className="text-base font-bold text-emerald-400 leading-tight">{fmtPrice(p.on_road_filer)}</p>
                            </div>
                          ) : <div />}
                          {p.on_road_non_filer ? (
                            <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3">
                              <p className="text-[9px] text-orange-400/80 uppercase tracking-wider mb-1">On-Road — Non-Filer</p>
                              <p className="text-base font-bold text-orange-400 leading-tight">{fmtPrice(p.on_road_non_filer)}</p>
                            </div>
                          ) : <div />}
                        </div>
                      ) : p.on_road ? (
                        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">On-Road Estimate</p>
                          <p className="text-base font-bold text-foreground leading-tight">{fmtPrice(p.on_road)}</p>
                        </div>
                      ) : (
                        <div className="bg-muted/20 border border-border/50 rounded-xl px-4 py-3 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground/50">On-road N/A</p>
                        </div>
                      )}

                      {/* On-Road cost breakdown table */}
                      {p.on_road_breakdown && (() => {
                        const rows = parseBreakdown(p.on_road_breakdown);
                        return rows.length > 0 ? (
                          <div className="border border-border/50 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">On-Road Cost Breakdown</p>
                              <div className="flex gap-3 text-[9px]">
                                <span className="text-emerald-400 font-medium">● Filer</span>
                                <span className="text-orange-400 font-medium">● Non-Filer</span>
                              </div>
                            </div>
                            <div className="divide-y divide-border/30">
                              {rows.map((row, ri) => (
                                <div key={ri} className="grid grid-cols-3 px-4 py-2 text-xs hover:bg-muted/20 transition-colors">
                                  <span className="text-muted-foreground col-span-1 font-medium">{row.label}</span>
                                  {row.filer || row.nonFiler ? (
                                    <>
                                      <span className="text-emerald-400 font-semibold text-right">{row.filer ?? '—'}</span>
                                      <span className="text-orange-400 font-semibold text-right">{row.nonFiler ?? '—'}</span>
                                    </>
                                  ) : (
                                    <span className="text-foreground font-semibold text-right col-span-2">{row.value}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Specs row */}
                    {(p.engine_cc || p.transmission || p.body_type || p.fuel_type) && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Specifications</p>
                        <div className="grid grid-cols-2 gap-2">
                          {p.engine_cc && (
                            <div className="bg-muted/30 rounded-lg px-3 py-2">
                              <p className="text-[9px] text-muted-foreground">Engine</p>
                              <p className="text-xs font-semibold text-foreground">{p.engine_cc}cc</p>
                            </div>
                          )}
                          {p.transmission && (
                            <div className="bg-muted/30 rounded-lg px-3 py-2">
                              <p className="text-[9px] text-muted-foreground">Transmission</p>
                              <p className="text-xs font-semibold text-foreground">{p.transmission}</p>
                            </div>
                          )}
                          {p.body_type && (
                            <div className="bg-muted/30 rounded-lg px-3 py-2">
                              <p className="text-[9px] text-muted-foreground">Body Type</p>
                              <p className="text-xs font-semibold text-foreground">{p.body_type}</p>
                            </div>
                          )}
                          {p.fuel_type && (
                            <div className="bg-muted/30 rounded-lg px-3 py-2">
                              <p className="text-[9px] text-muted-foreground">Fuel Type</p>
                              <p className={cn('text-xs font-semibold', fuelColor.split(' ')[0])}>{p.fuel_type}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Color options */}
                    {p.color_options && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Colors</p>
                        <div className="flex flex-wrap gap-1.5">
                          {parseColors(p.color_options).map(c => (
                            <ColorSwatch key={c} color={c} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All features */}
                    {p.features && p.features.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Features & Equipment <span className="text-primary ml-1">({p.features.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.features.map((feat, fi) => (
                            <span
                              key={fi}
                              className="text-[10px] bg-muted/50 border border-border/60 text-foreground px-2.5 py-1 rounded-full leading-tight flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {p.notes && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-lg px-3 py-2.5 leading-relaxed">{p.notes}</p>
                      </div>
                    )}

                    {/* Source + meta */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      {p.source ? (
                        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Globe className="w-3 h-3 shrink-0" />Source: {p.source}
                        </p>
                      ) : <span />}
                      <span className="text-[10px] text-muted-foreground/40">
                        {p.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="shrink-0 px-5 py-3 border-t border-border flex gap-2">
                    <button
                      className="flex-1 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-400/20 transition-colors flex items-center justify-center gap-1.5"
                      onClick={() => copyEFAsCSV(p)}
                    >
                      {copiedEFId === p.id
                        ? <><ClipboardCheck className="w-3.5 h-3.5" />Copied!</>
                        : <><ClipboardCopy className="w-3.5 h-3.5" />Copy CSV</>}
                    </button>
                    <button
                      className="flex-1 h-9 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
                      onClick={() => { setEditingEF(p); setEfForm({ ...p }); setSelectedEF(null); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />Edit Entry
                    </button>
                    <button
                      className="h-9 px-4 rounded-xl bg-muted/40 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      onClick={() => setSelectedEF(null)}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setShowHistory(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border flex flex-col"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-sm text-foreground">Saved Calculations ({history.length})</h2>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No saved calculations yet</p>
                ) : history.map(h => (
                  <Card key={h.id} className="bg-background border-border cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        manufacturer: h.make ?? '',
                        vehicleName: h.model ?? '',
                        modelYear: h.model_year?.toString() ?? '',
                        auctionGrade: h.auction_grade ?? '',
                        auctionBidJpy: h.fob_jpy.toString(),
                        exchangeRate: h.exchange_rate.toString(),
                      }));
                      setShowHistory(false);
                      toast.success('Calculation loaded');
                    }}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {[h.make, h.model, h.model_year, h.auction_grade].filter(Boolean).join(' ') || 'Unknown Vehicle'}
                          </p>
                          <p className="text-xs text-muted-foreground">FOB: ¥{h.fob_jpy.toLocaleString()} · Rate: {h.exchange_rate}</p>
                          <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(h.total_landing_pkr)}</p>
                          {h.estimated_profit_pkr != null && (
                            <p className={cn('text-xs font-semibold', h.estimated_profit_pkr >= 0 ? 'text-green-400' : 'text-red-400')}>
                              Profit: {h.estimated_profit_pkr >= 0 ? '+' : ''}{formatCurrency(h.estimated_profit_pkr)}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
