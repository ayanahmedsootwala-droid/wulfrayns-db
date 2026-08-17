import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, ChevronRight, Info, CheckCircle, CheckCircle2, Clock,
  DollarSign, FileText, Ship, AlertTriangle, Star, Calculator,
  Package, List, Map, Calendar, Clipboard, Globe, TrendingUp, Truck, Users, Phone, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';

// ── Port Procedures ────────────────────────────────────────────────────────────
const PORT_PROCEDURES = [
  { step: 1, title: 'Shipping Notice (Advance Notice)', timeline: '5–7 days before arrival', icon: Globe, color: 'text-blue-400',
    desc: 'Shipping line issues Bill of Lading (B/L). Importer receives copy via email/agent. Check: vessel name, ETA, container number, port of discharge (Karachi/QICT/PICT).',
    docs: ['Copy of Bill of Lading', 'Commercial Invoice', 'Packing List'], },
  { step: 2, title: 'Port Arrival & IGM Filing', timeline: 'Day 0–1', icon: Ship, color: 'text-primary',
    desc: 'Vessel arrives, port generates Import General Manifest (IGM). Your clearing agent checks IGM filing, confirms container number and delivery order.',
    docs: ['IGM number', 'Delivery Order from shipping line', 'Agent confirmation'], },
  { step: 3, title: 'FBR Customs Declaration (GD)', timeline: 'Day 1–2', icon: FileText, color: 'text-yellow-400',
    desc: 'Goods Declaration (GD) filed on Pakistan Single Window (PSW). Includes HS code, assessed value, duty calculation. Submit all documents for assessment.',
    docs: ['GD / WeBOC declaration', 'Commercial Invoice (certified)', 'Bill of Lading (original)', 'Packing List', 'Form-I (for used vehicles)', 'Import Authorization (if required)'], },
  { step: 4, title: 'Duty Assessment & Payment', timeline: 'Day 2–5', icon: DollarSign, color: 'text-green-400',
    desc: 'Customs officer assesses vehicle value. Duties include: customs duty, regulatory duty, sales tax, withholding tax, advance income tax. Pay via bank challan or e-payment.',
    docs: ['Payment challan', 'Bank receipt', 'Duty assessment sheet'], },
  { step: 5, title: 'Scanning & Examination', timeline: 'Day 3–7', icon: CheckCircle2, color: 'text-purple-400',
    desc: 'Vehicle may be selected for physical examination by customs. X-ray scanning for prohibited items. Inspector checks VIN, engine number against documents.',
    docs: ['Vehicle present at examination bay', 'All original documents with officer'], },
  { step: 6, title: 'Customs Clearance (Duty Paid)', timeline: 'Day 5–10', icon: CheckCircle, color: 'text-green-400',
    desc: 'After duty payment and examination, customs releases vehicle. "Out of Charge" note issued. Vehicle can be moved to bonded warehouse or directly to transporter.',
    docs: ['Out of Charge note', 'GD with customs stamp', 'Delivery Order'], },
  { step: 7, title: 'Registration in Pakistan', timeline: 'Day 10–20', icon: Clipboard, color: 'text-primary',
    desc: 'Vehicle registered at Excise & Taxation Office. New number plate assigned. Required: customs cleared documents, insurance, owner CNIC, paid registration fees.',
    docs: ['Form-A (ownership)', 'Customs cleared GD', 'Import certificate', 'Insurance certificate', 'Owner CNIC copy', 'Registration fee receipt'], },
];

// ── Document Checklist ─────────────────────────────────────────────────────────
const DOCUMENT_CHECKLIST = [
  { category: 'From Japan / Source Country', docs: [
    { name: 'Original Bill of Lading (OBL)', critical: true, desc: 'Issued by shipping line. MUST be original — photocopies not accepted at port.' },
    { name: 'Commercial Invoice', critical: true, desc: 'Shows FOB price, vehicle details, buyer/seller details. Must match auction sheet.' },
    { name: 'Packing List', critical: false, desc: 'Usually combined with invoice for single vehicle shipments.' },
    { name: 'Japan Export Certificate (JEC / Deregistration)', critical: true, desc: 'Proof vehicle is legally deregistered in Japan. Critical for customs.' },
    { name: 'Auction Sheet / Grade Report', critical: false, desc: 'Not legally required but highly advisable for valuation disputes.' },
    { name: 'Engine / Chassis Certificate', critical: false, desc: 'Some clearing agents request this to verify VIN matches documents.' },
  ]},
  { category: 'At Pakistan Customs (FBR/PSW)', docs: [
    { name: 'Form-I (Import of Used Vehicle)', critical: true, desc: 'Standard FBR form for used vehicle import. Filed by your clearing agent on WeBOC/PSW.' },
    { name: 'Goods Declaration (GD)', critical: true, desc: 'Formal customs declaration. HS code must be correct or face reassessment.' },
    { name: 'Bank Duty Payment Receipt', critical: true, desc: 'Proof of all duties paid: customs + regulatory + GST + WHT + AIT.' },
    { name: 'Out of Charge Note', critical: true, desc: 'Customs release document. Without this, vehicle cannot leave port.' },
  ]},
  { category: 'For Registration (Excise & Taxation)', docs: [
    { name: 'Customs Cleared GD', critical: true, desc: 'Stamped GD with "out of charge" — primary ownership proof.' },
    { name: 'Form-A (Vehicle Registration Form)', critical: true, desc: 'Available from Excise office. Filled by owner.' },
    { name: 'Owner CNIC (original + copy)', critical: true, desc: 'Registered owner must be present or provide notarized authority.' },
    { name: 'Insurance Certificate', critical: true, desc: 'Comprehensive insurance mandatory for new registration.' },
    { name: 'Fitness Certificate', critical: false, desc: 'Required in some provinces. Vehicle inspection by Excise officer.' },
    { name: 'Registration Fee Receipt', critical: true, desc: 'Paid at bank. Amount varies by engine cc and province.' },
  ]},
];

// ── Timeline Estimator ─────────────────────────────────────────────────────────
const TIMELINE_PHASES = [
  { phase: 'Japan Auction → Dealer', days: '1–3', desc: 'Bid acceptance, dealer processes sale', cumulative: '1–3' },
  { phase: 'Dealer → Export Agent', days: '3–7', desc: 'Deregistration, export certificate, Japan customs export clearance', cumulative: '4–10' },
  { phase: 'Loading at Japan Port', days: '3–10', desc: 'Vehicle assigned to container vessel. Monthly sailings from Nagoya/Osaka/Yokohama', cumulative: '7–20' },
  { phase: 'Sea Transit (Japan → Karachi)', days: '18–25', desc: 'Standard transit time. Direct or via Port Klang/Singapore transshipment', cumulative: '25–45' },
  { phase: 'Port Handling & Customs Clearance', days: '7–15', desc: 'Depends on examination, GD filing speed, duty payment. Can be longer if scanning queues', cumulative: '32–60' },
  { phase: 'Registration & Plating', days: '5–10', desc: 'Excise & Taxation office. Varies by city — Karachi fastest, some cities slower', cumulative: '37–70' },
  { phase: 'Delivery to Dealer', days: '1–3', desc: 'Transport from port/Excise to showroom/customer', cumulative: '38–73' },
];

