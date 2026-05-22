import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Community, Support Groups & Guest Posts',
  description: 'Join the BotWave community. WhatsApp and Telegram support groups, guest posts, updates channel, and more. Get help, share tips, and connect with other users.',
  keywords: ['botwave community', 'whatsapp bot support group', 'telegram bot community', 'botwave help', 'botwave guest posts'],
  openGraph: {
    title: 'BotWave Community',
    description: 'Support groups, guest posts, and community resources for BotWave users.',
    url: 'https://www.botwave.online/community',
    type: 'website',
  },
  alternates: { canonical: '/community' },
};

const supportGroups = [
  {
    platform: 'WhatsApp',
    name: 'WhatsApp Support Group',
    description: 'Get real-time help from the BotWave team and community members. Ask questions, report issues, and share tips.',
    link: 'https://chat.whatsapp.com/GMyXXv1hhnbI7JcCF5sNEf',
    icon: '💬',
    color: 'green',
    members: '500+',
  },
  {
    platform: 'Telegram',
    name: 'Telegram Support Group',
    description: 'Chat with other BotWave users on Telegram. Get help with setup, commands, troubleshooting, and feature requests.',
    link: 'https://t.me/botwavegrp',
    icon: '✈️',
    color: 'blue',
    members: '300+',
  },
  {
    platform: 'Telegram',
    name: 'Telegram Updates Channel',
    description: 'Stay up to date with the latest BotWave releases, new commands, and platform announcements.',
    link: 'https://t.me/BotWaveUpdates',
    icon: '📢',
    color: 'violet',
    members: '1,000+',
  },
];

const communityLinks = [
  {
    title: 'Guest Posts',
    description: 'Share your bot-building tips, automation stories, or feature ideas with the BotWave community. Posts are auto-translated for readers worldwide.',
    href: '/guest-posts',
    icon: '✍️',
    cta: 'Write a Post',
  },
  {
    title: 'Feature Requests',
    description: 'Suggest new features or vote on ideas from other users. Help shape the future of BotWave.',
    href: '/features',
    icon: '💡',
    cta: 'Explore Features',
  },
  {
    title: 'Blog',
    description: 'Read guides, tutorials, and articles about WhatsApp and Telegram bot automation.',
    href: '/blog',
    icon: '📖',
    cta: 'Read Blog',
  },
  {
    title: 'Documentation',
    description: 'Complete documentation for all BotWave commands, setup guides, and API references.',
    href: '/docs',
    icon: '📚',
    cta: 'View Docs',
  },
];

const colorMap: Record<string, string> = {
  green: 'border-green-400/50 hover:border-green-400 bg-green-500/5',
  blue: 'border-blue-400/50 hover:border-blue-400 bg-blue-500/5',
  violet: 'border-violet-400/50 hover:border-violet-400 bg-violet-500/5',
};

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Community</span>
          </nav>

          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono tracking-wide mb-6">
              COMMUNITY
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
              Join the BotWave Community
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Connect with other users, get support, share your stories, and help shape the future of BotWave.
            </p>
          </div>

          {/* Support Groups */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Support Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {supportGroups.map((group) => (
                <a
                  key={group.link}
                  href={group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block p-8 rounded-2xl border transition-all hover:-translate-y-1 ${colorMap[group.color]}`}
                >
                  <div className="text-4xl mb-4">{group.icon}</div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    {group.platform}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{group.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{group.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{group.members} members</span>
                    <span className="text-sm font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                      Join &rarr;
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Community Resources */}
          <section className="mb-20">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Community Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-all hover:-translate-y-1"
                >
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{item.description}</p>
                  <span className="text-sm font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform inline-block">
                    {item.cta} &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-16 px-6 bg-gradient-to-br from-blue-600 to-violet-600 rounded-3xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Join thousands of users automating their WhatsApp and Telegram groups with BotWave.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/signup"
                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Get Started Free &rarr;
              </Link>
              <Link
                href="/guest-posts"
                className="px-8 py-4 bg-white/20 text-white font-bold rounded-xl border border-white/30 transition-all hover:bg-white/30 hover:-translate-y-0.5"
              >
                Write a Guest Post
              </Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
