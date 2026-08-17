import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, CheckSquare, Clock, AlertTriangle, CheckCircle2, XCircle,
  Phone, Car, Building2, FileText, Package, Truck, Filter, Calendar,
  ChevronDown, ChevronRight, RotateCcw, Flag, Star, Trash2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchTasks, createTask, updateTask, deleteTask } from '@/lib/api';
import { formatDate, getPriorityColor, cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskType, Priority } from '@/types/types';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

const TASK_ICONS: Record<string, React.ElementType> = {
  call_dealer: Phone, visit_showroom: Building2, inspection: Car,
  price_update: FileText, payment_reminder: AlertTriangle,
  document_collection: FileText, vehicle_pickup: Package,
  vehicle_delivery: Truck, other: CheckSquare,
};

const TASK_COLORS: Record<string, string> = {
  call_dealer: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  visit_showroom: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  inspection: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  price_update: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  payment_reminder: 'text-red-400 bg-red-400/10 border-red-400/20',
  document_collection: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  vehicle_pickup: 'text-green-400 bg-green-400/10 border-green-400/20',
  vehicle_delivery: 'text-primary bg-primary/10 border-primary/20',
  other: 'text-muted-foreground bg-muted/50 border-border',
};

const PRIORITY_STYLES: Record<string, { badge: string; bar: string; label: string }> = {
  urgent: { badge: 'bg-red-500/15 text-red-400 border-red-500/30',    bar: 'bg-red-500',    label: 'Urgent'  },
  high:   { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', bar: 'bg-orange-500', label: 'High'    },
  medium: { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', bar: 'bg-yellow-400', label: 'Medium'  },
  low:    { badge: 'bg-muted/40 text-muted-foreground border-border',   bar: 'bg-muted',      label: 'Low'     },
};

interface Subtask { id: string; text: string; done: boolean; }
interface TaskWithSubs extends Task { subtasks?: Subtask[]; recurring?: boolean; recur_interval?: string; starred?: boolean; }

const SUBTASK_KEY = (id: string) => `task_subtasks_${id}`;
const TASK_META_KEY = (id: string) => `task_meta_${id}`;

function loadSubtasks(id: string): Subtask[] { try { return JSON.parse(localStorage.getItem(SUBTASK_KEY(id)) ?? '[]'); } catch { return []; } }
function saveSubtasks(id: string, subs: Subtask[]) { localStorage.setItem(SUBTASK_KEY(id), JSON.stringify(subs)); }
function loadMeta(id: string): { starred?: boolean; recurring?: boolean; recur_interval?: string } {
  try { return JSON.parse(localStorage.getItem(TASK_META_KEY(id)) ?? '{}'); } catch { return {}; }
}
function saveMeta(id: string, meta: object) { localStorage.setItem(TASK_META_KEY(id), JSON.stringify(meta)); }

function isDueSoon(due?: string | null) {
  if (!due) return false;
  const d = new Date(due); const now = new Date();
  return d > now && (d.getTime() - now.getTime()) < 86400000 * 2;
}
function isOverdue(due?: string | null, status?: string) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date();
}

function SubtaskList({ taskId }: { taskId: string }) {
  const [subs, setSubs] = useState<Subtask[]>(() => loadSubtasks(taskId));
  const [newText, setNewText] = useState('');
  const toggle = (id: string) => { const u = subs.map(s=>s.id===id?{...s,done:!s.done}:s); setSubs(u); saveSubtasks(taskId, u); };
  const add = () => {
    if (!newText.trim()) return;
    const u = [...subs, { id: Math.random().toString(36).slice(2), text: newText.trim(), done: false }];
    setSubs(u); saveSubtasks(taskId, u); setNewText('');
  };
  const del = (id: string) => { const u = subs.filter(s=>s.id!==id); setSubs(u); saveSubtasks(taskId, u); };
  const done = subs.filter(s=>s.done).length;
  return (
    <div className="mt-3 space-y-2">
      {subs.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{width:`${subs.length?Math.round(done/subs.length*100):0}%`}}/></div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{done}/{subs.length}</span>
          </div>
          {subs.map(s=>(
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <Checkbox checked={s.done} onCheckedChange={()=>toggle(s.id)} className="h-3.5 w-3.5" />
              <span className={cn('flex-1 min-w-0', s.done && 'line-through text-muted-foreground')}>{s.text}</span>
              <button onClick={()=>del(s.id)} className="shrink-0 hover:text-red-400 text-muted-foreground"><XCircle className="w-3 h-3"/></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
          placeholder="Add subtask…" className="h-6 text-xs px-2 flex-1" />
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 shrink-0" onClick={add}><Plus className="w-3 h-3"/></Button>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, onToggleStar }:{
  task: TaskWithSubs; onEdit:(t:TaskWithSubs)=>void; onDelete:(id:string)=>void;
  onStatusChange:(id:string,s:TaskStatus)=>void; onToggleStar:(id:string)=>void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TASK_ICONS[task.task_type ?? 'other'] ?? CheckSquare;
  const tc = TASK_COLORS[task.task_type ?? 'other'];
  const pc = PRIORITY_STYLES[task.priority ?? 'medium'] ?? PRIORITY_STYLES.medium;
  const overdue = isOverdue(task.due_date, task.status);
  const dueSoon = isDueSoon(task.due_date);
  const meta = loadMeta(task.id);

  return (
    <motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className={cn('relative rounded-xl border bg-card transition-all', overdue ? 'border-red-500/40' : dueSoon ? 'border-amber-500/30' : 'border-border')}>
      {/* Priority bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', pc.bar)} />
      <div className="pl-4 pr-3 pt-3 pb-2">
        <div className="flex items-start gap-3">
          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5', tc)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('font-semibold text-sm leading-snug', task.status==='completed' && 'line-through text-muted-foreground')}>{task.title}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={()=>onToggleStar(task.id)} className={cn('p-1 rounded', meta.starred ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400')}>
                  <Star className="w-3.5 h-3.5" fill={meta.starred?'currentColor':'none'}/>
                </button>
                <button onClick={()=>setExpanded(v=>!v)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
                </button>
              </div>
            </div>
            {task.description && !expanded && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', pc.badge)}>{pc.label}</span>
              <Select value={task.status} onValueChange={v => onStatusChange(task.id, v as TaskStatus)}>
                <SelectTrigger className="h-5 text-[10px] w-auto px-1.5 py-0 border-border bg-muted/30 gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {task.due_date && (
                <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-red-400' : dueSoon ? 'text-amber-400' : 'text-muted-foreground')}>
                  <Calendar className="w-3 h-3"/>{formatDate(task.due_date)}
                  {overdue && ' ⚠'}
                </span>
              )}
              {meta.recurring && <span className="text-[10px] text-cyan-400 flex items-center gap-0.5"><RotateCcw className="w-3 h-3"/>{meta.recur_interval ?? 'Recurring'}</span>}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
              <div className="pt-2 border-t border-border/50 mt-2 space-y-2">
                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                <SubtaskList taskId={task.id} />
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={()=>onEdit(task)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5"/>Edit</button>
                  <button onClick={()=>onDelete(task.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/>Delete</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const EMPTY_FORM = { title:'', description:'', task_type:'other' as TaskType, priority:'medium', due_date:'', status:'pending' as TaskStatus, recurring:false, recur_interval:'weekly', starred:false };

export default function TasksPage() {
  const [tasks, setTasks]       = useState<TaskWithSubs[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);
  const [statusFilter, setSF]   = useState('all');
  const [priorityFilter, setPF] = useState('all');
  const [typeFilter, setTF]     = useState('all');
  const [dueFilt, setDF]        = useState('all');
  const [showStarred, setShowStarred] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchTasks();
    setTasks((data ?? []) as unknown as TaskWithSubs[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };
  const openEdit = (t: TaskWithSubs) => {
    const meta = loadMeta(t.id);
    setForm({ title:t.title, description:t.description||'', task_type:t.task_type as TaskType, priority:t.priority||'medium', due_date:t.due_date||'', status:t.status ?? 'pending' as TaskStatus, recurring: meta.recurring??false, recur_interval: meta.recur_interval??'weekly', starred: meta.starred??false });
    setEditId(t.id); setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const payload = { title:form.title, description:form.description, task_type:form.task_type, priority:form.priority as Priority, due_date:form.due_date||undefined, status:form.status };
      if (editId) {
        await updateTask(editId, payload);
        saveMeta(editId, { recurring:form.recurring, recur_interval:form.recur_interval, starred:form.starred });
      } else {
        const { data } = await supabase.from('tasks').insert(payload).select().single();
        if (data) saveMeta(data.id, { recurring:form.recurring, recur_interval:form.recur_interval, starred:form.starred });
      }
      toast.success(editId ? 'Task updated' : 'Task created');
      setOpen(false); await load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const del = async (id: string) => { await deleteTask(id); setTasks(t=>t.filter(x=>x.id!==id)); toast.success('Deleted'); };

  const statusChange = async (id: string, status: TaskStatus) => {
    await updateTask(id, { status });
    setTasks(t=>t.map(x=>x.id===id?{...x,status}:x));
  };

  const toggleStar = (id: string) => {
    const meta = loadMeta(id); const starred = !meta.starred;
    saveMeta(id, { ...meta, starred });
    setTasks(t=>t.map(x=>x.id===id?{...x,starred}:x));
  };

  const now = new Date();
  let filtered = tasks.filter(t => {
    if (showStarred && !loadMeta(t.id).starred) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
    if (dueFilt === 'overdue' && !isOverdue(t.due_date, t.status)) return false;
    if (dueFilt === 'today') {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      if (d.toDateString() !== now.toDateString()) return false;
    }
    if (dueFilt === 'week') {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      if ((d.getTime()-now.getTime()) > 7*86400000 || d < now) return false;
    }
    return true;
  });

  const counts = { total: tasks.length, pending: tasks.filter(t=>t.status==='pending').length, in_progress: tasks.filter(t=>t.status==='in_progress').length, completed: tasks.filter(t=>t.status==='completed').length };
  const overdueCnt = tasks.filter(t=>isOverdue(t.due_date,t.status)).length;

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><CheckSquare className="w-5 h-5 text-primary"/>Tasks</h1>
            <p className="text-sm text-muted-foreground">{counts.pending} pending · {counts.in_progress} in progress · {counts.completed} done{overdueCnt>0 && ` · `}{overdueCnt>0 && <span className="text-red-400">{overdueCnt} overdue</span>}</p>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-3.5 h-3.5"/>New Task</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Total', val: counts.total, color:'text-foreground', bg:'bg-muted/30' },
            { label:'Pending', val: counts.pending, color:'text-yellow-400', bg:'bg-yellow-500/10' },
            { label:'In Progress', val: counts.in_progress, color:'text-blue-400', bg:'bg-blue-500/10' },
            { label:'Completed', val: counts.completed, color:'text-emerald-400', bg:'bg-emerald-500/10' },
          ].map(s=>(
            <Card key={s.label} className={cn('border-border', s.bg)}>
              <CardContent className="p-3 text-center">
                <p className={cn('text-2xl font-black tabular-nums', s.color)}>{s.val}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setSF}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPF}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Priority"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueFilt} onValueChange={setDF}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Due Date"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="week">Due This Week</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={()=>setShowStarred(v=>!v)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors', showStarred ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'border-border text-muted-foreground')}>
            <Star className="w-3.5 h-3.5" fill={showStarred?'currentColor':'none'}/>Starred
          </button>
          {(statusFilter!=='all'||priorityFilter!=='all'||dueFilt!=='all'||showStarred) && (
            <button onClick={()=>{setSF('all');setPF('all');setTF('all');setDF('all');setShowStarred(false);}} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <CheckSquare className="w-12 h-12 opacity-20"/>
            <p className="text-lg font-semibold">No tasks match filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t=>(
              <TaskCard key={t.id} task={t} onEdit={openEdit} onDelete={del} onStatusChange={statusChange} onToggleStar={toggleStar}/>
            ))}
          </div>
        )}
      </div>

      {/* New/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Task title…" className="mt-1"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Type</Label>
                <Select value={form.task_type} onValueChange={v=>setForm(f=>({...f,task_type:v as TaskType}))}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TASK_ICONS).map(k=><SelectItem key={k} value={k}>{k.replace(/_/g,' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v=>setForm(f=>({...f,priority:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as TaskStatus}))}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} className="mt-1"/></div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional details…" className="mt-1 min-h-[70px]"/></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="recurring" checked={form.recurring} onCheckedChange={v=>setForm(f=>({...f,recurring:!!v}))}/>
                <Label htmlFor="recurring" className="text-xs cursor-pointer flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5"/>Recurring</Label>
              </div>
              {form.recurring && (
                <Select value={form.recur_interval} onValueChange={v=>setForm(f=>({...f,recur_interval:v}))}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="starred" checked={form.starred} onCheckedChange={v=>setForm(f=>({...f,starred:!!v}))}/>
                <Label htmlFor="starred" className="text-xs cursor-pointer flex items-center gap-1"><Star className="w-3.5 h-3.5"/>Starred</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit} disabled={saving}>{saving?'Saving…':editId?'Update Task':'Create Task'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
