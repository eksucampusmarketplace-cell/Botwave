import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCases } from '@/lib/usecases/data';

export const metadata: Metadata = {
  title: 'Use Cases - WhatsApp Automation for Every Community | BotWave',
  description: 'See how schools, businesses, creators, churches, crypto communities, and vendors use BotWave to automate WhatsApp and Telegram groups.',
  keywords: ['botwave use cases', 'whatsapp bot use cases', 'whatsapp automation examples', 'group management use cases'],
  openGraph: {
    title: 'BotWave Use Cases',
    description: 'WhatsApp automation for schools, businesses, creators, churches, crypto, and vendors.',
    url: 'https://www.botwave.online/use-cases',
    type: 'website',
  },
  alternates: { canonical: '/use-cases' },
};

const icons: Record<string, string> = {
  schools: '🎓',
  businesses: '💼',
  creators: '🎨',
  churches: '⛪',
  crypto: '🔐',
  vendors: '🛒',
};

export default function UseCasesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Use Cases</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Built for your community</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            {"BotWave works for any WhatsApp or Telegram group. Here's how different communities use it."}
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
                <span className="text-sm text-blue-500 font-medium group-hover:underline">Learn more &rarr;</span>
              </Link>
            ))}
          </div>

          <div className="mt-16 p-8 bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{"Don't see your use case?"}</h3>
            <p className="text-[var(--text-secondary)] mb-4">BotWave works for any WhatsApp or Telegram group. Try it free.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
