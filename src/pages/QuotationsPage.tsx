import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, Plus, Search, Printer, Send, Trash2, Edit2, RefreshCw,
  CheckCircle2, XCircle, Clock, ChevronDown, Bot, Sparkles, Copy,
  Download, TrendingUp, Calendar, AlertCircle, Eye, DollarSign,
  Filter, Tag, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  fetchQuotations, createQuotation, updateQuotation, deleteQuotation,
  type Quotation, type QuoteStatus,
} from '@/lib/rpm-api';
import { formatCurrency, cn } from '@/lib/utils';
import { streamLLM } from '@/lib/sse';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const STATUS_CONFIG: Record<QuoteStatus, { label: string; cls: string; icon: React.ElementType }> = {
  draft:    { label: 'Draft',    cls: 'text-muted-foreground bg-muted/50 border-border',           icon: Clock },
  sent:     { label: 'Sent',     cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',            icon: Send },
  accepted: { label: 'Accepted', cls: 'text-green-400 bg-green-400/10 border-green-400/20',         icon: CheckCircle2 },
  rejected: { label: 'Rejected', cls: 'text-red-400 bg-red-400/10 border-red-400/20',               icon: XCircle },
  expired:  { label: 'Expired',  cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20',      icon: Clock },
};

// Quick templates for common vehicle types
const QUOTE_TEMPLATES = [
  { label: 'Honda Civic (Standard)', vehicle_price: 8500000, registration_charges: 85000, gst_amount: 1275000, insurance_amount: 150000, delivery_days: 7 },
  { label: 'Toyota Corolla (Standard)', vehicle_price: 6200000, registration_charges: 62000, gst_amount: 930000, insurance_amount: 110000, delivery_days: 5 },
  { label: 'Suzuki Alto (Standard)', vehicle_price: 2800000, registration_charges: 28000, gst_amount: 420000, insurance_amount: 50000, delivery_days: 3 },
  { label: 'Honda BRV (Standard)', vehicle_price: 9800000, registration_charges: 98000, gst_amount: 1470000, insurance_amount: 180000, delivery_days: 10 },
  { label: 'Toyota Fortuner (Standard)', vehicle_price: 21000000, registration_charges: 210000, gst_amount: 3150000, insurance_amount: 380000, delivery_days: 14 },
];

const BLANK: Partial<Quotation> = {
  customer_name: '', customer_phone: '', customer_email: '',
  vehicle_price: 0, registration_charges: 30000, gst_amount: 0,
  fed_excise: 0, withholding_tax: 0, insurance_amount: 0,
  accessories_total: 0, discount: 0, delivery_days: 7,
  status: 'draft', terms: 'Price valid for 3 days. Subject to availability. Token amount non-refundable.',
};

function calcTotal(e: Partial<Quotation>) {
  return (e.vehicle_price ?? 0) + (e.registration_charges ?? 0) + (e.gst_amount ?? 0) +
    (e.fed_excise ?? 0) + (e.withholding_tax ?? 0) + (e.insurance_amount ?? 0) +
    (e.accessories_total ?? 0) - (e.discount ?? 0);
}

function daysUntilExpiry(validUntil?: string) {
  if (!validUntil) return null;
  const diff = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [editing, setEditing] = useState<Partial<Quotation> | null>(null);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  // Summary stats
  const accepted = quotes.filter(q => q.status === 'accepted');
  const totalAcceptedValue = accepted.reduce((s, q) => s + (q.total ?? 0), 0);
  const convRate = quotes.length > 0 ? (accepted.length / quotes.length * 100).toFixed(0) : '0';
  const expiringSoon = quotes.filter(q => {
    const d = daysUntilExpiry(q.valid_until);
    return d !== null && d >= 0 && d <= 3 && q.status === 'sent';
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchQuotations({ status: statusFilter, search });
      setQuotes(data); setTotal(count);
    } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...BLANK }); setAiText(''); setDialogOpen(true); };
  const openEdit = (q: Quotation) => { setEditing({ ...q }); setAiText(''); setDialogOpen(true); };
  const applyTemplate = (t: typeof QUOTE_TEMPLATES[0]) => {
    setEditing(p => ({ ...p, ...t }));
    setShowTemplates(false);
    toast.success(`Template "${t.label}" applied`);
  };

  const save = async () => {
    if (!editing?.customer_name?.trim()) { toast.error('Customer name required'); return; }
    setSaving(true);
    try {
      const payload = { ...editing, total: calcTotal(editing) };
      if ((editing as Quotation).id) {
        await updateQuotation((editing as Quotation).id, payload);
      } else {
        await createQuotation(payload);
      }
      toast.success('Quotation saved');
      setDialogOpen(false); load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteQuotation(deleting.id); toast.success('Deleted'); setDeleting(null); setSelected(null); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const copyQuoteSummary = (q: Quotation) => {
    const txt = `*Quotation from Wulfrayn's DB*\nRef: ${q.quote_number}\nCustomer: ${q.customer_name}\nTotal: ${formatCurrency(q.total ?? 0)}\nDelivery: ${q.delivery_days ?? '?'} days\n${q.terms ?? ''}`;
    navigator.clipboard.writeText(txt);
    toast.success('Copied to clipboard');
  };

  const generateAISummary = (q: Quotation) => {
    setAiLoading(true); setAiText('');
    abortRef.current = new AbortController();
    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL, supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: "You are Wulfrayn's DB AI Copilot. Write concise, professional Pakistani dealership communication.",
        contents: [{ role: 'user', parts: [{ text:
          `Write a professional WhatsApp message to send to ${q.customer_name} sharing this quotation. Total: ${formatCurrency(q.total ?? 0)}, Delivery: ${q.delivery_days} days. Keep it warm, professional, 3-4 sentences. Include a call to action.`
        }] }],
      },
      onChunk: c => setAiText(p => p + c),
      onComplete: () => setAiLoading(false),
      onError: () => { setAiLoading(false); toast.error('AI failed'); },
      signal: abortRef.current.signal,
    });
  };

  const printQuote = (q: Quotation) => {
    const win = window.open('', '_blank')!;
    win.document.write(`<!DOCTYPE html><html><head><title>Quote ${q.quote_number}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:700px;margin:auto}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px 12px;border:1px solid #ddd;text-align:left}.total{background:#f8f4e8;font-weight:bold}.gold{color:#c78a1a}.header{display:flex;justify-content:space-between;margin-bottom:32px}h1{margin:0;font-size:1.6em}@media print{body{padding:16px}}</style>
</head><body>
<div class="header"><div><h1 class="gold">Wulfrayn's DB</h1><p style="margin:4px 0;color:#666">Premium Automotive</p></div><div style="text-align:right"><h3 style="margin:0">QUOTATION</h3><p>${q.quote_number}</p><p>Date: ${new Date(q.created_at).toLocaleDateString('en-PK')}</p>${q.valid_until ? `<p>Valid Until: ${q.valid_until}</p>` : ''}</div></div>
<hr/><p><strong>Customer:</strong> ${q.customer_name}</p>${q.customer_phone ? `<p><strong>Phone:</strong> ${q.customer_phone}</p>` : ''}${q.customer_email ? `<p><strong>Email:</strong> ${q.customer_email}</p>` : ''}
<table><tr style="background:#f5f5f5"><th>Description</th><th style="text-align:right">Amount (PKR)</th></tr>
<tr><td>Vehicle Price</td><td style="text-align:right">${formatCurrency(q.vehicle_price)}</td></tr>
${q.registration_charges ? `<tr><td>Registration Charges</td><td style="text-align:right">${formatCurrency(q.registration_charges)}</td></tr>` : ''}
${q.gst_amount ? `<tr><td>Sales Tax / GST</td><td style="text-align:right">${formatCurrency(q.gst_amount)}</td></tr>` : ''}
${q.fed_excise ? `<tr><td>Federal Excise Duty</td><td style="text-align:right">${formatCurrency(q.fed_excise)}</td></tr>` : ''}
${q.withholding_tax ? `<tr><td>Withholding Tax</td><td style="text-align:right">${formatCurrency(q.withholding_tax)}</td></tr>` : ''}
${q.insurance_amount ? `<tr><td>Insurance</td><td style="text-align:right">${formatCurrency(q.insurance_amount)}</td></tr>` : ''}
${q.accessories_total ? `<tr><td>Accessories</td><td style="text-align:right">${formatCurrency(q.accessories_total)}</td></tr>` : ''}
${q.discount ? `<tr style="color:green"><td>Discount</td><td style="text-align:right">-${formatCurrency(q.discount)}</td></tr>` : ''}
<tr class="total"><td><strong>TOTAL AMOUNT</strong></td><td style="text-align:right"><strong>${formatCurrency(q.total ?? 0)}</strong></td></tr></table>
${q.delivery_days ? `<p><strong>Estimated Delivery:</strong> ${q.delivery_days} working days</p>` : ''}
${q.terms ? `<hr/><p style="font-size:0.9em;color:#666"><strong>Terms & Conditions:</strong> ${q.terms}</p>` : ''}
<br/><p style="text-align:center;font-size:0.85em;color:#999">Thank you for choosing Wulfrayn's DB • This quotation is computer generated</p>
</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Quotations
            </h1>
            <p className="text-xs text-muted-foreground">{total} total · {convRate}% acceptance rate</p>
          </div>
          <Button size="sm" className="gap-1.5 h-8" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> New Quote
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
          {[
            { label: 'Total', value: total, icon: FileText, color: '' },
            { label: 'Accepted', value: accepted.length, icon: CheckCircle2, color: 'text-green-400' },
            { label: 'Accepted Value', value: formatCurrency(totalAcceptedValue), icon: DollarSign, color: 'text-primary', small: true },
            { label: 'Expiring Soon', value: expiringSoon.length, icon: AlertCircle, color: expiringSoon.length > 0 ? 'text-orange-400' : '' },
          ].map(k => (
            <div key={k.label} className="flex flex-col items-center py-2.5 bg-background/50 gap-0.5">
              <k.icon className={cn('w-3.5 h-3.5', k.color || 'text-muted-foreground')} />
              <span className={cn('font-bold text-sm', k.color || 'text-foreground', k.small && 'text-xs')}>{k.value}</span>
              <span className="text-[10px] text-muted-foreground">{k.label}</span>
            </div>
          ))}
        </div>

        {/* Expiring banner */}
        {expiringSoon.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-400/5 border-b border-orange-400/20 text-xs text-orange-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {expiringSoon.length} quote{expiringSoon.length > 1 ? 's' : ''} expiring within 3 days: {expiringSoon.map(q => q.customer_name).join(', ')}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 px-4 py-2 border-b border-border">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or ref..." className="pl-8 h-8 text-xs bg-muted/40" />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as QuoteStatus | 'all')}>
            <SelectTrigger className="h-8 text-xs w-32 bg-muted/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={load}>
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Main area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* List */}
          <div className={cn('flex flex-col overflow-y-auto', selected ? 'hidden md:flex md:w-80 lg:w-96 shrink-0 border-r border-border' : 'flex-1')}>
            {loading ? (
              <div className="p-3 space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse"/>)}</div>
            ) : quotes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-16">
                <FileText className="w-10 h-10 opacity-20" />
                <p className="text-sm">No quotations found</p>
                <Button size="sm" variant="outline" onClick={openNew}>Create First Quote</Button>
              </div>
            ) : (
              <AnimatePresence>
                <div className="p-3 space-y-2">
                  {quotes.map((q, idx) => {
                    const cfg = STATUS_CONFIG[q.status];
                    const expiry = daysUntilExpiry(q.valid_until);
                    return (
                      <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                        <Card onClick={() => setSelected(q)}
                          className={cn('cursor-pointer border transition-all hover:border-primary/30 group',
                            selected?.id === q.id ? 'border-primary/50 bg-primary/5' : 'bg-card border-border')}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground truncate">{q.customer_name}</span>
                                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', cfg.cls)}>{cfg.label}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{q.quote_number}</p>
                                <p className="text-sm font-bold text-primary mt-1">{formatCurrency(q.total ?? 0)}</p>
                                {expiry !== null && expiry <= 3 && q.status === 'sent' && (
                                  <p className={cn('text-[10px] mt-0.5', expiry < 0 ? 'text-red-400' : 'text-orange-400')}>
                                    {expiry < 0 ? `Expired ${Math.abs(expiry)}d ago` : expiry === 0 ? 'Expires today' : `Expires in ${expiry}d`}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="w-6 h-6" title="Print" onClick={e => { e.stopPropagation(); printQuote(q); }}><Printer className="w-3 h-3"/></Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6" title="Copy" onClick={e => { e.stopPropagation(); copyQuoteSummary(q); }}><Copy className="w-3 h-3"/></Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6" title="Edit" onClick={e => { e.stopPropagation(); openEdit(q); }}><Edit2 className="w-3 h-3"/></Button>
                                <Button variant="ghost" size="icon" className="w-6 h-6 hover:text-destructive" title="Delete" onClick={e => { e.stopPropagation(); setDeleting(q); }}><Trash2 className="w-3 h-3"/></Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-foreground">{selected.customer_name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.quote_number} · {new Date(selected.created_at).toLocaleDateString('en-PK')}</p>
                  {selected.customer_phone && <p className="text-xs text-muted-foreground">{selected.customer_phone}</p>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generateAISummary(selected)}>
                    <Bot className="w-3 h-3 text-primary"/>AI Message
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyQuoteSummary(selected)}>
                    <Copy className="w-3 h-3"/>Copy
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => printQuote(selected)}>
                    <Printer className="w-3 h-3"/>Print PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelected(null)}>
                    <XCircle className="w-4 h-4"/>
                  </Button>
                </div>
              </div>

              {/* AI WhatsApp message */}
              {(aiText || aiLoading) && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-green-400 mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3"/>AI WhatsApp Message
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {aiText}{aiLoading && <span className="inline-block w-0.5 h-3 bg-green-400 ml-0.5 animate-pulse align-middle"/>}
                  </p>
                  {aiText && !aiLoading && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-2 gap-1 text-green-400" onClick={() => { navigator.clipboard.writeText(aiText); toast.success('Copied'); }}>
                      <Copy className="w-3 h-3"/>Copy Message
                    </Button>
                  )}
                </div>
              )}

              {/* Breakdown table */}
              <Card className="bg-card border-border">
                <CardContent className="p-4 space-y-1.5">
                  {[
                    { label: 'Vehicle Price', val: selected.vehicle_price },
                    { label: 'Registration', val: selected.registration_charges },
                    { label: 'GST / Sales Tax', val: selected.gst_amount },
                    { label: 'Federal Excise Duty', val: selected.fed_excise },
                    { label: 'Withholding Tax', val: selected.withholding_tax },
                    { label: 'Insurance', val: selected.insurance_amount },
                    { label: 'Accessories', val: selected.accessories_total },
                  ].filter(r => r.val && r.val > 0).map(row => (
                    <div key={row.label} className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground text-xs">{row.label}</span>
                      <span className="font-medium text-foreground text-xs">{formatCurrency(row.val)}</span>
                    </div>
                  ))}
                  {selected.discount > 0 && (
                    <div className="flex justify-between text-xs text-green-400 py-1">
                      <span>Discount</span><span>-{formatCurrency(selected.discount)}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span className="text-sm">TOTAL</span>
                    <span className="text-base text-primary">{formatCurrency(selected.total ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Status + meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                  <span className={cn('text-xs px-2 py-1 rounded border font-medium', STATUS_CONFIG[selected.status].cls)}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Delivery</p>
                  <p className="text-sm font-medium text-foreground">{selected.delivery_days ? `${selected.delivery_days} working days` : 'TBD'}</p>
                </div>
              </div>

              {selected.terms && (
                <div className="bg-muted/20 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="text-xs text-foreground">{selected.terms}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={() => openEdit(selected)}>
                  <Edit2 className="w-3 h-3"/>Edit Quote
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleting(selected)}>
                  <Trash2 className="w-3 h-3"/>Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as Quotation)?.id ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Template picker */}
              {!(editing as Quotation).id && (
                <div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 w-full" onClick={() => setShowTemplates(!showTemplates)}>
                    <Tag className="w-3 h-3"/>{showTemplates ? 'Hide Templates' : 'Use Quick Template'}
                    <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', showTemplates && 'rotate-180')} />
                  </Button>
                  {showTemplates && (
                    <div className="mt-2 space-y-1.5 p-3 bg-muted/30 rounded-lg border border-border">
                      {QUOTE_TEMPLATES.map(t => (
                        <button key={t.label} onClick={() => applyTemplate(t)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs transition-colors flex justify-between items-center gap-2">
                          <span className="font-medium text-foreground">{t.label}</span>
                          <span className="text-muted-foreground shrink-0">{formatCurrency(t.vehicle_price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  { label: 'Customer Name *', key: 'customer_name', type: 'text' },
                  { label: 'Phone', key: 'customer_phone', type: 'text' },
                  { label: 'Email', key: 'customer_email', type: 'email' },
                ] as const).map(({ label, key, type }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                    <Input type={type} value={(editing as Record<string, string | number | undefined>)[key] as string ?? ''}
                      onChange={e => setEditing(p => ({ ...p!, [key]: e.target.value }))}
                      className="h-8 text-xs bg-muted/40" />
                  </div>
                ))}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                  <Select value={editing.status ?? 'draft'} onValueChange={v => setEditing(p => ({ ...p!, status: v as QuoteStatus }))}>
                    <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {([
                  { label: 'Vehicle Price (PKR)', key: 'vehicle_price' },
                  { label: 'Registration Charges', key: 'registration_charges' },
                  { label: 'GST / Sales Tax', key: 'gst_amount' },
                  { label: 'Federal Excise Duty', key: 'fed_excise' },
                  { label: 'Withholding Tax', key: 'withholding_tax' },
                  { label: 'Insurance', key: 'insurance_amount' },
                  { label: 'Accessories Total', key: 'accessories_total' },
                  { label: 'Discount', key: 'discount' },
                  { label: 'Delivery Days', key: 'delivery_days' },
                ] as const).map(({ label, key }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                    <Input type="number" value={(editing as Record<string, number | undefined>)[key] ?? ''}
                      onChange={e => setEditing(p => ({ ...p!, [key]: e.target.value ? Number(e.target.value) : 0 }))}
                      className="h-8 text-xs bg-muted/40" />
                  </div>
                ))}
              </div>

              {/* Live total */}
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Total Amount</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(calcTotal(editing))}</span>
              </div>

              {/* Terms */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Terms & Conditions</Label>
                <Textarea value={editing.terms ?? ''} onChange={e => setEditing(p => ({ ...p!, terms: e.target.value }))}
                  rows={2} className="text-xs bg-muted/40 resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !editing?.customer_name?.trim()}>
              {saving ? 'Saving...' : 'Save Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the quotation for {deleting?.customer_name}.</AlertDialogDescription>
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
