/**
 * AICommandBar — floating Cmd+K command palette powered by Gemini.
 * Understands natural language and executes real DB actions:
 * - Add / update / delete vehicles & inquiries
 * - Navigate to any page
 * - Fetch live exchange rates
 * - Answer questions about inventory
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Command, Loader2, Sparkles, X, ArrowRight, ChevronRight, Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

// ── types ─────────────────────────────────────────────────────────────────────
interface CommandResult {
  type: 'success' | 'error' | 'info' | 'navigate';
  message: string;
  data?: unknown;
}

interface AICommandBarProps {
  open: boolean;
  onClose: () => void;
}

// ── quick suggestions ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Show available stock', icon: '🚗' },
  { label: 'Add new inquiry for Toyota Corolla', icon: '📋' },
  { label: 'Mark BYD Shark 6 as sold', icon: '✅' },
  { label: 'Go to Import Calculator', icon: '🧮' },
  { label: 'Show all inquiries', icon: '📂' },
  { label: 'How many vehicles in stock?', icon: '📊' },
];

// ── Gemini function-calling via Edge Function ─────────────────────────────────
const SYSTEM_PROMPT = `You are Wulfrayn\'s DB AI Command Assistant. You understand natural language commands for a Pakistani car dealership management system.

Your job is to parse the user's command and return a JSON action object.

AVAILABLE ACTIONS:
1. navigate: Go to a page
   { "action": "navigate", "path": "/inventory" }
   Pages: / (dashboard), /inventory, /inquiries, /import-calculator, /analytics, /dealerships, /tasks, /settings, /quotations, /social-media

2. query_vehicles: Search vehicles
   { "action": "query_vehicles", "filters": { "status": "available", "make": "Toyota" } }

3. query_inquiries: Search inquiries
   { "action": "query_inquiries", "filters": { "status": "new" } }

4. update_vehicle: Update a vehicle field
   { "action": "update_vehicle", "search": { "make": "BYD", "model": "Shark 6" }, "updates": { "status": "sold" } }

5. create_inquiry: Add new inquiry
   { "action": "create_inquiry", "data": { "customer_name": "Ahmed", "req_make": "Toyota", "req_model": "Corolla", "status": "new", "priority": "medium" } }

6. count_summary: Get inventory summary
   { "action": "count_summary" }

7. answer: Just answer a question (no DB action needed)
   { "action": "answer", "text": "Your answer here" }

RULES:
- Always return valid JSON only. No markdown, no explanation outside JSON.
- For navigation commands like "go to X", "open X", "show X page" → use navigate action
- For vehicle status updates: valid statuses are: available, reserved, booked, sold, incoming, inspection, archived
- For inquiry priorities: low, medium, high, urgent
- For inquiry statuses: new, in_progress, resolved, closed
- Be smart about Pakistani car names: Corolla, Civic, Alto, Mehran, Cultus, Yaris, Vitz, etc.
`;

async function runAICommand(userText: string): Promise<{ action: string; [key: string]: unknown }> {
  const { data, error } = await supabase.functions.invoke('large-language-model', {
    body: {
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    },
  });
  if (error) throw error;
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── executor ──────────────────────────────────────────────────────────────────
async function executeAction(
  parsed: { action: string; [key: string]: unknown },
  navigate: (path: string) => void,
): Promise<CommandResult> {
  const { action } = parsed;

  if (action === 'navigate') {
    const path = parsed.path as string;
    navigate(path);
    const labels: Record<string, string> = {
      '/': 'Dashboard', '/inventory': 'Inventory', '/inquiries': 'Inquiries',
      '/import-calculator': 'Import Calculator', '/analytics': 'Analytics',
      '/dealerships': 'Dealerships', '/tasks': 'Tasks', '/settings': 'Settings',
      '/quotations': 'Quotations', '/social-media': 'Social Media',
    };
    return { type: 'navigate', message: `Navigating to ${labels[path] ?? path}` };
  }

  if (action === 'count_summary') {
    const [vRes, iRes] = await Promise.all([
      supabase.from('vehicles').select('status', { count: 'exact' }),
      supabase.from('inquiries').select('status', { count: 'exact' }),
    ]);
    const vehicles = vRes.data ?? [];
    const available = vehicles.filter((v: { status: string }) => v.status === 'available').length;
    const sold = vehicles.filter((v: { status: string }) => v.status === 'sold').length;
    const inquiries = iRes.count ?? 0;
    return {
      type: 'info',
      message: `📊 Inventory: ${available} available, ${sold} sold (${vehicles.length} total) · 📋 ${inquiries} active inquiries`,
    };
  }

  if (action === 'query_vehicles') {
    const filters = (parsed.filters as Record<string, string>) ?? {};
    let q = supabase.from('vehicles').select('make,model,variant,model_year,color,expected_selling_price,status').limit(5);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.make) q = q.ilike('make', `%${filters.make}%`);
    if (filters.model) q = q.ilike('model', `%${filters.model}%`);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return { type: 'info', message: 'No vehicles found matching that criteria.' };
    const lines = (data as { make: string; model: string; variant?: string; model_year?: number; color?: string; expected_selling_price?: number; status: string }[]).map(v =>
      `• ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''} ${v.model_year ?? ''} — ${v.color ?? 'N/A'} — ${v.status}${v.expected_selling_price ? ` — PKR ${(v.expected_selling_price / 1e6).toFixed(2)}M` : ''}`
    );
    return { type: 'info', message: `Found ${data.length} vehicle(s):\n${lines.join('\n')}`, data };
  }

  if (action === 'query_inquiries') {
    const filters = (parsed.filters as Record<string, string>) ?? {};
    let q = supabase.from('inquiries').select('customer_name,req_make,req_model,status,priority').limit(8);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.priority) q = q.eq('priority', filters.priority);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return { type: 'info', message: 'No inquiries found.' };
    const lines = (data as { customer_name: string; req_make?: string; req_model?: string; status: string; priority: string }[]).map(i =>
      `• ${i.customer_name}${i.req_make ? ` — ${i.req_make} ${i.req_model ?? ''}` : ''} [${i.status}/${i.priority}]`
    );
    return { type: 'info', message: `Found ${data.length} inquiry(ies):\n${lines.join('\n')}`, data };
  }

  if (action === 'update_vehicle') {
    const search = (parsed.search as Record<string, string>) ?? {};
    const updates = (parsed.updates as Record<string, unknown>) ?? {};
    let q = supabase.from('vehicles').update({ ...updates, updated_at: new Date().toISOString() });
    if (search.make) q = (q as unknown as { ilike: (col: string, val: string) => typeof q }).ilike('make', `%${search.make}%`) as typeof q;
    if (search.model) q = (q as unknown as { ilike: (col: string, val: string) => typeof q }).ilike('model', `%${search.model}%`) as typeof q;
    // Use proper Supabase chaining
    let uq = supabase.from('vehicles').update({ ...updates, updated_at: new Date().toISOString() }).select('make,model');
    if (search.make) uq = uq.ilike('make', `%${search.make}%`);
    if (search.model) uq = uq.ilike('model', `%${search.model}%`);
    const { data, error } = await uq;
    if (error) throw error;
    const count = Array.isArray(data) ? data.length : 0;
    const updateStr = Object.entries(updates).map(([k, v]) => `${k} → ${v}`).join(', ');
    return { type: 'success', message: `✅ Updated ${count} vehicle(s): ${updateStr}` };
  }

  if (action === 'create_inquiry') {
    const payload = parsed.data as Record<string, unknown>;
    const { error } = await supabase.from('inquiries').insert({
      ...payload,
      inquiry_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { type: 'success', message: `✅ Inquiry created for ${payload.customer_name ?? 'customer'}` };
  }

  if (action === 'answer') {
    return { type: 'info', message: (parsed.text as string) ?? 'Done.' };
  }

  return { type: 'info', message: 'Command processed.' };
}

// ── main component ────────────────────────────────────────────────────────────
export default function AICommandBar({ open, onClose }: AICommandBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [history, setHistory] = useState<{ query: string; result: CommandResult }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setResult(null);
    }
  }, [open]);

  // Global Cmd+K / Ctrl+K listener — handled by parent, but Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const parsed = await runAICommand(trimmed);
      const res = await executeAction(parsed, (path) => { navigate(path); onClose(); });
      setResult(res);
      setHistory(prev => [{ query: trimmed, result: res }, ...prev.slice(0, 4)]);
      if (res.type === 'success') toast.success(res.message.replace(/^✅\s*/, ''));
      if (res.type === 'navigate') { onClose(); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Command failed';
      setResult({ type: 'error', message: `❌ ${msg}` });
    } finally {
      setLoading(false);
    }
  }, [navigate, onClose]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) handleSubmit(query);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            className="fixed left-1/2 top-[12%] z-50 w-full max-w-[calc(100%-2rem)] md:max-w-2xl -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                </div>
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setResult(null); }}
                  onKeyDown={handleKey}
                  placeholder="Ask anything or give a command… e.g. 'Mark BYD Shark as sold'"
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 px-0"
                  disabled={loading}
                />
                {query && (
                  <button onClick={() => { setQuery(''); setResult(null); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">Enter</kbd>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Result */}
                {result && (
                  <div className={cn(
                    'mx-3 mt-3 rounded-xl border p-3',
                    result.type === 'success' && 'bg-green-500/8 border-green-500/20',
                    result.type === 'error' && 'bg-red-500/8 border-red-500/20',
                    result.type === 'navigate' && 'bg-primary/8 border-primary/20',
                    result.type === 'info' && 'bg-muted/60 border-border',
                  )}>
                    <div className="flex items-start gap-2">
                      {result.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />}
                      {result.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                      {result.type === 'navigate' && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                      {result.type === 'info' && <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{result.message}</p>
                    </div>
                  </div>
                )}

                {/* Suggestions (show when no result) */}
                {!result && !loading && (
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 mb-2">Suggestions</p>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s.label}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                        onClick={() => { setQuery(s.label); handleSubmit(s.label); }}
                      >
                        <span className="text-base leading-none shrink-0">{s.icon}</span>
                        <span className="text-sm text-foreground flex-1">{s.label}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent history */}
                {!result && !loading && history.length > 0 && (
                  <div className="px-3 pb-3 border-t border-border mt-1 pt-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 mb-2">Recent</p>
                    {history.slice(0, 3).map((h, i) => (
                      <button
                        key={i}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                        onClick={() => { setQuery(h.query); handleSubmit(h.query); }}
                      >
                        <span className="text-xs text-muted-foreground">↩</span>
                        <span className="text-xs text-muted-foreground">{h.query}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center gap-3 px-4 py-5">
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">Processing command…</p>
                      <p className="text-xs text-muted-foreground">AI is interpreting and executing your request</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
                  <span className="text-[10px] text-muted-foreground">to toggle</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">Esc</kbd>
                  <span className="text-[10px] text-muted-foreground">to close</span>
                </div>
                <Badge variant="outline" className="ml-auto text-[9px] h-4 border-primary/30 text-primary">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />Gemini AI
                </Badge>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
