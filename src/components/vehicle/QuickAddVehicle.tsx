import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Zap, Save, Palette, AlertCircle, CheckCircle2, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { createVehicle, logActivity } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT'];
const CUR_YEAR = new Date().getFullYear();
const REG_YEARS = Array.from({ length: CUR_YEAR - 1989 }, (_, i) => String(CUR_YEAR - i));
const COLORS = [
  'White', 'Silver', 'Black', 'Grey', 'Red', 'Blue', 'Navy Blue',
  'Maroon', 'Brown', 'Beige', 'Gold', 'Champagne', 'Pearl White',
  'Green', 'Orange', 'Yellow', 'Purple', 'Other',
];

const DRAFT_KEY = 'quick_add_vehicle_draft';

interface FormState {
  make: string; model: string; model_year: string; mileage: string;
  expected_selling_price: string; transmission: string; dealer_city: string;
  registration_year: string; color: string; color_custom: string;
  touchups: string; colorMode: 'preset' | 'custom';
}

const EMPTY_FORM: FormState = {
  make: '', model: '', model_year: '', mileage: '',
  expected_selling_price: '', transmission: '', dealer_city: '',
  registration_year: '', color: '', color_custom: '',
  touchups: '', colorMode: 'preset',
};

// ── Validation ────────────────────────────────────────────────────────────────
interface Errors { make?: string; model?: string; model_year?: string; mileage?: string; expected_selling_price?: string; }

