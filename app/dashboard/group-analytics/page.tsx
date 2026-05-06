'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface AnalyticsData {
  topSenders: { jid: string; name: string; count: number }[];
  hourlyActivity: number[];
  dailyMessages: { date: string; count: number }[];
  totalMessages: number;
  totalGroups: number;
}

function BarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs w-24 truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
          <div className="flex-1 h-5 rounded-full" style={{ background: 'var(--bg)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
          <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-muted)' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function HourlyHeatmap({ hours }: { hours: number[] }) {
  const maxHour = Math.max(...hours, 1);
  return (
    <div className="grid grid-cols-12 gap-1">
      {hours.map((count, i) => {
        const intensity = count / maxHour;
        const bg = intensity === 0
          ? 'var(--surface)'
          : `rgba(16, 185, 129, ${0.15 + intensity * 0.7})`;
        return (
          <div
            key={i}
            className="aspect-square rounded-sm flex items-center justify-center text-[8px] font-mono"
            style={{ background: bg, color: intensity > 0.5 ? '#fff' : 'var(--text-muted)' }}
            title={`${i}:00 — ${count} messages`}
          >
            {i}
          </div>
        );
      })}
    </div>
  );
}

export default function GroupAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/group-analytics', { credentials: 'include' });
      const json = await res.json();
      if (res.status === 403) {
        setError(json.error || 'Upgrade required');
      } else if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load analytics');
      }
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Group Analytics
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Message activity, top senders, and engagement patterns
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading analytics...</div>
          ) : error ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">📊</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Group analytics is available on Standard plan and above.
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Messages', value: data.totalMessages.toLocaleString(), icon: '💬' },
                  { label: 'Groups Tracked', value: data.totalGroups.toString(), icon: '👥' },
                  { label: 'Top Senders', value: data.topSenders.length.toString(), icon: '🏆' },
                  { label: 'Days Tracked', value: data.dailyMessages.length.toString(), icon: '📅' },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl border text-center"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-2xl mb-1">{card.icon}</p>
                    <p className="text-xl font-bold text-emerald-400">{card.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Top senders */}
              <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Senders</h3>
                {data.topSenders.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No message data yet</p>
                ) : (
                  <BarChart
                    data={data.topSenders.map((s) => ({ label: s.name, value: s.count }))}
                    maxValue={data.topSenders[0]?.count || 1}
                  />
                )}
              </div>

              {/* Hourly activity */}
              <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Hourly Activity</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Darker = more messages at that hour</p>
                <HourlyHeatmap hours={data.hourlyActivity} />
              </div>

              {/* Daily trend */}
              <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Daily Messages (Last 30 Days)</h3>
                {data.dailyMessages.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet</p>
                ) : (
                  <div className="flex items-end gap-1 h-32">
                    {data.dailyMessages.map((d, i) => {
                      const maxDay = Math.max(...data.dailyMessages.map((dm) => dm.count), 1);
                      const height = (d.count / maxDay) * 100;
                      return (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.4, delay: i * 0.02 }}
                          className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 min-w-[3px]"
                          title={`${d.date}: ${d.count} messages`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </main>
  );
}
