'use client';

import { motion } from 'framer-motion';

interface BotStatusProps {
  isActive: boolean;
  sessionCount: number;
}

export default function BotStatus({ isActive, sessionCount }: BotStatusProps) {
  return (
    <div className="bg-card border border-green/10 p-6 relative">
      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
      <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

      <h2 className="font-display text-sm tracking-[3px] text-green mb-6">
        SYSTEM STATUS
      </h2>

      <div className="flex items-center gap-4 mb-6">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-4 h-4 rounded-full ${isActive ? 'bg-green' : 'bg-red-400'}`}
        />
        <span className={`font-display text-lg tracking-[2px] ${isActive ? 'text-green' : 'text-red-400'}`}>
          {isActive ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">CPU</span>
          <span className="font-mono text-xs text-green">23%</span>
        </div>
        <div className="w-full h-1 bg-dark rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '23%' }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-green"
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">MEMORY</span>
          <span className="font-mono text-xs text-cyan">45%</span>
        </div>
        <div className="w-full h-1 bg-dark rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '45%' }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-cyan"
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">SESSIONS</span>
          <span className="font-display text-xl text-green">{sessionCount}</span>
        </div>
      </div>
    </div>
  );
}