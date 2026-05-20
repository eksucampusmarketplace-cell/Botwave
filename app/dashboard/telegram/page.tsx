'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '@/components/layout/DashboardNav';

interface TelegramSession {
  id: string;
  session_name: string;
  bot_username: string;
  platform: string;
  state: string;
  created_at: string;
}

export default function TelegramSessionPicker() {
  const [sessions, setSessions] = useState<TelegramSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/user/sessions');
        const data = await res.json();
        if (data.success) {
          const telegramSessions = (data.data || []).filter(
            (s: TelegramSession) => s.platform === 'telegram' || s.platform === 'telegram_userbot'
          );
          setSessions(telegramSessions);

          // Auto-redirect if only one session
          if (telegramSessions.length === 1) {
            router.push(`/dashboard/telegram/${telegramSessions[0].id}`);
            return;
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [router]);

  const stateColor = (state: string) => {
    switch (state) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'connecting': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardNav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Telegram Bot Manager</h1>
        <p className="text-[var(--text-secondary)] mb-8">Select a Telegram session to manage.</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-2xl">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Telegram Sessions</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              You haven&apos;t connected a Telegram bot yet. Go to the Sessions page to add one.
            </p>
            <button
              onClick={() => router.push('/dashboard/sessions')}
              className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Sessions
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => router.push(`/dashboard/telegram/${session.id}`)}
                className="text-left p-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] hover:border-[var(--primary)] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">🤖</div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${stateColor(session.state)}`}>
                    {session.state}
                  </span>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {session.session_name || session.bot_username || 'Telegram Bot'}
                </h3>
                {session.bot_username && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">@{session.bot_username}</p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Created {new Date(session.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
