import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { howToPages } from '@/lib/howto/data';

export function generateStaticParams() {
  return howToPages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = howToPages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/how-to/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/how-to/${page.slug}` },
  };
}

export default function HowToPage({ params }: { params: { slug: string } }) {
  const page = howToPages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const otherGuides = howToPages.filter(p => p.slug !== page.slug).slice(0, 4);

  const difficultyColors = {
    beginner: 'bg-green-500/10 text-green-500',
    intermediate: 'bg-yellow-500/10 text-yellow-600',
    advanced: 'bg-red-500/10 text-red-500',
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/how-to" className="hover:text-[var(--primary)]">How-To Guides</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium">How-To Guide</span>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[page.difficulty]}`}>{page.difficulty}</span>
            <span className="text-sm text-[var(--text-muted)]">{page.timeToComplete}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">{page.description}</p>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Prerequisites</h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>+ A BotWave account (free at botwave.online/signup)</li>
              <li>+ WhatsApp installed on your phone (for WhatsApp bot)</li>
              <li>+ Stable internet connection</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Steps</h2>
            <ol className="space-y-4 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">1</span>
                <span>Sign up or log in at botwave.online</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">2</span>
                <span>Go to your dashboard and create a new session</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">3</span>
                <span>Follow the platform-specific instructions to connect</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">4</span>
                <span>Start using commands in your chats</span>
              </li>
            </ol>
          </div>

          <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20 mb-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Ready to start?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">Create your free account and connect in under 60 seconds.</p>
            <Link href="/signup" className="inline-block px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              Get started free
            </Link>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">More guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherGuides.map(guide => (
                <Link
                  key={guide.slug}
                  href={`/how-to/${guide.slug}`}
                  className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{guide.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${difficultyColors[guide.difficulty]}`}>{guide.difficulty}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{guide.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
