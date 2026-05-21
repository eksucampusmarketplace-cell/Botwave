'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import SessionHealthBadge from './SessionHealthBadge';

type Platform = 'whatsapp' | 'telegram_bot' | 'telegram_userbot';

interface SessionCardProps {
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'pending' | 'active' | 'inactive' | 'qr_pending' | 'pairing_sent' | 'needs_reauth' | 'pairing_failed' | 'connecting';
  lastPairingError?: string | null;
  lastActive: string;
  lastActiveRaw?: string | null;
  platform?: Platform;
  sessionId?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  onDelete?: () => void;
}

const platformIcons: Record<Platform, string> = {
  whatsapp: '📱',
  telegram_bot: '🤖',
  telegram_userbot: '👤',
};

const platformLabels: Record<Platform, string> = {
  whatsapp: 'WhatsApp',
  telegram_bot: 'TG Bot',
  telegram_userbot: 'TG User',
};

export default function SessionCard({ name, phone, status, lastActive, lastActiveRaw, platform, sessionId, lastPairingError, onConnect, onDisconnect, onDelete }: SessionCardProps) {
  // Detect stale sessions: active but last_active > 2 hours ago
  const isStale = (() => {
    if (status !== 'active' && status !== 'connected') return false;
    if (!lastActiveRaw) return false;
    const lastActiveTime = new Date(lastActiveRaw).getTime();
    if (isNaN(lastActiveTime)) return false;
    return Date.now() - lastActiveTime > 2 * 60 * 60 * 1000;
  })();
  const statusColors = {
    connected: 'bg-green-500 text-white',
    active: 'bg-green-500 text-white',
    disconnected: 'bg-red-100 dark:bg-red-400/20 text-red-600 dark:text-red-400',
    inactive: 'bg-red-100 dark:bg-red-400/20 text-red-600 dark:text-red-400',
    needs_reauth: 'bg-red-600 text-white',
    pairing_failed: 'bg-red-700 text-white',
    pending: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    qr_pending: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    pairing_sent: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    connecting: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  };

  const statusLabels = {
    connected: 'CONNECTED',
    active: 'CONNECTED',
    disconnected: 'OFFLINE',
    inactive: 'OFFLINE',
    needs_reauth: 'RE-AUTH',
    pairing_failed: 'PAIRING FAILED',
    pending: 'QR PENDING',
    qr_pending: 'QR PENDING',
    pairing_sent: 'PAIRING CODE SENT',
    connecting: 'CONNECTING...',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden shadow-sm"
    >

      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${statusColors[status]}`}>
          {platform ? platformIcons[platform] : name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{name}</h3>
            {platform && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {platformLabels[platform]}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{phone}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Last active: {lastActive}</p>
          {isStale && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5 font-medium">
              &#9888; Session may be unresponsive (no activity for 2+ hours)
            </p>
          )}
          {lastPairingError && (status === 'needs_reauth' || status === 'pairing_failed') && (
            <p className="text-xs text-red-400 mt-0.5">
              {lastPairingError}
            </p>
          )}
          {sessionId && <SessionHealthBadge sessionId={sessionId} />}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
        {(status === 'disconnected' || status === 'inactive' || status === 'needs_reauth' || status === 'pairing_failed' || status === 'qr_pending' || status === 'pairing_sent' || status === 'pending') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onConnect}
            className="text-xs font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            CONNECT
          </motion.button>
        )}
        {onDisconnect && (status === 'connected' || status === 'active') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDisconnect}
            className="text-xs font-semibold px-3 py-2 border border-yellow-500/30 text-yellow-600 dark:text-yellow-500 rounded-lg hover:bg-yellow-500/10 transition-colors"
          >
            DISCONNECT
          </motion.button>
        )}
        {sessionId && (platform === 'telegram_bot' || platform === 'telegram_userbot') && (status === 'connected' || status === 'active') && (
          <Link href={`/dashboard/telegram/${sessionId}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs font-semibold px-3 py-2 border border-blue-400/30 text-blue-500 dark:text-blue-400 rounded-lg hover:bg-blue-400/10 transition-colors"
            >
              CONFIGURE
            </motion.button>
          </Link>
        )}
        {onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="text-xs font-semibold px-3 py-2 border border-red-400/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
          >
            &#10005;
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
