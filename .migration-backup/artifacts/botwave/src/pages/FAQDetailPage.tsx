import type { ReactElement } from 'react';
import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { faqItems } from '@/lib/faq/data';

function renderAnswer(answer: string) {
  const lines = answer.split('\n');
  const elements: ReactElement[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<h3 key={i} className="font-bold text-[var(--text-primary)] mt-5 mb-2">{line.slice(2, -2)}</h3>);
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-blue-500 mt-1 shrink-0">·</span>
          <span className="text-sm text-[var(--text-secondary)]"
            dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>') }} />
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
      );
    }
  });

  return elements;
}

export default function FAQDetailPage() {
  const params = useParams<{ slug: string }>();
  const faq = faqItems.find(f => f.slug === params.slug);

  if (!faq) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">FAQ not found</h1>
          <Link href="/faq" className="text-blue-500 hover:underline">← Back to FAQ</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const related = faqItems.filter(f => faq.relatedFaqs.includes(f.slug));

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/faq" className="hover:text-[var(--primary)]">FAQ</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{faq.question}</span>
          </nav>

          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 mb-4">{faq.category}</span>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-8">{faq.question}</h1>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-10">
            {renderAnswer(faq.answer)}
          </div>

          {related.length > 0 && (
            <div className="mb-10">
              <h3 className="font-bold text-[var(--text-primary)] mb-4">Related Questions</h3>
              <div className="space-y-3">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/faq/${r.slug}`}
                    className="group block p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-colors"
                  >
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 text-sm transition-colors">{r.question}</h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-3">
              Still have questions? Check the{' '}
              <Link href="/docs" className="text-blue-500 hover:underline">docs</Link>
              {' '}or{' '}
              <Link href="/signup" className="text-blue-500 hover:underline">try BotWave free</Link>.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <Link href="/faq" className="text-sm text-blue-500 hover:underline">← All FAQs</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
