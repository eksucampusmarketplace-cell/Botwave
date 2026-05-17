'use client';

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
  autoForwardEnabled: boolean;
  forwardRules: ForwardRule[];
  channelMonitorEnabled: boolean;
  channelMonitors: ChannelMonitor[];
  warmingEnabled: boolean;
  warmingFrequency: number;
  warmingActivities: string[];
}

const defaultConfig: UserbotConfig = {
  autoForwardEnabled: false,
  forwardRules: [],
  channelMonitorEnabled: false,
  channelMonitors: [],
  warmingEnabled: false,
  warmingFrequency: 30,
  warmingActivities: ['mark_read', 'update_status'],
};

export default function TelegramUserbotSettings({ sessionId }: TelegramUserbotSettingsProps) {
  const [config, setConfig] = useState<UserbotConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'forward' | 'monitor' | 'warming'>('forward');

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

  const tabs = [
    { id: 'forward' as const, label: 'AUTO-FORWARD' },
    { id: 'monitor' as const, label: 'CHANNEL MONITOR' },
    { id: 'warming' as const, label: 'WARMING' },
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

      {activeTab === 'forward' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-white">Auto-Forward</p>
              <p className="font-mono text-[10px] text-[#5a9a7a]">Forward messages matching keywords between chats</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, autoForwardEnabled: !c.autoForwardEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${config.autoForwardEnabled ? 'bg-green' : 'bg-[#2a3a2a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.autoForwardEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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

      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-white">Channel Monitor</p>
              <p className="font-mono text-[10px] text-[#5a9a7a]">Watch channels for keyword alerts</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, channelMonitorEnabled: !c.channelMonitorEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${config.channelMonitorEnabled ? 'bg-green' : 'bg-[#2a3a2a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.channelMonitorEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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
                    className="w-full bg-dark border border-green/20 p-2 font-mono text-[10px] text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
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

      {activeTab === 'warming' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-white">Account Warming</p>
              <p className="font-mono text-[10px] text-[#5a9a7a]">Simulate natural activity to build trust</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, warmingEnabled: !c.warmingEnabled }))}
              className={`w-10 h-5 rounded-full transition-colors ${config.warmingEnabled ? 'bg-green' : 'bg-[#2a3a2a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.warmingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {config.warmingEnabled && (
            <>
              <div>
                <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
                  FREQUENCY (minutes between activities)
                </label>
                <input
                  type="number"
                  value={config.warmingFrequency}
                  onChange={(e) => setConfig(c => ({ ...c, warmingFrequency: parseInt(e.target.value) || 30 }))}
                  min={15}
                  max={120}
                  className="w-full bg-dark border border-green/20 p-2 font-mono text-xs text-white focus:border-green outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">ACTIVITIES</label>
                {['mark_read', 'update_status', 'react', 'read_messages'].map(activity => (
                  <label key={activity} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.warmingActivities.includes(activity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig(c => ({ ...c, warmingActivities: [...c.warmingActivities, activity] }));
                        } else {
                          setConfig(c => ({ ...c, warmingActivities: c.warmingActivities.filter(a => a !== activity) }));
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
    </div>
  );
}
