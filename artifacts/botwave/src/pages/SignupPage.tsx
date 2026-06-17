import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import Navbar from '@/components/layout/Navbar';

const terminalLines = [
  { cls: 'comment', text: '# BotWave - New Account Setup' },
  { cls: 'cmd', text: '$ botwave create-account' },
  { cls: 'output', text: '→ Setting up your workspace...' },
  { cls: 'blank', text: '' },
  { cls: 'comment', text: '# What you get:' },
  { cls: 'flag', text: '  → Telegram Bot automation' },
  { cls: 'flag', text: '  → 50+ automation commands' },
  { cls: 'flag', text: '  → AI chatbot (BYOK)' },
  { cls: 'flag', text: '  → Sticker maker & media tools' },
  { cls: 'flag', text: '  → Anti-ban protection system' },
  { cls: 'flag', text: '  → Group management toolkit' },
  { cls: 'flag', text: '  → Mini games & engagement' },
  { cls: 'blank', text: '' },
  { cls: 'success', text: '→ 2 platforms. Free forever. No credit card.' },
  { cls: 'success', text: '→ Fill in your details to begin →' },
];

function SignupTerminal() {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setLines(p => (p >= terminalLines.length ? p : p + 1));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: '#0d1117', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8, fontFamily: 'monospace' }}>setup - botwave</span>
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

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyEmail, setVerifyEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, username: formData.username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');
      if (data.token) localStorage.setItem('bw_token', data.token);
      setVerifyEmail(formData.email);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Check your email</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            We've sent a verification link to <strong>{verifyEmail}</strong>. Click the link to activate your account.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Didn't get it? Check your spam folder or{' '}
            <button className="text-blue-500 hover:underline" onClick={() => setStep('form')}>try again</button>.
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
            <div className="hidden lg:block h-[420px]">
              <SignupTerminal />
            </div>

            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Create Free Account</h1>
                  <p className="text-sm text-[var(--text-muted)] font-mono mb-8">// no credit card required</p>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6">
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Username</label>
                      <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="yourname"
                        required
                        minLength={3}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                      By signing up you agree to our{' '}
                      <a href="https://www.botwave.online/terms" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Terms</a>
                      {' '}and{' '}
                      <a href="https://www.botwave.online/privacy" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
                    >
                      {loading ? 'Creating account...' : 'Create Free Account →'}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-500 hover:underline font-medium">Sign in</Link>
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
