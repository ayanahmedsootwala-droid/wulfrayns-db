import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Phone, MessageSquare, MapPin, Pencil, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import PartyFormDialog from '@/components/party/PartyFormDialog';
import { fetchParties, deleteParty } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { Party } from '@/types/types';

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchParties({ search: search || undefined });
      setParties(data);
      setTotal(count);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleEdit = (p: Party) => { setEditTarget(p); setFormOpen(true); };
  const handleAdd = () => { setEditTarget(null); setFormOpen(true); };
  const handleSaved = (p: Party) => {
    setParties(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    setTotal(t => editTarget ? t : t + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteParty(deleteTarget.id);
      setParties(prev => prev.filter(p => p.id !== deleteTarget.id));
      setTotal(t => t - 1);
      toast.success('Party removed');
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
              Parties
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} client{total !== 1 ? 's' : ''} · non-dealer contacts</p>
          </div>
          <Button onClick={handleAdd} className="shrink-0 w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Party
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search parties…" className="pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{search ? 'No parties found' : 'No parties yet'}</p>
            <p className="text-sm mt-1">{search ? 'Try a different search' : 'Add your first party to get started'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {parties.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-sm">{p.name.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{p.name}</p>
                          {p.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{p.city}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">Party</Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Phone className="w-3 h-3" />{p.phone}
                          </a>
                        )}
                        {p.whatsapp && (
                          <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                            <MessageSquare className="w-3 h-3" />WhatsApp
                          </a>
                        )}
                      </div>

                      {(p.deals_done ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">{p.deals_done} deal{p.deals_done !== 1 ? 's' : ''} done</p>
                      )}

                      <div className="flex gap-2 pt-1 border-t border-border">
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs" onClick={() => handleEdit(p)}>
                          <Pencil className="w-3 h-3 mr-1" />Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="w-3 h-3 mr-1" />Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <PartyFormDialog open={formOpen} onOpenChange={setFormOpen} party={editTarget} onSaved={handleSaved} />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Party</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.name}</strong>? They will no longer appear in lists. Linked vehicles are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
