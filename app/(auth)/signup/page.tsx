'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-dark flex items-center justify-center px-4 relative overflow-hidden">
      <canvas id="bg-canvas" className="fixed inset-0 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <Link href="/" className="font-display text-3xl font-black text-green tracking-[4px] drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            BOT<span className="text-cyan">WAVE</span>
          </Link>
          <p className="font-mono text-xs text-[#5a9a7a] tracking-[3px] mt-4">
            // CREATE YOUR ACCOUNT
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2 border-green/30" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-green/30" />

          <h2 className="font-display text-lg font-bold text-white tracking-[3px] mb-8 text-center">
            SIGN UP
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-400/30 text-red-400 font-mono text-xs p-3 mb-6"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                USERNAME
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                placeholder="cyber_user"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="font-mono text-xs text-[#5a9a7a] tracking-[2px] block mb-2">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full bg-dark border border-green/20 px-4 py-3 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full font-display text-xs tracking-[3px] px-6 py-4 bg-green text-dark font-bold clip-path-button hover:bg-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </motion.button>
          </div>

          <div className="mt-8 text-center">
            <p className="font-mono text-xs text-[#5a9a7a]">
              ALREADY HAVE AN ACCOUNT?{' '}
              <Link href="/login" className="text-green hover:text-cyan transition-colors">
                LOGIN
              </Link>
            </p>
          </div>
        </form>

        <p className="text-center mt-8 font-mono text-[11px] text-[#3a7a5a] tracking-[2px]">
          <Link href="/" className="hover:text-green transition-colors">
            ← BACK TO HOME
          </Link>
        </p>
      </motion.div>

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