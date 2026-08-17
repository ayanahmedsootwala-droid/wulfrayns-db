import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Download, TrendingUp, BarChart3, Clock, RefreshCw, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchActivityLog } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { ActivityLog } from '@/types/types';
import { toast } from 'sonner';

const ACTION_STYLES: Record<string, { dot: string; label: string }> = {
  vehicle_added: { dot: 'bg-green-400', label: 'Vehicle Added' },
  vehicle_updated: { dot: 'bg-blue-400', label: 'Vehicle Updated' },
  vehicle_deleted: { dot: 'bg-red-400', label: 'Vehicle Deleted' },
  vehicle_sold: { dot: 'bg-primary', label: 'Vehicle Sold' },
  dealer_added: { dot: 'bg-purple-400', label: 'Dealer Added' },
  dealer_interaction: { dot: 'bg-cyan-400', label: 'Dealer Interaction' },
  price_changed: { dot: 'bg-yellow-400', label: 'Price Changed' },
  task_created: { dot: 'bg-orange-400', label: 'Task Created' },
  user_login: { dot: 'bg-muted-foreground', label: 'Login' },
  inquiry_created: { dot: 'bg-indigo-400', label: 'Inquiry Created' },
  inquiry_updated: { dot: 'bg-sky-400', label: 'Inquiry Updated' },
  quote_sent: { dot: 'bg-emerald-400', label: 'Quote Sent' },
  expense_added: { dot: 'bg-rose-400', label: 'Expense Added' },
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchActivityLog({ page, pageSize: 50, search: search || undefined });
      setLogs(data);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 300);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const filtered = actionFilter === 'all' ? logs : logs.filter(l => l.action_type === actionFilter);

  const exportCSV = () => {
    const header = 'Action,Description,User,Date';
    const rows = logs.map(l => [
      l.action_type, l.description ?? '', l.user_name ?? '',
      new Date(l.created_at).toLocaleString(),
    ].map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `activity_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Activity log exported');
  };

  // Stats
  const actionCounts = logs.reduce((acc, l) => {
    acc[l.action_type] = (acc[l.action_type] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Group by date for timeline
  const grouped = filtered.reduce((acc, log) => {
    const key = new Date(log.created_at).toLocaleDateString('en-PK', { weekday:'short', month:'short', day:'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(log); return acc;
  }, {} as Record<string, ActivityLog[]>);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Activity Log
            </h1>
            <p className="text-sm text-muted-foreground">{total.toLocaleString()} total events recorded</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadLogs} className="h-8 text-xs gap-1.5 border-border">
              <RefreshCw className="w-3 h-3" />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5 border-border">
              <Download className="w-3 h-3" />Export CSV
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topActions.map(([action, count]) => (
            <Card key={action} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full shrink-0', ACTION_STYLES[action]?.dot ?? 'bg-muted')} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{ACTION_STYLES[action]?.label ?? action}</p>
                  <p className="text-sm font-bold text-foreground">{count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + View toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search activity…" className="pl-8 h-8 text-xs border-border" />
          </div>
          <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-44 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(ACTION_STYLES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            {(['timeline','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 h-8 text-xs capitalize transition-colors',
                  view === v ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}>
                {v === 'timeline' ? <><Calendar className="w-3 h-3 inline mr-1" />Timeline</> : <><BarChart3 className="w-3 h-3 inline mr-1" />List</>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-muted rounded-xl" />)}
          </div>
        ) : view === 'timeline' ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-xs font-semibold text-foreground">{date}</p>
                  <div className="flex-1 h-px bg-border/50" />
                  <Badge variant="outline" className="text-[10px]">{dayLogs.length} events</Badge>
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-border/30 ml-1">
                  {dayLogs.map(log => {
                    const style = ACTION_STYLES[log.action_type] ?? { dot: 'bg-muted', label: log.action_type };
                    return (
                      <div key={log.id} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', style.dot)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">{style.label}</span>
                            {log.user_name && <span className="text-[10px] text-muted-foreground">by {log.user_name}</span>}
                          </div>
                          {log.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.description}</p>}
                          {log.old_value && log.new_value && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              <span className="line-through mr-1">{typeof log.old_value === 'object' ? JSON.stringify(log.old_value) : String(log.old_value)}</span>
                              → <span className="text-primary">{typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : String(log.new_value)}</span>
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(log.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No activity found</div>
            )}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Activity List
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">Action</th>
                      <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">Description</th>
                      <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">User</th>
                      <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => {
                      const style = ACTION_STYLES[log.action_type] ?? { dot: 'bg-muted', label: log.action_type };
                      return (
                        <tr key={log.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="py-2 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
                              {style.label}
                            </span>
                          </td>
                          <td className="py-2 max-w-[200px] truncate text-muted-foreground">{log.description ?? '—'}</td>
                          <td className="py-2 whitespace-nowrap text-muted-foreground">{log.user_name ?? '—'}</td>
                          <td className="py-2 whitespace-nowrap text-muted-foreground">{formatRelativeTime(log.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">No activity found</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

  // Pagination
        {Math.ceil(total / 50) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-border rounded disabled:opacity-50 hover:bg-muted/50 transition-colors text-muted-foreground">Prev</button>
            <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / 50)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="px-3 py-1.5 text-xs border border-border rounded disabled:opacity-50 hover:bg-muted/50 transition-colors text-muted-foreground">Next</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
