'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FeatureCard from '@/components/ui/FeatureCard';
import HowItWorks from '@/components/ui/HowItWorks';
import Disclaimer from '@/components/ui/Disclaimer';

const features = [
  { icon: '🎴', title: 'Sticker Maker', description: 'Convert any image or video into a WhatsApp sticker instantly with a simple command.' },
  { icon: '🤖', title: 'AI Chat Reply', description: 'Tag the bot and get intelligent AI replies. Ask anything, get smart answers.' },
  { icon: '📥', title: 'Media Downloader', description: 'Download YouTube, TikTok and Instagram Reels without watermarks, directly in chat.' },
  { icon: '👋', title: 'Welcome Bot', description: 'Greet new group members with a custom, personalized welcome message automatically.' },
  { icon: '🛡️', title: 'Anti-Spam Protection', description: 'Detects and removes spam or flood messages automatically to keep your group clean.' },
  { icon: '🎮', title: 'Mini Games', description: 'Trivia, Hangman, Word Chain, Number Guess — play fun games right inside your group.' },
  { icon: '📊', title: 'Polls & Leaderboard', description: 'Create group polls and track engagement with a live leaderboard.' },
  { icon: '🌤️', title: 'Smart Tools', description: 'Weather, dictionary, jokes, horoscope, quotes — all accessible with simple commands.' },
  { icon: '💬', title: 'Auto Reply', description: "Set custom auto-replies for when you're offline, busy, or want to automate responses." },
  { icon: '🔒', title: 'Privacy First', description: 'Your chats stay private. The bot only responds to commands — nothing else is stored or shared.' },
];

const terminalLines = [
  { type: 'comment', text: '# Initialize BotWave session' },
  { type: 'cmd', text: '$ botwave init --session "MyBot"' },
  { type: 'success', text: '→ Session created. Waiting for QR scan...' },
  { type: 'success', text: '→ Connected! Phone: +234*****890' },
  { type: 'blank', text: '' },
  { type: 'comment', text: '# Bot is live. Commands:' },
  { type: 'cmd', text: '$ !sticker' },
  { type: 'output', text: '→ Sticker created from image ✓' },
  { type: 'cmd', text: '$ !ai What is machine learning?' },
  { type: 'output', text: '→ Machine learning is a subset of AI...' },
  { type: 'cmd', text: '$ !trivia' },
  { type: 'output', text: '→ 🎯 Question: What is the capital of Japan?' },
  { type: 'cmd', text: '$ !whois (reply to message)' },
  { type: 'output', text: '→ Name: John | Number: +234... | About: ...' },
  { type: 'blank', text: '' },
  { type: 'success', text: '→ 247 commands processed today. 0 errors.' },
];

const stats = [
  { value: '20+', label: 'Features' },
  { value: '50+', label: 'Commands' },
  { value: '99.8%', label: 'Uptime' },
  { value: 'Free', label: 'Forever' },
];

const testimonials = [
  { text: 'BotWave transformed how we manage our WhatsApp group. The sticker maker and AI chat features are incredibly useful.', name: 'Group Admin', role: 'Community Manager' },
  { text: 'Setting up was so easy — just scan the QR code and everything works. The spam protection feature alone is worth it.', name: 'Business Owner', role: 'Small Business' },
  { text: 'My group members love the trivia games and the media downloader. BotWave keeps everyone engaged.', name: 'Tech Enthusiast', role: 'Group Owner' },
];

const chatMessages = [
  { from: 'user', name: 'You', text: '!sticker', time: '2:31 PM' },
  { from: 'bot', name: 'BotWave', text: '🎴 Sticker created! Converting your image...', time: '2:31 PM' },
  { from: 'user', name: 'You', text: '!ai explain quantum computing in 2 lines', time: '2:32 PM' },
  { from: 'bot', name: 'BotWave', text: '🤖 Quantum computing uses qubits that can be 0 and 1 simultaneously, enabling parallel processing. This makes it exponentially faster for certain problems like cryptography and molecular simulation.', time: '2:32 PM' },
  { from: 'user', name: 'You', text: '!trivia', time: '2:33 PM' },
  { from: 'bot', name: 'BotWave', text: '🎯 *TRIVIA TIME!*\n\nWhat programming language was created by Brendan Eich in 1995?\n\nA) Python  B) JavaScript  C) Java  D) Ruby\n\nReply with the letter!', time: '2:33 PM' },
];

