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
    ? 'text-green'
    : healthPercent >= 40
      ? 'text-yellow-500'
      : healthPercent > 0
        ? 'text-red-400'
        : 'text-[#5a9a7a]';

  const barColor = healthPercent >= 70
    ? 'bg-green'
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
    <div className="bg-card border border-green/10 p-6 relative">
      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
      <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

      <h2 className="font-display text-sm tracking-[3px] text-green mb-4">
        SESSION HEALTH
      </h2>

      {/* Health ratio */}
      <div className="flex items-center justify-between mb-2">
        <span className={`font-display text-2xl ${healthColor}`}>
          {healthPercent}%
        </span>
        <span className={`font-mono text-[10px] tracking-[2px] ${healthColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-dark rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthPercent}%` }}
          transition={{ duration: 1, delay: 0.3 }}
          className={`h-full ${barColor}`}
        />
      </div>

      {/* Connected vs total */}
      <div className="flex justify-between items-center mb-4">
        <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">CONNECTED</span>
        <span className="font-mono text-xs text-white">
          <span className="text-green">{active}</span> / {total}
        </span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 border-t border-green/10 pt-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
            <span className="inline-block w-2 h-2 rounded-full bg-green mr-2" />
            ACTIVE
          </span>
          <span className="font-mono text-xs text-green">{active}</span>
        </div>
        {needsReauth > 0 && (
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              NEEDS REAUTH
            </span>
            <span className="font-mono text-xs text-yellow-500">{needsReauth}</span>
          </div>
        )}
        {pairingSent > 0 && (
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan mr-2" />
              PAIRING SENT
            </span>
            <span className="font-mono text-xs text-cyan">{pairingSent}</span>
          </div>
        )}
        {qrPending > 0 && (
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2" />
              QR PENDING
            </span>
            <span className="font-mono text-xs text-blue-400">{qrPending}</span>
          </div>
        )}
        {inactive > 0 && (
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-[#5a9a7a] tracking-[1px]">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
              INACTIVE
            </span>
            <span className="font-mono text-xs text-red-400">{inactive}</span>
          </div>
        )}
      </div>
    </div>
  );
}
