'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import FeatureToggle from '@/components/ui/FeatureToggle';
import SessionCard from '@/components/ui/SessionCard';
import BotStatus from '@/components/ui/BotStatus';

import { createClient } from '@/lib/supabase/client';

const defaultFeatures = [
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
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', phone: '' });

  const activeSessionRef = useRef<any>(null);

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sessRes = await fetch('/api/bot/sessions');
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.data);
        
        const currentActive = activeSessionRef.current;
        if (currentActive) {
          const updated = sessData.data.find((s: any) => s.id === currentActive.id);
          if (updated) {
            setActiveSession(updated);
            activeSessionRef.current = updated;
          }
        }
      }

      const featRes = await fetch('/api/bot/features');
      const featData = await featRes.json();
      if (featData.success) {
        setActiveFeatures(featData.data.filter((f: any) => f.enabled).map((f: any) => f.feature_name));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      fetchDashboardData();
    };
    checkUser();
  }, [fetchDashboardData]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQR && activeSessionRef.current) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/bot/sessions');
          const data = await res.json();
          if (data.success) {
            setSessions(data.data);
            const refreshed = data.data.find((s: any) => s.id === activeSessionRef.current?.id);
            if (refreshed) {
              setActiveSession(refreshed);
              activeSessionRef.current = refreshed;
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showQR]);

  const toggleFeature = async (featureId: string) => {
    const isEnabled = activeFeatures.includes(featureId);
    const newEnabled = !isEnabled;

    if (sessions.length === 0) {
      alert('Please create a session first');
      return;
    }

    // Update locally
    setActiveFeatures((prev) =>
      isEnabled ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );

    // Update on server for the first session (as a simple default)
    try {
      await fetch('/api/bot/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessions[0].id,
          featureName: featureId,
          enabled: newEnabled,
        }),
      });
    } catch (err) {
      console.error('Error updating feature:', err);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: newSession.name,
          phoneNumber: newSession.phone,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewSession({ name: '', phone: '' });
        fetchDashboardData();
        setActiveSession(data.data);
        setShowQR(true);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating session:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = (session: any) => {
    setActiveSession(session);
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
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
            <span className="font-mono text-xs tracking-[4px] text-green">{"// SYSTEM ACTIVE"}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            CONTROL <span className="text-green">PANEL</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Manage your WhatsApp sessions and bot features
          </p>
        </motion.div>

        <div className="bg-card border border-cyan/20 p-4 mb-6">
          <p className="font-mono text-xs text-cyan">
            Your bot runs 24/7 on BotWave&apos;s servers. You do not need to keep this app open or keep your phone on. Your session stays active as long as you remain connected.
          </p>
        </div>

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
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    name={session.session_name}
                    phone={session.phone_number}
                    status={session.state === 'qr_pending' ? 'pending' : session.state}
                    lastActive={session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                    onConnect={() => handleConnect(session)}
                  />
                ))}

                <button 
                  onClick={() => setShowAddModal(true)}
                  className="w-full border-2 border-dashed border-green/20 p-4 text-center font-mono text-xs text-[#5a9a7a] hover:border-green/40 hover:text-green transition-all tracking-[2px]"
                >
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
                {defaultFeatures.map((feature, index) => (
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
              <BotStatus isActive={sessions.some(s => s.state === 'active')} sessionCount={sessions.length} />
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
                  <span className="font-display text-xl text-green">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">COMMANDS</span>
                  <span className="font-display text-xl text-green">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">UPTIME</span>
                  <span className="font-display text-xl text-cyan">0%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/90 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-green/20 p-8 max-w-md w-full relative"
          >
            <h2 className="font-display text-xl text-green mb-6 tracking-[2px]">NEW SESSION</h2>
            <form onSubmit={handleAddSession} className="space-y-4">
              {error && (
                <div className="bg-red-400/10 border border-red-400/50 p-3 mb-4">
                  <p className="font-mono text-[10px] text-red-400 tracking-[1px] uppercase">
                    Error: {error}
                  </p>
                </div>
              )}
              <div>
                <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">SESSION NAME</label>
                <input
                  type="text"
                  required
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                  placeholder="e.g. Personal"
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">PHONE NUMBER</label>
                <input
                  type="text"
                  required
                  value={newSession.phone}
                  onChange={(e) => setNewSession({ ...newSession, phone: e.target.value })}
                  className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                  placeholder="+1234567890"
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-red-400/50 text-red-400 p-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10 disabled:opacity-50"
                  disabled={isCreating}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isCreating}
                >
                  {isCreating ? 'CREATING...' : 'CREATE'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showQR && (
        <QRCodeDisplay 
          onClose={() => {
            setShowQR(false);
            fetchDashboardData();
          }} 
          qrCode={activeSession?.qr_code}
          qrGeneratedAt={activeSession?.qr_generated_at}
          pairingCode={activeSession?.pairing_code}
        />
      )}

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const canvas = document.getElementById('bg-canvas');
            if (canvas) {
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
            }
          `,
        }}
      />
    </main>
  );
}
