/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Terminal, Search, Plus, Edit3, Trash2, ChevronRight,
  Car, Users, Building2, DollarSign, BarChart3, Zap,
  ArrowRight, X, Check, AlertTriangle, Clock, RefreshCw,
  Download, Upload, RotateCcw, BookOpen, Calculator,
  GitCompare, Star, Filter, TrendingUp, Lightbulb,
  Copy, Loader2, History, Bookmark, ChevronDown, CheckCircle2,
  ChevronUp, Layers, Command, Hash, PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { fetchVehicles } from '@/lib/api';
import { formatCurrency, formatMileage, cn } from '@/lib/utils';
import type { Vehicle } from '@/types/types';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Synonym dictionary ───────────────────────────────────────────────────────
const SYNONYMS: Record<string, string> = {
  'zero meter': 'brand new', 'zerometre': 'brand new', 'brand new': 'brand new',
  'new': 'brand new', 'unregistered': 'brand new',
  'ev': 'electric', 'electric vehicle': 'electric',
  'jeep': 'suv', '4x4': 'suv', 'off road': 'suv', 'offroad': 'suv',
  'pickup': 'truck',
  'petrol': 'petrol', 'gasoline': 'petrol',
  'diesel': 'diesel', 'oil': 'diesel',
  'auto': 'automatic', 'automatic': 'automatic',
  'manual': 'manual', 'stick': 'manual',
  'crore': 'crore', 'cr': 'crore',
  'lakh': 'lakh', 'lac': 'lakh',
};

// ─── Fuzzy match using Levenshtein distance ───────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i-1] === b[j-1]
      ? dp[i-1][j-1]
      : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  }
  return dp[m][n];
}

const KNOWN_MAKES = ['toyota','honda','suzuki','kia','hyundai','bmw','mercedes','audi','mitsubishi','nissan','mazda','subaru','ford','byd','deepal','mg','changan','haval','tank','omoda'];
const KNOWN_MODELS = ['civic','corolla','prado','fortuner','hilux','land cruiser','yaris','swift','sportage','tucson','br-v','city','camry','vezel','passport','pilot','cr-v','hrv','aqua','vitz','alto','mehran','cultus','wagon r','bolan','ravi','shark','s05','hs','zs','steed','jolion'];

