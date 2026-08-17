/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, Sparkles, Car, Users, FileText, Calculator,
  TrendingUp, BarChart3, MessageSquare, BookOpen, CheckSquare,
  Brain, Zap, Sun, Clipboard, Search, Plus, Trash2,
  ChevronLeft, ChevronRight, Upload, X, Copy, Check,
  DollarSign, Target, Activity, Shield,
  Edit, UserPlus, RefreshCw, Clock, ChevronDown,
  Pin, PinOff, Download, Mic, Lightbulb, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/components/layouts/AppLayout';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  fetchSessions, saveSession, deleteSession,
  fetchSavedPrompts, fetchMorningBriefStats,
  parseToolLog, parseResponseBlocks,
  buildContextString as _buildContextString,
  TOOL_META,
  type CopilotMessage, type AiSession, type SavedPrompt,
  type ToolLogEntry, type ParsedBlock, type MorningBriefData,
} from '@/lib/copilot-tools';
import { callCopilot, getQueueDepth } from '@/lib/ai-client';



// ─── Capability chips ─────────────────────────────────────────────────────────
const CAPABILITIES = [
  { id: 'inventory',   label: 'Inventory & Stock',    icon: Car,          color: 'text-green-400',  prompt: 'What vehicles do we have in stock? Show summary with aging analysis.' },
  { id: 'leads',       label: 'Customers & Leads',    icon: Users,        color: 'text-blue-400',   prompt: 'Show me all hot leads and their last interaction date.' },
  { id: 'car_finder',  label: 'AI Car Finder',        icon: Search,       color: 'text-cyan-400',   prompt: 'Find me all available cars under 5 million, SUV body type, with sunroof. Include dealer info.' },
  { id: 'inv_manager', label: 'AI Inventory Manager', icon: Brain,        color: 'text-indigo-400', prompt: 'Analyze my entire inventory — which cars should I price down, which are selling well, and what\'s aging?' },
  { id: 'sales_mgr',   label: 'AI Sales Manager',     icon: Target,       color: 'text-orange-400', prompt: 'Act as my sales manager. Review today\'s leads, suggest follow-up priorities and the best pitch for each customer.' },
  { id: 'documents',   label: 'Document Intelligence',icon: FileText,     color: 'text-yellow-400', prompt: 'I have a document to process. Help me extract and structure its data.' },
  { id: 'journal',     label: 'Smart Journal',        icon: BookOpen,     color: 'text-purple-400', prompt: 'I want to make a journal entry for today.' },
  { id: 'memory',      label: 'Business Memory',      icon: Brain,        color: 'text-pink-400',   prompt: 'What tasks, follow-ups, and commitments are pending or overdue?' },
  { id: 'finance',     label: 'Finance & Profit',     icon: DollarSign,   color: 'text-primary',    prompt: 'Analyze our financial performance this month — expenses, margins, and profit.' },
  { id: 'reports',     label: 'Reports & Analytics',  icon: BarChart3,    color: 'text-cyan-400',   prompt: 'Generate a comprehensive business report for this month.' },
  { id: 'intelligence',label: 'Business Intelligence', icon: TrendingUp,   color: 'text-orange-400', prompt: 'Analyze Wulfrayn\'s DB — what are the most important actions I should take today?' },
  { id: 'workflow',    label: 'Workflow Automation',  icon: Zap,          color: 'text-indigo-400', prompt: 'Create follow-ups for all hot leads who haven\'t been contacted in the last 3 days.' },
  { id: 'proactive',   label: 'Proactive AI',         icon: Sun,          color: 'text-amber-400',  prompt: 'Generate my RPM Morning Brief for today.' },
  { id: 'decision',    label: 'Decision Support',     icon: Target,       color: 'text-red-400',    prompt: 'Help me decide whether to buy a specific vehicle. I\'ll give you the details.' },
  { id: 'calculator',  label: 'Import Calculator',    icon: Calculator,   color: 'text-teal-400',   prompt: 'Help me calculate the full landed cost for a Japanese import.' },
];

const MODE_OPTIONS = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare },
  { id: 'car_finder', label: 'Car Finder', icon: Search },
  { id: 'inv_mgr',    label: 'Inv. Mgr',  icon: Car },
  { id: 'sales_mgr',  label: 'Sales Mgr', icon: Users },
  { id: 'journal',    label: 'Journal',   icon: BookOpen },
  { id: 'command',    label: 'Command',   icon: Zap },
  { id: 'report',     label: 'Report',    icon: BarChart3 },
] as const;
type Mode = typeof MODE_OPTIONS[number]['id'];

