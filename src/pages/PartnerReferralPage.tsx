import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users, Plus, Pencil, Trash2, Save, X, DollarSign, ChevronRight,
  Check, TrendingUp, Award, Star, Building2, Scissors, Car, Sparkles,
  FileText, BarChart3, Info, Copy, Link, Calculator, Trophy,
  Wallet, Calendar, Target, Gift, Share2, Phone, Mail,
  ChevronDown, ChevronUp, Search, Filter, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/components/layouts/AppLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Commission tiers ────────────────────────────────────────────────────────
const USED_TIERS_DEFAULT = [
  { id:'u1', range:'Up to 20 Lac',    min:0,        max:2000000,  commission:5000,  label:'Budget'     },
  { id:'u2', range:'20 - 40 Lac',     min:2000001,  max:4000000,  commission:7500,  label:'Mid-Range'  },
  { id:'u3', range:'40 - 60 Lac',     min:4000001,  max:6000000,  commission:10000, label:'Premium'    },
  { id:'u4', range:'60 - 80 Lac',     min:6000001,  max:8000000,  commission:15000, label:'High-End'   },
  { id:'u5', range:'80 Lac - 1 Cr',   min:8000001,  max:10000000, commission:20000, label:'Luxury'     },
  { id:'u6', range:'Above 1 Cr',      min:10000001, max:Infinity, commission:0,     label:'Negotiated', note:'0.20-0.25% negotiated' },
];
const NEW_TIERS_DEFAULT = [
  { id:'n1', range:'Up to 30 Lac',    min:0,        max:3000000,  commission:8000,  label:'Entry'      },
  { id:'n2', range:'30 - 50 Lac',     min:3000001,  max:5000000,  commission:12000, label:'Standard'   },
  { id:'n3', range:'50 - 80 Lac',     min:5000001,  max:8000000,  commission:18000, label:'Premium'    },
  { id:'n4', range:'80 Lac - 1.5 Cr', min:8000001,  max:15000000, commission:25000, label:'High-End'   },
  { id:'n5', range:'Above 1.5 Cr',    min:15000001, max:Infinity, commission:0,     label:'Negotiated', note:'0.25-0.30% negotiated' },
];

const NICHES = [
  { icon: Car,        label:'PPF / Tinting Studios',    desc:'Customers wrapping cars often buy again' },
  { icon: Sparkles,   label:'Detailing Studios',         desc:'High-end detailing clientele' },
  { icon: Scissors,   label:'Auto Workshop Owners',      desc:'Regular vehicle owners in network' },
  { icon: Building2,  label:'Fuel Station Owners',       desc:'Fleet and individual car owners' },
  { icon: Users,      label:'Real Estate Agents',        desc:'High-net-worth clients upgrading' },
  { icon: Star,       label:'Insurance Brokers',         desc:'Know who is buying/selling cars' },
  { icon: FileText,   label:'Car Finance Advisors',      desc:'Already in the buying conversation' },
  { icon: Award,      label:'Driving Instructors',       desc:'Students buying first cars' },
  { icon: BarChart3,  label:'Social Media Influencers',  desc:'Car-content creators and reviewers' },
  { icon: TrendingUp, label:'Property Developers',       desc:'Corporate fleet and VIP clients' },
];

const PROCESS_STEPS = [
  { n:1, title:'Partner Registers',  desc:'Partner fills simple onboarding form, gets unique referral code or WhatsApp contact.' },
  { n:2, title:'Refers a Buyer',     desc:'Partner sends a customer who is actively looking to buy. Customer mentions partner name/code.' },
  { n:3, title:'Deal is Tracked',    desc:'We log the referral against the partner. Customer is tagged in CRM from first inquiry.' },
  { n:4, title:'Deal Closes',        desc:'Once payment is received and vehicle is delivered, commission is calculated per tier.' },
  { n:5, title:'Commission Paid',    desc:'Partner is paid via bank transfer or Easypaisa/JazzCash within 3 working days of delivery.' },
  { n:6, title:'Monthly Statement',  desc:'Partner receives monthly statement showing all referrals, status, and earnings.' },
];

const LEADERBOARD_BADGES = [
  { min:1,  label:'Rising Star',    color:'text-blue-400 border-blue-400/30 bg-blue-400/10',    icon:'🌟' },
  { min:3,  label:'Active Partner', color:'text-green-400 border-green-400/30 bg-green-400/10', icon:'🚀' },
  { min:7,  label:'Top Referrer',   color:'text-amber-400 border-amber-400/30 bg-amber-400/10', icon:'🏆' },
  { min:15, label:'Elite Partner',  color:'text-purple-400 border-purple-400/30 bg-purple-400/10', icon:'💎' },
];

