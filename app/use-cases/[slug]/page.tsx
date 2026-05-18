import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useCases, getUseCaseBySlug } from '@/lib/usecases/data';

export function generateStaticParams() {
  return useCases.map(uc => ({ slug: uc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const uc = getUseCaseBySlug(params.slug);
  if (!uc) return {};
  return {
    title: uc.seoTitle,
    description: uc.seoDescription,
    keywords: uc.seoKeywords,
    openGraph: {
      title: uc.seoTitle,
      description: uc.seoDescription,
      url: `https://www.botwave.online/use-cases/${uc.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/use-cases/${uc.slug}` },
  };
}

export default function UseCasePage({ params }: { params: { slug: string } }) {
  const uc = getUseCaseBySlug(params.slug);
  if (!uc) notFound();

  const otherUseCases = useCases.filter(u => u.slug !== uc.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/use-cases" className="hover:text-[var(--primary)]">Use Cases</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{uc.title}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{uc.headline}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{uc.description}</p>

          {/* Pain Points */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">The problem</h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <ul className="space-y-3">
                {uc.painPoints.map((pain, i) => (
                  <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Solutions */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">How BotWave solves it</h2>
            <div className="space-y-4">
              {uc.solutions.map((sol, i) => (
                <div key={i} className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-[var(--text-primary)]">{sol.title}</h3>
                    {sol.command && (
                      <Link href={`/commands`} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-mono rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                        {sol.command}
                      </Link>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{sol.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="p-8 bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl text-center mb-12">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{uc.ctaText}</h3>
            <p className="text-[var(--text-secondary)] mb-4">Free to start. Set up in under 2 minutes. No coding needed.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Other Use Cases */}
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Other use cases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {otherUseCases.map(other => (
                <Link key={other.slug} href={`/use-cases/${other.slug}`} className="p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">{other.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{other.headline}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
