import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { landingPages } from '@/lib/landing/data';

export function generateStaticParams() {
  return landingPages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = landingPages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/${page.slug}`,
      type: 'website',
    },
    alternates: { canonical: `/${page.slug}` },
  };
}

export default function LandingPage({ params }: { params: { slug: string } }) {
  const page = landingPages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const relatedPages = landingPages
    .filter(p => p.slug !== page.slug && p.category === page.category)
    .slice(0, 6);

  const features = [
    { title: 'AI Chat Assistant', desc: 'Ask questions, get answers. Powered by Google Gemini. Works in groups and private chats.', command: '!ai' },
    { title: 'Sticker Maker', desc: 'Send any image and convert it to a WhatsApp sticker instantly. No app needed.', command: '!sticker' },
    { title: 'Group Moderation', desc: 'Anti-spam, warnings, kicks, and welcome messages. Keep your group clean.', command: '!warn' },
    { title: 'Media Downloads', desc: 'Download videos from TikTok, YouTube, and Instagram. Share directly in chat.', command: '!download' },
    { title: 'Games and Trivia', desc: 'Trivia, hangman, word chain, chess. Leaderboards and XP tracking.', command: '!trivia' },
    { title: 'Translation', desc: 'Translate messages to 20+ languages. Works with replies.', command: '!translate' },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
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
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 border border-white/10 hover:border-purple-500/30 text-slate-300 font-semibold rounded-lg transition-all"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">What You Get with BotWave</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 mb-3">{f.desc}</p>
                <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">{f.command}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <div className="text-3xl font-bold text-purple-500 mb-3">1</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Sign Up Free</h3>
              <p className="text-sm text-slate-400">Create your account in under a minute. No credit card needed.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <div className="text-3xl font-bold text-purple-500 mb-3">2</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Scan QR Code</h3>
              <p className="text-sm text-slate-400">Connect your WhatsApp by scanning a QR code. Your bot runs from your device.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <div className="text-3xl font-bold text-purple-500 mb-3">3</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Use Commands</h3>
              <p className="text-sm text-slate-400">Type commands in any chat. 150+ commands ready to use immediately.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Free to Start</h2>
          <p className="text-slate-400 mb-6">
            BotWave offers a free tier with 300 messages per month. No credit card required. Upgrade only if you need more volume.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/20"
          >
            Start Free Now
          </Link>
        </div>
      </section>

      {relatedPages.length > 0 && (
        <section className="pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Related Pages</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPages.map(rp => (
                <Link
                  key={rp.slug}
                  href={`/${rp.slug}`}
                  className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors"
                >
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-1">{rp.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{rp.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

        <Footer />
    </main>
  );
}