function fuzzyMatch(input: string, candidates: string[]): string | null {
  const lower = input.toLowerCase();
  let best: string | null = null, bestDist = 3;
  for (const c of candidates) {
    const d = levenshtein(lower, c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// ─── Number parser (PKR: crore/lakh/M) ───────────────────────────────────────
function parsePKR(token: string): number | null {
  const t = token.toLowerCase().replace(/,/g, '');
  const crMatch = t.match(/^(\d+(?:\.\d+)?)(?:\s*cr(?:ore)?)?$/);
  if (crMatch && t.includes('cr')) return parseFloat(crMatch[1]) * 1e7;
  const lakhMatch = t.match(/^(\d+(?:\.\d+)?)(?:\s*(?:lakh|lac))/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 1e5;
  const mMatch = t.match(/^(\d+(?:\.\d+)?)m$/);
  if (mMatch) return parseFloat(mMatch[1]) * 1e6;
  const plain = parseFloat(t);
  if (!isNaN(plain) && plain > 1000) return plain;
  return null;
}

// ─── Intent parser ────────────────────────────────────────────────────────────
type Intent = 'SEARCH' | 'CREATE' | 'UPDATE' | 'DELETE' | 'COMPARE' | 'RECOMMEND' | 'CALCULATE' | 'EXPORT' | 'BULK' | 'GOTO' | 'UNKNOWN';

interface ParsedCommand {
  intent: Intent;
  entity?: string;
  filters: Record<string, any>;
  raw: string;
  fuzzyCorrections: string[];
  synonymsApplied: string[];
}

function parseCommand(raw: string): ParsedCommand {
  let q = raw.trim();
  const corrections: string[] = [];
  const synonymsApplied: string[] = [];
  const lower = q.toLowerCase();

  // ── Intent detection ──
  let intent: Intent = 'UNKNOWN';
  if (/\b(find|show|list|search|display|get|reveal|locate|what|who|which)\b/i.test(q)) intent = 'SEARCH';
  if (/\b(add|create|insert|register|new)\b/i.test(q)) intent = 'CREATE';
  if (/\b(update|edit|modify|change|set|replace|correct)\b/i.test(q)) intent = 'UPDATE';
  if (/\b(delete|remove|erase|discard|destroy|archive|trash)\b/i.test(q)) intent = 'DELETE';
  if (/\b(compare|comparison|vs|versus)\b/i.test(q)) intent = 'COMPARE';
  if (/\b(recommend|suggest|best.*for|ideal|suitable|good for|family car|budget car)\b/i.test(q)) intent = 'RECOMMEND';
  if (/\b(calculat|installment|finance|monthly|markup|down payment)\b/i.test(q)) intent = 'CALCULATE';
  if (/\b(export|download|csv|excel)\b/i.test(q)) intent = 'EXPORT';
  if (/\b(increase|decrease|reduce|bulk|all.*prices?|mark.*sold|archive.*all)\b/i.test(q)) intent = 'BULK';
  if (/\b(go to|open|navigate to|take me to|show me)\b/i.test(q)) intent = 'GOTO';

  const filters: Record<string, any> = {};

  // ── GOTO route mapping ──
  const GOTO_ROUTES: Array<{ pattern: RegExp; path: string; label: string }> = [
    { pattern: /inventory|vehicles|stock/i,             path: '/inventory',          label: 'Inventory' },
    { pattern: /leads?|crm|customers?|clients?/i,       path: '/leads',              label: 'Leads & CRM' },
    { pattern: /analytic|report|stats|dashboard/i,      path: '/analytics',          label: 'Analytics' },
    { pattern: /invoic/i,                               path: '/invoices',           label: 'Invoicing' },
    { pattern: /import.calc|duty.calc/i,                path: '/import-calculator',  label: 'Import Calculator' },
    { pattern: /shipment|shipping/i,                    path: '/shipments',          label: 'Shipments' },
    { pattern: /auction/i,                              path: '/auction-guide',      label: 'Auction Guide' },
    { pattern: /setting/i,                              path: '/settings',           label: 'Settings' },
    { pattern: /financ(?!e calc)/i,                     path: '/finance',            label: 'Finance Plans' },
    { pattern: /marketing|campaign|social/i,            path: '/marketing',          label: 'Marketing' },
    { pattern: /expens/i,                               path: '/expenses',           label: 'Expenses' },
    { pattern: /transaction|book/i,                     path: '/transactions',       label: 'Transaction Book' },
    { pattern: /quotation|quote/i,                      path: '/quotations',         label: 'Quotations' },
    { pattern: /dealer(?:ship)?/i,                      path: '/dealers',            label: 'Dealers' },
    { pattern: /task/i,                                 path: '/tasks',              label: 'Tasks' },
    { pattern: /note|whatsapp/i,                        path: '/notes',              label: 'WhatsApp Notes' },
    { pattern: /gallery|image|photo/i,                  path: '/image-gallery',      label: 'Image Gallery' },
    { pattern: /document|assistant/i,                   path: '/documents',          label: 'Document Assistant' },
    { pattern: /home|dashboard/i,                       path: '/',                   label: 'Dashboard' },
  ];

  if (intent === 'GOTO') {
    const stripped = lower.replace(/\b(go to|open|navigate to|take me to|show me)\b/gi, '').trim();
    for (const r of GOTO_ROUTES) {
      if (r.pattern.test(stripped)) {
        filters.goto_path = r.path;
        filters.goto_label = r.label;
        break;
      }
    }
  }

  // ── Synonym resolution ──
  for (const [syn, canonical] of Object.entries(SYNONYMS)) {
    if (lower.includes(syn) && syn !== canonical) {
      q = q.replace(new RegExp(syn, 'gi'), canonical);
      synonymsApplied.push(`"${syn}" → "${canonical}"`);
    }
  }

  // ── Fuzzy make/model detection ──
  const tokens = q.toLowerCase().split(/\s+/);
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    if (!KNOWN_MAKES.find(m => tok.includes(m))) {
      const suggestion = fuzzyMatch(tok, KNOWN_MAKES);
      if (suggestion && levenshtein(tok, suggestion) <= 2) {
        corrections.push(`"${tok}" → "${suggestion}"`);
        filters.make = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      }
    } else {
      const mk = KNOWN_MAKES.find(m => tok.includes(m));
      if (mk) filters.make = mk.charAt(0).toUpperCase() + mk.slice(1);
    }
    if (!KNOWN_MODELS.find(m => tok.includes(m))) {
      const suggestion = fuzzyMatch(tok, KNOWN_MODELS);
      if (suggestion && levenshtein(tok, suggestion) <= 2 && !corrections.some(c => c.includes(tok))) {
        corrections.push(`"${tok}" → "${suggestion}"`);
        filters.model = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      }
    } else {
      const mod = KNOWN_MODELS.find(m => tok.includes(m));
      if (mod) filters.model = mod.charAt(0).toUpperCase() + mod.slice(1);
    }
  }

  const qLow = q.toLowerCase();

  // ── Colors ──
  for (const c of ['white','black','silver','grey','gray','red','blue','green','brown','beige','gold','pearl','maroon']) {
    if (qLow.includes(c)) { filters.color = c.charAt(0).toUpperCase() + c.slice(1); break; }
  }

  // ── Fuel type ──
  if (qLow.includes('hybrid')) filters.fuel_type = 'Hybrid';
  else if (qLow.includes('electric')) filters.fuel_type = 'Electric';
  else if (qLow.includes('diesel')) filters.fuel_type = 'Diesel';
  else if (qLow.includes('petrol')) filters.fuel_type = 'Petrol';

  // ── Transmission ──
  if (qLow.includes('automatic')) filters.transmission = 'Automatic';
  else if (qLow.includes('manual')) filters.transmission = 'Manual';

  // ── Price ──
  const underMatch = qLow.match(/(?:under|below|less than|within|max|budget)\s+([\d.,]+\s*(?:crore|cr|lakh|lac|million|m)?)/i);
  if (underMatch) {
    const parsed = parsePKR(underMatch[1].replace(/\s+/g, ''));
    if (parsed) filters.max_price = parsed;
  }
  const overMatch = qLow.match(/(?:above|over|more than|min)\s+([\d.,]+\s*(?:crore|cr|lakh|lac|million|m)?)/i);
  if (overMatch) {
    const parsed = parsePKR(overMatch[1].replace(/\s+/g, ''));
    if (parsed) filters.min_price = parsed;
  }

  // ── Mileage ──
  const mileMatch = qLow.match(/(?:under|below|less than)\s+(\d+)\s*(?:k\b|km|thousand|000)?/i);
  if (mileMatch) {
    let km = parseInt(mileMatch[1]);
    if (km < 1000) km *= 1000;
    filters.max_mileage = km;
  }

  // ── Year ──
  const yearMatch = qLow.match(/\b(20[0-2]\d)\b/);
  if (yearMatch) filters.year = parseInt(yearMatch[1]);

  // ── Status ──
  if (qLow.includes('available')) filters.status = 'available';
  else if (/\bsold\b/.test(qLow)) filters.status = 'sold';
  else if (/reserved/.test(qLow)) filters.status = 'reserved';
  else if (/brand new|brandnew/.test(qLow)) filters.condition = 'brand_new';

  // ── Body type ──
  if (qLow.includes('suv')) filters.body_type = 'SUV';
  else if (qLow.includes('sedan') || qLow.includes('saloon')) filters.body_type = 'Sedan';
  else if (qLow.includes('hatchback') || qLow.includes('hatch')) filters.body_type = 'Hatchback';
  else if (qLow.includes('pickup') || qLow.includes('truck')) filters.body_type = 'Pickup';
  else if (qLow.includes('mpv') || qLow.includes('minivan')) filters.body_type = 'MPV';
  else if (qLow.includes('coupe')) filters.body_type = 'Coupe';
  else if (qLow.includes('convertible')) filters.body_type = 'Convertible';

  // ── Sorting ──
  if (/cheapest|lowest price/.test(qLow)) { filters.orderBy = 'expected_selling_price'; filters.orderDir = 'asc'; }
  else if (/expensive|most expensive/.test(qLow)) { filters.orderBy = 'expected_selling_price'; filters.orderDir = 'desc'; }
  else if (/newest|latest|recent/.test(qLow)) { filters.orderBy = 'created_at'; filters.orderDir = 'desc'; }
  else if (/lowest mileage|low mileage/.test(qLow)) { filters.orderBy = 'mileage'; filters.orderDir = 'asc'; }

  // ── Recommendation inputs ──
  if (intent === 'RECOMMEND') {
    const budgetMatch = qLow.match(/(?:budget|under|max|upto)\s+([\d.,]+\s*(?:crore|cr|lakh|lac|m)?)/i);
    if (budgetMatch) {
      const b = parsePKR(budgetMatch[1].replace(/\s+/g, ''));
      if (b) filters.budget = b;
    }
    const seatMatch = qLow.match(/(\d)\s*seat/i);
    if (seatMatch) filters.seats = parseInt(seatMatch[1]);
    if (qLow.includes('family')) filters.purpose = 'family';
    if (qLow.includes('business') || qLow.includes('office')) filters.purpose = 'business';
    if (qLow.includes('off road') || qLow.includes('offroad')) filters.purpose = 'offroad';
    if (qLow.includes('city')) filters.purpose = 'city';
  }

  // ── Finance calculator inputs ──
  if (intent === 'CALCULATE') {
    const priceMatch = qLow.match(/([\d.,]+\s*(?:crore|cr|lakh|lac|m)?)\s*(?:car|vehicle|price)?/i);
    if (priceMatch) {
      const p = parsePKR(priceMatch[1].replace(/\s+/g, ''));
      if (p) filters.vehicle_price = p;
    }
    const dpMatch = qLow.match(/(\d+)\s*%\s*(?:down|dp)/i);
    if (dpMatch) filters.down_pct = parseInt(dpMatch[1]);
    const tenureMatch = qLow.match(/(\d+)\s*(?:year|yr)/i);
    if (tenureMatch) filters.tenure_months = parseInt(tenureMatch[1]) * 12;
    const markupMatch = qLow.match(/(\d+(?:\.\d+)?)\s*%\s*(?:markup|interest|rate)/i);
    if (markupMatch) filters.markup_pct = parseFloat(markupMatch[1]);
  }

  // ── Bulk operation ──
  if (intent === 'BULK') {
    const pctMatch = qLow.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) filters.pct = parseFloat(pctMatch[1]);
    if (/increase|raise|up/i.test(qLow)) filters.direction = 'increase';
    if (/decrease|reduce|lower|drop/i.test(qLow)) filters.direction = 'decrease';
  }

  return { intent, filters, raw, fuzzyCorrections: corrections, synonymsApplied };
}

// ─── Finance calculator ───────────────────────────────────────────────────────
interface FinanceResult {
  vehiclePrice: number;
  downPayment: number;
  loanAmount: number;
  monthlyInstallment: number;
  totalPayable: number;
  totalMarkup: number;
  tenure: number;
  markupPct: number;
}

function calcFinance(price: number, downPct: number, tenureMonths: number, annualMarkup: number): FinanceResult {
  const down = price * (downPct / 100);
  const loan = price - down;
  const monthlyRate = annualMarkup / 100 / 12;
  const monthly = monthlyRate === 0 ? loan / tenureMonths :
    (loan * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const total = monthly * tenureMonths + down;
  return {
    vehiclePrice: price,
    downPayment: down,
    loanAmount: loan,
    monthlyInstallment: monthly,
    totalPayable: total,
    totalMarkup: total - price,
    tenure: tenureMonths,
    markupPct: annualMarkup,
  };
}

// ─── Recommendation engine (weighted rules) ───────────────────────────────────
const PURPOSE_BODY_MAP: Record<string, string[]> = {
  family: ['SUV', 'MPV', 'Sedan'],
  business: ['Sedan', 'SUV'],
  offroad: ['SUV', 'Pickup'],
  city: ['Hatchback', 'Sedan'],
};

function scoreVehicle(v: Vehicle, filters: Record<string, any>): number {
  let score = 0;
  const { budget = Infinity, fuel_type, seats, purpose, transmission } = filters;

  // Budget match (30%)
  const price = v.expected_selling_price ?? 0;
  if (price <= budget) score += 30;
  else if (price <= budget * 1.1) score += 15;

  // Fuel (20%)
  if (fuel_type && v.fuel_type?.toLowerCase() === fuel_type.toLowerCase()) score += 20;
  else if (!fuel_type) score += 10; // no preference

  // Transmission (10%)
  if (transmission && v.transmission?.toLowerCase().includes(transmission.toLowerCase())) score += 10;
  else if (!transmission) score += 5;

  // Purpose / body type (15%)
  if (purpose && PURPOSE_BODY_MAP[purpose]) {
    const desired = PURPOSE_BODY_MAP[purpose];
    if (desired.some(b => v.body_type?.toLowerCase().includes(b.toLowerCase()))) score += 15;
  }

  // Availability (boost)
  if (v.status === 'available') score += 5;

  return score;
}

// ─── Command history ──────────────────────────────────────────────────────────
const HISTORY_KEY = 'rpm_cc_history';
function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function pushHistory(cmd: string) {
  const h = getHistory().filter(c => c !== cmd).slice(0, 19);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([cmd, ...h]));
}

// ─── Inline Create Form ───────────────────────────────────────────────────────
function InlineCreateForm({
  prefill, resultId, onSuccess,
}: { prefill: Record<string, any>; resultId: string; onSuccess: (id: string, resultId: string, type: string, name: string) => void }) {
  const isLead = prefill.type === 'lead';
  const isQuotation = prefill.type === 'quotation';

  // Vehicle form state
  const [make, setMake] = useState(prefill.make ?? '');
  const [model, setModel] = useState(prefill.model ?? '');
  const [year, setYear] = useState<string>(prefill.model_year?.toString() ?? new Date().getFullYear().toString());
  const [color, setColor] = useState(prefill.color ?? '');
  const [fuel, setFuel] = useState(prefill.fuel_type ?? 'Petrol');
  const [transmission, setTransmission] = useState(prefill.transmission ?? 'Automatic');
  const [bodyType, setBodyType] = useState(prefill.body_type ?? '');
  const [price, setPrice] = useState(prefill.expected_selling_price?.toString() ?? '');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>(prefill.vehicle_condition ?? 'used');
  const [ownerType, setOwnerType] = useState<'own' | 'dealer'>(prefill.owner_type ?? 'own');

  // Lead form state
  const [leadName, setLeadName] = useState(prefill.leadName ?? '');
  const [leadPhone, setLeadPhone] = useState(prefill.leadPhone ?? '');
  const [leadCity, setLeadCity] = useState('');
  const [leadBudget, setLeadBudget] = useState(prefill.budget_max?.toString() ?? '');
  const [reqMake, setReqMake] = useState(prefill.req_make ?? '');
  const [reqModel, setReqModel] = useState(prefill.req_model ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const saveVehicle = async () => {
    if (!make.trim() || !model.trim()) { setErr('Make and Model are required'); return; }
    setSaving(true); setErr('');
    try {
      const rec = {
        make: make.trim(),
        model: model.trim(),
        model_year: year ? parseInt(year) : null,
        color: color.trim() || null,
        fuel_type: fuel || null,
        transmission: transmission || null,
        body_type: bodyType.trim() || null,
        expected_selling_price: price ? parseFloat(price.replace(/,/g, '')) : null,
        mileage: mileage ? parseInt(mileage.replace(/,/g, '')) : null,
        vehicle_condition: condition,
        owner_type: ownerType,
        status: 'available',
      };
      const { data, error } = await supabase.from('vehicles').insert(rec).select('id').maybeSingle();
      if (error) throw error;
      const newId = (data as any)?.id ?? 'new';
      setSaved(true);
      onSuccess(newId, resultId, 'vehicle', `${make} ${model} ${year}`);
      toast.success(`✅ ${make} ${model} added to inventory!`);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save vehicle');
    } finally { setSaving(false); }
  };

  const saveLead = async () => {
    if (!leadName.trim()) { setErr('Customer name is required'); return; }
    setSaving(true); setErr('');
    try {
      const rec = {
        customer_name: leadName.trim(),
        phone: leadPhone.trim() || null,
        city: leadCity.trim() || null,
        budget_max: leadBudget ? parseFloat(leadBudget.replace(/,/g, '')) : null,
        req_make: reqMake.trim() || null,
        req_model: reqModel.trim() || null,
        status: 'new',
        lead_score: 'warm',
        call_count: 0, visit_count: 0, whatsapp_messages: 0,
      };
      const { data, error } = await supabase.from('rpm_leads').insert(rec).select('id').maybeSingle();
      if (error) throw error;
      const newId = (data as any)?.id ?? 'new';
      setSaved(true);
      onSuccess(newId, resultId, 'lead', leadName);
      toast.success(`✅ Lead "${leadName}" created!`);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save lead');
    } finally { setSaving(false); }
  };

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-400 font-semibold">
          {isLead ? `Lead "${leadName}"` : `${make} ${model}`} saved successfully!
        </p>
        <Button asChild size="sm" variant="outline" className="ml-auto text-xs h-6 gap-1">
          <Link to={isLead ? '/leads' : '/inventory'}>
            <ArrowRight className="w-3 h-3" /> View
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3 mt-2">
      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-primary" />
        {isLead ? 'New Lead' : isQuotation ? 'New Quotation' : 'New Vehicle Listing'}
        <span className="ml-1 text-[10px] text-muted-foreground font-normal">— fill details and confirm to save</span>
      </p>

      {!isLead && !isQuotation && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Make *</label>
              <Input value={make} onChange={e => setMake(e.target.value)} placeholder="Toyota" className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Model *</label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Vitz" className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Year</label>
              <Input value={year} onChange={e => setYear(e.target.value)} placeholder="2023" className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Color</label>
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="White" className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Price (PKR)</label>
              <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="3500000" className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Mileage (km)</label>
              <Input value={mileage} onChange={e => setMileage(e.target.value)} placeholder="45000" className="h-7 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Fuel', val: fuel, set: setFuel, opts: ['Petrol','Diesel','Hybrid','Electric','CNG'] },
              { label: 'Transmission', val: transmission, set: setTransmission, opts: ['Automatic','Manual'] },
              { label: 'Body Type', val: bodyType, set: setBodyType, opts: ['Sedan','Hatchback','SUV','MPV','Pickup','Coupe',''] },
              { label: 'Owner Type', val: ownerType, set: setOwnerType, opts: ['own','dealer'] },
            ].map(({ label, val, set, opts }) => (
              <div key={label} className="space-y-0.5">
                <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
                <select value={val} onChange={e => (set as any)(e.target.value)}
                  className="w-full h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground">
                  {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {isLead && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="space-y-0.5 col-span-2 md:col-span-1">
            <label className="text-[10px] text-muted-foreground font-medium">Customer Name *</label>
            <Input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Ahmed Khan" className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground font-medium">Phone</label>
            <Input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="03001234567" className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground font-medium">City</label>
            <Input value={leadCity} onChange={e => setLeadCity(e.target.value)} placeholder="Lahore" className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground font-medium">Budget (PKR)</label>
            <Input value={leadBudget} onChange={e => setLeadBudget(e.target.value)} placeholder="5000000" className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground font-medium">Interested Make</label>
            <Input value={reqMake} onChange={e => setReqMake(e.target.value)} placeholder="Toyota" className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground font-medium">Interested Model</label>
            <Input value={reqModel} onChange={e => setReqModel(e.target.value)} placeholder="Corolla" className="h-7 text-xs" />
          </div>
        </div>
      )}

      {err && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm" className="h-7 text-xs gap-1.5" disabled={saving}
          onClick={isLead ? saveLead : saveVehicle}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          {saving ? 'Saving…' : isLead ? 'Create Lead' : 'Add to Inventory'}
        </Button>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
          <Link to={isLead ? '/leads' : '/inventory/new'}>
            <ArrowRight className="w-3 h-3" /> Full Form
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Command Dictionary ───────────────────────────────────────────────────────
interface DictEntry { cmd: string; desc: string; example: string }
interface DictCategory { label: string; icon: React.ElementType; color: string; entries: DictEntry[] }

const CMD_DICTIONARY: DictCategory[] = [
  {
    label: 'Vehicle Search', icon: Search, color: 'text-blue-400',
    entries: [
      { cmd: 'show [make] [model]', desc: 'Find vehicles by make and/or model', example: 'show Toyota Corolla' },
      { cmd: 'find [color] [body] under [price]', desc: 'Filter by color, body type and max price', example: 'find white SUVs under 1 crore' },
      { cmd: '[fuel] cars available', desc: 'Filter by fuel type and availability', example: 'hybrid cars available' },
      { cmd: 'cheapest [make]', desc: 'Sort by lowest price for a make', example: 'cheapest Honda' },
      { cmd: 'most expensive [body]', desc: 'Sort by highest price for body type', example: 'most expensive sedan' },
      { cmd: '[year] [make] under [price]', desc: 'Year + make + price filter', example: '2024 Kia under 80 lakh' },
      { cmd: 'automatic [fuel] [body]', desc: 'Filter by transmission, fuel, body type', example: 'automatic hybrid suv' },
      { cmd: 'lowest mileage [make]', desc: 'Sort by mileage ascending', example: 'lowest mileage Suzuki' },
      { cmd: 'sold [make]', desc: 'Show sold vehicles', example: 'sold Toyota' },
      { cmd: 'reserved cars', desc: 'Show all reserved vehicles', example: 'reserved cars' },
      { cmd: 'brand new [make]', desc: 'Show unregistered / zero meter', example: 'brand new Honda' },
      { cmd: '[color] [make] [year]', desc: 'Multi-filter combination', example: 'black BMW 2023' },
    ],
  },
  {
    label: 'Recommendations', icon: Lightbulb, color: 'text-yellow-400',
    entries: [
      { cmd: 'recommend [purpose] car budget [amount]', desc: 'Rule-based car recommendation by purpose and budget', example: 'recommend family car budget 80 lakh' },
      { cmd: 'suggest city car under [amount]', desc: 'City commuter recommendation', example: 'suggest city car under 50 lakh' },
      { cmd: 'best offroad car budget [amount]', desc: 'Off-road vehicle recommendation', example: 'best offroad car budget 2 crore' },
      { cmd: 'ideal business car [amount]', desc: 'Business/executive vehicle suggestion', example: 'ideal business car 1.5 crore' },
      { cmd: 'recommend [seats] seat car [fuel]', desc: 'Seat count + fuel preference', example: 'recommend 7 seat car hybrid' },
    ],
  },
  {
    label: 'Comparison', icon: GitCompare, color: 'text-purple-400',
    entries: [
      { cmd: 'compare [make1] [make2]', desc: 'Side-by-side spec comparison', example: 'compare BYD Shark Toyota Hilux' },
      { cmd: 'compare [model1] vs [model2]', desc: 'VS comparison between two models', example: 'compare Civic vs Corolla' },
      { cmd: '[model1] versus [model2]', desc: 'Natural language comparison', example: 'Sportage versus Tucson' },
    ],
  },
  {
    label: 'Finance Calculator', icon: Calculator, color: 'text-orange-400',
    entries: [
      { cmd: 'calculate [price] [down]% down [tenure] year [markup]% markup', desc: 'Full finance breakdown', example: 'calculate 5M car 20% down 5 year 15% markup' },
      { cmd: 'installment [price] [tenure] year', desc: 'Quick installment estimate', example: 'installment 80 lakh 3 year' },
      { cmd: 'monthly [price] [down pct]% down payment', desc: 'Monthly payment with down %', example: 'monthly 1 crore 30% down payment' },
      { cmd: 'finance [make] [model]', desc: 'Calculate finance for a found vehicle', example: 'finance Toyota Prado' },
    ],
  },
  {
    label: 'Bulk Operations', icon: Layers, color: 'text-pink-400',
    entries: [
      { cmd: 'increase all [make] prices by [n]%', desc: 'Bulk price increase for a make', example: 'increase all Toyota prices by 5%' },
      { cmd: 'decrease [make] prices by [n]%', desc: 'Bulk price reduction', example: 'decrease Honda prices by 3%' },
      { cmd: 'mark all [make] sold', desc: 'Bulk status update to sold', example: 'mark all Suzuki sold' },
      { cmd: 'archive [make] vehicles', desc: 'Archive all vehicles of a make', example: 'archive Nissan vehicles' },
      { cmd: 'export [make] csv', desc: 'Export filtered vehicles', example: 'export Toyota csv' },
    ],
  },
  {
    label: 'Inventory Admin', icon: Plus, color: 'text-emerald-400',
    entries: [
      { cmd: 'add vehicle [make] [model]', desc: 'Navigate to add a new vehicle', example: 'add vehicle Honda City' },
      { cmd: 'edit [make] [model]', desc: 'Navigate to edit a vehicle', example: 'edit Toyota Corolla' },
      { cmd: 'delete [make] [model]', desc: 'Navigate to delete a vehicle (requires confirmation)', example: 'delete Suzuki Alto' },
      { cmd: 'create lead [name]', desc: 'Navigate to add a new lead', example: 'create lead Ahmed Khan' },
      { cmd: 'new quotation [make] [model]', desc: 'Start a new quotation', example: 'new quotation KIA Sportage' },
    ],
  },
  {
    label: 'Synonyms & Shortcuts', icon: Hash, color: 'text-cyan-400',
    entries: [
      { cmd: 'zero meter / unregistered', desc: 'Resolves to: brand new', example: 'zero meter Honda' },
      { cmd: 'EV / electric vehicle', desc: 'Resolves to: electric fuel type', example: 'EV SUV available' },
      { cmd: 'jeep / 4x4 / off road', desc: 'Resolves to: SUV body type', example: 'jeep under 80 lakh' },
      { cmd: 'petrol / gasoline', desc: 'Resolves to: petrol fuel type', example: 'gasoline hatchback' },
      { cmd: 'auto / automatic', desc: 'Resolves to: automatic transmission', example: 'auto civic cheapest' },
      { cmd: 'cr / crore', desc: 'Price unit: 1 cr = 10,000,000 PKR', example: '2 cr SUV' },
      { cmd: 'lakh / lac', desc: 'Price unit: 1 lakh = 100,000 PKR', example: 'under 80 lac' },
    ],
  },
  {
    label: 'Create Records', icon: PlusCircle, color: 'text-emerald-400',
    entries: [
      { cmd: 'add vehicle [make] [model] [year]', desc: 'Opens inline form to add a new vehicle listing directly', example: 'add vehicle Toyota Vitz 2023' },
      { cmd: 'add [color] [make] [model] [price]', desc: 'Add vehicle with colour and price pre-filled', example: 'add white Honda City 3500000' },
      { cmd: 'create vehicle [make] [model] [fuel]', desc: 'New vehicle with fuel type', example: 'create vehicle KIA Sportage hybrid' },
      { cmd: 'new [make] [model] [transmission] [price]', desc: 'New listing with transmission and price', example: 'new Toyota Corolla automatic 45 lakh' },
      { cmd: 'add lead [customer name]', desc: 'Opens inline form to create a new CRM lead', example: 'add lead Ahmed Khan' },
      { cmd: 'create lead [name] [phone]', desc: 'New lead with phone number', example: 'create lead Sara Ahmed 03001234567' },
      { cmd: 'create customer [name] budget [amount]', desc: 'New lead with budget pre-filled', example: 'create customer Ali Raza budget 80 lakh' },
      { cmd: 'new quotation [make] [model]', desc: 'Open quotations page for a new quote', example: 'new quotation KIA Sportage' },
    ],
  },
  {
    label: 'Update & Delete', icon: Edit3, color: 'text-yellow-400',
    entries: [
      { cmd: 'update [make] [model] price to [amount]', desc: 'Navigate to vehicle to update its price', example: 'update Toyota Corolla price to 45 lakh' },
      { cmd: 'mark [make] [model] sold', desc: 'Find vehicle and navigate to mark it sold', example: 'mark Honda Civic sold' },
      { cmd: 'mark [make] [model] reserved', desc: 'Find vehicle and mark as reserved', example: 'mark Toyota Prado reserved' },
      { cmd: 'archive [make] [model]', desc: 'Archive a vehicle from active inventory', example: 'archive Suzuki Alto 2020' },
      { cmd: 'delete vehicle [make] [model]', desc: 'Navigate to vehicle detail for deletion (requires confirmation)', example: 'delete vehicle Nissan Dayz' },
      { cmd: 'close lead [name]', desc: 'Navigate to lead and mark as closed/won', example: 'close lead Ahmed Khan' },
    ],
  },
  {
    label: 'Navigation Shortcuts', icon: ArrowRight, color: 'text-cyan-400',
    entries: [
      { cmd: 'go to inventory', desc: 'Open the full inventory list', example: 'go to inventory' },
      { cmd: 'go to leads', desc: 'Open the CRM / leads page', example: 'go to leads' },
      { cmd: 'go to analytics', desc: 'Open the analytics dashboard', example: 'go to analytics' },
      { cmd: 'go to invoices', desc: 'Open the invoicing page', example: 'go to invoices' },
      { cmd: 'go to import calculator', desc: 'Open the import duty calculator', example: 'go to import calculator' },
      { cmd: 'go to shipments', desc: 'Open shipment tracking', example: 'go to shipments' },
      { cmd: 'go to auction guide', desc: 'Open the Japanese auction guide', example: 'go to auction guide' },
      { cmd: 'go to settings', desc: 'Open the settings page', example: 'go to settings' },
      { cmd: 'go to finance', desc: 'Open the finance plans page', example: 'go to finance' },
      { cmd: 'go to marketing', desc: 'Open the marketing campaigns page', example: 'go to marketing' },
      { cmd: 'go to expenses', desc: 'Open the expenses tracker', example: 'go to expenses' },
      { cmd: 'go to transactions', desc: 'Open the transaction book', example: 'go to transactions' },
    ],
  },
  {
    label: 'Analytics & Reports', icon: BarChart3, color: 'text-indigo-400',
    entries: [
      { cmd: 'show analytics', desc: 'Navigate to analytics dashboard', example: 'show analytics' },
      { cmd: 'recently added vehicles', desc: 'Show the newest inventory listings', example: 'recently added vehicles' },
      { cmd: 'show available [make]', desc: 'All available vehicles for a make', example: 'show available Toyota' },
      { cmd: 'show sold last month', desc: 'Vehicles sold in the last 30 days', example: 'show sold last month' },
      { cmd: 'total [make] in stock', desc: 'Count of a make currently available', example: 'total Honda in stock' },
      { cmd: 'show all SUVs available', desc: 'Available SUVs across all makes', example: 'show all SUVs available' },
      { cmd: 'pending leads', desc: 'Show all open / new leads', example: 'pending leads' },
      { cmd: 'hot leads', desc: 'Show leads with high lead score', example: 'hot leads' },
      { cmd: 'show quotations', desc: 'Navigate to quotations list', example: 'show quotations' },
      { cmd: 'show expenses', desc: 'Navigate to expenses tracker', example: 'show expenses' },
    ],
  },
  {
    label: 'Synonyms & Shortcuts', icon: Hash, color: 'text-purple-400',
    entries: [
      { cmd: 'zero meter / unregistered', desc: 'Resolves to: brand new condition', example: 'zero meter Honda' },
      { cmd: 'EV / electric vehicle', desc: 'Resolves to: Electric fuel type', example: 'EV SUV available' },
      { cmd: 'jeep / 4x4 / off road', desc: 'Resolves to: SUV body type', example: 'jeep under 80 lakh' },
      { cmd: 'gasoline / petrol', desc: 'Resolves to: Petrol fuel type', example: 'gasoline hatchback cheapest' },
      { cmd: 'auto / automatic gearbox', desc: 'Resolves to: Automatic transmission', example: 'auto civic cheapest' },
      { cmd: '1 crore / 1 cr / 10M', desc: 'Price = PKR 10,000,000', example: 'SUV under 1 crore' },
      { cmd: '1 lakh / 1 lac', desc: 'Price = PKR 100,000', example: 'under 80 lac automatic' },
      { cmd: 'Vigo / Surf / Land Cruiser', desc: 'Recognised popular model names', example: 'show Vigo available' },
      { cmd: 'Cultus / Alto / Mehran', desc: 'Suzuki model shortcuts', example: 'cheapest Cultus 2022' },
    ],
  },
];

// ─── Command Dictionary Panel ─────────────────────────────────────────────────
function CommandDictionary({ onCommand }: { onCommand: (cmd: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return CMD_DICTIONARY;
    const q = search.toLowerCase();
    return CMD_DICTIONARY.map(cat => ({
      ...cat,
      entries: cat.entries.filter(e =>
        e.cmd.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q) ||
        e.example.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.entries.length > 0);
  }, [search]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <Command className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">Command Dictionary</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {CMD_DICTIONARY.reduce((n, c) => n + c.entries.length, 0)} commands
        </span>
      </div>
      <div className="flex flex-col md:flex-row" style={{ minHeight: 340 }}>
        {/* Category sidebar */}
        <div className="flex flex-row md:flex-col gap-0.5 p-2 border-b md:border-b-0 md:border-r border-border md:w-48 shrink-0 overflow-x-auto md:overflow-x-visible">
          <div className="px-2 py-1.5 md:hidden">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-7 text-xs bg-muted/40 border-border/60"
            />
          </div>
          {CMD_DICTIONARY.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => { setActiveCategory(i); setSearch(''); }}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all whitespace-nowrap md:whitespace-normal text-xs font-medium',
                  activeCategory === i && !search
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', cat.color)} />
                <span className="hidden md:inline">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Entries */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 420 }}>
          <div className="hidden md:block px-4 py-3 border-b border-border/50">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands…"
              className="h-7 text-xs bg-muted/40 border-border/60"
            />
          </div>
          <div className="p-3 space-y-1.5">
            {(search ? filtered : [CMD_DICTIONARY[activeCategory]]).map(cat => (
              <div key={cat.label}>
                {search && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1.5 flex items-center gap-1.5">
                    <cat.icon className={cn('w-3 h-3', cat.color)} /> {cat.label}
                  </p>
                )}
                {cat.entries.map(entry => (
                  <div
                    key={entry.cmd}
                    className="group flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/40 transition-all cursor-pointer"
                    onClick={() => onCommand(entry.example)}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[11px] font-mono font-semibold text-foreground">{entry.cmd}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.desc}</p>
                      <p className="text-[10px] text-primary/70 font-mono">e.g. {entry.example}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onCommand(entry.example); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                      title="Run this example"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const QUICK_CMDS = [
  { label: 'White SUVs under 1 Cr', icon: Car, color: 'text-blue-400' },
  { label: 'Show available electric cars', icon: Zap, color: 'text-emerald-400' },
  { label: 'Find Civic RS cheapest', icon: Search, color: 'text-purple-400' },
  { label: 'Compare BYD Shark Tank 500', icon: GitCompare, color: 'text-primary' },
  { label: 'Recommend family car budget 80 lakh', icon: Lightbulb, color: 'text-yellow-400' },
  { label: 'Calculate 5M car 20% down 5 year 15% markup', icon: Calculator, color: 'text-orange-400' },
  { label: 'Show recently added vehicles', icon: Clock, color: 'text-muted-foreground' },
  { label: 'All automatic hybrid SUVs', icon: Filter, color: 'text-cyan-400' },
];

// ─── Types for Command Result ─────────────────────────────────────────────────
interface CmdResult {
  id: string;
  parsed: ParsedCommand;
  vehicles?: Vehicle[];
  financeResult?: FinanceResult;
  financeInputs?: Record<string, any>;
  recResults?: Array<{ vehicle: Vehicle; score: number }>;
  compareVehicles?: Vehicle[];
  bulkPreview?: { make?: string; count: number; direction?: string; pct?: number };
  bulkVehicleIds?: string[];
  bulkPrices?: Record<string, number>;
  updateVehicles?: Vehicle[];  // vehicles matching UPDATE/DELETE query
  createPrefill?: Record<string, any>;
  createSuccess?: { type: string; name: string; id: string };
  exportData?: string;         // CSV string for EXPORT
  count?: number;
  timing: number;
  error?: string;
}

// ─── Update vehicle row — inline status + price edit ─────────────────────────
function UpdateVehicleRow({ vehicle: v }: { vehicle: Vehicle }) {
  const [status, setStatus] = useState<'available' | 'reserved' | 'booked' | 'sold' | 'incoming' | 'archived' | 'inspection'>(
    (v.status as 'available' | 'reserved' | 'booked' | 'sold' | 'incoming' | 'archived' | 'inspection') ?? 'available'
  );
  const [price, setPrice] = useState(String(v.expected_selling_price ?? ''));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('vehicles').update({
      status,
      expected_selling_price: price ? Number(price) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', v.id);
    setSaving(false);
    if (error) { toast.error('Update failed: ' + error.message); return; }
    toast.success(`✅ ${v.make} ${v.model} updated`);
    setDone(true);
  };

  return (
    <div className={cn('rounded-xl border p-3 space-y-2.5 bg-card transition-all', done ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-border')}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-6 rounded bg-muted shrink-0 overflow-hidden">
          {v.cover_image_url && <img src={v.cover_image_url} className="w-full h-full object-cover" alt="" />}
        </div>
        <p className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">
          {v.make} {v.model} {v.variant ?? ''} {v.model_year}
        </p>
        {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
      </div>
      {!done && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as typeof status)}
            className="flex-1 min-w-[120px] h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground"
          >
            {['available','reserved','sold','archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Price PKR"
            className="flex-1 min-w-[100px] h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground"
          />
          <Button size="sm" className="h-7 text-xs gap-1 shrink-0" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {saving ? '…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Delete vehicle row — per-row confirm ─────────────────────────────────────
function DeleteVehicleRow({ vehicle: v }: { vehicle: Vehicle }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    setDeleting(false);
    if (error) { toast.error('Delete failed: ' + error.message); return; }
    toast.success(`🗑️ ${v.make} ${v.model} deleted`);
    setDeleted(true);
  };

  if (deleted) return null;
  return (
    <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 flex items-center gap-2">
      <div className="w-8 h-6 rounded bg-muted shrink-0 overflow-hidden">
        {v.cover_image_url && <img src={v.cover_image_url} className="w-full h-full object-cover" alt="" />}
      </div>
      <p className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
        {v.make} {v.model} {v.variant ?? ''} {v.model_year}
      </p>
      {!confirming && (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-400/30 text-red-400 hover:bg-red-400/10 shrink-0" onClick={() => setConfirming(true)}>
          <Trash2 className="w-3 h-3" /> Delete
        </Button>
      )}
      {confirming && (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs gap-1 bg-red-500 hover:bg-red-600 text-white" disabled={deleting} onClick={doDelete}>
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            {deleting ? '…' : 'Confirm'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Vehicle mini card ────────────────────────────────────────────────────────
function VehicleMiniCard({ v, score }: { v: Vehicle; score?: number }) {
  return (
    <Link to={`/inventory/${v.id}`} className="block group">
      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card/80 hover:border-primary/40 hover:bg-card transition-all">
        <div className="w-12 h-9 rounded-md bg-muted border border-border/40 overflow-hidden shrink-0">
          {v.cover_image_url
            ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
            : <Car className="w-4 h-4 text-muted-foreground m-auto mt-2.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{v.make} {v.model} {v.variant}</p>
          <p className="text-[10px] text-muted-foreground">{v.color} · {v.model_year} · {v.mileage != null ? formatMileage(v.mileage) : 'N/A'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-foreground">{formatCurrency(v.expected_selling_price)}</p>
          {score !== undefined && (
            <div className="flex items-center gap-0.5 justify-end">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-semibold">{score}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Finance result card ──────────────────────────────────────────────────────
function FinanceCard({ r, inputs }: { r: FinanceResult; inputs: Record<string, any> }) {
  const rows = [
    { label: 'Vehicle Price', val: formatCurrency(r.vehiclePrice), accent: false },
    { label: `Down Payment (${inputs.down_pct ?? 20}%)`, val: formatCurrency(r.downPayment), accent: false },
    { label: 'Loan Amount', val: formatCurrency(r.loanAmount), accent: false },
    { label: `Tenure`, val: `${r.tenure} months (${r.tenure / 12} yrs)`, accent: false },
    { label: `Markup Rate`, val: `${r.markupPct}% p.a.`, accent: false },
    { label: 'Monthly Installment', val: formatCurrency(r.monthlyInstallment), accent: true },
    { label: 'Total Markup', val: formatCurrency(r.totalMarkup), accent: false },
    { label: 'Total Payable', val: formatCurrency(r.totalPayable), accent: true },
  ];
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 mt-2">
      <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Finance Breakdown</p>
      {rows.map(row => (
        <div key={row.label} className={cn('flex justify-between text-xs', row.accent ? 'font-bold text-foreground' : 'text-muted-foreground')}>
          <span>{row.label}</span>
          <span className={row.accent ? 'text-primary' : ''}>{row.val}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────
function CompareTable({ vehicles }: { vehicles: Vehicle[] }) {
  const rows = [
    { label: 'Price', fn: (v: Vehicle) => formatCurrency(v.expected_selling_price) },
    { label: 'Year', fn: (v: Vehicle) => v.model_year?.toString() ?? '—' },
    { label: 'Mileage', fn: (v: Vehicle) => v.mileage != null ? formatMileage(v.mileage) : '—' },
    { label: 'Fuel', fn: (v: Vehicle) => v.fuel_type ?? '—' },
    { label: 'Transmission', fn: (v: Vehicle) => v.transmission ?? '—' },
    { label: 'Color', fn: (v: Vehicle) => v.color ?? '—' },
    { label: 'Status', fn: (v: Vehicle) => v.status ?? '—' },
    { label: 'Body Type', fn: (v: Vehicle) => v.body_type ?? '—' },
  ];
  return (
    <div className="overflow-x-auto mt-2 rounded-xl border border-border">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="bg-muted/60">
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Spec</th>
            {vehicles.map(v => (
              <th key={v.id} className="text-left px-3 py-2 text-[10px] font-semibold text-foreground whitespace-nowrap">
                {v.make} {v.model}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-t border-border/50 hover:bg-muted/20">
              <td className="px-3 py-2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
              {vehicles.map(v => (
                <td key={v.id} className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{row.fn(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Command Center ──────────────────────────────────────────────────────
export default function CommandCenterPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CmdResult[]>([]);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>(getHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const [finCalc, setFinCalc] = useState({ price: '', down: '20', tenure: '60', markup: '15' });
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // callback when InlineCreateForm successfully saves
  const handleCreateSuccess = useCallback((newId: string, resultId: string, type: string, name: string) => {
    setResults(prev => prev.map(r =>
      r.id === resultId ? { ...r, createSuccess: { type, name, id: newId } } : r
    ));
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [results]);

  // ── Keyboard shortcut: Ctrl/Cmd+Shift+K to focus ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const execute = useCallback(async (rawCmd?: string) => {
    const cmd = (rawCmd ?? query).trim();
    if (!cmd || running) return;
    setQuery('');
    setRunning(true);
    setShowHistory(false);
    pushHistory(cmd);
    setHistory(getHistory());

    const t0 = performance.now();
    const parsed = parseCommand(cmd);
    const id = Date.now().toString();

    // ── Resilient vehicle query directly via Supabase (no Edge Function) ──────
    async function queryVehicles(filters: Record<string, any>, limit = 30): Promise<Vehicle[]> {
      let q = supabase
        .from('vehicles')
        .select('*, dealer:dealers!dealer_id(id,name,phone,city,rating), dealership:dealerships!dealership_id(id,name,city)')
        .limit(limit);

      if (filters.make)         q = q.ilike('make', `%${filters.make}%`);
      if (filters.model)        q = q.or(`model.ilike.%${filters.model}%,variant.ilike.%${filters.model}%`);
      if (filters.status)       q = q.eq('status', filters.status);
      if (filters.fuel_type)    q = q.ilike('fuel_type', `%${filters.fuel_type}%`);
      if (filters.min_price)    q = q.gte('expected_selling_price', filters.min_price);
      if (filters.max_price)    q = q.lte('expected_selling_price', filters.max_price);
      if (filters.color)        q = q.ilike('color', `%${filters.color}%`);
      if (filters.transmission) q = q.ilike('transmission', `%${filters.transmission}%`);
      if (filters.year)         q = q.eq('model_year', filters.year);

      const orderCol = filters.orderBy ?? 'created_at';
      const orderAsc = filters.orderDir === 'asc';
      q = q.order(orderCol, { ascending: orderAsc });

      const { data, error } = await q;
      if (error) throw new Error(`DB error: ${error.message}`);
      return Array.isArray(data) ? (data as Vehicle[]) : [];
    }

    try {
      // ── SEARCH / RECOMMEND / COMPARE / EXPORT ──
      if (['SEARCH', 'RECOMMEND', 'COMPARE', 'EXPORT', 'UNKNOWN'].includes(parsed.intent)) {
        const { filters } = parsed;
        let vehicles = await queryVehicles(filters, 40);

        // Post-filter for fields not supported as direct Supabase params
        if (filters.max_mileage)   vehicles = vehicles.filter(v => (v.mileage ?? Infinity) <= filters.max_mileage);
        if (filters.body_type)     vehicles = vehicles.filter(v => v.body_type?.toLowerCase().includes(filters.body_type.toLowerCase()));

        const timing = Math.round(performance.now() - t0);

        if (parsed.intent === 'RECOMMEND') {
          const scored = vehicles
            .map(v => ({ vehicle: v, score: scoreVehicle(v, filters) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
          setResults(prev => [...prev, { id, parsed, recResults: scored, count: scored.length, timing }]);
        } else if (parsed.intent === 'COMPARE') {
          setResults(prev => [...prev, { id, parsed, compareVehicles: vehicles.slice(0, 6), count: vehicles.length, timing }]);
        } else if (parsed.intent === 'EXPORT') {
          // Build real CSV string
          const cols = ['id','make','model','variant','model_year','fuel_type','transmission','body_type','color','mileage','expected_selling_price','status','vehicle_condition','owner_type'];
          const header = cols.join(',');
          const rows = vehicles.map(v =>
            cols.map(c => {
              const val = (v as any)[c] ?? '';
              return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(',')
          );
          const csv = [header, ...rows].join('\n');
          setResults(prev => [...prev, { id, parsed, vehicles: vehicles.slice(0, 20), count: vehicles.length, exportData: csv, timing }]);
        } else {
          setResults(prev => [...prev, { id, parsed, vehicles: vehicles.slice(0, 20), count: vehicles.length, timing }]);
        }
      }

      // ── CALCULATE ──
      else if (parsed.intent === 'CALCULATE') {
        const { filters } = parsed;
        const price = filters.vehicle_price ?? 5_000_000;
        const downPct = filters.down_pct ?? 20;
        const tenureMonths = filters.tenure_months ?? 60;
        const markupPct = filters.markup_pct ?? 15;
        const fin = calcFinance(price, downPct, tenureMonths, markupPct);
        const timing = Math.round(performance.now() - t0);
        setResults(prev => [...prev, { id, parsed, financeResult: fin, financeInputs: filters, timing }]);
      }

      // ── BULK — real DB execution ──
      else if (parsed.intent === 'BULK') {
        const { filters } = parsed;
        const qLowBulk = cmd.toLowerCase();

        // Detect bulk action type
        const isMarkSold = /mark.*sold|sold.*all/i.test(qLowBulk);
        const isMarkReserved = /mark.*reserved/i.test(qLowBulk);
        const isArchive = /archive/i.test(qLowBulk);
        const isPriceChange = !isMarkSold && !isMarkReserved && !isArchive;

        const vehicles = await queryVehicles({ make: filters.make }, 200);
        const timing = Math.round(performance.now() - t0);

        // If marking sold/reserved/archive — execute immediately
        if ((isMarkSold || isMarkReserved || isArchive) && vehicles.length > 0) {
          const newStatus = isMarkSold ? 'sold' : isMarkReserved ? 'reserved' : 'archived';
          const ids = vehicles.map(v => v.id);
          const { error: bulkErr } = await supabase
            .from('vehicles')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .in('id', ids);
          if (bulkErr) throw new Error(`Bulk update failed: ${bulkErr.message}`);
          toast.success(`✅ ${vehicles.length} vehicles marked as ${newStatus}`);
          setResults(prev => [...prev, {
            id, parsed, timing,
            bulkPreview: { make: filters.make, count: vehicles.length, direction: newStatus, pct: 0 },
          }]);
        } else {
          // Price change — show preview first, confirm button executes
          setResults(prev => [...prev, {
            id, parsed, timing,
            bulkPreview: { make: filters.make, count: vehicles.length, direction: filters.direction, pct: filters.pct },
            bulkVehicleIds: vehicles.map(v => v.id),
            bulkPrices: Object.fromEntries(vehicles.map(v => [v.id, v.expected_selling_price ?? 0])),
          }]);
        }
      }

      // ── CREATE — extract fields from command and prefill form data ──
      else if (parsed.intent === 'CREATE') {
        const { filters } = parsed;
        const qLow2 = cmd.toLowerCase();

        // Detect what kind of record to create
        let createType: 'vehicle' | 'lead' | 'quotation' = 'vehicle';
        if (/\blead\b|\bcustomer\b|\bclient\b/.test(qLow2)) createType = 'lead';
        else if (/\bquot(ation)?\b|\bquote\b/.test(qLow2)) createType = 'quotation';

        // Extract name/phone for leads
        let leadName = '';
        let leadPhone = '';
        const nameMatch = cmd.match(/(?:lead|customer|client)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        if (nameMatch) leadName = nameMatch[1].trim();
        const phoneMatch = cmd.match(/(?:0?3\d{9}|\+92\d{10})/);
        if (phoneMatch) leadPhone = phoneMatch[0];

        // Extract variant from command
        let variant = '';
        const variantMatch = cmd.match(/(?:Toyota|Honda|Suzuki|Kia|Hyundai|MG|BMW|Mercedes|Audi|Nissan|Mitsubishi|BYD|Chery|Proton|Haval|Isuzu|FAW|Changan)\s+(\w+)\s+(\w+)/i);
        if (variantMatch) variant = variantMatch[2];

        // Extract price from command
        let cmdPrice: number | undefined;
        const priceMatch2 = cmd.match(/([\d.,]+\s*(?:crore|cr|lakh|lac|m))/i);
        if (priceMatch2) cmdPrice = parsePKR(priceMatch2[1].replace(/\s+/g, '')) ?? undefined;

        const prefill = {
          type: createType,
          make: filters.make ?? '',
          model: filters.model ?? (variant || ''),
          model_year: filters.year ?? new Date().getFullYear(),
          fuel_type: filters.fuel_type ?? 'Petrol',
          transmission: filters.transmission ?? 'Automatic',
          color: filters.color ?? '',
          body_type: filters.body_type ?? '',
          expected_selling_price: cmdPrice ?? filters.max_price ?? undefined,
          status: 'available',
          vehicle_condition: 'used' as const,
          owner_type: 'own' as const,
          mileage: undefined as number | undefined,
          // Lead fields
          leadName,
          leadPhone,
          req_make: filters.make ?? '',
          req_model: filters.model ?? '',
          budget_max: cmdPrice ?? filters.max_price ?? undefined,
        };

        const timing = Math.round(performance.now() - t0);
        setResults(prev => [...prev, { id, parsed, createPrefill: prefill, timing }]);
      }

      // ── UPDATE — find matching vehicles and show inline edit options ──
      else if (parsed.intent === 'UPDATE') {
        const { filters } = parsed;
        const vehicles = await queryVehicles(filters, 20);
        const timing = Math.round(performance.now() - t0);
        setResults(prev => [...prev, { id, parsed, updateVehicles: vehicles, count: vehicles.length, timing }]);
      }

      // ── DELETE — find matching vehicles, require per-row confirmation ──
      else if (parsed.intent === 'DELETE') {
        const { filters } = parsed;
        const vehicles = await queryVehicles(filters, 20);
        const timing = Math.round(performance.now() - t0);
        setResults(prev => [...prev, { id, parsed, updateVehicles: vehicles, count: vehicles.length, timing }]);
      }

      // ── GOTO — instant navigation ──
      else if (parsed.intent === 'GOTO') {
        const timing = Math.round(performance.now() - t0);
        const path = parsed.filters.goto_path as string | undefined;
        setResults(prev => [...prev, { id, parsed, timing }]);
        if (path) {
          setTimeout(() => navigate(path), 400);
        }
      }

      // ── fallthrough ──
      else {
        const timing = Math.round(performance.now() - t0);
        setResults(prev => [...prev, { id, parsed, timing }]);
      }
    } catch (err: any) {
      const timing = Math.round(performance.now() - t0);
      setResults(prev => [...prev, { id, parsed, error: err?.message ?? 'Unexpected error', timing }]);
    } finally {
      setRunning(false);
    }
  }, [query, running]);

  const manualFinCalc = useMemo(() => {
    const price = parsePKR(finCalc.price) ?? 0;
    if (!price) return null;
    return calcFinance(price, parseFloat(finCalc.down) || 20, parseInt(finCalc.tenure) || 60, parseFloat(finCalc.markup) || 15);
  }, [finCalc]);

  const intentLabel: Record<Intent, { label: string; color: string; icon: React.ReactNode }> = {
    SEARCH:    { label: 'Search',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       icon: <Search className="w-3 h-3" /> },
    CREATE:    { label: 'Create',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <Plus className="w-3 h-3" /> },
    UPDATE:    { label: 'Update',      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Edit3 className="w-3 h-3" /> },
    DELETE:    { label: 'Delete',      color: 'text-red-400 bg-red-400/10 border-red-400/20',           icon: <Trash2 className="w-3 h-3" /> },
    COMPARE:   { label: 'Compare',     color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: <GitCompare className="w-3 h-3" /> },
    RECOMMEND: { label: 'Recommend',   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Lightbulb className="w-3 h-3" /> },
    CALCULATE: { label: 'Calculate',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: <Calculator className="w-3 h-3" /> },
    EXPORT:    { label: 'Export',      color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',       icon: <Download className="w-3 h-3" /> },
    BULK:      { label: 'Bulk Op',     color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',       icon: <BarChart3 className="w-3 h-3" /> },
    GOTO:      { label: 'Navigate',    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',       icon: <ArrowRight className="w-3 h-3" /> },
    UNKNOWN:   { label: 'Search',      color: 'text-muted-foreground bg-muted border-border',          icon: <Search className="w-3 h-3" /> },
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* ── Glassy top bar ── */}
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') execute();
                    if (e.key === 'Escape') { setQuery(''); setShowHistory(false); }
                  }}
                  placeholder="Type a command — 'white SUVs under 1 crore', 'compare Civic Corolla', 'recommend family car 80 lakh'…"
                  className="pl-9 pr-24 h-10 bg-muted/40 border-border/60 text-sm font-mono placeholder:font-sans placeholder:text-xs"
                  disabled={running}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {query && (
                    <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground bg-muted">↵</kbd>
                </div>
              </div>
              {/* History dropdown */}
              <AnimatePresence>
                {showHistory && history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                    style={{ maxWidth: '100%' }}
                  >
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><History className="w-3 h-3" /> Recent commands</p>
                      <button onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }} className="text-[10px] text-muted-foreground hover:text-destructive">Clear</button>
                    </div>
                    {history.slice(0, 8).map(h => (
                      <button key={h} onMouseDown={() => execute(h)} className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted/60 flex items-center gap-2 transition-colors">
                        <RotateCcw className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{h}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => execute()} disabled={!query.trim() || running} className="h-10 px-4 shrink-0 gap-1.5">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span className="hidden sm:inline">{running ? 'Running…' : 'Execute'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDictOpen(v => !v)}
              className={cn('h-10 w-10 p-0 shrink-0 border-border transition-colors', dictOpen && 'bg-primary/10 border-primary/40 text-primary')}
              title="Command Dictionary"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* ── Command Dictionary ── */}
          <AnimatePresence>
            {dictOpen && (
              <motion.div
                key="dict"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <CommandDictionary onCommand={cmd => { setQuery(cmd); setDictOpen(false); inputRef.current?.focus(); }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Quick command chips ── */}
          {results.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* Hero */}
              <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Terminal className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Command Center v2.0</h1>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Deterministic search engine · zero AI · pattern matching · fuzzy typo correction · synonym resolution
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {(['SEARCH', 'COMPARE', 'RECOMMEND', 'CALCULATE', 'BULK'] as const).map(t => {
                    const cfg = intentLabel[t];
                    return (
                      <span key={t} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.color)}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Quick commands */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Bookmark className="w-3 h-3" /> Quick commands</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {QUICK_CMDS.map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      onClick={() => execute(label)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-card/80 hover:border-primary/40 hover:bg-card text-left transition-all group"
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', color)} />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground flex-1 min-w-0 truncate">{label}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Inline finance calculator */}
              <div>
                <button
                  onClick={() => setFinanceOpen(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Finance Calculator
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', financeOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {financeOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <Card className="mt-3 p-4 bg-card border-border space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {([
                            { key: 'price', label: 'Vehicle Price (PKR)', placeholder: '5000000' },
                            { key: 'down', label: 'Down Payment %', placeholder: '20' },
                            { key: 'tenure', label: 'Tenure (Months)', placeholder: '60' },
                            { key: 'markup', label: 'Markup % p.a.', placeholder: '15' },
                          ] as const).map(f => (
                            <div key={f.key} className="space-y-1">
                              <label className="text-[10px] text-muted-foreground font-medium">{f.label}</label>
                              <Input
                                value={finCalc[f.key]}
                                onChange={e => setFinCalc(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="h-8 text-xs bg-muted/40 border-border/60"
                              />
                            </div>
                          ))}
                        </div>
                        {manualFinCalc && <FinanceCard r={manualFinCalc} inputs={{ down_pct: parseFloat(finCalc.down) }} />}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Results feed ── */}
          <AnimatePresence initial={false}>
            {results.map(result => {
              const cfg = intentLabel[result.parsed.intent];
              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* Command header */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{result.parsed.raw}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border', cfg.color)}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {result.timing}ms
                        </span>
                        {result.count !== undefined && (
                          <span className="text-[10px] text-muted-foreground">{result.count} result{result.count !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(result.parsed.raw); toast.success('Copied!'); }}
                      className="text-muted-foreground hover:text-foreground shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Fuzzy corrections */}
                  {(result.parsed.fuzzyCorrections.length > 0 || result.parsed.synonymsApplied.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 pl-8">
                      {result.parsed.fuzzyCorrections.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                          <Zap className="w-2.5 h-2.5" /> Corrected: {c}
                        </span>
                      ))}
                      {result.parsed.synonymsApplied.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-400/10 border border-blue-400/20 text-blue-400">
                          <BookOpen className="w-2.5 h-2.5" /> Synonym: {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {result.error && (
                    <div className="pl-8">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {result.error}
                      </div>
                    </div>
                  )}

                  {/* Vehicle results */}
                  {result.vehicles && result.vehicles.length > 0 && (
                    <div className="pl-8 space-y-1.5">
                      {result.vehicles.map(v => <VehicleMiniCard key={v.id} v={v} />)}
                    </div>
                  )}
                  {result.vehicles && result.vehicles.length === 0 && !result.error && (
                    <div className="pl-8">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
                        <Search className="w-3.5 h-3.5" /> No matching vehicles found — try refining your query or check spelling.
                      </div>
                    </div>
                  )}

                  {/* Recommendation results */}
                  {result.recResults && result.recResults.length > 0 && (
                    <div className="pl-8 space-y-1.5">
                      <p className="text-[10px] font-semibold text-yellow-400 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" /> Rule-based recommendations (by match score)</p>
                      {result.recResults.map(({ vehicle: v, score }) => <VehicleMiniCard key={v.id} v={v} score={score} />)}
                    </div>
                  )}

                  {/* Compare table */}
                  {result.compareVehicles && result.compareVehicles.length > 0 && (
                    <div className="pl-8">
                      <p className="text-[10px] font-semibold text-purple-400 flex items-center gap-1.5 mb-2"><GitCompare className="w-3 h-3" /> Side-by-side comparison</p>
                      <CompareTable vehicles={result.compareVehicles} />
                    </div>
                  )}

                  {/* Finance result */}
                  {result.financeResult && result.financeInputs && (
                    <div className="pl-8">
                      <FinanceCard r={result.financeResult} inputs={result.financeInputs} />
                    </div>
                  )}

                  {/* Export CSV download */}
                  {result.exportData && (
                    <div className="pl-8">
                      <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <p className="text-xs text-cyan-300 flex-1">
                          CSV ready — <span className="font-bold">{result.count}</span> vehicles
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
                          onClick={() => {
                            const blob = new Blob([result.exportData!], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `inventory-export-${Date.now()}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('CSV downloaded!');
                          }}
                        >
                          <Download className="w-3 h-3" /> Download CSV
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Bulk preview — real DB execution on confirm */}
                  {result.bulkPreview && (
                    <div className="pl-8">
                      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                          {result.bulkVehicleIds
                            ? 'Bulk price change — confirm to execute'
                            : `Bulk operation complete — ${result.bulkPreview.direction}`}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground">Affected vehicles</p>
                            <p className="font-bold text-foreground">{result.bulkPreview.count}</p>
                          </div>
                          {result.bulkPreview.make && (
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground">Make filter</p>
                              <p className="font-bold text-foreground">{result.bulkPreview.make}</p>
                            </div>
                          )}
                          {result.bulkPreview.direction && (
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground">Operation</p>
                              <p className="font-bold text-foreground capitalize">
                                {result.bulkPreview.pct
                                  ? `Price ${result.bulkPreview.direction} by ${result.bulkPreview.pct}%`
                                  : `Mark as ${result.bulkPreview.direction}`}
                              </p>
                            </div>
                          )}
                        </div>
                        {/* Only show confirm/cancel for pending price changes */}
                        {result.bulkVehicleIds && result.bulkPrices && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs h-8"
                              onClick={() => setResults(prev => prev.map(r => r.id === result.id ? { ...r, bulkVehicleIds: undefined, bulkPrices: undefined } : r))}>
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" className="flex-1 text-xs h-8 gap-1.5"
                              onClick={async () => {
                                const ids = result.bulkVehicleIds!;
                                const prices = result.bulkPrices!;
                                const pct = result.bulkPreview!.pct ?? 0;
                                const dir = result.bulkPreview!.direction ?? 'increase';
                                const mult = dir === 'increase' ? (1 + pct / 100) : (1 - pct / 100);
                                try {
                                  await Promise.all(ids.map(vid =>
                                    supabase.from('vehicles').update({
                                      expected_selling_price: Math.round((prices[vid] ?? 0) * mult),
                                      updated_at: new Date().toISOString(),
                                    }).eq('id', vid)
                                  ));
                                  toast.success(`✅ Prices updated on ${ids.length} vehicles`);
                                  setResults(prev => prev.map(r =>
                                    r.id === result.id ? { ...r, bulkVehicleIds: undefined, bulkPrices: undefined } : r
                                  ));
                                } catch (e: any) {
                                  toast.error('Bulk update failed: ' + e.message);
                                }
                              }}>
                              <Check className="w-3 h-3" /> Confirm & Execute
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CREATE — inline form that actually saves to DB */}
                  {result.parsed.intent === 'CREATE' && result.createPrefill && !result.error && (
                    <div className="pl-8">
                      <InlineCreateForm
                        prefill={result.createPrefill}
                        resultId={result.id}
                        onSuccess={handleCreateSuccess}
                      />
                    </div>
                  )}

                  {/* UPDATE — show matching vehicles with inline status/price edit */}
                  {result.parsed.intent === 'UPDATE' && result.updateVehicles && !result.error && (
                    <div className="pl-8 space-y-2">
                      <p className="text-[10px] font-semibold text-yellow-400 flex items-center gap-1.5">
                        <Edit3 className="w-3 h-3" /> {result.updateVehicles.length} vehicle{result.updateVehicles.length !== 1 ? 's' : ''} found — select one to edit
                      </p>
                      {result.updateVehicles.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
                          <Search className="w-3.5 h-3.5" /> No matching vehicles — refine your query.
                        </div>
                      )}
                      {result.updateVehicles.map(v => (
                        <UpdateVehicleRow key={v.id} vehicle={v} />
                      ))}
                    </div>
                  )}

                  {/* DELETE — show matching vehicles with per-row confirm */}
                  {result.parsed.intent === 'DELETE' && result.updateVehicles && !result.error && (
                    <div className="pl-8 space-y-2">
                      <p className="text-[10px] font-semibold text-red-400 flex items-center gap-1.5">
                        <Trash2 className="w-3 h-3" /> {result.updateVehicles.length} vehicle{result.updateVehicles.length !== 1 ? 's' : ''} found — confirm each deletion
                      </p>
                      {result.updateVehicles.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
                          <Search className="w-3.5 h-3.5" /> No matching vehicles — refine your query.
                        </div>
                      )}
                      {result.updateVehicles.map(v => (
                        <DeleteVehicleRow key={v.id} vehicle={v} />
                      ))}
                    </div>
                  )}

                  {/* GOTO — navigation confirmation */}
                  {result.parsed.intent === 'GOTO' && !result.error && (
                    <div className="pl-8">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <p className="text-xs text-cyan-400 font-medium">
                          Navigating to <span className="font-bold">{result.parsed.filters.goto_label ?? result.parsed.filters.goto_path ?? 'page'}</span>…
                        </p>
                        {result.parsed.filters.goto_path && (
                          <Button asChild size="sm" variant="outline" className="ml-auto text-xs h-6 gap-1">
                            <Link to={result.parsed.filters.goto_path as string}>
                              <ArrowRight className="w-3 h-3" /> Go now
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator className="opacity-40" />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Running indicator */}
          {running && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 py-4">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-mono">Executing command…</span>
            </motion.div>
          )}

          {/* Clear results */}
          {results.length > 0 && !running && (
            <div className="flex justify-center pb-4">
              <Button variant="ghost" size="sm" onClick={() => setResults([])} className="text-xs text-muted-foreground gap-1.5 h-7">
                <X className="w-3 h-3" /> Clear results
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </AppLayout>
  );
}
