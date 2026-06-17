import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const templates = [
  {
    slug: 'anti-spam',
    title: 'Anti-Spam Shield',
    description: 'Block spam, links, and flood messages automatically. Perfect for groups getting bombarded with promotional content.',
    category: 'Protection',
    icon: '🛡️',
    features: ['Flood detection (5 msgs/10s)', 'Link blocking with whitelist', 'Auto-warn repeat offenders', '3 warnings = auto-mute', 'Bad word filter'],
    platform: 'Telegram',
    setupTime: '2 minutes',
  },
  {
    slug: 'school-moderation',
    title: 'School Group Manager',
    description: 'Keep class groups focused on academics. Auto-moderate off-topic messages, schedule announcements, and track attendance.',
    category: 'Education',
    icon: '🎓',
    features: ['Welcome message with rules', 'Off-topic content filter', 'Scheduled announcements', 'Trivia quizzes for revision', 'Admin-only hours'],
    platform: 'Telegram',
    setupTime: '3 minutes',
  },
  {
    slug: 'business-auto-reply',
    title: 'Business Auto-Reply',
    description: 'Respond to customers instantly. Set up keyword triggers for common questions like pricing, shipping, and availability.',
    category: 'Business',
    icon: '💼',
    features: ['Keyword-triggered replies', 'Business hours detection', 'AI fallback for unknown questions', 'Order confirmation templates', 'Away message outside hours'],
    platform: 'Telegram',
    setupTime: '5 minutes',
  },
  {
    slug: 'engagement-games',
    title: 'Engagement and Games Pack',
    description: 'Keep your group active with trivia, polls, word games, and leaderboards.',
    category: 'Engagement',
    icon: '🎮',
    features: ['Daily trivia questions', 'Weekly polls', 'Hangman and word chain', 'XP leaderboards', 'Achievement badges'],
    platform: 'Telegram',
    setupTime: '2 minutes',
  },
  {
    slug: 'ai-support-assistant',
    title: 'AI Support Assistant',
    description: "Let AI handle repetitive questions. The bot learns from your FAQ and responds intelligently 24/7.",
    category: 'Business',
    icon: '🤖',
    features: ['AI-powered responses', 'Custom knowledge base', 'Escalation to human admin', 'Multi-language support', 'Conversation memory'],
    platform: 'Telegram',
    setupTime: '5 minutes',
  },
  {
    slug: 'community-creator',
    title: 'Creator Community Pack',
    description: 'Manage multiple fan groups from one dashboard. Welcome new members, run engagement activities, and moderate simultaneously.',
    category: 'Creator',
    icon: '🎨',
    features: ['Multi-group management', 'Welcome sequences', 'Scheduled content drops', 'Fan polls and voting', 'Spam protection'],
    platform: 'Telegram',
    setupTime: '4 minutes',
  },
  {
    slug: 'church-group',
    title: 'Church and Faith Group',
    description: 'Manage your church Telegram group with automated devotionals, prayer request collection, and event reminders.',
    category: 'Community',
    icon: '⛪',
    features: ['Daily devotional messages', 'Prayer request collection', 'Event reminders', 'Respectful content filter', 'Member directory'],
    platform: 'Telegram',
    setupTime: '3 minutes',
  },
  {
    slug: 'crypto-community',
    title: 'Crypto and Trading Group',
    description: 'Run a professional trading community. Block scam links, verify members, share signals, and moderate discussions.',
    category: 'Finance',
    icon: '📈',
    features: ['Scam link detection', 'New member verification', 'Signal formatting', 'Anti-raid protection', 'Admin-only announcements'],
    platform: 'Telegram',
    setupTime: '4 minutes',
  },
];

const categoryColors: Record<string, string> = {
  Protection: 'bg-red-500/10 text-red-500',
  Education: 'bg-blue-500/10 text-blue-500',
  Business: 'bg-emerald-500/10 text-emerald-600',
  Engagement: 'bg-purple-500/10 text-purple-500',
  Creator: 'bg-pink-500/10 text-pink-500',
  Community: 'bg-yellow-500/10 text-yellow-600',
  Finance: 'bg-orange-500/10 text-orange-500',
};

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

          <div className="mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-4">
              Ready-made setups
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Bot Templates</h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Prebuilt bot configurations you can activate in minutes. Pick a template, connect your Telegram Bot, and it works.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(template => (
              <article
                key={template.slug}
                className="group p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[template.category] || 'bg-gray-500/10 text-gray-500'}`}>
                      {template.category}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-alt)] px-2 py-0.5 rounded-full">
                      ⏱ {template.setupTime}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">{template.title}</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{template.description}</p>

                <ul className="space-y-1 mb-5">
                  {template.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">{template.platform}</span>
                  <Link
                    href="/signup"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Use Template →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Can't find what you need?</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              All templates are fully customizable after activation. Mix and match features to build exactly what you need.
            </p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Start with a Blank Bot →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
