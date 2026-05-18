import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Features - Everything BotWave Can Do | BotWave',
  description: 'Explore all BotWave features organized by category. AI chat, moderation, media tools, games, automation, and more. 150+ commands across WhatsApp and Telegram.',
  keywords: ['botwave features', 'whatsapp bot features', 'telegram bot features', 'bot automation features', 'whatsapp group features'],
  openGraph: {
    title: 'BotWave Features',
    description: 'AI, moderation, media tools, games, automation. 150+ commands across WhatsApp and Telegram.',
    url: 'https://www.botwave.online/features',
    type: 'website',
  },
  alternates: { canonical: '/features' },
};

const clusters = [
  {
    slug: 'ai',
    title: 'AI and Intelligence',
    brandName: 'WaveAI',
    description: 'AI chat, auto-replies, document analysis, translation, image recognition, and group summarization. Powered by Google Gemini, free for all users.',
    color: 'purple',
    icon: '🧠',
    features: ['AI Chat (WaveAI)', 'Autopilot Auto-Replies', 'Group Digest / Summary', 'Document Scanner', 'Image Recognition', 'Smart Translation'],
  },
  {
    slug: 'moderation',
    title: 'Moderation and Protection',
    brandName: 'Community Shield',
    description: 'Anti-spam, flood detection, warning system, CAPTCHA, anti-raid, link blocking, and admin tools. Keep groups clean automatically.',
    color: 'red',
    icon: '🛡️',
    features: ['Anti-Spam Engine', 'Flood Detection', 'Warning System', 'CAPTCHA Verification', 'Anti-Raid Protection', 'Admin Controls'],
  },
  {
    slug: 'media',
    title: 'Media and Creative',
    brandName: 'Creative Suite',
    description: 'Sticker maker, video downloader, music download, logo generator, background remover, OCR, and status saver. Create and download inside your chat.',
    color: 'orange',
    icon: '🎨',
    features: ['Sticker Maker', 'Video Downloader', 'Music Download', 'Logo Generator', 'Background Remover', 'OCR Text Extraction'],
  },
];

const additionalFeatures = [
  { title: 'Games and Engagement', icon: '🎮', description: 'Trivia, hangman, word chain, polls, leaderboards, and XP systems to keep groups active.', link: '/commands' },
  { title: 'Anti-Ban Engine', icon: '🔒', description: 'Session warmup, message variation, human-like timing, presence simulation, and daily caps.', link: '/docs/anti-ban-system' },
  { title: 'SafeConnect Layer', icon: '📡', description: 'QR-based connection from your own device. Your IP, your session, no shared infrastructure.', link: '/docs/connect-whatsapp' },
  { title: 'Smart Session Recovery', icon: '🔄', description: 'Automatic reconnection with exponential backoff. Sessions survive container restarts and network drops.', link: '/docs/reconnecting' },
  { title: 'Ghost Mode Moderation', icon: '👻', description: 'Read-but-skip behavior where the bot occasionally ignores messages like a real person would.', link: '/docs/anti-ban-system' },
  { title: 'Multi-Platform Dashboard', icon: '📊', description: 'Manage WhatsApp Bot, Telegram Bot, and Telegram Userbot from one unified dashboard.', link: '/docs/getting-started' },
];

const colorMap: Record<string, string> = {
  purple: 'border-purple-400/50 hover:border-purple-400',
  red: 'border-red-400/50 hover:border-red-400',
  orange: 'border-orange-400/50 hover:border-orange-400',
};

const bgMap: Record<string, string> = {
  purple: 'bg-purple-500/10 text-purple-500',
  red: 'bg-red-500/10 text-red-500',
  orange: 'bg-orange-500/10 text-orange-500',
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Features</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Everything BotWave Does</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-16">
            150+ commands organized into feature clusters. AI intelligence, community protection, and creative media tools all working together from one platform.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
            {clusters.map(cluster => (
              <Link
                key={cluster.slug}
                href={`/features/${cluster.slug}`}
                className={`group block p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border transition-all hover:-translate-y-1 ${colorMap[cluster.color]}`}
              >
                <span className="text-4xl block mb-4">{cluster.icon}</span>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${bgMap[cluster.color]}`}>
                  {cluster.brandName}
                </span>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{cluster.title}</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{cluster.description}</p>
                <ul className="space-y-1">
                  {cluster.features.map((f, i) => (
                    <li key={i} className="text-xs text-[var(--text-muted)]">+ {f}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Core Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalFeatures.map((feat, i) => (
              <Link
                key={i}
                href={feat.link}
                className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
              >
                <span className="text-2xl block mb-2">{feat.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">{feat.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">{feat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
