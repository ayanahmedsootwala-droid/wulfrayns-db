import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Download, Image as ImageIcon, X, ZoomIn,
  ChevronLeft, ChevronRight, Star, Calendar, Grid3X3,
  LayoutList, RefreshCw, ExternalLink, Upload, Clipboard,
  Trash2, Car, CheckCircle2, AlertCircle, Loader2,
  Filter, SortAsc, Eye, ImageOff, PlusCircle, FolderOpen, Copy, Link2, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GalleryImage {
  id: string;
  vehicle_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  notes?: string;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    variant?: string;
    stock_number?: string;
    year?: number;
  };
}

interface UploadItem {
  id: string;
  file?: File;
  url?: string;
  name: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

type ViewMode = 'masonry' | 'grid' | 'list';
type GroupMode = 'vehicle' | 'date' | 'none';
type SortMode = 'newest' | 'oldest' | 'vehicle';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function queryImages(search?: string, sort: SortMode = 'newest'): Promise<GalleryImage[]> {
  const order = sort === 'oldest' ? true : false;
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*, vehicle:vehicles(id,make,model,variant,stock_number)')
    .order('created_at', { ascending: order });
  if (error) throw error;
  let rows = (data ?? []) as GalleryImage[];
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      `${r.vehicle?.make ?? ''} ${r.vehicle?.model ?? ''} ${r.vehicle?.variant ?? ''} ${r.vehicle?.stock_number ?? ''}`.toLowerCase().includes(s)
    );
  }
  if (sort === 'vehicle') {
    rows.sort((a, b) =>
      `${a.vehicle?.make}${a.vehicle?.model}`.localeCompare(`${b.vehicle?.make}${b.vehicle?.model}`)
    );
  }
  return rows;
}

async function uploadFile(file: File, vehicleId: string, onProgress?: (p: number) => void): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  onProgress?.(25);
  const { error: upErr } = await supabase.storage.from('vehicle-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) throw upErr;
  onProgress?.(65);
  const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path);
  const { error: dbErr } = await supabase.from('vehicle_images').insert({
    vehicle_id: vehicleId, storage_path: path, url: data.publicUrl, sort_order: 0, is_primary: false,
  });
  if (dbErr) throw dbErr;
  onProgress?.(100);
  return data.publicUrl;
}

async function insertUrlImage(url: string, vehicleId: string): Promise<void> {
  const { error } = await supabase.from('vehicle_images').insert({
    vehicle_id: vehicleId, storage_path: url, url, sort_order: 0, is_primary: false,
  });
  if (error) throw error;
}

