'use client';

import { motion } from 'framer-motion';

interface SessionHealthProps {
  total: number;
  active: number;
  needsReauth: number;
  pairingSent: number;
  qrPending: number;
  inactive: number;
}

export default function SessionHealthWidget({ total, active, needsReauth, pairingSent, qrPending, inactive }: SessionHealthProps) {
  const healthPercent = total > 0 ? Math.round((active / total) * 100) : 0;

  const healthColor = healthPercent >= 70
    ? 'text-green-600 dark:text-green-400'
    : healthPercent >= 40
      ? 'text-yellow-600 dark:text-yellow-500'
      : healthPercent > 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-[var(--text-muted)]';

  const barColor = healthPercent >= 70
    ? 'bg-green-500'
    : healthPercent >= 40
      ? 'bg-yellow-500'
      : 'bg-red-400';

  const statusLabel = healthPercent >= 70
    ? 'HEALTHY'
    : healthPercent >= 40
      ? 'DEGRADED'
      : total > 0
        ? 'CRITICAL'
        : 'NO DATA';

  return (
    <div className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
        Session Health
      </h2>

      {/* Health ratio */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-bold ${healthColor}`}>
          {healthPercent}%
        </span>
        <span className={`text-xs font-semibold ${healthColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthPercent}%` }}
          transition={{ duration: 1, delay: 0.3 }}
          className={`h-full ${barColor}`}
        />
      </div>

      {/* Connected vs total */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-[var(--text-secondary)] font-medium">Connected</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          <span className="text-green-600 dark:text-green-400">{active}</span> / {total}
        </span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2.5 border-t border-[var(--border)] pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)]">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />
            Active
          </span>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">{active}</span>
        </div>
        {needsReauth > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              Needs Reauth
            </span>
            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">{needsReauth}</span>
          </div>
        )}
        {pairingSent > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
              Pairing Sent
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{pairingSent}</span>
          </div>
        )}
        {qrPending > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" />
              QR Pending
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{qrPending}</span>
          </div>
        )}
        {inactive > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
              Inactive
            </span>
            <span className="text-sm font-semibold text-red-500 dark:text-red-400">{inactive}</span>
          </div>
        )}
      </div>
    </div>
  );
}
