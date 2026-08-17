import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Car, ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchVehicles, fetchDealers } from '@/lib/api';
import { streamLLM } from '@/lib/sse';
import { formatCurrency, formatMileage, getStatusColor, cn } from '@/lib/utils';
import type { Vehicle, Dealer } from '@/types/types';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Natural language → Supabase filter parser ───────────────────────────────
interface VehicleQuery {
  make?: string; model?: string; color?: string;
  maxPrice?: number; minPrice?: number;
  maxMileage?: number;
  status?: string; fuel_type?: string;
  has_android_panel?: boolean; has_sunroof?: boolean;
  dealer?: boolean;
  orderBy?: string; orderDir?: 'asc' | 'desc';
}

function parseNLQuery(q: string): { type: 'vehicle' | 'dealer'; vq?: VehicleQuery; dealerQuery?: string } {
  const t = q.toLowerCase();
  const vq: VehicleQuery = {};

  // Dealer queries
  if (/dealer|contact|meet/i.test(q) && !/car|vehicle|suv|sedan/i.test(q)) {
    return { type: 'dealer', dealerQuery: q };
  }

  // Color
  for (const c of ['white', 'black', 'silver', 'grey', 'gray', 'red', 'blue', 'green', 'brown', 'beige', 'gold', 'pearl', 'maroon']) {
    if (t.includes(c)) { vq.color = c.charAt(0).toUpperCase() + c.slice(1); break; }
  }

  // Make
  for (const m of ['toyota', 'honda', 'suzuki', 'kia', 'hyundai', 'bmw', 'mercedes', 'audi', 'mitsubishi', 'nissan']) {
    if (t.includes(m)) { vq.make = m.charAt(0).toUpperCase() + m.slice(1); break; }
  }

  // Model keywords
  for (const model of ['prado', 'civic', 'corolla', 'fortuner', 'hilux', 'land cruiser', 'yaris', 'swift', 'sportage', 'tucson', 'br-v', 'city', 'camry', 'vezel']) {
    if (t.includes(model)) {
      const modelMap: Record<string, string> = { 'land cruiser': 'Land Cruiser', 'br-v': 'BR-V' };
      vq.model = modelMap[model] ?? (model.charAt(0).toUpperCase() + model.slice(1));
      break;
    }
  }

  // Price
  const priceMatch = t.match(/under\s+([0-9.]+)\s*(?:million|m\b)/i) || t.match(/below\s+([0-9.]+)\s*(?:million|m\b)/i) || t.match(/less\s+than\s+([0-9.]+)\s*(?:million|m\b)/i);
  if (priceMatch) vq.maxPrice = parseFloat(priceMatch[1]) * 1_000_000;

  const minPriceMatch = t.match(/above\s+([0-9.]+)\s*(?:million|m\b)/i) || t.match(/more\s+than\s+([0-9.]+)\s*(?:million|m\b)/i) || t.match(/over\s+([0-9.]+)\s*(?:million|m\b)/i);
  if (minPriceMatch) vq.minPrice = parseFloat(minPriceMatch[1]) * 1_000_000;

  // Mileage
  const mileMatch = t.match(/under\s+(\d+)\s*(?:k|km|thousand)?\s*(?:km|miles)?/i);
  if (mileMatch) {
    let m = parseInt(mileMatch[1]);
    if (m < 1000) m *= 1000; // treat as thousands
    vq.maxMileage = m;
  }

  // Fuel
  if (t.includes('hybrid')) vq.fuel_type = 'Hybrid';
  else if (t.includes('electric')) vq.fuel_type = 'Electric';
  else if (t.includes('diesel')) vq.fuel_type = 'Diesel';

  // Features
  if (/android panel|android/i.test(t)) vq.has_android_panel = true;
  if (/sunroof/i.test(t)) vq.has_sunroof = true;

  // Status
  if (/available/i.test(t)) vq.status = 'available';
  else if (/sold/i.test(t)) vq.status = 'sold';
  else if (/reserved/i.test(t)) vq.status = 'reserved';

  // Sorting
  if (/cheapest|lowest price/i.test(t)) { vq.orderBy = 'expected_selling_price'; vq.orderDir = 'asc'; }
  else if (/expensive|most expensive/i.test(t)) { vq.orderBy = 'expected_selling_price'; vq.orderDir = 'desc'; }
  else if (/newest|latest/i.test(t)) { vq.orderBy = 'created_at'; vq.orderDir = 'desc'; }
  else if (/oldest/i.test(t)) { vq.orderBy = 'created_at'; vq.orderDir = 'asc'; }
  else if (/lowest mileage|low mileage|least mileage/i.test(t)) { vq.orderBy = 'mileage'; vq.orderDir = 'asc'; }

  return { type: 'vehicle', vq };
}

