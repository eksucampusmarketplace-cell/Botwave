import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { comparePages } from '@/lib/compare/data';
import { compareContent } from '@/lib/compare/content';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';

export function generateStaticParams() {
  return comparePages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = comparePages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/compare/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/compare/${page.slug}` },
  };
}

function altLabelFromTitle(title: string): string {
  // "BotWave vs Evolution API" -> "Evolution API"
  // "Best WhatsApp Bots in 2026" -> "the alternative" (listicle)
  const m = title.match(/vs\s+(.+)$/i);
  if (m) return m[1].trim();
  return 'the alternative';
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const page = comparePages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const content = compareContent[page.slug];
  const otherComparisons = comparePages.filter(p => p.slug !== page.slug).slice(0, 6);
  const altLabel = altLabelFromTitle(page.title);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Comparisons', url: '/compare' },
          { name: page.title, url: `/compare/${page.slug}` },
        ]}
      />
      {content && content.faqs.length > 0 && <FAQSchema items={content.faqs} />}
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-[var(--primary)]">Comparisons</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium mb-4">Comparison</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-6">{page.description}</p>

          {content ? (
            <>
              {/* Intro */}
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">{content.intro}</p>
              </div>

              {/* Feature comparison */}
              <section id="features" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Feature-by-feature</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium">Feature</th>
                        <th className="text-left py-2 pr-3 text-[var(--primary)] font-medium">BotWave</th>
                        <th className="text-left py-2 text-[var(--text-muted)] font-medium">{altLabel}</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--text-secondary)]">
                      {content.features.map((f, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0 align-top">
                          <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{f.feature}</td>
                          <td className="py-2 pr-3">{f.botwave}</td>
                          <td className="py-2">{f.competitor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <section id="strengths-botwave" className="scroll-mt-32 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Where BotWave wins</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.botwaveStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section id="strengths-alt" className="scroll-mt-32 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Where {altLabel} wins</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.altStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Who is it for */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <section className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Pick BotWave if you are</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.whoIsBotwaveFor.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Pick {altLabel} if you are</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.whoIsAltFor.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Verdict */}
              <section id="verdict" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Verdict</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{content.verdict}</p>
              </section>

              {/* FAQs */}
              {content.faqs.length > 0 && (
                <section id="faq" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">FAQ</h2>
                  <div className="space-y-6">
                    {content.faqs.map((f, i) => (
                      <div key={i}>
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.question}</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
              <p className="text-sm text-[var(--text-secondary)]">{page.description}</p>
            </div>
          )}

          {/* CTA */}
          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 mb-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Ready to try BotWave?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Free tier, no credit card. Pair your number in 90 seconds.
            </p>
            <div className="flex gap-3">
              <Link href="/signup" className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Get started</Link>
              <Link href="/pricing" className="inline-block px-4 py-2 rounded-lg bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium">Pricing</Link>
            </div>
          </div>

          {/* Related */}
          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">More comparisons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(content?.relatedCompare?.map(s => comparePages.find(p => p.slug === s)).filter(Boolean) ?? otherComparisons).slice(0, 6).map(c => (
                c ? (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors"
                  >
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{c.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{c.description}</p>
                  </Link>
                ) : null
              ))}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
