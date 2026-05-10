'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface EnvVar {
  key: string;
  value: string;
  isNew?: boolean;
}

const SENSITIVE_KEYS = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PASS', 'AUTH', 'CREDENTIAL', 'PRIVATE'];

function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.some(s => key.toUpperCase().includes(s));
}

export default function EnvVarsPage() {
  const router = useRouter();
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchVars = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/deployment/env-vars');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) {
        setVars(data.data.map((v: { key: string; value: string }) => ({ key: v.key, value: v.value })));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchVars(); }, [fetchVars]);

  const toggleShow = (key: string) => {
    setShowValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (v: EnvVar) => {
    setEditKey(v.key);
    setEditValue(v.value);
  };

  const saveEdit = () => {
    if (!editKey) return;
    setVars(prev => prev.map(v => v.key === editKey ? { ...v, value: editValue } : v));
    setEditKey(null);
  };

  const deleteVar = (key: string) => {
    if (!confirm(`Delete ${key}?`)) return;
    setVars(prev => prev.filter(v => v.key !== key));
  };

  const addVar = () => {
    const key = prompt('Variable name (e.g. NEW_VAR):');
    if (!key) return;
    if (vars.some(v => v.key === key)) {
      setMessage({ type: 'error', text: `${key} already exists` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setVars(prev => [...prev, { key, value: '', isNew: true }]);
    startEdit({ key, value: '' });
  };

  const pushChanges = async () => {
    if (!confirm('Push env changes and restart the bot? This will cause a brief downtime.')) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/deployment/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: vars.map(v => ({ key: v.key, value: v.value })) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Env vars saved & bot restarting...' });
        setVars(prev => prev.map(v => ({ ...v, isNew: false })));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to push changes' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to push changes' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const filtered = vars.filter(v => !search || v.key.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl font-bold text-white">Environment Variables</h1>
          <p className="text-gray-500 text-sm mt-1">{vars.length} variables configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addVar} className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-lg text-sm transition-colors">
            + Add Variable
          </button>
          <button
            onClick={pushChanges}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Pushing...' : 'Push Changes & Restart'}
          </button>
        </div>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search variables..."
        className="w-full mb-4 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500"
      />

      <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-gray-400 text-xs font-mono px-4 py-3 w-1/3">KEY</th>
              <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">VALUE</th>
              <th className="text-right text-gray-400 text-xs font-mono px-4 py-3 w-32">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.key} className={`border-b border-white/5 hover:bg-white/[0.02] ${v.isNew ? 'bg-green-500/5' : ''}`}>
                <td className="px-4 py-3">
                  <code className="text-red-400 font-mono text-xs">{v.key}</code>
                  {isSensitive(v.key) && (
                    <span className="ml-1.5 text-[9px] text-yellow-500 bg-yellow-500/10 px-1 py-0.5 rounded">sensitive</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editKey === v.key ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      />
                      <button onClick={saveEdit} className="text-xs text-green-400 hover:text-green-300">Save</button>
                      <button onClick={() => setEditKey(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-gray-300 font-mono text-xs">
                      {isSensitive(v.key) && !showValues.has(v.key)
                        ? '•'.repeat(Math.min(v.value.length, 20)) || '(empty)'
                        : v.value || '(empty)'
                      }
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {isSensitive(v.key) && editKey !== v.key && (
                      <button
                        onClick={() => toggleShow(v.key)}
                        className="text-xs text-gray-400 hover:text-white px-1"
                        title={showValues.has(v.key) ? 'Hide' : 'Show'}
                      >
                        {showValues.has(v.key) ? 'Hide' : 'Show'}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(v)}
                      className="text-xs text-gray-400 hover:text-white px-1"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVar(v.key)}
                      className="text-xs text-gray-400 hover:text-red-400 px-1"
                      title="Delete"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  {search ? 'No variables matching search' : 'No environment variables'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
