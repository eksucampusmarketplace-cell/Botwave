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
        <h3 className="font-display text-xs tracking-[2px] text-white">
          TELEGRAM USERBOT SETUP
        </h3>
        <button
          onClick={onCancel}
          className="font-mono text-[10px] text-[#5a9a7a] hover:text-white transition-colors"
        >
          CANCEL
        </button>
      </div>

      {step === 'credentials' && (
        <div className="space-y-4">
          <div className="font-mono text-[10px] text-[#3a7a5a] space-y-1 bg-green/5 border border-green/10 p-3">
            <p>1. Go to https://my.telegram.org/apps</p>
            <p>2. Log in with your phone number</p>
            <p>3. Create an application to get API ID and Hash</p>
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">API ID</label>
            <input
              type="text"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              placeholder="12345678"
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">API HASH</label>
            <input
              type="password"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              placeholder="0123456789abcdef0123456789abcdef"
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">PHONE NUMBER</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
            />
          </div>

          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRequestCode}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            SEND VERIFICATION CODE
          </motion.button>
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <p className="font-mono text-[10px] text-[#5a9a7a]">
            Enter your phone number to receive a verification code on Telegram.
          </p>
          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRequestCode}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            RETRY SEND CODE
          </motion.button>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-4">
          <p className="font-mono text-[10px] text-green">
            Verification code sent to your Telegram app.
          </p>
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">VERIFICATION CODE</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345"
              maxLength={6}
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none tracking-[8px] text-center text-lg"
            />
          </div>

          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleVerifyCode(false)}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            VERIFY CODE
          </motion.button>
        </div>
      )}

      {step === 'twofa' && (
        <div className="space-y-4">
          <p className="font-mono text-[10px] text-cyan">
            Two-factor authentication is enabled. Enter your cloud password.
          </p>
          <div>
            <label className="font-mono text-[10px] text-[#5a9a7a] block mb-2">2FA PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your cloud password"
              className="w-full bg-dark border border-green/20 p-3 font-mono text-xs text-white placeholder:text-[#3a5a4a] focus:border-green outline-none"
            />
          </div>

          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleVerifyCode(true)}
            className="w-full font-display text-[10px] tracking-[2px] px-4 py-3 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            VERIFY 2FA
          </motion.button>
        </div>
      )}

      {step === 'loading' && (
        <div className="text-center py-8">
          <div className="animate-pulse font-mono text-xs text-green">
            PROCESSING...
          </div>
        </div>
      )}
    </div>
  );
}
