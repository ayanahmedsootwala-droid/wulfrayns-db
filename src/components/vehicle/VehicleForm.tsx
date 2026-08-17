import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Plus, Building2, Sparkles, ScanLine, AlertTriangle,
  User, Phone, MessageSquare, Mail, MapPin, Edit2, ChevronDown,
  ChevronUp, Star, Calculator, TrendingUp, Hash,
  Camera, Trash2, ImageIcon, Upload, CheckCircle2, Star as StarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AISpecParser from '@/components/vehicle/AISpecParser';
import VINDecoder from '@/components/vehicle/VINDecoder';
import {
  createVehicle, updateVehicle, logActivity,
  fetchDealerships, createDealership,
  fetchDealers, createDealer, updateDealer,
  checkDuplicateVehicle,
  fetchVehicleImages, uploadVehicleImage, deleteVehicleImage,
  setPrimaryVehicleImage, reorderVehicleImages,
  fetchParties,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Vehicle, Dealership, Dealer, VehicleImage, Party } from '@/types/types';

interface Props {
  vehicle?: Partial<Vehicle>;
  onSave: (v: Vehicle) => void;
  onCancel: () => void;
}

const defaultVehicle: Partial<Vehicle> = {
  status: 'available', owner_type: 'own', priority: 'normal', is_negotiable: true,
  has_abs: false, has_reverse_camera: false, has_android_panel: false, has_sunroof: false,
  has_alloy_wheels: false, has_push_start: false, has_climate_control: false,
};

