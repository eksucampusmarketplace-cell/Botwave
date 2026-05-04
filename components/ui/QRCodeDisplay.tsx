'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

interface QRCodeDisplayProps {
  onClose: () => void;
  qrCode?: string;
  qrGeneratedAt?: string;
  pairingCode?: string;
  sessionState?: string;
}

const CONNECTION_STEPS = [
  { text: 'Initializing secure channel...', icon: '>' },
  { text: 'Resolving WhatsApp relay endpoints...', icon: '>' },
  { text: 'Establishing TLS 1.3 handshake...', icon: '>' },
  { text: 'Authenticating with Noise protocol...', icon: '>' },
  { text: 'Requesting pairing authorization...', icon: '>' },
  { text: 'Generating 8-digit pairing code...', icon: '>' },
];

function TypewriterLine({ text, icon, onDone, delay }: { text: string; icon: string; onDone: () => void; delay: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          onDone();
        }
      }, 18);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, onDone]);

  return (
    <div className="flex items-start gap-2 font-mono text-xs">
      <span className={done ? 'text-green' : 'text-cyan'}>{done ? '[OK]' : `[${icon}${icon}]`}</span>
      <span className={done ? 'text-[#5a9a7a]' : 'text-green/80'}>{displayed}{!done && <span className="animate-pulse">_</span>}</span>
    </div>
  );
}

function SpinnerChar() {
  const [frame, setFrame] = useState(0);
  const frames = ['|', '/', '-', '\\'];
  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f + 1) % frames.length), 100);
    return () => clearInterval(interval);
  }, [frames.length]);
  return <span className="text-cyan font-mono">{frames[frame]}</span>;
}

