'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface RedisData {
  available: boolean;
  error?: string;
  version?: string;
  role?: string;
  uptimeSeconds?: number;
  memory?: {
    usedMb: number;
    peakMb: number;
    maxMb: number | null;
    percent: number | null;
    evictionPolicy: string;
  };
  connections?: {
    current: number;
    blocked: number;
    totalReceived: number;
  };
  stats?: {
    totalCommands: number;
    opsPerSec: number;
    hitRatePercent: number | null;
    evictedKeys: number;
    expiredKeys: number;
  };
  keyspace?: {
    totalKeys: number;
    byPrefix: Record<string, number>;
  };
}

interface ScalingStatus {
  mode: string;
  activeWorkers: number;
  maxWorkers: number;
  totalSessions: number;
  scaleThreshold: number;
  syncCycleDurationMs: number;
  lastScaleEvent: string | null;
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function InfrastructurePage() {
  const router = useRouter();
  const [redis, setRedis] = useState<RedisData | null>(null);
  const [scaling, setScaling] = useState<ScalingStatus | null>(null);
  const [scalingError, setScalingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const redisRes = await fetch('/api/admin/redis');
      if (redisRes.status === 401) { router.push('/admin/login'); return; }
      const redisData = await redisRes.json();
      if (redisData.success) setRedis(redisData.data);

      try {
        const scalingRes = await fetch('/api/admin/scaling/status');
        if (scalingRes.ok) {
          const scalingJson = await scalingRes.json();
          if (scalingJson.success) {
            setScaling(scalingJson.data);
            setScalingError(null);
          } else {
            setScalingError(scalingJson.error || 'Auto-scaler endpoint not available');
          }
        } else {
          setScalingError('Auto-scaler endpoint not available');
        }
      } catch {
        setScalingError('Auto-scaler not deployed yet');
      }
    } catch (err) {
      console.error('Error fetching infrastructure data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Infrastructure</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">Redis monitoring &middot; Auto-scaler status &middot; auto-refreshes every 10s</p>
      </div>

      {/* ── Redis Section ─────────────────────────────── */}
      <h2 className="text-lg font-bold text-white mb-3">Redis</h2>

      {redis && !redis.available && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-mono text-sm">Redis unavailable: {redis.error}</p>
        </div>
      )}

      {redis?.available && (
        <>
          {/* Redis Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">STATUS</p>
              <p className="text-lg font-bold text-green-400">Connected</p>
              <p className="text-gray-500 text-[10px] mt-1">v{redis.version} &middot; {redis.role}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="bg-blue-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">UPTIME</p>
              <p className="text-lg font-bold text-blue-400">{formatUptime(redis.uptimeSeconds || 0)}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-purple-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">OPS/SEC</p>
              <p className="text-lg font-bold text-purple-400">{redis.stats?.opsPerSec || 0}</p>
              <p className="text-gray-500 text-[10px] mt-1">{formatNumber(redis.stats?.totalCommands || 0)} total</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-cyan-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">TOTAL KEYS</p>
              <p className="text-lg font-bold text-cyan-400">{redis.keyspace?.totalKeys || 0}</p>
            </motion.div>
          </div>

          {/* Memory + Connections + Hit Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs font-mono">MEMORY</span>
                <span className={`text-sm font-bold ${(redis.memory?.percent ?? 0) > 80 ? 'text-red-400' : (redis.memory?.percent ?? 0) > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {redis.memory?.usedMb}MB{redis.memory?.maxMb ? ` / ${redis.memory.maxMb}MB` : ''}
                </span>
              </div>
              {redis.memory?.maxMb && redis.memory.percent !== null && (
                <ProgressBar
                  value={redis.memory.usedMb}
                  max={redis.memory.maxMb}
                  color={redis.memory.percent > 80 ? 'bg-red-500' : redis.memory.percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}
                />
              )}
              <p className="text-gray-500 text-[10px] mt-2">Peak: {redis.memory?.peakMb}MB &middot; Policy: {redis.memory?.evictionPolicy}</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs font-mono">CONNECTIONS</span>
                <span className="text-sm font-bold text-blue-400">{redis.connections?.current}</span>
              </div>
              <p className="text-gray-500 text-[10px] mt-2">Blocked: {redis.connections?.blocked} &middot; Lifetime: {formatNumber(redis.connections?.totalReceived || 0)}</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs font-mono">HIT RATE</span>
                <span className={`text-sm font-bold ${(redis.stats?.hitRatePercent ?? 0) > 80 ? 'text-green-400' : (redis.stats?.hitRatePercent ?? 0) > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {redis.stats?.hitRatePercent !== null ? `${redis.stats?.hitRatePercent}%` : 'N/A'}
                </span>
              </div>
              <p className="text-gray-500 text-[10px] mt-2">Evicted: {formatNumber(redis.stats?.evictedKeys || 0)} &middot; Expired: {formatNumber(redis.stats?.expiredKeys || 0)}</p>
            </div>
          </div>

          {/* Key Distribution */}
          {redis.keyspace && Object.keys(redis.keyspace.byPrefix).length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
              <h3 className="text-gray-400 text-xs font-mono mb-3">KEY DISTRIBUTION</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(redis.keyspace.byPrefix).sort((a, b) => b[1] - a[1]).map(([prefix, count]) => (
                  <div key={prefix} className="bg-white/5 rounded-lg p-2">
                    <p className="text-white text-xs font-mono font-bold">{prefix}</p>
                    <p className="text-gray-400 text-lg font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Auto-Scaler Status Section ─────────────────── */}
      <h2 className="text-lg font-bold text-white mb-3 mt-8">Auto-Scaler</h2>

      {scalingError && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <div>
              <p className="text-gray-400 text-sm font-medium">{scalingError}</p>
              <p className="text-gray-500 text-xs mt-1">The bot container may be restarting or the auto-scaler endpoint is unreachable</p>
            </div>
          </div>
        </div>
      )}

      {scaling && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border border-white/5 rounded-xl p-4 ${scaling.mode === 'standalone' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">MODE</p>
              <p className={`text-lg font-bold ${scaling.mode === 'standalone' ? 'text-blue-400' : 'text-green-400'}`}>
                {scaling.mode === 'standalone' ? 'Standalone' : 'Scaled'}
              </p>
              <p className="text-gray-500 text-[10px] mt-1">
                {scaling.mode === 'standalone' ? 'Main thread handles all' : 'Workers active'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="bg-purple-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">WORKER THREADS</p>
              <p className="text-lg font-bold text-purple-400">{scaling.activeWorkers} / {scaling.maxWorkers}</p>
              <p className="text-gray-500 text-[10px] mt-1">Active / Max capacity</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-cyan-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">SESSIONS</p>
              <p className="text-lg font-bold text-cyan-400">{scaling.totalSessions}</p>
              <p className="text-gray-500 text-[10px] mt-1">Scale at {scaling.scaleThreshold}+</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-yellow-500/10 border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">SYNC CYCLE</p>
              <p className="text-lg font-bold text-yellow-400">{scaling.syncCycleDurationMs}ms</p>
              <p className="text-gray-500 text-[10px] mt-1">Last cycle duration</p>
            </motion.div>
          </div>

          {scaling.lastScaleEvent && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs font-mono">LAST SCALE EVENT</span>
                <span className="text-white text-xs">{new Date(scaling.lastScaleEvent).toLocaleString()}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
