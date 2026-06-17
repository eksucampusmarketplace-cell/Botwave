'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AlertConfig {
  id: string;
  type: string;
  enabled: boolean;
  threshold: number;
  whatsappNotify: boolean;
  notifyJid: string;
  notifySessionId: string;
}

interface AlertEvent {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  resolved: boolean;
}

interface ActiveSession {
  id: string;
  session_name: string;
  phone_number: string;
}

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
  critical: 'bg-red-500/20 text-red-400 border-red-500/20',
};

export default function AlertsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/alerts');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data.configs);
        setAlerts(data.data.recentAlerts);
        setSessions(data.data.activeSessions);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateConfig = (id: string, updates: Partial<AlertConfig>) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Alert settings saved' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.resolved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor events and configure WhatsApp alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium animate-pulse">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium">
              {warningCount} warnings
            </span>
          )}
        </div>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Configuration */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Alert Rules</h2>

          <div className="space-y-3">
            {configs.map(config => (
              <div key={config.id} className="bg-white/5 border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">{config.type}</span>
                  <button
                    onClick={() => updateConfig(config.id, { enabled: !config.enabled })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${config.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>

                {config.enabled && (
                  <div className="space-y-2">
                    {config.threshold > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-20">Threshold:</span>
                        <input
                          type="number"
                          value={config.threshold}
                          onChange={e => updateConfig(config.id, { threshold: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs w-20 focus:outline-none"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.whatsappNotify}
                        onChange={e => updateConfig(config.id, { whatsappNotify: e.target.checked })}
                        className="accent-red-500"
                      />
                      <span className="text-gray-300 text-xs">Send WhatsApp alert</span>
                    </label>

                    {config.whatsappNotify && (
                      <div className="space-y-2 pl-5">
                        <select
                          value={config.notifySessionId}
                          onChange={e => updateConfig(config.id, { notifySessionId: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none"
                        >
                          <option value="">Select session...</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.session_name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={config.notifyJid}
                          onChange={e => updateConfig(config.id, { notifyJid: e.target.value })}
                          placeholder="Phone number (e.g. 2349012345678)"
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={saveConfigs}
            disabled={saving}
            className="w-full mt-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Alert Settings'}
          </button>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Alerts (24h)</h2>

          {alerts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No alerts in the last 24 hours</p>
              <p className="text-xs mt-1">All systems running smoothly</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {alerts.map((alert, i) => (
                <div
                  key={alert.id || i}
                  className={`border rounded-lg p-3 ${severityColors[alert.severity]} ${alert.resolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{alert.type}</span>
                    <span className="text-[10px] opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs opacity-80">{alert.message}</p>
                  {alert.resolved && (
                    <span className="text-[10px] text-green-400 mt-1 inline-block">Resolved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