function TerminalBlock() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= terminalLines.length) return prev;
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal shadow-2xl">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ff5f57' }} />
        <div className="terminal-dot" style={{ background: '#febc2e' }} />
        <div className="terminal-dot" style={{ background: '#28c840' }} />
        <span className="text-xs text-slate-500 ml-3 font-mono">botwave — session</span>
      </div>
      <div className="terminal-body min-h-[280px]">
        {terminalLines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`${line.type === 'blank' ? 'h-3' : ''}`}>
            {line.type === 'comment' && <span className="comment">{line.text}</span>}
            {line.type === 'cmd' && <span className="cmd">{line.text}</span>}
            {line.type === 'output' && <span className="output">{line.text}</span>}
            {line.type === 'success' && <span className="success">{line.text}</span>}
          </div>
        ))}
        {visibleLines < terminalLines.length && (
          <span className="cmd">
            █
          </span>
        )}
      </div>
    </div>
  );
}

function ChatPreview() {
  const [visibleMsgs, setVisibleMsgs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleMsgs((prev) => {
        if (prev >= chatMessages.length) return prev;
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0b1015] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
      <div className="bg-[#1a2332] px-4 py-3 flex items-center gap-3 border-b border-[#1e293b]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">B</div>
        <div>
          <div className="text-white text-sm font-semibold">BotWave Demo</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            online
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 min-h-[300px]">
        {chatMessages.slice(0, visibleMsgs).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
              msg.from === 'user'
                ? 'bg-emerald-600/20 border border-emerald-500/20'
                : 'bg-[#16202d] border border-[#1e293b]'
            }`}>
              <div className={`text-[10px] font-semibold mb-1 ${msg.from === 'user' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {msg.name}
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{msg.text}</div>
              <div className="text-[9px] text-slate-600 text-right mt-1">{msg.time}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CountUp({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const numericPrefix = useMemo(() => {
    const m = target.match(/^(\d+)/);
    return m ? m[1] : null;
  }, [target]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    if (!numericPrefix) { setDisplay(target); return; }
    const end = parseInt(numericPrefix);
    const suffixPart = target.slice(numericPrefix.length);
    let current = 0;
    const step = Math.max(1, Math.floor(end / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= end) {
        current = end;
        clearInterval(interval);
      }
      setDisplay(current + suffixPart);
    }, 50);
    return () => clearInterval(interval);
  }, [hasStarted, target, numericPrefix]);

  return <span ref={ref}>{display}{suffix}</span>;
}

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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0f1a] pt-32 pb-24 px-6">
        {/* Tech grid overlay */}
        <div className="absolute inset-0 tech-grid opacity-50" />
        {/* Glow orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-[10%] w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[200px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-mono tracking-wide">SYSTEM ONLINE</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6">
                Automate Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 typing-cursor">
                  WhatsApp
                </span>
              </h1>

              <p className="text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
                BotWave is your complete platform for powerful WhatsApp bot features.
                Stickers, AI chat, media downloads, games, and group management — all delivered
                instantly with zero setup.
              </p>

              <div className="flex gap-4 flex-wrap mb-8">
                <Link
                  href="/signup"
                  className="group px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link
                  href="#features"
                  className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Explore Features
                </Link>
              </div>

              {/* Tech badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-slate-600 font-mono tracking-wide">POWERED BY</span>
                {['Node.js', 'WhatsApp API', 'Supabase', 'AI'].map((tech) => (
                  <span key={tech} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-slate-400 font-mono">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right — Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <TerminalBlock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats — monospace tech style */}
      <section className="py-12 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-5 glass-card rounded-xl transition-all duration-300"
            >
              <div className="text-3xl md:text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1">
                <CountUp target={stat.value} />
              </div>
              <div className="text-xs text-slate-500 font-mono tracking-wider uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-[var(--bg)] relative">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-4">
              CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
              Everything You Need in a WhatsApp Bot
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
              From sticker creation to AI conversations, BotWave has all the tools to supercharge your WhatsApp groups.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Live Demo — Chat Preview */}
      <section className="py-24 px-6 bg-[var(--bg)] relative">
        <div className="absolute inset-0 tech-grid opacity-30" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-mono tracking-wide mb-4">
                LIVE PREVIEW
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                See BotWave in Action
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Watch how BotWave responds to commands live. From creating stickers to answering questions with AI, every command is processed instantly.
              </p>
              <div className="space-y-4">
                {[
                  { cmd: '!sticker', desc: 'Convert images to WhatsApp stickers' },
                  { cmd: '!ai [question]', desc: 'Get AI answers to anything' },
                  { cmd: '!whois (reply)', desc: 'Look up user info like Sangmata' },
                  { cmd: '!trivia', desc: 'Start a trivia game in your group' },
                ].map((item) => (
                  <div key={item.cmd} className="flex items-start gap-3">
                    <code className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-xs font-mono whitespace-nowrap">
                      {item.cmd}
                    </code>
                    <span className="text-sm text-slate-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <ChatPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-4">
              TESTIMONIALS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
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
                className="glass-card p-8 rounded-xl transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-400 leading-relaxed mb-6 text-sm">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
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
      <section id="install" className="py-24 px-6 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-4">
              INSTALL
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
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
              className="glass-card p-8 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl">🍎</div>
                <div>
                  <h3 className="font-bold text-white">iPhone / iPad</h3>
                  <p className="text-xs text-slate-500 font-mono">Safari required</p>
                </div>
              </div>
              <ol className="space-y-3">
                {['Open BotWave in Safari', 'Tap the Share button (square with arrow)', 'Scroll down and tap "Add to Home Screen"', 'Tap "Add" to confirm'].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-400">{step}</span>
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
              className="glass-card p-8 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl">🤖</div>
                <div>
                  <h3 className="font-bold text-white">Android</h3>
                  <p className="text-xs text-slate-500 font-mono">Chrome recommended</p>
                </div>
              </div>
              <ol className="space-y-3">
                {['Open BotWave in Chrome', 'Tap the three dots menu (⋮) top right', 'Tap "Add to Home Screen"', 'Tap "Add" to confirm'].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-400">{step}</span>
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
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-[var(--bg)] to-cyan-900/20" />
        <div className="absolute inset-0 tech-grid opacity-40" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Supercharge Your WhatsApp?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Join thousands of users who trust BotWave for their WhatsApp automation needs. Free to start, no credit card required.
            </p>
            <Link
              href="/signup"
              className="group inline-block px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              Get Started Free
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#06060a] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="text-2xl font-bold text-white mb-1">
                Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
              </div>
              <p className="text-sm text-slate-500">WhatsApp Automation Platform</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">Created by Decisive Analyst</p>
            </div>

            <div className="flex gap-6 text-sm">
              <Link href="#features" className="text-slate-500 hover:text-emerald-400 transition-colors">Features</Link>
              <Link href="#how" className="text-slate-500 hover:text-emerald-400 transition-colors">How it Works</Link>
              <Link href="#install" className="text-slate-500 hover:text-emerald-400 transition-colors">Install</Link>
              <Link href="#disclaimer" className="text-slate-500 hover:text-emerald-400 transition-colors">Disclaimer</Link>
            </div>

            <div className="flex gap-2">
              {['Node.js', 'Baileys', 'Supabase', 'AI'].map((tech) => (
                <span key={tech} className="px-2 py-1 bg-white/3 border border-white/5 rounded text-[9px] text-slate-600 font-mono">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#1a1a24] mt-8 pt-6 text-center">
            <p className="text-xs text-slate-700 font-mono">
              &copy; {new Date().getFullYear()} BotWave &middot; Built with ❤ by Decisive Analyst
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
