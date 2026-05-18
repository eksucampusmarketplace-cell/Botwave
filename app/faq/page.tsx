import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { faqItems, getAllFaqCategories } from '@/lib/faq/data';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | BotWave',
  description: 'Answers to common questions about BotWave. Safety, pricing, anti-ban, QR troubleshooting, message limits, data privacy, and supported platforms.',
  keywords: ['botwave faq', 'whatsapp bot faq', 'botwave questions', 'whatsapp bot help', 'is whatsapp bot safe'],
  openGraph: {
    title: 'BotWave FAQ',
    description: 'Answers to common questions about BotWave. Safety, pricing, troubleshooting.',
    url: 'https://www.botwave.online/faq',
    type: 'website',
  },
  alternates: { canonical: '/faq' },
};

export default function FAQPage() {
  const categories = getAllFaqCategories();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 500),
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">FAQ</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Quick answers to the most common questions about BotWave.
          </p>

          {categories.map(category => (
            <section key={category} className="mb-10">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {category}
              </h2>
              <div className="space-y-3">
                {faqItems.filter(f => f.category === category).map(faq => (
                  <Link
                    key={faq.slug}
                    href={`/faq/${faq.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all"
                  >
                    <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{faq.question}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">{faq.answer.split('\n')[0].replace(/\*\*/g, '')}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-center">
            <p className="text-[var(--text-secondary)]">Still have questions? Check the <Link href="/docs" className="text-blue-500 hover:underline">docs</Link> or <Link href="/signup" className="text-blue-500 hover:underline">try BotWave free</Link>.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
