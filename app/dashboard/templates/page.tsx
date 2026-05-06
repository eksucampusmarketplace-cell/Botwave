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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Message Templates
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Create reusable message templates with variables like {'{'}{'}'}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Template'}
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
                    Template Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Order Confirmation"
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
                    placeholder={'Hi {name}, your order #{order_id} has been shipped!\nExpected delivery: {date}'}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                  {content && extractVariables(content).length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Variables detected: {extractVariables(content).map((v) => `{${v}}`).join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Save Template
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">📝</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No templates yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create your first message template to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl border flex justify-between items-start gap-4"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</h3>
                    <pre className="text-xs mt-2 whitespace-pre-wrap font-mono" style={{ color: 'var(--text-secondary)' }}>{t.content}</pre>
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
