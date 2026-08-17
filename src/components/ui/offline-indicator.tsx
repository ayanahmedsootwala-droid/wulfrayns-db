import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setShowBack(true); setTimeout(() => setShowBack(false), 3000); };
    const handleOffline = () => { setOnline(false); setShowBack(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  return (
    <AnimatePresence>
      {(!online || showBack) && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 text-xs font-medium ${
            online ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white'
          }`}
        >
          {online
            ? <><Wifi className="w-3.5 h-3.5" /> Back online — syncing…</>
            : <><WifiOff className="w-3.5 h-3.5" /> You&apos;re offline — changes will sync when reconnected</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  );
}
