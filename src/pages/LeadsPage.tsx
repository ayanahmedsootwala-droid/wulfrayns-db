import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Search, Flame, Minus, Snowflake, Phone, MessageSquare,
  DollarSign, Car, Edit2, Trash2, X, Send, Bot, Sparkles,
  RefreshCw, CheckCircle2, GitMerge,
  LayoutGrid, List, TrendingUp, Clock,
  ExternalLink, Copy, Check, MapPin, Tag, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { streamLLMQueued } from '@/lib/ai-client';
import {
  fetchLeads, createLead, updateLead, deleteLead,
  fetchLeadInteractions, createLeadInteraction,
  type Lead, type LeadScore, type LeadStatus, type LeadInteraction,
} from '@/lib/rpm-api';
import { formatCurrency, cn } from '@/lib/utils';
import { getSettings } from '@/hooks/useSettings';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Config ───────────────────────────────────────────────────────────────────
// ─── WhatsApp message templates ───────────────────────────────────────────────
const WA_TEMPLATES: { label: string; emoji: string; build: (lead: Lead) => string }[] = [
  {
    label: 'Greeting / First Contact',
    emoji: '👋',
    build: l => {
      const biz = getSettings().bizName;
      return `Assalam o Alaikum ${l.customer_name}! 😊\nYeh ${biz} ki taraf se message hai. Hum aapke liye best vehicles available karte hain.\n${l.req_make || l.req_model ? `Aap ne ${[l.req_make, l.req_model].filter(Boolean).join(' ')} mein interest dikhaya tha — kya aap abhi bhi dekh rahe hain? 🚗` : 'Aapke requirements share karein — hum best option nikaalte hain!'}\nJawab dein, hum turant help karenge! 🙏`;
    },
  },
  {
    label: 'Follow-up (Warm Lead)',
    emoji: '🔥',
    build: l => {
      const biz = getSettings().bizName;
      return `Hi ${l.customer_name}! 👋\n${biz} here. Aap se baat kiye thodi der ho gayi — bas check karna tha ke aap ka car search kaisa ja raha hai?\n${l.req_make || l.req_model ? `${[l.req_make, l.req_model].filter(Boolean).join(' ')} ke kuch zabardast options aa gaye hain aaj kal. ` : ''}Kya aap kal ya parso showroom visit kar sakte hain?\nApna preferred time bata dein — hum appoint confirm kar dete hain! ✅`;
    },
  },
  {
    label: 'Price Quote',
    emoji: '💰',
    build: l => {
      const biz = getSettings().bizName;
      return `Salam ${l.customer_name}! 🤝\nYeh hai aapke liye ${biz} ki taraf se specially prepared quote:\n\n🚗 Vehicle: ${[l.req_make, l.req_model, l.req_fuel_type].filter(Boolean).join(' ') || 'As per your requirement'}\n${l.budget_max ? `💵 Budget Range: PKR ${l.budget_max.toLocaleString()}\n` : ''}✅ Condition: Genuine & Verified\n📋 Complete documentation available\n\nAaj hi reply karein — stock limited hai! ⏳`;
    },
  },
  {
    label: 'New Stock Alert',
    emoji: '🚨',
    build: l => {
      const biz = getSettings().bizName;
      return `${l.customer_name} bhai/sister! 🎉\n${biz} ka naya stock aa gaya hai!\n\n${l.req_make || l.req_model ? `✨ Aapki pasand ke mutabiq ${[l.req_make, l.req_model].filter(Boolean).join(' ')} available hain!` : '✨ Naye aur behtareen vehicles aa gaye hain!'}\n\nSabse pehle aap ko bataya — kyunke aap hamare valued customer hain 🙏\nCall karein ya showroom aa jayein — aaj hi!`;
    },
  },
  {
    label: 'Appointment Reminder',
    emoji: '📅',
    build: l => {
      const biz = getSettings().bizName;
      return `Salam ${l.customer_name}! ⏰\nBas aapko remind karna tha ke kal ${biz} showroom visit hai.\n\n📍 Location: ${l.city || 'Our showroom'}\n🕐 Please apna convenient time confirm karein\n📞 Koi sawaal ho to call karein\n\nAapka intezaar rahega! 🚗`;
    },
  },
  {
    label: 'Price Drop / Special Offer',
    emoji: '🏷️',
    build: l => {
      const biz = getSettings().bizName;
      return `🎊 Khaas Offer Sirf Aapke Liye, ${l.customer_name}!\n\n${biz} ne aaj ek special price drop ki hai${l.req_make || l.req_model ? ` ${[l.req_make, l.req_model].filter(Boolean).join(' ')} par` : ''}!\n\n💥 Limited time deal\n✅ Full papers & verified history\n🤝 Easy installment options available\n\nAbhi reply karein — offer sirf 48 ghanty ke liye hai! ⏳`;
    },
  },
  {
    label: 'Test Drive Invite',
    emoji: '🏎️',
    build: l => {
      const biz = getSettings().bizName;
      return `Hi ${l.customer_name}! 🚗\n${biz} ki taraf se aapko test drive ka khususi invitation hai!\n\n${l.req_make || l.req_model ? `${[l.req_make, l.req_model].filter(Boolean).join(' ')} ko khud drive karein aur decide karein.` : 'Apni pasand ki car khud drive karein aur feel karein!'}\n\n📅 Apni convenient date bataein\n📍 We come to you OR visit our showroom\n\nKoi pressure nahi — sirf experience! 😊`;
    },
  },
  {
    label: 'Negotiation / Counter Offer',
    emoji: '🤝',
    build: l =>
      `${l.customer_name} bhai! 🙏\nAapki baat sun ke hum ne manager se discuss kiya.\n\nHum aapke liye best possible price arrange karne ki koshish kar rahe hain.${l.budget_max ? `\nAapka budget PKR ${l.budget_max.toLocaleString()} hai — hum is ke qareeb pohnchne ki koshish karenge.` : ''}\n\nKya aap kal direct call pe baat kar sakte hain? Final figure confirm kar dete hain. 💪`,
  },
  {
    label: 'After-Sale / Thank You',
    emoji: '⭐',
    build: l => {
      const biz = getSettings().bizName;
      return `${l.customer_name} bhai/sister! 🎉\n${biz} ki taraf se bohot bohot mubarak ho nayi gari ke liye! 🚗✨\n\nUmmeed hai aap bilkul khush hain.\n\n⭐ Agar acha experience raha to apne doston ko zaroor recommend karein!\n📞 Koi bhi issue ho — hum hamesha available hain\n\nThank you for trusting ${biz}! 🙏`;
    },
  },
  {
    label: 'Re-engage (Cold Lead)',
    emoji: '❄️',
    build: l => {
      const biz = getSettings().bizName;
      return `Salam ${l.customer_name}! 👋\nKafi waqt guzra — ${biz} ki taraf se ek baar phir check karne aaye hain.\n\nKya aap ne apni dream car le li ya abhi bhi dekh rahe hain? 🚗\n${l.req_make || l.req_model ? `${[l.req_make, l.req_model].filter(Boolean).join(' ')} ke bohat aache options available hain ab. ` : ''}Market mein prices change hue hain — shayad aapke budget mein kuch better mil jaye!\n\nBata dein — koi bhi pressure nahi 😊`;
    },
  },
];

