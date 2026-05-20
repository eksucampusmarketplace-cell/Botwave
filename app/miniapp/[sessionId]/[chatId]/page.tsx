'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface UserInfo {
  role: 'admin' | 'member';
  userId: number;
  firstName: string;
  username: string;
}

// eslint-disable-next-line
type GroupConfig = Record<string, any>;

type MemberTab = 'profile' | 'rules' | 'leaderboard' | 'games';
type AdminTab = 'general' | 'protection' | 'features' | 'prohibitions' | 'limits' | 'memberships' | 'texts' | 'notes' | 'filters' | 'modlog';

const PENALTY_OPTIONS = [
  { value: 'warn', label: 'Warn' },
  { value: 'mute', label: 'Mute' },
  { value: 'ban', label: 'Ban' },
  { value: 'kick', label: 'Kick' },
];

export default function MiniAppPage() {
  const { sessionId, chatId } = useParams<{ sessionId: string; chatId: string }>();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<GroupConfig>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [memberTab, setMemberTab] = useState<MemberTab>('rules');
  const [adminTab, setAdminTab] = useState<AdminTab>('general');
  const [xpData, setXpData] = useState<Array<{ user_id: string; xp: number; level: number }>>([]);
  const [notes, setNotes] = useState<Array<{ name: string; content: string }>>([]);
  const [filters, setFilters] = useState<Array<{ keyword: string; response: string }>>([]);
  const [modlog, setModlog] = useState<Array<{ action_type: string; target_user_id: string; admin_user_id: string; reason: string; created_at: string }>>([]);
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFilterKeyword, setNewFilterKeyword] = useState('');
  const [newFilterResponse, setNewFilterResponse] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configLoadedRef = useRef(false);

  const authenticate = useCallback(async () => {
    try {
      // Get Telegram WebApp initData
      const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
      const initData = tg?.initData;

      if (!initData) {
        setError('This page must be opened from Telegram');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/miniapp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, sessionId, chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setUser({ role: data.role, userId: data.userId, firstName: data.firstName, username: data.username });
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Failed to authenticate');
    }
    setLoading(false);
  }, [sessionId, chatId]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/group-config?sessionId=${sessionId}&chatId=${chatId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        configLoadedRef.current = true;
      }
    } catch {}
  }, [sessionId, chatId]);

  const fetchXP = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/xp/leaderboard?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setXpData(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/notes?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setNotes(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/filters?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setFilters(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchModlog = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/modlog?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setModlog(data.data || []);
    } catch {}
  }, [sessionId]);

  const addNote = async () => {
    if (!newNoteName.trim()) return;
    await fetch('/api/telegram/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, name: newNoteName, content: newNoteContent }) });
    setNewNoteName(''); setNewNoteContent(''); fetchNotes();
  };

  const deleteNote = async (name: string) => {
    await fetch(`/api/telegram/notes?sessionId=${sessionId}&name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    fetchNotes();
  };

  const addFilter = async () => {
    if (!newFilterKeyword.trim()) return;
    await fetch('/api/telegram/filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, keyword: newFilterKeyword, response: newFilterResponse }) });
    setNewFilterKeyword(''); setNewFilterResponse(''); fetchFilters();
  };

  const deleteFilter = async (keyword: string) => {
    await fetch(`/api/telegram/filters?sessionId=${sessionId}&keyword=${encodeURIComponent(keyword)}`, { method: 'DELETE' });
    fetchFilters();
  };

  useEffect(() => { authenticate(); }, [authenticate]);
  useEffect(() => {
    if (user) {
      fetchConfig();
      fetchXP();
      if (user.role === 'admin') {
        fetchNotes();
        fetchFilters();
        fetchModlog();
      }
    }
  }, [user, fetchConfig, fetchXP, fetchNotes, fetchFilters, fetchModlog]);

  const saveConfig = async (isAutoSave = false) => {
    if (isAutoSave) setAutoSaveStatus('saving');
    else { setSaving(true); setError(''); setSuccess(''); }
    try {
      const res = await fetch('/api/telegram/group-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId, ...config }),
      });
      const data = await res.json();
      if (data.success) {
        if (isAutoSave) { setAutoSaveStatus('saved'); setTimeout(() => setAutoSaveStatus('idle'), 2000); }
        else setSuccess('Saved!');
      } else {
        if (isAutoSave) setAutoSaveStatus('error');
        else setError(data.error || 'Failed to save');
      }
    } catch {
      if (isAutoSave) setAutoSaveStatus('error');
      else setError('Error saving');
    }
    if (!isAutoSave) { setSaving(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const updateConfig = (key: string, value: unknown) => setConfig(prev => ({ ...prev, [key]: value }));

  // Auto-save with 2-second debounce
  useEffect(() => {
    if (!configLoadedRef.current || !autoSaveEnabled || !user || user.role !== 'admin') return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('pending');
    autoSaveTimerRef.current = setTimeout(() => { saveConfig(true); }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const Toggle = ({ configKey, label, desc }: { configKey: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0 border-gray-700">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-white">{label}</div>
        {desc && <div className="text-xs mt-0.5 text-gray-400">{desc}</div>}
      </div>
      <button onClick={() => updateConfig(configKey, !config[configKey])}
        className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 ${config[configKey] ? 'bg-blue-600' : 'bg-gray-600'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config[configKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const NumberInput = ({ configKey, label, desc, min = 0, max }: { configKey: string; label: string; desc?: string; min?: number; max?: number }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      {desc && <div className="text-xs mb-2 text-gray-500">{desc}</div>}
      <input type="number" value={config[configKey] || 0} min={min} max={max}
        onChange={e => updateConfig(configKey, parseInt(e.target.value) || 0)}
        className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600" />
    </div>
  );

  const TextArea = ({ configKey, label, desc, placeholder, rows = 3 }: { configKey: string; label: string; desc?: string; placeholder?: string; rows?: number }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      {desc && <div className="text-xs mb-2 text-gray-500">{desc}</div>}
      <textarea value={config[configKey] || ''} rows={rows} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-3 rounded-xl text-sm resize-none bg-gray-800 text-white border border-gray-600" placeholder={placeholder} />
    </div>
  );

  const SelectInput = ({ configKey, label, desc, options }: { configKey: string; label: string; desc?: string; options: { value: string; label: string }[] }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      {desc && <div className="text-xs mb-2 text-gray-500">{desc}</div>}
      <select value={config[configKey] || options[0]?.value} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const TextInput = ({ configKey, label, desc, placeholder }: { configKey: string; label: string; desc?: string; placeholder?: string }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      {desc && <div className="text-xs mb-2 text-gray-500">{desc}</div>}
      <input type="text" value={config[configKey] || ''} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600" placeholder={placeholder} />
    </div>
  );

  const TimeInput = ({ configKey, label }: { configKey: string; label: string }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      <input type="time" value={config[configKey] || '00:00'} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600" />
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-4 mb-4 bg-gray-800/50">
      <h3 className="text-base font-bold mb-3 text-white">{title}</h3>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Member view
  if (user?.role === 'member') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <h1 className="text-lg font-bold">BotWave</h1>
          <p className="text-xs text-gray-400">Welcome, {user.firstName}</p>
        </div>

        <div className="flex gap-1 p-2 bg-gray-800/50">
          {([['rules', 'Rules'], ['leaderboard', 'Leaderboard'], ['games', 'Games'], ['profile', 'Profile']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setMemberTab(id)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${memberTab === id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {memberTab === 'rules' && (
            <SectionCard title="Group Rules">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {config.rules_text || config.custom_rules_text || 'No rules have been set for this group.'}
              </p>
            </SectionCard>
          )}

          {memberTab === 'leaderboard' && (
            <SectionCard title="XP Leaderboard">
              {xpData.length === 0 ? (
                <p className="text-sm text-gray-400">No XP data yet.</p>
              ) : (
                <div className="space-y-2">
                  {xpData.slice(0, 20).map((u, i) => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white">{i + 1}.</span>
                        <div>
                          <div className="text-sm font-medium text-white">User {u.user_id}</div>
                          <div className="text-xs text-gray-400">Level {u.level || 1}</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{u.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {memberTab === 'games' && (
            <SectionCard title="Mini Games">
              <p className="text-sm text-gray-400">
                {config.games_enabled ? 'Games are enabled in this group! Use /trivia, /hangman, /wordchain in the chat.' : 'Games are not enabled in this group.'}
              </p>
            </SectionCard>
          )}

          {memberTab === 'profile' && (
            <SectionCard title="Your Profile">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Name</span>
                  <span className="text-white">{user.firstName}</span>
                </div>
                {user.username && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Username</span>
                    <span className="text-white">@{user.username}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User ID</span>
                  <span className="text-white">{user.userId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Role</span>
                  <span className="text-blue-400">Member</span>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">BotWave <span className="text-blue-400">Admin</span></h1>
            <p className="text-xs text-gray-400">Group Admin Panel</p>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveStatus === 'pending' && <span className="text-xs text-yellow-400">Unsaved</span>}
            {autoSaveStatus === 'saving' && <span className="text-xs text-blue-400">Saving...</span>}
            {autoSaveStatus === 'saved' && <span className="text-xs text-green-400">Saved</span>}
            {autoSaveStatus === 'error' && <span className="text-xs text-red-400">Save failed</span>}
            <button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`text-xs px-2 py-1 rounded-lg ${autoSaveEnabled ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
              {autoSaveEnabled ? 'Auto' : 'Manual'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
      {success && <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">{success}</div>}

      <div className="flex gap-1 p-2 bg-gray-800/50 overflow-x-auto">
        {([['general', 'General'], ['protection', 'Protection'], ['features', 'Features'], ['prohibitions', 'Prohibitions'], ['limits', 'Limits'], ['memberships', 'Memberships'], ['texts', 'Texts'], ['notes', 'Notes'], ['filters', 'Filters'], ['modlog', 'Mod Log']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAdminTab(id)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${adminTab === id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {adminTab === 'general' && (
          <>
            <SectionCard title="Welcome & Rules">
              <Toggle configKey="welcome_enabled" label="Welcome Message" desc="Greet new members." />
              <Toggle configKey="rules_enabled" label="Rules" desc="Enable group rules." />
              <Toggle configKey="admonition_enabled" label="Admonition Message" desc="Send admonition when users violate rules." />
              <Toggle configKey="goodbye_enabled" label="Goodbye Message" />
              <Toggle configKey="clean_welcome" label="Auto-delete old welcome" desc="Remove previous welcome messages." />
            </SectionCard>
            <SectionCard title="Language & Timezone">
              <SelectInput configKey="bot_language" label="Language" options={[
                { value: 'en', label: 'English' }, { value: 'fa', label: 'Farsi' },
                { value: 'ar', label: 'Arabic' }, { value: 'tr', label: 'Turkish' },
                { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' }, { value: 'ru', label: 'Russian' },
              ]} />
              <SelectInput configKey="timezone" label="Timezone" desc="Timings calculated based on this timezone." options={[
                { value: 'UTC', label: 'UTC' }, { value: 'US/Eastern', label: 'US/Eastern' },
                { value: 'US/Pacific', label: 'US/Pacific' }, { value: 'Europe/London', label: 'Europe/London' },
                { value: 'Europe/Berlin', label: 'Europe/Berlin' }, { value: 'Asia/Tehran', label: 'Asia/Tehran' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai' }, { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
                { value: 'Africa/Lagos', label: 'Africa/Lagos' },
              ]} />
            </SectionCard>
            <SectionCard title="Bot Behavior">
              <Toggle configKey="noiseless_mode" label="Noiseless Mode" desc="Bot messages sent silently." />
              <Toggle configKey="auto_delete_bot_msgs" label="Auto-delete bot messages" desc="Automatically delete bot messages." />
              {config.auto_delete_bot_msgs && (
                <NumberInput configKey="auto_delete_minutes" label="Delete after (minutes)" min={1} max={1440} />
              )}
              <Toggle configKey="check_admin_violations" label="Check admin violations" desc="Apply rules to admins." />
              <Toggle configKey="verify_user_realness" label="Verify user realness" desc="Members must verify by tapping a button." />
              <Toggle configKey="ignore_public_commands" label="Ignore public commands" desc="Restrict regular members from info commands." />
              <Toggle configKey="remove_join_leave_notifs" label="Remove join/leave notifications" />
            </SectionCard>
            <SectionCard title="Warnings">
              <Toggle configKey="warnings_enabled" label="Warning System" desc="Count violations as warnings." />
              {config.warnings_enabled && (
                <>
                  <NumberInput configKey="max_warnings" label="Max Warnings" desc="Restrict user after reaching this." min={1} max={100} />
                  <NumberInput configKey="warning_keep_days" label="Keep warnings (days)" min={1} max={365} />
                  <SelectInput configKey="default_violation_penalty" label="Default violation penalty" options={PENALTY_OPTIONS} />
                </>
              )}
            </SectionCard>
            <SectionCard title="Admin Settings">
              <Toggle configKey="anon_admin" label="Anonymous Admin" desc="Allow anon admins to use all commands." />
              <Toggle configKey="admin_error_messages" label="Admin Error Messages" desc="Error msgs when non-admins use admin commands." />
              <TextInput configKey="log_channel_id" label="Log Channel ID" placeholder="-1001234567890" desc="Channel for moderation logs." />
            </SectionCard>
            <SectionCard title="XP System">
              <Toggle configKey="xp_enabled" label="XP System" desc="Members earn XP by chatting." />
            </SectionCard>
          </>
        )}

        {adminTab === 'protection' && (
          <>
            <SectionCard title="Anti-Flood">
              <Toggle configKey="antiflood_enabled" label="Anti-Flood" desc="Take action on users sending too many messages." />
              {config.antiflood_enabled && (
                <>
                  <NumberInput configKey="antiflood_max_per_min" label="Max messages per minute" min={1} max={100} />
                  <SelectInput configKey="antiflood_action" label="Flood action" options={PENALTY_OPTIONS} />
                  <NumberInput configKey="antiflood_timed_count" label="Timed flood count" desc="Messages in timed window (0 = disabled)" min={0} />
                  <NumberInput configKey="antiflood_timed_duration_secs" label="Timed flood window (seconds)" min={0} />
                  <Toggle configKey="antiflood_clear_messages" label="Clear flood messages" desc="Delete messages that triggered the flood." />
                </>
              )}
            </SectionCard>
            <SectionCard title="Anti-Raid">
              <Toggle configKey="antiraid_enabled" label="Anti-Raid" desc="Temporarily ban new joins during a raid." />
              {config.antiraid_enabled && (
                <>
                  <NumberInput configKey="antiraid_threshold" label="Threshold (joins/min)" min={1} />
                  <SelectInput configKey="antiraid_mode" label="Mode" options={[
                    { value: 'restrict', label: 'Restrict' }, { value: 'ban', label: 'Ban' },
                    { value: 'captcha', label: 'Captcha' }, { value: 'lockdown', label: 'Lockdown' },
                  ]} />
                  <NumberInput configKey="antiraid_duration_mins" label="Duration (minutes)" min={1} />
                  <TextInput configKey="antiraid_time" label="Raid time" placeholder="6h" desc="Duration for antiraid mode." />
                  <TextInput configKey="antiraid_action_time" label="Raid action time" placeholder="1h" desc="How long new joiners are temp-banned." />
                  <NumberInput configKey="auto_antiraid_threshold" label="Auto antiraid threshold" desc="Joins/min to auto-enable. 0 = disabled." min={0} />
                </>
              )}
            </SectionCard>
            <SectionCard title="Anti-Link">
              <Toggle configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links." />
              {config.antilink_enabled && (
                <TextArea configKey="antilink_whitelist" label="Whitelisted domains" desc="One per line." placeholder={"youtube.com\ngoogle.com"} rows={3} />
              )}
            </SectionCard>
            <SectionCard title="Night Mode">
              <Toggle configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              {config.night_mode_enabled && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <TimeInput configKey="night_mode_start" label="Start Time" />
                  <TimeInput configKey="night_mode_end" label="End Time" />
                </div>
              )}
            </SectionCard>
            <SectionCard title="Slow Mode">
              <Toggle configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode." />
              {config.slowmode_enabled && (
                <NumberInput configKey="slowmode_seconds" label="Delay (seconds)" desc="Min seconds between messages per user." min={0} max={86400} />
              )}
            </SectionCard>
            <SectionCard title="CAPTCHA">
              <Toggle configKey="captcha_enabled" label="CAPTCHA" desc="Verify new members with a challenge." />
              {config.captcha_enabled && (
                <>
                  <SelectInput configKey="captcha_mode" label="CAPTCHA Mode" options={[
                    { value: 'button', label: 'Button (click to verify)' },
                    { value: 'math', label: 'Math (solve equation)' },
                    { value: 'text', label: 'Text (type shown text)' },
                  ]} />
                  <Toggle configKey="captcha_rules" label="Require accepting rules" />
                  <Toggle configKey="captcha_kick" label="Kick unverified users" />
                  <TextInput configKey="captcha_kick_time" label="Kick time" placeholder="5m" desc="Time before kicking unverified users." />
                </>
              )}
            </SectionCard>
            <SectionCard title="Ban Ghosts">
              <Toggle configKey="ban_ghosts_enabled" label="Ban Ghosts" desc="Auto-ban deleted/deactivated accounts." />
            </SectionCard>
          </>
        )}

        {adminTab === 'features' && (
          <>
            <SectionCard title="Protection Features">
              <Toggle configKey="antiflood_enabled" label="Anti-Flood" desc="Rate-limit messages & auto-mute spammers." />
              <Toggle configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links." />
              <Toggle configKey="antiraid_enabled" label="Anti-Raid" desc="Auto-detect mass joins & lockdown." />
              <Toggle configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              <Toggle configKey="captcha_enabled" label="CAPTCHA" desc="Verify new members." />
              <Toggle configKey="ban_ghosts_enabled" label="Ban Ghosts" desc="Auto-ban deleted accounts." />
              <Toggle configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode." />
            </SectionCard>
            <SectionCard title="Community">
              <Toggle configKey="karma_enabled" label="Karma" desc="Upvote/downvote via +/- reply." />
              <Toggle configKey="votekick_enabled" label="VoteKick" desc="Community vote to kick users." />
              {config.votekick_enabled && (
                <>
                  <NumberInput configKey="votekick_required_votes" label="Required votes" min={2} max={50} />
                  <NumberInput configKey="votekick_timeout_secs" label="Vote timeout (seconds)" min={10} max={3600} />
                </>
              )}
              <Toggle configKey="mentionall_enabled" label="Mention All" desc="Allow /mentionall to ping all members." />
              <Toggle configKey="reports_enabled" label="Reports" desc="Users can report messages to admins." />
              <Toggle configKey="tickets_enabled" label="Tickets" desc="Support ticket system." />
            </SectionCard>
            <SectionCard title="Growth & Engagement">
              <Toggle configKey="memberbooster_enabled" label="MemberBooster" desc="Force add / channel join to send messages." />
              <Toggle configKey="booster_enabled" label="Group Booster" desc="Engagement prompts & growth tools." />
              <Toggle configKey="welcome_enabled" label="Welcome Bot" desc="Greet new members & say goodbye." />
              <Toggle configKey="join_approval_enabled" label="Join Approval" desc="Manual/auto-approve join requests." />
              <Toggle configKey="federation_enabled" label="Federation" desc="Cross-group ban sharing." />
            </SectionCard>
            <SectionCard title="AI & Smart Features">
              <Toggle configKey="ai_enabled" label="AI Chat" desc="AI /ask, /summarize, /translate." />
              <Toggle configKey="autoreply_enabled" label="Auto Reply" desc="Custom keyword triggers & responses." />
              <Toggle configKey="namehistory_enabled" label="Name History" desc="Track name/username changes." />
              <Toggle configKey="analytics_enabled" label="Analytics" desc="Message stats & activity tracking." />
            </SectionCard>
            <SectionCard title="Fun & Utility">
              <Toggle configKey="games_enabled" label="Mini Games" desc="Trivia, word scramble & math quiz." />
              <Toggle configKey="funextras_enabled" label="Fun Extras" desc="Roast, compliment, dare, truth, lyrics." />
              <Toggle configKey="texttools_enabled" label="Text Tools" desc="Reverse, mock, morse, leet, flip." />
              <Toggle configKey="quicktools_enabled" label="Quick Utils" desc="Password, UUID, calc, BMI, hash." />
              <Toggle configKey="profiletools_enabled" label="Profile Tools" desc="User profiles & member lookup." />
              <Toggle configKey="stickers_enabled" label="Sticker Maker" desc="Steal & manage sticker packs." />
              <Toggle configKey="polls_enabled" label="Polls & Quiz" desc="Create polls & quizzes." />
            </SectionCard>
            <SectionCard title="Media & Downloads">
              <Toggle configKey="mediadownload_enabled" label="Media Download" desc="Download from YT, TikTok, IG." />
              <Toggle configKey="mediatools_enabled" label="Media Tools" desc="QR codes, timestamps, encoding." />
              <Toggle configKey="imagetools_enabled" label="Image Tools" desc="File info, download, captions." />
              <Toggle configKey="infolookup_enabled" label="Info Lookup" desc="Crypto, IP, WHOIS, weather, npm." />
            </SectionCard>
            <SectionCard title="Moderation">
              <Toggle configKey="warnings_enabled" label="Warnings" desc="Track rule violations." />
              <SelectInput configKey="warn_action" label="Warning action" options={PENALTY_OPTIONS} />
              <NumberInput configKey="warn_limit" label="Warning limit" min={1} max={100} />
              <SelectInput configKey="blacklist_mode" label="Blacklist mode" desc="Action for blacklisted words." options={[
                { value: 'delete', label: 'Delete message' }, { value: 'warn', label: 'Warn user' },
                { value: 'mute', label: 'Mute user' }, { value: 'ban', label: 'Ban user' }, { value: 'kick', label: 'Kick user' },
              ]} />
            </SectionCard>
          </>
        )}

        {adminTab === 'prohibitions' && (
          <>
            <SectionCard title="Ads & Bots">
              <Toggle configKey="prohibit_unofficial_ads" label="Unofficial Telegram ads" desc="Block ads from unofficial apps." />
              <Toggle configKey="prohibit_bots_deletion" label="Bots deletion" desc="Remove bots added to group." />
              <Toggle configKey="prohibit_bot_inviter_removal" label="Bot inviter removal" desc="Remove users who invite bots." />
              <Toggle configKey="prohibit_userbots" label="Prohibition of user-bots" desc="Block userbot advertisements." />
            </SectionCard>
            <SectionCard title="Content Locks">
              <Toggle configKey="strict_mode" label="Strict mode" desc="Prevent unidentifiable content distribution." />
              <Toggle configKey="prohibit_porn_words" label="Pornographic words" />
              <Toggle configKey="prohibit_website_links" label="Website links" />
              <Toggle configKey="prohibit_telegram_links" label="Telegram links" />
              <Toggle configKey="prohibit_usernames" label="Usernames" />
              <Toggle configKey="prohibit_hashtags" label="Hashtags" />
              <Toggle configKey="prohibit_text" label="Text" />
              <Toggle configKey="prohibit_forwarding" label="Forwarding" />
              <Toggle configKey="prohibit_forward_channels" label="Forwarding from channels" />
              <Toggle configKey="prohibit_pictures" label="Pictures" />
              <Toggle configKey="prohibit_videos" label="Videos" />
              <Toggle configKey="prohibit_stickers" label="Stickers" />
              <Toggle configKey="prohibit_emojis" label="Emojis" />
              <Toggle configKey="prohibit_emoji_only" label="Emoji-only messages" />
              <Toggle configKey="prohibit_location" label="Location" />
              <Toggle configKey="prohibit_contact" label="Contact" />
              <Toggle configKey="prohibit_audio" label="Audio" />
              <Toggle configKey="prohibit_voice" label="Recorded voice" />
              <Toggle configKey="prohibit_files" label="Files" />
              <Toggle configKey="prohibit_apps" label="Apps" />
              <Toggle configKey="prohibit_gifs" label="GIFs" />
              <Toggle configKey="prohibit_polls" label="Polls" />
              <Toggle configKey="prohibit_glass_buttons" label="Glass buttons" />
              <Toggle configKey="prohibit_games" label="Games" />
              <Toggle configKey="prohibit_bot_commands" label="Bot commands" />
              <Toggle configKey="prohibit_textless_posts" label="Textless posts" />
              <Toggle configKey="prohibit_english" label="English" />
              <Toggle configKey="prohibit_arabic_farsi" label="Arabic and Farsi" />
              <Toggle configKey="prohibit_regular_reply" label="Regular users replying" />
              <Toggle configKey="prohibit_external_reply" label="External reply" />
            </SectionCard>
            <SectionCard title="Pattern & Word Filters">
              <TextInput configKey="message_regex_pattern" label="REGEX pattern" placeholder="e.g. .*spam.*" />
              <TextArea configKey="forbidden_words" label="Forbidden words" desc="Each word on a separate line." placeholder={"word1\nword2"} rows={4} />
              <TextArea configKey="necessary_words" label="Necessary words" desc="Messages must contain at least one." placeholder={"word1\nword2"} rows={3} />
            </SectionCard>
          </>
        )}

        {adminTab === 'limits' && (
          <>
            <SectionCard title="Message Word Limits">
              <NumberInput configKey="min_message_words" label="Min message words" desc="0 = no minimum." min={0} />
              <NumberInput configKey="max_message_words" label="Max message words" desc="0 = no maximum." min={0} />
            </SectionCard>
            <SectionCard title="Message Count Limits">
              <NumberInput configKey="message_count_limit" label="Message count limit" desc="Per-user message limit. 0 = disabled." min={0} />
              <NumberInput configKey="message_count_timeframe_mins" label="Timeframe (minutes)" min={1} />
            </SectionCard>
            <SectionCard title="Repeated Messages">
              <NumberInput configKey="max_repeated_messages" label="Max repeated messages" desc="0 = no limit." min={0} />
              <NumberInput configKey="repeated_msg_timeframe_mins" label="Timeframe (minutes)" min={1} />
            </SectionCard>
            <SectionCard title="Silent Times">
              {[1, 2, 3].map(n => (
                <div key={n} className="mb-4">
                  <Toggle configKey={`silent_time_${n}_enabled`} label={`${['First', 'Second', 'Third'][n - 1]} Silent Time`} />
                  {config[`silent_time_${n}_enabled`] && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <TimeInput configKey={`silent_time_${n}_start`} label="Start" />
                      <TimeInput configKey={`silent_time_${n}_end`} label="End" />
                    </div>
                  )}
                </div>
              ))}
              <Toggle configKey="temporary_lock_enabled" label="Temporary Group Lock" desc="Restrict all message types." />
            </SectionCard>
          </>
        )}

        {adminTab === 'memberships' && (
          <>
            <SectionCard title="Forced Add">
              <NumberInput configKey="forced_add_count" label="Forced Add" desc="Members must invite this many before messaging. 0 = disabled." min={0} />
              <NumberInput configKey="forced_add_timeframe_days" label="Timeframe (days)" min={0} />
            </SectionCard>
            <SectionCard title="Force Join Channel">
              <TextInput configKey="force_channel" label="Force Join Channel" placeholder="@channel_username" desc="Users must join this channel to chat." />
            </SectionCard>
            <SectionCard title="Mandatory Channel Membership">
              <TextArea configKey="mandatory_channels" label="Mandatory channels" desc="Bot needs admin in channel. @username, one per line." placeholder={"@channel1\n@channel2"} rows={3} />
            </SectionCard>
            <SectionCard title="MemberBooster">
              <Toggle configKey="memberbooster_enabled" label="MemberBooster" desc="Users must add members or join channel to send messages." />
              {config.memberbooster_enabled && (
                <>
                  <NumberInput configKey="memberbooster_max" label="Required members to add" min={0} />
                  <Toggle configKey="memberbooster_hard_mode" label="Hard mode" desc="Users cannot send any messages until met." />
                  <Toggle configKey="memberbooster_channel_enabled" label="Force join channel" />
                  {config.memberbooster_channel_enabled && (
                    <TextInput configKey="memberbooster_channel" label="Channel" placeholder="@YourChannelID" />
                  )}
                  <Toggle configKey="memberbooster_forced_boost" label="Forced boost" desc="Require group boost to send messages." />
                </>
              )}
            </SectionCard>
          </>
        )}

        {adminTab === 'texts' && (
          <>
            <SectionCard title="Welcome">
              <TextArea configKey="welcome_message" label="Welcome Message" placeholder="Welcome {name} to {group}!" desc="Variables: {name}, {username}, {group}, {count}, {mention}" />
            </SectionCard>
            <SectionCard title="Goodbye">
              <TextArea configKey="goodbye_message" label="Goodbye Message" placeholder="Goodbye!" desc="Variables: {name}, {username}, {group}" />
            </SectionCard>
            <SectionCard title="Rules">
              <TextArea configKey="rules_text" label="Group Rules" placeholder="1. Be respectful..." rows={5} />
            </SectionCard>
            <SectionCard title="Bot Texts">
              <TextArea configKey="start_text" label="/start message" placeholder="Welcome to BotWave!" desc="Custom /start DM message." rows={3} />
              <TextArea configKey="help_text" label="/help message" placeholder="Here are my commands..." desc="Custom help text." rows={3} />
            </SectionCard>
            <SectionCard title="Silent Time Messages">
              <TextArea configKey="custom_silent_start_text" label="Silent time start" desc="Use {starttime} and {endtime}." rows={3} />
              <TextArea configKey="custom_silent_end_text" label="Silent time end" desc="Use {starttime} and {endtime}." rows={3} />
            </SectionCard>
            <SectionCard title="Admonition">
              <TextArea configKey="custom_admonition_text" label="Admonition text" desc="Keywords: {reason}, {penalty}, {user_warnings}, {warnings_count}" rows={4} />
            </SectionCard>
          </>
        )}

        {adminTab === 'notes' && (
          <>
            <SectionCard title={`Saved Notes (${notes.length})`}>
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-700/50">
                      <div>
                        <div className="text-sm font-medium text-white">#{n.name}</div>
                        <div className="text-xs text-gray-400">{n.content?.slice(0, 60)}...</div>
                      </div>
                      <button onClick={() => deleteNote(n.name)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Add Note">
              <input type="text" value={newNoteName} onChange={e => setNewNoteName(e.target.value)}
                placeholder="Note name" className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600 mb-3" />
              <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Note content..." rows={3} className="w-full p-2 rounded-xl text-sm resize-none bg-gray-800 text-white border border-gray-600 mb-3" />
              <button onClick={addNote} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Note</button>
            </SectionCard>
          </>
        )}

        {adminTab === 'filters' && (
          <>
            <SectionCard title={`Active Filters (${filters.length})`}>
              {filters.length === 0 ? (
                <p className="text-sm text-gray-400">No filters yet.</p>
              ) : (
                <div className="space-y-2">
                  {filters.map(f => (
                    <div key={f.keyword} className="flex items-center justify-between p-3 rounded-xl bg-gray-700/50">
                      <div>
                        <div className="text-sm font-medium text-white">{f.keyword}</div>
                        <div className="text-xs text-gray-400">{f.response?.slice(0, 60)}...</div>
                      </div>
                      <button onClick={() => deleteFilter(f.keyword)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Add Filter">
              <input type="text" value={newFilterKeyword} onChange={e => setNewFilterKeyword(e.target.value)}
                placeholder="Keyword" className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600 mb-3" />
              <textarea value={newFilterResponse} onChange={e => setNewFilterResponse(e.target.value)}
                placeholder="Response..." rows={3} className="w-full p-2 rounded-xl text-sm resize-none bg-gray-800 text-white border border-gray-600 mb-3" />
              <button onClick={addFilter} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Filter</button>
            </SectionCard>
          </>
        )}

        {adminTab === 'modlog' && (
          <SectionCard title={`Moderation Log (${modlog.length})`}>
            {modlog.length === 0 ? (
              <p className="text-sm text-gray-400">No moderation actions yet.</p>
            ) : (
              <div className="space-y-2">
                {modlog.map((l, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white">{l.action_type}</span>
                      <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs mt-1 text-gray-400">
                      Target: {l.target_user_id} | Admin: {l.admin_user_id} | {l.reason || 'No reason'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        <button onClick={saveConfig} disabled={saving}
          className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 mt-4">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
