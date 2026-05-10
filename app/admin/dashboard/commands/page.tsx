'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Command {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  customResponse: string | null;
  id: string | null;
}

const categoryColors: Record<string, string> = {
  general: 'bg-gray-500/20 text-gray-400',
  media: 'bg-blue-500/20 text-blue-400',
  ai: 'bg-purple-500/20 text-purple-400',
  tools: 'bg-cyan-500/20 text-cyan-400',
  fun: 'bg-yellow-500/20 text-yellow-400',
  games: 'bg-green-500/20 text-green-400',
  social: 'bg-pink-500/20 text-pink-400',
};

export default function CommandsPage() {
  const router = useRouter();
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCmd, setEditingCmd] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCommands = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/commands');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) setCommands(data.data);
    } catch (err) {
      console.error('Error fetching commands:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  const toggleCommand = async (cmd: Command) => {
    try {
      const res = await fetch('/api/admin/commands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cmd.key, enabled: !cmd.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setCommands(prev => prev.map(c => c.key === cmd.key ? { ...c, enabled: !c.enabled } : c));
        setMessage({ type: 'success', text: `!${cmd.key} ${!cmd.enabled ? 'enabled' : 'disabled'}` });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch { /* ignore */ }
  };

  const saveCustomResponse = async (cmd: Command) => {
    try {
      const res = await fetch('/api/admin/commands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cmd.key, customResponse: editResponse || null }),
      });
      const data = await res.json();
      if (data.success) {
        setCommands(prev => prev.map(c => c.key === cmd.key ? { ...c, customResponse: editResponse || null } : c));
        setEditingCmd(null);
        setMessage({ type: 'success', text: 'Custom response saved' });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch { /* ignore */ }
  };

  const categories = ['all', ...new Set(commands.map(c => c.category))];
  const filtered = filterCat === 'all' ? commands : commands.filter(c => c.category === filterCat);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Commands Manager</h1>
        <p className="text-gray-500 text-sm mt-1">Enable/disable commands and customize responses</p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCat === cat ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map(cmd => (
          <div
            key={cmd.key}
            className={`bg-white/5 border border-white/5 rounded-xl p-4 transition-colors ${!cmd.enabled ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <code className="text-red-400 font-mono text-sm bg-red-500/10 px-2 py-1 rounded">!{cmd.key}</code>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">{cmd.name}</p>
                  <p className="text-gray-500 text-xs truncate">{cmd.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${categoryColors[cmd.category] || 'bg-white/10 text-gray-400'}`}>
                  {cmd.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (editingCmd === cmd.key) {
                      setEditingCmd(null);
                    } else {
                      setEditingCmd(cmd.key);
                      setEditResponse(cmd.customResponse || '');
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Edit response"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleCommand(cmd)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${cmd.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cmd.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {editingCmd === cmd.key && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-white/5"
              >
                <label className="text-gray-400 text-xs block mb-1">Custom Response (leave empty for default)</label>
                <textarea
                  value={editResponse}
                  onChange={e => setEditResponse(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
                  rows={3}
                  placeholder="Custom response text..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveCustomResponse(cmd)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCmd(null)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
