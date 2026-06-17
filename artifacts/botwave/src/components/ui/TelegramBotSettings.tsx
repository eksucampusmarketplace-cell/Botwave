

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TelegramBotSettingsProps {
  sessionId: string;
}

interface BotConfig {
  // Welcome & Goodbye
  welcome_message: string;
  welcome_enabled: boolean;
  welcome_timing: string;
  goodbye_message: string;
  rules_text: string;
  // Moderation
  captcha_enabled: boolean;
  captcha_type: string;
  captcha_mode: string;
  captcha_rules: string;
  captcha_mute_time: number;
  captcha_kick: boolean;
  captcha_kick_time: number;
  warn_limit: number;
  warn_action: string;
  // Protection
  antiflood_enabled: boolean;
  antiflood_max_per_min: number;
  antispam_enabled: boolean;
  antilink_enabled: boolean;
  antilink_whitelist: string[];
  // Anti-Raid
  antiraid_enabled: boolean;
  antiraid_threshold: number;
  antiraid_mode: string;
  antiraid_duration_mins: number;
  // Night Mode
  night_mode_enabled: boolean;
  night_mode_start: string;
  night_mode_end: string;
  locked_types: string[];
  // MemberBooster
  memberbooster_enabled: boolean;
  memberbooster_target: number;
  memberbooster_message: string;
  memberbooster_reward: string;
  memberbooster_channel: string;
  memberbooster_interval: number;
  memberbooster_auto_kick: boolean;
  // Advanced
  bot_language: string;
  force_channel: string;
  force_channel_2: string;
  log_channel_id: string;
}

const defaultConfig: BotConfig = {
  welcome_message: '',
  welcome_enabled: true,
  welcome_timing: 'instant',
  goodbye_message: '',
  rules_text: '',
  captcha_enabled: false,
  captcha_type: 'math',
  captcha_mode: 'button',
  captcha_rules: '',
  captcha_mute_time: 300,
  captcha_kick: false,
  captcha_kick_time: 300,
  warn_limit: 3,
  warn_action: 'mute',
  antiflood_enabled: false,
  antiflood_max_per_min: 10,
  antispam_enabled: false,
  antilink_enabled: false,
  antilink_whitelist: [],
  antiraid_enabled: false,
  antiraid_threshold: 10,
  antiraid_mode: 'ban',
  antiraid_duration_mins: 30,
  night_mode_enabled: false,
  night_mode_start: '23:00',
  night_mode_end: '06:00',
  locked_types: [],
  memberbooster_enabled: false,
  memberbooster_target: 100,
  memberbooster_message: '',
  memberbooster_reward: '',
  memberbooster_channel: '',
  memberbooster_interval: 60,
  memberbooster_auto_kick: false,
  bot_language: 'en',
  force_channel: '',
  force_channel_2: '',
  log_channel_id: '',
};

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

