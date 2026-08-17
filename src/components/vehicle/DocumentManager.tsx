import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Upload, Download, Trash2, Search, Filter,
  Eye, Calendar, Tag, AlertTriangle, Plus, X, FolderOpen,
  File, Image, CheckCircle2, Loader2, ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { VehicleDocument } from '@/types/types';

const BUCKET = 'vehicle-documents';

const CATEGORIES = [
  { value: 'registration', label: 'Registration Book', icon: '📋' },
  { value: 'smart_card', label: 'Smart Card', icon: '💳' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'inspection', label: 'Inspection Report', icon: '🔍' },
  { value: 'transfer', label: 'Transfer Letter', icon: '📝' },
  { value: 'tax', label: 'Tax Document', icon: '💰' },
  { value: 'purchase', label: 'Purchase Invoice', icon: '🧾' },
  { value: 'photo', label: 'Photo / Scan', icon: '📸' },
  { value: 'other', label: 'Other', icon: '📄' },
];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx';
const MAX_SIZE_MB = 10;

function getCategoryMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatBytes(b?: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function isImage(mime?: string | null) {
  return !!mime?.startsWith('image/');
}

function daysUntilExpiry(expiry?: string | null) {
  if (!expiry) return null;
  const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  return diff;
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchDocs(vehicleId: string): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function uploadDoc(
  vehicleId: string,
  file: File,
  category: string,
  notes: string,
  expiresAt: string,
  onProgress: (pct: number) => void,
): Promise<VehicleDocument> {
  if (file.size > MAX_SIZE_MB * 1048576) throw new Error(`File exceeds ${MAX_SIZE_MB} MB limit`);
  const ext = file.name.split('.').pop() ?? 'bin';
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
  const path = `${vehicleId}/${Date.now()}_${safeName}`;

  // Simulate progress during upload
  onProgress(10);
  const { data: storageData, error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (storageErr) throw storageErr;
  onProgress(70);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageData.path);

  const { data: doc, error: dbErr } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: vehicleId,
      name: file.name,
      category,
      file_url: urlData.publicUrl,
      file_path: storageData.path,
      file_size: file.size,
      mime_type: file.type,
      notes: notes || null,
      expires_at: expiresAt || null,
    })
    .select()
    .maybeSingle();
  if (dbErr) throw dbErr;
  onProgress(100);
  return doc as VehicleDocument;
}

async function deleteDoc(doc: VehicleDocument) {
  await supabase.storage.from(BUCKET).remove([doc.file_path]);
  const { error } = await supabase.from('vehicle_documents').delete().eq('id', doc.id);
  if (error) throw error;
}

// ── Upload Row ────────────────────────────────────────────────────────────────
interface UploadItem { file: File; category: string; notes: string; expiresAt: string; progress: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string; }

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  vehicleId: string;
  onScanRequest?: () => void;
}

