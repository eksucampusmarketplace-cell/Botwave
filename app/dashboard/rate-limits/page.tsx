'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface RateLimitData {
  plan: string;
  quotaLimit: number;
  quotaUsed: number;
  sessionLimit: number;
  activeSessions: number;
  aiDailyLimit: number;
  aiUsedToday: number;
  warmupDay: number;
  dailyMessageCap: number;
  messagesThisMinute: number;
  minuteRateLimit: number;
}

function ProgressBar({ value, max, label, color = 'emerald' }: { value: number; max: number; label: string; color?: string }) {
  const percentage = max === -1 ? 10 : Math.min((value / max) * 100, 100);
  const isUnlimited = max === -1;
  const isWarning = !isUnlimited && percentage > 80;
  const isDanger = !isUnlimited && percentage > 95;

  const barColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : `bg-${color}-500`;

  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: isWarning ? '#f59e0b' : 'var(--text-muted)' }}>
          {isUnlimited ? `${value} / Unlimited` : `${value} / ${max}`}
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isUnlimited ? 10 : percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      {isWarning && !isDanger && (
        <p className="text-[10px] mt-1 text-yellow-500">Approaching limit</p>
      )}
      {isDanger && (
        <p className="text-[10px] mt-1 text-red-400">Near capacity. Consider upgrading.</p>
      )}
    </div>
  );
}

export default function RateLimitsPage() {
  const [data, setData] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/subscription', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        const sub = json.subscription;
        setData({
          plan: sub.plan || 'free',
          quotaLimit: sub.quota_limit || 300,
          quotaUsed: sub.quota_used || 0,
          sessionLimit: sub.session_limit || 1,
          activeSessions: sub.active_sessions || 0,
          aiDailyLimit: sub.ai_daily_limit || 10,
          aiUsedToday: sub.ai_used_today || 0,
          warmupDay: sub.warmup_day || 1,
          dailyMessageCap: sub.warmup_day
            ? Math.min(15 + (sub.warmup_day - 1) * 27, 200)
            : 200,
          messagesThisMinute: sub.messages_this_minute || 0,
          minuteRateLimit: 10,
        });
      }
    } catch (err) {
      console.error('Failed to fetch rate limits:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Rate Limits
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Monitor your usage and WhatsApp rate limits in realtime
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : !data ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Failed to load data</div>
          ) : (
            <div className="space-y-4">
              {/* Plan badge */}
              <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Plan</span>
                  <h2 className="text-lg font-bold text-emerald-400 capitalize">{data.plan}</h2>
                </div>
                {data.warmupDay > 0 && data.warmupDay <= 7 && (
                  <div className="text-right">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Warmup Progress</span>
                    <p className="text-sm font-mono text-cyan-400">Day {data.warmupDay} / 7</p>
                  </div>
                )}
              </div>

              {/* Usage gauges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProgressBar
                  value={data.quotaUsed}
                  max={data.quotaLimit}
                  label="Monthly Messages"
                />
                <ProgressBar
                  value={data.activeSessions}
                  max={data.sessionLimit}
                  label="Active Sessions"
                  color="cyan"
                />
                <ProgressBar
                  value={data.aiUsedToday}
                  max={data.aiDailyLimit}
                  label="AI Queries Today"
                  color="violet"
                />
                <ProgressBar
                  value={data.messagesThisMinute}
                  max={data.minuteRateLimit}
                  label="Messages/Minute"
                  color="amber"
                />
              </div>

              {/* Daily cap */}
              <ProgressBar
                value={0}
                max={data.dailyMessageCap}
                label={`Daily Message Cap (Warmup: ${data.dailyMessageCap}/day)`}
              />

              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Anti-spam</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>5 msgs / 10 sec triggers warning</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Read and skip</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>15% chance in groups</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Quiet hours</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>12am - 6am (slower responses)</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
