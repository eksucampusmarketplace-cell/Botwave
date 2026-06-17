import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PRICING_TIERS } from '@/lib/pricing/tiers';

const faqs = [
  { q: 'Is the free plan really free?', a: 'Yes. The Free tier is permanently free, no card required, no trial expiry. You get 300 messages/month, 10 AI queries/day, 1 paired session, and access to all 150+ built-in commands.' },
  { q: 'How does monthly billing work?', a: 'Paid plans renew every 30 days from the day you upgrade. We bill in Naira via Flutterwave. Cancel anytime from your dashboard.' },
  { q: 'Do I need a credit card to start?', a: 'No. Sign up with email only. A payment method is only required when you click Upgrade.' },
  { q: 'What counts as "1 message"?', a: 'One outbound message from the bot — replies, AI responses, welcomes, broadcasts. Incoming messages and internal status pings are NOT counted.' },
  { q: 'What if I exceed my quota?', a: 'The bot keeps replying, we never silently drop messages, but the dashboard shows a banner suggesting an upgrade. Hard-blocking only happens if you exceed 2× your quota for two cycles in a row.' },
  { q: 'Is there a discount for NGOs or schools?', a: 'Yes. Verified NGOs, student clubs, and educational institutions get the Standard plan free for the first year. Email support@botwave.online with proof of status.' },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Pricing</span>
          </nav>

          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">
              Transparent pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
              Honest plans. No hidden fees.
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Start free, upgrade when you outgrow it. Naira-native billing, monthly cycles, cancel anytime.
              All plans include every BotWave command — paid tiers just lift the limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.slug}
                className={`relative rounded-2xl border bg-[var(--card-bg,var(--surface))] p-6 flex flex-col ${
                  tier.recommended
                    ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'border-[var(--border)]'
                }`}
              >
                {tier.recommended && (
                  <span className="absolute -top-3 right-4 inline-block px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                    Most popular
                  </span>
                )}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{tier.name}</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{tier.tagline}</p>
                </div>
                <div className="mb-5">
                  {tier.priceNgn === 0 ? (
                    <div>
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">Free</span>
                      <span className="text-[var(--text-muted)] text-sm ml-1">forever</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl font-extrabold text-[var(--text-muted)]">Coming Soon</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.priceNgn === 0 ? '/signup' : '/signup'}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    tier.recommended
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : tier.priceNgn === 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-primary)] hover:border-blue-400'
                  }`}
                >
                  {tier.priceNgn === 0 ? 'Get Started Free' : 'Join Waitlist'}
                </Link>
              </article>
            ))}
          </div>

          <div className="mb-20">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{faq.q}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center p-10 rounded-2xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-emerald-500/20">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Ready to automate?</h2>
            <p className="text-[var(--text-secondary)] mb-6">Free forever. No credit card. Works on WhatsApp and Telegram.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
