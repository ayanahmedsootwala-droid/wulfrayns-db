import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, BellOff, CheckCircle2, Clock, Download, GitBranch,
  RefreshCw, Shield, Wifi, WifiOff, Zap, Info, Package,
  Users, Radio, Megaphone, BookOpen, X, ChevronDown, ChevronUp,
  ArrowRight, AlertTriangle, Star, Settings2, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppUpdate {
  id: string;
  version: string;
  title: string;
  body: string;
  update_type: 'feature' | 'fix' | 'security' | 'hotfix' | 'announcement';
  published_at: string;
  is_active: boolean;
  author: string | null;
  tags: string[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEEN_KEY  = 'wulfrayns_seen_updates';
const BELL_KEY  = 'wulfrayns_bell_enabled';
const CHECK_MS  = 30_000; // poll every 30s

const TYPE_CFG: Record<AppUpdate['update_type'], { label: string; color: string; icon: React.ReactNode; badge: string }> = {
  feature:      { label: 'New Feature',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/25',      icon: <Star className="w-3.5 h-3.5"/>,         badge: 'bg-blue-400/15 text-blue-400 border-blue-400/30' },
  fix:          { label: 'Bug Fix',       color: 'text-green-400 bg-green-400/10 border-green-400/25',    icon: <CheckCircle2 className="w-3.5 h-3.5"/>,  badge: 'bg-green-400/15 text-green-400 border-green-400/30' },
  security:     { label: 'Security',      color: 'text-red-400 bg-red-400/10 border-red-400/25',          icon: <Shield className="w-3.5 h-3.5"/>,        badge: 'bg-red-400/15 text-red-400 border-red-400/30' },
  hotfix:       { label: 'Hotfix',        color: 'text-orange-400 bg-orange-400/10 border-orange-400/25', icon: <Zap className="w-3.5 h-3.5"/>,           badge: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  announcement: { label: 'Announcement', color: 'text-purple-400 bg-purple-400/10 border-purple-400/25', icon: <Megaphone className="w-3.5 h-3.5"/>,     badge: 'bg-purple-400/15 text-purple-400 border-purple-400/30' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')); } catch { return new Set(); }
}
function addSeen(id: string) {
  const s = getSeen(); s.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-PK', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Publish Panel (Admin) ────────────────────────────────────────────────────
function PublishPanel({ onPublished }: { onPublished: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: '', title: '', body: '', update_type: 'feature' as AppUpdate['update_type'], author: 'Admin', tags: '' });
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from('app_updates').insert({
        version: form.version || 'v77',
        title: form.title.trim(),
        body: form.body.trim(),
        update_type: form.update_type,
        author: form.author || 'Admin',
        tags: tags.length ? tags : null,
        is_active: true,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Update published — all users will see it on next check!');
      setForm({ version: '', title: '', body: '', update_type: 'feature', author: 'Admin', tags: '' });
      setOpen(false);
      onPublished();
    } catch (e) {
      toast.error(`Failed to publish: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally { setSaving(false); }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2">
        <button onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />Publish New Update
          </CardTitle>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">Push update notices to all users without resending code.</p>
      </CardHeader>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Version tag</Label>
                  <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v77.0" className="h-8 text-xs bg-muted/40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select value={form.update_type} onChange={e => setForm(f => ({ ...f, update_type: e.target.value as AppUpdate['update_type'] }))}
                    className="w-full h-8 text-xs px-2 rounded-md border border-border bg-muted/40 text-foreground">
                    {(Object.keys(TYPE_CFG) as AppUpdate['update_type'][]).map(t => (
                      <option key={t} value={t}>{TYPE_CFG[t].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New AI Matching Feature Added" className="h-8 text-sm bg-muted/40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description *</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="What changed? What was fixed? What's new? Describe clearly for all users." className="text-sm bg-muted/40 min-h-[80px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Author</Label>
                  <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Admin" className="h-8 text-xs bg-muted/40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
                  <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="AI, inventory, fixes" className="h-8 text-xs bg-muted/40" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={publish} disabled={saving} className="gap-1.5">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                  {saving ? 'Publishing…' : 'Publish to All Users'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="border-border">Cancel</Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Update Card ──────────────────────────────────────────────────────────────
function UpdateCard({ update, isNew, onDismiss }: { update: AppUpdate; isNew: boolean; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(isNew);
  const cfg = TYPE_CFG[update.update_type] ?? TYPE_CFG.announcement;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border overflow-hidden transition-colors', isNew ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}
    >
      <button className="w-full text-left" onClick={() => { setExpanded(v => !v); if (isNew) { addSeen(update.id); onDismiss(update.id); } }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0', cfg.color)}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isNew && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
              <span className="text-sm font-semibold text-foreground truncate">{update.title}</span>
              <Badge className={cn('text-[9px] border px-1.5 py-0 shrink-0', cfg.badge)}>{cfg.label}</Badge>
              {update.version && <Badge variant="outline" className="text-[9px] border-border text-muted-foreground px-1.5 py-0 shrink-0">{update.version}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(update.published_at)}{update.author ? ` · by ${update.author}` : ''}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <Separator className="bg-border" />
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{update.body}</p>
              {update.tags && update.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {update.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] border-border text-muted-foreground">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LiveSyncPage() {
  const [updates, setUpdates]       = useState<AppUpdate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [seenIds, setSeenIds]       = useState<Set<string>>(getSeen);
  const [bellEnabled, setBell]      = useState(() => localStorage.getItem(BELL_KEY) !== 'false');
  const [connected, setConnected]   = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [unread, setUnread]         = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data ?? []) as AppUpdate[];
      setUpdates(list);
      setLastChecked(new Date());
      setConnected(true);
      const seen = getSeen();
      const newCount = list.filter(u => !seen.has(u.id)).length;
      setUnread(newCount);
      if (newCount > 0 && bellEnabled) {
        toast.info(`${newCount} new update${newCount > 1 ? 's' : ''} available!`, { duration: 4000 });
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [bellEnabled]);

  // Initial load + realtime + polling
  useEffect(() => {
    fetchUpdates();

    // Realtime subscription
    channelRef.current = supabase
      .channel('app_updates_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_updates' }, (payload) => {
        const newUpdate = payload.new as AppUpdate;
        if (!newUpdate.is_active) return;
        setUpdates(prev => [newUpdate, ...prev]);
        setUnread(prev => prev + 1);
        setLastChecked(new Date());
        if (bellEnabled) {
          toast.info(`🔔 New update: ${newUpdate.title}`, { duration: 6000 });
        }
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));

    // Fallback poll
    pollRef.current = setInterval(fetchUpdates, CHECK_MS);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllSeen = () => {
    updates.forEach(u => addSeen(u.id));
    setSeenIds(getSeen());
    setUnread(0);
  };

  const dismissOne = (id: string) => {
    addSeen(id);
    setSeenIds(getSeen());
    setUnread(prev => Math.max(0, prev - 1));
  };

  const toggleBell = (v: boolean) => {
    setBell(v);
    localStorage.setItem(BELL_KEY, String(v));
    toast.success(v ? 'Update notifications enabled' : 'Notifications muted');
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                Code Update Notifier
                {unread > 0 && <Badge className="bg-primary text-primary-foreground text-xs px-2">{unread} new</Badge>}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stay in sync — receive feature updates, fixes, and announcements pushed live without re-downloading the app.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border', connected ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20')}>
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? 'Live' : 'Offline'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Package className="w-4 h-4 text-primary" />, label: 'Total Updates', value: updates.length },
            { icon: <Bell className="w-4 h-4 text-amber-400" />,  label: 'Unread', value: unread },
            { icon: <Clock className="w-4 h-4 text-blue-400" />,  label: 'Last Checked', value: lastChecked ? lastChecked.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—' },
            { icon: <Users className="w-4 h-4 text-green-400" />, label: 'Polling', value: `Every ${CHECK_MS / 1000}s` },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />How This Works
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: '1', icon: <Radio className="w-4 h-4 text-primary" />, title: 'Dev publishes an update', desc: 'Developer writes a changelog entry (feature / fix / announcement) and publishes it to the database.' },
                { step: '2', icon: <Wifi className="w-4 h-4 text-green-400" />, title: 'Realtime push to your app', desc: 'Supabase Realtime channel instantly delivers the update to every open browser — no code download needed.' },
                { step: '3', icon: <Bell className="w-4 h-4 text-amber-400" />, title: 'You get notified', desc: 'A toast notification and unread badge appear. Open this page to read the full change log and dismiss.' },
              ].map((s, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{s.step}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">{s.icon}<p className="text-xs font-semibold text-foreground">{s.title}</p></div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bellEnabled ? 'bg-primary/10' : 'bg-muted')}>
                  {bellEnabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Toast Notifications</p>
                  <p className="text-xs text-muted-foreground">Show pop-up alert when a new update is pushed</p>
                </div>
              </div>
              <Switch checked={bellEnabled} onCheckedChange={toggleBell} />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Polling Fallback</p>
                <p className="text-xs text-muted-foreground">Auto-check every {CHECK_MS / 1000} seconds if realtime disconnects</p>
              </div>
              <Badge className="bg-green-400/10 text-green-400 border-green-400/20 text-xs">Active</Badge>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Manual Refresh</p>
                <p className="text-xs text-muted-foreground">Force-check for updates right now</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => { setLoading(true); fetchUpdates(); }}>
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publish Panel */}
        <PublishPanel onPublished={fetchUpdates} />

        {/* v77 Static Changelog */}
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />v78 Release Notes — Wulfrayn's DB
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">AI-powered expansion across all modules — July 2026</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {[
              { type: 'feature' as const, title: 'AI Marketing Blast Generator', desc: 'New AI Blast tab in Marketing — generate personalised WhatsApp, SMS, and Email campaigns via Gemini 2.5 Flash. Choose tone, target audience, channel, and special offers. One-click WhatsApp share.' },
              { type: 'feature' as const, title: 'Customs Duty Chart — Full Customisation', desc: 'Complete overhaul with USD/PKR rate control, vehicle age depreciation (1% per month up to 50%), category selector (Passenger/SUV/HEV/EV), LHD surcharge, multi-currency display, and CC finder.' },
              { type: 'feature' as const, title: 'Auction Guide — Profit Tracker Tab', desc: 'Track every auction purchase: enter auction price (JPY), freight, duty+local costs, and selling price. Live profit/margin calculator. Running total profit across all entries.' },
              { type: 'feature' as const, title: 'Auction Guide — Market Trends Tab', desc: 'Pakistan import demand trends for 9 top models. Demand levels, JPY auction ranges, PKR market price, trend direction, and market insight. Best ROI picks and risk highlights.' },
              { type: 'feature' as const, title: 'Car Knowledge Library — Resale Values Tab', desc: 'Pakistan market resale value guide for 12 models. 1-year, 3-year, 5-year estimates. Resale ratings and trend indicators (Rising/Stable/Declining) with make filter.' },
              { type: 'feature' as const, title: 'Car Knowledge Library — Service Costs Tab', desc: 'Comprehensive service cost comparison (Toyota vs Honda vs Suzuki vs BMW/Euro) for 12 service items. Annual ownership cost summaries per brand.' },
              { type: 'feature' as const, title: 'Import Cars Guide — Full Cost Estimator', desc: 'Complete import cost breakdown: origin country selector (Japan/UK/UAE/Germany/Australia), purchase price, CC slab duty, depreciation, EV/HEV discount, clearing agent, port handling. Shows total landed cost.' },
              { type: 'feature' as const, title: 'Import Cars Guide — Agents Directory', desc: '5 verified clearing agents across Karachi/Lahore/Islamabad/Faisalabad. Specialities, ratings, years of experience, services offered, and contact details. City filter included.' },
              { type: 'feature' as const, title: 'AI Lead Scorer Panel', desc: 'AI-powered lead scoring in lead detail panel. Analyses inquiry type, vehicle interest, budget signal, and engagement level to produce a hot/warm/cold scoring recommendation with actionable follow-up notes.' },
              { type: 'feature' as const, title: 'Dashboard — Recent Inquiries Widget', desc: 'Live widget showing 5 latest inquiries with customer name, vehicle of interest, phone, status badge, and quick-link to full inquiries page.' },
              { type: 'feature' as const, title: 'Settings — Integrations & Shortcuts Tabs', desc: 'New Integrations tab with 4 API cards (Google AI, WhatsApp, Stripe, Supabase) + webhook endpoints with copy-to-clipboard. New Keyboard Shortcuts tab with navigation + action shortcuts + display preferences.' },
              { type: 'feature' as const, title: 'Activity Log — Full Expansion', desc: 'Action type filter, timeline/list view toggle, CSV export, stats section (top 4 action types by count), 4 new action types (inquiry_created/updated, quote_sent, expense_added).' },
            ].map((item, i) => {
              const cfg = TYPE_CFG[item.type];
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{cfg.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Update feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />Update Feed
              {unread > 0 && <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px]">{unread} unread</Badge>}
            </h2>
            {unread > 0 && (
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7 gap-1" onClick={markAllSeen}>
                <CheckCircle2 className="w-3.5 h-3.5" />Mark all read
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Checking for updates…</span>
            </div>
          ) : updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Package className="w-10 h-10 opacity-20" />
              <p className="text-sm">No updates published yet.</p>
              <p className="text-xs opacity-60">Use the Publish panel above to push the first update.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {updates.map(u => (
                <UpdateCard
                  key={u.id}
                  update={u}
                  isNew={!seenIds.has(u.id)}
                  onDismiss={dismissOne}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
