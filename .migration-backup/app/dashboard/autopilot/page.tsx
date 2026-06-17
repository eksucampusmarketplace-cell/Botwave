'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

interface AutopilotData {
  enabled: boolean;
  mode: string;
  selfDescription: string;
  styleProfile: Record<string, unknown> | null;
  sampleCount: number;
  replyDelayMinutes: number;
  inactivityMinutes: number;
  maxDailyReplies: number;
  dailyRepliesUsed: number;
  lastSyncAt: string | null;
  contactOverrides: Record<string, string>;
}

interface SessionEntry {
  session_id: string;
  enabled: boolean;
  mode: string;
  status?: string;
}

export default function AutopilotPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [data, setData] = useState<AutopilotData | null>(null);

  // Editable fields
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState('offline');
  const [selfDescription, setSelfDescription] = useState('');
  const [replyDelay, setReplyDelay] = useState(3);
  const [inactivityMin, setInactivityMin] = useState(5);
  const [maxDaily, setMaxDaily] = useState(30);
  const [contactOverrides, setContactOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) { window.location.href = '/login'; return; }
        }
      } catch {
        console.warn('[Autopilot] Auth check failed (network error) - staying on page');
      }

      // Fetch sessions
      try {
        const res = await fetch('/api/user/autopilot');
        const json = await res.json();
        if (json.sessions) {
          setSessions(json.sessions);
          if (json.sessions.length > 0) {
            setSelectedSession(json.sessions[0].session_id);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, []);

  const fetchSessionData = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/user/autopilot?sessionId=${sessionId}`);
      const json = await res.json();
      setData(json);
      setEnabled(json.enabled ?? false);
      setMode(json.mode ?? 'offline');
      setSelfDescription(json.selfDescription ?? '');
      setReplyDelay(json.replyDelayMinutes ?? 3);
      setInactivityMin(json.inactivityMinutes ?? 5);
      setMaxDaily(json.maxDailyReplies ?? 30);
      setContactOverrides(json.contactOverrides ?? {});
    } catch {
      setError('Failed to load autopilot data');
    }
  }, []);

  useEffect(() => {
    if (selectedSession) fetchSessionData(selectedSession);
  }, [selectedSession, fetchSessionData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/user/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          enabled,
          mode,
          selfDescription,
          replyDelayMinutes: replyDelay,
          inactivityMinutes: inactivityMin,
          maxDailyReplies: maxDaily,
          contactOverrides,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const toggleContactOverride = (jid: string) => {
    const current = contactOverrides[jid];
    const updated = { ...contactOverrides };
    if (!current || current === 'default') {
      updated[jid] = 'off';
    } else if (current === 'off') {
      updated[jid] = 'on';
    } else {
      delete updated[jid]; // back to default
    }
    setContactOverrides(updated);
  };

  const profileSummary = data?.styleProfile
    ? `${(data.styleProfile as Record<string, unknown>).formality ?? '?'} • ${(data.styleProfile as Record<string, unknown>).primaryLanguage ?? '?'} • emoji: ${(data.styleProfile as Record<string, unknown>).emojiFrequency ?? '?'}`
    : null;

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-4xl mx-auto relative z-10 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">AI Autopilot</h1>
          <p className="text-gray-400">Your AI clone that chats as you when you&apos;re away</p>
        </motion.div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-dark-lighter rounded-xl border border-gray-800 p-8 text-center">
            <p className="text-gray-400 mb-2">No active sessions found.</p>
            <p className="text-gray-500 text-sm">Connect a WhatsApp session first, then configure autopilot here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session selector */}
            {sessions.length > 1 && (
              <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  {sessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>{s.session_id}{s.status ? ` (${s.status})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Enable toggle + mode */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Autopilot Status</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {enabled ? 'Your AI clone is active' : 'Autopilot is off'}
                    {data ? ` • ${data.dailyRepliesUsed}/${maxDaily} replies today` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['offline', 'always', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mode === m ? 'bg-purple-600 text-white' : 'bg-dark border border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {m === 'offline' ? '🌙 Offline Only' : m === 'always' ? '⚡ Always On' : '🎛️ Manual'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {mode === 'offline' && 'Replies only when you haven\'t sent a message in a while'}
                {mode === 'always' && 'Replies to all DMs even when you\'re online'}
                {mode === 'manual' && 'Same as always - toggle on/off explicitly'}
              </p>
            </motion.div>

            {/* Persona profile */}
            <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Persona Profile</h2>
              {data?.styleProfile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-300">Profile active - {data.sampleCount} messages analyzed</span>
                  </div>
                  <p className="text-gray-400 text-sm">{profileSummary}</p>
                  {data.lastSyncAt && (
                    <p className="text-gray-500 text-xs">Last synced: {new Date(data.lastSyncAt).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">
                  <p>No persona profile yet.</p>
                  <p className="text-sm text-gray-500 mt-1">Send at least 15 messages on WhatsApp, then run <code className="text-purple-400">!autopilot sync</code></p>
                </div>
              )}
            </div>

            {/* Self description */}
            <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Self Description</h2>
              <p className="text-sm text-gray-400 mb-4">Tell the AI about your personality, vibe, interests, and how you talk</p>
              <textarea
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
                placeholder="I'm a chill Nigerian guy, I speak pidgin mixed with English, I'm sarcastic but friendly..."
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 min-h-[120px] resize-y"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">{selfDescription.length}/2000</p>
            </div>

            {/* Timing settings */}
            <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Timing & Limits</h2>
              <div className="space-y-6">
                <div>
                  <label className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Inactivity trigger</span>
                    <span className="text-purple-400">{inactivityMin} min</span>
                  </label>
                  <input
                    type="range" min={1} max={60} value={inactivityMin}
                    onChange={(e) => setInactivityMin(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long without sending a message before autopilot considers you away</p>
                </div>

                <div>
                  <label className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Reply delay base</span>
                    <span className="text-purple-400">{replyDelay} min</span>
                  </label>
                  <input
                    type="range" min={1} max={30} value={replyDelay}
                    onChange={(e) => setReplyDelay(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Base delay before replying (actual timing: weighted 1-7 min with jitter)</p>
                </div>

                <div>
                  <label className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Daily reply limit</span>
                    <span className="text-purple-400">{maxDaily}</span>
                  </label>
                  <input
                    type="range" min={5} max={200} step={5} value={maxDaily}
                    onChange={(e) => setMaxDaily(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum auto-replies per day. Resets at midnight.</p>
                </div>
              </div>
            </div>

            {/* Per-contact overrides */}
            <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Per-Contact Settings</h2>
              <p className="text-sm text-gray-400 mb-4">Override autopilot for specific contacts. Click to cycle: default → off → on → default</p>

              {Object.keys(contactOverrides).length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No per-contact overrides set. Use <code className="text-purple-400">!autopilot on/off @person</code> on WhatsApp or add them here.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(contactOverrides).map(([jid, status]) => (
                    <div key={jid} className="flex items-center justify-between bg-dark rounded-lg px-4 py-3 border border-gray-700">
                      <div>
                        <span className="text-white text-sm">{jid.split('@')[0]}</span>
                      </div>
                      <button
                        onClick={() => toggleContactOverride(jid)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          status === 'on' ? 'bg-green-500/20 text-green-400' :
                          status === 'off' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {status === 'on' ? '🟢 ON' : status === 'off' ? '🔴 OFF' : '⚪ Global'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Features info */}
            <div className="bg-dark-lighter rounded-xl border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-3">Built-in Features</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['🧠', '40+ persona dimensions'],
                  ['💬', 'Message batching'],
                  ['👀', 'Read receipt simulation'],
                  ['⌨️', 'Typing indicator'],
                  ['😤', 'Mood-adaptive replies'],
                  ['🕐', 'Time-of-day personality'],
                  ['📞', 'Smart call/VN decline'],
                  ['🤝', 'Per-contact relationships'],
                  ['🔄', 'Daily auto-sync'],
                  ['🛡️', 'Anti-ban safe delays'],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-2 text-gray-400">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {saved && <span className="text-green-400 text-sm">Settings saved!</span>}
              {error && <span className="text-red-400 text-sm">{error}</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
