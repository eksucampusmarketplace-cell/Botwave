

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

const ALERT_STORAGE_KEY = 'botwave_dismissed_alerts';

export default function SessionAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const checkSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/sessions');
      const data = await res.json();
      if (!data.success) return;

      const newAlerts: Alert[] = [];
      const sessions = data.data || [];

      for (const session of sessions) {
        if (session.state === 'needs_reauth') {
          newAlerts.push({
            id: `reauth-${session.id}`,
            type: 'error',
            title: `${session.session_name} DISCONNECTED`,
            message: 'Bot session needs re-authentication. Open Sessions to reconnect.',
            timestamp: Date.now(),
          });
        } else if (session.state === 'inactive') {
          newAlerts.push({
            id: `inactive-${session.id}`,
            type: 'warning',
            title: `${session.session_name} INACTIVE`,
            message: 'Session is inactive. Click Connect to bring it back online.',
            timestamp: Date.now(),
          });
        }
      }

      setAlerts(newAlerts);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    // Load dismissed alerts
    try {
      const stored = localStorage.getItem(ALERT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { ids: string[]; exp: number };
        if (parsed.exp > Date.now()) {
          setDismissed(new Set(parsed.ids));
        } else {
          localStorage.removeItem(ALERT_STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }

    checkSessions();
    const interval = setInterval(checkSessions, 30000);
    return () => clearInterval(interval);
  }, [checkSessions]);

  const dismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);

    // Store dismissals for 1 hour
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify({
      ids: Array.from(newDismissed),
      exp: Date.now() + 3600000,
    }));
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[900] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`bg-[var(--card-bg,var(--surface))] border p-4 rounded-xl shadow-lg relative ${
              alert.type === 'error' ? 'border-red-300 dark:border-red-400/30' :
              alert.type === 'warning' ? 'border-yellow-300 dark:border-yellow-400/30' :
              'border-blue-300 dark:border-blue-400/30'
            }`}
          >
            <button
              onClick={() => dismiss(alert.id)}
              className="absolute top-2 right-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              X
            </button>
            <div className="flex items-start gap-3 pr-6">
              <span className="text-lg">
                {alert.type === 'error' ? '🔴' : alert.type === 'warning' ? '🟡' : '🟢'}
              </span>
              <div>
                <p className={`text-sm font-bold ${
                  alert.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  alert.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {alert.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {alert.message}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
