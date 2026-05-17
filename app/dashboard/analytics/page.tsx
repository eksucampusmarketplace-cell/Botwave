'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

interface DayData { date: string; count: number }
interface TypeData { type: string; count: number }
interface CommandData { command: string; count: number }
interface GroupData { jid: string; name: string; count: number }
interface HourData { hour: number; label: string; count: number }

interface AnalyticsData {
  messagesByDay: DayData[];
  messagesByType: TypeData[];
  commandBreakdown: CommandData[];
  topGroups: GroupData[];
  peakHours: HourData[];
}

const typeLabels: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  sticker: 'Sticker',
  document: 'Document',
};

const typeColors: Record<string, string> = {
  text: '#00ff88',
  image: '#00d4ff',
  video: '#ff6b6b',
  audio: '#ffd93d',
  sticker: '#c084fc',
  document: '#fb923c',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
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
        const res = await fetch('/api/bot/analytics');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxDayCount = data ? Math.max(...data.messagesByDay.map(d => d.count), 1) : 1;
  const maxHourCount = data ? Math.max(...data.peakHours.map(h => h.count), 1) : 1;
  const totalMessages = data ? data.messagesByType.reduce((sum, t) => sum + t.count, 0) : 0;

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
            ANALYTICS <span className="text-blue-600 dark:text-blue-400">DASHBOARD</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Last 30 days of bot activity
          </p>
        </motion.div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="font-mono text-sm text-[#5a9a7a] animate-pulse tracking-[2px]">LOADING ANALYTICS...</p>
          </div>
        ) : !data ? (
          <div className="p-8 text-center">
            <p className="font-mono text-sm text-[#5a9a7a]">Failed to load analytics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Volume Chart */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-card border border-blue-500/10 p-6 relative lg:col-span-2"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-blue-500/30" />
              <h2 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">MESSAGE VOLUME (30 DAYS)</h2>
              {data.messagesByDay.length === 0 ? (
                <p className="font-mono text-xs text-[#3a6a5a]">No message data yet</p>
              ) : (
                <div className="flex items-end gap-[2px] h-40 overflow-x-auto">
                  {data.messagesByDay.map((d) => (
                    <div key={d.date} className="flex flex-col items-center flex-shrink-0 group" style={{ minWidth: '12px' }}>
                      <div
                        className="w-2.5 bg-blue-500/80 hover:bg-blue-500 transition-colors rounded-t-sm"
                        style={{ height: `${Math.max((d.count / maxDayCount) * 140, 2)}px` }}
                        title={`${d.date}: ${d.count} messages`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[9px] text-[#3a6a5a]">
                  {data.messagesByDay[0]?.date || ''}
                </span>
                <span className="font-mono text-[9px] text-[#3a6a5a]">
                  {data.messagesByDay[data.messagesByDay.length - 1]?.date || ''}
                </span>
              </div>
            </motion.section>

            {/* Message Types Breakdown */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-card border border-blue-500/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-blue-500/30" />
              <h2 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">MESSAGE TYPES</h2>
              <div className="space-y-3">
                {data.messagesByType.map((t) => {
                  const pct = totalMessages > 0 ? ((t.count / totalMessages) * 100).toFixed(1) : '0';
                  return (
                    <div key={t.type}>
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-xs text-white">{typeLabels[t.type] || t.type}</span>
                        <span className="font-mono text-[10px] text-[#5a9a7a]">{t.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-dark/50 overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${totalMessages > 0 ? (t.count / totalMessages) * 100 : 0}%`,
                            backgroundColor: typeColors[t.type] || '#00ff88',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.messagesByType.length === 0 && (
                  <p className="font-mono text-xs text-[#3a6a5a]">No data yet</p>
                )}
              </div>
            </motion.section>

            {/* Peak Hours */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card border border-blue-500/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-blue-500/30" />
              <h2 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">PEAK HOURS</h2>
              <div className="flex items-end gap-[3px] h-32">
                {data.peakHours.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-blue-400/60 hover:bg-blue-400 transition-colors rounded-t-sm"
                      style={{ height: `${Math.max((h.count / maxHourCount) * 110, 1)}px` }}
                      title={`${h.label}: ${h.count} messages`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[9px] text-[#3a6a5a]">00:00</span>
                <span className="font-mono text-[9px] text-[#3a6a5a]">06:00</span>
                <span className="font-mono text-[9px] text-[#3a6a5a]">12:00</span>
                <span className="font-mono text-[9px] text-[#3a6a5a]">18:00</span>
                <span className="font-mono text-[9px] text-[#3a6a5a]">23:00</span>
              </div>
            </motion.section>

            {/* Command Breakdown */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-card border border-blue-500/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-blue-500/30" />
              <h2 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">TOP COMMANDS</h2>
              <div className="space-y-2">
                {data.commandBreakdown.map((cmd, i) => (
                  <div key={cmd.command} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#3a6a5a] w-4">{i + 1}.</span>
                    <span className="font-mono text-xs text-blue-500 dark:text-blue-400 flex-1">{cmd.command}</span>
                    <span className="font-mono text-xs text-white">{cmd.count}</span>
                  </div>
                ))}
                {data.commandBreakdown.length === 0 && (
                  <p className="font-mono text-xs text-[#3a6a5a]">No commands recorded yet</p>
                )}
              </div>
            </motion.section>

            {/* Top Groups */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-card border border-blue-500/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-blue-500/30" />
              <h2 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">MOST ACTIVE GROUPS</h2>
              <div className="space-y-2">
                {data.topGroups.map((g, i) => (
                  <div key={g.jid} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#3a6a5a] w-4">{i + 1}.</span>
                    <span className="font-mono text-xs text-white flex-1 truncate">{g.name}</span>
                    <span className="font-mono text-xs text-[#5a9a7a]">{g.count} msgs</span>
                  </div>
                ))}
                {data.topGroups.length === 0 && (
                  <p className="font-mono text-xs text-[#3a6a5a]">No group activity yet</p>
                )}
              </div>
            </motion.section>
          </div>
        )}
      </div>
    </main>
  );
}
