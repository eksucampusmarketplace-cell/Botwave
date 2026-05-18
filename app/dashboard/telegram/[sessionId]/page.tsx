'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

type Tab = 'general' | 'features' | 'protection' | 'prohibitions' | 'numerical' | 'silence' | 'memberships' | 'memberbooster' | 'texts' | 'notes' | 'filters' | 'modlog' | 'xp' | 'scheduled' | 'stats';

interface Note { name: string; content: string; created_at: string; }
interface Filter { keyword: string; response: string; created_at: string; }
interface ModLog { action_type: string; target_user_id: string; reason: string; admin_user_id: string; created_at: string; }
interface XpEntry { user_id: string; xp: number; level: number; }
interface ScheduledMsg { id: string; chat_id: string; message: string; scheduled_at: string; status: string; }

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Tehran', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Lagos',
];

const PENALTY_OPTIONS = [
  { value: 'warn', label: 'Warn' },
  { value: 'mute', label: 'Mute' },
  { value: 'ban', label: 'Ban' },
  { value: 'kick', label: 'Kick' },
  { value: 'tban', label: 'Temp Ban' },
  { value: 'tmute', label: 'Temp Mute' },
];

// Maps tabs to feature IDs that the bot owner controls
const TAB_FEATURE_MAP: Record<Tab, string[]> = {
  general: [], // always visible
  features: [], // always visible
  protection: ['antiflood', 'antiraid', 'antispam', 'captcha'],
  prohibitions: ['prohibitions', 'locks', 'blocklist'],
  numerical: [], // always visible (general limits)
  silence: ['silenttime'],
  memberships: ['mandatory_membership', 'forced_add'],
  memberbooster: ['memberbooster'],
  texts: ['welcome', 'goodbye'],
  notes: ['notes'],
  filters: ['filters'],
  modlog: ['modlog'],
  xp: ['xp'],
  scheduled: ['scheduled'],
  stats: ['stats'],
};