const SCORE_CONFIG: Record<LeadScore, { label: string; icon: React.ElementType; cls: string; pillCls: string }> = {
  hot:  { label: 'Hot',  icon: Flame,    cls: 'lead-hot',  pillCls: 'bg-red-500/15 text-red-400 border-red-500/25' },
  warm: { label: 'Warm', icon: Minus,    cls: 'lead-warm', pillCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  cold: { label: 'Cold', icon: Snowflake,cls: 'lead-cold', pillCls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
};

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; headerCls: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-400', headerCls: 'border-emerald-400/40 bg-emerald-400/5' },
  converted: { label: 'Converted', color: 'text-primary',     headerCls: 'border-primary/40 bg-primary/5' },
  on_hold:   { label: 'On Hold',   color: 'text-yellow-400',  headerCls: 'border-yellow-400/40 bg-yellow-400/5' },
  lost:      { label: 'Lost',      color: 'text-muted-foreground', headerCls: 'border-border bg-muted/20' },
};

const BLANK: Partial<Lead> = {
  customer_name: '', phone: '', whatsapp: '', email: '', city: '',
  budget_max: undefined, req_make: '', req_model: '', req_fuel_type: '',
  req_body_type: '', lead_score: 'warm', source: '', notes: '', status: 'active',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, urgent }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; urgent?: boolean;
}) {
  return (
    <Card className={cn('bg-card border-border transition-all', urgent && 'border-red-500/30 bg-red-500/5')}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
            <p className={cn('text-lg font-bold truncate', urgent ? 'text-red-400' : 'text-foreground')}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', urgent ? 'bg-red-500/15' : 'bg-primary/10')}>
            <Icon className={cn('w-4 h-4', urgent ? 'text-red-400' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Lead Card (Kanban) ───────────────────────────────────────────────────────
function LeadCard({ lead, onSelect, onEdit, onDelete, onWhatsApp }: {
  lead: Lead; onSelect: () => void; onEdit: () => void; onDelete: () => void; onWhatsApp: () => void;
}) {
  const cfg = SCORE_CONFIG[lead.lead_score];
  const daysAgo = lead.last_contact_at
    ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / 86400_000)
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card
        className="bg-card border-border hover:border-primary/30 cursor-pointer group transition-all hover:shadow-sm"
        onClick={onSelect}
      >
        <CardContent className="p-3 space-y-2">
          {/* Top row */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {lead.customer_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{lead.customer_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge className={cn('text-[9px] px-1.5 py-0.5 border', cfg.pillCls)}>
                  <cfg.icon className="w-2.5 h-2.5 mr-0.5 inline" />{cfg.label}
                </Badge>
                {lead.source && (
                  <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full border border-border">{lead.source}</span>
                )}
              </div>
            </div>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Vehicle interest */}
          {(lead.req_make || lead.req_model) && (
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 rounded-lg px-2 py-1.5 border border-primary/15">
              <Car className="w-3 h-3 shrink-0" />
              <span className="truncate">{[lead.req_make, lead.req_model, lead.req_fuel_type].filter(Boolean).join(' · ')}</span>
            </div>
          )}

          {/* Budget */}
          {lead.budget_max && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3 shrink-0" />
              <span>Budget: <span className="font-semibold text-foreground">{formatCurrency(lead.budget_max)}</span></span>
            </div>
          )}

          {/* Notes / Inquiry description snippet */}
          {lead.notes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg px-2 py-1.5">
              <MessageSquare className="w-3 h-3 text-primary shrink-0 mt-px" />
              <span className="line-clamp-2 leading-snug">{lead.notes}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {lead.phone && (
                <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{lead.phone}</span>
              )}
              {lead.city && (
                <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{lead.city}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {daysAgo !== null && (
                <span className={cn('text-[9px] flex items-center gap-0.5', daysAgo > 7 ? 'text-red-400' : 'text-muted-foreground')}>
                  <Clock className="w-2.5 h-2.5" />{daysAgo}d
                </span>
              )}
              {lead.whatsapp && (
                <button
                  onClick={e => { e.stopPropagation(); onWhatsApp(); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  title="Open WhatsApp">
                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ status, leads, onSelect, onEdit, onDelete, onWhatsApp }: {
  status: LeadStatus; leads: Lead[];
  onSelect: (l: Lead) => void; onEdit: (l: Lead) => void;
  onDelete: (l: Lead) => void; onWhatsApp: (l: Lead) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] shrink-0">
      <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0', cfg.headerCls)}>
        <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.color)}>{cfg.label}</span>
        <Badge className="text-[10px] bg-muted/50 text-muted-foreground border-border">{leads.length}</Badge>
      </div>
      <div className={cn('flex-1 rounded-b-xl border border-t-0 bg-muted/10 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto', cfg.headerCls.includes('border-') ? cfg.headerCls.split(' ')[0] : 'border-border')}>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground">No leads</div>
        )}
        <AnimatePresence initial={false}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead}
              onSelect={() => onSelect(lead)}
              onEdit={() => onEdit(lead)}
              onDelete={() => onDelete(lead)}
              onWhatsApp={() => onWhatsApp(lead)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function LeadListRow({ lead, selected, onSelect, onEdit, onDelete, onWhatsApp }: {
  lead: Lead; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; onWhatsApp: () => void;
}) {
  const cfg = SCORE_CONFIG[lead.lead_score];
  const stCfg = STATUS_CONFIG[lead.status];
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div
        onClick={onSelect}
        className={cn('flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer group transition-all',
          selected ? 'bg-primary/5' : 'hover:bg-muted/30'
        )}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {lead.customer_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-x-4 items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{lead.customer_name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{lead.phone || lead.city || '—'}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-xs text-primary truncate">{[lead.req_make, lead.req_model].filter(Boolean).join(' ') || '—'}</p>
            <p className="text-[10px] text-muted-foreground">{lead.budget_max ? formatCurrency(lead.budget_max) : '—'}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge className={cn('text-[9px] px-1.5 py-0.5 border', cfg.pillCls)}>
              <cfg.icon className="w-2.5 h-2.5 mr-0.5 inline" />{cfg.label}
            </Badge>
            <span className={cn('text-[10px] font-medium', stCfg.color)}>{stCfg.label}</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{lead.whatsapp_messages}</span>
            <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{lead.call_count}</span>
            {lead.source && <span className="truncate">{lead.source}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {lead.whatsapp && (
            <button onClick={e => { e.stopPropagation(); onWhatsApp(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
            </button>
          )}
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-primary"
            onClick={e => { e.stopPropagation(); onEdit(); }}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
            onClick={e => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState<LeadScore | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Partial<Lead> | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState('');
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiScoreResult, setAiScoreResult] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const abortScoreRef = React.useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchLeads({
        score: scoreFilter, status: statusFilter, search, pageSize: 200,
      });
      setLeads(data); setTotal(count);
    } finally { setLoading(false); }
  }, [scoreFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing({ ...BLANK }); setDialogOpen(true); };
  const openEdit = (l: Lead) => { setEditing({ ...l }); setDialogOpen(true); };

  const save = async () => {
    if (!editing?.customer_name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if ((editing as Lead).id) {
        await updateLead((editing as Lead).id, editing);
        toast.success('Lead updated');
      } else {
        await createLead(editing);
        toast.success('Lead added');
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteLead(deleting.id);
    toast.success('Lead deleted');
    setDeleting(null);
    if (selected?.id === deleting.id) setSelected(null);
    load();
  };

  const syncInquiries = async () => {
    setSyncing(true);
    try {
      const { data: inqs } = await supabase.from('inquiries').select('*').eq('status', 'new').limit(50);
      if (!inqs?.length) { toast.info('No new inquiries to sync'); setSyncing(false); return; }
      let count = 0;
      for (const inq of inqs) {
        const { error } = await supabase.from('rpm_leads').upsert({
          customer_name: inq.name || 'Unknown',
          phone: inq.phone || '',
          email: inq.email || '',
          source: 'inquiry',
          lead_score: 'warm',
          status: 'active',
          req_make: inq.make || '',
          req_model: inq.model || '',
          notes: inq.message || '',
        }, { onConflict: 'phone' });
        if (!error) count++;
      }
      toast.success(`Synced ${count} inquiries`);
      load();
    } finally { setSyncing(false); }
  };

  const openWhatsApp = (lead: Lead, msg?: string) => {
    const num = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    const text = msg ?? `Hello ${lead.customer_name}! This is ${getSettings().bizName}. We have exciting vehicles available that match your requirements. Are you still looking?`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const generateFollowUp = async (lead: Lead) => {
    setAiFollowUp('');
    setAiLoading(true);
    abortRef.current = new AbortController();
    const prompt = `Generate a professional, friendly WhatsApp follow-up message for this lead:
Name: ${lead.customer_name}
Budget: ${lead.budget_max ? formatCurrency(lead.budget_max) : 'not specified'}
Looking for: ${[lead.req_make, lead.req_model, lead.req_fuel_type, lead.req_body_type].filter(Boolean).join(', ') || 'not specified'}
Lead score: ${lead.lead_score}
City: ${lead.city || 'not specified'}
Previous calls: ${lead.call_count}, WhatsApp messages: ${lead.whatsapp_messages}

Write a short (3-4 lines), non-robotic, persuasive message in Urdu-English mix (Hinglish) as a Pakistani car dealer would. Include a call to action.`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: `You are ${getSettings().bizName} AI Sales Copilot.`,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: (c) => setAiFollowUp(p => p + c),
      onComplete: () => setAiLoading(false),
      onError: (e) => { setAiLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry in a moment' : 'AI failed'); },
      signal: abortRef.current.signal,
    });
  };

  const generateAiScore = (lead: Lead) => {
    setAiScoreResult('');
    setAiScoreLoading(true);
    abortScoreRef.current = new AbortController();
    const prompt = `You are an expert automotive sales analyst. Analyse this lead and provide a detailed AI scoring assessment.

Lead Details:
- Name: ${lead.customer_name}
- Score: ${lead.lead_score} | Status: ${lead.status}
- Budget: ${lead.budget_max ? `PKR ${lead.budget_max.toLocaleString()}` : 'not specified'}
- Looking for: ${[lead.req_make, lead.req_model, lead.req_fuel_type, lead.req_body_type, lead.req_transmission].filter(Boolean).join(', ') || 'open'}
- City: ${lead.city || 'unknown'} | Source: ${lead.source || 'unknown'}
- Calls made: ${lead.call_count} | WhatsApp msgs: ${lead.whatsapp_messages}
- Created: ${lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'unknown'}
- Notes: ${lead.notes || 'none'}

Provide:
1. **Score Justification** (2-3 lines) — why this lead is hot/warm/cold
2. **Buy Intent Signals** (bullet points) — positive and negative signals
3. **Recommended Next Action** (1 specific action with timing)
4. **Estimated Close Probability** (e.g. 75%)
5. **Risk Factors** (1-2 lines)

Be concise and actionable for a Pakistani used car dealer.`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are an expert automotive CRM analyst specialising in Pakistani used car dealerships.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: (c) => setAiScoreResult(p => p + c),
      onComplete: () => setAiScoreLoading(false),
      onError: (e) => { setAiScoreLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry in a moment' : 'AI scoring failed'); },
      signal: abortScoreRef.current.signal,
    });
  };

  // Stats
  const hot   = leads.filter(l => l.lead_score === 'hot').length;
  const warm  = leads.filter(l => l.lead_score === 'warm').length;
  const cold  = leads.filter(l => l.lead_score === 'cold').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const totalBudget = leads.filter(l => l.budget_max).reduce((s, l) => s + (l.budget_max ?? 0), 0);

  // Filtered per status for kanban
  const forStatus = (s: LeadStatus) => leads.filter(l => l.status === s);

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Leads &amp; CRM
            </h1>
            <p className="text-xs text-muted-foreground">{total} leads · AI-classified pipeline</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border" onClick={syncInquiries} disabled={syncing}>
              {syncing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Syncing…</> : <><GitMerge className="w-3.5 h-3.5" />Sync</>}
            </Button>
            <Button size="sm" className="gap-1.5 h-8" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </Button>
          </div>
        </div>

        {/* ── KPI Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-4 md:px-6 py-3 border-b border-border shrink-0">
          <KpiCard label="Hot Leads" value={hot} icon={Flame} urgent={hot > 0} sub="need follow-up" />
          <KpiCard label="Warm Leads" value={warm} icon={Minus} sub="nurturing" />
          <KpiCard label="Cold Leads" value={cold} icon={Snowflake} />
          <KpiCard label="Converted" value={converted} icon={CheckCircle2} sub="closed deals" />
          <KpiCard label="Pipeline Value" value={totalBudget >= 1_000_000 ? `${(totalBudget / 1_000_000).toFixed(1)}M` : formatCurrency(totalBudget)} icon={TrendingUp} />
        </div>

        {/* ── Filters + View Toggle ── */}
        <div className="flex gap-2 px-4 md:px-6 py-2 border-b border-border shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
              className="pl-8 h-8 text-xs bg-muted/40" />
          </div>
          <Select value={scoreFilter} onValueChange={v => setScoreFilter(v as LeadScore | 'all')}>
            <SelectTrigger className="h-8 text-xs w-28 bg-muted/40"><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">🟡 Warm</SelectItem>
              <SelectItem value="cold">⚪ Cold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as LeadStatus | 'all')}>
            <SelectTrigger className="h-8 text-xs w-32 bg-muted/40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button onClick={() => setView('kanban')}
              className={cn('flex items-center gap-1.5 px-3 h-8 text-xs transition-colors', view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}>
              <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline">Board</span>
            </button>
            <button onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 h-8 text-xs border-l border-border transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}>
              <List className="w-3.5 h-3.5" /><span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main panel */}
          <div className={cn('flex-1 min-w-0 overflow-hidden', selected && 'hidden md:block')}>
            {loading ? (
              <div className={cn('p-4', view === 'kanban' ? 'flex gap-4 overflow-x-auto' : 'space-y-2')}>
                {Array.from({ length: view === 'kanban' ? 4 : 8 }).map((_, i) => (
                  <div key={i} className={cn('bg-muted/30 animate-pulse border border-border rounded-xl', view === 'kanban' ? 'w-72 h-48 shrink-0' : 'h-14')} />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Users className="w-10 h-10 opacity-20" />
                <p className="text-sm">No leads found</p>
                <Button size="sm" variant="outline" className="border-border" onClick={openNew}>Add First Lead</Button>
              </div>
            ) : view === 'kanban' ? (
              /* Kanban board */
              <div className="h-full overflow-x-auto">
                <div className="flex gap-4 p-4 h-full min-w-max">
                  {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(status => (
                    <KanbanColumn
                      key={status} status={status}
                      leads={forStatus(status)}
                      onSelect={setSelected}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                      onWhatsApp={openWhatsApp}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* List view */
              <div className="flex flex-col h-full overflow-hidden">
                {/* List header */}
                <div className="hidden md:grid grid-cols-[40px_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-2 border-b border-border bg-muted/20">
                  {['','Customer','Interest','Score','Activity',''].map((h, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{h}</span>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {leads.map(lead => (
                      <LeadListRow
                        key={lead.id} lead={lead}
                        selected={selected?.id === lead.id}
                        onSelect={() => setSelected(lead)}
                        onEdit={() => openEdit(lead)}
                        onDelete={() => setDeleting(lead)}
                        onWhatsApp={() => openWhatsApp(lead)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full md:w-80 lg:w-96 shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">
              <LeadDetail
                lead={selected}
                aiLoading={aiLoading}
                aiFollowUp={aiFollowUp}
                aiScoreLoading={aiScoreLoading}
                aiScoreResult={aiScoreResult}
                copied={copied}
                onClose={() => { setSelected(null); setAiScoreResult(''); setAiFollowUp(''); }}
                onEdit={() => openEdit(selected)}
                onDelete={() => setDeleting(selected)}
                onGenerateFollowUp={() => generateFollowUp(selected)}
                onGenerateScore={() => generateAiScore(selected)}
                onCopyFollowUp={async () => {
                  if (aiFollowUp) {
                    await navigator.clipboard.writeText(aiFollowUp);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success('Copied!');
                  }
                }}
                onWhatsApp={(msg) => openWhatsApp(selected, msg)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {(editing as Lead)?.id ? 'Edit Lead' : 'Add New Lead'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-1">
              {([
                { label: 'Customer Name *', key: 'customer_name', type: 'text' },
                { label: 'Phone',           key: 'phone',          type: 'text' },
                { label: 'WhatsApp',        key: 'whatsapp',       type: 'text' },
                { label: 'Email',           key: 'email',          type: 'email' },
                { label: 'City',            key: 'city',           type: 'text' },
                { label: 'Max Budget (PKR)',key: 'budget_max',     type: 'number' },
                { label: 'Looking For Make',key: 'req_make',       type: 'text' },
                { label: 'Looking For Model',key:'req_model',      type: 'text' },
                { label: 'Fuel Type',       key: 'req_fuel_type',  type: 'text' },
                { label: 'Body Type',       key: 'req_body_type',  type: 'text' },
                { label: 'Source',          key: 'source',         type: 'text' },
              ] as { label: string; key: string; type: string }[]).map(({ label, key, type }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                  <Input type={type}
                    value={(editing as Record<string, string | number | undefined>)[key] as string ?? ''}
                    onChange={e => setEditing(p => ({
                      ...p!,
                      [key]: type === 'number' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value,
                    }))}
                    className="h-8 text-xs bg-muted/40" />
                </div>
              ))}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Lead Score</Label>
                <Select value={editing.lead_score} onValueChange={v => setEditing(p => ({ ...p!, lead_score: v as LeadScore }))}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">🟡 Warm</SelectItem>
                    <SelectItem value="cold">⚪ Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p!, status: v as LeadStatus }))}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                <Textarea value={editing.notes ?? ''} onChange={e => setEditing(p => ({ ...p!, notes: e.target.value }))}
                  className="text-xs bg-muted/40 min-h-[60px] resize-none" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !editing?.customer_name?.trim()}>
              {saving ? 'Saving…' : 'Save Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deleting?.customer_name} and all interactions permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function LeadDetail({
  lead, aiLoading, aiFollowUp, aiScoreLoading, aiScoreResult, copied,
  onClose, onEdit, onDelete, onGenerateFollowUp, onGenerateScore, onCopyFollowUp, onWhatsApp,
}: {
  lead: Lead; aiLoading: boolean; aiFollowUp: string;
  aiScoreLoading: boolean; aiScoreResult: string;
  copied: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
  onGenerateFollowUp: () => void; onGenerateScore: () => void;
  onCopyFollowUp: () => void; onWhatsApp: (msg?: string) => void;
}) {
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<number | null>(null);
  const [tplCopied, setTplCopied] = useState(false);
  const cfg = SCORE_CONFIG[lead.lead_score];
  const stCfg = STATUS_CONFIG[lead.status];

  useEffect(() => {
    fetchLeadInteractions(lead.id).then(setInteractions);
  }, [lead.id]);

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await createLeadInteraction({ lead_id: lead.id, type: 'note', notes: note.trim() });
      setNote('');
      const updated = await fetchLeadInteractions(lead.id);
      setInteractions(updated);
      toast.success('Note added');
    } finally { setAddingNote(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-border bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {lead.customer_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{lead.customer_name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge className={cn('text-[9px] px-1.5 py-0.5 border', cfg.pillCls)}>
              <cfg.icon className="w-2.5 h-2.5 mr-0.5 inline" />{cfg.label}
            </Badge>
            <span className={cn('text-[10px] font-medium', stCfg.color)}>{stCfg.label}</span>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}><Edit2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Contact */}
        <div className="space-y-1.5">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-xs text-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="w-3 h-3 text-muted-foreground" />{lead.phone}
            </a>
          )}
          {lead.city && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3" />{lead.city}</p>}
          {lead.budget_max && (
            <p className="text-xs text-foreground flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              Budget: <span className="font-semibold text-primary ml-1">{formatCurrency(lead.budget_max)}</span>
            </p>
          )}
          {(lead.req_make || lead.req_model) && (
            <p className="text-xs text-primary flex items-center gap-1.5">
              <Car className="w-3 h-3" />{[lead.req_make, lead.req_model, lead.req_fuel_type].filter(Boolean).join(' ')}
            </p>
          )}
          {lead.source && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" />Source: {lead.source}</p>
          )}
        </div>

        {/* Inquiry / Notes block — shown prominently when present */}
        {lead.notes && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-primary flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              {lead.source === 'inquiry' ? 'Inquiry Description' : 'Note'}
            </p>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* WhatsApp — template picker */}
        {lead.whatsapp && (
          <div className="space-y-2">
            <button
              className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              onClick={() => setShowTemplates(v => !v)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Templates
              {showTemplates ? <ChevronRight className="w-3.5 h-3.5 ml-auto rotate-90 transition-transform" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform" />}
            </button>

            {showTemplates && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 overflow-hidden">
                {/* Template list */}
                <div className="max-h-52 overflow-y-auto divide-y divide-border/40">
                  {WA_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-400/10',
                        selectedTpl === i ? 'bg-emerald-400/15 text-foreground' : 'text-muted-foreground'
                      )}
                      onClick={() => setSelectedTpl(selectedTpl === i ? null : i)}
                    >
                      <span className="text-base shrink-0">{t.emoji}</span>
                      <span className="font-medium flex-1 min-w-0 truncate">{t.label}</span>
                      <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', selectedTpl === i ? 'rotate-90' : '')} />
                    </button>
                  ))}
                </div>

                {/* Selected template preview + actions */}
                {selectedTpl !== null && (() => {
                  const tpl = WA_TEMPLATES[selectedTpl];
                  const msg = tpl.build(lead);
                  return (
                    <div className="border-t border-emerald-400/20 p-3 space-y-2 bg-emerald-400/5">
                      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">{tpl.emoji} {tpl.label}</p>
                      <div className="bg-card rounded-lg border border-border p-2.5">
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{msg}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          onClick={() => onWhatsApp(msg)}
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Send on WhatsApp
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                        <button
                          className="h-8 px-3 rounded-lg bg-muted/60 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(msg);
                            setTplCopied(true);
                            setTimeout(() => setTplCopied(false), 2000);
                          }}
                        >
                          {tplCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Calls',    val: lead.call_count },
            { label: 'WhatsApp', val: lead.whatsapp_messages },
            { label: 'Visits',   val: lead.visit_count },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center border border-border">
              <p className="text-base font-bold text-foreground">{s.val}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* AI Lead Scorer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> AI Lead Scorer
            </p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-border"
              onClick={onGenerateScore} disabled={aiScoreLoading}>
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              {aiScoreLoading ? 'Analysing…' : 'Analyse'}
            </Button>
          </div>
          {!aiScoreResult && !aiScoreLoading && (
            <p className="text-[10px] text-muted-foreground italic">Click Analyse to get AI-powered lead scoring with buy intent signals, close probability, and recommended next action.</p>
          )}
          {aiScoreLoading && !aiScoreResult && (
            <div className="space-y-1.5">
              {[1,2,3].map(i => <div key={i} className="h-2.5 bg-muted/50 rounded animate-pulse" style={{ width: `${60 + i*12}%` }} />)}
            </div>
          )}
          {aiScoreResult && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
              {aiScoreResult}
              {aiScoreLoading && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
        </div>

        <Separator />

        {/* AI Follow-up */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1">
              <Bot className="w-3 h-3 text-primary" /> AI Follow-up
            </p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-border"
              onClick={onGenerateFollowUp} disabled={aiLoading}>
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              {aiLoading ? 'Writing…' : 'Generate'}
            </Button>
          </div>
          {aiFollowUp && (
            <div className="relative bg-muted/30 rounded-xl p-3 border border-border text-xs text-foreground leading-relaxed">
              <p className="whitespace-pre-wrap pr-8">{aiFollowUp}</p>
              <button
                onClick={onCopyFollowUp}
                className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title={copied ? 'Copied!' : 'Copy'}>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        <Separator />

        {/* Activity */}
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">
            Activity ({interactions.length})
          </p>
          <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
            {interactions.length === 0 && <p className="text-xs text-muted-foreground italic">No activity yet</p>}
            {interactions.map(i => (
              <div key={i.id} className="bg-muted/20 rounded-lg p-2 border border-border/50 text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="capitalize text-[10px] font-semibold text-primary">{i.type}</span>
                  <span className="text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                </div>
                {i.notes && <p className="text-foreground">{i.notes}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"
              className="text-xs bg-muted/30 min-h-[44px] resize-none border-border"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
            />
            <Button size="icon" className="h-8 w-8 shrink-0" disabled={!note.trim() || addingNote} onClick={addNote}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