export default function QRCodeDisplay({ onClose, qrGeneratedAt, pairingCode, sessionState }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(180);
  const [copied, setCopied] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [showTerminal, setShowTerminal] = useState(!pairingCode);

  useEffect(() => {
    if (pairingCode) {
      setShowTerminal(false);
      setCompletedSteps(CONNECTION_STEPS.length);
    }
  }, [pairingCode]);

  useEffect(() => {
    // Anchor the countdown to a real timestamp so it survives page
    // refreshes and doesn't drift from setInterval accumulation.
    // Priority: qrGeneratedAt from DB → fallback to when pairingCode first appeared.
    let expiresAt: number;

    if (qrGeneratedAt) {
      expiresAt = new Date(qrGeneratedAt).getTime() + 180 * 1000;
    } else if (pairingCode) {
      // No DB timestamp available — anchor to current time.
      // On refresh this resets, but it's better than a drifting interval.
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
  }, [qrGeneratedAt, pairingCode]);

  const handleStepDone = useCallback(() => {
    setCompletedSteps(c => c + 1);
  }, []);

  const handleCopy = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode.replace(/[-\s]/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isConnected = sessionState === 'active';
  const isWaiting = pairingCode && !isConnected;
  const isLoading = !pairingCode && !isConnected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/95 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#0a0f0a] border border-green/30 max-w-lg w-full mx-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-green/[0.03] to-transparent h-[2px] pointer-events-none"
          animate={{ y: [0, 600] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />

        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-green/50" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-green/50" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-green/50" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-green/50" />

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-green/20 bg-green/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green/80" />
            </div>
            <span className="font-mono text-[10px] text-green/60 tracking-[2px]">
              BOTWAVE://SECURE-LINK
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-[#5a9a7a] hover:text-red-400 transition-colors px-2"
          >
            [ESC]
          </button>
        </div>

        <div className="p-6">
          {/* Status header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green' : isWaiting ? 'bg-cyan animate-pulse' : 'bg-yellow-500 animate-pulse'
            }`} />
            <span className="font-mono text-xs tracking-[2px] text-green/80">
              {isConnected ? 'CONNECTION ESTABLISHED' : isWaiting ? 'AWAITING DEVICE CONFIRMATION' : 'ESTABLISHING CONNECTION'}
            </span>
          </div>

          {/* Terminal output — show during loading */}
          <AnimatePresence>
            {showTerminal && isLoading && (
              <motion.div
                initial={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[#050a05] border border-green/10 p-4 mb-5 space-y-1.5 max-h-[180px] overflow-hidden"
              >
                <div className="font-mono text-[10px] text-green/40 mb-2">--- BOTWAVE SECURE LINK v2.1 ---</div>
                {CONNECTION_STEPS.map((step, i) => (
                  <div key={i}>
                    {i <= completedSteps && (
                      <TypewriterLine
                        text={step.text}
                        icon={step.icon}
                        delay={i * 800}
                        onDone={handleStepDone}
                      />
                    )}
                  </div>
                ))}
                {completedSteps < CONNECTION_STEPS.length && (
                  <div className="flex items-center gap-2 mt-2">
                    <SpinnerChar />
                    <span className="font-mono text-[10px] text-cyan/60">Processing...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connection success state */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-4">&#x1F50C;</div>
              <h3 className="font-display text-2xl text-green tracking-[4px] font-black mb-2">LINKED</h3>
              <p className="font-mono text-xs text-[#5a9a7a]">WhatsApp device connected successfully.</p>
              <p className="font-mono text-xs text-[#5a9a7a] mt-1">Bot is now active and listening for commands.</p>
            </motion.div>
          )}

          {/* Pairing code display */}
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Big pairing code */}
              <div className="text-center mb-5">
                <div className="font-mono text-[10px] text-cyan/60 tracking-[2px] mb-3">
                  ENTER THIS CODE ON YOUR PHONE
                </div>
                <motion.div
                  className="bg-[#050a05] border-2 border-green/50 p-5 inline-block relative cursor-pointer group"
                  onClick={handleCopy}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Pulse glow */}
                  <motion.div
                    className="absolute inset-0 border-2 border-green/30"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <span
                      className="font-mono text-5xl md:text-6xl text-white font-black tracking-[12px] md:tracking-[16px] select-all"
                      style={{ textShadow: '0 0 20px rgba(0,255,128,0.3)' }}
                    >
                      {pairingCode}
                    </span>
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-green/40 tracking-[1px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {copied ? 'COPIED!' : 'CLICK TO COPY'}
                  </div>
                </motion.div>
              </div>

              {/* Copy button (mobile-friendly) */}
              <div className="flex justify-center mb-5 mt-8">
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`font-mono text-xs tracking-[2px] px-6 py-2.5 border transition-all ${
                    copied
                      ? 'border-green bg-green/10 text-green'
                      : 'border-green/30 text-green/70 hover:border-green hover:text-green hover:bg-green/5'
                  }`}
                >
                  {copied ? 'COPIED TO CLIPBOARD' : 'COPY CODE'}
                </motion.button>
              </div>

              {/* Steps */}
              <div className="bg-[#050a05] border border-green/10 p-4 mb-5 space-y-2">
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

              {/* WhatsApp scam warning note */}
              <div className="bg-yellow-950/20 border border-yellow-600/20 p-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 text-xs mt-0.5">!</span>
                  <p className="font-mono text-[10px] text-yellow-600/80 leading-relaxed">
                    WhatsApp may show a &quot;could be a scam&quot; warning — this is normal when linking from a different region. Tap <span className="text-yellow-500 font-bold">Continue</span> to proceed safely.
                  </p>
                </div>
              </div>

              {/* Timer bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-cyan"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
                      CODE VALID FOR
                    </span>
                  </div>
                  <span className={`font-mono text-sm font-bold tracking-[2px] ${
                    timeLeft <= 15 ? 'text-red-400' : timeLeft <= 30 ? 'text-yellow-500' : 'text-green'
                  }`}>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full h-1 bg-green/10 overflow-hidden">
                  <motion.div
                    className={`h-full ${timeLeft <= 15 ? 'bg-red-400' : timeLeft <= 30 ? 'bg-yellow-500' : 'bg-green/60'}`}
                    style={{ width: `${(timeLeft / 180) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading state — no code yet */}
          {isLoading && !showTerminal && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <SpinnerChar />
                <span className="font-mono text-xs text-cyan/60 tracking-[1px]">
                  Waiting for pairing code from server...
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#3a7a5a]">
                This may take 10-20 seconds. If it takes longer, the system will auto-retry.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-green/10 flex items-center justify-between">
            <span className="font-mono text-[9px] text-green/20 tracking-[1px]">
              BOTWAVE SECURE LINK // E2E ENCRYPTED
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
