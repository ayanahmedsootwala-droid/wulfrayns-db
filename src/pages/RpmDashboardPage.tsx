import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, Users, FileText, TrendingUp, Bot, Sparkles, Flame,
  DollarSign, ArrowRight, RefreshCw, Ship, Share2, Calculator,
  BarChart3, Wallet, AlertTriangle, CheckCircle2, Clock,
  Star, CheckSquare, CheckSquare2, Zap, Activity, MapPin, Phone, TrendingDown,
  Target, Timer, Bell, X, ClipboardList, Monitor, MessageSquare, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { fetchLeads } from '@/lib/rpm-api';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import ProfitTrackerWidget from '@/components/dashboard/ProfitTrackerWidget';
import AIMarketInsightsWidget from '@/components/dashboard/AIMarketInsightsWidget';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface DashStats {
  totalVehicles: number;
  availableVehicles: number;
  soldThisMonth: number;
  totalLeads: number;
  hotLeads: number;
  pendingQuotes: number;
  activeShipments: number;
  totalInventoryValue: number;
  totalCost: number;
  totalRevenue: number;
  leadsConverted: number;
  avgDaysInStock: number;
}

interface HotCar { id: string; make: string; model: string; variant?: string; model_year?: number; expected_selling_price?: number; cover_image_url?: string; dealer_city?: string; }
interface PendingTask { id: string; title: string; task_type: string; priority?: string; due_date?: string; dealer?: { name: string } | null; }
interface RecentActivity { id: string; action_type: string; entity_name?: string; description?: string; created_at: string; }

