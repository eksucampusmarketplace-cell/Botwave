'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import TelegramUserbotSettings from './TelegramUserbotSettings';

type Tab = 'general' | 'pmpermit' | 'afk' | 'notes' | 'filters' | 'gbans' | 'platform' | 'commands';

interface Note { id: string; name: string; content: string; created_at: string; }
interface Filter { id?: string; chat_id: string; keyword: string; response: string; created_at?: string; }
interface GBanEntry { user_id: string; reason: string; created_at: string; }

interface UserbotConfig {
  prefix: string;
  pm_permit_enabled: boolean;
  pm_permit_limit: number;
  pm_permit_message: string;
  pm_permit_image: string;
  pm_permit_inline: boolean;
  anti_pm: boolean;
  anti_pm_block: boolean;
  anti_pm_report: boolean;
  afk_enabled: boolean;
  afk_reason: string;
  alive_message: string;
  alive_image: string;
  log_chat_id: string | null;
  sudo_users: string[];
  disabled_modules: string[];
  auto_read_enabled: boolean;
  presence_simulation: boolean;
  timezone_offset: number;
}

const DEFAULT_CONFIG: UserbotConfig = {
  prefix: '.',
  pm_permit_enabled: false,
  pm_permit_limit: 3,
  pm_permit_message: 'This is an automated message. My owner will get back to you soon. Please wait.',
  pm_permit_image: '',
  pm_permit_inline: false,
  anti_pm: false,
  anti_pm_block: false,
  anti_pm_report: false,
  afk_enabled: false,
  afk_reason: '',
  alive_message: '🤖 BotWave Userbot is alive!',
  alive_image: '',
  log_chat_id: null,
  sudo_users: [],
  disabled_modules: [],
  auto_read_enabled: true,
  presence_simulation: true,
  timezone_offset: 1,
};

const ALL_MODULES = [
  'admin', 'pmpermit', 'afk', 'notes', 'filters', 'purge', 'gban',
  'stickers', 'antiflood', 'welcome', 'chattools', 'texttools',
  'media', 'search', 'fun', 'translate', 'reminders', 'misc',
];

