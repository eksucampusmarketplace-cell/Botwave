import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const studies = [
  {
    slug: 'school-group-spam',
    title: 'How a university class group cut spam to near zero',
    category: 'Education',
    problem: 'A 300-member university class group on Telegram was flooded with off-topic messages, memes, and promotional links. The 3 group admins spent 30+ minutes daily deleting spam and warning students.',
    solution: 'Enabled anti-spam protection, custom welcome message with rules, flood detection, and !warn system.',
    results: [
      'Spam messages dropped from 50+ per day to under 5',
      'Admin moderation time cut from 30 min to under 5 min daily',
      'Important announcements stayed visible longer',
      '3 warnings = auto-mute stopped repeat offenders immediately',
    ],
    commands: ['!welcome', '!warn', '!trivia', '!tagall'],
    timeframe: '2 weeks',
    icon: '🎓',
  },
  {
    slug: 'business-auto-reply',
    title: 'How an online vendor automated customer replies',
    category: 'Business',
    problem: "An online vendor selling clothes on Telegram received 100+ messages daily asking the same questions: pricing, shipping, availability. She was losing sales because she couldn't reply fast enough.",
    solution: 'Set up keyword auto-replies for "price", "shipping", "size", and AI fallback for unusual questions.',
    results: [
      'Response time went from 2-4 hours to under 10 seconds',
      'Saved 3+ hours of manual messaging daily',
      'Sales conversion improved because customers got instant answers',
      'AI handled edge-case questions without human intervention',
    ],
    commands: ['!autoreply', '!ai', '!catalog'],
    timeframe: '1 week',
    icon: '🏪',
  },
  {
    slug: 'telegram-community',
    title: 'How a Telegram community grew from 500 to 3,000 members',
    category: 'Community',
    problem: 'A crypto trading Telegram group was stagnant at 500 members due to spam raids and new members getting scared off by bot accounts and promotional messages.',
    solution: 'Deployed BotWave Telegram Bot with captcha verification, anti-raid protection, welcome messages, and a daily signal format schedule.',
    results: [
      '95% reduction in bot accounts joining the group',
      'New member retention improved from 30% to 70%',
      'Group grew from 500 to 3,000 members in 3 months',
      'Admin work reduced dramatically with auto-moderation',
    ],
    commands: ['!captcha', '!welcome', '!schedule', '!antiraid on'],
    timeframe: '3 months',
    icon: '📈',
  },
  {
    slug: 'church-group',
    title: 'How a church group automated daily devotionals',
    category: 'Community',
    problem: 'A church Telegram group with 400 members needed to send daily devotional messages, prayer requests, and event reminders — but the admin was manually doing it every morning.',
    solution: 'Scheduled daily devotionals at 6 AM, set up prayer request collection with !pray command, and configured event reminders.',
    results: [
      'Admin freed from 30 minutes of daily manual messaging',
      'Devotionals sent consistently every day — even when admin was unavailable',
      'Member engagement increased with daily touchpoints',
      'Prayer requests collected and pinned automatically',
    ],
    commands: ['!schedule', '!pray', '!poll', '!pin'],
    timeframe: '1 week',
    icon: '⛪',
  },
];

const categoryColors: Record<string, string> = {
  Education: 'bg-blue-500/10 text-blue-500',
  Business: 'bg-emerald-500/10 text-emerald-600',
  Community: 'bg-purple-500/10 text-purple-500',
  Finance: 'bg-orange-500/10 text-orange-500',
};

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Case Studies</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Case Studies</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            Real scenarios. Real results. See how schools, businesses, and communities use BotWave to solve real problems.
          </p>

          <div className="space-y-8">
            {studies.map(study => (
              <article key={study.slug} className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="flex items-start gap-4 mb-5">
                  <span className="text-3xl">{study.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[study.category] || 'bg-gray-500/10 text-gray-500'}`}>{study.category}</span>
                      <span className="text-xs text-[var(--text-muted)]">⏱ {study.timeframe}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{study.title}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Problem</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{study.problem}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Solution</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{study.solution}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Results</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {study.results.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {study.commands.map(cmd => (
                    <code key={cmd} className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{cmd}</code>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Want to share your story?</h2>
            <p className="text-[var(--text-secondary)] mb-5 text-sm">Tell us how you use BotWave. We'll feature the best ones here.</p>
            <Link href="/guest-posts" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Write a Guest Post →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
