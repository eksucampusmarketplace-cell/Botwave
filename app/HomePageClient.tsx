'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FeatureCard from '@/components/ui/FeatureCard';
import HowItWorks from '@/components/ui/HowItWorks';
import Disclaimer from '@/components/ui/Disclaimer';

type PlatformBadge = 'WhatsApp' | 'Telegram Bot' | 'Telegram Userbot';

const features: { icon: string; title: string; description: string; platforms: PlatformBadge[] }[] = [
  { icon: 'sticker', title: 'Sticker Maker', description: 'Convert any image or video into a sticker instantly with a simple command.', platforms: ['WhatsApp', 'Telegram Bot'] },
  { icon: 'ai', title: 'AI Chat Reply', description: 'Tag the bot and get intelligent AI replies. Ask anything, get smart answers.', platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
  { icon: 'download', title: 'Media Downloader', description: 'Download YouTube, TikTok and Instagram Reels without watermarks, directly in chat.', platforms: ['WhatsApp', 'Telegram Bot'] },
  { icon: 'welcome', title: 'Welcome Bot', description: 'Greet new group members with a custom, personalized welcome message automatically.', platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
  { icon: 'shield', title: 'Anti-Spam Protection', description: 'Detects and removes spam or flood messages automatically to keep your group clean.', platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
  { icon: 'game', title: 'Mini Games', description: 'Trivia, Hangman, Word Chain, Number Guess \u2014 play fun games right inside your group.', platforms: ['WhatsApp', 'Telegram Bot'] },
  { icon: 'chart', title: 'Polls & Leaderboard', description: 'Create group polls and track engagement with a live leaderboard.', platforms: ['WhatsApp', 'Telegram Bot'] },
  { icon: 'tools', title: 'Smart Tools', description: 'Weather, dictionary, jokes, horoscope, quotes \u2014 all accessible with simple commands.', platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
  { icon: 'reply', title: 'Auto Reply', description: "Set custom auto-replies for when you're offline, busy, or want to automate responses.", platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
  { icon: 'lock', title: 'Privacy First', description: 'Your chats stay private. The bot only responds to commands \u2014 nothing else is stored or shared.', platforms: ['WhatsApp', 'Telegram Bot', 'Telegram Userbot'] },
];

const stats = [
  { value: '150+', label: 'Bot Commands' },
  { value: '3', label: 'Platforms' },
  { value: '35+', label: 'Searchable Pages' },
  { value: '0', label: 'Coding Required' },
];

const testimonials = [
  { text: 'Set up the bot in my class group in less than 2 minutes. The anti-spam actually works, no more random links flooding the chat.', name: 'Chris', role: 'University Student, Ekiti', initials: 'CF' },
  { text: 'I use the AI command to answer customer questions when I am busy packaging orders. Saves me hours every day.', name: 'Tola', role: 'Online Vendor, Lagos', initials: 'TA' },
  { text: 'The trivia bot keeps my community group alive between content drops. Members actually look forward to quiz nights now.', name: 'Kemi', role: 'Content Creator', initials: 'KO' },
];

const chatMessages = [
  { from: 'user', name: 'You', text: '!sticker', time: '2:31 PM' },
  { from: 'bot', name: 'BotWave', text: 'Sticker created! Converting your image...', time: '2:31 PM' },
  { from: 'user', name: 'You', text: '!ai explain quantum computing in 2 lines', time: '2:32 PM' },
  { from: 'bot', name: 'BotWave', text: 'Quantum computing uses qubits that can be 0 and 1 simultaneously, enabling parallel processing. This makes it exponentially faster for certain problems like cryptography and molecular simulation.', time: '2:32 PM' },
  { from: 'user', name: 'You', text: '!trivia', time: '2:33 PM' },
  { from: 'bot', name: 'BotWave', text: 'TRIVIA TIME!\n\nWhat programming language was created by Brendan Eich in 1995?\n\nA) Python  B) JavaScript  C) Java  D) Ruby\n\nReply with the letter!', time: '2:33 PM' },
];

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
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
      <div className="bg-[var(--bg-alt)] px-5 py-4 flex items-center gap-3 border-b border-[var(--border)]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">B</div>
        <div>
          <div className="text-[var(--text-primary)] text-base font-semibold">BotWave Demo</div>
          <div className="text-sm text-green-500 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            online
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3 min-h-[300px]">
        {chatMessages.slice(0, visibleMsgs).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.from === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-[var(--bg-alt)] border border-[var(--border)]'
            }`}>
              <div className={`text-xs font-semibold mb-1 ${msg.from === 'user' ? 'text-blue-100' : 'text-[var(--primary)]'}`}>
                {msg.name}
              </div>
              <div className={`text-sm whitespace-pre-line leading-relaxed ${msg.from === 'user' ? 'text-white' : 'text-[var(--text-primary)]'}`}>{msg.text}</div>
              <div className={`text-[10px] text-right mt-1 ${msg.from === 'user' ? 'text-blue-200' : 'text-[var(--text-muted)]'}`}>{msg.time}</div>
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
    const cleaned = target.replace(/,/g, '');
    const m = cleaned.match(/^(\d+)/);
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
    const suffixPart = target.replace(/,/g, '').slice(numericPrefix.length);
    let current = 0;
    const step = Math.max(1, Math.floor(end / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= end) {
        current = end;
        clearInterval(interval);
      }
      const formatted = current.toLocaleString();
      setDisplay(formatted + suffixPart);
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

const faqs = [
  { q: 'Is BotWave actually free?', a: 'Yes. Free plan includes 300 messages/month, 10 AI queries/day, and 1 WhatsApp session. BotWave runs from your own device via QR code, keeping costs low. Paid plans exist for power users who need unlimited messages and multiple sessions.' },
  { q: 'Will WhatsApp ban my number?', a: 'No bot can guarantee zero ban risk on WhatsApp. But BotWave significantly reduces the risk with session warmup over 7 days, human-like typing delays, 50-100 message variations, rate limiting, read-but-skip in groups, and media fingerprint jittering. Your session runs from your own device IP, not a shared server.' },
  { q: "What's the difference between Telegram Bot and Telegram Userbot?", a: 'Telegram Bot uses the official Bot API via @BotFather with zero ban risk, ideal for group management and moderation. Telegram Userbot automates your real Telegram account via MTProto to do things like .ban, .mute, .purge, .gban as if you typed them yourself. Both are managed from the same dashboard.' },
  { q: 'How many groups can my bot manage?', a: 'No group limit on any plan. Your bot works in every group your connected account is in. The only limit is messages per month (300 on free, unlimited on paid plans).' },
  { q: 'Does BotWave work on iPhone?', a: 'Yes. BotWave works on any device. Connect through the web dashboard, scan a QR code for WhatsApp, paste a token for Telegram Bot, or enter API credentials for Userbot. iPhone, Android, desktop, any browser.' },
  { q: 'Can I use BotWave for my school or business group?', a: 'Yes. BotWave works well for campus groups, church groups, business communities, and social clubs. Polls, trivia, anti-spam, AI chat, and auto-replies all help manage larger groups.' },
  { q: 'Is my WhatsApp number safe?', a: 'BotWave only processes messages in groups where the bot is active. Private messages are never read or stored. All processing happens in memory and is discarded immediately. Your session runs on your device IP.' },
  { q: 'How do I set up a bot?', a: 'Sign up at botwave.online, go to your dashboard, pick your platform. WhatsApp: scan QR code. Telegram Bot: paste @BotFather token. Userbot: enter API credentials. Live in under 2 minutes, no coding needed.' },
  { q: 'Does BotWave work in Nigeria?', a: 'Yes, BotWave is built for Nigeria and Africa. Payments are in Naira via bank transfer. The platform is optimized for Nigerian internet speeds and WhatsApp usage patterns.' },
  { q: 'How is BotWave different from other bots?', a: 'BotWave supports WhatsApp, Telegram Bot, and Telegram Userbot from one dashboard. It runs from your own accounts, has strong anti-ban protection, AI chat, and 150+ built-in commands. Most alternatives support only one platform.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--hero-from)] to-[var(--hero-to)] pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-[10%] w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-[15%] w-80 h-80 bg-violet-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-full mb-8">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[var(--text-secondary)] text-sm font-medium">Free Forever, No Catch</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.1] mb-6 tracking-tight">
                Automate Your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">WhatsApp &amp; Telegram</span>
              </h1>

              <p className="text-xl text-[var(--text-secondary)] max-w-xl mb-4 leading-relaxed">
                <strong>BotWave is a free bot automation platform for WhatsApp and Telegram.</strong> Connect via QR scan, Bot token, or Userbot credentials — all from one dashboard.
              </p>
              <p className="text-lg text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed">
                150+ built-in commands: AI chat, stickers, games, anti-spam, media downloads, and group management. No coding, no credit card, no catch.
              </p>

              <div className="flex gap-4 flex-wrap mb-10">
                <Link href="/signup" className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 text-base">
                  Get Started Free <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>
                <Link href="#features" className="px-8 py-4 bg-[var(--bg-alt)] hover:bg-[var(--bg-subtle,var(--bg-alt))] text-[var(--text-primary)] font-semibold rounded-xl border border-[var(--border)] hover:border-blue-300 transition-all duration-300 hover:-translate-y-0.5 text-base">
                  Explore Features
                </Link>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-[var(--text-muted)] font-medium">Powered by</span>
                {['Node.js', 'WhatsApp API', 'Telegram API', 'Supabase', 'AI'].map((tech) => (
                  <span key={tech} className="px-3 py-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] font-medium">{tech}</span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
              <ChatPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} viewport={{ once: true }} className="text-center p-6">
              <div className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 mb-2">
                <CountUp target={stat.value} />
              </div>
              <div className="text-base text-[var(--text-secondary)] font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech Logos */}
      <section className="py-12 px-6 bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-[var(--text-muted)] font-medium mb-8 uppercase tracking-wider">Built with industry-leading technology</p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-60">
            {['Node.js', 'Supabase', 'AI', 'WhatsApp', 'Telegram'].map((name) => (
              <div key={name} className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-alt)] border border-[var(--border)] flex items-center justify-center text-sm font-bold">{name[0]}</div>
                <span className="text-xs font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-[var(--bg)] relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">150+ Bot Commands for WhatsApp and Telegram</h2>
            <p className="text-lg text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto leading-relaxed">From sticker creation to AI chatbot responses, BotWave gives you every tool to automate and supercharge your WhatsApp and Telegram groups.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <span className="inline-block px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-12">Start free, upgrade when you need more. No hidden fees, no surprises.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Free', price: '$0', period: '/forever', features: ['1 WhatsApp session', '300 messages/month', '10 AI queries/day', 'All basic commands', 'Community support'], cta: 'Get Started Free', highlight: false },
              { name: 'Standard', price: 'Coming Soon', period: '', features: ['3 WhatsApp sessions', 'Unlimited messages', '100 AI queries/day', 'Priority support', 'Custom commands'], cta: 'Coming Soon', highlight: true },
              { name: 'Boss', price: 'Coming Soon', period: '', features: ['10 WhatsApp sessions', 'Unlimited everything', 'Unlimited AI queries', 'Dedicated support', 'White-label option'], cta: 'Coming Soon', highlight: false },
            ].map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} viewport={{ once: true }}
                className={`rounded-2xl p-8 text-left ${plan.highlight ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 scale-105' : 'bg-[var(--card-bg,var(--surface))] border border-[var(--border)] shadow-sm'}`}>
                <h3 className={`text-lg font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>{plan.price}</span>
                  <span className={`text-base ${plan.highlight ? 'text-blue-100' : 'text-[var(--text-muted)]'}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-3 text-base ${plan.highlight ? 'text-blue-50' : 'text-[var(--text-secondary)]'}`}>
                      <svg className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-semibold text-base transition-all ${plan.highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : plan.name === 'Free' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[var(--bg-alt)] text-[var(--text-secondary)] border border-[var(--border)] cursor-not-allowed'}`} disabled={plan.cta === 'Coming Soon'}>{plan.cta}</button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">What Our Users Say</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="glass-card p-8 rounded-2xl">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-6 text-base">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-base">{t.initials}</div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-base">{t.name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Security</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">Your Accounts Are Safe With BotWave</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">Your WhatsApp session runs from your own device IP, not a shared server. The advanced anti-ban system uses 7-day session warmup, human-like delays, and message variation to reduce risk significantly.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Your Device, Your IP', desc: 'Sessions run from your own device via QR code. Your real IP is used, not a shared server IP. This drastically reduces ban risk.' },
              { title: 'Zero Message Storage', desc: 'Messages are never read, stored, or logged. All processing happens in memory and is discarded immediately after response.' },
              { title: 'Advanced Anti-Ban System', desc: '7-day session warmup. Human-like typing delays. 50–100 message variations. Rate limiting. Activity hours simulation. Media fingerprint jittering.' },
              { title: 'Smart Rate Limiting', desc: '200 messages/day hard cap. 10 msgs/min per session. 20 msgs/min per user. Flood detection warns after 5 messages in 10 seconds.' },
              { title: 'Human-Like Behavior', desc: 'Quiet at night. Random response delays. 15% read-but-skip in groups. Presence toggling by time of day. Distracted delays up to 2 minutes.' },
              { title: 'Secure Infrastructure', desc: 'Supabase with row-level security. Encrypted API communication. No plain-text secrets. Your credentials are protected at every layer.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} viewport={{ once: true }} className="glass-card rounded-2xl p-7">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2">{item.title}</h3>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Telegram Section */}
      <section className="py-24 px-6 bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Telegram</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">Now Supporting Telegram</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">Connect your Telegram Bot token or link your Telegram Userbot. Manage groups, auto-reply, and anti-spam from the same dashboard.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} viewport={{ once: true }} className="glass-card rounded-2xl p-8">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-center text-2xl mb-5">{'🤖'}</div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Telegram Bot</h3>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-4">Create a bot via @BotFather, paste the token in BotWave, done. Zero ban risk \u2014 uses the official Telegram Bot API. Ideal for group management, auto-replies, polls, and moderation.</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> Official Bot API, zero ban risk</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> /sticker, /ai, /poll, /trivia, /translate</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> Multi-language auto-detection</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> Group-level settings &amp; per-chat config</li>
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} viewport={{ once: true }} className="glass-card rounded-2xl p-8">
              <div className="w-14 h-14 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl flex items-center justify-center text-2xl mb-5">{'⚡'}</div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Telegram Userbot</h3>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-4">Automate your real Telegram account via MTProto (GramJS). Execute commands like .ban, .mute, .afk, .purge, .kang as if you typed them yourself. 100+ commands with anti-ban protection.</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> MTProto, full account automation</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> .ban, .mute, .purge, .gban, .sticker, .translate</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> PM Permit, AFK, Notes, Filters</li>
                <li className="flex items-center gap-2"><span className="text-green-500">{'✓'}</span> In-memory state &amp; anti-flood protection</li>
              </ul>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} viewport={{ once: true }} className="flex flex-wrap gap-4 justify-center mt-10">
            <Link href="/telegram-bot-nigeria" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Telegram Bot Nigeria</Link>
            <Link href="/telegram-userbot-commands" className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">All Userbot Commands</Link>
            <Link href="/blog/telegram-bot-vs-whatsapp-bot" className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold rounded-xl hover:border-blue-500/30 transition-colors">TG Bot vs WA Bot</Link>
            <Link href="/blog/telegram-anti-spam-bot" className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold rounded-xl hover:border-blue-500/30 transition-colors">Anti-Spam Guide</Link>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">Compare</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">BotWave vs Other Bot Platforms</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-4 px-4 text-sm font-bold text-[var(--text-primary)]">Feature</th>
                  <th className="py-4 px-4 text-sm font-bold text-[var(--primary)]">BotWave</th>
                  <th className="py-4 px-4 text-sm font-bold text-[var(--text-muted)]">Other Bots</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Price', 'Free forever', '$10-50/month'],
                  ['WhatsApp support', 'Yes (QR code)', 'Some'],
                  ['Telegram Bot', 'Yes (Bot API)', 'Some'],
                  ['Telegram Userbot', 'Yes (MTProto)', 'No'],
                  ['One dashboard', 'All 3 platforms', '1 platform only'],
                  ['Anti-ban system', 'Advanced (7-day warmup)', 'Basic or none'],
                  ['AI chat', 'Google Gemini', 'ChatGPT ($$$)'],
                  ['Commands', '50+ built-in', '10-20'],
                  ['Coding required', 'No', 'Usually yes'],
                  ['Nigeria support', 'Naira payments', 'USD only'],
                ].map(([feature, botwave, others], i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4 text-[var(--text-secondary)] font-medium">{feature}</td>
                    <td className="py-3 px-4 text-[var(--primary)] font-semibold">{botwave}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-full text-[var(--primary)] text-sm font-semibold mb-4">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">Frequently Asked Questions</h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.details key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} viewport={{ once: true }} className="glass-card rounded-2xl group">
                <summary className="px-6 py-5 cursor-pointer flex items-center justify-between text-[var(--text-primary)] font-semibold text-base md:text-lg hover:text-[var(--primary)] transition-colors list-none">
                  {faq.q}
                  <span className="text-[var(--primary)] ml-4 group-open:rotate-45 transition-transform text-xl font-light">+</span>
                </summary>
                <div className="px-6 pb-5 text-base text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      <Disclaimer />

      {/* Summary / TL;DR for AI extractability */}
      <section className="py-16 px-6 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-6 text-center">What Is BotWave?</h2>
          <div className="space-y-4 text-base text-[var(--text-secondary)] leading-relaxed">
            <p>
              <strong>BotWave</strong> is a free, no-code bot automation platform that works across WhatsApp, Telegram Bot, and Telegram Userbot. It was created by BotWave Team in 2026 and serves users in Nigeria and worldwide.
            </p>
            <p>
              <strong>How it works:</strong> Sign up at botwave.online, connect your account (WhatsApp via QR scan, Telegram Bot via @BotFather token, Telegram Userbot via MTProto API credentials), and your bot is live in under 2 minutes.
            </p>
            <p>
              <strong>Key features:</strong> 150+ built-in commands including AI chat (Google Gemini), sticker creation, media downloads, trivia games, polls, anti-spam protection, auto-reply, and group management.
            </p>
            <p>
              <strong>Anti-ban protection:</strong> BotWave includes 7-day session warmup, human-like typing delays, 50–100 message variations, rate limiting (200 msgs/day cap), activity hours simulation, and media fingerprint jittering. Sessions run from your own device IP.
            </p>
            <p>
              <strong>Pricing:</strong> Free forever tier with 300 messages/month and 10 AI queries/day. Paid plans coming soon with unlimited messages and multiple sessions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-[20%] w-96 h-96 bg-white rounded-full blur-[150px]" />
          <div className="absolute bottom-10 right-[20%] w-80 h-80 bg-white rounded-full blur-[150px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Start Automating Your Groups. Free Forever</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">Join users across Nigeria who automate their WhatsApp and Telegram groups with BotWave. No credit card, no coding, no downloads.</p>
            <Link href="/signup" className="group inline-block px-10 py-4 bg-white text-blue-600 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg">
              Get Started Free <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}