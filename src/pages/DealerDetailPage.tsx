import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageSquare, Star, Edit2, Plus, MapPin,
  Calendar, Tag, TrendingUp, Car, ChevronRight, Clock, Save, X, Trash2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import DealerFormDialog from '@/components/dealer/DealerFormDialog';
import {
  fetchDealer, fetchDealerInteractions, fetchVehicles,
  createDealerInteraction, updateDealer, deleteDealer, logActivity, createDealer
} from '@/lib/api';
import { formatDate, formatCurrency, formatRelativeTime, cn } from '@/lib/utils';
import type { Dealer, DealerInteraction, Vehicle } from '@/types/types';
import { toast } from 'sonner';

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [interactions, setInteractions] = useState<DealerInteraction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<DealerInteraction['interaction_type']>('note');
  const [addingNote, setAddingNote] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return; }
    Promise.all([
      fetchDealer(id),
      fetchDealerInteractions(id),
      fetchVehicles({ dealer_id: id, pageSize: 12 } as Parameters<typeof fetchVehicles>[0]),
    ]).then(([d, i, v]) => {
      setDealer(d);
      setInteractions(i);
      setVehicles(v.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    setAddingNote(true);
    try {
      await createDealerInteraction({ dealer_id: id, interaction_type: noteType, notes: newNote, title: noteType.charAt(0).toUpperCase() + noteType.slice(1) });
      await updateDealer(id, { last_contact_at: new Date().toISOString() });
      await logActivity({ action_type: 'dealer_interaction', entity_type: 'dealer', entity_id: id, entity_name: dealer?.name, description: `${noteType} logged with ${dealer?.name}` });
      toast.success('Note added');
      setNewNote('');
      const i = await fetchDealerInteractions(id);
      setInteractions(i);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteDealer = async () => {
    if (!id || !dealer) return;
    setDeleting(true);
    try {
      await deleteDealer(id);
      await logActivity({ action_type: 'dealer_deleted', entity_type: 'dealer', entity_id: id, entity_name: dealer.name, description: `Dealer removed: ${dealer.name}` });
      toast.success(`${dealer.name} deleted`);
      navigate('/dealers');
    } catch {
      toast.error('Failed to delete dealer');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const toggleFavorite = async () => {
    if (!id || !dealer) return;
    await updateDealer(id, { is_favorite: !dealer.is_favorite });
    setDealer(d => d ? { ...d, is_favorite: !d.is_favorite } : d);
  };

  if (loading) return <AppLayout><LoadingSkeleton /></AppLayout>;
  if (id === 'new') return <AddDealerForm onSave={(d) => navigate(`/dealers/${d.id}`)} onCancel={() => navigate('/dealers')} />;
  if (!dealer) return <AppLayout><div className="p-8 text-center text-muted-foreground">Dealer not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/dealers" className="hover:text-foreground transition-colors">Dealers</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{dealer.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dealers')} className="mt-0.5 text-muted-foreground shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
              {dealer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">{dealer.name}</h1>
                {dealer.tags?.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                {dealer.dealership && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{dealer.dealership.name}</span>}
                {dealer.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dealer.city}{dealer.area ? `, ${dealer.area}` : ''}</span>}
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  {dealer.rating?.toFixed(1)} · {dealer.trust_score}% trust
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button onClick={toggleFavorite} className="p-2 rounded-md hover:bg-muted/50 transition-colors">
              <Star className={cn('w-4 h-4', dealer.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
            </button>
            {dealer.phone && (
              <a href={`tel:${dealer.phone}`}>
                <Button variant="outline" size="sm" className="border-border text-xs gap-1.5">
                  <Phone className="w-3 h-3" />{dealer.phone}
                </Button>
              </a>
            )}
            <Button
              variant="outline" size="sm"
              onClick={() => setEditOpen(true)}
              className="border-border text-xs gap-1.5 h-8"
            >
              <Pencil className="w-3 h-3" />Edit
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setDeleteOpen(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1.5 h-8"
            >
              <Trash2 className="w-3 h-3" />Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Contact Info</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {dealer.phone && (
                  <a href={`tel:${dealer.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />{dealer.phone}
                  </a>
                )}
                {dealer.whatsapp && (
                  <a href={`https://wa.me/${dealer.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-400">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-green-400" />{dealer.whatsapp}
                  </a>
                )}
                {dealer.email && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Tag className="w-3.5 h-3.5 shrink-0" />{dealer.email}</p>}
                {dealer.address && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5 shrink-0" />{dealer.address}</p>}
                {dealer.last_contact_at && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3 shrink-0" />Last contact: {formatRelativeTime(dealer.last_contact_at)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Business Stats</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Deals', value: dealer.deals_done || 0 },
                    { label: 'Trust Score', value: `${dealer.trust_score || 0}%` },
                    { label: 'Receivables', value: formatCurrency(dealer.receivables) },
                    { label: 'Payables', value: formatCurrency(dealer.payables) },
                  ].map(s => (
                    <div key={s.label} className="p-2.5 rounded-md bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-semibold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preferred Brands */}
            {dealer.preferred_brands && dealer.preferred_brands.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Preferred Brands</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {dealer.preferred_brands.map(b => (
                      <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{b}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="timeline">
              <TabsList className="bg-muted/50 border border-border mb-4 h-9">
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="inventory" className="text-xs">Inventory ({vehicles.length})</TabsTrigger>
                <TabsTrigger value="log" className="text-xs">Log Interaction</TabsTrigger>
              </TabsList>

              {/* Timeline */}
              <TabsContent value="timeline">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    {interactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No interactions recorded yet</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-4">
                          {interactions.map((interaction) => (
                            <div key={interaction.id} className="flex items-start gap-4 relative">
                              <div className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 bg-background z-10', typeStyles[interaction.interaction_type]?.border || 'border-border')}>
                                <span className="text-xs">{typeStyles[interaction.interaction_type]?.icon || '•'}</span>
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn('text-xs font-medium', typeStyles[interaction.interaction_type]?.text || 'text-foreground')}>
                                    {interaction.interaction_type.charAt(0).toUpperCase() + interaction.interaction_type.slice(1)}
                                  </span>
                                  {interaction.title && <span className="text-xs text-muted-foreground">· {interaction.title}</span>}
                                  <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(interaction.created_at)}</span>
                                </div>
                                {interaction.notes && <p className="text-sm text-foreground mt-0.5 leading-relaxed">{interaction.notes}</p>}
                                {interaction.amount && <p className="text-xs text-primary mt-0.5">{formatCurrency(interaction.amount)}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Inventory */}
              <TabsContent value="inventory">
                {vehicles.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No vehicles linked to this dealer</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vehicles.map(v => (
                      <Link key={v.id} to={`/inventory/${v.id}`}>
                        <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Car className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{v.make} {v.model} {v.variant}</p>
                              <p className="text-xs text-muted-foreground">{v.color} · {v.model_year}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-foreground">{formatCurrency(v.expected_selling_price)}</p>
                              <span className={cn('text-xs px-1.5 py-0.5 rounded border', v.status === 'available' ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-muted text-muted-foreground border-border')}>{v.status}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Log */}
              <TabsContent value="log">
                <Card className="bg-card border-border">
                  <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Log New Interaction</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(['call', 'whatsapp', 'meeting', 'deal', 'payment', 'note', 'visit'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setNoteType(t)}
                          className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors border', noteType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground')}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Add notes about this interaction..."
                      className="bg-muted/50 border-border resize-none text-sm"
                      rows={4}
                    />
                    <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                      {addingNote ? 'Saving...' : 'Add to Timeline'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <DealerFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        dealer={dealer}
        onSaved={updated => setDealer(updated)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Dealer?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <strong className="text-foreground">{dealer?.name}</strong> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDealer}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              {deleting ? 'Deleting…' : 'Delete Dealer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

const typeStyles: Record<string, { border: string; text: string; icon: string }> = {
  call: { border: 'border-blue-400', text: 'text-blue-400', icon: '📞' },
  whatsapp: { border: 'border-green-400', text: 'text-green-400', icon: '💬' },
  meeting: { border: 'border-purple-400', text: 'text-purple-400', icon: '🤝' },
  deal: { border: 'border-primary', text: 'text-primary', icon: '✅' },
  payment: { border: 'border-yellow-400', text: 'text-yellow-400', icon: '💰' },
  note: { border: 'border-border', text: 'text-foreground', icon: '📝' },
  visit: { border: 'border-orange-400', text: 'text-orange-400', icon: '🏪' },
};

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-6 w-32 bg-muted" />
      <div className="flex gap-4">
        <Skeleton className="w-14 h-14 rounded-full bg-muted" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 bg-muted" />
          <Skeleton className="h-4 w-60 bg-muted" />
        </div>
      </div>
    </div>
  );
}

function AddDealerForm({ onSave, onCancel }: { onSave: (d: Dealer) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Dealer>>({ city: '', area: '', phone: '', whatsapp: '', name: '' });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof Dealer, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Dealer name is required'); return; }
    setSaving(true);
    try {
      const { data, error } = await (await import('@/db/supabase')).supabase
        .from('dealers').insert(form).select('*').single();
      if (error) throw error;
      await logActivity({ action_type: 'dealer_added', entity_type: 'dealer', entity_id: data.id, entity_name: data.name, description: `New dealer added: ${data.name}` });
      toast.success('Dealer added');
      onSave(data as Dealer);
    } catch {
      toast.error('Failed to save dealer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[800px] mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-muted-foreground w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Add New Dealer</h1>
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Dealer Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Dealer name" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+92 300 0000000" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                <Input value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="+92 300 0000000" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="City" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Area</Label>
                <Input value={form.area || ''} onChange={e => set('area', e.target.value)} placeholder="Area / Market" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contact Person</Label>
                <Input value={(form as Record<string, string>).contact_person || ''} onChange={e => set('contact_person' as keyof Dealer, e.target.value)} placeholder="Contact person name" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onCancel} className="border-border text-xs h-8">
                <X className="w-3.5 h-3.5 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs h-8">
                <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving…' : 'Save Dealer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
