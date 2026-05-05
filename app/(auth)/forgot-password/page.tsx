'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ParticleBackground from '@/components/ui/ParticleBackground';

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
            {"// PASSWORD RECOVERY"}
          </p>
        </div>

        <div className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

          <h2 className="font-display text-lg font-bold text-white tracking-[3px] mb-6 text-center">
            RESET PASSWORD
          </h2>

          {sent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="bg-green/10 border border-green/30 p-4 mb-6">
                <p className="font-mono text-xs text-green">
                  If an account with that email exists, a password reset link has been sent. Check your inbox.
                </p>
              </div>
              <Link
                href="/login"
                className="font-mono text-xs text-[#5a9a7a] hover:text-green transition-colors tracking-[2px]"
              >
                BACK TO LOGIN
              </Link>
            </motion.div>
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

              <p className="font-mono text-[11px] text-[#5a9a7a] mb-6">
                Enter your email or username and we&apos;ll send you a link to reset your password.
              </p>

              <div className="mb-6">
                <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                  EMAIL OR USERNAME
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                  placeholder="user@example.com or username"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full font-display text-xs tracking-[3px] px-6 py-4 bg-green text-dark font-bold clip-path-button hover:bg-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SENDING...' : 'SEND RESET LINK'}
              </motion.button>
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
