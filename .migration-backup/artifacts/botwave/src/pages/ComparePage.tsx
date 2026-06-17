import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { comparePages } from '@/lib/compare/data';

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Compare</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Comparisons</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            See how BotWave compares to other bot platforms and tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparePages.map(page => (
              <Link
                key={page.slug}
                href={`/compare/${page.slug}`}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors group"
              >
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors mb-2">{page.title}</h2>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{page.description}</p>
                <span className="inline-block mt-3 text-xs text-purple-500 font-medium group-hover:underline">Read comparison →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
