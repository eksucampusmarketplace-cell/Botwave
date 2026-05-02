'use client';

import { motion } from 'framer-motion';

const disclaimerItems = [
  <>
    BotWave is an <strong className="text-[#ff9090]">independent third-party service</strong> and is NOT affiliated
    with, endorsed by, or connected to WhatsApp LLC or Meta Platforms, Inc. in any way.
  </>,
  <>
    WhatsApp&apos;s <strong className="text-[#ff9090]">Terms of Service prohibit automation</strong> on personal
    accounts. Using BotWave may violate these terms and could result in your account being{' '}
    <strong className="text-[#ff9090]">temporarily or permanently banned</strong> by WhatsApp.
  </>,
  <>
    BotWave takes <strong className="text-[#ff9090]">no responsibility</strong> for any account bans, suspensions,
    data loss, or any damages that arise from using this service. Use is entirely{' '}
    <strong className="text-[#ff9090]">at your own risk</strong>.
  </>,
  <>
    You are solely responsible for how you use BotWave.{' '}
    <strong className="text-[#ff9090]">Spam, harassment, or illegal activity</strong> is strictly prohibited and may
    result in immediate termination of your account.
  </>,
  <>
    BotWave does <strong className="text-[#ff9090]">not store, read, or sell</strong> your WhatsApp messages. Your
    data privacy is taken seriously.
  </>,
  <>
    This service is provided <strong className="text-[#ff9090]">&quot;as is&quot;</strong> with no guarantees of
    uptime, availability, or uninterrupted service.
  </>,
];

export default function Disclaimer() {
  return (
    <section id="disclaimer" className="py-20 px-8 max-w-4xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="border border-red-400/30 bg-red-500/5 p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-red-400/30" />
        <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-red-400/30" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-red-400/30" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-red-400/30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-[blink_1s_infinite]" />
            <span className="font-display text-xs tracking-[4px] text-[#ff6060]">
              IMPORTANT DISCLAIMER — READ BEFORE USE
            </span>
          </div>

          <p className="text-sm text-[#aa7070] leading-[1.9] font-mono mb-5">
            By using BotWave, you acknowledge and accept the following terms in full:
          </p>

          <div className="flex flex-col gap-3">
            {disclaimerItems.map((item, index) => (
              <div key={index} className="flex gap-3 items-start font-mono text-sm text-[#aa7070]">
                <span className="text-red-400/50 shrink-0">//</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}