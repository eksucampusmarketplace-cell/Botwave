import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { landingPages } from '@/lib/landing/data';

const FEATURES = [
  { title: 'AI Chat Assistant', desc: 'Ask questions, get answers. Powered by Google Gemini. Works in groups and private chats.', command: '!ai' },
  { title: 'Sticker Maker', desc: 'Send any image and convert it to a WhatsApp sticker instantly. No app needed.', command: '!sticker' },
  { title: 'Group Moderation', desc: 'Anti-spam, warnings, kicks, and welcome messages. Keep your group clean.', command: '!warn' },
  { title: 'Media Downloads', desc: 'Download videos from TikTok, YouTube, and Instagram. Share directly in chat.', command: '!download' },
  { title: 'Games and Trivia', desc: 'Trivia, hangman, word chain, chess. Leaderboards and XP tracking.', command: '!trivia' },
  { title: 'Translation', desc: 'Translate messages to 20+ languages. Works with replies.', command: '!translate' },
];

export default function LandingSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const page = landingPages.find(p => p.slug === slug);

  if (!page) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center flex-col gap-4 pt-20 pb-20">
          <div className="text-6xl">🤖</div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Page Not Found</h1>
          <p className="text-[var(--text-secondary)]">That page doesn't exist.</p>
          <Link href="/" className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Go Home →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPages = landingPages
    .filter(p => p.slug !== page.slug && p.category === page.category)
    .slice(0, 6);

  const isPlatformWhatsApp = page.slug.includes('whatsapp') || page.category === 'country';
  const platform = page.slug.includes('telegram') ? 'Telegram' : 'WhatsApp';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-blue-500 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            {page.heading}
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            {page.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Get Started Free
            </Link>
            <Link
              href="/commands"
              className="px-8 py-4 border border-white/10 hover:border-blue-500/30 text-slate-300 font-semibold rounded-xl transition-all"
            >
              View Commands
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-[var(--surface,#0d0d14)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">
            Everything you need to run {page.category === 'country' ? `your ${platform} group` : 'your group'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.command} className="p-6 rounded-2xl bg-[var(--bg)] border border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-[var(--text-primary)]">{f.title}</h3>
                  <code className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">{f.command}</code>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why BotWave */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">
            Why choose BotWave?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { icon: '🆓', title: 'Free Tier', desc: 'Start for free. No credit card needed. Upgrade when you grow.' },
              { icon: '🛡️', title: 'Anti-Ban', desc: 'Our SafeConnect layer runs on your device. Your own IP, your own account.' },
              { icon: '⚡', title: '150+ Commands', desc: 'Every command you need, ready to use immediately.' },
            ].map(item => (
              <div key={item.title} className="p-6 rounded-2xl bg-[var(--surface,#0d0d14)] border border-white/5">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-[var(--text-primary)] mb-4">
            Ready to automate your {platform} group?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join thousands of group admins using BotWave. Free to start, no coding needed.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg"
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Related Pages */}
      {relatedPages.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Related</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedPages.map(related => (
                <Link
                  key={related.slug}
                  href={`/${related.slug}`}
                  className="block p-4 rounded-xl bg-[var(--surface,#0d0d14)] border border-white/5 hover:border-blue-500/30 transition-colors"
                >
                  <p className="font-medium text-[var(--text-primary)] text-sm">{related.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{related.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
