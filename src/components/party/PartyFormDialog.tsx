import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createParty, updateParty } from '@/lib/api';
import { toast } from 'sonner';
import type { Party } from '@/types/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  party?: Party | null;
  onSaved: (p: Party) => void;
}

const BLANK = { name: '', phone: '', whatsapp: '', email: '', cnic: '', address: '', city: '', notes: '' };

export default function PartyFormDialog({ open, onOpenChange, party, onSaved }: Props) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(party ? {
      name: party.name ?? '', phone: party.phone ?? '', whatsapp: party.whatsapp ?? '',
      email: party.email ?? '', cnic: party.cnic ?? '', address: party.address ?? '',
      city: party.city ?? '', notes: party.notes ?? '',
    } : BLANK);
  }, [party, open]);

  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const saved = party
        ? await updateParty(party.id, form)
        : await createParty(form);
      onSaved(saved);
      toast.success(party ? 'Party updated' : 'Party added');
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{party ? 'Edit Party' : 'Add Party'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-1">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Ahmed Khan" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={set('whatsapp')} placeholder="+92 300 0000000" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={set('email')} placeholder="email@example.com" type="email" />
          </div>
          <div className="space-y-1">
            <Label>CNIC</Label>
            <Input value={form.cnic} onChange={set('cnic')} placeholder="35202-XXXXXXX-X" />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={set('city')} placeholder="Karachi" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={set('address')} placeholder="Street / Area" />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional notes…" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : party ? 'Update' : 'Add Party'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
