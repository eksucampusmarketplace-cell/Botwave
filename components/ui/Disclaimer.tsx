'use client';

import { motion } from 'framer-motion';

const disclaimerItems = [
  <>
    BotWave is an <strong className="text-amber-700">independent third-party service</strong> and is NOT affiliated
    with, endorsed by, or connected to WhatsApp LLC or Meta Platforms, Inc. in any way.
  </>,
  <>
    WhatsApp&apos;s <strong className="text-amber-700">Terms of Service prohibit automation</strong> on personal
    accounts. Using BotWave may violate these terms and could result in your account being{' '}
    <strong className="text-amber-700">temporarily or permanently banned</strong> by WhatsApp.
  </>,
  <>
    BotWave takes <strong className="text-amber-700">no responsibility</strong> for any account bans, suspensions,
    data loss, or any damages that arise from using this service. Use is entirely{' '}
    <strong className="text-amber-700">at your own risk</strong>.
  </>,
  <>
    You are solely responsible for how you use BotWave.{' '}
    <strong className="text-amber-700">Spam, harassment, or illegal activity</strong> is strictly prohibited and may
    result in immediate termination of your account.
  </>,
  <>
    BotWave does <strong className="text-amber-700">not store, read, or sell</strong> your WhatsApp messages.
    The bot owner <strong className="text-amber-700">cannot see, access, or read</strong> your private chats.
    BotWave only processes messages that contain bot commands — all other messages are ignored.
  </>,
  <>
    This service is provided <strong className="text-amber-700">&quot;as is&quot;</strong> with no guarantees of
    uptime, availability, or uninterrupted service.
  </>,
];

export default function Disclaimer() {
  return (
    <section id="disclaimer" className="py-20 px-6 bg-[var(--bg)]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-amber-800">
              Important Disclaimer — Read Before Use
            </h3>
          </div>

          <p className="text-sm text-amber-700 mb-5">
            By using BotWave, you acknowledge and accept the following terms in full:
          </p>

          <div className="flex flex-col gap-4">
            {disclaimerItems.map((item, index) => (
              <div key={index} className="flex gap-3 items-start text-sm text-amber-800/80 leading-relaxed">
                <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-700 flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
