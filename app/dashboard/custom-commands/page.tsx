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

const MATCH_TYPE_INFO = [
  { value: 'exact', label: 'Exact match', desc: 'User must type the exact command (e.g. "!hello" only triggers on "!hello")' },
  { value: 'contains', label: 'Contains', desc: 'Triggers if the message contains the text anywhere (e.g. "hello" triggers on "say hello to me")' },
  { value: 'startsWith', label: 'Starts with', desc: 'Triggers if the message starts with the text (e.g. "order" triggers on "order status")' },
];

export default function CustomCommandsPage() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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

  const handleToggle = async (cmd: CustomCommand) => {
    const res = await fetch('/api/user/custom-commands', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: cmd.id, enabled: !cmd.enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setCommands(commands.map((c) => c.id === cmd.id ? { ...c, enabled: !c.enabled } : c));
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Custom Commands
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Create your own bot commands with custom responses. No coding needed.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                {showHelp ? 'Hide Guide' : '? Guide'}
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Command'}
              </button>
            </div>
          </div>

          {/* How it works guide */}
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-5 rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>How Custom Commands Work</h3>
              <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>Custom commands let you define automatic responses when someone types a specific trigger in WhatsApp.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Exact Match</p>
                    <p>Trigger: <code className="text-emerald-400">!menu</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Only triggers on exactly &quot;!menu&quot;</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Contains</p>
                    <p>Trigger: <code className="text-emerald-400">price</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Triggers on &quot;what is the price?&quot;, &quot;price list&quot;, etc.</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Starts With</p>
                    <p>Trigger: <code className="text-emerald-400">order</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Triggers on &quot;order status&quot;, &quot;order now&quot;, etc.</p>
                  </div>
                </div>
                <p>Use <code className="text-emerald-400">{'{name}'}</code> in the response to insert the sender&apos;s name automatically.</p>
              </div>
            </motion.div>
          )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Command Trigger
                    </label>
                    <input
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="e.g. !hello or price"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono"
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
                      {MATCH_TYPE_INFO.map((mt) => (
                        <option key={mt.value} value={mt.value}>{mt.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {MATCH_TYPE_INFO.find((mt) => mt.value === matchType)?.desc}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Response <span style={{ color: 'var(--text-muted)' }}>(supports {'{name}'} variable)</span>
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={'Hello {name}, welcome to our group!\n\nHere are our services:\n1. Service A\n2. Service B\n\nReply with the number to learn more!'}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none font-mono"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>

                {/* Preview */}
                {command && response && (
                  <div className="p-3 rounded-lg border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                    <p className="text-[10px] uppercase font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Preview</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      When someone types <code className="text-cyan-400">{command}</code> ({matchType}), bot responds:
                    </p>
                    <pre className="text-xs mt-1 whitespace-pre-wrap font-mono text-emerald-400">{response.replace(/\{name\}/g, 'User')}</pre>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Save Command
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : commands.length === 0 && !showForm ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🤖</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No custom commands yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create commands to make your bot respond to custom triggers
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Example: When someone says &quot;!menu&quot; the bot responds with your menu
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commands.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono font-bold text-emerald-400">{c.command}</code>
                        <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                          {c.match_type}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {c.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <pre className="text-xs mt-2 whitespace-pre-wrap font-mono" style={{ color: 'var(--text-secondary)' }}>{c.response}</pre>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(c)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                      >
                        {c.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:text-red-400 hover:border-red-500/30"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
