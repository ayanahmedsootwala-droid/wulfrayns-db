import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Car, Users,
  Bot, Sparkles, RefreshCw, Calendar, Download, AlertTriangle,
  PieChart, Target, Percent, ArrowUpRight, ArrowDownRight,
  PackageSearch, CheckCircle2, Clock3, FileDown, LayoutGrid,
  List, Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { fetchLeads, fetchExpenses } from '@/lib/rpm-api';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart as RPieChart,
  Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const CHART_COLORS = ['hsl(var(--primary))', '#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa'];

interface VehicleStats {
  totalVehicles: number;
  available: number;
  sold: number;
  pending: number;
  avgSoldPrice: number;
  totalRevenue: number;
  totalCostBasis: number;
  grossProfit: number;
  grossMarginPct: number;
  avgDaysInStock: number;
  oldStock60: number;
  oldStock90: number;
  byMake: { make: string; count: number; soldCount: number; revenue: number }[];
  byStatus: { status: string; count: number }[];
  slowMovers: { id: string; make: string; model: string; variant: string; days: number; price: number }[];
  monthlyRevenue: { month: string; revenue: number; units: number }[];
  conversionRate: number;
}

function KpiCard({ label, value, sub, icon: Icon, trend, color = 'primary', loading }: {
  label: string; value?: string; sub?: string;
  icon: React.ElementType; trend?: number; color?: string; loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary', green: 'text-green-400', red: 'text-red-400',
    orange: 'text-orange-400', blue: 'text-blue-400', purple: 'text-purple-400',
  };
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {loading ? <div className="space-y-2"><div className="h-3 w-20 bg-muted rounded animate-pulse"/><div className="h-7 w-14 bg-muted rounded animate-pulse"/></div> : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className={cn('text-xl font-bold mt-0.5 truncate', colorMap[color])}>{value ?? '—'}</p>
              {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
              {trend !== undefined && (
                <div className={cn('flex items-center gap-0.5 mt-1 text-[10px]', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {trend >= 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                  {Math.abs(trend)}% vs last month
                </div>
              )}
            </div>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-current/10', colorMap[color])}>
              <Icon className={cn('w-4 h-4', colorMap[color])}/>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [vehicleStats, setVehicleStats] = useState<VehicleStats | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'profit' | 'purchase'>('daily');
  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleRes, leadsRes, expRes, inquiryRes] = await Promise.all([
        supabase.from('vehicles').select('id,status,make,model,variant,expected_selling_price,sold_price,purchase_price,created_at,updated_at'),
        fetchLeads({ pageSize: 500 }),
        fetchExpenses({ pageSize: 500 }),
        supabase.from('inquiries').select('id,status,created_at').limit(500),
      ]);

      const vehicles = vehicleRes.data ?? [];
      const now = Date.now();
      const sold = vehicles.filter(v => v.status === 'sold');
      const available = vehicles.filter(v => v.status === 'available');
      const totalRevenue = sold.reduce((s, v) => s + (v.sold_price ?? v.expected_selling_price ?? 0), 0);
      const totalCostBasis = sold.reduce((s, v) => s + (v.purchase_price ?? 0), 0);
      const grossProfit = totalRevenue - totalCostBasis;

      // Monthly revenue (last 6 months)
      const monthMap = new Map<string, { revenue: number; units: number }>();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });
      months.forEach(m => monthMap.set(m, { revenue: 0, units: 0 }));
      sold.forEach(v => {
        if (!v.updated_at) return;
        const key = new Date(v.updated_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (monthMap.has(key)) {
          const e = monthMap.get(key)!;
          e.revenue += v.sold_price ?? v.expected_selling_price ?? 0;
          e.units++;
        }
      });

      const makeMap = new Map<string, { count: number; soldCount: number; revenue: number }>();
      vehicles.forEach(v => {
        const make = v.make ?? 'Unknown';
        if (!makeMap.has(make)) makeMap.set(make, { count: 0, soldCount: 0, revenue: 0 });
        const e = makeMap.get(make)!;
        e.count++;
        if (v.status === 'sold') { e.soldCount++; e.revenue += v.sold_price ?? v.expected_selling_price ?? 0; }
      });

      const statusMap = new Map<string, number>();
      vehicles.forEach(v => { statusMap.set(v.status, (statusMap.get(v.status) ?? 0) + 1); });

      const slowMovers = available
        .filter(v => v.created_at && (now - new Date(v.created_at).getTime()) > 45 * 86400000)
        .map(v => ({
          id: v.id, make: v.make ?? '', model: v.model ?? '', variant: v.variant ?? '',
          days: Math.floor((now - new Date(v.created_at).getTime()) / 86400000),
          price: v.expected_selling_price ?? 0,
        }))
        .sort((a, b) => b.days - a.days).slice(0, 8);

      const inquiries = inquiryRes.data ?? [];
      const resolvedInq = inquiries.filter(i => i.status === 'resolved' || i.status === 'matched').length;

      setVehicleStats({
        totalVehicles: vehicles.length,
        available: available.length,
        sold: sold.length,
        pending: vehicles.filter(v => v.status === 'pending').length,
        avgSoldPrice: sold.length ? totalRevenue / sold.length : 0,
        totalRevenue, totalCostBasis, grossProfit,
        grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        avgDaysInStock: available.length
          ? available.reduce((s, v) => s + (v.created_at ? (now - new Date(v.created_at).getTime()) / 86400000 : 0), 0) / available.length : 0,
        oldStock60: available.filter(v => v.created_at && (now - new Date(v.created_at).getTime()) > 60 * 86400000).length,
        oldStock90: available.filter(v => v.created_at && (now - new Date(v.created_at).getTime()) > 90 * 86400000).length,
        byMake: Array.from(makeMap.entries()).map(([make, v]) => ({ make, ...v })).sort((a, b) => b.count - a.count).slice(0, 8),
        byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        slowMovers,
        monthlyRevenue: months.map(m => ({ month: m, ...monthMap.get(m)! })),
        conversionRate: inquiries.length > 0 ? (resolvedInq / inquiries.length) * 100 : 0,
      });

      setTotalLeads(leadsRes.count);
      setHotLeads(leadsRes.data.filter(l => l.lead_score === 'hot').length);
      setTotalExpenses(expRes.data.reduce((s, e) => s + e.amount_pkr, 0));
      setTotalInquiries(inquiries.length);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const netProfit = (vehicleStats?.grossProfit ?? 0) - totalExpenses;

  const exportCSV = () => {
    if (!vehicleStats) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Vehicles', vehicleStats.totalVehicles],
      ['Available', vehicleStats.available],
      ['Sold', vehicleStats.sold],
      ['Total Revenue (PKR)', vehicleStats.totalRevenue],
      ['Gross Profit (PKR)', vehicleStats.grossProfit],
      ['Gross Margin %', vehicleStats.grossMarginPct.toFixed(1)],
      ['Avg Sell Price (PKR)', vehicleStats.avgSoldPrice.toFixed(0)],
      ['Total Expenses (PKR)', totalExpenses],
      ['Net Profit Est (PKR)', netProfit],
      ['Total Leads', totalLeads],
      ['Hot Leads', hotLeads],
      ['Total Inquiries', totalInquiries],
      ['Conversion Rate %', vehicleStats.conversionRate.toFixed(1)],
      ['Old Stock >60d', vehicleStats.oldStock60],
      ['Old Stock >90d', vehicleStats.oldStock90],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `analytics_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const generateReport = () => {
    setReportLoading(true); setReport('');
    abortRef.current = new AbortController();
    const vs = vehicleStats;
    const prompts: Record<string, string> = {
      daily: `Generate a comprehensive daily dealership manager report for Wulfrayn's DB.
Date: ${new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
DATA: Inventory: ${vs?.totalVehicles ?? 0} (${vs?.available ?? 0} available, ${vs?.sold ?? 0} sold) | Revenue: ${formatCurrency(vs?.totalRevenue ?? 0)} | Gross Profit: ${formatCurrency(vs?.grossProfit ?? 0)} (${vs?.grossMarginPct.toFixed(1) ?? 0}%) | Leads: ${totalLeads} (${hotLeads} hot) | Inquiries: ${totalInquiries} (${vs?.conversionRate.toFixed(1) ?? 0}% conversion) | Expenses: ${formatCurrency(totalExpenses)} | Old Stock >60d: ${vs?.oldStock60 ?? 0} | Avg Days in Stock: ${vs?.avgDaysInStock.toFixed(0) ?? 0}
Sections: Executive Summary | Sales Performance | Lead & Inquiry Pipeline | Stock Health | Financial Overview | Action Items for Today`,
      profit: `Generate a detailed PROFIT ANALYSIS report for Wulfrayn's DB dealership.
Revenue: ${formatCurrency(vs?.totalRevenue ?? 0)} | Cost Basis: ${formatCurrency(vs?.totalCostBasis ?? 0)} | Gross Profit: ${formatCurrency(vs?.grossProfit ?? 0)} | Margin: ${vs?.grossMarginPct.toFixed(1) ?? 0}% | Expenses: ${formatCurrency(totalExpenses)} | Net Profit: ${formatCurrency(netProfit)}
By Make: ${vs?.byMake.map(m => `${m.make}: ${m.count} total, ${m.soldCount} sold, ${formatCurrency(m.revenue)}`).join(' | ')}
Provide: ROI analysis, top performing makes, slow movers impact, markup recommendations, profit optimization strategies`,
      purchase: `Generate a PURCHASE RECOMMENDATION report for Wulfrayn's DB.
Current Stock: ${vs?.byMake.map(m => `${m.make}: ${m.count}(${m.soldCount} sold)`).join(', ')} | Hot Leads: ${hotLeads} | Dead Stock >90d: ${vs?.oldStock90 ?? 0}
Recommend top 5 models to import from Japan: why, target grade, landing cost range, expected margin, import timing.`,
    };
    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL, supabaseAnonKey: ANON_KEY,
      requestBody: { systemInstruction: "You are Wulfrayn's DB AI Sales Copilot. Provide data-driven dealership analysis.", contents: [{ role: 'user', parts: [{ text: prompts[reportType] }] }] },
      onChunk: c => setReport(p => p + c),
      onComplete: () => setReportLoading(false),
      onError: () => { setReportLoading(false); toast.error('Report generation failed'); },
      signal: abortRef.current.signal,
    });
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Analytics &amp; Reports
            </h1>
            <p className="text-xs text-muted-foreground">Real-time dealership intelligence · v78</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={exportCSV} disabled={loading || !vehicleStats}>
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={loadAll} disabled={loading}>
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: formatCurrency(vehicleStats?.totalRevenue ?? 0), sub: `${vehicleStats?.sold ?? 0} vehicles sold`, icon: DollarSign, color: 'primary' },
            { label: 'Gross Profit', value: formatCurrency(vehicleStats?.grossProfit ?? 0), sub: `${vehicleStats?.grossMarginPct.toFixed(1) ?? 0}% margin`, icon: TrendingUp, color: (vehicleStats?.grossProfit ?? 0) >= 0 ? 'green' : 'red' },
            { label: 'Net Profit Est.', value: formatCurrency(netProfit), sub: `After ${formatCurrency(totalExpenses)} expenses`, icon: Target, color: netProfit >= 0 ? 'green' : 'red' },
            { label: 'Avg Sell Price', value: formatCurrency(vehicleStats?.avgSoldPrice ?? 0), sub: 'Per vehicle sold', icon: Percent, color: 'blue' },
            { label: 'Available Stock', value: String(vehicleStats?.available ?? 0), sub: `${vehicleStats?.oldStock60 ?? 0} aged >60d`, icon: PackageSearch, color: 'primary' },
            { label: 'Inquiry Pipeline', value: String(totalInquiries), sub: `${vehicleStats?.conversionRate.toFixed(0) ?? 0}% conversion rate`, icon: Users, color: 'purple' },
            { label: 'Hot Leads', value: String(hotLeads), sub: `of ${totalLeads} total leads`, icon: TrendingUp, color: 'orange' },
            { label: 'Avg Days in Stock', value: `${vehicleStats?.avgDaysInStock.toFixed(0) ?? 0}d`, sub: `${vehicleStats?.oldStock90 ?? 0} vehicles >90d`, icon: Clock3, color: (vehicleStats?.avgDaysInStock ?? 0) > 60 ? 'orange' : 'green' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <KpiCard {...k} loading={loading} />
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger value="overview" className="text-xs h-7">Overview</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs h-7">Revenue Trend</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs h-7">Stock Health</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs h-7"><Users className="w-3 h-3 mr-1"/>Leads & Funnel</TabsTrigger>
            <TabsTrigger value="report" className="text-xs h-7"><Bot className="w-3 h-3 mr-1"/>AI Report</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Make Bar */}
              {vehicleStats && vehicleStats.byMake.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Inventory by Make</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={vehicleStats.byMake} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="make" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                        <Bar dataKey="soldCount" name="Sold" fill="#34d399" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Status Pie */}
              {vehicleStats && vehicleStats.byStatus.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Stock by Status</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <RPieChart>
                        <Pie data={vehicleStats.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={65} label={({ status, percent }) => `${status} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                          {vehicleStats.byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Revenue Trend Tab */}
          <TabsContent value="revenue" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Monthly Revenue (Last 6 Months)</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                {loading ? <div className="h-52 bg-muted/20 rounded animate-pulse" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={vehicleStats?.monthlyRevenue ?? []} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : String(v)} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Health Tab */}
          <TabsContent value="stock" className="mt-4 space-y-4">
            {vehicleStats && vehicleStats.slowMovers.length > 0 ? (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Slow Moving Stock (45+ days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {vehicleStats.slowMovers.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.make} {s.model} {s.variant}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(s.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full', s.days > 90 ? 'bg-red-400' : s.days > 60 ? 'bg-orange-400' : 'bg-yellow-400')}
                              style={{ width: `${Math.min(s.days / 120 * 100, 100)}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold w-10 text-right', s.days > 90 ? 'text-red-400' : 'text-orange-400')}>
                            {s.days}d
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/>45-60d</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>60-90d</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>90d+</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-400 opacity-50" />
                  <p className="text-sm text-muted-foreground">No slow movers — stock is moving well!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leads & Funnel Tab */}
          <TabsContent value="leads" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Inquiries', value: totalInquiries, color: 'blue' },
                { label: 'Hot Leads', value: hotLeads, color: 'red' },
                { label: 'Total Leads (CRM)', value: totalLeads, color: 'purple' },
                { label: 'Conversion Rate', value: `${vehicleStats?.conversionRate.toFixed(1) ?? 0}%`, color: 'green' },
              ].map(({ label, value, color }) => (
                <Card key={label} className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className={cn('text-2xl font-bold mt-1',
                      color === 'blue' ? 'text-blue-400' : color === 'red' ? 'text-red-400' :
                      color === 'purple' ? 'text-purple-400' : 'text-green-400')}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm">Inquiry Funnel</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {[
                    { stage: 'New', pct: 100, color: 'bg-blue-400' },
                    { stage: 'Active / In Progress', pct: 70, color: 'bg-amber-400' },
                    { stage: 'Matched', pct: 40, color: 'bg-purple-400' },
                    { stage: 'Resolved / Closed', pct: vehicleStats ? vehicleStats.conversionRate : 20, color: 'bg-green-400' },
                  ].map(({ stage, pct, color }) => (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{stage}</span>
                        <span className="text-foreground font-medium">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm">Lead Score Distribution</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { score: 'Hot', count: hotLeads },
                      { score: 'Warm', count: Math.max(0, totalLeads - hotLeads - Math.floor(totalLeads * 0.3)) },
                      { score: 'Cold', count: Math.floor(totalLeads * 0.3) },
                    ]} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4,4,0,0]}>
                        {[{ fill: '#f87171' }, { fill: '#f59e0b' }, { fill: '#60a5fa' }].map((c, i) => <Cell key={i} {...c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm">Expenses Overview</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Total Expenses Logged</span>
                  <span className="text-sm font-bold text-red-400">{formatCurrency(totalExpenses)}</span>
                </div>
                {vehicleStats && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-muted-foreground">Net Profit (Revenue − Cost − Expenses)</span>
                    <span className={cn('text-sm font-bold', (vehicleStats.grossProfit - totalExpenses) >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {formatCurrency(vehicleStats.grossProfit - totalExpenses)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Report Tab */}
          <TabsContent value="report" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" /> AI Report Generator
                  </CardTitle>
                  <div className="flex gap-2 items-center flex-wrap">
                    <Select value={reportType} onValueChange={v => setReportType(v as typeof reportType)}>
                      <SelectTrigger className="h-7 text-xs w-48 bg-muted/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Manager Report</SelectItem>
                        <SelectItem value="profit">Profit Analysis</SelectItem>
                        <SelectItem value="purchase">Purchase Recommendations</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={generateReport} disabled={reportLoading || loading}>
                      <Sparkles className="w-3 h-3" /> {reportLoading ? 'Generating...' : 'Generate'}
                    </Button>
                    {reportLoading && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => abortRef.current?.abort()}>Stop</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {!report && !reportLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 opacity-20" />
                    <p className="text-xs">Select a report type and click Generate</p>
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto bg-muted/20 rounded-xl p-4 border border-border">
                    <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                      {report}
                      {reportLoading && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
                    </pre>
                    {report && !reportLoading && (
                      <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1.5"
                        onClick={() => { const b = new Blob([report], {type:'text/plain'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`report_${reportType}_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(u); }}>
                        <Download className="w-3 h-3" /> Download Report
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
