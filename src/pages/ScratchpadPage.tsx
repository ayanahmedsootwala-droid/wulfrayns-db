import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Pencil, Save, X, StickyNote, Search, Clock,
  Pin, PinOff, Download, FileText, ChevronDown, Bold, Italic,
  List, AlignLeft, Star, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Note {
  id: string; title: string; content: string; color: string;
  pinned: boolean; created_at: string; updated_at: string;
}

const NOTE_COLORS = [
  { key: 'default', bg: 'bg-card',          border: 'border-border',       dot: 'bg-muted-foreground' },
  { key: 'red',     bg: 'bg-red-950/40',    border: 'border-red-500/40',   dot: 'bg-red-400'         },
  { key: 'amber',   bg: 'bg-amber-950/40',  border: 'border-amber-500/40', dot: 'bg-amber-400'       },
  { key: 'green',   bg: 'bg-green-950/40',  border: 'border-green-500/40', dot: 'bg-green-400'       },
  { key: 'blue',    bg: 'bg-blue-950/40',   border: 'border-blue-500/40',  dot: 'bg-blue-400'        },
  { key: 'purple',  bg: 'bg-purple-950/40', border: 'border-purple-500/40',dot: 'bg-purple-400'      },
  { key: 'cyan',    bg: 'bg-cyan-950/40',   border: 'border-cyan-500/40',  dot: 'bg-cyan-400'        },
];

const TEMPLATES = [
  { label: 'Vehicle Inspection', icon: '🚗', content: `**Vehicle Inspection Checklist**\n\n- [ ] Exterior condition\n- [ ] Interior condition\n- [ ] Engine bay\n- [ ] Under-chassis\n- [ ] Tyres & wheels\n- [ ] Electricals\n- [ ] A/C & heating\n- [ ] Test drive notes\n\n**Notes:**\n` },
  { label: 'Price Negotiation', icon: '💰', content: `**Price Negotiation Notes**\n\nAsking price: \nOffer made: \nCounter offer: \nFinal agreed: \n\n**Conditions:**\n\n**Next steps:**\n` },
  { label: 'Customer Meeting', icon: '🤝', content: `**Customer Meeting Notes**\n\nCustomer: \nContact: \nDate: ${new Date().toLocaleDateString()}\n\n**Requirements:**\n\n**Budget:**\n\n**Follow-up:**\n` },
  { label: 'Auction Strategy', icon: '🏷️', content: `**Auction Strategy**\n\nAuction house: \nDate: \nTarget cars:\n\n**Max bids:**\n\n**Priorities:**\n\n**Notes:**\n` },
  { label: 'Quick Todo', icon: '✅', content: `**Todo List**\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] \n- [ ] \n` },
  { label: 'Import Checklist', icon: '📦', content: `**Import Process Checklist**\n\nCar: \nAuction grade: \n\n- [ ] Auction sheet verified\n- [ ] Deregistration docs\n- [ ] Shipping booked\n- [ ] Insurance arranged\n- [ ] Customs docs ready\n- [ ] Agent briefed\n- [ ] Port clearance\n- [ ] Registration PKG\n` },
];

