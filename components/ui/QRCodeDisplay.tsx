'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  onClose: () => void;
  qrCode?: string;
  qrGeneratedAt?: string;
  pairingCode?: string;
  sessionState?: string;
  queuePosition?: number | null;
}

export default function QRCodeDisplay({ onClose, qrCode, qrGeneratedAt, pairingCode, sessionState, queuePosition }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(180);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>(qrCode ? 'qr' : 'code');

  useEffect(() => {
    if (qrCode && !pairingCode) setActiveTab('qr');
    else if (pairingCode && !qrCode) setActiveTab('code');
  }, [qrCode, pairingCode]);

  useEffect(() => {
    let expiresAt: number;
    if (qrGeneratedAt) {
      expiresAt = new Date(qrGeneratedAt).getTime() + 180 * 1000;
    } else if (pairingCode || qrCode) {
      expiresAt = Date.now() + 180 * 1000;
    } else {
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [qrGeneratedAt, pairingCode, qrCode]);

  const handleCopy = useCallback(async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode.replace(/[-\s]/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [pairingCode]);

  const isConnected = sessionState === 'active';
  const hasContent = pairingCode || qrCode;
  const isLoading = !hasContent && !isConnected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/95 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0f0a] border border-green/30 max-w-[95vw] sm:max-w-md w-full mx-1 sm:mx-3 relative overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-green/20 bg-green/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green/80" />
            </div>
            <span className="font-mono text-[10px] text-green/60 tracking-[2px]">
              BOTWAVE://LINK-DEVICE
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-[#5a9a7a] hover:text-red-400 transition-colors px-2"
          >
            [ESC]
          </button>
        </div>

        <div className="p-3 sm:p-5">
          {/* Status header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green' : hasContent ? 'bg-cyan animate-pulse' : 'bg-yellow-500 animate-pulse'
            }`} />
            <span className="font-mono text-xs tracking-[2px] text-green/80">
              {isConnected ? 'CONNECTION ESTABLISHED' : hasContent ? 'AWAITING DEVICE LINK' : 'ESTABLISHING CONNECTION'}
            </span>
          </div>

          {/* Queue position feedback */}
          {isLoading && queuePosition && queuePosition > 0 && (
            <div className="bg-cyan/5 border border-cyan/20 p-4 mb-4 text-center">
              <div className="font-mono text-xs text-cyan tracking-[2px] mb-1">QUEUED FOR PAIRING</div>
              <div className="font-mono text-[10px] text-[#5a9a7a]">
                Another user is pairing right now. Estimated wait: ~3 minutes
              </div>
            </div>
          )}

          {/* Connection success */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <h3 className="font-display text-2xl text-green tracking-[4px] font-black mb-2">LINKED</h3>
              <p className="font-mono text-xs text-[#5a9a7a]">WhatsApp device connected successfully.</p>
              <p className="font-mono text-xs text-[#5a9a7a] mt-1">Bot is now active and listening.</p>
            </motion.div>
          )}

          {/* Tab switcher — only show when both QR and pairing code are available */}
          {!isConnected && hasContent && qrCode && pairingCode && (
            <div className="flex mb-4 border border-green/20 overflow-hidden">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2 font-mono text-[10px] tracking-[2px] transition-all ${
                  activeTab === 'qr'
                    ? 'bg-green/10 text-green border-r border-green/20'
                    : 'text-[#5a9a7a] hover:bg-green/5 border-r border-green/20'
                }`}
              >
                SCAN QR CODE
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2 font-mono text-[10px] tracking-[2px] transition-all ${
                  activeTab === 'code'
                    ? 'bg-green/10 text-green'
                    : 'text-[#5a9a7a] hover:bg-green/5'
                }`}
              >
                ENTER CODE
              </button>
            </div>
          )}

          {/* QR Code display */}
          {!isConnected && hasContent && (activeTab === 'qr' && qrCode) && (
            <div>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={qrCode}
                    size={220}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>
              <div className="bg-[#050a05] border border-green/10 p-3 mb-4 space-y-1.5">
                <div className="font-mono text-[10px] text-green/40 tracking-[1px] mb-2">HOW TO SCAN:</div>
                {[
                  ['1', 'Open', 'WhatsApp', 'on your phone'],
                  ['2', 'Go to', 'Settings > Linked Devices', ''],
                  ['3', 'Tap', 'Link a Device', ''],
                  ['4', 'Point your camera', 'at the QR code', 'above'],
                ].map(([num, pre, highlight, post]) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-cyan/60 w-4">{num}.</span>
                    <span className="font-mono text-[11px] text-[#5a9a7a]">
                      {pre} <span className="text-white font-bold">{highlight}</span> {post}
                    </span>
                  </div>
                ))}
              </div>

              {/* Fallback hint */}
              {pairingCode && (
                <div className="bg-cyan/5 border border-cyan/20 p-2 sm:p-3 mb-3">
                  <p className="font-mono text-[10px] text-cyan/70 leading-relaxed">
                    QR not working? Switch to the <span className="text-white font-bold">ENTER CODE</span> tab above to link with a pairing code instead.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pairing code display */}
          {!isConnected && hasContent && (activeTab === 'code' && pairingCode) && (
            <div>
              <div className="text-center mb-4">
                <div className="font-mono text-[10px] text-cyan/60 tracking-[2px] mb-3">
                  ENTER THIS CODE ON YOUR PHONE
                </div>
                <div
                  className="bg-[#050a05] border-2 border-green/50 px-3 py-2 sm:px-4 sm:py-3 inline-block cursor-pointer group"
                  onClick={handleCopy}
                >
                  <span
                    className="font-mono text-xl sm:text-3xl md:text-4xl text-white font-black tracking-[3px] sm:tracking-[6px] md:tracking-[8px] select-all"
                    style={{ textShadow: '0 0 20px rgba(0,255,128,0.3)' }}
                  >
                    {pairingCode}
                  </span>
                </div>
              </div>

              <div className="flex justify-center mb-4 mt-4">
                <button
                  onClick={handleCopy}
                  className={`font-mono text-xs tracking-[2px] px-6 py-2.5 border transition-all ${
                    copied
                      ? 'border-green bg-green/10 text-green'
                      : 'border-green/30 text-green/70 hover:border-green hover:text-green hover:bg-green/5'
                  }`}
                >
                  {copied ? 'COPIED TO CLIPBOARD' : 'COPY CODE'}
                </button>
              </div>

              <div className="bg-[#050a05] border border-green/10 p-3 mb-4 space-y-1.5">
                <div className="font-mono text-[10px] text-green/40 tracking-[1px] mb-2">HOW TO LINK:</div>
                {[
                  ['1', 'Open', 'WhatsApp', 'on your phone'],
                  ['2', 'Go to', 'Settings > Linked Devices', ''],
                  ['3', 'Tap', 'Link a Device', ''],
                  ['4', 'Choose', 'Link with phone number instead', ''],
                  ['5', 'Enter the', '8-digit code', 'shown above'],
                ].map(([num, pre, highlight, post]) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-cyan/60 w-4">{num}.</span>
                    <span className="font-mono text-[11px] text-[#5a9a7a]">
                      {pre} <span className="text-white font-bold">{highlight}</span> {post}
                    </span>
                  </div>
                ))}
              </div>

              {/* WhatsApp scam warning */}
              <div className="bg-yellow-950/20 border border-yellow-600/20 p-2 sm:p-3 mb-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 text-xs mt-0.5">!</span>
                  <p className="font-mono text-[10px] text-yellow-600/80 leading-relaxed">
                    WhatsApp may show a &quot;could be a scam&quot; warning — this is normal. Tap <span className="text-yellow-500 font-bold">Continue</span> to proceed.
                  </p>
                </div>
              </div>

              {/* Fallback hint */}
              {qrCode && (
                <div className="bg-cyan/5 border border-cyan/20 p-2 sm:p-3 mb-3">
                  <p className="font-mono text-[10px] text-cyan/70 leading-relaxed">
                    Pairing code not working? Switch to the <span className="text-white font-bold">SCAN QR CODE</span> tab above to link by scanning instead.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Only QR available (no pairing code yet) */}
          {!isConnected && !pairingCode && qrCode && activeTab === 'qr' && (
            <div className="text-center mt-2 mb-3">
              <span className="font-mono text-[10px] text-[#5a9a7a]">Pairing code loading...</span>
            </div>
          )}

          {/* Only pairing code available (no QR) — show hint about QR */}
          {!isConnected && pairingCode && !qrCode && (
            <div className="text-center mt-2 mb-3">
              <span className="font-mono text-[10px] text-[#3a7a5a]">QR code not available for this session</span>
            </div>
          )}

          {/* Neither method working hint */}
          {!isConnected && hasContent && (
            <div className="bg-[#0a0a05] border border-yellow-600/15 p-2 sm:p-3 mb-3">
              <p className="font-mono text-[10px] text-yellow-600/60 leading-relaxed text-center">
                If neither method works, close this dialog, wait <span className="text-yellow-500 font-bold">1 hour</span>, then try connecting again.
              </p>
            </div>
          )}

          {/* Cancel button */}
          {!isConnected && hasContent && (
            <div className="flex justify-center mb-3">
              <button
                onClick={onClose}
                className="font-mono text-xs tracking-[2px] px-6 py-2.5 border border-red-400/30 text-red-400/70 hover:border-red-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
              >
                CANCEL
              </button>
            </div>
          )}

          {/* Timer bar */}
          {!isConnected && hasContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
                  <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
                    VALID FOR
                  </span>
                </div>
                <span className={`font-mono text-sm font-bold tracking-[2px] ${
                  timeLeft <= 15 ? 'text-red-400' : timeLeft <= 30 ? 'text-yellow-500' : 'text-green'
                }`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="w-full h-1 bg-green/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${timeLeft <= 15 ? 'bg-red-400' : timeLeft <= 30 ? 'bg-yellow-500' : 'bg-green/60'}`}
                  style={{ width: `${(timeLeft / 180) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-4 h-4 border-2 border-cyan/60 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs text-cyan/60 tracking-[1px]">
                  Generating link code...
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#3a7a5a]">
                This may take 10-20 seconds.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-green/10 flex items-center justify-between">
            <span className="font-mono text-[9px] text-green/20 tracking-[1px]">
              BOTWAVE SECURE LINK
            </span>
            <span className="font-mono text-[9px] text-green/20">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
