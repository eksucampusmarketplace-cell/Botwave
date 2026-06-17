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

      router.push('/admin/dashboard');
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
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">Wave</span>
          </Link>
          <span className="ml-2 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded font-mono tracking-wider">
            ADMIN
          </span>
          <p className="text-xs text-slate-500 mt-3 font-mono">
            // authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-red-500/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Admin Access
          </h2>

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
              <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/10"
            >
              {loading ? 'Verifying...' : 'Access Control Panel →'}
            </button>
          </div>
        </form>

        <p className="text-center mt-6">
          <Link href="/login" className="text-sm text-slate-500 hover:text-red-400 transition-colors">
            ← Back to member login
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
