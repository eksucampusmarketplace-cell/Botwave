'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  created_at: string;
}

const AVAILABLE_VARIABLES = [
  { name: 'name', desc: 'Sender display name', category: 'User' },
  { name: 'phone', desc: 'Sender phone number', category: 'User' },
  { name: 'date', desc: 'Current date (e.g. May 6, 2026)', category: 'Date/Time' },
  { name: 'time', desc: 'Current time (e.g. 3:35 PM)', category: 'Date/Time' },
  { name: 'day', desc: 'Day of the week (e.g. Tuesday)', category: 'Date/Time' },
  { name: 'month', desc: 'Current month name (e.g. May)', category: 'Date/Time' },
  { name: 'year', desc: 'Current year (e.g. 2026)', category: 'Date/Time' },
  { name: 'order_id', desc: 'Order reference number', category: 'E-commerce' },
  { name: 'amount', desc: 'Payment or order amount', category: 'E-commerce' },
  { name: 'product', desc: 'Product name', category: 'E-commerce' },
  { name: 'group', desc: 'Group name (in group chats)', category: 'Chat' },
  { name: 'bot_name', desc: 'Your bot display name', category: 'Chat' },
  { name: 'greeting', desc: 'Time-based greeting (Good morning/afternoon/evening)', category: 'Smart' },
  { name: 'random_emoji', desc: 'Random emoji from a curated set', category: 'Smart' },
  { name: 'count', desc: 'Total messages or interaction count', category: 'Smart' },
];

const VARIABLE_CATEGORIES = ['User', 'Date/Time', 'E-commerce', 'Chat', 'Smart'];

const TEMPLATE_PRESETS = [
  {
    name: 'welcome',
    label: 'Welcome Message',
    content: '{greeting} {name}! Welcome to our community. Feel free to ask anything or type !help to see available commands. {random_emoji}',
  },
  {
    name: 'order_confirmation',
    label: 'Order Confirmation',
    content: 'Hi {name}, your order #{order_id} for {product} ({amount}) has been confirmed! We will notify you when it ships. Thank you for shopping with us.',
  },
  {
    name: 'daily_greeting',
    label: 'Daily Greeting',
    content: '{greeting} everyone! Happy {day}. Hope you all have a productive {day}. {random_emoji}',
  },
  {
    name: 'payment_received',
    label: 'Payment Received',
    content: 'Payment of {amount} received from {name} ({phone}) on {date} at {time}. Reference: #{order_id}. Thank you!',
  },
  {
    name: 'out_of_stock',
    label: 'Out of Stock Notice',
    content: 'Sorry {name}, {product} is currently out of stock. We will notify you when it is available again. Check other products with !shop.',
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/user/templates', { credentials: 'include' });
    const data = await res.json();
    if (data.success) setTemplates(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const extractVariables = (text: string) => {
    const matches = text.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches.map((m: string) => m.slice(1, -1)))];
  };

  const [activeCategory, setActiveCategory] = useState('User');
  const [showPresets, setShowPresets] = useState(false);

  const insertVariable = (varName: string) => {
    setContent((prev) => prev + `{${varName}}`);
  };

  const applyPreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setName(preset.name);
    setContent(preset.content);
    setShowPresets(false);
  };

  const handleCreate = async () => {
    setError('');
    if (!name || !content) { setError('Name and content are required'); return; }

    const res = await fetch('/api/user/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, content, variables: extractVariables(content) }),
    });

    const data = await res.json();
    if (!data.success) { setError(data.error); return; }

    setTemplates([data.data, ...templates]);
    setName('');
    setContent('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/templates?id=${id}`, { method: 'DELETE', credentials: 'include' });
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Message Templates
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Create reusable message templates with dynamic variables
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
                {showForm ? 'Cancel' : '+ New Template'}
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
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>How Templates Work</h3>
              <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>Templates are reusable message patterns with dynamic variables that get replaced when sent.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>How to trigger:</p>
                    <ul className="space-y-1.5">
                      <li>Use <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">!template [name]</code> in WhatsApp</li>
                      <li>Or <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">!template shipped @user</code> to send to someone</li>
                      <li>Variables like <code className="text-emerald-400">{'{name}'}</code> are auto-replaced with real values</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Example:</p>
                    <div className="p-3 rounded-lg font-mono text-[11px]" style={{ background: 'var(--bg)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>Template name: <span className="text-cyan-400">order_shipped</span></p>
                      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Content:</p>
                      <p className="text-emerald-400">Hi {'{name}'}, your order #{'{order_id}'} has been shipped! Expected delivery: {'{date}'}</p>
                      <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Trigger: <span className="text-cyan-400">!template order_shipped</span></p>
                    </div>
                  </div>
                </div>
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
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Template Name <span className="text-emerald-400">(used to trigger: !template [name])</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. order_confirmation"
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Message Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={'Hi {name}, your order #{order_id} has been shipped!\nExpected delivery: {date}\n\nThank you for shopping with us!'}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none font-mono"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                  {content && extractVariables(content).length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Variables detected: {extractVariables(content).map((v) => `{${v}}`).join(', ')}
                    </p>
                  )}
                </div>

                {/* Variable quick-insert by category */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Click to insert variable:
                    </label>
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      className="text-[10px] px-2 py-1 rounded border transition-colors hover:border-emerald-500/30"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                    >
                      {showPresets ? 'Hide Presets' : 'Use a Preset'}
                    </button>
                  </div>

                  {showPresets && (
                    <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {TEMPLATE_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => applyPreset(p)}
                          className="text-left p-3 rounded-lg border transition-colors hover:border-emerald-500/30"
                          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                        >
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.label}</span>
                          <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.content}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {VARIABLE_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                          activeCategory === cat
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : ''
                        }`}
                        style={activeCategory !== cat ? { color: 'var(--text-muted)', borderColor: 'var(--border)' } : undefined}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.filter((v) => v.category === activeCategory).map((v) => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.name)}
                        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        title={v.desc}
                      >
                        <code className="text-emerald-400">{`{${v.name}}`}</code>
                        <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Save Template
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : templates.length === 0 && !showForm ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">📝</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No templates yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create your first message template to get started
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Use them in WhatsApp with: <code className="text-emerald-400">!template [name]</code>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</h3>
                        <code className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          !template {t.name}
                        </code>
                      </div>
                      <pre className="text-xs mt-2 whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.content}</pre>
                      {t.variables?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {t.variables.map((v) => (
                            <span key={v} className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {'{' + v + '}'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:text-red-400 hover:border-red-500/30 shrink-0"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                    >
                      Delete
                    </button>
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
