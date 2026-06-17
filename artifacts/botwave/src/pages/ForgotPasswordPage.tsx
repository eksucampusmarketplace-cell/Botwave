import { useState } from 'react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok && response.status !== 503) {
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
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[var(--text-primary)]">
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] p-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1 text-center">Reset Password</h2>
          <p className="text-sm text-[var(--text-muted)] text-center mb-8">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-emerald-500">
                  If an account with that email exists, a password reset link has been sent. Check your inbox.
                </p>
              </div>
              <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-6">
                Don't see it? Check your <span className="font-semibold">spam/junk folder</span>.
              </p>
              <Link href="/login" className="text-sm text-blue-500 hover:underline">← Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-500 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
