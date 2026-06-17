import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { comparePages } from '@/lib/compare/data';

const compareContent: Record<string, { intro: string; botwave: string[]; other: string[]; verdict: string }> = {
  'botwave-vs-evolution-api': {
    intro: "Evolution API is a popular open-source WhatsApp API wrapper. It's powerful but requires technical knowledge, your own hosting, and configuration. BotWave wraps all of that into a no-code dashboard.",
    botwave: ['No hosting required', 'No coding needed', 'Built-in anti-ban system', 'Commands included (stickers, AI, games)', 'Dashboard with analytics', 'Free tier available', '60-second setup'],
    other: ['Requires VPS/cloud hosting ($5-20/mo)', 'Node.js + Docker knowledge needed', 'No built-in commands (just API)', 'Anti-ban not included', 'Self-managed', 'Open source (free software, expensive to run)'],
    verdict: "BotWave is better if you want a working bot without building one. Evolution API is better if you're a developer building a custom bot for clients."
  },
  'botwave-vs-baileys': {
    intro: "Baileys is the open-source WhatsApp Web library that BotWave itself is built on. Using Baileys directly means building your own bot from scratch in Node.js.",
    botwave: ['No coding needed', 'Commands included', 'Anti-ban built in', 'Hosted and managed', 'Dashboard UI', 'Free tier'],
    other: ['Requires Node.js + JavaScript knowledge', 'Build every command from scratch', 'Anti-ban must be implemented manually', 'Host yourself', 'No UI unless you build one', 'Free library, expensive to build'],
    verdict: "BotWave is Baileys with a dashboard, 150+ commands, anti-ban, and hosting — built for non-developers. Use Baileys directly if you're a developer who wants full control."
  },
  'best-whatsapp-bots-2026': {
    intro: "There are several WhatsApp bot platforms in 2026. Here's an honest comparison of the top options.",
    botwave: ['Free tier with 300 msgs/month', '150+ built-in commands', 'Anti-ban system', 'WhatsApp + Telegram in one dashboard', 'Nigeria-native (Naira billing)', '60-second setup'],
    other: ['Most platforms: $20-50/month', 'Limited command sets (10-30 commands)', 'No anti-ban protection', 'WhatsApp only', 'USD billing only', 'Complex setup required'],
    verdict: "BotWave leads on features-per-dollar (especially on the free tier), anti-ban protection, and multi-platform support. Best for individual users, community managers, and small businesses."
  },
};

export default function CompareDetailPage() {
  const params = useParams<{ slug: string }>();
  const page = comparePages.find(p => p.slug === params.slug);

  if (!page) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Comparison not found</h1>
          <Link href="/compare" className="text-blue-500 hover:underline">← All comparisons</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const content = compareContent[page.slug];
  const otherName = page.title.replace('BotWave vs ', '').replace('Best ', '').replace(' (2026)', '');

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-[var(--primary)]">Compare</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{page.title}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{page.seoTitle}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">{page.seoDescription}</p>

          {content && (
            <>
              <p className="text-[var(--text-secondary)] mb-10">{content.intro}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                  <h2 className="font-bold text-blue-500 mb-4 flex items-center gap-2">
                    <span className="text-lg">🌊</span> BotWave
                  </h2>
                  <ul className="space-y-2">
                    {content.botwave.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h2 className="font-bold text-[var(--text-primary)] mb-4">{otherName}</h2>
                  <ul className="space-y-2">
                    {content.other.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)] mt-0.5 shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--bg-alt)] border border-[var(--border)] mb-12">
                <h3 className="font-bold text-[var(--text-primary)] mb-2">Verdict</h3>
                <p className="text-[var(--text-secondary)]">{content.verdict}</p>
              </div>
            </>
          )}

          <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-violet-600/10 border border-blue-500/20 mb-8">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Try BotWave Free</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">See for yourself. No credit card, no commitment.</p>
            <Link href="/signup" className="inline-flex px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free →
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/compare" className="text-sm text-blue-500 hover:underline">← All comparisons</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
