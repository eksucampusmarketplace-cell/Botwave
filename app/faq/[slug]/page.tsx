import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { faqItems, getFaqBySlug } from '@/lib/faq/data';

export function generateStaticParams() {
  return faqItems.map(faq => ({ slug: faq.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const faq = getFaqBySlug(params.slug);
  if (!faq) return {};
  return {
    title: `${faq.question} | BotWave FAQ`,
    description: faq.answer.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 160),
    keywords: faq.seoKeywords,
    openGraph: {
      title: faq.question,
      description: faq.answer.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 160),
      url: `https://www.botwave.online/faq/${faq.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/faq/${faq.slug}` },
  };
}

export default function FAQDetailPage({ params }: { params: { slug: string } }) {
  const faq = getFaqBySlug(params.slug);
  if (!faq) notFound();

  const related = faq.relatedFaqs
    .map(slug => faqItems.find(f => f.slug === slug))
    .filter(Boolean);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer.replace(/\*\*/g, ''),
      },
    }],
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/faq" className="hover:text-[var(--primary)]">FAQ</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{faq.question}</span>
          </nav>

          <span className="inline-block px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-xs font-semibold mb-4">{faq.category}</span>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-8">{faq.question}</h1>

          <article className="prose prose-lg max-w-none
            prose-headings:text-[var(--text-primary)] prose-headings:font-bold
            prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
            prose-strong:text-[var(--text-primary)]
            prose-code:text-blue-500 prose-code:bg-[var(--bg-alt)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-li:text-[var(--text-secondary)]
          ">
            {faq.answer.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i} className="text-lg font-bold text-[var(--text-primary)] mt-6 mb-2">{line.slice(2, -2)}</h3>;
              if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.slice(2)}</li>;
              if (line.match(/^\d+\. /)) return <li key={i} className="ml-4">{line.replace(/^\d+\. /, '')}</li>;
              if (line.trim() === '') return <br key={i} />;
              // Handle inline bold
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={i}>
                  {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </p>
              );
            })}
          </article>

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Related Questions</h2>
              <div className="space-y-3">
                {related.map(rd => rd && (
                  <Link key={rd.slug} href={`/faq/${rd.slug}`} className="block p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{rd.question}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 flex gap-3 flex-wrap">
            <Link href="/faq" className="px-5 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">All FAQ</Link>
            <Link href="/docs" className="px-5 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">Docs</Link>
            <Link href="/signup" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