function getBadge(referrals: number) {
  return [...LEADERBOARD_BADGES].reverse().find(b => referrals >= b.min) ?? null;
}

interface Tier { id:string; range:string; min:number; max:number; commission:number; label:string; note?:string; }
interface Partner { id:string; name:string; phone:string; email?:string; type:string; referrals:number; totalEarned:number; thisMonth:number; status:string; joinDate:string; notes?:string; }
interface MonthEntry { month:string; referrals:number; earnings:number; }

const PARTNER_KEY   = 'wulfrayn_referral_partners';
const TIER_USED_KEY = 'wulfrayn_tiers_used';
const TIER_NEW_KEY  = 'wulfrayn_tiers_new';

function loadPartners(): Partner[] { try { return JSON.parse(localStorage.getItem(PARTNER_KEY) ?? '[]'); } catch { return []; } }
function savePartners(p: Partner[]) { localStorage.setItem(PARTNER_KEY, JSON.stringify(p)); }
function loadTiers(key: string, def: Tier[]): Tier[] { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } }
function saveTiers(key: string, t: Tier[]) { localStorage.setItem(key, JSON.stringify(t)); }
function fmtAmt(n: number) { if (n>=1000000) return `${(n/1000000).toFixed(2)}M`; if (n>=1000) return `${(n/1000).toFixed(0)}K`; return n.toString(); }
function calcCommission(amount: number, tiers: Tier[]): number {
  const tier = tiers.find(t => amount >= t.min && amount <= t.max);
  if (!tier) return 0;
  if (tier.commission > 0) return tier.commission;
  return Math.round(amount * 0.0022);
}

// ─── Referral Links Tab ───────────────────────────────────────────────────────
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://wulfrayns.app';

const LINK_TEMPLATES = [
  { id: 'inventory',  label: 'Live Inventory',       path: '/live-display',    icon: '🚗', desc: 'Share live stock with buyers' },
  { id: 'inquiry',    label: 'Submit Inquiry',        path: '/inquiries',       icon: '📋', desc: 'Direct link to submit a car requirement' },
  { id: 'whatsapp',   label: 'WhatsApp Hub',          path: '/whatsapp-hub',    icon: '💬', desc: 'WhatsApp group broadcast link' },
  { id: 'partner',    label: 'Partner Signup',        path: '/partner-referral',icon: '🤝', desc: 'Invite new partners to join' },
  { id: 'auction',    label: 'Auction Guide',         path: '/auction-guide',   icon: '⚡', desc: 'Share the auction knowledge guide' },
  { id: 'import',     label: 'Import Cars Guide',     path: '/import-guide',    icon: '🌍', desc: 'Country-by-country import reference' },
];

