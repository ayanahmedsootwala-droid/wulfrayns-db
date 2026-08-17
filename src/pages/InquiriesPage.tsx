import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Filter, X, MessageSquare, Phone, Mail, Calendar,
  Clock, User, ChevronDown, Trash2, Edit2, RefreshCw,
  AlertCircle, CheckCircle2, Circle, ArrowUpCircle, Send, Zap,
  BarChart3, TrendingUp, AlertTriangle, Car, Sparkles,
  Download, LayoutGrid, List, CheckSquare, Square, Columns,
  ArrowRight, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import AIInquiryMatcher from '@/components/ai/AIInquiryMatcher';
import {
  fetchInquiries, createInquiry, updateInquiry, deleteInquiry,
  fetchInquiryNotes, createInquiryNote, deleteInquiryNote, fetchInquiryStats,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Inquiry, InquiryNote, InquiryStatus, InquiryPriority } from '@/types/types';
import { toast } from 'sonner';

// ── constants ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New', active: 'Active', in_progress: 'In Progress',
  matched: 'Matched', resolved: 'Resolved', closed: 'Closed',
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  matched: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-border',
};

const STATUS_ICONS: Record<InquiryStatus, React.ElementType> = {
  new: Circle, active: Zap, in_progress: Clock,
  matched: CheckCircle2, resolved: CheckCircle2, closed: X,
};

const PRIORITY_LABELS: Record<InquiryPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};
const PRIORITY_COLORS: Record<InquiryPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const TEAM_MEMBERS = ['Admin', 'Sales Team', 'Support', 'Manager', 'Unassigned'];

// ── form state ────────────────────────────────────────────────────────────
interface VehicleOption {
  make: string;
  model: string;
  year: string; // e.g. "2025/2026" or "2025"
}

interface FormState {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  description: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  assigned_to: string;
  follow_up_date: string;
  // Car requirements — single mode
  req_make: string;
  req_model: string;
  req_variant: string;
  req_color: string;
  req_model_year: string;
  req_reg_year: string;
  req_mileage_max: string;
  req_budget_max: string;
  req_fuel_type: string;
  req_transmission: string;
  req_body_type: string;
  req_additional: string;
  // Multi-vehicle mode
  multi_mode: boolean;
  vehicle_options: VehicleOption[];
  vehicle_operator: 'OR' | 'AND';
}

const BLANK_FORM: FormState = {
  customer_name: '', customer_phone: '', customer_email: '',
  description: '', status: 'new', priority: 'medium',
  assigned_to: 'Admin', follow_up_date: '',
  req_make: '', req_model: '', req_variant: '', req_color: '',
  req_model_year: '', req_reg_year: '', req_mileage_max: '',
  req_budget_max: '', req_fuel_type: '', req_transmission: '', req_body_type: '', req_additional: '',
  multi_mode: false,
  vehicle_options: [{ make: '', model: '', year: '' }, { make: '', model: '', year: '' }],
  vehicle_operator: 'OR',
};

