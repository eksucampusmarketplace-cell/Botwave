'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const terminalLines = [
  { cls: 'comment', text: '# BotWave Authentication' },
  { cls: 'cmd', text: '$ botwave auth --login' },
  { cls: 'output', text: '→ Initializing secure connection...' },
  { cls: 'success', text: '→ TLS 1.3 handshake complete' },
  { cls: 'output', text: '→ Awaiting credentials...' },
  { cls: 'blank', text: '' },
  { cls: 'comment', text: '# Session capabilities:' },
  { cls: 'flag', text: '  → WhatsApp automation' },
  { cls: 'flag', text: '  → AI-powered responses' },
  { cls: 'flag', text: '  → 50+ bot commands' },
  { cls: 'flag', text: '  → Anti-ban protection' },
  { cls: 'flag', text: '  → Real-time dashboard' },
  { cls: 'blank', text: '' },
  { cls: 'success', text: '→ Ready. Enter credentials to continue.' },
];

function AuthTerminal() {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setLines((p) => (p >= terminalLines.length ? p : p + 1));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal h-full">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ff5f57' }} />
        <div className="terminal-dot" style={{ background: '#febc2e' }} />
        <div className="terminal-dot" style={{ background: '#28c840' }} />
        <span className="text-xs text-slate-500 ml-3 font-mono">auth — botwave</span>
      </div>
      <div className="terminal-body">
        {terminalLines.slice(0, lines).map((l, i) => (
          <div key={i} className={l.cls === 'blank' ? 'h-3' : ''}>
            <span className={l.cls}>{l.text}</span>
          </div>
        ))}
        {lines < terminalLines.length && <span className="cmd">█</span>}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccess(message);
    }
  }, [searchParams]);

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

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8">
      <h2 className="text-2xl font-bold text-white mb-1">
        Welcome Back
      </h2>
      <p className="text-sm text-slate-500 font-mono mb-8">
        // sign in to continue
      </p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg p-3 mb-6"
        >
          {success}
        </motion.div>
      )}

      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">
            EMAIL / USERNAME
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Authenticating...
            </span>
          ) : (
            'Sign In →'
          )}
        </button>
      </div>

      <div className="mt-5 text-center">
        <Link href="/forgot-password" className="text-sm text-emerald-400/70 hover:text-emerald-400 font-medium transition-colors">
          Forgot password?
        </Link>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 tech-grid opacity-30" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left — Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <Link href="/" className="text-3xl font-bold text-white">
              Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
            </Link>
          </div>

          <Suspense fallback={
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </motion.div>

        {/* Right — Terminal */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden lg:block"
        >
          <AuthTerminal />
        </motion.div>
      </div>
    </main>
  );
}