const USERBOT_COMMANDS: { module: string; commands: { cmd: string; desc: string }[] }[] = [
  {
    module: 'PM Permit',
    commands: [
      { cmd: '.approve', desc: 'Approve a user to PM you freely' },
      { cmd: '.disapprove', desc: 'Revoke PM permission from a user' },
      { cmd: '.block', desc: 'Block a user' },
      { cmd: '.unblock', desc: 'Unblock a user' },
      { cmd: '.pmguard on/off', desc: 'Toggle PM Guard protection' },
    ],
  },
  {
    module: 'AFK',
    commands: [
      { cmd: '.afk [reason]', desc: 'Set yourself as AFK' },
      { cmd: '.unafk', desc: 'Remove AFK status' },
    ],
  },
  {
    module: 'Admin',
    commands: [
      { cmd: '.ban', desc: 'Ban a user (reply or ID)' },
      { cmd: '.unban', desc: 'Unban a user' },
      { cmd: '.kick', desc: 'Kick a user from the chat' },
      { cmd: '.mute', desc: 'Mute a user' },
      { cmd: '.unmute', desc: 'Unmute a user' },
      { cmd: '.promote', desc: 'Promote a user to admin' },
      { cmd: '.demote', desc: 'Demote an admin' },
      { cmd: '.pin', desc: 'Pin the replied message' },
      { cmd: '.unpin', desc: 'Unpin all messages' },
    ],
  },
  {
    module: 'Notes',
    commands: [
      { cmd: '.save <name> <content>', desc: 'Save a note' },
      { cmd: '.get <name>', desc: 'Retrieve a note' },
      { cmd: '.clear <name>', desc: 'Delete a note' },
      { cmd: '.notes', desc: 'List all saved notes' },
    ],
  },
  {
    module: 'Filters',
    commands: [
      { cmd: '.filter <keyword> <response>', desc: 'Add auto-reply filter' },
      { cmd: '.stop <keyword>', desc: 'Remove a filter' },
      { cmd: '.filters', desc: 'List active filters in this chat' },
    ],
  },
  {
    module: 'Purge',
    commands: [
      { cmd: '.purge', desc: 'Delete all messages from replied to latest' },
      { cmd: '.purgeme <n>', desc: 'Delete your last N messages' },
      { cmd: '.del', desc: 'Delete the replied message' },
    ],
  },
  {
    module: 'Global Ban',
    commands: [
      { cmd: '.gban <reason>', desc: 'Globally ban a user across all chats' },
      { cmd: '.ungban', desc: 'Remove a global ban' },
      { cmd: '.gbanlist', desc: 'List all globally banned users' },
    ],
  },
  {
    module: 'Settings',
    commands: [
      { cmd: '.setprefix <char>', desc: 'Change command prefix' },
      { cmd: '.setalive <message>', desc: 'Set alive/status message' },
      { cmd: '.alive', desc: 'Show alive status' },
      { cmd: '.ping', desc: 'Check latency' },
      { cmd: '.setlog here/off/<id>', desc: 'Set log channel' },
      { cmd: '.addsudo', desc: 'Add a sudo user' },
      { cmd: '.rmsudo', desc: 'Remove a sudo user' },
      { cmd: '.sudolist', desc: 'List sudo users' },
    ],
  },
  {
    module: 'Stickers',
    commands: [
      { cmd: '.kang', desc: 'Steal/add a sticker to your pack' },
      { cmd: '.stickerid', desc: 'Get sticker file ID' },
      { cmd: '.getsticker', desc: 'Get sticker as file' },
      { cmd: '.stickers', desc: 'Get sticker pack info' },
    ],
  },
  {
    module: 'Text Tools',
    commands: [
      { cmd: '.upper <text>', desc: 'Convert to UPPERCASE' },
      { cmd: '.lower <text>', desc: 'Convert to lowercase' },
      { cmd: '.reverse <text>', desc: 'Reverse text' },
      { cmd: '.mock <text>', desc: 'mOcKiNg SpOnGeBoB text' },
      { cmd: '.vapor <text>', desc: 'V A P O R W A V E text' },
      { cmd: '.tiny <text>', desc: 'Convert to tiny text' },
      { cmd: '.flip <text>', desc: 'Flip text upside down' },
      { cmd: '.b64encode <text>', desc: 'Base64 encode' },
      { cmd: '.b64decode <text>', desc: 'Base64 decode' },
      { cmd: '.clap <text>', desc: 'Add clap emojis between words' },
      { cmd: '.spoiler <text>', desc: 'Wrap text in spoiler' },
      { cmd: '.mono <text>', desc: 'Monospace text' },
      { cmd: '.strike <text>', desc: 'Strikethrough text' },
    ],
  },
  {
    module: 'Chat Tools',
    commands: [
      { cmd: '.chatinfo', desc: 'Get chat information' },
      { cmd: '.admins', desc: 'List chat admins' },
      { cmd: '.invite <user>', desc: 'Invite user to chat' },
      { cmd: '.leave', desc: 'Leave the current chat' },
      { cmd: '.setname <name>', desc: 'Set your display name' },
      { cmd: '.setbio <bio>', desc: 'Set your bio' },
      { cmd: '.zombies', desc: 'Find deleted accounts in chat' },
      { cmd: '.groupname <name>', desc: 'Change group name' },
      { cmd: '.groupbio <bio>', desc: 'Change group description' },
    ],
  },
  {
    module: 'Search',
    commands: [
      { cmd: '.google <query>', desc: 'Search Google' },
      { cmd: '.wiki <query>', desc: 'Search Wikipedia' },
      { cmd: '.calc <expr>', desc: 'Calculate an expression' },
      { cmd: '.currency <amount> <from> <to>', desc: 'Currency conversion' },
      { cmd: '.time [timezone]', desc: 'World clock' },
    ],
  },
  {
    module: 'Translate',
    commands: [
      { cmd: '.tr <lang> <text>', desc: 'Translate text to target language' },
      { cmd: '.translate <lang> <text>', desc: 'Same as .tr' },
      { cmd: '.langs', desc: 'List supported languages' },
    ],
  },
  {
    module: 'Fun',
    commands: [
      { cmd: '.dice', desc: 'Roll a dice emoji' },
      { cmd: '.dart', desc: 'Throw a dart' },
      { cmd: '.slot', desc: 'Spin the slot machine' },
      { cmd: '.basketball', desc: 'Shoot a basketball' },
      { cmd: '.football', desc: 'Kick a football' },
      { cmd: '.bowling', desc: 'Bowl a strike' },
      { cmd: '.coinflip', desc: 'Flip a coin' },
      { cmd: '.rng <min> <max>', desc: 'Random number generator' },
      { cmd: '.8ball <question>', desc: 'Magic 8-ball' },
      { cmd: '.rate <thing>', desc: 'Rate something out of 10' },
      { cmd: '.decide <a> or <b>', desc: 'Let the bot decide' },
      { cmd: '.roll [NdN]', desc: 'Roll dice (e.g., 2d6)' },
    ],
  },
  {
    module: 'Reminders',
    commands: [
      { cmd: '.remind <time> <msg>', desc: 'Set a reminder (e.g., 30m, 2h)' },
      { cmd: '.reminders', desc: 'List active reminders' },
      { cmd: '.cancelremind', desc: 'Cancel all reminders' },
    ],
  },
  {
    module: 'Media',
    commands: [
      { cmd: '.download', desc: 'Download replied media' },
      { cmd: '.forward <chatId>', desc: 'Forward message to another chat' },
      { cmd: '.copy <chatId>', desc: 'Copy message to another chat' },
      { cmd: '.mediainfo', desc: 'Get media file info' },
    ],
  },
  {
    module: 'Antiflood',
    commands: [
      { cmd: '.antiflood <n>', desc: 'Set flood limit (0 = off)' },
    ],
  },
  {
    module: 'Welcome',
    commands: [
      { cmd: '.setwelcome <text>', desc: 'Set welcome message for this chat' },
      { cmd: '.setgoodbye <text>', desc: 'Set goodbye message' },
      { cmd: '.welcome on/off', desc: 'Toggle welcome messages' },
      { cmd: '.goodbye on/off', desc: 'Toggle goodbye messages' },
    ],
  },
  {
    module: 'Misc',
    commands: [
      { cmd: '.alive', desc: 'Check if userbot is running' },
      { cmd: '.ping', desc: 'Check latency' },
      { cmd: '.info', desc: 'Get user info (reply or self)' },
      { cmd: '.id', desc: 'Get chat/user ID' },
      { cmd: '.stats', desc: 'Userbot statistics' },
      { cmd: '.help', desc: 'Show all available commands' },
    ],
  },
];