export default function TelegramConfigPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ownerDisabledFeatures, setOwnerDisabledFeatures] = useState<Set<string>>(new Set());

  // eslint-disable-next-line
  const [config, setConfig] = useState<Record<string, any>>({
    antiflood_enabled: false,
    antiflood_max_per_min: 10,
    antilink_enabled: false,
    antiraid_enabled: false,
    antiraid_threshold: 15,
    antiraid_mode: 'restrict',
    antiraid_duration_mins: 15,
    night_mode_enabled: false,
    captcha_enabled: false,
    welcome_message: '',
    goodbye_message: '',
    log_channel_id: '',
    bot_language: 'en',
    timezone: 'UTC',
    welcome_enabled: true,
    rules_enabled: false,
    admonition_enabled: false,
    noiseless_mode: false,
    auto_delete_bot_msgs: false,
    auto_delete_minutes: 1,
    check_admin_violations: false,
    verify_user_realness: false,
    ignore_public_commands: false,
    remove_join_leave_notifs: false,
    anon_admin: false,
    admin_error_messages: true,
    warnings_enabled: false,
    max_warnings: 20,
    warning_keep_days: 3,
    default_violation_penalty: 'warn',
    prohibit_unofficial_ads: false,
    prohibit_bots_deletion: false,
    prohibit_bot_inviter_removal: false,
    prohibit_userbots: false,
    strict_mode: false,
    prohibit_porn_words: false,
    prohibit_website_links: false,
    prohibit_telegram_links: false,
    prohibit_usernames: false,
    prohibit_hashtags: false,
    prohibit_text: false,
    prohibit_forwarding: false,
    prohibit_forward_channels: false,
    prohibit_pictures: false,
    prohibit_videos: false,
    prohibit_stickers: false,
    prohibit_emojis: false,
    prohibit_emoji_only: false,
    prohibit_location: false,
    prohibit_contact: false,
    prohibit_audio: false,
    prohibit_voice: false,
    prohibit_files: false,
    prohibit_apps: false,
    prohibit_gifs: false,
    prohibit_polls: false,
    prohibit_glass_buttons: false,
    prohibit_games: false,
    prohibit_bot_commands: false,
    prohibit_textless_posts: false,
    prohibit_english: false,
    prohibit_arabic_farsi: false,
    prohibit_regular_reply: false,
    prohibit_external_reply: false,
    message_regex_pattern: '',
    forbidden_words: '',
    necessary_words: '',
    min_message_words: 0,
    max_message_words: 0,
    message_count_limit: 0,
    message_count_timeframe_mins: 1,
    max_repeated_messages: 0,
    repeated_msg_timeframe_mins: 1,
    silent_time_1_enabled: false,
    silent_time_1_start: '00:00',
    silent_time_1_end: '06:00',
    silent_time_2_enabled: false,
    silent_time_2_start: '00:00',
    silent_time_2_end: '06:00',
    silent_time_3_enabled: false,
    silent_time_3_start: '00:00',
    silent_time_3_end: '06:00',
    temporary_lock_enabled: false,
    forced_add_count: 0,
    forced_add_timeframe_days: 0,
    mandatory_channels: '',
    custom_welcome_text: 'Greetings, esteemed {user}! Welcome to {group}! We wish you a delightful experience during your presence here.',
    custom_rules_text: '',
    custom_silent_start_text: 'Silent time has been successfully activated. This group is currently in silent mode from {starttime} until {endtime}.',
    custom_silent_end_text: 'Silent time has been deactivated. The next silent time period will begin at {starttime}.',
    custom_admonition_text: 'Reason: {reason} | Penalty: {penalty} | {user_warnings} warnings out of {warnings_count} | Each warning will be deleted after {warningstime}',
    custom_forced_add_text: 'To be able to send messages to this group, you need to add {number} members. So far, you have added {added} members.',
    custom_mandatory_channel_text: 'Before sending messages to this group, please join the following channel(s)/group(s): {channel_names}',
    antiflood_action: 'mute',
    antiflood_timed_count: 0,
    antiflood_timed_duration_secs: 0,
    antiflood_clear_messages: false,
    antiraid_time: '6h',
    antiraid_action_time: '1h',
    auto_antiraid_threshold: 0,
    // CAPTCHA enhancements
    captcha_mode: 'button',
    captcha_rules: false,
    captcha_mute_time: '',
    captcha_kick: true,
    captcha_kick_time: '',
    captcha_button_text: '',
    // MemberBooster
    memberbooster_enabled: false,
    memberbooster_max: 0,
    memberbooster_max_mode: 'new',
    memberbooster_text: '',
    memberbooster_text_enabled: true,
    memberbooster_channel_text: '',
    memberbooster_daily_text: '',
    memberbooster_daily: 0,
    memberbooster_daily_minute: 1440,
    memberbooster_daily_mode: 'reset',
    memberbooster_channel_enabled: false,
    memberbooster_channel: '',
    memberbooster_channel2_enabled: false,
    memberbooster_channel2: '',
    memberbooster_forced_boost: false,
    memberbooster_btn_enabled: false,
    memberbooster_btn_link: '',
    memberbooster_btn_text: '',
    memberbooster_hard_mode: false,
    // Force join channel
    force_channel: '',
    // Additional feature settings
    clean_welcome: false,
    votekick_enabled: false,
    votekick_required_votes: 5,
    votekick_timeout_secs: 60,
    karma_enabled: false,
    ai_enabled: false,
    ban_ghosts_enabled: false,
    mentionall_enabled: true,
    booster_enabled: false,
    games_enabled: true,
    texttools_enabled: true,
    quicktools_enabled: true,
    mediadownload_enabled: true,
    funextras_enabled: true,
    infolookup_enabled: true,
    join_approval_enabled: false,
    join_approval_mode: 'manual',
    xp_enabled: true,
    slowmode_enabled: false,
    slowmode_seconds: 0,
    blacklist_mode: 'delete',
    reports_enabled: true,
    tickets_enabled: false,
    federation_enabled: false,
    autoreply_enabled: true,
    stickers_enabled: true,
    polls_enabled: true,
    namehistory_enabled: true,
    analytics_enabled: true,
    profiletools_enabled: true,
    mediatools_enabled: true,
    imagetools_enabled: true,
    antilink_whitelist: '',
    night_mode_start: '22:00',
    night_mode_end: '06:00',
    start_text: '',
    help_text: '',
    rules_text: '',
    warn_limit: 3,
    warn_action: 'mute',
    auto_delete_seconds: 0,
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [modlog, setModlog] = useState<ModLog[]>([]);
  const [xpData, setXpData] = useState<XpEntry[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>([]);
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFilterKeyword, setNewFilterKeyword] = useState('');
  const [newFilterResponse, setNewFilterResponse] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const [configRes, featRes] = await Promise.all([
        fetch(`/api/telegram/config?sessionId=${sessionId}`),
        fetch(`/api/bot/features?sessionId=${sessionId}`),
      ]);
      const configData = await configRes.json();
      if (configData.success && configData.data) {
        setConfig(prev => ({ ...prev, ...configData.data }));
      }
      const featData = await featRes.json();
      if (featData.success && featData.data) {
        const disabled = new Set<string>();
        for (const f of featData.data) {
          if (f.feature_name && f.enabled === false) {
            disabled.add(f.feature_name);
          }
        }
        setOwnerDisabledFeatures(disabled);
      }
    } catch { setError('Failed to load config'); }
    setLoading(false);
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

  const fetchXP = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/xp/leaderboard?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setXpData(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/scheduled?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setScheduled(data.data || []);
    } catch {}
  }, [sessionId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

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
    setSaving(true); setError(''); setSuccess('');
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
    await fetch('/api/telegram/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, name: newNoteName, content: newNoteContent }) });
    setNewNoteName(''); setNewNoteContent(''); fetchNotes();
  };

  const deleteNote = async (name: string) => {
    await fetch(`/api/telegram/notes?sessionId=${sessionId}&name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    fetchNotes();
  };

  const addFilter = async () => {
    if (!newFilterKeyword || !newFilterResponse) return;
    await fetch('/api/telegram/filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, keyword: newFilterKeyword, response: newFilterResponse }) });
    setNewFilterKeyword(''); setNewFilterResponse(''); fetchFilters();
  };

  const deleteFilter = async (keyword: string) => {
    await fetch(`/api/telegram/filters?sessionId=${sessionId}&keyword=${encodeURIComponent(keyword)}`, { method: 'DELETE' });
    fetchFilters();
  };

  const resetXP = async () => {
    if (!confirm('Reset all XP data? This cannot be undone.')) return;
    await fetch('/api/telegram/xp/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    fetchXP();
  };

  const deleteScheduled = async (id: string) => {
    await fetch(`/api/telegram/scheduled?sessionId=${sessionId}&id=${id}`, { method: 'DELETE' });
    fetchScheduled();
  };

  const allTabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '\u2699\ufe0f' },
    { id: 'features', label: 'Features', icon: '\ud83d\udd27' },
    { id: 'protection', label: 'Antiflood & AntiRaid', icon: '\ud83d\udee1\ufe0f' },
    { id: 'prohibitions', label: 'Prohibitions', icon: '\ud83d\udeab' },
    { id: 'numerical', label: 'Limits', icon: '\ud83d\udd22' },
    { id: 'silence', label: 'Silent Times', icon: '\ud83e\udd2b' },
    { id: 'memberships', label: 'Memberships', icon: '\ud83d\udc65' },
    { id: 'memberbooster', label: 'MemberBooster', icon: '\ud83d\ude80' },
    { id: 'texts', label: 'Custom Texts', icon: '\ud83d\udcdd' },
    { id: 'notes', label: 'Notes', icon: '\ud83d\uddd2\ufe0f' },
    { id: 'filters', label: 'Filters', icon: '\ud83d\udd0d' },
    { id: 'modlog', label: 'Mod Log', icon: '\ud83d\udccb' },
    { id: 'xp', label: 'XP', icon: '\u2b50' },
    { id: 'scheduled', label: 'Scheduled', icon: '\u23f0' },
    { id: 'stats', label: 'Statistics', icon: '\ud83d\udcca' },
  ];

  // Filter tabs: hide tabs where ALL required features are disabled by the bot owner
  const tabs = allTabs.filter(t => {
    const requiredFeatures = TAB_FEATURE_MAP[t.id];
    if (!requiredFeatures || requiredFeatures.length === 0) return true;
    return requiredFeatures.some(f => !ownerDisabledFeatures.has(f));
  });

  const inputStyle = { background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' };
  const updateConfig = (key: string, value: unknown) => setConfig(prev => ({ ...prev, [key]: value }));

  const Toggle = ({ configKey, label, desc }: { configKey: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      </div>
      <button onClick={() => updateConfig(configKey, !config[configKey])}
        className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 ${config[configKey] ? 'bg-blue-600' : 'bg-gray-600'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config[configKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const NumberInput = ({ configKey, label, desc, min = 0, max }: { configKey: string; label: string; desc?: string; min?: number; max?: number }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <input type="number" value={config[configKey] || 0} min={min} max={max}
        onChange={e => updateConfig(configKey, parseInt(e.target.value) || 0)}
        className="w-full p-2 rounded-xl text-sm" style={inputStyle} />
    </div>
  );

  const TextInput = ({ configKey, label, desc, placeholder }: { configKey: string; label: string; desc?: string; placeholder?: string }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <input type="text" value={config[configKey] || ''} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={inputStyle} placeholder={placeholder} />
    </div>
  );

  const TextArea = ({ configKey, label, desc, placeholder, rows = 3 }: { configKey: string; label: string; desc?: string; placeholder?: string; rows?: number }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <textarea value={config[configKey] || ''} rows={rows} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-3 rounded-xl text-sm resize-none" style={inputStyle} placeholder={placeholder} />
    </div>
  );

  const SelectInput = ({ configKey, label, desc, options }: { configKey: string; label: string; desc?: string; options: { value: string; label: string }[] }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <select value={config[configKey] || options[0]?.value} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={inputStyle}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const TimeInput = ({ configKey, label }: { configKey: string; label: string }) => (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type="time" value={config[configKey] || '00:00'} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={inputStyle} />
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--card-bg)' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );

  const SaveButton = () => (
    <button onClick={saveConfig} disabled={saving}
      className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 mb-6">
      {saving ? 'Saving...' : 'Save Settings'}
    </button>
  );

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
            Telegram <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Dashboard</span>
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Session: {sessionId?.toString().slice(0, 8)}...
          </p>
        </motion.div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">{success}</div>}

        {ownerDisabledFeatures.size > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs">
            Some features are disabled by the bot owner and are not available for this group.
          </div>
        )}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : ''}`}
              style={activeTab !== t.id ? { background: 'var(--card-bg)', color: 'var(--text-secondary)' } : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-0">
            <SectionCard title="Language & Timezone">
              <SelectInput configKey="bot_language" label="Language" options={[
                { value: 'en', label: 'English' }, { value: 'fa', label: 'Farsi / Persian' },
                { value: 'ar', label: 'Arabic' }, { value: 'tr', label: 'Turkish' },
                { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' }, { value: 'ru', label: 'Russian' },
                { value: 'zh', label: 'Chinese' }, { value: 'ja', label: 'Japanese' },
              ]} />
              <SelectInput configKey="timezone" label="Time Zone" desc="Timings will be calculated based on this timezone."
                options={TIMEZONES.map(tz => ({ value: tz, label: tz }))} />
            </SectionCard>

            <SectionCard title="Welcome & Rules">
              <Toggle configKey="welcome_enabled" label="Sending welcome message" desc="Send a welcome message when new members join." />
              <Toggle configKey="rules_enabled" label="Sending the rules" desc="Enable sending group rules." />
              <Toggle configKey="admonition_enabled" label="Sending admonition message" desc="Send admonition messages when users violate rules." />
            </SectionCard>

            <SectionCard title="Bot Behavior">
              <Toggle configKey="noiseless_mode" label="Noiseless mode" desc="Bot messages are sent silently to the group." />
              <Toggle configKey="auto_delete_bot_msgs" label="Auto deletion of bot messages" desc="Automatically delete messages sent by the bot." />
              {config.auto_delete_bot_msgs && (
                <div className="ml-4 mt-2 mb-2">
                  <NumberInput configKey="auto_delete_minutes" label="Deletion time of bot messages (minutes)" min={1} max={1440} />
                </div>
              )}
              <Toggle configKey="check_admin_violations" label="Check rules violation by admins" desc="Apply rules to admins as well." />
              <Toggle configKey="verify_user_realness" label="Verification of user realness" desc="Every member joining must verify by tapping a designated button." />
              <Toggle configKey="ignore_public_commands" label="Ignoring public commands" desc="Restrict regular members from using info commands." />
              <Toggle configKey="remove_join_leave_notifs" label="Removal of join and leave notifications" />
            </SectionCard>

            <SectionCard title="Warnings">
              <Toggle configKey="warnings_enabled" label="Keeping the count of warnings" desc="Each violation of the rules will be counted as a warning." />
              {config.warnings_enabled && (
                <div className="mt-3 space-y-0">
                  <NumberInput configKey="max_warnings" label="Maximum allowed warnings" desc="If the number of warnings reaches this threshold, the user will be restricted." min={1} max={100} />
                  <NumberInput configKey="warning_keep_days" label="Timeframe of keeping warnings (days)" desc="Number of days to keep each warning given to each user." min={1} max={365} />
                  <SelectInput configKey="default_violation_penalty" label="Default penalty for rules violation" desc="Action the bot takes when someone violates the rules." options={PENALTY_OPTIONS} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Admin Settings">
              <Toggle configKey="anon_admin" label="Anonymous Admin" desc="Allow anonymous admins to use all commands without checking permissions. Not recommended." />
              <Toggle configKey="admin_error_messages" label="Admin Error Messages" desc="Send error messages when normal users use admin commands." />
              <TextInput configKey="log_channel_id" label="Log Channel ID" placeholder="-1001234567890" desc="Channel ID where moderation logs will be sent." />
            </SectionCard>

            <SectionCard title="Messages">
              <TextArea configKey="welcome_message" label="Welcome Message" placeholder="Welcome to the group!" desc="Variables: {name}, {username}, {group}, {count}, {mention}" />
              <TextArea configKey="goodbye_message" label="Goodbye Message" placeholder="Goodbye!" desc="Variables: {name}, {username}, {group}" />
              <Toggle configKey="clean_welcome" label="Auto-delete old welcome messages" desc="Automatically remove previous welcome messages when a new member joins." />
            </SectionCard>

            <SectionCard title="Bot Texts">
              <TextArea configKey="start_text" label="/start message" desc="Custom message shown when user sends /start in DM. Leave empty for default." placeholder="Welcome to BotWave!" rows={3} />
              <TextArea configKey="help_text" label="/help message" desc="Custom help text. Leave empty for default." placeholder="Here are my commands..." rows={3} />
              <TextArea configKey="rules_text" label="Group rules" desc="Rules text shown via /rules command." placeholder="1. Be respectful..." rows={4} />
            </SectionCard>

            <SectionCard title="XP System">
              <Toggle configKey="xp_enabled" label="XP System" desc="Members earn XP and level up by chatting." />
            </SectionCard>

            <SaveButton />
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-0">
            <SectionCard title="Protection Features">
              <Toggle configKey="antiflood_enabled" label="Anti-Flood" desc="Rate-limit messages & auto-mute spammers." />
              <Toggle configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links from messages." />
              <Toggle configKey="antiraid_enabled" label="Anti-Raid" desc="Auto-detect mass joins & lockdown." />
              <Toggle configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              <Toggle configKey="captcha_enabled" label="CAPTCHA" desc="Verify new members with a challenge." />
              <Toggle configKey="ban_ghosts_enabled" label="Ban Ghosts" desc="Auto-ban deleted/deactivated accounts." />
              <Toggle configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode via bot." />
            </SectionCard>

            <SectionCard title="Community Features">
              <Toggle configKey="xp_enabled" label="XP System" desc="Members earn XP & level up by chatting." />
              <Toggle configKey="karma_enabled" label="Karma" desc="Upvote/downvote via +/- reply." />
              <Toggle configKey="votekick_enabled" label="VoteKick" desc="Community vote to kick users." />
              {config.votekick_enabled && (
                <div className="ml-4 mt-2 space-y-0">
                  <NumberInput configKey="votekick_required_votes" label="Required votes" desc="Number of votes needed to kick a user." min={2} max={50} />
                  <NumberInput configKey="votekick_timeout_secs" label="Vote timeout (seconds)" desc="How long a vote stays open." min={10} max={3600} />
                </div>
              )}
              <Toggle configKey="mentionall_enabled" label="Mention All" desc="Allow /mentionall to ping all members." />
              <Toggle configKey="reports_enabled" label="Reports" desc="Users can report messages to admins." />
              <Toggle configKey="tickets_enabled" label="Tickets" desc="Support ticket system for users." />
            </SectionCard>

            <SectionCard title="Growth & Engagement">
              <Toggle configKey="memberbooster_enabled" label="MemberBooster" desc="Force add / channel join to send messages." />
              <Toggle configKey="booster_enabled" label="Group Booster" desc="Engagement prompts & growth tools." />
              <Toggle configKey="welcome_enabled" label="Welcome Bot" desc="Greet new members & say goodbye." />
              <Toggle configKey="join_approval_enabled" label="Join Approval" desc="Manual/auto-approve join requests." />
              {config.join_approval_enabled && (
                <div className="ml-4 mt-2">
                  <SelectInput configKey="join_approval_mode" label="Approval mode" options={[
                    { value: 'manual', label: 'Manual (admin approves)' },
                    { value: 'auto', label: 'Auto (approve all)' },
                    { value: 'captcha', label: 'CAPTCHA (verify first)' },
                  ]} />
                </div>
              )}
              <Toggle configKey="federation_enabled" label="Federation" desc="Cross-group ban sharing (TrustNet)." />
            </SectionCard>

            <SectionCard title="AI & Smart Features">
              <Toggle configKey="ai_enabled" label="AI Chat" desc="Groq AI /ask, /summarize, /translate." />
              <Toggle configKey="autoreply_enabled" label="Auto Reply" desc="Custom keyword triggers & responses." />
              <Toggle configKey="namehistory_enabled" label="Name History" desc="Track user name/username changes." />
              <Toggle configKey="analytics_enabled" label="Analytics" desc="Message stats & activity tracking." />
            </SectionCard>

            <SectionCard title="Fun & Utility">
              <Toggle configKey="games_enabled" label="Mini Games" desc="Trivia, word scramble & math quiz." />
              <Toggle configKey="funextras_enabled" label="Fun Extras" desc="Roast, compliment, dare, truth, lyrics." />
              <Toggle configKey="texttools_enabled" label="Text Tools" desc="Reverse, mock, morse, leet, flip." />
              <Toggle configKey="quicktools_enabled" label="Quick Utils" desc="Password, UUID, calc, BMI, hash." />
              <Toggle configKey="profiletools_enabled" label="Profile Tools" desc="User profiles & member lookup." />
              <Toggle configKey="stickers_enabled" label="Sticker Maker" desc="Steal & manage sticker packs." />
              <Toggle configKey="polls_enabled" label="Polls & Quiz" desc="Create polls & quizzes natively." />
            </SectionCard>

            <SectionCard title="Media & Downloads">
              <Toggle configKey="mediadownload_enabled" label="Media Download" desc="Download from YT, TikTok, IG." />
              <Toggle configKey="mediatools_enabled" label="Media Tools" desc="QR codes, timestamps, encoding." />
              <Toggle configKey="imagetools_enabled" label="Image Tools" desc="File info, download, captions." />
              <Toggle configKey="infolookup_enabled" label="Info Lookup" desc="Crypto, IP, WHOIS, weather, npm." />
            </SectionCard>

            <SectionCard title="Moderation">
              <Toggle configKey="warnings_enabled" label="Warnings" desc="Track rule violations with warnings." />
              <SelectInput configKey="warn_action" label="Warning action" desc="Action to take when warn limit is reached." options={PENALTY_OPTIONS} />
              <NumberInput configKey="warn_limit" label="Warning limit" desc="Number of warnings before action is taken." min={1} max={100} />
              <SelectInput configKey="blacklist_mode" label="Blacklist mode" desc="Action taken when a blacklisted word is detected."
                options={[
                  { value: 'delete', label: 'Delete message' },
                  { value: 'warn', label: 'Warn user' },
                  { value: 'mute', label: 'Mute user' },
                  { value: 'ban', label: 'Ban user' },
                  { value: 'kick', label: 'Kick user' },
                ]} />
            </SectionCard>

            <SaveButton />
          </div>
        )}

        {activeTab === 'protection' && (
          <div className="space-y-0">
            <SectionCard title="Anti-Flood">
              <Toggle configKey="antiflood_enabled" label="Anti-Flood" desc="Take action on users that send too many messages in a row." />
              {config.antiflood_enabled && (
                <div className="mt-3 space-y-0">
                  <NumberInput configKey="antiflood_max_per_min" label="Max messages per minute" desc="Number of consecutive messages to trigger antiflood." min={1} max={100} />
                  <SelectInput configKey="antiflood_action" label="Flood mode (action type)" desc="Action to take on a user who has been flooding." options={PENALTY_OPTIONS} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput configKey="antiflood_timed_count" label="Timed flood count" desc="Messages in timed window (0 = disabled)" min={0} />
                    <NumberInput configKey="antiflood_timed_duration_secs" label="Timed flood window (seconds)" desc="Time window for timed antiflood" min={0} />
                  </div>
                  <Toggle configKey="antiflood_clear_messages" label="Clear flood messages" desc="Delete the messages that triggered the flood." />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Anti-Raid">
              <Toggle configKey="antiraid_enabled" label="Anti-Raid" desc="Temporarily ban new joins during a raid attack." />
              {config.antiraid_enabled && (
                <div className="mt-3 space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NumberInput configKey="antiraid_threshold" label="Threshold (joins/min)" min={1} />
                    <div className="mb-4">
                      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Mode</label>
                      <select value={config.antiraid_mode} onChange={e => updateConfig('antiraid_mode', e.target.value)}
                        className="w-full p-2 rounded-xl text-sm" style={inputStyle}>
                        <option value="restrict">Restrict</option>
                        <option value="ban">Ban</option>
                        <option value="captcha">Captcha</option>
                        <option value="lockdown">Lockdown</option>
                      </select>
                    </div>
                    <NumberInput configKey="antiraid_duration_mins" label="Duration (minutes)" min={1} />
                  </div>
                  <TextInput configKey="antiraid_time" label="Raid time" desc="Duration for antiraid mode. Default: 6h" placeholder="6h" />
                  <TextInput configKey="antiraid_action_time" label="Raid action time" desc="How long new joiners are temp-banned. Default: 1h" placeholder="1h" />
                  <NumberInput configKey="auto_antiraid_threshold" label="Auto antiraid threshold" desc="Joins per minute to auto-enable antiraid. 0 = disabled." min={0} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Anti-Link">
              <Toggle configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links from messages." />
              {config.antilink_enabled && (
                <div className="mt-3 space-y-0">
                  <TextArea configKey="antilink_whitelist" label="Whitelisted domains" desc="Domains that are allowed. One per line. E.g. youtube.com" placeholder="youtube.com\ngoogle.com" rows={3} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Night Mode">
              <Toggle configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              {config.night_mode_enabled && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <TimeInput configKey="night_mode_start" label="Start Time" />
                  <TimeInput configKey="night_mode_end" label="End Time" />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Slow Mode">
              <Toggle configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode via bot." />
              {config.slowmode_enabled && (
                <NumberInput configKey="slowmode_seconds" label="Slow mode delay (seconds)" desc="Minimum seconds between messages per user. 0 = off." min={0} max={86400} />
              )}
            </SectionCard>

            <SectionCard title="CAPTCHA">
              <Toggle configKey="captcha_enabled" label="CAPTCHA" desc="Require verification for new members before they can send messages." />
              {config.captcha_enabled && (
                <div className="mt-3 space-y-0">
                  <SelectInput configKey="captcha_mode" label="CAPTCHA Mode" desc="Type of CAPTCHA challenge to show new members."
                    options={[
                      { value: 'button', label: 'Button (click to verify)' },
                      { value: 'math', label: 'Math (solve equation)' },
                      { value: 'text', label: 'Text (type shown text)' },
                      { value: 'text2', label: 'Text v2 (advanced)' },
                    ]} />
                  <Toggle configKey="captcha_rules" label="Require accepting rules" desc="New users must accept the group rules before speaking." />
                  <Toggle configKey="captcha_kick" label="Kick unverified users" desc="Kick users who don't solve the CAPTCHA in time." />
                  <TextInput configKey="captcha_kick_time" label="CAPTCHA kick time" desc="Time after which unverified users are kicked. E.g. 5m, 1h, 1d. Leave empty for default (60s)." placeholder="5m" />
                  <TextInput configKey="captcha_mute_time" label="CAPTCHA mute time" desc="Auto-unmute time for CAPTCHA. Leave empty to keep muted until solved." placeholder="5m" />
                  <TextInput configKey="captcha_button_text" label="Custom CAPTCHA button text" desc="Custom text for the verify button. Leave empty for default." placeholder="I'm human — click to verify" />
                </div>
              )}
            </SectionCard>

            <SaveButton />
          </div>
        )}

        {activeTab === 'prohibitions' && (
          <div className="space-y-0">
            <SectionCard title="Ads & Bots">
              <Toggle configKey="prohibit_unofficial_ads" label="Ads of unofficial Telegram apps" desc="Block advertisements sent by unofficial Telegram apps." />
              <Toggle configKey="prohibit_bots_deletion" label="Bots deletion" desc="Remove bots added to the group." />
              <Toggle configKey="prohibit_bot_inviter_removal" label="Bot inviter removal" desc="Remove users who invite bots." />
              <Toggle configKey="prohibit_userbots" label="Prohibition of user-bots" desc="Block userbot accounts that send unsolicited advertisements." />
            </SectionCard>

            <SectionCard title="Silence (Content Locks)">
              <Toggle configKey="strict_mode" label="Strict mode" desc="Prevent accounts distributing unidentifiable content. Caution: may restrict many members." />
              <div className="my-3 border-t" style={{ borderColor: 'var(--border)' }} />
              <Toggle configKey="prohibit_porn_words" label="Prohibition of pornographic words" />
              <Toggle configKey="prohibit_website_links" label="Prohibition of website links" />
              <Toggle configKey="prohibit_telegram_links" label="Prohibition of Telegram links" />
              <Toggle configKey="prohibit_usernames" label="Prohibition of usernames" />
              <Toggle configKey="prohibit_hashtags" label="Prohibition of hashtags" />
              <Toggle configKey="prohibit_text" label="Prohibition of text" />
              <Toggle configKey="prohibit_forwarding" label="Prohibition of forwarding" />
              <Toggle configKey="prohibit_forward_channels" label="Prohibition of forwarding from channels" />
              <Toggle configKey="prohibit_pictures" label="Prohibition of pictures" />
              <Toggle configKey="prohibit_videos" label="Prohibition of videos" />
              <Toggle configKey="prohibit_stickers" label="Prohibition of stickers" />
              <Toggle configKey="prohibit_emojis" label="Prohibition of emojis" />
              <Toggle configKey="prohibit_emoji_only" label="Prohibition of emoji only" desc="Messages that consist solely of emojis without any text." />
              <Toggle configKey="prohibit_location" label="Prohibition of location" />
              <Toggle configKey="prohibit_contact" label="Prohibition of contact" />
              <Toggle configKey="prohibit_audio" label="Prohibition of audio" />
              <Toggle configKey="prohibit_voice" label="Prohibition of recorded voice" />
              <Toggle configKey="prohibit_files" label="Prohibition of files" />
              <Toggle configKey="prohibit_apps" label="Prohibition of apps" />
              <Toggle configKey="prohibit_gifs" label="Prohibition of GIFs" />
              <Toggle configKey="prohibit_polls" label="Prohibition of polls" />
              <Toggle configKey="prohibit_glass_buttons" label="Prohibition of glass buttons" />
              <Toggle configKey="prohibit_games" label="Prohibition of games" />
              <Toggle configKey="prohibit_bot_commands" label="Prohibition of bot commands" />
              <Toggle configKey="prohibit_textless_posts" label="Prohibition of textless posts" />
              <Toggle configKey="prohibit_english" label="Prohibition of English" />
              <Toggle configKey="prohibit_arabic_farsi" label="Prohibition of Arabic and Farsi" />
              <Toggle configKey="prohibit_regular_reply" label="Prohibition of regular users replying" />
              <Toggle configKey="prohibit_external_reply" label="Prohibition of external reply" />
            </SectionCard>

            <SectionCard title="Pattern & Word Filters">
              <TextInput configKey="message_regex_pattern" label="Pattern of messages (REGEX)" desc="Advanced: Specify a REGEX pattern for messages." placeholder="e.g. .*spam.*" />
              <TextArea configKey="forbidden_words" label="Forbidden words" desc="Each word on a separate line." placeholder="word1\nword2\nword3" rows={4} />
              <TextArea configKey="necessary_words" label="Necessary words" desc="Every message must contain at least one of these words. Each on a separate line." placeholder="word1\nword2" rows={4} />
            </SectionCard>

            <SaveButton />
          </div>
        )}

        {activeTab === 'numerical' && (
          <div className="space-y-0">
            <SectionCard title="Message Word Limits">
              <NumberInput configKey="min_message_words" label="Minimum number of message words" desc="0 = no minimum." min={0} />
              <NumberInput configKey="max_message_words" label="Maximum number of message words" desc="0 = no maximum." min={0} />
            </SectionCard>

            <SectionCard title="Message Count Limits">
              <NumberInput configKey="message_count_limit" label="Limitation of number of messages" desc="Each user is limited to sending this many messages within the counting timeframe. 0 = disabled." min={0} />
              <NumberInput configKey="message_count_timeframe_mins" label="Timeframe of counting messages (minutes)" desc="Number of messages will be counted in this timeframe." min={1} />
            </SectionCard>

            <SectionCard title="Repeated Message Limits">
              <NumberInput configKey="max_repeated_messages" label="Max count of repeated messages" desc="0 = no limit on repeated messages." min={0} />
              <NumberInput configKey="repeated_msg_timeframe_mins" label="Timeframe of counting repeated messages (minutes)" min={1} />
            </SectionCard>

            <SaveButton />
          </div>
        )}

        {activeTab === 'silence' && (
          <div className="space-y-0">
            {[1, 2, 3].map(n => (
              <SectionCard key={n} title={`${['First', 'Second', 'Third'][n - 1]} Silent Time`}>
                <Toggle configKey={`silent_time_${n}_enabled`} label="Status" desc={`Enable the ${['first', 'second', 'third'][n - 1]} silent time period.`} />
                {config[`silent_time_${n}_enabled`] && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <TimeInput configKey={`silent_time_${n}_start`} label="Start Time" />
                    <TimeInput configKey={`silent_time_${n}_end`} label="End Time" />
                  </div>
                )}
              </SectionCard>
            ))}
            <SectionCard title="Temporary Lock of Group">
              <Toggle configKey="temporary_lock_enabled" label="Status" desc="If the group is locked, all message types will be restricted." />
            </SectionCard>
            <SaveButton />
          </div>
        )}

        {activeTab === 'memberships' && (
          <div className="space-y-0">
            <SectionCard title="Forced Add">
              <NumberInput configKey="forced_add_count" label="Forced Add" desc="Members must invite this number of members before sending messages. 0 = disabled." min={0} />
              <NumberInput configKey="forced_add_timeframe_days" label="Forced add timeframe (days)" desc="The count of added members resets after this period." min={0} />
            </SectionCard>
            <SectionCard title="Force Join Channel">
              <TextInput configKey="force_channel" label="Force Join Channel" desc="Users must join this channel before they can chat. Use @channel_username format. Leave empty to disable." placeholder="@channel_username" />
            </SectionCard>
            <SectionCard title="Mandatory Channel Membership">
              <TextArea configKey="mandatory_channels" label="Mandatory channel membership"
                desc="Ensure botwave has admin privileges in your channel. Provide usernames prefixed with @, each on a separate line."
                placeholder="@channel1\n@channel2" rows={4} />
            </SectionCard>
            <SaveButton />
          </div>
        )}

        {activeTab === 'memberbooster' && (
          <div className="space-y-0">
            <SectionCard title="MemberBooster">
              <Toggle configKey="memberbooster_enabled" label="Enable MemberBooster" desc="Users must add new members to the group or join a channel to send messages, growing your group and channel." />
            </SectionCard>

            {config.memberbooster_enabled && (
              <>
                <SectionCard title="Force Add Settings">
                  <NumberInput configKey="memberbooster_max" label="Required members to add (!max)" desc="Number of members each user must invite. 0 = disabled." min={0} />
                  <SelectInput configKey="memberbooster_max_mode" label="Force add mode (!max.mode)" desc="Whether only new members or all members must add."
                    options={[
                      { value: 'new', label: 'New members only' },
                      { value: 'all', label: 'All members' },
                    ]} />
                  <Toggle configKey="memberbooster_hard_mode" label="Hard mode (!hard_mode)" desc="Strict enforcement — users cannot send any messages until requirement is met." />
                </SectionCard>

                <SectionCard title="Daily Limits">
                  <NumberInput configKey="memberbooster_daily" label="Daily add limit (!daily)" desc="Number of members a user must add per day. 0 = no daily limit." min={0} />
                  <NumberInput configKey="memberbooster_daily_minute" label="Daily limit period in minutes (!daily.minute)" desc="Duration of the daily limit cycle in minutes. Default: 1440 (24h)." min={1} />
                  <SelectInput configKey="memberbooster_daily_mode" label="Daily mode (!daily.mode)" desc="Whether the daily limit resets at 24h or accumulates."
                    options={[
                      { value: 'reset', label: 'Reset after period' },
                      { value: 'accumulate', label: 'Accumulate (no reset)' },
                    ]} />
                </SectionCard>

                <SectionCard title="Forced Channel Join">
                  <Toggle configKey="memberbooster_channel_enabled" label="Force join channel (!channel 1/0)" desc="Require users to join a channel before they can send messages." />
                  {config.memberbooster_channel_enabled && (
                    <TextInput configKey="memberbooster_channel" label="Channel address (!channel @...)" desc="Channel username with @ prefix." placeholder="@YourChannelID" />
                  )}
                  <Toggle configKey="memberbooster_channel2_enabled" label="Force join second channel (!channel2 1/0)" desc="Require users to join a second channel." />
                  {config.memberbooster_channel2_enabled && (
                    <TextInput configKey="memberbooster_channel2" label="Second channel address (!channel2 @...)" desc="Second channel username with @ prefix." placeholder="@YourSecondChannelID" />
                  )}
                </SectionCard>

                <SectionCard title="Forced Boost">
                  <Toggle configKey="memberbooster_forced_boost" label="Forced boost (!forced_boost 1/0)" desc="Require users to boost the group before they can send messages." />
                </SectionCard>

                <SectionCard title="Inline Button">
                  <Toggle configKey="memberbooster_btn_enabled" label="Show inline button (!btn 1/0)" desc="Display an inline button below all MemberBooster messages." />
                  {config.memberbooster_btn_enabled && (
                    <>
                      <TextInput configKey="memberbooster_btn_link" label="Button link (!btn [link])" desc="URL the button links to." placeholder="https://t.me/your_channel" />
                      <TextInput configKey="memberbooster_btn_text" label="Button text (!btn_text [text])" desc="Text displayed on the inline button." placeholder="Join our channel" />
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Custom Texts">
                  <Toggle configKey="memberbooster_text_enabled" label="Show warning text (!text 1/0)" desc="Display the force add warning message to users." />
                  <TextArea configKey="memberbooster_text" label="Force add message (!text)" desc="Variables: !name (username), !count (required), !added (added so far), !remain (remaining)." placeholder="!name, you need to add !count members. You have added !added so far. !remain remaining." rows={3} />
                  <TextArea configKey="memberbooster_channel_text" label="Force join channel message (!text.channel)" desc="Custom message shown when users haven't joined the required channel." placeholder="You must join the channel before sending messages." rows={3} />
                  <TextArea configKey="memberbooster_daily_text" label="Daily alert message (!text.daily)" desc="Custom message for daily limit alerts." placeholder="You have reached your daily add limit." rows={3} />
                </SectionCard>
              </>
            )}

            <SaveButton />
          </div>
        )}

        {activeTab === 'texts' && (
          <div className="space-y-0">
            <SectionCard title="Welcome Message">
              <TextArea configKey="custom_welcome_text" label="Welcome message content" desc="Use {user} for username and {group} for group name." rows={4} />
            </SectionCard>
            <SectionCard title="Rules Text">
              <TextArea configKey="custom_rules_text" label="Customized rules text" desc="Use {user} for username and {group} for group name." rows={4} />
            </SectionCard>
            <SectionCard title="Silent Time Messages">
              <TextArea configKey="custom_silent_start_text" label="Customized text of start of silent time" desc="Use {starttime} and {endtime} keywords." rows={3} />
              <TextArea configKey="custom_silent_end_text" label="Customized text of end of silent time" desc="Use {starttime} and {endtime} keywords." rows={3} />
            </SectionCard>
            <SectionCard title="Admonition Text">
              <TextArea configKey="custom_admonition_text" label="Customized admonition text" desc="Keywords: {reason}, {penalty}, {user_warnings}, {warnings_count}, {warningstime}" rows={4} />
            </SectionCard>
            <SectionCard title="Forced Add Text">
              <TextArea configKey="custom_forced_add_text" label="Customized forced add text" desc="Use {added} for added count and {number} for required count." rows={3} />
            </SectionCard>
            <SectionCard title="Mandatory Channel Text">
              <TextArea configKey="custom_mandatory_channel_text" label="Customized mandatory channel membership text" desc="Use {channel_names} to insert channel names." rows={3} />
            </SectionCard>
            <SaveButton />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <SectionCard title={`Saved Notes (${notes.length})`}>
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
            </SectionCard>
            <SectionCard title="Add Note">
              <input type="text" value={newNoteName} onChange={e => setNewNoteName(e.target.value)}
                placeholder="Note name" className="w-full p-2 rounded-xl text-sm mb-3" style={inputStyle} />
              <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Note content..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={inputStyle} />
              <button onClick={addNote} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Note</button>
            </SectionCard>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-6">
            <SectionCard title={`Active Filters (${filters.length})`}>
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
            </SectionCard>
            <SectionCard title="Add Filter">
              <input type="text" value={newFilterKeyword} onChange={e => setNewFilterKeyword(e.target.value)}
                placeholder="Keyword" className="w-full p-2 rounded-xl text-sm mb-3" style={inputStyle} />
              <textarea value={newFilterResponse} onChange={e => setNewFilterResponse(e.target.value)}
                placeholder="Response..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={inputStyle} />
              <button onClick={addFilter} className="w-full p-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save Filter</button>
            </SectionCard>
          </div>
        )}

        {activeTab === 'modlog' && (
          <SectionCard title={`Moderation Log (${modlog.length})`}>
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
          </SectionCard>
        )}

        {activeTab === 'xp' && (
          <div className="space-y-6">
            <SectionCard title="XP Leaderboard">
              {xpData.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No XP data yet.</p>
              ) : (
                <div className="space-y-2">
                  {xpData.map((u, i) => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{i + 1}.</span>
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
            </SectionCard>
            <button onClick={resetXP} className="w-full p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Reset All XP</button>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <SectionCard title={`Scheduled Messages (${scheduled.length})`}>
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
          </SectionCard>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <SectionCard title="Group Statistics">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Statistics are tracked automatically when the bot is active in groups.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg)' }}>
                  <div className="text-4xl mb-2">\ud83d\udcc8</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>--</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>New Members (30 days)</div>
                </div>
                <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg)' }}>
                  <div className="text-4xl mb-2">\ud83d\udcac</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>--</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Group Messages (30 days)</div>
                </div>
              </div>
              <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                Statistics update in real-time as the bot processes events.
              </p>
            </SectionCard>
          </div>
        )}
      </div>
    </main>
  );
}
