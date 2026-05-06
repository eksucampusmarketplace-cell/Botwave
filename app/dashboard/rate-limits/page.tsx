'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface RateLimitData {
  plan: string;
  quotaLimit: number;
  quotaUsed: number;
  monthlyMessagesUsed: number;
  monthlyMessagesLimit: number;
  sessionLimit: number;
  activeSessions: number;
  aiDailyLimit: number;
  aiUsedToday: number;
  warmupDay: number;
  dailyMessageCap: number;
  messagesThisMinute: number;
  minuteRateLimit: number;
}

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 300,
  lite: 2000,
  standard: 10000,
  boss: -1,
};

function ProgressBar({ value, max, label, color = 'emerald', subtitle }: { value: number; max: number; label: string; color?: string; subtitle?: string }) {
  const percentage = max === -1 ? 10 : Math.min((value / max) * 100, 100);
  const isUnlimited = max === -1;
  const isWarning = !isUnlimited && percentage > 80;
  const isDanger = !isUnlimited && percentage > 95;

  const barColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : `bg-${color}-500`;

  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          {subtitle && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        <span className="text-xs font-mono" style={{ color: isWarning ? '#f59e0b' : 'var(--text-muted)' }}>
          {isUnlimited ? `${value} / Unlimited` : `${value.toLocaleString()} / ${max.toLocaleString()}`}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--bg)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isUnlimited ? 10 : percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      {!isUnlimited && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{Math.round(percentage)}% used</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isUnlimited ? 'No limit' : `${(max - value).toLocaleString()} remaining`}</span>
        </div>
      )}
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
        const plan = sub.plan || 'free';
        const monthlyLimit = PLAN_MONTHLY_LIMITS[plan] ?? 300;
        setData({
          plan,
          quotaLimit: sub.quota_limit || monthlyLimit,
          quotaUsed: sub.quota_used || 0,
          monthlyMessagesUsed: sub.quota_used || 0,
          monthlyMessagesLimit: monthlyLimit,
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Rate Limits & Usage
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Monitor your usage, WhatsApp rate limits, and plan quotas in realtime
              </p>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-emerald-500/30"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : !data ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Failed to load data</div>
          ) : (
            <div className="space-y-6">
              {/* Plan badge */}
              <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Plan</span>
                  <h2 className="text-lg font-bold text-emerald-400 capitalize">{data.plan}</h2>
                </div>
                <div className="flex gap-6">
                  {data.warmupDay > 0 && data.warmupDay <= 7 && (
                    <div className="text-right">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Warmup Progress</span>
                      <p className="text-sm font-mono text-cyan-400">Day {data.warmupDay} / 7</p>
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-refreshes</span>
                    <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>every 30s</p>
                  </div>
                </div>
              </div>

              {/* Monthly quota - prominent */}
              <ProgressBar
                value={data.monthlyMessagesUsed}
                max={data.monthlyMessagesLimit}
                label="Monthly Messages"
                subtitle={`Your ${data.plan} plan includes ${data.monthlyMessagesLimit === -1 ? 'unlimited' : data.monthlyMessagesLimit.toLocaleString()} messages per month`}
              />

              {/* Other usage gauges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProgressBar
                  value={data.activeSessions}
                  max={data.sessionLimit}
                  label="Active Sessions"
                  subtitle="WhatsApp connections"
                  color="cyan"
                />
                <ProgressBar
                  value={data.aiUsedToday}
                  max={data.aiDailyLimit}
                  label="AI Queries Today"
                  subtitle="Resets daily at midnight"
                  color="violet"
                />
                <ProgressBar
                  value={data.messagesThisMinute}
                  max={data.minuteRateLimit}
                  label="Messages/Minute"
                  subtitle="Realtime rate limiter"
                  color="amber"
                />
                <ProgressBar
                  value={0}
                  max={data.dailyMessageCap}
                  label="Daily Message Cap"
                  subtitle={`Anti-ban warmup limit: ${data.dailyMessageCap}/day`}
                />
              </div>

              {/* Anti-ban info cards */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Anti-Ban Protection (Active)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <p className="text-xs mb-1 font-medium text-emerald-400">Anti-spam</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>5 msgs in 10 sec triggers warning</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Protects you from WhatsApp rate limits</p>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <p className="text-xs mb-1 font-medium text-cyan-400">Read and skip</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>15% skip chance in groups</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Bot reads but does not reply (looks human)</p>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <p className="text-xs mb-1 font-medium text-violet-400">Quiet hours</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>12am to 6am (slower responses)</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Simulates natural human sleep patterns</p>
                  </div>
                </div>
              </div>

              {/* Upgrade prompt for free users */}
              {data.plan === 'free' && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                  <p className="text-sm font-medium text-emerald-400">Need more messages?</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Upgrade to Lite (2,000/month), Standard (10,000/month), or Boss (unlimited)
                  </p>
                  <a href="/dashboard/pricing" className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
                    View Plans
                  </a>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
