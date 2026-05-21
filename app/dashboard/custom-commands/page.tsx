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
  image_url: string;
  cooldown: number;
  responses: string[];
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
  const [imageUrl, setImageUrl] = useState('');
  const [cooldown, setCooldown] = useState('');
  const [extraResponses, setExtraResponses] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      body: JSON.stringify({
        command,
        response,
        match_type: matchType,
        image_url: imageUrl || undefined,
        cooldown: cooldown ? Number(cooldown) : 0,
        responses: extraResponses.length > 0 ? [response, ...extraResponses].filter(Boolean) : undefined,
      }),
    });

    const data = await res.json();
    if (!data.success) { setError(data.error); return; }

    setCommands([data.data, ...commands]);
    setCommand('');
    setResponse('');
    setImageUrl('');
    setCooldown('');
    setExtraResponses([]);
    setShowAdvanced(false);
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
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">WhatsApp Only</span>
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
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
                    <p>Trigger: <code className="text-blue-500">!menu</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Only triggers on exactly &quot;!menu&quot;</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Contains</p>
                    <p>Trigger: <code className="text-blue-500">price</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Triggers on &quot;what is the price?&quot;, &quot;price list&quot;, etc.</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Starts With</p>
                    <p>Trigger: <code className="text-blue-500">order</code></p>
                    <p style={{ color: 'var(--text-muted)' }}>Triggers on &quot;order status&quot;, &quot;order now&quot;, etc.</p>
                  </div>
                </div>
                <p>Use <code className="text-blue-500">{'{name}'}</code> in the response to insert the sender&apos;s name automatically.</p>
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
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
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
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none font-mono"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>

                {/* Advanced options */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[10px] font-medium transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showAdvanced ? '▲ Hide Advanced' : '▼ Advanced Options (image, random responses, cooldown)'}
                  </button>

                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-4"
                    >
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Image URL <span style={{ color: 'var(--text-muted)' }}>(optional, bot sends this image with the response)</span>
                        </label>
                        <input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                        />
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="mt-2 max-h-24 rounded-lg object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Cooldown (seconds) <span style={{ color: 'var(--text-muted)' }}>(optional, prevent spam triggering)</span>
                        </label>
                        <input
                          type="number"
                          value={cooldown}
                          onChange={(e) => setCooldown(e.target.value)}
                          placeholder="0 (no cooldown)"
                          className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Random Responses <span style={{ color: 'var(--text-muted)' }}>(bot picks one at random each time)</span>
                        </label>
                        {extraResponses.map((r, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <input
                              value={r}
                              onChange={(e) => {
                                const updated = [...extraResponses];
                                updated[i] = e.target.value;
                                setExtraResponses(updated);
                              }}
                              placeholder={`Alternative response ${i + 2}`}
                              className="flex-1 px-4 py-2 rounded-lg text-sm border focus:outline-none font-mono"
                              style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                            />
                            <button
                              onClick={() => setExtraResponses(extraResponses.filter((_, j) => j !== i))}
                              className="px-2 text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setExtraResponses([...extraResponses, ''])}
                          className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-blue-500/30"
                          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                        >
                          + Add Alternative Response
                        </button>
                        {extraResponses.length > 0 && (
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            Bot will randomly pick from {extraResponses.length + 1} responses (the main one + {extraResponses.length} alternatives)
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Preview */}
                {command && response && (
                  <div className="p-3 rounded-lg border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                    <p className="text-[10px] uppercase font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Preview</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      When someone types <code className="text-cyan-400">{command}</code> ({matchType}), bot responds:
                    </p>
                    <pre className="text-xs mt-1 whitespace-pre-wrap font-mono text-blue-500">{response.replace(/\{name\}/g, 'User')}</pre>
                    {imageUrl && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>+ image attached</p>}
                    {extraResponses.filter(Boolean).length > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>+ {extraResponses.filter(Boolean).length} random alternative(s)</p>
                    )}
                    {cooldown && Number(cooldown) > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Cooldown: {cooldown}s between triggers</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
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
                        <code className="text-sm font-mono font-bold text-blue-500">{c.command}</code>
                        <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                          {c.match_type}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-400'}`}>
                          {c.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <pre className="text-xs mt-2 whitespace-pre-wrap font-mono" style={{ color: 'var(--text-secondary)' }}>{c.response}</pre>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {c.image_url && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                            + image
                          </span>
                        )}
                        {c.responses && c.responses.length > 1 && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                            {c.responses.length} random responses
                          </span>
                        )}
                        {c.cooldown > 0 && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                            {c.cooldown}s cooldown
                          </span>
                        )}
                      </div>
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
