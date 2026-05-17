'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'condition' | 'delay';
  content: string;
  next?: string;
  options?: { label: string; next: string }[];
}

interface Flow {
  id: string;
  name: string;
  trigger: string;
  nodes: FlowNode[];
  enabled: boolean;
  created_at: string;
}

const NODE_TYPES = [
  { type: 'message', label: 'Send Message', icon: '💬', desc: 'Send a text message to the user', color: 'blue' },
  { type: 'question', label: 'Ask Question', icon: '❓', desc: 'Ask and wait for the user to reply', color: 'cyan' },
  { type: 'condition', label: 'Condition', icon: '🔀', desc: 'Branch based on what user replied', color: 'violet' },
  { type: 'delay', label: 'Delay', icon: '⏱️', desc: 'Wait X seconds before the next step', color: 'amber' },
];

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');
  const [flowName, setFlowName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    const res = await fetch('/api/user/flows', { credentials: 'include' });
    const data = await res.json();
    if (res.status === 403) {
      setError(data.error || 'Upgrade required');
    } else if (data.success) {
      setFlows(data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const addNode = (type: string) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: type as FlowNode['type'],
      content: '',
    };
    if (type === 'condition') {
      newNode.options = [
        { label: 'Yes', next: '' },
        { label: 'No', next: '' },
      ];
    }
    setNodes([...nodes, newNode]);
  };

  const updateNode = (index: number, content: string) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], content };
    setNodes(updated);
  };

  const removeNode = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === nodes.length - 1)) return;
    const updated = [...nodes];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setNodes(updated);
  };

  const handleSave = async () => {
    setError('');
    if (!flowName || !trigger) { setError('Name and trigger keyword are required'); return; }
    if (nodes.length === 0) { setError('Add at least one step to the flow'); return; }

    const method = editingId ? 'PUT' : 'POST';
    const body = editingId
      ? { id: editingId, name: flowName, trigger, nodes, enabled: true }
      : { name: flowName, trigger, nodes, enabled: true };

    const res = await fetch('/api/user/flows', {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.success) { setError(data.error); return; }

    if (editingId) {
      setFlows(flows.map((f) => f.id === editingId ? data.data : f));
    } else {
      setFlows([data.data, ...flows]);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setFlowName('');
    setTrigger('');
    setNodes([]);
    setEditingId(null);
  };

  const handleEdit = (flow: Flow) => {
    setFlowName(flow.name);
    setTrigger(flow.trigger);
    setNodes(flow.nodes || []);
    setEditingId(flow.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/flows?id=${id}`, { method: 'DELETE', credentials: 'include' });
    setFlows(flows.filter((f) => f.id !== id));
  };

  const handleToggle = async (flow: Flow) => {
    const res = await fetch('/api/user/flows', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: flow.id, enabled: !flow.enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setFlows(flows.map((f) => f.id === flow.id ? data.data : f));
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Chatbot Flow Builder
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Build automated conversation flows triggered by keywords
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
                onClick={() => showForm ? resetForm() : setShowForm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Flow'}
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
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>How Chatbot Flows Work</h3>
              <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p>Flows are multi-step automated conversations. When a user sends a message matching your trigger keyword, the bot walks through each step in order.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Step types:</p>
                    <ul className="space-y-1.5">
                      <li>💬 <strong>Send Message</strong> sends a text immediately</li>
                      <li>❓ <strong>Ask Question</strong> sends a question and waits for the user to reply</li>
                      <li>🔀 <strong>Condition</strong> checks the user&apos;s reply and branches (e.g. if they said &quot;yes&quot;)</li>
                      <li>⏱️ <strong>Delay</strong> pauses for X seconds before the next step</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Example: Order Flow</p>
                    <div className="p-3 rounded-lg font-mono text-[11px] space-y-1" style={{ background: 'var(--bg)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>Trigger: <span className="text-cyan-400">order</span></p>
                      <p>1. 💬 &quot;Welcome! What product are you interested in?&quot;</p>
                      <p>2. ❓ &quot;Please type the product name&quot;</p>
                      <p>3. ⏱️ Wait 2 seconds</p>
                      <p>4. 💬 &quot;Great! We&apos;ll process your order. Someone will contact you soon.&quot;</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && !showForm && (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🔀</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Chatbot flows are available on Standard plan and above.
              </p>
            </div>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl mb-6 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {error && showForm && (
                <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Flow Name</label>
                    <input
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      placeholder="e.g. Order Flow, Support Flow"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Trigger Keyword <span style={{ color: 'var(--text-muted)' }}>(what user types to start this flow)</span>
                    </label>
                    <input
                      value={trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      placeholder="e.g. order, help, buy, support"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>

                {/* Node type buttons */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Add Steps to Your Flow
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {NODE_TYPES.map((nt) => (
                      <button
                        key={nt.type}
                        onClick={() => addNode(nt.type)}
                        className="flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all hover:border-blue-500/30 hover:bg-blue-500/5"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                      >
                        <span className="text-2xl">{nt.icon}</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{nt.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{nt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nodes list */}
                {nodes.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                      Flow Steps ({nodes.length})
                    </label>
                    {nodes.map((node, i) => (
                      <div key={node.id} className="flex gap-3 items-start p-4 rounded-xl border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-xs font-mono w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-lg">{NODE_TYPES.find((nt) => nt.type === node.type)?.icon}</span>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <button
                              onClick={() => moveNode(i, 'up')}
                              disabled={i === 0}
                              className="text-[10px] px-1 rounded hover:text-blue-500 disabled:opacity-20"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveNode(i, 'down')}
                              disabled={i === nodes.length - 1}
                              className="text-[10px] px-1 rounded hover:text-blue-500 disabled:opacity-20"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] uppercase font-medium tracking-wider" style={{ color: 'var(--text-muted)' }}>{node.type}</span>
                          <textarea
                            value={node.content}
                            onChange={(e) => updateNode(i, e.target.value)}
                            placeholder={
                              node.type === 'message' ? 'Type the message the bot will send...' :
                              node.type === 'question' ? 'Type the question to ask the user...' :
                              node.type === 'condition' ? 'Condition rule (e.g. reply contains "yes")' :
                              'Delay in seconds (e.g. 5)'
                            }
                            rows={node.type === 'delay' ? 1 : 3}
                            className="w-full mt-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
                            style={{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                          />
                        </div>
                        <button
                          onClick={() => removeNode(i)}
                          className="text-xs px-2 py-1.5 rounded-lg border transition-colors hover:text-red-400 hover:border-red-500/30 shrink-0"
                          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {nodes.length === 0 && (
                  <div className="text-center py-8 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Click the step buttons above to build your flow
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
                  >
                    {editingId ? 'Update Flow' : 'Save Flow'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium border"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : !error && flows.length === 0 && !showForm ? (
            <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-4xl mb-3">🔀</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No flows yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create your first chatbot flow to automate conversations
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Example: When user says &quot;order&quot;, bot walks them through the ordering process
              </p>
            </div>
          ) : !error && (
            <div className="space-y-3">
              {flows.map((flow) => (
                <motion.div
                  key={flow.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{flow.name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${flow.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-400'}`}>
                          {flow.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Trigger: <code className="text-blue-500">{flow.trigger}</code> &bull; {(flow.nodes || []).length} steps
                      </p>
                      {(flow.nodes || []).length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {(flow.nodes || []).map((n, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                              {NODE_TYPES.find((nt) => nt.type === n.type)?.icon || '?'} {n.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(flow)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                      >
                        {flow.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleEdit(flow)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:text-cyan-400 hover:border-cyan-500/30"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(flow.id)}
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
