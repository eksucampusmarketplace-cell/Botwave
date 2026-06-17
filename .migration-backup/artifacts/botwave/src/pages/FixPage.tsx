import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fixPages } from '@/lib/fix/data';

export default function FixPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Troubleshooting</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Troubleshooting</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Step-by-step guides to fix common bot issues.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fixPages.map(page => (
              <Link
                key={page.slug}
                href={`/fix/${page.slug}`}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors group"
              >
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-red-500 transition-colors mb-2">{page.title}</h2>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{page.description}</p>
                <span className="inline-block mt-3 text-xs text-red-500 font-medium group-hover:underline">Read fix guide →</span>
              </Link>
            ))}
          </div>

          <div className="mt-12 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Still stuck?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              If none of these guides solve your problem, join a support group for live help.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://t.me/botwaveonline" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">
                Telegram Support
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
