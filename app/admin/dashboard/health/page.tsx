'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  details?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  responseTimeMs: number;
  checks: Record<string, HealthCheck>;
  sessions: {
    total: number;
    active: number;
    needsReauth: number;
    stuck: number;
  };
  system: {
    cpuPercent: number;
    cpuCount: number;
    memPercent: number;
    memUsedMb: number;
    memTotalMb: number;
    uptimeSeconds: number;
    loadAvg: number[];
  };
  errorTracking: {
    window: string;
    totalCommands: number;
    failures: number;
    failureRate: string;
    avgDurationMs: number;
    topFailingCommands: { command: string; failures: number; total: number }[];
    recentErrors: { command: string; error: string; timestamp: string }[];
  };
  alerting: {
    emailConfigured: boolean;
    smtpHost: string;
  };
}

export default function HealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth, autoRefresh]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 border-green-500/30';
      case 'degraded': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'down': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time monitoring & error tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}
          >
            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
          </button>
          <button onClick={fetchHealth} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs text-white font-medium transition">
            Refresh Now
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {health && (
        <>
          {/* Overall Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-6 ${statusBg(health.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${health.status === 'healthy' ? 'bg-green-400 animate-pulse' : health.status === 'degraded' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${statusColor(health.status)}`}>
                    {health.status === 'healthy' ? 'All Systems Operational' : health.status === 'degraded' ? 'Performance Degraded' : 'System Down'}
                  </h2>
                  <p className="text-sm text-gray-400">Response: {health.responseTimeMs}ms • {new Date(health.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="text-lg font-mono text-white">{formatUptime(health.system.uptimeSeconds)}</p>
              </div>
            </div>
          </motion.div>

          {/* Component Checks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(health.checks).map(([name, check]) => (
              <div key={name} className={`rounded-xl border p-4 ${statusBg(check.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white capitalize">{name.replace('_', ' ')}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${check.status === 'healthy' ? 'bg-green-500/30 text-green-400' : check.status === 'degraded' ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>
                    {check.status}
                  </span>
                </div>
                <p className="text-2xl font-mono text-white">{check.latencyMs}ms</p>
                {check.details && <p className="text-xs text-gray-400 mt-1 truncate">{check.details}</p>}
              </div>
            ))}
          </div>

          {/* System & Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Resources */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">System Resources</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">CPU</span>
                    <span className={health.system.cpuPercent > 80 ? 'text-red-400' : 'text-white'}>{health.system.cpuPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${health.system.cpuPercent > 80 ? 'bg-red-500' : health.system.cpuPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(health.system.cpuPercent, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Memory</span>
                    <span className={health.system.memPercent > 85 ? 'text-red-400' : 'text-white'}>{health.system.memUsedMb}MB / {health.system.memTotalMb}MB ({health.system.memPercent}%)</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${health.system.memPercent > 85 ? 'bg-red-500' : health.system.memPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(health.system.memPercent, 100)}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Load Average</span>
                  <span className="text-white font-mono">{health.system.loadAvg.join(' / ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">CPU Cores</span>
                  <span className="text-white">{health.system.cpuCount}</span>
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Session Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{health.sessions.total}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{health.sessions.active}</p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{health.sessions.needsReauth}</p>
                  <p className="text-xs text-gray-400">Needs Re-auth</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${health.sessions.stuck > 0 ? 'bg-red-500/10' : 'bg-gray-700/50'}`}>
                  <p className={`text-2xl font-bold ${health.sessions.stuck > 0 ? 'text-red-400' : 'text-white'}`}>{health.sessions.stuck}</p>
                  <p className="text-xs text-gray-400">Stuck</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Tracking */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Command Error Tracking ({health.errorTracking.window} window)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{health.errorTracking.totalCommands}</p>
                <p className="text-xs text-gray-400">Total Commands</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${health.errorTracking.failures > 0 ? 'text-red-400' : 'text-green-400'}`}>{health.errorTracking.failures}</p>
                <p className="text-xs text-gray-400">Failures</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${parseFloat(health.errorTracking.failureRate) > 10 ? 'text-red-400' : 'text-white'}`}>{health.errorTracking.failureRate}</p>
                <p className="text-xs text-gray-400">Failure Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{health.errorTracking.avgDurationMs}ms</p>
                <p className="text-xs text-gray-400">Avg Duration</p>
              </div>
            </div>

            {health.errorTracking.topFailingCommands.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Top Failing Commands</h4>
                <div className="space-y-2">
                  {health.errorTracking.topFailingCommands.map(cmd => (
                    <div key={cmd.command} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                      <span className="text-sm text-white font-mono">!{cmd.command}</span>
                      <span className="text-sm text-red-400">{cmd.failures}/{cmd.total} failed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health.errorTracking.recentErrors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Recent Errors</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {health.errorTracking.recentErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-red-500/10 rounded px-2 py-1.5">
                      <span className="text-red-400 font-mono shrink-0">!{err.command}</span>
                      <span className="text-gray-400 truncate">{err.error}</span>
                      <span className="text-gray-500 shrink-0 ml-auto">{new Date(err.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerting Status */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Email Alerting</h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health.alerting.emailConfigured ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span className="text-sm text-white">
                {health.alerting.emailConfigured
                  ? `Configured — SMTP: ${health.alerting.smtpHost}`
                  : 'Not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS, ALERT_EMAIL in .env'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
