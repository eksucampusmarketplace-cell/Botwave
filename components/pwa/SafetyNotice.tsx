'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SafetyNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card border border-yellow-500/20 p-6 mb-6 relative"
    >
      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-yellow-500/30" />
      <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-yellow-500/30" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-[3px] text-yellow-400">
          BACKGROUND &amp; ACCOUNT SAFETY
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#5a9a7a] hover:text-green transition-colors font-mono text-xs"
        >
          DISMISS
        </button>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: '&#9889;',
            title: 'Allow Background Activity',
            text: 'Allow BotWave to run in background on your phone. Go to Settings → Apps → BotWave → Battery → Unrestricted.',
          },
          {
            icon: '&#128267;',
            title: 'Disable Battery Optimization',
            text: 'Disable battery optimization/saver for BotWave so it stays active. Otherwise your phone may kill the app.',
          },
          {
            icon: '&#128246;',
            title: 'Stay Connected to Internet',
            text: 'Your phone must stay connected to Wi-Fi or mobile data. If your phone goes offline, the bot stops working until reconnected.',
          },
          {
            icon: '&#128260;',
            title: 'AFK Requires Background Running',
            text: 'The AFK auto-reply feature only works while your phone is online and BotWave is running in the background.',
          },
          {
            icon: '&#128274;',
            title: 'Use an Established WhatsApp Number',
            text: 'We recommend using a WhatsApp number that has been active for at least 3 months. New numbers have a higher risk of being flagged.',
          },
          {
            icon: '&#128165;',
            title: 'If Bot Stops Working',
            text: 'Check your internet connection and make sure BotWave is still running. Open the app and reconnect your session if needed.',
          },
        ].map((item, index) => (
          <div key={index} className="flex items-start gap-3 bg-dark/30 p-3 border border-yellow-500/5">
            <span
              className="text-yellow-400 text-sm flex-shrink-0 mt-0.5"
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
            <div>
              <p className="font-mono text-[10px] text-yellow-400 tracking-[1px] mb-0.5">
                {item.title}
              </p>
              <p className="font-mono text-[10px] text-[#7a8a6a] leading-relaxed">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
