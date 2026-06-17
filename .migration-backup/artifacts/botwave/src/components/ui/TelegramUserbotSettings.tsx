

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TelegramUserbotSettingsProps {
  sessionId: string;
}

interface ForwardRule {
  id: string;
  sourceChat: string;
  destinationChat: string;
  keywords: string[];
  enabled: boolean;
}

interface ChannelMonitor {
  channelId: string;
  keywords: string[];
  notifyChat: string;
  enabled: boolean;
}

interface UserbotConfig {
  // Auto-Forward
  autoForwardEnabled: boolean;
  forwardRules: ForwardRule[];
  // Channel Monitor
  channelMonitorEnabled: boolean;
  channelMonitors: ChannelMonitor[];
  // Warming
  warmingEnabled: boolean;
  warmingFrequency: number;
  warmingActivities: string[];
  // PM Permit
  pm_permit_message: string;
  pm_permit_image: string;
  pm_permit_inline: boolean;
  // Alive
  alive_message: string;
  alive_image: string;
  // Behavior
  auto_read_enabled: boolean;
  presence_simulation: boolean;
  timezone_offset: number;
  // Proxy
  proxy_type: string;
  proxy_host: string;
  proxy_port: number;
  proxy_username: string;
  proxy_password: string;
  // Management
  sudo_users: string[];
  disabled_modules: string[];
  log_chat_id: string;
}

const defaultConfig: UserbotConfig = {
  autoForwardEnabled: false,
  forwardRules: [],
  channelMonitorEnabled: false,
  channelMonitors: [],
  warmingEnabled: false,
  warmingFrequency: 30,
  warmingActivities: ['mark_read', 'update_status'],
  pm_permit_message: '',
  pm_permit_image: '',
  pm_permit_inline: false,
  alive_message: '',
  alive_image: '',
  auto_read_enabled: false,
  presence_simulation: false,
  timezone_offset: 0,
  proxy_type: 'none',
  proxy_host: '',
  proxy_port: 0,
  proxy_username: '',
  proxy_password: '',
  sudo_users: [],
  disabled_modules: [],
  log_chat_id: '',
};

