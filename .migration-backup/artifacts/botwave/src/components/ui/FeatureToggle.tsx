

import { motion } from 'framer-motion';

interface FeatureToggleProps {
  feature: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
  enabled: boolean;
  onToggle: () => void;
  index: number;
}

export default function FeatureToggle({ feature, enabled, onToggle, index }: FeatureToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-[var(--bg)] border p-4 rounded-xl flex items-center justify-between gap-4 transition-colors cursor-pointer ${
        enabled ? 'border-blue-500/30' : 'border-[var(--border)]'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{feature.icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{feature.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{feature.description}</p>
        </div>
      </div>

      <div
        className={`w-12 h-6 rounded-full relative transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-[var(--border)]'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-5 h-5 bg-white rounded-full absolute top-[2px] shadow-sm"
        />
      </div>
    </motion.div>
  );
}
