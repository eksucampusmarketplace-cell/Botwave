import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Security - How BotWave Protects Your Account | BotWave',
  description: 'BotWave security overview. Anti-Ban Engine, session isolation, rate limiting, and account protection. Your WhatsApp runs from your own device IP.',
  keywords: ['botwave security', 'whatsapp bot security', 'anti ban whatsapp', 'botwave anti ban', 'whatsapp bot safe'],
  openGraph: {
    title: 'BotWave Security',
    description: 'How BotWave protects your WhatsApp and Telegram accounts.',
    url: 'https://www.botwave.online/security',
    type: 'website',
  },
  alternates: { canonical: '/security' },
};

const layers = [
  {
    name: 'SafeConnect Layer',
    tagline: 'Your device, your IP',
    description: 'Your WhatsApp session runs from your own device via QR code. You are not sharing a server IP with hundreds of other bot users. This is the single biggest factor in avoiding bans because WhatsApp flags accounts that share IPs with known automation traffic.',
    color: 'green',
  },
  {
    name: 'Anti-Ban Engine',
    tagline: '7-day warmup + human-like behavior',
    description: 'New sessions start with 15 messages per day and scale to 200 over 7 days. The bot adds random delays (1-5s per message), sends typing indicators, reads messages before replying, and occasionally ignores messages entirely. 50-100 response variations per command ensure no two messages are identical.',
    color: 'blue',
  },
  {
    name: 'Community Shield',
    tagline: 'Anti-spam and flood protection',
    description: 'Detects spam floods (5+ messages in 10 seconds triggers a warning), rate limits per-session (10 msgs/min) and per-user (20 msgs/min), and uses an LRU buffer to never send the exact same message twice. Hard cap of 200 messages per day per session.',
    color: 'violet',
  },
  {
    name: 'Ghost Mode',
    tagline: 'Activity hours and stealth behavior',
    description: 'Between 12am and 6am, the bot responds slower and shorter, mimicking real sleep patterns. 15% of group messages are read but not responded to. 5% of the time, the bot takes a 15-30 second "distracted" pause before replying.',
    color: 'amber',
  },
  {
    name: 'Media Fingerprint Jittering',
    tagline: 'Every file is unique',
    description: 'Random bytes are appended to stickers and images so each file has a unique hash. Zero-width characters and punctuation variations ensure every text message has a unique byte fingerprint. WhatsApp cannot pattern-match these as bot-generated.',
    color: 'rose',
  },
];

const colorMap: Record<string, string> = {
  green: 'bg-green-500/10 border-green-500/20 text-green-500',
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-500',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Security</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Security at BotWave</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-4">
            How we protect your WhatsApp and Telegram accounts from bans, spam, and unauthorized access.
          </p>
          <p className="text-[var(--text-secondary)] mb-10">
            No bot platform can guarantee zero ban risk on WhatsApp. But BotWave has multiple layers of protection that significantly reduce the risk. Here is how each layer works.
          </p>

          <div className="space-y-6">
            {layers.map((layer, i) => (
              <div key={layer.name} className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-extrabold text-[var(--text-muted)]">{i + 1}</span>
                  <div>
                    <h2 className="font-bold text-[var(--text-primary)]">{layer.name}</h2>
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${colorMap[layer.color]}`}>{layer.tagline}</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{layer.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Honest disclaimer</h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              WhatsApp does not officially support consumer-account bots. Any automation tool carries some risk. BotWave reduces that risk significantly, but we cannot eliminate it entirely. If zero ban risk is critical for your use case, use the Telegram Bot platform instead (official API, zero risk).
            </p>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/privacy" className="px-5 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">Privacy Policy</Link>
            <Link href="/faq/how-anti-ban-works" className="px-5 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">Anti-Ban FAQ</Link>
            <Link href="/signup" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Get Started Free</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
