import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, Send, Settings2, Trash2, Car, MessageSquare,
  CheckCircle2, XCircle, AlertTriangle, Sparkles, Copy, Check,
  Eye, EyeOff, Zap, X, Info, Database, Users, ClipboardList,
  History, Download, RotateCcw, ChevronDown, ChevronUp,
  Wrench, Search, Plus, Edit3, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import {
  fetchVehicles, createVehicle, updateVehicle, deleteVehicle,
  fetchInquiries, createInquiry, updateInquiry, deleteInquiry,
  fetchDealers, createDealer, updateDealer,
} from '@/lib/api';
import type { Vehicle, Inquiry, Dealer } from '@/types/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  ts: number;
  toolCalls?: ToolCallRecord[];
  error?: boolean;
  thinking?: boolean;
}

interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: string;
  success: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

type ActionResult = { success: boolean; message: string; data?: unknown };

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY_CFG      = 'wulfrayns_ai_sync_config';
const STORAGE_KEY_SESSIONS = 'wulfrayns_chat_sessions';
const STORAGE_KEY_ACTIVE   = 'wulfrayns_chat_active';

const DEFAULT_SYSTEM_PROMPT = `You are an elite AI assistant integrated with Wulfrayn's DB — a professional Pakistani car dealership CRM. You have FULL access to manage inventory, inquiries, dealers, and business data.

CORE IDENTITY: You speak confidently and professionally. You know the Pakistani automotive market — prices in lac/crore, brands like Toyota, Honda, Suzuki, Kia, Hyundai, MG, BYD, local vs imported, auction grades, etc.

TOOL USAGE: When the user asks you to list, search, add, update, or delete any data, USE THE TOOLS. Don't just describe what you could do — actually do it.

RESPONSE FORMAT: After executing a tool, summarize the result conversationally. For lists, show key details in a readable format.

BUSINESS INTELLIGENCE: You can analyse inventory, suggest pricing, identify fast-moving models, flag aging stock, compare margins, and give strategic advice based on the data you retrieve.`;

