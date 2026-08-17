import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Clock,
  ChevronLeft, Pencil, Trash2, Car, UserCircle, Star,
  Tag, X, ArrowUpRight, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import {
  fetchDealership, updateDealership, deleteDealership,
  fetchDealers, fetchVehicles,
} from '@/lib/api';
import type { Dealership, Dealer, Vehicle } from '@/types/types';
import { toast } from 'sonner';

const blank = (): Partial<Dealership> => ({
  name: '', address: '', city: '', area: '', owner_name: '',
  phone: '', email: '', website: '', business_hours: '',
  employee_count: undefined, brands: [], notes: '', is_active: true,
});

export default function DealershipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dealersLoading, setDealersLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleTotal, setVehicleTotal] = useState(0);
  const [tab, setTab] = useState('dealers');

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // load dealership
  const load = useCallback(async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const ds = await fetchDealership(id);
      setDealership(ds);
    } catch {
      toast.error('Failed to load dealership');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // load dealers of this dealership
  const loadDealers = useCallback(async () => {
    if (!id || id === 'new') return;
    setDealersLoading(true);
    try {
      const { data } = await fetchDealers({ pageSize: 100 });
      setDealers(data.filter(d => d.dealership_id === id));
    } finally {
      setDealersLoading(false);
    }
  }, [id]);

  // load vehicles of this dealership
  const loadVehicles = useCallback(async () => {
    if (!id || id === 'new') return;
    setVehiclesLoading(true);
    try {
      const { data, count } = await fetchVehicles({ dealership_id: id, pageSize: 50 });
      setVehicles(data as Vehicle[]);
      setVehicleTotal(count);
    } finally {
      setVehiclesLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDealers(); loadVehicles(); }, [loadDealers, loadVehicles]);

  // "/dealerships/new" — redirect to list page which has the create dialog
  useEffect(() => {
    if (id === 'new') navigate('/dealerships?new=1', { replace: true });
  }, [id, navigate]);

  const handleSave = async (payload: Partial<Dealership>) => {
    if (!dealership) return;
    setSaving(true);
    try {
      await updateDealership(dealership.id, payload);
      toast.success('Dealership updated');
      setEditOpen(false);
      load();
    } catch {
      toast.error('Failed to update dealership');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dealership) return;
    setDeleting(true);
    try {
      await deleteDealership(dealership.id);
      toast.success('Dealership deleted');
      navigate('/dealerships');
    } catch {
      toast.error('Failed to delete dealership');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-4">
        <Skeleton className="h-6 w-48 bg-muted" />
        <Skeleton className="h-32 w-full bg-muted rounded-xl" />
        <Skeleton className="h-64 w-full bg-muted rounded-xl" />
      </div>
    </AppLayout>
  );

  if (!dealership) return (
    <AppLayout>
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Dealership not found.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/dealerships')}>
          Back to Dealerships
        </Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground px-2 h-7" onClick={() => navigate('/dealerships')}>
            <ChevronLeft className="w-3.5 h-3.5" />Dealerships
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium truncate">{dealership.name}</span>
        </div>

        {/* header card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="bg-card border-border mb-4">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-lg font-bold text-foreground truncate">{dealership.name}</h1>
                      {dealership.owner_name && (
                        <p className="text-sm text-muted-foreground">Owner: {dealership.owner_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:text-destructive border border-transparent hover:border-destructive/30"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />Delete
                      </Button>
                    </div>
                  </div>

                  {/* meta pills */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {dealership.city && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {dealership.area ? `${dealership.area}, ` : ''}{dealership.city}
                      </span>
                    )}
                    {dealership.phone && (
                      <a href={`tel:${dealership.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Phone className="w-3 h-3" />{dealership.phone}
                      </a>
                    )}
                    {dealership.email && (
                      <a href={`mailto:${dealership.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Mail className="w-3 h-3" />{dealership.email}
                      </a>
                    )}
                    {dealership.website && (
                      <a href={dealership.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Globe className="w-3 h-3" />{dealership.website}
                      </a>
                    )}
                    {dealership.business_hours && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{dealership.business_hours}
                      </span>
                    )}
                    {dealership.employee_count != null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />{dealership.employee_count} employees
                      </span>
                    )}
                  </div>

                  {/* brands */}
                  {dealership.brands && dealership.brands.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {dealership.brands.map(b => (
                        <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                      ))}
                    </div>
                  )}

                  {/* notes */}
                  {dealership.notes && (
                    <p className="text-xs text-muted-foreground mt-3 border-t border-border/50 pt-3">{dealership.notes}</p>
                  )}
                </div>
              </div>

              {/* stat row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                <StatPill label="Dealers" value={dealersLoading ? '…' : String(dealers.length)} icon={<UserCircle className="w-4 h-4" />} />
                <StatPill label="Vehicles" value={vehiclesLoading ? '…' : String(vehicleTotal)} icon={<Car className="w-4 h-4" />} />
                <StatPill
                  label="Available"
                  value={vehiclesLoading ? '…' : String(vehicles.filter(v => v.status === 'available').length)}
                  icon={<Car className="w-4 h-4 text-green-500" />}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50 h-9 mb-4">
            <TabsTrigger value="dealers" className="text-xs gap-1.5">
              <UserCircle className="w-3.5 h-3.5" />
              Dealers
              {!dealersLoading && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-1">{dealers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Inventory
              {!vehiclesLoading && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-1">{vehicleTotal}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* dealers tab */}
          <TabsContent value="dealers" className="mt-0">
            {dealersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-muted rounded-lg" />)}
              </div>
            ) : dealers.length === 0 ? (
              <div className="py-16 text-center">
                <UserCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">No dealers at this location</p>
                <p className="text-xs text-muted-foreground mb-3">Add dealers and assign them to this dealership</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/dealers')}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Manage Dealers
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dealers.map(dealer => (
                  <DealerCard key={dealer.id} dealer={dealer} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* inventory tab */}
          <TabsContent value="inventory" className="mt-0">
            {vehiclesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 bg-muted rounded-lg" />)}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="py-16 text-center">
                <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">No vehicles at this dealership</p>
                <p className="text-xs text-muted-foreground mb-3">Assign vehicles to this dealership when adding to inventory</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/inventory')}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Go to Inventory
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="whitespace-nowrap text-left py-2 px-3 font-medium">Stock #</th>
                      <th className="whitespace-nowrap text-left py-2 px-3 font-medium">Vehicle</th>
                      <th className="whitespace-nowrap text-left py-2 px-3 font-medium">Year</th>
                      <th className="whitespace-nowrap text-left py-2 px-3 font-medium">Status</th>
                      <th className="whitespace-nowrap text-right py-2 px-3 font-medium">Asking Price</th>
                      <th className="whitespace-nowrap text-right py-2 px-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <VehicleRow key={v.id} vehicle={v} />
                    ))}
                  </tbody>
                </table>
                {vehicleTotal > 50 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">Showing 50 of {vehicleTotal} vehicles</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* edit dialog */}
      <DealershipEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        dealership={dealership}
        saving={saving}
        onSave={handleSave}
      />

      {/* delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dealership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{dealership.name}</span>?
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

// ── sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function DealerCard({ dealer }: { dealer: Dealer }) {
  return (
    <Link to={`/dealers/${dealer.id}`}>
      <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
              {dealer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{dealer.name}</p>
                {dealer.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground">{dealer.city}{dealer.area ? `, ${dealer.area}` : ''}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-foreground">{dealer.deals_done ?? 0} deals</p>
              {dealer.trust_score != null && (
                <p className="text-xs text-muted-foreground">Trust: {dealer.trust_score}%</p>
              )}
            </div>
          </div>
          {dealer.tags && dealer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {dealer.tags.slice(0, 3).map(t => (
                <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-green-500/15 text-green-400 border-green-500/20',
  reserved:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  sold:      'bg-muted/50 text-muted-foreground border-border',
  incoming:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  booked:    'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  const price = vehicle.expected_selling_price;
  const statusClass = STATUS_COLOR[vehicle.status ?? ''] ?? 'bg-muted/50 text-muted-foreground border-border';
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors text-sm">
      <td className="whitespace-nowrap py-2.5 px-3 text-xs text-muted-foreground font-mono">{vehicle.stock_number ?? '—'}</td>
      <td className="whitespace-nowrap py-2.5 px-3 font-medium text-foreground">
        {vehicle.make} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ''}
      </td>
      <td className="whitespace-nowrap py-2.5 px-3 text-muted-foreground">{vehicle.model_year ?? '—'}</td>
      <td className="whitespace-nowrap py-2.5 px-3">
        <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${statusClass}`}>
          {vehicle.status ?? 'unknown'}
        </span>
      </td>
      <td className="whitespace-nowrap py-2.5 px-3 text-right text-foreground font-medium">
        {price ? `PKR ${(price / 1_000_000).toFixed(2)}M` : '—'}
      </td>
      <td className="whitespace-nowrap py-2.5 px-3 text-right">
        <Link to={`/inventory/${vehicle.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          View <ArrowUpRight className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  );
}

// ── edit dialog (reuse form layout) ──────────────────────────────────────────
function DealershipEditDialog({
  open, onOpenChange, dealership, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealership: Dealership;
  saving: boolean;
  onSave: (payload: Partial<Dealership>) => void;
}) {
  const [form, setForm] = useState<Partial<Dealership>>(blank());
  const [brandInput, setBrandInput] = useState('');

  useEffect(() => {
    if (open) { setForm({ ...blank(), ...dealership }); setBrandInput(''); }
  }, [open, dealership]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dealership</DialogTitle>
          <DialogDescription>Update details for {dealership.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Name</Label>
              <Input value={form.owner_name ?? ''} onChange={e => set('owner_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input value={form.area ?? ''} onChange={e => set('area', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Employees</Label>
              <Input
                type="number" min={0}
                value={form.employee_count ?? ''}
                onChange={e => set('employee_count', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Hours</Label>
              <Input value={form.business_hours ?? ''} onChange={e => set('business_hours', e.target.value)} />
            </div>
          </div>
          {/* brands */}
          <div className="space-y-1.5">
            <Label>Brands</Label>
            <div className="flex gap-2">
              <Input
                value={brandInput}
                onChange={e => setBrandInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBrand(); } }}
                placeholder="Toyota, BMW…"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addBrand}>
                <Tag className="w-3.5 h-3.5 mr-1" />Add
              </Button>
            </div>
            {(form.brands ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(form.brands ?? []).map(b => (
                  <Badge key={b} variant="secondary" className="gap-1 pl-2 pr-1">
                    {b}
                    <button type="button" onClick={() => removeBrand(b)} className="ml-0.5 rounded-sm hover:bg-muted">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3} className="resize-none" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
