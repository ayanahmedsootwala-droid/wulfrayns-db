/**
 * NotesPage — Enhanced WhatsApp-ready notes + message templates + bulk composer + analytics
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, RefreshCw, CheckCircle2, Car, ClipboardList,
  ChevronDown, ChevronUp, Pencil, Save, X,
  MessageSquare, FileText, Users, BarChart3, Hash,
  Plus, Trash2, Bell, Send, BookOpen, Zap, Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSettings } from '@/hooks/useSettings';

function buildContactFooter(): string {
  const biz = getSettings();
  const lines: string[] = [biz.bizName];
  if (biz.bizPhone)   lines.push(`📞 ${biz.bizPhone}`);
  if (biz.website)    lines.push(`🌐 ${biz.website}`);
  if (biz.instagram)  lines.push(`📱 ${biz.instagram}`);
  if (biz.bizAddress) lines.push(`📍 ${biz.bizAddress}`);
  return lines.join('\n');
}

// ── helpers ───────────────────────────────────────────────────────────────────
function formatPkr(amount: number | null | undefined): string {
  if (!amount) return 'On Call';
  if (amount >= 10_000_000) return `PKR ${(amount / 10_000_000).toFixed(2)} Crore`;
  if (amount >= 100_000)   return `PKR ${(amount / 100_000).toFixed(2)} Lac`;
  return `PKR ${amount.toLocaleString()}`;
}

function todayStr(): string {
  return new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── vehicle note builder ──────────────────────────────────────────────────────
interface VehicleRow {
  id: string; make: string; model: string; variant?: string;
  model_year?: number; registration_year?: number; color?: string;
  mileage?: number; expected_selling_price?: number; private_notes?: string;
  status: string; fuel_type?: string; transmission?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

function buildStockNote(vehicles: VehicleRow[]): string {
  const available = vehicles.filter(v => v.status === 'available');
  let out = `🚗 *${getSettings().bizName} – AVAILABLE STOCK*\n\n📅 Date: ${todayStr()}\n\n`;
  available.forEach((v, i) => {
    out += `*${i + 1}. ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}*\n\n`;

    // Year line — "Brand New 2026" for current year, "Registered YEAR" for used
    if (!v.model_year || v.model_year >= CURRENT_YEAR) {
      out += `Brand New ${CURRENT_YEAR}\n`;
    } else if (v.registration_year && v.registration_year !== v.model_year) {
      out += `${v.model_year} / Registered ${v.registration_year}\n`;
    } else {
      out += `${v.model_year}\n`;
    }

    // Full specs block
    if (v.color) out += `Color: ${v.color}\n`;
    if (v.fuel_type) out += `Fuel: ${v.fuel_type}\n`;
    if (v.transmission) out += `Transmission: ${v.transmission}\n`;
    if (v.mileage) out += `Mileage: ${v.mileage.toLocaleString()} km\n`;
    if (v.private_notes) {
      v.private_notes.split(/[.\n]+/).map(n => n.trim()).filter(Boolean).forEach(n => out += `${n}\n`);
    }
    out += `💰 Demand: ${formatPkr(v.expected_selling_price)}\n\n`;
  });
  out += `📩 For complete details, original pictures, videos, and the best deal, feel free to contact us.\n\n${buildContactFooter()}`;
  return out;
}

// ── inquiry note builder ──────────────────────────────────────────────────────
interface InquiryRow {
  id: string; customer_name: string;
  req_make?: string; req_model?: string; req_variant?: string; req_color?: string;
  req_model_year?: number; req_reg_year?: number; req_mileage_max?: number;
  req_budget_max?: number; req_fuel_type?: string; req_body_type?: string;
  req_additional?: string; description?: string;
  priority?: string; status?: string;
}

function buildInquiryNote(inquiries: InquiryRow[]): string {
  const active = inquiries.filter(i => !['closed', 'resolved'].includes(i.status ?? ''));
  let out = `🚗 *${getSettings().bizName} – Vehicles Required*\n\n📅 Date: ${todayStr()}\n\n`;

  active.forEach((inq, idx) => {
    out += `*${idx + 1}. ${inq.customer_name}*\n`;

    // Parse pipe-separated OR options first (e.g. "Honda City 1.2 (2025/2026) | Toyota Yaris (2025)")
    const rawNotes = inq.req_additional || inq.description || '';
    const options = rawNotes.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);

    if (options.length > 1) {
      // Multi-vehicle: list each option on its own line with OR separator
      options.forEach((opt, oi) => {
        if (oi > 0) out += `OR\n`;
        out += `${opt}\n`;
      });
    } else {
      // Single vehicle — build structured spec block
      const make  = inq.req_make  ?? '';
      const model = inq.req_model ?? '';
      const variant = inq.req_variant ?? '';
      const year  = inq.req_model_year;
      const regYr = inq.req_reg_year;

      // Vehicle line
      const vehicleLine = [make, model, variant].filter(Boolean).join(' ');
      if (vehicleLine) {
        if (year) {
          out += `${vehicleLine} (${year}${regYr && regYr !== year ? ` / Reg. ${regYr}` : ''})\n`;
        } else {
          out += `${vehicleLine}\n`;
        }
      } else if (rawNotes) {
        out += `${rawNotes}\n`;
      }

      // Specs block
      if (inq.req_color)        out += `Color: ${inq.req_color}\n`;
      if (inq.req_fuel_type)    out += `Fuel: ${inq.req_fuel_type}\n`;
      if (inq.req_body_type)    out += `Type: ${inq.req_body_type}\n`;
      if (inq.req_mileage_max)  out += `Max Mileage: ${inq.req_mileage_max.toLocaleString()} km\n`;
      if (inq.req_budget_max)   out += `Budget: up to ${formatPkr(inq.req_budget_max)}\n`;

      // Append additional notes if different from the vehicle line
      if (rawNotes && rawNotes !== vehicleLine) {
        const extra = rawNotes.split(/[.\n]+/).map(s => s.trim()).filter(
          s => s && s !== vehicleLine && !s.startsWith(make) && !s.startsWith(model)
        );
        extra.forEach(e => out += `${e}\n`);
      }
    }

    out += `\n`;
  });

  out += `📩 If available, please share complete details, pictures, and best demand.\n\n${buildContactFooter()}`;
  return out;
}

// ── panel component ───────────────────────────────────────────────────────────
interface NotesPanelProps {
  title: string;
  icon: React.ElementType;
  text: string;
  onTextChange: (t: string) => void;
  loading: boolean;
  onRefresh: () => void;
  count: number;
  accentClass: string;
}

function NotesPanel({ title, icon: Icon, text, onTextChange, loading, onRefresh, count, accentClass }: NotesPanelProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  useEffect(() => { setDraft(text); }, [text]);

  const handleCopy = async () => {
    const content = editing ? draft : text;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Card className="bg-card border-border flex flex-col h-full">
      <CardHeader className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className={cn('text-sm font-semibold flex items-center gap-2', accentClass)}>
            <Icon className="w-4 h-4" />{title}
            <Badge variant="outline" className="text-[10px] ml-1">{count}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => { setEditing(e => !e); setDraft(text); }}>
              {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </Button>
            {editing && (
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-green-400 hover:bg-green-400/10"
                onClick={() => { onTextChange(draft); setEditing(false); toast.success('Note saved'); }}>
                <Save className="w-3 h-3" />Save
              </Button>
            )}
            <Button size="sm" variant="outline"
              className={cn('h-7 text-xs gap-1.5', copied ? 'border-green-400/30 text-green-400' : 'border-primary/30 text-primary hover:bg-primary/10')}
              onClick={handleCopy}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 flex-1 flex flex-col">
        {editing ? (
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 rounded-none border-0 resize-none text-xs font-mono bg-muted/20 focus-visible:ring-0 min-h-[500px] p-4"
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed p-4 min-h-[500px]">
              {loading ? (
                <span className="text-muted-foreground animate-pulse">Loading…</span>
              ) : text || (
                <span className="text-muted-foreground">No data available. Click refresh to reload.</span>
              )}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [stockNote, setStockNote] = useState('');
  const [inquiryNote, setInquiryNote] = useState('');
  const [stockCount, setStockCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingInquiry, setLoadingInquiry] = useState(true);
  const [notesTab, setNotesTab] = useState<'notes' | 'templates' | 'bulk' | 'groups'>('notes');

  const loadStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('id,make,model,variant,model_year,registration_year,color,mileage,expected_selling_price,private_notes,status,fuel_type,transmission')
        .eq('status', 'available')
        .order('created_at', { ascending: true });
      const rows = (data ?? []) as VehicleRow[];
      setStockCount(rows.length);
      setStockNote(buildStockNote(rows));
    } catch { toast.error('Failed to load stock'); }
    finally { setLoadingStock(false); }
  }, []);

  const loadInquiries = useCallback(async () => {
    setLoadingInquiry(true);
    try {
      const { data } = await supabase
        .from('inquiries')
        .select('id,customer_name,req_make,req_model,req_variant,req_color,req_model_year,req_reg_year,req_mileage_max,req_budget_max,req_fuel_type,req_body_type,req_additional,description,priority,status')
        .not('status', 'in', '("closed","resolved")')
        .order('created_at', { ascending: true });
      const rows = (data ?? []) as InquiryRow[];
      setInquiryCount(rows.length);
      setInquiryNote(buildInquiryNote(rows));
    } catch { toast.error('Failed to load inquiries'); }
    finally { setLoadingInquiry(false); }
  }, []);

  useEffect(() => {
    loadStock();
    loadInquiries();
  }, [loadStock, loadInquiries]);

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary" />
              </div>
              WhatsApp Notes
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 ml-10.5">
              Auto-generated stock &amp; inquiry lists, templates, bulk composer &amp; contact groups
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
            onClick={() => { loadStock(); loadInquiries(); }}>
            <RefreshCw className="w-3.5 h-3.5" />Refresh Both
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-max">
            {([
              { id: 'notes', label: 'Stock & Inquiries', icon: ClipboardList },
              { id: 'templates', label: 'Message Templates', icon: BookOpen },
              { id: 'bulk', label: 'Bulk Composer', icon: Send },
              { id: 'groups', label: 'Contact Groups', icon: Users },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setNotesTab(tab.id)}
                className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap',
                  notesTab === tab.id ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {notesTab === 'templates' && <TemplatesTab />}
        {notesTab === 'bulk' && <BulkComposerTab />}
        {notesTab === 'groups' && <ContactGroupsTab />}

        {/* Two-panel grid */}
        {notesTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NotesPanel
            title="Available Stock"
            icon={Car}
            text={stockNote}
            onTextChange={setStockNote}
            loading={loadingStock}
            onRefresh={loadStock}
            count={stockCount}
            accentClass="text-primary"
          />
          <NotesPanel
            title="Vehicles Required (Inquiries)"
            icon={ClipboardList}
            text={inquiryNote}
            onTextChange={setInquiryNote}
            loading={loadingInquiry}
            onRefresh={loadInquiries}
            count={inquiryCount}
            accentClass="text-blue-400"
          />
        </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Message Templates Tab ────────────────────────────────────────────────────
const DEFAULT_MSG_TEMPLATES = [
  { id: 'inquiry_reply', label: 'Inquiry Reply', icon: '💬', text: 'Hi {name}! 👋\n\nThank you for your interest in the *{car}*.\n\n✅ It is currently available at *{price}*\n📍 Location: {location}\n\n🔹 Year: {year}\n🔹 Mileage: {mileage} km\n🔹 Transmission: {transmission}\n🔹 Color: {color}\n\nWould you like to schedule a viewing? Let me know a convenient time! 🙂' },
  { id: 'followup', label: 'Follow-Up', icon: '🔔', text: 'Hi {name}! 😊\n\nJust following up on your inquiry about the *{car}*.\n\nAre you still interested? We have a few other interested parties, so let me know if you\'d like to proceed.\n\nFeel free to call or message anytime! 📞' },
  { id: 'price_drop', label: 'Price Drop Alert', icon: '🔥', text: '🔥 *PRICE DROP ALERT!*\n\nHi {name}!\n\nThe *{car}* you were asking about has just been reduced!\n\n💰 New Price: *{price}* (was {old_price})\n\n⏰ Limited time — act fast!\n\n📞 Call/WhatsApp: {phone}' },
  { id: 'appointment', label: 'Appointment Confirm', icon: '📅', text: '✅ *Appointment Confirmed!*\n\nHi {name},\n\nYour viewing appointment for the *{car}* is confirmed:\n\n📅 Date: {date}\n🕐 Time: {time}\n📍 Address: {address}\n\nPlease bring your original CNIC. See you then! 😊' },
  { id: 'sold_congrats', label: 'Sale Completed', icon: '🎉', text: '🎉 *Congratulations {name}!*\n\nYour new *{car}* is officially yours! 🚗✨\n\n📋 Please ensure:\n• Original CNICs of buyer & seller\n• Token/receipt ready for transfer\n• Insurance arranged before driving\n\nThank you for choosing us! ⭐\n\nWe\'d love a Google review if you\'re happy with the service 🙏' },
  { id: 'offer_counter', label: 'Counter Offer', icon: '🤝', text: 'Hi {name},\n\nThank you for your offer on the *{car}*.\n\nWe\'ve reviewed it and can offer a final price of *{counter_price}*. This is our best possible price considering the vehicle\'s condition and market value.\n\nLet me know if you\'d like to proceed! 😊' },
  { id: 'docs_request', label: 'Documents Request', icon: '📄', text: 'Hi {name},\n\nTo proceed with the transfer of the *{car}*, we\'ll need the following:\n\n📋 *Required Documents:*\n✅ Original CNIC (both buyer & seller)\n✅ Original registration book\n✅ Attested copies of CNICs\n✅ Token receipt\n\nPlease arrange these before the transfer date. Any questions? Call anytime! 📞' },
  { id: 'stock_update', label: 'New Stock Alert', icon: '🚗', text: '🚗 *FRESH STOCK ALERT!*\n\nHi {name},\n\nWe just received a *{car}* matching your requirements:\n\n🔹 Year: {year}\n🔹 Mileage: {mileage} km\n🔹 Color: {color}\n🔹 Price: *{price}*\n\nVehicles like this don\'t last long! Want to schedule a viewing? 📞' },
];

interface ContactGroup {
  id: string; name: string; contacts: string; color: string;
}

const GROUP_COLORS = ['bg-primary/10 text-primary border-primary/30', 'bg-blue-400/10 text-blue-400 border-blue-400/30', 'bg-green-400/10 text-green-400 border-green-400/30', 'bg-purple-400/10 text-purple-400 border-purple-400/30', 'bg-amber-400/10 text-amber-400 border-amber-400/30'];

function TemplatesTab() {
  const [templates, setTemplates] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('wulfrayn_msg_templates') || 'null') || DEFAULT_MSG_TEMPLATES; } catch { return DEFAULT_MSG_TEMPLATES; }
  });
  const [selected, setSelected] = React.useState(templates[0]);
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const save = () => {
    const updated = templates.map((t: typeof templates[0]) => t.id === selected.id ? { ...t, text: editText } : t);
    setTemplates(updated); setSelected({ ...selected, text: editText });
    localStorage.setItem('wulfrayn_msg_templates', JSON.stringify(updated));
    setEditing(false); toast.success('Template saved');
  };
  const copy = () => { navigator.clipboard.writeText(editing ? editText : selected.text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const reset = () => { const orig = DEFAULT_MSG_TEMPLATES.find(t => t.id === selected.id); if (orig) { const u = templates.map((t: typeof templates[0]) => t.id === selected.id ? orig : t); setTemplates(u); setSelected(orig); localStorage.setItem('wulfrayn_msg_templates', JSON.stringify(u)); toast.info('Reset to default'); } };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">Message Templates</p>
        {templates.map((t: typeof templates[0]) => (
          <button key={t.id} onClick={() => { setSelected(t); setEditing(false); }}
            className={cn('w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors', selected.id === t.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground bg-muted/20')}>
            <span className="mr-2">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <div className="md:col-span-2 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
          <p className="font-bold text-sm text-foreground">{selected.icon} {selected.label}</p>
          <div className="flex items-center gap-2">
            <button onClick={copy} className={cn('flex items-center gap-1 text-xs transition-colors', copied ? 'text-green-400' : 'text-muted-foreground hover:text-foreground')}>
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
            <button onClick={() => { setEditText(selected.text); setEditing(e => !e); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />{editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>
        <div className="flex-1 p-4">
          {editing ? (
            <div className="space-y-3">
              <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={12} className="text-sm font-mono bg-muted/30 border-border resize-none" />
              <div className="flex gap-2">
                <Button size="sm" onClick={save} className="gap-1.5"><Save className="w-3.5 h-3.5" />Save</Button>
                <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 border-border text-xs">Reset Default</Button>
              </div>
            </div>
          ) : (
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{selected.text}</pre>
          )}
        </div>
        <div className="px-4 pb-3 border-t border-border pt-2">
          <p className="text-[11px] text-muted-foreground">Replace <code className="bg-muted px-1 rounded">{'{placeholders}'}</code> with actual values before sending. Click Edit to customise permanently.</p>
        </div>
      </div>
    </div>
  );
}

function BulkComposerTab() {
  const [message, setMessage] = React.useState('');
  const [contacts, setContacts] = React.useState('');
  const [results, setResults] = React.useState<{ name: string; number: string; url: string }[]>([]);
  const [copied, setCopied] = React.useState<string | null>(null);

  const generate = () => {
    const lines = contacts.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => {
      const parts = l.split(/[,|]/).map(p => p.trim());
      return { name: parts[0] || 'Customer', number: parts[1]?.replace(/\D/g, '') || '' };
    });
    const out = parsed.map(c => ({
      name: c.name,
      number: c.number,
      url: `https://wa.me/${c.number.startsWith('92') ? c.number : '92' + c.number.replace(/^0/, '')}?text=${encodeURIComponent(message.replace(/{name}/g, c.name))}`,
    }));
    setResults(out);
    toast.success(`Generated ${out.length} WhatsApp links`);
  };

  const copyAll = () => {
    const text = results.map(r => `${r.name}: ${r.url}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied('all'); setTimeout(() => setCopied(null), 2000);
    toast.success('All links copied!');
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
        <p className="font-bold text-sm text-green-400 mb-1">📤 Bulk WhatsApp Composer</p>
        <p className="text-xs text-muted-foreground">Generate personalised WhatsApp links for multiple contacts at once. Each link opens WhatsApp with a pre-filled message.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Message (use {'{name}'} for personalisation)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Hi {name}! We have a great offer for you..." className="text-sm bg-muted/30 border-border resize-none" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Contacts (one per line: Name, Number)</Label>
            <Textarea value={contacts} onChange={e => setContacts(e.target.value)} rows={5} placeholder={"Ahmed Ali, 03001234567\nSara Khan, 03211234567\nBilal Ahmed, 03451234567"} className="text-sm bg-muted/30 border-border resize-none font-mono" />
          </div>
          <Button onClick={generate} className="gap-1.5 w-full" disabled={!message || !contacts}>
            <Zap className="w-3.5 h-3.5" />Generate WhatsApp Links
          </Button>
        </div>
        <div>
          {results.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{results.length} Links Generated</p>
                <button onClick={copyAll} className={cn('flex items-center gap-1 text-xs transition-colors', copied === 'all' ? 'text-green-400' : 'text-muted-foreground hover:text-foreground')}>
                  {copied === 'all' ? <><CheckCircle2 className="w-3.5 h-3.5" />Copied All!</> : <><Copy className="w-3.5 h-3.5" />Copy All</>}
                </button>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.number}</p>
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"><Send className="w-3 h-3" />Open</Button>
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(r.url); setCopied(r.number); setTimeout(() => setCopied(null), 1500); }}
                      className={cn('text-muted-foreground hover:text-foreground transition-colors', copied === r.number ? 'text-green-400' : '')}>
                      {copied === r.number ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12 border border-dashed border-border rounded-xl">
              <MessageSquare className="w-8 h-8 opacity-30" />
              <p className="text-sm">Enter contacts and message to generate links</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactGroupsTab() {
  const [groups, setGroups] = React.useState<ContactGroup[]>(() => {
    try { return JSON.parse(localStorage.getItem('wulfrayn_contact_groups') || '[]'); } catch { return []; }
  });
  const [newName, setNewName] = React.useState('');
  const [newContacts, setNewContacts] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const addGroup = () => {
    if (!newName.trim()) return;
    const g: ContactGroup = { id: Date.now().toString(), name: newName, contacts: newContacts, color: GROUP_COLORS[groups.length % GROUP_COLORS.length] };
    const updated = [...groups, g];
    setGroups(updated); localStorage.setItem('wulfrayn_contact_groups', JSON.stringify(updated));
    setNewName(''); setNewContacts(''); toast.success('Group created');
  };
  const removeGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated); localStorage.setItem('wulfrayn_contact_groups', JSON.stringify(updated));
  };
  const countContacts = (contacts: string) => contacts.split('\n').filter(l => l.trim()).length;

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/50 px-4 py-2.5"><p className="font-bold text-sm text-foreground flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />Create Contact Group</p></div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Group Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Hot Leads, Interested Buyers" className="h-9 text-sm bg-muted/40 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Contacts (Name, Number — one per line)</Label>
              <Textarea value={newContacts} onChange={e => setNewContacts(e.target.value)} rows={3} placeholder={"Ahmed Ali, 0300123456\nSara Khan, 0321123456"} className="text-sm bg-muted/30 border-border resize-none font-mono" />
            </div>
          </div>
          <Button onClick={addGroup} size="sm" className="gap-1.5" disabled={!newName.trim()}><Plus className="w-3.5 h-3.5" />Create Group</Button>
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed border-border rounded-xl">
          <Users className="w-8 h-8 opacity-30" />
          <p className="text-sm">No contact groups yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <button onClick={() => setExpandedId(expandedId === g.id ? null : g.id)} className="flex items-center gap-2 flex-1 text-left">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', g.color)}>{g.name}</span>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{countContacts(g.contacts)} contacts</Badge>
                  {expandedId === g.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                </button>
                <button onClick={() => removeGroup(g.id)} className="text-muted-foreground hover:text-red-400 transition-colors ml-3"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {expandedId === g.id && (
                <div className="px-4 pb-3 border-t border-border pt-2">
                  <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{g.contacts || 'No contacts'}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

