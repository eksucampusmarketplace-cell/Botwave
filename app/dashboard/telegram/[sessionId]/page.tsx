'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import TelegramUserbotDashboard from '@/components/ui/TelegramUserbotDashboard';

type Tab = 'general' | 'features' | 'protection' | 'prohibitions' | 'numerical' | 'silence' | 'memberships' | 'memberbooster' | 'texts' | 'notes' | 'filters' | 'modlog' | 'xp' | 'scheduled' | 'stats' | 'ignored' | 'adminmode' | 'access';

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
  ignored: [],
  adminmode: [],
  access: [], // always visible — bot creator must always be able to lock down their bot
};

interface GroupInfo {
  chat_id: string;
  chat_title: string | null;
}

// eslint-disable-next-line
type ConfigMap = Record<string, any>;
interface FieldProps { configKey: string; label: string; desc?: string; config: ConfigMap; updateConfig: (key: string, value: unknown) => void; }

const INPUT_STYLE = { background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' } as const;

const Toggle = memo(function Toggle({ configKey, label, desc, config, updateConfig }: FieldProps) {
  return (
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
});

const NumberInput = memo(function NumberInput({ configKey, label, desc, min = 0, max, config, updateConfig }: FieldProps & { min?: number; max?: number }) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <input type="number" value={config[configKey] || 0} min={min} max={max}
        onChange={e => updateConfig(configKey, parseInt(e.target.value) || 0)}
        className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
    </div>
  );
});

const TextInput = memo(function TextInput({ configKey, label, desc, placeholder, config, updateConfig }: FieldProps & { placeholder?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <input type="text" value={config[configKey] || ''} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} placeholder={placeholder} />
    </div>
  );
});

const TextArea = memo(function TextArea({ configKey, label, desc, placeholder, rows = 3, config, updateConfig }: FieldProps & { placeholder?: string; rows?: number }) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <textarea value={config[configKey] || ''} rows={rows} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-3 rounded-xl text-sm resize-none" style={INPUT_STYLE} placeholder={placeholder} />
    </div>
  );
});

const SelectInput = memo(function SelectInput({ configKey, label, desc, options, config, updateConfig }: FieldProps & { options: { value: string; label: string }[] }) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {desc && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{desc}</div>}
      <select value={config[configKey] || options[0]?.value} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
});

const TimeInput = memo(function TimeInput({ configKey, label, config, updateConfig }: FieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type="time" value={config[configKey] || '00:00'} onChange={e => updateConfig(configKey, e.target.value)}
        className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
    </div>
  );
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--card-bg)' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 mb-6">
      {saving ? 'Saving...' : 'Save Settings'}
    </button>
  );
}

