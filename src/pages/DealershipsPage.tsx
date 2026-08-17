import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, Search, Building2, Users, MapPin, Phone, Pencil, Trash2,
  ChevronRight, X, Mail, Globe, Clock, Eye, ExternalLink, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchDealerships, createDealership, updateDealership, deleteDealership } from '@/lib/api';
import type { Dealership } from '@/types/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── blank form helper ──────────────────────────────────────────────────────────
const blank = (): Partial<Dealership> => ({
  name: '', address: '', city: '', area: '', owner_name: '',
  phone: '', email: '', website: '', business_hours: '',
  employee_count: undefined, brands: [], notes: '', is_active: true,
  google_maps_url: '',
});

const CITY_LIST = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Faisalabad', 'Multan', 'Hyderabad', 'Other'];

// ── main page ──────────────────────────────────────────────────────────────────
export default function DealershipsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dealership | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dealership | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // auto-open create dialog when navigated here with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadDealerships = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchDealerships({ page, pageSize: 20, search: search || undefined });
      setDealerships(data);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(loadDealerships, 300);
    return () => clearTimeout(t);
  }, [loadDealerships]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (ds: Dealership) => { setEditing(ds); setFormOpen(true); };

  const handleSave = async (payload: Partial<Dealership>) => {
    setSaving(true);
    try {
      if (editing) {
        await updateDealership(editing.id, payload);
        toast.success('Dealership updated');
      } else {
        await createDealership(payload);
        toast.success('Dealership created');
      }
      setFormOpen(false);
      loadDealerships();
    } catch {
      toast.error('Failed to save dealership');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDealership(deleteTarget.id);
      toast.success('Dealership deleted');
      setDeleteTarget(null);
      loadDealerships();
    } catch {
      toast.error('Failed to delete dealership');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
        {/* header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dealerships</h1>
            <p className="text-sm text-muted-foreground">{total} locations</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Dealership
          </Button>
        </div>

        {/* search */}
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search dealerships..."
            className="pl-9 h-8 bg-muted/50 border-border text-sm"
          />
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-40 bg-muted" />
                  <Skeleton className="h-4 w-28 bg-muted" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full bg-muted" />
                    <Skeleton className="h-6 w-16 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))
            : dealerships.map(ds => (
              <DealershipCard
                key={ds.id}
                dealership={ds}
                onView={() => navigate(`/dealerships/${ds.id}`)}
                onEdit={() => openEdit(ds)}
                onDelete={() => setDeleteTarget(ds)}
              />
            ))
          }
        </div>

        {!loading && dealerships.length === 0 && (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">No dealerships found</p>
            <p className="text-xs text-muted-foreground">Add your first dealership location</p>
          </div>
        )}

        {/* pagination */}
        {!loading && total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* create / edit dialog */}
      <DealershipFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing ?? undefined}
        saving={saving}
        onSave={handleSave}
      />

      {/* delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dealership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ── dealership card ────────────────────────────────────────────────────────────
function DealershipCard({
  dealership, onView, onEdit, onDelete,
}: {
  dealership: Dealership;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="bg-card border-border hover:border-primary/30 transition-colors h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          {/* top row: icon + name + actions */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              onClick={onView}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{dealership.name}</p>
                {dealership.owner_name && <p className="text-xs text-muted-foreground">{dealership.owner_name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={e => { e.stopPropagation(); onEdit(); }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 cursor-pointer" onClick={onView}>
            {dealership.city && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{dealership.area ? `${dealership.area}, ` : ''}{dealership.city}</span>
              </div>
            )}
            {dealership.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Phone className="w-3 h-3 shrink-0" />{dealership.phone}
              </div>
            )}
            {dealership.brands && dealership.brands.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {dealership.brands.slice(0, 4).map(b => (
                  <span key={b} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">{b}</span>
                ))}
                {dealership.brands.length > 4 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">+{dealership.brands.length - 4}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{dealership.employee_count || 0} employees</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
              onClick={onView}
            >
              View <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── form dialog ────────────────────────────────────────────────────────────────
function DealershipFormDialog({
  open, onOpenChange, initial, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Dealership>;
  saving: boolean;
  onSave: (payload: Partial<Dealership>) => void;
}) {
  const [form, setForm] = useState<Partial<Dealership>>(blank());
  const [brandInput, setBrandInput] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...blank(), ...initial } : blank());
      setBrandInput('');
    }
  }, [open, initial]);

  const set = (k: keyof Dealership, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addBrand = () => {
    const val = brandInput.trim();
    if (!val) return;
    const existing = form.brands ?? [];
    if (!existing.includes(val)) set('brands', [...existing, val]);
    setBrandInput('');
  };

  const removeBrand = (b: string) => set('brands', (form.brands ?? []).filter(x => x !== b));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    onSave(form);
  };

  const isEdit = !!initial?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? 'Edit Dealership' : 'Add Dealership'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? `Editing ${initial?.name}` : 'Fill in the details to create a new dealership location.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* name + owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ds-name" className="text-xs text-muted-foreground">Name <span className="text-destructive">*</span></Label>
              <Input id="ds-name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="AutoZone Motors" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-owner" className="text-xs text-muted-foreground">Owner Name</Label>
              <Input id="ds-owner" value={form.owner_name ?? ''} onChange={e => set('owner_name', e.target.value)} placeholder="John Smith" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
          </div>

          {/* city dropdown + area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City</Label>
              <select
                value={form.city ?? ''}
                onChange={e => set('city', e.target.value)}
                className="w-full h-8 text-sm rounded-md border border-border bg-muted/50 px-2 text-foreground"
              >
                <option value="">Select city…</option>
                {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-area" className="text-xs text-muted-foreground">Area / Sector</Label>
              <Input id="ds-area" value={form.area ?? ''} onChange={e => set('area', e.target.value)} placeholder="DHA Phase 5" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
          </div>

          {/* address */}
          <div className="space-y-1.5">
            <Label htmlFor="ds-address" className="text-xs text-muted-foreground">Full Address</Label>
            <Input id="ds-address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="Plot 14, Block 7, Clifton, Karachi" className="h-8 text-sm bg-muted/50 border-border" />
          </div>

          {/* phone + email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ds-phone" className="text-xs text-muted-foreground">Phone</Label>
              <Input id="ds-phone" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="021-35801234" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-email" className="text-xs text-muted-foreground">Email</Label>
              <Input id="ds-email" type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="info@dealership.pk" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
          </div>

          {/* website + google maps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ds-web" className="text-xs text-muted-foreground">Website</Label>
              <div className="relative">
                <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input id="ds-web" value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://dealership.pk" className="h-8 text-sm pl-7 bg-muted/50 border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-maps" className="text-xs text-muted-foreground">Google Maps URL</Label>
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input id="ds-maps" value={form.google_maps_url ?? ''} onChange={e => set('google_maps_url', e.target.value)} placeholder="https://maps.google.com/…" className="h-8 text-sm pl-7 bg-muted/50 border-border" />
              </div>
            </div>
          </div>

          {/* employees + hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ds-emp" className="text-xs text-muted-foreground">Staff Count</Label>
              <Input id="ds-emp" type="number" min={0} value={form.employee_count ?? ''} onChange={e => set('employee_count', e.target.value ? Number(e.target.value) : undefined)} placeholder="15" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-hours" className="text-xs text-muted-foreground">Business Hours</Label>
              <Input id="ds-hours" value={form.business_hours ?? ''} onChange={e => set('business_hours', e.target.value)} placeholder="Mon-Sat 9am-7pm" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
          </div>

          {/* brands */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Car Brands Handled</Label>
            <div className="flex gap-2">
              <Input value={brandInput} onChange={e => setBrandInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBrand(); } }}
                placeholder="Toyota, BMW, Honda…" className="flex-1 h-8 text-sm bg-muted/50 border-border" />
              <Button type="button" variant="outline" size="sm" onClick={addBrand} className="h-8 border-border text-xs">
                <Tag className="w-3.5 h-3.5 mr-1" />Add
              </Button>
            </div>
            {(form.brands ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(form.brands ?? []).map(b => (
                  <Badge key={b} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
                    {b}
                    <button type="button" onClick={() => removeBrand(b)} className="ml-0.5 rounded-sm hover:bg-muted p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ds-notes" className="text-xs text-muted-foreground">Notes</Label>
            <Textarea id="ds-notes" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this dealership…" rows={3} className="resize-none text-sm bg-muted/50 border-border" />
          </div>

          {/* active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Active Status</p>
              <p className="text-xs text-muted-foreground">Inactive dealerships are hidden from filters</p>
            </div>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border h-8 text-xs">Cancel</Button>
            <Button type="submit" disabled={saving} className="h-8 text-xs">{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Dealership'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
