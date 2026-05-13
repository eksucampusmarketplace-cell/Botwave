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

interface WorkerInfo {
  name: string;
  status: string;
  state: string;
}

interface ScalingConfig {
  currentWorkers: number;
  maxWorkers: number;
  sessionsPerWorker: number;
  recommendedWorkers: number;
  totalActiveSessions: number;
}

interface WorkersData {
  workers: WorkerInfo[];
  scaling: ScalingConfig;
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
  const [workers, setWorkers] = useState<WorkersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaling, setScaling] = useState(false);
  const [targetWorkers, setTargetWorkers] = useState(3);

  const fetchData = useCallback(async () => {
    try {
      const [redisRes, workersRes] = await Promise.all([
        fetch('/api/admin/redis'),
        fetch('/api/admin/workers'),
      ]);

      if (redisRes.status === 401) { router.push('/admin/login'); return; }

      const [redisData, workersData] = await Promise.all([
        redisRes.json(),
        workersRes.json(),
      ]);

      if (redisData.success) setRedis(redisData.data);
      if (workersData.success) {
        setWorkers(workersData.data);
        setTargetWorkers(workersData.data.scaling.currentWorkers);
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

  const handleScale = async () => {
    setScaling(true);
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scale', targetCount: targetWorkers }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Scale error:', err);
    } finally {
      setScaling(false);
    }
  };

  const handleRestart = async (workerName: string) => {
    try {
      await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', workerName }),
      });
      await fetchData();
    } catch (err) {
      console.error('Restart error:', err);
    }
  };

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
        <p className="text-gray-500 text-sm mt-1 font-mono">Redis monitoring &middot; Worker scaling &middot; auto-refreshes every 10s</p>
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

      {/* ── Workers Section ─────────────────────────── */}
      <h2 className="text-lg font-bold text-white mb-3 mt-8">Workers</h2>

      {workers && (
        <>
          {/* Scaling Recommendation */}
          <div className={`border rounded-xl p-4 mb-4 ${
            workers.scaling.recommendedWorkers > workers.scaling.currentWorkers
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : workers.scaling.recommendedWorkers < workers.scaling.currentWorkers
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-green-500/10 border-green-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-bold">
                  {workers.scaling.currentWorkers} worker{workers.scaling.currentWorkers !== 1 ? 's' : ''} running
                  &middot; {workers.scaling.totalActiveSessions} active sessions
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {workers.scaling.sessionsPerWorker} sessions/worker capacity &middot;
                  Recommended: {workers.scaling.recommendedWorkers} worker{workers.scaling.recommendedWorkers !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={targetWorkers}
                  onChange={e => setTargetWorkers(parseInt(e.target.value))}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono"
                >
                  {Array.from({ length: workers.scaling.maxWorkers }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} worker{n !== 1 ? 's' : ''}</option>
                  ))}
                </select>
                <button
                  onClick={handleScale}
                  disabled={scaling || targetWorkers === workers.scaling.currentWorkers}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors"
                >
                  {scaling ? 'Scaling...' : 'Scale'}
                </button>
              </div>
            </div>
          </div>

          {/* Worker List */}
          <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">CONTAINER</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">STATUS</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">STATE</th>
                  <th className="text-right text-gray-400 text-xs font-mono px-4 py-3">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {workers.workers.map((w, i) => (
                  <tr key={w.name} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="px-4 py-3 text-white font-mono text-xs">{w.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{w.status}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-mono ${
                        w.state === 'running' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.state === 'running' ? 'bg-green-400' : 'bg-red-400'}`} />
                        {w.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestart(w.name)}
                        className="text-gray-400 hover:text-white text-xs font-mono transition-colors"
                      >
                        Restart
                      </button>
                    </td>
                  </tr>
                ))}
                {workers.workers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">No workers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
