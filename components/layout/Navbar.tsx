'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from '@/components/ui/ThemeProvider';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]/50"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--text-primary)]">
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Wave</span>
          </span>
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-500 font-medium">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            ONLINE
          </span>
        </Link>

        <ul className="hidden md:flex gap-8 list-none">
          {[
            { href: '/commands', label: 'Commands' },
            { href: '/docs', label: 'Docs' },
            { href: '/use-cases', label: 'Use Cases' },
            { href: '/blog', label: 'Blog' },
            { href: '/faq', label: 'FAQ' },
            { href: '/changelog', label: 'Changelog' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => {
              const wrapper = document.getElementById('gtx-wrapper');
              if (wrapper) wrapper.classList.toggle('gtx-collapsed');
            }}
            className="gtx-nav-toggle w-9 h-9 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center transition-colors"
            title="Translate"
          >
            <span className="text-sm">{'\u{1F310}'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="text-sm">{theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
          </button>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors px-4 py-2"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile controls: theme + translate + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => {
              const wrapper = document.getElementById('gtx-wrapper');
              if (wrapper) wrapper.classList.toggle('gtx-collapsed');
            }}
            className="gtx-nav-toggle w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center transition-colors"
            title="Translate"
          >
            <span className="text-xs">{'\u{1F310}'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-light)] border border-[var(--border)] flex items-center justify-center transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="text-xs">{theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[var(--text-muted)] transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[var(--surface)] border-t border-[var(--border)]"
          >
            <div className="flex flex-col px-6 py-4 gap-3">
              {[
                { href: '/commands', label: 'Commands' },
                { href: '/docs', label: 'Docs' },
                { href: '/use-cases', label: 'Use Cases' },
                { href: '/blog', label: 'Blog' },
                { href: '/faq', label: 'FAQ' },
                { href: '/changelog', label: 'Changelog' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] py-2 font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-[var(--border)] my-1" />
              <button
                onClick={() => {
                  setMobileOpen(false);
                  const wrapper = document.getElementById('gtx-wrapper');
                  if (wrapper) wrapper.classList.toggle('gtx-collapsed');
                }}
                className="gtx-nav-toggle text-sm text-[var(--text-secondary)] py-2 text-left font-medium"
              >
                {'\u{1F310}'} Translate
              </button>
              <button
                onClick={() => { setMobileOpen(false); toggleTheme(); }}
                className="text-sm text-[var(--text-secondary)] py-2 text-left font-medium"
              >
                {theme === 'dark' ? '\u2600\uFE0F Light Mode' : '\u{1F319} Dark Mode'}
              </button>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm text-[var(--text-secondary)] font-medium py-2">
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl text-center font-medium"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
