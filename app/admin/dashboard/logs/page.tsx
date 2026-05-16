'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LogLine {
  timestamp: string;
  message: string;
}

type LogLevel = 'all' | 'error' | 'warn' | 'info';

const CONTAINERS = [
  'botwave_web', 'botwave_bot_main', 'evolution_api',
  'evolution_postgres', 'botwave_redis', 'botwave_nginx',
];

function getLogColor(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal') || lower.includes('fail')) return 'text-red-400';
  if (lower.includes('warn') || lower.includes('warning')) return 'text-yellow-400';
  if (lower.includes('success') || lower.includes('connected') || lower.includes('ready')) return 'text-green-400';
  return 'text-gray-300';
}

function matchesLevel(message: string, level: LogLevel): boolean {
  if (level === 'all') return true;
  const lower = message.toLowerCase();
  if (level === 'error') return lower.includes('error') || lower.includes('fatal') || lower.includes('fail');
  if (level === 'warn') return lower.includes('warn') || lower.includes('warning');
  if (level === 'info') return !lower.includes('error') && !lower.includes('warn') && !lower.includes('fatal');
  return true;
}

export default function LogsPage() {
  const [container, setContainer] = useState('botwave_web');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [lineCount, setLineCount] = useState(200);
  const [since, setSince] = useState('1h');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deployment/logs?container=${container}&lines=${lineCount}&since=${since}`);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      if (data.success) setLogs(data.data.lines);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [container, lineCount, since]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(l => matchesLevel(l.message, filter));

  const downloadLogs = () => {
    const text = filteredLogs.map(l => `${l.timestamp} ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${container}-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Stream container logs in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadLogs} className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-lg text-xs transition-colors">
            Download .txt
          </button>
          <button onClick={() => setLogs([])} className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-lg text-xs transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={container}
          onChange={e => setContainer(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
        >
          {CONTAINERS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={since}
          onChange={e => setSince(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
        >
          <option value="15m">Last 15 min</option>
          <option value="1h">Last 1 hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
        </select>

        <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          {(['all', 'error', 'warn', 'info'] as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filter === level
                  ? level === 'error' ? 'bg-red-500/20 text-red-400'
                    : level === 'warn' ? 'bg-yellow-500/20 text-yellow-400'
                    : level === 'info' ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={() => setAutoRefresh(!autoRefresh)}
            className="accent-red-500"
          />
          Auto-refresh (5s)
        </label>
      </div>

      {/* Log output */}
      <div className="bg-[#0d0d14] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400 font-mono">{container}</span>
          </div>
          <span className="text-xs text-gray-500">{filteredLogs.length} lines</span>
        </div>
        <div className="h-[500px] overflow-y-auto p-3 font-mono text-xs leading-5 scrollbar-thin">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No logs matching filter</div>
          ) : (
            filteredLogs.map((line, i) => (
              <div key={i} className="hover:bg-white/[0.02] px-1 rounded">
                {line.timestamp && (
                  <span className="text-gray-600 mr-2">{line.timestamp.slice(11, 19)}</span>
                )}
                <span className={getLogColor(line.message)}>{line.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
