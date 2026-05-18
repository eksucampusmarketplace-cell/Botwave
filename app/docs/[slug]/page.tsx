import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { docPages, getDocBySlug } from '@/lib/docs/data';

export function generateStaticParams() {
  return docPages.map(doc => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = getDocBySlug(params.slug);
  if (!doc) return {};
  return {
    title: `${doc.title} | BotWave Docs`,
    description: doc.description,
    keywords: doc.seoKeywords,
    openGraph: {
      title: doc.title,
      description: doc.description,
      url: `https://www.botwave.online/docs/${doc.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/docs/${doc.slug}` },
  };
}

const platformLabels: Record<string, string> = {
  all: 'All Platforms',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram Bot',
  userbot: 'Userbot',
};

const platformColors: Record<string, string> = {
  all: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  whatsapp: 'bg-green-600/10 text-green-600 border-green-600/20',
  telegram: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  userbot: 'bg-violet-600/10 text-violet-600 border-violet-600/20',
};

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDocBySlug(params.slug);
  if (!doc) notFound();

  const related = doc.relatedDocs
    .map(slug => docPages.find(d => d.slug === slug))
    .filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: doc.title,
    description: doc.description,
    author: { '@type': 'Organization', name: 'BotWave' },
    publisher: { '@type': 'Organization', name: 'BotWave', url: 'https://www.botwave.online' },
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/docs" className="hover:text-[var(--primary)]">Docs</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{doc.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-6">
            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold border ${platformColors[doc.platform]}`}>
              {platformLabels[doc.platform]}
            </span>
            <span className="px-3 py-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] text-xs font-medium">{doc.category}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{doc.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{doc.description}</p>

          <article className="prose prose-lg max-w-none
            prose-headings:text-[var(--text-primary)] prose-headings:font-bold
            prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
            prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[var(--text-primary)]
            prose-code:text-blue-500 prose-code:bg-[var(--bg-alt)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-li:text-[var(--text-secondary)]
            prose-ol:text-[var(--text-secondary)]
            prose-ul:text-[var(--text-secondary)]
          ">
            {doc.content.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
              if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>;
              if (line.match(/^\d+\. /)) return <li key={i}>{line.replace(/^\d+\. /, '')}</li>;
              if (line.trim() === '') return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </article>

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Related Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map(rd => rd && (
                  <Link key={rd.slug} href={`/docs/${rd.slug}`} className="p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{rd.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{rd.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 p-8 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Need more help?</h3>
            <p className="text-[var(--text-secondary)] mb-4">Browse more guides or start using BotWave now.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/docs" className="px-5 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">All Docs</Link>
              <Link href="/commands" className="px-5 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors">Commands</Link>
              <Link href="/signup" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Get Started</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
