'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  activeSessions: number;
  totalSessions: number;
  needsReauthSessions: number;
  totalMessages: number;
  totalCommands: number;
  systemStatus: string;
  evolutionStatus: string;
}

interface Session {
  id: string;
  phone_number: string;
  session_name: string;
  state: string;
  last_active: string | null;
  created_at: string;
  username: string;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, activeSessions: 0, totalSessions: 0, needsReauthSessions: 0,
    totalMessages: 0, totalCommands: 0, systemStatus: 'Loading', evolutionStatus: 'Unknown',
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, sessRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/sessions'),
      ]);

      if (statsRes.status === 401) { router.push('/admin/login'); return; }

      const [statsData, sessData] = await Promise.all([
        statsRes.json(), sessRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (sessData.success) setSessions(sessData.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStopSession = async (sessionId: string) => {
    if (!confirm('Stop this session?')) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/stop`, { method: 'POST' });
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, state: 'inactive' } : s));
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: 'TOTAL USERS', value: stats.totalUsers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'ACTIVE BOTS', value: stats.activeSessions, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'TOTAL SESSIONS', value: stats.totalSessions, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'NEEDS REAUTH', value: stats.needsReauthSessions, color: stats.needsReauthSessions > 0 ? 'text-yellow-400' : 'text-gray-500', bg: stats.needsReauthSessions > 0 ? 'bg-yellow-500/10' : 'bg-white/5' },
    { label: 'MESSAGES', value: stats.totalMessages.toLocaleString(), color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'COMMANDS', value: stats.totalCommands.toLocaleString(), color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'SYSTEM', value: stats.systemStatus, color: stats.systemStatus === 'Healthy' ? 'text-green-400' : 'text-yellow-400', bg: stats.systemStatus === 'Healthy' ? 'bg-green-500/10' : 'bg-yellow-500/10' },
    { label: 'EVOLUTION', value: stats.evolutionStatus, color: stats.evolutionStatus === 'Connected' ? 'text-green-400' : 'text-red-400', bg: stats.evolutionStatus === 'Connected' ? 'bg-green-500/10' : 'bg-red-500/10' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">Real-time system metrics &middot; auto-refreshes every 30s</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`${stat.bg} border border-white/5 rounded-xl p-4`}
          >
            <p className="text-gray-400 text-[10px] font-mono tracking-wider mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Deploy', href: '/admin/dashboard/deployment', icon: '🚀' },
          { label: 'Broadcast', href: '/admin/dashboard/broadcast', icon: '📣' },
          { label: 'View Logs', href: '/admin/dashboard/logs', icon: '📜' },
          { label: 'Manage Users', href: '/admin/dashboard/users', icon: '👥' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors text-center"
          >
            <span className="text-2xl block mb-1">{action.icon}</span>
            <span className="text-gray-300 text-sm">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-semibold">Bot Sessions</h2>
          <span className="text-xs text-gray-500 font-mono">{sessions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">SESSION</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">PHONE</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">OWNER</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">STATUS</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">LAST ACTIVE</th>
                <th className="text-right text-gray-400 text-xs font-mono px-4 py-3">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 20).map(session => (
                <tr key={session.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white">{session.session_name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{session.phone_number}</td>
                  <td className="px-4 py-3 text-gray-400">{session.username || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                      session.state === 'active' ? 'bg-green-500/20 text-green-400' :
                      session.state === 'needs_reauth' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        session.state === 'active' ? 'bg-green-400' :
                        session.state === 'needs_reauth' ? 'bg-yellow-400' : 'bg-gray-400'
                      }`} />
                      {session.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {session.state === 'active' && (
                      <button
                        onClick={() => handleStopSession(session.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-mono"
                      >
                        STOP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No sessions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
