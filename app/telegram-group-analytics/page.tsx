import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Telegram Group Analytics (2026) — Track Members, Messages & Growth | BotWave',
  description: 'Free Telegram group analytics dashboard. Track member growth, message activity, active users, command usage, and engagement trends. Visualize your community health in real time.',
  keywords: [
    'telegram group analytics',
    'telegram group stats',
    'telegram member tracker',
    'telegram group growth',
    'telegram activity tracker',
    'telegram group insights',
    'telegram analytics bot',
    'telegram group metrics',
  ],
  openGraph: {
    title: 'Telegram Group Analytics (2026) — Track Members, Messages & Growth | BotWave',
    description: 'Free Telegram analytics: member growth, message activity, active users, engagement trends.',
    url: 'https://www.botwave.online/telegram-group-analytics',
    type: 'website',
    images: [{ url: '/api/og?title=Telegram+Group+Analytics+2026', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/telegram-group-analytics',
  },
};

const metrics = [
  { icon: '📊', title: 'Message Volume', desc: 'Track total messages per day, week, and month. Spot trends in group activity and identify peak hours.' },
  { icon: '👥', title: 'Member Growth', desc: 'Monitor joins, leaves, and net growth. See which days attract the most new members.' },
  { icon: '🏆', title: 'Active Users', desc: 'Identify your most active contributors. See who posts the most, who triggers commands, and engagement scores.' },
  { icon: '⚡', title: 'Command Usage', desc: 'Track which bot commands are used most. Optimize your bot features based on actual usage data.' },
  { icon: '📈', title: 'Engagement Rate', desc: 'Measure the percentage of members who actively participate. Compare engagement across different time periods.' },
  { icon: '🕐', title: 'Activity Heatmap', desc: 'See when your group is most active. Plan announcements and events for maximum visibility.' },
];

const dashboardFeatures = [
  { title: 'Real-Time Dashboard', desc: 'All metrics update in real time. No need to manually export data or wait for reports.' },
  { title: 'Historical Trends', desc: 'View data over custom date ranges — last 7 days, 30 days, or all time. Spot long-term patterns.' },
  { title: 'Per-Group Breakdown', desc: 'If you manage multiple groups, see analytics for each group separately or combined.' },
  { title: 'Leaderboard', desc: 'Built-in leaderboard ranks members by messages, commands used, and overall activity score.' },
  { title: 'Export Data', desc: 'Export analytics data as CSV or JSON for external analysis or reporting.' },
  { title: 'No Coding Needed', desc: 'Everything is accessible from a web dashboard. Add the bot, and analytics tracking starts automatically.' },
];

export default function TelegramGroupAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-mono tracking-wide mb-6">
            GROUP ANALYTICS
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Telegram Group Analytics<br />You Can Actually Use
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Track member growth, message activity, engagement trends, and leaderboard rankings
            from a real-time web dashboard. Free for all BotWave users.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
            >
              Start Tracking Free
            </Link>
            <Link
              href="/dashboard/analytics"
              className="px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            What You Can Track
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Everything you need to understand your Telegram community&apos;s health.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map(m => (
              <div key={m.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{m.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{m.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Features */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Dashboard Features
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            A web dashboard built for group admins who want data, not complexity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardFeatures.map(f => (
              <div key={f.title} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Connect Your Bot', desc: 'Add your Telegram bot to BotWave and make it an admin in your group.' },
              { step: '2', title: 'Data Starts Flowing', desc: 'The bot begins tracking messages, members, and commands automatically.' },
              { step: '3', title: 'View Your Dashboard', desc: 'Open the analytics page to see real-time charts, trends, and leaderboards.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            BotWave vs Other Analytics Tools
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-primary)] font-bold">Feature</th>
                  <th className="text-center py-3 px-4 text-purple-400 font-bold">BotWave</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-bold">Combot</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-bold">ChatStats</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                {[
                  ['Free tier', 'Unlimited', 'Limited', 'Limited'],
                  ['Real-time dashboard', 'Yes', 'Delayed', 'No'],
                  ['Member leaderboard', 'Yes', 'Paid', 'Yes'],
                  ['Command tracking', 'Yes', 'No', 'No'],
                  ['Multi-platform (WhatsApp)', 'Yes', 'No', 'No'],
                  ['Auto-reply + moderation', 'Included', 'Separate', 'No'],
                  ['No coding needed', 'Yes', 'Yes', 'Partial'],
                ].map(([feature, botwave, combot, chatstats]) => (
                  <tr key={feature} className="border-b border-[var(--border)]">
                    <td className="py-3 px-4 text-[var(--text-primary)]">{feature}</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-medium">{botwave}</td>
                    <td className="py-3 px-4 text-center">{combot}</td>
                    <td className="py-3 px-4 text-center">{chatstats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Understand Your Telegram Community
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Start tracking group analytics today. Free, real-time, and no coding required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="inline-block px-8 py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/telegram-bot-for-groups"
              className="inline-block px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Group Management
            </Link>
            <Link
              href="/telegram-auto-reply"
              className="inline-block px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Auto-Reply
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
