'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface InactiveUser {
  id: string;
  email: string;
  username: string;
  hasLinkedDevice: boolean;
  lastActivity: string;
  alreadyEmailed: boolean;
  lastEmailedAt: string | null;
}

interface EmailJob {
  id: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
  type: string;
  trigger: string;
}

interface AutoSendConfig {
  enabled: boolean;
  intervalHours: number;
  inactiveHours: number;
}

export default function EmailBroadcastPage() {
  const router = useRouter();
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, inactiveUsers: 0, usersWithSessions: 0 });
  const [autoSend, setAutoSend] = useState<AutoSendConfig>({ enabled: false, intervalHours: 12, inactiveHours: 12 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inactiveHours, setInactiveHours] = useState(12);
  const [autoIntervalHours, setAutoIntervalHours] = useState(12);
  const [scope, setScope] = useState<'inactive' | 'all'>('inactive');
  const [delaySec, setDelaySec] = useState(3);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/email-broadcast?hours=${inactiveHours}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setJobs(data.data.recentJobs);
        setStats({
          totalUsers: data.data.totalUsers,
          inactiveUsers: data.data.inactiveUsers,
          usersWithSessions: data.data.usersWithSessions,
        });
        if (data.data.autoSend) {
          setAutoSend(data.data.autoSend);
          setAutoIntervalHours(data.data.autoSend.intervalHours);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router, inactiveHours]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'sending' || j.status === 'pending');
    if (!hasActive) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchData]);

  const handleSendReengagement = async () => {
    const targetCount = scope === 'all' ? stats.totalUsers : users.filter(u => !u.alreadyEmailed).length;
    if (targetCount === 0) {
      setMessage({ type: 'error', text: scope === 'all' ? 'No eligible users (all recently emailed within 24h)' : 'No eligible users to email (all recently contacted or active)' });
      return;
    }

    const scopeLabel = scope === 'all' ? 'ALL' : 'inactive';
    if (!confirm(`Send re-engagement emails to ${targetCount} ${scopeLabel} users?\n\nUsers emailed within 24h will be skipped automatically.`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reengagement', inactiveHours, scope, delaySec }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start email broadcast' });
    } finally {
      setSending(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleToggleAutoSend = async () => {
    const action = autoSend.enabled ? 'disable_auto_send' : 'enable_auto_send';
    try {
      const res = await fetch('/api/admin/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inactiveHours, intervalHours: autoIntervalHours }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update auto-send' });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleTriggerNow = async () => {
    try {
      const res = await fetch('/api/admin/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_auto_send' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Auto-send triggered — processing in background' });
        setTimeout(fetchData, 3000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to trigger auto-send' });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const eligibleCount = users.filter(u => !u.alreadyEmailed).length;
  const alreadyEmailedCount = users.filter(u => u.alreadyEmailed).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Email Broadcast</h1>
        <p className="text-gray-500 text-sm mt-1">Send re-engagement emails to inactive users with smart dedup</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-gray-500 text-xs mt-1">Total Users</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.inactiveUsers}</p>
          <p className="text-gray-500 text-xs mt-1">Inactive ({inactiveHours}h+)</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{eligibleCount}</p>
          <p className="text-gray-500 text-xs mt-1">Eligible to Email</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.usersWithSessions}</p>
          <p className="text-gray-500 text-xs mt-1">Linked Devices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Panel */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Manual Broadcast</h2>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-blue-400 text-xs">
              Sends a branded email highlighting anti-ban features, new updates, and a device linking guide. Smart dedup prevents re-emailing within 24h.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setScope('inactive')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === 'inactive' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Inactive Only
            </button>
            <button
              onClick={() => setScope('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === 'all' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              All Users
            </button>
          </div>

          {scope === 'inactive' && (
            <label className="block mb-4">
              <span className="text-gray-400 text-sm">Inactive threshold (hours)</span>
              <input
                type="number"
                value={inactiveHours}
                onChange={e => setInactiveHours(parseInt(e.target.value) || 12)}
                min={1} max={720}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </label>
          )}

          <label className="block mb-4">
            <span className="text-gray-400 text-sm">Delay between emails (seconds)</span>
            <input
              type="number"
              value={delaySec}
              onChange={e => setDelaySec(Math.max(1, Math.min(30, parseInt(e.target.value) || 3)))}
              min={1} max={30}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            />
            <p className="text-gray-600 text-xs mt-1">+0-2s random jitter added automatically to protect IP reputation</p>
          </label>

          {alreadyEmailedCount > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-xs">
                {alreadyEmailedCount} user(s) already emailed in the last 24h — will be skipped automatically.
              </p>
            </div>
          )}

          <button
            onClick={handleSendReengagement}
            disabled={sending || (scope === 'inactive' ? eligibleCount === 0 : stats.totalUsers === 0)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {sending ? 'Starting campaign...' : scope === 'all' ? `Email All ${stats.totalUsers} Users` : `Email ${eligibleCount} Eligible Users`}
          </button>
        </div>

        {/* Auto-Send Panel */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Auto-Send (Scheduled)</h2>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
            <p className="text-purple-400 text-xs">
              Automatically sends re-engagement emails on a schedule. Smart tracking ensures no user gets emailed twice within 24 hours.
            </p>
          </div>

          <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm font-medium">Auto-Send</p>
              <p className="text-gray-500 text-xs">{autoSend.enabled ? `Every ${autoSend.intervalHours}h` : 'Disabled'}</p>
            </div>
            <button
              onClick={handleToggleAutoSend}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoSend.enabled
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {autoSend.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          <label className="block mb-4">
            <span className="text-gray-400 text-sm">Check interval (hours)</span>
            <input
              type="number"
              value={autoIntervalHours}
              onChange={e => setAutoIntervalHours(parseInt(e.target.value) || 12)}
              min={1} max={168}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            />
            <p className="text-gray-600 text-xs mt-1">How often to check for inactive users and send emails</p>
          </label>

          {autoSend.enabled && (
            <button
              onClick={handleTriggerNow}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Trigger Now
            </button>
          )}
        </div>
      </div>

      {/* Inactive Users Preview */}
      <div className="mt-6 bg-white/5 border border-white/5 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Inactive Users ({users.length})</h2>

        {users.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No inactive users found</p>
            <p className="text-xs mt-1">Everyone has been active in the last {inactiveHours} hours</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{user.username || 'Unknown'}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.alreadyEmailed && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                      Emailed
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${user.hasLinkedDevice ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {user.hasLinkedDevice ? 'Linked' : 'No device'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="mt-6 bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Campaign History</h2>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white/5 border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'sending' ? 'bg-blue-500/20 text-blue-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-xs capitalize">{job.type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      job.trigger === 'auto' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {job.trigger}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Total: {job.totalRecipients}</span>
                  <span className="text-green-400">Sent: {job.sentCount}</span>
                  {job.skippedCount > 0 && <span className="text-yellow-400">Skipped: {job.skippedCount}</span>}
                  {job.failedCount > 0 && <span className="text-red-400">Failed: {job.failedCount}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
