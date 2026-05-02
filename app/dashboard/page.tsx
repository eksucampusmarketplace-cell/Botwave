'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import DashboardNav from '@/components/layout/DashboardNav';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import FeatureToggle from '@/components/ui/FeatureToggle';
import SessionCard from '@/components/ui/SessionCard';
import BotStatus from '@/components/ui/BotStatus';

const features = [
  { id: 'sticker', name: 'STICKER MAKER', description: 'Convert images to stickers', icon: '🎴' },
  { id: 'ai_chat', name: 'AI CHAT REPLY', description: 'Intelligent AI responses', icon: '🤖' },
  { id: 'downloader', name: 'MEDIA DOWNLOADER', description: 'Download from YT, TT, IG', icon: '📥' },
  { id: 'welcome', name: 'WELCOME BOT', description: 'Auto greet new members', icon: '👋' },
  { id: 'anti_spam', name: 'ANTI-SPAM', description: 'Block spam and floods', icon: '🛡️' },
  { id: 'games', name: 'MINI GAMES', description: 'Trivia, Hangman, etc', icon: '🎮' },
  { id: 'polls', name: 'POLLS & LEADERBOARD', description: 'Create polls and track scores', icon: '📊' },
  { id: 'tools', name: 'SMART TOOLS', description: 'Weather, jokes, horoscope', icon: '🌤️' },
  { id: 'auto_reply', name: 'AUTO REPLY', description: 'Set custom auto responses', icon: '💬' },
];

export default function DashboardPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);

  const toggleFeature = (featureId: string) => {
    setActiveFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSessionConnect = () => {
    setShowQR(true);
  };

  return (
    <main className="min-h-screen bg-dark relative">
      <canvas id="bg-canvas" className="fixed inset-0 z-0 pointer-events-none" />

      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[4px] text-green">// SYSTEM ACTIVE</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            CONTROL <span className="text-green">PANEL</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Manage your WhatsApp sessions and bot features
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

              <h2 className="font-display text-sm tracking-[3px] text-green mb-6">
                SESSIONS
              </h2>

              <div className="space-y-4">
                <SessionCard
                  name="Personal Number"
                  phone="+1 234 567 8900"
                  status="connected"
                  lastActive="2 minutes ago"
                  onConnect={handleSessionConnect}
                />

                <button className="w-full border-2 border-dashed border-green/20 p-4 text-center font-mono text-xs text-[#5a9a7a] hover:border-green/40 hover:text-green transition-all tracking-[2px]">
                  + ADD NEW SESSION
                </button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

              <h2 className="font-display text-sm tracking-[3px] text-green mb-6">
                FEATURE TOGGLES
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <FeatureToggle
                    key={feature.id}
                    feature={feature}
                    enabled={activeFeatures.includes(feature.id)}
                    onToggle={() => toggleFeature(feature.id)}
                    index={index}
                  />
                ))}
              </div>
            </motion.section>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <BotStatus isActive={true} sessionCount={1} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

              <h2 className="font-display text-sm tracking-[3px] text-green mb-6">
                QUICK STATS
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">MESSAGES</span>
                  <span className="font-display text-xl text-green">1,247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">COMMANDS</span>
                  <span className="font-display text-xl text-green">89</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">UPTIME</span>
                  <span className="font-display text-xl text-cyan">99.9%</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

              <h2 className="font-display text-sm tracking-[3px] text-green mb-6">
                COMMANDS
              </h2>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex gap-2">
                  <span className="text-cyan">#sticker</span>
                  <span className="text-[#5a9a7a]">Create sticker</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan">#ai</span>
                  <span className="text-[#5a9a7a]">AI chat</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan">#weather</span>
                  <span className="text-[#5a9a7a]">Get forecast</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan">#play</span>
                  <span className="text-[#5a9a7a]">Start game</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan">#poll</span>
                  <span className="text-[#5a9a7a]">Create poll</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showQR && <QRCodeDisplay onClose={() => setShowQR(false)} />}

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const canvas = document.getElementById('bg-canvas');
            const ctx = canvas.getContext('2d');
            let W, H, particles = [];
            function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
            function Particle() {
              this.x = Math.random() * W; this.y = Math.random() * H;
              this.vx = (Math.random() - 0.5) * 0.4; this.vy = (Math.random() - 0.5) * 0.4;
              this.r = Math.random() * 1.5; this.alpha = Math.random() * 0.4 + 0.1;
            }
            Particle.prototype.update = function() {
              this.x += this.vx; this.y += this.vy;
              if (this.x < 0) this.x = W; if (this.x > W) this.x = 0;
              if (this.y < 0) this.y = H; if (this.y > H) this.y = 0;
            };
            function initParticles() { particles = []; const count = Math.floor((W * H) / 8000); for (let i = 0; i < count; i++) particles.push(new Particle()); }
            function drawParticles() {
              ctx.clearRect(0, 0, W, H);
              ctx.strokeStyle = 'rgba(0,255,136,0.04)'; ctx.lineWidth = 1;
              for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
              for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
              for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                  const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  if (dist < 120) { ctx.strokeStyle = 'rgba(0,255,136,' + (0.08 * (1 - dist/120)) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); }
                }
              }
              particles.forEach(p => { p.update(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,255,136,' + p.alpha + ')'; ctx.fill(); });
              requestAnimationFrame(drawParticles);
            }
            resize(); initParticles(); drawParticles(); window.addEventListener('resize', () => { resize(); initParticles(); });
          `,
        }}
      />
    </main>
  );
}