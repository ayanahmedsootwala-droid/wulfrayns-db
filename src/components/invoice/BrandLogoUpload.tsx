import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface BrandLogoUploadProps {
  onLogoChange?: (url: string | null) => void;
  compact?: boolean; // when true renders inline in invoice header area
}

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

export function useBrandLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rpm_settings')
      .select('value')
      .eq('key', 'brand_logo_url')
      .maybeSingle();
    setLogoUrl(data?.value ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { logoUrl, loading, refresh, setLogoUrl };
}

export default function BrandLogoUpload({ onLogoChange, compact = false }: BrandLogoUploadProps) {
  const { logoUrl, loading, refresh, setLogoUrl } = useBrandLogo();
  const [preview, setPreview] = useState<string | null>(null); // staged preview before save
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndStage = (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error('Unsupported format. Use PNG, JPG, SVG, or WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 2 MB limit. Please upload a smaller image.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStagedFile(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndStage(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndStage(file);
  }, []);

  const cancelStage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStagedFile(null);
  };

  const saveLogo = async () => {
    if (!stagedFile) return;
    setUploading(true);
    try {
      // Delete old logo first
      const { data: existing } = await supabase.storage.from('brand-logos').list('', { limit: 10 });
      if (existing?.length) {
        const old = existing.find(f => f.name.startsWith('logo.'));
        if (old) await supabase.storage.from('brand-logos').remove([old.name]);
      }

      const ext = stagedFile.name.split('.').pop() ?? 'png';
      const path = `logo.${ext}?t=${Date.now()}`;
      const uploadPath = `logo.${ext}`;

      const { data: up, error: upErr } = await supabase.storage
        .from('brand-logos')
        .upload(uploadPath, stagedFile, { contentType: stagedFile.type, upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(up.path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: settingErr } = await supabase
        .from('rpm_settings')
        .upsert({ key: 'brand_logo_url', value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (settingErr) throw settingErr;

      setLogoUrl(publicUrl);
      onLogoChange?.(publicUrl);
      cancelStage();
      void path; // suppress unused
      toast.success('Brand logo saved successfully!');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    setRemoving(true);
    try {
      const { data: existing } = await supabase.storage.from('brand-logos').list('', { limit: 10 });
      if (existing?.length) {
        await supabase.storage.from('brand-logos').remove(existing.map(f => f.name));
      }
      await supabase
        .from('rpm_settings')
        .upsert({ key: 'brand_logo_url', value: null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      setLogoUrl(null);
      onLogoChange?.(null);
      toast.success('Brand logo removed.');
    } catch {
      toast.error('Failed to remove logo. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', compact ? 'h-10' : 'h-24')}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading logo…</span>
      </div>
    );
  }

  // Compact mode: just shows current logo or upload button for inline use
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <>
            <img src={logoUrl} alt="Brand logo" className="h-8 max-w-[100px] object-contain rounded" />
            <Button
              type="button" variant="ghost" size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Replace
            </Button>
          </>
        ) : (
          <Button
            type="button" variant="outline" size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="w-3 h-3" /> Upload Logo
          </Button>
        )}
        <input ref={inputRef} type="file" accept={ALLOWED.join(',')} className="hidden" onChange={handleFile} />
        {/* Staged preview mini-modal */}
        <AnimatePresence>
          {stagedFile && preview && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
              >
                <p className="text-sm font-semibold text-foreground">Preview brand logo</p>
                <div className="flex items-center justify-center h-24 bg-muted/40 rounded-xl border border-dashed border-border">
                  <img src={preview} alt="Preview" className="max-h-20 max-w-[200px] object-contain" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={cancelStage} disabled={uploading}>Cancel</Button>
                  <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={saveLogo} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {uploading ? 'Saving…' : 'Save Logo'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full mode (used in Settings or standalone)
  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept={ALLOWED.join(',')} className="hidden" onChange={handleFile} />

      <AnimatePresence mode="wait">
        {preview ? (
          // Staged new logo — awaiting confirmation
          <motion.div key="staged" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> New logo staged — review before saving
              </p>
              <div className="flex items-center justify-center h-28 bg-card rounded-lg border border-border">
                <img src={preview} alt="Logo preview" className="max-h-24 max-w-[240px] object-contain" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={cancelStage} disabled={uploading}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={saveLogo} disabled={uploading}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {uploading ? 'Saving…' : 'Save Logo'}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : logoUrl ? (
          // Existing logo
          <motion.div key="existing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-center h-28 bg-muted/30 rounded-lg border border-dashed border-border">
                <img src={logoUrl} alt="Current brand logo" className="max-h-24 max-w-[240px] object-contain" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => inputRef.current?.click()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Replace Logo
                </Button>
                <Button
                  type="button" variant="outline" size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={removeLogo} disabled={removing}
                >
                  {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Remove
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          // Empty — upload CTA
          <motion.div key="empty" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer',
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5'
              )}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
            >
              <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drag & drop your logo here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP · Max 2 MB</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={refresh}>
        <RefreshCw className="w-3 h-3" /> Refresh
      </Button>
    </div>
  );
}
