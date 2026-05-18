import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Changelog - Updates and Release Notes | BotWave',
  description: 'BotWave changelog. See the latest features, improvements, and bug fixes. Updated regularly.',
  keywords: ['botwave changelog', 'botwave updates', 'botwave release notes', 'botwave new features'],
  openGraph: {
    title: 'BotWave Changelog',
    description: 'Latest features, improvements, and fixes.',
    url: 'https://www.botwave.online/changelog',
    type: 'website',
  },
  alternates: { canonical: '/changelog' },
};

interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'feature' | 'improvement' | 'fix'; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '2.4.0',
    date: 'May 2026',
    changes: [
      { type: 'feature', text: 'Telegram Userbot support via GramJS (MTProto). Connect your real Telegram account.' },
      { type: 'feature', text: 'Command Gallery with searchable pages for all 150+ commands across 3 platforms' },
      { type: 'feature', text: 'Documentation section with step-by-step setup guides and troubleshooting' },
      { type: 'improvement', text: 'Userbot session state preserved during container restarts' },
      { type: 'fix', text: 'Fixed userbot entrypoint session sync using wrong DB state values' },
      { type: 'fix', text: 'Fixed graceful shutdown marking sessions as disconnected' },
    ],
  },
  {
    version: '2.3.0',
    date: 'May 2026',
    changes: [
      { type: 'feature', text: 'Telegram Bot support via official Bot API. Zero ban risk group management.' },
      { type: 'feature', text: '50+ Telegram bot commands: moderation, anti-spam, notes, filters, XP system' },
      { type: 'feature', text: 'Federation system for cross-group ban management' },
      { type: 'feature', text: 'CAPTCHA verification for new Telegram group members' },
      { type: 'improvement', text: 'Anti-raid detection for mass join attacks' },
      { type: 'improvement', text: 'Night mode for automatic group quiet hours' },
    ],
  },
  {
    version: '2.2.0',
    date: 'April 2026',
    changes: [
      { type: 'feature', text: 'AI-powered group digest/summary with !digest command' },
      { type: 'feature', text: 'Receipt/invoice scanner using AI vision (!scan)' },
      { type: 'feature', text: 'Logo generator with 45+ styles (!logo)' },
      { type: 'feature', text: 'Brand kit generator with multiple formats (!brandkit)' },
      { type: 'improvement', text: 'Improved sticker quality for videos and GIFs' },
      { type: 'fix', text: 'Fixed AI responses being cut off for long messages' },
    ],
  },
  {
    version: '2.1.0',
    date: 'March 2026',
    changes: [
      { type: 'feature', text: 'Music download command (!music) - search and send audio files' },
      { type: 'feature', text: 'Ghost mode (!ghost) - auto-deleting messages like Snapchat' },
      { type: 'feature', text: 'Command aliases (!alias) - create custom shortcuts' },
      { type: 'feature', text: 'Command chaining (!chain) - pipe commands together' },
      { type: 'feature', text: 'Group analytics (!spy) - activity stats and insights' },
      { type: 'improvement', text: 'Reduced bot response latency by 40%' },
    ],
  },
  {
    version: '2.0.0',
    date: 'February 2026',
    changes: [
      { type: 'feature', text: 'Complete rewrite with new architecture' },
      { type: 'feature', text: 'Advanced anti-ban system with session warmup and message variation' },
      { type: 'feature', text: 'AI chat powered by advanced language models' },
      { type: 'feature', text: '50+ WhatsApp commands including games, polls, and media tools' },
      { type: 'feature', text: 'User dashboard with session management' },
      { type: 'improvement', text: 'Naira pricing for Nigerian users' },
    ],
  },
  {
    version: '1.0.0',
    date: 'January 2026',
    changes: [
      { type: 'feature', text: 'Initial release of BotWave' },
      { type: 'feature', text: 'WhatsApp QR code connection' },
      { type: 'feature', text: 'Basic commands: sticker, ping, help, AI chat' },
      { type: 'feature', text: 'Anti-spam flood detection' },
    ],
  },
];

const typeStyles = {
  feature: { label: 'New', bg: 'bg-green-500/10 text-green-600 border-green-500/20' },
  improvement: { label: 'Improved', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  fix: { label: 'Fixed', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Changelog</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Changelog</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            {"What's new in BotWave. Features, improvements, and fixes."}
          </p>

          <div className="space-y-12">
            {changelog.map(entry => (
              <div key={entry.version} className="relative pl-8 border-l-2 border-[var(--border)]">
                <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-blue-500 border-4 border-[var(--bg)]" />
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">v{entry.version}</h2>
                  <span className="text-sm text-[var(--text-muted)]">{entry.date}</span>
                </div>
                <ul className="space-y-3">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 mt-0.5 ${typeStyles[change.type].bg}`}>
                        {typeStyles[change.type].label}
                      </span>
                      <span className="text-[var(--text-secondary)] text-sm">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
