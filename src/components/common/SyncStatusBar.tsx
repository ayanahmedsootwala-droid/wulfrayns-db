// SyncStatusBar — shows online/offline/syncing state in the header area
import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/hooks/useOfflineSync';

interface Props {
  status: SyncStatus;
  pendingCount: number;
  lastSynced: Date | null;
}

export default function SyncStatusBar({ status, pendingCount, lastSynced }: Props) {
  if (status === 'online' && pendingCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
      status === 'offline' && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      status === 'syncing' && 'bg-primary/10 border-primary/30 text-primary',
      status === 'online' && pendingCount > 0 && 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    )}>
      {status === 'offline' && (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline{pendingCount > 0 ? ` — ${pendingCount} pending` : ''}</span>
        </>
      )}
      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…</span>
        </>
      )}
      {status === 'online' && pendingCount > 0 && (
        <>
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync</span>
        </>
      )}
      {lastSynced && status !== 'offline' && (
        <span className="opacity-60 ml-1">
          <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
          {lastSynced.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Compact dot indicator for header
export function SyncDot({ status }: { status: SyncStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      status === 'online' && 'bg-green-500/10 border-green-500/30 text-green-400',
      status === 'offline' && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      status === 'syncing' && 'bg-primary/10 border-primary/30 text-primary',
    )}>
      {status === 'syncing'
        ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        : status === 'offline'
          ? <WifiOff className="w-2.5 h-2.5" />
          : <Wifi className="w-2.5 h-2.5" />
      }
      {status}
    </span>
  );
}
