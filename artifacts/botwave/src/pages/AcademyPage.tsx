import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const courses = [
  {
    title: 'Telegram Bot Fundamentals',
    description: 'Learn how Telegram bots work, how to set them up in minutes, and how to automate your group with zero ban risk.',
    lessons: 6,
    duration: '30 min',
    level: 'Beginner',
    topics: ['What is a Telegram bot', 'How @BotFather token works', 'Understanding Bot API vs Userbot', 'Your first bot setup', 'Basic commands and features', 'Group management best practices'],
    link: '/docs/getting-started',
    icon: '📱',
  },
  {
    title: 'Community Growth Masterclass',
    description: 'Strategies for growing active Telegram communities from zero to thousands of engaged members.',
    lessons: 8,
    duration: '45 min',
    level: 'Intermediate',
    topics: ['Choosing the right platform', 'Setting group rules that work', 'Onboarding new members', 'Engagement mechanics', 'Handling conflict and spam', 'Scaling across multiple groups', 'Building a content calendar', 'Measuring community health'],
    link: '/use-cases',
    icon: '🚀',
  },
  {
    title: 'Moderation and Anti-Spam',
    description: 'Master group moderation. Learn how to prevent spam, manage toxic behavior, and keep your community safe automatically.',
    lessons: 5,
    duration: '25 min',
    level: 'Beginner',
    topics: ['Types of spam and how to identify them', 'Anti-spam configuration walkthrough', 'Warning systems and escalation', 'Managing toxic behavior', 'Anti-raid for Telegram groups'],
    link: '/features',
    icon: '🛡️',
  },
  {
    title: 'Telegram Bot Setup from Scratch',
    description: 'Everything you need to create, configure, and deploy a Telegram bot using the official Bot API through BotWave.',
    lessons: 4,
    duration: '20 min',
    level: 'Beginner',
    topics: ['Creating a bot with @BotFather', 'Connecting to BotWave dashboard', 'Adding bot to your group', 'Configuring features and commands'],
    link: '/deploy-telegram-bot',
    icon: '✈️',
  },
  {
    title: 'AI-Powered Group Management',
    description: 'Use Google Gemini AI to answer questions, summarize chats, generate content, and create smarter auto-replies.',
    lessons: 6,
    duration: '30 min',
    level: 'Intermediate',
    topics: ['AI chat setup and configuration', 'Custom AI personas', 'AI document analysis (!scan)', 'AI summaries (!digest)', 'Building a knowledge base for AI', 'Multi-language AI replies'],
    link: '/features/ai',
    icon: '🤖',
  },
  {
    title: 'Business Telegram Bot',
    description: 'Turn your Telegram into a customer service powerhouse. Auto-replies, keyword triggers, business hours, and order tracking.',
    lessons: 7,
    duration: '35 min',
    level: 'Intermediate',
    topics: ['Business use case planning', 'Keyword trigger setup', 'Business hours configuration', 'AI fallback for unknown questions', 'Order confirmation templates', 'Customer segmentation', 'Metrics and reporting'],
    link: '/use-cases',
    icon: '💼',
  },
];

const levelColors: Record<string, string> = {
  Beginner: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Intermediate: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Advanced: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function AcademyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-mono mb-6">
            BOTWAVE ACADEMY
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Learn Bot Automation</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Free step-by-step guides for Telegram bot automation, community management, AI chatbots, and group management.
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link key={course.title} href={course.link} className="group block p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 hover:-translate-y-0.5 transition-all">
                <span className="text-3xl block mb-3">{course.icon}</span>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${levelColors[course.level]}`}>{course.level}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{course.lessons} lessons · {course.duration}</span>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">{course.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{course.description}</p>
                <ul className="space-y-0.5">
                  {course.topics.slice(0, 3).map((t, i) => (
                    <li key={i} className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                      <span className="text-blue-400">·</span>{t}
                    </li>
                  ))}
                  {course.topics.length > 3 && (
                    <li className="text-xs text-[var(--text-muted)]">+ {course.topics.length - 3} more</li>
                  )}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
