import { useState } from 'react';
import { Link, useLocation } from 'wouter';

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('Admin access is restricted to authorized staff only.');
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-[var(--text-primary)]">
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
          </Link>
          <p className="text-xs text-[var(--text-muted)] mt-1">Admin Portal</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] p-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5 text-center">Admin Access</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-500 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors">
              Sign In to Admin
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            Regular user?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">Go to user login</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