export default function TelegramBotSettings({ sessionId }: TelegramBotSettingsProps) {
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'welcome' | 'moderation' | 'protection' | 'antiraid' | 'night' | 'booster' | 'advanced'>('welcome');

  useEffect(() => {
    fetch(`/api/telegram/config?sessionId=${sessionId}&type=bot`)
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
        body: JSON.stringify({ sessionId, type: 'bot', ...config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handling
    }
    setSaving(false);
  }, [sessionId, config]);

  const set = <K extends keyof BotConfig>(key: K, val: BotConfig[K]) =>
    setConfig(c => ({ ...c, [key]: val }));

  const tabs = [
    { id: 'welcome' as const, label: 'WELCOME' },
    { id: 'moderation' as const, label: 'MODERATION' },
    { id: 'protection' as const, label: 'PROTECTION' },
    { id: 'antiraid' as const, label: 'ANTI-RAID' },
    { id: 'night' as const, label: 'NIGHT' },
    { id: 'booster' as const, label: 'BOOSTER' },
    { id: 'advanced' as const, label: 'ADVANCED' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[2px] text-white">
          TELEGRAM BOT CONFIG
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

      {activeTab === 'welcome' && (
        <div className="space-y-4">
          <Toggle
            value={config.welcome_enabled}
            onChange={v => set('welcome_enabled', v)}
            label="Welcome Messages"
            desc="Send welcome message when new members join"
          />
          {config.welcome_enabled && (
            <>
              <Field label="WELCOME TIMING">
                <select
                  value={config.welcome_timing}
                  onChange={e => set('welcome_timing', e.target.value)}
                  className={inputClass}
                >
                  <option value="instant">Instant</option>
                  <option value="5s">After 5 seconds</option>
                  <option value="30s">After 30 seconds</option>
                  <option value="after_captcha">After captcha solved</option>
                </select>
              </Field>
              <Field label={`WELCOME MESSAGE (use {name}, {username}, {group})`}>
                <textarea
                  value={config.welcome_message}
                  onChange={e => set('welcome_message', e.target.value)}
                  placeholder="Welcome {name} to {group}!"
                  rows={3}
                  className={textareaClass}
                />
              </Field>
            </>
          )}
          <Field label="GOODBYE MESSAGE">
            <textarea
              value={config.goodbye_message}
              onChange={e => set('goodbye_message', e.target.value)}
              placeholder="{name} has left the group. Farewell!"
              rows={2}
              className={textareaClass}
            />
          </Field>
          <Field label="GROUP RULES">
            <textarea
              value={config.rules_text}
              onChange={e => set('rules_text', e.target.value)}
              placeholder="1. Be respectful&#10;2. No spam&#10;3. English only"
              rows={4}
              className={textareaClass}
            />
          </Field>
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <Toggle
            value={config.captcha_enabled}
            onChange={v => set('captcha_enabled', v)}
            label="CAPTCHA Verification"
            desc="Require new members to solve a challenge"
          />

          {config.captcha_enabled && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Field label="CAPTCHA MODE">
                    <select
                      value={config.captcha_mode}
                      onChange={e => set('captcha_mode', e.target.value)}
                      className={inputClass}
                    >
                      <option value="button">Button click</option>
                      <option value="math">Math question</option>
                      <option value="text">Text input</option>
                      <option value="image">Image recognition</option>
                    </select>
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="CAPTCHA TYPE">
                    <select
                      value={config.captcha_type}
                      onChange={e => set('captcha_type', e.target.value)}
                      className={inputClass}
                    >
                      <option value="math">Math</option>
                      <option value="emoji">Emoji</option>
                      <option value="text">Text</option>
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="CAPTCHA RULES (shown to new members)">
                <textarea
                  value={config.captcha_rules}
                  onChange={e => set('captcha_rules', e.target.value)}
                  placeholder="Solve the captcha within 5 minutes to stay in the group."
                  rows={2}
                  className={textareaClass}
                />
              </Field>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Field label="MUTE TIME (seconds)">
                    <input
                      type="number"
                      value={config.captcha_mute_time}
                      onChange={e => set('captcha_mute_time', parseInt(e.target.value) || 300)}
                      min={30}
                      max={3600}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Toggle
                    value={config.captcha_kick}
                    onChange={v => set('captcha_kick', v)}
                    label="Kick on fail"
                    desc="Remove user if captcha not solved"
                  />
                </div>
              </div>
              {config.captcha_kick && (
                <Field label="KICK TIMEOUT (seconds)">
                  <input
                    type="number"
                    value={config.captcha_kick_time}
                    onChange={e => set('captcha_kick_time', parseInt(e.target.value) || 300)}
                    min={30}
                    max={3600}
                    className={inputClass}
                  />
                </Field>
              )}
            </>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Field label="WARN LIMIT">
                <input
                  type="number"
                  value={config.warn_limit}
                  onChange={e => set('warn_limit', parseInt(e.target.value) || 3)}
                  min={1}
                  max={10}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="WARN ACTION">
                <select
                  value={config.warn_action}
                  onChange={e => set('warn_action', e.target.value)}
                  className={inputClass}
                >
                  <option value="mute">Mute</option>
                  <option value="kick">Kick</option>
                  <option value="ban">Ban</option>
                </select>
              </Field>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'protection' && (
        <div className="space-y-4">
          <Toggle
            value={config.antiflood_enabled}
            onChange={v => set('antiflood_enabled', v)}
            label="Anti-Flood"
            desc="Auto-mute users sending too many messages"
          />
          {config.antiflood_enabled && (
            <Field label="MAX MESSAGES PER MINUTE">
              <input
                type="number"
                value={config.antiflood_max_per_min}
                onChange={e => set('antiflood_max_per_min', parseInt(e.target.value) || 10)}
                min={3}
                max={60}
                className={inputClass}
              />
            </Field>
          )}
          <Toggle
            value={config.antispam_enabled}
            onChange={v => set('antispam_enabled', v)}
            label="Anti-Spam"
            desc="Detect and remove spam messages"
          />
          <Toggle
            value={config.antilink_enabled}
            onChange={v => set('antilink_enabled', v)}
            label="Anti-Link"
            desc="Block unauthorized links from non-admins"
          />
        </div>
      )}

      {activeTab === 'antiraid' && (
        <div className="space-y-4">
          <Toggle
            value={config.antiraid_enabled}
            onChange={v => set('antiraid_enabled', v)}
            label="Anti-Raid Protection"
            desc="Automatically detect and stop mass join raids"
          />
          {config.antiraid_enabled && (
            <>
              <Field label="JOIN THRESHOLD (users per minute to trigger)">
                <input
                  type="number"
                  value={config.antiraid_threshold}
                  onChange={e => set('antiraid_threshold', parseInt(e.target.value) || 10)}
                  min={3}
                  max={100}
                  className={inputClass}
                />
              </Field>
              <Field label="RAID ACTION">
                <select
                  value={config.antiraid_mode}
                  onChange={e => set('antiraid_mode', e.target.value)}
                  className={inputClass}
                >
                  <option value="ban">Ban new joiners</option>
                  <option value="kick">Kick new joiners</option>
                  <option value="mute">Mute new joiners</option>
                  <option value="lock">Lock group (no new joins)</option>
                </select>
              </Field>
              <Field label="PROTECTION DURATION (minutes)">
                <input
                  type="number"
                  value={config.antiraid_duration_mins}
                  onChange={e => set('antiraid_duration_mins', parseInt(e.target.value) || 30)}
                  min={5}
                  max={1440}
                  className={inputClass}
                />
              </Field>
              <div className="bg-cyan/5 border border-cyan/10 p-3">
                <p className="font-mono text-[10px] text-cyan">
                  When a raid is detected ({config.antiraid_threshold}+ joins/min), the bot will automatically {config.antiraid_mode} new members for {config.antiraid_duration_mins} minutes.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'night' && (
        <div className="space-y-4">
          <Toggle
            value={config.night_mode_enabled}
            onChange={v => set('night_mode_enabled', v)}
            label="Night Mode"
            desc="Auto-delete non-admin messages during quiet hours"
          />
          {config.night_mode_enabled && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Field label="START (UTC)">
                  <input
                    type="time"
                    value={config.night_mode_start}
                    onChange={e => set('night_mode_start', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="END (UTC)">
                  <input
                    type="time"
                    value={config.night_mode_end}
                    onChange={e => set('night_mode_end', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'booster' && (
        <div className="space-y-4">
          <Toggle
            value={config.memberbooster_enabled}
            onChange={v => set('memberbooster_enabled', v)}
            label="MemberBooster"
            desc="Incentivize members to invite others to grow the group"
          />
          {config.memberbooster_enabled && (
            <>
              <Field label="TARGET MEMBER COUNT">
                <input
                  type="number"
                  value={config.memberbooster_target}
                  onChange={e => set('memberbooster_target', parseInt(e.target.value) || 100)}
                  min={10}
                  max={100000}
                  className={inputClass}
                />
              </Field>
              <Field label="BOOST MESSAGE (shown periodically)">
                <textarea
                  value={config.memberbooster_message}
                  onChange={e => set('memberbooster_message', e.target.value)}
                  placeholder="Help us reach {target} members! Invite your friends."
                  rows={2}
                  className={textareaClass}
                />
              </Field>
              <Field label="REWARD (what inviters get)">
                <input
                  type="text"
                  value={config.memberbooster_reward}
                  onChange={e => set('memberbooster_reward', e.target.value)}
                  placeholder="e.g., VIP role, shoutout, etc."
                  className={inputClass}
                />
              </Field>
              <Field label="CHANNEL TO JOIN (optional)">
                <input
                  type="text"
                  value={config.memberbooster_channel}
                  onChange={e => set('memberbooster_channel', e.target.value)}
                  placeholder="@channel_username"
                  className={inputClass}
                />
              </Field>
              <Field label="MESSAGE INTERVAL (minutes)">
                <input
                  type="number"
                  value={config.memberbooster_interval}
                  onChange={e => set('memberbooster_interval', parseInt(e.target.value) || 60)}
                  min={15}
                  max={1440}
                  className={inputClass}
                />
              </Field>
              <Toggle
                value={config.memberbooster_auto_kick}
                onChange={v => set('memberbooster_auto_kick', v)}
                label="Auto-kick non-participants"
                desc="Remove members who don't participate in boosting"
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <Field label="BOT LANGUAGE">
            <select
              value={config.bot_language}
              onChange={e => set('bot_language', e.target.value)}
              className={inputClass}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
              <option value="pt">Portuguese</option>
              <option value="de">German</option>
              <option value="ru">Russian</option>
              <option value="tr">Turkish</option>
              <option value="zh">Chinese</option>
            </select>
          </Field>
          <Field label="FORCE CHANNEL (users must join to chat)">
            <input
              type="text"
              value={config.force_channel}
              onChange={e => set('force_channel', e.target.value)}
              placeholder="@channel_username or channel ID"
              className={inputClass}
            />
          </Field>
          <Field label="FORCE CHANNEL 2 (optional second channel)">
            <input
              type="text"
              value={config.force_channel_2}
              onChange={e => set('force_channel_2', e.target.value)}
              placeholder="@channel_username or channel ID"
              className={inputClass}
            />
          </Field>
          <Field label="LOG CHANNEL ID (admin action logs)">
            <input
              type="text"
              value={config.log_channel_id}
              onChange={e => set('log_channel_id', e.target.value)}
              placeholder="Channel ID for admin logs"
              className={inputClass}
            />
          </Field>
          <div className="bg-cyan/5 border border-cyan/10 p-3">
            <p className="font-mono text-[10px] text-cyan">
              Force channel requires users to join the specified channel before they can send messages in the group.
              Log channel receives all moderation actions (warns, bans, mutes).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