const QUICK_ACTIONS = [
  { label: 'AI Chatbot',    icon: Bot,          path: '/ai-sync',            color: 'text-primary bg-primary/10 border-primary/20' },
  { label: 'Car Library',   icon: BookOpen,     path: '/car-library',        color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { label: 'Referrals',     icon: Users,        path: '/referrals',          color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
  { label: 'Add Lead',      icon: Users,         path: '/leads?new=1',        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { label: 'New Quote',     icon: FileText,       path: '/quotations?new=1',   color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  { label: 'Import Calc',   icon: Calculator,    path: '/import-calculator',  color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { label: 'Bulk Create',   icon: ClipboardList, path: '/bulk-create',        color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  { label: 'Live Display',  icon: Monitor,       path: '/live-display',       color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { label: 'Social Post',   icon: Share2,        path: '/social-media',       color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  { label: 'Shipments',     icon: Ship,          path: '/shipments',          color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { label: 'Finance',       icon: Wallet,        path: '/finance',            color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  { label: 'Analytics',     icon: BarChart3,     path: '/analytics',          color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  { label: 'Inquiries',     icon: MessageSquare, path: '/inquiries',          color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  { label: 'Tasks',         icon: CheckSquare2,  path: '/tasks',              color: 'text-lime-400 bg-lime-400/10 border-lime-400/20' },
];

const TASK_TYPE_LABELS: Record<string, string> = {
  call_dealer: 'Call Dealer', visit_showroom: 'Visit Showroom', inspection: 'Inspection',
  price_update: 'Price Update', payment_reminder: 'Payment Reminder',
  document_collection: 'Docs', vehicle_pickup: 'Pickup', vehicle_delivery: 'Delivery', other: 'Task',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-400/10 text-red-400 border-red-400/20',
  high: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  normal: 'bg-muted/40 text-muted-foreground border-border',
  low: 'bg-muted/40 text-muted-foreground border-border',
};

export default function RpmDashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [hotCars, setHotCars] = useState<HotCar[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [newLeads, setNewLeads] = useState<{id:string; customer_name:string; phone?:string; req_make?:string; req_model?:string; lead_score:string; created_at:string}[]>([]);
  const [leadsAlertDismissed, setLeadsAlertDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [vehicleRes, leadsRes, quotesRes, shipmentsRes, hotRes, tasksRes, activityRes] = await Promise.all([
        supabase.from('vehicles').select('status, expected_selling_price, purchase_price, sold_price, created_at', { count: 'exact' }),
        fetchLeads({ pageSize: 200 }),
        supabase.from('rpm_quotations').select('status', { count: 'exact' }).in('status', ['draft', 'sent']),
        supabase.from('rpm_shipments').select('status', { count: 'exact' }).in('status', ['ordered', 'in_transit', 'customs_clearance']),
        supabase.from('vehicles').select('id,make,model,variant,model_year,expected_selling_price,cover_image_url,dealer_city').eq('is_hot_deal', true).eq('status', 'available').order('created_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('id,title,task_type,priority,due_date,dealer:dealers!dealer_id(name)').in('status', ['pending', 'in_progress']).order('due_date', { ascending: true }).limit(8),
        supabase.from('activity_logs').select('id,action_type,entity_name,description,created_at').order('created_at', { ascending: false }).limit(8),
      ]);

      // Fetch new leads from last 7 days (source=inquiry or any hot leads)
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: newLeadsData } = await supabase
        .from('rpm_leads')
        .select('id,customer_name,phone,req_make,req_model,lead_score,created_at')
        .gte('created_at', since7d)
        .in('status', ['new', 'active'])
        .order('created_at', { ascending: false })
        .limit(10);
      setNewLeads((newLeadsData ?? []) as typeof newLeads);
      setLeadsAlertDismissed(false);

      const vehicles = vehicleRes.data ?? [];
      const available = vehicles.filter(v => v.status === 'available');
      const sold = vehicles.filter(v => v.status === 'sold');
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const soldRes = await supabase.from('vehicles').select('id,sold_price,purchase_price', { count: 'exact' }).eq('status', 'sold').gte('updated_at', startOfMonth);

      const totalValue = available.reduce((s, v) => s + (v.expected_selling_price ?? 0), 0);
      const totalCost = sold.reduce((s, v) => s + (v.purchase_price ?? 0), 0);
      const totalRevenue = sold.reduce((s, v) => s + (v.sold_price ?? v.expected_selling_price ?? 0), 0);
      const leadsConverted = leadsRes.data.filter(l => l.status === 'converted').length;

      // avg days in stock for available vehicles
      const avgDays = available.length > 0
        ? Math.round(available.reduce((s, v) => {
            const days = v.created_at ? Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000) : 0;
            return s + days;
          }, 0) / available.length)
        : 0;

      setStats({
        totalVehicles: vehicleRes.count ?? 0,
        availableVehicles: available.length,
        soldThisMonth: soldRes.count ?? 0,
        totalLeads: leadsRes.count,
        hotLeads: leadsRes.data.filter(l => l.lead_score === 'hot').length,
        pendingQuotes: quotesRes.count ?? 0,
        activeShipments: shipmentsRes.count ?? 0,
        totalInventoryValue: totalValue,
        totalCost,
        totalRevenue,
        leadsConverted,
        avgDaysInStock: avgDays,
      });
      setHotCars((hotRes.data ?? []) as HotCar[]);
      setPendingTasks((tasksRes.data ?? []) as unknown as PendingTask[]);
      setRecentActivity((activityRes.data ?? []) as RecentActivity[]);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const generateDailyReport = () => {
    setReportLoading(true); setReport('');
    abortRef.current = new AbortController();
    const prompt = `Generate a concise daily manager report for Wulfrayn's DB dealership.
Date: ${new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${stats ? `
Stats:
- Total Inventory: ${stats.totalVehicles} vehicles (${stats.availableVehicles} available)
- Sold This Month: ${stats.soldThisMonth}
- Total Leads: ${stats.totalLeads} (${stats.hotLeads} hot🔥)
- Pending Quotations: ${stats.pendingQuotes}
- Active Shipments: ${stats.activeShipments}
- Inventory Value: ${formatCurrency(stats.totalInventoryValue)}
` : ''}
Include: Executive Summary, Key Highlights, Hot Leads Action Required, Suggested Actions for Today, Market Note.
Format with clear sections. Keep it professional and actionable.`;

    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL, supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: 'You are Wulfrayn's DB AI Sales Copilot generating a daily dealership manager report.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: c => setReport(p => p + c),
      onComplete: () => setReportLoading(false),
      onError: () => { setReportLoading(false); toast.error('Report generation failed'); },
      signal: abortRef.current.signal,
    });
  };

  const statCards = stats ? [
    { label: 'Total Inventory', value: stats.totalVehicles, sub: `${stats.availableVehicles} available`, icon: Car, color: 'text-primary', link: '/inventory' },
    { label: 'Sold This Month', value: stats.soldThisMonth, sub: 'vehicles', icon: TrendingUp, color: 'text-green-400', link: '/analytics' },
    { label: 'Hot Leads', value: stats.hotLeads, sub: `${stats.totalLeads} total leads`, icon: Flame, color: 'text-red-400', link: '/leads' },
    { label: 'Inventory Value', value: formatCurrency(stats.totalInventoryValue), sub: 'available stock', icon: DollarSign, color: 'text-primary', link: '/analytics', isFormatted: true },
    { label: 'Net Profit', value: formatCurrency(stats.totalRevenue - stats.totalCost), sub: 'revenue − cost', icon: TrendingUp, color: stats.totalRevenue >= stats.totalCost ? 'text-green-400' : 'text-red-400', link: '/finance', isFormatted: true },
    { label: 'Avg Days in Stock', value: stats.avgDaysInStock, sub: 'available vehicles', icon: Timer, color: stats.avgDaysInStock > 60 ? 'text-red-400' : 'text-yellow-400', link: '/inventory' },
    { label: 'Leads Converted', value: stats.leadsConverted, sub: `of ${stats.totalLeads} total`, icon: Target, color: 'text-cyan-400', link: '/leads' },
    { label: 'Pending Quotes', value: stats.pendingQuotes, sub: 'awaiting response', icon: FileText, color: 'text-yellow-400', link: '/quotations' },
    { label: 'Active Shipments', value: stats.activeShipments, sub: 'in transit', icon: Ship, color: 'text-purple-400', link: '/shipments' },
  ] : [];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })} · Wulfrayn's DB Dashboard
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={loadStats} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>

        {/* ── New Leads Alert Banner ── */}
        {!leadsAlertDismissed && newLeads.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-xl border border-red-400/30 bg-red-400/8 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-red-400/15 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-red-400">
                      {newLeads.length} New Lead{newLeads.length > 1 ? 's' : ''} in the last 7 days
                    </p>
                    {newLeads.filter(l => l.lead_score === 'hot').length > 0 && (
                      <Badge className="text-[10px] h-4 bg-red-500/20 text-red-400 border-red-500/30 gap-0.5">
                        <Flame className="w-2.5 h-2.5" />
                        {newLeads.filter(l => l.lead_score === 'hot').length} Hot
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newLeads.slice(0, 5).map(lead => (
                      <div key={lead.id} className="flex items-center gap-1.5 bg-card/60 border border-border rounded-lg px-2 py-1">
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', lead.lead_score === 'hot' ? 'bg-red-400' : lead.lead_score === 'warm' ? 'bg-yellow-400' : 'bg-muted-foreground')} />
                        <span className="text-xs font-medium text-foreground">{lead.customer_name}</span>
                        {(lead.req_make || lead.req_model) && (
                          <span className="text-[10px] text-muted-foreground">{[lead.req_make, lead.req_model].filter(Boolean).join(' ')}</span>
                        )}
                      </div>
                    ))}
                    {newLeads.length > 5 && (
                      <div className="flex items-center px-2 py-1 bg-card/60 border border-border rounded-lg">
                        <span className="text-xs text-muted-foreground">+{newLeads.length - 5} more</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/leads">
                    <Button size="sm" className="h-7 text-xs gap-1.5 bg-red-500 hover:bg-red-600 text-white">
                      <Users className="w-3.5 h-3.5" />View Leads
                    </Button>
                  </Link>
                  <button onClick={() => setLeadsAlertDismissed(true)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse border border-border" />
              ))
            : statCards.map((s, i) => (                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={s.link}>
                    <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer h-full">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <s.icon className={cn('w-4 h-4', s.color)} />
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className={cn('text-lg font-bold leading-tight truncate', s.isFormatted ? 'text-sm font-bold' : '', s.color)}>
                          {s.isFormatted ? s.value : (s.value as number).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-semibold text-foreground mt-0.5 truncate">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
          }
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4">
                {QUICK_ACTIONS.map(a => (
                  <Link key={a.path} to={a.path}>
                    <div className={cn('flex items-center gap-2 p-2.5 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer', a.color)}>
                      <a.icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium">{a.label}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
            <ProfitTrackerWidget />
            <AIMarketInsightsWidget />
          </div>

          {/* Daily AI Report */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border h-full flex flex-col">
              <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> Daily Manager Report
                </CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={generateDailyReport} disabled={reportLoading}>
                  <Sparkles className="w-3 h-3 text-primary" />
                  {reportLoading ? 'Generating...' : report ? 'Regenerate' : 'Generate Report'}
                </Button>
              </CardHeader>
              <CardContent className="flex-1 px-4 pb-4">
                {!report && !reportLoading ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 opacity-20" />
                    <p className="text-xs text-center">Click to generate today's AI-powered dealership report</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {report}
                      {reportLoading && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hot Cars + Tasks + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hot Deals */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />Hot Deals
                  {hotCars.length > 0 && <Badge className="text-[10px] bg-red-400/10 text-red-400 border-red-400/20">{hotCars.length}</Badge>}
                </CardTitle>
                <Link to="/inventory" className="text-xs text-primary hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded bg-muted/30 animate-pulse" />) :
                  hotCars.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">No hot deals currently</div>
                  ) : hotCars.map(car => (
                    <Link key={car.id} to={`/inventory/${car.id}`}>
                      <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {car.cover_image_url
                            ? <img src={car.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <Car className="w-5 h-5 text-muted-foreground m-auto mt-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {car.make} {car.model} {car.variant ?? ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {car.model_year && <span>{car.model_year}</span>}
                            {car.dealer_city && <><MapPin className="w-2.5 h-2.5" />{car.dealer_city}</>}
                          </p>
                        </div>
                        {car.expected_selling_price && (
                          <span className="text-xs font-bold text-primary shrink-0">{formatCurrency(car.expected_selling_price)}</span>
                        )}
                      </div>
                    </Link>
                  ))
                }
              </CardContent>
            </Card>
          </div>

          {/* Pending Tasks */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-yellow-400" />Pending Tasks
                  {pendingTasks.length > 0 && <Badge className="text-[10px] bg-yellow-400/10 text-yellow-400 border-yellow-400/20">{pendingTasks.length}</Badge>}
                </CardTitle>
                <Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />) :
                  pendingTasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-green-400 opacity-50" />All caught up!
                    </div>
                  ) : pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{TASK_TYPE_LABELS[task.task_type] ?? task.task_type}{task.dealer?.name ? ` · ${task.dealer.name}` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {task.priority && (
                          <Badge className={cn('text-[9px] px-1.5 py-0', PRIORITY_COLOR[task.priority])}>{task.priority}</Badge>
                        )}
                        {task.due_date && (
                          <span className={cn('text-[9px]', new Date(task.due_date) < new Date() ? 'text-red-400' : 'text-muted-foreground')}>
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />Recent Activity
                </CardTitle>
                <Link to="/activity" className="text-xs text-primary hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 rounded bg-muted/30 animate-pulse" />) :
                  recentActivity.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">No recent activity</div>
                  ) : recentActivity.map(act => (
                    <div key={act.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug truncate">{act.description ?? act.entity_name ?? act.action_type}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(act.created_at)}</p>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Copilot CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
            <CardContent className="flex items-center justify-between gap-4 py-4 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">RPM AI Sales Copilot</p>
                  <p className="text-xs text-muted-foreground truncate">Car Finder · Inventory Manager · Sales Coach · Document AI · and more</p>
                </div>
              </div>
              <Link to="/ai-copilot">
                <Button size="sm" className="gap-1.5 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" /> Open Copilot
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
