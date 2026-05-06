'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Create Account',
    description: 'Sign up on the BotWave dashboard with just your email. No credit card, no payment — completely free to start.',
  },
  {
    number: '2',
    title: 'Scan the QR Code',
    description: 'Open your WhatsApp, go to Linked Devices, and scan the QR code shown on your dashboard. Your session connects from your own device.',
  },
  {
    number: '3',
    title: 'Choose Your Features',
    description: 'Toggle on the features you want from your dashboard. Enable sticker maker, AI replies, games, anti-spam — whatever fits your group.',
  },
  {
    number: '4',
    title: 'Bot is Live',
    description: "That's it. Your bot is active. Use commands in your WhatsApp group and BotWave handles the rest in real-time.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-20 px-6 bg-[var(--bg-alt)]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-sm font-semibold text-[var(--primary)] tracking-wide uppercase">Getting Started</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mt-3">
            How It Works
          </h2>
          <p className="text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
            Get your WhatsApp bot running in under 2 minutes. No technical skills needed.
          </p>
        </motion.div>

        <div className="flex flex-col gap-8 mt-12 relative">
          <div className="absolute left-[1.75rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-400 to-cyan-400 hidden md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              viewport={{ once: true }}
              className="flex gap-6 items-start"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg relative z-10">
                {step.number}
              </div>
              <div className="flex-1 bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-card">
                <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
