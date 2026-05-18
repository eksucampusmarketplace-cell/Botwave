import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Bot Templates - Ready-Made Setups for WhatsApp & Telegram | BotWave',
  description: 'Download prebuilt bot configurations for anti-spam, school moderation, business auto-reply, engagement games, and AI support. One-click setup for WhatsApp and Telegram groups.',
  keywords: ['bot templates', 'whatsapp bot templates', 'telegram bot setup template', 'anti-spam template', 'auto reply template', 'group moderation template'],
  openGraph: {
    title: 'BotWave Templates - Ready-Made Bot Setups',
    description: 'Prebuilt configurations for anti-spam, moderation, business auto-reply, and more. One-click setup.',
    url: 'https://www.botwave.online/templates',
    type: 'website',
  },
  alternates: { canonical: '/templates' },
};

const templates = [
  {
    slug: 'anti-spam',
    title: 'Anti-Spam Shield',
    description: 'Block spam, links, and flood messages automatically. Perfect for groups getting bombarded with promotional content and chain messages.',
    category: 'Protection',
    icon: '🛡️',
    features: ['Flood detection (5 msgs/10s)', 'Link blocking with whitelist', 'Auto-warn repeat offenders', '3 warnings = auto-mute', 'Bad word filter'],
    platform: 'WhatsApp & Telegram',
    setupTime: '2 minutes',
  },
  {
    slug: 'school-moderation',
    title: 'School Group Manager',
    description: 'Keep class groups focused on academics. Auto-moderate off-topic messages, schedule announcements, and track attendance with polls.',
    category: 'Education',
    icon: '🎓',
    features: ['Welcome message with rules', 'Off-topic content filter', 'Scheduled announcements', 'Trivia quizzes for revision', 'Admin-only hours'],
    platform: 'WhatsApp & Telegram',
    setupTime: '3 minutes',
  },
  {
    slug: 'business-auto-reply',
    title: 'Business Auto-Reply',
    description: 'Respond to customers instantly. Set up keyword triggers for common questions like pricing, shipping, and availability.',
    category: 'Business',
    icon: '💼',
    features: ['Keyword-triggered replies', 'Business hours detection', 'AI fallback for unknown questions', 'Order confirmation templates', 'Away message outside hours'],
    platform: 'WhatsApp',
    setupTime: '5 minutes',
  },
  {
    slug: 'engagement-games',
    title: 'Engagement and Games Pack',
    description: 'Keep your group active with trivia, polls, word games, and leaderboards. Reduces dead periods between content drops.',
    category: 'Engagement',
    icon: '🎮',
    features: ['Daily trivia questions', 'Weekly polls', 'Hangman and word chain', 'XP leaderboards', 'Achievement badges'],
    platform: 'WhatsApp & Telegram',
    setupTime: '2 minutes',
  },
  {
    slug: 'ai-support-assistant',
    title: 'AI Support Assistant',
    description: 'Let AI handle repetitive questions. The bot learns from your FAQ and responds intelligently to customer inquiries 24/7.',
    category: 'Business',
    icon: '🤖',
    features: ['AI-powered responses', 'Custom knowledge base', 'Escalation to human admin', 'Multi-language support', 'Conversation memory'],
    platform: 'WhatsApp & Telegram',
    setupTime: '5 minutes',
  },
  {
    slug: 'community-creator',
    title: 'Creator Community Pack',
    description: 'Manage multiple fan groups from one dashboard. Welcome new members, run engagement activities, and moderate across all groups simultaneously.',
    category: 'Creator',
    icon: '🎨',
    features: ['Multi-group management', 'Welcome sequences', 'Scheduled content drops', 'Fan polls and voting', 'Spam protection'],
    platform: 'WhatsApp & Telegram',
    setupTime: '4 minutes',
  },
  {
    slug: 'church-group',
    title: 'Church and Faith Group',
    description: 'Manage your church WhatsApp group with automated devotionals, prayer request collection, event reminders, and respectful moderation.',
    category: 'Community',
    icon: '⛪',
    features: ['Daily devotional messages', 'Prayer request collection', 'Event reminders', 'Respectful content filter', 'Member directory'],
    platform: 'WhatsApp',
    setupTime: '3 minutes',
  },
  {
    slug: 'crypto-community',
    title: 'Crypto and Trading Group',
    description: 'Run a professional trading community. Block scam links, verify members, share signals, and moderate discussions automatically.',
    category: 'Finance',
    icon: '📈',
    features: ['Scam link detection', 'New member verification', 'Signal formatting', 'Anti-raid protection', 'Admin-only announcements'],
    platform: 'WhatsApp & Telegram',
    setupTime: '4 minutes',
  },
];

const categories = [...new Set(templates.map(t => t.category))];

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Templates</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Bot Templates</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            Ready-made bot configurations for every use case. Pick a template, connect your account, and your bot is live in minutes. No coding needed.
          </p>

          {categories.map(category => (
            <div key={category} className="mb-16">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.filter(t => t.category === category).map(template => (
                  <div
                    key={template.slug}
                    className="group p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{template.icon}</span>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)]">{template.title}</h3>
                        <span className="text-xs text-[var(--text-muted)]">{template.platform}</span>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">{template.description}</p>
                    <ul className="space-y-1 mb-4">
                      {template.features.map((f, i) => (
                        <li key={i} className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">+</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                      <span className="text-xs text-[var(--text-muted)]">Setup: {template.setupTime}</span>
                      <Link href="/signup" className="text-xs font-medium text-blue-500 hover:underline">
                        Use template
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Need a custom template?</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
              Every group is different. Set up your bot with any combination of features from the dashboard. Mix and match commands, rules, and automations.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Start building your setup
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