export default function VehicleForm({ vehicle, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Partial<Vehicle>>(vehicle ? { ...defaultVehicle, ...vehicle } : defaultVehicle);
  const [saving, setSaving] = useState(false);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dealersForSelected, setDealersForSelected] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [newDealershipOpen, setNewDealershipOpen] = useState(false);
  const [newDealershipName, setNewDealershipName] = useState('');
  const [newDealershipCity, setNewDealershipCity] = useState('');
  const [creatingDealership, setCreatingDealership] = useState(false);
  const [newDealerOpen, setNewDealerOpen] = useState(false);
  const [editDealerOpen, setEditDealerOpen] = useState(false);
  const [dealerForm, setDealerForm] = useState<Partial<Dealer>>({});
  const [savingDealer, setSavingDealer] = useState(false);
  const [dealerExpanded, setDealerExpanded] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [aiParserOpen, setAiParserOpen] = useState(false);
  const [vinDecoderOpen, setVinDecoderOpen] = useState(false);
  // Image management
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageLoadDone, setImageLoadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [dupChecking, setDupChecking] = useState(false);
  // Profit calc live preview
  const estProfit =
    form.expected_selling_price && form.purchase_price
      ? form.expected_selling_price - form.purchase_price - (form.repair_cost ?? 0)
      : null;

  useEffect(() => {
    fetchDealerships({ pageSize: 200 }).then(res => setDealerships(res.data));
    fetchDealers({ pageSize: 200 }).then(res => setDealers(res.data));
    fetchParties({ pageSize: 200 }).then(res => setParties(res.data));
  }, []);

  // When dealership_id changes, filter dealers to that dealership
  useEffect(() => {
    if (!form.dealership_id) {
      setDealersForSelected(dealers);
    } else {
      setDealersForSelected(dealers.filter(d => d.dealership_id === form.dealership_id));
    }
  }, [form.dealership_id, dealers]);

  // Pre-select dealer if form already has dealer_id
  useEffect(() => {
    if (form.dealer_id && dealers.length > 0) {
      const found = dealers.find(d => d.id === form.dealer_id);
      setSelectedDealer(found ?? null);
    }
  }, [form.dealer_id, dealers]);

  const set = (key: keyof Vehicle, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const setD = (key: keyof Dealer, value: unknown) => setDealerForm(prev => ({ ...prev, [key]: value }));

  // Load existing images when editing
  useEffect(() => {
    if (vehicle?.id && !imageLoadDone) {
      fetchVehicleImages(vehicle.id).then(imgs => {
        setImages(imgs);
        setImageLoadDone(true);
      }).catch(() => {/* silent */});
    }
  }, [vehicle?.id, imageLoadDone]);

  const handleImageFiles = useCallback(async (files: FileList | File[]) => {
    if (!vehicle?.id) {
      toast.error('Save the vehicle first, then add photos');
      return;
    }
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    setUploadingImages(true);
    try {
      const existing = images;
      const results: VehicleImage[] = [];
      for (let i = 0; i < arr.length; i++) {
        const img = await uploadVehicleImage(
          vehicle.id,
          arr[i],
          existing.length + results.length,
          existing.length === 0 && results.length === 0,
        );
        results.push(img);
      }
      setImages(prev => [...prev, ...results]);
      toast.success(`${results.length} photo(s) uploaded`);
    } catch (e) {
      console.error('Image upload error:', e);
      toast.error('Photo upload failed');
    } finally {
      setUploadingImages(false);
    }
  }, [vehicle?.id, images]);

  const handleDeleteImage = useCallback(async (img: VehicleImage) => {
    try {
      await deleteVehicleImage(img.id, img.storage_path);
      setImages(prev => prev.filter(i => i.id !== img.id));
      toast.success('Photo removed');
    } catch { toast.error('Failed to remove photo'); }
  }, []);

  const handleSetPrimary = useCallback(async (img: VehicleImage) => {
    if (!vehicle?.id) return;
    try {
      await setPrimaryVehicleImage(img.id, vehicle.id);
      setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === img.id })));
      toast.success('Cover photo set');
    } catch { toast.error('Failed to set cover'); }
  }, [vehicle?.id]);

  const applyAISpec = useCallback((spec: Partial<Vehicle>) => {
    setForm(prev => ({ ...prev, ...spec }));
    toast.success('AI spec applied to form');
  }, []);

  const applyVINData = useCallback((data: { make?: string; year?: number; country?: string }) => {
    setForm(prev => ({
      ...prev,
      ...(data.make && { make: data.make }),
      ...(data.year && { model_year: data.year }),
    }));
    toast.success('VIN data applied');
  }, []);

  const runDuplicateCheck = useCallback(async () => {
    if (vehicle?.id) return;
    const { vin, registration_number, engine_number, make, model, color, mileage } = form;
    if (!vin && !registration_number && !engine_number && !(make && model)) return;
    setDupChecking(true);
    try {
      const result = await checkDuplicateVehicle({
        vin: vin || undefined, registration_number: registration_number || undefined,
        engine_number: engine_number || undefined, make: make || undefined,
        model: model || undefined, color: color || undefined, mileage: mileage || undefined,
      });
      if (result.isDuplicate && result.matches.length > 0) {
        const m = result.matches[0];
        setDuplicateWarning(`Possible duplicate: ${m.make} ${m.model}${m.variant ? ' ' + m.variant : ''} (${m.id.slice(0, 8).toUpperCase()})`);
      } else {
        setDuplicateWarning(null);
      }
    } catch { /* silent */ } finally { setDupChecking(false); }
  }, [form, vehicle?.id]);

  const handleCreateDealership = async () => {
    if (!newDealershipName.trim()) return;
    setCreatingDealership(true);
    try {
      const created = await createDealership({ name: newDealershipName.trim(), city: newDealershipCity.trim() || undefined });
      setDealerships(prev => [...prev, created]);
      set('dealership_id', created.id);
      toast.success(`Dealership "${created.name}" created`);
      setNewDealershipOpen(false); setNewDealershipName(''); setNewDealershipCity('');
    } catch { toast.error('Failed to create dealership'); } finally { setCreatingDealership(false); }
  };

  const handleSaveDealer = async () => {
    if (!dealerForm.name?.trim()) { toast.error('Dealer name is required'); return; }
    setSavingDealer(true);
    try {
      let saved: Dealer;
      if (editDealerOpen && selectedDealer?.id) {
        saved = await updateDealer(selectedDealer.id, dealerForm);
        setDealers(prev => prev.map(d => d.id === saved.id ? saved : d));
        setSelectedDealer(saved);
        toast.success('Dealer updated');
      } else {
        const payload: Partial<Dealer> = {
          ...dealerForm,
          dealership_id: form.dealership_id || undefined,
        };
        saved = await createDealer(payload);
        setDealers(prev => [...prev, saved]);
        set('dealer_id', saved.id);
        setSelectedDealer(saved);
        toast.success(`Dealer "${saved.name}" added`);
      }
      setNewDealerOpen(false); setEditDealerOpen(false); setDealerForm({});
    } catch { toast.error('Failed to save dealer'); } finally { setSavingDealer(false); }
  };

  const handleSelectDealer = (val: string) => {
    if (val === 'none') {
      set('dealer_id', undefined); setSelectedDealer(null);
    } else if (val === 'guest') {
      set('dealer_id', undefined); setSelectedDealer({ id: 'guest', name: 'Guest / Walk-in' } as Dealer);
      setForm(prev => ({ ...prev, dealer_id: undefined, owner_type: 'dealer' }));
    } else {
      set('dealer_id', val);
      const found = dealers.find(d => d.id === val);
      setSelectedDealer(found ?? null);
    }
  };

  const handleSave = async () => {
    if (!form.make || !form.model) { toast.error('Make and Model are required'); return; }
    setSaving(true);
    try {
      let result: Vehicle;
      if (vehicle?.id) {
        await updateVehicle(vehicle.id, form);
        result = { ...vehicle, ...form } as Vehicle;
        await logActivity({ action_type: 'vehicle_updated', entity_type: 'vehicle', entity_id: vehicle.id, entity_name: `${form.make} ${form.model}`, description: `Vehicle updated: ${form.make} ${form.model} ${form.variant || ''}` });
        toast.success('Vehicle updated');
      } else {
        const created = await createVehicle(form);
        result = created;
        await logActivity({ action_type: 'vehicle_added', entity_type: 'vehicle', entity_id: created.id, entity_name: `${form.make} ${form.model}`, description: `New vehicle added: ${form.make} ${form.model} ${form.variant || ''}` });
        toast.success('Vehicle added');
      }
      onSave(result);
    } catch { toast.error('Failed to save vehicle'); } finally { setSaving(false); }
  };

  const isGuest = selectedDealer?.id === 'guest';

  return (
    <>
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-foreground">{vehicle?.id ? 'Edit Vehicle' : 'Add New Vehicle'}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setAiParserOpen(true)} className="border-border text-xs h-8 text-purple-400 border-purple-400/30 hover:bg-purple-400/10">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI Fill
          </Button>
          <Button variant="outline" size="sm" onClick={() => setVinDecoderOpen(true)} className="border-border text-xs h-8 text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
            <ScanLine className="w-3.5 h-3.5 mr-1.5" />VIN Decode
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} className="border-border"><X className="w-3.5 h-3.5 mr-1.5" />Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}><Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving...' : 'Save Vehicle'}</Button>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-orange-400/30 bg-orange-400/8 text-orange-400 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{duplicateWarning}</p>
            <p className="text-xs opacity-75 mt-0.5">You can still save — verify it's not a duplicate listing.</p>
          </div>
          <button onClick={() => setDuplicateWarning(null)} className="shrink-0 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {dupChecking && <p className="text-xs text-muted-foreground mb-2 animate-pulse">Checking for duplicates…</p>}

      <Tabs defaultValue="basic">
        <TabsList className="bg-muted/50 border border-border mb-4 h-9 flex-wrap">
          <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs flex items-center gap-1">
            <Camera className="w-3 h-3" />Photos
            {images.length > 0 && <span className="ml-0.5 bg-primary/20 text-primary rounded-full text-[9px] px-1 font-bold">{images.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="dealer" className="text-xs">Dealer / Owner</TabsTrigger>
          <TabsTrigger value="engine" className="text-xs">Engine</TabsTrigger>
          <TabsTrigger value="condition" className="text-xs">Condition</TabsTrigger>
          <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
        </TabsList>

        {/* ══════════════════════ PHOTOS ══════════════════════ */}
        <TabsContent value="photos" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />Vehicle Photos
              </CardTitle>
              <div className="flex gap-2">
                {!vehicle?.id && (
                  <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">Save vehicle first to upload photos</Badge>
                )}
                {vehicle?.id && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                    <Upload className="w-3 h-3" />{uploadingImages ? 'Uploading…' : 'Add Photos'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleImageFiles(e.target.files)}
              />

              {/* Drop zone (edit mode) */}
              {vehicle?.id && (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                >
                  {uploadingImages ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading photos…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-8 h-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Drop photos here or <span className="text-primary">click to browse</span></p>
                      <p className="text-[11px] text-muted-foreground/60">JPG, PNG, WEBP • Multiple files allowed • Auto-converted to WebP</p>
                    </div>
                  )}
                </div>
              )}

              {/* Photo grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-[4/3]">
                      <img src={img.url} alt="Vehicle" className="w-full h-full object-cover" />
                      {img.is_primary && (
                        <div className="absolute top-1.5 left-1.5">
                          <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground gap-0.5">
                            <StarIcon className="w-2.5 h-2.5" />Cover
                          </Badge>
                        </div>
                      )}
                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!img.is_primary && (
                          <button
                            className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors"
                            title="Set as cover photo"
                            onClick={() => handleSetPrimary(img)}
                          >
                            <StarIcon className="w-3.5 h-3.5 text-primary-foreground" />
                          </button>
                        )}
                        <button
                          className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-500 transition-colors"
                          title="Delete photo"
                          onClick={() => handleDeleteImage(img)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !vehicle?.id ? (
                  <div className="text-center py-8">
                    <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Save the vehicle first, then add photos</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No photos yet — drag & drop or click Add Photos above</p>
                )
              )}

              {images.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {images.length} photo(s) · <span className="text-primary">{images.find(i => i.is_primary) ? 'Cover set' : 'Hover a photo → ⭐ to set as cover'}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ BASIC INFO ══════════════════════ */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-primary" />Vehicle Identity</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="VIN" value={form.vin} onChange={v => set('vin', v)} onBlur={runDuplicateCheck} placeholder="e.g. WBA3A5G59DNP26082" />
                <FormField label="Engine Number" value={form.engine_number} onChange={v => set('engine_number', v)} onBlur={runDuplicateCheck} />
                <FormField label="Registration Number" value={form.registration_number} onChange={v => set('registration_number', v)} onBlur={runDuplicateCheck} placeholder="e.g. LEA-1234" />
                <FormField label="Stock Number" value={form.stock_number} onChange={v => set('stock_number', v)} placeholder="e.g. RPM-0042" />
                <FormField label="Chassis Number" value={form.chassis_number as string | undefined} onChange={v => set('chassis_number' as keyof Vehicle, v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Basic Information</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Make *" value={form.make} onChange={v => set('make', v)} placeholder="e.g. Toyota" required />
                <FormField label="Model *" value={form.model} onChange={v => set('model', v)} placeholder="e.g. Corolla" required />
                <FormField label="Variant" value={form.variant} onChange={v => set('variant', v)} placeholder="e.g. Altis X" />
                <FormField label="Model Year" value={form.model_year?.toString()} onChange={v => set('model_year', parseInt(v) || undefined)} type="number" placeholder="2023" />
                <FormField label="Registration Year" value={form.registration_year?.toString()} onChange={v => set('registration_year', parseInt(v) || undefined)} type="number" />
                <FormField label="Registration City" value={form.registration_city} onChange={v => set('registration_city', v)} />
                <SelectField label="Body Type" value={form.body_type || ''} onChange={v => set('body_type', v)} options={['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Crossover', 'Wagon', 'Convertible', 'Coupe', 'Van', 'Minivan', 'Truck']} />
                <SelectField label="Status" value={form.status || 'available'} onChange={v => set('status', v)} options={['available', 'reserved', 'booked', 'sold', 'incoming', 'inspection', 'archived']} />
                <SelectField label="Condition" value={form.vehicle_condition || ''} onChange={v => set('vehicle_condition', v || undefined)} options={['used', 'new']} />
                <FormField label="Exterior Color" value={form.color} onChange={v => set('color', v)} placeholder="e.g. Pearl White" />
                <FormField label="Interior Color" value={form.interior_color} onChange={v => set('interior_color', v)} />
                <SelectField label="Origin" value={form.origin || ''} onChange={v => set('origin', v)} options={['local', 'imported', 'grey_import']} />
                <FormField label="Number of Seats" value={form.seats?.toString()} onChange={v => set('seats', parseInt(v) || undefined)} type="number" placeholder="5" />
                <FormField label="Number of Doors" value={form.doors?.toString()} onChange={v => set('doors', parseInt(v) || undefined)} type="number" placeholder="4" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {[
                  { label: '🔥 Hot Deal', key: 'is_hot_deal' },
                  { label: '⭐ Featured', key: 'is_featured' },
                  { label: '⚡ Urgent', key: 'is_urgent' },
                  { label: 'Negotiable', key: 'is_negotiable' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Checkbox checked={!!(form[f.key as keyof Vehicle])} onCheckedChange={v => set(f.key as keyof Vehicle, !!v)} className="border-border" />
                    <Label className="text-sm text-foreground cursor-pointer">{f.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ DEALER / OWNER ══════════════════════ */}
        <TabsContent value="dealer" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-primary" />Owner Type
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <SelectField label="Owner Type" value={form.owner_type || 'own'} onChange={v => {
                set('owner_type', v);
                if (v !== 'dealer') { set('dealer_id', undefined); set('dealership_id', undefined); }
                if (v !== 'party') { set('party_id', undefined); }
              }} options={['own', 'dealer', 'party']} />
            </CardContent>
          </Card>

          {form.owner_type === 'party' && (
            <Card className="bg-card border-border">
              <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />Party (Client)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Select Party</Label>
                  <Select value={form.party_id || 'none'} onValueChange={v => set('party_id', v === 'none' ? undefined : v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="— Select party —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No party assigned —</SelectItem>
                      {parties.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            {p.city && <span className="text-xs text-muted-foreground">{p.city}</span>}
                          </div>
                        </SelectItem>
                      ))}
                      {parties.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No parties found — add from Parties page</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {form.party_id && (() => {
                  const p = parties.find(x => x.id === form.party_id);
                  return p ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                      {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {form.owner_type === 'dealer' && (
            <>
              {/* ── Dealership ── */}
              <Card className="bg-card border-border">
                <CardHeader className="px-4 py-3 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary" />Dealership
                    <span className="text-xs text-muted-foreground font-normal">(optional — filters dealers below)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex gap-1.5">
                    <Select value={form.dealership_id || 'none'} onValueChange={v => { set('dealership_id', v === 'none' ? undefined : v); set('dealer_id', undefined); setSelectedDealer(null); }}>
                      <SelectTrigger className="h-8 text-sm bg-muted/50 border-border flex-1">
                        <SelectValue placeholder="Select dealership" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-sm">— Any / Not specified —</SelectItem>
                        {dealerships.map(d => (
                          <SelectItem key={d.id} value={d.id} className="text-sm">{d.name}{d.city ? ` · ${d.city}` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0 border-border" title="Add new dealership" onClick={() => setNewDealershipOpen(true)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {form.dealership_id && dealerships.find(d => d.id === form.dealership_id) && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{dealerships.find(d => d.id === form.dealership_id)?.name}</span>
                      {dealerships.find(d => d.id === form.dealership_id)?.city && (
                        <span className="text-muted-foreground">· {dealerships.find(d => d.id === form.dealership_id)?.city}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Dealer Contact ── */}
              <Card className="bg-card border-border border-2 border-primary/20">
                <CardHeader className="px-4 py-3 pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />Dealer Contact
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Required for listing</Badge>
                    </CardTitle>
                    <button onClick={() => setDealerExpanded(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {dealerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </CardHeader>
                {dealerExpanded && (
                  <CardContent className="px-4 pb-4 pt-3 space-y-3">
                    {/* Dealer selector */}
                    <div className="flex gap-1.5">
                      <Select
                        value={isGuest ? 'guest' : (form.dealer_id || 'none')}
                        onValueChange={handleSelectDealer}
                      >
                        <SelectTrigger className="h-8 text-sm bg-muted/50 border-border flex-1">
                          <SelectValue placeholder="Select dealer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-sm text-muted-foreground">— No dealer assigned —</SelectItem>
                          <SelectItem value="guest" className="text-sm text-muted-foreground">👤 Guest / Walk-in (no contact saved)</SelectItem>
                          <Separator className="my-1" />
                          {dealersForSelected.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">No dealers found{form.dealership_id ? ' for this dealership' : ''}</div>
                          )}
                          {dealersForSelected.map(d => (
                            <SelectItem key={d.id} value={d.id} className="text-sm">
                              <span className="flex items-center gap-2">
                                <span>{d.name}</span>
                                {d.rating && <span className="text-yellow-400 text-[10px]">★{d.rating.toFixed(1)}</span>}
                                {d.city && <span className="text-muted-foreground text-[10px]">{d.city}</span>}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-8 w-8 shrink-0 border-border text-green-400 border-green-400/30 hover:bg-green-400/10"
                        title="Add new dealer"
                        onClick={() => { setDealerForm({ dealership_id: form.dealership_id || undefined }); setNewDealerOpen(true); }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      {selectedDealer && !isGuest && (
                        <Button
                          type="button" variant="outline" size="icon"
                          className="h-8 w-8 shrink-0 border-border text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                          title="Edit this dealer"
                          onClick={() => { setDealerForm({ ...selectedDealer }); setEditDealerOpen(true); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Dealer info preview */}
                    {selectedDealer && !isGuest && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shrink-0">
                            {selectedDealer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{selectedDealer.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {selectedDealer.rating && <span className="text-xs text-yellow-400 font-medium">★ {selectedDealer.rating.toFixed(1)}</span>}
                              {selectedDealer.trust_score && <span className="text-xs text-primary">Trust {selectedDealer.trust_score}%</span>}
                              {selectedDealer.deals_done && <span className="text-xs text-muted-foreground">{selectedDealer.deals_done} deals</span>}
                              {selectedDealer.city && <span className="text-xs text-muted-foreground">{selectedDealer.city}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          {selectedDealer.phone && (
                            <a href={`tel:${selectedDealer.phone}`} className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
                              <Phone className="w-3 h-3 text-primary shrink-0" />{selectedDealer.phone}
                            </a>
                          )}
                          {selectedDealer.whatsapp && (
                            <a href={`https://wa.me/${selectedDealer.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-green-400 hover:underline">
                              <MessageSquare className="w-3 h-3 shrink-0" />{selectedDealer.whatsapp}
                            </a>
                          )}
                          {selectedDealer.email && (
                            <a href={`mailto:${selectedDealer.email}`} className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
                              <Mail className="w-3 h-3 text-primary shrink-0" />{selectedDealer.email}
                            </a>
                          )}
                          {(selectedDealer.address || selectedDealer.area) && (
                            <span className="flex items-start gap-1.5 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                              {[selectedDealer.address, selectedDealer.area, selectedDealer.city].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {isGuest && (
                      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4 shrink-0" />
                        <span>Walk-in / Guest — no dealer contact saved. Vehicle will show without dealer info.</span>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════ ENGINE ══════════════════════ */}
        <TabsContent value="engine" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Engine & Drivetrain</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Engine Capacity" value={form.engine_capacity} onChange={v => set('engine_capacity', v)} placeholder="e.g. 1800cc" />
                <FormField label="Engine Type" value={form.engine_type as string | undefined} onChange={v => set('engine_type' as keyof Vehicle, v)} placeholder="e.g. 2ZR-FE" />
                <FormField label="Cylinders" value={form.cylinders?.toString()} onChange={v => set('cylinders', parseInt(v) || undefined)} type="number" placeholder="4" />
                <FormField label="Horsepower" value={form.horsepower?.toString()} onChange={v => set('horsepower', parseInt(v) || undefined)} type="number" />
                <FormField label="Torque (Nm)" value={form.torque?.toString()} onChange={v => set('torque', parseInt(v) || undefined)} type="number" />
                <SelectField label="Fuel Type" value={form.fuel_type || ''} onChange={v => set('fuel_type', v)} options={['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG', 'LPG']} />
                <SelectField label="Transmission" value={form.transmission || ''} onChange={v => set('transmission', v)} options={['Automatic', 'Manual', 'CVT', 'DSG', 'AMT']} />
                <SelectField label="Drive Type" value={form.drive_type || ''} onChange={v => set('drive_type', v)} options={['FWD', 'RWD', 'AWD', '4WD']} />
                <FormField label="Mileage (km)" value={form.mileage?.toString() ?? ''} onChange={v => set('mileage', v === '' ? undefined : parseInt(v))} type="number" />
                <FormField label="Fuel Economy (km/L)" value={form.fuel_economy?.toString()} onChange={v => set('fuel_economy' as keyof Vehicle, parseFloat(v) || undefined)} type="number" placeholder="12.5" />
                <FormField label="Battery (kWh)" value={form.battery_capacity?.toString()} onChange={v => set('battery_capacity' as keyof Vehicle, parseFloat(v) || undefined)} type="number" placeholder="EV only" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Checkbox checked={!!form.is_turbo} onCheckedChange={v => set('is_turbo', !!v)} className="border-border" />
                <Label className="text-sm text-foreground cursor-pointer">Turbocharged</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ CONDITION ══════════════════════ */}
        <TabsContent value="condition" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Condition Scores (1–10)</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Overall Condition', key: 'overall_condition' },
                  { label: 'Inspection Score', key: 'inspection_score' },
                  { label: 'Engine Health', key: 'engine_health' },
                  { label: 'Transmission', key: 'transmission_health' },
                  { label: 'Suspension', key: 'suspension_condition' },
                  { label: 'Brakes', key: 'brakes_condition' },
                  { label: 'Tyres', key: 'tyres_condition' },
                  { label: 'AC', key: 'ac_condition' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={1} max={10}
                        value={(form[f.key as keyof Vehicle] as number | undefined)?.toString() || ''}
                        onChange={e => set(f.key as keyof Vehicle, parseInt(e.target.value) || undefined)}
                        placeholder="1-10"
                        className="h-8 text-sm bg-muted/50 border-border"
                      />
                      {(form[f.key as keyof Vehicle] as number | undefined) != null && (
                        <span className={cn('text-xs font-bold w-7 text-center',
                          ((form[f.key as keyof Vehicle] as number) ?? 0) >= 8 ? 'text-green-400' :
                          ((form[f.key as keyof Vehicle] as number) ?? 0) >= 5 ? 'text-yellow-400' : 'text-red-400',
                        )}>{form[f.key as keyof Vehicle] as number}/10</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Panels Painted" value={form.panels_painted?.toString()} onChange={v => set('panels_painted', parseInt(v) || undefined)} type="number" placeholder="0" />
                <FormField label="Panels Replaced" value={form.panels_replaced?.toString()} onChange={v => set('panels_replaced', parseInt(v) || undefined)} type="number" placeholder="0" />
                <FormField label="Airbags" value={form.airbag_count?.toString()} onChange={v => set('airbag_count', parseInt(v) || undefined)} type="number" placeholder="2" />
                <FormField label="Last Service Date" value={form.last_service_date as string | undefined} onChange={v => set('last_service_date' as keyof Vehicle, v)} type="date" />
                <FormField label="Next Service (km)" value={form.next_service_km?.toString()} onChange={v => set('next_service_km' as keyof Vehicle, parseInt(v) || undefined)} type="number" />
                <FormField label="Tyre Brand" value={form.tyre_brand as string | undefined} onChange={v => set('tyre_brand' as keyof Vehicle, v)} placeholder="e.g. Bridgestone" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ FEATURES ══════════════════════ */}
        <TabsContent value="features" className="space-y-3">
          {([
            { title: '🛡️ Safety', items: [
              { label: 'ABS', key: 'has_abs' }, { label: 'ESP / Stability', key: 'has_esp' },
              { label: 'Traction Control', key: 'has_traction_control' }, { label: 'Cruise Control', key: 'has_cruise_control' },
              { label: 'Adaptive Cruise', key: 'has_adaptive_cruise' }, { label: 'Lane Assist', key: 'has_lane_assist' },
              { label: 'Blind Spot Monitor', key: 'has_blind_spot' }, { label: '360° Camera', key: 'has_360_camera' },
              { label: 'Parking Sensors', key: 'has_parking_sensors' }, { label: 'Reverse Camera', key: 'has_reverse_camera' },
              { label: 'TPMS', key: 'has_tpms' }, { label: 'Hill Assist', key: 'has_hill_assist' },
              { label: 'Auto Hold', key: 'has_auto_hold' },
            ]},
            { title: '❄️ Comfort', items: [
              { label: 'Push Start', key: 'has_push_start' }, { label: 'Keyless Entry', key: 'has_keyless_entry' },
              { label: 'Climate Control', key: 'has_climate_control' }, { label: 'Dual Zone AC', key: 'has_dual_zone_ac' },
              { label: 'Rear AC', key: 'has_rear_ac' }, { label: 'Electric Seats', key: 'has_electric_seats' },
              { label: 'Heated Seats', key: 'has_heated_seats' }, { label: 'Ventilated Seats', key: 'has_ventilated_seats' },
              { label: 'Memory Seats', key: 'has_memory_seats' }, { label: 'Massage Seats', key: 'has_massage_seats' },
              { label: 'Ambient Lighting', key: 'has_ambient_lighting' }, { label: 'Power Tailgate', key: 'has_power_tailgate' },
            ]},
            { title: '🎵 Tech & Infotainment', items: [
              { label: 'Android Panel', key: 'has_android_panel' }, { label: 'Apple CarPlay', key: 'has_apple_carplay' },
              { label: 'Android Auto', key: 'has_android_auto' }, { label: 'Navigation / GPS', key: 'has_navigation' },
              { label: 'Bluetooth', key: 'has_bluetooth' }, { label: 'USB', key: 'has_usb' },
              { label: 'Wireless Charging', key: 'has_wireless_charging' }, { label: 'Premium Audio', key: 'has_premium_audio' },
              { label: 'Steering Controls', key: 'has_steering_controls' }, { label: 'Rear Entertainment', key: 'has_rear_entertainment' },
              { label: 'Dash Cam', key: 'has_dash_cam' },
            ]},
            { title: '✨ Exterior & Style', items: [
              { label: 'Sunroof', key: 'has_sunroof' }, { label: 'Panoramic Roof', key: 'has_panoramic_roof' },
              { label: 'Alloy Wheels', key: 'has_alloy_wheels' }, { label: 'LED Lights', key: 'has_led_lights' },
              { label: 'Fog Lamps', key: 'has_fog_lamps' }, { label: 'Roof Rails', key: 'has_roof_rails' },
              { label: 'Spoiler', key: 'has_spoiler' }, { label: 'Side Steps', key: 'has_side_steps' },
            ]},
          ] as { title: string; items: { label: string; key: string }[] }[]).map(section => (
            <Card key={section.title} className="bg-card border-border">
              <CardHeader className="px-4 py-2.5 pb-2">
                <CardTitle className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>{section.title}</span>
                  <span className="text-muted-foreground font-normal">
                    {section.items.filter(f => !!(form[f.key as keyof Vehicle])).length}/{section.items.length} selected
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {section.items.map(f => (
                    <div key={f.key}
                      onClick={() => set(f.key as keyof Vehicle, !(form[f.key as keyof Vehicle]))}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors text-xs',
                        form[f.key as keyof Vehicle]
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <Checkbox
                        checked={!!(form[f.key as keyof Vehicle])}
                        onCheckedChange={v => set(f.key as keyof Vehicle, !!v)}
                        className="border-border pointer-events-none shrink-0"
                      />
                      <span className="font-medium">{f.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom / Additional Features */}
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-2.5 pb-2">
              <CardTitle className="text-xs font-semibold text-foreground">⚙️ Custom / Additional Features</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                List any features not covered above — separate with commas.
                e.g. <span className="text-foreground/70">Sunshade, Privacy Glass, Scuff Guards, Trunk Organiser</span>
              </p>
              <textarea
                value={(form.custom_features as string) ?? ''}
                onChange={e => set('custom_features' as keyof Vehicle, e.target.value)}
                placeholder="e.g. Privacy Glass, Rear Sunshade, Carbon Fibre Trim, Trunk Liner…"
                rows={3}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ PRICING ══════════════════════ */}
        <TabsContent value="pricing" className="space-y-4">
          {/* Live Profit Calculator */}
          {estProfit != null && (
            <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border font-medium text-sm',
              estProfit >= 0 ? 'bg-green-500/8 border-green-500/25 text-green-400' : 'bg-red-500/8 border-red-500/25 text-red-400',
            )}>
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Est. Profit: <strong>PKR {Math.abs(estProfit).toLocaleString()}</strong>{estProfit < 0 ? ' (loss)' : ''}</span>
              <span className="ml-auto text-xs opacity-70 flex items-center gap-1"><Calculator className="w-3 h-3" />Live calc</span>
            </div>
          )}

          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" />Pricing (PKR)</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Label className="text-xs font-semibold text-primary mb-1.5 block">Demand Price (Asking) *</Label>
                <input
                  type="number"
                  value={form.expected_selling_price ?? ''}
                  onChange={e => set('expected_selling_price', parseFloat(e.target.value) || undefined)}
                  placeholder="e.g. 4500000"
                  className="w-full h-9 rounded-md border border-primary/40 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Cost Price (Purchase)" value={form.purchase_price?.toString()} onChange={v => set('purchase_price', parseFloat(v) || undefined)} type="number" placeholder="What you paid" />
                <FormField label="Repair / Refurb Cost" value={form.repair_cost?.toString()} onChange={v => set('repair_cost', parseFloat(v) || undefined)} type="number" placeholder="0" />
                <FormField label="Import / Duty Cost" value={form.import_cost?.toString()} onChange={v => set('import_cost' as keyof Vehicle, parseFloat(v) || undefined)} type="number" placeholder="0" />
                <FormField label="Minimum Accept Price" value={form.min_selling_price?.toString()} onChange={v => set('min_selling_price', parseFloat(v) || undefined)} type="number" placeholder="Floor price" />
                <FormField label="Market / Book Value" value={form.market_price?.toString()} onChange={v => set('market_price', parseFloat(v) || undefined)} type="number" placeholder="Market rate" />
                <FormField label="Last Offer Received" value={form.last_offer?.toString()} onChange={v => set('last_offer', parseFloat(v) || undefined)} type="number" placeholder="e.g. 4200000" />
                <FormField label="Sold At Price" value={form.sold_price?.toString()} onChange={v => { const sp = parseFloat(v) || undefined; const profit = sp && form.purchase_price ? sp - form.purchase_price - (form.repair_cost ?? 0) : undefined; set('sold_price', sp); set('profit_estimate', profit); }} type="number" placeholder="Actual sale price" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.is_negotiable} onCheckedChange={v => set('is_negotiable', !!v)} className="border-border" />
                <Label className="text-sm text-foreground cursor-pointer">Price is Negotiable</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ WORKFLOW ══════════════════════ */}
        <TabsContent value="workflow" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Workflow & Pipeline</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SelectField label="Priority" value={form.priority || 'normal'} onChange={v => set('priority', v)} options={['low', 'normal', 'high', 'urgent']} />
                <FormField label="Listed Date" value={form.listing_date as string | undefined} onChange={v => set('listing_date' as keyof Vehicle, v)} type="date" />
                <FormField label="Target Sale Date" value={form.target_sale_date as string | undefined} onChange={v => set('target_sale_date' as keyof Vehicle, v)} type="date" />
                <FormField label="Purchase Date" value={form.purchase_date as string | undefined} onChange={v => set('purchase_date' as keyof Vehicle, v)} type="date" />
                <FormField label="Sold Date" value={form.sold_date as string | undefined} onChange={v => set('sold_date' as keyof Vehicle, v)} type="date" />
                <FormField label="Inspection Date" value={form.inspection_date as string | undefined} onChange={v => set('inspection_date' as keyof Vehicle, v)} type="date" />
              </div>
              <Separator className="my-1" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Inspection Done', key: 'inspection_done' },
                  { label: 'Documents Clear', key: 'documents_clear' },
                  { label: 'Ready for Sale', key: 'ready_for_sale' },
                  { label: 'Photos Taken', key: 'photos_taken' },
                  { label: 'Repair Done', key: 'repair_done' },
                  { label: 'Advertised Online', key: 'advertised_online' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Checkbox checked={!!(form[f.key as keyof Vehicle])} onCheckedChange={v => set(f.key as keyof Vehicle, !!v)} className="border-border" />
                    <Label className="text-sm text-foreground cursor-pointer">{f.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════ NOTES ══════════════════════ */}
        <TabsContent value="notes" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="px-4 py-3 pb-2"><CardTitle className="text-sm font-medium text-foreground">Notes & Memos</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { label: 'Mechanical Notes', key: 'mechanical_notes' as keyof Vehicle },
                { label: 'Inspection Notes', key: 'inspection_notes' as keyof Vehicle },
                { label: 'Negotiation Notes', key: 'negotiation_notes' as keyof Vehicle },
                { label: 'Customer Notes', key: 'customer_notes' as keyof Vehicle },
                { label: 'Private Notes (internal only)', key: 'private_notes' as keyof Vehicle },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-sm text-foreground mb-1.5 block">{f.label}</Label>
                  <Textarea
                    value={(form[f.key] as string) || ''}
                    onChange={e => set(f.key, e.target.value)}
                    className="bg-muted/50 border-border resize-none text-sm"
                    rows={3}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* ── AI Spec Parser ── */}
    <AISpecParser open={aiParserOpen} onClose={() => setAiParserOpen(false)} onApply={(spec) => applyAISpec(spec as Partial<Vehicle>)} />

    {/* ── VIN Decoder ── */}
    <VINDecoder open={vinDecoderOpen} onClose={() => setVinDecoderOpen(false)} onApply={(data) => applyVINData(data as { make?: string; year?: number; country?: string })} />

    {/* ── New Dealership Dialog ── */}
    <Dialog open={newDealershipOpen} onOpenChange={setNewDealershipOpen}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Add New Dealership</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div><Label className="text-xs text-muted-foreground mb-1 block">Dealership Name *</Label>
            <Input value={newDealershipName} onChange={e => setNewDealershipName(e.target.value)} placeholder="e.g. Al-Hamd Motors" className="h-8 text-sm bg-muted/50 border-border" onKeyDown={e => { if (e.key === 'Enter') handleCreateDealership(); }} /></div>
          <div><Label className="text-xs text-muted-foreground mb-1 block">City</Label>
            <Input value={newDealershipCity} onChange={e => setNewDealershipCity(e.target.value)} placeholder="e.g. Lahore" className="h-8 text-sm bg-muted/50 border-border" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={() => setNewDealershipOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDealership} disabled={!newDealershipName.trim() || creatingDealership}>{creatingDealership ? 'Creating…' : 'Create Dealership'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Add / Edit Dealer Dialog ── */}
    <Dialog open={newDealerOpen || editDealerOpen} onOpenChange={open => { if (!open) { setNewDealerOpen(false); setEditDealerOpen(false); setDealerForm({}); } }}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {editDealerOpen ? `Edit Dealer — ${selectedDealer?.name}` : 'Add New Dealer'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Full Name *</Label>
              <Input value={dealerForm.name || ''} onChange={e => setD('name', e.target.value)} placeholder="e.g. Ahmed Raza" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
              <Input value={dealerForm.phone || ''} onChange={e => setD('phone', e.target.value)} placeholder="03XX-XXXXXXX" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
              <Input value={dealerForm.whatsapp || ''} onChange={e => setD('whatsapp', e.target.value)} placeholder="923XXXXXXXXX" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
              <Input value={dealerForm.email || ''} onChange={e => setD('email', e.target.value)} placeholder="dealer@example.com" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
              <Input value={dealerForm.city || ''} onChange={e => setD('city', e.target.value)} placeholder="Lahore" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Area</Label>
              <Input value={dealerForm.area || ''} onChange={e => setD('area', e.target.value)} placeholder="Defence" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Address</Label>
              <Input value={dealerForm.address || ''} onChange={e => setD('address', e.target.value)} placeholder="Shop 5, Auto Market..." className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Rating (1–5)</Label>
              <Input value={dealerForm.rating?.toString() || ''} onChange={e => setD('rating', parseFloat(e.target.value) || undefined)} type="number" min={1} max={5} step={0.1} className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Trust Score (%)</Label>
              <Input value={dealerForm.trust_score?.toString() || ''} onChange={e => setD('trust_score', parseInt(e.target.value) || undefined)} type="number" min={0} max={100} className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Deals Done</Label>
              <Input value={dealerForm.deals_done?.toString() || ''} onChange={e => setD('deals_done', parseInt(e.target.value) || undefined)} type="number" min={0} className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">CNIC</Label>
              <Input value={dealerForm.cnic || ''} onChange={e => setD('cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Google Maps URL</Label>
              <Input value={dealerForm.google_maps_url || ''} onChange={e => setD('google_maps_url', e.target.value)} placeholder="https://maps.google.com/..." className="h-8 text-sm bg-muted/50 border-border" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox checked={!!dealerForm.is_favorite} onCheckedChange={v => setD('is_favorite', !!v)} className="border-border" />
              <Label className="text-sm cursor-pointer flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />Mark as Favourite</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={() => { setNewDealerOpen(false); setEditDealerOpen(false); setDealerForm({}); }}>Cancel</Button>
          <Button onClick={handleSaveDealer} disabled={!dealerForm.name?.trim() || savingDealer}>{savingDealer ? 'Saving…' : editDealerOpen ? 'Update Dealer' : 'Add Dealer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function FormField({ label, value, onChange, onBlur, type = 'text', placeholder, required }: {
  label: string; value?: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="h-8 text-sm bg-muted/50 border-border"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm bg-muted/50 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o} className="text-sm">{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
