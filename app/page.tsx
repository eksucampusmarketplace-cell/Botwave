'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FeatureCard from '@/components/ui/FeatureCard';
import HowItWorks from '@/components/ui/HowItWorks';
import Disclaimer from '@/components/ui/Disclaimer';
import ParticleBackground from '@/components/ui/ParticleBackground';

const features = [
  {
    icon: '🎴',
    title: 'STICKER MAKER',
    description: 'Convert any image or video clip into a WhatsApp sticker instantly on command.',
    code: 'SYS_01',
  },
  {
    icon: '🤖',
    title: 'AI CHAT REPLY',
    description: 'Tag the bot and it replies intelligently using advanced AI. Ask anything, get smart answers.',
    code: 'SYS_02',
  },
  {
    icon: '📥',
    title: 'MEDIA DOWNLOADER',
    description: 'Download YouTube, TikTok and Instagram Reels without watermarks, directly in chat.',
    code: 'SYS_03',
  },
  {
    icon: '👋',
    title: 'WELCOME BOT',
    description: 'Greet new group members with a custom, personalized welcome message automatically.',
    code: 'SYS_04',
  },
  {
    icon: '🛡️',
    title: 'ANTI-SPAM',
    description: 'Automatically detects and removes spam or flood messages to keep your group clean.',
    code: 'SYS_05',
  },
  {
    icon: '🎮',
    title: 'MINI GAMES',
    description: 'Trivia, Hangman, Word Chain, Number Guess — play fun games right inside your group.',
    code: 'SYS_06',
  },
  {
    icon: '📊',
    title: 'POLLS & LEADERBOARD',
    description: 'Create group polls and track who sends the most messages with a live leaderboard.',
    code: 'SYS_07',
  },
  {
    icon: '🌤️',
    title: 'SMART TOOLS',
    description: 'Weather, dictionary, daily jokes, horoscope, quotes — all accessible with simple commands.',
    code: 'SYS_08',
  },
  {
    icon: '💬',
    title: 'AUTO REPLY',
    description: 'Set custom auto-replies for when you\'re offline, busy, or want to automate responses.',
    code: 'SYS_09',
  },
  {
    icon: '🔒',
    title: 'PRIVACY FIRST',
    description: 'Your chats stay private. The bot owner cannot read or access your messages. BotWave only responds to commands — nothing else is stored or shared.',
    code: 'SYS_10',
  },
];

const tickerItems = [
  'WHATSAPP AUTOMATION',
  'STICKER MAKER',
  'AI CHAT',
  'MEDIA DOWNLOADER',
  'GROUP TOOLS',
  'TRIVIA GAMES',
  'AUTO REPLY',
  'WEATHER BOT',
  'RANDOM JOKES',
  'ANTI-SPAM',
  'WELCOME BOT',
  'LEADERBOARD',
  'POLLS',
  'WORD CHAIN',
  'HANGMAN',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-dark relative">
      <ParticleBackground />

      <Navbar />

      <div className="mt-[70px] bg-[rgba(0,255,136,0.05)] border-t border-b border-green/10 py-2 overflow-hidden">
        <div className="animate-ticker whitespace-nowrap font-mono text-xs text-green/50 tracking-[3px]">
          {tickerItems.map((item, i) => (
            <span key={i}>
              ◈ {item} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      <section className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-mono text-xs tracking-[4px] text-cyan border border-cyan/30 px-4 py-2 mb-8 inline-block"
        >
          {"// NEXT-GEN WHATSAPP AUTOMATION"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-[clamp(2.5rem,7vw,6rem)] font-black leading-[1.05] mb-6"
        >
          <span className="text-white">AUTOMATE YOUR</span>
          <br />
          <span className="text-green glitch drop-shadow-[0_0_30px_rgba(0,255,136,0.5)]" data-text="WHATSAPP">
            WHATSAPP
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base text-[#7abfa0] max-w-xl leading-relaxed mb-12 font-light"
        >
          Powerful bot features delivered as a service. No setup, no hassle — just connect your number and let
          BotWave do the rest.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex gap-4 flex-wrap justify-center"
        >
          <Link
            href="/login"
            className="font-display text-xs tracking-[3px] px-10 py-4 bg-green text-dark font-bold clip-path-button hover:bg-cyan hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,255,136,0.4)] transition-all duration-300"
          >
            GET STARTED FREE
          </Link>
          <Link
            href="#features"
            className="font-display text-xs tracking-[3px] px-10 py-4 bg-transparent text-green border border-green font-bold hover:bg-green/10 hover:translate-y-[-2px] transition-all duration-300"
          >
            EXPLORE FEATURES
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex gap-12 mt-20 flex-wrap justify-center"
        >
          <div className="text-center">
            <div className="font-display text-3xl font-black text-green drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              20+
            </div>
            <div className="font-mono text-[11px] tracking-[2px] text-[#4a8a70] mt-1">FEATURES</div>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-black text-green drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              50+
            </div>
            <div className="font-mono text-[11px] tracking-[2px] text-[#4a8a70] mt-1">COMMANDS</div>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-black text-green drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              FREE
            </div>
            <div className="font-mono text-[11px] tracking-[2px] text-[#4a8a70] mt-1">FOREVER*</div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="py-28 px-8 max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs tracking-[4px] text-cyan block mb-4">{"// CAPABILITIES"}</span>
          <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-bold text-white">
            WHAT <span className="text-green">BOTWAVE</span> CAN DO
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.code} feature={feature} index={index} />
          ))}
        </div>
      </section>

      <HowItWorks />
      <Disclaimer />

      <footer className="py-12 px-8 border-t border-green/10 text-center relative z-10">
        <div className="font-display text-2xl font-black text-green tracking-[4px] drop-shadow-[0_0_20px_rgba(0,255,136,0.3)] mb-2">
          BOTWAVE
        </div>
        <div className="font-mono text-xs tracking-[3px] text-[#3a7a5a] mb-2">
          DESIGNED & BUILT BY <span className="text-green drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]">DECISIVE ANALYST</span>
        </div>
        <div className="font-mono text-[11px] tracking-[2px] text-[#2a4a3a] mt-2">
          © 2025 BOTWAVE · CREATED BY DECISIVE ANALYST
        </div>
      </footer>


    </main>
  );
}
