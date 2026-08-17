// Offline sync hook — registers service worker, tracks connectivity,
// queues writes to IndexedDB, flushes on reconnect.
import { useState, useEffect, useCallback, useRef } from 'react';

export type SyncStatus = 'online' | 'offline' | 'syncing';

export interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  payload: unknown;
  timestamp: number;
}

const DB_NAME = 'rpm-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

// ── IndexedDB helpers ────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueAction(action: PendingAction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(): Promise<PendingAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingAction[]);
    req.onerror = () => reject(req.error);
  });
}

async function clearAction(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  // Refresh pending count from IndexedDB
  const refreshCount = useCallback(async () => {
    try {
      const items = await getAllQueued();
      setPendingCount(items.length);
    } catch {
      // IndexedDB not available (SSR / private browsing)
    }
  }, []);

  // Flush queue — called when coming back online
  const flushQueue = useCallback(async () => {
    const items = await getAllQueued();
    if (items.length === 0) return;
    setStatus('syncing');
    for (const action of items) {
      try {
        // Dynamic import to avoid circular deps — api.ts handles actual writes
        const { supabase } = await import('@/db/supabase');
        if (action.type === 'create') {
          await supabase.from(action.table).insert(action.payload as object);
        } else if (action.type === 'update') {
          const { id, ...rest } = action.payload as { id: string; [k: string]: unknown };
          await supabase.from(action.table).update(rest).eq('id', id);
        } else if (action.type === 'delete') {
          await supabase.from(action.table).delete().eq('id', (action.payload as { id: string }).id);
        }
        await clearAction(action.id);
      } catch {
        // Leave in queue to retry next time
      }
    }
    setLastSynced(new Date());
    await refreshCount();
    setStatus('online');
  }, [refreshCount]);

  flushRef.current = flushQueue;

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently — app still works
      });
      // Listen for sync messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_START') flushRef.current?.();
      });
    }
  }, []);

  // Track online/offline
  useEffect(() => {
    const goOnline = () => {
      setStatus('online');
      flushRef.current?.();
    };
    const goOffline = () => setStatus('offline');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    refreshCount();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [refreshCount]);

  // Enqueue a write for when back online
  const enqueue = useCallback(async (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const full: PendingAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    await queueAction(full);
    await refreshCount();
  }, [refreshCount]);

  return { status, pendingCount, lastSynced, enqueue, flushQueue };
}
