'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

interface HealthEvent {
  id: string;
  session_id: string;
  event_type: string;
  details: string | null;
  created_at: string;
}

interface SessionUptime {
  sessionId: string;
  sessionName: string;
  state: string;
  isOnline: boolean;
  lastActive: string | null;
  createdAt: string;
}

interface HealthData {
  errors24h: number;
  reconnects24h: number;
  messagesDelivered24h: number;
  messagesFailed24h: number;
  webhookRetries: number;
  webhookDeadLetters: number;
  uptimeBySession: SessionUptime[];
  recentEvents: HealthEvent[];
}

const eventTypeLabels: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
  error: 'Error',
  message_sent: 'Msg Sent',
  message_failed: 'Msg Failed',
  webhook_retry: 'Webhook Retry',
  webhook_dead_letter: 'Dead Letter',
};

const eventTypeColors: Record<string, string> = {
  connected: 'text-green',
  disconnected: 'text-red-400',
  reconnecting: 'text-yellow-500',
  error: 'text-red-400',
  message_sent: 'text-green/60',
  message_failed: 'text-red-400/60',
  webhook_retry: 'text-yellow-500',
  webhook_dead_letter: 'text-red-400',
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('/api/bot/health');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to load health data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            BOT <span className="text-green">HEALTH</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Real-time monitoring &bull; Last 24 hours
          </p>
        </motion.div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="font-mono text-sm text-[#5a9a7a] animate-pulse tracking-[2px]">LOADING HEALTH DATA...</p>
          </div>
        ) : !data ? (
          <div className="p-8 text-center">
            <p className="font-mono text-sm text-[#5a9a7a]">Failed to load health data</p>
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'ERRORS', value: data.errors24h, color: data.errors24h > 0 ? 'text-red-400' : 'text-green' },
                { label: 'RECONNECTS', value: data.reconnects24h, color: data.reconnects24h > 5 ? 'text-yellow-500' : 'text-green' },
                { label: 'MSGS SENT', value: data.messagesDelivered24h, color: 'text-green' },
                { label: 'MSGS FAILED', value: data.messagesFailed24h, color: data.messagesFailed24h > 0 ? 'text-red-400' : 'text-green' },
                { label: 'RETRIES', value: data.webhookRetries, color: data.webhookRetries > 0 ? 'text-yellow-500' : 'text-green' },
                { label: 'DEAD LETTERS', value: data.webhookDeadLetters, color: data.webhookDeadLetters > 0 ? 'text-red-400' : 'text-green' },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="bg-card border border-green/10 p-4 relative"
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-green/30" />
                  <p className="font-mono text-[10px] text-[#5a9a7a] tracking-[2px] mb-1">{metric.label}</p>
                  <p className={`font-display text-2xl ${metric.color}`}>{metric.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Session Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-card border border-green/10 p-6 relative"
              >
                <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
                <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
                <h2 className="font-display text-sm tracking-[3px] text-green mb-4">SESSION STATUS</h2>

                {data.uptimeBySession.length === 0 ? (
                  <p className="font-mono text-xs text-[#3a6a5a]">No sessions found</p>
                ) : (
                  <div className="space-y-3">
                    {data.uptimeBySession.map(s => (
                      <div key={s.sessionId} className="flex items-center justify-between p-3 bg-dark/50 border border-green/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.isOnline ? 'bg-green' : 'bg-red-400'}`} />
                          <div>
                            <p className="font-mono text-xs text-white">{s.sessionName}</p>
                            <p className="font-mono text-[10px] text-[#3a6a5a]">
                              {s.lastActive ? `Last: ${new Date(s.lastActive).toLocaleString()}` : 'Never active'}
                            </p>
                          </div>
                        </div>
                        <span className={`font-mono text-[10px] tracking-[1px] px-2 py-0.5 border ${
                          s.isOnline ? 'text-green border-green/30' : 'text-red-400 border-red-400/30'
                        }`}>
                          {s.state.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Recent Events */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-card border border-green/10 p-6 relative"
              >
                <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
                <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
                <h2 className="font-display text-sm tracking-[3px] text-green mb-4">EVENT LOG</h2>

                {data.recentEvents.length === 0 ? (
                  <p className="font-mono text-xs text-[#3a6a5a]">No events in the last 24 hours</p>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {data.recentEvents.map(evt => (
                      <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-green/5 last:border-0">
                        <span className="font-mono text-[10px] text-[#3a6a5a] whitespace-nowrap mt-0.5">
                          {new Date(evt.created_at).toLocaleTimeString()}
                        </span>
                        <span className={`font-mono text-[10px] tracking-[1px] ${eventTypeColors[evt.event_type] || 'text-white'}`}>
                          {eventTypeLabels[evt.event_type] || evt.event_type}
                        </span>
                        {evt.details && (
                          <span className="font-mono text-[10px] text-[#5a9a7a] truncate flex-1">
                            {evt.details}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
