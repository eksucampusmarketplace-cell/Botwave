'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';
import type { BotSession } from '@/lib/types';

interface AutoReplyRule {
  id: string;
  session_id: string;
  trigger_keyword: string;
  response_text: string;
  match_type: 'exact' | 'contains';
  category: 'general' | 'afk' | 'business' | 'greeting';
  enabled: boolean;
  schedule_enabled: boolean;
  schedule_start: string;
  schedule_end: string;
  active_days: number[];
  created_at: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESETS = [
  {
    label: 'AFK - Away',
    trigger_keyword: '',
    response_text: "Hey! I'm currently away from my phone. I'll get back to you as soon as I can.",
    match_type: 'contains' as const,
    category: 'afk' as const,
    schedule_enabled: false,
  },
  {
    label: 'Business Hours',
    trigger_keyword: '',
    response_text: "Thanks for your message! Our business hours are 9 AM - 5 PM (Mon-Fri). We'll respond when we're back online.",
    match_type: 'contains' as const,
    category: 'business' as const,
    schedule_enabled: true,
    schedule_start: '17:00',
    schedule_end: '09:00',
    active_days: [1, 2, 3, 4, 5],
  },
  {
    label: 'Weekend Auto-Reply',
    trigger_keyword: '',
    response_text: "Hi! It's the weekend and I'm taking a break. I'll respond on Monday!",
    match_type: 'contains' as const,
    category: 'afk' as const,
    schedule_enabled: true,
    schedule_start: '00:00',
    schedule_end: '23:59',
    active_days: [0, 6],
  },
  {
    label: 'Greeting Response',
    trigger_keyword: 'hello',
    response_text: 'Hey there! How can I help you today?',
    match_type: 'contains' as const,
    category: 'greeting' as const,
    schedule_enabled: false,
  },
  {
    label: 'Price Inquiry',
    trigger_keyword: 'price',
    response_text: 'Thanks for asking about our prices! Check our catalog at the link in our bio, or type !shop to browse products.',
    match_type: 'contains' as const,
    category: 'business' as const,
    schedule_enabled: false,
  },
];

const categoryColors: Record<string, string> = {
  general: 'bg-blue-500/20 text-blue-400',
  afk: 'bg-purple-500/20 text-purple-400',
  business: 'bg-green-500/20 text-green-400',
  greeting: 'bg-yellow-500/20 text-yellow-400',
};

export default function AutoRepliesPage() {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    session_id: '',
    trigger_keyword: '',
    response_text: '',
    match_type: 'contains' as 'exact' | 'contains',
    category: 'general' as 'general' | 'afk' | 'business' | 'greeting',
    schedule_enabled: false,
    schedule_start: '09:00',
    schedule_end: '17:00',
    active_days: [1, 2, 3, 4, 5] as number[],
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [repliesRes, sessionsRes] = await Promise.all([
        fetch('/api/user/auto-replies'),
        fetch('/api/bot/sessions'),
      ]);
      const [repliesData, sessionsData] = await Promise.all([
        repliesRes.json(),
        sessionsRes.json(),
      ]);

      if (repliesData.success) setRules(repliesData.data);
      if (sessionsData.success) setSessions(sessionsData.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) { window.location.href = '/login'; return; }
        }
      } catch {
        console.warn('[AutoReplies] Auth check failed (network error) - staying on page');
      }
      fetchData();
    };
    checkUser();
  }, [supabase, fetchData]);

  const resetForm = () => {
    setForm({
      session_id: sessions[0]?.id || '',
      trigger_keyword: '',
      response_text: '',
      match_type: 'contains',
      category: 'general',
      schedule_enabled: false,
      schedule_start: '09:00',
      schedule_end: '17:00',
      active_days: [1, 2, 3, 4, 5],
    });
    setEditingRule(null);
  };

  const openCreate = () => {
    resetForm();
    setForm(f => ({ ...f, session_id: sessions[0]?.id || '' }));
    setShowModal(true);
  };

  const openEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setForm({
      session_id: rule.session_id,
      trigger_keyword: rule.trigger_keyword,
      response_text: rule.response_text,
      match_type: rule.match_type || 'contains',
      category: rule.category || 'general',
      schedule_enabled: rule.schedule_enabled || false,
      schedule_start: rule.schedule_start || '09:00',
      schedule_end: rule.schedule_end || '17:00',
      active_days: rule.active_days || [1, 2, 3, 4, 5],
    });
    setShowModal(true);
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setForm(f => ({
      ...f,
      trigger_keyword: preset.trigger_keyword,
      response_text: preset.response_text,
      match_type: preset.match_type,
      category: preset.category,
      schedule_enabled: preset.schedule_enabled,
      schedule_start: preset.schedule_enabled ? (preset.schedule_start || '09:00') : f.schedule_start,
      schedule_end: preset.schedule_enabled ? (preset.schedule_end || '17:00') : f.schedule_end,
      active_days: preset.active_days || f.active_days,
    }));
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      active_days: f.active_days.includes(day)
        ? f.active_days.filter(d => d !== day)
        : [...f.active_days, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!form.session_id || !form.response_text) {
      setError('Please select a session and enter a response');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingRule ? 'PUT' : 'POST';
      const payload = editingRule ? { id: editingRule.id, ...form } : form;

      const res = await fetch('/api/user/auto-replies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save auto-reply');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this auto-reply rule?')) return;
    try {
      const res = await fetch(`/api/user/auto-replies?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch {
      setError('Failed to delete');
    }
  };

  const handleToggle = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch('/api/user/auto-replies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch {
      setError('Failed to toggle');
    }
  };

  const getSessionName = (sessionId: string) =>
    sessions.find(s => s.id === sessionId)?.session_name || 'Unknown';

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Auto-Reply Templates</h1>
            <p className="text-gray-400 text-sm mt-1">
              Set up automatic responses for AFK, business hours, or keyword triggers
            </p>
          </div>
          <button
            onClick={openCreate}
            disabled={sessions.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Rule
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-lg mb-2">No bot sessions yet</p>
            <p className="text-gray-500 text-sm">
              Create a session first, then set up auto-replies.
            </p>
          </div>
        ) : rules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-xl p-10 text-center"
          >
            <p className="text-gray-400 text-lg mb-2">No auto-reply rules yet</p>
            <p className="text-gray-500 text-sm mb-6">
              Create rules to automatically respond when you&apos;re away or for common questions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.slice(0, 3).map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    openCreate();
                    setTimeout(() => applyPreset(preset), 100);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white/5 border rounded-xl p-5 transition-colors ${
                  rule.enabled ? 'border-white/10 hover:bg-white/[0.07]' : 'border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[rule.category] || categoryColors.general}`}>
                        {rule.category}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {getSessionName(rule.session_id)}
                      </span>
                      {rule.schedule_enabled && (
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <span>&#128337;</span>
                          {rule.schedule_start} - {rule.schedule_end}
                        </span>
                      )}
                    </div>
                    {rule.trigger_keyword && (
                      <p className="text-white text-sm mb-1">
                        <span className="text-gray-400">Trigger:</span>{' '}
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-green-400">
                          {rule.trigger_keyword}
                        </code>
                        <span className="text-gray-500 text-xs ml-2">({rule.match_type})</span>
                      </p>
                    )}
                    <p className="text-gray-300 text-sm truncate">{rule.response_text}</p>
                    {rule.schedule_enabled && rule.active_days && (
                      <div className="flex gap-1 mt-2">
                        {DAY_NAMES.map((day, idx) => (
                          <span
                            key={day}
                            className={`w-7 h-7 flex items-center justify-center rounded text-xs ${
                              rule.active_days.includes(idx)
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/5 text-gray-600'
                            }`}
                          >
                            {day[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        rule.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4">
                {editingRule ? 'Edit Auto-Reply' : 'New Auto-Reply'}
              </h2>

              {/* Presets */}
              {!editingRule && (
                <div className="mb-4">
                  <p className="text-gray-400 text-xs mb-2">Quick presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-gray-300 rounded text-xs transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Session */}
              <label className="block mb-3">
                <span className="text-gray-400 text-sm">Session</span>
                <select
                  value={form.session_id}
                  onChange={e => setForm(f => ({ ...f, session_id: e.target.value }))}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">Select a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.session_name}</option>
                  ))}
                </select>
              </label>

              {/* Category */}
              <label className="block mb-3">
                <span className="text-gray-400 text-sm">Category</span>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as typeof f.category }))}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="general">General</option>
                  <option value="afk">AFK / Away</option>
                  <option value="business">Business Hours</option>
                  <option value="greeting">Greeting</option>
                </select>
              </label>

              {/* Trigger */}
              <label className="block mb-3">
                <span className="text-gray-400 text-sm">Trigger keyword (leave empty for catch-all)</span>
                <input
                  value={form.trigger_keyword}
                  onChange={e => setForm(f => ({ ...f, trigger_keyword: e.target.value }))}
                  placeholder="e.g. hello, price, help"
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </label>

              {/* Match type */}
              <label className="block mb-3">
                <span className="text-gray-400 text-sm">Match type</span>
                <select
                  value={form.match_type}
                  onChange={e => setForm(f => ({ ...f, match_type: e.target.value as typeof f.match_type }))}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="contains">Contains keyword</option>
                  <option value="exact">Exact match</option>
                </select>
              </label>

              {/* Response */}
              <label className="block mb-3">
                <span className="text-gray-400 text-sm">Response message</span>
                <textarea
                  value={form.response_text}
                  onChange={e => setForm(f => ({ ...f, response_text: e.target.value }))}
                  placeholder="The message to send back..."
                  rows={3}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
                />
              </label>

              {/* Schedule toggle */}
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.schedule_enabled}
                  onChange={e => setForm(f => ({ ...f, schedule_enabled: e.target.checked }))}
                  className="accent-green-500"
                />
                <span className="text-gray-300 text-sm">Enable schedule (only active during set hours)</span>
              </label>

              {/* Schedule settings */}
              {form.schedule_enabled && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-gray-400 text-xs">Start time</span>
                      <input
                        type="time"
                        value={form.schedule_start}
                        onChange={e => setForm(f => ({ ...f, schedule_start: e.target.value }))}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-gray-400 text-xs">End time</span>
                      <input
                        type="time"
                        value={form.schedule_end}
                        onChange={e => setForm(f => ({ ...f, schedule_end: e.target.value }))}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Active days</span>
                    <div className="flex gap-1.5 mt-1">
                      {DAY_NAMES.map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(idx)}
                          className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                            form.active_days.includes(idx)
                              ? 'bg-green-600 text-white'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving...' : editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
