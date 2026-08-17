import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot, Key, Copy, Check, ChevronRight, ExternalLink,
  BookOpen, Zap, Shield, Code2, Terminal, AlertCircle,
  Globe, Layers, ArrowRight, CheckCircle2, Lightbulb,
  Sparkles, Save, Plus, Trash2, Play, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Prompt Profile types & data ─────────────────────────────────────────────
const PROFILE_STORAGE_KEY = 'wulfrayn_prompt_profiles';

interface PromptProfile {
  id: string; name: string; role: string; tone: string; instructions: string;
  focus: string; created_at: string;
}

const PRESET_PROFILES: Omit<PromptProfile, 'id' | 'created_at'>[] = [
  {
    name: 'Stock Expert',
    role: 'Expert JDM car dealer specialising in Japanese imports for the Pakistani market',
    tone: 'Professional, confident, data-driven',
    focus: 'Vehicle specs, auction grades, pricing, import duties, mileage verification',
    instructions: `You are an expert JDM car advisor for Wulfrayn's DB dealership. When asked about a car:
1. Always mention auction grade, mileage, and origin
2. Give realistic PKR price ranges based on current market
3. Highlight hybrid vs petrol differences for Pakistani roads
4. Mention Toyota reliability advantage wherever relevant
5. Always end with "Shall I check availability in our current stock?"`,
  },
  {
    name: 'Finance & Import Advisor',
    role: 'Pakistan car finance and import duty specialist',
    tone: 'Clear, helpful, number-focused',
    focus: 'Import costs, duties, landed cost calculations, finance options',
    instructions: `You are a car finance and import advisor. For every import query:
1. Calculate FOB + freight + insurance + customs duty + clearing = total landed cost
2. Use current SRO duty structure (mention engine cc bracket)
3. Quote in PKR, mention exchange rate sensitivity
4. Explain CIF vs FOB difference
5. Mention 3-year vs 5-year age restrictions`,
  },
  {
    name: 'Customer Assistant',
    role: 'Friendly car buying assistant for Wulfrayn\'s DB customers',
    tone: 'Warm, patient, non-technical language',
    focus: 'Helping customers find the right car, explaining features in simple terms',
    instructions: `You are a friendly car buying assistant. Rules:
1. Never use jargon — explain in simple Urdu-friendly English
2. Ask about budget, family size, and usage (city/highway/off-road) first
3. Recommend max 3 options with clear pros/cons
4. Always mention after-sales service and parts availability
5. Close with "Would you like me to book a test drive or get a quote?"`,
  },
  {
    name: 'Inspection & Condition Expert',
    role: 'Pre-purchase vehicle inspection specialist',
    tone: 'Detailed, cautious, thorough',
    focus: 'Paint thickness, chassis check, accident history, mechanical condition',
    instructions: `You are a vehicle inspection expert. When reviewing any car:
1. Start with: paint condition, panel gaps, accident evidence
2. Check: engine, transmission, suspension, tyres
3. Flag any JDM auction repair codes (A/B/C/U/W/X/XX)
4. Rate overall condition: Excellent / Good / Fair / Avoid
5. Give a final risk score out of 10`,
  },
  {
    name: 'Hybrid & EV Specialist',
    role: 'Hybrid and electric vehicle technical advisor',
    tone: 'Technical but accessible',
    focus: 'Hybrid systems, battery health, EV range, charging, Pakistan-specific usage',
    instructions: `You are a hybrid/EV specialist for Pakistan market. For every question:
1. Compare HEV vs PHEV vs BEV for Pakistani roads/infrastructure
2. Discuss battery health indicators and replacement cost (PKR)
3. Toyota THS-II reliability vs Honda i-MMD vs Nissan e-Power
4. Address load-shedding concerns for PHEVs
5. Always mention inverter coolant flush requirement`,
  },
  {
    name: 'Auction Bidding Coach',
    role: 'Japanese auction bidding strategy advisor',
    tone: 'Strategic, competitive, experienced',
    focus: 'Auction grades, repair codes, bidding limits, under-market deals',
    instructions: `You are a Japanese car auction bidding coach. Strategy rules:
1. Never bid above grade 4 price for a grade 3.5 car
2. R-grade cars: price 15-25% below equivalent clean car
3. Prioritise Toyota/Honda/Nissan — parts available in Pakistan
4. Flag: modified odometers, suspicious grade gaps, RA cars
5. Give max bid recommendations as a formula: (market PKR / 1.3) = max auction JPY`,
  },
];