async function runQuery(q: string): Promise<{ vehicles: Vehicle[]; dealers: Dealer[]; summary: string }> {
  const { type, vq, dealerQuery } = parseNLQuery(q);

  if (type === 'dealer') {
    // For "dealer hasn't been contacted in 30 days" etc — fetch all with low contact
    const { data } = await fetchDealers({ pageSize: 20 });
    const filtered = dealerQuery?.toLowerCase().includes('30 day')
      ? data.filter(d => {
          if (!d.last_contact_at) return true;
          const days = (Date.now() - new Date(d.last_contact_at).getTime()) / 86400000;
          return days > 30;
        })
      : data;
    return {
      vehicles: [],
      dealers: filtered,
      summary: `Found ${filtered.length} dealer${filtered.length !== 1 ? 's' : ''} matching your query.`,
    };
  }

  const params: Parameters<typeof fetchVehicles>[0] = {
    pageSize: 20,
    make: vq?.make,
    fuel_type: vq?.fuel_type,
    status: vq?.status,
    min_price: vq?.minPrice,
    max_price: vq?.maxPrice,
    has_android_panel: vq?.has_android_panel,
    has_sunroof: vq?.has_sunroof,
    orderBy: vq?.orderBy,
    orderDir: vq?.orderDir,
  };
  if (vq?.model) params.search = vq.model;
  else if (vq?.color) params.search = vq.color;

  const { data, count } = await fetchVehicles(params);
  let filtered = data;
  if (vq?.color) filtered = filtered.filter(v => v.color?.toLowerCase().includes(vq.color!.toLowerCase()));
  if (vq?.maxMileage) filtered = filtered.filter(v => (v.mileage ?? Infinity) <= vq.maxMileage!);

  const parts: string[] = [];
  if (vq?.color) parts.push(vq.color);
  if (vq?.make) parts.push(vq.make);
  if (vq?.model) parts.push(vq.model);
  if (vq?.fuel_type) parts.push(vq.fuel_type);
  if (vq?.maxPrice) parts.push(`under ${formatCurrency(vq.maxPrice)}`);

  return {
    vehicles: filtered,
    dealers: [],
    summary: `Found ${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''}${parts.length ? ' — ' + parts.join(', ') : ''}.`,
  };
}

// ─── Message type ──────────────────────────────────────────────────────────────
interface Message {
  id: string; role: 'user' | 'ai';
  text: string;           // streaming AI commentary
  dbText?: string;        // fast DB summary (shown first)
  vehicles?: Vehicle[]; dealers?: Dealer[];
  loading?: boolean;      // DB fetch phase
  streaming?: boolean;    // Gemini commentary phase
}

const AI_SYSTEM = `You are a helpful automotive dealer assistant for a Pakistani car dealership CRM called Wulfrayn's DB.
The user asked a question about their inventory and the database has returned results (shown below).
Your job: write a SHORT, insightful 2-3 sentence commentary on the results.
- Highlight any standout deals, pricing patterns, or actionable advice.
- Use Pakistani market context (PKR, lakh, cities like Karachi/Lahore/Islamabad).
- If results are empty, suggest what the dealer could do next.
- Be direct and conversational. No bullet lists. Plain sentences only. Max 60 words.`;

function buildResultsContext(q: string, vehicles: Vehicle[], dealers: Dealer[], dbSummary: string): string {
  const vSnippet = vehicles.slice(0, 5).map(v =>
    `${v.make} ${v.model} ${v.variant ?? ''} ${v.model_year ?? ''} — ${formatCurrency(v.expected_selling_price)}, ${v.mileage != null ? formatMileage(v.mileage) : ''}, ${v.color ?? ''}, ${v.status}`
  ).join('\n');
  const dSnippet = dealers.slice(0, 5).map(d =>
    `${d.name} — ${d.city ?? ''}, last contact: ${d.last_contact_at ? new Date(d.last_contact_at).toLocaleDateString() : 'never'}`
  ).join('\n');
  return `User query: "${q}"\n\nDB result: ${dbSummary}\n\n${vSnippet || dSnippet}`;
}

const SUGGESTIONS = [
  'Show all black Prados under 18 million',
  "Who has the cheapest Civic RS?",
  "Which dealers haven't been contacted in 30 days?",
  'Show all SUVs with Android Panel',
  'Find Hybrids under 5 million',
  'Most expensive car in inventory',
  'Show lowest mileage available cars',
];

