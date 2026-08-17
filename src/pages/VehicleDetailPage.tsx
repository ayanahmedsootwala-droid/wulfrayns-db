import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Edit2, Star, Zap, AlertTriangle, Phone, MessageSquare,
  MapPin, Calendar, DollarSign, Car, Shield, Settings2, Fuel,
  Image as ImageIcon, FileText, ChevronRight, CheckCircle2, XCircle, Clock,
  ChevronLeft, Copy, Check, QrCode, GitCompare, ScanLine, Sparkles, Mail,
  ExternalLink, X, Download, Maximize2, TrendingDown, TrendingUp,
  Activity, BarChart2, Tag, User, Building2, Hash, Info,
  Wrench, Gauge, Share2, Printer, Users,
} from 'lucide-react';
import AIInsightPanel from '@/components/ai/AIInsightPanel';
import AIDealScorer from '@/components/ai/AIDealScorer';
import AIListingWriter from '@/components/ai/AIListingWriter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/components/layouts/AppLayout';
import VehicleForm from '@/components/vehicle/VehicleForm';
import VehicleImageManager from '@/components/vehicle/VehicleImageManager';
import QRSticker from '@/components/vehicle/QRSticker';
import WhatsAppActions from '@/components/common/WhatsAppActions';
import DocumentManager from '@/components/vehicle/DocumentManager';
import DocumentScanner from '@/components/vehicle/DocumentScanner';
import VehicleStatusHistory from '@/components/vehicle/VehicleStatusHistory';
import { fetchVehicle, fetchPriceHistory, fetchVehicleImages } from '@/lib/api';
import { formatCurrency, formatDate, formatMileage, getStatusColor, cn } from '@/lib/utils';
import type { Vehicle, PriceHistory, VehicleImage, Dealer } from '@/types/types';
// ─── Build copy text ──────────────────────────────────────────────────────────
function buildCarDetails(vehicle: Vehicle): string {
  const lines: string[] = [
    `🚗 ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''} (${vehicle.model_year ?? '—'})`,
    `Status: ${vehicle.status ?? '—'}`,
  ];
  if (vehicle.is_hot_deal) lines.push('🔥 Hot Deal');
  if (vehicle.is_featured) lines.push('⭐ Featured');
  if (vehicle.is_urgent) lines.push('⚡ Urgent Sale');
  lines.push('');
  lines.push(`Engine: ${vehicle.engine_capacity ?? '—'} | Fuel: ${vehicle.fuel_type ?? '—'} | Trans: ${vehicle.transmission ?? '—'}`);
  lines.push(`Mileage: ${formatMileage(vehicle.mileage)} | Color: ${vehicle.color ?? '—'} | Origin: ${vehicle.origin ?? '—'}`);
  lines.push(`Reg #: ${vehicle.registration_number ?? '—'} | Reg City: ${vehicle.registration_city ?? '—'}`);
  lines.push(`Stock #: ${vehicle.stock_number ?? '—'}`);
  lines.push('');
  lines.push(`Demand Price: PKR ${formatCurrency(vehicle.expected_selling_price)}${vehicle.is_negotiable ? ' (Negotiable)' : ''}`);
  if (vehicle.dealer) {
    lines.push('');
    lines.push(`Dealer: ${vehicle.dealer.name}`);
    if (vehicle.dealer.phone) lines.push(`Phone: ${vehicle.dealer.phone}`);
    if (vehicle.dealer.whatsapp) lines.push(`WhatsApp: ${vehicle.dealer.whatsapp}`);
    if (vehicle.dealer.city) lines.push(`City: ${vehicle.dealer.city}`);
  }
  return lines.join('\n');
}

// ─── Condition Score Bar ──────────────────────────────────────────────────────
function ScoreBar({ label, score, max = 10 }: { label: string; score?: number; max?: number }) {
  if (score == null) return null;
  const pct = (score / max) * 100;
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right shrink-0">{score}/{max}</span>
    </div>
  );
}

// ─── Feature Chip ─────────────────────────────────────────────────────────────
function FeatureChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={cn(
      'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
      active
        ? 'bg-primary/10 text-primary border-primary/25'
        : 'bg-muted/20 text-muted-foreground/50 border-border/40 line-through',
    )}>{label}</span>
  );
}

