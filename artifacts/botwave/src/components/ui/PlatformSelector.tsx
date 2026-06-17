

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
      <p className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
        Select Platform
      </p>
      {platforms.map((platform) => (
        <motion.button
          key={platform.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect(platform.id)}
          className={`w-full text-left p-4 border rounded-xl transition-all ${
            selected === platform.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
              : 'border-[var(--border)] bg-[var(--bg)] hover:border-blue-300 dark:hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                {platform.label}
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {platform.description}
              </p>
            </div>
            {selected === platform.id && (
              <span className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400">Selected</span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
