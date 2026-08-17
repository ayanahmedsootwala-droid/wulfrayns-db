/**
 * Copilot Tools — client-side helpers for the AI Copilot.
 * These call the Supabase DB directly for fast read operations
 * (the Edge Function handles all write/multi-step tool calls).
 */
import { supabase } from '@/db/supabase';

export interface JournalEntry {
  id: string;
  entry_date: string;
  raw_text: string;
  mode: string;
  summary?: string;
  parsed_entities?: Record<string, unknown>;
  created_at: string;
}

export interface AiTask {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  due_date?: string;
  linked_lead_id?: string;
  linked_vehicle_id?: string;
  created_at: string;
}

export interface AiSession {
  id: string;
  title?: string;
  mode: string;
  messages: CopilotMessage[];
  created_at: string;
  updated_at: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  use_count: number;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode: string;
  toolLog?: ToolLogEntry[];
  isStreaming?: boolean;
  actions?: MessageAction[];
}

export interface ToolLogEntry {
  tool: string;
  args: unknown;
  result: unknown;
}

export interface MessageAction {
  label: string;
  type: 'navigate' | 'copy' | 'save' | 'create_lead' | 'create_vehicle';
  payload?: string;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function fetchSessions(): Promise<AiSession[]> {
  const { data } = await supabase
    .from('rpm_ai_sessions')
    .select('id,title,mode,messages,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);
  return (data ?? []) as AiSession[];
}

export async function saveSession(session: Partial<AiSession>): Promise<string> {
  if (session.id) {
    await supabase
      .from('rpm_ai_sessions')
      .update({ ...session, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    return session.id;
  }
  const { data } = await supabase
    .from('rpm_ai_sessions')
    .insert({ ...session, messages: session.messages ?? [] })
    .select('id')
    .single();
  return (data as { id: string })?.id ?? '';
}

export async function deleteSession(id: string) {
  await supabase.from('rpm_ai_sessions').delete().eq('id', id);
}

// ─── Saved Prompts ─────────────────────────────────────────────────────────────
export async function fetchSavedPrompts(): Promise<SavedPrompt[]> {
  const { data } = await supabase
    .from('rpm_saved_prompts')
    .select('*')
    .order('use_count', { ascending: false });
  return (data ?? []) as SavedPrompt[];
}

export async function incrementPromptUse(id: string) {
  await supabase.rpc('increment', { row_id: id }).then(() => {});
  // fallback: just update directly
  const { data } = await supabase.from('rpm_saved_prompts').select('use_count').eq('id', id).single();
  if (data) {
    await supabase.from('rpm_saved_prompts').update({ use_count: (data as { use_count: number }).use_count + 1 }).eq('id', id);
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function fetchPendingTasks(): Promise<AiTask[]> {
  const { data } = await supabase
    .from('rpm_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(20);
  return (data ?? []) as AiTask[];
}

// ─── Journal ──────────────────────────────────────────────────────────────────
export async function fetchRecentJournal(limit = 10): Promise<JournalEntry[]> {
  const { data } = await supabase
    .from('rpm_journal')
    .select('id,entry_date,raw_text,mode,summary,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as JournalEntry[];
}

// ─── Quick stats for Morning Brief sidebar ────────────────────────────────────
export interface MorningBriefData {
  hotLeads: number;
  pendingTasks: number;
  agingVehicles: number;
  totalAvailable: number;
  pendingQuotations: number;
}

export async function fetchMorningBriefStats(): Promise<MorningBriefData> {
  const [leadsRes, tasksRes, vehiclesRes, quotesRes] = await Promise.all([
    supabase.from('rpm_leads').select('lead_score', { count: 'exact' }).eq('lead_score', 'hot').eq('status', 'active'),
    supabase.from('rpm_tasks').select('id', { count: 'exact' }).in('status', ['pending', 'in_progress']),
    supabase.from('rpm_vehicles').select('id,purchase_date,status').eq('status', 'available'),
    supabase.from('rpm_quotations').select('id', { count: 'exact' }).in('status', ['draft', 'sent']),
  ]);

  const now = new Date();
  const aging = ((vehiclesRes.data ?? []) as { purchase_date?: string }[]).filter(v => {
    if (!v.purchase_date) return false;
    return Math.floor((now.getTime() - new Date(v.purchase_date).getTime()) / 86400000) >= 30;
  }).length;

  return {
    hotLeads: leadsRes.count ?? 0,
    pendingTasks: tasksRes.count ?? 0,
    agingVehicles: aging,
    totalAvailable: vehiclesRes.data?.length ?? 0,
    pendingQuotations: quotesRes.count ?? 0,
  };
}

// ─── Parse tool log from response ────────────────────────────────────────────
export function parseToolLog(text: string): { toolLog: ToolLogEntry[]; cleanText: string } {
  const match = text.match(/__TOOL_LOG__([\s\S]*?)__TOOL_LOG_END__\n\n/);
  if (!match) return { toolLog: [], cleanText: text };
  try {
    const toolLog = JSON.parse(match[1]) as ToolLogEntry[];
    const cleanText = text.replace(/__TOOL_LOG__[\s\S]*?__TOOL_LOG_END__\n\n/, '');
    return { toolLog, cleanText };
  } catch {
    return { toolLog: [], cleanText: text };
  }
}

// ─── Parse structured result blocks from AI response ─────────────────────────
export interface ParsedBlock {
  type: 'text' | 'leads' | 'vehicles' | 'report' | 'decision' | 'journal' | 'tasks' | 'actions';
  content: string;
  data?: unknown;
}

export function parseResponseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = /```result:(\w+)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      const txt = text.slice(last, m.index).trim();
      if (txt) blocks.push({ type: 'text', content: txt });
    }
    try {
      blocks.push({ type: m[1] as ParsedBlock['type'], content: m[2].trim(), data: JSON.parse(m[2].trim()) });
    } catch {
      blocks.push({ type: m[1] as ParsedBlock['type'], content: m[2].trim() });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    const txt = text.slice(last).trim();
    if (txt) blocks.push({ type: 'text', content: txt });
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
}

// ─── Build context string for system prompt ───────────────────────────────────
export function buildContextString(messages: CopilotMessage[], stats?: MorningBriefData): string {
  const lines: string[] = [];
  if (stats) {
    lines.push(`LIVE STATS: ${stats.hotLeads} hot leads, ${stats.pendingTasks} pending tasks, ${stats.agingVehicles} aging vehicles (30+ days), ${stats.totalAvailable} available in stock, ${stats.pendingQuotations} pending quotes`);
  }
  // Last 4 messages as context
  const recent = messages.slice(-4);
  if (recent.length > 0) {
    lines.push('RECENT CONVERSATION:');
    recent.forEach(m => lines.push(`${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`));
  }
  return lines.join('\n');
}

// ─── Tool icon + label mapping ────────────────────────────────────────────────
export const TOOL_META: Record<string, { label: string; icon: string; color: string }> = {
  search_leads:        { label: 'Searching leads',   icon: 'Users',      color: 'text-blue-400' },
  search_vehicles:     { label: 'Searching inventory', icon: 'Car',      color: 'text-green-400' },
  create_lead:         { label: 'Creating lead',     icon: 'UserPlus',   color: 'text-primary' },
  create_vehicle:      { label: 'Adding vehicle',    icon: 'Plus',       color: 'text-primary' },
  update_lead:         { label: 'Updating lead',     icon: 'Edit',       color: 'text-yellow-400' },
  update_vehicle:      { label: 'Updating vehicle',  icon: 'Edit',       color: 'text-yellow-400' },
  create_journal_entry:{ label: 'Saving to journal', icon: 'BookOpen',   color: 'text-purple-400' },
  create_task:         { label: 'Creating task',     icon: 'CheckSquare',color: 'text-orange-400' },
  get_analytics:       { label: 'Analyzing data',    icon: 'BarChart3',  color: 'text-cyan-400' },
  add_lead_interaction:{ label: 'Logging interaction',icon: 'MessageSquare', color: 'text-indigo-400' },
  log_audit:           { label: 'Logging audit',     icon: 'Shield',     color: 'text-muted-foreground' },
};
