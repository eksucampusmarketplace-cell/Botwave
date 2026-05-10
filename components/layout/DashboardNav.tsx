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
  { href: '/dashboard/templates', label: 'Templates' },
  { href: '/dashboard/auto-replies', label: 'Auto-Reply' },
  { href: '/dashboard/flows', label: 'Flows' },
  { href: '/dashboard/study', label: 'Study', accent: true },
  { href: '/dashboard/settings', label: 'Settings', tour: 'nav-settings' },
  { href: '/dashboard/referrals', label: 'Referrals' },
  { href: '/dashboard/rewards', label: 'Rewards', accent: true },
  { href: '/dashboard/mailbox', label: 'Mailbox' },
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
        className="fixed top-0 left-0 right-0 z-[1000] bg-[var(--bg)]/80 backdrop-blur-lg border-b border-[var(--border)]/60"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Link href="/" className="text-lg font-bold text-[var(--text-primary)]">
            Bot<span className="text-[var(--primary)]">Wave</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.tour}
                className={`text-sm px-3 py-2 rounded-lg transition-colors font-medium ${
                  link.accent
                    ? 'text-[var(--primary)] hover:bg-[var(--primary)]/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-light)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="hidden md:flex w-9 h-9 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] items-center justify-center transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-sm">{theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
            </button>
            <div className="hidden sm:flex w-9 h-9 rounded-full bg-[var(--primary)]/15 items-center justify-center">
              <span className="text-sm font-semibold text-[var(--primary)]">U</span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:block text-sm text-[var(--text-muted)] hover:text-red-500 transition-colors font-medium px-3 py-2"
            >
              Logout
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
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
            className="fixed top-[57px] left-0 right-0 z-[999] bg-[var(--surface)] border-b border-[var(--border)] md:hidden"
          >
            <div className="flex flex-col px-4 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm py-3 border-b border-[var(--border)] font-medium ${
                    link.accent
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setMenuOpen(false); toggleTheme(); }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-3 border-b border-[var(--border)] text-left font-medium"
              >
                {theme === 'dark' ? '\u2600\uFE0F Light Mode' : '\u{1F319} Dark Mode'}
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
