import { Link, useParams } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCases } from '@/lib/usecases/data';

const icons: Record<string, string> = {
  schools: '🎓',
  businesses: '💼',
  creators: '🎨',
  churches: '⛪',
  crypto: '🔐',
  vendors: '🛒',
};

function UseCaseDetail({ slug }: { slug: string }) {
  const uc = useCases.find(u => u.slug === slug);
  if (!uc) return <UseCaseIndex />;

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
          <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
          <span>/</span>
          <Link href="/use-cases" className="hover:text-[var(--primary)]">Use Cases</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">{uc.title}</span>
        </nav>

        <span className="text-5xl block mb-4">{icons[uc.slug] || '📱'}</span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">{uc.title}</h1>
        <p className="text-xl text-[var(--text-secondary)] mb-12">{uc.headline}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15">
            <h2 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <span className="text-red-500">✗</span> The Problem
            </h2>
            <ul className="space-y-2">
              {uc.painPoints.map((p, i) => (
                <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                  <span className="text-red-500 shrink-0 mt-0.5">·</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
            <h2 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <span className="text-emerald-500">✓</span> BotWave Fixes It
            </h2>
            <ul className="space-y-3">
              {uc.solutions.slice(0, 4).map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{s.title}</span>
                  {s.command && <code className="ml-2 text-blue-500 font-mono text-xs">{s.command}</code>}
                  <p className="text-[var(--text-muted)] mt-0.5">{s.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {uc.solutions.length > 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {uc.solutions.slice(4).map((s, i) => (
              <div key={i} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{s.title}</span>
                  {s.command && <code className="text-blue-500 font-mono text-xs">{s.command}</code>}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{s.description}</p>
              </div>
            ))}
          </div>
        )}

        {uc.testimonialQuote && (
          <blockquote className="mb-12 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] italic text-[var(--text-secondary)]">
            "{uc.testimonialQuote}"
          </blockquote>
        )}

        <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{uc.ctaText}</h2>
          <p className="text-[var(--text-secondary)] mb-4">Free forever. No coding. No credit card.</p>
          <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Get Started Free →
          </Link>
        </div>
      </div>
    </div>
  );
}

function UseCaseIndex() {
  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
          <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">Use Cases</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Built for your community</h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
          BotWave works for any Telegram group. Here's how different communities use it.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map(uc => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="group block p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-1"
            >
              <div className="text-4xl mb-4">{icons[uc.slug] || '📱'}</div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">{uc.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{uc.description}</p>
              <span className="text-sm text-blue-500 font-medium group-hover:underline">Learn more →</span>
            </Link>
          ))}
        </div>

        <div className="mt-16 p-8 bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Don't see your use case?</h3>
          <p className="text-[var(--text-secondary)] mb-4">BotWave works for any Telegram group. Try it free.</p>
          <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UseCasesPage() {
  const params = useParams<{ slug?: string }>();

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      {params.slug ? <UseCaseDetail slug={params.slug} /> : <UseCaseIndex />}
      <Footer />
    </main>
  );
}
