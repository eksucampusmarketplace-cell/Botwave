'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { createClient } from '@/lib/supabase/client';
import type { BotSession } from '@/lib/types';

interface ScheduledMessage {
  id: string;
  session_id: string;
  target_jid: string;
  message: string;
  send_at: string;
  sent: boolean;
  created_at: string;
  bot_sessions?: { session_name: string };
}

export default function ScheduledPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');
  const [form, setForm] = useState({
    sessionId: '',
    targetJid: '',
    message: '',
    sendAt: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      await Promise.all([fetchMessages(), fetchSessions()]);
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchMessages = async () => {
    try {
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const res = await fetch(`/api/bot/scheduled-messages?_=${Date.now()}${statusParam}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (err) {
      console.error('Error fetching scheduled messages:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/bot/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
        if (data.data.length > 0 && !form.sessionId) {
          setForm(prev => ({ ...prev, sessionId: data.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bot/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: form.sessionId,
          targetJid: form.targetJid,
          message: form.message,
          sendAt: new Date(form.sendAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ sessionId: sessions[0]?.id || '', targetJid: '', message: '', sendAt: '' });
        fetchMessages();
      }
    } catch (err) {
      console.error('Error creating scheduled message:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled message?')) return;
    try {
      await fetch(`/api/bot/scheduled-messages?id=${id}`, { method: 'DELETE' });
      fetchMessages();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const isPast = (date: string) => new Date(date) < new Date();

  return (
    <main className="min-h-screen bg-dark relative">
      <ParticleBackground />
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            SCHEDULED <span className="text-green">MESSAGES</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Schedule messages to be sent at a specific time
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            {(['pending', 'sent', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 font-mono text-xs tracking-[2px] border transition-colors ${
                  filter === f
                    ? 'border-green bg-green/10 text-green'
                    : 'border-green/20 text-[#5a9a7a] hover:border-green/40'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-green text-dark font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors"
          >
            + SCHEDULE NEW
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-card border border-green/10 p-12 text-center">
            <p className="font-mono text-sm text-[#5a9a7a]">No scheduled messages found</p>
            <p className="font-mono text-xs text-[#3a6a5a] mt-2">Click &quot;Schedule New&quot; to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-green/10 p-4 relative"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 font-mono text-[10px] tracking-[1px] ${
                        msg.sent
                          ? 'bg-green/10 text-green border border-green/20'
                          : isPast(msg.send_at)
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-cyan/10 text-cyan border border-cyan/20'
                      }`}>
                        {msg.sent ? 'SENT' : isPast(msg.send_at) ? 'OVERDUE' : 'PENDING'}
                      </span>
                      {msg.bot_sessions && (
                        <span className="font-mono text-[10px] text-[#5a9a7a]">
                          via {msg.bot_sessions.session_name}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-sm text-white mb-1 truncate">{msg.message}</p>
                    <div className="flex flex-wrap gap-4 text-[10px] font-mono text-[#5a9a7a]">
                      <span>TO: {msg.target_jid}</span>
                      <span>SEND AT: {new Date(msg.send_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {!msg.sent && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="font-mono text-xs text-red-400 hover:text-red-300 tracking-[1px]"
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-green/20 p-6 sm:p-8 max-w-md w-full relative"
            >
              <h2 className="font-display text-xl text-green mb-6 tracking-[2px]">SCHEDULE MESSAGE</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">SESSION</label>
                  <select
                    value={form.sessionId}
                    onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                    required
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.session_name} ({s.phone_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">RECIPIENT (JID or phone)</label>
                  <input
                    type="text"
                    required
                    value={form.targetJid}
                    onChange={(e) => setForm({ ...form, targetJid: e.target.value })}
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                    placeholder="e.g. 2348012345678@s.whatsapp.net"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">MESSAGE</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none min-h-[80px] resize-y"
                    placeholder="Your scheduled message..."
                    maxLength={2000}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">SEND AT</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.sendAt}
                    onChange={(e) => setForm({ ...form, sendAt: e.target.value })}
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-red-400/50 text-red-400 p-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-green text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50"
                  >
                    {saving ? 'SCHEDULING...' : 'SCHEDULE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
