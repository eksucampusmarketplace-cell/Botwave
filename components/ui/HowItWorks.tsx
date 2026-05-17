'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Create Account',
    cmd: '$ botwave signup --email you@mail.com',
    description: 'Sign up on the BotWave dashboard with just your email. No credit card, no payment — completely free to start.',
  },
  {
    number: '02',
    title: 'Choose Your Platform',
    cmd: '$ botwave init --platform [whatsapp|telegram-bot|telegram-userbot]',
    description: 'Pick your platform: scan a WhatsApp QR code, paste a Telegram Bot token from @BotFather, or log in with your Telegram account for userbot mode.',
  },
  {
    number: '03',
    title: 'Choose Your Features',
    cmd: '$ botwave enable --all',
    description: 'Toggle on the features you want from your dashboard. Enable sticker maker, AI replies, games, spam protection, whatever fits your group.',
  },
  {
    number: '04',
    title: 'Bot is Live',
    cmd: '→ status: online | commands: ready',
    description: "That's it. Your bot is active. Use commands in your WhatsApp or Telegram group and BotWave handles the rest instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-4">
            GETTING STARTED
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            How It Works
          </h2>
          <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
            Get your WhatsApp or Telegram bot running in under 2 minutes. No technical skills needed.
          </p>
        </motion.div>

        <div className="flex flex-col gap-6 relative">
          {/* Vertical line */}
          <div className="absolute left-[1.75rem] top-8 bottom-8 w-px bg-gradient-to-b from-emerald-500/40 via-cyan-500/40 to-emerald-500/0 hidden md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex gap-6 items-start"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold font-mono shrink-0 relative z-10">
                {step.number}
              </div>
              <div className="flex-1 glass-card p-6 rounded-xl">
                <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-1">{step.title}</h3>
                <code className="text-xs text-emerald-400/70 font-mono block mb-3">{step.cmd}</code>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
