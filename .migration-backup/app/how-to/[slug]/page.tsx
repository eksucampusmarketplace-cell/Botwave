import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { howToPages } from '@/lib/howto/data';
import { howToContent } from '@/lib/howto/content';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import HowToSchema from '@/components/seo/HowToSchema';
import FAQSchema from '@/components/seo/FAQSchema';

const BASE_URL = 'https://www.botwave.online';

export function generateStaticParams() {
  return howToPages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = howToPages.find((p) => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `${BASE_URL}/how-to/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/how-to/${page.slug}` },
  };
}

const difficultyColors = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-600',
  advanced: 'bg-red-500/10 text-red-500',
};

function parseTime(timeToComplete: string): string | undefined {
  // "5 minutes" -> "PT5M", "2 hours" -> "PT2H"
  const m = timeToComplete.match(/(\d+)\s*(min|minute|minutes|hr|hour|hours)/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase().startsWith('h') ? 'H' : 'M';
  return `PT${n}${unit}`;
}

export default function HowToPage({ params }: { params: { slug: string } }) {
  const page = howToPages.find((p) => p.slug === params.slug);
  if (!page) notFound();

  const content = howToContent[page.slug];
  const otherGuides = howToPages.filter((p) => p.slug !== page.slug).slice(0, 6);

  const fullUrl = `${BASE_URL}/how-to/${page.slug}`;

  // Schema-friendly transforms
  const schemaSteps = content
    ? content.steps.map((s) => ({
        name: s.title,
        text: s.body + (s.tip ? ` Tip: ${s.tip}` : '') + (s.code ? ` Example: ${s.code}` : ''),
      }))
    : [];

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'How-To Guides', url: '/how-to' },
          { name: page.title, url: `/how-to/${page.slug}` },
        ]}
      />
      {content && content.steps.length > 0 && (
        <HowToSchema
          name={page.title}
          description={page.description}
          totalTime={parseTime(page.timeToComplete)}
          steps={schemaSteps}
          url={fullUrl}
        />
      )}
      {content && content.faqs.length > 0 && <FAQSchema items={content.faqs} />}
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/how-to" className="hover:text-[var(--primary)]">How-To Guides</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium">
              How-To Guide
            </span>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[page.difficulty]}`}>
              {page.difficulty}
            </span>
            <span className="text-sm text-[var(--text-muted)]">{page.timeToComplete}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">
            {page.title}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">{page.description}</p>

          {content ? (
            <>
              {/* Intro */}
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  {content.intro}
                </p>
              </div>

              {/* On this page */}
              <nav
                aria-label="On this page"
                className="mb-8 p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  On this page
                </h2>
                <ul className="space-y-1.5 list-none text-sm">
                  <li><a href="#prerequisites" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Prerequisites</a></li>
                  <li><a href="#steps" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Step-by-step instructions</a></li>
                  <li><a href="#expected-result" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Expected result</a></li>
                  {content.tips && content.tips.length > 0 && <li><a href="#tips" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Power-user tips</a></li>}
                  {content.pitfalls && content.pitfalls.length > 0 && <li><a href="#pitfalls" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Common pitfalls</a></li>}
                  {content.faqs.length > 0 && <li><a href="#faq" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Frequently asked questions</a></li>}
                  <li><a href="#related" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Related guides</a></li>
                </ul>
              </nav>

              {/* Prerequisites */}
              <section id="prerequisites" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Prerequisites</h2>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                  {content.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Steps */}
              <section id="steps" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Step-by-step instructions</h2>
                <ol className="space-y-6 list-none">
                  {content.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.body}</p>
                        {step.code && (
                          <pre className="mt-2 p-3 rounded-lg bg-black/40 text-blue-300 text-xs font-mono overflow-x-auto">
                            <code>{step.code}</code>
                          </pre>
                        )}
                        {step.tip && (
                          <p className="mt-2 text-xs text-[var(--text-muted)] italic">
                            Tip: {step.tip}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Expected result */}
              <section id="expected-result" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Expected result</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{content.expectedResult}</p>
              </section>

              {/* Tips */}
              {content.tips && content.tips.length > 0 && (
                <section id="tips" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Power-user tips</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Pitfalls */}
              {content.pitfalls && content.pitfalls.length > 0 && (
                <section id="pitfalls" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Common pitfalls</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.pitfalls.map((p, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* FAQs */}
              {content.faqs.length > 0 && (
                <section id="faq" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Frequently asked questions</h2>
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
            /* Fallback: still better than the old generic body. Shows the page metadata
                clearly and links to docs / similar guides, while being honest that the
                detailed walkthrough is still being written. */
            <div className="prose prose-invert max-w-none mb-8">
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                {page.description}
              </p>
              <div className="mt-6 p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Detailed walkthrough coming soon</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  While the full step-by-step for this slug is being finalised, check the related guides below for closely-matching coverage, or open the {' '}
                  <Link href="/docs" className="text-blue-500 hover:underline">documentation</Link> for the underlying commands.
                </p>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 mb-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Ready to put this into practice?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Create your free BotWave account and connect a session in under 2 minutes.
            </p>
            <Link
              href="/signup"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Related */}
          <section id="related" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Related how-to guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {(content?.relatedHowTo?.map((s) => howToPages.find((p) => p.slug === s)).filter(Boolean) ?? otherGuides).slice(0, 6).map((g) =>
                g ? (
                  <Link
                    key={g.slug}
                    href={`/how-to/${g.slug}`}
                    className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                  >
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{g.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{g.description}</p>
                  </Link>
                ) : null
              )}
            </div>

            {content?.relatedFix && content.relatedFix.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 mt-6">Stuck? Troubleshooting</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {content.relatedFix.map((slug) => (
                    <Link
                      key={slug}
                      href={`/fix/${slug}`}
                      className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-400/30 transition-colors text-sm font-medium text-[var(--text-primary)]"
                    >
                      Fix: {slug.replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {content?.relatedCompare && content.relatedCompare.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 mt-6">Compare to alternatives</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {content.relatedCompare.map((slug) => (
                    <Link
                      key={slug}
                      href={`/compare/${slug}`}
                      className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 hover:border-purple-400/30 transition-colors text-sm font-medium text-[var(--text-primary)]"
                    >
                      {slug.replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {content?.relatedUseCase && content.relatedUseCase.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 mt-6">Apply this in your community</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.relatedUseCase.map((slug) => (
                    <Link
                      key={slug}
                      href={`/use-cases/${slug}`}
                      className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-400/30 transition-colors text-sm font-medium text-[var(--text-primary)]"
                    >
                      Use case: {slug.replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