const AVAILABLE_MODULES = [
  'pm_permit', 'alive', 'afk', 'notes', 'filters', 'gbans',
  'purge', 'pin', 'info', 'welcome', 'stickers', 'translate',
];

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-mono text-xs text-white">{label}</p>
        <p className="font-mono text-[10px] text-[#5a9a7a]">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-green' : 'bg-[#2a3a2a]'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none';
const textareaClass = 'w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none resize-none';

export default function TelegramUserbotSettings({ sessionId }: TelegramUserbotSettingsProps) {
  const [config, setConfig] = useState<UserbotConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'forward' | 'monitor' | 'warming' | 'pmpermit' | 'behavior' | 'proxy' | 'management'>('forward');
  const [sudoInput, setSudoInput] = useState('');

  useEffect(() => {
    fetch(`/api/telegram/config?sessionId=${sessionId}&type=userbot`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setConfig({ ...defaultConfig, ...data.data });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/telegram/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type: 'userbot', ...config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handling
    }
    setSaving(false);
  }, [sessionId, config]);

  const set = <K extends keyof UserbotConfig>(key: K, val: UserbotConfig[K]) =>
    setConfig(c => ({ ...c, [key]: val }));

  const addForwardRule = () => {
    setConfig(c => ({
      ...c,
      forwardRules: [
        ...c.forwardRules,
        { id: `rule_${Date.now()}`, sourceChat: '', destinationChat: '', keywords: [], enabled: true },
      ],
    }));
  };

  const removeForwardRule = (id: string) => {
    setConfig(c => ({
      ...c,
      forwardRules: c.forwardRules.filter(r => r.id !== id),
    }));
  };

  const addChannelMonitor = () => {
    setConfig(c => ({
      ...c,
      channelMonitors: [
        ...c.channelMonitors,
        { channelId: '', keywords: [], notifyChat: '', enabled: true },
      ],
    }));
  };

  const removeChannelMonitor = (index: number) => {
    setConfig(c => ({
      ...c,
      channelMonitors: c.channelMonitors.filter((_, i) => i !== index),
    }));
  };

  const addSudoUser = () => {
    if (!sudoInput.trim()) return;
    setConfig(c => ({ ...c, sudo_users: [...c.sudo_users, sudoInput.trim()] }));
    setSudoInput('');
  };

  const removeSudoUser = (idx: number) => {
    setConfig(c => ({ ...c, sudo_users: c.sudo_users.filter((_, i) => i !== idx) }));
  };

  const tabs = [
    { id: 'forward' as const, label: 'FORWARD' },
    { id: 'monitor' as const, label: 'MONITOR' },
    { id: 'warming' as const, label: 'WARMING' },
    { id: 'pmpermit' as const, label: 'PM PERMIT' },
    { id: 'behavior' as const, label: 'BEHAVIOR' },
    { id: 'proxy' as const, label: 'PROXY' },
    { id: 'management' as const, label: 'MANAGE' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[2px] text-white">
          USERBOT CONFIG
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className="font-display text-[10px] tracking-[2px] px-4 py-2 bg-green text-dark font-bold hover:bg-cyan transition-colors disabled:opacity-50"
        >
          {saving ? 'SAVING...' : saved ? 'SAVED' : 'SAVE'}
        </motion.button>
      </div>

      <div className="flex gap-1 border-b border-green/10 pb-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-[10px] tracking-[1px] px-3 py-1.5 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-green border-b border-green'
                : 'text-[#5a9a7a] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* AUTO-FORWARD TAB */}
      {activeTab === 'forward' && (
        <div className="space-y-4">
          <Toggle
            value={config.autoForwardEnabled}
            onChange={v => set('autoForwardEnabled', v)}
            label="Auto-Forward"
            desc="Forward messages matching keywords between chats"
          />
          {config.autoForwardEnabled && (
            <>
              {config.forwardRules.map((rule) => (
                <div key={rule.id} className="border border-green/10 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-[#5a9a7a]">RULE</span>
                    <button
                      onClick={() => removeForwardRule(rule.id)}
                      className="font-mono text-[10px] text-red-400 hover:text-red-300"
                    >
                      REMOVE
                    </button>
                  </div>
                  <input
                    type="text"
                    value={rule.sourceChat}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      forwardRules: c.forwardRules.map(r =>
                        r.id === rule.id ? { ...r, sourceChat: e.target.value } : r
                      ),
                    }))}
                    placeholder="Source chat ID"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={rule.destinationChat}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      forwardRules: c.forwardRules.map(r =>
                        r.id === rule.id ? { ...r, destinationChat: e.target.value } : r
                      ),
                    }))}
                    placeholder="Destination chat ID"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={rule.keywords.join(', ')}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      forwardRules: c.forwardRules.map(r =>
                        r.id === rule.id ? { ...r, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) } : r
                      ),
                    }))}
                    placeholder="Keywords (comma-separated)"
                    className={inputClass}
                  />
                </div>
              ))}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addForwardRule}
                className="w-full font-mono text-[10px] tracking-[1px] px-3 py-2 border border-green/20 text-green hover:bg-green/5 transition-colors"
              >
                + ADD RULE
              </motion.button>
            </>
          )}
        </div>
      )}

      {/* CHANNEL MONITOR TAB */}
      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <Toggle
            value={config.channelMonitorEnabled}
            onChange={v => set('channelMonitorEnabled', v)}
            label="Channel Monitor"
            desc="Watch channels for keyword alerts"
          />
          {config.channelMonitorEnabled && (
            <>
              {config.channelMonitors.map((monitor, idx) => (
                <div key={idx} className="border border-green/10 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-[#5a9a7a]">MONITOR #{idx + 1}</span>
                    <button
                      onClick={() => removeChannelMonitor(idx)}
                      className="font-mono text-[10px] text-red-400 hover:text-red-300"
                    >
                      REMOVE
                    </button>
                  </div>
                  <input
                    type="text"
                    value={monitor.channelId}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      channelMonitors: c.channelMonitors.map((m, i) =>
                        i === idx ? { ...m, channelId: e.target.value } : m
                      ),
                    }))}
                    placeholder="Channel ID to monitor"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={monitor.keywords.join(', ')}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      channelMonitors: c.channelMonitors.map((m, i) =>
                        i === idx ? { ...m, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) } : m
                      ),
                    }))}
                    placeholder="Keywords (comma-separated)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={monitor.notifyChat}
                    onChange={(e) => setConfig(c => ({
                      ...c,
                      channelMonitors: c.channelMonitors.map((m, i) =>
                        i === idx ? { ...m, notifyChat: e.target.value } : m
                      ),
                    }))}
                    placeholder="Chat ID for notifications"
                    className={inputClass}
                  />
                </div>
              ))}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addChannelMonitor}
                className="w-full font-mono text-[10px] tracking-[1px] px-3 py-2 border border-green/20 text-green hover:bg-green/5 transition-colors"
              >
                + ADD MONITOR
              </motion.button>
            </>
          )}
        </div>
      )}

      {/* WARMING TAB */}
      {activeTab === 'warming' && (
        <div className="space-y-4">
          <Toggle
            value={config.warmingEnabled}
            onChange={v => set('warmingEnabled', v)}
            label="Account Warming"
            desc="Simulate natural activity to build trust"
          />
          {config.warmingEnabled && (
            <>
              <Field label="FREQUENCY (minutes between activities)">
                <input
                  type="number"
                  value={config.warmingFrequency}
                  onChange={e => set('warmingFrequency', parseInt(e.target.value) || 30)}
                  min={15}
                  max={120}
                  className={inputClass}
                />
              </Field>
              <div>
                <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">ACTIVITIES</label>
                {['mark_read', 'update_status', 'react', 'read_messages'].map(activity => (
                  <label key={activity} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.warmingActivities.includes(activity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          set('warmingActivities', [...config.warmingActivities, activity]);
                        } else {
                          set('warmingActivities', config.warmingActivities.filter(a => a !== activity));
                        }
                      }}
                      className="accent-green"
                    />
                    <span className="font-mono text-[10px] text-white">{activity.replace('_', ' ').toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <div className="bg-cyan/5 border border-cyan/10 p-3">
                <p className="font-mono text-[10px] text-cyan">
                  Rate limits enforced: 2s min between messages, 5m min between group joins.
                  Warming runs every {config.warmingFrequency} minutes.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* PM PERMIT TAB */}
      {activeTab === 'pmpermit' && (
        <div className="space-y-4">
          <Field label="PM PERMIT MESSAGE">
            <textarea
              value={config.pm_permit_message}
              onChange={e => set('pm_permit_message', e.target.value)}
              placeholder="You are not approved to PM me. Please wait for approval."
              rows={3}
              className={textareaClass}
            />
          </Field>
          <Field label="PM PERMIT IMAGE URL">
            <input
              type="text"
              value={config.pm_permit_image}
              onChange={e => set('pm_permit_image', e.target.value)}
              placeholder="https://example.com/image.jpg (optional)"
              className={inputClass}
            />
          </Field>
          <Toggle
            value={config.pm_permit_inline}
            onChange={v => set('pm_permit_inline', v)}
            label="Inline PM Permit"
            desc="Show permit message as inline button instead of text"
          />
          <Field label="ALIVE MESSAGE">
            <textarea
              value={config.alive_message}
              onChange={e => set('alive_message', e.target.value)}
              placeholder="Bot is alive and running!"
              rows={2}
              className={textareaClass}
            />
          </Field>
          <Field label="ALIVE IMAGE URL">
            <input
              type="text"
              value={config.alive_image}
              onChange={e => set('alive_image', e.target.value)}
              placeholder="https://example.com/alive.jpg (optional)"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* BEHAVIOR TAB */}
      {activeTab === 'behavior' && (
        <div className="space-y-4">
          <Toggle
            value={config.auto_read_enabled}
            onChange={v => set('auto_read_enabled', v)}
            label="Auto-Read Messages"
            desc="Automatically mark incoming messages as read"
          />
          <Toggle
            value={config.presence_simulation}
            onChange={v => set('presence_simulation', v)}
            label="Presence Simulation"
            desc="Simulate online/offline/typing presence naturally"
          />
          <Field label="TIMEZONE OFFSET (hours from UTC)">
            <input
              type="number"
              value={config.timezone_offset}
              onChange={e => set('timezone_offset', parseInt(e.target.value) || 0)}
              min={-12}
              max={14}
              className={inputClass}
            />
          </Field>
          <div className="bg-cyan/5 border border-cyan/10 p-3">
            <p className="font-mono text-[10px] text-cyan">
              Presence simulation uses timezone to appear online during day hours
              and offline at night, mimicking natural usage patterns.
            </p>
          </div>
        </div>
      )}

      {/* PROXY TAB */}
      {activeTab === 'proxy' && (
        <div className="space-y-4">
          <Field label="PROXY TYPE">
            <select
              value={config.proxy_type}
              onChange={e => set('proxy_type', e.target.value)}
              className={inputClass}
            >
              <option value="none">No Proxy</option>
              <option value="socks5">SOCKS5</option>
              <option value="http">HTTP</option>
              <option value="mtproto">MTProto</option>
            </select>
          </Field>
          {config.proxy_type !== 'none' && (
            <>
              <Field label="PROXY HOST">
                <input
                  type="text"
                  value={config.proxy_host}
                  onChange={e => set('proxy_host', e.target.value)}
                  placeholder="proxy.example.com"
                  className={inputClass}
                />
              </Field>
              <Field label="PROXY PORT">
                <input
                  type="number"
                  value={config.proxy_port}
                  onChange={e => set('proxy_port', parseInt(e.target.value) || 0)}
                  placeholder="1080"
                  className={inputClass}
                />
              </Field>
              <Field label="PROXY USERNAME (optional)">
                <input
                  type="text"
                  value={config.proxy_username}
                  onChange={e => set('proxy_username', e.target.value)}
                  placeholder="username"
                  className={inputClass}
                />
              </Field>
              <Field label="PROXY PASSWORD (optional)">
                <input
                  type="password"
                  value={config.proxy_password}
                  onChange={e => set('proxy_password', e.target.value)}
                  placeholder="password"
                  className={inputClass}
                />
              </Field>
            </>
          )}
          <div className="bg-cyan/5 border border-cyan/10 p-3">
            <p className="font-mono text-[10px] text-cyan">
              Use a proxy to route your userbot connection through a different IP.
              SOCKS5 is recommended for Telegram. MTProto proxies are Telegram-native.
            </p>
          </div>
        </div>
      )}

      {/* MANAGEMENT TAB */}
      {activeTab === 'management' && (
        <div className="space-y-4">
          <Field label="LOG CHAT ID">
            <input
              type="text"
              value={config.log_chat_id}
              onChange={e => set('log_chat_id', e.target.value)}
              placeholder="Chat/channel ID to receive logs"
              className={inputClass}
            />
          </Field>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">SUDO USERS</label>
            <p className="font-mono text-[10px] text-[#3a5a4a] mb-2">Users who can execute commands on your behalf</p>
            {config.sudo_users.map((user, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-white flex-1">{user}</span>
                <button
                  onClick={() => removeSudoUser(idx)}
                  className="font-mono text-[10px] text-red-400 hover:text-red-300"
                >
                  REMOVE
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={sudoInput}
                onChange={e => setSudoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSudoUser()}
                placeholder="User ID"
                className={inputClass}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addSudoUser}
                className="font-mono text-[10px] px-3 py-2 bg-green/10 text-green border border-green/20 hover:bg-green/20 whitespace-nowrap"
              >
                ADD
              </motion.button>
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">DISABLED MODULES</label>
            <div className="grid grid-cols-2 gap-1">
              {AVAILABLE_MODULES.map(mod => (
                <label key={mod} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.disabled_modules.includes(mod)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        set('disabled_modules', [...config.disabled_modules, mod]);
                      } else {
                        set('disabled_modules', config.disabled_modules.filter(m => m !== mod));
                      }
                    }}
                    className="accent-red-400"
                  />
                  <span className="font-mono text-[10px] text-white">{mod.replace('_', ' ').toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
