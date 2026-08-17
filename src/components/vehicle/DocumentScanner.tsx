import React, { useState, useRef, useCallback } from 'react';
import { Camera, ScanLine, RotateCcw, Check, X, ZoomIn, ZoomOut, Sun, Contrast, Loader2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const BUCKET = 'vehicle-documents';

const CATEGORIES = [
  { value: 'registration', label: '📋 Registration Book' },
  { value: 'smart_card', label: '💳 Smart Card' },
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'inspection', label: '🔍 Inspection Report' },
  { value: 'transfer', label: '📝 Transfer Letter' },
  { value: 'photo', label: '📸 Photo / Scan' },
  { value: 'other', label: '📄 Other' },
];

interface Props {
  open: boolean;
  vehicleId: string;
  onClose: () => void;
  onUploaded: () => void;
}

type Stage = 'init' | 'live' | 'captured' | 'uploading';

export default function DocumentScanner({ open, vehicleId, onClose, onUploaded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>('init');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [category, setCategory] = useState('photo');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage('live');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg.includes('Permission') || msg.includes('denied')
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : 'Could not access camera. Make sure no other app is using it.');
    }
  }, [facingMode, stopStream]);

  const handleOpen = () => {
    setStage('init');
    setCapturedDataUrl(null);
    setCameraError(null);
    setBrightness(100);
    setContrast(100);
  };

  const handleClose = () => {
    stopStream();
    onClose();
    setTimeout(() => { setStage('init'); setCapturedDataUrl(null); }, 300);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(dataUrl);
    stopStream();
    setStage('captured');
  };

  const retake = () => {
    setCapturedDataUrl(null);
    startCamera();
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const upload = async () => {
    if (!capturedDataUrl) return;
    setStage('uploading');
    try {
      // Convert dataURL → Blob
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const filename = `scan_${Date.now()}.jpg`;
      const path = `${vehicleId}/${filename}`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (storageErr) throw storageErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageData.path);

      const { error: dbErr } = await supabase.from('vehicle_documents').insert({
        vehicle_id: vehicleId,
        name: filename,
        category,
        file_url: urlData.publicUrl,
        file_path: storageData.path,
        file_size: blob.size,
        mime_type: 'image/jpeg',
      });
      if (dbErr) throw dbErr;

      toast.success('Document scanned and uploaded!');
      onUploaded();
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
      setStage('captured');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()} modal>
      <DialogContent
        className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border p-0"
        onOpenAutoFocus={handleOpen}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
          <DialogTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-purple-400" />Scan Document
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Category picker */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-border flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Init */}
          {stage === 'init' && (
            <div className="flex flex-col items-center gap-4 py-6">
              {cameraError ? (
                <div className="text-center space-y-3">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-destructive">{cameraError}</p>
                  <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => startCamera()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Ready to Scan</p>
                    <p className="text-xs text-muted-foreground mt-1">Position the document in good lighting for best results</p>
                  </div>
                  <Button onClick={() => startCamera()} className="gap-2">
                    <Camera className="w-4 h-4" />Open Camera
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Live camera */}
          {stage === 'live' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                  playsInline
                  muted
                />
                {/* Scan overlay guide */}
                <div className="absolute inset-4 border-2 border-white/40 rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                </div>
                <button
                  onClick={flipCamera}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                  title="Flip camera"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Adjustments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Brightness {brightness}%</span>
                  </div>
                  <Slider min={50} max={200} step={5} value={[brightness]} onValueChange={([v]) => setBrightness(v)} className="h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Contrast {contrast}%</span>
                  </div>
                  <Slider min={50} max={200} step={5} value={[contrast]} onValueChange={([v]) => setContrast(v)} className="h-4" />
                </div>
              </div>
              <Button onClick={capture} className="w-full gap-2 bg-purple-500 hover:bg-purple-600 text-white">
                <Camera className="w-4 h-4" />Capture
              </Button>
            </div>
          )}

          {/* Captured preview */}
          {stage === 'captured' && capturedDataUrl && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <img
                  src={capturedDataUrl}
                  alt="Scanned document"
                  className="w-full h-full object-contain"
                  style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  <Image className="w-3 h-3" />Preview
                </div>
              </div>
              {/* Enhancement controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Brightness {brightness}%</span>
                  </div>
                  <Slider min={50} max={200} step={5} value={[brightness]} onValueChange={([v]) => setBrightness(v)} className="h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Contrast {contrast}%</span>
                  </div>
                  <Slider min={50} max={200} step={5} value={[contrast]} onValueChange={([v]) => setContrast(v)} className="h-4" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={retake} className="flex-1 border-border text-xs h-9">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />Retake
                </Button>
                <Button size="sm" onClick={upload} className="flex-1 text-xs h-9 bg-green-500 hover:bg-green-600 text-white">
                  <Check className="w-3.5 h-3.5 mr-1" />Save Document
                </Button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {stage === 'uploading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading scanned document…</p>
            </div>
          )}
        </div>

        {/* hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
