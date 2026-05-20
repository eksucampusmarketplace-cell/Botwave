'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ui/ThemeProvider';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

interface NavLink {
  href: string;
  label: string;
  tour?: string;
  accent?: boolean;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

const primaryLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/sessions', label: 'WhatsApp Sessions', tour: 'nav-sessions' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/telegram', label: 'Telegram Bot Manager' },
];

const navGroups: NavGroup[] = [
  {
    label: 'Bot',
    links: [
      { href: '/dashboard/analytics', label: 'Analytics', tour: 'nav-analytics' },
      { href: '/dashboard/health', label: 'Health' },
      { href: '/dashboard/templates', label: 'Msg Templates' },
      { href: '/dashboard/auto-replies', label: 'Auto-Reply' },
      { href: '/dashboard/custom-commands', label: 'Custom Cmds' },
      { href: '/dashboard/flows', label: 'Chat Flows' },
      { href: '/dashboard/scheduled', label: 'Scheduled' },
    ],
  },
  {
    label: 'More',
    links: [
      { href: '/dashboard/study', label: 'Study', accent: true },
      { href: '/dashboard/settings', label: 'Settings', tour: 'nav-settings' },
      { href: '/dashboard/referrals', label: 'Referrals' },
      { href: '/dashboard/rewards', label: 'Rewards', accent: true },
      { href: '/dashboard/mailbox', label: 'Mailbox' },
    ],
  },
];

const allLinks = [
  ...primaryLinks,
  ...navGroups.flatMap((g) => g.links),
];

function Dropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm px-3 py-2 rounded-lg transition-colors font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-light)] flex items-center gap-1"
      >
        {group.label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-[1001]"
          >
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.tour}
                onClick={() => setOpen(false)}
                className={`block text-sm px-4 py-2.5 transition-colors font-medium ${
                  link.accent
                    ? 'text-[var(--primary)] hover:bg-[var(--primary)]/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-light)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const POPULAR_LOCALES: SupportedLocale[] = ['en', 'es', 'fr', 'ar', 'hi', 'pt', 'de', 'ru', 'tr', 'zh', 'ja', 'ko'];

export default function DashboardNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [dashLang, setDashLang] = useState<SupportedLocale>('en');
  const langRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLangChange = (locale: SupportedLocale) => {
    setDashLang(locale);
    setLangOpen(false);
    // Trigger Google Translate if available
    const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (select) {
      select.value = locale === 'zh' ? 'zh-CN' : locale;
      select.dispatchEvent(new Event('change'));
    }
    // Dispatch custom event for dashboard components
    window.dispatchEvent(new CustomEvent('botwave-lang-change', { detail: { locale } }));
  };

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

          {/* Desktop nav: primary links + grouped dropdowns */}
          <div className="hidden md:flex items-center gap-1">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.tour}
                className="text-sm px-3 py-2 rounded-lg transition-colors font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-light)]"
              >
                {link.label}
              </Link>
            ))}
            {navGroups.map((group) => (
              <Dropdown key={group.label} group={group} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Language selector dropdown */}
            <div ref={langRef} className="relative" data-tour="nav-language">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex h-9 px-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] items-center gap-1 transition-colors"
                title="Language"
              >
                <span className="text-sm">{'\u{1F310}'}</span>
                <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:inline">{dashLang.toUpperCase()}</span>
                <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-y-auto max-h-64 z-[1001]"
                  >
                    {POPULAR_LOCALES.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleLangChange(code)}
                        className={`w-full text-left text-sm px-4 py-2 transition-colors font-medium ${
                          dashLang === code
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-light)]'
                        }`}
                      >
                        {SUPPORTED_LOCALES[code]} <span className="text-xs opacity-60">({code})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Theme toggle - always visible */}
            <button
              onClick={toggleTheme}
              className="flex w-9 h-9 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] items-center justify-center transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-tour="nav-theme"
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
            className="fixed top-[57px] left-0 right-0 z-[999] bg-[var(--surface)] border-b border-[var(--border)] md:hidden overflow-y-auto max-h-[80vh]"
          >
            <div className="flex flex-col px-4 py-2">
              {/* Mobile language + theme controls */}
              <div className="flex items-center gap-3 py-3 border-b border-[var(--border)]">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <span>{theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <span className="text-[var(--border)]">|</span>
                <select
                  value={dashLang}
                  onChange={(e) => handleLangChange(e.target.value as SupportedLocale)}
                  className="text-sm font-medium bg-transparent text-[var(--text-secondary)] border-none outline-none cursor-pointer"
                >
                  {POPULAR_LOCALES.map((code) => (
                    <option key={code} value={code}>{SUPPORTED_LOCALES[code]}</option>
                  ))}
                </select>
              </div>
              {allLinks.map((link) => (
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
