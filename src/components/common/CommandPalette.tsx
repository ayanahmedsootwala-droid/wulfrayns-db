import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Car, Users, Building2, Clock, Zap, Plus,
  BarChart3, CheckSquare, Settings, QrCode,
  Sparkles, TrendingUp, BookOpen, FileUp, ScanLine
} from 'lucide-react';
import { globalSearch } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { Vehicle, Dealer, Dealership } from '@/types/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onQuickAdd?: () => void;
  onAICommand?: (query: string) => void;
  onAddDealership?: () => void;
  onUploadDocs?: () => void;
  onScanDoc?: () => void;
}

type Mode = 'search' | 'ai';

const QUICK_ACTIONS = [
  { label: 'Add Vehicle', icon: Plus, action: 'quickAdd', color: 'text-primary' },
  { label: 'Add Dealer', icon: Users, action: '/dealers/new', color: 'text-blue-400' },
  { label: 'Add Dealership', icon: Building2, action: 'addDealership', color: 'text-cyan-400' },
  { label: 'Upload Docs', icon: FileUp, action: 'uploadDocs', color: 'text-green-400' },
  { label: 'Scan Document', icon: ScanLine, action: 'scanDoc', color: 'text-purple-400' },
  { label: 'Inventory', icon: Car, action: '/inventory', color: 'text-green-400' },
  { label: 'Analytics', icon: BarChart3, action: '/analytics', color: 'text-purple-400' },
  { label: 'Tasks', icon: CheckSquare, action: '/tasks', color: 'text-orange-400' },
  { label: 'Compare Cars', icon: BookOpen, action: '/compare', color: 'text-yellow-400' },
  { label: 'Activity Log', icon: Clock, action: '/activity', color: 'text-muted-foreground' },
  { label: 'Settings', icon: Settings, action: '/settings', color: 'text-muted-foreground' },
];

const AI_EXAMPLES = [
  'Show all black Prados under 18 million',
  "Who has the cheapest Civic RS?",
  "Which dealer hasn't been contacted in 30 days?",
  'Show all SUVs with Android Panel',
  'Find Hybrids under 5 million',
  'Most expensive car in inventory',
];

export default function CommandPalette({ open, onClose, onQuickAdd, onAICommand, onAddDealership, onUploadDocs, onScanDoc }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('search');
  const [results, setResults] = useState<{ vehicles: Partial<Vehicle>[]; dealers: Partial<Dealer>[]; dealerships: Partial<Dealership>[] }>({ vehicles: [], dealers: [], dealerships: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const saved = localStorage.getItem('recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } else {
      setQuery('');
      setResults({ vehicles: [], dealers: [], dealerships: [] });
      setMode('search');
    }
  }, [open]);

  useEffect(() => {
    if (mode !== 'search' || !query.trim()) {
      setResults({ vehicles: [], dealers: [], dealerships: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(query);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mode]);

  const handleSelect = (path: string) => {
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
    }
    navigate(path);
    onClose();
  };

  const handleQuickAction = (action: string) => {
    if (action === 'quickAdd') { onQuickAdd?.(); onClose(); return; }
    if (action === 'addDealership') { onAddDealership?.(); onClose(); return; }
    if (action === 'uploadDocs') { onUploadDocs?.(); onClose(); return; }
    if (action === 'scanDoc') { onScanDoc?.(); onClose(); return; }
    navigate(action);
    onClose();
  };

  const handleAI = () => {
    if (!query.trim()) return;
    onAICommand?.(query);
    onClose();
  };

  const hasResults = results.vehicles.length > 0 || results.dealers.length > 0 || results.dealerships.length > 0;
  const isAI = mode === 'ai' || query.startsWith('>');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-x-4 top-[12%] z-50 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                {isAI ? <Sparkles className="w-4 h-4 text-purple-400 shrink-0" /> : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Enter' && isAI) handleAI();
                  }}
                  placeholder={isAI ? 'Ask AI anything about your inventory…' : 'Search vehicles, dealers, type > for AI…'}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setMode(m => m === 'ai' ? 'search' : 'ai')}
                    className={cn('px-2 py-0.5 rounded text-xs border transition-colors', mode === 'ai' ? 'border-purple-400/40 text-purple-400 bg-purple-400/10' : 'border-border text-muted-foreground hover:text-foreground')}
                  >
                    <Sparkles className="w-3 h-3 inline mr-0.5" />AI
                  </button>
                  <kbd className="text-[10px] bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded">Esc</kbd>
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {/* AI mode */}
                {isAI && (
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground px-1">Try these queries:</p>
                    {AI_EXAMPLES.map(ex => (
                      <button
                        key={ex}
                        onClick={() => { setQuery(ex); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-sm text-foreground">{ex}</span>
                      </button>
                    ))}
                    {query.trim() && (
                      <button
                        onClick={handleAI}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-400/10 border border-purple-400/20 hover:bg-purple-400/20 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-sm text-purple-400">Run: "{query}"</span>
                        <kbd className="ml-auto text-[10px] bg-purple-400/10 border border-purple-400/20 text-purple-400 px-1.5 py-0.5 rounded">Enter</kbd>
                      </button>
                    )}
                  </div>
                )}

                {/* Search results */}
                {!isAI && (
                  <>
                    {!query && (
                      <div className="p-3 space-y-1">
                        <p className="text-xs text-muted-foreground px-2 mb-2 font-medium">Quick Actions</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                          {QUICK_ACTIONS.map(a => (
                            <button
                              key={a.label}
                              onClick={() => handleQuickAction(a.action)}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted/40 transition-colors text-center"
                            >
                              <a.icon className={cn('w-5 h-5', a.color)} />
                              <span className="text-xs text-foreground">{a.label}</span>
                            </button>
                          ))}
                        </div>
                        {recentSearches.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground px-2 mb-1.5 font-medium">Recent</p>
                            {recentSearches.map(s => (
                              <button key={s} onClick={() => setQuery(s)} className="w-full flex items-center gap-2 px-3 py-1.5 rounded hover:bg-muted/30 transition-colors text-left">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{s}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {query && loading && (
                      <div className="p-6 text-center text-sm text-muted-foreground">Searching…</div>
                    )}
                    {query && !loading && !hasResults && (
                      <div className="p-6 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                        <button onClick={() => { setMode('ai'); }} className="text-xs text-purple-400 hover:underline flex items-center gap-1 mx-auto">
                          <Sparkles className="w-3 h-3" />Try AI search instead
                        </button>
                      </div>
                    )}
                    {results.vehicles.length > 0 && (
                      <div className="p-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1">Vehicles</p>
                        {results.vehicles.map(v => (
                          <button key={v.id} onClick={() => handleSelect(`/inventory/${v.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left">
                            <Car className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-foreground">{v.make} {v.model} {v.variant}</span>
                              <span className="text-xs text-muted-foreground ml-2">{v.color}</span>
                            </div>
                            <span className="text-xs text-primary shrink-0">{formatCurrency(v.expected_selling_price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.dealers.length > 0 && (
                      <div className="p-2 border-t border-border/40">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1">Dealers</p>
                        {results.dealers.map(d => (
                          <button key={d.id} onClick={() => handleSelect(`/dealers/${d.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left">
                            <Users className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-foreground">{d.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{d.city}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border/40 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded">Enter</kbd> select</span>
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded">Esc</kbd> close</span>
                <span className="ml-auto"><kbd className="bg-muted border border-border px-1 py-0.5 rounded">Ctrl K</kbd> toggle</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
