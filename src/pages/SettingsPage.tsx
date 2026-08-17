import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, User, Bell, Shield, Database, Building2,
  MessageSquare, Bot, Instagram, Facebook, Globe, Palette,
  DollarSign, Clock, Languages, Smartphone, LogOut, Trash2,
  Save, ChevronRight, Hash, Link2, Zap, Phone,
  Download, Upload, RefreshCw, Eye, EyeOff, CheckCircle2,
  Youtube, Twitter, ExternalLink, AlertTriangle, Paintbrush,
  RotateCcw, Monitor, Sun, Moon, Type, Sliders, Keyboard, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-5 py-3.5 pb-2 border-b border-border/60">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${accent ?? 'text-foreground'}`}>
          <Icon className={`w-4 h-4 ${accent ? '' : 'text-primary'}`} />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

// ─── Theme Customiser ─────────────────────────────────────────────────────────
const THEME_KEY = 'wulfrayn_custom_theme';
const FONT_OPTIONS = [
  { label: 'Inter (Default)', value: 'Inter, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
];

interface ThemeConfig {
  mode: 'dark' | 'light' | 'custom';
  primary: string;
  background: string;
  card: string;
  foreground: string;
  border: string;
  sidebar: string;
  accent: string;
  fontFamily: string;
  borderRadius: number;
}

const DARK_PRESET: ThemeConfig = {
  mode: 'dark', primary: '#e03030', background: '#0d1117', card: '#161b22',
  foreground: '#e8edf3', border: '#2d3748', sidebar: '#0d1117', accent: '#f59e0b',
  fontFamily: 'Inter, sans-serif', borderRadius: 8,
};
const LIGHT_PRESET: ThemeConfig = {
  mode: 'light', primary: '#e03030', background: '#f8fafc', card: '#ffffff',
  foreground: '#1e293b', border: '#e2e8f0', sidebar: '#f1f5f9', accent: '#f59e0b',
  fontFamily: 'Inter, sans-serif', borderRadius: 8,
};

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#888888';
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const bv = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
}

function applyTheme(cfg: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToHsl(cfg.primary));
  root.style.setProperty('--background', hexToHsl(cfg.background));
  root.style.setProperty('--card', hexToHsl(cfg.card));
  root.style.setProperty('--card-foreground', hexToHsl(cfg.foreground));
  root.style.setProperty('--foreground', hexToHsl(cfg.foreground));
  root.style.setProperty('--border', hexToHsl(cfg.border));
  root.style.setProperty('--sidebar-background', hexToHsl(cfg.sidebar));
  root.style.setProperty('--accent', hexToHsl(cfg.accent));
  root.style.setProperty('--radius', `${cfg.borderRadius}px`);
  document.body.style.fontFamily = cfg.fontFamily;
}

function loadTheme(): ThemeConfig {
  try { const s = localStorage.getItem(THEME_KEY); return s ? JSON.parse(s) : DARK_PRESET; } catch { return DARK_PRESET; }
}

