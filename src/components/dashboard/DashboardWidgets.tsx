import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard, GripVertical, RefreshCw, X, Eye, EyeOff,
  Car, Star, CheckSquare, TrendingDown, Clock, DollarSign, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { fetchVehicles, fetchTasks, fetchDealers } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getStatusColor, cn } from '@/lib/utils';
import type { Vehicle, Task, Dealer } from '@/types/types';
import { motion } from 'motion/react';

// ─── Types ──────────────────────────────────────────────────────────────────
type WidgetId = 'recent_cars' | 'top_dealers' | 'pending_tasks' | 'price_drops' | 'follow_ups' | 'inventory_value' | 'aging';

interface WidgetConfig {
  id: WidgetId;
  label: string;
  icon: React.ElementType;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'recent_cars', label: 'Recent Cars', icon: Car, visible: true, order: 0 },
  { id: 'top_dealers', label: 'Top Dealers', icon: Star, visible: true, order: 1 },
  { id: 'pending_tasks', label: 'Pending Tasks', icon: CheckSquare, visible: true, order: 2 },
  { id: 'price_drops', label: 'Price Drops', icon: TrendingDown, visible: true, order: 3 },
  { id: 'follow_ups', label: "Today's Follow-Ups", icon: Clock, visible: true, order: 4 },
  { id: 'inventory_value', label: 'Inventory Value', icon: DollarSign, visible: true, order: 5 },
  { id: 'aging', label: 'Aging Vehicles', icon: Car, visible: false, order: 6 },
];

const STORAGE_KEY = 'dashboard_widgets_v2';

function loadWidgets(): WidgetConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* */ }
  return DEFAULT_WIDGETS;
}

