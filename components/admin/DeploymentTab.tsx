'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────

interface EnvVar {
  key: string;
  value: string;
}

interface ContainerInfo {
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
  service: 'botwave' | 'evolution' | 'infra';
}

interface DeployRecord {
  id: string;
  timestamp: string;
  target: string;
  gitPull: boolean;
  success: boolean;
  duration: number;
  output: string;
}

interface BackupInfo {
  name: string;
  timestamp: string;
  size: number;
}

type ServiceTab = 'botwave' | 'evolution';
type SubTab = 'containers' | 'env' | 'history' | 'help';

// ── Sensitive key patterns (values are masked) ─────────
const SENSITIVE_PATTERNS = [
  /KEY/i, /SECRET/i, /PASSWORD/i, /TOKEN/i, /COOKIE/i,
];

function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(key));
}

// ── VPS Help Content ───────────────────────────────────
const VPS_HELP = [
  {
    category: 'Connecting to Your VPS',
    commands: [
      { cmd: 'ssh root@144.91.107.59', desc: 'Connect to your VPS via terminal (Mac: Terminal app, Windows: PowerShell or PuTTY)' },
      { cmd: 'exit', desc: 'Disconnect from VPS' },
    ],
  },
  {
    category: 'Basic Linux Commands',
    commands: [
      { cmd: 'ls', desc: 'List files in current folder' },
      { cmd: 'ls -la', desc: 'List all files with details (including hidden)' },
      { cmd: 'cd /opt/botwave', desc: 'Go to the BotWave project folder' },
      { cmd: 'cd ..', desc: 'Go up one folder' },
      { cmd: 'pwd', desc: 'Show current folder path' },
      { cmd: 'cat filename.txt', desc: 'Show file contents' },
      { cmd: 'nano filename.txt', desc: 'Edit a file (Ctrl+O to save, Ctrl+X to exit)' },
      { cmd: 'cp file1 file2', desc: 'Copy a file' },
      { cmd: 'mv file1 file2', desc: 'Move/rename a file' },
      { cmd: 'rm filename', desc: 'Delete a file (careful! no undo)' },
      { cmd: 'mkdir foldername', desc: 'Create a new folder' },
    ],
  },
  {
    category: 'Docker Commands (Your Containers)',
    commands: [
      { cmd: 'docker ps', desc: 'Show all running containers' },
      { cmd: 'docker ps -a', desc: 'Show all containers (including stopped)' },
      { cmd: 'docker logs botwave_web --tail 50', desc: 'See last 50 lines of web logs' },
      { cmd: 'docker logs botwave_whatsapp --tail 50', desc: 'See last 50 lines of bot logs' },
      { cmd: 'docker logs evolution_api --tail 50', desc: 'See last 50 lines of Evolution API logs' },
      { cmd: 'docker restart botwave_web', desc: 'Restart just the web container' },
      { cmd: 'docker restart botwave_whatsapp', desc: 'Restart just the bot' },
      { cmd: 'docker stop botwave_web', desc: 'Stop the web container' },
      { cmd: 'docker start botwave_web', desc: 'Start the web container' },
    ],
  },
  {
    category: 'Deploy Commands (Update & Rebuild)',
    commands: [
      { cmd: 'cd /opt/botwave/deploy && bash update.sh', desc: 'Pull latest code and rebuild everything (same as Deploy All button)' },
      { cmd: 'cd /opt/botwave && git pull', desc: 'Just pull latest code (no rebuild)' },
      { cmd: 'cd /opt/botwave/deploy && docker compose up -d --build', desc: 'Rebuild & restart all containers' },
      { cmd: 'cd /opt/botwave/deploy && docker compose up -d --build botwave-web', desc: 'Rebuild only the web container' },
    ],
  },
  {
    category: 'Env Vars (Manual Edit)',
    commands: [
      { cmd: 'nano /opt/botwave/deploy/.env.botwave', desc: 'Edit BotWave env vars' },
      { cmd: 'nano /opt/botwave/deploy/.env.evolution', desc: 'Edit Evolution API env vars' },
      { cmd: 'cat /opt/botwave/deploy/.env.botwave', desc: 'View BotWave env vars' },
    ],
  },
  {
    category: 'System Monitoring',
    commands: [
      { cmd: 'df -h', desc: 'Check disk space usage' },
      { cmd: 'free -h', desc: 'Check RAM usage' },
      { cmd: 'top', desc: 'Live system monitor (press Q to exit)' },
      { cmd: 'htop', desc: 'Better system monitor (press Q to exit, install: apt install htop)' },
      { cmd: 'uptime', desc: 'Show how long server has been running' },
      { cmd: 'reboot', desc: 'Restart the entire VPS (all containers will auto-restart)' },
    ],
  },
  {
    category: 'Useful Tips',
    commands: [
      { cmd: 'Ctrl + C', desc: 'Stop/cancel any running command' },
      { cmd: 'Tab key', desc: 'Auto-complete file/folder names' },
      { cmd: 'Up arrow', desc: 'Repeat last command' },
      { cmd: 'history', desc: 'Show all previously run commands' },
      { cmd: 'clear', desc: 'Clear the terminal screen' },
    ],
  },
];

