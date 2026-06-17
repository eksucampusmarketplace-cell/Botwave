import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-4">Dashboard</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            The dashboard requires authentication. Sign up or log in to manage your WhatsApp and Telegram bot sessions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-bold rounded-xl hover:border-blue-400 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-left">
            <h2 className="font-bold text-[var(--text-primary)] mb-4">What you'll find in the dashboard</h2>
            <ul className="space-y-3">
              {[
                { icon: '📱', text: 'Connect your WhatsApp or Telegram account via QR code' },
                { icon: '⚙️', text: 'Configure anti-spam, welcome messages, and bot settings' },
                { icon: '📊', text: 'View group analytics and message usage' },
                { icon: '🤖', text: 'Manage custom commands and auto-replies' },
                { icon: '📅', text: 'Schedule messages for specific times' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="text-xl">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
