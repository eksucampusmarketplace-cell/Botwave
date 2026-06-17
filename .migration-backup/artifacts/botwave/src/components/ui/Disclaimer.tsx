

import { motion } from 'framer-motion';

const disclaimerItems = [
  <>
    BotWave is an <strong className="text-amber-400">independent third-party service</strong> and is NOT affiliated
    with, endorsed by, or connected to Telegram FZ-LLC in any way.
  </>,
  <>
    <strong className="text-amber-400">Telegram Bot:</strong> Telegram Bot mode uses the{' '}
    <strong className="text-amber-400">official Telegram Bot API</strong> via @BotFather.
    This is fully supported by Telegram with <strong className="text-amber-400">zero ban risk</strong> for the bot itself.
  </>,
  <>
    <strong className="text-amber-400">Telegram Userbot:</strong> Userbot mode automates a{' '}
    <strong className="text-amber-400">real Telegram account</strong> via the MTProto API.
    Use responsibly - Telegram enforces rate limits and may restrict accounts that abuse automation.{' '}
    <strong className="text-amber-400">Use at your own risk.</strong>
  </>,
  <>
    BotWave takes <strong className="text-amber-400">no responsibility</strong> for any account bans, suspensions,
    data loss, or any damages that arise from using this service. Use is entirely{' '}
    <strong className="text-amber-400">at your own risk</strong>.
  </>,
  <>
    You are solely responsible for how you use BotWave.{' '}
    <strong className="text-amber-400">Spam, harassment, or illegal activity</strong> is strictly prohibited and may
    result in immediate termination of your account.
  </>,
  <>
    BotWave does <strong className="text-amber-400">not store, read, or sell</strong> your messages on any platform.
    The bot owner <strong className="text-amber-400">cannot see, access, or read</strong> your private chats.
    BotWave only processes messages that contain bot commands - all other messages are ignored.
  </>,
  <>
    This service is provided <strong className="text-amber-400">&quot;as is&quot;</strong> with no guarantees of
    uptime, availability, or uninterrupted service.
  </>,
];

export default function Disclaimer() {
  return (
    <section id="disclaimer" className="py-24 px-6 bg-[var(--bg-alt)] border-y border-[var(--border)]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-400">
                Important Disclaimer
              </h3>
              <p className="text-xs text-amber-500/60 font-mono">READ BEFORE USE</p>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-5">
            By using BotWave, you acknowledge and accept the following terms in full:
          </p>

          <div className="flex flex-col gap-4">
            {disclaimerItems.map((item, index) => (
              <div key={index} className="flex gap-3 items-start text-sm text-slate-400 leading-relaxed">
                <span className="w-5 h-5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-400 font-mono flex-shrink-0 mt-0.5">
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
