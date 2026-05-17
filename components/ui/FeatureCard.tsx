'use client';

import { motion } from 'framer-motion';

interface Feature {
  icon: string;
  title: string;
  description: string;
  platforms?: string[];
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const platformColors: Record<string, string> = {
  'WhatsApp': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Telegram Bot': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Telegram Userbot': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      viewport={{ once: true }}
      className="group glass-card p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
    >
      {/* Gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:border-emerald-500/30 transition-all duration-300">
        {feature.icon}
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
        {feature.title}
      </h3>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
        {feature.description}
      </p>

      {feature.platforms && feature.platforms.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {feature.platforms.map((p) => (
            <span
              key={p}
              className={`px-2 py-0.5 rounded border text-[9px] font-mono tracking-wide ${platformColors[p] || 'bg-white/5 text-slate-400 border-white/10'}`}
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
