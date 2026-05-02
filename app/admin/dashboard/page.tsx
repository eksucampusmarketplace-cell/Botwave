'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RateLimitSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  window_ms: number;
  max_requests: number;
  enabled: boolean;
  description: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    totalMessages: 0,
    systemStatus: 'Healthy'
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'settings' | 'health'>('sessions');
  const [rateLimits, setRateLimits] = useState<RateLimitSetting[]>([]);
  const [savingRateLimits, setSavingRateLimits] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [fetchingHealth, setFetchingHealth] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchRateLimits();
    } else if (activeTab === 'health') {
      fetchHealthData();
    }
  }, [activeTab]);

  const fetchHealthData = async () => {
    setFetchingHealth(true);
    try {
      const res = await fetch('/api/admin/db-setup');
      const data = await res.json();
      if (data.success) {
        setHealthData(data.data);
      }
    } catch (err) {
      console.error('Error fetching health data:', err);
    } finally {
      setFetchingHealth(false);
    }
  };

  const fetchRateLimits = async () => {
    try {
      const res = await fetch('/api/admin/rate-limits');
      const data = await res.json();
      if (data.success) {
        setRateLimits(data.data);
      }
    } catch (err) {
      console.error('Error fetching rate limits:', err);
    }
  };

  const handleSaveRateLimits = async () => {
    setSavingRateLimits(true);
    try {
      const res = await fetch('/api/admin/rate-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: rateLimits }),
      });
      if (res.ok) {
        alert('Rate limit settings saved successfully');
      }
    } catch (err) {
      alert('Failed to save rate limit settings');
    } finally {
      setSavingRateLimits(false);
    }
  };

  const updateRateLimit = (key: string, field: string, value: number | boolean) => {
    setRateLimits(prev =>
      prev.map(s => s.setting_key === key ? { ...s, [field]: value } : s)
    );
  };

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
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`font-display text-xs tracking-wider px-4 py-2 transition-colors ${
                  activeTab === 'sessions' ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-500 hover:text-white'
                }`}
              >
                BOT SESSIONS
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`font-display text-xs tracking-wider px-4 py-2 transition-colors ${
                  activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-500 hover:text-white'
                }`}
              >
                RATE LIMITS
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`font-display text-xs tracking-wider px-4 py-2 transition-colors ${
                  activeTab === 'health' ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-500 hover:text-white'
                }`}
              >
                SYSTEM HEALTH
              </button>
            </div>
            {activeTab === 'sessions' && (
              <button className="text-xs font-mono text-red-600 hover:text-red-500">REFRESH</button>
            )}
          </div>

          {activeTab === 'sessions' && (
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
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <p className="text-zinc-500 font-mono text-xs mb-6">{"// Configure rate limits for the application. Set to 0 for unlimited."}</p>
              <div className="space-y-4">
                {rateLimits.map((setting) => (
                  <div key={setting.id} className="bg-zinc-800/50 border border-zinc-700 p-4 flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <p className="font-mono text-sm text-white">{setting.setting_name.toUpperCase()}</p>
                      <p className="font-mono text-xs text-zinc-500">{setting.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="font-mono text-xs text-zinc-400">ENABLED</label>
                        <button
                          onClick={() => updateRateLimit(setting.setting_key, 'enabled', !setting.enabled)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            setting.enabled ? 'bg-green-500' : 'bg-zinc-600'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            setting.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="font-mono text-xs text-zinc-400">MAX/INTERVAL</label>
                        <input
                          type="number"
                          value={setting.max_requests}
                          onChange={(e) => updateRateLimit(setting.setting_key, 'max_requests', parseInt(e.target.value) || 0)}
                          className="w-20 bg-black border border-zinc-600 px-2 py-1 text-white font-mono text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveRateLimits}
                  disabled={savingRateLimits}
                  className="font-display text-xs tracking-wider px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {savingRateLimits ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="p-6">
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Database Connection & Schema</h3>
                <p className="text-zinc-500 font-mono text-xs mb-6">{"// Verifying that all required tables exist in your Supabase project."}</p>
                
                {fetchingHealth ? (
                  <p className="text-zinc-500 font-mono text-xs">Checking system health...</p>
                ) : healthData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(healthData.tables).map(([table, exists]: [any, any]) => (
                      <div key={table} className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-800">
                        <span className="font-mono text-xs">{table}</span>
                        {exists ? (
                          <span className="text-green-500 text-[10px] font-bold">READY</span>
                        ) : (
                          <span className="text-red-500 text-[10px] font-bold">MISSING</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-500 font-mono text-xs">Failed to fetch health data</p>
                )}
              </div>

              {!fetchingHealth && healthData && !healthData.allFound && (
                <div className="mt-8 p-6 bg-red-950/20 border border-red-900/50">
                  <h3 className="text-red-500 font-bold mb-2">Required Tables Missing!</h3>
                  <p className="text-zinc-400 font-mono text-xs mb-4">
                    Some core tables are missing from your database. To fix this, copy the SQL below and run it in your Supabase SQL Editor.
                  </p>
                  <div className="relative">
                    <pre className="bg-black p-4 text-[10px] font-mono text-zinc-400 overflow-auto max-h-60 border border-zinc-800">
                      {healthData.schemaSql}
                    </pre>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(healthData.schemaSql);
                        alert('SQL copied to clipboard!');
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono transition-colors"
                    >
                      COPY SQL
                    </button>
                  </div>
                </div>
              )}

              {!fetchingHealth && healthData && healthData.allFound && (
                <div className="mt-8 p-6 bg-green-950/10 border border-green-900/30">
                  <h3 className="text-green-500 font-bold mb-2">All Systems Green</h3>
                  <p className="text-zinc-400 font-mono text-xs">
                    The database schema is correctly initialized. All required tables were found.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
