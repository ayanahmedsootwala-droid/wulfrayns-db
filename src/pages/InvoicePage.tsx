/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, Printer, Trash2, Edit2,
  FileText, CheckCircle2, Clock, AlertCircle, XCircle,
  TrendingUp, X, Save,
  ChevronDown, RefreshCw, Building2, Phone, Mail,
  Car, Calendar, Percent, Hash, User, MapPin,
  CreditCard, Receipt, ShieldCheck,
  ArrowLeft, PlusCircle, Minus, MessageCircle,
  DollarSign, Loader2, Eye, ImageIcon,
  BarChart3, Zap, Copy, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getSettings } from '@/hooks/useSettings';
import BrandLogoUpload, { useBrandLogo } from '@/components/invoice/BrandLogoUpload';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id?: string;
  description: string;
  qty: number;
  unit_price: number;
  total?: number;
}

interface Invoice {
  id: string;
  invoice_no: string;
  type: 'sale' | 'purchase' | 'service';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_id?: string;
  vehicle_desc?: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  subtotal: number;
  discount_pct?: number;
  discount_amt?: number;
  tax_pct?: number;
  tax_amt?: number;
  total: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms?: string;
  items?: InvoiceItem[];
}

type FormState = Omit<Invoice, 'id' | 'subtotal' | 'total' | 'discount_amt' | 'tax_amt' | 'balance_due'> & {
  items: InvoiceItem[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Invoice['status'], { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'text-muted-foreground bg-muted border-border',            icon: <FileText className="w-3 h-3" /> },
  sent:      { label: 'Sent',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',          icon: <Clock className="w-3 h-3" /> },
  paid:      { label: 'Paid',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue:   { label: 'Overdue',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',    icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-500/10 border-red-500/30',             icon: <XCircle className="w-3 h-3" /> },
};

const TYPE_CONFIG: Record<Invoice['type'], { label: string; color: string }> = {
  sale:     { label: 'Sale',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  purchase: { label: 'Purchase', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  service:  { label: 'Service',  color: 'text-primary bg-primary/10 border-primary/30' },
};

const BLANK_FORM: FormState = {
  invoice_no: '',
  type: 'sale',
  status: 'draft',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  vehicle_desc: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  paid_date: '',
  discount_pct: 0,
  tax_pct: 0,
  paid_amount: 0,
  notes: '',
  terms: 'Payment is due within 30 days of invoice date.',
  items: [{ description: '', qty: 1, unit_price: 0 }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotals(form: FormState) {
  const subtotal = form.items.reduce((s, i) => s + (i.qty * i.unit_price), 0);
  const disc = form.discount_pct ? subtotal * (form.discount_pct / 100) : 0;
  const taxBase = subtotal - disc;
  const tax = form.tax_pct ? taxBase * (form.tax_pct / 100) : 0;
  const total = taxBase + tax;
  const balance = total - (form.paid_amount ?? 0);
  return { subtotal, disc, tax, total, balance };
}

function genInvoiceNo(type: string) {
  const prefix = type === 'sale' ? 'SI' : type === 'purchase' ? 'PI' : 'SV';
  const ts = Date.now().toString().slice(-6);
  return `${prefix}-${ts}`;
}

// ─── Print Template ────────────────────────────────────────────────────────────
function buildPrintHtml(inv: Invoice, items: InvoiceItem[], logoUrl?: string | null): string {
  const { subtotal, disc, tax, total, balance } = calcTotals({ ...inv, items } as FormState);
  const st = STATUS_CONFIG[inv.status];
  const tp = TYPE_CONFIG[inv.type];
  const biz = getSettings();

  const rows = items.map(it => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;font-size:13px;color:#1a1a1a;">${it.description}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:center;font-size:13px;color:#444;">${it.qty}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:13px;color:#444;">${formatCurrency(it.unit_price)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:13px;font-weight:600;color:#1a1a1a;">${formatCurrency(it.qty * it.unit_price)}</td>
    </tr>`).join('');

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Brand Logo" style="max-height:56px;max-width:180px;object-fit:contain;display:block;" />`
    : `<div class="dealer-name">${biz.bizName.toUpperCase()}</div>`;

  // Watermark: logo at ~8% opacity centred on page; fallback to text mark
  const watermarkHtml = logoUrl
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);pointer-events:none;z-index:0;opacity:0.07;width:380px;text-align:center;">
        <img src="${logoUrl}" alt="" style="width:100%;filter:grayscale(100%);" />
       </div>`
    : `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);pointer-events:none;z-index:0;opacity:0.05;font-size:96px;font-weight:900;letter-spacing:-2px;color:#8a0000;font-family:'Segoe UI',sans-serif;white-space:nowrap;">${biz.bizName.toUpperCase()}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${inv.invoice_no}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @media print{body{background:#ffffff!important;} .no-print{display:none;}}
    .page{max-width:900px;margin:0 auto;padding:40px;background:#ffffff;position:relative;z-index:1;}
    .header{background:#ffffff;padding:28px 36px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #8a0000;}
    .dealer-name{font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;}
    .dealer-sub{font-size:11px;color:#666;margin-top:4px;}
    .invoice-badge{text-align:right;}
    .inv-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;}
    .inv-no{font-size:24px;font-weight:800;color:#8a0000;margin-top:2px;}
    .inv-type{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#8a0000;color:#fff;margin-top:6px;}
    .meta{background:#fafafa;padding:18px 36px;display:flex;gap:32px;border-left:4px solid #8a0000;border-bottom:1px solid #ebebeb;}
    .meta-block{flex:1;}
    .meta-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
    .meta-val{font-size:13px;color:#1a1a1a;font-weight:600;}
    .section{background:#fff;padding:20px 36px;border-bottom:1px solid #f0f0f0;}
    .section-title{font-size:10px;color:#8a0000;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
    .section-title::before{content:'';display:inline-block;width:3px;height:14px;background:#8a0000;border-radius:2px;}
    .party-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    .party-card{background:#fafafa;border:1px solid #ebebeb;border-radius:8px;padding:14px;}
    .party-name{font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:6px;}
    .party-detail{font-size:12px;color:#666;line-height:1.9;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:linear-gradient(90deg,#8a0000,#6a0000);}
    thead th{padding:10px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;font-weight:700;}
    thead th:not(:first-child){text-align:right;}
    tbody tr:nth-child(even){background:#fafafa;}
    tbody tr:hover{background:#fff5f5;}
    .totals{background:#fafafa;padding:22px 36px;border-top:2px solid #ebebeb;}
    .totals-inner{max-width:320px;margin-left:auto;}
    .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#555;}
    .totals-row.grand{border-top:2px solid #8a0000;padding-top:10px;margin-top:8px;font-size:18px;font-weight:800;color:#1a1a1a;}
    .totals-row.balance{font-size:15px;font-weight:700;color:#cc0000;}
    .totals-row.paid-row{color:#16a34a;font-weight:600;}
    .status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;}
    .paid-badge{background:#dcfce7;color:#166534;border:1px solid #bbf7d0;}
    .draft-badge{background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db;}
    .overdue-badge{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;}
    .footer{background:#f9f9f9;padding:18px 36px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #ebebeb;border-radius:0 0 12px 12px;}
    .footer-note{font-size:10px;color:#aaa;}
    .sig-line{width:160px;border-top:1.5px solid #ccc;padding-top:6px;text-align:center;font-size:10px;color:#888;margin-top:40px;}
    .watermark-wrap{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;}
  </style></head><body>
  ${watermarkHtml}
  <div class="page">
    <div class="header">
      <div>
        ${logoHtml}
        <div class="dealer-sub" style="margin-top:${logoUrl ? '8px' : '4px'};">${biz.tagline} · Authorized Dealer · Pakistan</div>
        <div class="dealer-sub" style="margin-top:2px;">${biz.ntn ? `NTN: ${biz.ntn}` : ''}${biz.ntn && biz.strn ? ' · ' : ''}${biz.strn ? `STRN: ${biz.strn}` : ''}</div>
      </div>
      <div class="invoice-badge">
        <div class="inv-label">Invoice</div>
        <div class="inv-no">${inv.invoice_no}</div>
        <div class="inv-type">${tp.label}</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-block"><div class="meta-label">Issue Date</div><div class="meta-val">${inv.issue_date}</div></div>
      ${inv.due_date ? `<div class="meta-block"><div class="meta-label">Due Date</div><div class="meta-val">${inv.due_date}</div></div>` : ''}
      <div class="meta-block">
        <div class="meta-label">Status</div>
        <span class="status-badge ${inv.status === 'paid' ? 'paid-badge' : inv.status === 'overdue' ? 'overdue-badge' : 'draft-badge'}">
          ${st.label}
        </span>
      </div>
      ${inv.vehicle_desc ? `<div class="meta-block"><div class="meta-label">Vehicle</div><div class="meta-val">${inv.vehicle_desc}</div></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Party Details</div>
      <div class="party-grid">
        <div class="party-card">
          <div style="font-size:10px;color:#8a0000;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
          <div class="party-name">${inv.customer_name}</div>
          <div class="party-detail">
            ${inv.customer_phone ? `📞 ${inv.customer_phone}<br/>` : ''}
            ${inv.customer_email ? `✉ ${inv.customer_email}<br/>` : ''}
            ${inv.customer_address ? `📍 ${inv.customer_address}` : ''}
          </div>
        </div>
        <div class="party-card">
          <div style="font-size:10px;color:#8a0000;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill From</div>
          <div class="party-name">${biz.bizName}</div>
          <div class="party-detail">
            ${biz.bizPhone ? `📞 ${biz.bizPhone}<br/>` : ''}
            ${biz.bizEmail ? `✉ ${biz.bizEmail}<br/>` : ''}
            ${biz.bizAddress ? `📍 ${biz.bizAddress}` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="section" style="padding-top:0;">
      <div class="section-title" style="padding-top:20px;">Items</div>
      <table>
        <thead><tr>
          <th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${disc > 0 ? `<div class="totals-row"><span>Discount (${inv.discount_pct}%)</span><span style="color:#16a34a;">- ${formatCurrency(disc)}</span></div>` : ''}
        ${tax > 0 ? `<div class="totals-row"><span>Tax / GST (${inv.tax_pct}%)</span><span>${formatCurrency(tax)}</span></div>` : ''}
        <div class="totals-row grand"><span>TOTAL</span><span style="color:#8a0000;">${formatCurrency(total)}</span></div>
        ${(inv.paid_amount ?? 0) > 0 ? `<div class="totals-row paid-row"><span>✓ Paid</span><span>${formatCurrency(inv.paid_amount ?? 0)}</span></div>` : ''}
        ${balance > 0 ? `<div class="totals-row balance"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>` : `<div class="totals-row" style="color:#16a34a;font-weight:600;"><span>✅ Fully Paid</span><span></span></div>`}
      </div>
    </div>

    ${inv.notes ? `<div class="section"><div class="section-title">Notes</div><p style="font-size:12px;color:#555;line-height:1.8;">${inv.notes}</p></div>` : ''}
    ${inv.terms ? `<div class="section"><div class="section-title">Terms &amp; Conditions</div><p style="font-size:12px;color:#555;line-height:1.8;">${inv.terms}</p></div>` : ''}

    <div class="footer">
      <div class="footer-note">${biz.bizName} · Generated ${new Date().toLocaleString()}<br/>This is a computer-generated document.</div>
      <div style="display:flex;gap:48px;">
        <div class="sig-line">Authorised Signatory</div>
        <div class="sig-line">Customer Signature</div>
      </div>
    </div>
  </div>
</body></html>`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
// ─── Invoice Templates ────────────────────────────────────────────────────────
const INVOICE_TEMPLATES = [
  {
    id: 'car-sale',
    label: 'Car Sale',
    icon: '🚗',
    type: 'sale' as const,
    notes: 'Vehicle sold in as-is condition. All mechanical inspections completed prior to sale.',
    terms: 'Full payment required before delivery. No refunds after transfer of ownership.',
    items: [
      { description: 'Vehicle Purchase Price', qty: 1, unit_price: 0 },
      { description: 'Transfer of Ownership Fee', qty: 1, unit_price: 5000 },
      { description: 'Number Plate Fee', qty: 1, unit_price: 2500 },
    ],
  },
  {
    id: 'car-purchase',
    label: 'Car Purchase',
    icon: '🔑',
    type: 'purchase' as const,
    notes: 'Vehicle purchased from seller. Condition verified at time of purchase.',
    terms: 'Payment made in full. Ownership transfer to be completed within 7 working days.',
    items: [
      { description: 'Vehicle Purchase Price', qty: 1, unit_price: 0 },
      { description: 'Token / Advance Payment', qty: 1, unit_price: 0 },
    ],
  },
  {
    id: 'service',
    label: 'Service / Repair',
    icon: '🔧',
    type: 'service' as const,
    notes: 'All service work carried out by certified technicians. Parts under 30-day warranty.',
    terms: 'Payment due upon collection of vehicle. We accept cash and bank transfer.',
    items: [
      { description: 'Labour Charges', qty: 1, unit_price: 0 },
      { description: 'Spare Parts & Materials', qty: 1, unit_price: 0 },
      { description: 'Diagnostic Fee', qty: 1, unit_price: 1500 },
    ],
  },
  {
    id: 'inspection',
    label: 'Inspection',
    icon: '🔍',
    type: 'service' as const,
    notes: 'Full vehicle inspection report provided. Results valid for 30 days.',
    terms: 'Inspection fee non-refundable. Report issued digitally and in print.',
    items: [
      { description: 'Full Vehicle Inspection', qty: 1, unit_price: 5000 },
      { description: 'Engine Diagnostic Scan', qty: 1, unit_price: 2000 },
      { description: 'Inspection Report (Printed)', qty: 1, unit_price: 500 },
    ],
  },
  {
    id: 'import',
    label: 'Import Invoice',
    icon: '🚢',
    type: 'purchase' as const,
    notes: 'Imported vehicle. All customs duties and clearance charges included.',
    terms: 'Customs clearance subject to port timelines. Delivery within 7 days of clearance.',
    items: [
      { description: 'Vehicle CIF Value', qty: 1, unit_price: 0 },
      { description: 'Customs Duty & Taxes', qty: 1, unit_price: 0 },
      { description: 'Port Handling / Clearance', qty: 1, unit_price: 0 },
      { description: 'Inland Freight', qty: 1, unit_price: 0 },
    ],
  },
  {
    id: 'deposit',
    label: 'Deposit Receipt',
    icon: '💰',
    type: 'sale' as const,
    notes: 'Token/advance received against vehicle reservation. Balance due before delivery.',
    terms: 'Token is non-refundable if buyer cancels. Full balance must be paid within agreed timeframe.',
    items: [
      { description: 'Advance / Token Payment', qty: 1, unit_price: 0 },
    ],
  },
];

// ─── Analytics helper ─────────────────────────────────────────────────────────
function getAnalytics(invoices: Invoice[]) {
  // Revenue by month (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });
  const monthly = months.map(m => ({
    label: m.label,
    revenue: invoices
      .filter(inv => {
        const d = new Date(inv.issue_date);
        return d.getFullYear() === m.year && d.getMonth() === m.month && inv.status === 'paid';
      })
      .reduce((s, inv) => s + inv.total, 0),
    count: invoices.filter(inv => {
      const d = new Date(inv.issue_date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length,
  }));

  // By type
  const byType = ['sale', 'purchase', 'service'].map(t => ({
    label: TYPE_CONFIG[t as Invoice['type']].label,
    count: invoices.filter(i => i.type === t).length,
    total: invoices.filter(i => i.type === t).reduce((s, i) => s + i.total, 0),
  }));

  // Top customers
  const custMap: Record<string, { name: string; total: number; count: number }> = {};
  invoices.forEach(inv => {
    if (!custMap[inv.customer_name]) custMap[inv.customer_name] = { name: inv.customer_name, total: 0, count: 0 };
    custMap[inv.customer_name].total += inv.total;
    custMap[inv.customer_name].count += 1;
  });
  const topCustomers = Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 5);

  // Status breakdown
  const statusBreakdown = Object.keys(STATUS_CONFIG).map(s => ({
    label: STATUS_CONFIG[s as Invoice['status']].label,
    count: invoices.filter(i => i.status === s).length,
    color: STATUS_CONFIG[s as Invoice['status']].color,
  }));

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due ?? i.total), 0);
  const avgInvoiceValue = invoices.length ? invoices.reduce((s, i) => s + i.total, 0) / invoices.length : 0;

  return { monthly, byType, topCustomers, statusBreakdown, totalRevenue, totalOutstanding, avgInvoiceValue };
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Invoice['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Invoice['status']>('all');
  const [filterType, setFilterType] = useState<'all' | Invoice['type']>('all');
  const [view, setView] = useState<'list' | 'form' | 'analytics'>('list');
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [logoPanelOpen, setLogoPanelOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // ── Brand logo ───────────────────────────────────────────────────────────────
  const { logoUrl, setLogoUrl } = useBrandLogo();

  // ── Computed totals ──────────────────────────────────────────────────────────
  const { subtotal, disc, tax, total, balance } = calcTotals(form);

  // ── Load invoices ─────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rpm_invoices')
        .select('*, items:rpm_invoice_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices((data ?? []) as Invoice[]);
    } catch (e: any) { toast.error(e?.message ?? 'Load failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterType !== 'all' && inv.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return `${inv.invoice_no} ${inv.customer_name} ${inv.vehicle_desc ?? ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    pending: invoices.filter(i => ['sent', 'draft'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  };

  // ── Analytics (memoised) ─────────────────────────────────────────────────────
  const analytics = useMemo(() => getAnalytics(invoices), [invoices]);

  // ── Apply template ────────────────────────────────────────────────────────────
  const applyTemplate = (tpl: typeof INVOICE_TEMPLATES[number]) => {
    setFv('type', tpl.type);
    setFv('notes', tpl.notes);
    setFv('terms', tpl.terms);
    setFv('items', tpl.items.map(i => ({ ...i })));
    setFv('invoice_no', genInvoiceNo(tpl.type));
    setShowTemplates(false);
    toast.success(`Template "${tpl.label}" applied`);
  };

  // ── Form helpers ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM, invoice_no: genInvoiceNo('sale'), issue_date: new Date().toISOString().split('T')[0] });
    setView('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      invoice_no: inv.invoice_no,
      type: inv.type,
      status: inv.status,
      customer_name: inv.customer_name,
      customer_phone: inv.customer_phone ?? '',
      customer_email: inv.customer_email ?? '',
      customer_address: inv.customer_address ?? '',
      vehicle_desc: inv.vehicle_desc ?? '',
      issue_date: inv.issue_date ?? '',
      due_date: inv.due_date ?? '',
      paid_date: inv.paid_date ?? '',
      discount_pct: inv.discount_pct ?? 0,
      tax_pct: inv.tax_pct ?? 0,
      paid_amount: inv.paid_amount ?? 0,
      notes: inv.notes ?? '',
      terms: inv.terms ?? BLANK_FORM.terms,
      items: inv.items?.length ? inv.items : [{ description: '', qty: 1, unit_price: 0 }],
    });
    setView('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const setF = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const setFv = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const setItem = (idx: number, key: keyof InvoiceItem, val: string | number) =>
    setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) }));
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { description: '', qty: 1, unit_price: 0 }] }));
  const removeItem = (idx: number) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.customer_name.trim()) { toast.error('Customer name required'); return; }
    if (!form.invoice_no.trim()) { toast.error('Invoice number required'); return; }
    if (!form.items.some(i => i.description.trim())) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    try {
      const payload = {
        invoice_no: form.invoice_no,
        type: form.type,
        status: form.status,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        customer_address: form.customer_address || null,
        vehicle_desc: form.vehicle_desc || null,
        issue_date: form.issue_date || null,
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        subtotal,
        discount_pct: form.discount_pct ?? 0,
        discount_amt: disc,
        tax_pct: form.tax_pct ?? 0,
        tax_amt: tax,
        total,
        paid_amount: form.paid_amount ?? 0,
        balance_due: balance,
        notes: form.notes || null,
        terms: form.terms || null,
      };

      let invId: string;
      if (editing) {
        const { error } = await supabase.from('rpm_invoices').update(payload).eq('id', editing.id);
        if (error) throw error;
        invId = editing.id;
        await supabase.from('rpm_invoice_items').delete().eq('invoice_id', invId);
      } else {
        const { data, error } = await supabase.from('rpm_invoices').insert(payload).select('id').single();
        if (error) throw error;
        invId = (data as { id: string }).id;
      }

      const validItems = form.items.filter(i => i.description.trim());
      if (validItems.length) {
        const itemsPayload = validItems.map((i, idx) => ({
          invoice_id: invId,
          description: i.description,
          qty: i.qty,
          unit_price: i.unit_price,
          // NOTE: 'total' is a GENERATED ALWAYS AS column — must NOT be inserted
          sort_order: idx,
        }));
        const { error } = await supabase.from('rpm_invoice_items').insert(itemsPayload);
        if (error) throw error;
      }

      toast.success(editing ? 'Invoice updated' : 'Invoice created');
      setView('list');
      loadInvoices();
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('rpm_invoice_items').delete().eq('invoice_id', deleteTarget.id);
      const { error } = await supabase.from('rpm_invoices').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setInvoices(p => p.filter(i => i.id !== deleteTarget.id));
      toast.success('Invoice deleted');
    } catch (e: any) { toast.error(e?.message ?? 'Delete failed'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  // ── Quick status update ────────────────────────────────────────────────────
  const updateStatus = async (inv: Invoice, status: Invoice['status']) => {
    setUpdatingStatus(inv.id);
    try {
      const { error } = await supabase.from('rpm_invoices').update({ status }).eq('id', inv.id);
      if (error) throw error;
      setInvoices(p => p.map(i => i.id === inv.id ? { ...i, status } : i));
      toast.success(`Marked as ${STATUS_CONFIG[status].label}`);
    } catch (e: any) { toast.error(e?.message ?? 'Update failed'); }
    finally { setUpdatingStatus(null); }
  };

  // ── Print ─────────────────────────────────────────────────────────────────────
  const handlePrint = (inv?: Invoice) => {
    const target = inv ?? (editing ? { ...editing, ...form as any } : null);
    if (!target) { toast.error('No invoice to print'); return; }
    const items = inv ? (inv.items ?? []) : form.items;
    const html = buildPrintHtml(target as Invoice, items, logoUrl);
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked — allow popups for printing'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  // ── WhatsApp share ─────────────────────────────────────────────────────────
  const handleWhatsApp = (inv: Invoice) => {
    const phone = inv.customer_phone?.replace(/[^0-9]/g, '');
    const tp = TYPE_CONFIG[inv.type].label;
    const st = STATUS_CONFIG[inv.status].label;
    const now = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const biz = getSettings();
    const items = inv.items?.filter(i => i.description?.trim()) ?? [];
    const itemLines = items.length
      ? items.map(i => `  • ${i.description} × ${i.qty} — PKR ${(i.qty * i.unit_price).toLocaleString()}`).join('\n')
      : '';
    const balanceLine = (inv.balance_due ?? 0) > 0
      ? `\n💳 *Balance Due:* PKR ${(inv.balance_due ?? 0).toLocaleString()}`
      : '\n✅ *Fully Paid*';

    const msg = encodeURIComponent(
      `🚗 *${biz.bizName}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *${tp} Invoice — ${inv.invoice_no}*\n` +
      `📅 Date: ${inv.issue_date}${inv.due_date ? `  |  Due: ${inv.due_date}` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Customer:* ${inv.customer_name}\n` +
      (inv.customer_address ? `📍 ${inv.customer_address}\n` : '') +
      (inv.vehicle_desc ? `🚙 *Vehicle:* ${inv.vehicle_desc}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      (itemLines ? `*Items:*\n${itemLines}\n━━━━━━━━━━━━━━━━━━━━\n` : '') +
      (inv.discount_pct ? `🏷️ *Discount (${inv.discount_pct}%):* -PKR ${(inv.discount_amt ?? 0).toLocaleString()}\n` : '') +
      (inv.tax_pct ? `📊 *Tax/GST (${inv.tax_pct}%):* PKR ${(inv.tax_amt ?? 0).toLocaleString()}\n` : '') +
      `💰 *Total Amount:* PKR ${(inv.total ?? 0).toLocaleString()}` +
      balanceLine + `\n` +
      `📌 *Status:* ${st}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Thank you for choosing ${biz.bizName}! 🙏_\n` +
      `_Generated: ${now}_`
    );
    const url = phone
      ? `https://wa.me/92${phone.replace(/^0/, '')}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0 bg-background">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {(view === 'form' || view === 'analytics') && (
                <button onClick={() => setView('list')}
                  className="w-8 h-8 rounded-xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h1 className="text-lg font-black text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-primary-foreground" />
                  </div>
                  {view === 'form' ? (editing ? `Edit #${editing.invoice_no}` : 'New Invoice') : view === 'analytics' ? 'Invoice Analytics' : 'Invoices'}
                </h1>
                {view === 'list' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {invoices.length} invoices · PKR {stats.paid.toLocaleString()} collected
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {view === 'list' ? (
                <>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border" onClick={loadInvoices} disabled={loading}>
                    <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-8 gap-1.5 text-xs border-border"
                    onClick={() => setView('analytics')}>
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Analytics</span>
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className={cn('h-8 gap-1.5 text-xs border-border', logoPanelOpen && 'border-primary/50 text-primary')}
                    onClick={() => setLogoPanelOpen(v => !v)}
                    title="Brand Logo"
                  >
                    {logoUrl
                      ? <img src={logoUrl} alt="logo" className="h-4 max-w-[48px] object-contain" />
                      : <ImageIcon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Logo</span>
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openNew}>
                    <PlusCircle className="w-3.5 h-3.5" /> New Invoice
                  </Button>
                </>
              ) : view === 'analytics' ? (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openNew}>
                  <PlusCircle className="w-3.5 h-3.5" /> New Invoice
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-border"
                    onClick={() => setShowTemplates(v => !v)}>
                    <Zap className="w-3.5 h-3.5" /> Templates
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-border" onClick={() => handlePrint()}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save</>}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats row (list view) */}
          {view === 'list' && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { label: 'Total',    value: stats.total,                    sub: 'invoices' },
                { label: 'Collected', value: `PKR ${(stats.paid/1e6).toFixed(1)}M`, sub: 'paid invoices' },
                { label: 'Pending',  value: stats.pending,                  sub: 'awaiting payment' },
                { label: 'Overdue',  value: stats.overdue,                  sub: 'need follow-up', warn: stats.overdue > 0 },
              ].map(s => (
                <div key={s.label} className={cn(
                  'rounded-xl px-3 py-2 border',
                  s.warn ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-border'
                )}>
                  <p className={cn('text-lg font-black', s.warn ? 'text-primary' : 'text-foreground')}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label} · {s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Brand Logo panel (collapsible, list view only) */}
          <AnimatePresence>
            {view === 'list' && logoPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border"
              >
                <div className="px-6 py-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" /> Brand Logo for Invoices
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        This logo appears on every printed invoice in the header area
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setLogoPanelOpen(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <BrandLogoUpload onLogoChange={url => setLogoUrl(url)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Filters */}
            <div className="flex gap-2 px-6 py-2.5 border-b border-border shrink-0 flex-wrap items-center">
              <div className="relative flex-1 min-w-0 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search invoice #, customer, vehicle…"
                  className="pl-8 h-8 bg-muted/40 text-xs" />
              </div>
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
                <SelectTrigger className="h-8 w-32 text-xs bg-muted/40 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
                <SelectTrigger className="h-8 w-28 text-xs bg-muted/40 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground ml-auto shrink-0">{filtered.length} shown</p>
            </div>

            {/* Invoice list */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse border border-border" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                  <div className="w-16 h-16 rounded-3xl bg-muted/30 border border-border flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-base font-bold text-foreground">No invoices</p>
                  <p className="text-sm text-muted-foreground">Create your first invoice to get started</p>
                  <Button onClick={openNew} className="gap-2 mt-1"><PlusCircle className="w-4 h-4" />New Invoice</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filtered.map(inv => (
                      <motion.div key={inv.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                        onClick={() => openEdit(inv)}
                      >
                        {/* Type indicator */}
                        <div className={cn('w-1 self-stretch rounded-full shrink-0',
                          inv.type === 'sale' ? 'bg-emerald-500' : inv.type === 'purchase' ? 'bg-blue-500' : 'bg-primary'
                        )} />

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-foreground font-mono">{inv.invoice_no}</span>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', TYPE_CONFIG[inv.type].color)}>
                              {TYPE_CONFIG[inv.type].label}
                            </span>
                            <StatusBadge status={inv.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-foreground font-semibold truncate">{inv.customer_name}</span>
                            {inv.vehicle_desc && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="w-2.5 h-2.5" />{inv.vehicle_desc}</span>}
                            {inv.issue_date && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{inv.issue_date}</span>}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0 mr-2">
                          <p className="text-base font-black text-foreground">{formatCurrency(inv.total)}</p>
                          {(inv.balance_due ?? 0) > 0 && (
                            <p className="text-[10px] text-primary">Due: {formatCurrency(inv.balance_due!)}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}>
                          <Select value={inv.status} onValueChange={v => updateStatus(inv, v as Invoice['status'])}>
                            <SelectTrigger className="h-7 w-24 text-[10px] bg-muted/40 border-border gap-1 px-2">
                              {updatingStatus === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(inv)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                            onClick={() => handlePrint(inv)}><Printer className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500/80 hover:text-emerald-400"
                            onClick={() => handleWhatsApp(inv)}>
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(inv)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS VIEW ── */}
        {view === 'analytics' && (
          <div className="flex-1 overflow-y-auto min-h-0 p-6">
            <div className="max-w-5xl mx-auto space-y-5">

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue',    value: `PKR ${(analytics.totalRevenue/1e6).toFixed(2)}M`,   icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { label: 'Outstanding',      value: `PKR ${(analytics.totalOutstanding/1e3).toFixed(0)}K`, icon: AlertCircle, color: 'text-primary',      bg: 'bg-primary/10 border-primary/20' },
                  { label: 'Avg Invoice',      value: `PKR ${(analytics.avgInvoiceValue/1e3).toFixed(0)}K`, icon: Receipt,     color: 'text-blue-400',     bg: 'bg-blue-500/10 border-blue-500/20' },
                  { label: 'Total Invoices',   value: invoices.length,                                       icon: FileText,    color: 'text-muted-foreground', bg: 'bg-muted/20 border-border' },
                ].map(k => (
                  <div key={k.label} className={cn('rounded-2xl border p-4', k.bg)}>
                    <k.icon className={cn('w-4 h-4 mb-2', k.color)} />
                    <p className={cn('text-xl font-black', k.color)}>{k.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Monthly Revenue Bar Chart */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" /> Monthly Revenue (Paid Invoices — Last 6 Months)
                </h3>
                {analytics.monthly.every(m => m.revenue === 0) ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No paid invoice data yet</p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...analytics.monthly.map(m => m.revenue), 1);
                      return analytics.monthly.map(m => (
                        <div key={m.label} className="flex items-center gap-3">
                          <span className="text-[11px] text-muted-foreground w-8 shrink-0">{m.label}</span>
                          <div className="flex-1 h-6 bg-muted/30 rounded-lg overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${(m.revenue / max) * 100}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-primary/70 rounded-lg"
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground w-24 text-right shrink-0">
                            {m.revenue > 0 ? `PKR ${(m.revenue/1e3).toFixed(0)}K` : '—'}
                          </span>
                          <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">{m.count} inv</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* By Type */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Invoice Type Breakdown</h3>
                  <div className="space-y-3">
                    {analytics.byType.map(t => (
                      <div key={t.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-foreground">{t.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground">{t.count} invoices</span>
                            <span className="text-xs font-bold text-foreground">PKR {(t.total/1e3).toFixed(0)}K</span>
                          </div>
                        </div>
                        {(() => {
                          const totalAll = analytics.byType.reduce((s, x) => s + x.total, 0) || 1;
                          return (
                            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${(t.total / totalAll) * 100}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-primary/60 rounded-full"
                              />
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Status Overview</h3>
                  <div className="space-y-2.5">
                    {analytics.statusBreakdown.filter(s => s.count > 0).map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', s.color)}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/50 rounded-full"
                              style={{ width: `${(s.count / (invoices.length || 1)) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground w-6 text-right">{s.count}</span>
                        </div>
                      </div>
                    ))}
                    {analytics.statusBreakdown.every(s => s.count === 0) && (
                      <p className="text-xs text-muted-foreground">No invoices yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              {analytics.topCustomers.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Top Customers by Revenue
                  </h3>
                  <div className="space-y-2">
                    {analytics.topCustomers.map((c, i) => {
                      const maxVal = analytics.topCustomers[0].total || 1;
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                          <span className="text-xs text-foreground font-semibold flex-1 truncate">{c.name}</span>
                          <div className="w-32 h-2 bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${(c.total / maxVal) * 100}%` }}
                              transition={{ duration: 0.4, delay: i * 0.05 }}
                              className="h-full bg-primary/60 rounded-full"
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground w-24 text-right shrink-0">PKR {(c.total/1e3).toFixed(0)}K</span>
                          <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">{c.count} inv</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FORM VIEW ── */}
        {view === 'form' && (
          <div className="flex-1 overflow-y-auto min-h-0 p-6" ref={formRef}>
            {/* ── Template picker (collapsible) ── */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4">
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Quick Templates — click to apply
                      </p>
                      <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {INVOICE_TEMPLATES.map(tpl => (
                        <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/10 transition-all text-left group">
                          <span className="text-lg shrink-0">{tpl.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">{tpl.label}</p>
                            <p className="text-[10px] text-muted-foreground">{tpl.items.length} line items</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="max-w-4xl mx-auto space-y-4">

              {/* ── Invoice identity ── */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Invoice Details</span>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Invoice No. *</Label>
                    <Input value={form.invoice_no} onChange={setF('invoice_no')} placeholder="SI-001" className="h-9 bg-muted/30 text-sm font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</Label>
                    <Select value={form.type} onValueChange={v => setFv('type', v as Invoice['type'])}>
                      <SelectTrigger className="h-9 bg-muted/30 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Sale Invoice</SelectItem>
                        <SelectItem value="purchase">Purchase Invoice</SelectItem>
                        <SelectItem value="service">Service Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</Label>
                    <Select value={form.status} onValueChange={v => setFv('status', v as Invoice['status'])}>
                      <SelectTrigger className="h-9 bg-muted/30 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Issue Date</Label>
                    <Input type="date" value={form.issue_date} onChange={setF('issue_date')} className="h-9 bg-muted/30 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Due Date</Label>
                    <Input type="date" value={form.due_date ?? ''} onChange={setF('due_date')} className="h-9 bg-muted/30 text-sm" />
                  </div>
                  {form.status === 'paid' && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Paid Date</Label>
                      <Input type="date" value={form.paid_date ?? ''} onChange={setF('paid_date')} className="h-9 bg-muted/30 text-sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Customer ── */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Customer / Party</span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name *</Label>
                    <Input value={form.customer_name} onChange={setF('customer_name')} placeholder="Muhammad Ali Khan" className="h-9 bg-muted/30 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={form.customer_phone ?? ''} onChange={setF('customer_phone')} placeholder="+92-300-0000000" className="pl-9 h-9 bg-muted/30 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={form.customer_email ?? ''} onChange={setF('customer_email')} placeholder="customer@email.com" className="pl-9 h-9 bg-muted/30 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={form.customer_address ?? ''} onChange={setF('customer_address')} placeholder="City, Pakistan" className="pl-9 h-9 bg-muted/30 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Vehicle ── */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Vehicle</span>
                </div>
                <div className="p-5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Vehicle Description</Label>
                  <Input value={form.vehicle_desc ?? ''} onChange={setF('vehicle_desc')}
                    placeholder="Toyota Corolla Altis X 2.0 CVT — White — ABC-1234"
                    className="h-9 bg-muted/30 text-sm" />
                </div>
              </div>

              {/* ── Line items ── */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Line Items</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary" onClick={addItem}>
                    <Plus className="w-3 h-3" />Add Row
                  </Button>
                </div>
                <div className="p-5 space-y-2">
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold px-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  <Separator className="bg-border hidden md:block" />
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center group">
                      <div className="col-span-12 md:col-span-6">
                        <Input value={item.description}
                          onChange={e => setItem(idx, 'description', e.target.value)}
                          placeholder="Item description…"
                          className="h-8 bg-muted/30 text-xs" />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Input type="number" min="1" value={item.qty}
                          onChange={e => setItem(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="h-8 bg-muted/30 text-xs text-center" />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Input type="number" min="0" value={item.unit_price}
                          onChange={e => setItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8 bg-muted/30 text-xs text-right" />
                      </div>
                      <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-foreground">{formatCurrency(item.qty * item.unit_price)}</span>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)}
                            className="w-5 h-5 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Totals + Pricing ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pricing adjustments */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Pricing</span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Discount %</Label>
                        <Input type="number" min="0" max="100" step="0.5"
                          value={form.discount_pct ?? 0} onChange={e => setFv('discount_pct', parseFloat(e.target.value) || 0)}
                          className="h-9 bg-muted/30 text-sm" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Tax / GST %</Label>
                        <Input type="number" min="0" max="100" step="0.5"
                          value={form.tax_pct ?? 0} onChange={e => setFv('tax_pct', parseFloat(e.target.value) || 0)}
                          className="h-9 bg-muted/30 text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount Paid (PKR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input type="number" min="0"
                          value={form.paid_amount ?? 0} onChange={e => setFv('paid_amount', parseFloat(e.target.value) || 0)}
                          className="pl-9 h-9 bg-muted/30 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals summary */}
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                  <div className="px-5 py-3 bg-primary/20 border-b border-primary/30 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Summary</span>
                  </div>
                  <div className="p-5 space-y-2">
                    {[
                      { label: 'Subtotal', value: subtotal },
                      ...(disc > 0 ? [{ label: `Discount (${form.discount_pct}%)`, value: -disc, neg: true }] : []),
                      ...(tax > 0 ? [{ label: `Tax (${form.tax_pct}%)`, value: tax }] : []),
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.label}</span>
                        <span className={cn('font-semibold', (r as any).neg && 'text-emerald-400')}>
                          {(r as any).neg ? '-' : ''}{formatCurrency(Math.abs(r.value))}
                        </span>
                      </div>
                    ))}
                    <Separator className="bg-primary/20" />
                    <div className="flex justify-between text-base font-black text-foreground">
                      <span>TOTAL</span><span>{formatCurrency(total)}</span>
                    </div>
                    {(form.paid_amount ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                        <span>Paid</span><span>{formatCurrency(form.paid_amount ?? 0)}</span>
                      </div>
                    )}
                    {balance > 0 && (
                      <div className="flex justify-between text-sm font-bold text-primary">
                        <span>Balance Due</span><span>{formatCurrency(balance)}</span>
                      </div>
                    )}
                    {balance <= 0 && total > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-2 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">Fully Paid</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Notes + Terms ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Notes</span>
                  </div>
                  <div className="p-4">
                    <Textarea value={form.notes ?? ''} onChange={setF('notes')}
                      placeholder="Additional notes for customer…"
                      className="bg-muted/30 border-border text-sm min-h-[80px] resize-none" />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Terms</span>
                  </div>
                  <div className="p-4">
                    <Textarea value={form.terms ?? ''} onChange={setF('terms')}
                      placeholder="Terms and conditions…"
                      className="bg-muted/30 border-border text-sm min-h-[80px] resize-none" />
                  </div>
                </div>
              </div>

              {/* ── Action bar ── */}
              <div className="flex gap-3 pt-2 pb-6">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setView('list')}>Cancel</Button>
                <Button variant="outline" className="border-border gap-2" onClick={() => handlePrint()}>
                  <Printer className="w-4 h-4" />Print Preview
                </Button>
                {form.customer_phone && (
                  <Button variant="ghost" className="border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-2"
                    onClick={() => handleWhatsApp(editing ?? { ...form, id: '', subtotal, total, balance_due: balance } as any)}>
                    <MessageCircle className="w-4 h-4" />WhatsApp
                  </Button>
                )}
                <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />{editing ? 'Update Invoice' : 'Create Invoice'}</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Invoice <span className="font-mono font-bold text-foreground">{deleteTarget?.invoice_no}</span> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-primary text-primary-foreground hover:bg-primary/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