// ─── Spec Item ────────────────────────────────────────────────────────────────
function SpecItem({ label, value, icon: Icon, highlight }: {
  label: string; value?: string | number | null; icon?: React.ElementType; highlight?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className={cn('rounded-lg p-3 border', highlight ? 'bg-primary/8 border-primary/25' : 'bg-muted/20 border-border')}>
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1.5" />}
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-sm font-semibold', highlight ? 'text-primary' : 'text-foreground')}>{value}</p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-4 h-4 rounded bg-muted" />
        <Skeleton className="w-48 h-4 rounded bg-muted" />
      </div>
      <Skeleton className="w-64 h-7 rounded bg-muted" />
      <Skeleton className="w-full h-24 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 mt-4">
        <div className="space-y-3">
          <Skeleton className="aspect-[4/3] rounded-xl bg-muted" />
          <Skeleton className="h-28 rounded-xl bg-muted" />
          <Skeleton className="h-48 rounded-xl bg-muted" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 rounded-lg bg-muted" />
          <Skeleton className="h-20 rounded-lg bg-muted" />
          <Skeleton className="h-52 rounded-lg bg-muted" />
          <Skeleton className="h-36 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [vehicleImages, setVehicleImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(id === 'new');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [docsKey, setDocsKey] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const handleCopyDetails = useCallback((v: Vehicle) => {
    navigator.clipboard.writeText(buildCarDetails(v)).then(() => {
      setCopiedDetails(true); toast.success('Car details copied!');
      setTimeout(() => setCopiedDetails(false), 2200);
    });
  }, []);

  const handleCopyPhone = useCallback((phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(true); toast.success('Phone copied!');
      setTimeout(() => setCopiedPhone(false), 2200);
    });
  }, []);

  // Lightbox keyboard navigation — ref-based so effect never needs to re-register
  const allImgsRef = React.useRef<VehicleImage[]>([]);
  const lightboxIdxRef = React.useRef<number | null>(null);
  lightboxIdxRef.current = lightboxIdx;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const cur = lightboxIdxRef.current;
      if (cur === null) return;
      const len = allImgsRef.current.length;
      if (!len) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setLightboxIdx((cur - 1 + len) % len); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setLightboxIdx((cur + 1) % len); }
      if (e.key === 'Escape')     { e.preventDefault(); setLightboxIdx(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []); // register once — reads refs at event time, no stale closure

  const loadVehicle = useCallback(async () => {
    if (id === 'new') { setLoading(false); return; }
    if (!id) return;
    const [v, ph, imgs] = await Promise.all([
      fetchVehicle(id),
      fetchPriceHistory(id),
      fetchVehicleImages(id),
    ]);
    setVehicle(v);
    setPriceHistory(ph);
    setVehicleImages(imgs);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadVehicle(); }, [loadVehicle]);

  if (id === 'new' || editMode) {
    return (
      <AppLayout>
        <VehicleForm
          vehicle={vehicle ?? undefined}
          onSave={(v) => navigate(`/inventory/${v.id}`)}
          onCancel={() => id === 'new' ? navigate('/inventory') : setEditMode(false)}
        />
      </AppLayout>
    );
  }

  if (loading) return <AppLayout><LoadingSkeleton /></AppLayout>;
  if (!vehicle) return (
    <AppLayout>
      <div className="p-8 text-center">
        <Car className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Vehicle not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Inventory
        </Button>
      </div>
    </AppLayout>
  );

  const days = vehicle.created_at ? Math.floor((Date.now() - new Date(vehicle.created_at).getTime()) / 86400000) : 0;
  const primaryImg = vehicleImages[activeImageIdx]?.url ?? vehicle.cover_image_url;
  const allImgs = vehicleImages.length > 0
    ? vehicleImages
    : (vehicle.cover_image_url ? [{ id: 'cover', url: vehicle.cover_image_url } as VehicleImage] : []);
  // Keep ref in sync so lightbox keyboard handler always sees latest array
  allImgsRef.current = allImgs;
  const profit = vehicle.sold_price && vehicle.purchase_price
    ? vehicle.sold_price - vehicle.purchase_price
    : vehicle.profit_estimate;

  const handleShare = async () => {
    const text = buildCarDetails(vehicle);
    const title = `${vehicle.make} ${vehicle.model}${vehicle.model_year ? ' ' + vehicle.model_year : ''}`;
    // Try Web Share API first (mobile / modern browsers)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url: window.location.href });
        return;
      } catch (err) {
        // User cancelled or API failed — fall through to clipboard
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    // Fallback: copy full car details to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${window.location.href}\n\n${text}`);
      toast.success('Car details copied to clipboard!');
    } catch {
      // Final fallback for very old browsers
      const el = document.createElement('textarea');
      el.value = `${title}\n${window.location.href}\n\n${text}`;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success('Car details copied!');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto p-3 md:p-5">

        {/* ─── Breadcrumb + top actions ─── */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button onClick={() => navigate('/inventory')} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />Inventory
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground truncate max-w-[240px] font-medium">{vehicle.make} {vehicle.model} {vehicle.variant}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={() => window.print()} title="Print">
              <Printer className="w-3 h-3" /><span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={handleShare}>
              <Share2 className="w-3 h-3" /><span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={() => navigate(`/compare?a=${vehicle.id}`)}>
              <GitCompare className="w-3 h-3" /><span className="hidden sm:inline">Compare</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={() => setQrOpen(true)}>
              <QrCode className="w-3 h-3" /><span className="hidden sm:inline">QR</span>
            </Button>
            <Button
              variant="outline" size="sm"
              className={cn('h-7 text-xs gap-1.5 border-border transition-all', copiedDetails && 'border-green-500/40 text-green-400')}
              onClick={() => handleCopyDetails(vehicle)}
            >
              {copiedDetails ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedDetails ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setEditMode(true)}>
              <Edit2 className="w-3 h-3" />Edit
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            HERO STRIP — first glance, most critical info visible
        ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-border bg-card mb-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-0">

            {/* ── STATUS STRIPE (left) ── */}
            <div className={cn(
              'hidden lg:flex flex-col items-center justify-center w-2 rounded-l-2xl',
              vehicle.status === 'available' ? 'bg-green-500' :
              vehicle.status === 'sold' ? 'bg-muted-foreground/30' :
              vehicle.status === 'reserved' || vehicle.status === 'booked' ? 'bg-blue-500' :
              'bg-primary',
            )} />

            {/* ── MAIN HERO INFO ── */}
            <div className="px-4 py-4">
              {/* Title row */}
              <div className="flex items-start gap-3 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                      {vehicle.make} {vehicle.model}
                    </h1>
                    {vehicle.variant && (
                      <span className="text-lg font-medium text-muted-foreground">{vehicle.variant}</span>
                    )}
                    {vehicle.model_year && (
                      <span className="text-lg font-bold text-primary">{vehicle.model_year}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('px-2.5 py-0.5 rounded-full border font-bold text-xs', getStatusColor(vehicle.status))}>
                      {(vehicle.status ?? 'unknown').toUpperCase()}
                    </span>
                    {vehicle.stock_number && (
                      <span className="font-mono text-xs bg-muted/60 border border-border px-2 py-0.5 rounded text-muted-foreground">
                        #{vehicle.stock_number}
                      </span>
                    )}
                    {vehicle.registration_number && (
                      <span className="text-xs bg-muted/60 border border-border px-2 py-0.5 rounded text-muted-foreground">
                        {vehicle.registration_number}
                      </span>
                    )}
                    {vehicle.origin && (
                      <span className="text-xs bg-muted/60 border border-border px-2 py-0.5 rounded text-muted-foreground capitalize">
                        {vehicle.origin}
                      </span>
                    )}
                    {vehicle.is_hot_deal && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full font-bold">🔥 Hot</span>}
                    {vehicle.is_featured && <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 px-2 py-0.5 rounded-full font-bold">⭐ Featured</span>}
                    {vehicle.is_urgent && <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full font-bold">⚡ Urgent</span>}
                    {vehicle.is_negotiable && <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">Negotiable</span>}
                  </div>
                </div>

                {/* PRICE BLOCK */}
                <div className="shrink-0 text-right">
                  <p className="text-3xl md:text-4xl font-black text-primary leading-none">
                    {formatCurrency(vehicle.expected_selling_price)}
                  </p>
                  <p className="text-xs text-primary/70 font-medium mt-0.5">Asking Price</p>
                  {vehicle.market_price && vehicle.market_price !== vehicle.expected_selling_price && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Market: <span className="font-semibold text-foreground">{formatCurrency(vehicle.market_price)}</span>
                    </p>
                  )}
                  {vehicle.last_offer && (
                    <p className="text-xs text-orange-400 mt-0.5 font-medium">
                      Last offer: {formatCurrency(vehicle.last_offer)}
                    </p>
                  )}
                  {profit != null && (
                    <p className={cn('text-xs font-bold mt-1', profit >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {profit >= 0 ? '▲' : '▼'} Profit: {formatCurrency(Math.abs(profit))}
                    </p>
                  )}
                </div>
              </div>

              {/* ── 8-COLUMN SPEC GRID — most important at a glance ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
                {[
                  { icon: Activity, label: 'Mileage',     value: formatMileage(vehicle.mileage) },
                  { icon: Fuel,     label: 'Fuel',        value: vehicle.fuel_type ?? '—' },
                  { icon: Settings2,label: 'Trans.',      value: vehicle.transmission ?? '—' },
                  { icon: Tag,      label: 'Engine',      value: vehicle.engine_capacity ?? '—' },
                  { icon: Car,      label: 'Body',        value: vehicle.body_type ?? '—' },
                  { icon: Info,     label: 'Color',       value: vehicle.color ?? '—' },
                  { icon: MapPin,   label: 'Reg. City',   value: vehicle.registration_city ?? '—' },
                  { icon: Gauge,    label: 'Score',       value: vehicle.inspection_score != null ? `${vehicle.inspection_score}/100` : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted/30 border border-border/60 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Aging alert inline */}
              {days > 45 && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs mt-2',
                  days > 90 ? 'bg-red-500/8 border-red-500/25 text-red-400' : 'bg-orange-400/8 border-orange-400/25 text-orange-400',
                )}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Listed <strong>{days} days</strong> — consider a price revision to re-engage buyers.
                  <span className="ml-auto text-muted-foreground">Added {vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString() : '—'}</span>
                </div>
              )}
            </div>

            {/* ── DEALER CONTACT STRIP (right, always visible) ── */}
            {vehicle.dealer && (
              <div className="border-t lg:border-t-0 lg:border-l border-border bg-muted/10 px-4 py-4 flex flex-col gap-3 min-w-0 lg:w-72 xl:w-80">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base font-black text-primary shrink-0">
                    {vehicle.dealer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/dealers/${vehicle.dealer.id}`}
                      className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block">
                      {vehicle.dealer.name}
                    </Link>
                    {(vehicle.dealer as { dealership?: { name: string } }).dealership?.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {(vehicle.dealer as { dealership?: { name: string } }).dealership!.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {vehicle.dealer.rating != null && (
                        <span className="text-xs text-yellow-400 font-bold">★ {vehicle.dealer.rating.toFixed(1)}</span>
                      )}
                      {vehicle.dealer.trust_score != null && (
                        <span className="text-xs text-primary font-medium">Trust {vehicle.dealer.trust_score}%</span>
                      )}
                      {vehicle.dealer.deals_done != null && (
                        <span className="text-xs text-muted-foreground">{vehicle.dealer.deals_done} deals</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {vehicle.dealer.phone && (
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${vehicle.dealer.phone}`}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-foreground transition-colors">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold">{vehicle.dealer.phone}</span>
                      </a>
                      <button onClick={() => handleCopyPhone(vehicle.dealer!.phone!)}
                        className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all',
                          copiedPhone ? 'border-green-500/40 bg-green-400/10 text-green-400' : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground')}>
                        {copiedPhone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                  {(vehicle.dealer.whatsapp || vehicle.dealer.phone) && (
                    <a href={`https://wa.me/${((vehicle.dealer.whatsapp || vehicle.dealer.phone)!).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${vehicle.dealer.name}, I'm interested in the ${vehicle.make} ${vehicle.model} ${vehicle.model_year ?? ''} (Stock: ${vehicle.stock_number ?? 'N/A'}). Please share more details.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/8 hover:bg-green-500/15 border border-green-500/20 text-xs text-green-400 transition-colors w-full">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">WhatsApp</span>
                      <span className="text-green-400/70 truncate ml-auto">{vehicle.dealer.whatsapp || vehicle.dealer.phone}</span>
                    </a>
                  )}
                  {vehicle.dealer.email && (
                    <a href={`mailto:${vehicle.dealer.email}?subject=${encodeURIComponent(`Inquiry: ${vehicle.make} ${vehicle.model} ${vehicle.model_year ?? ''}`)}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-foreground transition-colors w-full">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{vehicle.dealer.email}</span>
                    </a>
                  )}
                  {(vehicle.dealer.address || vehicle.dealer_city || vehicle.dealer.city) && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">
                        {[vehicle.dealer.address, vehicle.dealer.area, vehicle.dealer_city || vehicle.dealer.city].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {vehicle.dealer.google_maps_url && (
                    <a href={vehicle.dealer.google_maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline px-1 mt-0.5">
                      <MapPin className="w-3 h-3" />Open in Google Maps
                    </a>
                  )}
                </div>

                <button
                  onClick={() => {
                    const d = vehicle.dealer!;
                    const lines = [`Dealer: ${d.name}`, d.phone && `Phone: ${d.phone}`, d.whatsapp && `WhatsApp: ${d.whatsapp}`, d.email && `Email: ${d.email}`,
                      (d.address || vehicle.dealer_city) && `Address: ${[d.address, d.area, vehicle.dealer_city || d.city].filter(Boolean).join(', ')}`].filter(Boolean).join('\n');
                    navigator.clipboard.writeText(lines); toast.success('Dealer details copied!');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <Copy className="w-3 h-3" />Copy Contact Details
                </button>

                <Link to={`/dealers/${vehicle.dealer.id}`}
                  className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
                  Full Dealer Profile <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* ── PARTY CONTACT STRIP ── */}
            {!vehicle.dealer && vehicle.party && (
              <div className="border-t lg:border-t-0 lg:border-l border-border bg-muted/10 px-4 py-4 flex flex-col gap-3 min-w-0 lg:w-72 xl:w-80">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-primary" />Party (Client)
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base font-black text-primary shrink-0">
                    {vehicle.party.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{vehicle.party.name}</p>
                    {vehicle.party.city && <p className="text-xs text-muted-foreground">{vehicle.party.city}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {vehicle.party.phone && (
                    <a href={`tel:${vehicle.party.phone}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-foreground transition-colors w-full">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{vehicle.party.phone}</span>
                    </a>
                  )}
                  {(vehicle.party.whatsapp || vehicle.party.phone) && (
                    <a href={`https://wa.me/${((vehicle.party.whatsapp || vehicle.party.phone)!).replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/8 hover:bg-green-500/15 border border-green-500/20 text-xs text-green-400 transition-colors w-full">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">WhatsApp</span>
                    </a>
                  )}
                  {vehicle.party.email && (
                    <a href={`mailto:${vehicle.party.email}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-foreground transition-colors w-full">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{vehicle.party.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── MAIN 2-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">

          {/* ════ LEFT PANEL ════ */}
          <div className="space-y-3">

            {/* ── Hero Gallery ── */}
            <Card className="bg-card border-border overflow-hidden">
              {/* Main image */}
              <div
                className="aspect-[4/3] bg-muted flex items-center justify-center relative cursor-pointer group overflow-hidden"
                onClick={() => allImgs.length > 0 && setLightboxIdx(activeImageIdx)}
              >
                {primaryImg ? (
                  <img src={primaryImg} alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Car className="w-16 h-16 opacity-30" />
                    <p className="text-xs">No photos yet</p>
                  </div>
                )}
                {/* Overlay controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                  {primaryImg && (
                    <a href={primaryImg} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 flex items-center justify-center">
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </a>
                  )}
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-lg font-medium">
                    {allImgs.length > 0 ? `${activeImageIdx + 1}/${allImgs.length}` : ''}
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg">
                    <Maximize2 className="w-3 h-3" />Fullscreen
                  </div>
                </div>
                {/* Nav arrows */}
                {allImgs.length > 1 && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setActiveImageIdx(i => (i - 1 + allImgs.length) % allImgs.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setActiveImageIdx(i => (i + 1) % allImgs.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnail strip */}
              {allImgs.length > 1 && (
                <div className="flex gap-1.5 p-2 overflow-x-auto bg-muted/20 scrollbar-none">
                  {allImgs.slice(0, 12).map((img, i) => (
                    <button key={img.id} onClick={() => setActiveImageIdx(i)}
                      className={cn('w-13 h-10 rounded-md overflow-hidden shrink-0 border-2 transition-all', i === activeImageIdx ? 'border-primary ring-1 ring-primary/40' : 'border-transparent opacity-55 hover:opacity-85')}>
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {allImgs.length > 12 && (
                    <button onClick={() => setLightboxIdx(12)}
                      className="w-13 h-10 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-xs text-muted-foreground hover:bg-muted/70 font-semibold">
                      +{allImgs.length - 12}
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* ── Pricing Card ── */}
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />Pricing & Financials
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="rounded-xl bg-primary/8 border border-primary/25 px-4 py-3 flex items-center justify-between mb-1">
                  <div>
                    <p className="text-xs text-primary/70 font-medium">Demand Price</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(vehicle.expected_selling_price)}</p>
                  </div>
                  {vehicle.is_negotiable && (
                    <span className="text-[10px] bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-1 rounded-full font-semibold">Negotiable</span>
                  )}
                </div>
                {[
                  { label: 'Purchase / Cost Price', value: formatCurrency(vehicle.purchase_price) },
                  { label: 'Repair / Refurb Cost', value: formatCurrency(vehicle.repair_cost) },
                  { label: 'Total Investment', value: formatCurrency(vehicle.investment) },
                  { label: 'Minimum Selling Price', value: formatCurrency(vehicle.min_selling_price) },
                  { label: 'Market Price', value: formatCurrency(vehicle.market_price) },
                  { label: 'Sold At Price', value: formatCurrency(vehicle.sold_price) },
                ].filter(r => r.value !== '—' && r.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
                {(vehicle.profit_estimate != null || (vehicle.sold_price && vehicle.purchase_price)) && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />Estimated Profit
                      </span>
                      <span className="text-sm font-bold text-green-400">
                        {formatCurrency(vehicle.sold_price && vehicle.purchase_price
                          ? vehicle.sold_price - vehicle.purchase_price
                          : vehicle.profit_estimate)}
                      </span>
                    </div>
                  </>
                )}
                {vehicle.last_offer && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3 text-orange-400" />Last Offer</span>
                    <span className="text-sm font-semibold text-orange-400">{formatCurrency(vehicle.last_offer)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Inspection Scores ── */}
            {(vehicle.engine_health || vehicle.overall_condition || vehicle.inspection_score != null) && (
              <Card className="bg-card border-border">
                <CardHeader className="px-4 py-3 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />Condition Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {vehicle.inspection_score != null && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{vehicle.inspection_score}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground mb-1">Overall Inspection Score</p>
                        <Progress value={vehicle.inspection_score} className="h-2" />
                      </div>
                    </div>
                  )}
                  {[
                    { label: 'Engine', score: vehicle.engine_health },
                    { label: 'Transmission', score: vehicle.transmission_health },
                    { label: 'Suspension', score: vehicle.suspension_condition },
                    { label: 'Brakes', score: vehicle.brakes_condition },
                    { label: 'Tyres', score: vehicle.tyres_condition },
                    { label: 'AC System', score: vehicle.ac_condition },
                    { label: 'Battery', score: vehicle.battery_condition },
                    { label: 'Cooling', score: vehicle.cooling_condition },
                  ].map(s => <ScoreBar key={s.label} label={s.label} score={s.score} />)}
                  {vehicle.original_paint_pct != null && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">Original Paint</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${vehicle.original_paint_pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right shrink-0">{vehicle.original_paint_pct}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ════ RIGHT PANEL — Tabs ════ */}
          <div className="min-w-0">
            <Tabs defaultValue="overview" className="w-full">
              <div className="overflow-x-auto scrollbar-none mb-4">
                <TabsList className="bg-card border border-border h-9 w-max min-w-full rounded-lg">
                  {[
                    { v: 'overview', label: 'Overview', icon: Info },
                    { v: 'specs', label: 'Full Specs', icon: Settings2 },
                    { v: 'features', label: 'Features', icon: Star },
                    { v: 'docs', label: 'Documents', icon: Shield },
                    { v: 'photos', label: `Photos${vehicleImages.length > 0 ? ` (${vehicleImages.length})` : ''}`, icon: ImageIcon },
                    { v: 'notes', label: 'Notes', icon: FileText },
                    { v: 'history', label: 'Price History', icon: TrendingUp },
                    { v: 'ai', label: 'AI Tools', icon: Sparkles },
                  ].map(({ v, label, icon: Icon }) => (
                    <TabsTrigger key={v} value={v} className="text-xs flex items-center gap-1.5 px-3">
                      <Icon className="w-3 h-3" />{label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* ── OVERVIEW TAB ── */}
              <TabsContent value="overview" className="space-y-4 mt-0">
                {/* Inline dealer quick-contact — compact, on mobile where hero dealer strip may be hidden */}
                {vehicle.dealer && (
                  <Card className="bg-card border-border lg:hidden">
                    <CardContent className="px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-primary" />Dealer
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground flex-1 min-w-0 truncate">{vehicle.dealer.name}</span>
                        {vehicle.dealer.phone && (
                          <a href={`tel:${vehicle.dealer.phone}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border text-xs text-foreground transition-colors shrink-0">
                            <Phone className="w-3 h-3 text-primary" />{vehicle.dealer.phone}
                          </a>
                        )}
                        {(vehicle.dealer.whatsapp || vehicle.dealer.phone) && (
                          <a href={`https://wa.me/${((vehicle.dealer.whatsapp || vehicle.dealer.phone)!).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the ${vehicle.make} ${vehicle.model} ${vehicle.model_year ?? ''}.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-xs text-green-400 transition-colors shrink-0">
                            <MessageSquare className="w-3 h-3" />WhatsApp
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Basic info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: Car, label: 'Make / Model', value: `${vehicle.make} ${vehicle.model}` },
                    { icon: Tag, label: 'Variant / Trim', value: vehicle.variant },
                    { icon: Calendar, label: 'Model Year', value: vehicle.model_year?.toString() },
                    { icon: Calendar, label: 'Reg. Year', value: vehicle.registration_year?.toString() },
                    { icon: Hash, label: 'Reg. Number', value: vehicle.registration_number },
                    { icon: MapPin, label: 'Reg. City', value: vehicle.registration_city },
                    { icon: Car, label: 'Body Type', value: vehicle.body_type },
                    { icon: Fuel, label: 'Fuel Type', value: vehicle.fuel_type },
                    { icon: Settings2, label: 'Transmission', value: vehicle.transmission },
                    { icon: Settings2, label: 'Drive Type', value: vehicle.drive_type },
                    { icon: Activity, label: 'Engine CC', value: vehicle.engine_capacity },
                    { icon: Activity, label: 'Mileage', value: formatMileage(vehicle.mileage) },
                    { icon: Info, label: 'Color (Ext.)', value: vehicle.color },
                    { icon: Info, label: 'Color (Int.)', value: vehicle.interior_color },
                    { icon: Info, label: 'Origin', value: vehicle.origin },
                    { icon: Info, label: 'Auction Grade', value: vehicle.auction_grade },
                  ].filter(i => i.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-muted/20 border border-border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Condition flags */}
                {(vehicle.has_accident_history || vehicle.has_flood_damage || vehicle.has_rust || vehicle.is_smoker_car) && (
                  <Card className="bg-card border-red-500/20 border">
                    <CardContent className="px-4 py-3">
                      <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />Condition Flags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vehicle.has_accident_history && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Accident History</Badge>}
                        {vehicle.has_flood_damage && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Flood Damage</Badge>}
                        {vehicle.has_rust && <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">Rust Present</Badge>}
                        {vehicle.is_smoker_car && <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">Smoker Car</Badge>}
                        {vehicle.has_pet && <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">Pet Owned</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mechanical notes preview */}
                {vehicle.mechanical_notes && (
                  <Card className="bg-card border-border">
                    <CardContent className="px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Wrench className="w-3 h-3 text-primary" />Mechanical Notes</p>
                      <p className="text-sm text-foreground leading-relaxed">{vehicle.mechanical_notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── FULL SPECS TAB ── */}
              <TabsContent value="specs" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'VIN', value: vehicle.vin },
                    { label: 'Engine No.', value: vehicle.engine_number },
                    { label: 'Stock #', value: vehicle.stock_number },
                    { label: 'Generation', value: vehicle.generation },
                    { label: 'Series', value: vehicle.series },
                    { label: 'Trim', value: vehicle.trim },
                    { label: 'Horsepower', value: vehicle.horsepower ? `${vehicle.horsepower} HP` : undefined },
                    { label: 'Torque', value: vehicle.torque ? `${vehicle.torque} Nm` : undefined },
                    { label: 'Turbo', value: vehicle.is_turbo ? 'Yes' : undefined },
                    { label: 'Battery Health', value: vehicle.battery_health ? `${vehicle.battery_health}%` : undefined },
                    { label: 'Range (EV)', value: vehicle.range_km ? `${vehicle.range_km} km` : undefined },
                    { label: 'Paint Type', value: vehicle.paint_type },
                    { label: 'Panels Painted', value: vehicle.panels_painted?.toString() },
                    { label: 'Panels Replaced', value: vehicle.panels_replaced?.toString() },
                    { label: 'Dents', value: vehicle.dent_count?.toString() },
                    { label: 'Scratches', value: vehicle.scratch_count?.toString() },
                    { label: 'Glass Original', value: vehicle.glass_original ? 'Yes' : undefined },
                    { label: 'Seat Material', value: vehicle.seat_material },
                    { label: 'Dashboard Cond.', value: vehicle.dashboard_condition },
                    { label: 'Steering Cond.', value: vehicle.steering_condition },
                    { label: 'Carpet Cond.', value: vehicle.carpet_condition },
                    { label: 'Roof Cond.', value: vehicle.roof_condition },
                    { label: 'Airbags', value: vehicle.airbag_count?.toString() },
                    { label: 'Reg. Month', value: vehicle.registration_month?.toString() },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="bg-muted/20 border border-border rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── FEATURES TAB ── */}
              <TabsContent value="features" className="space-y-4 mt-0">
                {[
                  { title: '🛡️ Safety', items: [
                    { label: 'ABS', value: vehicle.has_abs }, { label: `Airbags (${vehicle.airbag_count ?? 0})`, value: (vehicle.airbag_count ?? 0) > 0 },
                    { label: 'ESP', value: vehicle.has_esp }, { label: 'Traction Control', value: vehicle.has_traction_control },
                    { label: 'Cruise Control', value: vehicle.has_cruise_control }, { label: 'Adaptive Cruise', value: vehicle.has_adaptive_cruise },
                    { label: 'Lane Assist', value: vehicle.has_lane_assist }, { label: 'Blind Spot', value: vehicle.has_blind_spot },
                    { label: '360° Camera', value: vehicle.has_360_camera }, { label: 'Parking Sensors', value: vehicle.has_parking_sensors },
                    { label: 'Reverse Cam', value: vehicle.has_reverse_camera }, { label: 'TPMS', value: vehicle.has_tpms },
                    { label: 'Hill Assist', value: vehicle.has_hill_assist }, { label: 'Auto Hold', value: vehicle.has_auto_hold },
                  ]},
                  { title: '❄️ Comfort', items: [
                    { label: 'Climate Control', value: vehicle.has_climate_control }, { label: 'Dual Zone AC', value: vehicle.has_dual_zone_ac },
                    { label: 'Rear AC', value: vehicle.has_rear_ac }, { label: 'Push Start', value: vehicle.has_push_start },
                    { label: 'Keyless Entry', value: vehicle.has_keyless_entry }, { label: 'Memory Seats', value: vehicle.has_memory_seats },
                    { label: 'Electric Seats', value: vehicle.has_electric_seats }, { label: 'Ventilated Seats', value: vehicle.has_ventilated_seats },
                    { label: 'Heated Seats', value: vehicle.has_heated_seats }, { label: 'Massage Seats', value: vehicle.has_massage_seats },
                    { label: 'Ambient Lighting', value: vehicle.has_ambient_lighting },
                  ]},
                  { title: '🎵 Tech & Infotainment', items: [
                    { label: 'Android Panel', value: vehicle.has_android_panel }, { label: 'Apple CarPlay', value: vehicle.has_apple_carplay },
                    { label: 'Android Auto', value: vehicle.has_android_auto }, { label: 'Navigation', value: vehicle.has_navigation },
                    { label: 'Bluetooth', value: vehicle.has_bluetooth }, { label: 'USB', value: vehicle.has_usb },
                    { label: 'Wireless Charging', value: vehicle.has_wireless_charging }, { label: 'Premium Audio', value: vehicle.has_premium_audio },
                    { label: 'Steering Controls', value: vehicle.has_steering_controls }, { label: 'Rear Entertainment', value: vehicle.has_rear_entertainment },
                    { label: 'Dash Cam', value: vehicle.has_dash_cam },
                  ]},
                  { title: '✨ Exterior & Style', items: [
                    { label: 'Sunroof', value: vehicle.has_sunroof }, { label: 'Panoramic Roof', value: vehicle.has_panoramic_roof },
                    { label: 'Alloy Wheels', value: vehicle.has_alloy_wheels }, { label: 'LED Lights', value: vehicle.has_led_lights },
                    { label: 'Fog Lamps', value: vehicle.has_fog_lamps }, { label: 'Roof Rails', value: vehicle.has_roof_rails },
                    { label: 'Spoiler', value: vehicle.has_spoiler }, { label: 'Side Steps', value: vehicle.has_side_steps },
                    { label: 'Power Tailgate', value: vehicle.has_power_tailgate },
                  ]},
                ].map(section => (
                  <Card key={section.title} className="bg-card border-border">
                    <CardHeader className="px-4 py-3 pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {section.items.map(item => <FeatureChip key={item.label} label={item.label} active={item.value} />)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {section.items.filter(i => i.value).length} / {section.items.length} equipped
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {/* Custom / Additional Features */}
                {vehicle.custom_features && (
                  <Card className="bg-card border-border">
                    <CardHeader className="px-4 py-3 pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground">⚙️ Additional Features</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {vehicle.custom_features.split(',').map(f => f.trim()).filter(Boolean).map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/30 text-primary">
                            {f}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <VehicleStatusHistory vehicleId={vehicle.id} />
              </TabsContent>

              {/* ── DOCUMENTS TAB ── */}
              <TabsContent value="docs" className="space-y-4 mt-0">
                <Card className="bg-card border-border">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Documentation & Legal</span>
                      <button onClick={() => setScannerOpen(true)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        <ScanLine className="w-3.5 h-3.5" />Scan
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Original Book', value: vehicle.has_original_book },
                        { label: 'Smart Card', value: vehicle.has_smart_card },
                        { label: 'Duplicate Book', value: vehicle.has_duplicate_book },
                        { label: 'Transfer Letter', value: vehicle.has_transfer_letter },
                        { label: 'Tax Paid', value: vehicle.tax_paid },
                        { label: 'Token Paid', value: vehicle.token_paid },
                        { label: 'Lifetime Token', value: vehicle.lifetime_token },
                        { label: 'Insurance', value: vehicle.has_insurance },
                        { label: 'Biometric Avail.', value: vehicle.biometric_available },
                        { label: 'Excise Verified', value: vehicle.excise_verified },
                        { label: 'File Complete', value: vehicle.file_complete },
                      ].map(item => (
                        <div key={item.label} className={cn('flex items-center gap-2 p-2.5 rounded-lg border', item.value ? 'bg-green-400/5 border-green-400/20' : 'bg-muted/20 border-border/50')}>
                          {item.value
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                          <span className={cn('text-xs font-medium', item.value ? 'text-foreground' : 'text-muted-foreground/60')}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {vehicle.insurance_expiry && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                        <Calendar className="w-3 h-3 text-primary" />Insurance expires: <strong>{formatDate(vehicle.insurance_expiry)}</strong>
                      </p>
                    )}
                    <Separator className="mb-3" />
                    <DocumentManager key={docsKey} vehicleId={vehicle.id} onScanRequest={() => setScannerOpen(true)} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── PHOTOS TAB ── */}
              <TabsContent value="photos" className="mt-0">
                <Card className="bg-card border-border">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-primary" />Photo Gallery
                      {vehicleImages.length > 0 && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{vehicleImages.length} photos</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {vehicleImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                        {vehicleImages.map((img, i) => (
                          <button key={img.id} onClick={() => setLightboxIdx(i)}
                            className="aspect-[4/3] rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors relative group">
                            <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            {img.is_primary && (
                              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-bold">MAIN</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <VehicleImageManager vehicleId={vehicle.id} onChange={loadVehicle} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── NOTES TAB ── */}
              <TabsContent value="notes" className="space-y-3 mt-0">
                {[
                  { label: '🔧 Mechanical Notes', value: vehicle.mechanical_notes },
                  { label: '🔍 Inspection Notes', value: vehicle.inspection_notes },
                  { label: '💬 Negotiation Notes', value: vehicle.negotiation_notes },
                  { label: '👤 Customer Notes', value: vehicle.customer_notes },
                  { label: '🔒 Private Notes', value: vehicle.private_notes },
                  { label: '🧭 Odor Notes', value: vehicle.odor_notes },
                ].filter(n => n.value).map(note => (
                  <Card key={note.label} className="bg-card border-border">
                    <CardContent className="px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{note.label}</p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.value}</p>
                    </CardContent>
                  </Card>
                ))}
                {!vehicle.mechanical_notes && !vehicle.inspection_notes && !vehicle.private_notes && !vehicle.customer_notes && (
                  <div className="py-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notes recorded for this vehicle</p>
                  </div>
                )}
              </TabsContent>

              {/* ── PRICE HISTORY TAB ── */}
              <TabsContent value="history" className="mt-0">
                <Card className="bg-card border-border">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />Price History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {priceHistory.length === 0 ? (
                      <div className="py-8 text-center">
                        <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No price changes recorded</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {priceHistory.map((ph) => (
                          <div key={ph.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/20 border border-border">
                            <div className={cn('w-2 h-2 rounded-full shrink-0', (ph.difference ?? 0) >= 0 ? 'bg-green-400' : 'bg-red-400')} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground line-through">{formatCurrency(ph.old_price)}</span>
                                <span className="text-xs text-muted-foreground">→</span>
                                <span className="text-sm font-bold text-foreground">{formatCurrency(ph.new_price)}</span>
                                <span className={cn('text-xs font-semibold', (ph.difference ?? 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                                  {(ph.difference ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(ph.percentage ?? 0).toFixed(1)}%
                                </span>
                              </div>
                              {ph.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{ph.reason}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 font-mono">{formatDate(ph.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── AI TOOLS TAB ── */}
              <TabsContent value="ai" className="space-y-4 mt-0">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">AI Tools for This Vehicle</p>
                    <p className="text-xs text-muted-foreground">Powered by Gemini 2.5 Flash</p>
                  </div>
                </div>
                <AIInsightPanel vehicle={vehicle} />
                <AIDealScorer vehicle={vehicle} />
                <AIListingWriter vehicle={vehicle} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ─── QR Sticker ─── */}
      {vehicle && <QRSticker vehicle={vehicle} open={qrOpen} onClose={() => setQrOpen(false)} />}

      {/* ─── Document Scanner ─── */}
      {vehicle && (
        <DocumentScanner
          open={scannerOpen} vehicleId={vehicle.id}
          onClose={() => setScannerOpen(false)}
          onUploaded={() => { setScannerOpen(false); setDocsKey(k => k + 1); }}
        />
      )}

      {/* ─── Fullscreen Lightbox ─── */}
      <AnimatePresence>
        {lightboxIdx !== null && allImgs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}>
            {/* Controls bar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="text-white/70 text-sm font-mono bg-black/50 px-3 py-1.5 rounded-full">{lightboxIdx + 1} / {allImgs.length}</span>
              <a href={allImgs[lightboxIdx]?.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-white" />
              </a>
              <a href={allImgs[lightboxIdx]?.url} download onClick={e => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Download className="w-3.5 h-3.5 text-white" />
              </a>
            </div>
            <button className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" onClick={() => setLightboxIdx(null)}>
              <X className="w-4 h-4 text-white" />
            </button>
            {allImgs.length > 1 && (
              <>
                <button className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i - 1 + allImgs.length) % allImgs.length : 0); }}>
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i + 1) % allImgs.length : 0); }}>
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            <motion.img key={lightboxIdx} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
              src={allImgs[lightboxIdx]?.url} alt="" className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()} />
            {allImgs.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto max-w-[90vw] px-2" onClick={e => e.stopPropagation()}>
                {allImgs.map((img, i) => (
                  <img key={img.id} src={img.url} alt="" onClick={() => setLightboxIdx(i)}
                    className={cn('w-12 h-9 rounded object-cover shrink-0 cursor-pointer border-2 transition-all',
                      i === lightboxIdx ? 'border-primary scale-110' : 'border-transparent opacity-50 hover:opacity-80')} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
