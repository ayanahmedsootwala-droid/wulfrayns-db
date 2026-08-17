import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Star, Tag, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { createDealer, updateDealer, logActivity } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Dealer } from '@/types/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass dealer to enter edit mode; omit for add mode */
  dealer?: Dealer | null;
  onSaved: (dealer: Dealer) => void;
}

interface FormState {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cnic: string;
  city: string;
  area: string;
  address: string;
  notes: string;
  tags: string;         // comma-separated string, converted to/from string[]
  trust_score: string;
  is_favorite: boolean;
}

const EMPTY: FormState = {
  name: '', phone: '', whatsapp: '', email: '', cnic: '',
  city: '', area: '', address: '', notes: '', tags: '',
  trust_score: '', is_favorite: false,
};

interface Errors { name?: string; trust_score?: string; }

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Dealer name is required';
  if (f.trust_score) {
    const n = parseInt(f.trust_score);
    if (isNaN(n) || n < 0 || n > 100) e.trust_score = 'Trust score must be 0–100';
  }
  return e;
}

function FieldWrap({ label, icon, error, children }: {
  label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className={cn('text-xs flex items-center gap-1', error ? 'text-destructive' : 'text-muted-foreground')}>
        {icon}{label}
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

export default function DealerFormDialog({ open, onClose, dealer, onSaved }: Props) {
  const isEdit = !!dealer;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouch] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (dealer) {
      setForm({
        name: dealer.name || '',
        phone: dealer.phone || '',
        whatsapp: dealer.whatsapp || '',
        email: dealer.email || '',
        cnic: dealer.cnic || '',
        city: dealer.city || '',
        area: dealer.area || '',
        address: dealer.address || '',
        notes: dealer.notes || '',
        tags: (dealer.tags || []).join(', '),
        trust_score: dealer.trust_score != null ? String(dealer.trust_score) : '',
        is_favorite: dealer.is_favorite || false,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setTouch(new Set());
  }, [dealer, open]);

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (touched.has(k)) {
        const errs = validate(next);
        setErrors(prev => {
          const updated = { ...prev };
          if (errs[k as keyof Errors]) updated[k as keyof Errors] = errs[k as keyof Errors];
          else delete updated[k as keyof Errors];
          return updated;
        });
      }
      return next;
    });
  };

  const markTouched = (k: string) => setTouch(prev => new Set([...prev, k]));

  const handleSave = async () => {
    const allKeys: Array<keyof Errors> = ['name', 'trust_score'];
    setTouch(new Set(allKeys));
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error('Please fix the highlighted errors'); return; }

    setSaving(true);
    try {
      const payload: Partial<Dealer> = {
        name: form.name.trim(),
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        cnic: form.cnic || undefined,
        city: form.city || undefined,
        area: form.area || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        trust_score: form.trust_score ? parseInt(form.trust_score) : undefined,
        is_favorite: form.is_favorite,
      };

      let saved: Dealer;
      if (isEdit && dealer) {
        saved = await updateDealer(dealer.id, payload);
        await logActivity({
          action_type: 'dealer_updated', entity_type: 'dealer',
          entity_id: dealer.id, entity_name: saved.name,
          description: `Dealer updated: ${saved.name}`,
        });
        toast.success('Dealer updated');
      } else {
        saved = await createDealer(payload);
        await logActivity({
          action_type: 'dealer_added', entity_type: 'dealer',
          entity_id: saved.id, entity_name: saved.name,
          description: `New dealer added: ${saved.name}`,
        });
        toast.success('Dealer added');
      }
      onSaved(saved);
      onClose();
    } catch {
      toast.error(isEdit ? 'Failed to update dealer' : 'Failed to add dealer');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (k: keyof Errors) =>
    cn('h-8 text-sm bg-muted/50 border-border',
      errors[k] && touched.has(k) && 'border-destructive focus-visible:ring-destructive/30');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-xl p-0 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isEdit ? 'Edit Dealer' : 'Add New Dealer'}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Identity */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldWrap label="Name *" icon={<User className="w-3 h-3" />} error={touched.has('name') ? errors.name : undefined}>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  onBlur={() => markTouched('name')}
                  placeholder="e.g. Ahmed Motors"
                  className={inputCls('name')}
                />
              </FieldWrap>
              <FieldWrap label="CNIC">
                <Input
                  value={form.cnic}
                  onChange={e => set('cnic', e.target.value)}
                  placeholder="12345-1234567-1"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldWrap label="Phone" icon={<Phone className="w-3 h-3" />}>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="03xx-xxxxxxx"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
              <FieldWrap label="WhatsApp" icon={<Phone className="w-3 h-3" />}>
                <Input
                  value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="03xx-xxxxxxx"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
              <FieldWrap label="Email" icon={<Mail className="w-3 h-3" />}>
                <Input
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="dealer@example.com"
                  type="email"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Location</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldWrap label="City" icon={<MapPin className="w-3 h-3" />}>
                <Input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Lahore"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
              <FieldWrap label="Area / Market">
                <Input
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                  placeholder="Defence, Township…"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
              <div className="md:col-span-2">
                <FieldWrap label="Full Address" icon={<MapPin className="w-3 h-3" />}>
                  <Input
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Street / building address"
                    className="h-8 text-sm bg-muted/50 border-border"
                  />
                </FieldWrap>
              </div>
            </div>
          </div>

          {/* Stats & Tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldWrap label="Trust Score (0–100)" icon={<Star className="w-3 h-3" />} error={touched.has('trust_score') ? errors.trust_score : undefined}>
                <Input
                  value={form.trust_score}
                  onChange={e => set('trust_score', e.target.value)}
                  onBlur={() => markTouched('trust_score')}
                  placeholder="85"
                  type="number"
                  min={0} max={100}
                  className={cn('h-8 text-sm bg-muted/50 border-border', errors.trust_score && touched.has('trust_score') && 'border-destructive')}
                />
              </FieldWrap>
              <FieldWrap label="Tags (comma-separated)" icon={<Tag className="w-3 h-3" />}>
                <Input
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="Toyota, Suzuki, trusted"
                  className="h-8 text-sm bg-muted/50 border-border"
                />
              </FieldWrap>
            </div>

            {/* Favorite toggle */}
            <button
              onClick={() => set('is_favorite', !form.is_favorite)}
              className={cn(
                'mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                form.is_favorite
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                  : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', form.is_favorite && 'fill-yellow-400')} />
              {form.is_favorite ? 'Marked as favorite' : 'Mark as favorite'}
            </button>
          </div>

          {/* Notes */}
          <FieldWrap label="Notes" icon={<FileText className="w-3 h-3" />}>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes about this dealer…"
              className="bg-muted/50 border-border resize-none text-sm"
              rows={3}
            />
          </FieldWrap>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving} className="border-border text-xs h-8">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 text-xs h-8">
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? (isEdit ? 'Updating…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add Dealer')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
