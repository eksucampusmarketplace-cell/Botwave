'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 md:px-12 py-4 bg-dark/90 backdrop-blur-[12px] border-b border-green/10"
    >
      <Link href="/" className="font-display text-lg font-black text-green tracking-[3px] drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
        BOT<span className="text-cyan">WAVE</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <Link href="/dashboard" className="font-mono text-xs tracking-[2px] text-green hover:text-cyan transition-colors">
          DASHBOARD
        </Link>
        <Link href="/dashboard/sessions" className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green transition-colors">
          SESSIONS
        </Link>
        <Link href="/dashboard/settings" className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green transition-colors">
          SETTINGS
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-green/20 border border-green flex items-center justify-center">
          <span className="font-mono text-xs text-green">U</span>
        </div>
        <button 
          onClick={handleLogout}
          className="font-mono text-xs text-[#7abfa0] hover:text-red-400 transition-colors tracking-[2px]"
        >
          LOGOUT
        </button>
      </div>
    </motion.nav>
  );
}
