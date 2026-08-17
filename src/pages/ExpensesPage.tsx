import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, Plus, Trash2, RefreshCw, TrendingDown, BarChart3,
  Calendar, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import AppLayout from '@/components/layouts/AppLayout';
import { fetchExpenses, createExpense, deleteExpense, type Expense, type ExpenseCategory } from '@/lib/rpm-api';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const CATEGORIES: { val: ExpenseCategory; label: string; color: string }[] = [
  { val: 'rent',             label: 'Rent',             color: 'text-red-400' },
  { val: 'salaries',         label: 'Salaries',         color: 'text-orange-400' },
  { val: 'utilities',        label: 'Utilities',        color: 'text-yellow-400' },
  { val: 'marketing',        label: 'Marketing',        color: 'text-pink-400' },
  { val: 'maintenance',      label: 'Maintenance',      color: 'text-blue-400' },
  { val: 'vehicle_purchase', label: 'Vehicle Purchase', color: 'text-primary' },
  { val: 'fuel',             label: 'Fuel',             color: 'text-cyan-400' },
  { val: 'office',           label: 'Office',           color: 'text-purple-400' },
  { val: 'other',            label: 'Other',            color: 'text-muted-foreground' },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<ExpenseCategory | 'all'>('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: 'other' as ExpenseCategory, amount_pkr: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchExpenses({ category: catFilter, month });
      setExpenses(data); setTotal(count);
    } finally { setLoading(false); }
  }, [catFilter, month]);

  useEffect(() => { load(); }, [load]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount_pkr, 0);

  const byCategory = CATEGORIES.map(c => ({
    ...c,
    total: expenses.filter(e => e.category === c.val).reduce((s, e) => s + e.amount_pkr, 0),
    count: expenses.filter(e => e.category === c.val).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  const save = async () => {
    if (!form.amount_pkr || !form.date) return;
    setSaving(true);
    try {
      await createExpense({ date: form.date, category: form.category, amount_pkr: Number(form.amount_pkr), description: form.description || undefined });
      toast.success('Expense added'); setDialogOpen(false); load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteExpense(deleting.id); toast.success('Deleted'); setDeleting(null); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Expenses
            </h1>
            <p className="text-xs text-muted-foreground">{total} entries · {month}</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </Button>
        </div>

        {/* Month + filter */}
        <div className="flex gap-2 flex-wrap">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-8 text-xs w-40 bg-muted/40" />
          <Select value={catFilter} onValueChange={v => setCatFilter(v as ExpenseCategory | 'all')}>
            <SelectTrigger className="h-8 text-xs w-40 bg-muted/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.val} value={c.val}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Summary */}
          <div className="space-y-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Expenses ({month})</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
              </CardContent>
            </Card>
            {byCategory.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">By Category</CardTitle></CardHeader>
                <CardContent className="space-y-2 pb-3">
                  {byCategory.map(c => (
                    <div key={c.val}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={cn('font-medium', c.color)}>{c.label}</span>
                        <span className="text-foreground font-mono">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40 rounded-full" style={{ width: `${totalAmount > 0 ? (c.total / totalAmount) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Expense list */}
          <div className="lg:col-span-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <TrendingDown className="w-8 h-8 opacity-20" />
                <p className="text-sm">No expenses for {month}</p>
                <Button size="sm" onClick={() => setDialogOpen(true)}>Add First Expense</Button>
              </div>
            ) : expenses.map(e => {
              const cat = CATEGORIES.find(c => c.val === e.category);
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-border group hover:border-primary/30 transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 border border-border')}>
                          <Tag className={cn('w-3.5 h-3.5', cat?.color ?? 'text-muted-foreground')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-xs font-semibold', cat?.color)}>{cat?.label}</span>
                            <span className="text-xs text-muted-foreground">{e.date}</span>
                          </div>
                          {e.description && <p className="text-xs text-foreground mt-0.5 truncate">{e.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(e.amount_pkr)}</span>
                          <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => setDeleting(e)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs bg-muted/40" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as ExpenseCategory }))}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.val} value={c.val}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Amount (PKR) *</Label>
              <Input type="number" value={form.amount_pkr} onChange={e => setForm(p => ({ ...p, amount_pkr: e.target.value }))} placeholder="50000" className="h-8 text-xs bg-muted/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Monthly showroom rent" className="h-8 text-xs bg-muted/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.amount_pkr}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>Remove {deleting?.description || formatCurrency(deleting?.amount_pkr ?? 0)} permanently?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
