import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Ship, FileSearch, Star, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Car, DollarSign, BarChart3, Globe, TrendingUp,
  Anchor, Package, FileText, ArrowRight, Clock, Shield, Zap,
  Hash, MapPin, Award, Info, BookOpen, Percent, Receipt, Truck,
  CalendarDays, Search, X, Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';

// ─── Zone Card sub-component ─────────────────────────────────────────────────
interface ZoneCardProps {
  zone: string;
  label: string;
  color: string;
  fields: string[];
  tip: string;
}

function ZoneCard({ zone, label, color, fields, tip }: ZoneCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn('rounded-xl border p-3 cursor-pointer transition-all duration-200', color, open ? 'ring-1 ring-current/30' : '')}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center gap-2">
        <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0', color)}>
          {zone}
        </span>
        <span className="text-xs font-semibold text-foreground flex-1 min-w-0">{label}</span>
        {open ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <div className="mt-2.5 space-y-2">
          <ul className="space-y-1">
            {fields.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0 opacity-60" />
                <span className="text-[10px] text-muted-foreground leading-snug">{f}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-1.5 px-2 py-1.5 bg-background/40 rounded-lg border border-current/20">
            <Info className="w-3 h-3 text-current shrink-0 mt-0.5 opacity-80" />
            <p className="text-[10px] text-muted-foreground leading-snug italic">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pakistan Customs Duty Data ───────────────────────────────────────────────
// HS Chapter 87 — Vehicles (Pakistan Customs Tariff 2024-25, FBR)
// 2026 FBR duty rates — Asian makes, passenger vehicles (Transportation of Persons)
// Fixed USD amounts per FBR SRO 2026; PKR equivalent at 1 USD = 280 PKR (SBP rate)
// Depreciation: 1% per month on total duty based on vehicle age
// Hybrid exemption: 50% for HEV ≤1800cc | 25% for HEV 1801–2500cc
const USD_PKR_RATE = 280;

// Rich slabs used in the Auction Guide duty sim + HS table
const AUCTION_DUTY_SLABS = [
  {
    category: 'Up to 800cc',
    hs_code: '8703.2111 / 8703.2119',
    engine: '≤ 800cc',
    usd: 4800, pkr: 4800 * USD_PKR_RATE,
    cd: '50%', rd: '0%', st: '17%', it: '3%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Suzuki Alto, Kei cars. USD 4,800 fixed.',
    color: 'text-green-400', bg: 'bg-green-400/10',
  },
  {
    category: '801cc – 1000cc',
    hs_code: '8703.2121 / 8703.2129',
    engine: '801–1000cc',
    usd: 6000, pkr: 6000 * USD_PKR_RATE,
    cd: '65%', rd: '7%', st: '17%', it: '3%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Daihatsu Mira, Alto 660 Japan spec. USD 6,000 fixed.',
    color: 'text-blue-400', bg: 'bg-blue-400/10',
  },
  {
    category: '1001cc – 1300cc',
    hs_code: '8703.2221 / 8703.2229',
    engine: '1001–1300cc',
    usd: 13200, pkr: 13200 * USD_PKR_RATE,
    cd: '75%', rd: '25%', st: '17%', it: '4.5%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Toyota Raize 1.0T, Honda Fit 1.3, Vitz 1.0. USD 13,200 fixed.',
    color: 'text-yellow-400', bg: 'bg-yellow-400/10',
  },
  {
    category: '1301cc – 1500cc',
    hs_code: '8703.2231 / 8703.2239',
    engine: '1301–1500cc',
    usd: 18590, pkr: 18590 * USD_PKR_RATE,
    cd: '100%', rd: '35%', st: '17%', it: '4.5%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Toyota Aqua (HEV), Honda Fit 1.5, Swift. USD 18,590 fixed.',
    color: 'text-orange-400', bg: 'bg-orange-400/10',
  },
  {
    category: '1501cc – 1600cc',
    hs_code: '8703.2241 / 8703.2249',
    engine: '1501–1600cc',
    usd: 22550, pkr: 22550 * USD_PKR_RATE,
    cd: '100%', rd: '35%', st: '17%', it: '4.5%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Toyota Corolla 1.6, Honda City 1.5. USD 22,550 fixed.',
    color: 'text-orange-400', bg: 'bg-orange-400/10',
  },
  {
    category: '1601cc – 1800cc (excl. Jeeps)',
    hs_code: '8703.2251 / 8703.2259',
    engine: '1601–1800cc',
    usd: 27940, pkr: 27940 * USD_PKR_RATE,
    cd: '100%', rd: '35%', st: '17%', it: '4.5%', fed: '0%',
    hybridExempt: '50%',
    notes: 'Prius 1.8 HEV (50% exempt), Axio, Premio, Nissan Serena. USD 27,940 fixed.',
    color: 'text-red-400', bg: 'bg-red-400/10',
  },
  {
    category: 'HEV 1801cc – 2500cc (25% exempt)',
    hs_code: '8703.4011 – 8703.5099',
    engine: '1801–2500cc HEV',
    usd: 0, pkr: 0,
    cd: '50%', rd: '0%', st: '17%', it: '1%', fed: '0%',
    hybridExempt: '25%',
    notes: '⚡ 25% exemption on total duty. Ad-valorem basis.',
    color: 'text-emerald-400', bg: 'bg-emerald-400/10',
  },
  {
    category: 'HEV ≤1800cc (50% exempt)',
    hs_code: '8703.4011 – 8703.4099',
    engine: 'HEV ≤1800cc',
    usd: 0, pkr: 0,
    cd: '50%', rd: '0%', st: '17%', it: '1%', fed: '0%',
    hybridExempt: '50%',
    notes: '⚡ 50% exemption. Aqua, Prius, Vezel, Serena e-Power.',
    color: 'text-emerald-400', bg: 'bg-emerald-400/10',
  },
  {
    category: 'Electric Vehicle (EV)',
    hs_code: '8703.8011 – 8703.8099',
    engine: 'EV',
    usd: 0, pkr: 0,
    cd: '25%', rd: '0%', st: '17%', it: '1%', fed: '0%',
    hybridExempt: '—',
    notes: '⚡ Lowest duty tier. EV policy incentive.',
    color: 'text-cyan-400', bg: 'bg-cyan-400/10',
  },
  {
    category: 'Diesel ≤1500cc',
    hs_code: '8703.3111 / 8703.3119',
    engine: 'Diesel ≤1500cc',
    usd: 0, pkr: 0,
    cd: '65%', rd: '7%', st: '17%', it: '4.5%', fed: '0%',
    hybridExempt: '—',
    notes: 'Surf, Hilux Diesel, Hijet. Ad-valorem basis.',
    color: 'text-purple-400', bg: 'bg-purple-400/10',
  },
  {
    category: 'Diesel 1501cc – 2500cc',
    hs_code: '8703.3211 – 8703.3299',
    engine: 'Diesel 1501–2500cc',
    usd: 0, pkr: 0,
    cd: '100%', rd: '40%', st: '17%', it: '4.5%', fed: '10%',
    hybridExempt: '—',
    notes: 'Prado diesel, Fortuner diesel.',
    color: 'text-purple-400', bg: 'bg-purple-400/10',
  },
];

// ─── Freight Rates ────────────────────────────────────────────────────────────
const FREIGHT_RATES = [
  { type: 'Kei Car (660cc)', jpy: '¥65,000–80,000', pkr: '~PKR 100K–130K', desc: 'Mira, Alto, Move — RoRo' },
  { type: 'Compact Sedan/Hatch', jpy: '¥80,000–110,000', pkr: '~PKR 130K–180K', desc: 'Aqua, Fit, Swift — RoRo' },
  { type: 'Mid-size Sedan', jpy: '¥100,000–140,000', pkr: '~PKR 165K–230K', desc: 'Premio, Axio, Allion' },
  { type: 'Large Sedan / SUV', jpy: '¥130,000–180,000', pkr: '~PKR 210K–295K', desc: 'Vanguard, RAV4, Wish' },
  { type: 'Large SUV / 4WD', jpy: '¥170,000–250,000', pkr: '~PKR 280K–410K', desc: 'Prado, Land Cruiser 200' },
  { type: 'Container (20ft)', jpy: '¥250,000–350,000', pkr: '~PKR 410K–575K', desc: '1–2 cars; safer but pricier' },
  { type: 'Marine Insurance', jpy: '0.5–1% of CIF', pkr: '—', desc: 'Strongly recommended for all imports' },
];

// ─── Local Pakistan Charges ───────────────────────────────────────────────────
const LOCAL_CHARGES = [
  { item: 'Clearing Agent Fee', range: 'PKR 25,000–60,000', notes: 'Includes WeBOC filing, GD preparation' },
  { item: 'Port Handling (KPT/PQ)', range: 'PKR 15,000–40,000', notes: 'Terminal handling & examination' },
  { item: 'Transport (Port → Showroom)', range: 'PKR 8,000–25,000', notes: 'Distance-based; Karachi to Lahore ~PKR 22K' },
  { item: 'Inspection / Survey Fee', range: 'PKR 3,000–8,000', notes: 'Third-party condition verification' },
  { item: 'FBR / WeBOC Filing', range: 'PKR 2,000–5,000', notes: 'Government system processing fee' },
  { item: 'Radiation Certificate (Japan)', range: '¥5,000–10,000', notes: 'Mandatory for vehicles post-March 2011' },
  { item: 'Demurrage (if delayed)', range: 'PKR 2,000–8,000/day', notes: 'Avoid by collecting within free days' },
  { item: 'Registration (Local)', range: 'PKR 40,000–150,000+', notes: 'Varies by province, engine size & age' },
];

// ─── Duty Calculator Helper ───────────────────────────────────────────────────
function calcDuty(fobPkr: number, slab: typeof AUCTION_DUTY_SLABS[0]) {
  const cd  = fobPkr * parseFloat(slab.cd)  / 100;
  const rd  = fobPkr * parseFloat(slab.rd)  / 100;
  const st  = (fobPkr + cd + rd) * 0.17;
  const fed = (fobPkr + cd + rd) * (parseFloat(slab.fed) / 100);
  const base = fobPkr + cd + rd + st + fed;
  const it  = base * (parseFloat(slab.it) / 100);
  return { cd, rd, st, fed, it, total: cd + rd + st + fed + it };
}

function fmt(n: number) {
  if (n >= 10_000_000) return `PKR ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `PKR ${(n / 100_000).toFixed(1)} Lac`;
  return `PKR ${Math.round(n).toLocaleString()}`;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const IMPORT_STEPS = [
  {
    step: 1, phase: 'Research & Bidding',
    icon: FileSearch, color: 'text-blue-400', bg: 'bg-blue-400/10',
    title: 'Research & Auction Bidding',
    items: [
      'Browse Japanese auction sheets on USS, JU, TAA, CAA, NAA',
      'Check auction grade (3~4 = Good, 4.5~5 = Excellent, R/RA = Repaired)',
      'Verify mileage, chassis number, and accident history',
      'Use auction house fee calculator — factor all Japan-side costs',
      'Set a maximum bid based on your target PKR profit',
      'Use a trusted auction agent (commission: ¥15,000–¥30,000 per car)',
    ],
  },
  {
    step: 2, phase: 'Purchase & Documentation',
    icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10',
    title: 'Winning the Bid & Documents',
    items: [
      'Pay auction amount + agent fees in JPY (within 5 business days)',
      'Agent collects: export certificate (自動車輸出証明書), deregistration cert',
      'Obtain radiation certificate (mandatory post-2011 for Pakistan)',
      'Ensure Bill of Lading (B/L) is issued to your Pakistan clearing agent',
      'Get packing list, commercial invoice, and insurance certificate',
      'Keep original chassis number (VIN) plate photos — customs will verify',
    ],
  },
  {
    step: 3, phase: 'Shipping',
    icon: Ship, color: 'text-cyan-400', bg: 'bg-cyan-400/10',
    title: 'Ocean Freight to Pakistan',
    items: [
      'Main Japanese ports: Nagoya, Osaka, Yokohama, Kobe',
      'Destination ports: Karachi (Port Qasim / KPT) or Bin Qasim',
      'Typical transit time: 18–28 days from Japan',
      'Freight cost: ¥80,000–¥200,000+ depending on size and container',
      'Marine insurance: ~0.5–1% of CIF value (strongly recommended)',
      'RoRo (Roll-on/Roll-off) is cheaper; container is safer for high-value cars',
    ],
  },
  {
    step: 4, phase: 'Pakistan Customs',
    icon: Package, color: 'text-orange-400', bg: 'bg-orange-400/10',
    title: 'Clearing at Pakistani Customs',
    items: [
      'File GD (Goods Declaration) via WeBOC system with clearing agent',
      'Customs calculates duties on Customs Value (FOB + freight + insurance)',
      'Pay: Custom Duty + Sales Tax (17%) + Additional CD + Regulatory Duty',
      'Pay: Income Tax (withholding) + Federal Excise Duty (if applicable)',
      'Physical examination may be requested — chassis number verification mandatory',
      'Obtain Out-of-Charge order — typically 2–7 working days',
    ],
  },
  {
    step: 5, phase: 'Port Clearance & Transport',
    icon: Anchor, color: 'text-purple-400', bg: 'bg-purple-400/10',
    title: 'Port Handling & Transport',
    items: [
      'Port handling charges: PKR 15,000–40,000 depending on terminal',
      'Demurrage costs if car sits too long — arrange collection quickly',
      'Transporter fee to your showroom: PKR 8,000–25,000 (distance-based)',
      'Inspect car immediately for any shipping damage before signing release',
      'Do a full inspection before accepting — note any new damage',
    ],
  },
  {
    step: 6, phase: 'Registration',
    icon: Hash, color: 'text-green-400', bg: 'bg-green-400/10',
    title: 'Vehicle Registration in Pakistan',
    items: [
      'Submit all documents to MTMIS / Excise & Taxation office in your city',
      'Required: B/L, customs clearing documents, import permit, CNIC of owner',
      'Pay registration fee based on vehicle type and engine size',
      'Obtain number plate and registration book (book)',
      'Lahore: Punjab MV Authority | Karachi: Sindh Excise | Islamabad: ICT',
      'Process time: 2–6 weeks depending on workload and completeness of docs',
    ],
  },
];

const BEST_CARS = [
  {
    make: 'Toyota', model: 'Aqua / Prius C',
    grade: 'Hybrid', engine: '1500cc', emoji: '🚗',
    pros: ['Excellent fuel economy (28–35 km/l)', 'High resale value in Pakistan', 'Low running cost', 'Widely available parts'],
    cons: ['Hybrid battery replacement costly (PKR 150–300K)', 'Lower ground clearance'],
    avgBidJpy: '400,000–700,000',
    targetPkr: '2,500,000–4,500,000',
    demandRating: 5,
    notes: 'Most popular imported hybrid in Pakistan. Grade 4+ recommended.',
  },
  {
    make: 'Toyota', model: 'Vitz / Yaris',
    grade: 'Petrol', engine: '1000–1300cc', emoji: '🚙',
    pros: ['Very affordable to import', 'Easy parts availability', 'Good fuel economy', 'Reliable'],
    cons: ['No prestige value', 'Small cabin', 'Older designs less appealing'],
    avgBidJpy: '150,000–350,000',
    targetPkr: '1,500,000–2,800,000',
    demandRating: 4,
    notes: 'Best entry-level import for budget buyers. 1.3L RS model most popular.',
  },
  {
    make: 'Honda', model: 'Vezel / HR-V',
    grade: 'Hybrid SUV', engine: '1500cc', emoji: '🚐',
    pros: ['SUV body = premium appeal', 'Hybrid efficiency', 'Spacious interior', 'Strong resale'],
    cons: ['Higher import cost', 'Duty burden heavy at 1500cc'],
    avgBidJpy: '700,000–1,200,000',
    targetPkr: '4,500,000–7,000,000',
    demandRating: 5,
    notes: 'Premium segment — high demand, healthy margins if sourced at right price.',
  },
  {
    make: 'Suzuki', model: 'Wagon R / MR Wagon',
    grade: 'Kei Car', engine: '660cc', emoji: '🚗',
    pros: ['Very low duty (660cc slab)', 'Cheapest to import', 'Easy to park', 'Good city fuel economy'],
    cons: ['Low highway speed appeal', 'Very small — limited market', 'Not popular in Lahore/Karachi upper market'],
    avgBidJpy: '80,000–200,000',
    targetPkr: '1,000,000–1,800,000',
    demandRating: 3,
    notes: 'Best ROI on small budget. Sell to small cities and rural buyers.',
  },
  {
    make: 'Toyota', model: 'C-HR',
    grade: 'Hybrid SUV', engine: '1800cc', emoji: '🛻',
    pros: ['Very stylish / eye-catching', 'Premium positioning', 'Hybrid efficiency', 'Good features'],
    cons: ['Higher duty at 1800cc', 'Rear visibility poor', 'Limited boot space'],
    avgBidJpy: '900,000–1,600,000',
    targetPkr: '5,500,000–8,500,000',
    demandRating: 4,
    notes: 'Fashion-conscious buyers love this. Good for Lahore/Islamabad DHA market.',
  },
  {
    make: 'Honda', model: 'Freed / Freed+',
    grade: 'Minivan', engine: '1500cc', emoji: '🚌',
    pros: ['7-seater for family market', 'Hybrid option available', 'Practical'],
    cons: ['Not premium-looking', 'Tight for large families'],
    avgBidJpy: '500,000–900,000',
    targetPkr: '3,500,000–5,500,000',
    demandRating: 3,
    notes: 'Niche family vehicle. Good margins if targeting middle-income families.',
  },
  {
    make: 'Toyota', model: 'Land Cruiser Prado',
    grade: '4x4 SUV', engine: '2700–4000cc', emoji: '🚙',
    pros: ['Ultra-premium Pakistani market appeal', 'High resale', 'Off-road capability'],
    cons: ['Very high duty (3000cc+)', 'Expensive to import', 'High customs scrutiny'],
    avgBidJpy: '2,500,000–6,000,000',
    targetPkr: '18,000,000–35,000,000',
    demandRating: 5,
    notes: 'Elite segment. Only for well-capitalized dealers. Huge margins possible.',
  },
];

const AUCTION_GRADES = [
  { grade: 'S', desc: 'Near perfect — showroom condition', color: 'text-green-400', bg: 'bg-green-400/10', rec: 'Buy' },
  { grade: '5', desc: 'Excellent — minor scratches only', color: 'text-green-400', bg: 'bg-green-400/10', rec: 'Buy' },
  { grade: '4.5', desc: 'Very good — small dents/scratches', color: 'text-blue-400', bg: 'bg-blue-400/10', rec: 'Good Buy' },
  { grade: '4', desc: 'Good — minor body work needed', color: 'text-blue-400', bg: 'bg-blue-400/10', rec: 'Good Buy' },
  { grade: '3.5', desc: 'Average — some repair needed', color: 'text-yellow-400', bg: 'bg-yellow-400/10', rec: 'Negotiate' },
  { grade: '3', desc: 'Below average — visible damage', color: 'text-orange-400', bg: 'bg-orange-400/10', rec: 'Caution' },
  { grade: 'R', desc: 'Repaired — structural repair declared', color: 'text-red-400', bg: 'bg-red-400/10', rec: 'Avoid unless expert' },
  { grade: 'RA', desc: 'Repaired A-pillar — serious repair', color: 'text-red-400', bg: 'bg-red-400/10', rec: 'Avoid' },
  { grade: '***', desc: 'Flood/fire/total loss history', color: 'text-red-500', bg: 'bg-red-500/10', rec: 'Never Buy' },
];

const AUCTION_HOUSES = [
  { name: 'USS (Used Car System System)', shortName: 'USS', locations: 'Nationwide', notes: 'Largest auction in Japan. Best variety. Need agent membership.' },
  { name: 'JU Auctions', shortName: 'JU', locations: 'Nationwide', notes: 'Japan Used Motor Vehicle Dealers Association — reputable, wide stock.' },
  { name: 'TAA (Toyota Affiliated Auction)', shortName: 'TAA', locations: 'Toyota dealer network', notes: 'Toyota group cars with verified history. Slightly higher prices.' },
  { name: 'CAA (Chubu Auction)', shortName: 'CAA', locations: 'Central Japan', notes: 'Good for Nagoya region cars. Faster port access from Nagoya.' },
  { name: 'NAA (Nagoya Auto Auction)', shortName: 'NAA', locations: 'Nagoya', notes: 'Well-organized, transparent auction sheets.' },
  { name: 'Aucnet', shortName: 'Aucnet', locations: 'Online/Nationwide', notes: 'Online bidding platform — good for remote buying through agents.' },
  { name: 'ZIP / Hero', shortName: 'ZIP', locations: 'Nationwide', notes: 'Smaller auction houses — sometimes better deals, less competition.' },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn('rounded-xl border transition-all cursor-pointer', open ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/20')}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-start gap-3 p-4">
        <Hash className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p className="flex-1 text-sm font-medium text-foreground">{question}</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4"
        >
          <p className="text-xs text-muted-foreground leading-relaxed pl-6">{answer}</p>
        </motion.div>
      )}
    </div>
  );
}

function StepCard({ step }: { step: typeof IMPORT_STEPS[0] }) {
  const [open, setOpen] = useState(step.step <= 2);
  return (
    <Card className="bg-card border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', step.bg)}>
          <step.icon className={cn('w-4.5 h-4.5', step.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">STEP {step.step}</span>
            <Badge className="text-[9px]">{step.phase}</Badge>
          </div>
          <p className="text-sm font-semibold text-foreground mt-0.5">{step.title}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <motion.div
          className="px-4 pb-4"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        >
          <ul className="space-y-2">
            {step.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', step.color)} />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </Card>
  );
}

function DemandStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('w-3 h-3', i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
      ))}
    </div>
  );
}

function CarCard({ car }: { car: typeof BEST_CARS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{car.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground">{car.make} {car.model}</p>
              <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">{car.grade}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{car.engine}</p>
            <div className="flex items-center gap-2 mt-1">
              <DemandStars rating={car.demandRating} />
              <span className="text-[10px] text-muted-foreground">Pakistan demand</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Japan bid</span>
            <span className="font-mono text-foreground">¥{car.avgBidJpy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target PKR sell</span>
            <span className="font-mono text-primary font-medium">PKR {car.targetPkr}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">{car.notes}</p>
        <button
          className="flex items-center gap-1 mt-2 text-[10px] text-primary hover:text-primary/80 transition-colors"
          onClick={() => setOpen(v => !v)}
        >
          {open ? 'Hide details' : 'Show pros/cons'}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {open && (
          <motion.div className="mt-2 grid grid-cols-2 gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div>
              <p className="text-[10px] font-medium text-green-400 mb-1">✓ Pros</p>
              {car.pros.map((p, i) => <p key={i} className="text-[10px] text-muted-foreground">• {p}</p>)}
            </div>
            <div>
              <p className="text-[10px] font-medium text-red-400 mb-1">✗ Cons</p>
              {car.cons.map((c, i) => <p key={i} className="text-[10px] text-muted-foreground">• {c}</p>)}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Budget Planner Tab ────────────────────────────────────────────────────────
// ─── Profit Tracker Tab ───────────────────────────────────────────────────────
interface ProfitEntry {
  id: string; make: string; model: string; grade: string;
  auctionPrice: string; freightJpy: string; landedPkr: string;
  sellingPkr: string; notes: string;
}
const BLANK_PROFIT: Omit<ProfitEntry,'id'> = { make:'', model:'', grade:'', auctionPrice:'', freightJpy:'', landedPkr:'', sellingPkr:'', notes:'' };
const JPY_PKR = 2.1; const USD_PKR = 280;

function ProfitTrackerTab() {
  const [entries, setEntries] = React.useState<ProfitEntry[]>([]);
  const [form, setForm] = React.useState({ ...BLANK_PROFIT });
  const [jpyPkr, setJpyPkr] = React.useState(JPY_PKR);
  const [usdPkr, setUsdPkr] = React.useState(USD_PKR);

  const calc = (e: ProfitEntry) => {
    const auction = parseFloat(e.auctionPrice) || 0;
    const freight = parseFloat(e.freightJpy) || 0;
    const landed = parseFloat(e.landedPkr) || 0;
    const sell = parseFloat(e.sellingPkr) || 0;
    const totalCostPkr = (auction + freight) * jpyPkr + landed;
    const profit = sell - totalCostPkr;
    const margin = totalCostPkr > 0 ? (profit / totalCostPkr * 100) : 0;
    return { totalCostPkr, profit, margin };
  };

  const addEntry = () => {
    if (!form.make || !form.model) return;
    setEntries(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    setForm({ ...BLANK_PROFIT });
  };

  const fmtPkr = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M` : n >= 100_000 ? `${(n/100_000).toFixed(1)}L` : Math.round(n).toLocaleString();

  const totalProfit = entries.reduce((s, e) => s + calc(e).profit, 0);

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">💹 Auction Profit Tracker</p>
        <p className="text-xs text-muted-foreground">Track every auction purchase — calculate landed cost vs. selling price and see your true profit margin.</p>
      </div>

      {/* Rate inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 space-y-1">
          <p className="text-xs text-muted-foreground">JPY → PKR rate</p>
          <Input type="number" value={jpyPkr} onChange={e => setJpyPkr(parseFloat(e.target.value)||JPY_PKR)} className="h-7 text-xs border-border" />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-1">
          <p className="text-xs text-muted-foreground">USD → PKR rate</p>
          <Input type="number" value={usdPkr} onChange={e => setUsdPkr(parseFloat(e.target.value)||USD_PKR)} className="h-7 text-xs border-border" />
        </div>
      </div>

      {/* Add entry form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary"/>Add Purchase</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['make','model','grade','auctionPrice','freightJpy','landedPkr','sellingPkr','notes'] as const).map(field => (
            <div key={field} className="space-y-1">
              <p className="text-[10px] text-muted-foreground capitalize">{field === 'auctionPrice' ? 'Auction Price (JPY)' : field === 'freightJpy' ? 'Freight (JPY)' : field === 'landedPkr' ? 'Duty + Local (PKR)' : field === 'sellingPkr' ? 'Selling Price (PKR)' : field}</p>
              <Input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="h-7 text-xs border-border" placeholder={field === 'auctionPrice' ? 'e.g. 450000' : ''} />
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 flex justify-end mt-1">
            <button onClick={addEntry} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
              + Add to Tracker
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Entries table */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Tracked Purchases ({entries.length})</p>
            <span className={cn('text-sm font-bold', totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
              Total Profit: PKR {fmtPkr(totalProfit)}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>{['Vehicle','Grade','Auction (JPY)','Freight (JPY)','Duty+Local (PKR)','Total Cost (PKR)','Sell (PKR)','Profit','Margin',''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const { totalCostPkr, profit, margin } = calc(e);
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{e.make} {e.model}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.grade || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap">{parseFloat(e.auctionPrice).toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap">{parseFloat(e.freightJpy).toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap">{fmtPkr(parseFloat(e.landedPkr)||0)}</td>
                      <td className="px-3 py-2 text-foreground font-mono whitespace-nowrap">{fmtPkr(totalCostPkr)}</td>
                      <td className="px-3 py-2 text-foreground font-mono whitespace-nowrap">{fmtPkr(parseFloat(e.sellingPkr)||0)}</td>
                      <td className={cn('px-3 py-2 font-bold font-mono whitespace-nowrap', profit >= 0 ? 'text-green-400' : 'text-red-400')}>{fmtPkr(profit)}</td>
                      <td className={cn('px-3 py-2 font-bold whitespace-nowrap', margin >= 15 ? 'text-green-400' : margin >= 5 ? 'text-yellow-400' : 'text-red-400')}>{margin.toFixed(1)}%</td>
                      <td className="px-3 py-2">
                        <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))} className="text-muted-foreground hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {entries.length === 0 && (
        <div className="py-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Add your first purchase above to start tracking profit</p>
        </div>
      )}
    </div>
  );
}

// ─── Market Trends Tab ────────────────────────────────────────────────────────
const MARKET_TRENDS = [
  { model:'Toyota Aqua (GP10)', demand:'Very High', avgJpy:'380,000–520,000', trend:'↑ Rising', pkrRange:'PKR 1.8M–2.4M', insight:'High demand due to fuel economy. GP10 prices rising as supply from Japan dwindles.' },
  { model:'Toyota Vitz (XP130)', demand:'High', avgJpy:'220,000–350,000', trend:'→ Stable', pkrRange:'PKR 1.5M–2.0M', insight:'Consistent seller. 2016–2019 models most popular in Pak market.' },
  { model:'Honda Fit GP5 (Hybrid)', demand:'Medium', avgJpy:'280,000–450,000', trend:'↓ Declining', pkrRange:'PKR 1.7M–2.2M', insight:'iDCD gearbox issues have hurt demand. Price sensitive — buyers seek discount.' },
  { model:'Toyota Corolla Axio', demand:'High', avgJpy:'300,000–500,000', trend:'↑ Rising', pkrRange:'PKR 1.9M–2.8M', insight:'Strong Uber/ride-share demand pushes prices up. Hybrid models fetch premium.' },
  { model:'Suzuki Wagon R (Stingray)', demand:'Very High', avgJpy:'180,000–320,000', trend:'↑ Rising', pkrRange:'PKR 1.4M–1.9M', insight:'Budget segment favourite. Turbo models command 15–20% premium.' },
  { model:'Nissan Note e-Power', demand:'Growing', avgJpy:'350,000–550,000', trend:'↑ Rising', pkrRange:'PKR 2.0M–2.8M', insight:'e-Power efficiency resonates with fuel-conscious buyers. Expect price increase in 2026.' },
  { model:'Toyota Noah/Voxy (R80)', demand:'High', avgJpy:'900,000–1,400,000', trend:'→ Stable', pkrRange:'PKR 5.5M–8.5M', insight:'Family MPV segment steady. Hybrid variants add PKR 1M+ premium.' },
  { model:'Toyota Land Cruiser Prado', demand:'Very High', avgJpy:'3,000,000–6,000,000', trend:'↑ Rising', pkrRange:'PKR 12M–28M', insight:'Prestige + off-road. Used prices rising globally — PK market follows. Supply constrained.' },
  { model:'Honda Vezel (RU3/RU4)', demand:'High', avgJpy:'700,000–1,100,000', trend:'↑ Rising', pkrRange:'PKR 4.2M–6.5M', insight:'Compact crossover most in-demand sub-segment. RS and hybrid variants favoured.' },
];

function MarketTrendsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="font-bold text-sm text-foreground mb-1">📈 Japan Auction Market Trends — Pakistan Import Focus 2025–2026</p>
        <p className="text-xs text-muted-foreground">Live market insights updated for PK import demand. JPY prices are typical recent auction ranges.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>{['Model','Demand','Avg Auction (JPY)','PK Price Range','Trend','Market Insight'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {MARKET_TRENDS.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{r.model}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    r.demand === 'Very High' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                    r.demand === 'High' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                    r.demand === 'Growing' ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' :
                    'bg-muted/50 text-muted-foreground border-border')}>{r.demand}</span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground font-mono whitespace-nowrap">¥{r.avgJpy}</td>
                <td className="px-3 py-2.5 text-primary font-medium whitespace-nowrap">{r.pkrRange}</td>
                <td className={cn('px-3 py-2.5 font-bold whitespace-nowrap',
                  r.trend.startsWith('↑') ? 'text-green-400' : r.trend.startsWith('↓') ? 'text-red-400' : 'text-yellow-400')}>{r.trend}</td>
                <td className="px-3 py-2.5 text-muted-foreground max-w-[280px]">{r.insight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title:'🔥 Best ROI Picks', items:['Toyota Aqua GP10','Suzuki Wagon R Stingray','Toyota Corolla Axio Hybrid'], color:'text-green-400' },
          { title:'⚠ Avoid / Risky', items:['Honda Fit GP5 (iDCD issues)','Pre-2015 Nissan CVT models','Old Honda City AT (box issues)'], color:'text-red-400' },
          { title:'📈 Upcoming Opportunities', items:['Nissan Note e-Power','Toyota Yaris Cross Hybrid','Honda ZR-V'], color:'text-primary' },
        ].map(({ title, items, color }) => (
          <div key={title} className="bg-muted/20 border border-border rounded-xl p-3">
            <p className={cn('text-xs font-bold mb-2', color)}>{title}</p>
            {items.map(item => <p key={item} className="text-xs text-muted-foreground py-0.5">• {item}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetPlannerTab() {  const [fob,          setFob]          = useState('3000000');
  const [freight,      setFreight]      = useState('250000');
  const [insurance,    setInsurance]    = useState('15000');
  const [dutyPct,      setDutyPct]      = useState('50');
  const [clearing,     setClearing]     = useState('80000');
  const [transport,    setTransport]    = useState('25000');
  const [registration, setRegistration] = useState('40000');
  const [reconditioning, setReconditioning] = useState('40000');
  const [targetSell,   setTargetSell]   = useState('4800000');

  const fobN   = Number(fob)   || 0;
  const frN    = Number(freight)|| 0;
  const insN   = Number(insurance)||0;
  const cif    = fobN + frN + insN;
  const duty   = Math.round(cif * (Number(dutyPct)||0) / 100);
  const clrN   = Number(clearing)||0;
  const trnN   = Number(transport)||0;
  const regN   = Number(registration)||0;
  const recN   = Number(reconditioning)||0;
  const total  = cif + duty + clrN + trnN + regN + recN;
  const profit = (Number(targetSell)||0) - total;
  const margin = total > 0 ? ((profit / total) * 100).toFixed(1) : '0.0';

  function Row({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: 'green' | 'red' }) {
    return (
      <div className={`flex justify-between items-center py-1.5 border-b border-border/40 last:border-0 ${bold ? 'font-bold' : ''}`}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm tabular-nums ${highlight === 'green' ? 'text-green-400' : highlight === 'red' ? 'text-red-400' : bold ? 'text-foreground' : 'text-foreground/80'}`}>
          PKR {value.toLocaleString()}
        </span>
      </div>
    );
  }

  function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-8 text-xs px-2 rounded-md border border-border bg-muted/40 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
        <Calculator className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 leading-relaxed">
          Enter your expected costs below to calculate <strong>total landed cost</strong> and projected profit margin.
          All figures in PKR.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm">📥 Cost Inputs</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <Field label="FOB Price (JPY→PKR converted)" value={fob} onChange={setFob} />
            <Field label="Freight Cost" value={freight} onChange={setFreight} />
            <Field label="Marine Insurance" value={insurance} onChange={setInsurance} />
            <Field label="Customs Duty %" value={dutyPct} onChange={setDutyPct} />
            <Field label="Clearing & Forwarding" value={clearing} onChange={setClearing} />
            <Field label="Inland Transport" value={transport} onChange={setTransport} />
            <Field label="Registration / Levy" value={registration} onChange={setRegistration} />
            <Field label="Reconditioning / Prep" value={reconditioning} onChange={setReconditioning} />
            <hr className="border-border" />
            <Field label="🎯 Target Selling Price" value={targetSell} onChange={setTargetSell} />
          </CardContent>
        </Card>

        {/* Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm">📊 Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0.5">
            <Row label="FOB Price"              value={fobN} />
            <Row label="Freight"                value={frN} />
            <Row label="Insurance"              value={insN} />
            <Row label="CIF Value"              value={cif}  bold />
            <Row label={`Customs Duty (${dutyPct}% of CIF)`} value={duty} />
            <Row label="Clearing & Forwarding"  value={clrN} />
            <Row label="Inland Transport"       value={trnN} />
            <Row label="Registration / Levy"    value={regN} />
            <Row label="Reconditioning"         value={recN} />
            <div className="pt-2 mt-2 border-t border-border space-y-0.5">
              <Row label="✅ Total Landed Cost"  value={total}  bold />
              <Row label="🎯 Target Sell Price"  value={Number(targetSell)||0} />
              <Row label={`💰 Gross Profit (${margin}%)`} value={profit} bold highlight={profit >= 0 ? 'green' : 'red'} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benchmarks */}
      <Card className="bg-card border-border">
        <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm">📈 Typical Cost Benchmarks (Pakistan 2024–25)</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs min-w-max">
              <thead><tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground">Cost Item</th>
                <th className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">Low</th>
                <th className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">High</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Notes</th>
              </tr></thead>
              <tbody>
                {[
                  { item: 'Freight (Japan→Karachi)', low: '200,000', high: '350,000', note: 'RoRo cheaper than container' },
                  { item: 'Marine Insurance', low: '12,000', high: '25,000', note: '0.5–1% of CIF value' },
                  { item: 'Customs Duty (1000–1299cc Hybrid)', low: '50% CIF', high: '50% CIF', note: 'FBR slab — verify current rates' },
                  { item: 'Clearing & Forwarding', low: '60,000', high: '120,000', note: 'Port Qasim agent fees' },
                  { item: 'Inland Transport (Karachi→Lahore)', low: '25,000', high: '45,000', note: 'Car carrier / trailer' },
                  { item: 'Registration (Lahore)', low: '35,000', high: '60,000', note: 'Excise levy + token' },
                  { item: 'Reconditioning', low: '20,000', high: '80,000', note: 'Detail, tyres, minor fixes' },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 text-foreground/90 whitespace-nowrap">{r.item}</td>
                    <td className="px-3 py-2 text-right text-green-400 whitespace-nowrap">{r.low}</td>
                    <td className="px-3 py-2 text-right text-amber-400 whitespace-nowrap">{r.high}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inspection Guide Tab ──────────────────────────────────────────────────────
function InspectionGuideTab() {  const [activeSection, setActiveSection] = useState<'pre' | 'sheet' | 'post'>('pre');

  const SECTIONS = [
    { id: 'pre'   as const, label: '🔍 Pre-Bid Online Check',   desc: 'What to verify before placing a bid'     },
    { id: 'sheet' as const, label: '📋 Auction Sheet Reading',  desc: 'Decode every field on the auction sheet' },
    { id: 'post'  as const, label: '🚗 Pre-Ship Physical Check',desc: 'What to inspect before shipping'         },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <Search className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-200 leading-relaxed">
          A thorough inspection process at every stage protects you from expensive mistakes.
          Follow all three stages — online, auction sheet, and pre-shipment physical.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${activeSection === s.id ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'pre' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Pre-Bid Online Checklist</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { cat: '🔴 Red Flags (Walk Away)', items: ['修復歴 (Shuufuku-reki) — structural repair', 'メーター交換 (Odometer replaced)', 'Flood damage indicators (R grade notes)', 'Engine note: 要修理 (Needs repair)', 'Grade below 2 without full explanation'] },
              { cat: '🟡 Yellow Flags (Price Down)', items: ['Panel score A (small dents) × 3+', 'Windshield crack (W or E mark)', 'Interior grade below 3', 'Missing spare tyre or tools', 'Battery replacement soon due (age 4y+)'] },
              { cat: '🟢 Green Lights (Good Buy)', items: ['Grade 4 or 4.5 body, 4 interior', 'Single owner (1オーナー)', 'Dealer maintained (ディーラー整備)', 'Low mileage for age (< 10k km/yr)', 'Full service record attached'] },
              { cat: '📸 Photo Review Checklist', items: ['All four corners — look for panel gaps', 'Undercarriage photo — rust, frame straightness', 'Engine bay — oil leaks, corrosion, fluid levels', 'OBD scan result (if available)', 'Boot / trunk — check for water stains'] },
            ].map((section, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">{section.cat}</p>
                  <ul className="space-y-1.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'sheet' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Auction Sheet Damage Codes — Quick Reference</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: 'A', meaning: 'Scratch', severity: 'Minor', color: 'text-green-400' },
              { code: 'U', meaning: 'Dent (without scratch)', severity: 'Minor', color: 'text-green-400' },
              { code: 'W', meaning: 'Wave / wavy panel', severity: 'Minor–Medium', color: 'text-yellow-400' },
              { code: 'C', meaning: 'Crack', severity: 'Medium', color: 'text-yellow-400' },
              { code: 'S', meaning: 'Rust', severity: 'Medium–Serious', color: 'text-amber-400' },
              { code: 'Y', meaning: 'Corrosion (deep rust)', severity: 'Serious', color: 'text-red-400' },
              { code: 'P', meaning: 'Peeling paint', severity: 'Cosmetic', color: 'text-yellow-400' },
              { code: 'X', meaning: 'Needs replacement (panel)', severity: 'Serious', color: 'text-red-400' },
              { code: 'XX', meaning: 'Replaced panel', severity: 'Note only', color: 'text-blue-400' },
              { code: 'RX', meaning: 'Repaired + replaced', severity: 'Structural concern', color: 'text-red-400' },
              { code: 'B', meaning: 'Burn mark', severity: 'Medium', color: 'text-amber-400' },
              { code: 'E', meaning: 'Exchange (part swapped)', severity: 'Note only', color: 'text-blue-400' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                <span className={`font-mono font-bold text-base w-8 shrink-0 ${r.color}`}>{r.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.meaning}</p>
                  <p className="text-[11px] text-muted-foreground">{r.severity}</p>
                </div>
              </div>
            ))}
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Number Suffix = Size</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[['1','< 10mm (very small)'],['2','10–25mm'],['3','25–50mm'],['4','50mm+ (large)']].map(([n,d]) => (
                  <div key={n} className="text-center p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-lg font-bold text-primary">{n}</p>
                    <p className="text-[11px] text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">e.g. <span className="font-mono text-amber-400">A3</span> = scratch 25–50mm, <span className="font-mono text-red-400">U4</span> = large dent</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'post' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Pre-Shipment Physical Inspection Checklist</p>
          <p className="text-xs text-muted-foreground">Ask your Japan agent or inspection company to verify these items before the car is loaded.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { category: '🔧 Engine & Drivetrain', checks: ['Start engine — smooth idle, no smoke', 'Check all fluids (oil, coolant, brake, power steering)', 'Inspect for active leaks under engine bay', 'Test all forward and reverse gears', 'Check exhaust — no blue/black smoke', 'Listen for knocking or rattling under load'] },
              { category: '🛞 Suspension & Brakes', checks: ['Push down each corner — check shock absorbers', 'Check tyre tread depth (min 3mm recommended)', 'Inspect brake pads through wheel spokes', 'Check for uneven tyre wear (alignment issue)', 'Test handbrake hold on slope', 'Inspect CV boots for cracking or grease leaks'] },
              { category: '💡 Electricals & Interior', checks: ['All dashboard warning lights clear after startup', 'Test air conditioning — cooling and heating', 'Check all power windows, mirrors, seats', 'Test all exterior lights incl. reversing', 'Verify odometer reads same as auction sheet', 'Check infotainment and camera if equipped'] },
              { category: '🚗 Body & Chassis', checks: ['Verify all panel gaps are even', 'Check all four door hinges for sag', 'Inspect boot seal and sunroof seal if present', 'Undercarriage — check for cracks, bent rails', 'Confirm all items listed on auction sheet present', 'Photograph VIN plate and confirm matches docs'] },
            ].map((section, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">{section.category}</p>
                  <ul className="space-y-1.5">
                    {section.checks.map((check, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className="w-4 h-4 rounded border border-border bg-muted/50 shrink-0 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-sm border border-muted-foreground/40" />
                        </div>
                        {check}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AuctionGuidePage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'sheet' | 'duties' | 'freight' | 'cars' | 'grades' | 'houses' | 'damage' | 'tips' | 'faq' | 'yearconv' | 'glossary' | 'bidding' | 'postauction' | 'pitfalls' | 'budget' | 'inspection' | 'profit' | 'trends'>('guide');
  const [dutyFob, setDutyFob] = useState('3000000');
  const [dutySlabIdx, setDutySlabIdx] = useState(8); // default Hybrid
  // Japanese year converter state
  const [jpYear, setJpYear] = useState('');
  const [jpEra, setJpEra] = useState<'Reiwa' | 'Heisei' | 'Showa'>('Reiwa');
  const [gregYear, setGregYear] = useState('');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  // Bidding simulator state
  const [simJpy, setSimJpy] = useState('800000');
  const [simRate, setSimRate] = useState('1.95');
  const [simFreight, setSimFreight] = useState('180000');
  const [simAgent, setSimAgent] = useState('55000');
  const [simClear, setSimClear] = useState('35000');
  const [simDutyPct, setSimDutyPct] = useState('62');
  const [simProfit, setSimProfit] = useState('300000');
  const [simResult, setSimResult] = useState<{ fob:number; cif:number; duties:number; landed:number; target:number; ceiling:number } | null>(null);

  const JP_ERAS = {
    Reiwa:  { start: 2019, offset: 2018 },
    Heisei: { start: 1989, offset: 1988 },
    Showa:  { start: 1926, offset: 1925 },
  };

  const convertJpToGreg = () => {
    const y = parseInt(jpYear);
    if (!y || y < 1) { return; }
    const result = JP_ERAS[jpEra].offset + y;
    setGregYear(result.toString());
  };

  const convertGregToJp = () => {
    const g = parseInt(gregYear);
    if (!g) return;
    if (g >= 2019) { setJpEra('Reiwa');  setJpYear((g - 2018).toString()); }
    else if (g >= 1989) { setJpEra('Heisei'); setJpYear((g - 1988).toString()); }
    else if (g >= 1926) { setJpEra('Showa');  setJpYear((g - 1925).toString()); }
  };

  const TABS = [
    { id: 'guide'      as const, label: 'Import Steps',      icon: ArrowRight   },
    { id: 'sheet'      as const, label: 'Auction Sheet',     icon: FileSearch   },
    { id: 'damage'     as const, label: 'Damage Codes',      icon: AlertTriangle},
    { id: 'grades'     as const, label: 'Grades',            icon: Award        },
    { id: 'duties'     as const, label: 'Duties & Taxes',    icon: Receipt      },
    { id: 'freight'    as const, label: 'Freight & Local',   icon: Truck        },
    { id: 'cars'       as const, label: 'Best Cars',         icon: Car          },
    { id: 'houses'     as const, label: 'Auction Houses',    icon: Globe        },
    { id: 'bidding'    as const, label: 'Bidding Strategy',  icon: TrendingUp   },
    { id: 'postauction'as const, label: 'Post-Auction',      icon: CheckCircle2 },
    { id: 'pitfalls'   as const, label: 'Common Pitfalls',   icon: Shield       },
    { id: 'budget'     as const, label: 'Budget Planner',    icon: Calculator   },
    { id: 'inspection' as const, label: 'Inspection Guide',  icon: Search       },
    { id: 'profit'     as const, label: 'Profit Tracker',    icon: TrendingUp   },
    { id: 'trends'     as const, label: 'Market Trends',     icon: BarChart3    },
    { id: 'yearconv'   as const, label: 'Year Converter',    icon: CalendarDays },
    { id: 'glossary'   as const, label: 'Glossary',          icon: BookOpen     },
    { id: 'tips'       as const, label: 'Pro Tips',          icon: Zap          },
    { id: 'faq'        as const, label: 'FAQ',               icon: Info         },
  ] as const;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Ship className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Japan Car Import Guide</h1>
              <p className="text-xs text-muted-foreground">Complete step-by-step guide for importing vehicles from Japan to Pakistan</p>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-200">
            <span className="font-semibold">Important Disclaimer:</span> Duty rates, regulations, and auction processes change frequently.
            Always verify with FBR (Federal Board of Revenue), your clearing agent, and Pakistan Customs before committing to an import.
            This guide provides educational estimates only.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-1 justify-center',
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}

        {/* ── AUCTION SHEET READING GUIDE ── */}
        {activeTab === 'sheet' && (
          <div className="space-y-5">

            {/* Intro banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <FileSearch className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90">
                <span className="font-semibold text-primary">How to read a Japanese auction sheet.</span>{' '}
                Every car sold at a Japanese auction has a standardised inspection sheet (検査票). Learning to read it lets you
                evaluate condition, negotiate price, and avoid expensive surprises at customs.
              </p>
            </div>

            {/* ── Layout diagram ── */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-primary" />
                  Auction Sheet Layout — Key Zones
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Click any zone to learn what it means</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* Visual grid representation of a typical auction sheet */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    {
                      zone: 'A', label: 'Vehicle Identity', color: 'border-blue-400/60 bg-blue-400/8 text-blue-400',
                      fields: ['Chassis number (車台番号)', 'Registration number', 'Make / Model / Grade', 'Model year (年式)', 'Engine displacement (排気量)', 'Transmission type', 'Drive type (2WD / 4WD)'],
                      tip: 'Always cross-check the chassis number against the export certificate and Pakistan customs paperwork.',
                    },
                    {
                      zone: 'B', label: 'Mileage & Odometer', color: 'border-emerald-400/60 bg-emerald-400/8 text-emerald-400',
                      fields: ['Odometer reading (走行距離)', 'Odometer authenticity flag', 'Service history indicator'],
                      tip: '"メーター交換" = odometer replaced. "距離不明" = mileage unknown. Both are red flags — negotiate heavily or skip.',
                    },
                    {
                      zone: 'C', label: 'Overall Grade', color: 'border-yellow-400/60 bg-yellow-400/8 text-yellow-400',
                      fields: ['Grade number (S / 6 / 5 / 4.5 / 4 / 3.5 / 3 / 2 / R / RA / ***)', 'Interior grade (A / B / C / D)', 'Exterior grade', 'Overall inspector verdict'],
                      tip: 'Grade 4+ is the sweet spot for Pakistan imports. R/RA mean structural repairs — avoid unless you have a trusted mechanic to verify.',
                    },
                    {
                      zone: 'D', label: 'Equipment / Options', color: 'border-purple-400/60 bg-purple-400/8 text-purple-400',
                      fields: ['Sunroof (SR)', 'Leather seats (レザー)', 'Navigation (ナビ)', 'Camera (カメラ)', 'Keyless entry', 'Push start', 'ETC unit', 'Alloy wheels (AW)', 'Side airbags (SA)', 'Curtain airbags (CA)'],
                      tip: 'Factory options like sunroof and navigation increase resale price in Pakistan — especially in Lahore / Islamabad DHA.',
                    },
                    {
                      zone: 'E', label: 'Interior Condition', color: 'border-cyan-400/60 bg-cyan-400/8 text-cyan-400',
                      fields: ['Seat condition (A–D scale)', 'Dashboard cracks', 'Headliner stains', 'Odour flag (smoked / flooded)', 'Carpet / floor condition', 'Steering wear'],
                      tip: 'Interior grade "D" = heavily stained or torn. Budget PKR 30,000–80,000 for a full interior refurbish if buying grade C interior.',
                    },
                    {
                      zone: 'F', label: 'Exterior Diagram', color: 'border-orange-400/60 bg-orange-400/8 text-orange-400',
                      fields: ['Body diagram with damage codes marked', 'A = scratch / scrape', 'U = dent (凹み)', 'W = wave / ripple repair', 'P = paint correction', 'C = crack / rust through', 'X = panel replaced', 'XX = panel replaced + repainted'],
                      tip: '"X" or "XX" on A/B pillars, roof, or floor means structural repair — this is what grades R and RA indicate. A few A/U marks on doors are completely normal and cheap to fix.',
                    },
                  ].map(z => (
                    <ZoneCard key={z.zone} {...z} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Damage code quick-ref ── */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Damage Codes — Quick Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { code: 'A', meaning: 'Scratch / Scrape', severity: 'Minor', color: 'text-green-400 bg-green-400/10' },
                    { code: 'U', meaning: 'Dent (凹み)', severity: 'Minor', color: 'text-green-400 bg-green-400/10' },
                    { code: 'W', meaning: 'Wave / Ripple', severity: 'Low', color: 'text-yellow-400 bg-yellow-400/10' },
                    { code: 'P', meaning: 'Paint Touch-Up', severity: 'Low', color: 'text-yellow-400 bg-yellow-400/10' },
                    { code: 'E', meaning: 'Rust (錆)', severity: 'Medium', color: 'text-orange-400 bg-orange-400/10' },
                    { code: 'C', meaning: 'Crack / Hole', severity: 'High', color: 'text-red-400 bg-red-400/10' },
                    { code: 'S', meaning: 'Sand / Corrosion', severity: 'Medium', color: 'text-orange-400 bg-orange-400/10' },
                    { code: 'B', meaning: 'Break (Broken part)', severity: 'High', color: 'text-red-400 bg-red-400/10' },
                    { code: 'X', meaning: 'Panel Replaced', severity: 'Caution', color: 'text-red-400 bg-red-400/10' },
                    { code: 'XX', meaning: 'Replaced + Repainted', severity: 'Structural', color: 'text-red-500 bg-red-500/10' },
                    { code: 'RX', meaning: 'Repaired panel', severity: 'Structural', color: 'text-red-500 bg-red-500/10' },
                    { code: '1–9', meaning: 'Size of damage (1=small → 9=large)', severity: 'Scale', color: 'text-blue-400 bg-blue-400/10' },
                  ].map(d => (
                    <div key={d.code} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                      <span className={cn('text-sm font-black px-2 py-0.5 rounded-md shrink-0', d.color)}>{d.code}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">{d.meaning}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{d.severity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 px-3 py-2.5 bg-muted/20 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Damage notation example:</span>{' '}
                    "U2" = small dent (size 2). "A3" = medium scratch. "X" on a door sill = panel replaced.
                    Multiple "X" on pillars = structural — walk away unless buying for parts.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Interior & exterior grading ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-sm">Interior Grade (内装)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {[
                    { grade: 'A', desc: 'Clean — like new, no visible wear', rec: 'Excellent', color: 'text-green-400 bg-green-400/10' },
                    { grade: 'B', desc: 'Minor wear — light marks, small stains', rec: 'Good', color: 'text-blue-400 bg-blue-400/10' },
                    { grade: 'C', desc: 'Moderate — torn seats, visible stains', rec: 'Negotiate', color: 'text-yellow-400 bg-yellow-400/10' },
                    { grade: 'D', desc: 'Poor — heavy damage, odour, flooding', rec: 'Avoid', color: 'text-red-400 bg-red-400/10' },
                  ].map(g => (
                    <div key={g.grade} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0', g.color)}>{g.grade}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{g.desc}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground shrink-0">{g.rec}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-sm">Overall Grade (総合評価)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {[
                    { grade: 'S / 6', desc: 'Near perfect — under 5,000 km, showroom quality', rec: 'Premium', color: 'text-emerald-400 bg-emerald-400/10' },
                    { grade: '5',     desc: 'Excellent — very light marks, well-maintained', rec: 'Buy', color: 'text-green-400 bg-green-400/10' },
                    { grade: '4.5',   desc: 'Very good — minor dents or scratches', rec: 'Buy', color: 'text-green-400 bg-green-400/10' },
                    { grade: '4',     desc: 'Good — small repairs needed, solid buy', rec: 'Good Buy', color: 'text-blue-400 bg-blue-400/10' },
                    { grade: '3.5',   desc: 'Average — some cosmetic work needed', rec: 'Negotiate', color: 'text-yellow-400 bg-yellow-400/10' },
                    { grade: '3',     desc: 'Below average — visible damage, budget extra', rec: 'Caution', color: 'text-orange-400 bg-orange-400/10' },
                    { grade: 'R / RA',desc: 'Repaired structural damage declared', rec: 'Avoid', color: 'text-red-400 bg-red-400/10' },
                    { grade: '***',   desc: 'Flood, fire or total loss history', rec: 'Never', color: 'text-red-500 bg-red-500/10' },
                  ].map(g => (
                    <div key={g.grade} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                      <span className={cn('min-w-[2.5rem] px-1.5 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0', g.color)}>{g.grade}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground leading-tight">{g.desc}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground shrink-0">{g.rec}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* ── Common equipment codes ── */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Common Equipment Codes on Auction Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { code: 'SR', label: 'Sunroof', value: '++PKR' },
                    { code: 'AW', label: 'Alloy Wheels', value: '+PKR' },
                    { code: 'TV', label: 'TV / Entertainment', value: '+PKR' },
                    { code: 'Navi', label: 'Navigation System', value: '+PKR' },
                    { code: 'BK', label: 'Back Camera', value: '+PKR' },
                    { code: 'ETC', label: 'Electronic Toll Card', value: 'Japan only' },
                    { code: 'PS', label: 'Power Steering', value: 'Standard' },
                    { code: 'PW', label: 'Power Windows', value: 'Standard' },
                    { code: 'AC', label: 'Air Conditioning', value: 'Standard' },
                    { code: 'SRS', label: 'Airbags (SRS)', value: 'Safety' },
                    { code: 'SA', label: 'Side Airbags', value: '++Safety' },
                    { code: 'CA', label: 'Curtain Airbags', value: '++Safety' },
                    { code: 'HID', label: 'HID / Xenon Lights', value: '+PKR' },
                    { code: 'LED', label: 'LED Headlights', value: '++PKR' },
                    { code: 'LS', label: 'Leather Seats', value: '++PKR' },
                    { code: 'SS', label: 'Sport Suspension', value: 'Niche' },
                    { code: '4WD', label: 'Four Wheel Drive', value: '+++PKR' },
                    { code: 'HV', label: 'Hybrid Vehicle', value: '+++PKR' },
                  ].map(e => (
                    <div key={e.code} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono shrink-0">{e.code}</span>
                      <span className="text-[10px] text-foreground flex-1 min-w-0 truncate">{e.label}</span>
                      <span className="text-[9px] text-muted-foreground shrink-0">{e.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Red flags & pro tips ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-red-400/20">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Red Flags — Walk Away
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {[
                    'Grade R, RA, or *** — structural repair or total loss',
                    '"メーター交換" — odometer has been replaced',
                    '"距離不明" — mileage unknown / unverifiable',
                    'X or XX marks on A-pillar, B-pillar, or roof',
                    'Interior grade D with odour flag — likely flood damage',
                    '"修復歴あり" anywhere on sheet — disclosed repair history',
                    'Chassis number doesn\'t match export certificate',
                    'Radiation certificate missing (post-March 2011 vehicles)',
                  ].map((flag, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-red-400/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      </span>
                      <p className="text-xs text-muted-foreground leading-snug">{flag}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-green-400/20">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4" /> Pro Tips for Pakistani Buyers
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {[
                    'Always request the full auction sheet PDF — not just the grade number',
                    'Grade 4+ with interior A/B is ideal for Lahore / Karachi resale',
                    'A few "A1" or "U1" marks are normal — price accordingly, not a dealbreaker',
                    'Check engine size against Pakistan duty slabs before bidding',
                    'Hybrid (HV) badge = higher resale — worth premium at auction',
                    '4WD on a Prado or Land Cruiser is essential — verify it\'s present',
                    'If sunroof (SR) leaks, fix before rainy season in Pakistan — budget PKR 15–30K',
                    'Ask agent for translation of any handwritten Japanese notes on the sheet',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-snug">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* ── Japanese terms glossary ── */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Essential Japanese Terms on Auction Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { jp: '車台番号', romaji: 'Shatai bangō', en: 'Chassis number (VIN)' },
                    { jp: '走行距離', romaji: 'Sōkō kyori', en: 'Odometer / mileage' },
                    { jp: '年式',     romaji: 'Nenshiki',    en: 'Model year' },
                    { jp: '排気量',   romaji: 'Haikiryō',    en: 'Engine displacement (cc)' },
                    { jp: '修復歴',   romaji: 'Shūfuku-reki',en: 'Repair history (structural)' },
                    { jp: 'メーター交換', romaji: 'Mētā kōkan', en: 'Odometer replaced' },
                    { jp: '距離不明', romaji: 'Kyori fumei', en: 'Mileage unknown' },
                    { jp: '凹み',     romaji: 'Kubomi',      en: 'Dent (code: U)' },
                    { jp: '傷',       romaji: 'Kizu',        en: 'Scratch (code: A)' },
                    { jp: '錆',       romaji: 'Sabi',        en: 'Rust (code: E)' },
                    { jp: '内装',     romaji: "Naisō",       en: 'Interior condition' },
                    { jp: '外装',     romaji: 'Gaisō',       en: 'Exterior condition' },
                    { jp: '禁煙車',   romaji: "Kin'en-sha",  en: 'Non-smoking vehicle' },
                    { jp: '水没車',   romaji: 'Suibotsu-sha',en: 'Flood-damaged vehicle' },
                    { jp: '事故車',   romaji: 'Jiko-sha',    en: 'Accident vehicle' },
                    { jp: '整備記録', romaji: 'Seibi kiroku', en: 'Service history records' },
                  ].map(t => (
                    <div key={t.jp} className="flex items-center gap-2 py-1.5 border-b border-border/30">
                      <span className="text-sm font-bold text-primary w-20 shrink-0">{t.jp}</span>
                      <span className="text-[10px] text-muted-foreground/70 italic w-24 shrink-0 hidden md:block">{t.romaji}</span>
                      <span className="text-xs text-foreground">{t.en}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { icon: Clock, label: 'Total Timeline', value: '45–90 days', color: 'text-blue-400' },
                { icon: DollarSign, label: 'Typical All-In Cost', value: 'PKR 2M – 15M+', color: 'text-primary' },
                { icon: Shield, label: 'Key Risk', value: 'Duty changes, Exchange rate', color: 'text-red-400' },
              ].map(stat => (
                <Card key={stat.label} className="bg-card border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <stat.icon className={cn('w-5 h-5 shrink-0', stat.color)} />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {IMPORT_STEPS.map(step => <StepCard key={step.step} step={step} />)}
          </div>
        )}

        {/* ── DUTIES & TAXES TAB ─────────────────────────────────────────── */}
        {activeTab === 'duties' && (
          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-yellow-200">
                Rates from Pakistan Customs Tariff 2024-25 (FBR). Verify at <span className="font-semibold">fbr.gov.pk</span> before filing — rates change with each federal budget.
              </p>
            </div>

            {/* Live Calculator */}
            <Card className="bg-card border-primary/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" /> Quick Duty Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">FOB Value (PKR)</label>
                    <input
                      type="number"
                      value={dutyFob}
                      onChange={e => setDutyFob(e.target.value)}
                      className="w-full h-8 px-3 rounded-md bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Engine / Vehicle Type</label>
                    <select
                      value={dutySlabIdx}
                      onChange={e => setDutySlabIdx(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-md bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      {AUCTION_DUTY_SLABS.map((s, i) => (
                        <option key={i} value={i}>{s.category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(() => {
                  const fob = parseFloat(dutyFob) || 0;
                  const slab = AUCTION_DUTY_SLABS[dutySlabIdx];
                  const d = calcDuty(fob, slab);
                  const rows = [
                    { label: `Custom Duty (CD) ${slab.cd}`,     value: d.cd,  color: 'text-orange-400' },
                    { label: `Regulatory Duty (RD) ${slab.rd}`, value: d.rd,  color: 'text-yellow-400' },
                    { label: `Sales Tax (ST) 17%`,              value: d.st,  color: 'text-blue-400'   },
                    { label: `FED ${slab.fed}`,                  value: d.fed, color: 'text-purple-400' },
                    { label: `Income Tax (IT) ${slab.it}`,       value: d.it,  color: 'text-pink-400'   },
                  ];
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {rows.map(r => (
                          <div key={r.label} className="bg-muted/30 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-muted-foreground leading-tight">{r.label}</p>
                            <p className={cn('text-xs font-bold mt-1', r.color)}>{fmt(r.value)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-4 py-3">
                        <span className="text-sm font-semibold text-foreground">Total Govt Duties</span>
                        <span className="text-lg font-bold text-primary">{fmt(d.total)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-muted/20 rounded-lg px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">Estimated Total Landed (FOB + duties)</span>
                        <span className="text-sm font-bold text-foreground">{fmt(fob + d.total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* HS Code Slab Table */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" /> HS Code Duty Slabs — Chapter 87 (Vehicles)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {['Category', 'HS Code', 'Duty & Taxes (USD)', 'Duty & Taxes (PKR)', 'HEV Exempt', 'CD', 'RD', 'ST', 'FED', 'IT', 'Notes'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {AUCTION_DUTY_SLABS.map((s, i) => (
                        <tr key={i} className={cn('hover:bg-muted/20 transition-colors', dutySlabIdx === i && 'bg-primary/5')}>
                          <td className="px-3 py-2.5">
                            <span className={cn('text-xs font-medium', s.color)}>{s.category}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{s.hs_code}</td>
                          <td className="px-3 py-2.5 text-xs font-bold text-green-400 whitespace-nowrap">
                            {s.usd > 0 ? `$ ${s.usd.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-bold text-yellow-300 whitespace-nowrap">
                            {s.pkr > 0 ? `PKR ${(s.pkr / 100000).toFixed(1)}L` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-emerald-400 whitespace-nowrap">{s.hybridExempt}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-orange-400 whitespace-nowrap">{s.cd}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-yellow-400 whitespace-nowrap">{s.rd}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-blue-400 whitespace-nowrap">{s.st}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-purple-400 whitespace-nowrap">{s.fed}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-pink-400 whitespace-nowrap">{s.it}</td>
                          <td className="px-3 py-2.5 text-[10px] text-muted-foreground max-w-[220px]">{s.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">2026 Rates:</span> Fixed USD amounts apply to Asian makes (passenger vehicles for transportation of persons).
                    PKR equivalent at <span className="text-foreground font-medium">1 USD = PKR 279</span> (SBP reference rate — recalculated at filing date).
                    Source: <span className="text-primary">FBR SRO 2026 / Pakistan Customs Tariff</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Depreciation:</span> 1% per month on total duty &amp; taxes, admissible based on vehicle age from manufacture date.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">HEV Exemption:</span> 50% off total duty for Hybrid Electric Vehicles ≤1800cc · 25% off for HEV 1801–2500cc.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Key:</span> CD = Custom Duty · RD = Regulatory Duty · ST = Sales Tax (on CIF+CD+RD) · FED = Federal Excise Duty · IT = Income Tax.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional charges */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p><span className="text-foreground font-semibold">Duty base value</span> — Pakistan Customs uses the <span className="text-foreground">Transaction Value (TV)</span> method per WTO Agreement. If TV is contested, customs uses the assessed/Dubai Tariff value.</p>
                  <p><span className="text-foreground font-semibold">Hybrid concession (2026)</span> — <span className="text-emerald-400 font-semibold">50% exemption</span> on all duty &amp; taxes for HEVs ≤1800cc. <span className="text-yellow-400 font-semibold">25% exemption</span> for HEVs 1801–2500cc. Mild hybrids (48V belt-ISG) may be classified as petrol — verify HS code with your clearing agent.</p>
                  <p><span className="text-foreground font-semibold">Depreciation benefit</span> — <span className="text-primary font-semibold">1% per month</span> reduction in duty &amp; taxes based on vehicle age from manufacture date. A 3-year-old car saves 36% off the fixed duty amount.</p>
                  <p><span className="text-foreground font-semibold">Age restriction</span> — Vehicles older than 5 years from manufacture date (3 years for commercial) require SRO 577 exemption or are prohibited.</p>
                  <p><span className="text-foreground font-semibold">Exchange rate</span> — SBP rate on date of import GD filing is used to convert USD/JPY → PKR for duty computation. PKR shown at 1 USD = 279 PKR — verify current SBP rate before filing.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── FREIGHT & LOCAL CHARGES TAB ───────────────────────────────────── */}
        {activeTab === 'freight' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-200">
                Freight rates are approximate FY2024-25 market rates (JPY/PKR) from Nagoya/Osaka/Kobe to Karachi Port Qasim (RoRo vessel).
                Container prices for Colombo transhipment route. Rates fluctuate with fuel surcharges — confirm with your freight forwarder.
              </p>
            </div>

            {/* Freight table */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-primary" /> Japan → Karachi Sea Freight Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {['Vehicle Type', 'Freight (JPY)', 'Approx. PKR', 'Description'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {FREIGHT_RATES.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{r.type}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-primary whitespace-nowrap">{r.jpy}</td>
                          <td className="px-4 py-3 text-xs text-emerald-400 font-semibold whitespace-nowrap">{r.pkr}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Local clearance charges */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Pakistan Port & Local Clearance Charges
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {['Charge Item', 'Typical Range', 'Notes'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {LOCAL_CHARGES.map((c, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{c.item}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-primary whitespace-nowrap">{c.range}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Shipping route visual */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ship className="w-4 h-4 text-primary" /> Typical Shipping Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-start gap-0 overflow-x-auto pb-1">
                  {[
                    { label: 'Auction Won',        sub: 'Day 0',      color: 'bg-primary',           icon: Award   },
                    { label: 'Japan Export Docs',   sub: '3–7 days',   color: 'bg-blue-500',          icon: FileText},
                    { label: 'Port Loading',        sub: '7–14 days',  color: 'bg-indigo-500',        icon: Anchor  },
                    { label: 'Sea Transit',         sub: '18–25 days', color: 'bg-purple-500',        icon: Ship    },
                    { label: 'Karachi Port',        sub: '~Day 35–45', color: 'bg-orange-500',        icon: MapPin  },
                    { label: 'Customs Clearance',   sub: '5–14 days',  color: 'bg-yellow-500',        icon: FileSearch},
                    { label: 'Vehicle Delivered',   sub: 'Day 45–75',  color: 'bg-emerald-500',       icon: CheckCircle2},
                  ].map((step, i, arr) => (
                    <div key={i} className="flex items-center shrink-0">
                      <div className="flex flex-col items-center text-center w-24">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', step.color)}>
                          <step.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-[10px] font-medium text-foreground mt-1.5 leading-tight">{step.label}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{step.sub}</p>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-6 h-px bg-border shrink-0 mx-1 mt-[-18px]" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Money-Saving Tips</p>
                <ul className="space-y-1.5">
                  {[
                    'Consolidate 2 small cars in one 20ft container to halve freight per unit',
                    'Pay duties within 24–48 hrs of GD filing to avoid demurrage at KPT',
                    'Get marine insurance (0.5–1% CIF) — covers theft, water damage, accidents at sea',
                    'Use a Karachi-based clearing agent with WeBOC expertise to cut delays',
                    'Japanese auctions: set max bid in system — avoid bidding wars and overbidding',
                    'Track SBP open-market rate weekly — import when JPY is weak vs PKR',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'cars' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Best vehicles to import from Japan for the Pakistani market, ranked by demand and ROI potential.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BEST_CARS.map(car => <CarCard key={`${car.make}-${car.model}`} car={car} />)}
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Japanese auction houses grade every vehicle. Understanding grades is essential for avoiding costly surprises.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Grade</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {AUCTION_GRADES.map(g => (
                    <tr key={g.grade} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className={cn('text-lg font-bold', g.color)}>{g.grade}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{g.desc}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full border', g.bg, g.color)}>
                          {g.rec}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="text-foreground font-medium">Interior Grade</span> — Also check interior rating: A (Excellent) → B → C → D (Poor). E.g., "4B" = exterior grade 4, interior B.</p>
                    <p><span className="text-foreground font-medium">Auction Sheet Numbers</span> — Circles and numbers on the sheet indicate dent/scratch locations. Always get a translated sheet if you can't read Japanese.</p>
                    <p><span className="text-foreground font-medium">A2 / A3 Columns</span> — Large circles = major damage. Always compare these positions to the vehicle photo in the sheet.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'houses' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Major Japanese auction houses used for exporting vehicles to Pakistan.</p>
            {AUCTION_HOUSES.map(ah => (
              <Card key={ah.shortName} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{ah.name}</p>
                        <Badge className="text-[9px]">{ah.shortName}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-1" />{ah.locations}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{ah.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-card border-border mt-4">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Useful Online Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {[
                  { name: 'SBI Motor Japan', url: 'https://www.sbimotors.com', desc: 'Popular export agent for Pakistani buyers' },
                  { name: 'BE FORWARD', url: 'https://www.beforward.jp', desc: 'Direct buy platform — easy auction sheets' },
                  { name: 'EVERY CAR Japan', url: 'https://www.everycar.jp', desc: 'Good auction sheet access' },
                  { name: 'FBR WeBOC', url: 'https://weboc.gov.pk', desc: 'Pakistan customs filing portal' },
                  { name: 'Pakistan Customs Tariff (FBR)', url: 'https://fbr.gov.pk', desc: 'Official duty rates' },
                ].map(r => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="text-muted-foreground">— {r.desc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DAMAGE CODES ── */}
        {activeTab === 'damage' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90">
                <span className="font-semibold text-primary">Auction sheet damage codes</span> are stamped or handwritten on a silhouette diagram of the car. Each code + position tells you exactly what damage exists and where.
              </p>
            </div>

            {/* Visual body diagram with code legend */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-sm">Damage Code Reference — Body Diagram</CardTitle>
                <p className="text-xs text-muted-foreground">Codes appear on a top-view car outline. Each panel has its own set of marks.</p>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* SVG top-view car outline with labelled zones */}
                <div className="relative w-full max-w-sm mx-auto select-none">
                  <svg viewBox="0 0 200 380" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Body outline */}
                    <rect x="30" y="20" width="140" height="340" rx="30" className="fill-muted/40 stroke-border" strokeWidth="2"/>
                    {/* Roof */}
                    <rect x="50" y="100" width="100" height="130" rx="8" className="fill-primary/10 stroke-primary/40" strokeWidth="1.5"/>
                    {/* Front bumper */}
                    <rect x="45" y="22" width="110" height="28" rx="10" className="fill-blue-400/10 stroke-blue-400/40" strokeWidth="1.5"/>
                    {/* Rear bumper */}
                    <rect x="45" y="330" width="110" height="28" rx="10" className="fill-blue-400/10 stroke-blue-400/40" strokeWidth="1.5"/>
                    {/* Left doors */}
                    <rect x="30" y="130" width="22" height="70" rx="4" className="fill-yellow-400/10 stroke-yellow-400/40" strokeWidth="1.5"/>
                    {/* Right doors */}
                    <rect x="148" y="130" width="22" height="70" rx="4" className="fill-yellow-400/10 stroke-yellow-400/40" strokeWidth="1.5"/>
                    {/* Hood */}
                    <rect x="50" y="52" width="100" height="48" rx="6" className="fill-emerald-400/10 stroke-emerald-400/40" strokeWidth="1.5"/>
                    {/* Trunk */}
                    <rect x="50" y="280" width="100" height="48" rx="6" className="fill-emerald-400/10 stroke-emerald-400/40" strokeWidth="1.5"/>
                    {/* Labels */}
                    <text x="100" y="42" textAnchor="middle" className="fill-blue-400" fontSize="8" fontWeight="bold">FRONT BUMPER</text>
                    <text x="100" y="80" textAnchor="middle" className="fill-emerald-400" fontSize="8" fontWeight="bold">HOOD / BONNET</text>
                    <text x="100" y="167" textAnchor="middle" className="fill-primary" fontSize="8" fontWeight="bold">ROOF</text>
                    <text x="18" y="170" textAnchor="middle" className="fill-yellow-400" fontSize="7" fontWeight="bold" transform="rotate(-90,18,170)">L DOOR</text>
                    <text x="182" y="170" textAnchor="middle" className="fill-yellow-400" fontSize="7" fontWeight="bold" transform="rotate(90,182,170)">R DOOR</text>
                    <text x="100" y="308" textAnchor="middle" className="fill-emerald-400" fontSize="8" fontWeight="bold">BOOT / TRUNK</text>
                    <text x="100" y="352" textAnchor="middle" className="fill-blue-400" fontSize="8" fontWeight="bold">REAR BUMPER</text>
                  </svg>
                </div>

                {/* Code table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Japanese</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Meaning</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Severity</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Repair Cost (est.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        { code: 'A', jp: '傷', meaning: 'Scratch / light scrape', severity: 'Minor', color: 'text-green-400', cost: 'PKR 2k–8k' },
                        { code: 'U', jp: '凹み', meaning: 'Dent (no paint damage)', severity: 'Minor', color: 'text-green-400', cost: 'PKR 3k–12k (PDR)' },
                        { code: 'W', jp: '波打ち', meaning: 'Wave / ripple from old repair', severity: 'Moderate', color: 'text-yellow-400', cost: 'PKR 8k–25k' },
                        { code: 'P', jp: 'パテ補修', meaning: 'Putty / filler repair (repainted)', severity: 'Moderate', color: 'text-yellow-400', cost: 'PKR 10k–30k' },
                        { code: 'E', jp: 'へこみ大', meaning: 'Large dent with paint damage', severity: 'Moderate', color: 'text-yellow-400', cost: 'PKR 15k–40k' },
                        { code: 'R', jp: '錆', meaning: 'Rust spot', severity: 'Moderate–High', color: 'text-orange-400', cost: 'PKR 10k–50k' },
                        { code: 'C', jp: '割れ', meaning: 'Crack / puncture through panel', severity: 'High', color: 'text-orange-400', cost: 'PKR 20k–80k' },
                        { code: 'B', jp: 'へこみ凹み', meaning: 'Buckle / crumple zone deformed', severity: 'High', color: 'text-red-400', cost: 'PKR 40k–120k' },
                        { code: 'X', jp: '交換', meaning: 'Panel replaced (not OEM)', severity: 'High', color: 'text-red-400', cost: 'Already done — verify weld' },
                        { code: 'XX', jp: '交換+塗装', meaning: 'Panel replaced AND repainted', severity: 'High', color: 'text-red-400', cost: 'Already done — check alignment' },
                        { code: 'S', jp: '錆穴', meaning: 'Rust hole — panel eaten through', severity: 'Critical', color: 'text-red-500', cost: 'PKR 60k–200k+' },
                        { code: '●', jp: 'へこみ印', meaning: 'Small dent mark (circle on diagram)', severity: 'Minor', color: 'text-green-400', cost: 'PKR 2k–8k' },
                        { code: '○', jp: '大きい凹み', meaning: 'Large dent mark (open circle)', severity: 'Moderate', color: 'text-yellow-400', cost: 'PKR 8k–25k' },
                      ].map(row => (
                        <tr key={row.code} className="hover:bg-muted/20 whitespace-nowrap">
                          <td className="px-3 py-2 font-bold font-mono text-base text-foreground">{row.code}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.jp}</td>
                          <td className="px-3 py-2 text-foreground">{row.meaning}</td>
                          <td className="px-3 py-2"><span className={cn('font-medium', row.color)}>{row.severity}</span></td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{row.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Interior damage codes */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-primary" /> Interior Grade Scale</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { grade: 'A', desc: 'Excellent — almost new', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
                      { grade: 'B', desc: 'Good — minor stains only', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
                      { grade: 'C', desc: 'Fair — visible wear, torn seat', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
                      { grade: 'D', desc: 'Poor — heavy stains, broken parts', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                    ].map(g => (
                      <div key={g.grade} className={cn('rounded-lg border p-3 text-center', g.color)}>
                        <p className="text-2xl font-black">{g.grade}</p>
                        <p className="text-[10px] mt-1">{g.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="bg-yellow-500/5 border-yellow-500/20">
                  <CardContent className="p-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><span className="text-foreground font-medium">Reading diagram position:</span> Damage codes are placed directly on the car silhouette. A code near the front-left corner = front-left panel damage.</p>
                      <p><span className="text-foreground font-medium">Multiple codes same panel:</span> "AUA" = scratch + dent + scratch on same panel. Read left to right for severity.</p>
                      <p><span className="text-foreground font-medium">Pakistan tip:</span> Codes W, P, X on A/B pillars or floor pan = structural concern — get a pre-purchase inspection in Japan before shipping.</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PRO TIPS ── */}
        {activeTab === 'tips' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90">
                <span className="font-semibold text-primary">Expert tips from experienced Pakistan importers.</span>{' '}
                These insights come from dealers who've imported hundreds of cars from Japan.
              </p>
            </div>
            {[
              {
                cat: 'Bidding Strategy', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: TrendingUp,
                tips: [
                  'Always set a hard ceiling bid — include shipping (¥80k–120k), destination charges (PKR 30k), and your profit margin before bidding.',
                  'Bid in the last 30 seconds of online auctions to prevent counter-bids from other buyers (called "sniping").',
                  'For USS auctions, winning bids within ¥10,000 of the reserve often get accepted — agents can sometimes negotiate slightly below.',
                  'Look for "流札" (ryūsatsu — unsold at auction) cars. Dealers relist them at lower reserves. Great deals for patient buyers.',
                  'Avoid bidding on Mondays — lots are listed over the weekend; inventory is thin and prices spike with less competition.',
                  'Bid on rainy days: fewer buyers attend physical auctions in bad weather, driving prices down 3–8% on average.',
                  'Set a per-model price ceiling in JPY before the session starts. Emotion during live bidding causes most over-purchases.',
                  'Grade 3.5 cars often offer the best ROI — they have cosmetic flaws that scare off Pakistan buyers but mechanically are sound.',
                ],
              },
              {
                cat: 'Sheet Evaluation', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: FileSearch,
                tips: [
                  'Always request the full auction sheet PDF, not just the grade. A grade-4 car with X on the B-pillar is a structural repair — avoid.',
                  'Cross-check mileage against the year: a 2020 car with 150,000km averages 25,000km/year — possible taxi/rental history.',
                  '"メーター交換" (odometer changed) is always a red flag, even with documentation. Negotiate 15–20% off or skip.',
                  'Interior grade matters more for Pakistan. Leather interiors with grade B sell 20% faster than grade A cars with damaged interiors.',
                  'Always request the 360° photo package from your agent — some auction houses provide 40+ interior photos.',
                  'The letter "R" on a panel means repainted — not necessarily structural damage, but check adjacent panels for the "W" (wavy) code.',
                  'Small "A" marks (light scratches) near door edges are normal and cheap to fix. Marks on roof or quarters indicate parking lot damage.',
                  'Check the engine start photo. A cold-start video from the yard is worth requesting — shows smoke, idle stability, and warning lights.',
                  '"走行距離不明" (mileage unknown) is different from "メーター交換". Unknown usually means the car came from overseas previously.',
                ],
              },
              {
                cat: 'Agent Selection', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: Shield,
                tips: [
                  'Use agents who are registered USS/JU members — they get direct auction access and better sheet accuracy.',
                  'Always pay via escrow or documented bank transfer. Never pay a new agent via informal channels.',
                  'Good agents charge 15,000–25,000 yen commission per car. Anything under ¥10k is suspicious (hidden fees elsewhere).',
                  'Ask your agent for references from other Pakistani buyers. Experienced agents will have 10+ active Pakistani clients.',
                  'Agents who offer "guaranteed grade" claims are lying — auction grades are set by inspectors, not exporters.',
                  'Prefer agents who send you the original auction sheet scan, not a translated summary — translation can hide key codes.',
                  'A good agent will tell you NOT to buy a specific car. If your agent never declines a car, they\'re just collecting commission.',
                  'Check if your agent has a physical yard in Japan — storage quality affects the car\'s condition during the 4–8 week pre-shipment period.',
                ],
              },
              {
                cat: 'Pakistan Customs & Clearance', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: Package,
                tips: [
                  'File WeBOC declaration before the vessel arrives at Karachi Port to avoid demurrage charges (PKR 3,000/day after 7 days free).',
                  'Ensure your BL (Bill of Lading), invoice, and packing list match exactly — any mismatch delays clearance by 2–4 weeks.',
                  'For dual-use hybrids (e.g. Aqua, Prius, Vezel), carry the official engine displacement certificate to avoid misclassification.',
                  'Hire a Karachi-based clearing agent who specialises in Japanese cars — they know inspectors at Preventive Collectorate personally.',
                  'Pay duty within 5 working days of assessment to avoid 12% default surcharge on outstanding amount.',
                  'Depreciation benefit: calculate months from manufacture date to import GD filing — 1% per month reduces your fixed duty amount.',
                  'For HEVs, bring the Japanese vehicle registration (車検証) showing "HV" or "ハイブリッド" — this is your proof for the 50%/25% exemption.',
                  'Karachi port congestion peaks in Oct–Dec. Clear documents 2 weeks before vessel arrival during this period.',
                  'Keep a certified copy of all customs documents for 3 years — FBR post-clearance audit can raise queries on past imports.',
                ],
              },
              {
                cat: 'Depreciation & Duty Savings', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: Calculator,
                tips: [
                  '1% per month depreciation is admissible on the fixed duty amount — a 36-month-old car saves 36% of duty vs. a brand-new one.',
                  'Count months from the Japanese manufacture date (製造年月 on the vehicle plate), not the auction or purchase date.',
                  'A 2022-manufactured Aqua imported in July 2026 = ~42 months old = 42% depreciation. At USD 18,590 duty, that saves ~USD 7,808.',
                  'HEV + depreciation stacks: a 3-year-old Prius gets 50% HEV exemption AND 36% depreciation on the remaining 50% — very significant savings.',
                  'Always have your clearing agent compute the exact depreciation months — even one extra month can save USD 180–280 in duty.',
                  'Depreciation applies to the total duty & taxes amount, not just CD. Verify your clearance agent is applying it on all components.',
                ],
              },
              {
                cat: 'Common Mistakes to Avoid', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: AlertTriangle,
                tips: [
                  'Skipping the pre-inspection: Always pay ¥5,000–15,000 for a third-party physical inspection at the Japanese yard before shipping.',
                  'Ignoring the chassis number check: Run every chassis through CARFAX Japan or JAAI before committing to a bid.',
                  'Buying flood-damaged cars: "★★★" grade = flood/fire history. These cars pass visually but have hidden ECU corrosion.',
                  'Underestimating local charges: Karachi handling + Cantt workshop tow + WeBOC fee + clearing agent = PKR 80k–120k extra.',
                  'Buying without checking Pakistan availability of spare parts. Always verify part cost before importing anything unusual.',
                  'Confusing manufacture year and model year — some JDM models are built 6–12 months before their official model year. Depreciation counts from manufacture.',
                  'Not locking in the JPY/PKR rate — a 5% currency move between bid day and import filing can swing your landed cost by PKR 150k+.',
                  'Ignoring the BL cut-off date — missing the vessel booking deadline means storing the car in Japan at ¥3,000–5,000/day.',
                ],
              },
            ].map(section => (
              <Card key={section.cat} className="bg-card border-border overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={e => {
                    const el = (e.currentTarget.nextElementSibling as HTMLElement);
                    el.style.display = el.style.display === 'none' ? 'block' : 'none';
                  }}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', section.color)}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground flex-1">{section.cat}</p>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                <div className="px-4 pb-4 space-y-2">
                  {section.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={cn('text-xs font-bold shrink-0 mt-0.5', section.color.split(' ')[0])}>
                        {i + 1}.
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── FAQ ── */}
        {activeTab === 'faq' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90">
                <span className="font-semibold text-primary">Frequently asked questions</span> from Pakistan car importers and first-time buyers.
              </p>
            </div>
            {[
              // ── Import Basics ──────────────────────────────────────────────
              { q: 'What is the maximum age limit for importing a car to Pakistan?', a: 'Under current SRO regulations, personal-use passenger vehicles must not be older than 3 years from the date of manufacture at the time of shipment. Commercial vehicles (HiAce, trucks) follow a separate 3-year rule. Age is calculated from the manufacture date on the Japanese vehicle plate (製造年月), not the model year. Always verify current SRO with FBR before committing — these rules change frequently.' },
              { q: 'Can I import any car, or are some models restricted?', a: 'Most Japanese passenger cars are importable. Restrictions include: right-hand-drive vehicles above certain engine sizes in specific zones, vehicles with tampered/missing chassis numbers, and some diesel variants. EVs and hybrids have their own SRO-based incentive regime. Always cross-check the latest FBR SRO list before bidding on unusual models (e.g. Kei trucks, converted vans).' },
              { q: 'What is the difference between "Own Use" and "Transfer of Residence" import?', a: '"Own Use" is a fully commercial import — complete FBR duty applies. "Transfer of Residence" (ToR) allows one duty-free or reduced-duty car for Pakistani nationals returning from abroad after living there for 2+ continuous years. ToR cars cannot be sold for 3 years and require extensive documentation: residence proof, employment record, passport stamps, and a formal declaration at the port of arrival. ToR quota is strictly one vehicle per person, per qualifying event.' },
              { q: 'Which Japanese ports do cars ship from, and how long does it take?', a: 'Most auction vehicles ship from Nagoya (Port of Nagoya — largest volume), Yokohama, Osaka, or Kobe. Transit time to Karachi Port is 18–25 days via RoRo (Roll-on/Roll-off) vessels. Container shipments take similar time but loading/unloading adds 3–5 days. After arrival, Karachi customs clearance takes 5–15 business days depending on queue and document completeness. Budget 45–60 days total from auction win to delivery.' },
              { q: 'Is it better to buy from a Japan auction directly or from a local Pakistani importer?', a: 'Auction: 20–35% cheaper for equivalent condition but requires a trustworthy agent, carries more risk (unseen damage, delay), and takes 45–60 days. Local importer: higher price but you inspect before paying, immediate delivery, and the dealer bears customs/clearance risk. For first-time importers or one-car buyers, a reputable local importer is safer. Volume dealers and car traders benefit most from direct auction buying.' },
              { q: 'What documents are required for Pakistan customs clearance?', a: 'Required: (1) Original Bill of Lading (B/L), (2) Commercial Invoice from Japanese exporter, (3) Packing List, (4) Japanese Export Certificate (自動車輸出証明書), (5) Deregistration Certificate, (6) Radiation Inspection Certificate (mandatory for vehicles manufactured after March 2011), (7) Marine Insurance Certificate, (8) CNIC/Passport copy of importer, (9) Import General Manifest (IGM) filing. Missing any document causes clearance delays of 2–4 weeks minimum.' },
              // ── Duty & Taxes ──────────────────────────────────────────────
              { q: 'How is duty calculated — what does "fixed USD amount" mean under FBR 2026?', a: 'Under FBR SRO 2026, Pakistan Customs uses fixed USD duty amounts for Asian passenger vehicles (instead of ad-valorem percentage on CIF value). For example, a 1301–1500cc car has a fixed duty of USD 18,590 — regardless of the actual purchase price. This USD amount is converted to PKR at the SBP rate on the date of GD filing. Depreciation at 1% per month (based on vehicle age) reduces this fixed amount.' },
              { q: 'What is the depreciation benefit and how is it calculated?', a: 'FBR allows a 1% per month depreciation on the total duty & taxes based on the vehicle\'s age from manufacture date. Example: a car manufactured in Jan 2023 imported in July 2026 = 42 months × 1% = 42% reduction. On a USD 18,590 duty slab, that saves USD 7,807 — roughly PKR 2.1M at current rates. This is one of the biggest cost factors. Always calculate exact months with your clearing agent before filing.' },
              { q: 'What is the HEV (Hybrid Electric Vehicle) duty exemption?', a: '50% exemption on total duty & taxes for HEVs with engine capacity up to 1800cc. 25% exemption for HEVs from 1801cc to 2500cc. The car must be classified under HS codes 8703.40xx–8703.50xx (petrol-electric hybrid). Mild hybrids (48V belt-ISG systems) may be classified as standard petrol by customs — verify HS classification with your clearing agent. Bring the Japanese vehicle registration (車検証) showing "ハイブリッド" to support your exemption claim.' },
              { q: 'What is the total duty incidence on a typical 1500cc hybrid like the Toyota Aqua?', a: 'Aqua 1500cc HEV: Fixed duty slab = USD 18,590. Apply 50% HEV exemption → USD 9,295. Apply depreciation (say 36 months = 36%) → USD 5,948 effective duty. At PKR 280/USD = PKR 1,665,440 total duty. Add local charges (clearing, port, transport, registration) of PKR 150–250K. Total landed cost on top of your FOB purchase price is approximately PKR 1.8–2.0M. Actual varies with SBP rate and agent fees.' },
              { q: 'What is WeBOC and why does it matter?', a: 'WeBOC (Web Based One Customs) is FBR\'s online customs clearance system. Your clearing agent files the Goods Declaration (GD) through WeBOC before or immediately after vessel arrival. A complete, correctly-filed GD is critical — errors or mismatches with actual cargo trigger physical examination (P.E.) which adds 5–10 business days and can expose discrepancies to customs officers. File early, file accurately.' },
              { q: 'What happens if customs disputes the declared value of my car?', a: 'Under WTO Agreement on Customs Valuation, Pakistan Customs should accept the Transaction Value (actual invoice price). However, if the declared price is far below comparable auction data, customs may apply "assessment value" using the Dubai/Japan reference tariff database. To avoid disputes: use a realistic invoice (not understated), attach auction sheet showing hammer price, and ensure your clearing agent can justify the value. A disputed valuation causes 2–6 week delays and sometimes requires payment of the higher assessed duty first, with an appeal filed separately.' },
              // ── Auction Process ───────────────────────────────────────────
              { q: 'What is USS auction and how does bidding work?', a: 'USS (Used Car System System) is Japan\'s largest auto auction network with venues across the country. Cars are inspected and graded by JAA (Japan Auto Appraisal Institute) inspectors. Bidding happens in real-time — either at the physical venue or online (USS Online Gate). Private individuals cannot bid directly; you need a licensed USS member dealer/agent. Your agent places bids on your behalf, charges ¥15,000–25,000 commission per car, and handles all paperwork post-win.' },
              { q: 'What do auction grades like 3, 3.5, 4, 4.5, 5, S, R, RA mean?', a: 'Grades: 5 = Excellent/near new (rare). 4.5 = Very good, minimal wear. 4 = Good, light wear. 3.5 = Above average, minor blemishes. 3 = Average, normal wear. 2 = Below average, needs repair. 1 = Poor condition. S = Modified/special equipment. R = Repaired/accident history declared. RA = Repaired with accident notation on auction sheet. Avoid R and RA unless very cheap — they\'re almost impossible to resell at a good price in Pakistan. For imports, target 3.5–4.5.' },
              { q: 'How reliable are auction grades? Can I trust them?', a: 'Exterior grades (bodywork) are generally accurate — inspectors are certified and accountable. Interior grades can be more subjective. The auction sheet (inspection report) is the real source of truth — read the damage codes carefully, not just the number grade. Mechanical condition is NOT covered by grades (engines are rarely run or tested at auction). Always request a pre-shipment inspection from a third party (JAAI or similar) for mechanical assessment before bidding on high-value cars.' },
              { q: 'What is "流札" (ryūsatsu) and why is it useful?', a: 'Ryūsatsu (流札) means the car was offered at auction but received no winning bid (did not meet reserve). Unsold cars are typically relisted at the next auction at a lower reserve price. Your agent can track ryūsatsu vehicles — they often represent excellent value since other dealers passed on them due to price, not condition. Patience plus ryūsatsu tracking can save ¥50,000–150,000 on a single unit.' },
              { q: 'What is the difference between USS, JU, TAA, and other auction houses?', a: 'USS: Largest, most transparent grades, best documentation. JU (Japan Used Motor Vehicle Dealers Association): second largest, dealer-focused, slightly less standardized grading. TAA (Toyota Auto Auction): Toyota/Lexus heavy, excellent quality but higher reserves. NAA (Nagoya Auto Auction), CAA (Chubu Auto Auction), HERO, AUCNET: regional/specialized. For Pakistani importers, USS and JU offer the widest variety. TAA is excellent for Toyotas at slightly higher prices. Ask your agent which houses they have direct access to.' },
              // ── Shipping & Logistics ──────────────────────────────────────
              { q: 'What is RoRo shipping and is it better than container?', a: 'RoRo (Roll-on/Roll-off): cars are driven onto the vessel. Cheaper (¥65,000–120,000 for small/mid cars), faster loading, and standard for most imports. Container: car is loaded into a 20ft or 40ft container. More expensive (¥250,000–350,000 for 20ft) but offers better physical protection and privacy. For high-value or fully restored cars, container is recommended. For standard hatchbacks and sedans, RoRo is the industry standard.' },
              { q: 'Do I need marine insurance? How much does it cost?', a: 'Marine insurance is optional but strongly recommended. Coverage is 0.5–1% of CIF value (car value + freight + insurance). On a ¥1,500,000 car with ¥90,000 freight, CIF ≈ ¥1,590,000 → insurance ≈ ¥7,950–15,900. Claims can be made for physical damage, theft, and total loss during transit. Without insurance, damage during loading/unloading (which is common) leaves you with no recourse. Always insure.' },
              { q: 'What is a Bill of Lading (B/L) and why is it critical?', a: 'The Bill of Lading is the legal title document for the shipment — essentially ownership of the cargo. It is issued by the shipping line after loading. The original B/L must be presented to customs at Karachi to release the car. If you lose the original B/L, you must obtain a Letter of Indemnity from the shipping line (takes 2–4 weeks and costs money). Keep original B/L safe; send scanned copies to your clearing agent in advance but hold originals until needed.' },
              { q: 'What is a radiation certificate and when is it required?', a: 'Post the 2011 Fukushima nuclear disaster, all vehicles manufactured in Japan from 2011 onwards must have a radiation inspection certificate to confirm they do not exceed 0.3 μSv/h radiation levels. This certificate is obtained at the Japanese export yard (cost: ¥5,000–10,000). Pakistan Customs requires it for all post-March 2011 vehicles. Without it, the car will be held at port — obtaining a certificate retrospectively is difficult and expensive.' },
              // ── Local Pakistan Process ────────────────────────────────────
              { q: 'How do I choose a good clearing agent in Karachi?', a: 'Look for: (1) Licensed by Pakistan Customs (check CHB license), (2) Specializes in Japanese vehicles (knows Preventive Collectorate procedures), (3) Active WeBOC account with clean record, (4) References from other importers, (5) Clear fee structure upfront (expect PKR 30,000–60,000 all-in for standard cars). Avoid agents who guarantee unrealistically low duty — this usually means under-declaring, which is illegal and creates serious legal liability for you as the importer of record.' },
              { q: 'What are demurrage charges and how do I avoid them?', a: 'Demurrage is charged by the port/shipping line when you do not collect your cargo within the free storage period (typically 5–7 days at Karachi Port after vessel arrival). Charges: PKR 2,000–8,000/day for cars. To avoid: file WeBOC GD before vessel arrival, have all original documents ready (B/L, invoice, packing list), pay duty within 5 working days of assessment. In peak season (Oct–Dec), extend your document preparation timeline by 1 week.' },
              { q: 'How long does Pakistan Customs clearance typically take?', a: 'Best case (all documents correct, no examination): 3–5 business days. Average case: 7–12 business days. Worst case (physical examination ordered, valuation dispute, or missing documents): 3–6 weeks. To minimize time: file complete documents, use a registered clearing agent, pay duty promptly, and avoid importing during FBR audit periods (usually March–April and September–October).' },
              { q: 'Can I register a Japanese import car in any city, or only Karachi?', a: 'You can register in any province where you are a resident. Registration fees and procedures vary: Karachi (Sindh), Lahore (Punjab), Islamabad (Capital Territory) are most common. The car must be physically present in the city of registration (for inspection). Some buyers clear at Karachi then transport to Lahore for registration. Punjab Motor Vehicle Registration is known for relatively faster processing. Budget PKR 40,000–150,000+ for registration depending on engine size, province, and vehicle age.' },
              // ── Practical Tips ────────────────────────────────────────────
              { q: 'What should I verify on the auction sheet before bidding?', a: '(1) Grade number AND interior grade. (2) Chassis number matches the listing. (3) Mileage — cross-check "メーター交換" (odometer replaced) flag. (4) Damage codes: look for X/XX (structural repair/replacement), W (wavy panel), E (rust). (5) Accident/repair history (修復歴). (6) Manufacture date vs. model year. (7) Option equipment: navigation, sunroof, leather, rear camera (improves Pakistan resale). (8) Export restriction notes — some cars need additional permits.' },
              { q: 'What is JAAI inspection and when should I use it?', a: 'JAAI (Japan Auto Appraisal Institute) offers third-party pre-shipment inspection services at auction yards and export lots. Cost: ¥8,000–20,000 depending on scope. The inspector checks mechanical condition (engine start, smoke test, warning lights), undercarriage (rust, accident repair), fluid levels, and produces a detailed written report with photos. Worth using for: (1) cars above ¥1.5M value, (2) grade 3 or lower cars, (3) any car with auction sheet damage codes, (4) cars from non-USS/JU auction houses with less standardized grading.' },
              { q: 'Which models have the best resale value in Pakistan?', a: 'Consistently strong resale: Toyota Aqua (hybrid, fuel-efficient, widely serviced), Toyota Prius (1.8 HEV — landmark of reliability), Honda Vezel (crossover demand), Toyota Corolla Axio/Fielder, Suzuki Alto (660cc — lowest duty). Nissan Dayz/Mira/Move are popular kei cars. Models to be cautious about: any car with very expensive or unavailable spare parts in Pakistan (e.g. Nissan Leaf battery, some Honda CVT variants), luxury brands (BMW, Mercedes) with high maintenance costs relative to local workshop capability.' },
              { q: 'What is the typical total landed cost for a 2022 Toyota Aqua?', a: 'Example (July 2026): Japan auction price ¥1,200,000 → at 1.95 PKR/JPY ≈ PKR 2,340,000. Freight (RoRo) ¥80,000 → PKR 156,000. Agent fee ¥20,000 → PKR 39,000. Radiation certificate ¥8,000 → PKR 15,600. Fixed duty USD 18,590 × 50% HEV × 64% (36-month dep) = USD 5,949 → PKR 1,665,720. Local charges (clearing + port + transport to Lahore + registration) ≈ PKR 250,000. Grand total ≈ PKR 4,466,320. Market price in Pakistan for similar car: PKR 5.2–5.8M → profit margin PKR 733,000–1,333,000 before overheads.' },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        )}

        {/* ── BIDDING STRATEGY ────────────────────────────────────────────── */}
        {activeTab === 'bidding' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90 leading-relaxed">Master these strategies to win auctions at optimal prices and avoid costly overbidding mistakes.</p>
            </div>

            {/* Strategy cards */}
            {[
              { icon: '🎯', title: 'Set Your Maximum BEFORE Bidding', color: 'border-green-500/30 bg-green-500/5', desc: 'Always calculate your ALL-IN landed cost before placing a single bid. Add: Japan auction price + export fees + freight + Pakistan duties + local clearing + profit margin. This is your hard ceiling. Never exceed it emotionally.', tips: ['Use the Duties calculator in this guide for your target model', 'Add 10% buffer for unexpected costs', 'Factor current PKR/JPY rate + 5% currency risk', 'Consider spare parts availability in Pakistan'] },
              { icon: '🔍', title: 'Research the Auction Sheet Thoroughly', color: 'border-blue-500/30 bg-blue-500/5', desc: 'Before bidding, decode every character on the auction sheet. Misread sheets are the #1 cause of costly post-purchase surprises.', tips: ['Check 修復歴 (shuufuku-reki) — structural repair history means avoid', 'Verify odometer: メーター交換 means odometer was replaced', 'Cross-reference condition grade vs individual panel scores', 'Check reconditioner notes — they often reveal dealer-observed faults'] },
              { icon: '📊', title: 'Understand the Grade-Price Relationship', color: 'border-purple-500/30 bg-purple-500/5', desc: 'Grade directly impacts resale value in Pakistan. Understand what each grade difference is worth in PKR, not just JPY.', tips: ['Grade 4→4.5: ~¥100,000–200,000 jump but PKR 300,000–500,000 resale premium', 'Grade 3→4: Worth pursuing; Grade 2 cars rarely justify Pakistan import costs', 'Interior grade (A/B/C) matters more in Pakistan premium market', 'Age-grade sweet spot: 2–4 year old Grade 4+ cars'] },
              { icon: '⏰', title: 'Auction Timing & Market Cycles', color: 'border-amber-500/30 bg-amber-500/5', desc: 'Japanese auction prices fluctuate by season, day of week, and time of year. Buy at the right time to save significant money.', tips: ['Jan–Feb: Post-holiday slump — lower competition, better prices', 'Mar–Apr: Year-end Japan rush — prices spike 10–20%', 'Aug–Sep: Summer peak — high competition', 'Tuesday/Wednesday auctions: Less competition than Monday/Friday peaks', 'Morning lots: More serious buyers; afternoon: better deals'] },
              { icon: '🏦', title: 'Proxy vs Live Bidding', color: 'border-red-500/30 bg-red-500/5', desc: 'Most Pakistan importers use agents who bid on their behalf (proxy bidding). Understand the mechanics to optimize your strategy.', tips: ['Set max bid in JPY — agent bids incrementally up to your limit', 'Add ¥10,000–30,000 to round numbers: others bid ¥500,000; you bid ¥510,000', 'Ask agent for pre-auction estimates (sankanten) for preferred cars', 'Request agent to flag cars with no repair history first'] },
              { icon: '🚗', title: 'Mileage vs Age vs Grade Trade-offs', color: 'border-cyan-500/30 bg-cyan-500/5', desc: 'Optimize across three dimensions: mileage, age, and condition grade. The Pakistan market has specific preferences.', tips: ['Pakistan sweet spot: 30,000–70,000km on hybrid, 50,000–100,000km on petrol', 'Low mileage Grade 3 vs high mileage Grade 4.5: Grade 4.5 usually wins for reliability', 'Pre-2018 cars: check for rust especially on undercarriage if coastal Japan origin', 'Kei cars (660cc): extremely low mileage expected — reject >60,000km'] },
              { icon: '🌊', title: 'Ryūsatsu (Unsold Cars) Strategy', color: 'border-teal-500/30 bg-teal-500/5', desc: 'Cars that fail to sell at auction (流札) are relisted at lower reserves. Patient dealers consistently outperform on unit costs.', tips: ['Ask your agent to track ryūsatsu for your target models across 2–3 auctions', 'Unsold cars often have cosmetic flaws that concern local Japan buyers but are acceptable for Pakistan', 'Typical ryūsatsu discount: ¥50,000–200,000 below initial reserve', 'Set up alerts with your agent for specific chassis codes you want'] },
              { icon: '📱', title: 'Digital Auction Tools & Resources', color: 'border-indigo-500/30 bg-indigo-500/5', desc: 'Leverage online platforms and data tools to research prices, verify chassis, and track market movements before committing a single yen.', tips: ['USS Online Gate: real-time bidding, history lookup, past sale prices by model', 'Car Sensor / Goo-net: Japan domestic resale prices — tells you demand signal', 'JAAI / JAA: chassis history check — run every car before bidding', 'Car From Japan / SBT / BE FORWARD: see export-facing prices vs. auction prices for margin insight'] },
              { icon: '🤝', title: 'Negotiating with Your Agent', color: 'border-orange-500/30 bg-orange-500/5', desc: 'Your agent relationship is your competitive advantage. Negotiate smart and build long-term trust for better deals.', tips: ['Volume discount: 10+ cars/month justifies negotiating commission to ¥15,000–18,000 from ¥25,000', 'Pre-fund account: agents prioritise buyers with cash-funded accounts — faster execution on winning bids', 'Request priority notification for your preferred models 30 min before bidding opens', 'Never pressure an agent to exceed safe bid — they know the market; trust their ceiling advice'] },
              { icon: '💱', title: 'JPY/PKR Currency Risk Management', color: 'border-rose-500/30 bg-rose-500/5', desc: 'Currency swings between bid day and import filing can cost or save you hundreds of thousands of PKR on a single car.', tips: ['Lock in rate with your bank via forward contract if importing 3+ cars', 'A 3% JPY/PKR move on a ¥1.5M car = ~PKR 80,000 swing in landed cost', 'Budget with a ±5% buffer on your JPY→PKR conversion at planning stage', 'Watch SBP inter-bank rate vs open market — use whichever applies to your payment method'] },
              { icon: '🔋', title: 'Hybrid & EV Auction Specific Tips', color: 'border-green-400/30 bg-green-400/5', desc: 'Hybrids and EVs require extra due diligence beyond standard petrol cars — the battery adds significant risk and cost.', tips: ['Always request battery health report (SOH%) for Prius/Aqua/Vezel/Leaf at auction', 'High-voltage battery replacement: Prius PKR 250,000–600,000, Leaf PKR 400,000–900,000', 'Auction sheet does NOT rate hybrid battery condition — request yard inspection or JAAI report', 'Check dashboard warning lights photo: an orange triangle or turtle icon = battery issue, walk away'] },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border p-4 space-y-3 ${s.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <h3 className="font-bold text-sm text-foreground">{s.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {s.tips.map((tip, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <span className="text-primary mt-0.5 shrink-0">▸</span>{tip}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bid increment table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5"><p className="font-bold text-sm text-foreground">📈 Standard Japanese Auction Bid Increments</p></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/30"><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Price Range (¥)</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Increment</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Strategy Tip</th></tr></thead>
                  <tbody>
                    {[
                      ['Below ¥500,000', '¥10,000', 'Bid ¥10,000 above round numbers'],
                      ['¥500,000 – ¥1,000,000', '¥10,000–¥20,000', 'Target ¥510,000 vs ¥500,000'],
                      ['¥1,000,000 – ¥2,000,000', '¥20,000–¥50,000', 'Add ¥30,000 over round numbers'],
                      ['¥2,000,000 – ¥5,000,000', '¥50,000', 'Budget ¥50,000 buffer above your round target'],
                      ['Above ¥5,000,000', '¥100,000', 'Major luxury segment — verify all specs carefully'],
                    ].map(([range, inc, tip], i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-foreground">{range}</td>
                        <td className="px-3 py-2 text-primary font-semibold">{inc}</td>
                        <td className="px-3 py-2 text-muted-foreground">{tip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Bidding Simulator ── */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <p className="font-bold text-sm text-foreground">🎮 Bid Ceiling Simulator — Should I Bid This Price?</p>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">Enter your target bid and costs. The simulator calculates your exact landed cost and whether the deal makes sense.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {([
                    { label: 'Auction Bid (¥)', key: 'simJpy',    val: simJpy,    set: setSimJpy,    placeholder: '800000' },
                    { label: 'JPY→PKR Rate',    key: 'simRate',   val: simRate,   set: setSimRate,   placeholder: '1.95' },
                    { label: 'Freight+Export (PKR)', key: 'simFreight', val: simFreight, set: setSimFreight, placeholder: '180000' },
                    { label: 'Agent Fees (PKR)', key: 'simAgent',  val: simAgent,  set: setSimAgent,  placeholder: '55000' },
                    { label: 'Clearing (PKR)',   key: 'simClear',  val: simClear,  set: setSimClear,  placeholder: '35000' },
                    { label: 'Duty % of FOB',   key: 'simDutyPct',val: simDutyPct,set: setSimDutyPct,placeholder: '62' },
                  ] as { label:string; key:string; val:string; set:(v:string)=>void; placeholder:string }[]).map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] text-muted-foreground block mb-1">{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        className="w-full h-8 bg-muted/40 border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Target Profit Margin (PKR)</label>
                  <input value={simProfit} onChange={e => setSimProfit(e.target.value)} placeholder="300000"
                    className="w-full h-8 bg-muted/40 border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-xs" />
                </div>
                <button
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                  onClick={() => {
                    const jpy = parseFloat(simJpy) || 0;
                    const rate = parseFloat(simRate) || 1.95;
                    const freight = parseFloat(simFreight) || 0;
                    const agent = parseFloat(simAgent) || 0;
                    const clear = parseFloat(simClear) || 0;
                    const dutyPct = parseFloat(simDutyPct) || 62;
                    const profit = parseFloat(simProfit) || 0;
                    const fob = Math.round(jpy * rate);
                    const duties = Math.round(fob * dutyPct / 100);
                    const cif = fob + freight;
                    const landed = fob + duties + freight + agent + clear;
                    const target = landed + profit;
                    const ceiling = Math.round(((target - freight - agent - clear) / (1 + dutyPct/100)) / rate);
                    setSimResult({ fob, cif, duties, landed, target, ceiling });
                  }}
                >
                  Calculate
                </button>
                {simResult && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {([
                      { label: 'FOB (PKR)', val: simResult.fob, color: 'text-foreground' },
                      { label: 'CIF (PKR)', val: simResult.cif, color: 'text-blue-400' },
                      { label: 'Duties + Taxes', val: simResult.duties, color: 'text-orange-400' },
                      { label: 'Landed Cost', val: simResult.landed, color: 'text-red-400' },
                      { label: 'Min Sell Price', val: simResult.target, color: 'text-primary' },
                      { label: 'Max Bid (¥)', val: simResult.ceiling, color: simResult.ceiling >= (parseFloat(simJpy)||0) ? 'text-green-400' : 'text-red-400', isJpy: true },
                    ] as { label:string; val:number; color:string; isJpy?:boolean }[]).map(r => (
                      <div key={r.label} className="bg-muted/40 rounded-lg p-2.5 border border-border">
                        <p className="text-[10px] text-muted-foreground">{r.label}</p>
                        <p className={cn('text-sm font-bold tabular-nums', r.color)}>
                          {r.isJpy ? `¥${r.val.toLocaleString()}` : `PKR ${r.val.toLocaleString()}`}
                        </p>
                      </div>
                    ))}
                    <div className={cn('md:col-span-3 p-3 rounded-xl border text-sm font-bold text-center',
                      simResult.ceiling >= (parseFloat(simJpy)||0)
                        ? 'bg-green-400/10 border-green-400/30 text-green-400'
                        : 'bg-red-400/10 border-red-400/30 text-red-400'
                    )}>
                      {simResult.ceiling >= (parseFloat(simJpy)||0)
                        ? `✅ BID IS VIABLE — You have ¥${(simResult.ceiling - (parseFloat(simJpy)||0)).toLocaleString()} headroom`
                        : `❌ OVERBID RISK — Lower your bid by ¥${((parseFloat(simJpy)||0) - simResult.ceiling).toLocaleString()} to break even`
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── POST-AUCTION PROCEDURES ─────────────────────────────────────── */}
        {activeTab === 'postauction' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/25 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-200 leading-relaxed">Once you win a bid, a detailed sequence of steps begins. Understand each stage to avoid delays, penalties, and extra costs.</p>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {[
                { day: 'Day 0', title: 'Auction Win Notification', icon: '🔔', color: 'bg-primary/10 border-primary/30 text-primary', steps: ['Receive bid confirmation from agent (usually within 2–4 hours)', 'Verify: car ID, chassis number, grade, price match your order', 'Confirm no auction cancellation (some auctions allow buyer cancellation within 1 hour)', 'Agent issues invoice: auction price + agent commission + domestic transport fee'] },
                { day: 'Day 1–3', title: 'Payment to Agent', icon: '💴', color: 'bg-green-400/10 border-green-400/30 text-green-400', steps: ['Wire full payment in JPY to agent\'s bank (or pre-funded account deducted)', 'Typical agent commission: ¥30,000–80,000 per vehicle', 'Domestic transport (auction site → port): ¥15,000–35,000', 'Pre-export inspection (optional but recommended): ¥8,000–15,000'] },
                { day: 'Day 3–7', title: 'Pre-Export Inspection', icon: '🔬', color: 'bg-purple-400/10 border-purple-400/30 text-purple-400', steps: ['Agent transports car to their yard or inspection facility', 'You can request a full photo/video inspection (100+ photos)', 'Check: engine start, undercarriage, interior condition, all electricals', 'Radiation certificate obtained (mandatory for Pakistan — ¥5,000–8,000)'] },
                { day: 'Day 5–14', title: 'Export Documentation', icon: '📄', color: 'bg-amber-400/10 border-amber-400/30 text-amber-400', steps: ['Export certificate issued by Japanese authorities', 'De-registration from Japan (Japanese number plate removed)', 'Bill of Lading (BL) prepared by shipping line', 'Certificate of Origin (CoO) issued', 'Marine insurance arranged (optional but recommended: ~0.5% of car value)'] },
                { day: 'Day 10–21', title: 'Shipping & Transit', icon: '🚢', color: 'bg-blue-400/10 border-blue-400/30 text-blue-400', steps: ['Car loaded at Japan port (Osaka, Nagoya, Tokyo, Moji)', 'Transit to Port Qasim, Karachi: 18–25 days (RoRo), 21–28 days (Container)', 'Track vessel via MarineTraffic.com using BL number', 'Agent sends shipping documents to Pakistan clearing agent'] },
                { day: 'Day 30–45', title: 'Pakistan Port Clearance', icon: '🏛️', color: 'bg-red-400/10 border-red-400/30 text-red-400', steps: ['Vessel arrives Port Qasim — notify clearing agent immediately', 'Bill of Entry filed with Pakistan Customs', 'Duty payment: Custom Duty + Sales Tax + Income Tax + CESS', 'Port demurrage clock starts — clear within free days (usually 5–7 days)', 'Physical inspection by Customs (if selected)', 'Vehicle released after all duties paid and clearance granted'] },
                { day: 'Day 45–55', title: 'Registration in Pakistan', icon: '📋', color: 'bg-green-600/10 border-green-600/30 text-green-600', steps: ['File registration at local Excise & Taxation office', 'Required: Import clearance certificate, chassis inspection report, original export cert', 'Customs paid receipt required', 'Registration fee varies by province: ~PKR 15,000–30,000', 'Number plate issued — car is legally road-ready', 'Optionally: get fitness certificate for resale credibility'] },
              ].map((phase, i) => (
                <div key={i} className={`rounded-xl border p-4 ${phase.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${phase.color}`}>{phase.day}</span>
                    <span className="text-lg">{phase.icon}</span>
                    <h3 className="font-bold text-sm text-foreground">{phase.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {phase.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />{step}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Important contacts */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5"><p className="font-bold text-sm text-foreground">📞 Key Contacts for Smooth Clearance</p></div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { role: 'Japan Agent', resp: 'Auction participation, documentation, pre-shipping inspection', tip: 'Verify JAA/CAA membership; ask for references from Pakistan buyers' },
                  { role: 'Pakistan Clearing Agent', resp: 'Customs filing, duty payment, port clearance', tip: 'Use APFA registered agents; confirm per-vehicle rate in advance' },
                  { role: 'Shipping Line', resp: 'BL issuance, vessel tracking, freight', tip: 'K-Line, NYK, MOL, Nissan Shipping are main Japan→Pakistan operators' },
                  { role: 'Marine Insurer', resp: 'Coverage for loss/damage during sea transit', tip: 'EFU, Jubilee, or Askari Insurance offer competitive marine rates' },
                ].map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <p className="font-semibold text-sm text-foreground">{c.role}</p>
                    <p className="text-xs text-muted-foreground">{c.resp}</p>
                    <p className="text-[11px] text-primary/80 italic">{c.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── COMMON PITFALLS ─────────────────────────────────────────────── */}
        {activeTab === 'pitfalls' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl">
              <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-relaxed">These are the most common and costly mistakes made by importers. Learn from them before they happen to you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: '❌', severity: 'Critical', color: 'border-red-500/40 bg-red-500/5', title: 'Ignoring Structural Repair History', desc: 'Bidding on a car marked 修復歴 (shuufuku-reki) — structural repair history — without understanding severity. These cars have frame/unibody repairs and WILL have alignment, safety, and resale issues in Pakistan.', fix: 'Never buy 修復歴 cars unless you\'re a specialist. Filter them out in your agent\'s search criteria upfront.' },
                { icon: '❌', severity: 'Critical', color: 'border-red-500/40 bg-red-500/5', title: 'Miscalculating Duties', desc: 'Using FOB price instead of CIF for duty calculation, or applying wrong slab. A PKR 500,000 error is common on first imports.', fix: 'Always use CIF value. Use the Duties Calculator in this guide. Confirm with your clearing agent BEFORE the auction.' },
                { icon: '⚠️', severity: 'High', color: 'border-amber-500/40 bg-amber-500/5', title: 'Choosing Unverified Japan Agents', desc: 'Many fraudulent "agents" operate on social media. Payments made to fake agents with no cars, no registration — money lost.', fix: 'Only use JAA/USS/TAA registered agents. Request references from other Pakistani importers. Never pay 100% upfront to new agents.' },
                { icon: '⚠️', severity: 'High', color: 'border-amber-500/40 bg-amber-500/5', title: 'Ignoring Port Demurrage Costs', desc: 'Failing to clear the car within free-days period at Port Qasim leads to demurrage fees: PKR 5,000–15,000/day. 30-day delays are not uncommon and can cost PKR 300,000+.', fix: 'Appoint clearing agent 2 weeks before vessel arrival. Pre-prepare all documents. Have duty payment funds ready.' },
                { icon: '⚠️', severity: 'High', color: 'border-amber-500/40 bg-amber-500/5', title: 'Currency Rate Gamble', desc: 'Fixing import cost in JPY but paying in PKR weeks later. A 5% PKR depreciation on a ¥2M car = PKR 195,000 extra cost.', fix: 'Lock in your PKR cost estimate using current rate + 5% buffer. Consider forward exchange if doing volume imports.' },
                { icon: '⚠️', severity: 'High', color: 'border-amber-500/40 bg-amber-500/5', title: 'Buying Non-Compatible Specs', desc: 'Importing Japan-spec cars with features unusable in Pakistan: GPS with Japanese maps, right-hand signals for Japan lanes, EV with no charging infrastructure, or Kei car with 660cc that struggles on highways.', fix: 'Verify Pakistan compatibility: parts availability, fuel type (LPG Keis won\'t work on Pakistan LPG), charging support for EVs.' },
                { icon: '⚠️', severity: 'Medium', color: 'border-yellow-500/40 bg-yellow-500/5', title: 'Skipping Pre-Shipment Inspection', desc: 'Trusting only auction photos. Cars can have hidden engine issues, interior damage, or missing parts not visible in auction images.', fix: 'Always pay for full pre-shipment inspection (¥8,000–15,000). Request 80+ photos including undercarriage, engine bay, all four tyres.' },
                { icon: '⚠️', severity: 'Medium', color: 'border-yellow-500/40 bg-yellow-500/5', title: 'Importing Wrong Age for Pakistan', desc: 'Pakistan allows imports up to 3 years old. Importing a 2.5-year-old car means only 6 months of "new import" premium before it ages out.', fix: 'Target cars that are 1–2 years old at time of purchase. Account for 2–3 months shipping + clearance time.' },
                { icon: 'ℹ️', severity: 'Low', color: 'border-blue-500/40 bg-blue-500/5', title: 'Overlooking Tyre & Consumable Costs', desc: 'Japanese auction cars often have worn tyres, old battery, and due service items. Budget PKR 80,000–150,000 for consumable refresh.', fix: 'Ask agent to check tyre depth and battery in pre-shipment inspection. Factor consumable refresh into your landed cost model.' },
                { icon: 'ℹ️', severity: 'Low', color: 'border-blue-500/40 bg-blue-500/5', title: 'Not Accounting for Reconditioning', desc: 'Even Grade 4 cars may need minor paint touch-up, interior deep clean, and light body work for Pakistan premium market presentation.', fix: 'Budget PKR 20,000–60,000 per car for detailing and minor prep. Recoup this in higher selling price.' },
              ].map((p, i) => (
                <div key={i} className={`rounded-xl border p-4 space-y-2 ${p.color}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{p.icon}</span>
                      <h3 className="font-bold text-sm text-foreground">{p.title}</h3>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${p.severity === 'Critical' ? 'border-red-500/50 text-red-400' : p.severity === 'High' ? 'border-amber-500/50 text-amber-400' : p.severity === 'Medium' ? 'border-yellow-500/50 text-yellow-400' : 'border-blue-500/50 text-blue-400'}`}>{p.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  <div className="flex items-start gap-1.5 text-xs text-green-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" /><span>{p.fix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick checklist */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5"><p className="font-bold text-sm text-foreground">✅ Pre-Bid Checklist — Run This Every Time</p></div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Calculated ALL-IN landed cost including duties',
                  'Verified no 修復歴 (structural repair history)',
                  'Confirmed odometer not replaced (メーター交換)',
                  'Checked individual panel scores for hidden damage',
                  'Verified car is within 3-year import age limit',
                  'Confirmed agent is JAA/USS/TAA registered',
                  'Set hard max bid in JPY (not PKR)',
                  'Factored current PKR/JPY rate + 5% buffer',
                  'Requested pre-shipment inspection in advance',
                  'Confirmed spare parts availability in Pakistan',
                  'Verified fuel/drivetrain compatibility with Pakistan',
                  'Assigned Pakistan clearing agent in advance',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                    <div className="w-4 h-4 rounded border border-border bg-muted/50 shrink-0 flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BUDGET PLANNER ─────────────────────────────────────────────── */}
        {activeTab === 'budget' && <BudgetPlannerTab />}

        {/* ── INSPECTION GUIDE ───────────────────────────────────────────── */}
        {activeTab === 'inspection' && <InspectionGuideTab />}

        {/* ── PROFIT TRACKER ─────────────────────────────────────────────── */}
        {activeTab === 'profit' && <ProfitTrackerTab />}

        {/* ── MARKET TRENDS ──────────────────────────────────────────────── */}
        {activeTab === 'trends' && <MarketTrendsTab />}

        {/* ── JAPANESE YEAR CONVERTER ─────────────────────────────────────── */}
        {activeTab === 'yearconv' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/25 rounded-xl">
              <CalendarDays className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/90">
                Japanese auction sheets list vehicle year in the <span className="font-semibold text-primary">Japanese Imperial Calendar</span> (元号 Gengō). Convert to/from Gregorian here.
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Japanese Era ↔ Gregorian Converter</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Era selector */}
                <div className="flex gap-2">
                  {(['Reiwa', 'Heisei', 'Showa'] as const).map(e => (
                    <button key={e} onClick={() => setJpEra(e)}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-all', jpEra === e ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                      {e === 'Reiwa' ? '令和 Reiwa' : e === 'Heisei' ? '平成 Heisei' : '昭和 Showa'}
                      <span className="block text-[9px] font-normal opacity-70 mt-0.5">{e === 'Reiwa' ? '2019–present' : e === 'Heisei' ? '1989–2019' : '1926–1989'}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* JP → Gregorian */}
                  <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-foreground">Japanese Year → Gregorian</p>
                    <div className="flex gap-2">
                      <Input type="number" min={1} max={99} value={jpYear} onChange={e => setJpYear(e.target.value)}
                        placeholder={`${jpEra.slice(0,1).toLowerCase()}.${jpEra === 'Reiwa' ? '6' : jpEra === 'Heisei' ? '30' : '60'}`}
                        className="h-9 text-sm font-mono" />
                      <button onClick={convertJpToGreg}
                        className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0">
                        Convert
                      </button>
                    </div>
                    {gregYear && <p className="text-lg font-bold text-primary text-center py-1">{jpEra} {jpYear} = <span className="text-foreground">{gregYear}</span></p>}
                  </div>

                  {/* Gregorian → JP */}
                  <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                    <p className="text-xs font-semibold text-foreground">Gregorian Year → Japanese</p>
                    <div className="flex gap-2">
                      <Input type="number" min={1926} max={2099} value={gregYear} onChange={e => setGregYear(e.target.value)}
                        placeholder="e.g. 2022" className="h-9 text-sm font-mono" />
                      <button onClick={convertGregToJp}
                        className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0">
                        Convert
                      </button>
                    </div>
                    {jpYear && <p className="text-lg font-bold text-primary text-center py-1">{gregYear} = <span className="text-foreground">{jpEra} {jpYear}年</span></p>}
                  </div>
                </div>

                {/* Quick reference table */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Quick Reference — Recent Years</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs min-w-max">
                      <thead><tr className="bg-muted/40 border-b border-border">
                        <th className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">Gregorian</th>
                        <th className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">Reiwa (令和)</th>
                        <th className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">Heisei (平成)</th>
                        <th className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">Common on Sheets</th>
                      </tr></thead>
                      <tbody>
                        {[2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2010,2008,2005,2000,1995].map(g => (
                          <tr key={g} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-mono text-foreground font-semibold">{g}</td>
                            <td className="px-3 py-1.5 font-mono text-primary">{g >= 2019 ? `R${g-2018}` : '—'}</td>
                            <td className="px-3 py-1.5 font-mono text-blue-400">{g >= 1989 && g <= 2019 ? `H${g-1988}` : '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{g >= 2019 ? `令和${g-2018}年` : g >= 1989 ? `平成${g-1988}年` : `昭和${g-1925}年`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── EXPANDED GLOSSARY ───────────────────────────────────────────── */}
        {activeTab === 'glossary' && (() => {
          const GLOSSARY = [
            // Auction Sheet Structure
            { jp: '車台番号', romaji: 'Shatai bangō', en: 'Chassis / VIN number', cat: 'Identification' },
            { jp: '型式', romaji: 'Katashiki', en: 'Model code (official MoLiT classification)', cat: 'Identification' },
            { jp: '年式', romaji: 'Nenshiki', en: 'Model year', cat: 'Identification' },
            { jp: '初度登録', romaji: 'Shodo tōroku', en: 'First registration date', cat: 'Identification' },
            { jp: '走行距離', romaji: 'Sōkō kyori', en: 'Odometer reading (km)', cat: 'Mileage' },
            { jp: 'メーター交換', romaji: 'Mētā kōkan', en: 'Odometer replaced — mileage unreliable', cat: 'Mileage' },
            { jp: '距離不明', romaji: 'Kyori fumei', en: 'Mileage unknown / unverifiable', cat: 'Mileage' },
            { jp: '排気量', romaji: 'Haikiryo', en: 'Engine displacement (cc)', cat: 'Engine' },
            { jp: '燃料', romaji: 'Nenryō', en: 'Fuel type (petrol/diesel/hybrid/EV)', cat: 'Engine' },
            { jp: 'ハイブリッド', romaji: 'Haiburiddo', en: 'Hybrid (reduced duty in PK)', cat: 'Engine' },
            { jp: '電気自動車', romaji: 'Denki jidōsha', en: 'Electric vehicle (EV)', cat: 'Engine' },
            { jp: 'ターボ', romaji: 'Tābo', en: 'Turbocharged engine', cat: 'Engine' },
            { jp: '4WD', romaji: '4WD / Yonku', en: 'Four-wheel drive', cat: 'Drivetrain' },
            { jp: 'AT', romaji: 'Ōtomachikku', en: 'Automatic transmission', cat: 'Drivetrain' },
            { jp: 'MT', romaji: 'Manyuaru', en: 'Manual transmission', cat: 'Drivetrain' },
            { jp: 'CVT', romaji: 'CVT', en: 'Continuously Variable Transmission', cat: 'Drivetrain' },
            // Condition / Damage
            { jp: '修復歴', romaji: 'Shūfuku-reki', en: 'Structural repair history (skeleton/unibody)', cat: 'Damage' },
            { jp: '事故車', romaji: 'Jiko-sha', en: 'Accident vehicle — avoid for PK import', cat: 'Damage' },
            { jp: '水没車', romaji: 'Suibotsu-sha', en: 'Flood / submersion damaged', cat: 'Damage' },
            { jp: '火災車', romaji: 'Kasai-sha', en: 'Fire-damaged vehicle', cat: 'Damage' },
            { jp: '凹み', romaji: 'Kubomi', en: 'Dent (code: U on sheet)', cat: 'Damage' },
            { jp: '傷', romaji: 'Kizu', en: 'Scratch (code: A on sheet)', cat: 'Damage' },
            { jp: '錆', romaji: 'Sabi', en: 'Rust (code: E / S on sheet)', cat: 'Damage' },
            { jp: '波打ち', romaji: 'Nami-uchi', en: 'Wavy panel / ripple damage', cat: 'Damage' },
            { jp: '割れ', romaji: 'Ware', en: 'Crack / break in panel or glass', cat: 'Damage' },
            { jp: '剥がれ', romaji: 'Hagare', en: 'Peeling paint or trim', cat: 'Damage' },
            { jp: '雹打ち', romaji: 'Hyōuchi', en: 'Hail damage (multiple small dents)', cat: 'Damage' },
            { jp: '腐食', romaji: 'Fushoku', en: 'Corrosion / oxidation', cat: 'Damage' },
            // Condition Codes
            { jp: 'A', romaji: 'A (kizu)', en: 'Scratch — light surface mark', cat: 'Codes' },
            { jp: 'U', romaji: 'U (kubomi)', en: 'Dent — panel pushed in', cat: 'Codes' },
            { jp: 'W', romaji: 'W (hane)', en: 'Wavy / rippled panel', cat: 'Codes' },
            { jp: 'E', romaji: 'E (sabi)', en: 'Rust / corrosion', cat: 'Codes' },
            { jp: 'C', romaji: 'C (kizu-sabi)', en: 'Scratch with rust', cat: 'Codes' },
            { jp: 'P', romaji: 'P (paint)', en: 'Paint correction needed', cat: 'Codes' },
            { jp: 'B', romaji: 'B (burn)', en: 'Burn mark or hole', cat: 'Codes' },
            { jp: 'X', romaji: 'X', en: 'Panel replacement / repaint — major', cat: 'Codes' },
            { jp: 'XX', romaji: 'XX', en: 'Structural repair on this panel', cat: 'Codes' },
            { jp: '①', romaji: 'Small circle', en: 'Minor damage (small)', cat: 'Codes' },
            { jp: '②', romaji: 'Medium circle', en: 'Moderate damage', cat: 'Codes' },
            { jp: '③', romaji: 'Large circle', en: 'Significant damage', cat: 'Codes' },
            // Interior
            { jp: '内装', romaji: 'Naisō', en: 'Interior condition (rated A–D)', cat: 'Interior' },
            { jp: '禁煙車', romaji: "Kin'en-sha", en: 'Non-smoking vehicle (premium)', cat: 'Interior' },
            { jp: '喫煙車', romaji: 'Kitsuen-sha', en: 'Smoking vehicle — odour risk', cat: 'Interior' },
            { jp: '焼け', romaji: 'Yake', en: 'Burn mark on interior surface', cat: 'Interior' },
            { jp: 'シート破れ', romaji: 'Shīto yabure', en: 'Seat tear / rip', cat: 'Interior' },
            { jp: 'カビ', romaji: 'Kabi', en: 'Mould / mildew (often flood indicator)', cat: 'Interior' },
            // Documents & Legal
            { jp: '整備記録', romaji: 'Seibi kiroku', en: 'Service history booklet', cat: 'Documents' },
            { jp: '車検証', romaji: 'Shakken-sho', en: 'Japanese vehicle registration card', cat: 'Documents' },
            { jp: '輸出証明書', romaji: 'Yushutsu shōmei-sho', en: 'Export Certificate (required for PK customs)', cat: 'Documents' },
            { jp: '抹消登録', romaji: 'Masshō tōroku', en: 'De-registration from Japanese registry', cat: 'Documents' },
            { jp: '輻射線検査', romaji: 'Fukusha-sen kensa', en: 'Radiation inspection certificate (post-2011)', cat: 'Documents' },
            // Auction Process
            { jp: '現状渡し', romaji: 'Genjō watashi', en: 'As-is / no warranty sale', cat: 'Auction' },
            { jp: '会場費', romaji: 'Kaijō-hi', en: 'Auction venue handling fee', cat: 'Auction' },
            { jp: '落札', romaji: 'Rakusatsu', en: 'Winning bid / hammer price', cat: 'Auction' },
            { jp: '出品票', romaji: 'Shuppan-hyō', en: 'Auction listing card / sheet', cat: 'Auction' },
            { jp: '委託', romaji: 'Itaku', en: 'Consignment sale (agent-managed)', cat: 'Auction' },
            { jp: '業者', romaji: 'Gyōsha', en: 'Trade / dealer (members only at most auctions)', cat: 'Auction' },
            // Equipment
            { jp: 'サンルーフ', romaji: 'Sanrūfu', en: 'Sunroof / moonroof', cat: 'Equipment' },
            { jp: 'ナビ', romaji: 'Nabi', en: 'Navigation system', cat: 'Equipment' },
            { jp: 'バックカメラ', romaji: 'Bakku kamera', en: 'Reversing camera', cat: 'Equipment' },
            { jp: 'ETC', romaji: 'ETC', en: 'Electronic Toll Collection (Japan highway transponder)', cat: 'Equipment' },
            { jp: 'クルコン', romaji: 'Kurukōn', en: 'Cruise control', cat: 'Equipment' },
            { jp: '後席モニター', romaji: 'Kōseki monitā', en: 'Rear seat entertainment monitor', cat: 'Equipment' },
            { jp: 'レーダー探知機', romaji: 'Rēdā tantchi-ki', en: 'Radar detector', cat: 'Equipment' },
            { jp: 'スタッドレス', romaji: 'Sutaddoresu', en: 'Winter / studless snow tyres', cat: 'Equipment' },
          ];
          const cats = ['All', ...Array.from(new Set(GLOSSARY.map(g => g.cat)))];
          const filtered = GLOSSARY.filter(g => {
            const matchCat = activeCat === 'All' || g.cat === activeCat;
            const q = glossarySearch.toLowerCase();
            const matchSearch = !q || g.jp.includes(q) || g.romaji.toLowerCase().includes(q) || g.en.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q);
            return matchCat && matchSearch;
          });
          return (
            <div className="space-y-4">
              {/* Search + category */}
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={glossarySearch} onChange={e => setGlossarySearch(e.target.value)}
                    placeholder="Search Japanese, romaji, or English…" className="pl-9 pr-8 h-9 text-sm" />
                  {glossarySearch && <button onClick={() => setGlossarySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {cats.map(c => (
                    <button key={c} onClick={() => setActiveCat(c)}
                      className={cn('px-2 py-1 rounded-lg text-xs border transition-colors', activeCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
        {(() => {
          const filtered = GLOSSARY.filter(g => {
            const matchCat = activeCat === 'All' || g.cat === activeCat;
            const q = glossarySearch.toLowerCase();
            const matchSearch = !q || g.jp.includes(q) || g.romaji.toLowerCase().includes(q) || g.en.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q);
            return matchCat && matchSearch;
          });
          return (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{filtered.length} terms</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filtered.map(t => (
                  <div key={t.jp + t.en} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                    <div className="w-16 shrink-0">
                      <span className="text-base font-bold text-primary">{t.jp}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium leading-snug">{t.en}</p>
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">{t.romaji}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 self-start">{t.cat}</Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        </div>
          );
        })()}
      </div>
    </AppLayout>
  );
}

// Needed for the auction houses tab icon
function Building2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  );
}
