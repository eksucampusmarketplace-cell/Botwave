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
  // Optional: async callback that asks the server to reset the session and
  // generate a fresh pairing code / QR. Renders a "Regenerate code" button
  // when the current code is expired or the session is stuck.
  onRegenerate?: () => Promise<void> | void;
}

export default function QRCodeDisplay({ onClose, qrCode, qrGeneratedAt, pairingCode, sessionState, queuePosition, onRegenerate }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(180);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>(qrCode ? 'qr' : 'code');
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [showQrFallback, setShowQrFallback] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (qrCode && !pairingCode) setActiveTab('qr');
    else if (pairingCode && !qrCode) setActiveTab('code');
  }, [qrCode, pairingCode]);

  // Track how long loading has been going (no code yet)
  useEffect(() => {
    if (sessionState === 'active') return;
    const hasContent = pairingCode || qrCode;
    if (hasContent) {
      setLoadingElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setLoadingElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingCode, qrCode, sessionState]);

  // Track how long pairing code has been shown without connecting
  useEffect(() => {
    if (sessionState === 'active' || !pairingCode) {
      setShowQrFallback(false);
      return;
    }
    if (sessionState === 'pairing_sent' || (pairingCode && sessionState !== 'active')) {
      const start = Date.now();
      const interval = setInterval(() => {
        if (Math.floor((Date.now() - start) / 1000) >= 60) {
          setShowQrFallback(true);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pairingCode, sessionState]);

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
  // Show the regenerate button when the user is genuinely stuck — either the
  // code on screen has expired, or the session has been marked needs_reauth /
  // pairing_failed by the worker. Hidden while a fresh code is still valid.
  const isStuck =
    !isConnected &&
    !!onRegenerate &&
    (timeLeft === 0 ||
      sessionState === 'needs_reauth' ||
      sessionState === 'pairing_failed');

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    try {
      await onRegenerate();
      setTimeLeft(180);
      setShowQrFallback(false);
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate, regenerating]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-2xl shadow-xl max-w-[95vw] sm:max-w-md w-full mx-1 sm:mx-3 relative overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Link Device
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-muted)] hover:text-red-500 transition-colors px-2"
          >
            Close
          </button>
        </div>

        <div className="p-3 sm:p-5">
          {/* Status header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green-500' : hasContent ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
            }`} />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {isConnected ? 'Connection Established' : hasContent ? 'Awaiting Device Link' : 'Establishing Connection'}
            </span>
          </div>

          {/* Queue position feedback */}
          {isLoading && queuePosition && queuePosition > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 mb-4 text-center rounded-xl">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Queued for Pairing</div>
              <div className="text-xs text-[var(--text-muted)]">
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
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 mb-2">Linked!</h3>
              <p className="text-sm text-[var(--text-secondary)]">WhatsApp device connected successfully.</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Bot is now active and listening.</p>
            </motion.div>
          )}

          {/* Tab switcher - only show when both QR and pairing code are available */}
          {!isConnected && hasContent && qrCode && pairingCode && (
            <div className="flex mb-4 border border-[var(--border)] rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'qr'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-r border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-alt)] border-r border-[var(--border)]'
                }`}
              >
                Scan QR Code
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'code'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-alt)]'
                }`}
              >
                Enter Code
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
              <div className="bg-[var(--bg)] border border-[var(--border)] p-3 mb-4 rounded-xl space-y-1.5">
                <div className="text-xs text-[var(--text-muted)] font-semibold mb-2">How to scan:</div>
                {[
                  ['1', 'Open', 'WhatsApp', 'on your phone'],
                  ['2', 'Go to', 'Settings > Linked Devices', ''],
                  ['3', 'Tap', 'Link a Device', ''],
                  ['4', 'Point your camera', 'at the QR code', 'above'],
                ].map(([num, pre, highlight, post]) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="text-xs text-blue-500/60 w-4">{num}.</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {pre} <span className="text-[var(--text-primary)] font-bold">{highlight}</span> {post}
                    </span>
                  </div>
                ))}
              </div>

              {/* Fallback hint */}
              {pairingCode && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-2 sm:p-3 mb-3 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    QR not working? Switch to the <span className="font-bold">Enter Code</span> tab above to link with a pairing code instead.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pairing code display */}
          {!isConnected && hasContent && (activeTab === 'code' && pairingCode) && (
            <div>
              <div className="text-center mb-4">
                <div className="text-sm text-[var(--text-muted)] mb-3">
                  Enter this code on your phone
                </div>
                <div
                  className="bg-[var(--bg)] border-2 border-blue-500/50 px-3 py-2 sm:px-4 sm:py-3 inline-block cursor-pointer group rounded-xl"
                  onClick={handleCopy}
                >
                  <span
                    className="font-mono text-xl sm:text-3xl md:text-4xl text-[var(--text-primary)] font-black tracking-[3px] sm:tracking-[6px] md:tracking-[8px] select-all"
                  >
                    {pairingCode}
                  </span>
                </div>
              </div>

              <div className="flex justify-center mb-4 mt-4">
                <button
                  onClick={handleCopy}
                  className={`text-sm font-semibold px-6 py-2.5 border rounded-xl transition-all ${
                    copied
                      ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                  }`}
                >
                  {copied ? 'Copied to clipboard' : 'Copy Code'}
                </button>
              </div>

              <div className="bg-[var(--bg)] border border-[var(--border)] p-3 mb-4 rounded-xl space-y-1.5">
                <div className="text-xs text-[var(--text-muted)] font-semibold mb-2">How to link:</div>
                {[
                  ['1', 'Open', 'WhatsApp', 'on your phone'],
                  ['2', 'Go to', 'Settings > Linked Devices', ''],
                  ['3', 'Tap', 'Link a Device', ''],
                  ['4', 'Choose', 'Link with phone number instead', ''],
                  ['5', 'Enter the', '8-digit code', 'shown above'],
                ].map(([num, pre, highlight, post]) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="text-xs text-blue-500/60 w-4">{num}.</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {pre} <span className="text-[var(--text-primary)] font-bold">{highlight}</span> {post}
                    </span>
                  </div>
                ))}
              </div>

              {/* WhatsApp scam warning */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-600/20 p-2 sm:p-3 mb-3 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 text-xs mt-0.5">!</span>
                  <p className="text-xs text-yellow-700 dark:text-yellow-600/80 leading-relaxed">
                    WhatsApp may show a &quot;could be a scam&quot; warning - this is normal. Tap <span className="text-yellow-500 font-bold">Continue</span> to proceed.
                  </p>
                </div>
              </div>

              {/* Fallback hint */}
              {qrCode && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-2 sm:p-3 mb-3 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    Pairing code not working? Switch to the <span className="font-bold">Scan QR Code</span> tab above to link by scanning instead.
                  </p>
                </div>
              )}

              {/* QR fallback alert after pairing code fails to connect */}
              {showQrFallback && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-600/40 p-3 sm:p-4 mb-3 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 text-sm mt-0.5">!</span>
                    <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-500 font-bold mb-1">
                        Code not connecting?
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-600/80 leading-relaxed">
                        Try <span className="font-bold">scanning the QR code</span> instead - you can even use a <span className="font-bold">friend&apos;s phone</span> to scan it for you. Just switch to the <span className="text-yellow-600 dark:text-yellow-500 font-bold">Scan QR Code</span> tab above.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Only QR available (no pairing code yet) */}
          {!isConnected && !pairingCode && qrCode && activeTab === 'qr' && (
            <div className="text-center mt-2 mb-3">
              <span className="text-xs text-[var(--text-muted)]">Pairing code loading...</span>
            </div>
          )}

          {/* Only pairing code available (no QR) - show hint about QR */}
          {!isConnected && pairingCode && !qrCode && (
            <div className="text-center mt-2 mb-3">
              <span className="text-xs text-[var(--text-muted)]">QR code not available for this session</span>
            </div>
          )}

          {/* Neither method working hint */}
          {!isConnected && hasContent && (
            <div className="bg-yellow-50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-600/15 p-2 sm:p-3 mb-3 rounded-xl">
              <p className="text-xs text-yellow-700 dark:text-yellow-600/60 leading-relaxed text-center">
                If neither method works, close this dialog, wait <span className="text-yellow-500 font-bold">1 hour</span>, then try connecting again.
              </p>
            </div>
          )}

          {/* Regenerate / Cancel buttons */}
          {!isConnected && (hasContent || isStuck) && (
            <div className="flex justify-center gap-2 mb-3">
              {onRegenerate && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || (!isStuck && timeLeft > 30)}
                  title={!isStuck && timeLeft > 30 ? 'Available when the code expires or the session gets stuck' : 'Generate a fresh code'}
                  className="text-sm font-medium px-5 py-2.5 border border-blue-300 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {regenerating ? 'Regenerating…' : 'Regenerate code'}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-sm font-medium px-6 py-2.5 border border-red-300 dark:border-red-400/30 text-red-500 dark:text-red-400/70 hover:border-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/5 rounded-xl transition-all"
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
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs text-[var(--text-muted)]">
                    Valid for
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  timeLeft <= 15 ? 'text-red-500 dark:text-red-400' : timeLeft <= 30 ? 'text-yellow-600 dark:text-yellow-500' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${timeLeft <= 15 ? 'bg-red-400' : timeLeft <= 30 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${(timeLeft / 180) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-4 h-4 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-500/60">
                  {loadingElapsed >= 20 ? 'Almost there, please wait...' : 'Generating link code...'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {loadingElapsed >= 20
                  ? 'Taking a bit longer than usual - hang tight, your code is being generated.'
                  : 'This may take 10-20 seconds.'}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)]">
              BotWave Secure Link
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