const PRESET_MODELS = [
  { label: 'GPT-4o (OpenAI)',        baseUrl: 'https://api.openai.com/v1',                          model: 'gpt-4o' },
  { label: 'GPT-4o Mini (OpenAI)',   baseUrl: 'https://api.openai.com/v1',                          model: 'gpt-4o-mini' },
  { label: 'Groq — Llama 3.3 70B',  baseUrl: 'https://api.groq.com/openai/v1',                     model: 'llama-3.3-70b-versatile' },
  { label: 'DeepSeek Chat',          baseUrl: 'https://api.deepseek.com/v1',                        model: 'deepseek-chat' },
  { label: 'Mistral Large',          baseUrl: 'https://api.mistral.ai/v1',                          model: 'mistral-large-latest' },
  { label: 'Together — Llama 3.1',   baseUrl: 'https://api.together.xyz/v1',                        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  { label: 'Gemini 2.0 Flash',       baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
];

// ─── Tool definitions for function calling ────────────────────────────────────
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_vehicles',
      description: 'List vehicles from inventory with optional filters',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: available, sold, reserved, incoming' },
          make: { type: 'string', description: 'Filter by make (e.g. Toyota)' },
          search: { type: 'string', description: 'Search across make/model/variant/reg' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_vehicle',
      description: 'Get full details of a specific vehicle by ID',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Vehicle UUID' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_vehicle',
      description: 'Add a new vehicle to inventory',
      parameters: {
        type: 'object',
        properties: {
          make: { type: 'string' }, model: { type: 'string' },
          variant: { type: 'string' }, model_year: { type: 'number' },
          registration_year: { type: 'number' },
          color: { type: 'string' }, mileage: { type: 'number' },
          expected_selling_price: { type: 'number' }, purchase_price: { type: 'number' },
          engine_capacity: { type: 'string' }, fuel_type: { type: 'string' },
          transmission: { type: 'string' }, origin: { type: 'string' },
          registration_number: { type: 'string' },
          status: { type: 'string', description: 'available|reserved|sold|incoming|urgent_sale' },
          notes: { type: 'string' },
        },
        required: ['make', 'model'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_vehicle',
      description: 'Update fields of an existing vehicle',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, make: { type: 'string' }, model: { type: 'string' },
          variant: { type: 'string' }, model_year: { type: 'number' },
          color: { type: 'string' }, mileage: { type: 'number' },
          expected_selling_price: { type: 'number' }, status: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_vehicle',
      description: 'Delete a vehicle from inventory by ID',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_inquiries',
      description: 'List buyer inquiries/requirements',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'new|active|matched|closed' },
          search: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_inquiry',
      description: 'Create a new buyer inquiry/requirement',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' }, customer_phone: { type: 'string' },
          req_make: { type: 'string' }, req_model: { type: 'string' },
          req_variant: { type: 'string' }, req_model_year: { type: 'number' },
          req_budget_max: { type: 'number' }, req_color: { type: 'string' },
          req_fuel_type: { type: 'string' }, req_transmission: { type: 'string' },
          description: { type: 'string' }, priority: { type: 'string' },
        },
        required: ['customer_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_inquiry',
      description: 'Update an existing inquiry',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, status: { type: 'string' },
          priority: { type: 'string' }, notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_inquiry',
      description: 'Delete a buyer inquiry',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dealers',
      description: 'List dealers/contacts in the CRM',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_dealer',
      description: 'Add a new dealer or contact',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' }, phone: { type: 'string' },
          city: { type: 'string' }, area: { type: 'string' },
          dealer_type: { type: 'string' }, notes: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_dealer',
      description: 'Update dealer information',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, name: { type: 'string' },
          phone: { type: 'string' }, city: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'match_stock_to_requirement',
      description: 'Find vehicles in stock that match a buyer requirement',
      parameters: {
        type: 'object',
        properties: {
          make: { type: 'string' }, model: { type: 'string' },
          max_price: { type: 'number' }, min_year: { type: 'number' },
          transmission: { type: 'string' }, fuel_type: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory_summary',
      description: 'Get a summary of current inventory counts by make/status',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  try {
    switch (name) {
      case 'list_vehicles': {
        const limit = (args.limit as number) ?? 20;
        const { data } = await fetchVehicles({
          status: args.status as string,
          make: args.make as string,
          search: args.search as string,
          pageSize: limit,
        });
        if (!data.length) return { success: true, message: 'No vehicles found matching criteria.', data: [] };
        const summary = data.map(v =>
          `• ${v.make} ${v.model} ${v.variant ?? ''} (${v.model_year ?? '—'}) — ${v.color ?? '—'} — ${v.status} — PKR ${v.expected_selling_price?.toLocaleString() ?? '—'}${v.id ? ` [ID: ${v.id.slice(0,8)}]` : ''}`
        ).join('\n');
        return { success: true, message: `Found ${data.length} vehicle(s):\n${summary}`, data };
      }
      case 'get_vehicle': {
        const { data } = await fetchVehicles({ pageSize: 1 });
        // Use direct fetch approach
        const { supabase } = await import('@/db/supabase');
        const { data: v, error } = await supabase.from('vehicles').select('*').eq('id', args.id as string).maybeSingle();
        if (error || !v) return { success: false, message: `Vehicle not found: ${args.id}` };
        return { success: true, message: `${v.make} ${v.model} ${v.variant ?? ''} (${v.model_year})\nColor: ${v.color} | Status: ${v.status} | Price: PKR ${v.expected_selling_price?.toLocaleString()}\nMileage: ${v.mileage?.toLocaleString()} km | Engine: ${v.engine_capacity}\nReg: ${v.registration_number ?? '—'} | Origin: ${v.origin ?? '—'}\nNotes: ${v.notes ?? '—'}`, data: v };
      }
      case 'create_vehicle': {
        const v = await createVehicle({ ...args, status: (args.status as string) ?? 'available' } as Partial<Vehicle>);
        return { success: true, message: `✅ Vehicle added: ${v.make} ${v.model} ${v.variant ?? ''} (${v.model_year ?? '—'}) [ID: ${v.id.slice(0,8)}]`, data: v };
      }
      case 'update_vehicle': {
        const { id, ...fields } = args;
        const v = await updateVehicle(id as string, fields as Partial<Vehicle>);
        return { success: true, message: `✅ Updated: ${v.make} ${v.model} — ${Object.keys(fields).join(', ')} changed`, data: v };
      }
      case 'delete_vehicle': {
        await deleteVehicle(args.id as string);
        return { success: true, message: `✅ Vehicle ${args.id} deleted from inventory.` };
      }
      case 'list_inquiries': {
        const limit = (args.limit as number) ?? 20;
        const { data } = await fetchInquiries({
          status: args.status as 'new' | 'active' | 'matched' | 'closed' | undefined,
          search: args.search as string,
          pageSize: limit,
        });
        if (!data.length) return { success: true, message: 'No inquiries found.', data: [] };
        const summary = data.map(i =>
          `• ${i.customer_name ?? '—'} (${i.customer_phone ?? '—'}) — wants ${i.req_make ?? '?'} ${i.req_model ?? '?'} — Budget: PKR ${i.req_budget_max?.toLocaleString() ?? '—'} — ${i.status} [ID: ${i.id.slice(0,8)}]`
        ).join('\n');
        return { success: true, message: `Found ${data.length} inquiry(ies):\n${summary}`, data };
      }
      case 'create_inquiry': {
        const inq = await createInquiry({ ...args, status: 'new', inquiry_date: new Date().toISOString() } as Partial<Inquiry>);
        return { success: true, message: `✅ Inquiry created for ${inq.customer_name} [ID: ${inq.id.slice(0,8)}]`, data: inq };
      }
      case 'update_inquiry': {
        const { id, ...fields } = args;
        await updateInquiry(id as string, fields as Partial<Inquiry>);
        return { success: true, message: `✅ Inquiry ${id} updated — ${Object.keys(fields).join(', ')}` };
      }
      case 'delete_inquiry': {
        await deleteInquiry(args.id as string);
        return { success: true, message: `✅ Inquiry ${args.id} deleted.` };
      }
      case 'list_dealers': {
        const limit = (args.limit as number) ?? 20;
        const { data } = await fetchDealers({ search: args.search as string, pageSize: limit });
        if (!data.length) return { success: true, message: 'No dealers found.', data: [] };
        const summary = data.map((d: Dealer) =>
          `• ${d.name} — ${d.city ?? '—'} — ${d.phone ?? '—'} [ID: ${d.id.slice(0,8)}]`
        ).join('\n');
        return { success: true, message: `Found ${data.length} dealer(s):\n${summary}`, data };
      }
      case 'create_dealer': {
        const d = await createDealer(args as Partial<Dealer>);
        return { success: true, message: `✅ Dealer added: ${d.name} — ${d.city ?? '—'} [ID: ${d.id.slice(0,8)}]`, data: d };
      }
      case 'update_dealer': {
        const { id, ...fields } = args;
        const d = await updateDealer(id as string, fields as Partial<Dealer>);
        return { success: true, message: `✅ Dealer ${d.name} updated — ${Object.keys(fields).join(', ')}`, data: d };
      }
      case 'match_stock_to_requirement': {
        const filters: Record<string, unknown> = { status: 'available', pageSize: 15 };
        if (args.make) filters.make = args.make;
        if (args.max_price) filters.max_price = args.max_price;
        if (args.fuel_type) filters.fuel_type = args.fuel_type;
        const { data } = await fetchVehicles(filters as Parameters<typeof fetchVehicles>[0]);
        const year = (args.min_year as number) ?? 0;
        const filtered = year ? data.filter(v => (v.model_year ?? 0) >= year) : data;
        const summary = filtered.length
          ? filtered.map(v => `• ${v.make} ${v.model} ${v.variant ?? ''} (${v.model_year}) — PKR ${v.expected_selling_price?.toLocaleString() ?? '—'} — ${v.color ?? '—'} [ID: ${v.id.slice(0,8)}]`).join('\n')
          : 'No matching stock found.';
        return { success: true, message: `${filtered.length} matching vehicle(s):\n${summary}`, data: filtered };
      }
      case 'get_inventory_summary': {
        const { data } = await fetchVehicles({ pageSize: 200 });
        const byMake: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        for (const v of data) {
          if (v.make) byMake[v.make] = (byMake[v.make] ?? 0) + 1;
          if (v.status) byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
        }
        const topMakes = Object.entries(byMake).sort((a,b) => b[1]-a[1]).slice(0,8).map(([k,v]) => `  ${k}: ${v}`).join('\n');
        const statuses = Object.entries(byStatus).map(([k,v]) => `  ${k}: ${v}`).join('\n');
        return { success: true, message: `Inventory Summary (${data.length} total):\n\nBy Status:\n${statuses}\n\nTop Makes:\n${topMakes}` };
      }
      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Tool error: ${msg}` };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 12); }

function loadConfig(): ModelConfig {
  try {
    const s = localStorage.getItem(STORAGE_KEY_CFG);
    if (s) { const c = JSON.parse(s); if (c.apiKey) return c; }
  } catch { /* empty */ }
  return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', systemPrompt: DEFAULT_SYSTEM_PROMPT };
}

function loadSessions(): ChatSession[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  // Keep only last 30 sessions, each with max 100 messages
  const trimmed = sessions.slice(-30).map(s => ({ ...s, messages: s.messages.slice(-100) }));
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(trimmed));
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function extractTitleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  return first.content.slice(0, 45) + (first.content.length > 45 ? '…' : '');
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const [tcExpanded, setTcExpanded] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn('w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground'
      )}>
        {isUser ? 'W' : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Tool calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="w-full space-y-1 mb-1">
            {msg.toolCalls.map((tc, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setTcExpanded(e => !e)}
                >
                  {tc.success ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">{tc.name}({Object.keys(tc.args).join(', ')})</span>
                  {tcExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>
                {tcExpanded && (
                  <div className="px-3 pb-2 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap border-t border-border bg-muted/10">
                    <div className="pt-1.5 text-[10px] text-muted-foreground/60 mb-1">Result:</div>
                    {tc.result.slice(0, 500)}{tc.result.length > 500 ? '…' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bubble */}
        {(msg.content || msg.thinking) && (
          <div className={cn(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : msg.error
                ? 'bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm',
          )}>
            {msg.thinking
              ? <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" />Thinking…</span>
              : <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
            }
          </div>
        )}

        {/* Meta */}
        <div className={cn('flex items-center gap-1.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.ts)}</span>
          {!isUser && msg.content && (
            <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AISyncPage() {
  const [config, setConfig]           = useState<ModelConfig>(() => loadConfig());
  const [sessions, setSessions]       = useState<ChatSession[]>(() => loadSessions());
  const [activeId, setActiveId]       = useState<string>(() => localStorage.getItem(STORAGE_KEY_ACTIVE) ?? '');
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showApiKey, setShowApiKey]   = useState(false);
  const [preset, setPreset]           = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active session
  const activeSession = sessions.find(s => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  const isConfigured = Boolean(config.apiKey && config.baseUrl && config.model);
  const connected = isConfigured;

  // ── Persist sessions ──────────────────────────────────────────────────────
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_ACTIVE, activeId); }, [activeId]);

  // ── Save config ────────────────────────────────────────────────────────────
  const saveConfig = useCallback((c: ModelConfig) => {
    setConfig(c);
    localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify(c));
  }, []);

  const setC = useCallback((k: keyof ModelConfig, v: string) => {
    setConfig(prev => { const next = { ...prev, [k]: v }; localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify(next)); return next; });
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Session management ────────────────────────────────────────────────────
  const newSession = useCallback(() => {
    const s: ChatSession = { id: uid(), title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setShowHistory(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? '');
      return next;
    });
  }, [activeId]);

  const upsertMessage = useCallback((sessionId: string, msg: ChatMessage) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const idx = s.messages.findIndex(m => m.id === msg.id);
      const messages = idx >= 0
        ? s.messages.map((m, i) => i === idx ? msg : m)
        : [...s.messages, msg];
      const title = messages.length === 1 ? extractTitleFromMessages(messages) : s.title;
      return { ...s, messages, title, updatedAt: Date.now() };
    }));
  }, []);

  // Ensure there's always an active session
  useEffect(() => {
    if (!activeId || !sessions.find(s => s.id === activeId)) {
      if (sessions.length > 0) {
        setActiveId(sessions[0].id);
      } else {
        const s: ChatSession = { id: uid(), title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
        setSessions([s]);
        setActiveId(s.id);
      }
    }
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    if (!isConfigured) { toast.error('Configure your AI model in Settings first'); setShowSettings(true); return; }

    const currentSessionId = activeId;
    if (!currentSessionId) { toast.error('No active chat session'); return; }

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: input.trim(), ts: Date.now() };
    upsertMessage(currentSessionId, userMsg);
    setInput('');
    setSending(true);

    // Build thinkingMsg placeholder
    const thinkingId = uid();
    const thinkingMsg: ChatMessage = { id: thinkingId, role: 'assistant', content: '', ts: Date.now(), thinking: true };
    upsertMessage(currentSessionId, thinkingMsg);

    try {
      // Build message history from session
      const sess = sessions.find(s => s.id === currentSessionId);
      const history = (sess?.messages ?? []).filter(m => !m.thinking && m.id !== thinkingId).map(m => ({
        role: m.role === 'tool_result' ? 'user' as const : m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: input.trim() },
          ],
          tools: TOOL_DEFINITIONS,
          tool_choice: 'auto',
          max_tokens: 4096,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`API error ${response.status}: ${txt.slice(0, 200)}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const assistantMsg = choice?.message;

      // Handle tool calls
      if (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0) {
        const toolCallRecords: ToolCallRecord[] = [];

        for (const tc of assistantMsg.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
          const result = await executeTool(tc.function.name, args);
          toolCallRecords.push({
            name: tc.function.name,
            args,
            result: result.message,
            success: result.success,
          });
        }

        // Now get a follow-up response after tool execution
        const toolResultsText = toolCallRecords.map(tc =>
          `Tool: ${tc.name}\nResult: ${tc.result}`
        ).join('\n\n');

        const followUp = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT },
              ...history,
              { role: 'user', content: input.trim() },
              { role: 'assistant', content: `I executed the following:\n${toolCallRecords.map(tc => `${tc.name}: ${tc.success ? 'success' : 'failed'}`).join(', ')}` },
              { role: 'user', content: `Tool results:\n${toolResultsText}\n\nPlease summarize what was done for the user.` },
            ],
            max_tokens: 1024,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(30000),
        });

        const fuData = await followUp.json();
        const summary = fuData.choices?.[0]?.message?.content ?? 'Done.';

        const finalMsg: ChatMessage = {
          id: thinkingId,
          role: 'assistant',
          content: summary,
          ts: Date.now(),
          toolCalls: toolCallRecords,
        };
        upsertMessage(currentSessionId, finalMsg);
      } else {
        // Normal text response
        const content = assistantMsg?.content ?? 'No response received.';
        const finalMsg: ChatMessage = { id: thinkingId, role: 'assistant', content, ts: Date.now() };
        upsertMessage(currentSessionId, finalMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const errMsg: ChatMessage = { id: thinkingId, role: 'assistant', content: `Error: ${msg}`, ts: Date.now(), error: true };
      upsertMessage(currentSessionId, errMsg);
      toast.error(`AI error: ${msg.slice(0, 60)}`);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, isConfigured, activeId, config, sessions, upsertMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = useCallback(() => {
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: [], title: 'New Chat', updatedAt: Date.now() } : s));
  }, [activeId]);

  const exportChat = useCallback(() => {
    if (!activeSession) return;
    const text = activeSession.messages.map(m => `[${formatTime(m.ts)}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `chat-${activeSession.title.slice(0,20)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }, [activeSession]);

  const QUICK_PROMPTS = [
    { label: 'Stock Summary', prompt: 'Give me an inventory summary — how many vehicles by make and status?', icon: Database },
    { label: 'Available Cars', prompt: 'List all available cars in inventory with prices', icon: Car },
    { label: 'Open Inquiries', prompt: 'Show me all active buyer inquiries with their requirements', icon: ClipboardList },
    { label: 'All Dealers', prompt: 'List all dealers in the system', icon: Users },
    { label: 'Urgent Stock', prompt: 'Show me any vehicles marked as urgent sale', icon: AlertTriangle },
    { label: 'Price Analysis', prompt: 'Analyse our current inventory pricing — any overpriced or underpriced cars?', icon: Zap },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-3 md:p-4 gap-3">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <Bot className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground leading-tight">AI Chatbot</h1>
            <p className="text-[11px] text-muted-foreground">Full CRM access — manage stock, requirements, dealers via natural language</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
              connected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-muted border-border text-muted-foreground',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground')} />
              {connected ? 'Ready' : 'Not configured'}
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setShowHistory(v => !v)} title="Chat history">
              <History className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={clearChat} title="Clear chat">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={exportChat} title="Export chat">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={showSettings ? 'default' : 'outline'} className="h-8 gap-1.5 text-xs" onClick={() => setShowSettings(v => !v)}>
              <Settings2 className="w-3.5 h-3.5" />Settings
            </Button>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="shrink-0 overflow-hidden">
              <Card className="bg-card border-border">
                <CardHeader className="px-4 py-3 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5 text-primary" />AI Model Configuration
                  </CardTitle>
                  <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-3 space-y-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Quick Preset</Label>
                    <Select value={preset} onValueChange={v => {
                      setPreset(v);
                      const p = PRESET_MODELS.find(x => x.label === v);
                      if (p) { setC('baseUrl', p.baseUrl); setC('model', p.model); }
                    }}>
                      <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue placeholder="Select a preset model…" /></SelectTrigger>
                      <SelectContent>{PRESET_MODELS.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">API Key *</Label>
                      <div className="relative">
                        <Input type={showApiKey ? 'text' : 'password'} value={config.apiKey} onChange={e => setC('apiKey', e.target.value)}
                          placeholder="sk-..." className="h-8 text-xs bg-muted/40 pr-8 font-mono" />
                        <button onClick={() => setShowApiKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Base URL *</Label>
                      <Input value={config.baseUrl} onChange={e => setC('baseUrl', e.target.value)}
                        placeholder="https://api.openai.com/v1" className="h-8 text-xs bg-muted/40 font-mono" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Model *</Label>
                      <Input value={config.model} onChange={e => setC('model', e.target.value)}
                        placeholder="gpt-4o" className="h-8 text-xs bg-muted/40 font-mono" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">System Prompt</Label>
                    <Textarea value={config.systemPrompt} onChange={e => setC('systemPrompt', e.target.value)}
                      className="text-xs bg-muted/40 min-h-[80px] font-mono resize-y" />
                    <button onClick={() => setC('systemPrompt', DEFAULT_SYSTEM_PROMPT)} className="text-[10px] text-primary hover:underline mt-1">Reset to default</button>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground">This chatbot has full CRUD access to your Wulfrayn's DB data. Handle with care.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 min-h-0 gap-3">
          {/* ── History Sidebar ── */}
          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="w-56 shrink-0 flex flex-col gap-2">
                <Card className="bg-card border-border flex flex-col h-full">
                  <CardHeader className="px-3 py-2.5 pb-0 flex flex-row items-center justify-between shrink-0">
                    <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-primary" />History</CardTitle>
                    <Button size="sm" onClick={newSession} className="h-6 text-[10px] gap-1 px-2"><Plus className="w-3 h-3" />New</Button>
                  </CardHeader>
                  <CardContent className="p-2 flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="space-y-1">
                        {sessions.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">No chats yet</p>}
                        {sessions.map(s => (
                          <div key={s.id}
                            className={cn('group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                              s.id === activeId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/40'
                            )}
                            onClick={() => { setActiveId(s.id); setShowHistory(false); }}
                          >
                            <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate text-foreground">{s.title}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(s.updatedAt)}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 p-0.5 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Chat Area ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Messages */}
            <Card className="bg-card border-border flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Wulfrayn's AI Chatbot</p>
                        <p className="text-xs text-muted-foreground mt-1">Full CRM access — ask me anything or use a quick action below</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-lg">
                        {QUICK_PROMPTS.map(qp => (
                          <button key={qp.label}
                            onClick={() => { setInput(qp.prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 text-left transition-all group"
                          >
                            <qp.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors">{qp.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    </AnimatePresence>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </Card>

            {/* Input */}
            <div className="flex gap-2 items-end shrink-0">
              <div className="flex-1 min-w-0">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isConfigured ? 'Ask anything — list stock, add inquiry, update prices, match requirements…' : 'Configure AI model in Settings ↑'}
                  disabled={!isConfigured || sending}
                  rows={2}
                  className="text-sm bg-muted/40 border-border resize-none min-h-[60px] max-h-[120px]"
                />
              </div>
              <Button onClick={sendMessage} disabled={!input.trim() || sending || !isConfigured} className="h-[60px] w-12 p-0 shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center shrink-0">Enter to send · Shift+Enter for new line · AI has full read/write access to your CRM data</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}