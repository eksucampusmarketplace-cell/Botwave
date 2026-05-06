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
  { type: 'message', label: 'Send Message', icon: '💬', desc: 'Send a text message' },
  { type: 'question', label: 'Ask Question', icon: '❓', desc: 'Ask and wait for reply' },
  { type: 'condition', label: 'Condition', icon: '🔀', desc: 'Branch based on reply' },
  { type: 'delay', label: 'Delay', icon: '⏱️', desc: 'Wait before next step' },
];

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  const handleSave = async () => {
    setError('');
    if (!flowName || !trigger) { setError('Name and trigger keyword are required'); return; }
    if (nodes.length === 0) { setError('Add at least one node to the flow'); return; }

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
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Chatbot Flow Builder
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Build automated conversation flows triggered by keywords
              </p>
            </div>
            <button
              onClick={() => showForm ? resetForm() : setShowForm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Flow'}
            </button>
          </div>

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

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Flow Name</label>
                    <input
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      placeholder="e.g. Order Flow"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Trigger Keyword</label>
                    <input
                      value={trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      placeholder="e.g. order, help, buy"
                      className="w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>

                {/* Node type buttons */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Add Step</label>
                  <div className="flex gap-2 flex-wrap">
                    {NODE_TYPES.map((nt) => (
                      <button
                        key={nt.type}
                        onClick={() => addNode(nt.type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:border-emerald-500/30"
                        style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                      >
                        <span>{nt.icon}</span> {nt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nodes list */}
                {nodes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                      Flow Steps ({nodes.length})
                    </label>
                    {nodes.map((node, i) => (
                      <div key={node.id} className="flex gap-3 items-start p-3 rounded-lg border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">{i + 1}</span>
                          <span className="text-sm">{NODE_TYPES.find((nt) => nt.type === node.type)?.icon}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>{node.type}</span>
                          <input
                            value={node.content}
                            onChange={(e) => updateNode(i, e.target.value)}
                            placeholder={
                              node.type === 'message' ? 'Message text...' :
                              node.type === 'question' ? 'Question to ask...' :
                              node.type === 'condition' ? 'Condition (e.g. reply contains "yes")' :
                              'Delay in seconds (e.g. 5)'
                            }
                            className="w-full mt-1 px-3 py-1.5 rounded text-xs border focus:outline-none"
                            style={{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                          />
                        </div>
                        <button
                          onClick={() => removeNode(i)}
                          className="text-xs px-2 py-1 rounded hover:text-red-400"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                  >
                    {editingId ? 'Update Flow' : 'Save Flow'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-2 rounded-lg text-sm font-medium border"
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
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{flow.name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${flow.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {flow.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Trigger: <code className="text-emerald-400">{flow.trigger}</code> &bull; {(flow.nodes || []).length} steps
                      </p>
                      {(flow.nodes || []).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {(flow.nodes || []).map((n, i) => (
                            <span key={i} className="text-xs">
                              {NODE_TYPES.find((nt) => nt.type === n.type)?.icon || '?'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
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
