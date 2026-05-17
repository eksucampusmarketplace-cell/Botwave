'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TelegramBotSettingsProps {
  sessionId: string;
}

interface BotConfig {
  welcome_message: string;
  goodbye_message: string;
  rules_text: string;
  antiflood_enabled: boolean;
  antiflood_max_per_min: number;
  antispam_enabled: boolean;
  antilink_enabled: boolean;
  antilink_whitelist: string[];
  captcha_enabled: boolean;
  captcha_type: string;
  warn_limit: number;
  warn_action: string;
  night_mode_enabled: boolean;
  night_mode_start: string;
  night_mode_end: string;
  locked_types: string[];
}

const defaultConfig: BotConfig = {
  welcome_message: '',
  goodbye_message: '',
  rules_text: '',
  antiflood_enabled: false,
  antiflood_max_per_min: 10,
  antispam_enabled: false,
  antilink_enabled: false,
  antilink_whitelist: [],
  captcha_enabled: false,
  captcha_type: 'math',
  warn_limit: 3,
  warn_action: 'mute',
  night_mode_enabled: false,
  night_mode_start: '23:00',
  night_mode_end: '06:00',
  locked_types: [],
};

export default function TelegramBotSettings({ sessionId }: TelegramBotSettingsProps) {
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'welcome' | 'moderation' | 'protection' | 'night'>('welcome');

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

  const tabs = [
    { id: 'welcome' as const, label: 'WELCOME' },
    { id: 'moderation' as const, label: 'MODERATION' },
    { id: 'protection' as const, label: 'PROTECTION' },
    { id: 'night' as const, label: 'NIGHT MODE' },
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

      <div className="flex gap-1 border-b border-green/10 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-[10px] tracking-[1px] px-3 py-1.5 transition-colors ${
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
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
              WELCOME MESSAGE (use {'{name}'}, {'{username}'}, {'{group}'})
            </label>
            <textarea
              value={config.welcome_message}
              onChange={(e) => setConfig(c => ({ ...c, welcome_message: e.target.value }))}
              placeholder="Welcome {name} to {group}!"
              rows={3}
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none resize-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
              GOODBYE MESSAGE
            </label>
            <textarea
              value={config.goodbye_message}
              onChange={(e) => setConfig(c => ({ ...c, goodbye_message: e.target.value }))}
              placeholder="{name} has left the group. Farewell!"
              rows={2}
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none resize-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
              GROUP RULES
            </label>
            <textarea
              value={config.rules_text}
              onChange={(e) => setConfig(c => ({ ...c, rules_text: e.target.value }))}
              placeholder="1. Be respectful&#10;2. No spam&#10;3. English only"
              rows={4}
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none resize-none"
            />
          </div>
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-white">CAPTCHA Verification</p>
              <p className="font-mono text-[10px] text-[#5a9a7a]">Require new members to solve a challenge</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, captcha_enabled: !c.captcha_enabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${config.captcha_enabled ? 'bg-green' : 'bg-[#2a3a2a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.captcha_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">WARN LIMIT</label>
              <input
                type="number"
                value={config.warn_limit}
                onChange={(e) => setConfig(c => ({ ...c, warn_limit: parseInt(e.target.value) || 3 }))}
                min={1}
                max={10}
                className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">WARN ACTION</label>
              <select
                value={config.warn_action}
                onChange={(e) => setConfig(c => ({ ...c, warn_action: e.target.value }))}
                className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
              >
                <option value="mute">Mute</option>
                <option value="kick">Kick</option>
                <option value="ban">Ban</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'protection' && (
        <div className="space-y-4">
          {[
            { key: 'antiflood_enabled', label: 'Anti-Flood', desc: 'Auto-mute users sending too many messages' },
            { key: 'antispam_enabled', label: 'Anti-Spam', desc: 'Detect and remove spam messages' },
            { key: 'antilink_enabled', label: 'Anti-Link', desc: 'Block unauthorized links from non-admins' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-white">{item.label}</p>
                <p className="font-mono text-[10px] text-[#5a9a7a]">{item.desc}</p>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, [item.key]: !(c as any)[item.key] }))}
                className={`w-10 h-5 rounded-full transition-colors ${(config as any)[item.key] ? 'bg-green' : 'bg-[#2a3a2a]'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${(config as any)[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}

          {config.antiflood_enabled && (
            <div>
              <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">MAX MESSAGES PER MINUTE</label>
              <input
                type="number"
                value={config.antiflood_max_per_min}
                onChange={(e) => setConfig(c => ({ ...c, antiflood_max_per_min: parseInt(e.target.value) || 10 }))}
                min={3}
                max={60}
                className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'night' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-white">Night Mode</p>
              <p className="font-mono text-[10px] text-[#5a9a7a]">Auto-delete non-admin messages during quiet hours</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, night_mode_enabled: !c.night_mode_enabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${config.night_mode_enabled ? 'bg-green' : 'bg-[#2a3a2a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.night_mode_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {config.night_mode_enabled && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">START (UTC)</label>
                <input
                  type="time"
                  value={config.night_mode_start}
                  onChange={(e) => setConfig(c => ({ ...c, night_mode_start: e.target.value }))}
                  className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">END (UTC)</label>
                <input
                  type="time"
                  value={config.night_mode_end}
                  onChange={(e) => setConfig(c => ({ ...c, night_mode_end: e.target.value }))}
                  className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
