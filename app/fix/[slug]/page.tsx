import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fixPages } from '@/lib/fix/data';
import { fixContent } from '@/lib/fix/content';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';

export function generateStaticParams() {
  return fixPages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = fixPages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/fix/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/fix/${page.slug}` },
  };
}

export default function FixPage({ params }: { params: { slug: string } }) {
  const page = fixPages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const content = fixContent[page.slug];
  const otherFixes = fixPages.filter(p => p.slug !== page.slug).slice(0, 6);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Troubleshooting', url: '/fix' },
          { name: page.title, url: `/fix/${page.slug}` },
        ]}
      />
      {content && content.faqs.length > 0 && <FAQSchema items={content.faqs} />}
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/fix" className="hover:text-[var(--primary)]">Troubleshooting</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-4">Troubleshooting</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">Fix: {page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-6">{page.description}</p>

          {content ? (
            <>
              {/* Intro */}
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">{content.intro}</p>
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
                  <li><a href="#symptoms" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Confirm the symptoms</a></li>
                  <li><a href="#quick-fix" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">30-second quick fix</a></li>
                  <li><a href="#causes" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Root causes</a></li>
                  <li><a href="#resolution" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Detailed resolution</a></li>
                  <li><a href="#expected" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Expected result</a></li>
                  {content.prevention && content.prevention.length > 0 && <li><a href="#prevention" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">Prevention</a></li>}
                  {content.faqs.length > 0 && <li><a href="#faq" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">FAQ</a></li>}
                </ul>
              </nav>

              {/* Symptoms */}
              <section id="symptoms" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Confirm the symptoms</h2>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                  {content.symptoms.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Quick fix */}
              <section id="quick-fix" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">30-second quick fix</h2>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                  {content.quickFix.map((q, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Root causes */}
              <section id="causes" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Root causes</h2>
                <ol className="space-y-5 list-none">
                  {content.causes.map((c, i) => (
                    <li key={i}>
                      <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                        {i + 1}. {c.label}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{c.detail}</p>
                      {c.fix && c.fix.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)] list-disc pl-5">
                          {c.fix.map((f, j) => (
                            <li key={j}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              {/* Resolution steps */}
              <section id="resolution" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Detailed resolution</h2>
                <ol className="space-y-6 list-none">
                  {content.resolutionSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
                        {step.body && (
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.body}</p>
                        )}
                        {step.code && (
                          <pre className="mt-2 p-3 rounded-lg bg-black/40 text-blue-300 text-xs font-mono overflow-x-auto">
                            <code>{step.code}</code>
                          </pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Expected result */}
              <section id="expected" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Expected result</h2>
                <p className="text-sm text-[var(--text-secondary)]">{content.expectedResult}</p>
              </section>

              {/* Prevention */}
              {content.prevention && content.prevention.length > 0 && (
                <section id="prevention" className="scroll-mt-32 mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Prevent it next time</h2>
                  <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-none">
                    {content.prevention.map((p, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
            <div className="prose prose-invert max-w-none">
              <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Quick checklist</h2>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>+ Check your session is active in the BotWave dashboard</li>
                  <li>+ Use the correct command prefix (! for WhatsApp, / for Telegram, . for userbot)</li>
                  <li>+ Verify your phone/account has an internet connection</li>
                  <li>+ Try reconnecting from the dashboard</li>
                  <li>+ If still failing, message support@botwave.online</li>
                </ul>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 mb-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Still stuck?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Open a support ticket from the dashboard and we will look at your session logs directly.
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard" className="text-sm font-medium text-blue-500 hover:underline">Open dashboard</Link>
              <Link href="/docs" className="text-sm font-medium text-blue-500 hover:underline">Documentation</Link>
            </div>
          </div>

          {/* Related */}
          <section>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Other troubleshooting guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {(content?.relatedFix?.map(s => fixPages.find(p => p.slug === s)).filter(Boolean) ?? otherFixes).slice(0, 6).map(fix => (
                fix ? (
                  <Link
                    key={fix.slug}
                    href={`/fix/${fix.slug}`}
                    className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors"
                  >
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{fix.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{fix.description}</p>
                  </Link>
                ) : null
              ))}
            </div>

            {content?.relatedHowTo && content.relatedHowTo.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 mt-6">Related how-to guides</h2>
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
              </>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
