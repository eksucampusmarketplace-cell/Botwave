import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCases, getUseCaseBySlug } from '@/lib/usecases/data';
import { useCaseContent } from '@/lib/usecases/content';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';

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

  const content = useCaseContent[uc.slug];
  const otherUseCases = useCases.filter(u => u.slug !== uc.slug).slice(0, 6);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Use Cases', url: '/use-cases' },
          { name: uc.title, url: `/use-cases/${uc.slug}` },
        ]}
      />
      {content && content.faqs.length > 0 && <FAQSchema items={content.faqs} />}
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
          <p className="text-lg text-[var(--text-secondary)] mb-8">{uc.description}</p>

          {content && (
            <div className="prose prose-invert max-w-none mb-10">
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">{content.intro}</p>
            </div>
          )}

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

          {/* Story */}
          {content?.story && content.story.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Real-world example</h2>
              {content.story.map((s, i) => (
                <div key={i} className="mb-6 p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                  <h3 className="font-bold text-[var(--text-primary)] mb-3">{s.heading}</h3>
                  {s.paragraphs.map((p, j) => (
                    <p key={j} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 last:mb-0">{p}</p>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* Featured commands */}
          {content?.featuredCommands && content.featuredCommands.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Commands you will use most</h2>
              <div className="space-y-3">
                {content.featuredCommands.map((c, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                    <code className="flex-shrink-0 px-3 py-1 bg-blue-500/10 text-blue-500 text-sm font-mono rounded border border-blue-500/20">
                      {c.command}
                    </code>
                    <p className="text-sm text-[var(--text-secondary)]">{c.why}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Getting started */}
          {content?.gettingStarted && content.gettingStarted.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Getting started</h2>
              <div className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                <ol className="space-y-3 list-none">
                  {content.gettingStarted.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* FAQs */}
          {content?.faqs && content.faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">FAQ</h2>
              <div className="space-y-6">
                {content.faqs.map((f, i) => (
                  <div key={i} className="p-5 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.question}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {(content?.relatedUseCase?.map(s => useCases.find(u => u.slug === s)).filter(Boolean) ?? otherUseCases).slice(0, 6).map(other => (
                other ? (
                  <Link key={other.slug} href={`/use-cases/${other.slug}`} className="p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{other.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{other.headline}</p>
                  </Link>
                ) : null
              ))}
            </div>

            {content?.relatedHowTo && content.relatedHowTo.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Related how-to guides</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.relatedHowTo.map(slug => (
                    <Link
                      key={slug}
                      href={`/how-to/${slug}`}
                      className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-400/30 transition-colors text-sm font-medium text-[var(--text-primary)]"
                    >
                      {slug.replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
