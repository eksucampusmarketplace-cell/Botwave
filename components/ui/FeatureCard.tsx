'use client';

import { motion } from 'framer-motion';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export default function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      viewport={{ once: true }}
      className="group bg-[var(--surface)] border border-[var(--border)] p-6 rounded-xl transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
        {feature.title}
      </h3>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}
