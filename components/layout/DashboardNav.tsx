'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 bg-dark/90 backdrop-blur-[12px] border-b border-green/10"
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

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-green/20 border border-green items-center justify-center">
            <span className="font-mono text-xs text-green">U</span>
          </div>
          <button 
            onClick={handleLogout}
            className="hidden md:block font-mono text-xs text-[#7abfa0] hover:text-red-400 transition-colors tracking-[2px]"
          >
            LOGOUT
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-1"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-green transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-green transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-green transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[60px] left-0 right-0 z-[999] bg-dark/95 backdrop-blur-md border-b border-green/10 md:hidden"
          >
            <div className="flex flex-col px-4 py-3 gap-1">
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="font-mono text-xs tracking-[2px] text-green py-3 border-b border-green/10"
              >
                DASHBOARD
              </Link>
              <Link
                href="/dashboard/sessions"
                onClick={() => setMenuOpen(false)}
                className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green py-3 border-b border-green/10"
              >
                SESSIONS
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
                className="font-mono text-xs tracking-[2px] text-[#7abfa0] hover:text-green py-3 border-b border-green/10"
              >
                SETTINGS
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="font-mono text-xs tracking-[2px] text-red-400 py-3 text-left"
              >
                LOGOUT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
