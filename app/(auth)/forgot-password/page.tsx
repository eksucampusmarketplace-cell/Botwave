'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 tech-grid opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
          </Link>
        </div>

        <div className="glass-card rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-1 text-center">
            Reset Password
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8 font-mono">
            // recover your account
          </p>

          {sent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-emerald-400">
                  If an account with that email exists, a password reset link has been sent. Check your inbox.
                </p>
              </div>
              <Link href="/login" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Back to login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6"
                >
                  {error}
                </motion.div>
              )}

              <div className="mb-6">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
              >
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">
            ← Back to login
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