function colorFor(key: string) { return NOTE_COLORS.find(c => c.key === key) ?? NOTE_COLORS[0]; }
function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d/60)}h ago`;
  return `${Math.floor(d/1440)}d ago`;
}

// Simple markdown-ish renderer
function renderContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- \[ \] (.+)$/gm, '☐ $1')
    .replace(/^- \[x\] (.+)$/gm, '☑ $1')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
}

interface NoteCardProps {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDuplicate: (n: Note) => void;
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, onDuplicate }: NoteCardProps) {
  const c = colorFor(note.color);
  const [copied, setCopied] = useState(false);
  const copyText = () => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={cn('group rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-lg', c.bg, c.border, note.pinned && 'ring-1 ring-primary/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {note.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{note.title || 'Untitled'}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onTogglePin(note.id, !note.pinned)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={copyText} className="p-1 rounded hover:bg-muted text-muted-foreground">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDuplicate(note)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(note)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(note.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed line-clamp-5 flex-1"
        dangerouslySetInnerHTML={{ __html: renderContent(note.content) }} />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {NOTE_COLORS.filter(c=>c.key!=='default').map(cc => (
            <div key={cc.key} className={cn('w-3 h-3 rounded-full', cc.dot, note.color===cc.key && 'ring-1 ring-white')} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Clock className="w-3 h-3" />{relTime(note.updated_at)}
        </span>
      </div>
    </motion.div>
  );
}

export default function ScratchpadPage() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [editing, setEditing]     = useState<Partial<Note> | null>(null);
  const [saving, setSaving]       = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('scratchpad_notes')
      .select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false });
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = { title: editing.title || 'Untitled', content: editing.content || '', color: editing.color || 'default', pinned: editing.pinned ?? false };
    try {
      if (editing.id) {
        await supabase.from('scratchpad_notes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      } else {
        await supabase.from('scratchpad_notes').insert({ ...payload });
      }
      toast.success(editing.id ? 'Note updated' : 'Note saved');
      setEditing(null); await load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await supabase.from('scratchpad_notes').delete().eq('id', id);
    setNotes(n => n.filter(x => x.id !== id)); toast.success('Deleted');
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from('scratchpad_notes').update({ pinned, updated_at: new Date().toISOString() }).eq('id', id);
    setNotes(n => n.map(x => x.id === id ? { ...x, pinned } : x).sort((a,b) => Number(b.pinned)-Number(a.pinned)));
    toast.success(pinned ? 'Pinned' : 'Unpinned');
  };

  const duplicate = async (n: Note) => {
    await supabase.from('scratchpad_notes').insert({ title: `${n.title} (copy)`, content: n.content, color: n.color, pinned: false });
    await load(); toast.success('Duplicated');
  };

  const exportMD = () => {
    const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));
    const md = filtered.map(n => `# ${n.title}\n\n${n.content}\n\n---\n`).join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scratchpad-notes.md'; a.click();
    toast.success('Exported as Markdown');
  };

  const insertFormat = (wrap: string, placeholder = '') => {
    if (!textRef.current) return;
    const el = textRef.current;
    const start = el.selectionStart; const end = el.selectionEnd;
    const selected = el.value.slice(start, end) || placeholder;
    const newVal = el.value.slice(0, start) + wrap + selected + wrap + el.value.slice(end);
    setEditing(e => ({ ...e, content: newVal }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + wrap.length, start + wrap.length + selected.length); }, 0);
  };

  const insertLine = (prefix: string) => {
    if (!textRef.current) return;
    const el = textRef.current;
    const start = el.selectionStart;
    const before = el.value.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const newVal = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart);
    setEditing(e => ({ ...e, content: newVal }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );
  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><StickyNote className="w-5 h-5 text-primary" />Scratchpad</h1>
            <p className="text-sm text-muted-foreground">{notes.length} notes · {pinned.length} pinned</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 h-9 w-52 text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={exportMD} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />Export MD
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Template<ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEMPLATES.map(tpl => (
                  <DropdownMenuItem key={tpl.label} onClick={() => setEditing({ title: tpl.label, content: tpl.content, color: 'default', pinned: false })}>
                    <span className="mr-2">{tpl.icon}</span>{tpl.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setEditing({ title: '', content: '', color: 'default', pinned: false })} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />New Note
            </Button>
          </div>
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({length:8}).map((_,i)=><div key={i} className="h-48 rounded-2xl bg-muted animate-pulse"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <StickyNote className="w-12 h-12 opacity-20" />
            <p className="text-lg font-semibold">{search ? 'No notes match' : 'No notes yet'}</p>
            {!search && <Button size="sm" onClick={() => setEditing({ title:'', content:'', color:'default', pinned:false })}>Create first note</Button>}
          </div>
        ) : (
          <div className="space-y-4">
            {pinned.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Pin className="w-3 h-3" />Pinned</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinned.map(n=><NoteCard key={n.id} note={n} onEdit={setEditing} onDelete={del} onTogglePin={togglePin} onDuplicate={duplicate}/>)}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-4">Others</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinned.map(n=><NoteCard key={n.id} note={n} onEdit={setEditing} onDelete={del} onTogglePin={togglePin} onDuplicate={duplicate}/>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e=>{ if(e.target===e.currentTarget) setEditing(null); }}>
            <motion.div initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:16}}
              className="w-full max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-border shrink-0">
                <Input value={editing.title ?? ''} onChange={e=>setEditing(v=>({...v,title:e.target.value}))}
                  placeholder="Note title…" className="flex-1 h-8 text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                <button onClick={()=>setEditing(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4"/></button>
              </div>
              {/* Format bar */}
              <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-muted/30 shrink-0 flex-wrap">
                <button onClick={()=>insertFormat('**','bold')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Bold"><Bold className="w-3.5 h-3.5"/></button>
                <button onClick={()=>insertFormat('*','italic')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Italic"><Italic className="w-3.5 h-3.5"/></button>
                <button onClick={()=>insertLine('- ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Bullet"><List className="w-3.5 h-3.5"/></button>
                <button onClick={()=>insertLine('- [ ] ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Checkbox">☐</button>
                <div className="w-px h-4 bg-border mx-1" />
                {NOTE_COLORS.map(cc => (
                  <button key={cc.key} onClick={()=>setEditing(v=>({...v,color:cc.key}))}
                    className={cn('w-4 h-4 rounded-full transition-transform', cc.dot, editing.color===cc.key && 'scale-125 ring-1 ring-white')} />
                ))}
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={()=>setEditing(v=>v ? {...v,pinned:!v.pinned} : v)}
                  className={cn('p-1.5 rounded text-muted-foreground', editing.pinned ? 'text-primary' : 'hover:text-foreground')}>
                  <Pin className="w-3.5 h-3.5"/>
                </button>
              </div>
              {/* Textarea */}
              <textarea ref={textRef} value={editing.content ?? ''} onChange={e=>setEditing(v=>({...v,content:e.target.value}))}
                placeholder="Write your note… (supports **bold**, *italic*, - bullets, - [ ] checkboxes)"
                className="flex-1 resize-none px-4 py-3 bg-transparent text-sm focus:outline-none font-mono leading-relaxed min-h-[200px] overflow-y-auto" />
              {/* Footer */}
              <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-border shrink-0">
                <span className="text-xs text-muted-foreground">{(editing.content?.length ?? 0)} chars</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={()=>setEditing(null)}>Cancel</Button>
                  <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                    {saving ? <><span className="animate-spin">⟳</span>Saving…</> : <><Save className="w-3.5 h-3.5"/>Save Note</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
