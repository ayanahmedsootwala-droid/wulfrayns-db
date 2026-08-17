import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, X, ChevronDown, ChevronUp, Car, DollarSign,
  TrendingUp, TrendingDown, Check, Copy, Trash2, Pencil, BarChart2, Download,
  RefreshCw, Filter, BookOpen, CreditCard, Wallet, Building2,
  ArrowUpRight, ArrowDownLeft, Calendar, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
type TxnType = 'income' | 'expense' | 'receivable' | 'payable';
type PayMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other';

type SplitEntry = {
  amount: number;
  payment_method: PayMethod;
  account_name?: string;
  paid_on: string;
  notes?: string;
};

interface Transaction {
  id: string;
  vehicle_id?: string;
  vehicle_label?: string;
  txn_type: TxnType;
  category: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: PayMethod;
  account_name?: string;
  reference_number?: string;
  txn_date: string;
  due_date?: string;
  notes?: string;
  is_settled: boolean;
  created_at: string;
  splits?: SplitEntry[];
}

interface PaymentSplit extends SplitEntry {
  id: string;
  transaction_id: string;
}

// EditState: the form's working copy — splits use SplitEntry (no id/transaction_id)
type EditState = Omit<Partial<Transaction>, 'splits'> & { splits: SplitEntry[] };

interface VehicleOption { id: string; label: string; }

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function fetchTransactions(search?: string, type?: string): Promise<Transaction[]> {
  let q = supabase
    .from('rpm_transactions')
    .select('*, splits:rpm_transaction_splits(*)')
    .order('txn_date', { ascending: false });
  if (search) q = q.ilike('vehicle_label', `%${search}%`);
  if (type && type !== 'all') q = q.eq('txn_type', type);
  const { data, error } = await q.limit(200);
  if (error) {
    // Table may not exist yet — return empty gracefully
    console.warn('rpm_transactions not found:', error.message);
    return [];
  }
  return (data ?? []) as Transaction[];
}

async function upsertTransaction(txn: EditState): Promise<string> {
  const { splits, remaining_amount: _r, is_settled: _s, ...rest } = txn as EditState & { remaining_amount?: number; is_settled?: boolean };

  const { data, error } = txn.id
    ? await supabase.from('rpm_transactions').update(rest).eq('id', txn.id).select('id').single()
    : await supabase.from('rpm_transactions').insert(rest).select('id').single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  if (splits && splits.length > 0) {
    await supabase.from('rpm_transaction_splits').delete().eq('transaction_id', id);
    await supabase.from('rpm_transaction_splits').insert(splits.map(s => ({ ...s, transaction_id: id })));
  }
  return id;
}

async function deleteTransaction(id: string) {
  await supabase.from('rpm_transaction_splits').delete().eq('transaction_id', id);
  await supabase.from('rpm_transactions').delete().eq('id', id);
}

async function fetchVehicleOptions(): Promise<VehicleOption[]> {
  const { data } = await supabase.from('vehicles').select('id,make,model,variant,stock_number').order('created_at', { ascending: false }).limit(200);
  return (data ?? []).map((v: { id: string; make: string; model: string; variant?: string; stock_number?: string }) => ({
    id: v.id,
    label: `${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}${v.stock_number ? ' · ' + v.stock_number : ''}`,
  }));
}

// ─── Blank form ───────────────────────────────────────────────────────────────
const blankTxn = (): EditState => ({
  vehicle_id: '', vehicle_label: '', txn_type: 'income', category: 'Vehicle Sale',
  amount: 0, paid_amount: 0,
  payment_method: 'cash', account_name: '', reference_number: '',
  txn_date: new Date().toISOString().split('T')[0], due_date: '',
  notes: '', splits: [],
});

const CATEGORIES: Record<TxnType, string[]> = {
  income:     ['Vehicle Sale', 'Commission', 'Service Charge', 'Deposit Received', 'Other Income'],
  expense:    ['Vehicle Purchase', 'Auction Fee', 'Freight', 'Customs Duty', 'Clearing', 'Repairs', 'Marketing', 'Staff Salary', 'Rent', 'Other Expense'],
  receivable: ['Balance Payment Due', 'Loan Receivable', 'Advance Received Partial', 'Other Receivable'],
  payable:    ['Dealer Payment Due', 'Auction Payment', 'Freight Due', 'Other Payable'],
};

