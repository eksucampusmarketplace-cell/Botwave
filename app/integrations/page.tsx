import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Integrations - Connect BotWave with Your Favourite Tools | BotWave',
  description: 'BotWave integrates with OpenAI, Google Gemini, TikTok, YouTube, Instagram, and more. See all supported platforms and services.',
  keywords: ['botwave integrations', 'whatsapp bot integrations', 'whatsapp openai', 'whatsapp youtube bot', 'whatsapp tiktok bot', 'bot platform integrations'],
  openGraph: {
    title: 'BotWave Integrations',
    description: 'Connect with OpenAI, Gemini, TikTok, YouTube, Instagram, and more. See all supported services.',
    url: 'https://www.botwave.online/integrations',
    type: 'website',
  },
  alternates: { canonical: '/integrations' },
};

const integrations = [
  {
    category: 'AI and Language',
    items: [
      { name: 'Google Gemini', description: 'Powers the AI chat, document analysis, image recognition, and intelligent auto-replies. Built in and free.', status: 'live', icon: '🧠' },
      { name: 'OpenAI (GPT)', description: 'Optional AI provider for users who prefer GPT models. Bring your own API key for enhanced responses.', status: 'live', icon: '🤖' },
      { name: 'Google Translate', description: 'Translate messages between 100+ languages directly in chat with the !translate command.', status: 'live', icon: '🌍' },
      { name: 'OCR (Tesseract)', description: 'Extract text from images. Reply to any image with !ocr to read printed or handwritten text.', status: 'live', icon: '📝' },
    ],
  },
  {
    category: 'Media and Content',
    items: [
      { name: 'TikTok', description: 'Download TikTok videos without watermark directly into WhatsApp. Just paste the link.', status: 'live', icon: '🎵' },
      { name: 'YouTube', description: 'Download YouTube videos and music. Supports video and audio-only downloads.', status: 'live', icon: '📺' },
      { name: 'Instagram', description: 'Download Reels, posts, and stories from Instagram directly into your chat.', status: 'live', icon: '📸' },
      { name: 'Spotify', description: 'Search and preview tracks. Find song info and share music recommendations.', status: 'live', icon: '🎧' },
    ],
  },
  {
    category: 'Platforms',
    items: [
      { name: 'WhatsApp (Baileys)', description: 'Core platform. Connect via QR code scan. Full message handling, media, groups, and session management.', status: 'live', icon: '💬' },
      { name: 'Telegram Bot API', description: 'Official Telegram bot support. Zero ban risk. Full group management, anti-spam, CAPTCHA, and federation.', status: 'live', icon: '✈️' },
      { name: 'Telegram Userbot (GramJS)', description: 'Connect your real Telegram account. Run automation from your personal account with MTProto.', status: 'live', icon: '👤' },
    ],
  },
  {
    category: 'Infrastructure',
    items: [
      { name: 'Supabase', description: 'Database, authentication, and real-time subscriptions. Powers user accounts, sessions, and bot state.', status: 'live', icon: '🗄️' },
      { name: 'Redis', description: 'In-memory caching for rate limiting, session state, and high-speed command processing.', status: 'live', icon: '⚡' },
      { name: 'Sharp (Image Processing)', description: 'Server-side image manipulation for sticker creation, resizing, format conversion, and watermark removal.', status: 'live', icon: '🖼️' },
    ],
  },
  {
    category: 'Coming Soon',
    items: [
      { name: 'Google Sheets', description: 'Export group analytics, member lists, and command logs to Google Sheets automatically.', status: 'soon', icon: '📊' },
      { name: 'Notion', description: 'Sync group notes, meeting summaries, and digests directly to your Notion workspace.', status: 'soon', icon: '📓' },
      { name: 'Webhooks', description: 'Send real-time notifications to any URL when specific events happen in your groups.', status: 'soon', icon: '🔗' },
      { name: 'Zapier', description: 'Connect BotWave to 5000+ apps through Zapier automations. Trigger workflows from WhatsApp messages.', status: 'soon', icon: '⚙️' },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Integrations</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Integrations</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            BotWave connects to the tools and platforms you already use. AI, media platforms, messaging apps, and productivity tools all work together from one dashboard.
          </p>

          {integrations.map(group => (
            <div key={group.category} className="mb-14">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
                {group.category}
                {group.category === 'Coming Soon' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Planned</span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map(item => (
                  <div
                    key={item.name}
                    className="flex items-start gap-4 p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                  >
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{item.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.status === 'live'
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {item.status === 'live' ? 'Live' : 'Soon'}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-500/20 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Want an integration we do not support yet?</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
              We are actively building new integrations. Let us know what tools you want connected to BotWave.
            </p>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Get started with BotWave
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
