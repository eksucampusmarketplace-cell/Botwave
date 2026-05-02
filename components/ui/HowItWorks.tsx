'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

const steps = [
  {
    number: '01',
    title: 'CREATE YOUR ACCOUNT',
    description:
      'Sign up on the BotWave dashboard with just your email. No credit card, no payment — completely free to start.',
  },
  {
    number: '02',
    title: 'SCAN THE QR CODE',
    description:
      'Open your WhatsApp, go to Linked Devices, and scan the QR code shown on your dashboard. Your session connects from your own device and IP.',
  },
  {
    number: '03',
    title: 'CHOOSE YOUR FEATURES',
    description:
      'Toggle on the features you want from your dashboard. Enable sticker maker, AI replies, games, anti-spam — whatever fits your group.',
  },
  {
    number: '04',
    title: 'BOT IS LIVE',
    description:
      "That's it. Your bot is active. Use commands in your WhatsApp group and BotWave handles the rest in real-time.",
  },
];

export default function HowItWorks() {
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 }
    );

    const stepElements = document.querySelectorAll('.step');
    stepElements.forEach((step) => observer.observe(step));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className="py-28 px-8 bg-green/5 border-t border-b border-green/10 relative z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs tracking-[4px] text-cyan block mb-4">{"// GETTING STARTED"}</span>
          <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-bold text-white">
            HOW IT <span className="text-green">WORKS</span>
          </h2>
        </motion.div>

        <div ref={stepsRef} className="flex flex-col gap-0 mt-12 relative">
          <div className="absolute left-[2.25rem] top-0 bottom-0 w-px bg-gradient-to-b from-green to-transparent" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="step flex gap-8 items-start py-6 opacity-0"
            >
              <div className="w-[4.5rem] h-[4.5rem] border-2 border-green flex items-center justify-center font-display text-xl font-black text-green shrink-0 bg-dark relative z-10 clip-path-step">
                {step.number}
              </div>
              <div className="flex-1 pt-2">
                <h3 className="font-display text-sm tracking-[2px] text-white mb-2">{step.title}</h3>
                <p className="text-sm text-[#5a9a7a] leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}