export default function TelegramConfigPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [platform, setPlatform] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ownerDisabledFeatures, setOwnerDisabledFeatures] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [configMode, setConfigMode] = useState<'global' | 'group'>('global');
  const [settingsSearch, setSettingsSearch] = useState('');
  const [ignoredChats, setIgnoredChats] = useState<Array<{ id: string; chat_id: string; chat_title: string | null; created_at: string }>>([]);
  const [newIgnoreChatId, setNewIgnoreChatId] = useState('');
  const [newIgnoreChatTitle, setNewIgnoreChatTitle] = useState('');

  // Access control state
  const [accessMode, setAccessMode] = useState<'public' | 'private'>('public');
  const [groupAllowlist, setGroupAllowlist] = useState<Array<{ chat_id: string; chat_title: string | null }>>([]);
  const [groupBlocklist, setGroupBlocklist] = useState<Array<{ chat_id: string; chat_title: string | null }>>([]);
  const [userAllowlist, setUserAllowlist] = useState<Array<{ user_id: string; user_label: string | null }>>([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [newAllowGroupId, setNewAllowGroupId] = useState('');
  const [newAllowGroupTitle, setNewAllowGroupTitle] = useState('');
  const [newBlockGroupId, setNewBlockGroupId] = useState('');
  const [newBlockGroupTitle, setNewBlockGroupTitle] = useState('');
  const [newAllowUserId, setNewAllowUserId] = useState('');
  const [newAllowUserLabel, setNewAllowUserLabel] = useState('');

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

  const fetchGroups = useCallback(async () => {
    try {
      const [groupsRes, gcRes] = await Promise.all([
        fetch(`/api/telegram/groups?sessionId=${sessionId}`),
        fetch(`/api/telegram/group-config?sessionId=${sessionId}&chatId=__list__`).catch(() => null),
      ]);
      const groupsData = await groupsRes.json();
      const allGroups: GroupInfo[] = [];
      const seen = new Set<string>();
      if (groupsData.success && groupsData.data) {
        for (const g of groupsData.data) {
          const cid = String(g.chat_id);
          if (!seen.has(cid)) { seen.add(cid); allGroups.push({ chat_id: cid, chat_title: g.chat_title || null }); }
        }
      }
      if (gcRes) {
        try {
          const gcData = await gcRes.json();
          if (gcData.success && Array.isArray(gcData.data)) {
            for (const g of gcData.data) {
              const cid = String(g.chat_id);
              if (!seen.has(cid)) { seen.add(cid); allGroups.push({ chat_id: cid, chat_title: g.chat_title || null }); }
            }
          }
        } catch {}
      }
      setGroups(allGroups);
    } catch {}
  }, [sessionId]);

  const fetchConfig = useCallback(async () => {
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/telegram/config?sessionId=${sessionId}`),
        fetch(`/api/bot/features?sessionId=${sessionId}`),
      ];
      if (configMode === 'group' && selectedGroup) {
        fetches.push(fetch(`/api/telegram/group-config?sessionId=${sessionId}&chatId=${selectedGroup}`));
      }
      const responses = await Promise.all(fetches);
      const configData = await responses[0].json();
      if (configData.success && configData.data) {
        setConfig(prev => ({ ...prev, ...configData.data }));
      }
      const featData = await responses[1].json();
      if (featData.success && featData.data) {
        const disabled = new Set<string>();
        for (const f of featData.data) {
          if (f.feature_name && f.enabled === false) {
            disabled.add(f.feature_name);
          }
        }
        setOwnerDisabledFeatures(disabled);
      }
      if (responses[2]) {
        const groupData = await responses[2].json();
        if (groupData.success && groupData.data) {
          setConfig(prev => ({ ...prev, ...groupData.data }));
        }
      }
    } catch { setError('Failed to load config'); }
    setLoading(false);
  }, [sessionId, configMode, selectedGroup]);

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

  useEffect(() => {
    fetch(`/api/bot/sessions`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const session = data.data.find((s: { id: string }) => s.id === sessionId);
          if (session) setPlatform(session.platform || 'telegram_bot');
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const fetchIgnoredChats = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/bot/ignored-chats?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setIgnoredChats(data.data || []);
    } catch {}
  }, [sessionId]);

  const addIgnoredChat = async () => {
    if (!newIgnoreChatId.trim()) return;
    try {
      const res = await fetch('/api/telegram/bot/ignored-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId: newIgnoreChatId.trim(), chatTitle: newIgnoreChatTitle.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setNewIgnoreChatId('');
        setNewIgnoreChatTitle('');
        fetchIgnoredChats();
        setSuccess('Chat added to ignore list!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to add');
      }
    } catch { setError('Failed to add ignored chat'); }
  };

  const removeIgnoredChat = async (chatId: string) => {
    try {
      await fetch('/api/telegram/bot/ignored-chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId }),
      });
      fetchIgnoredChats();
    } catch {}
  };

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchAccessControl = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/bot/access-control?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAccessMode(data.data.mode === 'private' ? 'private' : 'public');
        setGroupAllowlist(data.data.groupAllowlist || []);
        setGroupBlocklist(data.data.groupBlocklist || []);
        setUserAllowlist(data.data.userAllowlist || []);
      }
    } catch {}
  }, [sessionId]);

  const setAccessModeRemote = async (mode: 'public' | 'private') => {
    setAccessSaving(true);
    try {
      const res = await fetch('/api/telegram/bot/access-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mode }),
      });
      const data = await res.json();
      if (data.success) {
        setAccessMode(mode);
        setSuccess(`Bot is now ${mode}.`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to update mode');
      }
    } catch { setError('Failed to update mode'); }
    setAccessSaving(false);
  };

  const addAccessEntry = async (
    list: 'groupAllowlist' | 'groupBlocklist' | 'userAllowlist',
    entryId: string,
    label?: string,
  ) => {
    if (!entryId.trim()) return;
    try {
      const res = await fetch('/api/telegram/bot/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, list, entryId: entryId.trim(), label: label?.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAccessControl();
        setSuccess('Entry added.');
        setTimeout(() => setSuccess(''), 1500);
      } else {
        setError(data.error || 'Failed to add entry');
      }
    } catch { setError('Failed to add entry'); }
  };

  const removeAccessEntry = async (
    list: 'groupAllowlist' | 'groupBlocklist' | 'userAllowlist',
    entryId: string,
  ) => {
    try {
      await fetch('/api/telegram/bot/access-control', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, list, entryId }),
      });
      fetchAccessControl();
    } catch {}
  };

  useEffect(() => {
    switch (activeTab) {
      case 'notes': fetchNotes(); break;
      case 'filters': fetchFilters(); break;
      case 'modlog': fetchModlog(); break;
      case 'xp': fetchXP(); break;
      case 'scheduled': fetchScheduled(); break;
      case 'ignored': fetchIgnoredChats(); break;
      case 'access': fetchAccessControl(); break;
    }
  }, [activeTab, fetchNotes, fetchFilters, fetchModlog, fetchXP, fetchScheduled, fetchIgnoredChats, fetchAccessControl]);

  const saveConfig = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      if (configMode === 'group' && selectedGroup) {
        const res = await fetch('/api/telegram/group-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, chatId: selectedGroup, ...config }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccess('Group settings saved!');
          // Save config snapshot for rollback
          fetch('/api/telegram/config-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, type: 'group', chatId: selectedGroup, snapshot: data.data }),
          }).catch(() => {});
        } else {
          setError(data.error || 'Failed to save group settings');
        }
      } else {
        const res = await fetch('/api/telegram/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, ...config }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccess('Settings saved!');
          // Save config snapshot for rollback
          fetch('/api/telegram/config-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, type: 'bot', snapshot: data.data }),
          }).catch(() => {});
        } else {
          setError(data.error || 'Failed to save');
        }
      }
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
    { id: 'ignored', label: 'Ignored Chats', icon: '\ud83d\udeab' },
    { id: 'adminmode', label: 'Admin Mode', icon: '\ud83d\udd12' },
    { id: 'access', label: 'Access Control', icon: '\ud83d\udd10' },
  ];

  // Filter tabs: hide tabs where ALL required features are disabled by the bot owner
  const tabs = allTabs.filter(t => {
    const requiredFeatures = TAB_FEATURE_MAP[t.id];
    if (!requiredFeatures || requiredFeatures.length === 0) return true;
    return requiredFeatures.some(f => !ownerDisabledFeatures.has(f));
  });

  const updateConfig = (key: string, value: unknown) => setConfig(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <DashboardNav />
        <div className="pt-24 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </main>
    );
  }

  if (platform === 'telegram_userbot') {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <DashboardNav />
        <div className="pt-24 px-4 md:px-8 max-w-5xl mx-auto pb-12">
          <TelegramUserbotDashboard sessionId={sessionId} />
        </div>
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
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Session: {sessionId?.toString().slice(0, 8)}...
          </p>
        </motion.div>

        {/* Group Selector */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: 'var(--card-bg)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-2">
              <button onClick={() => { setConfigMode('global'); setSelectedGroup(''); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${configMode === 'global' ? 'bg-blue-600 text-white' : ''}`}
                style={configMode !== 'global' ? { background: 'var(--bg)', color: 'var(--text-secondary)' } : undefined}>
                Global Defaults
              </button>
              <button onClick={() => setConfigMode('group')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${configMode === 'group' ? 'bg-blue-600 text-white' : ''}`}
                style={configMode !== 'group' ? { background: 'var(--bg)', color: 'var(--text-secondary)' } : undefined}>
                Per-Group Config
              </button>
            </div>
            {configMode === 'group' && (
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="flex-1 w-full sm:w-auto p-2 rounded-xl text-sm"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                <option value="">Select a group...</option>
                {groups.map(g => (
                  <option key={g.chat_id} value={g.chat_id}>
                    {g.chat_title || `Group ${g.chat_id}`}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {configMode === 'global'
              ? 'Global defaults apply to all groups unless overridden by per-group settings.'
              : selectedGroup
                ? 'Settings saved here override global defaults for this group only.'
                : 'Select a group to configure its specific settings.'}
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">{success}</div>}

        {ownerDisabledFeatures.size > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs">
            Some features are disabled by the bot owner and are not available for this group.
          </div>
        )}

        {/* Quick Settings Search */}
        <div className="mb-4">
          <input type="text" value={settingsSearch} onChange={e => setSettingsSearch(e.target.value)}
            placeholder="Search settings... (e.g. antiflood, welcome, captcha)"
            className="w-full p-3 rounded-xl text-sm" style={INPUT_STYLE} />
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          {tabs.filter(t => !settingsSearch || t.label.toLowerCase().includes(settingsSearch.toLowerCase())).map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSettingsSearch(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : ''}`}
              style={activeTab !== t.id ? { background: 'var(--card-bg)', color: 'var(--text-secondary)' } : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-0">
            <SectionCard title="Language & Timezone">
              <SelectInput config={config} updateConfig={updateConfig} configKey="bot_language" label="Language" options={[
                { value: 'en', label: 'English' }, { value: 'fa', label: 'Farsi / Persian' },
                { value: 'ar', label: 'Arabic' }, { value: 'tr', label: 'Turkish' },
                { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' }, { value: 'ru', label: 'Russian' },
                { value: 'zh', label: 'Chinese' }, { value: 'ja', label: 'Japanese' },
              ]} />
              <SelectInput config={config} updateConfig={updateConfig} configKey="timezone" label="Time Zone" desc="Timings will be calculated based on this timezone."
                options={TIMEZONES.map(tz => ({ value: tz, label: tz }))} />
            </SectionCard>

            <SectionCard title="Welcome & Rules">
              <Toggle config={config} updateConfig={updateConfig} configKey="welcome_enabled" label="Sending welcome message" desc="Send a welcome message when new members join." />
              <Toggle config={config} updateConfig={updateConfig} configKey="rules_enabled" label="Sending the rules" desc="Enable sending group rules." />
              <Toggle config={config} updateConfig={updateConfig} configKey="admonition_enabled" label="Sending admonition message" desc="Send admonition messages when users violate rules." />
            </SectionCard>

            <SectionCard title="Bot Behavior">
              <Toggle config={config} updateConfig={updateConfig} configKey="noiseless_mode" label="Noiseless mode" desc="Bot messages are sent silently to the group." />
              <Toggle config={config} updateConfig={updateConfig} configKey="auto_delete_bot_msgs" label="Auto deletion of bot messages" desc="Automatically delete messages sent by the bot." />
              {config.auto_delete_bot_msgs && (
                <div className="ml-4 mt-2 mb-2">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="auto_delete_minutes" label="Deletion time of bot messages (minutes)" min={1} max={1440} />
                </div>
              )}
              <Toggle config={config} updateConfig={updateConfig} configKey="check_admin_violations" label="Check rules violation by admins" desc="Apply rules to admins as well." />
              <Toggle config={config} updateConfig={updateConfig} configKey="verify_user_realness" label="Verification of user realness" desc="Every member joining must verify by tapping a designated button." />
              <Toggle config={config} updateConfig={updateConfig} configKey="ignore_public_commands" label="Ignoring public commands" desc="Restrict regular members from using info commands." />
              <Toggle config={config} updateConfig={updateConfig} configKey="remove_join_leave_notifs" label="Removal of join and leave notifications" />
            </SectionCard>

            <SectionCard title="Warnings">
              <Toggle config={config} updateConfig={updateConfig} configKey="warnings_enabled" label="Keeping the count of warnings" desc="Each violation of the rules will be counted as a warning." />
              {config.warnings_enabled && (
                <div className="mt-3 space-y-0">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="max_warnings" label="Maximum allowed warnings" desc="If the number of warnings reaches this threshold, the user will be restricted." min={1} max={100} />
                  <NumberInput config={config} updateConfig={updateConfig} configKey="warning_keep_days" label="Timeframe of keeping warnings (days)" desc="Number of days to keep each warning given to each user." min={1} max={365} />
                  <SelectInput config={config} updateConfig={updateConfig} configKey="default_violation_penalty" label="Default penalty for rules violation" desc="Action the bot takes when someone violates the rules." options={PENALTY_OPTIONS} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Admin Settings">
              <Toggle config={config} updateConfig={updateConfig} configKey="anon_admin" label="Anonymous Admin" desc="Allow anonymous admins to use all commands without checking permissions. Not recommended." />
              <Toggle config={config} updateConfig={updateConfig} configKey="admin_error_messages" label="Admin Error Messages" desc="Send error messages when normal users use admin commands." />
              <TextInput config={config} updateConfig={updateConfig} configKey="log_channel_id" label="Log Channel ID" placeholder="-1001234567890" desc="Channel ID where moderation logs will be sent." />
            </SectionCard>

            <SectionCard title="Messages">
              <TextArea config={config} updateConfig={updateConfig} configKey="welcome_message" label="Welcome Message" placeholder="Welcome to the group!" desc="Variables: {name}, {username}, {group}, {count}, {mention}" />
              <TextArea config={config} updateConfig={updateConfig} configKey="goodbye_message" label="Goodbye Message" placeholder="Goodbye!" desc="Variables: {name}, {username}, {group}" />
              <Toggle config={config} updateConfig={updateConfig} configKey="clean_welcome" label="Auto-delete old welcome messages" desc="Automatically remove previous welcome messages when a new member joins." />
            </SectionCard>

            <SectionCard title="Bot Texts">
              <TextArea config={config} updateConfig={updateConfig} configKey="start_text" label="/start message" desc="Custom message shown when user sends /start in DM. Leave empty for default." placeholder="Welcome to BotWave!" rows={3} />
              <TextArea config={config} updateConfig={updateConfig} configKey="help_text" label="/help message" desc="Custom help text. Leave empty for default." placeholder="Here are my commands..." rows={3} />
              <TextArea config={config} updateConfig={updateConfig} configKey="rules_text" label="Group rules" desc="Rules text shown via /rules command." placeholder="1. Be respectful..." rows={4} />
            </SectionCard>

            <SectionCard title="XP System">
              <Toggle config={config} updateConfig={updateConfig} configKey="xp_enabled" label="XP System" desc="Members earn XP and level up by chatting." />
            </SectionCard>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-0">
            <SectionCard title="Protection Features">
              <Toggle config={config} updateConfig={updateConfig} configKey="antiflood_enabled" label="Anti-Flood" desc="Rate-limit messages & auto-mute spammers." />
              <Toggle config={config} updateConfig={updateConfig} configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links from messages." />
              <Toggle config={config} updateConfig={updateConfig} configKey="antiraid_enabled" label="Anti-Raid" desc="Auto-detect mass joins & lockdown." />
              <Toggle config={config} updateConfig={updateConfig} configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              <Toggle config={config} updateConfig={updateConfig} configKey="captcha_enabled" label="CAPTCHA" desc="Verify new members with a challenge." />
              <Toggle config={config} updateConfig={updateConfig} configKey="ban_ghosts_enabled" label="Ban Ghosts" desc="Auto-ban deleted/deactivated accounts." />
              <Toggle config={config} updateConfig={updateConfig} configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode via bot." />
            </SectionCard>

            <SectionCard title="Community Features">
              <Toggle config={config} updateConfig={updateConfig} configKey="xp_enabled" label="XP System" desc="Members earn XP & level up by chatting." />
              <Toggle config={config} updateConfig={updateConfig} configKey="karma_enabled" label="Karma" desc="Upvote/downvote via +/- reply." />
              <Toggle config={config} updateConfig={updateConfig} configKey="votekick_enabled" label="VoteKick" desc="Community vote to kick users." />
              {config.votekick_enabled && (
                <div className="ml-4 mt-2 space-y-0">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="votekick_required_votes" label="Required votes" desc="Number of votes needed to kick a user." min={2} max={50} />
                  <NumberInput config={config} updateConfig={updateConfig} configKey="votekick_timeout_secs" label="Vote timeout (seconds)" desc="How long a vote stays open." min={10} max={3600} />
                </div>
              )}
              <Toggle config={config} updateConfig={updateConfig} configKey="mentionall_enabled" label="Mention All" desc="Allow /mentionall to ping all members." />
              <Toggle config={config} updateConfig={updateConfig} configKey="reports_enabled" label="Reports" desc="Users can report messages to admins." />
              <Toggle config={config} updateConfig={updateConfig} configKey="tickets_enabled" label="Tickets" desc="Support ticket system for users." />
            </SectionCard>

            <SectionCard title="Growth & Engagement">
              <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_enabled" label="MemberBooster" desc="Force add / channel join to send messages." />
              <Toggle config={config} updateConfig={updateConfig} configKey="booster_enabled" label="Group Booster" desc="Engagement prompts & growth tools." />
              <Toggle config={config} updateConfig={updateConfig} configKey="welcome_enabled" label="Welcome Bot" desc="Greet new members & say goodbye." />
              <Toggle config={config} updateConfig={updateConfig} configKey="join_approval_enabled" label="Join Approval" desc="Manual/auto-approve join requests." />
              {config.join_approval_enabled && (
                <div className="ml-4 mt-2">
                  <SelectInput config={config} updateConfig={updateConfig} configKey="join_approval_mode" label="Approval mode" options={[
                    { value: 'manual', label: 'Manual (admin approves)' },
                    { value: 'auto', label: 'Auto (approve all)' },
                    { value: 'captcha', label: 'CAPTCHA (verify first)' },
                  ]} />
                </div>
              )}
              <Toggle config={config} updateConfig={updateConfig} configKey="federation_enabled" label="Federation" desc="Cross-group ban sharing (TrustNet)." />
            </SectionCard>

            <SectionCard title="AI & Smart Features">
              <Toggle config={config} updateConfig={updateConfig} configKey="ai_enabled" label="AI Chat" desc="Groq AI /ask, /summarize, /translate." />
              <Toggle config={config} updateConfig={updateConfig} configKey="autoreply_enabled" label="Auto Reply" desc="Custom keyword triggers & responses." />
              <Toggle config={config} updateConfig={updateConfig} configKey="namehistory_enabled" label="Name History" desc="Track user name/username changes." />
              <Toggle config={config} updateConfig={updateConfig} configKey="analytics_enabled" label="Analytics" desc="Message stats & activity tracking." />
            </SectionCard>

            <SectionCard title="Fun & Utility">
              <Toggle config={config} updateConfig={updateConfig} configKey="games_enabled" label="Mini Games" desc="Trivia, word scramble & math quiz." />
              <Toggle config={config} updateConfig={updateConfig} configKey="funextras_enabled" label="Fun Extras" desc="Roast, compliment, dare, truth, lyrics." />
              <Toggle config={config} updateConfig={updateConfig} configKey="texttools_enabled" label="Text Tools" desc="Reverse, mock, morse, leet, flip." />
              <Toggle config={config} updateConfig={updateConfig} configKey="quicktools_enabled" label="Quick Utils" desc="Password, UUID, calc, BMI, hash." />
              <Toggle config={config} updateConfig={updateConfig} configKey="profiletools_enabled" label="Profile Tools" desc="User profiles & member lookup." />
              <Toggle config={config} updateConfig={updateConfig} configKey="stickers_enabled" label="Sticker Maker" desc="Steal & manage sticker packs." />
              <Toggle config={config} updateConfig={updateConfig} configKey="polls_enabled" label="Polls & Quiz" desc="Create polls & quizzes natively." />
            </SectionCard>

            <SectionCard title="Media & Downloads">
              <Toggle config={config} updateConfig={updateConfig} configKey="mediadownload_enabled" label="Media Download" desc="Download from YT, TikTok, IG." />
              <Toggle config={config} updateConfig={updateConfig} configKey="mediatools_enabled" label="Media Tools" desc="QR codes, timestamps, encoding." />
              <Toggle config={config} updateConfig={updateConfig} configKey="imagetools_enabled" label="Image Tools" desc="File info, download, captions." />
              <Toggle config={config} updateConfig={updateConfig} configKey="infolookup_enabled" label="Info Lookup" desc="Crypto, IP, WHOIS, weather, npm." />
            </SectionCard>

            <SectionCard title="Moderation">
              <Toggle config={config} updateConfig={updateConfig} configKey="warnings_enabled" label="Warnings" desc="Track rule violations with warnings." />
              <SelectInput config={config} updateConfig={updateConfig} configKey="warn_action" label="Warning action" desc="Action to take when warn limit is reached." options={PENALTY_OPTIONS} />
              <NumberInput config={config} updateConfig={updateConfig} configKey="warn_limit" label="Warning limit" desc="Number of warnings before action is taken." min={1} max={100} />
              <SelectInput config={config} updateConfig={updateConfig} configKey="blacklist_mode" label="Blacklist mode" desc="Action taken when a blacklisted word is detected."
                options={[
                  { value: 'delete', label: 'Delete message' },
                  { value: 'warn', label: 'Warn user' },
                  { value: 'mute', label: 'Mute user' },
                  { value: 'ban', label: 'Ban user' },
                  { value: 'kick', label: 'Kick user' },
                ]} />
            </SectionCard>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'protection' && (
          <div className="space-y-0">
            <SectionCard title="Anti-Flood">
              <Toggle config={config} updateConfig={updateConfig} configKey="antiflood_enabled" label="Anti-Flood" desc="Take action on users that send too many messages in a row." />
              {config.antiflood_enabled && (
                <div className="mt-3 space-y-0">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="antiflood_max_per_min" label="Max messages per minute" desc="Number of consecutive messages to trigger antiflood." min={1} max={100} />
                  <SelectInput config={config} updateConfig={updateConfig} configKey="antiflood_action" label="Flood mode (action type)" desc="Action to take on a user who has been flooding." options={PENALTY_OPTIONS} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput config={config} updateConfig={updateConfig} configKey="antiflood_timed_count" label="Timed flood count" desc="Messages in timed window (0 = disabled)" min={0} />
                    <NumberInput config={config} updateConfig={updateConfig} configKey="antiflood_timed_duration_secs" label="Timed flood window (seconds)" desc="Time window for timed antiflood" min={0} />
                  </div>
                  <Toggle config={config} updateConfig={updateConfig} configKey="antiflood_clear_messages" label="Clear flood messages" desc="Delete the messages that triggered the flood." />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Anti-Raid">
              <Toggle config={config} updateConfig={updateConfig} configKey="antiraid_enabled" label="Anti-Raid" desc="Temporarily ban new joins during a raid attack." />
              {config.antiraid_enabled && (
                <div className="mt-3 space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NumberInput config={config} updateConfig={updateConfig} configKey="antiraid_threshold" label="Threshold (joins/min)" min={1} />
                    <div className="mb-4">
                      <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Mode</label>
                      <select value={config.antiraid_mode} onChange={e => updateConfig('antiraid_mode', e.target.value)}
                        className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE}>
                        <option value="restrict">Restrict</option>
                        <option value="ban">Ban</option>
                        <option value="captcha">Captcha</option>
                        <option value="lockdown">Lockdown</option>
                      </select>
                    </div>
                    <NumberInput config={config} updateConfig={updateConfig} configKey="antiraid_duration_mins" label="Duration (minutes)" min={1} />
                  </div>
                  <TextInput config={config} updateConfig={updateConfig} configKey="antiraid_time" label="Raid time" desc="Duration for antiraid mode. Default: 6h" placeholder="6h" />
                  <TextInput config={config} updateConfig={updateConfig} configKey="antiraid_action_time" label="Raid action time" desc="How long new joiners are temp-banned. Default: 1h" placeholder="1h" />
                  <NumberInput config={config} updateConfig={updateConfig} configKey="auto_antiraid_threshold" label="Auto antiraid threshold" desc="Joins per minute to auto-enable antiraid. 0 = disabled." min={0} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Anti-Link">
              <Toggle config={config} updateConfig={updateConfig} configKey="antilink_enabled" label="Anti-Link" desc="Remove unauthorized links from messages." />
              {config.antilink_enabled && (
                <div className="mt-3 space-y-0">
                  <TextArea config={config} updateConfig={updateConfig} configKey="antilink_whitelist" label="Whitelisted domains" desc="Domains that are allowed. One per line. E.g. youtube.com" placeholder="youtube.com\ngoogle.com" rows={3} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Night Mode">
              <Toggle config={config} updateConfig={updateConfig} configKey="night_mode_enabled" label="Night Mode" desc="Restrict messages during night hours." />
              {config.night_mode_enabled && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <TimeInput config={config} updateConfig={updateConfig} configKey="night_mode_start" label="Start Time" />
                  <TimeInput config={config} updateConfig={updateConfig} configKey="night_mode_end" label="End Time" />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Slow Mode">
              <Toggle config={config} updateConfig={updateConfig} configKey="slowmode_enabled" label="Slow Mode" desc="Control chat slow mode via bot." />
              {config.slowmode_enabled && (
                <NumberInput config={config} updateConfig={updateConfig} configKey="slowmode_seconds" label="Slow mode delay (seconds)" desc="Minimum seconds between messages per user. 0 = off." min={0} max={86400} />
              )}
            </SectionCard>

            <SectionCard title="CAPTCHA">
              <Toggle config={config} updateConfig={updateConfig} configKey="captcha_enabled" label="CAPTCHA" desc="Require verification for new members before they can send messages." />
              {config.captcha_enabled && (
                <div className="mt-3 space-y-0">
                  <SelectInput config={config} updateConfig={updateConfig} configKey="captcha_mode" label="CAPTCHA Mode" desc="Type of CAPTCHA challenge to show new members."
                    options={[
                      { value: 'button', label: 'Button (click to verify)' },
                      { value: 'math', label: 'Math (solve equation)' },
                      { value: 'text', label: 'Text (type shown text)' },
                      { value: 'text2', label: 'Text v2 (advanced)' },
                    ]} />
                  <Toggle config={config} updateConfig={updateConfig} configKey="captcha_rules" label="Require accepting rules" desc="New users must accept the group rules before speaking." />
                  <Toggle config={config} updateConfig={updateConfig} configKey="captcha_kick" label="Kick unverified users" desc="Kick users who don't solve the CAPTCHA in time." />
                  <TextInput config={config} updateConfig={updateConfig} configKey="captcha_kick_time" label="CAPTCHA kick time" desc="Time after which unverified users are kicked. E.g. 5m, 1h, 1d. Leave empty for default (60s)." placeholder="5m" />
                  <TextInput config={config} updateConfig={updateConfig} configKey="captcha_mute_time" label="CAPTCHA mute time" desc="Auto-unmute time for CAPTCHA. Leave empty to keep muted until solved." placeholder="5m" />
                  <TextInput config={config} updateConfig={updateConfig} configKey="captcha_button_text" label="Custom CAPTCHA button text" desc="Custom text for the verify button. Leave empty for default." placeholder="I'm human - click to verify" />
                </div>
              )}
            </SectionCard>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'prohibitions' && (
          <div className="space-y-0">
            <SectionCard title="Ads & Bots">
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_unofficial_ads" label="Ads of unofficial Telegram apps" desc="Block advertisements sent by unofficial Telegram apps." />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_bots_deletion" label="Bots deletion" desc="Remove bots added to the group." />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_bot_inviter_removal" label="Bot inviter removal" desc="Remove users who invite bots." />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_userbots" label="Prohibition of user-bots" desc="Block userbot accounts that send unsolicited advertisements." />
            </SectionCard>

            <SectionCard title="Silence (Content Locks)">
              <Toggle config={config} updateConfig={updateConfig} configKey="strict_mode" label="Strict mode" desc="Prevent accounts distributing unidentifiable content. Caution: may restrict many members." />
              <div className="my-3 border-t" style={{ borderColor: 'var(--border)' }} />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_porn_words" label="Prohibition of pornographic words" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_website_links" label="Prohibition of website links" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_telegram_links" label="Prohibition of Telegram links" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_usernames" label="Prohibition of usernames" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_hashtags" label="Prohibition of hashtags" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_text" label="Prohibition of text" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_forwarding" label="Prohibition of forwarding" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_forward_channels" label="Prohibition of forwarding from channels" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_pictures" label="Prohibition of pictures" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_videos" label="Prohibition of videos" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_stickers" label="Prohibition of stickers" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_emojis" label="Prohibition of emojis" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_emoji_only" label="Prohibition of emoji only" desc="Messages that consist solely of emojis without any text." />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_location" label="Prohibition of location" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_contact" label="Prohibition of contact" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_audio" label="Prohibition of audio" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_voice" label="Prohibition of recorded voice" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_files" label="Prohibition of files" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_apps" label="Prohibition of apps" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_gifs" label="Prohibition of GIFs" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_polls" label="Prohibition of polls" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_glass_buttons" label="Prohibition of glass buttons" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_games" label="Prohibition of games" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_bot_commands" label="Prohibition of bot commands" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_textless_posts" label="Prohibition of textless posts" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_english" label="Prohibition of English" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_arabic_farsi" label="Prohibition of Arabic and Farsi" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_regular_reply" label="Prohibition of regular users replying" />
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_external_reply" label="Prohibition of external reply" />
            </SectionCard>

            <SectionCard title="Pattern & Word Filters">
              <TextInput config={config} updateConfig={updateConfig} configKey="message_regex_pattern" label="Pattern of messages (REGEX)" desc="Advanced: Specify a REGEX pattern for messages." placeholder="e.g. .*spam.*" />
              <TextArea config={config} updateConfig={updateConfig} configKey="forbidden_words" label="Forbidden words" desc="Each word on a separate line." placeholder="word1\nword2\nword3" rows={4} />
              <TextArea config={config} updateConfig={updateConfig} configKey="necessary_words" label="Necessary words" desc="Every message must contain at least one of these words. Each on a separate line." placeholder="word1\nword2" rows={4} />
            </SectionCard>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'numerical' && (
          <div className="space-y-0">
            <SectionCard title="Message Word Limits">
              <NumberInput config={config} updateConfig={updateConfig} configKey="min_message_words" label="Minimum number of message words" desc="0 = no minimum." min={0} />
              <NumberInput config={config} updateConfig={updateConfig} configKey="max_message_words" label="Maximum number of message words" desc="0 = no maximum." min={0} />
            </SectionCard>

            <SectionCard title="Message Count Limits">
              <NumberInput config={config} updateConfig={updateConfig} configKey="message_count_limit" label="Limitation of number of messages" desc="Each user is limited to sending this many messages within the counting timeframe. 0 = disabled." min={0} />
              <NumberInput config={config} updateConfig={updateConfig} configKey="message_count_timeframe_mins" label="Timeframe of counting messages (minutes)" desc="Number of messages will be counted in this timeframe." min={1} />
            </SectionCard>

            <SectionCard title="Repeated Message Limits">
              <NumberInput config={config} updateConfig={updateConfig} configKey="max_repeated_messages" label="Max count of repeated messages" desc="0 = no limit on repeated messages." min={0} />
              <NumberInput config={config} updateConfig={updateConfig} configKey="repeated_msg_timeframe_mins" label="Timeframe of counting repeated messages (minutes)" min={1} />
            </SectionCard>

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'silence' && (
          <div className="space-y-0">
            {[1, 2, 3].map(n => (
              <SectionCard key={n} title={`${['First', 'Second', 'Third'][n - 1]} Silent Time`}>
                <Toggle config={config} updateConfig={updateConfig} configKey={`silent_time_${n}_enabled`} label="Status" desc={`Enable the ${['first', 'second', 'third'][n - 1]} silent time period.`} />
                {config[`silent_time_${n}_enabled`] && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <TimeInput config={config} updateConfig={updateConfig} configKey={`silent_time_${n}_start`} label="Start Time" />
                    <TimeInput config={config} updateConfig={updateConfig} configKey={`silent_time_${n}_end`} label="End Time" />
                  </div>
                )}
              </SectionCard>
            ))}
            <SectionCard title="Temporary Lock of Group">
              <Toggle config={config} updateConfig={updateConfig} configKey="temporary_lock_enabled" label="Status" desc="If the group is locked, all message types will be restricted." />
            </SectionCard>
            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'memberships' && (
          <div className="space-y-0">
            <SectionCard title="Forced Add">
              <NumberInput config={config} updateConfig={updateConfig} configKey="forced_add_count" label="Forced Add" desc="Members must invite this number of members before sending messages. 0 = disabled." min={0} />
              <NumberInput config={config} updateConfig={updateConfig} configKey="forced_add_timeframe_days" label="Forced add timeframe (days)" desc="The count of added members resets after this period." min={0} />
            </SectionCard>
            <SectionCard title="Force Join Channel">
              <TextInput config={config} updateConfig={updateConfig} configKey="force_channel" label="Force Join Channel" desc="Users must join this channel before they can chat. Use @channel_username format. Leave empty to disable." placeholder="@channel_username" />
            </SectionCard>
            <SectionCard title="Mandatory Channel Membership">
              <TextArea config={config} updateConfig={updateConfig} configKey="mandatory_channels" label="Mandatory channel membership"
                desc="Ensure botwave has admin privileges in your channel. Provide usernames prefixed with @, each on a separate line."
                placeholder="@channel1\n@channel2" rows={4} />
            </SectionCard>
            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'memberbooster' && (
          <div className="space-y-0">
            <SectionCard title="MemberBooster">
              <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_enabled" label="Enable MemberBooster" desc="Users must add new members to the group or join a channel to send messages, growing your group and channel." />
            </SectionCard>

            {config.memberbooster_enabled && (
              <>
                <SectionCard title="Force Add Settings">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="memberbooster_max" label="Required members to add (!max)" desc="Number of members each user must invite. 0 = disabled." min={0} />
                  <SelectInput config={config} updateConfig={updateConfig} configKey="memberbooster_max_mode" label="Force add mode (!max.mode)" desc="Whether only new members or all members must add."
                    options={[
                      { value: 'new', label: 'New members only' },
                      { value: 'all', label: 'All members' },
                    ]} />
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_hard_mode" label="Hard mode (!hard_mode)" desc="Strict enforcement - users cannot send any messages until requirement is met." />
                </SectionCard>

                <SectionCard title="Daily Limits">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="memberbooster_daily" label="Daily add limit (!daily)" desc="Number of members a user must add per day. 0 = no daily limit." min={0} />
                  <NumberInput config={config} updateConfig={updateConfig} configKey="memberbooster_daily_minute" label="Daily limit period in minutes (!daily.minute)" desc="Duration of the daily limit cycle in minutes. Default: 1440 (24h)." min={1} />
                  <SelectInput config={config} updateConfig={updateConfig} configKey="memberbooster_daily_mode" label="Daily mode (!daily.mode)" desc="Whether the daily limit resets at 24h or accumulates."
                    options={[
                      { value: 'reset', label: 'Reset after period' },
                      { value: 'accumulate', label: 'Accumulate (no reset)' },
                    ]} />
                </SectionCard>

                <SectionCard title="Forced Channel Join">
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_channel_enabled" label="Force join channel (!channel 1/0)" desc="Require users to join a channel before they can send messages." />
                  {config.memberbooster_channel_enabled && (
                    <TextInput config={config} updateConfig={updateConfig} configKey="memberbooster_channel" label="Channel address (!channel @...)" desc="Channel username with @ prefix." placeholder="@YourChannelID" />
                  )}
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_channel2_enabled" label="Force join second channel (!channel2 1/0)" desc="Require users to join a second channel." />
                  {config.memberbooster_channel2_enabled && (
                    <TextInput config={config} updateConfig={updateConfig} configKey="memberbooster_channel2" label="Second channel address (!channel2 @...)" desc="Second channel username with @ prefix." placeholder="@YourSecondChannelID" />
                  )}
                </SectionCard>

                <SectionCard title="Forced Boost">
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_forced_boost" label="Forced boost (!forced_boost 1/0)" desc="Require users to boost the group before they can send messages." />
                </SectionCard>

                <SectionCard title="Inline Button">
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_btn_enabled" label="Show inline button (!btn 1/0)" desc="Display an inline button below all MemberBooster messages." />
                  {config.memberbooster_btn_enabled && (
                    <>
                      <TextInput config={config} updateConfig={updateConfig} configKey="memberbooster_btn_link" label="Button link (!btn [link])" desc="URL the button links to." placeholder="https://t.me/your_channel" />
                      <TextInput config={config} updateConfig={updateConfig} configKey="memberbooster_btn_text" label="Button text (!btn_text [text])" desc="Text displayed on the inline button." placeholder="Join our channel" />
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Custom Texts">
                  <Toggle config={config} updateConfig={updateConfig} configKey="memberbooster_text_enabled" label="Show warning text (!text 1/0)" desc="Display the force add warning message to users." />
                  <TextArea config={config} updateConfig={updateConfig} configKey="memberbooster_text" label="Force add message (!text)" desc="Variables: !name (username), !count (required), !added (added so far), !remain (remaining)." placeholder="!name, you need to add !count members. You have added !added so far. !remain remaining." rows={3} />
                  <TextArea config={config} updateConfig={updateConfig} configKey="memberbooster_channel_text" label="Force join channel message (!text.channel)" desc="Custom message shown when users haven't joined the required channel." placeholder="You must join the channel before sending messages." rows={3} />
                  <TextArea config={config} updateConfig={updateConfig} configKey="memberbooster_daily_text" label="Daily alert message (!text.daily)" desc="Custom message for daily limit alerts." placeholder="You have reached your daily add limit." rows={3} />
                </SectionCard>
              </>
            )}

            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'texts' && (
          <div className="space-y-0">
            <SectionCard title="Welcome Message">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_welcome_text" label="Welcome message content" desc="Use {user} for username and {group} for group name." rows={4} />
            </SectionCard>
            <SectionCard title="Rules Text">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_rules_text" label="Customized rules text" desc="Use {user} for username and {group} for group name." rows={4} />
            </SectionCard>
            <SectionCard title="Silent Time Messages">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_silent_start_text" label="Customized text of start of silent time" desc="Use {starttime} and {endtime} keywords." rows={3} />
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_silent_end_text" label="Customized text of end of silent time" desc="Use {starttime} and {endtime} keywords." rows={3} />
            </SectionCard>
            <SectionCard title="Admonition Text">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_admonition_text" label="Customized admonition text" desc="Keywords: {reason}, {penalty}, {user_warnings}, {warnings_count}, {warningstime}" rows={4} />
            </SectionCard>
            <SectionCard title="Forced Add Text">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_forced_add_text" label="Customized forced add text" desc="Use {added} for added count and {number} for required count." rows={3} />
            </SectionCard>
            <SectionCard title="Mandatory Channel Text">
              <TextArea config={config} updateConfig={updateConfig} configKey="custom_mandatory_channel_text" label="Customized mandatory channel membership text" desc="Use {channel_names} to insert channel names." rows={3} />
            </SectionCard>
            <SaveButton onClick={saveConfig} saving={saving} />
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
                placeholder="Note name" className="w-full p-2 rounded-xl text-sm mb-3" style={INPUT_STYLE} />
              <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Note content..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={INPUT_STYLE} />
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
                placeholder="Keyword" className="w-full p-2 rounded-xl text-sm mb-3" style={INPUT_STYLE} />
              <textarea value={newFilterResponse} onChange={e => setNewFilterResponse(e.target.value)}
                placeholder="Response..." rows={3} className="w-full p-2 rounded-xl text-sm mb-3 resize-none" style={INPUT_STYLE} />
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
            <div className="flex gap-3">
              <a href={`/api/telegram/xp/export?sessionId=${sessionId}${selectedGroup ? `&chatId=${selectedGroup}` : ''}`}
                download className="flex-1 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold text-center">
                Export CSV
              </a>
              <button onClick={resetXP} className="flex-1 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Reset All XP</button>
            </div>
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
            <SectionCard title="Daily AI Summary">
              <Toggle config={config} updateConfig={updateConfig} configKey="daily_summary_enabled" label="Enable Daily Summary" desc="AI-powered daily digest sent to the group or a log channel." />
              {config.daily_summary_enabled && (
                <div className="mt-3 space-y-0">
                  <NumberInput config={config} updateConfig={updateConfig} configKey="daily_summary_hour" label="Summary Hour (UTC, 0-23)" desc="Hour of day to send the summary." min={0} max={23} />
                  <TextInput config={config} updateConfig={updateConfig} configKey="daily_summary_channel_id" label="Override Channel ID" desc="Optional: send summary to a different channel instead of the group." placeholder="e.g. -1001234567890" />
                </div>
              )}
            </SectionCard>
            <SectionCard title="Group Statistics">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Statistics are tracked automatically when the bot is active in groups.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg)' }}>
                  <div className="text-4xl mb-2">{'\ud83d\udcc8'}</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>--</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>New Members (30 days)</div>
                </div>
                <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg)' }}>
                  <div className="text-4xl mb-2">{'\ud83d\udcac'}</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>--</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Group Messages (30 days)</div>
                </div>
              </div>
              <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                Statistics update in real-time as the bot processes events.
              </p>
            </SectionCard>
            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'ignored' && (
          <div className="space-y-6">
            <SectionCard title="Ignored Chats">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                The bot will completely stop responding in ignored chats. Use this to disable the bot in specific groups without removing it.
                You can also use <code>/ignorechat</code> in any group to add it here.
              </p>
              <div className="space-y-3 mb-4">
                <input type="text" value={newIgnoreChatId} onChange={e => setNewIgnoreChatId(e.target.value)}
                  placeholder="Chat ID (e.g. -1001234567890)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <input type="text" value={newIgnoreChatTitle} onChange={e => setNewIgnoreChatTitle(e.target.value)}
                  placeholder="Chat name (optional, for your reference)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <button onClick={addIgnoredChat}
                  className="w-full p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors">
                  Add to Ignore List
                </button>
              </div>
              {ignoredChats.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No chats are being ignored.</p>
              ) : (
                <div className="space-y-2">
                  {ignoredChats.map(chat => (
                    <div key={chat.chat_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {chat.chat_title || 'Unknown Chat'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          ID: {chat.chat_id}
                        </div>
                      </div>
                      <button onClick={() => removeIgnoredChat(chat.chat_id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'adminmode' && (
          <div className="space-y-6">
            <SectionCard title="Admin-Only Mode">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                When enabled, only group admins can use bot commands. Regular members will be ignored.
                This is useful for groups where you want the bot to only respond to admin commands.
              </p>
              <Toggle config={config} updateConfig={updateConfig} configKey="admin_only_mode" label="Admin-Only Mode" desc="Only admins can use bot commands in groups." />
            </SectionCard>
            <SectionCard title="Support Group Guard">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                In the BotWave support group, the bot automatically detects and deletes userbot-style commands
                (like .ban, !kick, ~purge) from non-admin users. Admin userbots are allowed.
              </p>
              <Toggle config={config} updateConfig={updateConfig} configKey="prohibit_userbots" label="Block Userbot Commands" desc="Auto-delete userbot-style commands from non-admins in this group." />
            </SectionCard>
            <SaveButton onClick={saveConfig} saving={saving} />
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-6">
            <SectionCard title="Bot Mode">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                <b>Public</b> — anyone can add your bot to any group and DM it. This is the default.<br />
                <b>Private</b> — your bot only operates in groups on the allowlist below, and (if you populate the user allowlist) only responds to specific users. The blocklist applies in both modes.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAccessModeRemote('public')}
                  disabled={accessSaving}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    accessMode === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() => setAccessModeRemote('private')}
                  disabled={accessSaving}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    accessMode === 'private' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  Private
                </button>
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                Current mode: <b>{accessMode}</b>. Changes apply within ~30 seconds (the bot caches access config for that long).
              </p>
            </SectionCard>

            <SectionCard title="Group Allowlist">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                In private mode, only these groups can use the bot. If the bot is added to any other group, it will auto-leave and DM the inviter.
                Group IDs look like <code>-1001234567890</code>; you can grab one by forwarding a message from the group to <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="underline">@userinfobot</a>.
              </p>
              <div className="space-y-3 mb-4">
                <input type="text" value={newAllowGroupId} onChange={e => setNewAllowGroupId(e.target.value)}
                  placeholder="Group ID (e.g. -1001234567890)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <input type="text" value={newAllowGroupTitle} onChange={e => setNewAllowGroupTitle(e.target.value)}
                  placeholder="Group name (optional, for your reference)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <button
                  onClick={async () => {
                    await addAccessEntry('groupAllowlist', newAllowGroupId, newAllowGroupTitle);
                    setNewAllowGroupId(''); setNewAllowGroupTitle('');
                  }}
                  className="w-full p-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors">
                  Add to Allowlist
                </button>
              </div>
              {groupAllowlist.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No groups on the allowlist yet.</p>
              ) : (
                <div className="space-y-2">
                  {groupAllowlist.map(g => (
                    <div key={g.chat_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.chat_title || 'Unknown Group'}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {g.chat_id}</div>
                      </div>
                      <button onClick={() => removeAccessEntry('groupAllowlist', g.chat_id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Group Blocklist">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                The bot will refuse to join (or auto-leave) any group on this list, regardless of public/private mode. Use this to permanently block specific groups.
              </p>
              <div className="space-y-3 mb-4">
                <input type="text" value={newBlockGroupId} onChange={e => setNewBlockGroupId(e.target.value)}
                  placeholder="Group ID (e.g. -1001234567890)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <input type="text" value={newBlockGroupTitle} onChange={e => setNewBlockGroupTitle(e.target.value)}
                  placeholder="Group name (optional)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <button
                  onClick={async () => {
                    await addAccessEntry('groupBlocklist', newBlockGroupId, newBlockGroupTitle);
                    setNewBlockGroupId(''); setNewBlockGroupTitle('');
                  }}
                  className="w-full p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors">
                  Add to Blocklist
                </button>
              </div>
              {groupBlocklist.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No groups on the blocklist.</p>
              ) : (
                <div className="space-y-2">
                  {groupBlocklist.map(g => (
                    <div key={g.chat_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.chat_title || 'Unknown Group'}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {g.chat_id}</div>
                      </div>
                      <button onClick={() => removeAccessEntry('groupBlocklist', g.chat_id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="User Allowlist (Private Mode Only)">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Optional. In private mode with at least one user here, ONLY these users can trigger the bot anywhere. Leave empty to allow any user in allowlisted groups. Has no effect in public mode.
                User IDs look like <code>123456789</code>; you can grab one from <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="underline">@userinfobot</a>.
              </p>
              <div className="space-y-3 mb-4">
                <input type="text" value={newAllowUserId} onChange={e => setNewAllowUserId(e.target.value)}
                  placeholder="User ID (e.g. 123456789)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <input type="text" value={newAllowUserLabel} onChange={e => setNewAllowUserLabel(e.target.value)}
                  placeholder="User name (optional)" className="w-full p-2 rounded-xl text-sm" style={INPUT_STYLE} />
                <button
                  onClick={async () => {
                    await addAccessEntry('userAllowlist', newAllowUserId, newAllowUserLabel);
                    setNewAllowUserId(''); setNewAllowUserLabel('');
                  }}
                  className="w-full p-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors">
                  Add User
                </button>
              </div>
              {userAllowlist.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No users on the allowlist. {accessMode === 'private' ? 'In private mode, all users in allowlisted groups can use the bot.' : ''}</p>
              ) : (
                <div className="space-y-2">
                  {userAllowlist.map(u => (
                    <div key={u.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.user_label || 'Unknown User'}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {u.user_id}</div>
                      </div>
                      <button onClick={() => removeAccessEntry('userAllowlist', u.user_id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </main>
  );
}