export default function DocumentManager({ vehicleId, onScanRequest }: Props) {
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<VehicleDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VehicleDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDocs(await fetchDocs(vehicleId)); }
    catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  // Filtered view
  const filtered = docs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.category.includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || d.category === filterCat;
    return matchSearch && matchCat;
  });

  // Expiring soon (≤30 days)
  const expiringSoon = docs.filter(d => { const n = daysUntilExpiry(d.expires_at); return n !== null && n >= 0 && n <= 30; });

  // ── File handling ──────────────────────────────────────────────────────────
  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const items: UploadItem[] = arr.map(f => ({
      file: f, category: 'other', notes: '', expiresAt: '', progress: 0, status: 'pending',
    }));
    setUploads(prev => [...prev, ...items]);
  };

  const updateUpload = (idx: number, patch: Partial<UploadItem>) =>
    setUploads(prev => prev.map((u, i) => i === idx ? { ...u, ...patch } : u));

  const removeUpload = (idx: number) =>
    setUploads(prev => prev.filter((_, i) => i !== idx));

  const runUpload = async (idx: number) => {
    const item = uploads[idx];
    if (!item || item.status === 'uploading') return;
    updateUpload(idx, { status: 'uploading', progress: 0 });
    try {
      await uploadDoc(
        vehicleId, item.file, item.category, item.notes, item.expiresAt,
        (pct) => updateUpload(idx, { progress: pct }),
      );
      updateUpload(idx, { status: 'done', progress: 100 });
      toast.success(`${item.file.name} uploaded`);
      setTimeout(() => {
        setUploads(prev => prev.filter((_, i) => i !== idx));
        load();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateUpload(idx, { status: 'error', error: msg });
      toast.error(msg);
    }
  };

  const uploadAll = () => uploads.forEach((_, i) => runUpload(i));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(deleteTarget);
      toast.success('Document deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete document'); }
  };

  // Drag-and-drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-orange-400/8 border-orange-400/20 text-orange-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold">{expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring soon: </span>
            {expiringSoon.map(d => `${d.name} (${daysUntilExpiry(d.expires_at)}d)`).join(', ')}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="pl-8 h-8 text-sm bg-muted/50 border-border"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-8 text-xs bg-muted/50 border-border w-36 shrink-0">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs border-border shrink-0" onClick={() => fileRef.current?.click()}>
          <Plus className="w-3.5 h-3.5 mr-1" />Add
        </Button>
        {onScanRequest && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-border shrink-0" onClick={onScanRequest}>
            <ScanLine className="w-3.5 h-3.5 mr-1 text-purple-400" />Scan
          </Button>
        )}
        <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
      </div>

      {/* Drop zone (shown when no pending uploads) */}
      {uploads.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
          )}
        >
          <Upload className={cn('w-8 h-8', dragging ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-sm text-muted-foreground">Drop files here or <span className="text-primary">click to browse</span></p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP, HEIC, DOC — max {MAX_SIZE_MB} MB each</p>
        </div>
      )}

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-foreground">{uploads.length} file{uploads.length > 1 ? 's' : ''} to upload</span>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={uploadAll}>
                <Upload className="w-3 h-3 mr-1" />Upload All
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-border" onClick={() => fileRef.current?.click()}>
                <Plus className="w-3 h-3 mr-1" />More
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {uploads.map((item, idx) => (
              <div key={idx} className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                  </div>
                  {item.status === 'pending' && (
                    <button onClick={() => removeUpload(idx)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                  {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                </div>
                {item.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={item.category} onValueChange={v => updateUpload(idx, { category: v })}>
                      <SelectTrigger className="h-7 text-xs bg-muted/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date" value={item.expiresAt}
                      onChange={e => updateUpload(idx, { expiresAt: e.target.value })}
                      placeholder="Expiry date"
                      className="h-7 text-xs bg-muted/50 border-border"
                    />
                    <Input
                      value={item.notes} onChange={e => updateUpload(idx, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="h-7 text-xs bg-muted/50 border-border col-span-2"
                    />
                    <Button size="sm" className="h-7 text-xs col-span-2" onClick={() => runUpload(idx)}>
                      <Upload className="w-3 h-3 mr-1" />Upload
                    </Button>
                  </div>
                )}
                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1.5" />
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />Loading documents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{docs.length === 0 ? 'No documents uploaded yet' : 'No documents match your filter'}</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {filtered.map(doc => {
            const cat = getCategoryMeta(doc.category);
            const expiryDays = daysUntilExpiry(doc.expires_at);
            const expired = expiryDays !== null && expiryDays < 0;
            const expiringSoon = expiryDays !== null && expiryDays >= 0 && expiryDays <= 30;
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/20 transition-colors">
                {/* Icon */}
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base',
                  isImage(doc.mime_type) ? 'bg-blue-400/10' : 'bg-primary/10')}>
                  {isImage(doc.mime_type) ? <Image className="w-4 h-4 text-blue-400" /> : <File className="w-4 h-4 text-primary" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{doc.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground shrink-0">
                      {cat.icon} {cat.label}
                    </Badge>
                    {expired && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Expired</Badge>}
                    {expiringSoon && !expired && <Badge className="text-[10px] px-1.5 py-0 bg-orange-400/10 text-orange-400 border-orange-400/20 shrink-0">Expires in {expiryDays}d</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{formatBytes(doc.file_size)}</span>
                    {doc.expires_at && (
                      <span className={cn('text-[11px] flex items-center gap-0.5', expired ? 'text-destructive' : 'text-muted-foreground')}>
                        <Calendar className="w-2.5 h-2.5" />{new Date(doc.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    {doc.notes && <span className="text-[11px] text-muted-foreground truncate max-w-[120px]"><Tag className="w-2.5 h-2.5 inline mr-0.5" />{doc.notes}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={doc.file_url} download={doc.name} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {docs.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {docs.length} document{docs.length !== 1 ? 's' : ''} · {filtered.length} shown
        </p>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl bg-card border-border p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              {previewDoc?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {previewDoc && isImage(previewDoc.mime_type) ? (
              <img src={previewDoc.file_url} alt={previewDoc.name} className="w-full max-h-[60vh] object-contain rounded-lg" />
            ) : previewDoc?.mime_type === 'application/pdf' ? (
              <iframe src={previewDoc.file_url} className="w-full h-[60vh] rounded-lg border border-border" title={previewDoc.name} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                <a href={previewDoc?.file_url} download={previewDoc?.name} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-border text-xs">
                    <Download className="w-3.5 h-3.5 mr-1" />Download to view
                  </Button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-8 text-xs bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
