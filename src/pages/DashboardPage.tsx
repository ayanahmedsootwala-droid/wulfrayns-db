import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Car, Users, Building2, CheckSquare, TrendingUp, TrendingDown,
  Plus, BarChart3, Clock, Star, Zap, AlertTriangle, Eye,
  ArrowRight, Activity, Database, FileText, MessageSquare, Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchDashboardStats, fetchVehicles, fetchTasks, fetchActivityLog, fetchDealers, fetchInquiries } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getStatusColor, cn } from '@/lib/utils';
import type { DashboardStats, Vehicle, Task, ActivityLog, Dealer, Inquiry } from '@/types/types';
import DashboardWidgets from '@/components/dashboard/DashboardWidgets';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const WEEKLY_DATA = [
  { day: 'Mon', added: 3, sold: 1 },
  { day: 'Tue', added: 5, sold: 2 },
  { day: 'Wed', added: 2, sold: 3 },
  { day: 'Thu', added: 7, sold: 1 },
  { day: 'Fri', added: 4, sold: 4 },
  { day: 'Sat', added: 6, sold: 2 },
  { day: 'Sun', added: 3, sold: 1 },
];

function StatCard({ label, value, sub, icon: Icon, trend, color = 'primary', loading }: {
  label: string; value?: number | string; sub?: string;
  icon: React.ElementType; trend?: number; color?: string; loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red: 'text-red-400 bg-red-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-7 w-16 bg-muted" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-2xl font-semibold text-foreground mt-0.5">{value ?? '—'}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
              {trend !== undefined && (
                <div className={cn('flex items-center gap-1 mt-1 text-xs', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend)}% this week
                </div>
              )}
            </div>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colorMap[color] || colorMap.primary)}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [favDealers, setFavDealers] = useState<Dealer[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchVehicles({ pageSize: 6, orderBy: 'created_at', orderDir: 'desc' }),
      fetchTasks({ status: 'pending', pageSize: 5 }),
      fetchActivityLog({ pageSize: 8 }),
      fetchDealers({ is_favorite: true, pageSize: 4 }),
      fetchInquiries({ pageSize: 5 }),
    ]).then(([s, v, t, a, d, inq]) => {
      setStats(s);
      setRecentVehicles(v.data);
      setTasks(t.data);
      setActivity(a.data);
      setFavDealers(d.data);
      setRecentInquiries(inq.data);
    }).finally(() => setLoading(false));
  }, []);

  const urgentTasks = tasks.filter(t => t.priority === 'urgent');

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Wulfrayn's DB · {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {urgentTasks.length > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                {urgentTasks.length} Urgent
              </Badge>
            )}
            <Button size="sm" asChild>
              <Link to="/inventory/new"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Vehicle</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard label="Total Vehicles" value={stats?.total_vehicles} icon={Car} color="primary" loading={loading} trend={5} />
          <StatCard label="Own Inventory" value={stats?.own_inventory} icon={Car} color="blue" loading={loading} />
          <StatCard label="Dealer Stock" value={stats?.dealer_inventory} icon={Building2} color="purple" loading={loading} />
          <StatCard label="Total Dealers" value={stats?.total_dealers} icon={Users} color="green" loading={loading} />
          <StatCard label="Dealerships" value={stats?.total_dealerships} icon={Building2} color="primary" loading={loading} />
          <StatCard label="Available" value={stats?.available_cars} icon={Car} color="green" loading={loading} sub="Ready to sell" />
          <StatCard label="Reserved" value={stats?.reserved_cars} icon={Clock} color="yellow" loading={loading} />
          <StatCard label="Sold" value={stats?.sold_cars} icon={TrendingUp} color="primary" loading={loading} />
          <StatCard label="Incoming" value={stats?.incoming_cars} icon={ArrowRight} color="purple" loading={loading} />
          <StatCard label="Added Today" value={stats?.added_today} icon={Plus} color="green" loading={loading} />
        </div>

        {/* Alert row */}
        {(stats?.pending_inspection ?? 0) > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <span className="font-medium">{stats?.pending_inspection} vehicles</span> pending inspection
            </p>
            <Button size="sm" variant="outline" asChild className="text-xs">
              <Link to="/inventory?status=inspection">Review</Link>
            </Button>
          </div>
        )}

        {/* Widgets — personalized drag-and-drop */}
        <DashboardWidgets />

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: 'Add Vehicle', icon: Car, to: '/inventory/new', color: 'primary' },
              { label: 'New Inquiry', icon: Users, to: '/inquiries', color: 'blue' },
              { label: 'New Quote', icon: FileText, to: '/quotations', color: 'purple' },
              { label: 'Live Display', icon: Eye, to: '/live-display', color: 'green' },
              { label: 'Analytics', icon: BarChart3, to: '/analytics', color: 'yellow' },
              { label: 'WhatsApp Hub', icon: Activity, to: '/whatsapp-hub', color: 'green' },
              { label: 'Bulk Create', icon: Plus, to: '/bulk-create', color: 'orange' },
              { label: 'Settings', icon: Database, to: '/settings', color: 'muted' },
            ].map(({ label, icon: Icon, to, color }) => (
              <Link key={label} to={to}>
                <Card className="bg-card border-border hover:border-primary/30 transition-all hover:shadow-sm cursor-pointer group">
                  <CardContent className="p-3 flex flex-col items-center gap-1.5">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      color === 'primary' ? 'bg-primary/10 group-hover:bg-primary/20' :
                      color === 'blue' ? 'bg-blue-400/10 group-hover:bg-blue-400/20' :
                      color === 'purple' ? 'bg-purple-400/10 group-hover:bg-purple-400/20' :
                      color === 'green' ? 'bg-green-400/10 group-hover:bg-green-400/20' :
                      color === 'yellow' ? 'bg-yellow-400/10 group-hover:bg-yellow-400/20' :
                      color === 'orange' ? 'bg-orange-400/10 group-hover:bg-orange-400/20' :
                      'bg-muted/50 group-hover:bg-muted')}>
                      <Icon className={cn('w-4 h-4',
                        color === 'primary' ? 'text-primary' : color === 'blue' ? 'text-blue-400' :
                        color === 'purple' ? 'text-purple-400' : color === 'green' ? 'text-green-400' :
                        color === 'yellow' ? 'text-yellow-400' : color === 'orange' ? 'text-orange-400' :
                        'text-muted-foreground')} />
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Vehicles */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Vehicles</h2>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                <Link to="/inventory">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <Skeleton className="w-12 h-12 rounded-md bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40 bg-muted" />
                        <Skeleton className="h-3 w-24 bg-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : recentVehicles.map((v) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to={`/inventory/${v.id}`}>
                    <Card className="bg-card border-border hover:border-primary/30 transition-all hover:shadow-card group">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                            <Car className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground truncate">{v.make} {v.model}</p>
                              {v.variant && <span className="text-xs text-muted-foreground">{v.variant}</span>}
                              {v.is_hot_deal && <Badge className="text-xs px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">Hot</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">{v.color}</span>
                              <span className="text-xs text-muted-foreground">{v.model_year}</span>
                              {v.mileage && <span className="text-xs text-muted-foreground">{v.mileage.toLocaleString()} km</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(v.expected_selling_price)}</p>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', getStatusColor(v.status))}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Weekly Chart */}
            <Card className="bg-card border-border mt-4">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Weekly Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={WEEKLY_DATA} barSize={8} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="added" name="Added" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="sold" name="Sold" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Tasks Due */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    Tasks Due
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs h-6 px-2 text-muted-foreground">
                    <Link to="/tasks">All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-muted rounded" />) :
                  tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No pending tasks</p>
                  ) : tasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                        t.priority === 'urgent' ? 'bg-red-400' : t.priority === 'high' ? 'bg-yellow-400' : 'bg-muted-foreground'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.due_date ? formatRelativeTime(t.due_date) : 'No due date'}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Favorite Dealers */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Favorite Dealers
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs h-6 px-2 text-muted-foreground">
                    <Link to="/dealers">All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-muted rounded" />) :
                  favDealers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No favorite dealers yet</p>
                  ) : favDealers.map((d) => (
                    <Link key={d.id} to={`/dealers/${d.id}`} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/30 transition-colors group">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {d.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.city} · {d.deals_done} deals</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-muted-foreground">{d.rating}</span>
                      </div>
                    </Link>
                  ))}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted rounded" />) :
                    activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{a.description || a.action_type}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Inquiries */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />Recent Inquiries
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                    <Link to="/inquiries">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-muted rounded" />) :
                  recentInquiries.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No inquiries yet</p>
                  ) : recentInquiries.map(inq => (
                    <Link key={inq.id} to="/inquiries">
                      <div className="flex items-center gap-2 py-1.5 hover:bg-muted/30 rounded-lg px-1 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{inq.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {inq.req_make ? `${inq.req_make}${inq.req_model ? ' ' + inq.req_model : ''}` : 'General inquiry'}
                            {inq.customer_phone && <span className="ml-1 flex items-center inline-flex gap-0.5"><Phone className="w-2.5 h-2.5" />{inq.customer_phone}</span>}
                          </p>
                        </div>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0',
                          inq.status === 'new' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                          inq.status === 'active' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                          inq.status === 'matched' ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' :
                          inq.status === 'resolved' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                          'bg-muted/50 text-muted-foreground border-border'
                        )}>{inq.status}</span>
                      </div>
                    </Link>
                  ))}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">System Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Database</span>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-xs text-green-400">Online</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Search Index</span>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-xs text-green-400">Active</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Storage</span>
                    <span className="text-xs text-muted-foreground">2.4 GB / 50 GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
