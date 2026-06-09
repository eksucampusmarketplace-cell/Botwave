'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TelegramBotSetupProps {
  onComplete: (data: { token: string; botUsername: string; sessionName: string; ownerTelegramId?: string }) => void;
  onCancel: () => void;
}

export default function TelegramBotSetup({ onComplete, onCancel }: TelegramBotSetupProps) {
  const [step, setStep] = useState<'token' | 'validating' | 'confirm'>('token');
  const [token, setToken] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [botInfo, setBotInfo] = useState<{
    username: string;
    firstName: string;
    canJoinGroups: boolean;
    canReadAllGroupMessages: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [ownerTelegramId, setOwnerTelegramId] = useState('');

  const handleValidate = async () => {
    if (!token.trim()) {
      setError('Please enter a bot token');
      return;
    }

    setError('');
    setStep('validating');

    try {
      const res = await fetch('/api/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid bot token');
        setStep('token');
        return;
      }

      setBotInfo(data.data);
      setSessionName(data.data.firstName || data.data.username);
      setStep('confirm');
    } catch {
      setError('Failed to validate token. Please try again.');
      setStep('token');
    }
  };

  const handleConfirm = () => {
    if (!botInfo) return;
    onComplete({
      token: token.trim(),
      botUsername: botInfo.username,
      sessionName: sessionName || botInfo.username,
      ...(ownerTelegramId.trim() ? { ownerTelegramId: ownerTelegramId.trim() } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          Telegram Bot Setup
        </h3>
        <button
          onClick={onCancel}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
      </div>

      {step === 'token' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">
              Bot Token from @BotFather
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz"
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <div className="text-sm text-[var(--text-muted)] space-y-1">
            <p>1. Open Telegram and search for @BotFather</p>
            <p>2. Send /newbot and follow the instructions</p>
            <p>3. Copy the token and paste it above</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidate}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Validate Token
          </motion.button>
        </div>
      )}

      {step === 'validating' && (
        <div className="text-center py-8">
          <div className="animate-pulse text-sm text-blue-600 dark:text-blue-400 font-medium">
            Validating token...
          </div>
        </div>
      )}

      {step === 'confirm' && botInfo && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">Bot Verified</p>
            <p className="text-sm text-[var(--text-primary)]">@{botInfo.username}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Groups: {botInfo.canJoinGroups ? 'Yes' : 'No'} | 
              Read All: {botInfo.canReadAllGroupMessages ? 'Yes' : 'No'}
            </p>
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>


            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">
                Your Telegram User ID (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789"
                value={ownerTelegramId}
                onChange={(e) => setOwnerTelegramId(e.target.value.trim())}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] rounded-xl focus:border-blue-500 outline-none transition-colors"
              />
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Find your ID by messaging @userinfobot on Telegram.
                Leave blank to use /claimowner from the bot DM instead.
              </p>
            </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Connect Bot
          </motion.button>
        </div>
      )}
    </div>
  );
}
