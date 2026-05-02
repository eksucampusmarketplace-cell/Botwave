'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store admin session info if needed, or just redirect
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black z-0" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <Link href="/" className="font-display text-3xl font-black text-red-600 tracking-[4px] drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            BOT<span className="text-white">WAVE</span> <span className="text-sm border border-red-600 px-2 py-0.5 ml-2">ADMIN</span>
          </Link>
          <p className="font-mono text-xs text-gray-500 tracking-[3px] mt-4">
            {"// AUTHORIZED PERSONNEL ONLY"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-red-600/20 p-8 backdrop-blur-xl">
          <h2 className="font-display text-lg font-bold text-white tracking-[3px] mb-8 text-center">
            ADMIN LOGIN
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-600/30 text-red-500 font-mono text-xs p-3 mb-6"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <div>
              <label className="font-mono text-xs text-gray-400 tracking-[2px] block mb-2">
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-black border border-red-600/20 px-4 py-3 text-white font-mono text-sm focus:border-red-600 focus:outline-none transition-colors"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-gray-400 tracking-[2px] block mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black border border-red-600/20 px-4 py-3 text-white font-mono text-sm focus:border-red-600 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-display text-xs tracking-[3px] px-6 py-4 bg-red-600 text-white font-bold hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'VERIFYING...' : 'ACCESS CONTROL PANEL'}
            </button>
          </div>
        </form>

        <p className="text-center mt-8 font-mono text-[11px] text-gray-600 tracking-[2px]">
          <Link href="/login" className="hover:text-red-500 transition-colors">
            ← BACK TO MEMBER LOGIN
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
