'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DeploymentTab from '@/components/admin/DeploymentTab';

interface RateLimitSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  window_ms: number;
  max_requests: number;
  enabled: boolean;
  description: string;
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

interface UserData {
  id: string;
  username: string;
  created_at: string;
  signup_source: string;
  signup_referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  last_login_at: string | null;
  login_count: number;
  totalSessions: number;
  activeSessions: number;
  enabledFeatures: number;
  lastActive: string | null;
  sessions: Array<{
    id: string;
    phone_number: string;
    session_name: string;
    state: string;
    last_active: string | null;
  }>;
}

interface AcquisitionData {
  totalUsers: number;
  sourceCounts: Record<string, number>;
  last30Days: Array<{ date: string; total: number; sources: Record<string, number> }>;
}

interface SecurityData {
  loginAttempts: Array<{
    timestamp: number;
    ip: string;
    username: string;
    success: boolean;
  }>;
  auditLog: Array<{
    timestamp: number;
    admin: string;
    action: string;
    target: string;
    details: string;
    ip: string;
  }>;
  security: Record<string, string>;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  username: string;
  last_message: { message: string; sender_type: string; created_at: string } | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  message: string;
  created_at: string;
}

type TabType = 'sessions' | 'users' | 'settings' | 'security' | 'health' | 'monetization' | 'support' | 'deployment';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    totalSessions: 0,
    needsReauthSessions: 0,
    totalMessages: 0,
    totalCommands: 0,
    systemStatus: 'Loading',
    evolutionStatus: 'Unknown',
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [rateLimits, setRateLimits] = useState<RateLimitSetting[]>([]);
  const [savingRateLimits, setSavingRateLimits] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [fetchingHealth, setFetchingHealth] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [monetizationData, setMonetizationData] = useState<any>(null);
  const [fetchingMonetization, setFetchingMonetization] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [acquisitionData, setAcquisitionData] = useState<AcquisitionData | null>(null);
  const [fetchingSecurity, setFetchingSecurity] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportStats, setSupportStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [supportFilter, setSupportFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [quickReplies] = useState([
    'Thanks for reaching out! We\'re looking into this now.',
    'This issue has been resolved. Please let us know if you need further help.',
    'Could you provide more details about the issue?',
    'We\'ve escalated this to our technical team. We\'ll update you shortly.',
    'This is a known issue and we\'re working on a fix. Stay tuned!',
  ]);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const statsRes = await fetch('/api/admin/stats');
        
        if (statsRes.status === 401) {
          router.push('/admin/login');
          return;
        }
        
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
    // Auto-refresh stats every 30s
    const interval = setInterval(fetchAdminData, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchRateLimits();
    } else if (activeTab === 'health') {
      fetchHealthData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'security') {
      fetchSecurityData();
    } else if (activeTab === 'monetization') {
      fetchMonetizationData();
    } else if (activeTab === 'support') {
      fetchSupportTickets();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/users?acquisition=true');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        if (data.acquisition) setAcquisitionData(data.acquisition);
      } else {
        setFetchError(data.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setFetchError('Network error loading users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const fetchSecurityData = async () => {
    setFetchingSecurity(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/security');
      const data = await res.json();
      if (data.success) {
        setSecurityData(data.data);
      } else {
        setFetchError(data.error || 'Failed to load security data');
      }
    } catch (err) {
      console.error('Error fetching security data:', err);
      setFetchError('Network error loading security data');
    } finally {
      setFetchingSecurity(false);
    }
  };

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

  const fetchMonetizationData = async () => {
    setFetchingMonetization(true);
    try {
      const res = await fetch('/api/admin/monetization');
      const data = await res.json();
      if (data.success) {
        setMonetizationData(data);
      }
    } catch (err) {
      console.error('Error fetching monetization data:', err);
    } finally {
      setFetchingMonetization(false);
    }
  };

  const fetchSupportTickets = async (filter?: string) => {
    setSupportLoading(true);
    try {
      const status = filter || supportFilter;
      const res = await fetch(`/api/admin/support?status=${status}`);
      const data = await res.json();
      if (data.success) {
        setSupportTickets(data.data);
        if (data.stats) setSupportStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setSupportLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/support?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicketMessages(data.data.messages);
        setSelectedTicket(data.data.ticket);
      }
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    }
  };

  const handleAdminReply = async () => {
    if (!adminReply.trim() || !selectedTicket || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket.id, message: adminReply.trim() }),
      });
      if (res.ok) {
        setAdminReply('');
        await fetchTicketMessages(selectedTicket.id);
        setMessage({ type: 'success', text: 'Reply sent' });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send reply' });
    } finally {
      setSendingReply(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status }),
      });
      fetchSupportTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
      setMessage({ type: 'success', text: `Ticket marked as ${status}` });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update ticket' });
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    try {
      await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, priority }),
      });
      fetchSupportTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update priority' });
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
        setMessage({ type: 'success', text: 'Rate limit settings saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save rate limit settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save rate limit settings' });
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
        setMessage({ type: 'success', text: 'Session terminated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to stop session' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to stop session' });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/admin/login');
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : 'Never';

  const tabs: { id: TabType; label: string }[] = [
    { id: 'sessions', label: 'BOT SESSIONS' },
    { id: 'users', label: 'USERS' },
    { id: 'settings', label: 'RATE LIMITS' },
    { id: 'security', label: 'SECURITY' },
    { id: 'health', label: 'SYSTEM HEALTH' },
    { id: 'monetization', label: 'MONETIZATION' },
    { id: 'support', label: `SUPPORT${supportStats.open > 0 ? ` (${supportStats.open})` : ''}` },
    { id: 'deployment', label: 'DEPLOYMENT' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 sm:mb-12">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-black tracking-widest text-red-600">
              BOTWAVE <span className="text-white">ADMIN</span>
            </h1>
            <p className="text-zinc-500 font-mono text-xs mt-1">{"// SYSTEM OVERVIEW"}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white font-mono text-xs border border-zinc-800 px-4 py-2 transition-colors"
          >
            LOGOUT
          </button>
        </header>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 border ${
              message.type === 'success' 
                ? 'bg-green-950/30 border-green-900 text-green-400' 
                : 'bg-red-950/30 border-red-900 text-red-400'
            } font-mono text-sm`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {[
            { label: 'TOTAL USERS', value: stats.totalUsers, color: 'text-blue-500' },
            { label: 'ACTIVE BOTS', value: stats.activeSessions, color: 'text-green-500' },
            { label: 'TOTAL SESSIONS', value: stats.totalSessions, color: 'text-cyan-500' },
            { label: 'NEEDS REAUTH', value: stats.needsReauthSessions, color: stats.needsReauthSessions > 0 ? 'text-yellow-500' : 'text-zinc-500' },
            { label: 'MSG PROCESSED', value: stats.totalMessages.toLocaleString(), color: 'text-purple-500' },
            { label: 'COMMANDS RUN', value: stats.totalCommands.toLocaleString(), color: 'text-indigo-500' },
            { label: 'SYSTEM STATUS', value: stats.systemStatus, color: stats.systemStatus === 'Healthy' ? 'text-green-500' : stats.systemStatus === 'Degraded' ? 'text-yellow-500' : 'text-red-500' },
            { label: 'EVOLUTION API', value: stats.evolutionStatus, color: stats.evolutionStatus === 'Connected' ? 'text-green-500' : 'text-red-500' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900 border border-zinc-800 p-4 sm:p-6"
            >
              <p className="text-zinc-500 font-mono text-[9px] sm:text-[10px] tracking-[2px] mb-2">{stat.label}</p>
              <p className={`text-lg sm:text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-zinc-900 border border-zinc-800">
          <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-wrap gap-2 sm:gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-1 sm:gap-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-display text-[10px] sm:text-xs tracking-wider px-2 sm:px-4 py-2 transition-colors ${
                    activeTab === tab.id ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button 
              onClick={() => {
                if (activeTab === 'sessions') window.location.reload();
                else if (activeTab === 'users') fetchUsers();
                else if (activeTab === 'settings') fetchRateLimits();
                else if (activeTab === 'security') fetchSecurityData();
                else if (activeTab === 'health') fetchHealthData();
                else if (activeTab === 'monetization') fetchMonetizationData();
                else if (activeTab === 'support') fetchSupportTickets();
              }}
              className="text-xs font-mono text-red-600 hover:text-red-500"
            >
              REFRESH
            </button>
          </div>

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="p-4 sm:p-6">SESSION ID</th>
                    <th className="p-4 sm:p-6">USER</th>
                    <th className="p-4 sm:p-6">PHONE</th>
                    <th className="p-4 sm:p-6">STATUS</th>
                    <th className="p-4 sm:p-6">LAST ACTIVE</th>
                    <th className="p-4 sm:p-6">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 sm:p-6 text-zinc-400">{session.id.slice(0, 8)}...</td>
                      <td className="p-4 sm:p-6">{session.username || 'Unknown'}</td>
                      <td className="p-4 sm:p-6">{session.phone_number}</td>
                      <td className="p-4 sm:p-6">
                        <span className={`px-2 py-1 text-[10px] ${
                          session.state === 'active' ? 'bg-green-500/10 text-green-500' : 
                          session.state === 'needs_reauth' ? 'bg-yellow-500/10 text-yellow-500' :
                          session.state === 'qr_pending' || session.state === 'pairing_sent' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {session.state.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-500">{formatDate(session.last_active)}</td>
                      <td className="p-4 sm:p-6">
                        {session.state !== 'inactive' && (
                          <button 
                            onClick={() => handleStopSession(session.id)}
                            className="text-red-600 hover:underline text-[10px]"
                          >
                            TERMINATE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-600">NO SESSIONS FOUND</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-zinc-500 font-mono text-xs">{"// Users & acquisition analytics"}</p>
                <button onClick={fetchUsers} className="text-[10px] font-mono px-3 py-1.5 text-zinc-500 border border-zinc-800 hover:text-white transition-colors">
                  REFRESH
                </button>
              </div>
              {fetchError && activeTab === 'users' && (
                <div className="bg-red-950/20 border border-red-900/50 p-3 mb-4">
                  <p className="text-red-400 font-mono text-xs">{fetchError}</p>
                </div>
              )}

              {/* Acquisition Analytics */}
              {acquisitionData && (
                <div className="mb-8">
                  <h3 className="font-display text-sm tracking-wider text-red-600 mb-4">USER ACQUISITION</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {Object.entries(acquisitionData.sourceCounts)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([source, count]) => {
                        const colors: Record<string, string> = {
                          referral: 'text-green-400 border-green-500/30',
                          whatsapp: 'text-emerald-400 border-emerald-500/30',
                          google: 'text-blue-400 border-blue-500/30',
                          google_organic: 'text-blue-300 border-blue-400/30',
                          facebook: 'text-indigo-400 border-indigo-500/30',
                          twitter: 'text-sky-400 border-sky-500/30',
                          instagram: 'text-pink-400 border-pink-500/30',
                          direct: 'text-zinc-400 border-zinc-600/30',
                        };
                        const color = colors[source] || 'text-zinc-400 border-zinc-600/30';
                        return (
                          <div key={source} className={`bg-zinc-900/50 border p-3 ${color}`}>
                            <p className="font-mono text-[9px] tracking-widest uppercase">{source.replace('_', ' ')}</p>
                            <p className="font-bold text-xl mt-1">{String(count)}</p>
                            <p className="font-mono text-[9px] text-zinc-600">
                              {((count as number) / acquisitionData.totalUsers * 100).toFixed(0)}%
                            </p>
                          </div>
                        );
                      })}
                  </div>
                  {/* Signup trend - last 7 days */}
                  <div className="bg-zinc-900/30 border border-zinc-800 p-4">
                    <p className="font-mono text-[10px] text-zinc-500 mb-3">SIGNUPS — LAST 7 DAYS</p>
                    <div className="flex items-end gap-1 h-16">
                      {acquisitionData.last30Days.slice(-7).map((day) => {
                        const maxDay = Math.max(...acquisitionData.last30Days.slice(-7).map(d => d.total), 1);
                        const height = day.total > 0 ? Math.max((day.total / maxDay) * 100, 8) : 4;
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="font-mono text-[8px] text-zinc-500">{day.total}</span>
                            <div
                              className={`w-full rounded-sm ${day.total > 0 ? 'bg-green-500/60' : 'bg-zinc-800'}`}
                              style={{ height: `${height}%` }}
                              title={`${day.date}: ${day.total} signups`}
                            />
                            <span className="font-mono text-[7px] text-zinc-600">{day.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* User List */}
              {fetchingUsers ? (
                <p className="text-zinc-500 font-mono text-xs text-center py-12 animate-pulse">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-zinc-600 font-mono text-xs text-center py-12">No users found</p>
              ) : (
                <div className="space-y-3">
                  {users.map(user => {
                    const sourceColors: Record<string, string> = {
                      referral: 'bg-green-500/15 text-green-400',
                      whatsapp: 'bg-emerald-500/15 text-emerald-400',
                      google: 'bg-blue-500/15 text-blue-400',
                      google_organic: 'bg-blue-400/15 text-blue-300',
                      facebook: 'bg-indigo-500/15 text-indigo-400',
                      twitter: 'bg-sky-500/15 text-sky-400',
                      instagram: 'bg-pink-500/15 text-pink-400',
                      direct: 'bg-zinc-600/15 text-zinc-400',
                    };
                    const sourceColor = sourceColors[user.signup_source] || 'bg-zinc-600/15 text-zinc-400';
                    return (
                      <div key={user.id} className="bg-zinc-800/30 border border-zinc-800">
                        <button
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                              <span className="font-mono text-[10px] text-blue-400">{(user.username || '?')[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm text-white">{user.username || 'Unknown'}</p>
                                <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${sourceColor}`}>
                                  {user.signup_source.toUpperCase().replace('_', ' ')}
                                </span>
                              </div>
                              <p className="font-mono text-[10px] text-zinc-500">
                                Joined: {formatDate(user.created_at)}
                                {user.utm_campaign && <span className="ml-2 text-zinc-600">campaign: {user.utm_campaign}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <p className="font-mono text-[10px] text-zinc-500">SESSIONS</p>
                              <p className="font-mono text-sm">
                                <span className="text-green-500">{user.activeSessions}</span>
                                <span className="text-zinc-600">/{user.totalSessions}</span>
                              </p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="font-mono text-[10px] text-zinc-500">FEATURES</p>
                              <p className="font-mono text-sm text-cyan-500">{user.enabledFeatures}</p>
                            </div>
                            <span className="font-mono text-zinc-500">{expandedUser === user.id ? '[-]' : '[+]'}</span>
                          </div>
                        </button>
                        {expandedUser === user.id && (
                          <div className="border-t border-zinc-800 p-4">
                            {/* User details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="bg-zinc-900/50 p-2">
                                <p className="font-mono text-[9px] text-zinc-600">SOURCE</p>
                                <p className="font-mono text-xs text-white">{user.signup_source}</p>
                              </div>
                              {user.signup_referrer && (
                                <div className="bg-zinc-900/50 p-2">
                                  <p className="font-mono text-[9px] text-zinc-600">REFERRER</p>
                                  <p className="font-mono text-[10px] text-zinc-400 truncate" title={user.signup_referrer}>{user.signup_referrer}</p>
                                </div>
                              )}
                              {user.utm_source && (
                                <div className="bg-zinc-900/50 p-2">
                                  <p className="font-mono text-[9px] text-zinc-600">UTM SOURCE</p>
                                  <p className="font-mono text-xs text-zinc-400">{user.utm_source}</p>
                                </div>
                              )}
                              {user.utm_medium && (
                                <div className="bg-zinc-900/50 p-2">
                                  <p className="font-mono text-[9px] text-zinc-600">UTM MEDIUM</p>
                                  <p className="font-mono text-xs text-zinc-400">{user.utm_medium}</p>
                                </div>
                              )}
                              <div className="bg-zinc-900/50 p-2">
                                <p className="font-mono text-[9px] text-zinc-600">LOGINS</p>
                                <p className="font-mono text-xs text-white">{user.login_count}</p>
                              </div>
                              {user.last_login_at && (
                                <div className="bg-zinc-900/50 p-2">
                                  <p className="font-mono text-[9px] text-zinc-600">LAST LOGIN</p>
                                  <p className="font-mono text-[10px] text-zinc-400">{formatDate(user.last_login_at)}</p>
                                </div>
                              )}
                            </div>
                            {/* Sessions table */}
                            {user.sessions.length > 0 && (
                              <table className="w-full font-mono text-[10px]">
                                <thead>
                                  <tr className="text-zinc-500">
                                    <th className="text-left p-2">SESSION</th>
                                    <th className="text-left p-2">PHONE</th>
                                    <th className="text-left p-2">STATE</th>
                                    <th className="text-left p-2">LAST ACTIVE</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {user.sessions.map(s => (
                                    <tr key={s.id} className="border-t border-zinc-800/50">
                                      <td className="p-2 text-zinc-400">{s.session_name || s.id.slice(0, 8)}</td>
                                      <td className="p-2">{s.phone_number}</td>
                                      <td className="p-2">
                                        <span className={
                                          s.state === 'active' ? 'text-green-500' :
                                          s.state === 'needs_reauth' ? 'text-yellow-500' : 'text-red-500'
                                        }>{s.state.toUpperCase()}</span>
                                      </td>
                                      <td className="p-2 text-zinc-500">{formatDate(s.last_active)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {user.sessions.length === 0 && (
                              <p className="text-zinc-600 font-mono text-[10px] py-2">No sessions</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rate Limits Tab */}
          {activeTab === 'settings' && (
            <div className="p-4 sm:p-6">
              <p className="text-zinc-500 font-mono text-xs mb-6">{"// Configure rate limits for the application. Set to 0 for unlimited."}</p>
              <div className="space-y-4">
                {rateLimits.map((setting) => (
                  <div key={setting.id} className="bg-zinc-800/50 border border-zinc-700 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        <label className="font-mono text-xs text-zinc-400">MAX</label>
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

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-4 sm:p-6">
              {!securityData ? (
                <p className="text-zinc-500 font-mono text-xs text-center py-12">Loading security data...</p>
              ) : (
                <>
                  {/* Security Overview */}
                  <div className="mb-8">
                    <h3 className="font-display text-sm tracking-wider text-red-600 mb-4">SECURITY CONFIGURATION</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(securityData.security).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-zinc-800/30 border border-zinc-800">
                          <span className="font-mono text-[10px] text-zinc-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-mono text-[10px] text-green-500">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audit Log */}
                  <div className="mb-8">
                    <h3 className="font-display text-sm tracking-wider text-red-600 mb-4">AUDIT LOG</h3>
                    {securityData.auditLog.length === 0 ? (
                      <p className="text-zinc-600 font-mono text-xs py-6">No audit entries yet (resets on deploy)</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full font-mono text-[10px]">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="text-left p-3">TIME</th>
                              <th className="text-left p-3">ADMIN</th>
                              <th className="text-left p-3">ACTION</th>
                              <th className="text-left p-3">DETAILS</th>
                              <th className="text-left p-3">IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {securityData.auditLog.map((entry, i) => (
                              <tr key={i} className="border-b border-zinc-800/50">
                                <td className="p-3 text-zinc-500">{new Date(entry.timestamp).toLocaleString()}</td>
                                <td className="p-3">{entry.admin}</td>
                                <td className="p-3">
                                  <span className={
                                    entry.action === 'login' ? 'text-green-500' :
                                    entry.action === 'login_failed' ? 'text-red-500' :
                                    entry.action === 'session_stop' ? 'text-yellow-500' : 'text-zinc-400'
                                  }>{entry.action.toUpperCase()}</span>
                                </td>
                                <td className="p-3 text-zinc-400 max-w-[300px] truncate">{entry.details}</td>
                                <td className="p-3 text-zinc-500">{entry.ip}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Login Attempts */}
                  <div>
                    <h3 className="font-display text-sm tracking-wider text-red-600 mb-4">RECENT LOGIN ATTEMPTS</h3>
                    {securityData.loginAttempts.length === 0 ? (
                      <p className="text-zinc-600 font-mono text-xs py-6">No login attempts recorded (resets on deploy)</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full font-mono text-[10px]">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="text-left p-3">TIME</th>
                              <th className="text-left p-3">USERNAME</th>
                              <th className="text-left p-3">IP</th>
                              <th className="text-left p-3">RESULT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {securityData.loginAttempts.map((attempt, i) => (
                              <tr key={i} className="border-b border-zinc-800/50">
                                <td className="p-3 text-zinc-500">{new Date(attempt.timestamp).toLocaleString()}</td>
                                <td className="p-3">{attempt.username}</td>
                                <td className="p-3 text-zinc-500">{attempt.ip}</td>
                                <td className="p-3">
                                  <span className={attempt.success ? 'text-green-500' : 'text-red-500'}>
                                    {attempt.success ? 'SUCCESS' : 'FAILED'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'health' && (
            <div className="p-4 sm:p-6">
              <div className="mb-8">
                <h3 className="font-display text-sm tracking-wider text-white mb-2">Database Connection & Schema</h3>
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

              {/* Evolution API Status */}
              <div className="mb-8">
                <h3 className="font-display text-sm tracking-wider text-white mb-2">Evolution API</h3>
                <div className="flex items-center gap-3 p-4 bg-zinc-800/30 border border-zinc-800">
                  <div className={`w-3 h-3 rounded-full ${
                    stats.evolutionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-mono text-xs">
                    Status: <span className={stats.evolutionStatus === 'Connected' ? 'text-green-500' : 'text-red-500'}>{stats.evolutionStatus}</span>
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 ml-4">
                    URL: {process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'Configured server-side'}
                  </span>
                </div>
              </div>

              {!fetchingHealth && healthData && !healthData.allFound && (
                <div className="mt-8 p-6 bg-red-950/20 border border-red-900/50">
                  <h3 className="text-red-500 font-bold mb-2">Required Tables Missing!</h3>
                  <p className="text-zinc-400 font-mono text-xs mb-4">
                    Some core tables are missing from your database. Copy the SQL below and run it in your Supabase SQL Editor.
                  </p>
                  <div className="relative">
                    <pre className="bg-black p-4 text-[10px] font-mono text-zinc-400 overflow-auto max-h-60 border border-zinc-800">
                      {healthData.schemaSql}
                    </pre>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(healthData.schemaSql);
                        setMessage({ type: 'success', text: 'SQL copied to clipboard!' });
                        setTimeout(() => setMessage(null), 3000);
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

          {/* Monetization Tab */}
          {activeTab === 'monetization' && (
            <div className="p-4 sm:p-6">
              {fetchingMonetization ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 font-mono text-sm animate-pulse">Loading monetization data...</p>
                </div>
              ) : monetizationData ? (
                <div className="space-y-8">
                  {/* Subscription Stats */}
                  <div>
                    <h3 className="text-green-500 font-bold mb-4 tracking-widest text-sm">SUBSCRIPTIONS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(monetizationData.subscriptions || {}).map(([plan, count]) => (
                        <div key={plan} className="bg-zinc-900/50 border border-zinc-800 p-4">
                          <p className="font-mono text-xs text-zinc-500 uppercase">{plan}</p>
                          <p className="font-bold text-2xl text-white">{String(count)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue Stats */}
                  <div>
                    <h3 className="text-green-500 font-bold mb-4 tracking-widest text-sm">REVENUE</h3>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 inline-block">
                      <p className="font-mono text-xs text-zinc-500">Total Revenue</p>
                      <p className="font-bold text-3xl text-green-400">₦{(monetizationData.revenue?.total || 0).toLocaleString()}</p>
                    </div>
                    {monetizationData.revenue?.recentPayments?.length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="text-left py-2 px-3">Plan</th>
                              <th className="text-left py-2 px-3">Amount</th>
                              <th className="text-left py-2 px-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monetizationData.revenue.recentPayments.slice(0, 10).map((p: any, i: number) => (
                              <tr key={i} className="border-b border-zinc-800/50">
                                <td className="py-2 px-3 text-zinc-300">{p.plan}</td>
                                <td className="py-2 px-3 text-green-400">₦{p.amount}</td>
                                <td className="py-2 px-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Reward Stats */}
                  <div>
                    <h3 className="text-green-500 font-bold mb-4 tracking-widest text-sm">REWARDS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                        <p className="font-mono text-xs text-zinc-500">Total Earned</p>
                        <p className="font-bold text-xl text-white">₦{(monetizationData.rewards?.totalEarned || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                        <p className="font-mono text-xs text-zinc-500">Cashed Out</p>
                        <p className="font-bold text-xl text-orange-400">₦{(monetizationData.rewards?.totalCashedOut || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                        <p className="font-mono text-xs text-zinc-500">Pending Balance</p>
                        <p className="font-bold text-xl text-cyan-400">₦{(monetizationData.rewards?.totalPendingBalance || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 p-4">
                        <p className="font-mono text-xs text-zinc-500">Users Earning</p>
                        <p className="font-bold text-xl text-white">{monetizationData.rewards?.usersWithBalance || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Cashouts */}
                  {monetizationData.cashouts?.length > 0 && (
                    <div>
                      <h3 className="text-green-500 font-bold mb-4 tracking-widest text-sm">RECENT CASHOUTS</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="text-left py-2 px-3">Phone</th>
                              <th className="text-left py-2 px-3">Amount</th>
                              <th className="text-left py-2 px-3">Network</th>
                              <th className="text-left py-2 px-3">Status</th>
                              <th className="text-left py-2 px-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monetizationData.cashouts.map((c: any, i: number) => (
                              <tr key={i} className="border-b border-zinc-800/50">
                                <td className="py-2 px-3 text-zinc-300">{c.phone_number}</td>
                                <td className="py-2 px-3 text-green-400">₦{c.amount}</td>
                                <td className="py-2 px-3 text-zinc-300">{c.network}</td>
                                <td className={`py-2 px-3 ${c.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{c.status}</td>
                                <td className="py-2 px-3 text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500 font-mono text-sm text-center py-12">No monetization data available.</p>
              )}
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="p-4 sm:p-6">
              {/* Support Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'TOTAL', value: supportStats.total, color: 'text-white' },
                  { label: 'OPEN', value: supportStats.open, color: 'text-yellow-400' },
                  { label: 'IN PROGRESS', value: supportStats.in_progress, color: 'text-cyan-400' },
                  { label: 'RESOLVED', value: supportStats.resolved, color: 'text-green-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-zinc-800/50 border border-zinc-800 p-3 text-center">
                    <p className="text-zinc-500 font-mono text-[9px] tracking-widest">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2 mb-4">
                {['all', 'open', 'in_progress', 'resolved', 'closed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setSupportFilter(f); fetchSupportTickets(f); }}
                    className={`text-[10px] font-mono px-3 py-1.5 transition-colors ${
                      supportFilter === f
                        ? 'bg-red-600/20 text-red-400 border border-red-600/50'
                        : 'text-zinc-500 border border-zinc-800 hover:text-white'
                    }`}
                  >
                    {f.toUpperCase().replace('_', ' ')}
                  </button>
                ))}
              </div>

              {supportLoading ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 font-mono text-sm animate-pulse">Loading tickets...</p>
                </div>
              ) : selectedTicket ? (
                /* Ticket Detail View */
                <div>
                  <button
                    onClick={() => { setSelectedTicket(null); setTicketMessages([]); setAdminReply(''); }}
                    className="text-zinc-400 hover:text-white font-mono text-xs mb-4 flex items-center gap-1"
                  >
                    &larr; BACK TO TICKETS
                  </button>

                  <div className="bg-zinc-800/30 border border-zinc-800 p-4 mb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-white font-bold text-sm">{selectedTicket.subject}</h3>
                        <p className="text-zinc-500 font-mono text-[10px] mt-1">
                          From: {selectedTicket.username} &middot; {new Date(selectedTicket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority selector */}
                        <select
                          value={selectedTicket.priority}
                          onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 text-xs font-mono px-2 py-1 text-white"
                        >
                          <option value="low">LOW</option>
                          <option value="normal">NORMAL</option>
                          <option value="high">HIGH</option>
                          <option value="urgent">URGENT</option>
                        </select>
                        {/* Status buttons */}
                        {['in_progress', 'resolved', 'closed'].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateTicketStatus(selectedTicket.id, s)}
                            className={`text-[9px] font-mono px-2 py-1 border transition-colors ${
                              selectedTicket.status === s
                                ? (s === 'resolved' ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                  : s === 'closed' ? 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50'
                                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50')
                                : 'text-zinc-500 border-zinc-700 hover:text-white'
                            }`}
                          >
                            {s.toUpperCase().replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Messages Thread */}
                  <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                    {ticketMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 border ${
                          msg.sender_type === 'admin'
                            ? 'bg-red-950/20 border-red-900/50 ml-8'
                            : 'bg-zinc-800/30 border-zinc-800 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-mono text-[10px] font-bold ${
                            msg.sender_type === 'admin' ? 'text-red-400' : 'text-cyan-400'
                          }`}>
                            {msg.sender_type === 'admin' ? `ADMIN (${msg.sender_id})` : 'USER'}
                          </span>
                          <span className="font-mono text-[9px] text-zinc-600">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick Replies */}
                  <div className="mb-3">
                    <p className="text-zinc-600 font-mono text-[9px] tracking-widest mb-2">QUICK REPLIES</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickReplies.map((qr, i) => (
                        <button
                          key={i}
                          onClick={() => setAdminReply(qr)}
                          className="text-[10px] font-mono text-zinc-400 border border-zinc-800 px-2 py-1 hover:text-white hover:border-zinc-600 transition-colors truncate max-w-[200px]"
                          title={qr}
                        >
                          {qr.slice(0, 40)}{qr.length > 40 ? '...' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply Input */}
                  <div className="flex gap-2">
                    <textarea
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="flex-1 bg-zinc-900 border border-zinc-700 text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-red-600 resize-none placeholder:text-zinc-600"
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdminReply(); } }}
                    />
                    <button
                      onClick={handleAdminReply}
                      disabled={!adminReply.trim() || sendingReply}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs px-4 transition-colors self-end h-10"
                    >
                      {sendingReply ? 'SENDING...' : 'REPLY'}
                    </button>
                  </div>
                  <p className="text-zinc-600 font-mono text-[9px] mt-1">Ctrl+Enter to send</p>
                </div>
              ) : (
                /* Ticket List */
                <div className="space-y-2">
                  {supportTickets.length === 0 ? (
                    <p className="text-zinc-600 font-mono text-xs text-center py-12">No support tickets found.</p>
                  ) : (
                    supportTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => fetchTicketMessages(ticket.id)}
                        className="w-full text-left bg-zinc-800/30 border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">
                                {ticket.priority === 'urgent' ? '\uD83D\uDD34' : ticket.priority === 'high' ? '\uD83D\uDFE0' : ticket.priority === 'normal' ? '\uD83D\uDFE2' : '\u26AA'}
                              </span>
                              <span className="font-bold text-sm text-white truncate">{ticket.subject}</span>
                            </div>
                            <p className="text-zinc-500 font-mono text-[10px] mt-1">
                              {ticket.username} &middot; {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                            {ticket.last_message && (
                              <p className="text-zinc-400 text-xs mt-1 truncate">
                                <span className={ticket.last_message.sender_type === 'admin' ? 'text-red-400' : 'text-cyan-400'}>
                                  {ticket.last_message.sender_type === 'admin' ? 'You: ' : 'User: '}
                                </span>
                                {ticket.last_message.message}
                              </p>
                            )}
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-1 shrink-0 ${
                            ticket.status === 'open' ? 'bg-yellow-500/10 text-yellow-400'
                            : ticket.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-400'
                            : ticket.status === 'resolved' ? 'bg-green-500/10 text-green-400'
                            : 'bg-zinc-600/10 text-zinc-500'
                          }`}>
                            {ticket.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {/* Deployment Tab */}
          {activeTab === 'deployment' && (
            <DeploymentTab />
          )}
        </div>
      </div>
    </div>
  );
}
