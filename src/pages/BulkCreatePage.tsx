import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Sparkles, CheckCircle2, XCircle, Loader2, Trash2,
  AlertTriangle, Car, ChevronDown, ChevronUp, ClipboardPaste, X,
  Save, RefreshCw, Info, Zap, Eye, FileSearch, Users,
  FileUp, Download, Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { createVehicle, createInquiry, fetchDealers } from '@/lib/api';
import type { Vehicle, Dealer, Inquiry } from '@/types/types';

// ─── CSV Import Tab ───────────────────────────────────────────────────────────
const CSV_SAMPLE = `make,model,variant,year,color,mileage,price,transmission,fuel_type,origin
Toyota,Corolla,GLI,2022,White,25000,4800000,Automatic,Petrol,Local
Honda,Civic,Oriel,2021,Black,40000,5200000,Automatic,Petrol,Local
Suzuki,Swift,DLX,2023,Silver,8000,2850000,Manual,Petrol,Local`;

const CSV_FIELDS = ['make','model','variant','year','color','mileage','price','transmission','fuel_type','origin','description'] as const;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });
}

function CSVImportTab({ dealers, onImported }: { dealers: Dealer[]; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText]       = useState('');
  const [parsed,  setParsed]        = useState<Record<string, string>[]>([]);
  const [saving,  setSaving]        = useState(false);
  const [results, setResults]       = useState<{ ok: number; fail: number } | null>(null);
  const [defaultDealer, setDefaultDealer] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(parseCSV(text));
      setResults(null);
    };
    reader.readAsText(file);
  }

  function handlePaste(text: string) {
    setCsvText(text);
    setParsed(parseCSV(text));
    setResults(null);
  }

  async function importAll() {
    if (!parsed.length) return;
    setSaving(true);
    let ok = 0; let fail = 0;
    for (const row of parsed) {
      try {
        const v: Partial<Vehicle> = {
          make:         row.make         || undefined,
          model:        row.model        || undefined,
          variant:      row.variant      || undefined,
          model_year:   row.year ? Number(row.year) : undefined,
          color:        row.color        || undefined,
          mileage:      row.mileage ? Number(row.mileage) : undefined,
          expected_selling_price: row.price ? Number(row.price) : undefined,
          transmission: (row.transmission as Vehicle['transmission']) || undefined,
          fuel_type:    (row.fuel_type   as Vehicle['fuel_type'])   || undefined,
          origin:       (row.origin      as Vehicle['origin'])      || undefined,
          private_notes: row.description  || undefined,
          status:       'available',
        };
        await createVehicle(v as Vehicle);
        ok++;
      } catch { fail++; }
    }
    setSaving(false);
    setResults({ ok, fail });
    if (ok > 0) onImported();
    toast[ok > 0 ? 'success' : 'error'](`${ok} imported${fail ? `, ${fail} failed` : ''}`);
  }

  return (
    <div className="space-y-4 mt-3">
      {/* Template download */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
        <div>
          <p className="text-sm font-semibold text-foreground">CSV Template</p>
          <p className="text-xs text-muted-foreground">Download the template, fill it out, then upload below</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 border-border text-xs shrink-0"
          onClick={() => {
            const blob = new Blob([CSV_SAMPLE], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'wulfrayns-vehicle-template.csv'; a.click();
            toast.success('Template downloaded');
          }}>
          <Download className="w-3.5 h-3.5" />Download Template
        </Button>
      </div>

      {/* File upload */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileUp className="w-4 h-4 text-primary" />Upload CSV File
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl py-8 text-center text-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
            <FileUp className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Click to browse or drag a .csv file here
          </button>

          {/* Or paste directly */}
          <p className="text-xs text-muted-foreground text-center">— or paste CSV text below —</p>
          <textarea
            value={csvText}
            onChange={e => handlePaste(e.target.value)}
            placeholder={CSV_SAMPLE}
            className="w-full min-h-[120px] text-xs font-mono bg-muted/40 border border-border rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
          />

          {/* Default dealer */}
          {dealers.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Assign Dealer (optional)</label>
              <select value={defaultDealer} onChange={e => setDefaultDealer(e.target.value)}
                className="w-full h-9 text-xs px-3 rounded-md border border-border bg-muted/40 text-foreground">
                <option value="">— No dealer —</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsed.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Preview — {parsed.length} row{parsed.length !== 1 ? 's' : ''} detected</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1"
                onClick={() => { setCsvText(''); setParsed([]); setResults(null); if(fileRef.current) fileRef.current.value=''; }}>
                <X className="w-3 h-3" />Clear
              </Button>
              <Button size="sm" onClick={importAll} disabled={saving} className="h-7 text-xs gap-1.5">
                {saving ? <><Loader2 className="w-3 h-3 animate-spin" />Importing…</> : <><Save className="w-3 h-3" />Import All ({parsed.length})</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {CSV_FIELDS.filter(f => parsed[0]?.[f] !== undefined).map(f => (
                      <th key={f} className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap font-medium">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      {CSV_FIELDS.filter(f => parsed[0]?.[f] !== undefined).map(f => (
                        <td key={f} className="px-3 py-2 whitespace-nowrap text-foreground/80">{row[f] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.length > 10 && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">Showing first 10 of {parsed.length} rows</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${results.fail === 0 ? 'bg-green-400/10 border-green-400/25 text-green-400' : 'bg-amber-400/10 border-amber-400/25 text-amber-400'}`}>
          {results.fail === 0
            ? <><CheckCircle2 className="w-4 h-4 shrink-0" />{results.ok} vehicles imported successfully</>
            : <><AlertTriangle className="w-4 h-4 shrink-0" />{results.ok} imported · {results.fail} failed — check required fields</>}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtractedVehicle extends Partial<Vehicle> {
  _tempId: string;
  _status: 'pending' | 'saving' | 'saved' | 'error';
  _error?: string;
  _expanded?: boolean;
  _dealerName?: string;
}

interface ExtractedRequirement {
  _tempId: string;
  _status: 'pending' | 'saving' | 'saved' | 'error';
  _error?: string;
  customer_name?: string;
  customer_phone?: string;
  req_make?: string;
  req_model?: string;
  req_variant?: string;
  req_color?: string;
  req_model_year?: number;
  req_reg_year?: number;
  req_mileage_max?: number;
  req_budget_max?: number;
  req_fuel_type?: string;
  req_transmission?: string;
  req_origin?: string;
  description?: string;
  priority?: string;
  notes?: string;
}

const STORAGE_KEY_CFG = 'wulfrayns_ai_sync_config';

function loadApiConfig(): { apiKey: string; baseUrl: string; model: string } | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY_CFG);
    if (!s) return null;
    const c = JSON.parse(s);
    return c.apiKey && c.baseUrl && c.model ? c : null;
  } catch { return null; }
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function FieldInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string | number | undefined; onChange: (v: string) => void;
  placeholder: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground mb-1 block">{label}</Label>
      <Input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="h-7 text-xs bg-muted/40 px-2" />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground mb-1 block">{label}</Label>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs bg-muted/40"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

// ─── Vehicle Card ──────────────────────────────────────────────────────────────
function VehicleCard({ v, dealers, onChange, onRemove, onSave }: {
  v: ExtractedVehicle; dealers: Dealer[];
  onChange: (id: string, key: string, val: unknown) => void;
  onRemove: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(v._expanded ?? true);
  const statusColor = {
    pending: 'border-border', saving: 'border-yellow-500/40 bg-yellow-500/5',
    saved: 'border-green-500/40 bg-green-500/5', error: 'border-red-500/40 bg-red-500/5',
  }[v._status];

  const f = (key: string, label: string, ph: string, type = 'text') => (
    <FieldInput label={label} value={(v as unknown as Record<string, unknown>)[key] as string | number | undefined}
      onChange={val => onChange(v._tempId, key, type === 'number' ? (Number(val) || undefined) : val)}
      placeholder={ph} type={type} />
  );

  return (
    <Card className={cn('border transition-colors', statusColor)}>
      <CardHeader className="px-4 py-2.5 flex flex-row items-center gap-2">
        <div className="shrink-0">
          {v._status === 'saving'  && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
          {v._status === 'saved'   && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {v._status === 'error'   && <XCircle className="w-4 h-4 text-red-400" />}
          {v._status === 'pending' && <Car className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {[v.make, v.model, v.variant, v.model_year].filter(Boolean).join(' ') || 'Unnamed Vehicle'}
          </p>
          {v._dealerName && <p className="text-[10px] text-muted-foreground truncate">Dealer: {v._dealerName}</p>}
          {v._error && <p className="text-[10px] text-red-400 truncate">{v._error}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(v._status === 'pending' || v._status === 'error') && (
            <Button size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => onSave(v._tempId)}>
              {v._status === 'error' ? <><RefreshCw className="w-3 h-3" />Retry</> : <><Save className="w-3 h-3" />Save</>}
            </Button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onRemove(v._tempId)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {expanded && v._status !== 'saved' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <CardContent className="px-4 pb-3 pt-0 space-y-2.5">
              <Separator />
              {/* Row 1: core identity */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('make', 'Make *', 'Toyota')}
                {f('model', 'Model *', 'Corolla')}
                {f('variant', 'Variant', 'Altis X')}
                {f('model_year', 'Model Year', '2024', 'number')}
              </div>
              {/* Row 2: reg + origin */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('registration_year', 'Reg Year', '2024', 'number')}
                {f('registration_number', 'Reg #', 'LEJ-1234')}
                <FieldSelect label="Transmission" value={v.transmission ?? ''} onChange={val => onChange(v._tempId, 'transmission', val)}
                  options={['Auto','Manual','CVT','Semi-Auto']} />
                <FieldSelect label="Fuel Type" value={v.fuel_type ?? ''} onChange={val => onChange(v._tempId, 'fuel_type', val)}
                  options={['Petrol','Diesel','Hybrid','Mild Hybrid','Electric','CNG','LPG']} />
              </div>
              {/* Row 3: color / mileage / engine */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('color', 'Color', 'White')}
                {f('mileage', 'Mileage (km)', '45000', 'number')}
                {f('engine_capacity', 'Engine CC', '1800')}
                <FieldSelect label="Origin" value={v.origin ?? ''} onChange={val => onChange(v._tempId, 'origin', val)}
                  options={['local','imported']} />
              </div>
              {/* Row 4: prices */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {f('expected_selling_price', 'Asking Price (PKR)', '4500000', 'number')}
                {f('purchase_price', 'Purchase Price (PKR)', '4000000', 'number')}
                <FieldSelect label="Status" value={v.status ?? 'available'} onChange={val => onChange(v._tempId, 'status', val)}
                  options={['available','reserved','booked','sold','incoming','urgent_sale','pending_docs']} />
              </div>
              {/* Row 5: condition extras */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <FieldSelect label="Condition" value={v.vehicle_condition ?? ''} onChange={val => onChange(v._tempId, 'vehicle_condition', val)}
                  options={['excellent','good','fair','needs_work']} />
                {f('vin', 'VIN / Chassis', 'ABC123')}
                {f('_dealerName', 'Dealer Name', 'ABC Motors')}
                {f('notes', 'Notes', 'Accident-free')}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Requirement Card ──────────────────────────────────────────────────────────
function ReqCard({ r, onChange, onRemove, onSave }: {
  r: ExtractedRequirement;
  onChange: (id: string, key: string, val: unknown) => void;
  onRemove: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const statusColor = {
    pending: 'border-border', saving: 'border-yellow-500/40 bg-yellow-500/5',
    saved: 'border-green-500/40 bg-green-500/5', error: 'border-red-500/40 bg-red-500/5',
  }[r._status];

  const f = (key: string, label: string, ph: string, type = 'text') => (
    <FieldInput label={label} value={(r as unknown as Record<string, unknown>)[key] as string | number | undefined}
      onChange={val => onChange(r._tempId, key, type === 'number' ? (Number(val) || undefined) : val)}
      placeholder={ph} type={type} />
  );

  return (
    <Card className={cn('border transition-colors', statusColor)}>
      <CardHeader className="px-4 py-2.5 flex flex-row items-center gap-2">
        <div className="shrink-0">
          {r._status === 'saving'  && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
          {r._status === 'saved'   && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {r._status === 'error'   && <XCircle className="w-4 h-4 text-red-400" />}
          {r._status === 'pending' && <Users className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {r.customer_name || 'Unnamed Buyer'} — {[r.req_make, r.req_model, r.req_variant].filter(Boolean).join(' ') || 'Any vehicle'}
          </p>
          {r.customer_phone && <p className="text-[10px] text-muted-foreground">{r.customer_phone}</p>}
          {r._error && <p className="text-[10px] text-red-400 truncate">{r._error}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(r._status === 'pending' || r._status === 'error') && (
            <Button size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => onSave(r._tempId)}>
              {r._status === 'error' ? <><RefreshCw className="w-3 h-3" />Retry</> : <><Save className="w-3 h-3" />Save</>}
            </Button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onRemove(r._tempId)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {expanded && r._status !== 'saved' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <CardContent className="px-4 pb-3 pt-0 space-y-2.5">
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('customer_name', 'Customer Name', 'Ahmed Raza')}
                {f('customer_phone', 'Phone', '0300-1234567')}
                {f('req_make', 'Wanted Make', 'Toyota')}
                {f('req_model', 'Wanted Model', 'Corolla')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('req_variant', 'Variant', 'Altis X')}
                {f('req_model_year', 'Model Year', '2023', 'number')}
                {f('req_reg_year', 'Reg Year', '2023', 'number')}
                {f('req_color', 'Color', 'White')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {f('req_budget_max', 'Budget (PKR)', '5500000', 'number')}
                {f('req_mileage_max', 'Max Mileage', '50000', 'number')}
                <FieldSelect label="Fuel Type" value={r.req_fuel_type ?? ''}
                  onChange={val => onChange(r._tempId, 'req_fuel_type', val)}
                  options={['Petrol','Diesel','Hybrid','Electric']} />
                <FieldSelect label="Transmission" value={r.req_transmission ?? ''}
                  onChange={val => onChange(r._tempId, 'req_transmission', val)}
                  options={['Auto','Manual','CVT']} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                <FieldSelect label="Origin" value={r.req_origin ?? ''}
                  onChange={val => onChange(r._tempId, 'req_origin', val)}
                  options={['any','local','imported']} />
                <FieldSelect label="Priority" value={r.priority ?? 'medium'}
                  onChange={val => onChange(r._tempId, 'priority', val)}
                  options={['low','medium','high','urgent']} />
                {f('notes', 'Notes', 'Any extra preferences')}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function BulkCreatePage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'requirements' | 'csv'>('stock');
  // Stock tab
  const [rawText, setRawText] = useState('');
  const [vehicles, setVehicles] = useState<ExtractedVehicle[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  // Requirements tab
  const [reqText, setReqText] = useState('');
  const [reqs, setReqs] = useState<ExtractedRequirement[]>([]);
  const [extractingReqs, setExtractingReqs] = useState(false);
  const [savingAllReqs, setSavingAllReqs] = useState(false);

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [aiConfig] = useState(() => loadApiConfig());
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const reqAreaRef  = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    fetchDealers({ pageSize: 200 }).then(res => setDealers(res.data)).catch(() => {});
  }, []);

  const uid = () => Math.random().toString(36).slice(2, 10);

  // ── Call AI ────────────────────────────────────────────────────────────────
  async function callAI(systemPrompt: string, userText: string): Promise<string> {
    if (!aiConfig) throw new Error('Configure AI model in AI Chatbot page first');
    const res = await fetch(`${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiConfig.apiKey}` },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // ── Extract Vehicles ────────────────────────────────────────────────────────
  const extractVehicles = useCallback(async () => {
    if (!rawText.trim()) { toast.error('Paste some text first'); return; }
    if (!aiConfig) { toast.error('Configure your AI model in AI Chatbot page first'); return; }
    setExtracting(true);
    try {
      const systemPrompt = `You are an expert car data extraction AI for a Pakistani car dealership CRM. Extract ALL vehicle listings from ANY raw input — WhatsApp messages, rough notes, shorthand, typos, Roman Urdu, mixed text, dealer lists, etc.

RETURN ONLY a valid JSON array. No markdown, no explanation.

FIELDS (null if unknown):
make, model, variant, model_year (number), registration_year (number), color, mileage (number, km), expected_selling_price (number, PKR), purchase_price (number, PKR), engine_capacity (string), fuel_type ("Petrol"|"Diesel"|"Hybrid"|"Mild Hybrid"|"Electric"|"CNG"), transmission ("Auto"|"Manual"|"CVT"), registration_number, origin ("local"|"imported"), vehicle_condition ("excellent"|"good"|"fair"|"needs_work"), status ("available"|"reserved"|"sold"), vin, dealer_name (string), notes (string)

PRICE PARSING: "45 lac"→4500000, "1 crore"→10000000, "4.5M"→4500000
YEAR: "22 model"→2022, "23 ka"→2023
BRANDS: "toy"→Toyota, "hun"→Honda, "suz"→Suzuki, etc.
MODELS: "corolla/corola/carolla"→Corolla, "civic/civick"→Civic, "alto"→Alto, etc.
COLORS (Roman Urdu): "safed"→White, "kala"→Black, "neela"→Blue, "lal"→Red, "chandi/silver"→Silver
TRANSMISSION: "auto/atm/aut"→Auto, "manual/manu/man"→Manual, "cvt"→CVT
MILEAGE: "45k"→45000, "1 lac km"→100000

Extract every vehicle. Never skip partial ones. Put extras in notes.`;
      const raw = await callAI(systemPrompt, rawText);
      // Extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found in AI response');
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
      const extracted: ExtractedVehicle[] = parsed.map((item: Record<string, unknown>) => ({
        _tempId: uid(),
        _status: 'pending' as const,
        _expanded: true,
        _error: undefined,
        _dealerName: (item.dealer_name as string) ?? '',
        make: (item.make as string) ?? '',
        model: (item.model as string) ?? '',
        variant: (item.variant as string) ?? undefined,
        model_year: (item.model_year as number) ?? undefined,
        reg_year: (item.reg_year as number) ?? undefined,
        color: (item.color as string) ?? undefined,
        mileage: (item.mileage as number) ?? undefined,
        transmission: (item.transmission as string) ?? undefined,
        fuel_type: (item.fuel_type as string) ?? undefined,
        engine_cc: (item.engine_cc as number) ?? undefined,
        origin: (item.origin as string) ?? undefined,
        expected_selling_price: (item.expected_selling_price as number) ?? undefined,
        purchase_price: (item.purchase_price as number) ?? undefined,
        dealer_city: (item.dealer_city as string) ?? undefined,
        notes: (item.notes as string) ?? undefined,
        status: (item.status as string) ?? 'available',
      } as ExtractedVehicle));
      setVehicles(prev => [...prev, ...extracted]);
      toast.success(`Extracted ${extracted.length} vehicle(s)`);
    } catch (err) {
      toast.error(`Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setExtracting(false); }
  }, [rawText, aiConfig]);

  // ── Extract Requirements ────────────────────────────────────────────────────
  const extractRequirements = useCallback(async () => {
    if (!reqText.trim()) { toast.error('Paste some text first'); return; }
    if (!aiConfig) { toast.error('Configure your AI model in AI Chatbot page first'); return; }
    setExtractingReqs(true);
    try {
      const systemPrompt = `You are an expert at extracting car buyer requirements from raw text for a Pakistani car dealer CRM. Extract ALL buyer requirements from WhatsApp messages, notes, shorthand, Roman Urdu, etc.

RETURN ONLY a valid JSON array. No markdown, no explanation.

FIELDS (null if unknown):
customer_name (string), customer_phone (string), req_make (string), req_model (string), req_variant (string), req_color (string), req_model_year (number), req_reg_year (number), req_budget_max (number PKR), req_mileage_max (number km), req_fuel_type ("Petrol"|"Diesel"|"Hybrid"|"Electric"), req_transmission ("Auto"|"Manual"|"CVT"), req_origin ("local"|"imported"|"any"), priority ("low"|"medium"|"high"|"urgent"), description (full requirement summary), notes (any extras)

PRICE: "45 lac"→4500000, "1 crore"→10000000
YEAR: "22 model"→2022, "2023 ka"→2023
ROMAN URDU: "safed"→White, "kala"→Black, "chandi"→Silver, "neela"→Blue

Extract every buyer requirement. If a message has multiple requirements (e.g., a list of buyers), create separate entries. Put all extra context in notes.`;
      const raw = await callAI(systemPrompt, reqText);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found in AI response');
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
      const extracted: ExtractedRequirement[] = parsed.map((item: Record<string, unknown>) => ({
        ...item,
        _tempId: uid(),
        _status: 'pending' as const,
        priority: (item.priority as string) ?? 'medium',
      }));
      setReqs(prev => [...prev, ...extracted]);
      toast.success(`Extracted ${extracted.length} requirement(s)`);
    } catch (err) {
      toast.error(`Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setExtractingReqs(false); }
  }, [reqText, aiConfig]);

  // ── Save Vehicle ────────────────────────────────────────────────────────────
  const saveSingle = useCallback(async (id: string) => {
    setVehicles(prev => prev.map(v => v._tempId === id ? { ...v, _status: 'saving' } : v));
    const v = vehicles.find(x => x._tempId === id);
    if (!v) return;
    if (!v.make || !v.model) {
      setVehicles(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'error', _error: 'Make and Model required' } : x));
      return;
    }
    try {
      let dealerId: string | undefined;
      if (v._dealerName && dealers.length > 0) {
        const name = v._dealerName.toLowerCase();
        const matched = dealers.find(d => d.name.toLowerCase().includes(name) || name.includes(d.name.toLowerCase()));
        if (matched) dealerId = matched.id;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _tempId, _status, _error, _expanded, _dealerName, ...rest } = v;
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(rest)) {
        if (val !== undefined && !(typeof val === 'object' && val !== null && !Array.isArray(val))) {
          payload[key] = val;
        }
      }
      if (dealerId) payload.dealer_id = dealerId;
      await createVehicle(payload as Partial<Vehicle>);
      setVehicles(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'saved', _expanded: false } : x));
      toast.success(`${v.make} ${v.model} saved`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setVehicles(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'error', _error: msg.slice(0, 120) } : x));
      toast.error(`Save failed: ${msg.slice(0, 60)}`);
    }
  }, [vehicles, dealers]);

  const saveAll = useCallback(async () => {
    const pending = vehicles.filter(v => v._status === 'pending' || v._status === 'error');
    if (!pending.length) { toast.info('No pending vehicles'); return; }
    setSavingAll(true);
    for (const v of pending) await saveSingle(v._tempId);
    setSavingAll(false);
    toast.success(`Processed ${pending.length} vehicle(s)`);
  }, [vehicles, saveSingle]);

  // ── Save Requirement ────────────────────────────────────────────────────────
  const saveReq = useCallback(async (id: string) => {
    setReqs(prev => prev.map(r => r._tempId === id ? { ...r, _status: 'saving' } : r));
    const r = reqs.find(x => x._tempId === id);
    if (!r) return;
    if (!r.customer_name && !r.customer_phone) {
      setReqs(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'error', _error: 'Customer name or phone required' } : x));
      return;
    }
    try {
      const { _tempId, _status, _error, ...fields } = r;
      void _tempId; void _status; void _error;
      const inquiry: Partial<Inquiry> = {
        customer_name: fields.customer_name ?? 'Unknown',
        customer_phone: fields.customer_phone,
        description: fields.description ?? [
          fields.req_make, fields.req_model, fields.req_variant,
          fields.req_model_year ? `(${fields.req_model_year})` : '',
          fields.req_budget_max ? `Budget: PKR ${fields.req_budget_max.toLocaleString()}` : '',
        ].filter(Boolean).join(' '),
        req_make: fields.req_make,
        req_model: fields.req_model,
        req_variant: fields.req_variant,
        req_color: fields.req_color,
        req_model_year: fields.req_model_year,
        req_reg_year: fields.req_reg_year,
        req_mileage_max: fields.req_mileage_max,
        req_budget_max: fields.req_budget_max,
        req_fuel_type: fields.req_fuel_type,
        req_transmission: fields.req_transmission,
        req_origin: fields.req_origin,
        priority: (fields.priority as Inquiry['priority']) ?? 'medium',
        status: 'new',
        inquiry_date: new Date().toISOString(),
      };
      await createInquiry(inquiry);
      setReqs(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'saved' } : x));
      toast.success(`Requirement for ${r.customer_name ?? r.customer_phone} saved`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setReqs(prev => prev.map(x => x._tempId === id ? { ...x, _status: 'error', _error: msg.slice(0, 120) } : x));
      toast.error(`Save failed: ${msg.slice(0, 60)}`);
    }
  }, [reqs]);

  const saveAllReqs = useCallback(async () => {
    const pending = reqs.filter(r => r._status === 'pending' || r._status === 'error');
    if (!pending.length) { toast.info('No pending requirements'); return; }
    setSavingAllReqs(true);
    for (const r of pending) await saveReq(r._tempId);
    setSavingAllReqs(false);
    toast.success(`Processed ${pending.length} requirement(s)`);
  }, [reqs, saveReq]);

  // Vehicle change handler
  const onVChange = useCallback((id: string, key: string, val: unknown) => {
    setVehicles(prev => prev.map(v => v._tempId === id ? { ...v, [key]: val } : v));
  }, []);
  const onVRemove = useCallback((id: string) => setVehicles(prev => prev.filter(v => v._tempId !== id)), []);

  // Requirement change handler
  const onRChange = useCallback((id: string, key: string, val: unknown) => {
    setReqs(prev => prev.map(r => r._tempId === id ? { ...r, [key]: val } : r));
  }, []);
  const onRRemove = useCallback((id: string) => setReqs(prev => prev.filter(r => r._tempId !== id)), []);

  const pendingV = vehicles.filter(v => v._status === 'pending').length;
  const errorV   = vehicles.filter(v => v._status === 'error').length;
  const pendingR = reqs.filter(r => r._status === 'pending').length;
  const errorR   = reqs.filter(r => r._status === 'error').length;

  const EXAMPLE_STOCK = `Toyota Corolla Altis X CVT 2024 - White - 15,000 km - PKR 52 lac - Fresh Import Japan
Dealer: ABC Motors, Lahore. Engine: 1800cc, Auto, Petrol. Reg: LEJ-5544

Honda Civic RS Turbo 2023 - Titanium Grey - 28,000 km - PKR 72 lac
Dealer: XYZ Autos. Reg: LEJ-1234, Clean docs

BYD Seal EV Long Range 2025 - Blue - Brand New - PKR 1.55 crore - EV Hub Pakistan`;

  const EXAMPLE_REQ = `Ahmad bhai chahta hai Toyota Corolla 2023-2024 white ya silver, auto, under 55 lac. Phone: 0300-1234567
Shabbir - Honda Civic 2022 se upper, budget 75 lac, any color, Lahore registration prefer
Sarah Khan needs a family SUV - Kia Sportage or MG HS 2023+, budget 85 lac, preferably local, auto trans. 0321-9876543`;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <ClipboardPaste className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bulk Create</h1>
            <p className="text-xs text-muted-foreground">Paste raw text — AI extracts vehicles or buyer requirements</p>
          </div>
        </div>

        {!aiConfig && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 text-yellow-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs">AI model not configured. <a href="/ai-sync" className="underline">Configure in AI Chatbot</a> to enable smart extraction.</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'stock' | 'requirements' | 'csv')}>
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="stock" className="gap-1.5 text-xs">
              <Car className="w-3.5 h-3.5" />Stock Listings
              {(pendingV + errorV) > 0 && <Badge variant="outline" className="text-[10px] ml-1">{pendingV + errorV}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requirements" className="gap-1.5 text-xs">
              <FileSearch className="w-3.5 h-3.5" />Buyer Requirements
              {(pendingR + errorR) > 0 && <Badge variant="outline" className="text-[10px] ml-1">{pendingR + errorR}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-1.5 text-xs">
              <Table2 className="w-3.5 h-3.5" />CSV Import
            </TabsTrigger>
          </TabsList>

          {/* ── STOCK TAB ── */}
          <TabsContent value="stock" className="space-y-3 mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardPaste className="w-3.5 h-3.5 text-primary" />Paste Vehicle Text
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => setRawText(EXAMPLE_STOCK)}>
                  <Eye className="w-3 h-3" />Load Example
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Textarea ref={textAreaRef} value={rawText} onChange={e => setRawText(e.target.value)}
                  placeholder="Paste WhatsApp messages, price lists, dealer forwards — any format…"
                  className="min-h-[160px] text-xs bg-muted/40 border-border resize-y font-mono" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={extractVehicles} disabled={extracting || !rawText.trim()} className="h-8 text-xs gap-1.5">
                    {extracting ? <><Loader2 className="w-3 h-3 animate-spin" />Extracting…</> : <><Sparkles className="w-3 h-3" />Extract with AI</>}
                  </Button>
                  {rawText && <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => setRawText('')}><X className="w-3 h-3" />Clear</Button>}
                </div>
              </CardContent>
            </Card>

            {vehicles.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {pendingV} pending{errorV > 0 ? ` · ${errorV} error` : ''} · {vehicles.filter(v => v._status === 'saved').length} saved
                    </Badge>
                    <Button size="sm" onClick={saveAll} disabled={savingAll || pendingV === 0} className="h-7 text-xs gap-1.5">
                      {savingAll ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : <><Save className="w-3 h-3" />Save All ({pendingV})</>}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={() => setVehicles([])}>
                    <Trash2 className="w-3 h-3" />Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {vehicles.map(v => (
                    <VehicleCard key={v._tempId} v={v} dealers={dealers}
                      onChange={onVChange} onRemove={onVRemove} onSave={saveSingle} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── REQUIREMENTS TAB ── */}
          <TabsContent value="requirements" className="space-y-3 mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileSearch className="w-3.5 h-3.5 text-primary" />Paste Buyer Requirements
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => setReqText(EXAMPLE_REQ)}>
                  <Eye className="w-3 h-3" />Load Example
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Textarea ref={reqAreaRef} value={reqText} onChange={e => setReqText(e.target.value)}
                  placeholder="Paste buyer requirements — WhatsApp messages, call notes, Roman Urdu, shorthand…
Example: Ahmed chahta hai Corolla 2023 white auto under 55 lac — 0300-1234567"
                  className="min-h-[160px] text-xs bg-muted/40 border-border resize-y font-mono" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={extractRequirements} disabled={extractingReqs || !reqText.trim()} className="h-8 text-xs gap-1.5">
                    {extractingReqs ? <><Loader2 className="w-3 h-3 animate-spin" />Extracting…</> : <><Sparkles className="w-3 h-3" />Extract Requirements</>}
                  </Button>
                  {reqText && <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => setReqText('')}><X className="w-3 h-3" />Clear</Button>}
                </div>
                <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/40">
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-[11px] text-muted-foreground">Extracted requirements are saved as <strong>Inquiries</strong> — find them in the Inquiries &amp; CRM section.</p>
                </div>
              </CardContent>
            </Card>

            {reqs.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {pendingR} pending{errorR > 0 ? ` · ${errorR} error` : ''} · {reqs.filter(r => r._status === 'saved').length} saved
                    </Badge>
                    <Button size="sm" onClick={saveAllReqs} disabled={savingAllReqs || pendingR === 0} className="h-7 text-xs gap-1.5">
                      {savingAllReqs ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : <><Save className="w-3 h-3" />Save All ({pendingR})</>}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={() => setReqs([])}>
                    <Trash2 className="w-3 h-3" />Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {reqs.map(r => (
                    <ReqCard key={r._tempId} r={r} onChange={onRChange} onRemove={onRRemove} onSave={saveReq} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* CSV Import Tab — standalone, outside Tabs but shown when activeTab=csv */}
        {activeTab === 'csv' && (
          <CSVImportTab dealers={dealers} onImported={() => toast.success('CSV vehicles saved to inventory!')} />
        )}

        {/* Tip */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-border/40 bg-muted/20">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Stock tab</strong>: extracts vehicles via AI from pasted text.{' '}
            <strong>Requirements tab</strong>: extracts buyer needs as Inquiries.{' '}
            <strong>CSV Import</strong>: upload a spreadsheet directly.{' '}
            AI understands Roman Urdu, Pakistani price formats (lac/crore), abbreviations, and jumbled text.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────