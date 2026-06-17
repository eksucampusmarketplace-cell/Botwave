import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const replyTypes = [
  {
    icon: '🔑',
    title: 'Keyword Triggers',
    desc: 'Set exact-match keywords to trigger automatic responses. When someone types "price" or "hours", the bot replies instantly.',
    example: 'Trigger: "pricing" → Response: "Check our pricing at example.com/pricing"',
  },
  {
    icon: '🔍',
    title: 'Regex Pattern Matching',
    desc: 'Use regular expressions for advanced matching. Catch variations like "what is your price", "how much does it cost" with a single rule.',
    example: 'Regex: /pric(e|ing|es)|cost|how much/i → Sends pricing reply',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Responses',
    desc: 'Let Gemini AI handle complex questions. When no keyword matches, the AI generates a contextual response based on your business information.',
    example: 'User: "Can I integrate with Shopify?" → AI generates answer from your knowledge base',
  },
  {
    icon: '📅',
    title: 'Scheduled Messages',
    desc: 'Send automated messages at specific times. Perfect for daily reminders, weekly summaries, or recurring announcements.',
    example: 'Every day at 9am: "Good morning! Here are today\'s top deals..."',
  },
];

const useCases = [
  { icon: '🏪', title: 'Customer Support', desc: 'Auto-answer FAQs about pricing, shipping, hours, and return policies.' },
  { icon: '📚', title: 'Study Groups', desc: 'Auto-reply with study materials, syllabus links, or exam schedules.' },
  { icon: '🏢', title: 'Business Hours', desc: 'Send away messages when a message arrives outside business hours.' },
  { icon: '📰', title: 'Content Distribution', desc: 'Auto-share new content when triggered by specific keywords.' },
];

const steps = [
  { step: '1', title: 'Connect Telegram Bot', desc: 'Paste your @BotFather token in the BotWave dashboard.' },
  { step: '2', title: 'Add to Your Group', desc: 'Add the bot as admin to your Telegram group.' },
  { step: '3', title: 'Set Up Auto-Replies', desc: 'Configure keyword triggers, AI replies, and schedules from the dashboard.' },
];

export default function TelegramAutoReplyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono mb-6">
            TELEGRAM AUTO-REPLY
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Telegram Auto-Reply Bot<br />with Keyword Triggers
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Set up automatic replies in Telegram groups and DMs. Keyword-based triggers, regex matching, AI-powered responses, and scheduled messages. Free, no coding.
          </p>
          <Link href="/signup" className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Get Started Free
          </Link>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Auto-Reply Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {replyTypes.map(t => (
              <div key={t.title} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{t.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{t.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">{t.desc}</p>
                <p className="text-xs text-[var(--text-muted)] italic bg-[var(--bg)] p-2 rounded-lg">{t.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {useCases.map(u => (
              <div key={u.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] flex gap-4">
                <span className="text-2xl shrink-0">{u.icon}</span>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">{u.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Set Up in 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.step} className="text-center p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="text-3xl font-black text-blue-500/30 mb-3">{s.step}</div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/deploy-telegram-bot" className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
              Start Setup →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
