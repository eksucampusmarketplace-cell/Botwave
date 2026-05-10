'use client';

import { motion } from 'framer-motion';

interface SessionCardProps {
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'pending' | 'active' | 'inactive' | 'qr_pending' | 'pairing_sent' | 'needs_reauth';
  lastActive: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  onDelete?: () => void;
}

export default function SessionCard({ name, phone, status, lastActive, onConnect, onDisconnect, onDelete }: SessionCardProps) {
  const statusColors = {
    connected: 'bg-green text-dark',
    active: 'bg-green text-dark',
    disconnected: 'bg-red-400/20 text-red-400',
    inactive: 'bg-red-400/20 text-red-400',
    needs_reauth: 'bg-red-600 text-white',
    pending: 'bg-cyan/20 text-cyan',
    qr_pending: 'bg-cyan/20 text-cyan',
    pairing_sent: 'bg-cyan/20 text-cyan',
  };

  const statusLabels = {
    connected: 'CONNECTED',
    active: 'CONNECTED',
    disconnected: 'OFFLINE',
    inactive: 'OFFLINE',
    needs_reauth: 'RE-AUTH',
    pending: 'QR PENDING',
    qr_pending: 'QR PENDING',
    pairing_sent: 'PAIRING CODE SENT',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-dark border border-green/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-green/20" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-green/20" />

      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 flex items-center justify-center font-display text-sm font-bold ${statusColors[status]}`}>
          {name[0]}
        </div>
        <div>
          <h3 className="font-display text-xs tracking-[2px] text-white">{name}</h3>
          <p className="font-mono text-xs text-[#5a9a7a] mt-1">{phone}</p>
          <p className="font-mono text-[10px] text-[#3a7a5a] mt-1">LAST: {lastActive}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`font-mono text-[10px] tracking-[2px] px-3 py-1 ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
        {(status === 'disconnected' || status === 'inactive' || status === 'needs_reauth' || status === 'qr_pending' || status === 'pairing_sent' || status === 'pending') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onConnect}
            className="font-display text-[10px] tracking-[2px] px-4 py-2 bg-green text-dark font-bold hover:bg-cyan transition-colors"
          >
            CONNECT
          </motion.button>
        )}
        {onDisconnect && (status === 'connected' || status === 'active') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDisconnect}
            className="font-display text-[10px] tracking-[2px] px-3 py-2 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
          >
            DISCONNECT
          </motion.button>
        )}
        {onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="font-display text-[10px] tracking-[2px] px-3 py-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
          >
            &#10005;
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}