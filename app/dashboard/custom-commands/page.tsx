'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface CustomCommand {
  id: string;
  command: string;
  response: string;
  match_type: string;
  enabled: boolean;
  created_at: string;
}

export default function CustomCommandsPage() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState('');
  const [matchType, setMatchType] = useState('exact');
  const [error, setError] = useState('');

  const fetchCommands = useCallback(async () => {
    const res = await fetch('/api/user/custom-commands', { credentials: 'include' });
    const data = await res.json();
    if (data.success) setCommands(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  const handleCreate = async () => {
    setError('');
    if (!command || !response) { setError('Command and response are required'); return; }

    const res = await fetch('/api/user/custom-commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ command, response, match_type: matchType }),
    });

    const data = await res.json();
    if (!data.success) { setError(data.error); return; }

    setCommands([data.data, ...commands]);
    setCommand('');
    setResponse('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/custom-commands?id=${id}`, { method: 'DELETE', credentials: 'include' });
    setCommands(commands.filter((c) => c.id !== id));
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Custom Commands
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Create your own bot commands with custom responses
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Command'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.1)' }}>
              {error}
            </div>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl mb-6 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Command Trigger
                  </label>
                  <input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g. !hello or hello"
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Response
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={'Hello {name}, welcome to our group!'}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Match Type
                  </label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  >
                    <option value="exact">Exact match</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts with</option>
                  </select>
                </div>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Save Command
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : commands.length === 0 ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🤖</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No custom commands yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create commands to make your bot respond to custom triggers
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commands.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl border flex justify-between items-start gap-4"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-emerald-400">{c.command}</code>
                      <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                        {c.match_type}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {c.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{c.response}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:text-red-400 hover:border-red-500/30"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                  >
                    Delete
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
