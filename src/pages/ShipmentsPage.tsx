import React, { useEffect, useState, useCallback } from 'react';
import {
  Ship, Plus, Edit2, Trash2, RefreshCw, X, Package,
  MapPin, Calendar, CheckCircle2, AlertCircle,
  Clock, Anchor, FileText, Download, ChevronDown, ChevronUp,
  TrendingUp, Truck, Globe, Hash, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { fetchShipments, createShipment, updateShipment, deleteShipment, type Shipment, type ShipmentStatus } from '@/lib/rpm-api';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; cls: string; icon: React.ElementType }> = {
  ordered:           { label: 'Ordered',           cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',     icon: Package },
  in_transit:        { label: 'In Transit',        cls: 'text-primary bg-primary/10 border-primary/20',        icon: Ship },
  customs_clearance: { label: 'Customs',           cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: AlertCircle },
  port_hold:         { label: 'Port Hold',         cls: 'text-red-400 bg-red-400/10 border-red-400/20',        icon: AlertCircle },
  delivered:         { label: 'Delivered',         cls: 'text-green-400 bg-green-400/10 border-green-400/20',  icon: CheckCircle2 },
  cancelled:         { label: 'Cancelled',         cls: 'text-muted-foreground bg-muted/30 border-border',     icon: X },
};

const BLANK: Partial<Shipment> = {
  origin_country: 'Japan', origin_port: 'Nagoya', destination_port: 'Karachi',
  status: 'ordered', vehicle_names: [], container_number: '', bl_number: '', vessel_name: '',
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Shipment> | null>(null);
  const [deleting, setDeleting] = useState<Shipment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicleInput, setVehicleInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setShipments(await fetchShipments()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...BLANK }); setVehicleInput(''); setDialogOpen(true); };
  const openEdit = (s: Shipment) => { setEditing({ ...s }); setVehicleInput((s.vehicle_names ?? []).join(', ')); setDialogOpen(true); };

  const save = async () => {
    setSaving(true);
    try {
      const names = vehicleInput.split(',').map(s => s.trim()).filter(Boolean);
      const payload = { ...editing, vehicle_names: names };
      if ((editing as Shipment).id) {
        await updateShipment((editing as Shipment).id, payload);
      } else {
        await createShipment(payload);
      }
      toast.success('Shipment saved');
      setDialogOpen(false); load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteShipment(deleting.id); toast.success('Deleted'); setDeleting(null); load(); }
    catch { toast.error('Failed'); }
  };

  const active = shipments.filter(s => !['delivered', 'cancelled'].includes(s.status));
  const completed = shipments.filter(s => s.status === 'delivered');

  // Timeline steps for a shipment
  const TIMELINE_STEPS: ShipmentStatus[] = ['ordered','in_transit','customs_clearance','port_hold','delivered'];

  function ShipmentTimeline({ s }: { s: Shipment }) {
    const idx = TIMELINE_STEPS.indexOf(s.status);
    const isCancelled = s.status === 'cancelled';
    return (
      <div className="flex items-center gap-0 mt-3 mb-1 overflow-x-auto pb-1">
        {TIMELINE_STEPS.map((step, i) => {
          const cfg = STATUS_CONFIG[step];
          const done = !isCancelled && i < idx;
          const current = !isCancelled && i === idx;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border text-[10px] transition-all',
                  done ? 'bg-primary border-primary text-primary-foreground' :
                  current ? 'bg-primary/20 border-primary text-primary' :
                  'bg-muted/30 border-border text-muted-foreground'
                )}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <cfg.icon className="w-3 h-3" />}
                </div>
                <span className={cn('text-[9px] mt-1 text-center max-w-[48px] leading-tight',
                  current ? 'text-primary font-semibold' : done ? 'text-foreground' : 'text-muted-foreground'
                )}>{cfg.label}</span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1 min-w-[16px]', done ? 'bg-primary' : 'bg-border')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Export CSV
  const exportCSV = () => {
    const headers = ['Ref','Status','Origin','Destination','Vessel','Container','BL','Vehicles','Departure','ETA','Cost PKR','Notes'];
    const rows = shipments.map(s => [
      s.shipment_ref, s.status, s.origin_port ?? s.origin_country ?? '', s.destination_port ?? '',
      s.vessel_name ?? '', s.container_number ?? '', s.bl_number ?? '',
      (s.vehicle_names ?? []).join(' | '), s.departure_date ?? '', s.eta ?? '',
      s.total_cost_pkr ?? '', s.notes ?? '',
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `shipments-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" /> Shipment Tracking
            </h1>
            <p className="text-xs text-muted-foreground">{active.length} active · {completed.length} delivered</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={exportCSV} title="Export CSV">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={load} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> Add Shipment
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {(['ordered', 'in_transit', 'customs_clearance', 'port_hold', 'delivered', 'cancelled'] as ShipmentStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = shipments.filter(sh => sh.status === s).length;
            return (
              <Card key={s} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <cfg.icon className={cn('w-4 h-4 shrink-0', cfg.cls.split(' ')[0])} />
                  <div>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{cfg.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Cargo Value', value: shipments.reduce((a,s) => a+(s.total_cost_pkr??0),0), format: (v:number) => v >= 1_000_000 ? `PKR ${(v/1_000_000).toFixed(1)}M` : `PKR ${v.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
            { label: 'Total Vehicles', value: shipments.reduce((a,s) => a+(s.vehicle_names?.length??0),0), format: (v:number) => `${v} units`, icon: Layers, color: 'text-blue-400' },
            { label: 'Arriving < 7 Days', value: shipments.filter(s => { const d = s.eta ? Math.ceil((new Date(s.eta).getTime()-Date.now())/86400000) : null; return d !== null && d >= 0 && d <= 7; }).length, format: (v:number) => `${v} shipments`, icon: Clock, color: 'text-yellow-400' },
            { label: 'Destinations', value: [...new Set(shipments.map(s=>s.destination_port).filter(Boolean))].length, format: (v:number) => `${v} ports`, icon: Globe, color: 'text-emerald-400' },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <stat.icon className={cn('w-4 h-4 shrink-0', stat.color)} />
                <div>
                  <p className="text-sm font-bold text-foreground">{stat.format(stat.value)}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Ship className="w-10 h-10 opacity-20" />
            <p className="text-sm">No shipments tracked yet</p>
            <Button size="sm" onClick={openNew}>Track First Shipment</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => {
              const cfg = STATUS_CONFIG[s.status];
              const daysToEta = s.eta ? Math.ceil((new Date(s.eta).getTime() - Date.now()) / 86400000) : null;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-border group hover:border-primary/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <cfg.icon className={cn('w-5 h-5 shrink-0 mt-0.5', cfg.cls.split(' ')[0])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-foreground">{s.shipment_ref}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', cfg.cls)}>{cfg.label}</span>
                            {s.bl_number && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Hash className="w-2.5 h-2.5"/>B/L: {s.bl_number}</span>}
                          </div>
                          {(s.vehicle_names ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(s.vehicle_names ?? []).map((v, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground flex items-center gap-1">
                                  <Truck className="w-2.5 h-2.5"/>{v}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.origin_port ?? s.origin_country} → {s.destination_port}</span>
                            {s.vessel_name && <span className="flex items-center gap-1"><Anchor className="w-3 h-3"/>{s.vessel_name}</span>}
                            {s.container_number && <span className="flex items-center gap-1"><Package className="w-3 h-3"/>{s.container_number}</span>}
                            {s.departure_date && <span className="flex items-center gap-1"><Ship className="w-3 h-3"/>Sailed: {new Date(s.departure_date).toLocaleDateString()}</span>}
                            {s.eta && (
                              <span className={cn('flex items-center gap-1 font-medium', daysToEta !== null && daysToEta <= 3 ? 'text-red-400' : daysToEta !== null && daysToEta <= 7 ? 'text-yellow-400' : 'text-primary')}>
                                <Calendar className="w-3 h-3" />ETA: {new Date(s.eta).toLocaleDateString()}
                                {daysToEta !== null && daysToEta > 0 && <span className="ml-1 text-[10px] bg-primary/10 px-1 py-0.5 rounded">{daysToEta}d</span>}
                                {daysToEta !== null && daysToEta <= 0 && <span className="ml-1 text-[10px] bg-red-400/10 text-red-400 px-1 py-0.5 rounded">OVERDUE</span>}
                              </span>
                            )}
                            {s.total_cost_pkr && <span className="flex items-center gap-1 text-emerald-400 font-medium"><FileText className="w-3 h-3"/>PKR {(s.total_cost_pkr/1_000_000).toFixed(2)}M</span>}
                          </div>
                          {/* Timeline */}
                          <ShipmentTimeline s={s} />
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={() => setDeleting(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      {s.notes && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">{s.notes}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border">
          <DialogHeader><DialogTitle>{(editing as Shipment)?.id ? 'Edit Shipment' : 'Track New Shipment'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-1">
              {[
                { label: 'Origin Country', key: 'origin_country', placeholder: 'Japan' },
                { label: 'Origin Port', key: 'origin_port', placeholder: 'Nagoya / Osaka / Tokyo' },
                { label: 'Destination Port', key: 'destination_port', placeholder: 'Karachi / Port Qasim' },
                { label: 'Container Number', key: 'container_number', placeholder: 'CSQU3054383' },
                { label: 'BL Number', key: 'bl_number', placeholder: 'HLCUTYP230900001' },
                { label: 'Vessel Name', key: 'vessel_name', placeholder: 'Eurasian Dream' },
                { label: 'Departure Date', key: 'departure_date', type: 'date' },
                { label: 'ETA (Port of Destination)', key: 'eta', type: 'date' },
                { label: 'Total Cost (PKR)', key: 'total_cost_pkr', type: 'number', placeholder: '2500000' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                  <Input type={type ?? 'text'} value={(editing as Record<string, string | number | undefined>)[key] as string ?? ''}
                    placeholder={placeholder}
                    onChange={e => setEditing(p => ({ ...p!, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="h-8 text-xs bg-muted/40" />
                </div>
              ))}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p!, status: v as ShipmentStatus }))}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [ShipmentStatus, { label: string }][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Vehicles (comma-separated)</Label>
                <Input value={vehicleInput} onChange={e => setVehicleInput(e.target.value)}
                  placeholder="Toyota Land Cruiser 2022, Honda Vezel 2021" className="h-8 text-xs bg-muted/40" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                <textarea value={(editing as Partial<Shipment> & { notes?: string }).notes ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, notes: e.target.value }))}
                  placeholder="Additional notes, special instructions..."
                  className="w-full h-16 text-xs bg-muted/40 border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment?</AlertDialogTitle>
            <AlertDialogDescription>Remove tracking for {deleting?.shipment_ref}?</AlertDialogDescription>
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