const TYPE_LABELS: Record<TxnType, { label: string; color: string; icon: React.ElementType }> = {
  income:     { label: 'Income',      color: 'text-green-400 bg-green-400/10 border-green-400/20',  icon: ArrowUpRight },
  expense:    { label: 'Expense',     color: 'text-red-400 bg-red-400/10 border-red-400/20',        icon: ArrowDownLeft },
  receivable: { label: 'Receivable',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',     icon: TrendingUp },
  payable:    { label: 'Payable',     color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: TrendingDown },
};

const PAY_METHODS: PayMethod[] = ['cash', 'bank_transfer', 'cheque', 'online', 'other'];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionBookPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchTransactions(search || undefined, typeFilter);
    setTxns(data);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditing(blankTxn()); setFormOpen(true); };
  const openEdit = (t: Transaction) => {
    const splits: SplitEntry[] = (t.splits ?? []).map(s => ({
      amount: s.amount,
      payment_method: s.payment_method,
      account_name: s.account_name,
      paid_on: s.paid_on,
      notes: s.notes,
    }));
    const { splits: _rawSplits, ...rest } = t;
    setEditing({ ...rest, splits });
    setFormOpen(true);
  };

  const handleSaved = () => { setFormOpen(false); setEditing(null); load(); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteTransaction(deleteTarget.id); toast.success('Transaction deleted'); load(); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = {
    income:     txns.filter(t => t.txn_type === 'income').reduce((s, t) => s + t.amount, 0),
    expense:    txns.filter(t => t.txn_type === 'expense').reduce((s, t) => s + t.amount, 0),
    receivable: txns.filter(t => t.txn_type === 'receivable' && !t.is_settled).reduce((s, t) => s + t.remaining_amount, 0),
    payable:    txns.filter(t => t.txn_type === 'payable' && !t.is_settled).reduce((s, t) => s + t.remaining_amount, 0),
  };

  // ── Month pivot table ───────────────────────────────────────────────────────
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pivotData = React.useMemo(() => {
    const map: Record<string, { income: number; expense: number; receivable: number; payable: number }> = {};
    txns.forEach(t => {
      const d = new Date(t.txn_date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      if (!map[key]) map[key] = { income:0, expense:0, receivable:0, payable:0 };
      map[key][t.txn_type as keyof typeof map[string]] = (map[key][t.txn_type as keyof typeof map[string]] || 0) + t.amount;
    });
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0])).map(([key, v]) => {
      const [yr, mo] = key.split('-');
      return { label: `${MONTHS[parseInt(mo)]} ${yr}`, ...v, profit: v.income - v.expense };
    });
  }, [txns]);

  const exportCSV = () => {
    const headers = ['Date','Type','Category','Amount','Paid','Remaining','Method','Account','Reference','Vehicle','Notes','Settled'];
    const rows = txns.map(t => [
      t.txn_date, t.txn_type, t.category, t.amount, t.paid_amount, t.remaining_amount,
      t.payment_method, t.account_name, t.reference_number, t.vehicle_label, t.notes, t.is_settled,
    ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />Transaction Book
            </h1>
            <p className="text-sm text-muted-foreground">{txns.length} records</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 h-8 text-xs border-border">
              <Download className="w-3.5 h-3.5" />Export CSV
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Add Transaction
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { key: 'income',     label: 'Total Income',     icon: ArrowUpRight,   color: 'text-green-400',  val: stats.income },
            { key: 'expense',    label: 'Total Expense',    icon: ArrowDownLeft,  color: 'text-red-400',    val: stats.expense },
            { key: 'receivable', label: 'To Receive',       icon: TrendingUp,     color: 'text-blue-400',   val: stats.receivable },
            { key: 'payable',    label: 'To Pay',           icon: TrendingDown,   color: 'text-orange-400', val: stats.payable },
          ] as const).map(s => (
            <Card key={s.key} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={cn('w-4 h-4', s.color)} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className={cn('text-lg font-bold', s.color)}>{formatCurrency(s.val)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Net P&L */}
        <Card className={cn('border', stats.income - stats.expense >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className={cn('w-5 h-5', stats.income - stats.expense >= 0 ? 'text-green-400' : 'text-red-400')} />
            <div>
              <p className="text-xs text-muted-foreground">Net Profit / Loss</p>
              <p className={cn('text-xl font-bold', stats.income - stats.expense >= 0 ? 'text-green-400' : 'text-red-400')}>
                {formatCurrency(Math.abs(stats.income - stats.expense))}
                <span className="text-xs font-normal ml-1">{stats.income - stats.expense >= 0 ? 'PROFIT' : 'LOSS'}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Pivot Table */}
        {pivotData.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Monthly P&amp;L Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border">
                      {['Month','Income','Expense','Net P&L','To Receive','To Pay'].map(h => (
                        <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground pb-2 pr-4 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.map(row => (
                      <tr key={row.label} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="py-2 pr-4 font-medium text-foreground">{row.label}</td>
                        <td className="py-2 pr-4 text-green-400 font-semibold tabular-nums">{formatCurrency(row.income)}</td>
                        <td className="py-2 pr-4 text-red-400 font-semibold tabular-nums">{formatCurrency(row.expense)}</td>
                        <td className={cn('py-2 pr-4 font-bold tabular-nums', row.profit >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {row.profit >= 0 ? '+' : ''}{formatCurrency(row.profit)}
                        </td>
                        <td className="py-2 pr-4 text-blue-400 tabular-nums">{formatCurrency(row.receivable)}</td>
                        <td className="py-2 text-orange-400 tabular-nums">{formatCurrency(row.payable)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="py-2 pr-4 font-bold text-foreground text-[11px]">TOTAL</td>
                      <td className="py-2 pr-4 font-bold text-green-400 tabular-nums">{formatCurrency(stats.income)}</td>
                      <td className="py-2 pr-4 font-bold text-red-400 tabular-nums">{formatCurrency(stats.expense)}</td>
                      <td className={cn('py-2 pr-4 font-black tabular-nums', stats.income - stats.expense >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {stats.income - stats.expense >= 0 ? '+' : ''}{formatCurrency(stats.income - stats.expense)}
                      </td>
                      <td className="py-2 pr-4 font-bold text-blue-400 tabular-nums">{formatCurrency(stats.receivable)}</td>
                      <td className="py-2 font-bold text-orange-400 tabular-nums">{formatCurrency(stats.payable)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by vehicle…" className="pl-9 h-8 bg-muted/50 border-border text-sm" />
          </div>
          <div className="flex gap-1">
            {['all', 'income', 'expense', 'receivable', 'payable'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors border',
                  typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground')}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={load}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
        </div>

        {/* Transaction list */}
        <div className="space-y-2">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card border-border"><CardContent className="p-4"><Skeleton className="h-12 w-full bg-muted" /></CardContent></Card>
          )) : txns.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">No transactions yet</p>
              <p className="text-xs text-muted-foreground mb-4">Add income, expenses, receivables and payables</p>
              <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5 mr-1.5" />Add First Transaction</Button>
            </div>
          ) : txns.map(txn => (
            <TxnRow key={txn.id} txn={txn} expanded={expanded === txn.id}
              onToggle={() => setExpanded(expanded === txn.id ? null : txn.id)}
              onEdit={() => openEdit(txn)} onDelete={() => setDeleteTarget(txn)} />
          ))}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {formOpen && editing && (
        <TxnFormDialog open={formOpen} editing={editing} setEditing={setEditing}
          onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={handleSaved} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. All payment splits will also be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground h-8 text-xs">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxnRow({ txn, expanded, onToggle, onEdit, onDelete }: {
  txn: Transaction; expanded: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const meta = TYPE_LABELS[txn.txn_type];
  const pct = txn.amount > 0 ? Math.round((txn.paid_amount / txn.amount) * 100) : 0;

  return (
    <Card className={cn('bg-card border-border transition-colors', expanded && 'border-primary/30')}>
      <CardContent className="p-0">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={onToggle}>
          {/* Type badge */}
          <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium shrink-0', meta.color)}>
            <meta.icon className="w-3 h-3" />{meta.label}
          </span>
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">{txn.category}</p>
              {txn.vehicle_label && (
                <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Car className="w-3 h-3" />{txn.vehicle_label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{txn.txn_date}</span>
              {txn.account_name && <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {txn.account_name}</span>}
            </div>
          </div>
          {/* Amount + settlement */}
          <div className="text-right shrink-0">
            <p className={cn('text-sm font-semibold', txn.txn_type === 'income' ? 'text-green-400' : txn.txn_type === 'expense' ? 'text-red-400' : 'text-foreground')}>
              {formatCurrency(txn.amount)}
            </p>
            {txn.remaining_amount > 0 && !txn.is_settled && (
              <p className="text-xs text-orange-400">Due: {formatCurrency(txn.remaining_amount)}</p>
            )}
            {txn.is_settled && <p className="text-xs text-green-400 flex items-center gap-0.5 justify-end"><Check className="w-3 h-3" />Settled</p>}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                {/* Progress bar for partial payments */}
                {txn.amount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Paid: {formatCurrency(txn.paid_amount)} ({pct}%)</span>
                      <span>Total: {formatCurrency(txn.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {[
                    { label: 'Payment Method', value: txn.payment_method },
                    txn.account_name ? { label: 'Account', value: txn.account_name } : null,
                    txn.reference_number ? { label: 'Reference #', value: txn.reference_number } : null,
                    txn.due_date ? { label: 'Due Date', value: txn.due_date } : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i}>
                      <p className="text-muted-foreground">{item!.label}</p>
                      <p className="text-foreground font-medium capitalize">{item!.value}</p>
                    </div>
                  ))}
                </div>

                {/* Payment splits */}
                {txn.splits && txn.splits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Payment Splits ({txn.splits.length})</p>
                    <div className="space-y-1.5">
                      {txn.splits.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30 border border-border/50 text-xs">
                          <CreditCard className="w-3 h-3 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{formatCurrency(s.amount)}</span>
                          <span className="text-muted-foreground capitalize">{s.payment_method.replace('_', ' ')}</span>
                          {s.account_name && <span className="text-muted-foreground">· {s.account_name}</span>}
                          <span className="ml-auto text-muted-foreground">{s.paid_on}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {txn.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 italic">"{txn.notes}"</p>}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={onEdit}>
                    <Pencil className="w-3 h-3" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="w-3 h-3" />Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Transaction Form Dialog ──────────────────────────────────────────────────
function TxnFormDialog({ open, editing, setEditing, onClose, onSaved }: {
  open: boolean;
  editing: EditState;
  setEditing: React.Dispatch<React.SetStateAction<EditState | null>>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  useEffect(() => { fetchVehicleOptions().then(setVehicles); }, []);

  const set = <K extends keyof EditState>(k: K, v: EditState[K]) =>
    setEditing(prev => prev ? { ...prev, [k]: v } : prev);

  const addSplit = () => setEditing(prev => prev ? {
    ...prev,
    splits: [...prev.splits, { amount: 0, payment_method: 'cash' as PayMethod, account_name: '', paid_on: new Date().toISOString().split('T')[0], notes: '' }],
  } : prev);

  const removeSplit = (i: number) => setEditing(prev => prev ? {
    ...prev, splits: prev.splits.filter((_, idx) => idx !== i),
  } : prev);

  const updateSplit = (i: number, k: keyof SplitEntry, v: string | number) =>
    setEditing(prev => {
      if (!prev) return prev;
      const splits = [...prev.splits];
      splits[i] = { ...splits[i], [k]: v };
      return { ...prev, splits };
    });

  const splitTotal = editing.splits.reduce((s, sp) => s + Number(sp.amount || 0), 0);
  const paidAmount = editing.splits.length > 0 ? splitTotal : Number(editing.paid_amount || 0);

  const handleSave = async () => {
    if (!editing.category || !editing.amount || !editing.txn_date) {
      toast.error('Category, amount and date are required');
      return;
    }
    setSaving(true);
    try {
      await upsertTransaction({ ...editing, paid_amount: paidAmount });
      toast.success(editing.id ? 'Transaction updated' : 'Transaction added');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const categories = CATEGORIES[editing.txn_type as TxnType] ?? CATEGORIES.income;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing.id ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
          <DialogDescription>Record a payment, receivable or payable with optional multi-account splits.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="grid grid-cols-4 gap-1.5">
            {(['income', 'expense', 'receivable', 'payable'] as TxnType[]).map(t => {
              const m = TYPE_LABELS[t];
              return (
                <button key={t} onClick={() => { set('txn_type', t); set('category', CATEGORIES[t][0]); }}
                  className={cn('flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-medium transition-colors',
                    editing.txn_type === t ? m.color : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground')}>
                  <m.icon className="w-3.5 h-3.5" />{m.label}
                </button>
              );
            })}
          </div>

          {/* Vehicle link */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Linked Vehicle (optional)</Label>
            <Select value={editing.vehicle_id || 'none'} onValueChange={v => {
              if (v === 'none') { set('vehicle_id', ''); set('vehicle_label', ''); }
              else {
                const veh = vehicles.find(x => x.id === v);
                set('vehicle_id', v);
                set('vehicle_label', veh?.label ?? '');
              }
            }}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-border">
                <Car className="w-3 h-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Select vehicle…" />
              </SelectTrigger>
              <SelectContent className="max-h-52">
                <SelectItem value="none" className="text-xs">No vehicle</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Category + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category *</Label>
              <Select value={editing.category || ''} onValueChange={v => set('category', v)}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Total Amount (PKR) *</Label>
              <Input type="number" value={editing.amount || ''} onChange={e => set('amount', Number(e.target.value))}
                placeholder="0" className="h-8 text-xs bg-muted/50 border-border" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Transaction Date *</Label>
              <Input type="date" value={editing.txn_date || ''} onChange={e => set('txn_date', e.target.value)}
                className="h-8 text-xs bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Due Date</Label>
              <Input type="date" value={editing.due_date || ''} onChange={e => set('due_date', e.target.value)}
                className="h-8 text-xs bg-muted/50 border-border" />
            </div>
          </div>

          {/* Payment method (if no splits) */}
          {editing.splits.length === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Payment Method</Label>
                <Select value={editing.payment_method || 'cash'} onValueChange={v => set('payment_method', v as PayMethod)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map(m => <SelectItem key={m} value={m} className="text-xs capitalize">{m.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Paid Amount (PKR)</Label>
                <Input type="number" value={editing.paid_amount || ''} onChange={e => set('paid_amount', Number(e.target.value))}
                  placeholder="0" className="h-8 text-xs bg-muted/50 border-border" />
              </div>
            </div>
          )}

          {/* Account + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Account Name</Label>
              <Input value={editing.account_name || ''} onChange={e => set('account_name', e.target.value)}
                placeholder="e.g. MCB, HBL, Cash Register" className="h-8 text-xs bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Reference #</Label>
              <Input value={editing.reference_number || ''} onChange={e => set('reference_number', e.target.value)}
                placeholder="Cheque / TT number" className="h-8 text-xs bg-muted/50 border-border" />
            </div>
          </div>

          {/* Multi-account payment splits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-foreground">Payment Splits (Multiple Accounts)</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={addSplit}>
                <Plus className="w-3 h-3" />Add Split
              </Button>
            </div>
            {editing.splits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No splits — single payment above. Add splits to record payments from multiple accounts/people.</p>
            ) : (
              <div className="space-y-2">
                {editing.splits.map((sp, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end p-2 rounded bg-muted/30 border border-border/50">
                    <div className="col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Amount</Label>
                      <Input type="number" value={sp.amount || ''} onChange={e => updateSplit(i, 'amount', Number(e.target.value))}
                        placeholder="0" className="h-7 text-xs bg-muted/50 border-border" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Method</Label>
                      <Select value={sp.payment_method} onValueChange={v => updateSplit(i, 'payment_method', v)}>
                        <SelectTrigger className="h-7 text-xs bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m} className="text-xs capitalize">{m.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Account</Label>
                      <Input value={sp.account_name || ''} onChange={e => updateSplit(i, 'account_name', e.target.value)}
                        placeholder="MCB, HBL…" className="h-7 text-xs bg-muted/50 border-border" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Date</Label>
                      <Input type="date" value={sp.paid_on} onChange={e => updateSplit(i, 'paid_on', e.target.value)}
                        className="h-7 text-xs bg-muted/50 border-border" />
                    </div>
                    <div className="col-span-1 flex items-center justify-end pb-0.5">
                      <button onClick={() => removeSplit(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Split total */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">Split Total:</span>
                  <span className={cn('font-medium', splitTotal === Number(editing.amount) ? 'text-green-400' : splitTotal > Number(editing.amount) ? 'text-red-400' : 'text-orange-400')}>
                    {formatCurrency(splitTotal)} / {formatCurrency(Number(editing.amount))}
                    {splitTotal !== Number(editing.amount) && <AlertCircle className="w-3 h-3 inline ml-1" />}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
            <Textarea value={editing.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes…" className="h-20 text-xs bg-muted/50 border-border resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-border h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs gap-1.5">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : editing.id ? 'Update' : 'Save Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