// ── Container name map ─────────────────────────────────
const CONTAINER_LABELS: Record<string, string> = {
  botwave_web: 'Web (Next.js)',
  botwave_whatsapp: 'Bot (Main)',
  evolution_api: 'Evolution API',
  evolution_postgres: 'Postgres DB',
  botwave_redis: 'Redis Cache',
  botwave_nginx: 'Nginx (HTTPS)',
  botwave_certbot: 'Certbot (SSL)',
  portainer: 'Portainer',
};

export default function DeploymentTab() {
  const [serviceTab, setServiceTab] = useState<ServiceTab>('botwave');
  const [subTab, setSubTab] = useState<SubTab>('containers');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Container state
  const [containers, setContainers] = useState<{
    botwave: ContainerInfo[];
    evolution: ContainerInfo[];
    infra: ContainerInfo[];
  }>({ botwave: [], evolution: [], infra: [] });
  const [loadingContainers, setLoadingContainers] = useState(false);

  // Env vars state
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [editedVars, setEditedVars] = useState<Map<string, string>>(new Map());
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Set<string>>(new Set());
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [showBackups, setShowBackups] = useState(false);

  // Deploy state
  const [deploying, setDeploying] = useState(false);
  const [deployOutput, setDeployOutput] = useState('');
  const [deployHistory, setDeployHistory] = useState<DeployRecord[]>([]);
  const [selectedDeploy, setSelectedDeploy] = useState<DeployRecord | null>(null);


  // ── Data Fetching ────────────────────────────────────

  const fetchContainers = useCallback(async () => {
    setLoadingContainers(true);
    try {
      const res = await fetch('/api/admin/deployment/containers');
      const data = await res.json();
      if (data.success) {
        setContainers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch containers:', err);
    } finally {
      setLoadingContainers(false);
    }
  }, []);

  const fetchEnvVars = useCallback(async (service: string) => {
    setLoadingEnv(true);
    try {
      const res = await fetch(`/api/admin/deployment/env-vars?service=${service}`);
      const data = await res.json();
      if (data.success) {
        setEnvVars(data.data.vars);
        setBackups(data.data.backups || []);
        setEditedVars(new Map());
      }
    } catch (err) {
      console.error('Failed to fetch env vars:', err);
    } finally {
      setLoadingEnv(false);
    }
  }, []);

  const fetchDeployHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/deployment/deploy');
      const data = await res.json();
      if (data.success) {
        setDeployHistory(data.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch deploy history:', err);
    }
  }, []);


  useEffect(() => {
    fetchContainers();
    fetchDeployHistory();
  }, [fetchContainers, fetchDeployHistory]);

  useEffect(() => {
    if (subTab === 'env') {
      fetchEnvVars(serviceTab);
    }
  }, [subTab, serviceTab, fetchEnvVars]);

  // ── Env Var Handlers ─────────────────────────────────

  const handleVarEdit = (key: string, value: string) => {
    const newEdited = new Map(editedVars);
    const original = envVars.find(v => v.key === key);
    if (original && original.value === value) {
      newEdited.delete(key);
    } else {
      newEdited.set(key, value);
    }
    setEditedVars(newEdited);
  };

  const handleAddVar = () => {
    if (!newVarKey.trim()) return;
    const key = newVarKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (envVars.some(v => v.key === key)) {
      setMessage({ type: 'error', text: `Variable ${key} already exists` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setEnvVars(prev => [...prev, { key, value: newVarValue }]);
    const newEdited = new Map(editedVars);
    newEdited.set(key, newVarValue);
    setEditedVars(newEdited);
    setNewVarKey('');
    setNewVarValue('');
  };

  const handleDeleteVar = (key: string) => {
    if (!confirm(`Delete ${key}? This will be removed on next save.`)) return;
    setEnvVars(prev => prev.filter(v => v.key !== key));
    const newEdited = new Map(editedVars);
    newEdited.set(`__DELETE__${key}`, '');
    setEditedVars(newEdited);
  };

  const handleSaveEnvVars = async () => {
    if (editedVars.size === 0) return;
    setSavingEnv(true);
    try {
      const varsToSave = envVars.filter(v => !Array.from(editedVars.keys()).some(k => k === `__DELETE__${v.key}`));
      const finalVars = varsToSave.map(v => ({
        key: v.key,
        value: editedVars.has(v.key) ? editedVars.get(v.key)! : v.value,
      }));

      const res = await fetch('/api/admin/deployment/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceTab, vars: finalVars }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await fetchEnvVars(serviceTab);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save env vars' });
    } finally {
      setSavingEnv(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleRollback = async (backupName: string) => {
    if (!confirm(`Rollback ${serviceTab} to this backup? Current config will be backed up first.`)) return;
    try {
      const res = await fetch('/api/admin/deployment/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceTab, action: 'rollback', backupName }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await fetchEnvVars(serviceTab);
        setShowBackups(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Rollback failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Rollback failed' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Deploy Handlers ──────────────────────────────────

  const handleDeploy = async (target: 'all' | 'botwave' | 'evolution', gitPull: boolean = true) => {
    if (!confirm(`Deploy ${target}${gitPull ? ' (with git pull)' : ' (restart only)'}? This may take 1-3 minutes.`)) return;
    setDeploying(true);
    setDeployOutput('Deploying... this may take a few minutes.\n');
    setSubTab('containers');
    try {
      const res = await fetch('/api/admin/deployment/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, gitPull }),
      });
      const data = await res.json();
      setDeployOutput(data.data?.output || data.message || 'No output');
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message || 'Deploy failed' });
      }
      await fetchContainers();
      await fetchDeployHistory();
    } catch (err) {
      setDeployOutput('Deploy request failed. Check your connection.');
      setMessage({ type: 'error', text: 'Deploy failed' });
    } finally {
      setDeploying(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // ── Render Helpers ───────────────────────────────────

  const getMaskedValue = (key: string, value: string): string => {
    if (!isSensitive(key) || showSensitive.has(key)) return value;
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.slice(0, 4) + '*'.repeat(Math.min(value.length - 8, 20)) + value.slice(-4);
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getStateColor = (state: string): string => {
    if (state === 'running') return 'text-green-500 bg-green-500/10';
    if (state === 'exited') return 'text-red-500 bg-red-500/10';
    return 'text-yellow-500 bg-yellow-500/10';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const serviceTabs: { id: ServiceTab; label: string }[] = [
    { id: 'botwave', label: 'BOTWAVE' },
    { id: 'evolution', label: 'EVOLUTION API' },
  ];

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'containers', label: 'CONTAINERS' },
    { id: 'env', label: 'ENV VARS' },
    { id: 'history', label: 'DEPLOY HISTORY' },
    { id: 'help', label: 'VPS HELP' },
  ];

  const serviceContainers = serviceTab === 'botwave' ? containers.botwave : containers.evolution;

  return (
    <div className="p-4 sm:p-6">
      {/* Status Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-4 p-3 border font-mono text-xs ${
              message.type === 'success'
                ? 'bg-green-950/30 border-green-900 text-green-400'
                : 'bg-red-950/30 border-red-900 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deploy Buttons Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleDeploy('all', true)}
          disabled={deploying}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs px-4 py-2.5 transition-colors flex items-center gap-2"
        >
          {deploying ? (
            <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> DEPLOYING...</>
          ) : (
            'DEPLOY ALL (GIT PULL + REBUILD)'
          )}
        </button>
        <button
          onClick={() => handleDeploy('botwave', true)}
          disabled={deploying}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-mono text-xs px-4 py-2.5 transition-colors"
        >
          DEPLOY BOTWAVE
        </button>
        <button
          onClick={() => handleDeploy('evolution', true)}
          disabled={deploying}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs px-4 py-2.5 transition-colors"
        >
          DEPLOY EVOLUTION
        </button>
        <button
          onClick={() => handleDeploy('all', false)}
          disabled={deploying}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-mono text-xs px-4 py-2.5 transition-colors"
        >
          RESTART ALL (NO GIT PULL)
        </button>
      </div>

      {/* Deploy Output */}
      {deployOutput && (
        <div className="mb-6 bg-black border border-zinc-800 p-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-mono text-[9px] tracking-widest">DEPLOY OUTPUT</span>
            <button onClick={() => setDeployOutput('')} className="text-zinc-600 hover:text-zinc-400 text-xs font-mono">CLEAR</button>
          </div>
          <pre className="text-green-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">{deployOutput}</pre>
        </div>
      )}

      {/* Service Tabs */}
      <div className="flex gap-1 mb-4">
        {serviceTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setServiceTab(tab.id)}
            className={`font-mono text-[10px] tracking-wider px-4 py-2 border transition-colors ${
              serviceTab === tab.id
                ? 'text-white border-red-600 bg-red-600/10'
                : 'text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`font-mono text-[10px] tracking-wider px-3 py-1.5 transition-colors ${
              subTab === tab.id
                ? 'text-red-500 border-b-2 border-red-600'
                : 'text-zinc-600 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ CONTAINERS TAB ═══ */}
      {subTab === 'containers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-500 font-mono text-xs">{'// Container status for ' + serviceTab}</p>
            <button onClick={fetchContainers} className="text-red-600 hover:text-red-500 font-mono text-[10px]">
              {loadingContainers ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
          <div className="space-y-2">
            {serviceContainers.map(c => (
              <div key={c.name} className="bg-zinc-800/30 border border-zinc-800 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.state === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-mono text-sm text-white">{CONTAINER_LABELS[c.name] || c.name}</span>
                    <span className="text-zinc-600 font-mono text-[10px]">{c.name}</span>
                  </div>
                  <p className="text-zinc-500 font-mono text-[10px] mt-1 ml-5">{c.image}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-[10px] font-mono ${getStateColor(c.state)}`}>
                    {c.state.toUpperCase()}
                  </span>
                  <p className="text-zinc-600 font-mono text-[10px] mt-1">{c.status}</p>
                </div>
              </div>
            ))}
            {serviceContainers.length === 0 && (
              <p className="text-zinc-600 font-mono text-xs text-center py-8">No containers found. Click REFRESH.</p>
            )}
          </div>

          {/* Infrastructure containers */}
          {containers.infra.length > 0 && (
            <div className="mt-6">
              <p className="text-zinc-600 font-mono text-[10px] tracking-widest mb-3">INFRASTRUCTURE</p>
              <div className="space-y-2">
                {containers.infra.map(c => (
                  <div key={c.name} className="bg-zinc-900/50 border border-zinc-800/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${c.state === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-mono text-xs text-zinc-400">{CONTAINER_LABELS[c.name] || c.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-mono ${getStateColor(c.state)}`}>
                      {c.state.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ENV VARS TAB ═══ */}
      {subTab === 'env' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-500 font-mono text-xs">{'// Environment variables for ' + serviceTab}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBackups(!showBackups)}
                className="text-cyan-500 hover:text-cyan-400 font-mono text-[10px] border border-cyan-900 px-2 py-1"
              >
                {showBackups ? 'HIDE BACKUPS' : `BACKUPS (${backups.length})`}
              </button>
              <button onClick={() => fetchEnvVars(serviceTab)} className="text-red-600 hover:text-red-500 font-mono text-[10px]">
                {loadingEnv ? 'LOADING...' : 'REFRESH'}
              </button>
            </div>
          </div>

          {/* Backups Panel */}
          <AnimatePresence>
            {showBackups && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-cyan-950/20 border border-cyan-900/50 p-4">
                  <p className="text-cyan-400 font-mono text-[10px] tracking-widest mb-3">VERSION HISTORY</p>
                  {backups.length === 0 ? (
                    <p className="text-zinc-600 font-mono text-xs">No backups yet. Backups are created automatically when you save changes.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {backups.map(b => (
                        <div key={b.name} className="flex items-center justify-between bg-zinc-900/50 p-2">
                          <div>
                            <span className="font-mono text-xs text-zinc-300">{new Date(b.timestamp || b.name).toLocaleString()}</span>
                            <span className="text-zinc-600 font-mono text-[10px] ml-2">({(b.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            onClick={() => handleRollback(b.name)}
                            className="text-yellow-500 hover:text-yellow-400 font-mono text-[10px] border border-yellow-900 px-2 py-0.5"
                          >
                            ROLLBACK
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Env Var Editor */}
          <div className="space-y-1.5">
            {envVars.map(v => {
              const isEdited = editedVars.has(v.key);
              const currentValue = isEdited ? editedVars.get(v.key)! : v.value;
              const sensitive = isSensitive(v.key);
              const isRevealed = showSensitive.has(v.key);

              return (
                <div key={v.key} className={`flex items-start gap-2 p-2 ${isEdited ? 'bg-yellow-950/20 border border-yellow-900/30' : 'bg-zinc-800/20'}`}>
                  <div className="w-60 shrink-0">
                    <span className="font-mono text-[11px] text-zinc-300 break-all">{v.key}</span>
                  </div>
                  <div className="flex-1 flex items-start gap-1">
                    {sensitive && !isRevealed ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="password"
                          value={currentValue}
                          onChange={(e) => handleVarEdit(v.key, e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-zinc-400 px-2 py-1 font-mono focus:outline-none focus:border-red-600"
                        />
                        <button onClick={() => toggleSensitive(v.key)} className="text-zinc-600 hover:text-zinc-400 text-[9px] font-mono px-1 shrink-0" title="Show value">
                          SHOW
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-start gap-1">
                        <textarea
                          value={currentValue}
                          onChange={(e) => handleVarEdit(v.key, e.target.value)}
                          rows={currentValue.length > 80 ? 3 : 1}
                          className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 font-mono focus:outline-none focus:border-red-600 resize-y"
                        />
                        {sensitive && (
                          <button onClick={() => toggleSensitive(v.key)} className="text-zinc-600 hover:text-zinc-400 text-[9px] font-mono px-1 shrink-0" title="Hide value">
                            HIDE
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteVar(v.key)}
                      className="text-red-800 hover:text-red-500 text-[10px] font-mono px-1 shrink-0"
                      title="Delete variable"
                    >
                      DEL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Variable */}
          <div className="mt-4 flex gap-2 items-end">
            <div>
              <label className="text-zinc-600 font-mono text-[9px] tracking-widest block mb-1">KEY</label>
              <input
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                placeholder="NEW_VAR_NAME"
                className="bg-zinc-900 border border-zinc-700 text-xs text-white px-3 py-2 font-mono w-48 focus:outline-none focus:border-red-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-zinc-600 font-mono text-[9px] tracking-widest block mb-1">VALUE</label>
              <input
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder="value"
                className="bg-zinc-900 border border-zinc-700 text-xs text-white px-3 py-2 font-mono w-full focus:outline-none focus:border-red-600"
              />
            </div>
            <button
              onClick={handleAddVar}
              disabled={!newVarKey.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white font-mono text-xs px-4 py-2 transition-colors"
            >
              ADD
            </button>
          </div>

          {/* Save Button */}
          {editedVars.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-4"
            >
              <button
                onClick={handleSaveEnvVars}
                disabled={savingEnv}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-mono text-xs px-6 py-2.5 transition-colors"
              >
                {savingEnv ? 'SAVING...' : `SAVE ${editedVars.size} CHANGE${editedVars.size > 1 ? 'S' : ''}`}
              </button>
              <button
                onClick={() => { setEditedVars(new Map()); fetchEnvVars(serviceTab); }}
                className="text-zinc-500 hover:text-white font-mono text-xs border border-zinc-800 px-4 py-2"
              >
                DISCARD
              </button>
              <span className="text-yellow-500 font-mono text-[10px]">
                Restart/redeploy needed after saving to apply changes
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══ DEPLOY HISTORY TAB ═══ */}
      {subTab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-500 font-mono text-xs">{'// Recent deployments'}</p>
            <button onClick={fetchDeployHistory} className="text-red-600 hover:text-red-500 font-mono text-[10px]">REFRESH</button>
          </div>

          {selectedDeploy ? (
            <div>
              <button onClick={() => setSelectedDeploy(null)} className="text-zinc-400 hover:text-white font-mono text-xs mb-4 flex items-center gap-1">
                &larr; BACK TO LIST
              </button>
              <div className="bg-zinc-800/30 border border-zinc-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-0.5 text-[10px] font-mono ${selectedDeploy.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {selectedDeploy.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                  <span className="text-white font-mono text-sm">{selectedDeploy.target.toUpperCase()}</span>
                  <span className="text-zinc-500 font-mono text-[10px]">{new Date(selectedDeploy.timestamp).toLocaleString()}</span>
                  <span className="text-zinc-600 font-mono text-[10px]">{formatDuration(selectedDeploy.duration)}</span>
                </div>
                <div className="bg-black border border-zinc-800 p-3 max-h-80 overflow-y-auto">
                  <pre className="text-green-400 font-mono text-[11px] whitespace-pre-wrap">{selectedDeploy.output || 'No output recorded'}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {deployHistory.length === 0 ? (
                <p className="text-zinc-600 font-mono text-xs text-center py-12">No deployments yet.</p>
              ) : (
                deployHistory.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeploy(d)}
                    className="w-full text-left bg-zinc-800/30 border border-zinc-800 p-3 hover:bg-zinc-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${d.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-mono text-xs text-white">{d.target.toUpperCase()}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">
                        {d.gitPull ? 'git pull + rebuild' : 'restart only'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-zinc-600 font-mono text-[10px]">{formatDuration(d.duration)}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">{new Date(d.timestamp).toLocaleString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ VPS HELP TAB ═══ */}
      {subTab === 'help' && (
        <div>
          <div className="mb-6">
            <p className="text-zinc-500 font-mono text-xs mb-2">{'// Quick reference for managing your VPS via terminal'}</p>
            <p className="text-zinc-600 font-mono text-[10px]">
              Your VPS: <span className="text-cyan-400">144.91.107.59</span> &middot; OS: Ubuntu &middot; User: root
            </p>
          </div>

          <div className="space-y-6">
            {VPS_HELP.map((section, i) => (
              <div key={i}>
                <p className="text-red-500 font-mono text-[10px] tracking-widest mb-3">{section.category.toUpperCase()}</p>
                <div className="space-y-1">
                  {section.commands.map((item, j) => (
                    <div key={j} className="flex items-start gap-4 p-2 hover:bg-zinc-800/30 transition-colors">
                      <code className="bg-zinc-800 text-cyan-400 font-mono text-[11px] px-2 py-0.5 shrink-0 max-w-[380px] break-all">
                        {item.cmd}
                      </code>
                      <span className="text-zinc-400 font-mono text-[11px]">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-yellow-950/20 border border-yellow-900/40 p-4">
            <p className="text-yellow-500 font-mono text-[10px] tracking-widest mb-2">IMPORTANT SAFETY TIPS</p>
            <ul className="text-zinc-400 font-mono text-[11px] space-y-1">
              <li>&bull; Always back up your .env files before making changes manually</li>
              <li>&bull; Never run <code className="text-red-400">rm -rf /</code> - it deletes EVERYTHING</li>
              <li>&bull; Use this admin panel instead of terminal when possible - it&apos;s safer</li>
              <li>&bull; If something breaks, containers auto-restart. Worst case: reboot the VPS</li>
              <li>&bull; Your domain botwave.online should point to 144.91.107.59 in DNS settings</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
