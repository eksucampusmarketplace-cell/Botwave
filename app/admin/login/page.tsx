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
    <main className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            Bot<span className="text-red-500">Wave</span>
          </Link>
          <span className="ml-2 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">
            ADMIN
          </span>
          <p className="text-sm text-slate-400 mt-3">
            Authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Admin Login
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
              <label className="text-sm font-medium text-slate-300 block mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 px-4 py-3 rounded-lg text-white text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 px-4 py-3 rounded-lg text-white text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                placeholder="Enter admin password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Access Control Panel'}
            </button>
          </div>
        </form>

        <p className="text-center mt-6">
          <Link href="/login" className="text-sm text-slate-400 hover:text-red-400 transition-colors">
            &larr; Back to member login
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
