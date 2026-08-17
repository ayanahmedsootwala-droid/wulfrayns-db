/* NotificationCenter — real-time style alert panel */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, X, CheckCheck, Clock, AlertTriangle, TrendingUp,
  MessageSquare, DollarSign, CheckSquare, Info, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export type NotifType = 'info' | 'warning' | 'success' | 'lead' | 'task' | 'aging' | 'price' | 'deal';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: Date;
  read: boolean;
  link?: string;
}

const NOTIF_ICONS: Record<NotifType, React.ElementType> = {
  info: Info, warning: AlertTriangle, success: CheckCheck,
  lead: MessageSquare, task: CheckSquare, aging: Clock,
  price: TrendingUp, deal: DollarSign,
};
const NOTIF_COLOR: Record<NotifType, string> = {
  info: 'text-blue-400 bg-blue-400/10',
  warning: 'text-orange-400 bg-orange-400/10',
  success: 'text-green-400 bg-green-400/10',
  lead: 'text-cyan-400 bg-cyan-400/10',
  task: 'text-purple-400 bg-purple-400/10',
  aging: 'text-orange-400 bg-orange-400/10',
  price: 'text-primary bg-primary/10',
  deal: 'text-green-400 bg-green-400/10',
};

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function seedNotifications(): Notification[] {
  try {
    const saved = localStorage.getItem('rpm_notifications');
    if (saved) return JSON.parse(saved).map((n: Notification) => ({ ...n, time: new Date(n.time) }));
  } catch { /* */ }
  const now = Date.now();
  return [
    { id: '1', type: 'aging', title: '3 Vehicles Aging 60+ Days', body: 'Toyota Prado, BMW X5, Honda CR-V — consider price review or promotion.', time: new Date(now - 3600000), read: false, link: '/inventory' },
    { id: '2', type: 'lead', title: 'New Lead: Ahmed Khan', body: 'Interested in hatchback under PKR 2M. Last contact: never.', time: new Date(now - 7200000), read: false, link: '/leads' },
    { id: '3', type: 'deal', title: '🎉 Deal Closed — Honda City', body: 'Sold for PKR 4.5M. Estimated profit: PKR 280,000.', time: new Date(now - 86400000), read: true },
    { id: '4', type: 'task', title: 'Task Due Tomorrow', body: 'Follow up with Karachi dealership — token confirmation pending.', time: new Date(now - 172800000), read: true, link: '/tasks' },
    { id: '5', type: 'price', title: 'Market Price Alert', body: 'Toyota Yaris prices up 3% this week — review your listings.', time: new Date(now - 259200000), read: false },
    { id: '6', type: 'info', title: 'System Sync Complete', body: '147 vehicles updated from external sources.', time: new Date(now - 432000000), read: true },
  ];
}

interface Props { open: boolean; onClose: () => void; }

export default function NotificationCenter({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const save = useCallback((notifs: Notification[]) => {
    setNotifications(notifs);
    localStorage.setItem('rpm_notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('rpm_notif_change'));
  }, []);

  const markRead = (id: string) => save(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => save(notifications.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => save(notifications.filter(n => n.id !== id));
  const clearAll = () => save([]);

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.link) { navigate(n.link); onClose(); }
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const visible = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unread = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="fixed top-14 right-3 md:right-4 z-50 w-[360px] max-w-[calc(100vw-1.5rem)]"
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.14 }}
          >
            <div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground flex-1">Notifications</span>
                {unread > 0 && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">{unread} new</Badge>}
                {unread > 0 && (
                  <button onClick={markAllRead} title="Mark all read" className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} title="Clear all" className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Filter */}
              <div className="flex gap-1 px-3 pt-2 pb-1">
                {(['all', 'unread'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                      filter === f ? 'bg-primary/15 text-primary border border-primary/25' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                    {f === 'unread' ? `Unread (${unread})` : 'All'}
                  </button>
                ))}
              </div>
              {/* Items */}
              <div className="max-h-[68vh] overflow-y-auto divide-y divide-border/40">
                {visible.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{filter === 'unread' ? 'All caught up! ✓' : 'No notifications'}</p>
                  </div>
                ) : visible.map(n => {
                  const Icon = NOTIF_ICONS[n.type];
                  const [iconCls, bgCls] = NOTIF_COLOR[n.type].split(' ');
                  return (
                    <motion.div key={n.id} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                      className={cn('flex items-start gap-3 px-4 py-3 group cursor-pointer transition-colors', n.read ? 'hover:bg-muted/20' : 'bg-primary/3 hover:bg-primary/6')}
                      onClick={() => handleClick(n)}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', bgCls)}>
                        <Icon className={cn('w-4 h-4', iconCls)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn('text-xs font-semibold flex-1 truncate', n.read ? 'text-foreground/80' : 'text-foreground')}>{n.title}</p>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.time)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
              {/* Footer */}
              <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{notifications.length} total</span>
                <button onClick={() => { navigate('/activity'); onClose(); }} className="text-xs text-primary hover:underline">View activity log →</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useNotifCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const saved = localStorage.getItem('rpm_notifications');
        setCount(saved ? JSON.parse(saved).filter((n: Notification) => !n.read).length : 3);
      } catch { setCount(0); }
    };
    update();
    window.addEventListener('rpm_notif_change', update);
    return () => window.removeEventListener('rpm_notif_change', update);
  }, []);
  return count;
}
