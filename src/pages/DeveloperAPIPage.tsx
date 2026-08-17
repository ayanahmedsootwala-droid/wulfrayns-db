import React, { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, Eye, EyeOff, Code2, BookOpen, Key, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchApiKeys, createApiKey, deleteApiKey } from '@/lib/api';
import type { ApiKey } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project.supabase.co';
const FUNC_BASE = `${SUPABASE_URL}/functions/v1/rpm-public-api`;

const ENDPOINTS = [
  { method: 'GET', path: '/vehicles', desc: 'List available vehicles with optional filters', params: 'status, make, model, body_type, fuel_type, min_price, max_price, page, page_size' },
  { method: 'GET', path: '/vehicles/:id', desc: 'Get full details for a single vehicle', params: 'id (path param)' },
  { method: 'GET', path: '/inventory/summary', desc: 'High-level counts by status, make, body_type', params: '—' },
  { method: 'POST', path: '/inquiries', desc: 'Submit a buyer inquiry for a vehicle', params: 'customer_name, phone, vehicle_id, description' },
  { method: 'GET', path: '/makes', desc: 'List all vehicle makes in inventory', params: '—' },
];

const SAMPLE_VEHICLE = `{
  "id": "uuid",
  "make": "Toyota",
  "model": "Corolla",
  "variant": "1.8 Grande",
  "model_year": 2022,
  "color": "Pearl White",
  "mileage": 28000,
  "expected_selling_price": 5800000,
  "status": "available",
  "fuel_type": "Petrol",
  "transmission": "Automatic",
  "cover_image_url": "https://…/image.jpg"
}`;

const SAMPLE_INQUIRY = `curl -X POST ${FUNC_BASE}/inquiries \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"customer_name":"Ali Hassan","phone":"+92300…","vehicle_id":"uuid","description":"Is this still available?"}'`;

export default function DeveloperAPIPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [permissions, setPermissions] = useState({ read: true, inquiries: false });
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  useEffect(() => {
    fetchApiKeys().then(d => { setKeys(d); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error('Key name required'); return; }
    setCreating(true);
    try {
      const perms = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k);
      const { key, rawKey } = await createApiKey(newKeyName.trim(), perms);
      setKeys(prev => [key, ...prev]);
      setRevealedKey(rawKey);
      setNewKeyName('');
      toast.success('API key created — copy it now, it won\'t be shown again');
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApiKey(deleteTarget.id);
      setKeys(prev => prev.filter(k => k.id !== deleteTarget.id));
      toast.success('API key revoked');
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setDeleteTarget(null); }
  };

  const copy = (text: string, label = 'Copied') => { navigator.clipboard.writeText(text); toast.success(label); };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" /> Developer API
          </h1>
          <p className="text-sm text-muted-foreground">Integrate Wulfrayn\'s DB inventory with your website, portal, or mobile app.</p>
        </div>

        <Tabs defaultValue="docs">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="docs" className="flex-1 md:flex-none"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Docs</TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 md:flex-none"><Key className="w-3.5 h-3.5 mr-1.5" />API Keys</TabsTrigger>
          </TabsList>

          {/* ── DOCS ── */}
          <TabsContent value="docs" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Base URL</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-xs bg-muted px-3 py-2 rounded-lg font-mono text-primary truncate">{FUNC_BASE}</code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(FUNC_BASE, 'URL copied')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">All requests require <code className="text-primary">Authorization: Bearer YOUR_API_KEY</code> header.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Endpoints</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-max">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-2.5 text-left text-muted-foreground whitespace-nowrap">Method</th>
                        <th className="px-4 py-2.5 text-left text-muted-foreground whitespace-nowrap">Path</th>
                        <th className="px-4 py-2.5 text-left text-muted-foreground whitespace-nowrap">Description</th>
                        <th className="px-4 py-2.5 text-left text-muted-foreground whitespace-nowrap">Parameters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ENDPOINTS.map(e => (
                        <tr key={e.path + e.method} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <Badge variant="outline" className={cn('text-xs font-mono', e.method === 'GET' ? 'text-emerald-400 border-emerald-400/30' : 'text-blue-400 border-blue-400/30')}>
                              {e.method}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-primary whitespace-nowrap">{e.path}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.desc}</td>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono">{e.params}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Object</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto font-mono text-foreground/80 leading-relaxed">{SAMPLE_VEHICLE}</pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">Submit Inquiry (cURL)
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(SAMPLE_INQUIRY)}><Copy className="w-3 h-3" /></Button>
                </CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">{SAMPLE_INQUIRY}</pre>
                </CardContent>
              </Card>
            </div>

            <Card className="border-yellow-400/30 bg-yellow-400/5">
              <CardContent className="p-4 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  The <code className="text-yellow-400">rpm-public-api</code> Edge Function exposes <strong>read-only</strong> public data.
                  Write access (inquiries) requires the <code>inquiries</code> permission scope. Never expose your API key client-side in production — proxy through your backend.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── API KEYS ── */}
          <TabsContent value="keys" className="space-y-4 mt-4">
            {revealedKey && (
              <Card className="border-emerald-400/40 bg-emerald-400/5">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Copy your key now — it won't be shown again</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 text-xs font-mono bg-background px-3 py-2 rounded-lg border border-border truncate">{revealedKey}</code>
                    <Button size="sm" onClick={() => { copy(revealedKey, 'Key copied!'); setRevealedKey(null); }}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />Copy & Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create new key */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Create New API Key</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name, e.g. Website Integration" />
                <div className="flex flex-wrap gap-4">
                  {([['read', 'Read (inventory, makes)'], ['inquiries', 'Write inquiries']] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={permissions[k]} onCheckedChange={v => setPermissions(p => ({ ...p, [k]: !!v }))} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />{creating ? 'Creating…' : 'Create Key'}
                </Button>
              </CardContent>
            </Card>

            {/* Keys list */}
            <div className="space-y-2">
              {loading ? <div className="text-sm text-muted-foreground text-center py-8">Loading keys…</div>
                : keys.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No API keys yet</CardContent></Card>
                ) : keys.map(k => (
                  <Card key={k.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{k.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{k.key_preview}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 shrink-0">
                        {k.permissions.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      </div>
                      <Badge variant={k.is_active ? 'default' : 'outline'} className="text-xs shrink-0">{k.is_active ? 'Active' : 'Revoked'}</Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget(k)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>Revoke <strong>{deleteTarget?.name}</strong>? Any integrations using this key will stop working immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
