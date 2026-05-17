'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TelegramUserbotSetupProps {
  onComplete: (data: { sessionString: string; sessionName: string; apiId: number; apiHash: string }) => void;
  onCancel: () => void;
}

export default function TelegramUserbotSetup({ onComplete, onCancel }: TelegramUserbotSetupProps) {
  const [step, setStep] = useState<'credentials' | 'phone' | 'code' | 'twofa' | 'loading'>('credentials');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [storeKey, setStoreKey] = useState('');
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    if (!apiId.trim() || !apiHash.trim() || !phone.trim()) {
      setError('All fields are required');
      return;
    }

    setError('');
    setStep('loading');

    try {
      const res = await fetch('/api/telegram/userbot/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          apiId: parseInt(apiId),
          apiHash: apiHash.trim(),
          sessionId: `temp_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send verification code');
        setStep('phone');
        return;
      }

      setStoreKey(data.storeKey);
      setSessionName(phone.trim());
      setStep('code');
    } catch {
      setError('Failed to request code. Please try again.');
      setStep('phone');
    }
  };

  const handleVerifyCode = async (with2FA = false) => {
    setError('');
    setStep('loading');

    try {
      const body: Record<string, string> = { storeKey, code: code.trim() };
      if (with2FA && password) {
        body.password = password;
      }

      const res = await fetch('/api/telegram/userbot/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.needs2FA) {
        setStep('twofa');
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || 'Verification failed');
        setStep(with2FA ? 'twofa' : 'code');
        return;
      }

      onComplete({
        sessionString: data.sessionString,
        sessionName: sessionName || phone,
        apiId: parseInt(apiId),
        apiHash: apiHash.trim(),
      });
    } catch {
      setError('Verification failed. Please try again.');
      setStep(with2FA ? 'twofa' : 'code');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          Telegram Userbot Setup
        </h3>
        <button
          onClick={onCancel}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
      </div>

      {step === 'credentials' && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--text-muted)] space-y-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 rounded-xl">
            <p>1. Go to https://my.telegram.org/apps</p>
            <p>2. Log in with your phone number</p>
            <p>3. Create an application to get API ID and Hash</p>
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">API ID</label>
            <input
              type="text"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              placeholder="12345678"
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">API Hash</label>
            <input
              type="password"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              placeholder="0123456789abcdef0123456789abcdef"
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRequestCode}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Send Verification Code
          </motion.button>
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Enter your phone number to receive a verification code on Telegram.
          </p>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRequestCode}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Retry Send Code
          </motion.button>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Verification code sent to your Telegram app.
          </p>
          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345"
              maxLength={6}
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-[var(--text-primary)] rounded-xl focus:border-blue-500 outline-none transition-colors tracking-[8px] text-center text-lg"
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleVerifyCode(false)}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Verify Code
          </motion.button>
        </div>
      )}

      {step === 'twofa' && (
        <div className="space-y-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Two-factor authentication is enabled. Enter your cloud password.
          </p>
          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2 font-medium">2FA Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your cloud password"
              className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleVerifyCode(true)}
            className="w-full text-sm px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Verify 2FA
          </motion.button>
        </div>
      )}

      {step === 'loading' && (
        <div className="text-center py-8">
          <div className="animate-pulse text-sm text-blue-600 dark:text-blue-400 font-medium">
            Processing...
          </div>
        </div>
      )}
    </div>
  );
}
