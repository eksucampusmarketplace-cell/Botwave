import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import Navbar from '@/components/layout/Navbar';

const terminalLines = [
  { cls: 'comment', text: '# BotWave Authentication' },
  { cls: 'cmd', text: '$ botwave auth --login' },
  { cls: 'output', text: '→ Initializing secure connection...' },
  { cls: 'success', text: '→ TLS 1.3 handshake complete' },
  { cls: 'output', text: '→ Awaiting credentials...' },
  { cls: 'blank', text: '' },
  { cls: 'comment', text: '# Session capabilities:' },
  { cls: 'flag', text: '  → WhatsApp automation' },
  { cls: 'flag', text: '  → AI responses' },
  { cls: 'flag', text: '  → 50+ bot commands' },
  { cls: 'flag', text: '  → Anti-ban protection' },
  { cls: 'flag', text: '  → Live dashboard' },
  { cls: 'blank', text: '' },
  { cls: 'success', text: '→ Ready. Enter credentials to continue.' },
];

function AuthTerminal() {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setLines(p => (p >= terminalLines.length ? p : p + 1));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal h-full" style={{ background: '#0d1117', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8, fontFamily: 'monospace' }}>auth - botwave</span>
      </div>
      <div style={{ padding: '20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: '1.8' }}>
        {terminalLines.slice(0, lines).map((l, i) => (
          <div key={i} style={{ height: l.cls === 'blank' ? 12 : 'auto' }}>
            {l.cls !== 'blank' && (
              <span style={{
                color: l.cls === 'comment' ? '#6b7280' : l.cls === 'cmd' ? '#60a5fa' : l.cls === 'success' ? '#34d399' : l.cls === 'flag' ? '#a78bfa' : '#e5e7eb'
              }}>{l.text}</span>
            )}
          </div>
        ))}
        {lines < terminalLines.length && <span style={{ color: '#60a5fa' }}>█</span>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      if (data.token) localStorage.setItem('bw_token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
            <div className="hidden lg:block h-96">
              <AuthTerminal />
            </div>

            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Welcome Back</h1>
                  <p className="text-sm text-[var(--text-muted)] font-mono mb-8">// sign in to continue</p>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6">
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="text-xs text-blue-500 hover:underline">Forgot password?</Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-blue-500 hover:underline font-medium">Sign up free</Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