function validate(form: FormState): Errors {
  const e: Errors = {};
  if (!form.make.trim()) e.make = 'Make is required';
  if (!form.model.trim()) e.model = 'Model is required';
  if (form.model_year) {
    const y = parseInt(form.model_year);
    if (isNaN(y) || y < 1950 || y > CUR_YEAR + 1) e.model_year = `Year must be 1950–${CUR_YEAR + 1}`;
  }
  if (form.mileage) {
    const m = parseInt(form.mileage);
    if (isNaN(m) || m < 0) e.mileage = 'Mileage must be a positive number';
  }
  if (form.expected_selling_price) {
    const p = parseFloat(form.expected_selling_price);
    if (isNaN(p) || p <= 0) e.expected_selling_price = 'Price must be greater than 0';
  }
  return e;
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function FieldWrap({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuickAddVehicle({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouch] = useState<Set<string>>(new Set());
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for saved draft when dialog opens
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { form: FormState; savedAt: string };
        setHasDraft(true);
        setDraftSavedAt(parsed.savedAt);
      } catch { localStorage.removeItem(DRAFT_KEY); }
    }
  }, [open]);

  // Auto-save draft 800 ms after last keystroke
  const scheduleDraft = useCallback((f: FormState) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const hasContent = f.make || f.model || f.model_year || f.mileage || f.expected_selling_price;
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: f, savedAt: new Date().toLocaleTimeString() }));
        setDraftSavedAt(new Date().toLocaleTimeString());
      }
    }, 800);
  }, []);

  const set = useCallback((k: keyof FormState, v: string) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      scheduleDraft(next);
      // Real-time validation for touched fields
      setErrors(prev => {
        const newErrs = validate(next);
        const updated = { ...prev };
        if (touched.has(k)) {
          if (newErrs[k as keyof Errors]) updated[k as keyof Errors] = newErrs[k as keyof Errors];
          else delete updated[k as keyof Errors];
        }
        return updated;
      });
      return next;
    });
  }, [scheduleDraft, touched]);

  const markTouched = (k: string) => setTouch(prev => new Set([...prev, k]));

  const restoreDraft = () => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const { form: saved } = JSON.parse(raw) as { form: FormState; savedAt: string };
      setForm(saved);
      setHasDraft(false);
      toast.success('Draft restored');
    } catch { localStorage.removeItem(DRAFT_KEY); }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setDraftSavedAt(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setTouch(new Set());
  };

  const handleClose = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    onClose();
  };

  const handleSave = async (openFull = false) => {
    // Mark all fields touched and validate
    const allKeys: Array<keyof Errors> = ['make', 'model', 'model_year', 'mileage', 'expected_selling_price'];
    setTouch(new Set(allKeys));
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted errors');
      return;
    }

    setSaving(true);
    try {
      const resolvedColor = form.colorMode === 'custom' ? form.color_custom : form.color;
      const payload = {
        make: form.make.trim(),
        model: form.model.trim(),
        model_year: form.model_year ? parseInt(form.model_year) : undefined,
        mileage: form.mileage ? parseInt(form.mileage) : undefined,
        expected_selling_price: form.expected_selling_price ? parseFloat(form.expected_selling_price) : undefined,
        transmission: form.transmission || undefined,
        dealer_city: form.dealer_city || undefined,
        registration_year: form.registration_year && form.registration_year !== 'unreg'
          ? parseInt(form.registration_year) : undefined,
        color: resolvedColor || undefined,
        touchups: form.touchups || undefined,
        status: 'available' as const,
      };
      const created = await createVehicle(payload);
      await logActivity({
        action_type: 'vehicle_added', entity_type: 'vehicle', entity_id: created.id,
        entity_name: `${form.make} ${form.model}`,
        description: `Quick-added: ${form.make} ${form.model}`,
      });
      localStorage.removeItem(DRAFT_KEY);
      setForm(EMPTY_FORM); setErrors({}); setTouch(new Set()); setHasDraft(false);
      toast.success('Vehicle created!');
      onCreated?.(created.id);
      onClose();
      if (openFull) navigate(`/inventory/${created.id}`);
    } catch {
      toast.error('Failed to create vehicle');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (k: keyof Errors) =>
    cn('h-8 text-sm bg-muted/50 border-border', errors[k] && touched.has(k) && 'border-destructive focus-visible:ring-destructive/30');

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-md p-0 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-sm font-semibold text-foreground">Quick Add Vehicle</span>
            {draftSavedAt && !hasDraft && (
              <span className="hidden md:flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                <CheckCircle2 className="w-3 h-3" />Draft saved {draftSavedAt}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Draft restore banner */}
        {hasDraft && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-xs">
            <History className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="flex-1 text-muted-foreground">Unsaved draft found from {draftSavedAt}</span>
            <button onClick={restoreDraft} className="text-primary font-medium hover:underline shrink-0">Restore</button>
            <button onClick={clearDraft} className="text-muted-foreground hover:text-destructive shrink-0 ml-1">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Make */}
            <FieldWrap label="Make" required error={touched.has('make') ? errors.make : undefined}>
              <Input
                value={form.make}
                onChange={e => set('make', e.target.value)}
                onBlur={() => markTouched('make')}
                placeholder="e.g. Toyota"
                className={inputCls('make')}
              />
            </FieldWrap>

            {/* Model */}
            <FieldWrap label="Model" required error={touched.has('model') ? errors.model : undefined}>
              <Input
                value={form.model}
                onChange={e => set('model', e.target.value)}
                onBlur={() => markTouched('model')}
                placeholder="e.g. Civic"
                className={inputCls('model')}
              />
            </FieldWrap>

            {/* Model Year */}
            <FieldWrap label="Model Year" error={touched.has('model_year') ? errors.model_year : undefined}>
              <Input
                value={form.model_year}
                onChange={e => set('model_year', e.target.value)}
                onBlur={() => markTouched('model_year')}
                placeholder={String(CUR_YEAR)}
                type="number"
                className={inputCls('model_year')}
              />
            </FieldWrap>

            {/* Reg Year */}
            <FieldWrap label="Reg Year">
              <Select value={form.registration_year} onValueChange={v => set('registration_year', v)}>
                <SelectTrigger className="h-8 text-sm bg-muted/50 border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreg" className="text-sm text-orange-400">Unreg</SelectItem>
                  {REG_YEARS.map(y => <SelectItem key={y} value={y} className="text-sm">{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldWrap>

            {/* Mileage */}
            <FieldWrap label="Mileage (km)" error={touched.has('mileage') ? errors.mileage : undefined}>
              <Input
                value={form.mileage}
                onChange={e => set('mileage', e.target.value)}
                onBlur={() => markTouched('mileage')}
                placeholder="42000"
                type="number"
                className={inputCls('mileage')}
              />
            </FieldWrap>

            {/* Demand Price */}
            <FieldWrap label="Demand Price" error={touched.has('expected_selling_price') ? errors.expected_selling_price : undefined}>
              <Input
                value={form.expected_selling_price}
                onChange={e => set('expected_selling_price', e.target.value)}
                onBlur={() => markTouched('expected_selling_price')}
                placeholder="4500000"
                type="number"
                className={inputCls('expected_selling_price')}
              />
            </FieldWrap>

            {/* City */}
            <FieldWrap label="City">
              <Input
                value={form.dealer_city}
                onChange={e => set('dealer_city', e.target.value)}
                placeholder="Lahore"
                className="h-8 text-sm bg-muted/50 border-border"
              />
            </FieldWrap>

            {/* Transmission */}
            <FieldWrap label="Transmission">
              <Select value={form.transmission} onValueChange={v => set('transmission', v)}>
                <SelectTrigger className="h-8 text-sm bg-muted/50 border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>

          {/* Color — full-width */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Palette className="w-3 h-3" />Color
              </Label>
              <button
                onClick={() => set('colorMode', form.colorMode === 'preset' ? 'custom' : 'preset')}
                className="text-[10px] text-primary hover:underline"
              >
                {form.colorMode === 'preset' ? 'Enter custom →' : '← Pick preset'}
              </button>
            </div>
            {form.colorMode === 'preset' ? (
              <Select value={form.color} onValueChange={v => set('color', v)}>
                <SelectTrigger className="h-8 text-sm bg-muted/50 border-border">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.color_custom}
                onChange={e => set('color_custom', e.target.value)}
                placeholder="e.g. Midnight Blue, Custom Gold…"
                className="h-8 text-sm bg-muted/50 border-border"
              />
            )}
          </div>

          {/* Touchup Pieces */}
          <FieldWrap label="Touchup Pieces">
            <Input
              value={form.touchups}
              onChange={e => set('touchups', e.target.value)}
              placeholder="e.g. 2 (front bumper, hood)"
              className="h-8 text-sm bg-muted/50 border-border"
            />
          </FieldWrap>

          <p className="text-xs text-muted-foreground">⚡ Takes under 20 seconds — fill remaining fields on the detail page later.</p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4 sticky bottom-0 bg-card pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="flex-1 border-border text-xs h-8">
            <Save className="w-3.5 h-3.5 mr-1" />Save
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="flex-1 text-xs h-8">
            <Zap className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving…' : 'Save & Open'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