interface Props {
  sessionId: string;
}

export default function TelegramUserbotDashboard({ sessionId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<UserbotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [gbans, setGbans] = useState<GBanEntry[]>([]);
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFilterKeyword, setNewFilterKeyword] = useState('');
  const [newFilterResponse, setNewFilterResponse] = useState('');
  const [newGbanUserId, setNewGbanUserId] = useState('');
  const [newGbanReason, setNewGbanReason] = useState('');
  const [newSudoUser, setNewSudoUser] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/userbot/config?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setConfig({ ...DEFAULT_CONFIG, ...data.data });
      }
    } catch {}
    setLoading(false);
  }, [sessionId]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/userbot/notes?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setNotes(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/userbot/filters?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setFilters(data.data || []);
    } catch {}
  }, [sessionId]);

  const fetchGbans = useCallback(async () => {
    try {
      const res = await fetch(`/api/telegram/userbot/gbans?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setGbans(data.data || []);
    } catch {}
  }, [sessionId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => {
    if (activeTab === 'notes') fetchNotes();
    if (activeTab === 'filters') fetchFilters();
    if (activeTab === 'gbans') fetchGbans();
  }, [activeTab, fetchNotes, fetchFilters, fetchGbans]);

  const saveConfig = async (updates: Partial<UserbotConfig>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/telegram/userbot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, ...updates }));
        setSuccess('Saved!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save configuration');
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNoteName.trim() || !newNoteContent.trim()) return;
    try {
      const res = await fetch('/api/telegram/userbot/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: newNoteName.trim(), content: newNoteContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteName('');
        setNewNoteContent('');
        fetchNotes();
      }
    } catch {}
  };

  const deleteNote = async (name: string) => {
    try {
      await fetch('/api/telegram/userbot/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name }),
      });
      fetchNotes();
    } catch {}
  };

  const addFilter = async () => {
    if (!newFilterKeyword.trim() || !newFilterResponse.trim()) return;
    try {
      const res = await fetch('/api/telegram/userbot/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId: 'global', keyword: newFilterKeyword.trim(), response: newFilterResponse.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewFilterKeyword('');
        setNewFilterResponse('');
        fetchFilters();
      }
    } catch {}
  };

  const deleteFilter = async (keyword: string, chatId: string) => {
    try {
      await fetch('/api/telegram/userbot/filters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chatId, keyword }),
      });
      fetchFilters();
    } catch {}
  };

  const addGban = async () => {
    if (!newGbanUserId.trim()) return;
    try {
      const res = await fetch('/api/telegram/userbot/gbans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: newGbanUserId.trim(), reason: newGbanReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewGbanUserId('');
        setNewGbanReason('');
        fetchGbans();
      }
    } catch {}
  };

  const removeGban = async (userId: string) => {
    try {
      await fetch('/api/telegram/userbot/gbans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId }),
      });
      fetchGbans();
    } catch {}
  };

  const toggleModule = (mod: string) => {
    const disabled = [...config.disabled_modules];
    const idx = disabled.indexOf(mod);
    if (idx >= 0) disabled.splice(idx, 1);
    else disabled.push(mod);
    saveConfig({ disabled_modules: disabled });
  };

  const addSudoUser = () => {
    if (!newSudoUser.trim()) return;
    const sudoUsers = [...config.sudo_users, newSudoUser.trim()];
    saveConfig({ sudo_users: sudoUsers });
    setNewSudoUser('');
  };

  const removeSudoUser = (userId: string) => {
    const sudoUsers = config.sudo_users.filter(id => id !== userId);
    saveConfig({ sudo_users: sudoUsers });
  };

  const [uploading, setUploading] = useState<string | null>(null);

  const handleImageUpload = async (file: File, field: 'alive_image' | 'pm_permit_image') => {
    setUploading(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('field', field);

      const res = await fetch('/api/telegram/userbot/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setConfig(prev => ({ ...prev, [field]: data.url }));
        setSuccess('Image uploaded successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Upload failed');
        setTimeout(() => setError(''), 3000);
      }
    } catch {
      setError('Upload failed');
      setTimeout(() => setError(''), 3000);
    }
    setUploading(null);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'pmpermit', label: 'PM Permit' },
    { id: 'afk', label: 'AFK' },
    { id: 'notes', label: 'Notes' },
    { id: 'filters', label: 'Filters' },
    { id: 'gbans', label: 'Global Bans' },
    { id: 'platform', label: 'Auto-Forward' },
    { id: 'commands', label: 'Commands' },
  ];

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  if (loading) return <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
          Telegram <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-400">Userbot</span>
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Session: {sessionId.slice(0, 8)}... &nbsp;|&nbsp; Prefix: <code className="text-blue-500">{config.prefix}</code>
        </p>
      </motion.div>

      {(success || error) && (
        <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-medium ${success ? 'bg-green-50 dark:bg-green-500/10 text-green-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
          {success || error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : ''
            }`}
            style={activeTab !== tab.id ? { background: 'var(--card-bg)', color: 'var(--text-secondary)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Section title="General Settings">
            <div className="space-y-4">
              <InputField label="Command Prefix" desc="Character that triggers commands (1-2 chars)" value={config.prefix}
                onChange={v => setConfig(prev => ({ ...prev, prefix: v }))} maxLength={2} />
              <InputField label="Alive Message" desc="Response to .alive command (supports markdown)" value={config.alive_message}
                onChange={v => setConfig(prev => ({ ...prev, alive_message: v }))} />
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>Alive Image</label>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Image/GIF shown with .alive - paste a URL or upload a file (leave blank for text only)</p>
                <div className="flex gap-2">
                  <input type="text" value={config.alive_image} onChange={e => setConfig(prev => ({ ...prev, alive_image: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <label className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-500 transition-colors cursor-pointer flex-shrink-0">
                    {uploading === 'alive_image' ? '...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'alive_image'); }} />
                  </label>
                </div>
                {config.alive_image && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={config.alive_image} alt="Alive preview" className="h-12 w-12 rounded-lg object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    <button onClick={() => setConfig(prev => ({ ...prev, alive_image: '' }))} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                  </div>
                )}
              </div>
              <InputField label="Log Chat ID" desc="Chat ID for logging actions (blank = disabled)" value={config.log_chat_id || ''}
                onChange={v => setConfig(prev => ({ ...prev, log_chat_id: v || null }))} />
              <InputField label="Timezone Offset (hours)" desc="UTC offset for time-based features" value={config.timezone_offset.toString()}
                onChange={v => setConfig(prev => ({ ...prev, timezone_offset: parseInt(v) || 0 }))} type="number" />
            </div>
            <Toggle label="Auto-Read Messages" desc="Automatically mark incoming messages as read" checked={config.auto_read_enabled}
              onChange={v => setConfig(prev => ({ ...prev, auto_read_enabled: v }))} />
            <Toggle label="Presence Simulation" desc="Simulate online/offline status like a real user" checked={config.presence_simulation}
              onChange={v => setConfig(prev => ({ ...prev, presence_simulation: v }))} />
            <SaveButton saving={saving} onClick={() => saveConfig(config)} />
          </Section>

          <Section title="Sudo Users">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Users who can execute commands on your behalf</p>
            <div className="flex gap-2 mb-3">
              <input value={newSudoUser} onChange={e => setNewSudoUser(e.target.value)} placeholder="User ID"
                className="flex-1 p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <button onClick={addSudoUser} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors">Add</button>
            </div>
            {config.sudo_users.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No sudo users configured</p>
            ) : (
              <div className="space-y-2">
                {config.sudo_users.map(uid => (
                  <div key={uid} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{uid}</span>
                    <button onClick={() => removeSudoUser(uid)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Modules">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Enable or disable handler modules</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_MODULES.map(mod => {
                const disabled = config.disabled_modules.includes(mod);
                return (
                  <button key={mod} onClick={() => toggleModule(mod)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      disabled ? 'bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/20'
                        : 'bg-green-50 dark:bg-green-500/10 text-green-600 border border-green-200 dark:border-green-500/20'
                    }`}>
                    {disabled ? '✗' : '✓'} {mod}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* PM Permit */}
      {activeTab === 'pmpermit' && (
        <Section title="PM Permit">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Control who can PM you. Unapproved users get warned, then blocked after exceeding the limit.
          </p>
          <Toggle label="PM Guard" desc="Enable PM protection - unapproved users will be warned" checked={config.pm_permit_enabled}
            onChange={v => { setConfig(prev => ({ ...prev, pm_permit_enabled: v })); saveConfig({ pm_permit_enabled: v }); }} />
          <Toggle label="Anti-PM" desc="Automatically ignore all PMs from unknown users" checked={config.anti_pm}
            onChange={v => { setConfig(prev => ({ ...prev, anti_pm: v })); saveConfig({ anti_pm: v }); }} />
          <Toggle label="Auto-Block" desc="Block users who exceed the warning limit" checked={config.anti_pm_block}
            onChange={v => { setConfig(prev => ({ ...prev, anti_pm_block: v })); saveConfig({ anti_pm_block: v }); }} />
          <Toggle label="Auto-Report" desc="Report spammers to Telegram after blocking" checked={config.anti_pm_report}
            onChange={v => { setConfig(prev => ({ ...prev, anti_pm_report: v })); saveConfig({ anti_pm_report: v }); }} />
          <Toggle label="Inline Mode" desc="Send PM warnings with inline buttons (requires bot username)" checked={config.pm_permit_inline}
            onChange={v => { setConfig(prev => ({ ...prev, pm_permit_inline: v })); saveConfig({ pm_permit_inline: v }); }} />
          <div className="mt-4 space-y-4">
            <InputField label="Warning Limit" desc="Number of warnings before blocking" value={config.pm_permit_limit.toString()}
              onChange={v => setConfig(prev => ({ ...prev, pm_permit_limit: parseInt(v) || 3 }))} type="number" />
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>Warning Message</label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Message sent to unapproved PM senders. Supports variables: {'{warns}'}, {'{totalwarns}'}, {'{mention}'}</p>
              <textarea value={config.pm_permit_message} onChange={e => setConfig(prev => ({ ...prev, pm_permit_message: e.target.value }))}
                rows={3} className="w-full p-3 rounded-xl text-sm resize-none"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>PM Permit Image</label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Image shown with PM warning - paste a URL or upload a file (leave blank for text only)</p>
              <div className="flex gap-2">
                <input type="text" value={config.pm_permit_image} onChange={e => setConfig(prev => ({ ...prev, pm_permit_image: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <label className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-500 transition-colors cursor-pointer flex-shrink-0">
                  {uploading === 'pm_permit_image' ? '...' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'pm_permit_image'); }} />
                </label>
              </div>
              {config.pm_permit_image && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={config.pm_permit_image} alt="PM permit preview" className="h-12 w-12 rounded-lg object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  <button onClick={() => setConfig(prev => ({ ...prev, pm_permit_image: '' }))} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                </div>
              )}
            </div>
            <SaveButton saving={saving} onClick={() => saveConfig({
              pm_permit_limit: config.pm_permit_limit,
              pm_permit_message: config.pm_permit_message,
              pm_permit_image: config.pm_permit_image,
              pm_permit_inline: config.pm_permit_inline,
            })} />
          </div>
        </Section>
      )}

      {/* AFK */}
      {activeTab === 'afk' && (
        <Section title="AFK Mode">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            When AFK is enabled, the bot auto-replies when someone mentions or PMs you.
          </p>
          <Toggle label="AFK Mode" desc="Enable Away From Keyboard auto-replies" checked={config.afk_enabled}
            onChange={v => { setConfig(prev => ({ ...prev, afk_enabled: v })); saveConfig({ afk_enabled: v }); }} />
          <div className="mt-4">
            <InputField label="AFK Reason" desc="Shown when someone messages you while AFK" value={config.afk_reason}
              onChange={v => setConfig(prev => ({ ...prev, afk_reason: v }))} />
            <SaveButton saving={saving} onClick={() => saveConfig({ afk_reason: config.afk_reason })} />
          </div>
        </Section>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <Section title="Notes">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Save text snippets. Retrieve with <code>.get name</code> in any chat.
          </p>
          <div className="space-y-3 mb-4">
            <input value={newNoteName} onChange={e => setNewNoteName(e.target.value)} placeholder="Note name"
              className="w-full p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} placeholder="Note content" rows={3}
              className="w-full p-2.5 rounded-xl text-sm resize-none" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <button onClick={addNote} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors">
              Save Note
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No notes saved yet</p>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id || note.name} className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>#{note.name}</span>
                    <button onClick={() => deleteNote(note.name)} className="text-xs text-red-500 hover:text-red-400">Delete</button>
                  </div>
                  <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Filters */}
      {activeTab === 'filters' && (
        <Section title="Auto-Reply Filters">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Auto-reply when a keyword is detected. Add via dashboard or <code>.filter keyword response</code>.
          </p>
          <div className="space-y-3 mb-4">
            <input value={newFilterKeyword} onChange={e => setNewFilterKeyword(e.target.value)} placeholder="Keyword (e.g., hello)"
              className="w-full p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <textarea value={newFilterResponse} onChange={e => setNewFilterResponse(e.target.value)} placeholder="Auto-reply response" rows={2}
              className="w-full p-2.5 rounded-xl text-sm resize-none" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <button onClick={addFilter} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors">
              Add Filter
            </button>
          </div>
          {filters.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No filters set</p>
          ) : (
            <div className="space-y-2">
              {filters.map(f => (
                <div key={`${f.chat_id}-${f.keyword}`} className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.keyword}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>({f.chat_id === 'global' ? 'all chats' : f.chat_id})</span>
                    </div>
                    <button onClick={() => deleteFilter(f.keyword, f.chat_id)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                  </div>
                  <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{f.response}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Global Bans */}
      {activeTab === 'gbans' && (
        <Section title="Global Bans">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Users globally banned across all your chats. Add via dashboard or <code>.gban</code> command.
          </p>
          <div className="flex gap-2 mb-4">
            <input value={newGbanUserId} onChange={e => setNewGbanUserId(e.target.value)} placeholder="User ID"
              className="flex-1 p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <input value={newGbanReason} onChange={e => setNewGbanReason(e.target.value)} placeholder="Reason (optional)"
              className="flex-1 p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <button onClick={addGban} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-500 transition-colors">
              GBan
            </button>
          </div>
          {gbans.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No global bans</p>
          ) : (
            <div className="space-y-2">
              {gbans.map(gban => (
                <div key={gban.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div>
                    <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{gban.user_id}</span>
                    {gban.reason && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}> - {gban.reason}</span>}
                  </div>
                  <button onClick={() => removeGban(gban.user_id)} className="text-xs text-green-500 hover:text-green-400">Ungban</button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Platform Features (Auto-Forward, Channel Monitor, Warming) */}
      {activeTab === 'platform' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <TelegramUserbotSettings sessionId={sessionId} />
        </div>
      )}

      {/* Commands Reference */}
      {activeTab === 'commands' && (
        <Section title="Userbot Commands Reference">
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            All commands use the <code className="text-blue-500">{config.prefix}</code> prefix. Type them in any Telegram chat.
          </p>
          <div className="space-y-4">
            {USERBOT_COMMANDS.map(group => (
              <div key={group.module}>
                <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{group.module}</h4>
                <div className="space-y-1">
                  {group.commands.map(cmd => (
                    <div key={cmd.cmd} className="flex items-start gap-3 py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                      <code className="text-xs font-mono whitespace-nowrap text-blue-500 min-w-[180px]">{cmd.cmd}</code>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cmd.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, desc, value, onChange, type = 'text', maxLength }: {
  label: string; desc: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength}
        className="w-full p-2.5 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="mt-4 flex justify-end">
      <button onClick={onClick} disabled={saving}
        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