// ── InquiryCard ───────────────────────────────────────────────────────────
function InquiryCard({
  inquiry, onSelect, onEdit, onDelete,
}: {
  inquiry: Inquiry;
  onSelect: (i: Inquiry) => void;
  onEdit: (i: Inquiry) => void;
  onDelete: (i: Inquiry) => void;
}) {
  const StatusIcon = STATUS_ICONS[inquiry.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card
        className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group"
        onClick={() => onSelect(inquiry)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">{inquiry.customer_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">{inquiry.customer_name}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_COLORS[inquiry.status])}>
                  {STATUS_LABELS[inquiry.status]}
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', PRIORITY_COLORS[inquiry.priority])}>
                  {PRIORITY_LABELS[inquiry.priority]}
                </span>
              </div>
              {inquiry.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inquiry.description}</p>
              )}
              {/* Car requirements summary */}
              {(inquiry.req_make || inquiry.req_model || inquiry.req_budget_max) && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Car className="w-3 h-3 text-primary shrink-0" />
                  {inquiry.req_make && (
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-medium">
                      {inquiry.req_make}{inquiry.req_model ? ` ${inquiry.req_model}` : ''}
                    </span>
                  )}
                  {inquiry.req_variant && (
                    <span className="text-[10px] bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      {inquiry.req_variant}
                    </span>
                  )}
                  {inquiry.req_mileage_max != null && (
                    <span className="text-[10px] bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      ≤{inquiry.req_mileage_max.toLocaleString()} km
                    </span>
                  )}
                  {inquiry.req_budget_max && (
                    <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-medium">
                      ≤PKR {(inquiry.req_budget_max / 1_000_000).toFixed(1)}M
                    </span>
                  )}
                  {inquiry.req_color && (
                    <span className="text-[10px] bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      {inquiry.req_color}
                    </span>
                  )}
                  {inquiry.req_fuel_type && (
                    <span className="text-[10px] bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      {inquiry.req_fuel_type}
                    </span>
                  )}
                  {(inquiry as Inquiry & { req_transmission?: string }).req_transmission && (
                    <span className="text-[10px] bg-muted/70 text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                      {(inquiry as Inquiry & { req_transmission?: string }).req_transmission}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {inquiry.customer_phone && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />{inquiry.customer_phone}
                  </span>
                )}
                {inquiry.customer_email && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[140px]">
                    <Mail className="w-2.5 h-2.5" />{inquiry.customer_email}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(inquiry.inquiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {inquiry.assigned_to && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />{inquiry.assigned_to}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                onClick={e => { e.stopPropagation(); onEdit(inquiry); }}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={e => { e.stopPropagation(); onDelete(inquiry); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {inquiry.follow_up_date && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-orange-400">
              <AlertCircle className="w-2.5 h-2.5" />
              Follow-up: {new Date(inquiry.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────
function InquiryDetail({
  inquiry, onClose, onUpdate,
}: { inquiry: Inquiry; onClose: () => void; onUpdate: () => void }) {
  const [notes, setNotes] = useState<InquiryNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const StatusIcon = STATUS_ICONS[inquiry.status];

  useEffect(() => {
    fetchInquiryNotes(inquiry.id).then(setNotes);
  }, [inquiry.id]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await createInquiryNote({ inquiry_id: inquiry.id, author: 'Admin', content: noteText.trim() });
      setNoteText('');
      const updated = await fetchInquiryNotes(inquiry.id);
      setNotes(updated);
      toast.success('Note added');
    } finally {
      setAddingNote(false);
    }
  };

  const removeNote = async (id: string) => {
    await deleteInquiryNote(id);
    setNotes(n => n.filter(x => x.id !== id));
  };

  const changeStatus = async (status: InquiryStatus) => {
    setStatusUpdating(true);
    try {
      await updateInquiry(inquiry.id, { status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) });
      onUpdate();
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-primary">{inquiry.customer_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{inquiry.customer_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', STATUS_COLORS[inquiry.status])}>
              {STATUS_LABELS[inquiry.status]}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', PRIORITY_COLORS[inquiry.priority])}>
              {PRIORITY_LABELS[inquiry.priority]}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Contact */}
        <div className="space-y-1.5">
          {inquiry.customer_phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{inquiry.customer_phone}</span>
            </div>
          )}
          {inquiry.customer_email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{inquiry.customer_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground">{new Date(inquiry.inquiry_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {inquiry.assigned_to && (
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{inquiry.assigned_to}</span>
            </div>
          )}
          {inquiry.follow_up_date && (
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-orange-400">Follow-up: {new Date(inquiry.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
          {inquiry.vehicle && (
            <div className="flex items-center gap-2 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{inquiry.vehicle.make} {inquiry.vehicle.model} {inquiry.vehicle.variant}</span>
            </div>
          )}
        </div>

        {inquiry.description && (
          <>
            <Separator className="bg-border" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{inquiry.description}</p>
            </div>
          </>
        )}

        {/* Quick status change */}
        <Separator className="bg-border" />
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Update Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(STATUS_LABELS) as InquiryStatus[]).map(s => (
              <button
                key={s}
                disabled={inquiry.status === s || statusUpdating}
                onClick={() => changeStatus(s)}
                className={cn(
                  'px-2 py-1.5 rounded text-xs font-medium border transition-colors',
                  inquiry.status === s
                    ? STATUS_COLORS[s]
                    : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground',
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* AI Vehicle Matcher */}
        <Separator className="bg-border" />
        <AIInquiryMatcher inquiry={inquiry} />

        {/* Notes */}
        <Separator className="bg-border" />
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">
            Notes ({notes.length})
          </p>
          <div className="space-y-2 mb-3">
            {notes.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No notes yet</p>
            )}
            {notes.map(note => (
              <div key={note.id} className="bg-muted/30 rounded-lg p-2.5 border border-border group/note">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-foreground leading-relaxed flex-1">{note.content}</p>
                  <button
                    onClick={() => removeNote(note.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover/note:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{note.author} · {new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="text-xs min-h-[60px] bg-muted/30 border-border resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
            />
            <Button size="icon" className="h-8 w-8 shrink-0" disabled={!noteText.trim() || addingNote} onClick={addNote}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
type ViewMode = 'list' | 'kanban';

// ── CSV Export ────────────────────────────────────────────────────────────
function exportCSV(rows: Inquiry[]) {
  const headers = ['Customer','Phone','Email','Status','Priority','Make','Model','Variant','Budget','Fuel','Body','Assigned','Date','Follow-up','Description'];
  const escape = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.customer_name, r.customer_phone, r.customer_email,
      r.status, r.priority, r.req_make, r.req_model, r.req_variant,
      r.req_budget_max, r.req_fuel_type, r.req_transmission, r.req_body_type,
      r.assigned_to, r.inquiry_date, r.follow_up_date, r.description,
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `inquiries-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// ── Kanban Column ─────────────────────────────────────────────────────────
function KanbanColumn({ status, inquiries, onEdit, onDelete, onSelect }: {
  status: InquiryStatus; inquiries: Inquiry[];
  onEdit:(i:Inquiry)=>void; onDelete:(i:Inquiry)=>void; onSelect:(i:Inquiry)=>void;
}) {
  return (
    <div className="flex flex-col min-w-[220px] w-[220px] bg-muted/20 rounded-xl border border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>
        <span className="text-xs text-muted-foreground font-mono">{inquiries.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[60vh]">
        {inquiries.length === 0 && <p className="text-[11px] text-muted-foreground italic text-center py-4">Empty</p>}
        {inquiries.map(inq => (
          <div key={inq.id} onClick={() => onSelect(inq)}
            className="bg-card border border-border rounded-lg p-2.5 cursor-pointer hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-semibold text-foreground truncate">{inq.customer_name}</p>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e=>{e.stopPropagation();onEdit(inq)}} className="text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3"/></button>
                <button onClick={e=>{e.stopPropagation();onDelete(inq)}} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3"/></button>
              </div>
            </div>
            {(inq.req_make || inq.req_model) && (
              <p className="text-[10px] text-primary mt-1 truncate">{[inq.req_make,inq.req_model].filter(Boolean).join(' ')}</p>
            )}
            {inq.req_budget_max && (
              <p className="text-[10px] text-green-400 mt-0.5">≤PKR {(inq.req_budget_max/1_000_000).toFixed(1)}M</p>
            )}
            <div className="flex items-center gap-1 mt-1.5">
              <span className={cn('text-[9px] px-1 py-0.5 rounded border', PRIORITY_COLORS[inq.priority])}>{PRIORITY_LABELS[inq.priority]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<InquiryPriority | 'all'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [deletingInquiry, setDeletingInquiry] = useState<Inquiry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byPriority: Record<string, number> } | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<InquiryStatus | ''>('');
  const [bulkWorking, setBulkWorking] = useState(false);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        fetchInquiries({ page, pageSize, search, status: statusFilter, priority: priorityFilter }),
        fetchInquiryStats(),
      ]);
      setInquiries(res.data);
      setTotal(res.count);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => { setEditingInquiry(null); setForm(BLANK_FORM); setDialogOpen(true); };
  const openEdit = (i: Inquiry) => {
    setEditingInquiry(i);
    // Detect multi-vehicle mode from pipe-separated req_additional
    const additionalRaw = i.req_additional ?? '';
    const pipeOptions = additionalRaw.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);
    const isMulti = pipeOptions.length > 1;
    setForm({
      customer_name: i.customer_name, customer_phone: i.customer_phone ?? '',
      customer_email: i.customer_email ?? '', description: i.description ?? '',
      status: i.status, priority: i.priority,
      assigned_to: i.assigned_to ?? 'Admin',
      follow_up_date: i.follow_up_date ?? '',
      req_make: i.req_make ?? '', req_model: i.req_model ?? '',
      req_variant: i.req_variant ?? '', req_color: i.req_color ?? '',
      req_model_year: i.req_model_year?.toString() ?? '',
      req_reg_year: i.req_reg_year?.toString() ?? '',
      req_mileage_max: i.req_mileage_max?.toString() ?? '',
      req_budget_max: i.req_budget_max?.toString() ?? '',
      req_fuel_type: i.req_fuel_type ?? '', req_transmission: i.req_transmission ?? '', req_body_type: i.req_body_type ?? '',
      req_additional: isMulti ? '' : additionalRaw,
      multi_mode: isMulti,
      vehicle_options: isMulti
        ? pipeOptions.map(opt => {
            const m = opt.match(/^(.*?)\s*\(([^)]+)\)$/);
            if (m) {
              const parts = m[1].trim().split(/\s+/);
              return { make: parts[0] ?? '', model: parts.slice(1).join(' '), year: m[2] };
            }
            const parts = opt.split(/\s+/);
            return { make: parts[0] ?? '', model: parts.slice(1).join(' '), year: '' };
          })
        : [{ make: '', model: '', year: '' }, { make: '', model: '', year: '' }],
      vehicle_operator: 'OR',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_name.trim()) { toast.error('Customer name is required'); return; }
    setSaving(true);
    try {
      // Build req_additional from multi-vehicle options if in multi mode
      let reqAdditional = form.req_additional || undefined;
      let reqMake = form.req_make || undefined;
      let reqModel = form.req_model || undefined;

      if (form.multi_mode) {
        const filled = form.vehicle_options.filter(o => o.make.trim() || o.model.trim());
        if (filled.length < 2) {
          toast.error('Add at least 2 vehicle options in multi-vehicle mode');
          setSaving(false);
          return;
        }
        const parts = filled.map(o => {
          const base = [o.make.trim(), o.model.trim()].filter(Boolean).join(' ');
          return o.year.trim() ? `${base} (${o.year.trim()})` : base;
        });
        reqAdditional = parts.join(' | ');
        reqMake  = filled[0].make.trim()  || undefined;
        reqModel = filled[0].model.trim() || undefined;
      }

      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone || undefined,
        customer_email: form.customer_email || undefined,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || undefined,
        follow_up_date: form.follow_up_date || undefined,
        req_make: reqMake,
        req_model: reqModel,
        req_variant: form.req_variant || undefined,
        req_color: form.req_color || undefined,
        req_model_year: form.req_model_year ? parseInt(form.req_model_year) : undefined,
        req_reg_year: form.req_reg_year ? parseInt(form.req_reg_year) : undefined,
        req_mileage_max: form.req_mileage_max !== '' ? parseInt(form.req_mileage_max) : undefined,
        req_budget_max: form.req_budget_max ? parseFloat(form.req_budget_max) : undefined,
        req_fuel_type: form.req_fuel_type || undefined,
        req_transmission: form.req_transmission || undefined,
        req_body_type: form.req_body_type || undefined,
        req_additional: reqAdditional,
      };
      if (editingInquiry) {
        await updateInquiry(editingInquiry.id, payload);
        toast.success('Inquiry updated');
      } else {
        await createInquiry(payload);
        toast.success('Inquiry created');
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to save inquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingInquiry) return;
    await deleteInquiry(deletingInquiry.id);
    toast.success('Inquiry deleted');
    setDeletingInquiry(null);
    if (selectedInquiry?.id === deletingInquiry.id) setSelectedInquiry(null);
    load();
  };

  // ── Bulk ops ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === inquiries.length ? new Set() : new Set(inquiries.map(i => i.id)));
  };
  const bulkUpdateStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkWorking(true);
    try {
      await Promise.all([...selectedIds].map(id => updateInquiry(id, { status: bulkStatus })));
      toast.success(`${selectedIds.size} inquiries updated to "${STATUS_LABELS[bulkStatus]}"`);
      setSelectedIds(new Set()); setBulkStatus('');
      load();
    } catch { toast.error('Bulk update failed'); }
    finally { setBulkWorking(false); }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Kanban groups (uses ALL loaded inquiries when in kanban mode)
  const kanbanGroups: Record<InquiryStatus, Inquiry[]> = {
    new: [], active: [], in_progress: [], matched: [], resolved: [], closed: [],
  };
  inquiries.forEach(inq => { kanbanGroups[inq.status]?.push(inq); });

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email, phone..."
                className="pl-9 h-8 bg-muted/50 border-border text-sm"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {(['all', 'new', 'active', 'in_progress', 'matched', 'resolved', 'closed'] as const).map(s => (
                <button key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s as InquiryStatus]}
                  {s !== 'all' && stats?.byStatus[s] != null && (
                    <span className="ml-1 opacity-70">({stats.byStatus[s] ?? 0})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Priority filter */}
            <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v as typeof priorityFilter); setPage(1); }}>
              <SelectTrigger className="h-8 w-32 text-xs bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(Object.keys(PRIORITY_LABELS) as InquiryPriority[]).map(p => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button onClick={() => setViewMode('list')}
                className={cn('px-2 py-1.5 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('kanban')}
                className={cn('px-2 py-1.5 transition-colors', viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => exportCSV(inquiries)} title="Export CSV">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />New Inquiry
            </Button>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-primary font-medium">{selectedIds.size} selected</span>
              <Select value={bulkStatus} onValueChange={v => setBulkStatus(v as InquiryStatus)}>
                <SelectTrigger className="h-7 w-36 text-xs bg-muted/50 border-border">
                  <SelectValue placeholder="Set status…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as InquiryStatus[]).map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs gap-1" disabled={!bulkStatus || bulkWorking} onClick={bulkUpdateStatus}>
                {bulkWorking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
                <X className="w-3 h-3 mr-1" />Clear
              </Button>
            </motion.div>
          )}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-background/50 overflow-x-auto">
            {[
              { label: 'Total', value: stats.total, icon: MessageSquare, color: 'text-foreground' },
              { label: 'New', value: stats.byStatus.new ?? 0, icon: Circle, color: 'text-blue-400' },
              { label: 'Active', value: stats.byStatus.active ?? 0, icon: Zap, color: 'text-primary' },
              { label: 'In Progress', value: stats.byStatus.in_progress ?? 0, icon: Clock, color: 'text-yellow-400' },
              { label: 'Matched', value: stats.byStatus.matched ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Resolved', value: stats.byStatus.resolved ?? 0, icon: CheckCircle2, color: 'text-green-400' },
              { label: 'Urgent', value: stats.byPriority.urgent ?? 0, icon: AlertTriangle, color: 'text-red-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 shrink-0">
                <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
            <div className="ml-auto shrink-0 flex items-center gap-1.5">
              <button onClick={toggleSelectAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selectedIds.size === inquiries.length && inquiries.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                Select All
              </button>
            </div>
          </div>
        )}

        {/* KANBAN view */}
        {viewMode === 'kanban' ? (
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex gap-3 h-full" style={{ minWidth: 'max-content' }}>
              {(Object.keys(STATUS_LABELS) as InquiryStatus[]).map(s => (
                <KanbanColumn
                  key={s} status={s}
                  inquiries={kanbanGroups[s]}
                  onEdit={openEdit} onDelete={i => setDeletingInquiry(i)} onSelect={i => setSelectedInquiry(i)}
                />
              ))}
            </div>
          </div>
        ) : (
        /* LIST view */
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Inquiry list */}
          <div className={cn('flex flex-col overflow-hidden transition-all', selectedInquiry ? 'w-full lg:w-[55%]' : 'w-full')}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))
              ) : inquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No inquiries found</p>
                  <p className="text-xs text-muted-foreground mb-4">Start by adding a customer inquiry</p>
                  <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5 mr-1.5" />New Inquiry</Button>
                </div>
              ) : (
                <AnimatePresence>
                  {inquiries.map(inq => (
                    <InquiryCard
                      key={inq.id}
                      inquiry={inq}
                      onSelect={setSelectedInquiry}
                      onEdit={openEdit}
                      onDelete={setDeletingInquiry}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background/80">
                <p className="text-xs text-muted-foreground">{total} inquiries</p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-6 text-xs border-border" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" className="h-6 text-xs border-border" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedInquiry && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="hidden lg:flex flex-col border-l border-border w-[45%] overflow-hidden bg-card"
              >
                <InquiryDetail
                  inquiry={selectedInquiry}
                  onClose={() => setSelectedInquiry(null)}
                  onUpdate={() => {
                    load();
                    fetchInquiries({ page, pageSize, search, status: statusFilter, priority: priorityFilter })
                      .then(res => {
                        const refreshed = res.data.find(i => i.id === selectedInquiry.id);
                        if (refreshed) setSelectedInquiry(refreshed);
                      });
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingInquiry ? 'Edit Inquiry' : 'New Inquiry'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="bg-muted/50 border border-border h-8 w-full grid grid-cols-2 mb-3">
              <TabsTrigger value="customer" className="text-xs">Customer Info</TabsTrigger>
              <TabsTrigger value="requirements" className="text-xs">Car Requirements</TabsTrigger>
            </TabsList>

            {/* ─── Customer Info tab ─── */}
            <TabsContent value="customer" className="space-y-3 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer Name *</Label>
                  <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Full name" className="h-8 text-sm bg-muted/30 border-border" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                    placeholder="+92 300 0000000" className="h-8 text-sm bg-muted/30 border-border" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                  type="email" placeholder="customer@email.com" className="h-8 text-sm bg-muted/30 border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the inquiry..." className="text-sm bg-muted/30 border-border min-h-[72px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as InquiryStatus }))}>
                    <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as InquiryStatus[]).map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as InquiryPriority }))}>
                    <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as InquiryPriority[]).map(p => (
                        <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Follow-up Date</Label>
                  <Input value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                    type="date" className="h-8 text-xs bg-muted/30 border-border" />
                </div>
              </div>
            </TabsContent>

            {/* ─── Car Requirements tab ─── */}
            <TabsContent value="requirements" className="space-y-3 mt-0">

              {/* Multi-vehicle toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="text-xs font-medium text-foreground">Multi-Vehicle Mode</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Customer wants one of several vehicles</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, multi_mode: !f.multi_mode }))}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    form.multi_mode ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                    form.multi_mode ? 'translate-x-4' : 'translate-x-1')} />
                </button>
              </div>

              {form.multi_mode ? (
                /* ─── Multi-vehicle builder ─── */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Operator between options:</Label>
                    <div className="flex gap-1">
                      {(['OR', 'AND'] as const).map(op => (
                        <button key={op} type="button"
                          onClick={() => setForm(f => ({ ...f, vehicle_operator: op }))}
                          className={cn('px-2.5 py-1 rounded text-xs font-semibold border transition-colors',
                            form.vehicle_operator === op
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40'
                          )}>
                          {op}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {form.vehicle_operator === 'OR' ? 'Any one of these' : 'All of these together'}
                    </span>
                  </div>

                  {form.vehicle_options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex items-center justify-center w-5 h-8 shrink-0">
                        {idx > 0 && (
                          <span className="text-[10px] font-bold text-primary">{form.vehicle_operator}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Make</Label>
                          <Input value={opt.make}
                            onChange={e => setForm(f => { const vo = [...f.vehicle_options]; vo[idx] = { ...vo[idx], make: e.target.value }; return { ...f, vehicle_options: vo }; })}
                            placeholder="Toyota" className="h-8 text-xs bg-muted/30 border-border" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Model</Label>
                          <Input value={opt.model}
                            onChange={e => setForm(f => { const vo = [...f.vehicle_options]; vo[idx] = { ...vo[idx], model: e.target.value }; return { ...f, vehicle_options: vo }; })}
                            placeholder="Corolla" className="h-8 text-xs bg-muted/30 border-border" />
                        </div>
                        <div className="space-y-1 relative">
                          <Label className="text-[10px] text-muted-foreground">Year(s)</Label>
                          <div className="flex gap-1 items-center">
                            <Input value={opt.year}
                              onChange={e => setForm(f => { const vo = [...f.vehicle_options]; vo[idx] = { ...vo[idx], year: e.target.value }; return { ...f, vehicle_options: vo }; })}
                              placeholder="2025/2026" className="h-8 text-xs bg-muted/30 border-border" />
                            {form.vehicle_options.length > 2 && (
                              <button type="button" onClick={() => setForm(f => ({ ...f, vehicle_options: f.vehicle_options.filter((_, i) => i !== idx) }))}
                                className="h-8 w-8 shrink-0 rounded border border-border bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, vehicle_options: [...f.vehicle_options, { make: '', model: '', year: '' }] }))}
                    className="w-full py-2 rounded-lg border border-dashed border-primary/40 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3 h-3" /> Add Another Option
                  </button>

                  <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 font-mono break-all">
                    Preview: {form.vehicle_options.filter(o => o.make || o.model).map(o => {
                      const base = [o.make, o.model].filter(Boolean).join(' ');
                      return o.year ? `${base} (${o.year})` : base;
                    }).join(` | `)}
                  </div>
                </div>
              ) : (
                /* ─── Single-vehicle fields ─── */
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Make</Label>
                      <Input value={form.req_make} onChange={e => setForm(f => ({ ...f, req_make: e.target.value }))}
                        placeholder="e.g. Toyota" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Model</Label>
                      <Input value={form.req_model} onChange={e => setForm(f => ({ ...f, req_model: e.target.value }))}
                        placeholder="e.g. Corolla" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Variant</Label>
                      <Input value={form.req_variant} onChange={e => setForm(f => ({ ...f, req_variant: e.target.value }))}
                        placeholder="e.g. Altis X" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Preferred Color</Label>
                      <Input value={form.req_color} onChange={e => setForm(f => ({ ...f, req_color: e.target.value }))}
                        placeholder="e.g. Pearl White" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Model Year</Label>
                      <Input value={form.req_model_year} onChange={e => setForm(f => ({ ...f, req_model_year: e.target.value }))}
                        type="number" placeholder="e.g. 2022" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Reg Year</Label>
                      <Input value={form.req_reg_year} onChange={e => setForm(f => ({ ...f, req_reg_year: e.target.value }))}
                        type="number" placeholder="e.g. 2022" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max Mileage (km)</Label>
                      <Input value={form.req_mileage_max} onChange={e => setForm(f => ({ ...f, req_mileage_max: e.target.value }))}
                        type="number" min="0" placeholder="0 = brand new" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max Budget (PKR)</Label>
                      <Input value={form.req_budget_max} onChange={e => setForm(f => ({ ...f, req_budget_max: e.target.value }))}
                        type="number" placeholder="e.g. 5000000" className="h-8 text-sm bg-muted/30 border-border" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fuel Type</Label>
                      <Select value={form.req_fuel_type || 'any'} onValueChange={v => setForm(f => ({ ...f, req_fuel_type: v === 'any' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">Any</SelectItem>
                          {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Transmission</Label>
                      <Select value={form.req_transmission || 'any'} onValueChange={v => setForm(f => ({ ...f, req_transmission: v === 'any' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">Any</SelectItem>
                          {['Automatic', 'Manual', 'CVT', 'DCT'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Body Type</Label>
                      <Select value={form.req_body_type || 'any'} onValueChange={v => setForm(f => ({ ...f, req_body_type: v === 'any' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">Any</SelectItem>
                          {['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Crossover', 'Wagon', 'Coupe'].map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Additional Requirements</Label>
                    <Textarea value={form.req_additional} onChange={e => setForm(f => ({ ...f, req_additional: e.target.value }))}
                      placeholder="e.g. Must have sunroof, push start, prefer registered in Lahore..."
                      className="text-sm bg-muted/30 border-border min-h-[72px] resize-none" />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" className="border-border" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingInquiry ? 'Save Changes' : 'Create Inquiry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingInquiry} onOpenChange={open => { if (!open) setDeletingInquiry(null); }}>
        <AlertDialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the inquiry for <span className="font-semibold text-foreground">{deletingInquiry?.customer_name}</span> and all its notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
