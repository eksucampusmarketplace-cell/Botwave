'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface BroadcastSession {
  id: string;
  session_name: string;
  phone_number: string;
  state: string;
}

interface BroadcastJob {
  id: string;
  message: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

export default function BroadcastPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<BroadcastSession[]>([]);
  const [jobs, setJobs] = useState<BroadcastJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    sessionId: '',
    message: '',
    delayMin: 3,
    delayMax: 8,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/broadcast');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) {
        setSessions(data.data.sessions);
        setJobs(data.data.recentBroadcasts);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'sending' || j.status === 'pending');
    if (!hasActive) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchData]);

  const handleSend = async () => {
    if (!form.sessionId || !form.message.trim()) {
      setMessage({ type: 'error', text: 'Please select a session and enter a message' });
      return;
    }

    if (!confirm(`Send broadcast to all private chat contacts via this session?\n\nThis will send one-by-one with ${form.delayMin}-${form.delayMax}s delay to avoid bans.`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.data.message });
        setForm(f => ({ ...f, message: '' }));
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start broadcast' });
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
        <h1 className="text-2xl font-bold text-white">Broadcast Center</h1>
        <p className="text-gray-500 text-sm mt-1">Send announcements to all users with anti-ban delays</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Compose Broadcast</h2>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-xs">
              Messages are sent one-by-one to private chats with random delays between each to avoid WhatsApp bans. Do not use this for spam.
            </p>
          </div>

          <label className="block mb-3">
            <span className="text-gray-400 text-sm">Session (sends from this number)</span>
            <select
              value={form.sessionId}
              onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            >
              <option value="">Select active session...</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.session_name} ({s.phone_number})</option>
              ))}
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-gray-400 text-sm">Message</span>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your broadcast message..."
              rows={5}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-gray-400 text-xs">Min delay (seconds)</span>
              <input
                type="number"
                value={form.delayMin}
                onChange={e => setForm(f => ({ ...f, delayMin: parseInt(e.target.value) || 3 }))}
                min={1} max={30}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </label>
            <label className="block">
              <span className="text-gray-400 text-xs">Max delay (seconds)</span>
              <input
                type="number"
                value={form.delayMax}
                onChange={e => setForm(f => ({ ...f, delayMax: parseInt(e.target.value) || 8 }))}
                min={1} max={60}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </label>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !form.sessionId || !form.message.trim()}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {sending ? 'Starting broadcast...' : 'Send Broadcast'}
          </button>
        </div>

        {/* Broadcast History */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Broadcast History</h2>

          {jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'sending' ? 'bg-blue-500/20 text-blue-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.status === 'sending' && '⏳ '}{job.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-xs">{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm truncate mb-2">{job.message}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Total: {job.totalRecipients}</span>
                    <span className="text-green-400">Sent: {job.sentCount}</span>
                    {job.failedCount > 0 && <span className="text-red-400">Failed: {job.failedCount}</span>}
                  </div>
                  {job.status === 'sending' && (
                    <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${job.totalRecipients > 0 ? (job.sentCount / job.totalRecipients) * 100 : 0}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