function ReferralLinksTab({ partners }: { partners: Partner[] }) {
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [customCode, setCustomCode]           = useState('');
  const [copiedId, setCopiedId]               = useState<string | null>(null);
  const [whatsappMsg, setWhatsappMsg]         = useState('Hi! Check out our latest car inventory at Wulfrayn\'s DB. Click the link to browse:');

  const partnerCode = selectedPartner
    ? (partners.find(p => p.id === selectedPartner)?.name ?? '').toLowerCase().replace(/\s+/g, '-')
    : customCode || 'ref';

  function buildLink(path: string) {
    return `${BASE_URL}${path}?ref=${encodeURIComponent(partnerCode)}`;
  }

  function copyLink(id: string, path: string) {
    const url = buildLink(path);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function openWhatsApp(path: string) {
    const url = buildLink(path);
    const msg = encodeURIComponent(`${whatsappMsg}\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function downloadAllLinks() {
    const lines = [
      `Wulfrayn's DB — Referral Links for: ${partnerCode}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      ...LINK_TEMPLATES.map(t => `${t.icon} ${t.label}\n   ${buildLink(t.path)}\n`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `referral-links-${partnerCode}.txt`;
    a.click();
    toast.success('Links downloaded as text file');
  }

  return (
    <div className="space-y-5">
      {/* Partner selector */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">🔗 Generate Referral Links</p>
          <p className="text-xs text-muted-foreground">Select a partner or enter a custom code — every link will include their tracking tag.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Select Partner</label>
              <select
                value={selectedPartner}
                onChange={e => { setSelectedPartner(e.target.value); setCustomCode(''); }}
                className="w-full h-9 text-xs px-3 rounded-md border border-border bg-muted/40 text-foreground"
              >
                <option value="">— No partner selected —</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Or Custom Code</label>
              <input
                value={customCode}
                onChange={e => { setCustomCode(e.target.value); setSelectedPartner(''); }}
                placeholder="e.g. ahmed-motors"
                className="w-full h-9 text-xs px-3 rounded-md border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <Link className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Tracking code: </span>
            <span className="text-xs font-mono font-bold text-primary">{partnerCode}</span>
          </div>
        </CardContent>
      </Card>

      {/* Link cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LINK_TEMPLATES.map(t => {
          const url = buildLink(t.path);
          const copied = copiedId === t.id;
          return (
            <Card key={t.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground truncate flex-1 min-w-0">{url}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] gap-1 border-border"
                    onClick={() => copyLink(t.id, t.path)}>
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] gap-1 border-green-500/30 text-green-400 hover:bg-green-400/10"
                    onClick={() => openWhatsApp(t.path)}>
                    <Share2 className="w-3 h-3" />WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* WhatsApp message template */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">💬 WhatsApp Message Template</p>
          <p className="text-xs text-muted-foreground">Customise the message sent when you tap WhatsApp on any link above.</p>
          <textarea
            value={whatsappMsg}
            onChange={e => setWhatsappMsg(e.target.value)}
            rows={3}
            className="w-full text-xs px-3 py-2 rounded-md border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
          />
        </CardContent>
      </Card>

      {/* Download all links */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5 border-border text-xs" onClick={downloadAllLinks}>
          <Download className="w-3.5 h-3.5" />Download All Links as .txt
        </Button>
      </div>
    </div>
  );
}

// ─── Commission Table subcomponent ───────────────────────────────────────────
function CommissionTable({ tiers, onSave, label }: { tiers:Tier[]; onSave:(t:Tier[])=>void; label:string }) {
  const [rows, setRows] = useState<Tier[]>(tiers);
  const [dirty, setDirty] = useState(false);
  const update = (id:string, field:keyof Tier, val:string|number) => {
    setRows(r=>r.map(t=>t.id===id?{...t,[field]:typeof val==='string'?val:Number(val)}:t));
    setDirty(true);
  };
  const save = () => { onSave(rows); setDirty(false); toast.success('Commission table saved'); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {dirty && <Button size="sm" onClick={save} className="gap-1.5 h-8"><Save className="w-3.5 h-3.5"/>Save Changes</Button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Price Range','Tier','Commission (PKR)','Note'].map(h=>(
                <th key={h} className="text-left text-xs font-bold text-muted-foreground py-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t,i) => (
              <tr key={t.id} className={cn('border-b border-border/50', i%2===0?'bg-transparent':'bg-muted/20')}>
                <td className="py-2 pr-4"><input value={t.range} onChange={e=>update(t.id,'range',e.target.value)} className="bg-transparent text-xs w-40 focus:outline-none focus:underline text-muted-foreground"/></td>
                <td className="py-2 pr-4"><input value={t.label} onChange={e=>update(t.id,'label',e.target.value)} className="bg-transparent text-xs w-24 focus:outline-none focus:underline text-foreground font-medium"/></td>
                <td className="py-2 pr-4">
                  <input type="number" value={t.commission} onChange={e=>update(t.id,'commission',e.target.value)}
                    className={cn('bg-transparent text-xs w-24 focus:outline-none focus:underline font-bold tabular-nums', t.commission>0?'text-emerald-400':'text-muted-foreground')}/>
                </td>
                <td className="py-2 pr-4"><input value={t.note??''} onChange={e=>update(t.id,'note',e.target.value)} className="bg-transparent text-xs w-40 focus:outline-none focus:underline text-muted-foreground/60"/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PartnerReferralPage() {
  const [partners, setPartners]   = useState<Partner[]>(() => loadPartners());
  const [usedTiers, setUsedTiers] = useState<Tier[]>(() => loadTiers(TIER_USED_KEY, USED_TIERS_DEFAULT));
  const [newTiers,  setNewTiers]  = useState<Tier[]>(() => loadTiers(TIER_NEW_KEY,  NEW_TIERS_DEFAULT));
  const [dlgOpen, setDlgOpen]     = useState(false);
  const [editP, setEditP]         = useState<Partial<Partner>|null>(null);
  const [histP, setHistP]         = useState<Partner|null>(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [calcAmt, setCalcAmt]     = useState('');
  const [calcType, setCalcType]   = useState<'used'|'new'>('used');
  const [copiedCode, setCopiedCode] = useState<string|null>(null);

  const totalEarned = partners.reduce((s,p)=>s+p.totalEarned, 0);
  const totalRefs   = partners.reduce((s,p)=>s+p.referrals, 0);
  const thisMonth   = partners.reduce((s,p)=>s+p.thisMonth, 0);
  const active      = partners.filter(p=>p.status==='active').length;

  const filtered = useMemo(() => partners
    .filter(p => statusFilter==='all' || p.status===statusFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search) || p.type.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.totalEarned - a.totalEarned),
    [partners, search, statusFilter]
  );

  const leaderboard = useMemo(() =>
    [...partners].filter(p=>p.referrals>0).sort((a,b)=>b.referrals-a.referrals).slice(0,10),
    [partners]
  );

  const calcResult = useMemo(() => {
    const n = parseFloat(calcAmt.replace(/,/g,''));
    if (isNaN(n) || n <= 0) return null;
    const tiers = calcType==='used' ? usedTiers : newTiers;
    return calcCommission(n, tiers);
  }, [calcAmt, calcType, usedTiers, newTiers]);

  const saveP = () => {
    if (!editP?.name || !editP?.phone) return toast.error('Name and phone required');
    let updated: Partner[];
    if (editP.id) {
      updated = partners.map(p=>p.id===editP.id?{...p,...editP} as Partner:p);
    } else {
      const np: Partner = {
        id: Math.random().toString(36).slice(2),
        name: editP.name!, phone: editP.phone!, email: editP.email,
        type: editP.type||'Other', referrals:0, totalEarned:0, thisMonth:0,
        status:'active', joinDate: new Date().toISOString().slice(0,10),
        notes: editP.notes,
      };
      updated = [...partners, np];
    }
    setPartners(updated); savePartners(updated); setDlgOpen(false);
    toast.success(editP.id ? 'Partner updated' : 'Partner added');
  };

  const delP = (id:string) => {
    const u = partners.filter(p=>p.id!==id);
    setPartners(u); savePartners(u); toast.success('Partner removed');
  };

  const copyReferralLink = (p: Partner) => {
    const code = `REF-${p.name.replace(/\s+/g,'').toUpperCase().slice(0,6)}-${p.id.slice(0,4).toUpperCase()}`;
    const msg = `Hi! I am referring you to Wulfrayn's DB for your car needs. Mention my referral code: ${code} when you inquire. WhatsApp: +92-XXX-XXXXXXX`;
    navigator.clipboard.writeText(msg);
    setCopiedCode(p.id);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Referral message copied to clipboard');
  };

  const updateMonthly = (id:string, month:string, val:number, type:'referrals'|'earnings') => {
    const HIST_KEY = `wulfrayn_partner_hist_${id}`;
    let hist: MonthEntry[] = [];
    try { hist = JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]'); } catch {}
    const existing = hist.find(h=>h.month===month);
    if (existing) { if (type==='referrals') existing.referrals=val; else existing.earnings=val; }
    else { hist.push({ month, referrals:type==='referrals'?val:0, earnings:type==='earnings'?val:0 }); }
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    const totEarnings = hist.reduce((s,h)=>s+h.earnings,0);
    const totRefs     = hist.reduce((s,h)=>s+h.referrals,0);
    const now         = new Date().toISOString().slice(0,7);
    const nowEntry    = hist.find(h=>h.month===now);
    const u = partners.map(p=>p.id===id?{...p,totalEarned:totEarnings,referrals:totRefs,thisMonth:nowEntry?.earnings??p.thisMonth}:p);
    setPartners(u); savePartners(u);
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const exportCSV = () => {
    const rows = [
      ['Name','Phone','Email','Type','Status','Referrals','Total Earned','This Month','Joined'],
      ...partners.map(p=>[p.name,p.phone,p.email??'',p.type,p.status,p.referrals,p.totalEarned,p.thisMonth,p.joinDate]),
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'wulfrayn-partners.csv';
    a.click();
    toast.success('CSV exported');
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary"/>Partner Referral Program
              </h1>
              <p className="text-sm text-muted-foreground">Manage partners, track referrals, calculate commissions, and grow your network</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 h-8">
                <Download className="w-3.5 h-3.5"/>Export CSV
              </Button>
              <Button size="sm" onClick={()=>{setEditP({type:'Other',status:'active'});setDlgOpen(true);}} className="gap-1.5">
                <Plus className="w-3.5 h-3.5"/>Add Partner
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Total Partners',  val:partners.length,             sub:`${active} active`,      color:'text-foreground',   icon:Users },
            { label:'Total Referrals', val:totalRefs,                   sub:'all time',               color:'text-blue-400',     icon:Target },
            { label:'Total Paid Out',  val:`PKR ${fmtAmt(totalEarned)}`,sub:'all time commissions',  color:'text-emerald-400',  icon:Wallet },
            { label:'This Month',      val:`PKR ${fmtAmt(thisMonth)}`,  sub:'commission payout',     color:'text-amber-400',    icon:Calendar },
          ].map(s=>(
            <Card key={s.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className="w-4 h-4 text-muted-foreground"/>
                </div>
                <p className={cn('text-2xl font-black tabular-nums', s.color)}>{s.val}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="partners">
          <TabsList className="bg-muted/50 border border-border h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="partners"    className="text-xs">Partners</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs">Leaderboard</TabsTrigger>
            <TabsTrigger value="calculator"  className="text-xs">Commission Calc</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs">Commission Tables</TabsTrigger>
            <TabsTrigger value="payouts"     className="text-xs">Payout Tracking</TabsTrigger>
            <TabsTrigger value="tiers"       className="text-xs">Multi-Tier</TabsTrigger>
            <TabsTrigger value="referrallink" className="text-xs">Referral Links</TabsTrigger>
            <TabsTrigger value="process"     className="text-xs">Process Guide</TabsTrigger>
            <TabsTrigger value="niches"      className="text-xs">Who Can Join</TabsTrigger>
          </TabsList>

          {/* Partners tab */}
          <TabsContent value="partners" className="space-y-3 mt-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partners..." className="pl-9 h-9 text-sm bg-muted/40"/>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs bg-muted/40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Users className="w-12 h-12 opacity-20"/>
                <p className="font-semibold">{partners.length===0?'No partners yet':'No partners match filter'}</p>
                {partners.length===0 && <Button size="sm" onClick={()=>{setEditP({type:'Other',status:'active'});setDlgOpen(true);}}>Add first partner</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p,i)=>{
                  const badge = getBadge(p.referrals);
                  const refCode = `REF-${p.name.replace(/\s+/g,'').toUpperCase().slice(0,6)}-${p.id.slice(0,4).toUpperCase()}`;
                  return (
                    <motion.div key={p.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
                      <Card className="border-border hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm">{p.name}</p>
                                  {badge && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold', badge.color)}>{badge.icon} {badge.label}</span>}
                                  <Badge variant="outline" className={cn('text-[10px]', p.status==='active'?'text-emerald-400 border-emerald-500/30':p.status==='suspended'?'text-red-400 border-red-500/30':'text-muted-foreground')}>{p.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{p.phone}{p.email?` · ${p.email}`:''}</p>
                                <p className="text-[10px] text-muted-foreground/60">{p.type} · Joined {p.joinDate}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{refCode}</span>
                                  <button onClick={()=>copyReferralLink(p)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                                    {copiedCode===p.id ? <Check className="w-3 h-3 text-green-400"/> : <Copy className="w-3 h-3"/>}
                                    {copiedCode===p.id ? 'Copied!' : 'Copy link'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap shrink-0">
                              <div className="text-center"><p className="text-base font-black text-blue-400 tabular-nums">{p.referrals}</p><p className="text-[10px] text-muted-foreground">Referrals</p></div>
                              <div className="text-center"><p className="text-base font-black text-emerald-400 tabular-nums">PKR {fmtAmt(p.totalEarned)}</p><p className="text-[10px] text-muted-foreground">Total Earned</p></div>
                              <div className="text-center"><p className="text-base font-black text-amber-400 tabular-nums">PKR {fmtAmt(p.thisMonth)}</p><p className="text-[10px] text-muted-foreground">This Month</p></div>
                              <div className="flex items-center gap-1">
                                <button onClick={()=>setHistP(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary" title="Monthly history"><BarChart3 className="w-4 h-4"/></button>
                                <button onClick={()=>{setEditP(p);setDlgOpen(true);}} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4"/></button>
                                <button onClick={()=>delP(p.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </div>
                          </div>
                          {p.notes && <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50 italic">{p.notes}</p>}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400"/>
                <h2 className="font-bold text-base">Top Referral Partners</h2>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 opacity-20 mx-auto mb-3"/>
                  <p>No referral data yet. Add partners and track their referrals.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((p, i) => {
                    const badge = getBadge(p.referrals);
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <motion.div key={p.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}>
                        <div className={cn('flex items-center gap-4 p-4 rounded-xl border transition-colors',
                          i===0?'border-amber-400/40 bg-amber-400/5':i===1?'border-slate-400/30 bg-slate-400/5':i===2?'border-orange-700/30 bg-orange-700/5':'border-border bg-card'
                        )}>
                          <div className="w-8 h-8 flex items-center justify-center text-xl shrink-0">{medals[i] ?? `#${i+1}`}</div>
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.type}</p>
                          </div>
                          {badge && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold hidden md:block', badge.color)}>{badge.icon} {badge.label}</span>}
                          <div className="text-right shrink-0">
                            <p className="text-base font-black text-blue-400 tabular-nums">{p.referrals}</p>
                            <p className="text-[10px] text-muted-foreground">referrals</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-400 tabular-nums">PKR {fmtAmt(p.totalEarned)}</p>
                            <p className="text-[10px] text-muted-foreground">earned</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Badge legend */}
              <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border">
                <p className="text-xs font-bold text-foreground mb-3">Partner Badge Tiers</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {LEADERBOARD_BADGES.map(b=>(
                    <div key={b.label} className={cn('px-3 py-2 rounded-lg border text-center', b.color)}>
                      <p className="text-base">{b.icon}</p>
                      <p className="text-xs font-bold">{b.label}</p>
                      <p className="text-[10px] opacity-80">{b.min}+ referrals</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Commission Calculator */}
          <TabsContent value="calculator" className="mt-4">
            <div className="max-w-xl space-y-5">
              <div className="p-5 bg-card border border-border rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-primary"/>
                  <h2 className="font-bold text-sm">Commission Calculator</h2>
                </div>
                <p className="text-xs text-muted-foreground">Enter a sale price to instantly see what commission the referring partner earns.</p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Car Sale Price (PKR)</Label>
                    <Input value={calcAmt} onChange={e=>setCalcAmt(e.target.value)} placeholder="e.g. 4500000" className="h-10 text-sm bg-muted/40"/>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Car Type</Label>
                    <Select value={calcType} onValueChange={v=>setCalcType(v as 'used'|'new')}>
                      <SelectTrigger className="h-10 text-sm bg-muted/40"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="used">Used / Reconditioned Car</SelectItem>
                        <SelectItem value="new">New Car</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {calcResult !== null && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground mb-1">Partner Commission</p>
                    <p className="text-3xl font-black text-emerald-400 tabular-nums">PKR {calcResult.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      on PKR {parseInt(calcAmt.replace(/,/g,'')).toLocaleString()} sale ({calcType === 'used' ? 'Used Car' : 'New Car'})
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Quick reference */}
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-xs font-bold text-foreground mb-3">Quick Reference — Used Cars</p>
                <div className="space-y-1.5">
                  {usedTiers.map(t=>(
                    <div key={t.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t.range}</span>
                      <span className={cn('font-bold tabular-nums', t.commission>0?'text-emerald-400':'text-amber-400')}>
                        {t.commission>0?`PKR ${t.commission.toLocaleString()}`:t.note??'Negotiated'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Commission tables */}
          <TabsContent value="commissions" className="mt-4 space-y-6">
            <Card className="border-border"><CardContent className="p-5">
              <CommissionTable tiers={usedTiers} label="Used and Reconditioned Cars" onSave={t=>{setUsedTiers(t);saveTiers(TIER_USED_KEY,t);}}/>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-5">
              <CommissionTable tiers={newTiers} label="New Cars" onSave={t=>{setNewTiers(t);saveTiers(TIER_NEW_KEY,t);}}/>
            </CardContent></Card>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground mb-2"><Info className="w-4 h-4 text-primary"/>Commission Rules</p>
              <ul className="space-y-1.5 text-xs">
                <li>Commission is paid after deal is fully closed and payment received</li>
                <li>For cars above 1 Cr, commission is negotiated at 0.20-0.25% of sale price</li>
                <li>Payment within 3 working days of delivery via bank / Easypaisa / JazzCash</li>
                <li>Referrer must be mentioned at time of first inquiry - no retrospective claims</li>
                <li>Click any value in the table above to edit and save your custom rates</li>
              </ul>
            </div>
          </TabsContent>

          {/* Process guide */}
          <TabsContent value="process" className="mt-4">
            <div className="space-y-3">
              {PROCESS_STEPS.map((s,i)=>(
                <motion.div key={s.n} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.07}}>
                  <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 font-black text-primary text-sm">{s.n}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                    {i < PROCESS_STEPS.length-1
                      ? <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-2"/>
                      : <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-2"/>}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Referral message template */}
            <div className="mt-6 p-4 bg-card border border-border rounded-xl space-y-3">
              <p className="font-bold text-sm flex items-center gap-2"><Share2 className="w-4 h-4 text-primary"/>Ready-to-Send Referral Templates</p>
              {[
                { label:'WhatsApp Intro', msg:"Hi [Name], I know you're looking for a good car. Check out Wulfrayn's DB - they have great stock. Tell them [YOUR NAME] referred you for a special priority service. WhatsApp: +92-XXX-XXXXXXX" },
                { label:'Short SMS', msg:"Looking for a car? Visit Wulfrayn's DB. Mention my name [YOUR NAME] for priority service. Contact: +92-XXX-XXXXXXX" },
                { label:'Instagram DM', msg:"Hey! If you're car hunting, I highly recommend Wulfrayn's DB. Amazing stock, transparent pricing. DM them or WhatsApp +92-XXX-XXXXXXX - mention my name [YOUR NAME]!" },
              ].map((tmpl,i)=>(
                <div key={i} className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">{tmpl.label}</p>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs bg-muted/40 rounded-lg p-2 text-foreground leading-relaxed">{tmpl.msg}</p>
                    <button onClick={()=>{navigator.clipboard.writeText(tmpl.msg);toast.success('Copied!');}}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary shrink-0 mt-0.5">
                      <Copy className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── PAYOUT TRACKING ── */}
          <TabsContent value="payouts" className="mt-4">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Track commission payouts to each partner. Edit inline — changes save automatically to local storage.</p>
              {partners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="w-12 h-12 opacity-20 mx-auto mb-3"/>
                  <p>No partners yet. Add partners first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partners.filter(p=>p.status==='active').map(p => {
                    let hist: MonthEntry[] = [];
                    try { hist = JSON.parse(localStorage.getItem(`wulfrayn_partner_hist_${p.id}`) ?? '[]'); } catch {}
                    const totalPaid = hist.reduce((s,h)=>s+h.earnings,0);
                    const totalRefs2 = hist.reduce((s,h)=>s+h.referrals,0);
                    return (
                      <Card key={p.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-sm">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.type} · {p.phone}</p>
                            </div>
                            <div className="flex gap-4 text-right">
                              <div>
                                <p className="text-xs text-muted-foreground">Total Refs</p>
                                <p className="font-bold text-blue-400">{totalRefs2}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total Paid</p>
                                <p className="font-bold text-emerald-400">PKR {fmtAmt(totalPaid)}</p>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={()=>setHistP(p)}>
                                <Pencil className="w-3 h-3"/>Edit History
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {MONTHS.map(m=>{
                              const row = hist.find(h=>h.month===m);
                              if (!row?.earnings) return null;
                              return (
                                <div key={m} className="shrink-0 bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-center min-w-[56px]">
                                  <p className="text-[9px] text-muted-foreground">{m}</p>
                                  <p className="text-[11px] font-bold text-emerald-400">{fmtAmt(row.earnings)}</p>
                                  <p className="text-[9px] text-blue-400">{row.referrals} refs</p>
                                </div>
                              );
                            })}
                            {hist.every(h=>!h.earnings) && (
                              <p className="text-xs text-muted-foreground py-2">No payout data — click Edit History to add monthly figures.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── MULTI-TIER COMMISSIONS ── */}
          <TabsContent value="tiers" className="mt-4 space-y-5">            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
              <p className="text-sm font-bold text-foreground">Multi-Tier Referral Structure</p>
              <p className="text-xs text-muted-foreground">You can reward partners who bring in OTHER partners. Tier 1 earns on direct referrals; Tier 2 earns a smaller cut when their sub-partner closes a deal.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { tier:'Tier 1 — Direct Partner', pct:'3–5%', desc:'Partner directly refers a buyer who purchases a vehicle. Full commission paid to partner upon deal closure.', color:'border-primary/40 bg-primary/5', badge:'text-primary' },
                { tier:'Tier 2 — Sub-Partner', pct:'1–2%', desc:'Partner recruits another person who then refers a buyer. Original partner earns a smaller override commission.', color:'border-blue-400/30 bg-blue-400/5', badge:'text-blue-400' },
                { tier:'Tier 3 — Network Bonus', pct:'0.5%', desc:'Optional third level for very active networks. Rare — only activate when network is large enough to justify tracking.', color:'border-purple-400/30 bg-purple-400/5', badge:'text-purple-400' },
              ].map(t=>(
                <Card key={t.tier} className={cn('border', t.color)}>
                  <CardContent className="p-4 space-y-2">
                    <p className={cn('text-2xl font-black tabular-nums', t.badge)}>{t.pct}</p>
                    <p className="text-sm font-bold text-foreground">{t.tier}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-bold text-foreground">Multi-Tier Example Calculation</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border">
                        {['Scenario','Vehicle Price','T1 Partner (4%)','T2 Partner (1.5%)','T3 Network (0.5%)','Total Paid Out'].map(h=>(
                          <th key={h} className="text-left text-[10px] text-muted-foreground pb-2 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Entry Car',  '2,500,000', '100,000', '37,500',  '12,500', '150,000'],
                        ['Mid-Range',  '4,500,000', '180,000', '67,500',  '22,500', '270,000'],
                        ['Luxury SUV', '8,000,000', '320,000', '120,000', '40,000', '480,000'],
                        ['Import CBU', '6,200,000', '248,000', '93,000',  '31,000', '372,000'],
                      ].map(row=>(
                        <tr key={row[0]} className="border-b border-border/40">
                          <td className="py-2 pr-4 font-medium text-foreground">{row[0]}</td>
                          {row.slice(1).map((v,i)=>(
                            <td key={i} className={cn('py-2 pr-4 tabular-nums font-semibold', i===0?'text-foreground':i===3?'text-primary':'text-emerald-400')}>PKR {v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">* Percentages are indicative. Adjust to your margin structure. T1 = direct closer, T2 = their sponsor, T3 = top of network.</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-bold text-foreground">Best Practices</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  <li>Always document who referred whom <span className="text-foreground font-medium">before</span> a deal closes — disputes arise when not tracked.</li>
                  <li>Pay out within 7 days of deal completion to keep partners motivated.</li>
                  <li>Use the Partner Earnings History to track each partner's monthly contribution.</li>
                  <li>Consider non-cash bonuses (gifts, fuel cards) for Tier 2/3 to reduce cash outflow.</li>
                  <li>Announce top performers on your WhatsApp/social channel — social proof drives more referrals.</li>
                  <li>Review commission rates quarterly; market conditions change.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Niches */}
          <TabsContent value="niches" className="mt-4">            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm font-bold text-foreground mb-1">Who Makes the Best Partner?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Anyone who regularly interacts with car owners or potential buyers in their professional life. The best partners have warm relationships with their clients and can make trusted personal referrals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NICHES.map((n,i)=>(
                <motion.div key={n.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
                  <Card className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <n.icon className="w-4 h-4 text-primary"/>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{n.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── Referral Links ─────────────────────────────────────────────────── */}
          <TabsContent value="referrallink" className="mt-4 space-y-4">
            <ReferralLinksTab partners={partners} />
          </TabsContent>

        </Tabs>
      </div>

      {/* Add/Edit partner dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>{editP?.id ? 'Edit Partner' : 'Add New Partner'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div><Label className="text-xs">Full Name *</Label><Input value={editP?.name??''} onChange={e=>setEditP(p=>({...p,name:e.target.value}))} className="mt-1" placeholder="Partner full name"/></div>
            <div><Label className="text-xs">Phone *</Label><Input value={editP?.phone??''} onChange={e=>setEditP(p=>({...p,phone:e.target.value}))} className="mt-1" placeholder="+92 XXX XXXXXXX"/></div>
            <div><Label className="text-xs">Email (optional)</Label><Input value={editP?.email??''} onChange={e=>setEditP(p=>({...p,email:e.target.value}))} className="mt-1" placeholder="partner@email.com"/></div>
            <div>
              <Label className="text-xs">Partner Type</Label>
              <Select value={editP?.type??'Other'} onValueChange={v=>setEditP(p=>({...p,type:v}))}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {NICHES.map(n=><SelectItem key={n.label} value={n.label}>{n.label}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={editP?.status??'active'} onValueChange={v=>setEditP(p=>({...p,status:v}))}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes (optional)</Label><Textarea value={editP?.notes??''} onChange={e=>setEditP(p=>({...p,notes:e.target.value}))} className="mt-1 h-16 text-xs" placeholder="Any notes about this partner..."/></div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={()=>setDlgOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveP}>{editP?.id?'Update':'Add Partner'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly history dialog */}
      <Dialog open={!!histP} onOpenChange={v=>!v&&setHistP(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl">
          <DialogHeader><DialogTitle>{histP?.name} - Monthly Earnings History</DialogTitle></DialogHeader>
          {histP && (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pt-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground pb-2 pr-4">Month</th>
                      <th className="text-right text-xs text-muted-foreground pb-2 pr-4">Referrals</th>
                      <th className="text-right text-xs text-muted-foreground pb-2">Earnings (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map(m=>{
                      let hist: MonthEntry[] = [];
                      try { hist = JSON.parse(localStorage.getItem(`wulfrayn_partner_hist_${histP.id}`) ?? '[]'); } catch {}
                      const row = hist.find(h=>h.month===m) ?? { month:m, referrals:0, earnings:0 };
                      return (
                        <tr key={m} className="border-b border-border/50">
                          <td className="py-2 pr-4 text-xs text-muted-foreground">{m}</td>
                          <td className="py-2 pr-4 text-right">
                            <input type="number" defaultValue={row.referrals}
                              onBlur={e=>updateMonthly(histP.id,m,Number(e.target.value),'referrals')}
                              className="w-16 bg-transparent text-right text-xs focus:outline-none focus:underline tabular-nums text-blue-400 font-bold"/>
                          </td>
                          <td className="py-2 text-right">
                            <input type="number" defaultValue={row.earnings}
                              onBlur={e=>updateMonthly(histP.id,m,Number(e.target.value),'earnings')}
                              className="w-28 bg-transparent text-right text-xs focus:outline-none focus:underline tabular-nums text-emerald-400 font-bold"/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground">Click any value to edit. Changes save on blur.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