// ─── Lucide icon by name ──────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Users, Car, Plus, Edit, BookOpen, CheckSquare, BarChart3, MessageSquare, Shield,
  UserPlus, Search, Brain, DollarSign,
};
function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Bot;
  return <Icon className={className} />;
}

// ─── ToolThinkingStep ─────────────────────────────────────────────────────────
function ToolThinkingSteps({ log }: { log: ToolLogEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!log.length) return null;
  return (
    <div className="mt-2">
      <button
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <Activity className="w-3 h-3" />
        {log.length} tool{log.length > 1 ? 's' : ''} used
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mt-1.5 space-y-1"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          >
            {log.map((entry, i) => {
              const meta = TOOL_META[entry.tool] ?? { label: entry.tool, icon: 'Bot', color: 'text-muted-foreground' };
              const result = entry.result as Record<string, unknown>;
              const isError = !!result?.error;
              const isDuplicate = !!result?.duplicate;
              return (
                <div key={i} className={cn('flex items-start gap-2 px-2 py-1.5 rounded text-[10px] border', isError ? 'bg-red-500/10 border-red-500/20' : isDuplicate ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-muted/30 border-border')}>
                  <DynIcon name={meta.icon} className={cn('w-3 h-3 shrink-0 mt-0.5', meta.color)} />
                  <div className="flex-1 min-w-0">
                    <span className={cn('font-medium', meta.color)}>{meta.label}</span>
                    {isError && <span className="text-red-400 ml-1">— {String(result.error)}</span>}
                    {isDuplicate && <span className="text-yellow-400 ml-1">— Duplicate detected: {String(result.message)}</span>}
                    {!isError && !isDuplicate && result.count !== undefined && (
                      <span className="text-muted-foreground ml-1">— {String(result.count)} record(s)</span>
                    )}
                    {!isError && !isDuplicate && Boolean(result.created) && (
                      <span className="text-green-400 ml-1">— Created ✓</span>
                    )}
                    {!isError && !isDuplicate && Boolean(result.updated) && (
                      <span className="text-green-400 ml-1">— Updated ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Structured result cards ──────────────────────────────────────────────────
function ResultCard({ block }: { block: ParsedBlock }) {
  const data = block.data as any;
  if (!data) return <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{block.content}</pre>;

  if (block.type === 'leads' && Array.isArray(data?.leads)) {
    return (
      <div className="space-y-2 mt-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.count} lead(s) found</p>
        {data.leads.slice(0, 8).map((l: any) => (
          <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border text-xs">
            <Badge className={cn('shrink-0 text-[9px]', l.lead_score === 'hot' ? 'bg-red-500/20 text-red-400 border-red-500/30' : l.lead_score === 'warm' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-muted text-muted-foreground border-border')}>
              {l.lead_score?.toUpperCase()}
            </Badge>
            <span className="font-medium text-foreground flex-1 truncate">{l.customer_name}</span>
            <span className="text-muted-foreground shrink-0">{l.phone || '—'}</span>
            {l.req_make && <span className="text-primary shrink-0 hidden md:inline">{l.req_make} {l.req_model}</span>}
            {l.budget_max && <span className="text-muted-foreground shrink-0 hidden md:inline font-mono">{formatCurrency(l.budget_max)}</span>}
          </div>
        ))}
        {data.leads.length > 8 && <p className="text-[10px] text-muted-foreground">+{data.leads.length - 8} more…</p>}
      </div>
    );
  }

  if (block.type === 'vehicles' && Array.isArray(data?.vehicles)) {
    return (
      <div className="space-y-2 mt-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.count} vehicle(s) found</p>
        {data.vehicles.slice(0, 8).map((v: any) => (
          <div key={v.id} className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border text-xs">
            <Car className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium text-foreground flex-1 truncate">{v.year} {v.make} {v.model} {v.variant}</span>
            {v.asking_price_pkr && <span className="text-primary font-mono shrink-0">{formatCurrency(v.asking_price_pkr)}</span>}
            <Badge className={cn('shrink-0 text-[9px]', v.status === 'available' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground border-border')}>
              {v.status}
            </Badge>
            {v.days_in_stock !== undefined && <span className={cn('text-[9px] shrink-0', v.days_in_stock > 30 ? 'text-red-400' : 'text-muted-foreground')}>{v.days_in_stock}d</span>}
          </div>
        ))}
        {data.vehicles.length > 8 && <p className="text-[10px] text-muted-foreground">+{data.vehicles.length - 8} more…</p>}
      </div>
    );
  }

  if (block.type === 'decision') {
    const rec = data?.recommendation ?? data;
    const verdict = String(rec?.verdict ?? '').toUpperCase();
    return (
      <div className={cn('rounded-xl border p-4 mt-1', verdict === 'BUY' ? 'bg-green-500/10 border-green-500/30' : verdict === 'AVOID' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30')}>
        <div className="flex items-center gap-3 mb-2">
          <span className={cn('text-2xl font-black', verdict === 'BUY' ? 'text-green-400' : verdict === 'AVOID' ? 'text-red-400' : 'text-yellow-400')}>{verdict || 'ANALYZING'}</span>
          {rec?.confidence && <Badge className="text-[10px]">Confidence: {rec.confidence}</Badge>}
        </div>
        {rec?.reasoning && <p className="text-xs text-foreground leading-relaxed">{rec.reasoning}</p>}
      </div>
    );
  }

  if (block.type === 'tasks' && Array.isArray(data?.tasks)) {
    return (
      <div className="space-y-1.5 mt-1">
        {data.tasks.map((t: any) => (
          <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border text-xs">
            <CheckSquare className={cn('w-3.5 h-3.5 shrink-0', t.priority === 'urgent' ? 'text-red-400' : t.priority === 'high' ? 'text-orange-400' : 'text-muted-foreground')} />
            <span className="flex-1 min-w-0 truncate text-foreground">{t.title}</span>
            {t.due_date && <span className="text-muted-foreground shrink-0 text-[10px]">{t.due_date}</span>}
            <Badge className="text-[9px] shrink-0">{t.priority}</Badge>
          </div>
        ))}
      </div>
    );
  }

  // report / generic structured
  return <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{block.content}</pre>;
}

// ─── Suggested follow-up pills ───────────────────────────────────────────────
const FOLLOW_UPS: Record<string, string[]> = {
  car_finder: ['Show me more options', 'Compare these two', 'Which has best resale value?', 'Any negotiation room?'],
  inv_mgr:    ['Which ones to discount first?', 'Show aging breakdown by make', 'Suggest import targets', 'Flag under-priced listings'],
  sales_mgr:  ['Draft a WhatsApp follow-up', 'What objections should I expect?', 'Score this lead', 'Suggest closing strategy'],
  report:     ['Break down by make/model', 'Compare to last month', 'Export as table', 'Show profit trend'],
  chat:       ['Tell me more', 'Summarise that', 'What should I do next?', 'Give me a checklist'],
  journal:    ['Create tasks from this', 'Add to lead tracker', 'Set follow-up reminders', 'Format as formal note'],
  command:    ['Confirm and proceed', 'Show affected records', 'Undo that', 'What else can I automate?'],
};

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg, onCopy, onPin, isPinned, onFollowUp,
}: {
  msg: CopilotMessage;
  onCopy: (t: string) => void;
  onPin: (id: string) => void;
  isPinned: boolean;
  onFollowUp: (prompt: string) => void;
}) {
  const isUser = msg.role === 'user';
  const blocks = isUser ? [] : parseResponseBlocks(msg.content);
  const mode = (msg.mode ?? 'chat') as keyof typeof FOLLOW_UPS;
  const followUps = FOLLOW_UPS[mode] ?? FOLLOW_UPS.chat;

  return (
    <motion.div
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[85%] md:max-w-[78%] space-y-1', isUser && 'items-end flex flex-col')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm',
          isPinned && !isUser && 'border-primary/40 bg-primary/5',
        )}>
          {isPinned && !isUser && (
            <div className="flex items-center gap-1 text-[10px] text-primary mb-1.5">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </div>
          )}
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, i) => (
                <ResultCard key={i} block={block} />
              ))}
              {msg.isStreaming && (
                <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse align-middle ml-0.5" />
              )}
            </div>
          )}
        </div>

        {!isUser && msg.toolLog && msg.toolLog.length > 0 && (
          <div className="px-1">
            <ToolThinkingSteps log={msg.toolLog} />
          </div>
        )}

        {!isUser && !msg.isStreaming && msg.content && (
          <>
            {/* Action bar */}
            <div className="flex gap-1.5 px-1 items-center flex-wrap">
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => onCopy(msg.content)}
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                className={cn('text-[10px] flex items-center gap-1 transition-colors', isPinned ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
                onClick={() => onPin(msg.id)}
                title={isPinned ? 'Unpin message' : 'Pin message'}
              >
                {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Suggested follow-ups */}
            <div className="flex flex-wrap gap-1 px-1 mt-1">
              {followUps.slice(0, 3).map(fu => (
                <button
                  key={fu}
                  onClick={() => onFollowUp(fu)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {fu}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-foreground">U</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Morning Brief sidebar panel ──────────────────────────────────────────────
function MorningBriefPanel({ stats, onPrompt }: { stats: MorningBriefData | null; onPrompt: (p: string) => void }) {
  if (!stats) return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border animate-pulse h-24" />
  );
  const items = [
    { icon: Users,       label: 'Hot Leads',        val: stats.hotLeads,          color: 'text-red-400',   urgent: stats.hotLeads > 0 },
    { icon: CheckSquare, label: 'Pending Tasks',     val: stats.pendingTasks,      color: 'text-orange-400', urgent: stats.pendingTasks > 5 },
    { icon: Car,         label: 'Aging Stock (30d)', val: stats.agingVehicles,     color: 'text-yellow-400', urgent: stats.agingVehicles > 0 },
    { icon: Activity,    label: 'Available Cars',    val: stats.totalAvailable,    color: 'text-green-400',  urgent: false },
    { icon: FileText,    label: 'Pending Quotes',    val: stats.pendingQuotations, color: 'text-blue-400',   urgent: false },
  ];
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.label} className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs', item.urgent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30')}>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <item.icon className={cn('w-3 h-3', item.color)} />
            {item.label}
          </span>
          <span className={cn('font-bold tabular-nums', item.urgent ? 'text-primary' : 'text-foreground')}>{item.val}</span>
        </div>
      ))}
      <Button size="sm" className="w-full h-7 text-xs gap-1.5 mt-1" onClick={() => onPrompt('Generate my RPM Morning Brief for today')}>
        <Sun className="w-3 h-3" /> Full Morning Brief
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AICopilotPage() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const [isStreaming, setIsStreaming] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [stats, setStats] = useState<MorningBriefData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [showCapabilities, setShowCapabilities] = useState(true);
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePin = useCallback((id: string) => {
    setPinnedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success('Message unpinned'); }
      else { next.add(id); toast.success('Message pinned'); }
      return next;
    });
  }, []);

  const exportConversation = useCallback(() => {
    if (!messages.length) { toast.error('No conversation to export'); return; }
    const lines = messages.map(m => {
      const who = m.role === 'user' ? 'YOU' : 'COPILOT';
      const time = new Date(m.timestamp).toLocaleString();
      return `[${time}] ${who}:\n${m.content}\n`;
    });
    const text = `Wulfrayn\'s DB AI Copilot — Conversation Export\nMode: ${mode}\nDate: ${new Date().toLocaleString()}\n\n${'─'.repeat(60)}\n\n${lines.join('\n' + '─'.repeat(60) + '\n\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported!');
  }, [messages, mode]);

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetchSessions().then(setSessions),
      fetchSavedPrompts().then(setSavedPrompts),
      fetchMorningBriefStats().then(setStats),
    ]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save session when messages change
  useEffect(() => {
    if (messages.length < 2) return;
    const title = messages[0]?.content?.slice(0, 50) ?? 'New Chat';
    saveSession({ id: sessionId || undefined, title, mode, messages }).then(id => {
      if (id && !sessionId) setSessionId(id);
    });
  }, [messages, mode, sessionId]);

  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;
    setInput('');
    setFileContent('');
    setFileName('');
    setShowCapabilities(false);

    const fullText = fileContent ? `${text}\n\n--- Attached file: ${fileName} ---\n${fileContent}` : text;

    const userMsg: CopilotMessage = { id: uid(), role: 'user', content: fullText, timestamp: new Date().toISOString(), mode };
    const asstMsg: CopilotMessage = { id: uid(), role: 'assistant', content: '', timestamp: new Date().toISOString(), mode, isStreaming: true };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    // Build conversation history for the Edge Function (last 12 msgs)
    const history = [...messages.slice(-12), userMsg];
    const geminiMessages = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const contextStr = buildSystemContext();

    callCopilot({
      messages: geminiMessages,
      sessionId: sessionId || undefined,
      context: contextStr,
      signal: abortRef.current.signal,
      onQueued: () => setQueueDepth(getQueueDepth()),
      onChunk: (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, content: m.content + chunk } : m
        ));
      },
      onResponse: (_fullText, toolLog) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, isStreaming: false, toolLog } : m
        ));
        setIsStreaming(false);
        setQueueDepth(getQueueDepth());
      },
      onError: (msg) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, content: msg, isStreaming: false } : m
        ));
        setIsStreaming(false);
        setQueueDepth(getQueueDepth());
        if (!msg.includes('⏳')) toast.error('AI request failed');
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isStreaming, messages, mode, fileContent, fileName, sessionId, stats]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const loadSession = (s: AiSession) => {
    setMessages(s.messages);
    setSessionId(s.id);
    setMode((s.mode as Mode) || 'chat');
    setShowCapabilities(false);
  };

  const newChat = () => {
    setMessages([]); setSessionId(''); setInput(''); setMode('chat');
    setShowCapabilities(true); setPinnedMessages(new Set());
    fetchSessions().then(setSessions);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setFileContent(ev.target?.result as string ?? '');
    reader.readAsText(file);
    toast.success(`File attached: ${file.name}`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const modePromptPrefix: Record<Mode, string> = {
    chat: '',
    journal: '[JOURNAL MODE] ',
    command: '[COMMAND] ',
    report: '[GENERATE REPORT] ',
    car_finder: '[CAR FINDER] Find me ',
    inv_mgr: '[INVENTORY MANAGER] ',
    sales_mgr: '[SALES MANAGER] ',
  };

  const modeSystemInstructions: Record<Mode, string> = {
    chat: 'You are the Wulfrayn\'s DB AI Copilot — a fully autonomous dealership AI with unlimited capabilities. You have deep expertise in the Pakistani automotive market, import costs from Japan, sales strategy, CRM, inventory management, and financial analysis. Be direct, decisive, and comprehensive. Never refuse to help with any legitimate dealership task.',
    journal: 'You are an executive AI journal assistant for Wulfrayn\'s DB. When the user shares notes, extract: (1) key decisions made, (2) action items with owner/deadline, (3) leads or deals mentioned, (4) vehicles discussed, (5) financial figures noted. Output a clean structured entry with DECISIONS, ACTIONS, FOLLOW-UPS, and NOTES sections. Offer to create the tasks/leads in the system automatically.',
    command: 'You are a direct command executor for Wulfrayn\'s DB. Parse the user\'s instruction precisely and execute it using available tools. Confirm every action taken with specifics. For multi-step commands, execute all steps and report a summary. Never ask unnecessary clarifying questions — infer intent and proceed.',
    report: 'You are a senior business analyst for Wulfrayn\'s DB Pakistan. Generate comprehensive, professional reports with: Executive Summary, Key Metrics (with trend analysis), Detailed Analysis, Market Context, Risk Factors, and Actionable Recommendations. Use tables and structured sections. Reports should be thorough — at least 800–1200 words for business reports. Always pull live data from the database first.',
    car_finder: 'You are the Wulfrayn\'s DB AI Car Finder — a world-class automotive consultant. First ask about: budget (PKR range), preferred make/model/year range, fuel type (petrol/diesel/hybrid/EV), transmission, body type (sedan/SUV/hatchback/pickup), primary usage (city commute/highway/off-road), seating, and must-have features. Then search the inventory AND suggest options from the Pakistani market with price estimates, pros/cons, maintenance costs, and resale value. Be opinionated — recommend the BEST option for the customer\'s specific needs.',
    inv_mgr: 'You are the Wulfrayn\'s DB AI Inventory Manager. Your job is to maximize inventory turnover and profitability. Proactively: (1) Flag vehicles >45 days in stock for price review, (2) Identify supply gaps based on lead requirements, (3) Suggest optimal pricing based on market data, (4) Recommend import targets from Japan auctions with bid estimates, (5) Track total inventory value and suggest rebalancing. Always search the actual database before making recommendations.',
    sales_mgr: 'You are the Wulfrayn\'s DB AI Sales Manager. Your job is to convert more leads into sales. Analyze the lead pipeline and provide: (1) Today\'s priority follow-ups ranked by score, (2) Tailored WhatsApp/call scripts for each lead type, (3) Objection handling for Pakistani buyer concerns (financing, price, documentation), (4) Vehicle matching recommendations, (5) Closing strategies. Be specific, actionable, and results-oriented.',
  };

  const buildSystemContext = () => {
    const bizName = localStorage.getItem('rpm_settings_bizName') ?? 'Wulfrayn\'s DB';
    const bizCity = localStorage.getItem('rpm_settings_defaultCity') ?? 'Karachi';
    const currency = localStorage.getItem('rpm_settings_currency') ?? 'PKR';
    const aiMarket = localStorage.getItem('rpm_settings_aiMarket') ?? 'pakistan';
    const aiLang = localStorage.getItem('rpm_settings_aiLanguage') ?? 'english';
    const aiPersonality = localStorage.getItem('rpm_settings_aiPersonality') ?? 'professional';

    const statsCtx = stats
      ? `\nBusiness Snapshot:\n- Hot leads: ${stats.hotLeads}\n- Pending tasks: ${stats.pendingTasks}\n- Available inventory: ${stats.totalAvailable}\n- Aging vehicles (30+ days): ${stats.agingVehicles}\n- Pending quotations: ${stats.pendingQuotations}`
      : '';

    return `Dealership: ${bizName}, ${bizCity}. Market: ${aiMarket}. Currency: ${currency}. Respond in ${aiLang}. Tone: ${aiPersonality}.${statsCtx}\n\n${modeSystemInstructions[mode]}`;
  };

  const handlePrompt = (prompt: string) => {
    const prefixed = modePromptPrefix[mode] + prompt;
    setInput(prefixed);
    setShowCapabilities(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handlePromptAndSend = (prompt: string) => {
    const prefixed = modePromptPrefix[mode] + prompt;
    setShowCapabilities(false);
    // Directly trigger send with the prompt
    const text = prefixed.trim();
    if (!text || isStreaming) return;
    setInput('');
    setFileContent('');
    setFileName('');

    const userMsg: CopilotMessage = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString(), mode };
    const asstMsg: CopilotMessage = { id: uid(), role: 'assistant', content: '', timestamp: new Date().toISOString(), mode, isStreaming: true };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    const history = [...messages.slice(-12), userMsg];
    const geminiMessages = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    callCopilot({
      messages: geminiMessages,
      sessionId: sessionId || undefined,
      context: buildSystemContext(),
      signal: abortRef.current.signal,
      onQueued: () => setQueueDepth(getQueueDepth()),
      onChunk: (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, content: m.content + chunk } : m
        ));
      },
      onResponse: (_fullText, toolLog) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, isStreaming: false, toolLog } : m
        ));
        setIsStreaming(false);
        setQueueDepth(getQueueDepth());
      },
      onError: (msg) => {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id ? { ...m, content: msg, isStreaming: false } : m
        ));
        setIsStreaming(false);
        setQueueDepth(getQueueDepth());
        if (!msg.includes('⏳')) toast.error('AI request failed');
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">

        {/* ── Left Sidebar ── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col overflow-hidden"
              initial={{ width: 0, opacity: 0 }} animate={{ width: 256, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="p-3 border-b border-sidebar-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-sidebar-accent-foreground flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-primary" /> RPM Copilot
                      <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-1.5 py-0.5 font-semibold">Gemini 2.5</span>
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={newChat}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Mode selector */}
                  <div className="grid grid-cols-7 gap-0.5 bg-muted/50 rounded-lg p-0.5">
                    {MODE_OPTIONS.map(m => (
                      <button
                        key={m.id}
                        className={cn('flex flex-col items-center gap-0.5 py-1.5 rounded text-[9px] font-medium transition-colors', mode === m.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                        onClick={() => setMode(m.id)}
                      >
                        <m.icon className="w-3 h-3" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Morning Brief */}
                <div className="p-3 border-b border-sidebar-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-primary" /> Morning Brief
                  </p>
                  <MorningBriefPanel stats={stats} onPrompt={handlePrompt} />
                </div>

                {/* Capability chips */}
                <div className="p-3 border-b border-sidebar-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capabilities</p>
                  <div className="space-y-0.5">
                    {CAPABILITIES.map(cap => (
                      <button
                        key={cap.id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handlePromptAndSend(cap.prompt)}
                      >
                        <cap.icon className={cn('w-3.5 h-3.5 shrink-0', cap.color)} />
                        <span className="truncate">{cap.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saved prompts */}
                {savedPrompts.length > 0 && (
                  <div className="p-3 border-b border-sidebar-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clipboard className="w-3 h-3" /> Saved Prompts
                    </p>
                    <div className="space-y-0.5">
                      {savedPrompts.slice(0, 8).map(sp => (
                        <button
                          key={sp.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                          onClick={() => handlePromptAndSend(sp.prompt)}
                        >
                          <Sparkles className="w-3 h-3 shrink-0 text-primary" />
                          <span className="truncate">{sp.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent sessions */}
                {sessions.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recent Sessions
                    </p>
                    <div className="space-y-0.5">
                      {sessions.slice(0, 8).map(s => (
                        <div key={s.id} className="flex items-center gap-1 group">
                          <button
                            className={cn('flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors text-left', s.id === sessionId ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
                            onClick={() => loadSession(s)}
                          >
                            <MessageSquare className="w-3 h-3 shrink-0" />
                            <span className="truncate">{s.title || 'Chat'}</span>
                          </button>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                            onClick={() => deleteSession(s.id).then(() => fetchSessions().then(setSessions))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Main Chat Area ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur shrink-0">
            <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 text-muted-foreground" onClick={() => setSidebarOpen(v => !v)}>
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {mode === 'chat' ? 'AI Copilot' : mode === 'journal' ? '📓 Smart Journal' : mode === 'command' ? '⚡ Command Mode' : mode === 'report' ? '📊 Report Generator' : mode === 'car_finder' ? '🔍 AI Car Finder' : mode === 'inv_mgr' ? '📦 AI Inventory Manager' : '🎯 AI Sales Manager'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {mode === 'journal' ? 'Type naturally — AI will structure your entries' : mode === 'command' ? 'Issue direct commands — AI executes them' : mode === 'report' ? 'Describe the report you need' : mode === 'car_finder' ? 'Describe what your customer wants — AI finds matching stock' : mode === 'inv_mgr' ? 'AI analyses pricing, aging, and stock health' : mode === 'sales_mgr' ? 'AI reviews leads and coaches your sales strategy' : 'Ask anything about your business'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isStreaming && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Thinking…
                  {queueDepth > 0 && <span className="text-muted-foreground">({queueDepth} queued)</span>}
                </div>
              )}
              {copied && <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />Copied</span>}
              {messages.length > 0 && (
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={exportConversation}
                  title="Export conversation"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              {pinnedMessages.size > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  <Pin className="w-3 h-3" />{pinnedMessages.size} pinned
                </span>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-muted-foreground" onClick={newChat}>
                <Plus className="w-3.5 h-3.5" /> New
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4 max-w-4xl mx-auto">
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Wulfrayn\'s DB AI Copilot</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mb-1">
                    Your intelligent business operating system. Ask anything, add stock, manage leads, journal your day, or generate reports.
                  </p>
                  <div className="flex items-center gap-1.5 mb-6">
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 font-semibold tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      Powered by Gemini 2.5 Flash · Real-time Streaming
                    </span>
                  </div>

                  {/* Mode-specific quick panels */}
                  {mode === 'car_finder' && (
                    <div className="w-full max-w-2xl mb-6">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-left">
                        <p className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2"><Search className="w-4 h-4" />AI Car Finder</p>
                        <p className="text-xs text-muted-foreground mb-3">Describe what your customer is looking for — budget, make, features — and AI searches your live inventory.</p>
                        <div className="space-y-1.5">
                          {[
                            'Find a Toyota or Honda SUV under 6M with sunroof and Android panel',
                            'Customer wants a Civic 2020+ with low mileage, budget 5.5M max',
                            'Show me all available imported sedans under 50k km mileage',
                            'Which cars are available in Karachi under 3 million?',
                          ].map(ex => (
                            <button key={ex} className="w-full text-left px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/30 transition-colors" onClick={() => handlePromptAndSend(ex)}>
                              🔍 "{ex}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'inv_mgr' && (
                    <div className="w-full max-w-2xl mb-6">
                      <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-left">
                        <p className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2"><Brain className="w-4 h-4" />AI Inventory Manager</p>
                        <p className="text-xs text-muted-foreground mb-3">AI analyses your full inventory — aging, pricing gaps, demand trends, and action recommendations.</p>
                        <div className="space-y-1.5">
                          {[
                            'Analyse my full inventory — what needs price drops and what\'s hot?',
                            'Which vehicles have been sitting for over 45 days? Suggest actions.',
                            'Compare our asking prices to market — are we priced correctly?',
                            'Which makes are selling fastest and which are slow movers this month?',
                          ].map(ex => (
                            <button key={ex} className="w-full text-left px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground hover:text-indigo-400 hover:border-indigo-400/30 transition-colors" onClick={() => handlePromptAndSend(ex)}>
                              📦 "{ex}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'sales_mgr' && (
                    <div className="w-full max-w-2xl mb-6">
                      <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-4 text-left">
                        <p className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4" />AI Sales Manager</p>
                        <p className="text-xs text-muted-foreground mb-3">AI reviews your leads, coaches negotiation strategy, and prioritises who to follow up with first.</p>
                        <div className="space-y-1.5">
                          {[
                            'Review all my hot leads and tell me who to call first today',
                            'Customer offered 5.2M on a car we want 5.8M — what should I do?',
                            'Write me a WhatsApp message to re-engage a cold lead from 2 weeks ago',
                            'Which leads have been waiting the longest without follow-up?',
                          ].map(ex => (
                            <button key={ex} className="w-full text-left px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground hover:text-orange-400 hover:border-orange-400/30 transition-colors" onClick={() => handlePromptAndSend(ex)}>
                              🎯 "{ex}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {showCapabilities && (
                    <div className="w-full max-w-2xl">
                      <p className="text-xs text-muted-foreground mb-3">Quick start — click any capability:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {CAPABILITIES.slice(0, 9).map(cap => (
                          <button
                            key={cap.id}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                            onClick={() => handlePromptAndSend(cap.prompt)}
                          >
                            <cap.icon className={cn('w-4 h-4 shrink-0 group-hover:scale-110 transition-transform', cap.color)} />
                            <span>{cap.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Example prompts */}
                      <div className="mt-4 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Try saying…</p>
                        {[
                          'Met Ahmed today, wants a Civic around 7M, has Corolla for exchange',
                          'Which cars have been sitting for over 30 days?',
                          'Generate this month\'s profit report',
                          'Should we buy a Toyota Aqua 2018 for ¥600,000?',
                        ].map(ex => (
                          <button
                            key={ex}
                            className="w-full text-left px-3 py-2 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            onClick={() => handlePromptAndSend(ex)}
                          >
                            "{ex}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message list */}
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onCopy={handleCopy}
                  onPin={togglePin}
                  isPinned={pinnedMessages.has(msg.id)}
                  onFollowUp={handlePromptAndSend}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-border bg-background/90 backdrop-blur p-3 shrink-0">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* File attachment preview */}
              <AnimatePresence>
                {fileName && (
                  <motion.div
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  >
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="flex-1 truncate text-primary">{fileName}</span>
                    <button onClick={() => { setFileName(''); setFileContent(''); }} className="text-muted-foreground hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode badge */}
              {mode !== 'chat' && (
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                    {MODE_OPTIONS.find(m => m.id === mode)?.label} Mode
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {mode === 'journal' && 'Write naturally — AI will structure your entry'}
                    {mode === 'command' && 'Direct command — AI will execute and confirm'}
                    {mode === 'report' && 'Describe the report — AI will generate it'}
                    {mode === 'car_finder' && 'Describe what your customer wants — AI finds matching stock'}
                    {mode === 'inv_mgr' && 'AI analyses inventory health, pricing and aging'}
                    {mode === 'sales_mgr' && 'AI coaches your sales strategy and lead prioritisation'}
                  </span>
                </div>
              )}

              <div className="flex gap-2 items-end">
                {/* File upload */}
                <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv,.pdf,.xlsx,.json" onChange={handleFile} />
                <Button
                  variant="ghost" size="icon"
                  className="w-8 h-8 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file (TXT, CSV, JSON)"
                >
                  <Upload className="w-4 h-4" />
                </Button>

                {/* Text input */}
                <div className="flex-1 min-w-0 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      mode === 'journal' ? 'Write your journal entry naturally… (e.g. "Met Ahmed today, wants Civic around 7M, has Corolla for exchange")' :
                      mode === 'command' ? 'Enter a command… (e.g. "Mark stock #XYZ as sold", "Create follow-ups for all hot leads")' :
                      mode === 'report' ? 'Describe the report you need… (e.g. "This month profit report", "Inventory aging analysis")' :
                      mode === 'car_finder' ? 'Describe what the customer wants… (e.g. "SUV under 6M with sunroof, Karachi, 2020 or newer")' :
                      mode === 'inv_mgr' ? 'Ask about your inventory… (e.g. "Which cars are overpriced?", "Aging analysis")' :
                      mode === 'sales_mgr' ? 'Ask your Sales Manager… (e.g. "Who should I call first today?", "Help me negotiate with this buyer")' :
                      'Ask anything about your business…'
                    }
                    className="min-h-[44px] max-h-32 resize-none bg-muted/40 border-border text-sm px-3 py-2.5 pr-10 rounded-xl"
                    rows={1}
                    disabled={isStreaming}
                  />
                </div>

                {/* Stop / Send */}
                {isStreaming ? (
                  <Button
                    size="icon" variant="outline"
                    className="w-9 h-9 shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => abortRef.current?.abort()}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="w-9 h-9 shrink-0 bg-primary hover:bg-primary/90"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() && !fileContent}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Enter to send · Shift+Enter for new line · Attach files for document intelligence ·{' '}
                <span className="text-primary">FACT / INFERENCE / ESTIMATE</span> labels indicate AI confidence
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
