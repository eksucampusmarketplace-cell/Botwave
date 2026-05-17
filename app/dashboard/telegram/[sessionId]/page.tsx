'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

type Tab = 'config' | 'notes' | 'filters' | 'modlog' | 'xp' | 'scheduled';

interface Note { name: string; content: string; created_at: string; }
interface Filter { keyword: string; response: string; created_at: string; }
interface ModLog { action_type: string; target_user_id: string; reason: string; admin_user_id: string; created_at: string; }
interface XpEntry { user_id: string; xp: number; level: number; }
interface ScheduledMsg { id: string; chat_id: string; message: string; scheduled_at: string; status: string; }

export default function TelegramConfigPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Config state
  const [config, setConfig] = useState({
    antiflood_enabled: false,
    antilink_enabled: false,
    antiraid_enabled: false,
    night_mode_enabled: false,
    captcha_enabled: false,
    welcome_text: '',
    goodbye_text: '',
    antiraid_threshold: 15,
    antiraid_mode: 'restrict',
    antiraid_duration_mins: 15,
    log_channel_id: '',
    blacklist_mode: 'delete',
  });

  // Data state
  const [notes, setNotes] = useState<Note[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [modlog, setModlog] = useState<ModLog[]>([]);
  const [xpData, setXpData] = useState<XpEntry[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>([]);

  // Form state
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFilterKeyword, setNewFilterKeyword] = useState('');
  const [newFilterResponse, setNewFilterResponse] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/config?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(prev => ({ ...prev, ...data.data }));
      }
    } catch { setError('Failed to load config'); }
    setLoading(false);
  }, [sessionId]);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/telegram/notes?sessionId=${sessionId}`);
    const data = await res.json();
    if (data.success) setNotes(data.data || []);
  }, [sessionId]);

  const fetchFilters = useCallback(async () => {
    const res = await fetch(`/api/telegram/filters?sessionId=${sessionId}`);
    const data = await res.json();
    if (data.success) setFilters(data.data || []);
  }, [sessionId]);

  const fetchModlog = useCallback(async () => {
    const res = await fetch(`/api/telegram/modlog?sessionId=${sessionId}`);
    const data = await res.json();
    if (data.success) setModlog(data.data || []);
  }, [sessionId]);

  const fetchXP = useCallback(async () => {
    const res = await fetch(`/api/telegram/xp/leaderboard?sessionId=${sessionId}`);
    const data = await res.json();
    if (data.success) setXpData(data.data || []);
  }, [sessionId]);

  const fetchScheduled = useCallback(async () => {
    const res = await fetch(`/api/telegram/scheduled?sessionId=${sessionId}`);
    const data = await res.json();
    if (data.success) setScheduled(data.data || []);
  }, [sessionId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    switch (activeTab) {
      case 'notes': fetchNotes(); break;
      case 'filters': fetchFilters(); break;
      case 'modlog': fetchModlog(); break;
      case 'xp': fetchXP(); break;
      case 'scheduled': fetchScheduled(); break;
    }
  }, [activeTab, fetchNotes, fetchFilters, fetchModlog, fetchXP, fetchScheduled]);

  const saveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...config }),
      });
      const data = await res.json();
      if (data.success) setSuccess('Settings saved!');
      else setError('Failed to save');
    } catch { setError('Error saving settings'); }
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const addNote = async () => {
    if (!newNoteName || !newNoteContent) return;
    await fetch('/api/telegram/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, name: newNoteName, content: newNoteContent }),
    });
    setNewNoteName('');
    setNewNoteContent('');
    fetchNotes();
  };

  const deleteNote = async (name: string) => {
    await fetch(`/api/telegram/notes?sessionId=${sessionId}&name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    fetchNotes();
  };

  const addFilter = async () => {
    if (!newFilterKeyword || !newFilterResponse) return;
    await fetch('/api/telegram/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, keyword: newFilterKeyword, response: newFilterResponse }),
    });
    setNewFilterKeyword('');
    setNewFilterResponse('');
    fetchFilters();
  };

  const deleteFilter = async (keyword: string) => {
    await fetch(`/api/telegram/filters?sessionId=${sessionId}&keyword=${encodeURIComponent(keyword)}`, { method: 'DELETE' });
    fetchFilters();
  };

  const resetXP = async () => {
    if (!confirm('Reset all XP data? This cannot be undone.')) return;
    await fetch('/api/telegram/xp/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    fetchXP();
  };

  const deleteScheduled = async (id: string) => {
    await fetch(`/api/telegram/scheduled?sessionId=${sessionId}&id=${id}`, { method: 'DELETE' });
    fetchScheduled();
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'config', label: 'Settings', icon: '⚙️' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'filters', label: 'Filters', icon: '🔍' },
    { id: 'modlog', label: 'Mod Log', icon: '📋' },
    { id: 'xp', label: 'XP', icon: '⭐' },
    { id: 'scheduled', label: 'Scheduled', icon: '⏰' },
  ];

  const inputStyle = { background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' };

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <DashboardNav />
        <div className="pt-24 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="pt-24 px-4 md:px-8 max-w-5xl mx-auto pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
            Telegram <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Config</span>
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Session: {sessionId?.toString().slice(0, 8)}...
          </p>
        </motion.div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">{success}</div>}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'bg-blue-600 text-white' : ''
              }`}
              style={activeTab !== t.id ? { background: 'var(--card-bg)', color: 'var(--text-secondary)' } : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Protection</h2>
              {[
                { key: 'antiflood_enabled', label: 'Anti-Flood', desc: 'Rate limit messages' },
                { key: 'antilink_enabled', label: 'Anti-Link', desc: 'Remove unauthorized links' },
                { key: 'antiraid_enabled', label: 'Anti-Raid', desc: 'Detect mass joins' },
                { key: 'night_mode_enabled', label: 'Night Mode', desc: 'Restrict messages at night' },
                { key: 'captcha_enabled', label: 'Captcha', desc: 'Verify new members' },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.desc}</div>
                  </div>
                  <button onClick={() => setConfig(c => ({ ...c, [f.key]: !c[f.key as keyof typeof c] }))}
                    className={`w-12 h-7 rounded-full transition-colors ${config[f.key as keyof typeof config] ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config[f.key as keyof typeof config] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Anti-Raid Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Threshold (joins/min)</label>
                  <input type="number" value={config.antiraid_threshold} min={1}
                    onChange={e => setConfig(c => ({ ...c, antiraid_threshold: parseInt(e.target.value) || 15 }))}
                    className="w-full p-2 rounded-xl text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Mode</label>
                  <select value={config.antiraid_mode}
                    onChange={e => setConfig(c => ({ ...c, antiraid_mode: e.target.value }))}
                    className="w-full p-2 rounded-xl text-sm" style={inputStyle}>
                    <option value="restrict">Restrict</option>
                    <option value="ban">Ban</option>
                    <option value="captcha">Captcha</option>
                    <option value="lockdown">Lockdown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Duration (min)</label>
                  <input type="number" value={config.antiraid_duration_mins} min={1}
                    onChange={e => setConfig(c => ({ ...c, antiraid_duration_mins: parseInt(e.target.value) || 15 }))}
                    className="w-full p-2 rounded-xl text-sm" style={inputStyle} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Messages</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Welcome Message</label>
                  <textarea value={config.welcome_text || ''} rows={3}
                    onChange={e => setConfig(c => ({ ...c, welcome_text: e.target.value }))}
                    className="w-full p-3 rounded-xl text-sm resize-none" style={inputStyle}
                    placeholder="Welcome {name} to {group}!" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Goodbye Message</label>
                  <textarea value={config.goodbye_text || ''} rows={2}
                    onChange={e => setConfig(c => ({ ...c, goodbye_text: e.target.value }))}
                    className="w-full p-3 rounded-xl text-sm resize-none" style={inputStyle}
                    placeholder="{name} has left the group." />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Log Channel ID</label>
                  <input type="text" value={config.log_channel_id || ''}
                    onChange={e => setConfig(c => ({ ...c, log_channel_id: e.target.value }))}
                    className="w-full p-2 rounded-xl text-sm" style={inputStyle}
                    placeholder="-1001234567890" />
                </div>
              </div>
            </div>

            <button onClick={saveConfig} disabled={saving}
              className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Saved Notes ({notes.length})</h2>
              {notes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>#{n.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{n.content?.slice(0, 60)}...</div>
                      </div>
                      <button onClick={() => deleteNote(n.name)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Add Note</h3>
              <input type="text" value={newNoteName} onChange={e => setNewNoteName(e.target.value)}
                placeholder="Note name" className="w-full p-2 rounded-xl text-sm mb-3" style={inputStyle} />
              <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Note content..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={inputStyle} />
              <button onClick={addNote} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Note</button>
            </div>
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Active Filters ({filters.length})</h2>
              {filters.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No filters yet.</p>
              ) : (
                <div className="space-y-2">
                  {filters.map(f => (
                    <div key={f.keyword} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.keyword}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.response?.slice(0, 60)}...</div>
                      </div>
                      <button onClick={() => deleteFilter(f.keyword)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Add Filter</h3>
              <input type="text" value={newFilterKeyword} onChange={e => setNewFilterKeyword(e.target.value)}
                placeholder="Keyword" className="w-full p-2 rounded-xl text-sm mb-3" style={inputStyle} />
              <textarea value={newFilterResponse} onChange={e => setNewFilterResponse(e.target.value)}
                placeholder="Response..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={inputStyle} />
              <button onClick={addFilter} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Filter</button>
            </div>
          </div>
        )}

        {/* Mod Log Tab */}
        {activeTab === 'modlog' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Moderation Log ({modlog.length})</h2>
            {modlog.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No moderation actions yet.</p>
            ) : (
              <div className="space-y-2">
                {modlog.map((l, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l.action_type}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Target: {l.target_user_id} | Admin: {l.admin_user_id} | {l.reason || 'No reason'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* XP Tab */}
        {activeTab === 'xp' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>XP Leaderboard</h2>
              {xpData.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No XP data yet.</p>
              ) : (
                <div className="space-y-2">
                  {xpData.map((u, i) => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`}</span>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>User {u.user_id}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Level {u.level || 1}</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{u.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={resetXP} className="w-full p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
              Reset All XP
            </button>
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Scheduled Messages ({scheduled.length})</h2>
            {scheduled.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No scheduled messages.</p>
            ) : (
              <div className="space-y-2">
                {scheduled.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.message?.slice(0, 50)}...</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(m.scheduled_at).toLocaleString()} | {m.status}
                      </div>
                    </div>
                    <button onClick={() => deleteScheduled(m.id)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
