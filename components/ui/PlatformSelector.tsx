'use client';

import { motion } from 'framer-motion';
import type { Platform } from '@/lib/types';

interface PlatformSelectorProps {
  selected: Platform | null;
  onSelect: (platform: Platform) => void;
}

const platforms: { id: Platform; label: string; icon: string; description: string }[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '📱',
    description: 'Connect your WhatsApp number via QR code or pairing code',
  },
  {
    id: 'telegram_bot',
    label: 'Telegram Bot',
    icon: '🤖',
    description: 'Connect a Telegram bot via @BotFather token',
  },
  {
    id: 'telegram_userbot',
    label: 'Telegram Userbot',
    icon: '👤',
    description: 'Automate a real Telegram account via MTProto',
  },
];

export default function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="font-display text-xs tracking-[2px] text-[#5a9a7a] mb-4">
        SELECT PLATFORM
      </p>
      {platforms.map((platform) => (
        <motion.button
          key={platform.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect(platform.id)}
          className={`w-full text-left p-4 border transition-all ${
            selected === platform.id
              ? 'border-green bg-green/5'
              : 'border-green/10 bg-dark hover:border-green/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <h4 className="font-display text-xs tracking-[2px] text-white">
                {platform.label}
              </h4>
              <p className="font-mono text-[10px] text-[#5a9a7a] mt-1">
                {platform.description}
              </p>
            </div>
            {selected === platform.id && (
              <span className="ml-auto font-mono text-green text-xs">SELECTED</span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
