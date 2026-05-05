'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ParticleBackground from '@/components/ui/ParticleBackground';

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
    <form onSubmit={handleSubmit} className="bg-card border border-green/10 p-8 relative">
      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
      <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

      <h2 className="font-display text-lg font-bold text-white tracking-[3px] mb-8 text-center">
        LOGIN
      </h2>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-500/10 border border-red-400/30 text-red-400 font-mono text-xs p-3 mb-6"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-green-500/10 border border-green-400/30 text-green-400 font-mono text-xs p-3 mb-6"
        >
          {success}
        </motion.div>
      )}

      <div className="space-y-6">
        <div>
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

        <div>
          <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
            PASSWORD
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

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="w-full font-display text-xs tracking-[3px] px-6 py-4 bg-green text-dark font-bold clip-path-button hover:bg-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {loading ? 'AUTHENTICATING...' : 'LOGIN'}
        </motion.button>
      </div>

      <div className="mt-6 text-center">
        <Link href="/forgot-password" className="font-mono text-[11px] text-[#5a9a7a] hover:text-cyan transition-colors tracking-[1px]">
          FORGOT PASSWORD?
        </Link>
      </div>

      <div className="mt-4 text-center">
        <p className="font-mono text-xs text-[#5a9a7a]">
          DON&apos;T HAVE AN ACCOUNT?{' '}
          <Link href="/signup" className="text-green hover:text-cyan transition-colors">
            SIGN UP
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
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
            {"// MEMBER ACCESS PORTAL"}
          </p>
        </div>

        <Suspense fallback={<div className="bg-card border border-green/10 p-8 text-center font-mono text-green">LOADING PORTAL...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center mt-8 font-mono text-[11px] text-[#3a7a5a] tracking-[2px]">
          <Link href="/" className="hover:text-green transition-colors">
            ← BACK TO HOME
          </Link>
          <span className="mx-2">|</span>
          <Link href="/admin/login" className="hover:text-green transition-colors">
            ADMIN ACCESS →
          </Link>
        </p>
      </motion.div>


    </main>
  );
}
