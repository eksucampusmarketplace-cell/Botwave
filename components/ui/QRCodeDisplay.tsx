'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  onClose: () => void;
  qrCode?: string;
}

export default function QRCodeDisplay({ onClose, qrCode }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasQR, setHasQR] = useState(false);

  useEffect(() => {
    if (qrCode && !hasQR) {
      setHasQR(true);
      setTimeLeft(60); // Reset timer when QR code arrives
    }
  }, [qrCode, hasQR]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

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
            SCAN QR CODE
          </h2>
          <p className="font-mono text-xs text-[#5a9a7a] mb-6">
            Open WhatsApp → Linked Devices → Scan
          </p>

          <div className="bg-white p-4 rounded-lg mx-auto mb-6 inline-block">
            {qrCode ? (
              <QRCodeSVG value={qrCode} size={192} />
            ) : (
              <div className="w-48 h-48 bg-gradient-to-br from-green/20 to-cyan/20 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-1 p-4">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: Math.random() > 0.3 ? 1 : 0.2 }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                      className={`w-6 h-6 ${Math.random() > 0.5 ? 'bg-dark' : 'bg-white border border-green/20'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-3 h-3 bg-cyan rounded-full animate-pulse" />
            <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">
              {qrCode ? `EXPIRES IN ${timeLeft}s` : 'GENERATING...'}
            </span>
          </div>

          <p className="font-mono text-[10px] text-[#3a7a5a] tracking-[1px]">
            Keep this window open during scanning
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
