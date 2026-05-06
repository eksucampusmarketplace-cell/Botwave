'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono";

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
            New Password
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8 font-mono">
            // set a new password
          </p>

          {success ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-emerald-400">
                  Password updated successfully! Redirecting to dashboard...
                </p>
              </div>
            </motion.div>
          ) : !ready ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">
                Verifying reset link...
              </p>
              <p className="text-xs text-slate-500 mt-2">
                If this takes too long, the link may have expired.{' '}
                <Link href="/forgot-password" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  Request a new one
                </Link>
              </p>
            </div>
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

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">NEW PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="min. 8 characters"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
                >
                  {loading ? 'Updating...' : 'Update Password →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  );
}
