'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  onClose: () => void;
  qrCode?: string;
  qrGeneratedAt?: string;
  pairingCode?: string;
}

export default function QRCodeDisplay({ onClose, qrGeneratedAt, pairingCode }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (qrGeneratedAt) {
      const generatedAt = new Date(qrGeneratedAt).getTime();
      const expiresAt = generatedAt + 60 * 1000;
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(diff);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [qrGeneratedAt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-card border border-green/20 p-8 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
        <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#5a9a7a] hover:text-green transition-colors"
        >
          ✕
        </button>

        <div className="text-center">
          <h2 className="font-display text-lg tracking-[3px] text-green mb-2">
            CONNECT DEVICE
          </h2>
          
          {pairingCode ? (
            <div className="mb-6">
              <p className="font-mono text-xs text-[#5a9a7a] mb-4">
                1. Open WhatsApp on your phone
                <br />
                2. Go to <span className="text-white">Linked Devices</span>
                <br />
                3. Tap <span className="text-white">Link a Device</span>
                <br />
                4. Tap <span className="text-green underline">Link with phone number instead</span>
                <br />
                5. Enter this 8-character code:
              </p>
              
              <div className="bg-dark border-2 border-green/40 p-6 rounded-lg inline-block relative group overflow-hidden">
                <div className="absolute inset-0 bg-green/5 animate-pulse" />
                <span className="font-display text-4xl text-white tracking-[10px] font-black relative z-10">
                  {pairingCode}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <p className="font-mono text-xs text-[#5a9a7a] mb-6">
                Generating your pairing code...
              </p>
              <div className="flex items-center justify-center gap-2 py-8">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                  className="w-3 h-3 bg-green/60 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-3 h-3 bg-green/60 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-3 h-3 bg-green/60 rounded-full"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-3 h-3 bg-cyan rounded-full animate-pulse" />
            <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">
              {pairingCode ? `EXPIRES IN ${timeLeft}s` : 'PLEASE WAIT...'}
            </span>
          </div>

          <p className="font-mono text-[10px] text-[#3a7a5a] tracking-[1px] mt-4">
            Keep this window open while connecting.
            <br />
            If you see &quot;Can&apos;t link devices&quot;, try again in 15 minutes.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
