'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ParticleBackground from '@/components/ui/ParticleBackground';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check if user is already in a password recovery session
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

  return (
    <main className="min-h-screen bg-dark flex items-center justify-center px-4 relative overflow-hidden">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <Link href="/" className="font-display text-3xl font-black text-green tracking-[4px] drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            BOT<span className="text-cyan">WAVE</span>
          </Link>
          <p className="font-mono text-xs text-[#5a9a7a] tracking-[3px] mt-4">
            {"// SET NEW PASSWORD"}
          </p>
        </div>

        <div className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

          <h2 className="font-display text-lg font-bold text-white tracking-[3px] mb-6 text-center">
            NEW PASSWORD
          </h2>

          {success ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-green/10 border border-green/30 p-4 mb-4">
                <p className="font-mono text-xs text-green">
                  Password updated successfully! Redirecting to dashboard...
                </p>
              </div>
            </motion.div>
          ) : !ready ? (
            <div className="text-center py-8">
              <p className="font-mono text-xs text-[#5a9a7a]">
                Verifying reset link...
              </p>
              <p className="font-mono text-[10px] text-[#3a6a5a] mt-2">
                If this takes too long, the link may have expired.{' '}
                <Link href="/forgot-password" className="text-cyan hover:text-green transition-colors">
                  Request a new one
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-400/30 text-red-400 font-mono text-xs p-3 mb-6"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                    NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full font-display text-xs tracking-[3px] px-6 py-4 bg-green text-dark font-bold clip-path-button hover:bg-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                </motion.button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-8 font-mono text-[11px] text-[#3a7a5a] tracking-[2px]">
          <Link href="/login" className="hover:text-green transition-colors">
            ← BACK TO LOGIN
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
