import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const supportGroups = [
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
    description: 'Share your bot-building tips, automation stories, or feature ideas with the BotWave community.',
    href: '/guest-posts',
    icon: '✍️',
    cta: 'Write a Post',
  },
  {
    title: 'Feature Requests',
    description: 'Suggest new features or vote on ideas from other users. Help shape the future of BotWave.',
    href: '/feature-suggestions',
    icon: '💡',
    cta: 'Suggest a Feature',
  },
  {
    title: 'Community Commands',
    description: 'Discover automations shared by other users. Copy and customize them for your own groups.',
    href: '/community-commands',
    icon: '⚡',
    cta: 'Browse Commands',
  },
  {
    title: 'Changelog',
    description: "See what we have shipped recently. New features, improvements, and bug fixes.",
    href: '/changelog',
    icon: '📋',
    cta: 'View Changelog',
  },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50',
  blue: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50',
  violet: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/50',
};

const ctaColorMap: Record<string, string> = {
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
};

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">BotWave Community</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Join thousands of group admins, creators, and builders who use BotWave to automate their Telegram communities.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Support Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {supportGroups.map(g => (
              <div key={g.name} className={`p-6 rounded-2xl border ${colorMap[g.color]} transition-colors`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{g.icon}</span>
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full">{g.members} members</span>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{g.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{g.description}</p>
                <a
                  href={g.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex w-full justify-center py-2 rounded-lg text-white text-sm font-semibold transition-colors ${ctaColorMap[g.color]}`}
                >
                  Join Group →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Community Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {communityLinks.map(cl => (
              <Link key={cl.title} href={cl.href} className="group p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors flex gap-4">
                <span className="text-2xl shrink-0">{cl.icon}</span>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1 group-hover:text-blue-500 transition-colors">{cl.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{cl.description}</p>
                  <span className="text-sm text-blue-500 font-medium">{cl.cta} →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
