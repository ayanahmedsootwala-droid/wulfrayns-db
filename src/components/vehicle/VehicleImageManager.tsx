import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, X, Star, StarOff, GripVertical, ImageIcon, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchVehicleImages, uploadVehicleImage, deleteVehicleImage,
  setPrimaryVehicleImage, reorderVehicleImages,
} from '@/lib/api';
import type { VehicleImage } from '@/types/types';
import { toast } from 'sonner';

const MAX_IMAGES = 12;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

interface Props {
  vehicleId: string;
  /** called after any mutation so parent can refresh cover_image_url */
  onChange?: () => void;
}

export default function VehicleImageManager({ vehicleId, onChange }: Props) {
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setImages(await fetchVehicleImages(vehicleId));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) { toast.error(`Maximum ${MAX_IMAGES} images allowed`); return; }

    const toUpload = Array.from(files).slice(0, slots);
    setUploading(true);
    setUploadProgress(0);

    const uploaded: VehicleImage[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20 MB)`);
        continue;
      }
      try {
        const img = await uploadVehicleImage(
          vehicleId,
          file,
          images.length + i,
          images.length === 0 && i === 0,   // first ever image becomes primary
        );
        uploaded.push(img);
        setUploadProgress(Math.round(((i + 1) / toUpload.length) * 100));
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} uploaded`);
      await load();
      onChange?.();
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (img: VehicleImage) => {
    setDeletingId(img.id);
    try {
      await deleteVehicleImage(img.id, img.storage_path);
      toast.success('Photo removed');
      await load();
      onChange?.();
    } catch {
      toast.error('Failed to remove photo');
    } finally {
      setDeletingId(null);
    }
  };

  // ── set primary ────────────────────────────────────────────────────────────
  const handleSetPrimary = async (img: VehicleImage) => {
    if (img.is_primary) return;
    try {
      await setPrimaryVehicleImage(img.id, vehicleId);
      toast.success('Cover photo updated');
      await load();
      onChange?.();
    } catch {
      toast.error('Failed to set cover photo');
    }
  };

  // ── drag-reorder ───────────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, sort_order: i }));
    setImages(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    try {
      await reorderVehicleImages(updated.map(img => ({ id: img.id, sort_order: img.sort_order })));
      onChange?.();
    } catch {
      toast.error('Failed to save order');
      load();
    }
  };

  // ── drop-zone ──────────────────────────────────────────────────────────────
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files.length) return;
    handleFiles(e.dataTransfer.files);
  };

  // ── lightbox nav ───────────────────────────────────────────────────────────
  const lightboxPrev = () => setLightbox(l => (l !== null ? (l - 1 + images.length) % images.length : null));
  const lightboxNext = () => setLightbox(l => (l !== null ? (l + 1) % images.length : null));
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightbox === null) return;
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, images.length]);

  const canUpload = images.length < MAX_IMAGES;

  return (
    <div className="space-y-4">
      {/* upload zone */}
      {canUpload && (
        <div
          className={cn(
            'border-2 border-dashed border-border rounded-xl p-6 text-center transition-colors',
            uploading ? 'opacity-60 pointer-events-none' : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer',
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleZoneDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-foreground font-medium">Converting &amp; uploading… {uploadProgress}%</p>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Images are converted to WebP automatically</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Drop photos here or click to browse</p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, HEIC — auto-converted to WebP · Max 20 MB each · {MAX_IMAGES - images.length} slot{MAX_IMAGES - images.length !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}
        </div>
      )}

      {/* photo grid */}
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="py-10 text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet — upload some above</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <AnimatePresence>
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className={cn(
                  'relative group aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing',
                  img.is_primary ? 'border-primary' : 'border-transparent',
                  dragOverIdx === idx && dragIdx !== idx ? 'ring-2 ring-primary/60 scale-105' : '',
                )}
              >
                {/* image */}
                <img
                  src={img.url}
                  alt={`Vehicle photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onClick={() => setLightbox(idx)}
                />

                {/* primary badge */}
                {img.is_primary && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    Cover
                  </div>
                )}

                {/* index badge */}
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-mono px-1 py-0.5 rounded">
                  {idx + 1}
                </div>

                {/* hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <GripVertical className="w-4 h-4 text-white/50 absolute top-1 right-1" />

                  {/* set primary */}
                  <button
                    onClick={e => { e.stopPropagation(); handleSetPrimary(img); }}
                    title={img.is_primary ? 'Already cover photo' : 'Set as cover photo'}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-primary/80 flex items-center justify-center transition-colors"
                  >
                    {img.is_primary
                      ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      : <StarOff className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* delete */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(img); }}
                    disabled={deletingId === img.id}
                    title="Remove photo"
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-destructive/80 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {deletingId === img.id
                      ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      : <X className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* add more slot */}
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* hint */}
      {images.length > 1 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          Drag photos to reorder · Star icon sets the cover photo
        </p>
      )}

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
              onClick={() => setLightbox(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* prev */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              >
                ‹
              </button>
            )}

            <motion.img
              key={lightbox}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              src={images[lightbox]?.url}
              alt={`Photo ${lightbox + 1}`}
              className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />

            {/* next */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); lightboxNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              >
                ›
              </button>
            )}

            {/* counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {lightbox + 1} / {images.length}
              {images[lightbox]?.is_primary && <span className="ml-2 text-yellow-400 text-xs">★ Cover</span>}
            </div>

            {/* strip */}
            {images.length > 1 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 mt-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setLightbox(i); }}
                    className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === lightbox ? 'bg-white' : 'bg-white/30')}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
