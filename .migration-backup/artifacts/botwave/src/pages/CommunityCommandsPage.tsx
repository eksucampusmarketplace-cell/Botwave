import { useState } from 'react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface CommunityCommand {
  id: string;
  title: string;
  description: string;
  author: string;
  platform: 'Telegram' | 'Both';
  category: string;
  commands: string[];
  setup: string;
  likes: number;
  verified: boolean;
}

const communityCommands: CommunityCommand[] = [
  {
    id: 'welcome-quiz',
    title: 'Welcome Quiz Gate',
    description: 'New members must answer a trivia question within 60 seconds or get removed. Stops spam bots cold.',
    author: 'GroupAdmin_NG',
    platform: 'Telegram',
    category: 'Moderation',
    commands: ['!welcome-quiz on', '!welcome-quiz set "What is 2+2?"', '!welcome-quiz timeout 60'],
    setup: 'Enable in Dashboard → Moderation → Welcome Quiz. Or use the commands above in your group.',
    likes: 142,
    verified: true,
  },
  {
    id: 'daily-motivations',
    title: 'Daily Motivation Bot',
    description: 'Send an AI-generated motivational quote every morning at 7 AM to your group. Keeps members engaged.',
    author: 'MotivatorKing',
    platform: 'Both',
    category: 'Engagement',
    commands: ['!schedule daily 07:00 "!quote motivation"'],
    setup: 'Paste the command into your group chat. Change 07:00 to your preferred time.',
    likes: 89,
    verified: true,
  },
  {
    id: 'crypto-price-alert',
    title: 'Crypto Price Alert',
    description: 'Get hourly BTC and ETH price updates posted to your trading group automatically.',
    author: 'CryptoTrader_ZA',
    platform: 'Telegram',
    category: 'Finance',
    commands: ['!schedule hourly "!crypto BTC ETH"'],
    setup: 'Enable the !crypto command in your dashboard, then schedule it with the command above.',
    likes: 67,
    verified: false,
  },
  {
    id: 'school-attendance',
    title: 'School Attendance Poll',
    description: 'Auto-send a weekly attendance poll on Monday mornings for class groups.',
    author: 'SchoolAdmin',
    platform: 'Telegram',
    category: 'Education',
    commands: ['!schedule weekly monday 08:00 "!poll Are you in class today? Yes|No|Late"'],
    setup: 'Paste into group chat as admin. The bot will send the poll every Monday at 8 AM.',
    likes: 54,
    verified: true,
  },
];

const categories = ['All', 'Moderation', 'Engagement', 'Finance', 'Education', 'Business'];

export default function CommunityCommandsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSubmit, setShowSubmit] = useState(false);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const filtered = activeCategory === 'All' ? communityCommands : communityCommands.filter(c => c.category === activeCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setDescription('');
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Community Commands</span>
          </nav>

          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-3">Community Commands</h1>
              <p className="text-lg text-[var(--text-secondary)] max-w-xl">
                Automations shared by the BotWave community. Copy a setup, paste it into your group, and it works.
              </p>
            </div>
            <button
              onClick={() => setShowSubmit(!showSubmit)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shrink-0"
            >
              + Share Your Setup
            </button>
          </div>

          {showSubmit && (
            <div className="mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-blue-500/20">
              {submitted ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">🎉</div>
                  <p className="text-emerald-500 font-semibold">Submitted! Our team will review your setup.</p>
                  <button onClick={() => { setSubmitted(false); setShowSubmit(false); }} className="mt-3 text-sm text-blue-500 hover:underline">Close</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h3 className="font-bold text-[var(--text-primary)] mb-3">Share your automation setup</h3>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your setup: what it does, which commands to use, and how to set it up..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 resize-none mb-3"
                  />
                  <div className="flex gap-3">
                    <button type="submit" disabled={description.trim().length < 10} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
                      Submit
                    </button>
                    <button type="button" onClick={() => setShowSubmit(false)} className="px-5 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-secondary)] hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(cmd => (
              <article key={cmd.id} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">{cmd.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]">{cmd.platform}</span>
                    {cmd.verified && <span className="text-xs text-emerald-500">✓ Verified</span>}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">❤ {cmd.likes}</span>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{cmd.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{cmd.description}</p>
                <div className="bg-[var(--bg)] rounded-lg p-3 mb-3 font-mono text-xs space-y-1">
                  {cmd.commands.map((c, i) => (
                    <div key={i} className="text-emerald-400">{c}</div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Setup: {cmd.setup}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">By @{cmd.author}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
