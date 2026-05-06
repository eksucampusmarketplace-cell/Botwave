'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface DisconnectedSession {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

export default function QrAlertBanner() {
  const [disconnected, setDisconnected] = useState<DisconnectedSession[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/qr-alerts', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data.disconnected?.length > 0) {
        setDisconnected(data.data.disconnected);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [check]);

  if (dismissed || disconnected.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-[60px] left-0 right-0 z-[998] bg-red-500/10 border-b border-red-500/20 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">&#x26A0;&#xFE0F;</span>
            <div>
              <p className="text-sm font-medium text-red-400">
                {disconnected.length} session{disconnected.length > 1 ? 's' : ''} disconnected
              </p>
              <p className="text-xs text-red-400/70">
                {disconnected.map((s) => s.name || s.id).join(', ')} &mdash; scan QR to reconnect
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/sessions"
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium"
            >
              Reconnect
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs px-2 py-1 text-red-400/50 hover:text-red-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
