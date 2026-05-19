import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'BotWave Academy - Learn WhatsApp Automation and Community Growth',
  description: 'Free courses on WhatsApp automation, community management, AI chatbots, group moderation, and engagement tactics. Learn how to grow and manage WhatsApp and Telegram communities.',
  keywords: ['whatsapp automation course', 'community management course', 'whatsapp bot tutorial', 'telegram bot course', 'group management training', 'whatsapp marketing course'],
  openGraph: {
    title: 'BotWave Academy',
    description: 'Free courses on WhatsApp automation, community management, and AI chatbots.',
    url: 'https://www.botwave.online/academy',
    type: 'website',
  },
  alternates: { canonical: '/academy' },
};

const courses = [
  {
    title: 'WhatsApp Automation Fundamentals',
    description: 'Learn how WhatsApp bots work, how to set them up safely, and how to automate your group without getting banned.',
    lessons: 6,
    duration: '30 min',
    level: 'Beginner',
    topics: ['What is WhatsApp automation', 'How QR-based bots work', 'Understanding ban risk', 'Your first bot setup', 'Basic commands and features', 'Anti-ban best practices'],
    link: '/docs/getting-started',
  },
  {
    title: 'Community Growth Masterclass',
    description: 'Strategies for growing active WhatsApp and Telegram communities from zero to thousands of engaged members.',
    lessons: 8,
    duration: '45 min',
    level: 'Intermediate',
    topics: ['Choosing the right platform', 'Setting group rules that work', 'Onboarding new members', 'Engagement mechanics', 'Handling conflict and spam', 'Scaling across multiple groups', 'Building a content calendar', 'Measuring community health'],
    link: '/use-cases',
  },
  {
    title: 'Moderation and Anti-Spam',
    description: 'Master group moderation. Learn how to prevent spam, manage toxic behavior, and keep your community safe automatically.',
    lessons: 5,
    duration: '25 min',
    level: 'Beginner',
    topics: ['Types of group spam', 'Setting up anti-spam rules', 'Warning and escalation systems', 'Raid prevention', 'Building a moderation team'],
    link: '/features/moderation',
  },
  {
    title: 'AI-Powered Support Systems',
    description: 'Use AI to handle customer questions, automate FAQ responses, and provide 24/7 support without hiring a team.',
    lessons: 6,
    duration: '35 min',
    level: 'Intermediate',
    topics: ['How AI chat works in BotWave', 'Training AI on your business', 'Setting up auto-replies', 'Handling edge cases', 'Escalation to humans', 'Measuring AI effectiveness'],
    link: '/features/ai',
  },
  {
    title: 'Engagement Tactics for Groups',
    description: 'Keep your community active with games, polls, quizzes, and creative activities that members actually enjoy.',
    lessons: 7,
    duration: '40 min',
    level: 'Beginner',
    topics: ['Why groups go dead', 'Trivia and quiz strategies', 'Poll best practices', 'Scheduling activities', 'Leaderboards and competition', 'Sticker culture building', 'Measuring engagement'],
    link: '/commands',
  },
  {
    title: 'Business Automation on WhatsApp',
    description: 'Automate customer interactions, process orders, send reminders, and grow your business using WhatsApp as a channel.',
    lessons: 8,
    duration: '50 min',
    level: 'Advanced',
    topics: ['WhatsApp for business strategy', 'Auto-reply configuration', 'Order management flows', 'Payment notification setup', 'Customer segmentation', 'Broadcast best practices', 'Analytics and reporting', 'Scaling operations'],
    link: '/use-cases/businesses',
  },
];

const levelColors: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-600',
  Intermediate: 'bg-blue-500/10 text-blue-600',
  Advanced: 'bg-purple-500/10 text-purple-600',
};

export default function AcademyPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'BotWave Academy',
    description: 'Free educational hub teaching WhatsApp automation, community growth, moderation, AI support systems, and engagement tactics.',
    url: 'https://www.botwave.online/academy',
    teaches: courses.map(c => c.title),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Academy</span>
          </nav>

          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">BotWave Academy</h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Free courses teaching everything about WhatsApp automation, community growth, moderation, and AI-powered support. From beginner setups to advanced business strategies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <Link
                key={i}
                href={course.link}
                className="group block p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${levelColors[course.level]}`}>
                    {course.level}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{course.lessons} lessons</span>
                  <span className="text-xs text-[var(--text-muted)]">{course.duration}</span>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">{course.title}</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{course.description}</p>
                <div className="space-y-1">
                  {course.topics.slice(0, 4).map((topic, j) => (
                    <div key={j} className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                      {topic}
                    </div>
                  ))}
                  {course.topics.length > 4 && (
                    <div className="text-xs text-blue-500 font-medium">+{course.topics.length - 4} more topics</div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Learn by doing</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
              The best way to learn is to set up your own bot. Sign up for free, connect your WhatsApp, and start experimenting with commands in a test group.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Create free account
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
