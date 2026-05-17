'use client';

import { motion } from 'framer-motion';

interface BotStatusProps {
  isActive: boolean;
  sessionCount: number;
  needsReauth: number;
  totalMessages: number;
  totalCommands: number;
  uptimePercent: number;
}

export default function BotStatus({ isActive, sessionCount, needsReauth, totalMessages, totalCommands, uptimePercent }: BotStatusProps) {
  const statusLabel = isActive
    ? 'ONLINE'
    : needsReauth > 0
      ? 'NEEDS RECONNECT'
      : sessionCount > 0
        ? 'OFFLINE'
        : 'NO SESSIONS';

  const statusColor = isActive
    ? 'bg-green-500'
    : needsReauth > 0
      ? 'bg-yellow-500'
      : 'bg-red-400';

  const statusTextColor = isActive
    ? 'text-green-600 dark:text-green-400'
    : needsReauth > 0
      ? 'text-yellow-600 dark:text-yellow-500'
      : 'text-red-500 dark:text-red-400';

  return (
    <div className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">
        System Status
      </h2>

      <div className="flex items-center gap-4 mb-6">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-4 h-4 rounded-full ${statusColor}`}
        />
        <span className={`text-lg font-bold ${statusTextColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)] font-medium">Messages</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{totalMessages.toLocaleString()}</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalMessages > 0 ? Math.max(5, Math.log10(totalMessages) * 25) : 0)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-blue-500 rounded-full"
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-[var(--text-secondary)] font-medium">Commands</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{totalCommands.toLocaleString()}</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, totalCommands > 0 ? Math.max(5, Math.log10(totalCommands) * 25) : 0)}%` }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-violet-500 rounded-full"
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-[var(--text-secondary)] font-medium">Sessions</span>
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">{sessionCount}</span>
        </div>
      </div>
    </div>
  );
}
