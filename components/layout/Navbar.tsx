'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-12 py-5 bg-dark/85 backdrop-blur-[12px] border-b border-green/10"
    >
      <Link href="/" className="font-display text-xl font-black text-green tracking-[3px] drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
        BOT<span className="text-cyan">WAVE</span>
      </Link>

      <ul className="hidden md:flex gap-8 list-none">
        <li>
          <Link
            href="#features"
            className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green transition-colors duration-300"
          >
            FEATURES
          </Link>
        </li>
        <li>
          <Link
            href="#how"
            className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green transition-colors duration-300"
          >
            HOW IT WORKS
          </Link>
        </li>
        <li>
          <Link
            href="#disclaimer"
            className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green transition-colors duration-300"
          >
            DISCLAIMER
          </Link>
        </li>
      </ul>

      <div className="font-mono text-xs bg-green/10 border border-green text-green px-4 py-2 rounded-sm tracking-[2px] animate-[pulse-border_2s_infinite]">
        FREE ACCESS
      </div>
    </motion.nav>
  );
}