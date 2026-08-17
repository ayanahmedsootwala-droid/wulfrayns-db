import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Car, Users, Building2, CheckSquare, BarChart3,
  Activity, Settings, Search, Bell, Menu, ChevronRight,
  Zap, LogOut, Plus, MessageSquare, Download,
  Sparkles, FileText, Calculator, Ship, DollarSign, Share2,
  TrendingUp, Wallet, ScanLine, Warehouse, Anchor, BookOpen,
  ClipboardList, Terminal, Code2, Grid3x3, StickyNote, Bot,
  ClipboardPaste, RefreshCw, Monitor, Library, Handshake, Globe, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CommandPalette from '@/components/common/CommandPalette';
import AICommandBar from '@/components/ai/AICommandBar';
import NotificationCenter, { useNotifCount } from '@/components/common/NotificationCenter';
import QuickAddVehicle from '@/components/vehicle/QuickAddVehicle';
import OfflineIndicator from '@/components/ui/offline-indicator';
import SyncStatusBar from '@/components/common/SyncStatusBar';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type NavItem = { path: string; label: string; icon: LucideIcon; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { path: '/ai-sync', label: 'AI Chatbot', icon: Bot, badge: '🤖' },
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/command-center', label: 'Command Center', icon: Terminal, badge: 'v2' },
      { path: '/inventory', label: 'Inventory', icon: Car },
    ],
  },
  {
    label: 'Sales',
    items: [
      { path: '/leads', label: 'Leads & CRM', icon: Users },
      { path: '/quotations', label: 'Quotations', icon: FileText },
      { path: '/inquiries', label: 'Inquiries', icon: MessageSquare },
      { path: '/compare', label: 'Compare Cars', icon: TrendingUp },
    ],
  },
  {
    label: 'Import',
    items: [
      { path: '/import-calculator', label: 'Import Calculator', icon: Calculator },
      { path: '/customs-duty-chart', label: 'Duty Chart', icon: Grid3x3 },
      { path: '/auction-guide', label: 'Auction Guide', icon: Anchor },
      { path: '/shipments', label: 'Shipments', icon: Ship },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { path: '/marketing', label: 'Marketing', icon: Share2 },
      { path: '/social-media', label: 'Social Media', icon: Sparkles },
      { path: '/notes', label: 'WhatsApp Notes', icon: ClipboardList },
      { path: '/scratchpad', label: 'Scratchpad', icon: StickyNote },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/invoices', label: 'Invoicing', icon: FileText },
      { path: '/finance', label: 'Finance Plans', icon: Wallet },
      { path: '/expenses', label: 'Expenses', icon: DollarSign },
      { path: '/transactions', label: 'Transaction Book', icon: BookOpen },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/image-gallery', label: 'Image Gallery', icon: Warehouse },
      { path: '/documents', label: 'Doc Assistant', icon: ScanLine },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { path: '/bulk-create', label: 'Bulk Create', icon: ClipboardPaste, badge: 'New' },
      { path: '/live-sync', label: 'Live Sync', icon: RefreshCw },
      { path: '/live-display', label: 'Live Display', icon: Monitor, badge: 'New' },
      { path: '/ai-integration-guide', label: 'Integration Guide', icon: BookOpen, badge: 'New' },
      { path: '/car-library', label: 'Car Knowledge Library', icon: Library, badge: 'New' },
      { path: '/referrals', label: 'Partner Referrals', icon: Handshake, badge: 'New' },
      { path: '/import-guide', label: 'Import Cars Guide', icon: Globe, badge: 'New' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/dealers', label: 'Dealers', icon: Building2 },
      { path: '/dealerships', label: 'Dealerships', icon: Warehouse },
      { path: '/parties', label: 'Parties', icon: Users },
      { path: '/developer-api', label: 'Developer API', icon: Code2 },
      { path: '/tasks', label: 'Tasks', icon: CheckSquare },
      { path: '/activity', label: 'Activity Log', icon: Activity },
      { path: '/source-download', label: 'Source Code', icon: Download },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const unreadCount = useNotifCount();
  const { status: syncStatus, pendingCount, lastSynced } = useOfflineSync();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <OfflineIndicator />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent location={location} onNavigate={() => {}} onSignOut={signOut} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeSidebar}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-sidebar border-r border-sidebar-border lg:hidden flex flex-col"
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <SidebarContent location={location} onNavigate={closeSidebar} onSignOut={signOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 px-3 md:px-4 py-2.5 bg-background/90 backdrop-blur border-b border-border">
          <Button
            variant="ghost" size="icon"
            className="lg:hidden shrink-0 w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <span className="lg:hidden text-sm font-bold text-primary truncate mr-1">Wulfrayn\'s DB</span>

          <div className="flex-1 min-w-0">
            <button
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border text-sm text-muted-foreground hover:bg-muted transition-colors w-full max-w-sm text-left"
              onClick={() => setCmdOpen(true)}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate hidden sm:inline">AI command or search — try "show available stock"</span>
              <span className="flex-1 truncate sm:hidden">AI Command…</span>
              <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-muted rounded border border-border font-mono shrink-0">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <SyncStatusBar status={syncStatus} pendingCount={pendingCount} lastSynced={lastSynced} />
            <Button
              variant="ghost" size="icon"
              className={cn('w-8 h-8 relative transition-colors', notifOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setNotifOpen(v => !v)}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
              R
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              className="flex flex-col items-end gap-2 mb-1"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            >
              {[
                { label: 'Quick Add Vehicle', icon: Zap, action: 'quickAdd' },
                { label: 'Command Center', icon: Terminal, path: '/command-center' },
                { label: 'Add Lead', icon: Users, path: '/leads?new=1' },
                { label: 'New Quotation', icon: FileText, path: '/quotations?new=1' },
                { label: 'Import Calculator', icon: Calculator, path: '/import-calculator' },
                { label: 'Auction Guide', icon: Anchor, path: '/auction-guide' },
                { label: 'Marketing', icon: Share2, path: '/marketing' },
              ].map((item) => (
                <motion.button
                  key={item.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-colors shadow-card"
                  onClick={() => {
                    if (item.action === 'quickAdd') { setQuickAddOpen(true); setFabOpen(false); }
                    else if (item.path) { navigate(item.path); setFabOpen(false); }
                  }}
                  whileHover={{ x: -2 }}
                >
                  <item.icon className="w-4 h-4 text-primary" />
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          onClick={() => setFabOpen(v => !v)}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: fabOpen ? 45 : 0 }}
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <AICommandBar
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
      />
      <QuickAddVehicle
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(id) => navigate(`/inventory/${id}`)}
      />
    </div>
  );
}

function SidebarContent({
  location, onNavigate, onSignOut,
}: {
  location: ReturnType<typeof useLocation>;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 gold-glow">
          <span className="text-xs font-black text-primary-foreground">RPM</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sidebar-accent-foreground truncate">Wulfrayn\'s DB</p>
          <p className="text-[10px] text-sidebar-foreground truncate uppercase tracking-wider">AI Sales Copilot</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground px-3 mb-1 opacity-60">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors group min-h-[34px]',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-sidebar-foreground group-hover:text-primary')} />
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        {item.badge}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3 h-3 shrink-0 text-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">R</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">Manager</p>
            <div className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-sidebar-foreground truncate">AI Powered</span>
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}


