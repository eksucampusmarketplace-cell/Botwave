'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TelegramBotSetupProps {
  onComplete: (data: { token: string; botUsername: string; sessionName: string }) => void;
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
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[2px] text-white">
          TELEGRAM BOT SETUP
        </h3>
        <button
          onClick={onCancel}
          className="font-mono text-[10px] text-[#5a9a7a] hover:text-white transition-colors"
        >
          CANCEL
        </button>
      </div>

      {step === 'token' && (
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
              BOT TOKEN FROM @BOTFATHER
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz"
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
            />
          </div>

          {error && (
            <p className="font-mono text-[10px] text-red-400">{error}</p>
          )}

          <div className="font-mono text-[10px] text-[#3a7a5a] space-y-1">
            <p>1. Open Telegram and search for @BotFather</p>
            <p>2. Send /newbot and follow the instructions</p>
            <p>3. Copy the token and paste it above</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidate}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            VALIDATE TOKEN
          </motion.button>
        </div>
      )}

      {step === 'validating' && (
        <div className="text-center py-8">
          <div className="animate-pulse font-mono text-xs text-green">
            VALIDATING TOKEN...
          </div>
        </div>
      )}

      {step === 'confirm' && botInfo && (
        <div className="space-y-4">
          <div className="bg-green/5 border border-green/20 p-4 space-y-2">
            <p className="font-display text-xs tracking-[2px] text-green">BOT VERIFIED</p>
            <p className="font-mono text-xs text-white">@{botInfo.username}</p>
            <p className="font-mono text-[10px] text-[#5a9a7a]">
              Groups: {botInfo.canJoinGroups ? 'Yes' : 'No'} | 
              Read All: {botInfo.canReadAllGroupMessages ? 'Yes' : 'No'}
            </p>
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">
              SESSION NAME
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white focus:border-green outline-none"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            CONNECT BOT
          </motion.button>
        </div>
      )}
    </div>
  );
}