// ─── Upload Dialog ─────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [csvText, setCsvText] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from('vehicles').select('id,make,model,variant,stock_number').order('make').then(({ data }) => {
      setVehicles((data ?? []).map(v => ({
        id: v.id,
        label: `${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}${v.stock_number ? ' · ' + v.stock_number : ''}`,
      })));
    });
    setItems([]); setCsvText(''); setVehicleId(''); setCsvOpen(false);
  }, [open]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadItem[] = Array.from(files).map(f => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: 'pending',
      progress: 0,
    }));
    setItems(p => [...p, ...newItems]);
  };

  const parseCsv = () => {
    const urls = csvText.split(/[\n,;]+/).map(s => s.trim()).filter(s => /^https?:\/\//.test(s));
    if (!urls.length) { toast.error('No valid URLs found'); return; }
    const newItems: UploadItem[] = urls.map(url => ({
      id: crypto.randomUUID(), url,
      name: url.split('/').pop()?.slice(0, 40) ?? url.slice(-30),
      status: 'pending', progress: 0,
    }));
    setItems(p => [...p, ...newItems]);
    setCsvText(''); setCsvOpen(false);
    toast.success(`${urls.length} URL${urls.length > 1 ? 's' : ''} queued`);
  };

  const removeItem = (id: string) => {
    setItems(p => {
      const item = p.find(i => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return p.filter(i => i.id !== id);
    });
  };

  const runUpload = async () => {
    if (!vehicleId) { toast.error('Select a vehicle first'); return; }
    if (!items.length) { toast.error('Add files or URLs first'); return; }
    setUploading(true);
    let ok = 0, fail = 0;
    for (const item of items) {
      if (item.status === 'done') continue;
      setItems(p => p.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 10 } : i));
      try {
        if (item.file) {
          await uploadFile(item.file, vehicleId, p => setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: p } : i)));
        } else if (item.url) {
          await insertUrlImage(item.url, vehicleId);
        }
        setItems(p => p.map(i => i.id === item.id ? { ...i, status: 'done', progress: 100 } : i));
        ok++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setItems(p => p.map(i => i.id === item.id ? { ...i, status: 'error', error: msg, progress: 0 } : i));
        fail++;
      }
    }
    setUploading(false);
    if (ok > 0) { toast.success(`${ok} image${ok > 1 ? 's' : ''} uploaded`); onDone(); }
    if (fail > 0) toast.error(`${fail} failed`);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4 text-primary" /> Upload Vehicle Images
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Vehicle picker */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-bold">Vehicle *</p>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-9 text-xs bg-muted/30"><SelectValue placeholder="Select from inventory…" /></SelectTrigger>
              <SelectContent className="max-h-52">
                {vehicles.map(v => <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
            onDragLeave={e => e.currentTarget.classList.remove('border-primary', 'bg-primary/5')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); addFiles(e.dataTransfer.files); }}
          >
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
            <p className="text-sm font-semibold text-foreground">Drop images here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, HEIC — select multiple</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>

          {/* CSV URL paste toggle */}
          <div>
            <button
              onClick={() => setCsvOpen(v => !v)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              {csvOpen ? 'Hide URL Paste' : 'Paste Image URLs (CSV / one per line)'}
            </button>
            <AnimatePresence>
              {csvOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 space-y-2"
                >
                  <Textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    placeholder={"https://example.com/car1.jpg\nhttps://example.com/car2.jpg, https://cdn.site/img3.webp"}
                    className="text-xs bg-muted/30 border-border font-mono min-h-[80px] resize-none"
                  />
                  <Button size="sm" variant="outline" className="h-7 text-xs border-border gap-1.5" onClick={parseCsv} disabled={!csvText.trim()}>
                    <Clipboard className="w-3 h-3" /> Parse & Queue URLs
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Queue */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{items.length} item{items.length > 1 ? 's' : ''} queued</p>
                <button onClick={() => setItems([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Clear all</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className={cn(
                    'relative rounded-xl overflow-hidden border-2 bg-muted/30 transition-all',
                    item.status === 'done' ? 'border-emerald-500/50' : item.status === 'error' ? 'border-red-500/50' : 'border-border'
                  )}>
                    {item.preview
                      ? <img src={item.preview} className="w-full aspect-[4/3] object-cover" alt="" />
                      : <div className="w-full aspect-[4/3] flex items-center justify-center bg-muted/50">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                    }
                    {/* Status overlay */}
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                        <div className="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2">
                        <p className="text-[9px] text-red-300 text-center">{item.error ?? 'Error'}</p>
                      </div>
                    )}
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[9px] text-white truncate">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t border-border">
            <Button variant="ghost" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 h-9 text-sm gap-2" onClick={runUpload}
              disabled={uploading || !items.length || !vehicleId}>
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                : <><Upload className="w-4 h-4" />Upload {items.length > 0 ? `${items.filter(i => i.status !== 'done').length} ` : ''}Image{items.length !== 1 ? 's' : ''}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Image Card (Grid) ────────────────────────────────────────────────────────
function ImageCard({ img, onOpen, onDelete, onDownload, onCopyLink, onTag, isDeleting }: {
  img: GalleryImage;
  onOpen: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
  onTag: () => void;
  isDeleting: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="relative group rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/40 transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="aspect-[4/3] overflow-hidden">
        {!errored ? (
          <>
            {!loaded && <Skeleton className="absolute inset-0 bg-muted" />}
            <img
              src={img.url}
              alt=""
              className={cn('w-full h-full object-cover group-hover:scale-105 transition-transform duration-500', !loaded && 'opacity-0')}
              onLoad={() => setLoaded(true)}
              onError={() => { setErrored(true); setLoaded(true); }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-xs font-semibold text-white truncate">
            {img.vehicle ? `${img.vehicle.make} ${img.vehicle.model}` : 'Unlinked'}
          </p>
          {img.vehicle?.variant && <p className="text-[10px] text-white/70 truncate">{img.vehicle.variant}</p>}
          {img.notes && <p className="text-[9px] text-white/50 truncate mt-0.5">{img.notes}</p>}
        </div>
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button onClick={e => { e.stopPropagation(); onCopyLink(); }}
            className="w-7 h-7 bg-white/20 hover:bg-white/40 backdrop-blur rounded-lg flex items-center justify-center transition-colors"
            title="Copy link">
            <Link2 className="w-3 h-3 text-white" />
          </button>
          <button onClick={e => { e.stopPropagation(); onTag(); }}
            className="w-7 h-7 bg-white/20 hover:bg-white/40 backdrop-blur rounded-lg flex items-center justify-center transition-colors"
            title="Edit tags">
            <Tag className="w-3 h-3 text-white" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDownload(); }}
            className="w-7 h-7 bg-white/20 hover:bg-white/40 backdrop-blur rounded-lg flex items-center justify-center transition-colors">
            <Download className="w-3 h-3 text-white" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 bg-red-500/70 hover:bg-red-500/90 backdrop-blur rounded-lg flex items-center justify-center transition-colors">
            {isDeleting ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Trash2 className="w-3 h-3 text-white" />}
          </button>
        </div>
      </div>

      {/* Primary badge */}
      {img.is_primary && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
          <Star className="w-2 h-2 fill-current" /> Cover
        </div>
      )}
    </motion.div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose, onNavigate }: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const img = images[index];
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, images.length, onClose, onNavigate]);

  if (!img) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Nav buttons */}
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors">
        <X className="w-5 h-5" />
      </button>

      {/* Image */}
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col items-center gap-4 max-w-5xl w-full px-16"
        onClick={e => e.stopPropagation()}
      >
        <img src={img.url} alt="" className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl" />
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-2xl px-5 py-2.5 text-white text-xs flex-wrap justify-center">
          {img.vehicle && (
            <span className="font-bold">
              {img.vehicle.make} {img.vehicle.model}{img.vehicle.variant ? ' ' + img.vehicle.variant : ''}
              {img.vehicle.year ? ` (${img.vehicle.year})` : ''}
            </span>
          )}
          {img.vehicle?.stock_number && <span className="text-white/60 font-mono">{img.vehicle.stock_number}</span>}
          <span className="text-white/50">{fmtDate(img.created_at)}</span>
          {img.is_primary && <span className="text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Cover Photo</span>}
          <span className="text-white/40">{index + 1} / {images.length}</span>
          {img.vehicle?.id && (
            <Link to={`/inventory/${img.vehicle.id}`}
              className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3" /> View Listing
            </Link>
          )}
        </div>
      </motion.div>

      {/* Filmstrip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 overflow-x-auto">
          {images.map((im, i) => (
            <button key={im.id} onClick={e => { e.stopPropagation(); onNavigate(i); }}
              className={cn(
                'w-12 h-8 rounded-lg overflow-hidden border-2 shrink-0 transition-all',
                i === index ? 'border-primary scale-110' : 'border-white/20 hover:border-white/50 opacity-60 hover:opacity-100'
              )}>
              <img src={im.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Gallery Page ────────────────────────────────────────────────────────
export default function ImageGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [group, setGroup] = useState<GroupMode>('vehicle');
  const [sort, setSort] = useState<SortMode>('newest');
  const [filter, setFilter] = useState<'all' | 'primary' | 'unlinked'>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await queryImages(search || undefined, sort);
      setImages(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load images';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [search, sort]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  // Filtered images
  const filtered = images.filter(img => {
    if (filter === 'primary') return img.is_primary;
    if (filter === 'unlinked') return !img.vehicle;
    return true;
  });

  // Grouped images
  const grouped = React.useMemo(() => {
    if (group === 'none') return { 'All Images': filtered };
    if (group === 'date') {
      const map: Record<string, GalleryImage[]> = {};
      for (const img of filtered) { const k = fmtMonth(img.created_at); (map[k] ??= []).push(img); }
      return map;
    }
    // by vehicle
    const map: Record<string, GalleryImage[]> = {};
    for (const img of filtered) {
      const k = img.vehicle
        ? `${img.vehicle.make} ${img.vehicle.model}${img.vehicle.variant ? ' ' + img.vehicle.variant : ''}${img.vehicle.year ? ' (' + img.vehicle.year + ')' : ''}${img.vehicle.stock_number ? ' · ' + img.vehicle.stock_number : ''}`
        : 'Unlinked Photos';
      (map[k] ??= []).push(img);
    }
    return map;
  }, [filtered, group]);

  const flatFiltered = filtered;

  const handleDelete = async (img: GalleryImage) => {
    setDeletingId(img.id);
    try {
      if (img.storage_path && !img.storage_path.startsWith('http')) {
        await supabase.storage.from('vehicle-images').remove([img.storage_path]);
      }
      const { error } = await supabase.from('vehicle_images').delete().eq('id', img.id);
      if (error) throw error;
      setImages(p => p.filter(i => i.id !== img.id));
      toast.success('Image deleted');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
    finally { setDeletingId(null); }
  };

  const handleDownload = async (img: GalleryImage) => {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${img.vehicle?.make ?? 'rpm'}-${img.vehicle?.model ?? ''}-${img.id.slice(0, 6)}.jpg`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleCopyLink = (img: GalleryImage) => {
    navigator.clipboard.writeText(img.url).then(
      () => toast.success('Image link copied to clipboard'),
      () => toast.error('Failed to copy link'),
    );
  };

  const [tagInput, setTagInput] = useState('');
  const [tagTarget, setTagTarget] = useState<GalleryImage | null>(null);
  const handleSaveTag = async () => {
    if (!tagTarget) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    try {
      await supabase.from('vehicle_images').update({ notes: tags.join(', ') }).eq('id', tagTarget.id);
      setImages(prev => prev.map(i => i.id === tagTarget.id ? { ...i, notes: tags.join(', ') } : i));
      toast.success('Tags saved');
      setTagTarget(null);
      setTagInput('');
    } catch { toast.error('Failed to save tags'); }
  };

  const stats = {
    total: images.length,
    linked: images.filter(i => i.vehicle).length,
    primary: images.filter(i => i.is_primary).length,
    vehicles: new Set(images.map(i => i.vehicle_id).filter(Boolean)).size,
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-primary-foreground" />
                </div>
                Vehicle Image Gallery
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.total} photos · {stats.vehicles} vehicles · {stats.primary} cover photos
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border" onClick={load}>
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setUploadOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5" /> Upload Photos
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total Photos', value: stats.total },
              { label: 'Vehicles Covered', value: stats.vehicles },
              { label: 'Cover Photos', value: stats.primary },
              { label: 'Unlinked', value: stats.total - stats.linked },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 rounded-xl px-3 py-2 border border-border">
                <p className="text-lg font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex gap-2 px-6 py-2.5 border-b border-border shrink-0 flex-wrap items-center">
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search make, model, stock #…"
              className="pl-8 h-8 bg-muted/40 text-xs" />
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={v => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-8 w-32 text-xs bg-muted/40 border-border gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Photos</SelectItem>
              <SelectItem value="primary">Cover Only</SelectItem>
              <SelectItem value="unlinked">Unlinked</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={v => setSort(v as SortMode)}>
            <SelectTrigger className="h-8 w-32 text-xs bg-muted/40 border-border gap-1">
              <SortAsc className="w-3 h-3 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="vehicle">By Vehicle</SelectItem>
            </SelectContent>
          </Select>

          {/* Group */}
          <Select value={group} onValueChange={v => setGroup(v as GroupMode)}>
            <SelectTrigger className="h-8 w-36 text-xs bg-muted/40 border-border gap-1">
              <Eye className="w-3 h-3 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">Group by Vehicle</SelectItem>
              <SelectItem value="date">Group by Month</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode */}
          <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
            {(['grid', 'masonry', 'list'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn(
                  'flex items-center justify-center w-8 h-8 border-r border-border last:border-r-0 transition-colors',
                  view === v ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                )}>
                {v === 'grid'    && <Grid3X3 className="w-3.5 h-3.5" />}
                {v === 'masonry' && <LayoutList className="w-3.5 h-3.5 rotate-90" />}
                {v === 'list'    && <LayoutList className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground ml-auto shrink-0">{filtered.length} shown</p>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-8">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-sm text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button size="sm" variant="ghost" onClick={load} className="h-7 text-xs">Retry</Button>
            </div>
          )}

          {loading ? (
            <div className={cn(
              view === 'list' ? 'space-y-2' :
              view === 'masonry' ? 'columns-2 md:columns-3 lg:columns-5 gap-3' :
              'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'
            )}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={view === 'masonry' ? 'mb-3 break-inside-avoid' : ''}>
                  <Skeleton className={cn('rounded-2xl bg-muted', view === 'masonry' ? `aspect-[${i % 3 === 0 ? '3/4' : i % 3 === 1 ? '4/3' : '1/1'}]` : 'aspect-[4/3]')} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-muted/40 border border-border flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">No images yet</p>
                <p className="text-sm text-muted-foreground mt-1">Upload photos to vehicles to build your gallery</p>
              </div>
              <Button onClick={() => setUploadOpen(true)} className="gap-2 mt-2">
                <Upload className="w-4 h-4" /> Upload First Photos
              </Button>
            </div>
          ) : (
            Object.entries(grouped).map(([groupKey, groupImgs]) => (
              <div key={groupKey}>
                {/* Group header */}
                {group !== 'none' && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{groupKey}</h3>
                      <p className="text-[10px] text-muted-foreground">{groupImgs.length} photo{groupImgs.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="text-[10px] bg-muted/50 text-muted-foreground border-border">{groupImgs.length}</Badge>
                      {groupImgs[0]?.vehicle?.id && (
                        <Link to={`/inventory/${groupImgs[0].vehicle!.id}`}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Grid view */}
                {view === 'grid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <AnimatePresence>
                      {groupImgs.map(img => {
                        const globalIdx = flatFiltered.findIndex(i => i.id === img.id);
                        return (
                          <ImageCard key={img.id} img={img}
                            onOpen={() => setLightboxIdx(globalIdx)}
                            onDelete={() => handleDelete(img)}
                            onDownload={() => handleDownload(img)}
                            onCopyLink={() => handleCopyLink(img)}
                            onTag={() => { setTagTarget(img); setTagInput(img.notes ?? ''); }}
                            isDeleting={deletingId === img.id}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Masonry view */}
                {view === 'masonry' && (
                  <div className="columns-2 md:columns-3 lg:columns-5 gap-3">
                    {groupImgs.map(img => {
                      const globalIdx = flatFiltered.findIndex(i => i.id === img.id);
                      return (
                        <motion.div key={img.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="mb-3 break-inside-avoid relative group rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/40 transition-all cursor-pointer"
                          onClick={() => setLightboxIdx(globalIdx)}
                        >
                          <img src={img.url} alt="" className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={e => { (e.target as HTMLImageElement).parentElement!.classList.add('min-h-24'); (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
                              <p className="text-[10px] text-white font-semibold truncate flex-1">
                                {img.vehicle ? `${img.vehicle.make} ${img.vehicle.model}` : 'Unlinked'}
                              </p>
                              <button onClick={e => { e.stopPropagation(); handleDelete(img); }}
                                className="w-6 h-6 bg-red-500/80 rounded-lg flex items-center justify-center shrink-0">
                                {deletingId === img.id ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Trash2 className="w-3 h-3 text-white" />}
                              </button>
                            </div>
                          </div>
                          {img.is_primary && (
                            <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Star className="w-2 h-2 fill-current" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* List view */}
                {view === 'list' && (
                  <div className="rounded-2xl border border-border overflow-hidden bg-card">
                    <div className="divide-y divide-border">
                      {groupImgs.map(img => {
                        const globalIdx = flatFiltered.findIndex(i => i.id === img.id);
                        return (
                          <motion.div key={img.id}
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group cursor-pointer"
                            onClick={() => setLightboxIdx(globalIdx)}
                          >
                            <div className="w-16 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                              <img src={img.url} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {img.vehicle ? `${img.vehicle.make} ${img.vehicle.model}${img.vehicle.variant ? ' ' + img.vehicle.variant : ''}` : 'Unlinked'}
                                </p>
                                {img.is_primary && <Badge className="text-[9px] px-1.5 bg-primary/10 text-primary border-primary/20">Cover</Badge>}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {img.vehicle?.stock_number && <span className="text-[10px] font-mono text-muted-foreground">{img.vehicle.stock_number}</span>}
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{fmtDate(img.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(globalIdx); }}><ZoomIn className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Copy link"
                                onClick={e => { e.stopPropagation(); handleCopyLink(img); }}><Link2 className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Edit tags"
                                onClick={e => { e.stopPropagation(); setTagTarget(img); setTagInput(img.notes ?? ''); }}><Tag className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                                onClick={e => { e.stopPropagation(); handleDownload(img); }}><Download className="w-3.5 h-3.5" /></Button>
                              {img.vehicle?.id && (
                                <Link to={`/inventory/${img.vehicle.id}`} onClick={e => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={e => { e.stopPropagation(); handleDelete(img); }}>
                                {deletingId === img.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={() => { setUploadOpen(false); load(); }} />

      {/* Tag Dialog */}
      {tagTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setTagTarget(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm text-foreground mb-1 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Edit Tags</h3>
            <p className="text-xs text-muted-foreground mb-3">Enter comma-separated tags (e.g. exterior, damage, front-view)</p>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTag()}
              placeholder="exterior, interior, damage..."
              className="w-full h-9 bg-muted/40 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setTagTarget(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSaveTag} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Save Tags</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            images={flatFiltered}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onNavigate={setLightboxIdx}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
