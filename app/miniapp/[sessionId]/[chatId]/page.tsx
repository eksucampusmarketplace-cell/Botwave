'use client';

import { useState, useEffect, useCallback } from 'react';
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
type AdminTab = 'general' | 'protection' | 'features' | 'texts';

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

  useEffect(() => { authenticate(); }, [authenticate]);
  useEffect(() => {
    if (user) {
      fetchConfig();
      fetchXP();
    }
  }, [user, fetchConfig, fetchXP]);

  const saveConfig = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/telegram/group-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId, ...config }),
      });
      const data = await res.json();
      if (data.success) setSuccess('Saved!');
      else setError('Failed to save');
    } catch { setError('Error saving'); }
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const updateConfig = (key: string, value: unknown) => setConfig(prev => ({ ...prev, [key]: value }));

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

  const SelectInput = ({ configKey, label, options }: { configKey: string; label: string; options: { value: string; label: string }[] }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium text-gray-400">{label}</label>
      <select value={config[configKey] || options[0]?.value} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm bg-gray-800 text-white border border-gray-600">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
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
        <h1 className="text-lg font-bold">BotWave <span className="text-blue-400">Admin</span></h1>
        <p className="text-xs text-gray-400">Group Admin Panel</p>
      </div>

      {error && <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
      {success && <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">{success}</div>}

      <div className="flex gap-1 p-2 bg-gray-800/50">
        {([['general', 'General'], ['protection', 'Protection'], ['features', 'Features'], ['texts', 'Texts']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAdminTab(id)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${adminTab === id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
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
              <Toggle configKey="goodbye_enabled" label="Goodbye Message" />
              <Toggle configKey="xp_enabled" label="XP System" desc="Members earn XP by chatting." />
            </SectionCard>
            <SectionCard title="Language">
              <SelectInput configKey="language" label="Group Language" options={[
                { value: 'en', label: 'English' }, { value: 'fa', label: 'Farsi' },
                { value: 'ar', label: 'Arabic' }, { value: 'tr', label: 'Turkish' },
                { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
              ]} />
            </SectionCard>
            <SectionCard title="Warnings">
              <Toggle configKey="warns_enabled" label="Warning System" />
              <NumberInput configKey="warn_limit" label="Warning Limit" min={1} max={100} />
              <SelectInput configKey="warn_action" label="Warn Action" options={PENALTY_OPTIONS} />
            </SectionCard>
          </>
        )}

        {adminTab === 'protection' && (
          <>
            <SectionCard title="Anti-Flood">
              <Toggle configKey="antiflood_enabled" label="Anti-Flood" desc="Rate-limit messages." />
              {config.antiflood_enabled && (
                <>
                  <NumberInput configKey="antiflood_max" label="Max messages" min={1} max={100} />
                  <SelectInput configKey="antiflood_action" label="Action" options={PENALTY_OPTIONS} />
                </>
              )}
            </SectionCard>
            <SectionCard title="Anti-Link">
              <Toggle configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links." />
            </SectionCard>
            <SectionCard title="Anti-Raid">
              <Toggle configKey="antiraid_enabled" label="Anti-Raid" desc="Auto-detect mass joins." />
              {config.antiraid_enabled && (
                <NumberInput configKey="antiraid_threshold" label="Threshold (joins/min)" min={1} />
              )}
            </SectionCard>
            <SectionCard title="Night Mode">
              <Toggle configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages at night." />
            </SectionCard>
            <SectionCard title="CAPTCHA">
              <Toggle configKey="captcha_enabled" label="CAPTCHA" desc="Verify new members." />
            </SectionCard>
          </>
        )}

        {adminTab === 'features' && (
          <>
            <SectionCard title="Community">
              <Toggle configKey="karma_enabled" label="Karma" />
              <Toggle configKey="votekick_enabled" label="VoteKick" />
              <Toggle configKey="games_enabled" label="Mini Games" />
              <Toggle configKey="polls_enabled" label="Polls" />
            </SectionCard>
            <SectionCard title="Utilities">
              <Toggle configKey="ai_enabled" label="AI Chat" />
              <Toggle configKey="mediadownload_enabled" label="Media Download" />
              <Toggle configKey="stickers_enabled" label="Sticker Maker" />
              <Toggle configKey="texttools_enabled" label="Text Tools" />
            </SectionCard>
            <SectionCard title="Moderation">
              <Toggle configKey="modlog_enabled" label="Mod Log" />
              <Toggle configKey="reports_enabled" label="Reports" />
              <Toggle configKey="tickets_enabled" label="Tickets" />
              <Toggle configKey="name_history_enabled" label="Name History" />
            </SectionCard>
          </>
        )}

        {adminTab === 'texts' && (
          <>
            <SectionCard title="Welcome">
              <TextArea configKey="welcome_message" label="Welcome Message" placeholder="Welcome {name} to {group}!" desc="Variables: {name}, {username}, {group}, {count}" />
            </SectionCard>
            <SectionCard title="Goodbye">
              <TextArea configKey="goodbye_message" label="Goodbye Message" placeholder="Goodbye!" />
            </SectionCard>
            <SectionCard title="Rules">
              <TextArea configKey="rules_text" label="Group Rules" placeholder="1. Be respectful..." rows={5} />
            </SectionCard>
          </>
        )}

        <button onClick={saveConfig} disabled={saving}
          className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 mt-4">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