function loadProfiles(): PromptProfile[] {
  try { return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveProfiles(p: PromptProfile[]) { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p)); }

// ─── Custom GPTs Alternative Tab ─────────────────────────────────────────────
function CustomGPTsTab() {
  const [profiles, setProfiles] = useState<PromptProfile[]>(() => loadProfiles());
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [testOpen, setTestOpen] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [form, setForm] = useState<Omit<PromptProfile, 'id' | 'created_at'>>(PRESET_PROFILES[0]);

  const saveProfile = () => {
    if (!form.name.trim() || !form.instructions.trim()) return;
    let updated: PromptProfile[];
    if (editId) {
      updated = profiles.map(p => p.id === editId ? { ...p, ...form } : p);
    } else {
      updated = [...profiles, { ...form, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString() }];
    }
    setProfiles(updated); saveProfiles(updated); setShowNew(false); setEditId(null);
  };

  const delProfile = (id: string) => {
    const u = profiles.filter(p => p.id !== id); setProfiles(u); saveProfiles(u);
  };

  const importPreset = (preset: typeof PRESET_PROFILES[0]) => {
    const p: PromptProfile = { ...preset, id: Math.random().toString(36).slice(2), created_at: new Date().toISOString() };
    const updated = [...profiles, p]; setProfiles(updated); saveProfiles(updated);
  };

  const testProfile = async (profile: PromptProfile) => {
    if (!testInput.trim()) return;
    setTestLoading(true); setTestOutput('');
    try {
      const apiKey = localStorage.getItem('wulfrayn_groq_key') || localStorage.getItem('wulfrayn_openai_key') || '';
      const endpoint = localStorage.getItem('wulfrayn_api_endpoint') || 'https://api.groq.com/openai/v1';
      const model = localStorage.getItem('wulfrayn_model') || 'llama-3.3-70b-versatile';
      const systemPrompt = `You are ${profile.role}.\nTone: ${profile.tone}\nFocus: ${profile.focus}\n\n${profile.instructions}`;
      const resp = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: testInput }], max_tokens: 600 }),
      });
      const data = await resp.json();
      setTestOutput(data.choices?.[0]?.message?.content ?? 'No response — check API key in Settings.');
    } catch (e) {
      setTestOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setTestLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">Custom AI Prompt Profiles — Free Alternative to Custom GPTs</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              ChatGPT Custom GPTs require a paid plan. This built-in system lets you create named AI personas with custom instructions,
              roles, tone, and focus — powered by your existing API keys (Groq, OpenAI, Together, DeepSeek, Gemini).
              No subscription required.
            </p>
          </div>
        </div>
      </div>

      {/* Saved profiles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Your Profiles ({profiles.length})</p>
          <button onClick={() => { setForm(PRESET_PROFILES[0]); setEditId(null); setShowNew(true); }}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Plus className="w-3.5 h-3.5" />Create Profile
          </button>
        </div>
        {profiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
            <Bot className="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p className="text-sm">No profiles yet — import a preset or create your own</p>
          </div>
        )}
        {profiles.map(p => (
          <div key={p.id} className="border border-border rounded-xl bg-card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.tone}</Badge>
                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-[200px]">{p.focus}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setTestOpen(p.id); setTestInput(''); setTestOutput(''); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20">
                  <Play className="w-3 h-3" />Test
                </button>
                <button onClick={() => { setForm({ name:p.name, role:p.role, tone:p.tone, focus:p.focus, instructions:p.instructions }); setEditId(p.id); setShowNew(true); }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => delProfile(p.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Test panel */}
            {testOpen === p.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <input value={testInput} onChange={e => setTestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && testProfile(p)}
                    placeholder="Ask this profile something…"
                    className="flex-1 h-8 text-xs px-3 rounded-lg border border-border bg-transparent text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                  <button onClick={() => testProfile(p)} disabled={testLoading}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
                    {testLoading ? '…' : 'Ask'}
                  </button>
                  <button onClick={() => setTestOpen(null)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>
                {testOutput && (
                  <div className="text-xs text-foreground bg-muted/30 rounded-lg p-3 leading-relaxed border border-border whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {testOutput}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Uses your configured API key from Settings → AI Integration</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preset library */}
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Preset Profile Library — Import Ready</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_PROFILES.map((preset, i) => {
            const alreadyImported = profiles.some(p => p.name === preset.name);
            return (
              <div key={i} className="border border-border rounded-xl bg-card/50 p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{preset.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preset.role}</p>
                  </div>
                  <button
                    onClick={() => !alreadyImported && importPreset(preset)}
                    className={cn('shrink-0 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors', alreadyImported
                      ? 'text-muted-foreground border-border cursor-not-allowed opacity-50'
                      : 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/15')}>
                    {alreadyImported ? '✓ Imported' : 'Import'}
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{preset.tone}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
          <p className="text-xs font-bold text-foreground">How It Works</p>
        </div>
        <div className="p-4 space-y-2">
          {[
            ['1', 'Create or import a profile with a name, role, tone, and custom instructions'],
            ['2', 'Hit "Test" to chat with the profile using your existing Groq/OpenAI/etc key'],
            ['3', 'Use the profile\'s system prompt in the AI Chatbot by selecting it in Settings'],
            ['4', 'No Custom GPT subscription needed — works with any OpenAI-compatible API'],
          ].map(([n, desc]) => (
            <div key={n} className="flex items-start gap-3 text-xs">
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary font-bold">{n}</div>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile editor modal-style */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="w-full max-w-[calc(100%-2rem)] md:max-w-xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-bold text-foreground">{editId ? 'Edit Profile' : 'New Prompt Profile'}</p>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              {[
                { label: 'Profile Name', key: 'name', placeholder: 'e.g. Stock Expert' },
                { label: 'Role / Persona', key: 'role', placeholder: 'e.g. Expert JDM car dealer...' },
                { label: 'Tone', key: 'tone', placeholder: 'e.g. Professional, concise, data-driven' },
                { label: 'Focus Areas', key: 'focus', placeholder: 'e.g. Pricing, auction grades, import duties' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full h-9 text-xs px-3 rounded-lg border border-border bg-transparent text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Custom Instructions</label>
                <textarea value={form.instructions} onChange={e => setForm(v => ({ ...v, instructions: e.target.value }))}
                  placeholder="Write detailed instructions for how this AI persona should behave…"
                  className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-border bg-transparent text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 font-mono leading-relaxed min-h-[140px] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setShowNew(false)} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={saveProfile} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {editId ? 'Update Profile' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Supabase project URL helper ──────────────────────────────────────────────
const API_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project.supabase.co'}/functions/v1/rpm-public-api`;
const OPENAPI_URL = `${API_BASE}/openapi.json`;

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg overflow-hidden border border-border/60">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border/60">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{language}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground/90 bg-muted/30 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-primary">{n}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AIIntegrationGuidePage() {
  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-6 max-w-4xl mx-auto">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Integration Guide</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect Wulfrayn's DB to ChatGPT, Claude, or any OpenAI-compatible AI assistant using your API key.
                Let your AI directly read, create, and update listings and inquiries.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Overview cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Key,    color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', title: 'API Key Auth',   desc: 'Secure Bearer token — generate in API Keys page' },
            { icon: Globe,  color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     title: 'REST Endpoints', desc: 'Full CRUD on vehicles & inquiries' },
            { icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', title: 'OpenAPI Spec',   desc: 'Auto-generated schema for ChatGPT Actions' },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="border-border h-full">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', c.bg)}>
                    <c.icon className={cn('w-4 h-4', c.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="custom-gpts">
          <TabsList className="bg-muted/50 border border-border h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="custom-gpts" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" />Custom AI Profiles</TabsTrigger>
            <TabsTrigger value="chatgpt" className="gap-1.5 text-xs"><Bot className="w-3.5 h-3.5" />ChatGPT Custom GPT</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs"><Code2 className="w-3.5 h-3.5" />API Reference</TabsTrigger>
            <TabsTrigger value="examples" className="gap-1.5 text-xs"><Terminal className="w-3.5 h-3.5" />Examples</TabsTrigger>
          </TabsList>

          {/* ─── Custom AI Profiles Tab ────────────────────────────────────── */}
          <TabsContent value="custom-gpts" className="mt-4">
            <CustomGPTsTab />
          </TabsContent>

          {/* ─── ChatGPT Setup Tab ─────────────────────────────────────────── */}
          <TabsContent value="chatgpt" className="space-y-5 mt-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  How to connect Wulfrayn's DB to ChatGPT
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Follow these steps to create a Custom GPT that can control your inventory and inquiries directly from chat.openai.com
                </p>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Step 1 */}
                <div className="flex gap-3">
                  <StepBadge n={1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Generate an API Key</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Go to <strong>Settings → Developer API</strong> (or the <strong>API Keys</strong> page in the sidebar).
                      Click <em>"Generate New Key"</em>, give it a name like <code className="bg-muted px-1 rounded">ChatGPT Integration</code>,
                      select <strong>Read + Write</strong> permissions, and click Create.
                      <br /><br />
                      <span className="text-yellow-400 font-medium">⚠ Copy the key immediately — it is only shown once.</span>
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Step 2 */}
                <div className="flex gap-3">
                  <StepBadge n={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Open ChatGPT and Create a New GPT</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Go to <a href="https://chat.openai.com" target="_blank" rel="noreferrer"
                        className="text-primary underline inline-flex items-center gap-0.5">chat.openai.com <ExternalLink className="w-3 h-3" /></a>,
                      click your profile → <em>"My GPTs"</em> → <em>"Create a GPT"</em>.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Step 3 */}
                <div className="flex gap-3">
                  <StepBadge n={3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Configure the GPT Instructions</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed">
                      In the <em>Configure</em> tab, set the GPT name to <strong>"Wulfrayn Inventory Manager"</strong> and paste these instructions:
                    </p>
                    <CodeBlock language="instructions" code={`You are an AI assistant for Wulfrayn's DB, a car dealership management system.

You can help the user:
- List and search vehicle inventory
- Get details on a specific vehicle
- Create new vehicle listings
- Update vehicle details (price, status, notes, etc.)
- Delete vehicle listings
- View and manage customer inquiries
- Create new inquiries for potential customers

Always confirm before deleting anything.
When creating or updating vehicles, ask for confirmation with a summary of what you're about to do.
Format prices in PKR with commas (e.g. PKR 4,500,000).
When showing vehicle lists, use a clean table or bullet format.`} />
                  </div>
                </div>

                <Separator />

                {/* Step 4 */}
                <div className="flex gap-3">
                  <StepBadge n={4} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Add Actions (API Connection)</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed">
                      In the <em>Configure</em> tab, scroll down to <strong>Actions</strong> → click <em>"Add actions"</em>.
                      In the schema field, paste the URL of the OpenAPI spec:
                    </p>
                    <CodeBlock language="url" code={OPENAPI_URL} />
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      ChatGPT will automatically import all available endpoints.
                      Alternatively, click <em>"Import from URL"</em> and paste the URL above.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Step 5 */}
                <div className="flex gap-3">
                  <StepBadge n={5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Configure Authentication</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed">
                      In the Actions panel, click <em>"Authentication"</em> and set:
                    </p>
                    <div className="space-y-2">
                      {[
                        ['Auth Type', 'API Key'],
                        ['API Key',   'Paste your key from Step 1'],
                        ['Auth Type', 'Bearer'],
                      ].map(([label, val], i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
                          <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
                          <span className="text-foreground font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Step 6 */}
                <div className="flex gap-3">
                  <StepBadge n={6} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Test & Save</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Click <em>"Test"</em> on any action to verify the connection.
                      Then click <em>"Save"</em> / <em>"Publish"</em> (choose <em>"Only me"</em> for private use).
                    </p>
                    <div className="mt-3 p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-300 leading-relaxed">
                          You're done! Now you can chat with your GPT and say things like:<br />
                          <em>"Show me all available Toyotas under 5 million"</em><br />
                          <em>"Create a listing: Honda Civic 2023 white automatic, 7.5 lac"</em><br />
                          <em>"Mark vehicle [id] as sold"</em>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-foreground">Pro Tips</p>
                </div>
                <ul className="space-y-2">
                  {[
                    'Use "read" permission keys for query-only GPTs (safer). Use "write" keys only when you need create/update/delete.',
                    'You can have multiple GPTs with different keys — one for sales staff (read-only) and one for yourself (full access).',
                    'The same API key works with Claude, Gemini, and any tool that supports OpenAI-compatible function calling.',
                    'Rate limit is 100 requests/minute per key. For bulk operations, space out requests.',
                    'Revoke a key immediately from the API Keys page if you think it was compromised.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── API Reference Tab ─────────────────────────────────────────── */}
          <TabsContent value="api" className="space-y-4 mt-4">
            {/* Base URL */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />Base URL
                </p>
                <CodeBlock language="url" code={API_BASE} />
                <p className="text-xs text-muted-foreground">All endpoints are prefixed with this base URL.</p>
              </CardContent>
            </Card>

            {/* Auth */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />Authentication
                </p>
                <p className="text-xs text-muted-foreground">Every request must include your API key as a Bearer token in the Authorization header:</p>
                <CodeBlock language="http" code={`Authorization: Bearer YOUR_API_KEY`} />
              </CardContent>
            </Card>

            {/* Endpoints table */}
            {[
              {
                title: 'Vehicles', icon: Layers, permission: 'read / write',
                endpoints: [
                  { method: 'GET',    path: '/vehicles',     perm: 'read',  desc: 'List vehicles. Params: page, limit, make, model, status, min_price, max_price' },
                  { method: 'GET',    path: '/vehicles/:id', perm: 'read',  desc: 'Get full details of one vehicle' },
                  { method: 'POST',   path: '/vehicles',     perm: 'write', desc: 'Create a new vehicle listing. Required: make, model' },
                  { method: 'PUT',    path: '/vehicles/:id', perm: 'write', desc: 'Update any fields of a vehicle (price, status, color, notes…)' },
                  { method: 'DELETE', path: '/vehicles/:id', perm: 'write', desc: 'Delete a vehicle permanently' },
                  { method: 'GET',    path: '/inventory/summary', perm: 'read', desc: 'Count of vehicles by status and make' },
                  { method: 'GET',    path: '/makes',        perm: 'read',  desc: 'List of all distinct makes in inventory' },
                ],
              },
              {
                title: 'Inquiries', icon: Bot, permission: 'read / write',
                endpoints: [
                  { method: 'GET',  path: '/inquiries',     perm: 'read',  desc: 'List customer inquiries. Params: page, limit, status' },
                  { method: 'GET',  path: '/inquiries/:id', perm: 'read',  desc: 'Get full details of one inquiry' },
                  { method: 'POST', path: '/inquiries',     perm: 'read',  desc: 'Create a new inquiry. Required: customer_name, customer_phone' },
                  { method: 'PUT',  path: '/inquiries/:id', perm: 'write', desc: 'Update inquiry status, notes, assignment' },
                ],
              },
              {
                title: 'Meta', icon: Code2, permission: 'none',
                endpoints: [
                  { method: 'GET', path: '/openapi.json', perm: 'none', desc: 'Full OpenAPI 3.1 spec — import directly into ChatGPT Actions' },
                ],
              },
            ].map(group => (
              <Card key={group.title} className="border-border overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5 text-primary" />
                    {group.title} Endpoints
                    <Badge variant="outline" className="text-[10px] ml-auto">{group.permission}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/10">
                          {['Method', 'Endpoint', 'Permission', 'Description'].map(h => (
                            <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.endpoints.map((ep, i) => (
                          <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <Badge variant="outline" className={cn('text-[10px] font-mono',
                                ep.method === 'GET'    ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' :
                                ep.method === 'POST'   ? 'text-blue-400 border-blue-400/30 bg-blue-400/5' :
                                ep.method === 'PUT'    ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' :
                                'text-red-400 border-red-400/30 bg-red-400/5'
                              )}>
                                {ep.method}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <code className="text-xs font-mono text-foreground/80">{ep.path}</code>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={cn('text-[10px] font-medium',
                                ep.perm === 'write' ? 'text-yellow-400' :
                                ep.perm === 'none'  ? 'text-muted-foreground' :
                                'text-emerald-400'
                              )}>{ep.perm}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{ep.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Error codes */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />Error Codes
                </p>
                <div className="space-y-1.5">
                  {[
                    ['200', 'OK',          'Success'],
                    ['201', 'Created',     'Resource created successfully'],
                    ['400', 'Bad Request', 'Missing required fields or invalid JSON'],
                    ['401', 'Unauthorized','Missing or invalid API key'],
                    ['403', 'Forbidden',   'API key lacks required permission (read/write)'],
                    ['404', 'Not Found',   'Resource ID does not exist'],
                    ['429', 'Too Many Requests', 'Rate limit exceeded (100 req/min)'],
                    ['500', 'Server Error','Supabase or internal error'],
                  ].map(([code, status, desc]) => (
                    <div key={code} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded bg-muted/20">
                      <code className={cn('font-mono font-bold w-10 shrink-0',
                        code === '200' || code === '201' ? 'text-emerald-400' :
                        code === '400' || code === '404' ? 'text-yellow-400' :
                        code === '401' || code === '403' ? 'text-red-400' :
                        'text-orange-400'
                      )}>{code}</code>
                      <span className="text-foreground/80 w-28 shrink-0">{status}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Examples Tab ──────────────────────────────────────────────── */}
          <TabsContent value="examples" className="space-y-4 mt-4">
            {[
              {
                title: 'List available vehicles (cURL)',
                code: `curl -X GET "${API_BASE}/vehicles?status=available&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
                language: 'bash',
              },
              {
                title: 'Search by make and price range',
                code: `curl -X GET "${API_BASE}/vehicles?make=Toyota&max_price=5000000" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
                language: 'bash',
              },
              {
                title: 'Create a new vehicle listing',
                code: `curl -X POST "${API_BASE}/vehicles" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "make": "Toyota",
    "model": "Corolla",
    "variant": "Altis X CVT",
    "model_year": 2023,
    "color": "Pearl White",
    "mileage": 12000,
    "expected_selling_price": 5200000,
    "transmission": "CVT",
    "fuel_type": "Petrol",
    "origin": "local",
    "status": "available"
  }'`,
                language: 'bash',
              },
              {
                title: 'Update vehicle price and status',
                code: `curl -X PUT "${API_BASE}/vehicles/VEHICLE_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"expected_selling_price": 4900000, "is_negotiable": true}'`,
                language: 'bash',
              },
              {
                title: 'Mark vehicle as sold',
                code: `curl -X PUT "${API_BASE}/vehicles/VEHICLE_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "sold"}'`,
                language: 'bash',
              },
              {
                title: 'Create a customer inquiry',
                code: `curl -X POST "${API_BASE}/inquiries" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "Ahmed Raza",
    "customer_phone": "0300-1234567",
    "description": "Looking for a Honda Civic 2022-2023 in silver, budget 7 million",
    "req_make": "Honda",
    "req_model": "Civic",
    "budget": 7000000
  }'`,
                language: 'bash',
              },
              {
                title: 'Python example — list all Toyota vehicles',
                code: `import requests

API_KEY = "your_api_key_here"
BASE_URL = "${API_BASE}"

headers = {"Authorization": f"Bearer {API_KEY}"}

response = requests.get(
    f"{BASE_URL}/vehicles",
    headers=headers,
    params={"make": "Toyota", "status": "available", "limit": 50}
)

vehicles = response.json()
print(f"Found {vehicles['total']} vehicles")
for v in vehicles['data']:
    print(f"  {v['make']} {v['model']} {v['variant']} — PKR {v['expected_selling_price']:,}")`,
                language: 'python',
              },
              {
                title: 'JavaScript / fetch example',
                code: `const API_KEY = 'your_api_key_here';
const BASE_URL = '${API_BASE}';

// List available vehicles
const res = await fetch(\`\${BASE_URL}/vehicles?status=available\`, {
  headers: { Authorization: \`Bearer \${API_KEY}\` }
});
const { data, total } = await res.json();
console.log(\`\${total} vehicles found\`);

// Create a new listing
await fetch(\`\${BASE_URL}/vehicles\`, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    make: 'Honda', model: 'Civic', model_year: 2023,
    expected_selling_price: 7500000, status: 'available',
  }),
});`,
                language: 'javascript',
              },
            ].map(ex => (
              <Card key={ex.title} className="border-border">
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {ex.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <CodeBlock code={ex.code} language={ex.language} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* ── Quick link to API Keys ─────────────────────────────────────────── */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <Key className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Ready to connect?</p>
              <p className="text-xs text-muted-foreground">Generate your API key from the Developer API page in Settings or the sidebar.</p>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5" onClick={() => window.location.href = '/developer-api'}>
              <Key className="w-3.5 h-3.5" />
              Get API Key
            </Button>
          </CardContent>
        </Card>

        {/* ── Guide card for non-ChatGPT clients ────────────────────────────── */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-foreground">Using with other AI tools</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Any AI platform that supports OpenAI-compatible function calling or custom tool/plugin definitions can connect to Wulfrayn's DB.
            </p>
            <div className="space-y-2">
              {[
                ['Claude (Anthropic)',     'Use the OpenAPI spec URL to define tools in your Claude API system prompt or any Claude tool-use client.'],
                ['n8n / Make / Zapier',    'Use the HTTP node/action with Bearer auth to call any endpoint and automate workflows.'],
                ['Custom scripts',         'Use cURL, Python requests, or JavaScript fetch — see the Examples tab for ready-to-use code.'],
                ['OpenAI Assistants API',  'Define the vehicle and inquiry endpoints as function tools in your assistant configuration.'],
              ].map(([tool, desc]) => (
                <div key={tool} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{tool}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
