'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface SessionStatus {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline' | 'needs_reauth';
  lastActive: string | null;
  createdAt: string;
  uptimeDays: number;
}

interface OverallStatus {
  totalSessions: number;
  activeSessions: number;
  uptimePercent: number;
  events24h: number;
  lastChecked: string;
}

interface StatusData {
  overall: OverallStatus;
  sessions: SessionStatus[];
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  needs_reauth: 'bg-yellow-500',
};

const statusLabels: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  needs_reauth: 'Needs Re-auth',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to load status');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const overallColor = data
    ? data.overall.uptimePercent >= 90
      ? 'text-green-400'
      : data.overall.uptimePercent >= 50
        ? 'text-yellow-400'
        : 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold text-white mb-2">System Status</h1>
          <p className="text-gray-400">
            Real-time status of all BotWave bot sessions.
            {data && (
              <span className="ml-2 text-gray-500 text-sm">
                Last checked: {new Date(data.overall.lastChecked).toLocaleTimeString()}
              </span>
            )}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchStatus} className="mt-3 text-sm text-green-400 hover:underline">
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {/* Overall Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className={`text-3xl font-bold ${overallColor}`}>
                  {data.overall.uptimePercent}%
                </p>
                <p className="text-gray-400 text-sm mt-1">Overall Uptime</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-green-400">
                  {data.overall.activeSessions}
                </p>
                <p className="text-gray-400 text-sm mt-1">Sessions Online</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-white">
                  {data.overall.totalSessions}
                </p>
                <p className="text-gray-400 text-sm mt-1">Total Sessions</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-blue-400">
                  {data.overall.events24h}
                </p>
                <p className="text-gray-400 text-sm mt-1">Events (24h)</p>
              </div>
            </motion.div>

            {/* Auto-refresh toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Bot Sessions</h2>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="accent-green-500"
                />
                Auto-refresh (30s)
              </label>
            </div>

            {/* Session Cards */}
            <div className="space-y-3">
              {data.sessions.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                  <p className="text-gray-400">No bot sessions found.</p>
                  <Link
                    href="/dashboard/sessions"
                    className="text-green-400 hover:underline text-sm mt-2 inline-block"
                  >
                    Create your first session
                  </Link>
                </div>
              ) : (
                data.sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                          {session.status === 'online' ? '🟢' : session.status === 'needs_reauth' ? '🟡' : '⚫'}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] ${statusColors[session.status]}`}
                        />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{session.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right hidden sm:block">
                        <p className="text-gray-400">Last Active</p>
                        <p className="text-gray-300">{timeAgo(session.lastActive)}</p>
                      </div>
                      {session.status === 'online' && session.uptimeDays > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-gray-400">Uptime</p>
                          <p className="text-green-400">{session.uptimeDays}d</p>
                        </div>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === 'online'
                            ? 'bg-green-500/20 text-green-400'
                            : session.status === 'needs_reauth'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {statusLabels[session.status]}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 text-center text-gray-500 text-sm">
              <p>Powered by BotWave &middot; Status updates every 30 seconds</p>
              <Link href="/" className="text-green-400 hover:underline mt-1 inline-block">
                Back to Home
              </Link>
            </div>
          </>
        ) : null}

            <Footer />
      </main>
    </div>
  );
}
