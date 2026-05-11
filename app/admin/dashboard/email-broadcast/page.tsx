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
}

interface EmailJob {
  id: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  type: string;
}

export default function EmailBroadcastPage() {
  const router = useRouter();
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, inactiveUsers: 0, usersWithSessions: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inactiveHours, setInactiveHours] = useState(12);

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
    if (users.length === 0) {
      setMessage({ type: 'error', text: 'No inactive users to email' });
      return;
    }

    if (!confirm(`Send re-engagement emails to ${users.length} inactive users?\n\nThis will email users who haven't been active in ${inactiveHours}+ hours.`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reengagement', inactiveHours }),
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
        <h1 className="text-2xl font-bold text-white">Email Broadcast</h1>
        <p className="text-gray-500 text-sm mt-1">Send re-engagement emails to inactive users</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-gray-500 text-xs mt-1">Total Users</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.inactiveUsers}</p>
          <p className="text-gray-500 text-xs mt-1">Inactive ({inactiveHours}h+)</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.usersWithSessions}</p>
          <p className="text-gray-500 text-xs mt-1">Linked Devices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Panel */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Re-engagement Campaign</h2>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-blue-400 text-xs">
              Sends a branded email highlighting anti-ban features, new updates, and a device linking guide (for users who haven&apos;t connected yet).
            </p>
          </div>

          <label className="block mb-4">
            <span className="text-gray-400 text-sm">Inactive threshold (hours)</span>
            <input
              type="number"
              value={inactiveHours}
              onChange={e => setInactiveHours(parseInt(e.target.value) || 12)}
              min={1} max={720}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            />
            <p className="text-gray-600 text-xs mt-1">Users with no activity in the last {inactiveHours} hours will receive the email</p>
          </label>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-gray-300 text-sm font-medium mb-2">Email includes:</p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• Anti-ban protection highlights (warmup, jitter, ghost reads)</li>
              <li>• New features: Savage Mode, Anti-Delete, Smart NLP, AI Chat</li>
              <li>• &quot;Your account is safe&quot; reassurance section</li>
              <li>• Device linking guide (only for users without active sessions)</li>
              <li>• WhatsApp Channel follow link</li>
            </ul>
          </div>

          <button
            onClick={handleSendReengagement}
            disabled={sending || users.length === 0}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {sending ? 'Starting campaign...' : `Email ${users.length} Inactive Users`}
          </button>
        </div>

        {/* Inactive Users Preview */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Inactive Users Preview</h2>

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
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-xs ${user.hasLinkedDevice ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {user.hasLinkedDevice ? 'Linked' : 'No device'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="mt-6 bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Email Campaign History</h2>
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
                      {job.status === 'sending' && '⏳ '}{job.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-xs capitalize">{job.type}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Total: {job.totalRecipients}</span>
                  <span className="text-green-400">Sent: {job.sentCount}</span>
                  {job.failedCount > 0 && <span className="text-red-400">Failed: {job.failedCount}</span>}
                </div>
                {job.status === 'sending' && (
                  <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all"
                      style={{ width: `${job.totalRecipients > 0 ? (job.sentCount / job.totalRecipients) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