function saveWidgets(w: WidgetConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
function useDragSort(items: WidgetConfig[], onChange: (updated: WidgetConfig[]) => void) {
  const dragIdx = useRef<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    onChange(next.map((w, idx) => ({ ...w, order: idx })));
  };
  const onDragEnd = () => { dragIdx.current = null; };
  return { onDragStart, onDragOver, onDragEnd };
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function DashboardWidgets() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadWidgets);
  const [configOpen, setConfigOpen] = useState(false);

  const updateWidgets = (updated: WidgetConfig[]) => { setWidgets(updated); saveWidgets(updated); };
  const toggleVisible = (id: WidgetId) => {
    updateWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };
  const reorder = (updated: WidgetConfig[]) => updateWidgets(updated);
  const { onDragStart, onDragOver, onDragEnd } = useDragSort(widgets, reorder);

  const visible = [...widgets].sort((a, b) => a.order - b.order).filter(w => w.visible);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">My Dashboard</span>
          <span className="text-xs text-muted-foreground">· drag to reorder</span>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => setConfigOpen(o => !o)}
          className={cn('text-xs h-7 gap-1.5', configOpen && 'bg-muted text-foreground')}
        >
          <Settings className="w-3.5 h-3.5" />Customize
        </Button>
      </div>

      {/* Config Panel */}
      {configOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-3 flex flex-wrap gap-2"
        >
          {[...widgets].sort((a, b) => a.order - b.order).map(w => (
            <button
              key={w.id}
              onClick={() => toggleVisible(w.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all',
                w.visible
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {w.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {w.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((w, i) => (
          <div
            key={w.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDragEnd}
            className="group"
          >
            <div className="relative">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
              <WidgetRenderer id={w.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Widget Router ────────────────────────────────────────────────────────────
function WidgetRenderer({ id }: { id: WidgetId }) {
  switch (id) {
    case 'recent_cars': return <RecentCarsWidget />;
    case 'top_dealers': return <TopDealersWidget />;
    case 'pending_tasks': return <PendingTasksWidget />;
    case 'price_drops': return <PriceDropsWidget />;
    case 'follow_ups': return <FollowUpsWidget />;
    case 'inventory_value': return <InventoryValueWidget />;
    case 'aging': return <AgingWidget />;
    default: return null;
  }
}

// ─── Individual Widgets ───────────────────────────────────────────────────────
function RecentCarsWidget() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchVehicles({ pageSize: 5, orderBy: 'created_at', orderDir: 'desc' })
      .then(r => setVehicles(r.data))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><Car className="w-4 h-4 text-primary" />Recent Cars</CardTitle>
        <Link to="/inventory" className="text-xs text-muted-foreground hover:text-primary">All</Link>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          vehicles.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No vehicles</p> :
            vehicles.map(v => (
              <Link key={v.id} to={`/inventory/${v.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors group">
                <div className="w-8 h-6 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {v.cover_image_url ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Car className="w-3 h-3 text-muted-foreground" />}
                </div>
                <span className="text-xs text-foreground flex-1 min-w-0 truncate">{v.make} {v.model} {v.variant}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(v.expected_selling_price)}</span>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
}

function TopDealersWidget() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchDealers({ pageSize: 5, is_favorite: true })
      .then(r => setDealers(r.data))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" />Top Dealers</CardTitle>
        <Link to="/dealers" className="text-xs text-muted-foreground hover:text-primary">All</Link>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          dealers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">Mark dealers as favourite to see them here</p> :
            dealers.map(d => (
              <Link key={d.id} to={`/dealers/${d.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">{d.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{d.name}</p><p className="text-[10px] text-muted-foreground">{d.city} · {d.deals_done || 0} deals</p></div>
                <div className="flex items-center gap-0.5 shrink-0"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-xs text-muted-foreground">{d.rating?.toFixed(1)}</span></div>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
}

function PendingTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTasks({ status: 'pending', pageSize: 6 })
      .then(r => setTasks(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" />Pending Tasks</CardTitle>
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-primary">All</Link>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          tasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">All caught up! 🎉</p> :
            tasks.map(t => (
              <div key={t.id} className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', t.priority === 'urgent' ? 'bg-red-400' : t.priority === 'high' ? 'bg-yellow-400' : 'bg-muted-foreground')} />
                <div className="flex-1 min-w-0"><p className="text-xs text-foreground truncate">{t.title}</p><p className="text-[10px] text-muted-foreground">{t.due_date ? formatRelativeTime(t.due_date) : 'No due date'}</p></div>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

function PriceDropsWidget() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchVehicles({ pageSize: 5, status: 'available' })
      .then(r => {
        const withDrops = r.data.filter(v => v.expected_selling_price && v.purchase_price && v.expected_selling_price < v.purchase_price * 1.05);
        setVehicles(withDrops.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><TrendingDown className="w-4 h-4 text-green-400" />Price Drops</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          vehicles.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No recent price drops</p> :
            vehicles.map(v => (
              <Link key={v.id} to={`/inventory/${v.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                <span className="text-xs text-foreground flex-1 min-w-0 truncate">{v.make} {v.model}</span>
                <span className="text-xs font-medium text-green-400">{formatCurrency(v.expected_selling_price)}</span>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
}

function FollowUpsWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchTasks({ due_date: today, pageSize: 6 })
      .then(r => setTasks(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" />Today&apos;s Follow-Ups</CardTitle>
        {tasks.length > 0 && <Badge className="text-[10px] bg-orange-400/10 text-orange-400 border-orange-400/20">{tasks.length}</Badge>}
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          tasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No follow-ups due today</p> :
            tasks.map(t => (
              <div key={t.id} className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                <Clock className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-xs text-foreground truncate">{t.title}</p><p className="text-[10px] text-muted-foreground capitalize">{t.priority}</p></div>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

function InventoryValueWidget() {
  const [stats, setStats] = useState<{ total: number; available: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchVehicles({ status: 'available', pageSize: 500 })
      .then(r => {
        const total = r.data.reduce((s, v) => s + (v.expected_selling_price ?? 0), 0);
        const available = r.data.reduce((s, v) => s + (v.purchase_price ?? 0), 0);
        setStats({ total, available, count: r.data.length });
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />Inventory Value</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {loading ? <Skeleton className="h-12 w-full bg-muted" /> : (
          <>
            <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Asking</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(stats?.total)}</p>
              <p className="text-xs text-muted-foreground">{stats?.count} available vehicles</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Cost</p>
              <p className="text-base font-semibold text-foreground">{formatCurrency(stats?.available)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AgingWidget() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchVehicles({ status: 'available', pageSize: 100, orderBy: 'created_at', orderDir: 'asc' })
      .then(r => {
        const now = Date.now();
        const aged = r.data.filter(v => {
          if (!v.created_at) return false;
          const days = (now - new Date(v.created_at).getTime()) / 86400000;
          return days > 30;
        }).slice(0, 5);
        setVehicles(aged);
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="px-4 pt-3 pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" />Aging Vehicles</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />) :
          vehicles.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No stale vehicles</p> :
            vehicles.map(v => {
              const days = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000);
              const hot = days > 90;
              return (
                <Link key={v.id} to={`/inventory/${v.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors">
                  <span className={cn('text-xs shrink-0 font-semibold', hot ? 'text-red-400' : 'text-orange-400')}>{days}d</span>
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate">{v.make} {v.model}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(v.expected_selling_price)}</span>
                </Link>
              );
            })}
      </CardContent>
    </Card>
  );
}
