'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReferralPopupProps {
  referralCode: string;
  totalReferred?: number;
}

export default function ReferralPopup({ referralCode, totalReferred = 0 }: ReferralPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('referral_popup_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setIsOpen(true), 30_000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('referral_popup_dismissed', '1');
  };

  const referralLink = `https://www.botwave.online/signup?ref=${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-[2000] w-80 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Invite Friends, Earn Rewards
              </h3>
              <button
                onClick={dismiss}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Share your referral link and earn rewards when friends sign up and subscribe.
            </p>

            {totalReferred > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                <span className="text-xs text-emerald-400 font-medium">
                  {totalReferred} friend{totalReferred !== 1 ? 's' : ''} referred
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-secondary)] truncate"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <a
              href="/dashboard/referrals"
              className="block text-center text-xs text-[var(--primary)] hover:underline"
              onClick={dismiss}
            >
              View referral dashboard
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