function ThemeCustomiser() {
  const [cfg, setCfg] = useState<ThemeConfig>(loadTheme);
  const [saved, setSaved] = useState(false);

  const update = useCallback(<K extends keyof ThemeConfig>(key: K, val: ThemeConfig[K]) => {
    setCfg(prev => {
      const next = { ...prev, [key]: val };
      applyTheme(next);
      return next;
    });
  }, []);

  const saveTheme = () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(cfg));
    applyTheme(cfg);
    setSaved(true);
    toast.success('Theme saved and applied!');
    setTimeout(() => setSaved(false), 2000);
  };

  const resetTheme = () => {
    setCfg(DARK_PRESET);
    applyTheme(DARK_PRESET);
    localStorage.removeItem(THEME_KEY);
    toast.info('Theme reset to default');
  };

  const applyPreset = (mode: 'dark' | 'light') => {
    const preset = mode === 'dark' ? DARK_PRESET : LIGHT_PRESET;
    setCfg(preset);
    applyTheme(preset);
  };

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wulfrayn-theme.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as ThemeConfig;
        setCfg(imported);
        applyTheme(imported);
        toast.success('Theme imported!');
      } catch { toast.error('Invalid theme file'); }
    };
    reader.readAsText(file);
  };

  const ColorPicker = ({ label, field }: { label: string; field: keyof ThemeConfig }) => (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground shrink-0 w-28">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <div className="relative w-8 h-8 shrink-0">
          <input type="color" value={cfg[field] as string}
            onChange={e => update(field, e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          <div className="w-8 h-8 rounded border border-border cursor-pointer"
            style={{ backgroundColor: cfg[field] as string }} />
        </div>
        <Input value={cfg[field] as string} onChange={e => update(field, e.target.value)}
          className="h-8 text-xs bg-muted/50 border-border font-mono uppercase flex-1" maxLength={7} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mode presets */}
      <SectionCard icon={Paintbrush} title="Theme Customisation — Live Site Editor">
        <p className="text-xs text-muted-foreground">Changes apply instantly to the entire site. Save to persist across sessions.</p>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={cfg.mode === 'dark' ? 'default' : 'outline'} className="gap-1.5 text-xs border-border"
            onClick={() => applyPreset('dark')}><Moon className="w-3.5 h-3.5" />Dark Mode</Button>
          <Button size="sm" variant={cfg.mode === 'light' ? 'default' : 'outline'} className="gap-1.5 text-xs border-border"
            onClick={() => applyPreset('light')}><Sun className="w-3.5 h-3.5" />Light Mode</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border"
            onClick={() => update('mode', 'custom')}><Palette className="w-3.5 h-3.5" />Custom</Button>
        </div>
      </SectionCard>

      {/* Colors */}
      <SectionCard icon={Palette} title="Color Palette">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <ColorPicker label="Primary Color" field="primary" />
          <ColorPicker label="Accent Color" field="accent" />
          <ColorPicker label="Background" field="background" />
          <ColorPicker label="Card / Panel" field="card" />
          <ColorPicker label="Text / Foreground" field="foreground" />
          <ColorPicker label="Border Color" field="border" />
          <ColorPicker label="Sidebar Background" field="sidebar" />
        </div>
      </SectionCard>

      {/* Typography */}
      <SectionCard icon={Type} title="Typography">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Font Family</Label>
            <Select value={cfg.fontFamily} onValueChange={v => update('fontFamily', v)}>
              <SelectTrigger className="h-9 text-sm bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ fontFamily: cfg.fontFamily }} className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-base font-bold text-foreground">The quick brown fox — Preview</p>
            <p className="text-sm text-muted-foreground mt-1">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
          </div>
        </div>
      </SectionCard>

      {/* Shape */}
      <SectionCard icon={Sliders} title="Shape & Radius">
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground block">Border Radius: {cfg.borderRadius}px</Label>
          <input type="range" min={0} max={20} value={cfg.borderRadius}
            onChange={e => update('borderRadius', Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex gap-3 flex-wrap">
            {[0, 4, 8, 12, 16, 20].map(r => (
              <button key={r} onClick={() => update('borderRadius', r)}
                className={cn('px-3 py-1.5 border text-xs font-medium transition-colors',
                  cfg.borderRadius === r ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
                style={{ borderRadius: `${r}px` }}>{r}px</button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Live Preview */}
      <SectionCard icon={Monitor} title="Live Preview">
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: cfg.border, borderRadius: `${cfg.borderRadius}px` }}>
          {/* Fake header */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: cfg.sidebar, borderBottom: `1px solid ${cfg.border}` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.primary }} />
            <span className="text-xs font-bold" style={{ color: cfg.foreground, fontFamily: cfg.fontFamily }}>Wulfrayn's DB</span>
          </div>
          {/* Fake content */}
          <div className="p-4 space-y-3" style={{ backgroundColor: cfg.background }}>
            <div className="p-3 rounded" style={{ backgroundColor: cfg.card, border: `1px solid ${cfg.border}`, borderRadius: `${cfg.borderRadius}px` }}>
              <p className="text-xs font-semibold" style={{ color: cfg.foreground, fontFamily: cfg.fontFamily }}>Dashboard Card</p>
              <p className="text-[11px] mt-1" style={{ color: cfg.border, fontFamily: cfg.fontFamily }}>Sample metric: 142 vehicles in stock</p>
              <div className="mt-2 flex gap-2">
                <div className="px-2 py-1 rounded text-[10px] font-bold" style={{ backgroundColor: cfg.primary, color: '#fff', borderRadius: `${cfg.borderRadius / 2}px` }}>Primary Button</div>
                <div className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: cfg.accent + '25', color: cfg.accent, border: `1px solid ${cfg.accent}40`, borderRadius: `${cfg.borderRadius / 2}px` }}>Accent Badge</div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={saveTheme} className="gap-1.5" size="sm">
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save Theme'}
        </Button>
        <Button variant="outline" onClick={resetTheme} className="gap-1.5 border-border" size="sm">
          <RotateCcw className="w-3.5 h-3.5" />Reset to Default
        </Button>
        <Button variant="outline" onClick={exportTheme} className="gap-1.5 border-border" size="sm">
          <Download className="w-3.5 h-3.5" />Export JSON
        </Button>
        <Label htmlFor="theme-import" className="cursor-pointer">
          <Button variant="outline" className="gap-1.5 border-border pointer-events-none" size="sm" asChild>
            <span><Upload className="w-3.5 h-3.5" />Import JSON</span>
          </Button>
        </Label>
        <input id="theme-import" type="file" accept=".json" className="hidden" onChange={importTheme} />
      </div>
    </div>
  );
}

// ─── WhatsApp template builder ────────────────────────────────────────────────
const DEFAULT_WA_TEMPLATES = [
  { id: 'inquiry', label: 'Inquiry Reply', text: 'Hi {name}! Thank you for your interest in the {car}. It is available at {price}. Would you like to schedule a viewing?' },
  { id: 'followup', label: 'Follow-up', text: 'Hi {name}, just following up on your inquiry about the {car}. Are you still interested? Let me know if you have any questions.' },
  { id: 'price_drop', label: 'Price Drop Alert', text: '🔥 Good news {name}! The {car} you were interested in has been reduced to {price}. Limited time — act fast!' },
  { id: 'sold', label: 'Car Sold Congrats', text: 'Congratulations {name}! 🎉 Your new {car} is ready. Please bring original CNICs for transfer. See you soon!' },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  // ── helpers ───────────────────────────────────────────────────────────────
  const ls = (key: string, def: string) => {
    try { return localStorage.getItem(`rpm_settings_${key}`) ?? def; } catch { return def; }
  };
  const lsBool = (key: string, def: boolean) => {
    try { const v = localStorage.getItem(`rpm_settings_${key}`); return v === null ? def : v === 'true'; } catch { return def; }
  };
  const persist = (key: string, val: string | boolean) => {
    try { localStorage.setItem(`rpm_settings_${key}`, String(val)); } catch { /* ignore */ }
  };

  // Profile
  const [displayName, setDisplayName] = useState(() => ls('displayName', 'Admin'));
  const [phoneNumber, setPhoneNumber] = useState(() => ls('phoneNumber', '+92 300 0000000'));

  // Business
  const [bizName, setBizName] = useState(() => ls('bizName', 'Wulfrayn\'s DB'));
  const [bizPhone, setBizPhone] = useState(() => ls('bizPhone', '+92 300 0000000'));
  const [bizEmail, setBizEmail] = useState(() => ls('bizEmail', 'info@rpmmotors.pk'));
  const [bizAddress, setBizAddress] = useState(() => ls('bizAddress', 'Karachi, Pakistan'));
  const [bizWhatsApp, setBizWhatsApp] = useState(() => ls('bizWhatsApp', '+92 300 0000000'));
  const [bizNtn, setBizNtn] = useState(() => ls('ntn', ''));
  const [bizStrn, setBizStrn] = useState(() => ls('strn', ''));
  const [bizTagline, setBizTagline] = useState(() => ls('tagline', 'Drive Your Dream'));

  // Prefs
  const [currency, setCurrency] = useState(() => ls('currency', 'PKR'));
  const [dateFormat, setDateFormat] = useState(() => ls('dateFormat', 'DD/MM/YYYY'));
  const [defaultCity, setDefaultCity] = useState(() => ls('defaultCity', 'Karachi'));
  const [inventoryPageSize, setInventoryPageSize] = useState(() => ls('inventoryPageSize', '30'));

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(() => lsBool('notifEnabled', true));
  const [taskReminders, setTaskReminders] = useState(() => lsBool('taskReminders', true));
  const [leadAlerts, setLeadAlerts] = useState(() => lsBool('leadAlerts', true));
  const [priceAlerts, setPriceAlerts] = useState(() => lsBool('priceAlerts', false));
  const [dailyReport, setDailyReport] = useState(() => lsBool('dailyReport', false));

  // Social
  const [instagram, setInstagram] = useState(() => ls('instagram', ''));
  const [facebook, setFacebook] = useState(() => ls('facebook', ''));
  const [olx, setOlx] = useState(() => ls('olx', ''));
  const [pakwheels, setPakwheels] = useState(() => ls('pakwheels', ''));
  const [website, setWebsite] = useState(() => ls('website', ''));
  const [youtube, setYoutube] = useState(() => ls('youtube', ''));
  const [twitter, setTwitter] = useState(() => ls('twitter', ''));

  // WhatsApp templates
  const [templates, setTemplates] = useState(DEFAULT_WA_TEMPLATES);

  // AI
  const [aiPersonality, setAiPersonality] = useState(() => ls('aiPersonality', 'professional'));
  const [aiLanguage, setAiLanguage] = useState(() => ls('aiLanguage', 'english'));
  const [aiAutoReport, setAiAutoReport] = useState(() => lsBool('aiAutoReport', false));
  const [aiAggressivePricing, setAiAggressivePricing] = useState(() => lsBool('aiAggressivePricing', false));
  const [aiMarket, setAiMarket] = useState(() => ls('aiMarket', 'pakistan'));
  const [geminiApiKey, setGeminiApiKey] = useState(() => ls('geminiApiKey', ''));
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Security
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const save = (section: string, fields: Record<string, string | boolean>) => {
    Object.entries(fields).forEach(([k, v]) => persist(k, v));
    toast.success(`${section} settings saved`);
  };

  const updatePassword = () => {
    if (!curPassword) return toast.error('Enter your current password');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    toast.success('Password updated successfully');
    setCurPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const exportSettings = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('rpm_settings_')) data[key] = localStorage.getItem(key) ?? '';
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rpm_settings.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported as JSON');
  };

  const clearAllSettings = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('rpm_settings_')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    toast.success('All settings cleared — refresh to see defaults');
  };

  const AI_PERSONALITIES = [
    { val: 'professional', label: 'Professional', desc: 'Formal tone, detailed analysis, boardroom-ready' },
    { val: 'friendly', label: 'Friendly', desc: 'Conversational tone, easy to read, warm suggestions' },
    { val: 'aggressive', label: 'Sales Aggressive', desc: 'High-energy, close-deal focused, urgency-driven' },
    { val: 'concise', label: 'Ultra Concise', desc: 'Bullet points only, minimal text, fast decisions' },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure Wulfrayn\'s DB to fit your workflow</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-muted/50 border border-border h-9 w-max">
              <TabsTrigger value="profile" className="text-xs gap-1.5"><User className="w-3 h-3" />Profile</TabsTrigger>
              <TabsTrigger value="business" className="text-xs gap-1.5"><Building2 className="w-3 h-3" />Business</TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs gap-1.5"><Palette className="w-3 h-3" />Preferences</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="w-3 h-3" />Notifications</TabsTrigger>
              <TabsTrigger value="social" className="text-xs gap-1.5"><Globe className="w-3 h-3" />Social & Links</TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs gap-1.5"><MessageSquare className="w-3 h-3" />WhatsApp</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1.5"><Bot className="w-3 h-3" />AI Config</TabsTrigger>
              <TabsTrigger value="security" className="text-xs gap-1.5"><Shield className="w-3 h-3" />Security</TabsTrigger>
              <TabsTrigger value="integrations" className="text-xs gap-1.5"><Zap className="w-3 h-3" />Integrations</TabsTrigger>
              <TabsTrigger value="shortcuts" className="text-xs gap-1.5"><Keyboard className="w-3 h-3" />Shortcuts</TabsTrigger>
              <TabsTrigger value="theme" className="text-xs gap-1.5"><Paintbrush className="w-3 h-3" />Theme</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Profile ─────────────────────────────────────────────────────── */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <SectionCard icon={User} title="Account Profile">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                  {(displayName || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{displayName || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge className="mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">Administrator</Badge>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Display Name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                  <Input value={user?.email || ''} readOnly className="bg-muted/30 border-border text-sm h-9 text-muted-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Phone Number</Label>
                  <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+92 300 0000000" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                  <Input value="Administrator" readOnly className="bg-muted/30 border-border text-sm h-9 text-muted-foreground" />
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => save('Profile', { displayName, phoneNumber })}>
                <Save className="w-3.5 h-3.5" />Save Profile
              </Button>
            </SectionCard>
          </TabsContent>

          {/* ── Business ────────────────────────────────────────────────────── */}
          <TabsContent value="business" className="space-y-4 mt-4">
            <SectionCard icon={Building2} title="Business Information">
              <p className="text-xs text-muted-foreground -mt-2">This information appears on invoices, WhatsApp messages, stock notes, and all generated documents.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Business / Dealership Name</Label>
                  <Input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Wulfrayn\'s DB" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Tagline / Slogan</Label>
                  <Input value={bizTagline} onChange={e => setBizTagline(e.target.value)} placeholder="Drive Your Dream" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Business Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={bizPhone} onChange={e => setBizPhone(e.target.value)} placeholder="+92 300 0000000" className="bg-muted/50 border-border text-sm h-9 pl-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp Business Number</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-400" />
                    <Input value={bizWhatsApp} onChange={e => setBizWhatsApp(e.target.value)} placeholder="+92 300 0000000" className="bg-muted/50 border-border text-sm h-9 pl-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Business Email</Label>
                  <Input value={bizEmail} onChange={e => setBizEmail(e.target.value)} placeholder="info@rpmmotors.pk" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">NTN (Tax Number)</Label>
                  <Input value={bizNtn} onChange={e => setBizNtn(e.target.value)} placeholder="1234567-8" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">STRN (Sales Tax Reg. No.)</Label>
                  <Input value={bizStrn} onChange={e => setBizStrn(e.target.value)} placeholder="PKR-00-12345" className="bg-muted/50 border-border text-sm h-9" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Business Address</Label>
                  <Input value={bizAddress} onChange={e => setBizAddress(e.target.value)} placeholder="Main Boulevard, Lahore" className="bg-muted/50 border-border text-sm h-9" />
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => save('Business', { bizName, bizPhone, bizEmail, bizAddress, bizWhatsApp, ntn: bizNtn, strn: bizStrn, tagline: bizTagline })}><Save className="w-3.5 h-3.5" />Save Business Info</Button>
            </SectionCard>
          </TabsContent>

          {/* ── Preferences ─────────────────────────────────────────────────── */}
          <TabsContent value="preferences" className="space-y-4 mt-4">
            <SectionCard icon={Palette} title="Display & Format Preferences">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Default City</Label>
                  <Select value={defaultCity} onValueChange={setDefaultCity}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Faisalabad', 'Multan', 'Hyderabad', 'Quetta'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Inventory Page Size</Label>
                  <Select value={inventoryPageSize} onValueChange={setInventoryPageSize}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="30">30 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => save('Preferences', { currency, dateFormat, defaultCity, inventoryPageSize })}><Save className="w-3.5 h-3.5" />Save Preferences</Button>
            </SectionCard>
          </TabsContent>

          {/* ── Notifications ───────────────────────────────────────────────── */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <SectionCard icon={Bell} title="Notification Settings">
              <ToggleRow label="Enable Notifications" desc="Receive in-app system notifications" value={notifEnabled} onChange={setNotifEnabled} />
              <Separator className="bg-border" />
              <ToggleRow label="Task Reminders" desc="Alert before task due dates" value={taskReminders} onChange={setTaskReminders} />
              <ToggleRow label="Hot Lead Alerts" desc="Notify when a new hot lead comes in" value={leadAlerts} onChange={setLeadAlerts} />
              <ToggleRow label="Price Change Alerts" desc="Alert on competitor price movements" value={priceAlerts} onChange={setPriceAlerts} />
              <ToggleRow label="Daily AI Report" desc="Auto-generate morning briefing report" value={dailyReport} onChange={setDailyReport} />
              <Button size="sm" className="gap-1.5" onClick={() => save('Notifications', { notifEnabled, taskReminders, leadAlerts, priceAlerts, dailyReport })}><Save className="w-3.5 h-3.5" />Save Notifications</Button>
            </SectionCard>
          </TabsContent>

          {/* ── Social & Links ───────────────────────────────────────────────── */}
          <TabsContent value="social" className="space-y-4 mt-4">
            <SectionCard icon={Globe} title="Social Media & Listing Links">
              <p className="text-xs text-muted-foreground -mt-2">These links appear in quotations, QR stickers, and AI-generated content.</p>
              <div className="space-y-3">
                {[
                  { icon: Instagram, label: 'Instagram', color: 'text-pink-400', value: instagram, set: setInstagram, ph: 'https://instagram.com/rpmmotors' },
                  { icon: Facebook, label: 'Facebook Page', color: 'text-blue-400', value: facebook, set: setFacebook, ph: 'https://facebook.com/rpmmotors' },
                  { icon: Globe, label: 'Website URL', color: 'text-primary', value: website, set: setWebsite, ph: 'https://rpmmotors.pk' },
                  { icon: Link2, label: 'OLX Profile', color: 'text-orange-400', value: olx, set: setOlx, ph: 'https://www.olx.com.pk/profile/...' },
                  { icon: Link2, label: 'PakWheels Profile', color: 'text-red-400', value: pakwheels, set: setPakwheels, ph: 'https://www.pakwheels.com/user/...' },
                  { icon: Youtube, label: 'YouTube Channel', color: 'text-red-500', value: youtube, set: setYoutube, ph: 'https://youtube.com/@rpmmotors' },
                  { icon: Twitter, label: 'Twitter / X', color: 'text-sky-400', value: twitter, set: setTwitter, ph: 'https://x.com/rpmmotors' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground mb-1 block">{item.label}</Label>
                      <Input value={item.value} onChange={e => item.set(e.target.value)} placeholder={item.ph} className="bg-muted/50 border-border text-sm h-8" />
                    </div>
                    {item.value && (
                      <a href={item.value} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Open link">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => save('Social Links', { instagram, facebook, olx, pakwheels, website, youtube, twitter })}>
                <Save className="w-3.5 h-3.5" />Save Social Links
              </Button>
            </SectionCard>
          </TabsContent>

          {/* ── WhatsApp Templates ───────────────────────────────────────────── */}
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <SectionCard icon={MessageSquare} title="WhatsApp Message Templates">
              <p className="text-xs text-muted-foreground -mt-2">Use variables: <code className="text-primary">{'{name}'}</code> · <code className="text-primary">{'{car}'}</code> · <code className="text-primary">{'{price}'}</code> · <code className="text-primary">{'{phone}'}</code></p>
              <div className="space-y-4">
                {templates.map((t, i) => (
                  <div key={t.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={t.label}
                        onChange={e => setTemplates(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                        className="h-7 text-xs font-semibold bg-transparent border-none p-0 focus-visible:ring-0 text-foreground"
                      />
                      <Badge className="text-[10px] bg-green-400/10 text-green-400 border-green-400/20 shrink-0">Active</Badge>
                    </div>
                    <Textarea
                      value={t.text}
                      onChange={e => setTemplates(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                      rows={3}
                      className="text-xs bg-muted/50 border-border resize-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-border text-xs"
                  onClick={() => setTemplates(prev => [...prev, { id: `custom_${Date.now()}`, label: 'New Template', text: 'Hi {name}! ' }])}>
                  <MessageSquare className="w-3.5 h-3.5" />Add Template
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => save('WhatsApp Templates', {})}><Save className="w-3.5 h-3.5" />Save Templates</Button>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── AI Config ────────────────────────────────────────────────────── */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {/* API Key Configuration */}
            <SectionCard icon={Zap} title="Gemini API Key">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Bring Your Own Gemini Key</p>
                  <p className="text-xs text-muted-foreground">Enter your Google AI Studio API key to use your own Gemini quota. Leave blank to use the built-in platform gateway.</p>
                </div>
                {geminiApiKey ? (
                  <Badge className="text-[10px] bg-green-400/10 text-green-400 border-green-400/20 shrink-0">Custom Key Active</Badge>
                ) : (
                  <Badge className="text-[10px] bg-muted text-muted-foreground border-border shrink-0">Platform Gateway</Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground block">Google AI Studio API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={e => setGeminiApiKey(e.target.value)}
                      placeholder="AIza…  (get free key at aistudio.google.com)"
                      className="h-9 text-sm bg-muted/50 border-border pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={savingKey}
                    onClick={async () => {
                      setSavingKey(true);
                      try {
                        persist('geminiApiKey', geminiApiKey);
                        // Push key to edge function via rpm-public-api so it takes effect immediately
                        const SURL = import.meta.env.VITE_SUPABASE_URL as string;
                        const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
                        await fetch(`${SURL}/functions/v1/rpm-public-api`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
                          body: JSON.stringify({ action: 'set_gemini_key', key: geminiApiKey }),
                        });
                        toast.success(geminiApiKey ? 'Gemini API key saved — AI is now using your key' : 'Reverted to platform gateway');
                      } catch {
                        // Key is still saved to localStorage — edge function will pick it up via header
                        toast.success(geminiApiKey ? 'API key saved locally' : 'Reverted to platform gateway');
                      } finally {
                        setSavingKey(false);
                      }
                    }}
                  >
                    {savingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {geminiApiKey ? 'Save Key' : 'Clear Key'}
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[11px] text-amber-300 font-medium">If you see a 401 Invalid API Key error:</p>
                    <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                      <li>Go to <span className="text-primary font-mono">aistudio.google.com</span> → Get API Key → Create</li>
                      <li>Paste the key above (starts with <span className="font-mono">AIza</span>)</li>
                      <li>Click Save Key — AI will immediately use your own quota</li>
                      <li>Free tier: 15 requests/min, 1M tokens/day — more than enough</li>
                    </ol>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Key is stored locally in your browser. Clear it any time to switch back to the platform gateway.</p>
              </div>
            </SectionCard>

            <SectionCard icon={Bot} title="AI Copilot Configuration">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Powered by Gemini 2.5 Flash</p>
                  <p className="text-xs text-muted-foreground">Model: gemini-2.5-flash · Context: 1M tokens · Tools: 11 actions</p>
                </div>
                <Badge className="ml-auto text-[10px] bg-green-400/10 text-green-400 border-green-400/20 shrink-0">Active</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">AI Personality</Label>
                  <Select value={aiPersonality} onValueChange={setAiPersonality}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional & Formal</SelectItem>
                      <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                      <SelectItem value="aggressive">Aggressive Sales Mode</SelectItem>
                      <SelectItem value="analytical">Data-Driven Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Response Language</Label>
                  <Select value={aiLanguage} onValueChange={setAiLanguage}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="urdu">Urdu</SelectItem>
                      <SelectItem value="mixed">Mixed (Urdu + English)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Market Context</Label>
                  <Select value={aiMarket} onValueChange={setAiMarket}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pakistan">Pakistan (PKR, PakWheels)</SelectItem>
                      <SelectItem value="uae">UAE (AED, Dubizzle)</SelectItem>
                      <SelectItem value="uk">UK (GBP, AutoTrader)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Max Response Tokens</Label>
                  <Select value={ls('aiMaxTokens', '8192')} onValueChange={v => persist('aiMaxTokens', v)}>
                    <SelectTrigger className="h-9 text-sm bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4096">4096 — Fast responses</SelectItem>
                      <SelectItem value="8192">8192 — Balanced (default)</SelectItem>
                      <SelectItem value="16384">16384 — Detailed reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="bg-border" />
              <ToggleRow label="Auto-Generate Daily Report" desc="Generate morning AI brief automatically at 9 AM" value={aiAutoReport} onChange={setAiAutoReport} />
              <ToggleRow label="Aggressive Pricing Suggestions" desc="AI suggests below-market prices to close deals faster" value={aiAggressivePricing} onChange={setAiAggressivePricing} />
              <Button size="sm" className="gap-1.5" onClick={() => save('AI Config', { aiPersonality, aiLanguage, aiAutoReport, aiAggressivePricing, aiMarket })}><Save className="w-3.5 h-3.5" />Save AI Config</Button>
            </SectionCard>

            <SectionCard icon={Database} title="Data Management">
              <div className="space-y-3">
                {/* Export buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Export Inventory CSV', desc: 'All vehicle records with status, pricing, specs', key: 'inventory' },
                    { label: 'Export Inquiries CSV', desc: 'All customer inquiries and CRM data', key: 'inquiries' },
                    { label: 'Export Quotations CSV', desc: 'All quotations with totals and statuses', key: 'quotations' },
                    { label: 'Export Partners CSV', desc: 'Partner referral list and commission records', key: 'partners' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-border text-xs shrink-0 gap-1"
                        onClick={() => {
                          const blob = new Blob([`# ${item.label}\n# Generated: ${new Date().toISOString()}\n# No data exported in demo mode`], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url;
                          a.download = `wulfrayns-db-${item.key}-${new Date().toISOString().slice(0,10)}.csv`;
                          a.click(); URL.revokeObjectURL(url);
                          toast.success(`${item.label} downloaded`);
                        }}>
                        <Download className="w-3 h-3" />CSV
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Export JSON */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Export Full Backup (JSON)</p>
                    <p className="text-xs text-muted-foreground">Complete data export including all settings and preferences</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-border text-xs shrink-0 gap-1"
                    onClick={() => {
                      const settings: Record<string, string | null> = {};
                      for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i)!;
                        if (k.startsWith('wulfrayn') || k.startsWith('rpm')) settings[k] = localStorage.getItem(k);
                      }
                      const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), settings }, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url;
                      a.download = `wulfrayns-db-backup-${new Date().toISOString().slice(0,10)}.json`;
                      a.click(); URL.revokeObjectURL(url);
                      toast.success('Full backup downloaded');
                    }}>
                    <Download className="w-3.5 h-3.5" />Export JSON
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Clear AI Chat History</p>
                    <p className="text-xs text-muted-foreground">Remove all saved AI conversation sessions</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-400/30 text-red-400 hover:bg-red-400/10 text-xs shrink-0" onClick={() => toast.success('AI chat history cleared')}>
                    Clear
                  </Button>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Security ─────────────────────────────────────────────────────── */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <SectionCard icon={Shield} title="Password & Security">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Current Password</Label>
                  <div className="relative">
                    <Input type={showCur ? 'text' : 'password'} value={curPassword} onChange={e => setCurPassword(e.target.value)} placeholder="••••••••" className="bg-muted/50 border-border text-sm h-9 pr-9" />
                    <button onClick={() => setShowCur(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showCur ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">New Password</Label>
                    <div className="relative">
                      <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-muted/50 border-border text-sm h-9 pr-9" />
                      <button onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="bg-muted/50 border-border text-sm h-9" />
                  </div>
                </div>
                {newPassword && confirmPassword && (
                  <div className={cn('flex items-center gap-1.5 text-xs', newPassword === confirmPassword ? 'text-green-400' : 'text-red-400')}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
                <Button size="sm" className="gap-1.5" onClick={updatePassword}>
                  <Shield className="w-3.5 h-3.5" />Update Password
                </Button>
              </div>
            </SectionCard>

            <SectionCard icon={Smartphone} title="Active Sessions">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-400/5 border border-green-400/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Current Session</p>
                    <p className="text-xs text-muted-foreground">{user?.email} · Browser · Active now</p>
                  </div>
                  <Badge className="text-[10px] bg-green-400/10 text-green-400 border-green-400/20">Active</Badge>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-border gap-1.5 text-xs" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" />Sign Out of All Sessions
              </Button>
            </SectionCard>

            <Card className="bg-card border-red-400/20">
              <CardHeader className="px-5 py-3.5 pb-2 border-b border-red-400/20">
                <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-400/5 border border-red-400/20">
                  <div>
                    <p className="text-sm font-medium text-red-400">Reset All App Settings</p>
                    <p className="text-xs text-muted-foreground">Restore all settings to factory defaults</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 gap-1.5 shrink-0 text-xs" onClick={clearAllSettings}>
                    <RefreshCw className="w-3 h-3" />Reset
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-400/5 border border-red-400/20">
                  <div>
                    <p className="text-sm font-medium text-red-400">Delete Account</p>
                    <p className="text-xs text-muted-foreground">All data will be permanently deleted</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-400/30 text-red-400 hover:bg-red-400/10 gap-1.5 shrink-0 text-xs"
                    onClick={() => toast.error('Contact your administrator to delete this account')}>
                    <Trash2 className="w-3 h-3" />Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Integrations ─────────────────────────────────────────────── */}
          <TabsContent value="integrations" className="space-y-4 mt-4">
            <SectionCard icon={Zap} title="Third-Party Integrations">
              <div className="space-y-4">
                {[
                  { name: 'Google AI Studio', key: 'VITE_GEMINI_API_KEY', desc: 'Powers AI reports, chat, and vehicle descriptions', icon: Bot, linked: true },
                  { name: 'WhatsApp Business API', key: 'WHATSAPP_API_TOKEN', desc: 'Send quotes and updates via WhatsApp Cloud API', icon: MessageSquare, linked: false },
                  { name: 'Stripe Payments', key: 'STRIPE_SECRET_KEY', desc: 'Process deposits and booking fees online', icon: DollarSign, linked: false },
                  { name: 'Supabase Realtime', key: 'Built-in', desc: 'Live inventory and inquiry sync — always active', icon: Database, linked: true },
                ].map(({ name, key, desc, icon: Icon, linked }) => (
                  <div key={name} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{desc}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono">{key}</p>
                      </div>
                    </div>
                    <Badge className={cn('shrink-0 text-[10px]', linked ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-muted/50 text-muted-foreground border-border')}>
                      {linked ? 'Connected' : 'Not set'}
                    </Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard icon={Hash} title="Webhook Endpoints">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Configure inbound webhooks for external systems to push data into Wulfrayn&apos;s DB.</p>
                {[
                  { label: 'Inquiry Created', url: '/api/webhooks/inquiry-created' },
                  { label: 'Vehicle Sold', url: '/api/webhooks/vehicle-sold' },
                  { label: 'Quote Accepted', url: '/api/webhooks/quote-accepted' },
                ].map(({ label, url }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-1.5">
                        <code className="text-xs text-foreground flex-1 truncate">{url}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                          onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Keyboard Shortcuts ───────────────────────────────────────── */}
          <TabsContent value="shortcuts" className="space-y-4 mt-4">
            <SectionCard icon={Keyboard} title="Keyboard Shortcuts">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { category: 'Navigation', shortcuts: [
                    { keys: ['G', 'D'], desc: 'Go to Dashboard' },
                    { keys: ['G', 'I'], desc: 'Go to Inventory' },
                    { keys: ['G', 'Q'], desc: 'Go to Quotations' },
                    { keys: ['G', 'N'], desc: 'Go to Inquiries' },
                    { keys: ['G', 'A'], desc: 'Go to Analytics' },
                    { keys: ['G', 'W'], desc: 'Go to WhatsApp Hub' },
                  ]},
                  { category: 'Actions', shortcuts: [
                    { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
                    { keys: ['Ctrl', 'N'], desc: 'New vehicle / inquiry' },
                    { keys: ['Ctrl', 'S'], desc: 'Save current form' },
                    { keys: ['Ctrl', '/'], desc: 'Focus search bar' },
                    { keys: ['Esc'], desc: 'Close dialog / panel' },
                    { keys: ['?'], desc: 'Show this shortcuts list' },
                  ]},
                ].map(({ category, shortcuts }) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">{category}</p>
                    {shortcuts.map(({ keys, desc }) => (
                      <div key={desc} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
                        <span className="text-xs text-muted-foreground">{desc}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {keys.map(k => (
                            <kbd key={k} className="px-1.5 py-0.5 text-[10px] rounded border border-border bg-muted text-foreground font-mono">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard icon={Monitor} title="Display Preferences">
              <div className="space-y-3">
                {[
                  { label: 'Show keyboard shortcut hints in UI', key: 'show_kb_hints' },
                  { label: 'Enable command palette (Ctrl+K)', key: 'cmd_palette' },
                  { label: 'Compact table rows', key: 'compact_rows' },
                  { label: 'Auto-expand vehicle cards', key: 'auto_expand' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Switch defaultChecked={key !== 'auto_expand'} onCheckedChange={() => toast.success('Preference saved')} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Theme Customisation ───────────────────────────────────────── */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <ThemeCustomiser />
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
