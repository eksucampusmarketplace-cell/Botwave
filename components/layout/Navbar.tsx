'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-[1000] bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#1e293b]/50"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
          </span>
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            ONLINE
          </span>
        </Link>

        <ul className="hidden md:flex gap-8 list-none">
          {[
            { href: '#features', label: 'Features' },
            { href: '#how', label: 'How it Works' },
            { href: '#install', label: 'Install' },
            { href: '#disclaimer', label: 'Disclaimer' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors px-4 py-2"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-slate-400 transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0d1117] border-t border-[#1e293b]"
          >
            <div className="flex flex-col px-6 py-4 gap-3">
              {[
                { href: '#features', label: 'Features' },
                { href: '#how', label: 'How it Works' },
                { href: '#install', label: 'Install' },
                { href: '#disclaimer', label: 'Disclaimer' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-slate-400 hover:text-emerald-400 py-2 font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-[#1e293b] my-1" />
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm text-slate-300 font-medium py-2">
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-white bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-lg text-center font-medium"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
