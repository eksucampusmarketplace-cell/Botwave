'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FeatureCard from '@/components/ui/FeatureCard';
import HowItWorks from '@/components/ui/HowItWorks';
import Disclaimer from '@/components/ui/Disclaimer';

const features = [
  {
    icon: '🎴',
    title: 'Sticker Maker',
    description: 'Convert any image or video into a WhatsApp sticker instantly with a simple command.',
  },
  {
    icon: '🤖',
    title: 'AI Chat Reply',
    description: 'Tag the bot and get intelligent AI-powered replies. Ask anything, get smart answers.',
  },
  {
    icon: '📥',
    title: 'Media Downloader',
    description: 'Download YouTube, TikTok and Instagram Reels without watermarks, directly in chat.',
  },
  {
    icon: '👋',
    title: 'Welcome Bot',
    description: 'Greet new group members with a custom, personalized welcome message automatically.',
  },
  {
    icon: '🛡️',
    title: 'Anti-Spam Protection',
    description: 'Automatically detects and removes spam or flood messages to keep your group clean.',
  },
  {
    icon: '🎮',
    title: 'Mini Games',
    description: 'Trivia, Hangman, Word Chain, Number Guess — play fun games right inside your group.',
  },
  {
    icon: '📊',
    title: 'Polls & Leaderboard',
    description: 'Create group polls and track engagement with a live leaderboard.',
  },
  {
    icon: '🌤️',
    title: 'Smart Tools',
    description: 'Weather, dictionary, jokes, horoscope, quotes — all accessible with simple commands.',
  },
  {
    icon: '💬',
    title: 'Auto Reply',
    description: 'Set custom auto-replies for when you\'re offline, busy, or want to automate responses.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    description: 'Your chats stay private. The bot only responds to commands — nothing else is stored or shared.',
  },
];

const stats = [
  { value: '20+', label: 'Features' },
  { value: '50+', label: 'Commands' },
  { value: '99.8%', label: 'Uptime' },
  { value: 'Free', label: 'Forever' },
];

const testimonials = [
  {
    text: 'BotWave transformed how we manage our WhatsApp group. The sticker maker and AI chat features are incredibly useful.',
    name: 'Group Admin',
    role: 'Community Manager',
  },
  {
    text: 'Setting up was so easy — just scan the QR code and everything works. The anti-spam feature alone is worth it.',
    name: 'Business Owner',
    role: 'Small Business',
  },
  {
    text: 'My group members love the trivia games and the media downloader. BotWave keeps everyone engaged.',
    name: 'Tech Enthusiast',
    role: 'Group Owner',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] pt-32 pb-20 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-6">
              Trusted WhatsApp Automation Platform
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Automate Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                WhatsApp Experience
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              BotWave is your all-in-one platform for powerful WhatsApp bot features.
              Stickers, AI chat, media downloads, games, and group management — all delivered
              instantly with no setup required.
            </p>

            <div className="flex gap-4 flex-wrap justify-center mb-16">
              <Link
                href="/signup"
                className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all duration-200 hover:-translate-y-0.5"
              >
                Login
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-[var(--primary)] tracking-wide uppercase">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mt-3">
              Everything You Need in a WhatsApp Bot
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
              From sticker creation to AI-powered conversations, BotWave has all the tools to supercharge your WhatsApp groups.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-[var(--primary)] tracking-wide uppercase">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mt-3">
              What Our Users Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-card hover:shadow-card-hover transition-shadow duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">{t.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Add to Home Screen / PWA Section */}
      <section id="install" className="py-20 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="text-sm font-semibold text-[var(--primary)] tracking-wide uppercase">Install the App</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mt-3">
              Add BotWave to Your Home Screen
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
              Get app-like access to BotWave without downloading from any app store. Works on iPhone and Android.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* iPhone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  🍎
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">iPhone / iPad</h3>
                  <p className="text-xs text-[var(--text-muted)]">Safari browser required</p>
                </div>
              </div>
              <ol className="space-y-3">
                {[
                  'Open BotWave in Safari',
                  'Tap the Share button (square with arrow)',
                  'Scroll down and tap "Add to Home Screen"',
                  'Tap "Add" to confirm',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>

            {/* Android */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">Android</h3>
                  <p className="text-xs text-[var(--text-muted)]">Chrome browser recommended</p>
                </div>
              </div>
              <ol className="space-y-3">
                {[
                  'Open BotWave in Chrome',
                  'Tap the three dots menu (⋮) top right',
                  'Tap "Add to Home Screen"',
                  'Tap "Add" to confirm',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <Disclaimer />

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Supercharge Your WhatsApp?
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Join thousands of users who trust BotWave for their WhatsApp automation needs. Free to start, no credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-block px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-center">
        <div className="max-w-6xl mx-auto">
          <div className="text-2xl font-bold text-white mb-2">
            Bot<span className="text-emerald-400">Wave</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            WhatsApp Automation Platform
          </p>
          <div className="flex gap-6 justify-center text-sm text-slate-500 mb-6">
            <Link href="#features" className="hover:text-emerald-400 transition-colors">Features</Link>
            <Link href="#how" className="hover:text-emerald-400 transition-colors">How it Works</Link>
            <Link href="#install" className="hover:text-emerald-400 transition-colors">Install</Link>
            <Link href="#disclaimer" className="hover:text-emerald-400 transition-colors">Disclaimer</Link>
          </div>
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} BotWave &middot; Built by Decisive Analyst
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