function PortProceduresTab() {  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <p className="font-bold text-sm text-blue-400 mb-1">🚢 Port of Karachi — Import Clearance Process</p>
        <p className="text-xs text-muted-foreground">Step-by-step guide from vessel arrival to registration. Typical total time: 7–20 working days depending on examination & queue.</p>
      </div>
      <div className="space-y-2">
        {PORT_PROCEDURES.map(p => (
          <div key={p.step} className="border border-border rounded-xl overflow-hidden bg-card">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === p.step ? null : p.step)}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black', p.color.replace('text-','bg-').replace('400','400/15'))}><span className={p.color}>{p.step}</span></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>{p.timeline}</p>
              </div>
              <p.icon className={cn('w-4 h-4 shrink-0', p.color)} />
              <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0', open === p.step && 'rotate-180')} />
            </button>
            {open === p.step && (
              <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-muted/10">
                <p className="text-xs text-foreground leading-relaxed">{p.desc}</p>
                <div>
                  <p className="text-[10px] font-semibold text-primary mb-1.5">Required Documents:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.docs.map(d => <span key={d} className="text-[10px] bg-primary/10 border border-primary/20 text-primary rounded-full px-2 py-0.5">{d}</span>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentChecklistTab() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setChecked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = DOCUMENT_CHECKLIST.reduce((s, c) => s + c.docs.length, 0);
  const done = DOCUMENT_CHECKLIST.reduce((s, c) => s + c.docs.filter(d => checked.has(c.category + d.name)).length, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 flex-1">
          <p className="font-bold text-sm text-green-400 mb-0.5">📋 Import Document Checklist</p>
          <p className="text-xs text-muted-foreground">Track required documents for each stage. {done}/{total} checked.</p>
        </div>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-14 h-14 rounded-full border-4 border-green-400 flex items-center justify-center">
            <span className="text-sm font-black text-green-400">{Math.round(done/total*100)}%</span>
          </div>
        </div>
      </div>
      {DOCUMENT_CHECKLIST.map(cat => (
        <div key={cat.category} className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="bg-muted/30 px-4 py-2.5 border-b border-border/50">
            <p className="text-xs font-bold text-foreground">{cat.category}</p>
          </div>
          <div className="divide-y divide-border/30">
            {cat.docs.map(doc => {
              const id = cat.category + doc.name;
              const isChecked = checked.has(id);
              return (
                <div key={doc.name} className={cn('flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors', isChecked && 'opacity-60')}
                  onClick={() => toggle(id)}>
                  <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    isChecked ? 'bg-green-400 border-green-400' : 'border-border')}>
                    {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-xs font-semibold', isChecked ? 'line-through text-muted-foreground' : 'text-foreground')}>{doc.name}</p>
                      {doc.critical && <span className="text-[9px] bg-red-400/10 border border-red-400/20 text-red-400 rounded-full px-1.5 font-medium">CRITICAL</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">📅 Import Timeline Estimator — Japan to Pakistan</p>
        <p className="text-xs text-muted-foreground">Typical total: <strong className="text-foreground">38–73 days</strong> from auction win to registration. Fastest possible (clear customs): ~25 days if vessel timing is perfect.</p>
      </div>
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-3 pl-12">
          {TIMELINE_PHASES.map((p, i) => (
            <motion.div key={p.phase} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="absolute left-3.5 w-3 h-3 rounded-full bg-primary border-2 border-background" style={{ top: `${i * 100 / TIMELINE_PHASES.length}%` }} />
              <div className="border border-border rounded-xl px-4 py-3 bg-card">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{p.phase}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{p.days} days</Badge>
                    <span className="text-[10px] text-muted-foreground">Cumulative: {p.cumulative}d</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {[
          { label: 'Fastest (ideal)', value: '38 days', color: 'text-green-400' },
          { label: 'Average', value: '55 days', color: 'text-primary' },
          { label: 'Slow (congestion)', value: '73 days', color: 'text-orange-400' },
          { label: 'Risk Factor', value: 'Examination delay', color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-xl px-4 py-3 bg-card text-center">
            <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Import Cost Calculator component ──────────────────────────────────────────
function ImportCostCalculator() {
  const [fob, setFob] = useState('2000000');
  const [freight, setFreight] = useState('200000');
  const [insurance, setInsurance] = useState('15000');
  const [dutyPct, setDutyPct] = useState('62');
  const [clearing, setClearing] = useState('45000');
  const [reg, setReg] = useState('25000');
  const [profit, setProfit] = useState('350000');
  const [result, setResult] = useState<{ cif:number; duties:number; landed:number; sell:number } | null>(null);

  const calc = () => {
    const f = parseFloat(fob)||0, fr = parseFloat(freight)||0, ins = parseFloat(insurance)||0;
    const cif = f + fr + ins;
    const duties = Math.round(cif * (parseFloat(dutyPct)||0) / 100);
    const landed = cif + duties + (parseFloat(clearing)||0) + (parseFloat(reg)||0);
    const sell = landed + (parseFloat(profit)||0);
    setResult({ cif, duties, landed, sell });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> Import Cost Calculator (PKR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { label: 'FOB / Purchase Price', val: fob, set: setFob },
            { label: 'Sea Freight', val: freight, set: setFreight },
            { label: 'Marine Insurance', val: insurance, set: setInsurance },
            { label: 'Total Duty % of CIF', val: dutyPct, set: setDutyPct },
            { label: 'Clearing Charges', val: clearing, set: setClearing },
            { label: 'Registration', val: reg, set: setReg },
            { label: 'Profit Margin', val: profit, set: setProfit },
          ] as { label:string; val:string; set:(v:string)=>void }[]).map(f => (
            <div key={f.label}>
              <label className="text-[10px] text-muted-foreground block mb-1">{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)}
                className="w-full h-8 bg-muted/40 border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
          <div className="flex items-end">
            <button onClick={calc} className="w-full h-8 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
              Calculate
            </button>
          </div>
        </div>
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
            {[
              { label: 'CIF Value', val: result.cif, color: 'text-blue-400' },
              { label: 'Duties & Taxes', val: result.duties, color: 'text-orange-400' },
              { label: 'Total Landed Cost', val: result.landed, color: 'text-red-400' },
              { label: 'Minimum Sell Price', val: result.sell, color: 'text-green-400' },
            ].map(r => (
              <div key={r.label} className="bg-muted/30 rounded-lg p-3 border border-border">
                <p className="text-[10px] text-muted-foreground">{r.label}</p>
                <p className={cn('text-sm font-bold tabular-nums', r.color)}>PKR {r.val.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── FAQ row ────────────────────────────────────────────────────────────────────
function ImportFaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left gap-3">
        <p className="text-sm font-medium text-foreground">{q}</p>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-3 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/50 bg-muted/10">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Country {
  id: string;
  flag: string;
  name: string;
  tagline: string;
  color: string;
  brands: string[];
  popularModels: Model[];
  importProcess: Step[];
  costBreakdown: CostItem[];
  documentation: DocItem[];
  timeline: string;
  tips: string[];
  challenges: string[];
}

interface Model {
  name: string;
  type: string;
  notes: string;
  popularity: number; // 1–5
}

interface Step {
  title: string;
  description: string;
  icon: string;
}

interface CostItem {
  label: string;
  estimate: string;
  notes: string;
}

interface DocItem {
  name: string;
  required: boolean;
  description: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const COUNTRIES: Country[] = [
  {
    id: 'china',
    flag: '🇨🇳',
    name: 'China',
    tagline: 'New-Gen EVs & SUVs — High Value, Fast Growing',
    color: 'from-red-600/20 to-red-900/10',
    brands: ['BYD', 'Chery', 'MG (SAIC)', 'Great Wall / Haval', 'Geely', 'DFSK', 'Changan'],
    popularModels: [
      { name: 'BYD Seal / Atto 3 / Han', type: 'Electric Sedan/SUV', notes: 'Pakistan\'s fastest-growing EV imports; strong after-sales via local distributors', popularity: 5 },
      { name: 'MG ZS / HS / 5', type: 'Compact SUV / Hatchback', notes: 'Officially launched in Pakistan; wide availability of spare parts', popularity: 5 },
      { name: 'Chery Tiggo 4 / 7 / 8', type: 'SUV', notes: 'Official importer now active in Pakistan; competitive pricing vs Japanese', popularity: 4 },
      { name: 'Haval H6 / Jolion', type: 'SUV', notes: 'Luxury feel at mid-range prices; gaining popularity rapidly', popularity: 4 },
      { name: 'Geely Coolray / Emgrand', type: 'SUV / Sedan', notes: 'Volvo-owned platform; European technology at Chinese prices', popularity: 3 },
      { name: 'DFSK Glory 580 / 580 Pro', type: 'MPV/SUV', notes: 'Popular with ride-sharing fleets and large families', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Find Supplier', description: 'Contact official distributors in Pakistan (MG, BYD, Chery all have authorized dealers) OR use verified Chinese exporters on platforms like Autohome, 58.com, or directly from factories. Always verify business licence and export history.' },
      { icon: '📋', title: 'Negotiate & Confirm', description: 'Agree on CIF (Cost Insurance Freight) to Karachi/Port Qasim. Confirm model year, variant, color, and specification. Request pro-forma invoice. Pay deposit (typically 30%) via T/T (Telegraphic Transfer) to verified bank account.' },
      { icon: '📦', title: 'Production / Selection', description: 'For new vehicles: factory production takes 2–6 weeks. For used stock: inspect via video call or hire local inspection agent in China. Confirm pre-shipment inspection (PSI) report.' },
      { icon: '🚢', title: 'Shipping', description: 'Book container (20ft = 1 car, 40ft = 2–3 cars) via RoRo or container vessel. Estimated sailing time: China to Karachi = 18–25 days. Confirm vessel booking and obtain Bill of Lading (B/L).' },
      { icon: '🛃', title: 'Pakistan Customs', description: 'File GD (Goods Declaration) at Karachi port. Pay applicable customs duty based on engine capacity (see duty chart). Obtain duty-paid clearance certificate from Customs.' },
      { icon: '📝', title: 'Registration', description: 'Submit cleared vehicle to Excise & Taxation for registration. Provide all import documents, customs clearance certificate, and pay motor vehicle tax.' },
    ],
    costBreakdown: [
      { label: 'FOB / Ex-Works Price', estimate: 'Varies by model', notes: 'MG ZS EV ~USD 18,000–22,000; BYD Atto 3 ~USD 25,000–30,000' },
      { label: 'Sea Freight (to Karachi)', estimate: 'USD 1,200–2,000', notes: 'Per vehicle in container; RoRo slightly cheaper at ~USD 800–1,200' },
      { label: 'Marine Insurance', estimate: '0.5–1% of CIF value', notes: 'Essential; required for customs clearance' },
      { label: 'Pakistan Customs Duty', estimate: '50–100%+ of import value', notes: 'Based on engine capacity; EVs may have reduced duty under SRO exemptions' },
      { label: 'Sales Tax', estimate: '17% of (value + duty)', notes: 'Applied after customs duty calculation' },
      { label: 'Withholding Tax', estimate: '2–6%', notes: 'Filer rate 2%, non-filer 4–6%' },
      { label: 'Port Handling & Clearing', estimate: 'PKR 30,000–80,000', notes: 'Clearing agent fees, port charges, demurrage (if delayed)' },
      { label: 'Local Transportation', estimate: 'PKR 20,000–50,000', notes: 'Port to dealer/customer location' },
    ],
    documentation: [
      { name: 'Commercial Invoice', required: true, description: 'Shows purchase price, vehicle details; must match declared value at customs' },
      { name: 'Packing List', required: true, description: 'Itemized list of shipped contents including accessories' },
      { name: 'Bill of Lading (B/L)', required: true, description: 'Proof of shipment; original B/L required for customs clearance' },
      { name: 'Certificate of Origin', required: true, description: 'Confirms vehicle manufactured in China; may qualify for CPEC duty concessions' },
      { name: 'Pre-Shipment Inspection Certificate', required: false, description: 'Third-party inspection report; strongly recommended for quality assurance' },
      { name: 'Import Permit / Form-I', required: true, description: 'Ministry of Commerce import permit for vehicles' },
    ],
    timeline: '6–10 weeks (new vehicles from factory)',
    tips: [
      'Always verify the seller\'s export licence and trade history before any payment',
      'Use escrow services or Letter of Credit (L/C) for large transactions',
      'Check if Pakistan has duty exemptions under CPEC for Chinese EVs — can save 20–40% on duty',
      'Ensure the vehicle meets Pakistan\'s emission standards (Euro-2 minimum for registration)',
      'MG, BYD, and Chery have official channels — always check if official distributors can beat grey market pricing',
    ],
    challenges: [
      'Rapidly changing duty structures for EVs under SRO notifications',
      'Spare parts availability for non-official models can be limited',
      'Quality varies significantly between manufacturers — always request inspection',
      'Currency fluctuation between USD and CNY can affect pricing mid-order',
    ],
  },
  {
    id: 'japan',
    flag: '🇯🇵',
    name: 'Japan',
    tagline: 'JDM Excellence — Best Quality Used Cars in the World',
    color: 'from-rose-600/20 to-rose-900/10',
    brands: ['Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Lexus'],
    popularModels: [
      { name: 'Toyota Prius Alpha / Aqua', type: 'Hybrid', notes: 'Pakistan\'s most popular JDM import; 1800cc hybrid with excellent fuel economy', popularity: 5 },
      { name: 'Honda Vezel / Fit / Grace', type: 'SUV / Hatchback', notes: 'Compact and fuel-efficient; high demand from Uber/Careem fleets', popularity: 5 },
      { name: 'Nissan X-Trail / Note / Dayz', type: 'SUV / Compact', notes: 'X-Trail hugely popular with families; 4WD variants in demand', popularity: 4 },
      { name: 'Toyota Land Cruiser Prado', type: '4x4 SUV', notes: 'High-value import; 2.7L and 4.0L variants most common', popularity: 5 },
      { name: 'Mazda Axela / CX-5', type: 'Sedan/SUV', notes: 'KODO design language; petrol and diesel variants available', popularity: 4 },
      { name: 'Subaru Forester / XV', type: 'AWD SUV', notes: 'Popular for mountain regions; EyeSight safety system highly valued', popularity: 3 },
      { name: 'Mitsubishi Outlander PHEV', type: 'Plug-in Hybrid', notes: 'Growing demand as fuel prices rise; solid AWD platform', popularity: 4 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Research & Auction Registration', description: 'Register with a Japanese auction agent (USS, TAA, CAA, JU, etc.). Provide copy of CNIC and business registration. Pay membership deposit (typically USD 500–2,000 refundable). Agent provides access to auction listings and sheets.' },
      { icon: '📊', title: 'Bid on Auction', description: 'Review auction sheet carefully (grade, condition codes, mileage). Set maximum bid including auction fees. Bid online through your agent\'s portal. If successful, you\'ll receive confirmation within 24 hours. Auction fees typically 3–7% of hammer price.' },
      { icon: '💳', title: 'Payment', description: 'Pay full auction amount + fees within 3–5 business days. Payment via T/T to agent\'s Japan account. Agent pays auction house on your behalf. Late payment incurs penalties (typically 1–3% per day).' },
      { icon: '🔧', title: 'Pre-Export Inspection', description: 'Vehicle moves to agent\'s yard for inspection and documentation. Optional: request additional independent inspection. Any undisclosed damage must be claimed within 24–48 hours of yard arrival.' },
      { icon: '📋', title: 'Export Documentation', description: 'Agent obtains: Export Certificate (Yushutsu Shomeisho), Deregistration Certificate (Saharai), and books shipping. Process takes 2–4 weeks. Original Export Certificate essential for Pakistan customs.' },
      { icon: '🚢', title: 'Shipping to Pakistan', description: 'RoRo shipping most common (cheaper, faster than container). Karachi is main port; Port Qasim for special cargo. Sailing time: Japan to Karachi = 18–25 days via Singapore/Colombo.' },
      { icon: '🛃', title: 'Pakistan Customs Clearance', description: 'Submit all documents. Pay customs duty based on engine capacity and vehicle age. Vehicles >3 years old face higher duty slabs. Cleared vehicle gets customs certificate enabling registration.' },
    ],
    costBreakdown: [
      { label: 'Auction Price (Hammer)', estimate: 'JPY 800,000–5,000,000+', notes: 'Prius Alpha: ~JPY 1.2–1.8M; Vezel: ~JPY 1.0–1.5M; Prado: ~JPY 2.5–5.0M' },
      { label: 'Auction Fees', estimate: '3–7% of hammer price', notes: 'Includes auction house commission, agent fee' },
      { label: 'Japan-Side Export Costs', estimate: 'USD 300–800', notes: 'Export certificate, deregistration, yard storage, documentation' },
      { label: 'Sea Freight (RoRo)', estimate: 'USD 600–1,200', notes: 'Japan to Karachi; varies by vessel and season' },
      { label: 'Marine Insurance', estimate: '0.5–1% of CIF', notes: 'Required; covers total loss and major damage' },
      { label: 'Pakistan Customs Duty', estimate: '50–100% of import value', notes: 'Increases with engine size; 660cc kei cars have lower duty' },
      { label: 'Additional Levies', estimate: '17% GST + 2–6% WHT', notes: 'Calculated on (import value + duty)' },
      { label: 'Port Handling / Clearing', estimate: 'PKR 40,000–100,000', notes: 'Clearing agent, port charges' },
    ],
    documentation: [
      { name: 'Export Certificate (Yushutsu Shomeisho)', required: true, description: 'Most critical document; issued by Japanese authorities; confirms legal export' },
      { name: 'Deregistration Certificate', required: true, description: 'Confirms vehicle legally de-registered from Japanese system' },
      { name: 'Auction Sheet', required: false, description: 'Shows vehicle grade and condition; important for your records and resale value' },
      { name: 'Bill of Lading', required: true, description: 'Shipping proof; original required for customs clearance' },
      { name: 'Commercial Invoice', required: true, description: 'Shows declared value; matches customs declaration' },
      { name: 'Packing List', required: true, description: 'Required even for single vehicle — lists make, model, chassis number' },
    ],
    timeline: '8–12 weeks (auction to delivery)',
    tips: [
      'Always read the auction sheet thoroughly — pay special attention to codes A1–A4 (accident), W (water damage), and the interior grade',
      'Grade 4+ vehicles are ideal for Pakistan market; Grade 3.5 is acceptable with inspection',
      'Request mileage verification through CarCheck.jp or AutoCheck Japan before bidding',
      'Ship RoRo (Roll-on Roll-off) rather than container — it\'s cheaper and faster for single vehicles',
      'Use agents with Pakistan market experience — they understand local customs and duty calculations',
      'Check Japan\'s JCT (Japan Consumption Tax) — it may be recoverable on export purchases',
    ],
    challenges: [
      'Auction fraud — fake grading, tampered odometers exist; always use reputable agents',
      'Pakistan\'s age-based duty structure heavily penalizes vehicles over 3 years old',
      'Export certificate delays can add 2–4 weeks to timeline',
      'Port congestion at Karachi can extend clearance time by weeks',
    ],
  },
  {
    id: 'germany',
    flag: '🇩🇪',
    name: 'Germany',
    tagline: 'Premium Engineering — BMW, Mercedes, Audi, Volkswagen',
    color: 'from-gray-600/20 to-gray-900/10',
    brands: ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Porsche', 'Opel'],
    popularModels: [
      { name: 'BMW 3 Series / 5 Series', type: 'Luxury Sedan', notes: 'Consistent demand from executives; F30/G20 generation most popular', popularity: 5 },
      { name: 'Mercedes-Benz C-Class / E-Class', type: 'Luxury Sedan', notes: 'Flagship status in Pakistan; W205/W213 generation commands premium', popularity: 5 },
      { name: 'Audi A4 / Q5', type: 'Luxury Sedan/SUV', notes: 'Less common than BMW/MB but growing; B9 generation popular', popularity: 4 },
      { name: 'Volkswagen Golf / Tiguan', type: 'Hatchback/SUV', notes: 'Practical German engineering; Tiguan popular as family SUV', popularity: 4 },
      { name: 'Porsche 911 / Cayenne', type: 'Sports/Luxury SUV', notes: 'Ultra-premium segment; certified pre-owned from Germany most trusted', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Source the Vehicle', description: 'Use: mobile.de, AutoScout24, eBay Motors Germany. For luxury/certified pre-owned: contact BMW Approved Used, Mercedes-Benz Certified. Many Pakistani dealers have agents based in Germany for direct sourcing.' },
      { icon: '🔧', title: 'Pre-Purchase Inspection', description: 'Hire DEKRA, TÜV, or ADAC inspection service in Germany (cost: EUR 150–300). Check full service history via German registration documents (Fahrzeugschein + Fahrzeugbrief). Confirm no outstanding finance via SCHUFA check.' },
      { icon: '💳', title: 'Purchase & Payment', description: 'Payment via bank transfer (SWIFT/SEPA). Request Kaufvertrag (Purchase Contract). Obtain all original documents: Fahrzeugbrief (title), Fahrzeugschein (registration), service history, MOT (HU) certificate.' },
      { icon: '📋', title: 'German Deregistration', description: 'Vehicle must be deregistered (Abmeldung) before export. Obtain temporary export number plate (Ausfuhrkennzeichen) — valid 7 days. Export customs clearance via German Customs (Zoll).' },
      { icon: '🚢', title: 'Shipping to Pakistan', description: 'Container shipping from Hamburg, Bremen, or Bremerhaven. Transit time: Germany to Karachi = 25–35 days. Use a reputable freight forwarder familiar with Pakistan import procedures.' },
      { icon: '🛃', title: 'Pakistan Customs', description: 'German vehicles are LHD (left-hand drive) — ensure this is acceptable for your market/use. Pay customs duty. Present all German documents translated if required. COE (Certificate of Conformity) needed for luxury makes.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase Price', estimate: 'EUR 15,000–100,000+', notes: 'BMW 3 Series used: EUR 20,000–45,000; Mercedes E-Class: EUR 25,000–60,000' },
      { label: 'German Inspection & Fees', estimate: 'EUR 200–500', notes: 'DEKRA/TÜV inspection, deregistration, export number plate' },
      { label: 'Sea Freight (Container)', estimate: 'USD 1,800–3,000', notes: 'Hamburg to Karachi; shared container possible for smaller vehicles' },
      { label: 'Marine Insurance', estimate: '0.5–1.2% of CIF', notes: 'Higher for luxury/high-value vehicles' },
      { label: 'Pakistan Customs Duty', estimate: '65–100% of import value', notes: 'Premium brands often attract full duty; LHD may face additional compliance costs' },
      { label: 'GST + WHT', estimate: '17% + 2–6%', notes: 'Applied on (value + customs duty)' },
      { label: 'LHD Conversion (if needed)', estimate: 'PKR 50,000–200,000', notes: 'Optional — many buyers in Pakistan use LHD as prestige statement' },
    ],
    documentation: [
      { name: 'Fahrzeugbrief (Title Document / Zulassungsbescheinigung Teil II)', required: true, description: 'German vehicle ownership title — equivalent to log book' },
      { name: 'Fahrzeugschein (Registration / Zulassungsbescheinigung Teil I)', required: true, description: 'Current registration document; cancelled upon deregistration' },
      { name: 'Certificate of Conformity (CoC)', required: true, description: 'Confirms vehicle meets European standards; required for luxury brands' },
      { name: 'Bill of Lading', required: true, description: 'Original required for Pakistan customs clearance' },
      { name: 'Commercial Invoice', required: true, description: 'Shows declared purchase value; must be accurate' },
      { name: 'Full Service History', required: false, description: 'Stamped service book massively increases resale value in Pakistan' },
    ],
    timeline: '8–12 weeks',
    tips: [
      'German certified pre-owned (BMW Approved Used, MB Certified) gives you a warranty — highly valued in Pakistan',
      'Always check for outstanding recalls on the vehicle using the manufacturer\'s recall database',
      'Full documented service history from Germany commands a 15–25% premium in Pakistan',
      'LHD vehicles are fully legal in Pakistan but have lower resale than RHD — price accordingly',
      'Use a consolidated shipping agent familiar with Pakistan to avoid expensive mistakes',
    ],
    challenges: [
      'LHD vehicles have significantly lower resale value in Pakistan market',
      'High customs duty on luxury vehicles makes the landed cost very high',
      'German documentation is complex — use an agent familiar with German exports',
      'Euro 6 emission systems may not be serviceable in Pakistan — check parts availability',
    ],
  },
  {
    id: 'italy',
    flag: '🇮🇹',
    name: 'Italy',
    tagline: 'Exotic Prestige — Ferrari, Lamborghini, Alfa Romeo, Maserati',
    color: 'from-green-700/20 to-green-900/10',
    brands: ['Ferrari', 'Lamborghini', 'Alfa Romeo', 'Fiat', 'Maserati', 'Lancia'],
    popularModels: [
      { name: 'Ferrari 488 / F8 Tributo', type: 'Supercar', notes: 'Ultimate prestige import; requires specialist shipping and handling', popularity: 3 },
      { name: 'Lamborghini Huracán / Urus', type: 'Supercar / SUV', notes: 'Urus growing in popularity as luxury everyday SUV', popularity: 3 },
      { name: 'Alfa Romeo Giulia / Stelvio', type: 'Luxury Sedan/SUV', notes: 'Accessible Italian luxury; growing enthusiast base in Pakistan', popularity: 3 },
      { name: 'Maserati Ghibli / Levante', type: 'Luxury Sedan/SUV', notes: 'Ferrari-derived engines; strong status symbol', popularity: 2 },
      { name: 'Fiat 500 / Abarth', type: 'City Car', notes: 'Niche enthusiast market; iconic styling', popularity: 2 },
    ],
    importProcess: [
      { icon: '🏎️', title: 'Use Specialist Broker', description: 'Italian exotic car imports require specialist knowledge. Use brokers experienced with Ferrari/Lamborghini imports and Pakistan customs. They understand Italian export procedures (Motorizzazione Civile) and Pakistani authorities.' },
      { icon: '🔧', title: 'Pre-Purchase Inspection', description: 'Mandatory for exotic cars. Hire certified Ferrari/Lamborghini technician for inspection. Full history check via Italian vehicle database (Motorizzazione). Check for outstanding finance (Centro Elaborazione Dati). Obtain CARFAX Italy history report.' },
      { icon: '🚢', title: 'Specialist Shipping', description: 'Never use RoRo for exotic cars — use enclosed container shipping. Climate-controlled containers for high-value supercars. Full insurance coverage at declared value. Transit time: Italy (Genoa/Livorno) to Karachi = 25–35 days.' },
      { icon: '🛃', title: 'Pakistan Customs', description: 'High-value exotic cars require careful customs declaration. Valuations must be accurate — customs has access to international vehicle pricing databases. Import duty on sports cars can be 100%+ of declared value.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase Price', estimate: 'EUR 50,000–500,000+', notes: 'Ferrari 488: EUR 150,000–250,000; Alfa Giulia: EUR 30,000–50,000 (used)' },
      { label: 'Specialist Inspection', estimate: 'EUR 300–800', notes: 'Factory-certified technician; pre-purchase and pre-export inspection' },
      { label: 'Enclosed Container Shipping', estimate: 'USD 3,000–6,000', notes: 'Premium for enclosed/climate-controlled; from Genoa or Livorno' },
      { label: 'Marine Insurance', estimate: '1–2% of declared value', notes: 'Essential; insure at full market value' },
      { label: 'Pakistan Customs Duty', estimate: '100%+ of import value', notes: 'Sports/luxury category attracts maximum duty slabs' },
      { label: 'Total Landed Cost', estimate: '3–4× purchase price', notes: 'After all duties, taxes, shipping for a supercar arriving in Pakistan' },
    ],
    documentation: [
      { name: 'Italian Libretto (Registration Document)', required: true, description: 'Italian equivalent of log book; must be surrendered for export' },
      { name: 'Certificate of Origin', required: true, description: 'Confirms Italian manufacture; required for customs' },
      { name: 'Radiazione (Deregistration)', required: true, description: 'Formal deregistration from Italian system; issued by Motorizzazione' },
      { name: 'Certificate of Conformity', required: true, description: 'Required for all EU-manufactured vehicles' },
      { name: 'Valuation Certificate', required: false, description: 'Independent professional valuation; important for insurance and customs' },
    ],
    timeline: '10–14 weeks',
    tips: [
      'For exotics, always use a specialist broker — incorrect documentation can result in vehicle seizure at Pakistani customs',
      'Insure at FULL market value — exotic cars are total loss risks in shipping',
      'Factor 100%+ customs duty into your business case — the landed cost is typically 2.5–3.5× the purchase price',
      'Right-hand drive Italian exotics (rare but exist) command a significant premium in Pakistan',
    ],
    challenges: [
      'Extremely high landed costs due to maximum import duty on luxury/sports vehicles',
      'Specialist service and parts availability is very limited in Pakistan',
      'LHD configuration of most Italian cars reduces resale options',
      'Climate in Pakistan may affect exotic car maintenance — plan servicing abroad',
    ],
  },
  {
    id: 'uk',
    flag: '🇬🇧',
    name: 'United Kingdom',
    tagline: 'Right-Hand Drive Premium — Ideal for Pakistani Market',
    color: 'from-blue-700/20 to-blue-900/10',
    brands: ['Jaguar', 'Land Rover', 'Bentley', 'Rolls-Royce', 'McLaren', 'Aston Martin', 'MINI'],
    popularModels: [
      { name: 'Range Rover / Range Rover Sport', type: '4x4 Luxury SUV', notes: 'Pakistan\'s most coveted luxury SUV; RHD makes it perfect for local market', popularity: 5 },
      { name: 'Jaguar F-Pace / XF', type: 'Luxury SUV/Sedan', notes: 'Sporty luxury; growing demand among professionals', popularity: 4 },
      { name: 'Land Rover Defender / Discovery', type: '4x4 SUV', notes: 'New Defender hugely popular; tough and luxurious', popularity: 4 },
      { name: 'Bentley Continental / Bentayga', type: 'Ultra-Luxury', notes: 'Ultra-premium segment; RHD factory option available', popularity: 3 },
      { name: 'MINI Cooper / Countryman', type: 'Premium Compact', notes: 'Niche but consistent demand among urban professionals', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Source Vehicle', description: 'Use AutoTrader UK, Exchange & Mart, eBay UK Motors. For Land Rover/Jaguar: JLR Approved Used network. UK vehicles have comprehensive HPI check (outstanding finance, write-off history) — always run an HPI check (cost ~GBP 20).' },
      { icon: '🔧', title: 'HPI & Inspection', description: 'Run HPI check — confirms: no outstanding finance, not written off (Category S/N/A), correct mileage, not stolen. Arrange independent inspection via AA or RAC inspection service (GBP 150–250). Check MOT history free on DVLA website.' },
      { icon: '📋', title: 'DVLA Process', description: 'Seller retains V5C log book — seller completes export section and retains green slip. You receive yellow slip as proof of sale. Notify DVLA of export for road tax refund. Obtain NOVA (Notification of Vehicle Arrival) paperwork template for destination.' },
      { icon: '🚢', title: 'Shipping from UK', description: 'Main ports: Southampton, Bristol, Tilbury (London). RoRo or container options available. Felixstowe for container loads. Transit time: UK to Karachi = 20–28 days.' },
      { icon: '🛃', title: 'Customs at Karachi', description: 'UK origin provides no special duty concession post-Brexit. Standard Pakistan customs duty applies. Present original documents and HPI/MOT records as evidence of condition.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase Price', estimate: 'GBP 20,000–200,000+', notes: 'Range Rover Sport used: GBP 35,000–80,000; Defender: GBP 45,000–100,000' },
      { label: 'UK-Side Costs', estimate: 'GBP 200–500', notes: 'HPI check, MOT certificate copy, DVLA fee, collection/delivery to port' },
      { label: 'Sea Freight', estimate: 'USD 1,500–2,500', notes: 'Southampton to Karachi; RoRo or 20ft container' },
      { label: 'Marine Insurance', estimate: '0.8–1.5% CIF', notes: 'Higher premium for luxury brands' },
      { label: 'Pakistan Customs Duty', estimate: '65–100% of import value', notes: 'Land Rover/Jaguar attract high duty; engine > 1800cc = higher slab' },
      { label: 'Total Landed Multiplier', estimate: '2.5–3× UK price', notes: 'After all Pakistan duties and taxes' },
    ],
    documentation: [
      { name: 'V5C Logbook (Part)', required: true, description: 'Seller retains book; buyer gets yellow slip as proof of purchase for export' },
      { name: 'HPI Clear Certificate', required: false, description: 'Strongly recommended — confirms no outstanding finance or write-off history' },
      { name: 'MOT Certificate', required: false, description: 'Confirms roadworthiness; provides maintenance history evidence' },
      { name: 'Bill of Lading', required: true, description: 'Shipping proof' },
      { name: 'Commercial Invoice', required: true, description: 'Declared value for customs' },
    ],
    timeline: '8–10 weeks',
    tips: [
      'UK is RHD — this is a massive advantage in Pakistan vs German LHD vehicles',
      'Always run HPI check — UK has many Category S and N write-offs that look fine on the surface',
      'Land Rover full service history (main dealer stamped) adds 20–30% premium in Pakistan',
      'Check for any outstanding PCP/HP finance before purchasing — the finance company legally owns the vehicle',
      'Post-Brexit, UK VAT (20%) is not charged on export sales — confirms in writing with seller',
    ],
    challenges: [
      'Significant humidity and UV exposure issues with UK vehicles arriving in Pakistan climate',
      'High customs duty makes landed cost very expensive',
      'V5C document process can be confusing — use experienced shipping agent',
      'Parts for premium UK brands (Jaguar/Land Rover) can be expensive and slow to arrive',
    ],
  },
  {
    id: 'usa',
    flag: '🇺🇸',
    name: 'USA',
    tagline: 'Muscle Cars & Tesla — Left-Hand Drive Prestige',
    color: 'from-indigo-600/20 to-indigo-900/10',
    brands: ['Ford', 'Chevrolet', 'Dodge', 'Tesla', 'Cadillac', 'Jeep', 'Ram'],
    popularModels: [
      { name: 'Ford Mustang (GT / EcoBoost)', type: 'Muscle Car', notes: 'Iconic status; GT (5.0L V8) most desirable; growing enthusiast community in Pakistan', popularity: 5 },
      { name: 'Chevrolet Camaro / Corvette', type: 'Muscle Car / Sports Car', notes: 'Growing niche market; Camaro SS highly regarded', popularity: 4 },
      { name: 'Dodge Challenger / Charger SRT', type: 'Muscle Car', notes: 'Hellcat variants ultra-premium; Scat Pack popular price point', popularity: 4 },
      { name: 'Tesla Model 3 / Model Y', type: 'Electric Sedan/SUV', notes: 'Growing EV demand; software-defined features popular with tech-savvy buyers', popularity: 4 },
      { name: 'Jeep Wrangler / Grand Cherokee', type: '4x4 / Luxury SUV', notes: 'Wrangler as lifestyle vehicle; Grand Cherokee as luxury family SUV', popularity: 4 },
      { name: 'Cadillac Escalade', type: 'Ultra-Luxury SUV', notes: 'Status symbol; LHD used as prestige factor in Pakistan', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Source Vehicle', description: 'Use: Copart (salvage auction), IAAI, Cars.com, AutoTrader USA, eBay Motors. For clean title: dealers or private sellers. Important: US has salvage (written-off) titles — always verify title status via Carfax or AutoCheck.' },
      { icon: '📋', title: 'Title & History Check', description: 'Run Carfax ($40–60) or AutoCheck report. Confirm clean title (no salvage, rebuilt, flood, odometer rollback brands). Obtain original title document — needed for export. US Title is state-issued; process varies by state.' },
      { icon: '🏛️', title: '25-Year Import Rule', description: 'Pakistan does NOT have the US 25-year rule — that\'s a rule FOR importing INTO the US. Pakistan\'s restriction is based on vehicle age and engine capacity for duty purposes. However, ensure EPA and DOT compliance certifications available if needed.' },
      { icon: '🚢', title: 'Shipping from USA', description: 'Main ports: Baltimore (East Coast), Los Angeles/Long Beach (West Coast). West Coast is faster (25–30 days to Karachi). RoRo available; container recommended for muscle cars to prevent road damage during transit.' },
      { icon: '🛃', title: 'Pakistan Customs', description: 'USA vehicles are LHD — factor lower resale into pricing. High-powered vehicles (V8 muscle cars) attract higher duty based on engine size. Tesla and EV imports may qualify for reduced duty under SRO exemptions.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase Price', estimate: 'USD 25,000–80,000+', notes: 'Mustang GT: USD 28,000–45,000; Challenger Hellcat: USD 45,000–65,000; Tesla Model 3: USD 30,000–50,000' },
      { label: 'US Export Costs', estimate: 'USD 300–700', notes: 'Title transfer, export formalities, transport to port' },
      { label: 'Sea Freight', estimate: 'USD 1,200–2,500', notes: 'LA to Karachi: ~USD 1,200; Baltimore to Karachi: ~USD 1,800' },
      { label: 'Marine Insurance', estimate: '0.8–1.5%', notes: 'Higher for high-performance vehicles' },
      { label: 'Pakistan Customs Duty', estimate: '65–100%+ of import value', notes: 'V8 engine class attracts maximum customs duty' },
      { label: 'Total Landed Multiplier', estimate: '2.5–3.5× US price', notes: 'Including all duties and taxes' },
    ],
    documentation: [
      { name: 'US Certificate of Title', required: true, description: 'Original title issued by state DMV; must be clean title (no salvage/rebuilt brands)' },
      { name: 'Bill of Lading', required: true, description: 'NVOCC (shipping company) issued; original needed for customs clearance' },
      { name: 'Carfax / AutoCheck Report', required: false, description: 'Highly recommended; proves vehicle history and clean title' },
      { name: 'EPA and DOT Compliance', required: false, description: 'May be needed for customs; confirm with your clearing agent' },
      { name: 'Commercial Invoice', required: true, description: 'Shows declared value; must match title purchase price' },
    ],
    timeline: '8–12 weeks',
    tips: [
      'Muscle cars from the US have a unique enthusiast following in Pakistan — the LHD disadvantage is offset by the desirability',
      'Always buy clean title vehicles — salvage titles have no resale value in Pakistan',
      'Tesla vehicles from the US work on Pakistan\'s voltage system but may need charging adapter — check supercharger compatibility',
      'West Coast (Los Angeles) shipping to Karachi is faster and cheaper than East Coast',
      'Factor LHD into your pricing — expect 20–30% lower resale vs same car in RHD',
    ],
    challenges: [
      'All US cars are LHD — significant disadvantage for resale in Pakistan',
      'Very high engine capacity (V8) = very high customs duty',
      'Copart salvage vehicles are popular for import but require full mechanical rebuild',
      'Tesla service availability in Pakistan is currently limited',
    ],
  },
  {
    id: 'korea',
    flag: '🇰🇷',
    name: 'South Korea',
    tagline: 'Modern Value — Hyundai, Kia, Genesis at Competitive Prices',
    color: 'from-teal-600/20 to-teal-900/10',
    brands: ['Hyundai', 'Kia', 'Genesis', 'SsangYong', 'Renault Samsung'],
    popularModels: [
      { name: 'Hyundai Tucson / Santa Fe', type: 'SUV', notes: 'Practical family SUV; strong resale in Pakistan urban areas', popularity: 5 },
      { name: 'Kia Sportage / Sorento', type: 'SUV', notes: 'Officially launched in Pakistan but grey market from Korea also active', popularity: 5 },
      { name: 'Hyundai Sonata / Elantra', type: 'Sedan', notes: 'Affordable German-rivaling styling; popular with budget-conscious luxury buyers', popularity: 4 },
      { name: 'Genesis G70 / G80', type: 'Luxury Sedan', notes: 'BMW-competing luxury at lower price point; growing enthusiast base', popularity: 3 },
      { name: 'Kia EV6 / Hyundai IONIQ 5', type: 'Electric', notes: 'Award-winning EVs; growing interest as EV infrastructure expands', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Source Vehicle', description: 'Use: Encar.com (Korea\'s leading used car platform — English version available), K Car, SK Encar mobile app. Use a Korea-based sourcing agent fluent in Korean for best results. Check official local availability first (Kia/Hyundai have Pakistan operations).' },
      { icon: '🔧', title: 'Inspection in Korea', description: 'Hyundai/Kia certified used vehicles available at official dealers. Independent inspection via certified technician. Check for recall completion (Korean recall database: www.car.go.kr). Request full service history.' },
      { icon: '🚢', title: 'Shipping from Korea', description: 'Main port: Incheon or Busan. RoRo or container from Korea. Transit time: Korea to Karachi = 18–22 days (faster than Europe). Korean shipping lines (HMM, Evergreen) offer competitive RoRo rates.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase', estimate: 'KRW 20–60M (USD 15,000–45,000)', notes: 'Tucson used: ~USD 18,000–30,000; Genesis G70: ~USD 25,000–40,000' },
      { label: 'Korea Export Fees', estimate: 'USD 200–500', notes: 'Export documentation, agent fee, yard handling' },
      { label: 'Sea Freight', estimate: 'USD 700–1,400', notes: 'Busan to Karachi via Singapore; faster than European routes' },
      { label: 'Pakistan Customs + Taxes', estimate: '65–100% of value', notes: 'Korea-Pakistan trade not covered by significant preferential tariffs' },
    ],
    documentation: [
      { name: 'Korean Vehicle Registration Certificate', required: true, description: 'Equivalent of log book; shows ownership chain' },
      { name: 'Export Declaration', required: true, description: 'Korean customs export form' },
      { name: 'Bill of Lading', required: true, description: 'Shipping confirmation' },
      { name: 'Commercial Invoice', required: true, description: 'Purchase value declaration' },
    ],
    timeline: '6–9 weeks',
    tips: [
      'Encar.com has English language version — you can research prices directly without an agent',
      'Korea to Karachi has faster, more frequent shipping connections than Europe',
      'Hyundai and Kia official Pakistan imports sometimes compete on price with grey market — compare carefully',
      'Genesis luxury vehicles from Korea offer strong value vs European equivalents',
    ],
    challenges: [
      'Language barrier in Korea — agent fluent in Korean is very helpful',
      'Kia/Hyundai official local distributors compete directly with grey market, sometimes at similar prices',
      'Korean-specification vehicles may differ from global-spec — check features carefully',
    ],
  },
  {
    id: 'australia',
    flag: '🇦🇺',
    name: 'Australia',
    tagline: 'RHD Utility Champions — Utes, 4x4s, V8 Classics',
    color: 'from-yellow-600/20 to-yellow-900/10',
    brands: ['Toyota (AU)', 'Ford Australia', 'Holden (GM)', 'Isuzu', 'Mitsubishi', 'Nissan'],
    popularModels: [
      { name: 'Toyota HiLux (Australian-spec)', type: 'Ute (Pickup)', notes: 'World\'s best-selling ute; Australian-spec has unique tub and accessories popular with commercial buyers', popularity: 5 },
      { name: 'Ford Falcon / FPV GT', type: 'V8 Muscle Sedan', notes: 'Production ended 2016; collector interest growing; Australian V8 performance at accessible prices', popularity: 3 },
      { name: 'Holden Commodore SS / HSV', type: 'V8 Performance', notes: 'LS3 V8 engine; unique RHD muscle car that directly competes with American imports but is RHD', popularity: 4 },
      { name: 'Toyota LandCruiser 70 Series', type: '4x4 Workhorse', notes: 'Australian-spec 70 Series with diesel engines not sold elsewhere; highly sought by off-road community', popularity: 4 },
      { name: 'Mitsubishi Triton / Pajero Sport (AU)', type: 'Ute / 4x4', notes: 'Australian-specification models with unique accessories packages', popularity: 3 },
    ],
    importProcess: [
      { icon: '🔍', title: 'Source in Australia', description: 'Use: CarsGuide, Carsales.com.au, GumTree Australia. Specialist export agents in Australia handle the process from purchase to port. Many Australian ute owners add significant aftermarket accessories — include these in declared value.' },
      { icon: '📋', title: 'REVS Check', description: 'Australian equivalent of HPI check. Run Personal Property Securities Register (PPSR) check for AUD 2 per vehicle. Confirms no outstanding finance, not written off, not stolen. Essential before purchase.' },
      { icon: '🔧', title: 'Roadworthy Certificate', description: 'Most Australian states require a Roadworthy Certificate (RWC) for private sale. This confirms roadworthiness and provides maintenance evidence.' },
      { icon: '🚢', title: 'Shipping from Australia', description: 'Main ports: Melbourne, Sydney, Brisbane, Fremantle (Perth). Transit time: Australia to Karachi = 20–28 days. RoRo or container available. Australian ports have excellent RoRo facilities — most utes shipped via RoRo.' },
      { icon: '🛃', title: 'Pakistan Customs', description: 'Australian vehicles are RHD — advantage in Pakistani market. Commercial utes (HiLux, Triton) may attract different duty classification than passenger cars. Verify classification with clearing agent.' },
    ],
    costBreakdown: [
      { label: 'Vehicle Purchase', estimate: 'AUD 25,000–80,000', notes: 'HiLux 4x4 double cab: AUD 35,000–55,000; Holden Commodore SS: AUD 20,000–40,000' },
      { label: 'Australian Export Costs', estimate: 'AUD 500–1,200', notes: 'PPSR check, NEVDIS export, agent fees, transport to port' },
      { label: 'Sea Freight', estimate: 'USD 1,500–2,500', notes: 'Melbourne/Sydney to Karachi' },
      { label: 'Pakistan Customs + Taxes', estimate: '50–80% of import value', notes: 'Commercial utes may qualify for different classification' },
    ],
    documentation: [
      { name: 'Australian Certificate of Title', required: true, description: 'Vehicle registration papers showing clear ownership; varies by state (NEVDIS record)' },
      { name: 'PPSR Certificate', required: false, description: 'Confirms no outstanding finance; strongly recommended' },
      { name: 'Roadworthy Certificate', required: false, description: 'State-issued; confirms mechanical condition' },
      { name: 'Bill of Lading', required: true, description: 'Shipping confirmation document' },
      { name: 'Commercial Invoice', required: true, description: 'Purchase value for customs' },
    ],
    timeline: '8–12 weeks',
    tips: [
      'Australian HiLux variants (Rugged X, Rogue) have accessories packages not available in Pakistan-spec — commands significant premium',
      'RHD configuration is a huge advantage vs US or European imports in Pakistani market',
      'Holden Commodore SSV/HSV is one of the most undervalued V8 RHD performance cars for Pakistani enthusiasts',
      'Australian utes often come fully loaded with ARB, TJM, or Ironman 4×4 accessories — this adds real value',
      'Australian climate is similar to Pakistan\'s — less rust concerns than UK/German imports',
    ],
    challenges: [
      'Australian dollar strength can make vehicles expensive vs other sources',
      'Holden brand now discontinued — parts availability will decrease over time',
      'Distance/shipping time is longer than Korean imports',
      'Less established import pipeline vs Japan/UK — fewer experienced agents available in Pakistan',
    ],
  },
];

// ─── General Import Info ──────────────────────────────────────────────────────
const DUTY_SLABS = [
  { engine: 'Up to 660cc', duty: '50%', levy: '+10% regulatory duty', total: '~75% landed', example: 'Kei cars, micro EVs' },
  { engine: '661–800cc', duty: '50%', levy: '+FED varies', total: '~80%', example: 'Small hatchbacks' },
  { engine: '801–1000cc', duty: '50%', levy: '+FED', total: '~85%', example: 'Honda Fit 1.0' },
  { engine: '1001–1300cc', duty: '65%', levy: '+FED', total: '~100%', example: 'Toyota Vitz 1.3' },
  { engine: '1301–1500cc', duty: '65%', levy: '+FED + Addl', total: '~110%', example: 'Prius, Honda Vezel 1.5' },
  { engine: '1501–1800cc', duty: '75%', levy: '+FED + Addl', total: '~125%', example: 'Civic 1.8, Corolla 1.8' },
  { engine: '1801–2000cc', duty: '75%', levy: '+FED + Addl', total: '~135%', example: 'X-Trail 2.0, Camry 2.0' },
  { engine: '2001–2500cc', duty: '100%', levy: '+FED + Addl', total: '~165%', example: 'Prado 2.7, Fortuner 2.7' },
  { engine: '2501–3000cc', duty: '100%', levy: '+FED + Addl', total: '~175%', example: 'BMW 3.0, Highlander 2.7' },
  { engine: 'Above 3000cc', duty: '100%', levy: '+Max FED + Addl', total: '~190%+', example: 'Land Cruiser V8, Rolls Royce' },
];

// ─── Components ───────────────────────────────────────────────────────────────
function CollapsibleSection({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 text-left transition-colors">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PopularityStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('w-3 h-3', i < count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );
}

function CountryCard({ country }: { country: Country }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const toggle = (s: string) => setActiveSection(prev => prev === s ? null : s);

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className={cn('bg-gradient-to-r p-5 pb-4', country.color)}>
        <div className="flex items-start gap-3">
          <span className="text-4xl">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">{country.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{country.tagline}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {country.brands.map(b => (
                <Badge key={b} variant="outline" className="text-xs border-border/60">{b}</Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/30 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            {country.timeline}
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Popular Models */}
        <CollapsibleSection title="Popular Models & Demand" icon="🚗" defaultOpen>
          <div className="space-y-2">
            {country.popularModels.map(m => (
              <div key={m.name} className="flex items-start gap-3 p-2.5 bg-muted/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{m.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{m.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.notes}</p>
                </div>
                <PopularityStars count={m.popularity} />
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Import Process */}
        <CollapsibleSection title="Step-by-Step Import Process" icon="📋">
          <div className="space-y-3">
            {country.importProcess.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-base">{step.icon}</div>
                  {idx < country.importProcess.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">STEP {idx + 1}</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-0.5">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Cost Breakdown */}
        <CollapsibleSection title="Cost Breakdown" icon="💰">
          <div className="space-y-2">
            {country.costBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                <DollarSign className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="font-bold text-sm text-primary shrink-0">{item.estimate}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Documentation */}
        <CollapsibleSection title="Required Documentation" icon="📁">
          <div className="space-y-2">
            {country.documentation.map((doc, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 bg-muted/20 rounded-lg">
                <div className="shrink-0 mt-0.5">
                  {doc.required ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{doc.name}</span>
                    <Badge variant={doc.required ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                      {doc.required ? 'Required' : 'Recommended'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Tips & Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button className={cn('text-left p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors', activeSection === 'tips' && 'bg-emerald-500/5 border-emerald-500/20')} onClick={() => toggle('tips')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">💡</span>
              <span className="font-semibold text-sm">Pro Tips</span>
              <span className="ml-auto text-xs text-muted-foreground">{country.tips.length} tips</span>
            </div>
            <AnimatePresence>
              {activeSection === 'tips' && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                  {country.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </button>
          <button className={cn('text-left p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors', activeSection === 'challenges' && 'bg-red-500/5 border-red-500/20')} onClick={() => toggle('challenges')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">⚠️</span>
              <span className="font-semibold text-sm">Challenges</span>
              <span className="ml-auto text-xs text-muted-foreground">{country.challenges.length} issues</span>
            </div>
            <AnimatePresence>
              {activeSection === 'challenges' && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                  {country.challenges.map((ch, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-red-500 shrink-0 mt-0.5">•</span>
                      {ch}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
// ─── Cost Estimator Tab ────────────────────────────────────────────────────────
const COST_COUNTRIES = [
  { id: 'japan', label: 'Japan', freight: 150000, docs: 30000, flag: '🇯🇵' },
  { id: 'uk',    label: 'United Kingdom', freight: 220000, docs: 45000, flag: '🇬🇧' },
  { id: 'uae',   label: 'UAE / Dubai', freight: 80000, docs: 25000, flag: '🇦🇪' },
  { id: 'germany', label: 'Germany', freight: 250000, docs: 50000, flag: '🇩🇪' },
  { id: 'australia', label: 'Australia', freight: 280000, docs: 55000, flag: '🇦🇺' },
];
const CC_DUTY_MAP: Record<string, number> = {
  '800':1344000,'1000':1680000,'1300':3696000,'1500':5205200,'1600':6314000,'1800':7823200,
};

function CostEstimatorTab() {
  const [country, setCountry] = React.useState('japan');
  const [purchasePrice, setPurchasePrice] = React.useState('');
  const [ccSlab, setCcSlab] = React.useState('1300');
  const [ageMonths, setAgeMonths] = React.useState('0');
  const [evDiscount, setEvDiscount] = React.useState<'none'|'50'|'25'>('none');
  const [usdPkr, setUsdPkr] = React.useState(280);

  const sel = COST_COUNTRIES.find(c => c.id === country)!;
  const purchasePkr = (parseFloat(purchasePrice) || 0) * usdPkr;
  const baseDuty = CC_DUTY_MAP[ccSlab] ?? 3696000;
  const depRate = Math.min((parseInt(ageMonths) || 0) * 0.01, 0.5);
  const dutyAfterDep = baseDuty * (1 - depRate);
  const evMult = evDiscount === '50' ? 0.5 : evDiscount === '25' ? 0.75 : 1.0;
  const finalDuty = dutyAfterDep * evMult;
  const clearingAgent = 80000;
  const portHandling = 55000;
  const localTransport = 25000;
  const totalCost = purchasePkr + sel.freight + finalDuty + sel.docs + clearingAgent + portHandling + localTransport;

  const rows = [
    { label: 'Vehicle Purchase Price', value: purchasePkr, note: `${parseFloat(purchasePrice)||0} USD × ${usdPkr}` },
    { label: 'Freight / Shipping', value: sel.freight, note: `${sel.label} → Karachi` },
    { label: 'Customs Duty (FBR)', value: finalDuty, note: `${ccSlab}cc slab, −${(depRate*100).toFixed(0)}% dep${evDiscount!=='none'?' +EV disc':''}` },
    { label: 'Documentation (origin)', value: sel.docs, note: 'Export cert, de-reg, etc.' },
    { label: 'Clearing Agent (PK)', value: clearingAgent, note: 'Karachi customs agent' },
    { label: 'Port Handling', value: portHandling, note: 'QICT / KPT charges' },
    { label: 'Local Transport', value: localTransport, note: 'Port → your city' },
  ];

  const fmtPkr = (n: number) => n >= 1_000_000 ? `PKR ${(n/1_000_000).toFixed(2)}M` : `PKR ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">🧮 Full Import Cost Estimator</p>
        <p className="text-xs text-muted-foreground">Enter vehicle details to get a complete cost breakdown from origin country to Pakistan road-ready.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Origin Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{COST_COUNTRIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.flag} {c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Purchase Price (USD)</Label>
          <Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="e.g. 3500" className="h-8 text-xs border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">USD / PKR Rate</Label>
          <Input type="number" value={usdPkr} onChange={e => setUsdPkr(parseFloat(e.target.value)||280)} className="h-8 text-xs border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Engine CC Slab</Label>
          <Select value={ccSlab} onValueChange={setCcSlab}>
            <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[['800','Up to 800cc'],['1000','801–1000cc'],['1300','1001–1300cc'],['1500','1301–1500cc'],['1600','1501–1600cc'],['1800','1601–1800cc']].map(([v,l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vehicle Age (months)</Label>
          <Input type="number" value={ageMonths} onChange={e => setAgeMonths(e.target.value)} min={0} max={50} className="h-8 text-xs border-border" />
          <p className="text-[10px] text-muted-foreground">Depreciation: −{Math.min((parseInt(ageMonths)||0),50)}%</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">EV / HEV Discount</Label>
          <Select value={evDiscount} onValueChange={v => setEvDiscount(v as 'none'|'50'|'25')}>
            <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">None (standard)</SelectItem>
              <SelectItem value="50" className="text-xs">HEV up to 1800cc (−50%)</SelectItem>
              <SelectItem value="25" className="text-xs">HEV 1800–2500cc (−25%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Cost Breakdown</p>
          <p className="text-xs text-muted-foreground">{sel.flag} {sel.label} → Pakistan</p>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 border-t border-border hover:bg-muted/10 transition-colors">
            <div>
              <p className="text-xs font-medium text-foreground">{r.label}</p>
              <p className="text-[10px] text-muted-foreground">{r.note}</p>
            </div>
            <p className="text-xs font-mono text-foreground shrink-0 ml-4">{fmtPkr(r.value)}</p>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-t border-primary/20">
          <p className="text-sm font-bold text-foreground">Total Estimated Cost</p>
          <p className="text-base font-bold text-primary font-mono">{fmtPkr(totalCost)}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">* Estimates only. Actual duty, freight, and agent costs vary. Always confirm with your clearing agent before committing.</p>
    </div>
  );
}

// ─── Agents Directory Tab ──────────────────────────────────────────────────────
const AGENTS_DATA = [
  { name:'Al-Rehman Auto Imports', city:'Karachi', speciality:'Japan, UAE', phone:'+92-21-3456-7890', rating:4.8, years:12, services:['Auction bidding','Customs clearing','Documentation'], note:'One of Karachi\'s most experienced Japan import agents. Fast clearing track record.' },
  { name:'Global Auto Links', city:'Lahore', speciality:'UK, Germany', phone:'+92-42-3567-8901', rating:4.6, years:9, services:['UK MOT history checks','Clearing','Local delivery'], note:'Specialists in European imports. Strong UK contacts.' },
  { name:'Pak Auto Traders', city:'Karachi', speciality:'Japan, Korea', phone:'+92-21-3678-9012', rating:4.5, years:15, services:['Auction agent','Finance liaison','Inspection'], note:'Long track record. Offer inspection service at major Japan auctions.' },
  { name:'Continental Motors PK', city:'Islamabad', speciality:'UAE, Germany', phone:'+92-51-2345-6789', rating:4.7, years:8, services:['UAE sourcing','NTN/tax services','Delivery'], note:'Strong Dubai connections. Good for Islamabad/Rawalpindi clients.' },
  { name:'Reliable Auto Imports', city:'Faisalabad', speciality:'Japan', phone:'+92-41-3456-7890', rating:4.4, years:11, services:['Bidding','Documentation','Port clearing'], note:'Reliable rates. Specialise in budget-range JDM vehicles for Punjab market.' },
];

function AgentsDirectoryTab() {
  const [cityFilter, setCityFilter] = React.useState('All');
  const cities = ['All', ...Array.from(new Set(AGENTS_DATA.map(a => a.city)))];
  const filtered = cityFilter === 'All' ? AGENTS_DATA : AGENTS_DATA.filter(a => a.city === cityFilter);
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">🤝 Import Agents Directory</p>
        <p className="text-xs text-muted-foreground">Verified clearing agents and import facilitators across Pakistan. Always verify credentials independently before engaging.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {cities.map(c => (
          <button key={c} onClick={() => setCityFilter(c)}
            className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-colors',
              cityFilter === c ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((agent, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.city} · {agent.speciality}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-amber-400">★ {agent.rating}</p>
                <p className="text-[10px] text-muted-foreground">{agent.years} yrs exp</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{agent.note}</p>
            <div className="flex flex-wrap gap-1">
              {agent.services.map(s => (
                <span key={s} className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full">{s}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">{agent.phone}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
        <p className="text-xs text-amber-300 font-semibold mb-1">⚠ Due Diligence Required</p>
        <p className="text-xs text-muted-foreground">This directory is for reference only. Verify agent credentials with FBR Customs, check reviews on automotive forums, and never transfer full payment without a signed agreement.</p>
      </div>
    </div>
  );
}

export default function ImportCarsGuidePage() {
  const [activeMainTab, setActiveMainTab] = useState<'countries' | 'port' | 'documents' | 'timeline' | 'estimator' | 'agents'>('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showDutyChart, setShowDutyChart] = useState(false);

  const displayedCountries = selectedCountry
    ? COUNTRIES.filter(c => c.id === selectedCountry)
    : COUNTRIES;

  const MAIN_TABS = [
    { id: 'countries', label: '🌍 Country Guides',       icon: Globe },
    { id: 'port',      label: '🚢 Port Procedures',      icon: Ship },
    { id: 'documents', label: '📋 Document Checklist',   icon: Clipboard },
    { id: 'timeline',  label: '📅 Import Timeline',      icon: Calendar },
    { id: 'estimator', label: '🧮 Cost Estimator',       icon: Calculator },
    { id: 'agents',    label: '🤝 Agents Directory',     icon: Users },
  ] as const;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">🌍</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Import Cars Guide</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete import reference — country guides, port procedures, document checklists, and timeline estimator.
            </p>
          </div>
        </div>

        {/* Main tab navigation */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-max">
            {MAIN_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveMainTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all',
                  activeMainTab === t.id
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* NEW TABS */}
        {activeMainTab === 'port' && <PortProceduresTab />}
        {activeMainTab === 'documents' && <DocumentChecklistTab />}
        {activeMainTab === 'timeline' && <TimelineTab />}
        {activeMainTab === 'estimator' && <CostEstimatorTab />}
        {activeMainTab === 'agents' && <AgentsDirectoryTab />}

        {/* COUNTRIES TAB (original content) */}
        {activeMainTab === 'countries' && (<>

        {/* Country filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCountry(null)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
              !selectedCountry ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
          >
            🌍 All Countries
          </button>
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCountry(prev => prev === c.id ? null : c.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                selectedCountry === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>

        {/* Pakistan Duty Chart */}
        <Card className="bg-card border-border">
          <button
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
            onClick={() => setShowDutyChart(v => !v)}
          >
            <span className="text-xl">🛃</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">Pakistan Customs Duty Chart — By Engine Capacity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Understanding import duty slabs before you bid or buy</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            {showDutyChart ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          </button>
          <AnimatePresence>
            {showDutyChart && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <CardContent className="pt-0 px-5 pb-5">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-400 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Duty rates change frequently via SRO notifications. Always verify current rates with your clearing agent before purchase. EVs may qualify for reduced duty under special exemptions.</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Engine Capacity</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Customs Duty</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Additional Levies</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Approx. Total</th>
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DUTY_SLABS.map((row, idx) => (
                          <tr key={idx} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="py-2 pr-4 font-medium text-foreground">{row.engine}</td>
                            <td className="py-2 pr-4 text-primary font-bold">{row.duty}</td>
                            <td className="py-2 pr-4 text-xs text-muted-foreground">{row.levy}</td>
                            <td className={cn('py-2 pr-4 font-bold text-xs',
                              idx < 3 ? 'text-emerald-400' : idx < 6 ? 'text-amber-400' : 'text-red-400'
                            )}>{row.total}</td>
                            <td className="py-2 text-xs text-muted-foreground">{row.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">* Total estimate includes customs duty + GST (17%) + WHT (2% filer). Actual duty may include FED, Regulatory Duty, and Additional Customs Duty. Consult Pakistan Customs Tariff.</p>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* General Process Overview */}
        <Card className="bg-card border-border">
          <CardHeader className="px-5 py-4 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ship className="w-4 h-4 text-primary" /> General Import Process — Pakistan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { step: '1', icon: '🔍', label: 'Source & Purchase', desc: 'Find vehicle abroad, verify history, agree price, pay deposit' },
                { step: '2', icon: '📦', label: 'Export Processing', desc: 'Deregistration, export certificate, documentation preparation' },
                { step: '3', icon: '🚢', label: 'Shipping', desc: 'Book freight (RoRo/Container), marine insurance, vessel booking' },
                { step: '4', icon: '🛃', label: 'Customs & Registration', desc: 'Pay duties, clear port, register with Excise & Taxation' },
              ].map(item => (
                <div key={item.step} className="text-center p-3 bg-muted/20 rounded-lg border border-border/40">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-[10px] font-bold text-muted-foreground/60 mb-1">STEP {item.step}</div>
                  <div className="text-xs font-semibold text-foreground mb-1">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-primary" /> Universal Documents Needed</h4>
                <ul className="space-y-1.5 text-muted-foreground">
                  {['Commercial Invoice (purchase price)', 'Bill of Lading (original required)', 'Packing List', 'Origin country\'s deregistration/title document', 'Marine Insurance Certificate', 'Import Permit / Form-I (from MOC)', 'Pakistan Customs Goods Declaration (GD)'].map((d, i) => (
                    <li key={i} className="flex gap-2"><span className="text-emerald-500 shrink-0">✓</span>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Ship className="w-3.5 h-3.5 text-primary" /> Shipping Methods Compared</h4>
                <div className="space-y-2">
                  <div className="p-2.5 bg-muted/20 rounded border border-border/40">
                    <div className="font-semibold text-foreground mb-1">🚢 RoRo (Roll-on/Roll-off)</div>
                    <p className="text-muted-foreground">Cheaper (USD 600–1,500), faster, vehicle driven on/off ship. Risk: minor road damage possible. Best for: standard cars, utes.</p>
                  </div>
                  <div className="p-2.5 bg-muted/20 rounded border border-border/40">
                    <div className="font-semibold text-foreground mb-1">📦 Container Shipping</div>
                    <p className="text-muted-foreground">More expensive (USD 1,500–3,000 per unit), fully enclosed. Best for: luxury cars, exotics, motorcycles, additional cargo. 20ft = 1 car; 40ft = 2–3 cars.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Country Cards */}
        <div className="space-y-6">
          {displayedCountries.map(country => (
            <motion.div key={country.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <CountryCard country={country} />
            </motion.div>
          ))}
        </div>

        {/* ── Import Checklist ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Universal Import Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { phase: 'Pre-Purchase', color: 'text-blue-400', items: [
                  'Verify vehicle eligibility (age ≤ 3 years for personal import)',
                  'Confirm engine CC and fuel type for correct duty slab',
                  'Check if model has local spare parts availability',
                  'Get current PKR/foreign currency rate + 5% buffer',
                  'Calculate full landed cost using our duty calculator',
                  'Verify exporter/agent reputation (ask for previous BL copies)',
                  'Confirm chassis number format matches country standards',
                  'Check auction grade or inspection report (Grade 4+ recommended)',
                ]},
                { phase: 'Payment & Order', color: 'text-green-400', items: [
                  'Sign purchase agreement / pro-forma invoice',
                  'Pay via T/T (Telegraphic Transfer) to verified bank account only',
                  'Never pay via Western Union / cash for large amounts',
                  'Obtain payment receipt and keep for customs',
                  'Confirm production/shipment timeline in writing',
                  'Request pre-shipment inspection (PSI) photos/video',
                  'Confirm export certificate will be provided',
                  'Arrange marine insurance (0.5–1% of CIF value)',
                ]},
                { phase: 'Shipping & Port', color: 'text-amber-400', items: [
                  'Receive original Bill of Lading (3 originals issued)',
                  'Share BL with Pakistan clearing agent immediately',
                  'Track vessel via MarineTraffic.com',
                  'File pre-arrival GD (Goods Declaration) with customs',
                  'Arrange clearing agent at Port Qasim / Karachi port',
                  'Confirm free demurrage days (usually 5–7 days)',
                  'Prepare duty payment funds before vessel arrival',
                  'Obtain vehicle from port before demurrage charges start',
                ]},
                { phase: 'Registration', color: 'text-purple-400', items: [
                  'Get chassis inspection done at Excise office',
                  'Submit: BL, import clearance, customs paid receipt, CNIC',
                  'Pay motor vehicle tax (province-specific)',
                  'Obtain registration book (original)',
                  'Get fitness certificate for commercial use / resale',
                  'Apply for number plate (takes 1–7 days)',
                  'Arrange comprehensive insurance before driving',
                  'File for exemption if eligible (returning expat, etc.)',
                ]},
              ].map(phase => (
                <div key={phase.phase}>
                  <p className={cn('text-sm font-bold mb-2', phase.color)}>{phase.phase}</p>
                  <ul className="space-y-1.5">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary mt-0.5 shrink-0">✓</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Import Cost Calculator ── */}
        <ImportCostCalculator />

        {/* ── Common Mistakes & Tips ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Common Mistakes & Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: '❌', label: 'Mistake', color: 'border-red-400/30 bg-red-400/5', items: [
                  'Buying from unknown exporters without verifying business licence',
                  'Not calculating landed cost before committing — duty can exceed car value',
                  'Missing port demurrage deadline (PKR 5,000–15,000/day)',
                  'Importing a model with no local spare parts — resale nightmare',
                  'Ignoring structural repair history (修復歴) on auction sheets',
                  'Paying full amount before seeing PSI report',
                  'Not insuring marine cargo — one sinking = total loss',
                  'Assuming "new" means duty-free — all imports attract duties',
                ]},
                { icon: '✅', label: 'Pro Tip', color: 'border-green-400/30 bg-green-400/5', items: [
                  'Use a reputable clearing agent with PRAL registered — they expedite GD processing',
                  'Build a 15–20% buffer into all cost calculations for currency fluctuation',
                  'Always request radiation certificate for Japanese vehicles (mandatory)',
                  'Toyota hybrids: buy Grade 4+ only — battery condition crucial at Pakistan heat',
                  'Container shipping preferred for luxury cars — better condition on arrival',
                  'Time your imports for Jan–March: lower auction prices in Japan',
                  'Register an import company for multiple cars — better duty rates possible',
                  'Always photograph the car at port BEFORE clearance for insurance claims',
                ]},
              ].map(col => (
                <div key={col.label} className={cn('rounded-xl border p-4 space-y-2', col.color)}>
                  <p className="font-bold text-sm text-foreground">{col.icon} {col.label}s</p>
                  <ul className="space-y-1.5">
                    {col.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 mt-0.5">{col.icon}</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── FAQ ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { q: 'Can I import any car to Pakistan?', a: 'Personal imports are limited to vehicles up to 3 years old under the personal baggage scheme. Commercial importers can import older vehicles under different allowances. Certain vehicle categories (e.g., trucks, buses) have different rules.' },
              { q: 'What is the cheapest country to import from?', a: 'Japan offers the best value: high-grade used cars at transparent auction prices, strong yen-to-PKR value, and well-documented vehicle history. UK and UAE cars can be cheaper to ship but often lack the same quality documentation.' },
              { q: 'How long does the full import process take?', a: 'From auction win to road-ready in Pakistan: typically 45–65 days. Japan (3–5 days local + 18–25 days shipping + 10–20 days port/clearing + 5–10 days registration). Delays at customs can extend this.' },
              { q: 'Do I need a freight forwarder or can I do it myself?', a: 'You must use a licensed Pakistan customs clearing agent — it is legally required. The overseas freight forwarder (agent in Japan/UK/etc.) handles the export side. Most importers use one trusted agent who handles both.' },
              { q: 'Are electric vehicles cheaper to import?', a: 'EVs attract the same duty structure but the vehicle purchase price is often higher. However, Pakistani government policy has recently lowered duties on EVs (1,800cc equivalent), making imported EVs like BYD and MG increasingly viable.' },
              { q: 'What happens if my car gets damaged during shipping?', a: 'Marine insurance covers damage in transit. Always arrange marine insurance (0.5–1% of CIF value). Document the vehicle thoroughly before shipping and photograph any pre-existing damage to avoid disputes.' },
              { q: 'Can I import a right-hand drive car from UK?', a: 'Yes — UK cars are right-hand drive and fully compatible with Pakistan roads. Many luxury vehicles (Range Rover, BMW, Mercedes) are popular UK imports. UK MOT history provides strong vehicle condition documentation.' },
              { q: 'What is the penalty for misdeclaring vehicle value?', a: 'Severe — Pakistan Customs can seize the vehicle, impose fines up to 3x the duty amount, and initiate legal proceedings. Always declare the correct transaction value backed by original invoice documentation.' },
            ].map((faq, i) => (
              <ImportFaqRow key={i} q={faq.q} a={faq.a} />
            ))}
          </CardContent>
        </Card>
        </>)}
      </div>
    </AppLayout>
  );
}
