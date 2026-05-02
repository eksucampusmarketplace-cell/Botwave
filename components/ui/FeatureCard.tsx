'use client';

import { motion } from 'framer-motion';

interface Feature {
  icon: string;
  title: string;
  description: string;
  code: string;
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
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative bg-card border border-green/10 p-8 overflow-hidden transition-all duration-400 hover:border-green/30 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,136,0.3)]"
    >
      <div className="absolute top-0 left-0 w-[3px] h-full bg-green origin-bottom scale-y-0 transition-transform duration-400 group-hover:scale-y-100" />

      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

      <span className="text-3xl mb-4 block">{feature.icon}</span>

      <h3 className="font-display text-sm font-bold tracking-[2px] text-green mb-3">
        {feature.title}
      </h3>

      <p className="text-sm text-[#5a9a7a] leading-relaxed font-light">
        {feature.description}
      </p>

      <span className="absolute bottom-4 right-4 font-mono text-[11px] text-green/20 tracking-[1px]">
        {feature.code}
      </span>
    </motion.div>
  );
}