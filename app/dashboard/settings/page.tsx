'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

interface ApiKeyData {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  rawKey?: string;
}

export default function SettingsPage() {
  const [skipProbability, setSkipProbability] = useState(15);
  const [botName, setBotName] = useState('BotWave');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [commandPrefix, setCommandPrefix] = useState('!');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('User');
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUsername(user.email || user.id);

      // Fetch existing settings
      fetchApiKeys();

      try {
        const res = await fetch('/api/user/settings');
        const data = await res.json();
        if (data.skipProbability !== undefined) {
          setSkipProbability(Math.round(data.skipProbability * 100));
        }
        if (data.botName) setBotName(data.botName);
        if (data.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
        if (data.commandPrefix) setCommandPrefix(data.commandPrefix);
        if (data.timezone) setTimezone(data.timezone);
      } catch {
        // ignore
      }
    };
    checkUser();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/user/api-keys');
      const data = await res.json();
      if (data.success) setApiKeys(data.data);
    } catch {
      // ignore - table may not exist yet
    }
  };

  const handleCreateApiKey = async () => {
    setCreatingKey(true);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Default', permissions: newKeyPerms }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedKey(data.data.rawKey);
        setNewKeyName('');
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Error creating API key:', err);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    try {
      await fetch(`/api/user/api-keys?id=${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (err) {
      console.error('Error deleting API key:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipProbability: skipProbability / 100,
          botName,
          welcomeMessage,
          commandPrefix,
          timezone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllSessions = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL sessions?\n\nThis action cannot be undone and will remove:\n- All WhatsApp connections\n- All session data\n- All message history\n\nClick OK to proceed or Cancel to abort.'
    );

    if (!confirmed) return;

    const finalConfirm = prompt('Type DELETE to confirm:');
    if (finalConfirm !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    try {
      const response = await fetch('/api/bot/sessions?all=true', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete sessions');
      }

      alert('All sessions have been deleted successfully.');
      window.location.reload();
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            SYSTEM <span className="text-green">SETTINGS</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Configure your global bot preferences
          </p>
        </motion.div>

        <div className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">PROFILE</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">USERNAME</label>
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="w-full bg-dark/50 border border-green/10 p-3 text-white font-mono text-sm"
                    placeholder="User"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">BOT CUSTOMIZATION</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">BOT NAME</label>
                  <p className="font-mono text-[10px] text-[#3a6a5a] mb-2">
                    Customize how your bot identifies itself in responses.
                  </p>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                    placeholder="BotWave"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">WELCOME MESSAGE TEMPLATE</label>
                  <p className="font-mono text-[10px] text-[#3a6a5a] mb-2">
                    Message sent when a new member joins a group. Use {'{name}'} for the member&apos;s name and {'{group}'} for the group name.
                  </p>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors min-h-[80px] resize-y"
                    placeholder="Welcome {name} to {group}! Type !help to see what I can do."
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">COMMAND PREFIX</label>
                  <p className="font-mono text-[10px] text-[#3a6a5a] mb-2">
                    Character used to trigger bot commands. Default is ! (e.g. !help, !sticker).
                  </p>
                  <input
                    type="text"
                    value={commandPrefix}
                    onChange={(e) => setCommandPrefix(e.target.value.slice(0, 3))}
                    className="w-32 bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                    placeholder="!"
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">TIMEZONE</label>
                  <p className="font-mono text-[10px] text-[#3a6a5a] mb-2">
                    Used for activity hours and scheduled messages.
                  </p>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none"
                  >
                    <option value="">Auto-detect</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="America/New_York">America/New York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                    <option value="America/Sao_Paulo">America/Sao Paulo (BRT)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">AI SETTINGS</h3>
              <div className="space-y-4">
                <div className="bg-dark/30 border border-green/5 p-4">
                  <h4 className="font-mono text-[10px] text-[#5a9a7a] tracking-[2px] mb-2">AI POWERED BY GEMINI</h4>
                  <p className="font-mono text-[10px] text-[#3a6a5a]">
                    All AI features (!ai, !scan, !digest, Study Hub) are powered by Google Gemini and work automatically — no API key needed from you.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-8 py-3 bg-green text-dark font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50"
              >
                {saving ? 'SAVING...' : saved ? 'SAVED!' : 'SAVE ALL SETTINGS'}
              </button>
              {error && (
                <p className="font-mono text-xs text-red-400">{error}</p>
              )}
              {saved && (
                <p className="font-mono text-xs text-green">Settings saved successfully!</p>
              )}
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">ANTI-BAN SETTINGS</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">
                    READ-BUT-SKIP PROBABILITY (GROUPS): {skipProbability}%
                  </label>
                  <p className="font-mono text-[10px] text-[#3a6a5a] mb-2">
                    Chance the bot reads a group message but doesn&apos;t reply — mimics real human behavior.
                    Only you (the account owner) can change this. 0% = always reply, 100% = never reply.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={skipProbability}
                    onChange={(e) => setSkipProbability(Number(e.target.value))}
                    className="w-full accent-green"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-[#3a6a5a] mt-1">
                    <span>0% (always reply)</span>
                    <span>50% (skip half)</span>
                  </div>
                </div>
                <div className="bg-dark/30 border border-green/5 p-4">
                  <h4 className="font-mono text-[10px] text-[#5a9a7a] tracking-[2px] mb-2">HOW IT WORKS</h4>
                  <p className="font-mono text-[10px] text-[#3a6a5a]">
                    Real users don&apos;t reply to every group message. This setting makes the bot
                    randomly &quot;ignore&quot; some messages (while still marking them as read), which
                    helps avoid WhatsApp ban detection. The default 15% is recommended.
                    Commands (starting with !) are never skipped. Private chats are never skipped.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-green/10 pt-8">
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">API ACCESS</h3>
              <p className="font-mono text-[10px] text-[#3a6a5a] mb-4">
                Generate API keys to access BotWave programmatically. Use the webhook endpoint at <span className="text-cyan">/api/bot/webhook</span> with your key as a Bearer token.
              </p>

              {createdKey && (
                <div className="bg-green/10 border border-green/30 p-4 mb-4">
                  <p className="font-mono text-[10px] text-green tracking-[2px] mb-2">NEW API KEY (copy now — shown once)</p>
                  <code className="font-mono text-xs text-white break-all select-all">{createdKey}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdKey); }}
                    className="ml-2 font-mono text-[10px] text-cyan hover:text-green"
                  >COPY</button>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 bg-dark border border-green/20 px-3 py-2 text-white font-mono text-sm focus:border-green outline-none"
                  placeholder="Key name (e.g. My Integration)"
                  maxLength={50}
                />
                <label className="flex items-center gap-1 font-mono text-[10px] text-[#5a9a7a]">
                  <input
                    type="checkbox"
                    checked={newKeyPerms.includes('write')}
                    onChange={(e) => setNewKeyPerms(e.target.checked ? ['read', 'write'] : ['read'])}
                    className="accent-green"
                  />
                  WRITE
                </label>
                <button
                  onClick={handleCreateApiKey}
                  disabled={creatingKey}
                  className="px-4 py-2 bg-green text-dark font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50"
                >
                  {creatingKey ? '...' : 'CREATE KEY'}
                </button>
              </div>

              {apiKeys.length > 0 && (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between bg-dark/50 border border-green/10 p-3">
                      <div>
                        <span className="font-mono text-xs text-white">{key.name}</span>
                        <span className="font-mono text-[10px] text-[#5a9a7a] ml-2">{key.key_prefix}</span>
                        <span className="font-mono text-[10px] text-[#3a6a5a] ml-2">
                          [{key.permissions.join(', ')}]
                        </span>
                        {key.last_used_at && (
                          <span className="font-mono text-[10px] text-[#3a6a5a] ml-2">
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="font-mono text-[10px] text-red-400 hover:text-red-300 tracking-[1px]"
                      >REVOKE</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-red-400/20 pt-8">
              <h3 className="font-display text-sm tracking-[3px] text-red-400 mb-4">DANGER ZONE</h3>
              <button
                onClick={handleDeleteAllSessions}
                className="px-6 py-3 border border-red-400/50 text-red-400 font-mono text-xs tracking-[2px] hover:bg-red-400/10 transition-colors"
              >
                DELETE ALL SESSIONS
              </button>
              <p className="font-mono text-[10px] text-[#5a5a5a] mt-2">
                This will permanently remove all your WhatsApp connections and data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