export default function AICommandCenter() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);

    const uid = Date.now().toString();
    const aid = uid + '_ai';

    // Phase 1: show user bubble + loading placeholder
    setMessages(prev => [
      ...prev,
      { id: uid, role: 'user', text },
      { id: aid, role: 'ai', text: '', loading: true },
    ]);

    let vehicles: Vehicle[] = [];
    let dealers: Dealer[] = [];
    let dbSummary = '';

    try {
      const result = await runQuery(text);
      vehicles = result.vehicles;
      dealers = result.dealers;
      dbSummary = result.summary;

      // Phase 2: show DB results immediately, start streaming AI commentary
      setMessages(prev => prev.map(m =>
        m.id === aid
          ? { ...m, dbText: dbSummary, vehicles, dealers, loading: false, streaming: true, text: '' }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aid ? { ...m, text: 'Sorry, something went wrong. Please try again.', loading: false } : m
      ));
      setBusy(false);
      return;
    }

    // Phase 3: stream Gemini commentary
    abortRef.current = new AbortController();
    streamLLM({
      functionName: 'large-language-model',
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON_KEY,
      requestBody: {
        systemInstruction: AI_SYSTEM,
        contents: [{
          role: 'user',
          parts: [{ text: buildResultsContext(text, vehicles, dealers, dbSummary) }],
        }],
      },
      onChunk: (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === aid ? { ...m, text: m.text + chunk } : m
        ));
      },
      onComplete: () => {
        setMessages(prev => prev.map(m =>
          m.id === aid ? { ...m, streaming: false } : m
        ));
        setBusy(false);
      },
      onError: () => {
        // Commentary failed — still show DB results, just clear streaming state
        setMessages(prev => prev.map(m =>
          m.id === aid ? { ...m, streaming: false } : m
        ));
        setBusy(false);
      },
      signal: abortRef.current.signal,
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Command Center</p>
              <p className="text-xs text-muted-foreground">Natural language search across your inventory</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Ask anything about your inventory</p>
                <p className="text-xs text-muted-foreground">Works like ChatGPT but only on your database</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn('max-w-[85%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  {/* Bubble */}
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border text-foreground rounded-tl-sm'
                  )}>
                    {msg.loading ? (
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* DB summary line */}
                        {msg.dbText && (
                          <p className="text-sm font-medium text-foreground">{msg.dbText}</p>
                        )}
                        {/* Streaming Gemini commentary */}
                        {(msg.text || msg.streaming) && (
                          <div className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2 mt-1">
                            <div className="flex items-start gap-1.5">
                              <Sparkles className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                              <span>
                                {msg.text || ''}
                                {msg.streaming && (
                                  <span className="inline-flex gap-0.5 ml-1 align-middle">
                                    {[0,1,2].map(i => (
                                      <span key={i} className="w-1 h-1 rounded-full bg-purple-400 animate-bounce inline-block" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Fallback for plain error messages */}
                        {!msg.dbText && !msg.streaming && msg.text && (
                          <span>{msg.text}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vehicle results */}
                  {msg.vehicles && msg.vehicles.length > 0 && (
                    <div className="w-full space-y-1.5">
                      {msg.vehicles.slice(0, 8).map(v => (
                        <Link key={v.id} to={`/inventory/${v.id}`} className="block">
                          <Card className="bg-card border-border hover:border-primary/30 transition-colors p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                {v.cover_image_url ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Car className="w-3.5 h-3.5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{v.make} {v.model} {v.variant}</p>
                                <p className="text-xs text-muted-foreground">{v.color} · {v.model_year} · {formatMileage(v.mileage)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(v.expected_selling_price)}</p>
                                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', getStatusColor(v.status))}>{v.status}</span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Dealer results */}
                  {msg.dealers && msg.dealers.length > 0 && (
                    <div className="w-full space-y-1.5">
                      {msg.dealers.slice(0, 6).map(d => (
                        <Link key={d.id} to={`/dealers/${d.id}`} className="block">
                          <Card className="bg-card border-border hover:border-primary/30 transition-colors p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">{d.name.charAt(0)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                                <p className="text-xs text-muted-foreground">{d.city} · Last contact: {d.last_contact_at ? new Date(d.last_contact_at).toLocaleDateString() : 'Never'}</p>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask anything — 'cheapest Civic RS', 'all black SUVs'…"
                className="pl-9 pr-3 h-10 bg-muted/50 border-border text-sm"
                disabled={busy}
              />
            </div>
            <Button size="icon" onClick={() => send()} disabled={!input.trim() || busy} className="w-10 h-10 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Searches your actual inventory database in real time</p>
        </div>
      </div>
    </AppLayout>
  );
}
