'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

export default function CreateBotPage() {
  const [botName, setBotName] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [ownerTelegramId, setOwnerTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ botUsername: string; sessionId?: string } | null>(null);

  const handleCreate = async () => {
    setError('');
    setSuccess(null);

    if (!botName.trim()) { setError('Bot name is required'); return; }
    if (!botUsername.trim()) { setError('Bot username is required'); return; }
    if (!/bot$/i.test(botUsername)) { setError('Username must end with "bot"'); return; }
    if (botUsername.length < 5 || botUsername.length > 32) { setError('Username must be 5-32 characters'); return; }
    if (!ownerTelegramId.trim() || !/^\d+$/.test(ownerTelegramId)) { setError('Valid Telegram user ID is required'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/telegram/create-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ botName, botUsername, ownerTelegramId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create bot');
        return;
      }

      setSuccess(data.data);
      setBotName('');
      setBotUsername('');
      setOwnerTelegramId('');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Create a New Bot
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Create Telegram bots via Bot Management Mode. Max 20 bots per day.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
              <h3 className="text-green-400 font-semibold mb-2">Bot Created Successfully!</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                @{success.botUsername} is ready. The owner has been notified via Telegram DM.
              </p>
              {success.sessionId && (
                <a
                  href={`/dashboard/telegram/${success.sessionId}`}
                  className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  Configure Bot
                </a>
              )}
            </div>
          )}

          <div className="rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Bot Display Name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="My Awesome Bot"
                  maxLength={64}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Bot Username
                </label>
                <input
                  type="text"
                  value={botUsername}
                  onChange={(e) => setBotUsername(e.target.value)}
                  placeholder="my_awesome_bot"
                  maxLength={32}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Must end with &quot;bot&quot;, 5-32 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Owner Telegram User ID
                </label>
                <input
                  type="text"
                  value={ownerTelegramId}
                  onChange={(e) => setOwnerTelegramId(e.target.value)}
                  placeholder="123456789"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  The Telegram user ID that will own this bot. Get it from @userinfobot.
                </p>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating Bot...' : 'Create Bot'}
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Prerequisites
            </h3>
            <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
              <li>Bot Management Mode must be enabled for @Botwave_telegrambot in BotFather</li>
              <li>Bot to Bot Communication must be enabled in BotFather</li>
              <li>The owner&apos;s Telegram user ID must be valid</li>
              <li>Maximum 20 bots can be created per user per day</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
