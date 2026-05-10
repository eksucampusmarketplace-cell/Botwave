'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface QueueStats {
  pending: number;
  processing: number;
  deadLetter: number;
}

interface ChannelInfo {
  channel: string;
  domain: string;
  defaultFrom: string;
  defaultFromName: string;
}

interface ChannelHealth {
  hourlyCount: number;
  dailyCount: number;
  bounceCount: number;
  complaintCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

const CHANNELS = ['auth', 'notify', 'billing', 'welcome', 'alerts', 'usermail'] as const;

export default function AdminEmailPage() {
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, deadLetter: 0 });
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelHealth, setChannelHealth] = useState<Record<string, ChannelHealth>>({});
  const [loading, setLoading] = useState(true);
  const [testForm, setTestForm] = useState({
    channel: 'auth' as string,
    to: '',
    subject: '',
    content: '',
  });
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email');
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setStats(data.data.queueStats);
        setChannels(data.data.channels);
        if (data.data.channelHealth) setChannelHealth(data.data.channelHealth);
      }
    } catch (err) {
      console.error('Failed to fetch email stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          ...testForm,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? `Email sent! Message ID: ${data.messageId}`
          : `Failed: ${data.error}`,
      });
    } catch (err) {
      setTestResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const handleRetryDLQ = async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry-dlq' }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `Retried ${data.retriedCount} emails from dead letter queue` });
        fetchData();
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to retry DLQ' });
    } finally {
      setRetrying(false);
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
        <h1 className="text-2xl font-bold text-white">Email System</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">
          Postal SMTP &middot; Queue monitoring &middot; Test delivery
        </p>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'PENDING', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'PROCESSING', value: stats.processing, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'DEAD LETTER', value: stats.deadLetter, color: stats.deadLetter > 0 ? 'text-red-400' : 'text-gray-500', bg: stats.deadLetter > 0 ? 'bg-red-500/10' : 'bg-white/5' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${stat.bg} border border-white/5 rounded-xl p-4`}
          >
            <p className="text-xs text-gray-500 font-mono mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {stats.deadLetter > 0 && (
        <div className="mb-6">
          <button
            onClick={handleRetryDLQ}
            disabled={retrying}
            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {retrying ? 'Retrying...' : `Retry ${stats.deadLetter} Dead Letter Email(s)`}
          </button>
        </div>
      )}

      {/* Channel Status */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Email Channels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((ch, i) => (
            <motion.div
              key={ch.channel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/5 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  channelHealth[ch.channel]?.status === 'critical' ? 'bg-red-400' :
                  channelHealth[ch.channel]?.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
                <span className="text-sm font-semibold text-white uppercase">{ch.channel}</span>
              </div>
              <p className="text-xs text-gray-400 font-mono truncate">{ch.domain}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{ch.defaultFrom}</p>
              {channelHealth[ch.channel] && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <span className="text-gray-500">Hour: {channelHealth[ch.channel].hourlyCount}</span>
                  <span className="text-gray-500">Day: {channelHealth[ch.channel].dailyCount}</span>
                  <span className={channelHealth[ch.channel].bounceCount > 0 ? 'text-red-400' : 'text-gray-600'}>Bounce: {channelHealth[ch.channel].bounceCount}</span>
                  <span className={channelHealth[ch.channel].complaintCount > 0 ? 'text-red-400' : 'text-gray-600'}>Spam: {channelHealth[ch.channel].complaintCount}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Test Email Form */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Send Test Email</h2>

        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border text-sm rounded-lg p-3 mb-4`}
          >
            {testResult.message}
          </motion.div>
        )}

        <form onSubmit={handleTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-mono block mb-1">CHANNEL</label>
              <select
                value={testForm.channel}
                onChange={(e) => setTestForm((p) => ({ ...p, channel: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#1e293b] px-3 py-2.5 rounded-lg text-white text-sm focus:border-red-500/50 focus:outline-none"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-mono block mb-1">TO EMAIL</label>
              <input
                type="email"
                value={testForm.to}
                onChange={(e) => setTestForm((p) => ({ ...p, to: e.target.value }))}
                required
                className="w-full bg-[#0d1117] border border-[#1e293b] px-3 py-2.5 rounded-lg text-white text-sm focus:border-red-500/50 focus:outline-none"
                placeholder="test@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-mono block mb-1">SUBJECT</label>
            <input
              type="text"
              value={testForm.subject}
              onChange={(e) => setTestForm((p) => ({ ...p, subject: e.target.value }))}
              className="w-full bg-[#0d1117] border border-[#1e293b] px-3 py-2.5 rounded-lg text-white text-sm focus:border-red-500/50 focus:outline-none"
              placeholder="Test email subject (optional)"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-mono block mb-1">CONTENT</label>
            <textarea
              value={testForm.content}
              onChange={(e) => setTestForm((p) => ({ ...p, content: e.target.value }))}
              rows={3}
              className="w-full bg-[#0d1117] border border-[#1e293b] px-3 py-2.5 rounded-lg text-white text-sm focus:border-red-500/50 focus:outline-none resize-none"
              placeholder="Test email content (optional)"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Test Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
