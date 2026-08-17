import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Star, Phone, MessageSquare, MapPin,
  Users, Calendar, Pencil, Trash2, Filter, SortAsc, SortDesc,
  Building2, Mail, ChevronRight, X, Car, TrendingUp, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import WhatsAppActions from '@/components/common/WhatsAppActions';
import DealerFormDialog from '@/components/dealer/DealerFormDialog';
import { fetchDealers, deleteDealer, logActivity, fetchVehicles } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Dealer } from '@/types/types';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'deals_done', label: 'Most Deals' },
  { value: 'trust_score', label: 'Trust Score' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'last_contact_at', label: 'Recently Contacted' },
];

const CITY_OPTIONS = ['All Cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Faisalabad', 'Multan'];

export default function DealersPage() {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [sortBy, setSortBy] = useState('rating');
  const [page, setPage] = useState(1);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Dealer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dealer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDealers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchDealers({
        page, pageSize: 24,
        search: search || undefined,
        city: cityFilter !== 'All Cities' ? cityFilter : undefined,
        is_favorite: favOnly || undefined,
      });
      // Client-side sort
      const sorted = [...data].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'last_contact_at') return (b.last_contact_at ?? '').localeCompare(a.last_contact_at ?? '');
        const aVal = (a as unknown as Record<string, number | undefined>)[sortBy] ?? 0;
        const bVal = (b as unknown as Record<string, number | undefined>)[sortBy] ?? 0;
        return bVal - aVal;
      });
      setDealers(sorted);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, [page, search, favOnly, cityFilter, sortBy]);

  useEffect(() => {
    const t = setTimeout(loadDealers, 300);
    return () => clearTimeout(t);
  }, [loadDealers]);

  // Load per-dealer vehicle counts
  useEffect(() => {
    if (dealers.length === 0) return;
    Promise.all(
      dealers.map(d => fetchVehicles({ dealer_id: d.id, pageSize: 1 }).then(r => ({ id: d.id, count: r.count })))
    ).then(results => {
      const map: Record<string, number> = {};
      results.forEach(r => { map[r.id] = r.count; });
      setVehicleCounts(map);
    });
  }, [dealers]);

  const openAdd = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (dealer: Dealer) => { setEditTarget(dealer); setFormOpen(true); };

  const handleSaved = (saved: Dealer) => {
    setDealers(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    if (!editTarget) setTotal(t => t + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDealer(deleteTarget.id);
      await logActivity({
        action_type: 'dealer_deleted', entity_type: 'dealer',
        entity_id: deleteTarget.id, entity_name: deleteTarget.name,
        description: `Dealer removed: ${deleteTarget.name}`,
      });
      setDealers(prev => prev.filter(d => d.id !== deleteTarget.id));
      setTotal(t => t - 1);
      toast.success(`${deleteTarget.name} deleted`);
    } catch {
      toast.error('Failed to delete dealer');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const activeFilters = [favOnly, cityFilter !== 'All Cities'].filter(Boolean).length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dealers</h1>
            <p className="text-sm text-muted-foreground">{total} total dealers</p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add Dealer
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search dealers…" className="pl-9 h-8 bg-muted/50 border-border text-sm" />
            {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}><X className="w-3.5 h-3.5" /></button>}
          </div>

          {/* City filter */}
          <Select value={cityFilter} onValueChange={v => { setCityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs bg-muted/50 border-border">
              <MapPin className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-36 text-xs bg-muted/50 border-border">
              <SortAsc className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Favorites toggle */}
          <button
            onClick={() => { setFavOnly(!favOnly); setPage(1); }}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border h-8', favOnly ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground')}
          >
            <Star className={cn('w-3.5 h-3.5', favOnly && 'fill-yellow-400')} />Favorites
          </button>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => { setCityFilter('All Cities'); setFavOnly(false); setSearch(''); }}>
              <X className="w-3 h-3" />Clear
            </Button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-muted" />
                  <div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-32 bg-muted" /><Skeleton className="h-3 w-20 bg-muted" /></div>
                </div>
              </CardContent>
            </Card>
          )) : dealers.map(dealer => (
            <DealerCard
              key={dealer.id}
              dealer={dealer}
              vehicleCount={vehicleCounts[dealer.id]}
              onEdit={() => openEdit(dealer)}
              onDelete={() => setDeleteTarget(dealer)}
              onView={() => navigate(`/dealers/${dealer.id}`)}
            />
          ))}
        </div>

        {!loading && dealers.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">No dealers found</p>
            <p className="text-xs text-muted-foreground">Add your first dealer or adjust filters</p>
          </div>
        )}

        {/* Pagination */}
        {Math.ceil(total / 24) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / 24)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 24)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <DealerFormDialog open={formOpen} onClose={() => setFormOpen(false)} dealer={editTarget} onSaved={handleSaved} />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Dealer?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <strong className="text-foreground">{deleteTarget?.name}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

interface DealerCardProps {
  dealer: Dealer;
  vehicleCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

function DealerCard({ dealer, vehicleCount, onEdit, onDelete, onView }: DealerCardProps) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="bg-card border-border hover:border-primary/30 transition-colors h-full">
        <CardContent className="p-4">
          {/* Header: avatar + name + actions */}
          <div className="flex items-start justify-between mb-3 gap-2">
            <button onClick={onView} className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {dealer.name.charAt(0)}
                </div>
                {dealer.is_favorite && <Star className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{dealer.name}</p>
                <p className="text-xs text-muted-foreground">{dealer.city}{dealer.area ? `, ${dealer.area}` : ''}</p>
              </div>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={onView} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[
              { label: 'Deals', value: dealer.deals_done ?? 0 },
              { label: 'Trust', value: dealer.trust_score ?? 0 },
              { label: 'Cars', value: vehicleCount ?? '—' },
            ].map(s => (
              <div key={s.label} className="text-center p-1.5 rounded bg-muted/30 border border-border/50">
                <p className="text-sm font-semibold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact row */}
          <div className="space-y-1.5 mb-3">
            {dealer.phone && (
              <a href={`tel:${dealer.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-3 h-3 text-primary shrink-0" /><span className="truncate">{dealer.phone}</span>
              </a>
            )}
            {dealer.email && (
              <a href={`mailto:${dealer.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3 h-3 text-primary shrink-0" /><span className="truncate">{dealer.email}</span>
              </a>
            )}
          </div>

          {/* Tags */}
          {dealer.tags && dealer.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {dealer.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{tag}</span>
              ))}
            </div>
          )}

          {/* Rating stars */}
          {dealer.rating && dealer.rating > 0 && (
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('w-3 h-3', i < Math.round(dealer.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{dealer.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dealer.last_contact_at ? formatRelativeTime(dealer.last_contact_at) : 'No contact'}
            </span>
            <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
              <WhatsAppActions dealer={dealer} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

