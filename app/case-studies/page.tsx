import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Case Studies, Real Results with BotWave',
  description: 'See how schools, businesses, and creators use BotWave to manage WhatsApp groups. Real scenarios, real results.',
  keywords: ['botwave case studies', 'whatsapp bot results', 'whatsapp automation examples', 'whatsapp group management results'],
  openGraph: {
    title: 'BotWave Case Studies',
    description: 'Real scenarios showing how BotWave solves WhatsApp group management problems.',
    url: 'https://www.botwave.online/case-studies',
    type: 'website',
  },
  alternates: { canonical: '/case-studies' },
};

const studies = [
  {
    slug: 'school-group-spam',
    title: 'How a university class group cut spam to near zero',
    category: 'Education',
    problem: 'A 300-member university class group on WhatsApp was flooded with off-topic messages, memes, and promotional links. The 3 group admins spent 30+ minutes daily deleting spam and warning students. Important announcements from lecturers were buried within minutes.',
    solution: 'The class rep connected BotWave to the group and enabled anti-spam protection. They set up a custom welcome message with group rules, enabled flood detection (auto-warning after 5 messages in 10 seconds), and configured the !warn system so admins could track repeat offenders.',
    results: [
      'Spam messages dropped from 50+ per day to under 5',
      'Admins went from 30 minutes of moderation daily to under 5 minutes',
      'Important announcements stayed visible longer',
      'Students started using !trivia for study breaks, increasing engagement',
      '3 warnings led to auto-mute, which stopped repeat offenders immediately',
    ],
    commands: ['!welcome', '!warn', '!trivia', '!tagall'],
    timeframe: '2 weeks',
  },
  {
    slug: 'business-auto-reply',
    title: 'How an online vendor automated customer replies',
    category: 'Business',
    problem: 'An online vendor selling clothes on WhatsApp received 100+ messages daily asking the same questions: "Do you have size L?", "How much is shipping?", "When will my order arrive?". She was losing sales because she could not reply fast enough during busy hours.',
    solution: 'She set up BotWave with custom auto-replies for common questions using keyword triggers. The !ai command handles unexpected questions with intelligent responses. She also set up business hours auto-reply so customers get immediate acknowledgment even when she is packaging orders.',
    results: [
      'Response time dropped from 2+ hours to under 30 seconds',
      'Repeat questions (sizing, shipping, payment) handled automatically',
      'No more lost sales due to slow replies during busy periods',
      'Customers started recommending the shop because of fast responses',
      'She reclaimed 3+ hours daily for packaging and sourcing',
    ],
    commands: ['!ai', '!autoreply'],
    timeframe: '1 week',
  },
  {
    slug: 'creator-community',
    title: 'How a content creator manages 5 community groups',
    category: 'Creator',
    problem: 'A content creator with 5 WhatsApp community groups (total 2,000+ members) was struggling to keep members engaged between content drops. Groups would go silent for days, then explode with off-topic chat when new content dropped. Moderation across 5 groups was impossible for one person.',
    solution: 'BotWave was connected to all 5 groups from one dashboard. The creator set up scheduled trivia games (twice weekly), enabled anti-spam across all groups, and used !poll to let members vote on content topics. The !welcome message directed new members to the rules and pinned content.',
    results: [
      'Daily active messages increased from near-zero on quiet days to consistent engagement',
      'Quiz nights became the most anticipated events in the community',
      'Members started inviting friends to join for the trivia competitions',
      'Moderation across all 5 groups managed from one dashboard',
      'Creator spent 10 minutes per day on community instead of 2 hours',
    ],
    commands: ['!trivia', '!poll', '!welcome', '!leaderboard'],
    timeframe: '1 month',
  },
];

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Case Studies</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Case Studies</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Real scenarios showing how BotWave solves WhatsApp group management problems.
          </p>

          <div className="space-y-12">
            {studies.map(study => (
              <article key={study.slug} className="p-8 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-2xl">
                <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-xs font-semibold mb-3">{study.category}</span>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">{study.title}</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-2">The Problem</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{study.problem}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-2">The Solution</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{study.solution}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-green-500 uppercase tracking-wide mb-2">Results ({study.timeframe})</h3>
                    <ul className="space-y-2">
                      {study.results.map((result, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Commands used:</span>
                    {study.commands.map(cmd => (
                      <Link key={cmd} href="/commands" className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-mono rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                        {cmd}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Ready to see similar results?</h3>
            <p className="text-[var(--text-secondary)] mb-4">Set up BotWave in under 2 minutes. No coding needed.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
