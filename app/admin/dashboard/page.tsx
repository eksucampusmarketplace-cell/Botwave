'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    totalMessages: 0,
    systemStatus: 'Healthy'
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const statsRes = await fetch('/api/admin/stats');
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }

        const sessRes = await fetch('/api/admin/sessions');
        const sessData = await sessRes.json();
        if (sessData.success) {
          setSessions(sessData.data);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleStopSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to stop this session?')) return;
    
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/stop`, { method: 'POST' });
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, state: 'inactive' } : s));
      }
    } catch (err) {
      alert('Failed to stop session');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="font-display text-2xl font-black tracking-widest text-red-600">
              BOTWAVE <span className="text-white">ADMIN CONTROL</span>
            </h1>
            <p className="text-zinc-500 font-mono text-xs mt-1">{"// SYSTEM OVERVIEW"}</p>
          </div>
          <Link href="/admin/login" className="text-zinc-400 hover:text-white font-mono text-xs border border-zinc-800 px-4 py-2 transition-colors">
            LOGOUT
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'TOTAL USERS', value: stats.totalUsers, color: 'text-blue-500' },
            { label: 'ACTIVE BOTS', value: stats.activeSessions, color: 'text-green-500' },
            { label: 'MSG PROCESSED', value: stats.totalMessages, color: 'text-purple-500' },
            { label: 'SYSTEM STATUS', value: stats.systemStatus, color: 'text-red-500' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-zinc-800 p-6"
            >
              <p className="text-zinc-500 font-mono text-[10px] tracking-[2px] mb-2">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="font-display font-bold tracking-wider">ALL BOT SESSIONS</h2>
            <button className="text-xs font-mono text-red-600 hover:text-red-500">REFRESH</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="p-6">SESSION ID</th>
                  <th className="p-6">USER</th>
                  <th className="p-6">PHONE</th>
                  <th className="p-6">STATUS</th>
                  <th className="p-6">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr key={session.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-6 text-zinc-400">{session.id.slice(0, 8)}...</td>
                    <td className="p-6">{session.username || 'Unknown'}</td>
                    <td className="p-6">{session.phone_number}</td>
                    <td className="p-6">
                      <span className={`px-2 py-1 ${
                        session.state === 'active' ? 'bg-green-500/10 text-green-500' : 
                        session.state === 'qr_pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {session.state.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => handleStopSession(session.id)}
                        className="text-red-600 hover:underline"
                      >
                        TERMINATE
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-600">NO ACTIVE SESSIONS FOUND</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
