'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ui/ThemeProvider';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/sessions', label: 'Sessions', tour: 'nav-sessions' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/analytics', label: 'Analytics', tour: 'nav-analytics' },
  { href: '/dashboard/health', label: 'Health' },
  { href: '/dashboard/scheduled', label: 'Scheduled' },
  { href: '/dashboard/settings', label: 'Settings', tour: 'nav-settings' },
  { href: '/dashboard/rewards', label: 'Rewards', accent: true },
];

export default function DashboardNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-[1000] bg-white/80 backdrop-blur-lg border-b border-slate-200/60"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Link href="/" className="text-lg font-bold text-slate-900">
            Bot<span className="text-emerald-600">Wave</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.tour}
                className={`text-sm px-3 py-2 rounded-lg transition-colors font-medium ${
                  link.accent
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="hidden md:flex w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 items-center justify-center transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-sm">{theme === 'dark' ? '\u2600' : '\u263E'}</span>
            </button>
            <div className="hidden sm:flex w-9 h-9 rounded-full bg-emerald-100 items-center justify-center">
              <span className="text-sm font-semibold text-emerald-700">U</span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:block text-sm text-slate-500 hover:text-red-500 transition-colors font-medium px-3 py-2"
            >
              Logout
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-slate-700 transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-700 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-700 transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[57px] left-0 right-0 z-[999] bg-white border-b border-slate-200 md:hidden"
          >
            <div className="flex flex-col px-4 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm py-3 border-b border-slate-100 font-medium ${
                    link.accent
                      ? 'text-emerald-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setMenuOpen(false); toggleTheme(); }}
                className="text-sm text-slate-600 hover:text-slate-900 py-3 border-b border-slate-100 text-left font-medium"
              >
                {theme === 'dark' ? '\u2600 Light Mode' : '\u263E Dark Mode'}
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="text-sm text-red-500 py-3 text-left font-medium"
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
