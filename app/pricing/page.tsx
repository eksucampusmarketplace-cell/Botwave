import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import { PRICING_TIERS, productOfferJsonLd } from '@/lib/pricing/tiers';

const LAST_UPDATED = '2026-05-22';

export const metadata: Metadata = {
  title: 'BotWave Pricing, Free, Lite ₦500, Standard ₦2,000, Boss ₦5,000',
  description:
    'Transparent pricing for the BotWave WhatsApp + Telegram bot platform. Free forever (300 msgs/mo) or paid plans from ₦500/month (~$0.60). No credit card required to start.',
  keywords: [
    'botwave pricing',
    'whatsapp bot price nigeria',
    'whatsapp bot subscription',
    'cheap whatsapp bot',
    'free whatsapp bot 2026',
    'whatsapp bot naira',
    'telegram bot pricing',
  ],
  openGraph: {
    title: 'BotWave pricing, free forever or from ₦500/month',
    description:
      'Honest plans, no hidden fees. Free 300 msgs/month plan or upgrade for higher limits, group analytics, API access.',
    url: 'https://www.botwave.online/pricing',
    type: 'website',
    images: [
      {
        url: '/api/og?title=BotWave+Pricing',
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: { canonical: '/pricing' },
};

const faqs = [
  {
    question: 'Is the BotWave free plan really free?',
    answer:
      'Yes. The Free tier is permanently free, no card required, no trial expiry. You get 300 messages per month, 10 AI queries per day, 1 paired session, and access to all 150+ built-in commands. We only ask for payment if you outgrow the free limits.',
  },
  {
    question: 'How does monthly billing work?',
    answer:
      'Paid plans renew every 30 days from the day you upgrade. We bill in Naira via Squad (Paystack for some accounts). Cancel anytime from your dashboard, there are no lock-in contracts and refunds are issued for the unused portion of the current cycle on request.',
  },
  {
    question: 'Can I switch plans up or down?',
    answer:
      'Yes. Switching plans is instant, limits are recalculated immediately, and we prorate the price difference. Downgrading mid-cycle moves you to the lower plan at the start of the next billing period so you do not lose paid value.',
  },
  {
    question: 'Do I need a credit card to start?',
    answer:
      'No. Sign up with email + WhatsApp number, you can run the entire Free tier without ever entering payment info. A payment method is only required when you click Upgrade.',
  },
  {
    question: 'Which payment methods are supported?',
    answer:
      'Squad (Naira card, bank transfer, USSD) and Paystack on selected accounts. International cards work via Squad\'s international gateway. Crypto and PayPal are on the roadmap for 2026 Q3.',
  },
  {
    question: 'What counts as "1 message"?',
    answer:
      'One outbound message from the bot, replies, AI responses, group welcomes, scheduled posts, broadcasts. Incoming messages to the bot are NOT counted. Internal status pings (heartbeats) are not counted either.',
  },
  {
    question: 'Is there a discount for annual billing or NGOs?',
    answer:
      'Yes. Annual billing gives 2 months free (pay for 10, get 12). Verified NGOs, student clubs, and educational institutions get the Standard plan free for the first year, email support@botwave.online with proof of status.',
  },
  {
    question: 'What happens if I exceed my message quota?',
    answer:
      'The bot keeps replying, we never silently drop messages, but the dashboard surfaces a banner suggesting an upgrade and we email you a soft reminder. You only get hard-blocked if you exceed 2× your quota for two cycles in a row.',
  },
];

function formatPrice(tier: (typeof PRICING_TIERS)[number]): string {
  if (tier.priceNgn === 0) return 'Free';
  return `₦${tier.priceNgn.toLocaleString('en-NG')}`;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Pricing', url: '/pricing' },
        ]}
      />
      <FAQSchema items={faqs} />
      {/* One Product + Offer JSON-LD per tier so each plan is its own
          rich-result candidate. The /pricing/[tier] sub-pages re-emit
          the same data but as a single Product per page. */}
      {PRICING_TIERS.map((tier) => (
        <script
          key={tier.slug}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productOfferJsonLd(tier)),
          }}
        />
      ))}
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Pricing</span>
          </nav>

          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">
              Transparent pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
              Honest plans. No hidden fees.
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Start free, upgrade when you outgrow it. Naira-native billing, monthly cycles, cancel anytime.
              All plans include every BotWave command, paid tiers just lift the limits.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Last reviewed: {new Date(LAST_UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.slug}
                className={`relative rounded-2xl border bg-[var(--card-bg,var(--surface))] p-6 ${
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
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                  {tier.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">{tier.tagline}</p>
                <div className="mb-4">
                  <div className="text-4xl font-extrabold text-[var(--text-primary)]">
                    {formatPrice(tier)}
                  </div>
                  {tier.priceNgn > 0 && (
                    <div className="text-xs text-[var(--text-muted)]">
                      {tier.priceUsdEquivalent} / month
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-6 list-none">
                  {tier.features.map((f, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-secondary)] leading-relaxed flex items-start gap-2"
                    >
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <Link
                    href={`/pricing/${tier.slug}`}
                    className="block w-full text-center px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
                  >
                    Plan details →
                  </Link>
                  <Link
                    href="/signup"
                    className={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${
                      tier.recommended
                        ? 'bg-emerald-500 text-white hover:opacity-90'
                        : 'bg-[var(--primary)] text-white hover:opacity-90'
                    }`}
                  >
                    {tier.priceNgn === 0 ? 'Start free' : 'Choose plan'}
                  </Link>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
                  {tier.bestFor}
                </p>
              </article>
            ))}
          </div>

          {/* Comparison table, every plan side-by-side. */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Plans at a glance
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--card-bg,var(--surface))]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]"></th>
                    {PRICING_TIERS.map((t) => (
                      <th
                        key={t.slug}
                        className="text-left p-3 font-medium text-[var(--text-primary)]"
                      >
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium text-[var(--text-primary)]">Price (NGN)</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.slug} className="p-3">{formatPrice(t)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium text-[var(--text-primary)]">Messages / month</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.slug} className="p-3">
                        {t.quotaLimit === null ? 'Unlimited' : t.quotaLimit.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium text-[var(--text-primary)]">Paired sessions</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.slug} className="p-3">{t.sessionLimit}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium text-[var(--text-primary)]">AI queries / day</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.slug} className="p-3">
                        {t.aiDailyLimit === null ? 'Unlimited' : t.aiDailyLimit}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-medium text-[var(--text-primary)]">Best for</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.slug} className="p-3 align-top">
                        {t.bestFor}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Why honest pricing matters */}
          <section className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-2">No surprise fees</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                What you see is what you pay. No per-message charges on the paid tiers, no setup fees, no card-mandatory free trial.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Naira-native billing</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We price in NGN and bill via Squad / Paystack, zero FX fees for Nigerian customers. International cards work too via the Squad global gateway.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Cancel anytime</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                One-click cancel from the dashboard. We prorate refunds for the unused portion of the current cycle on request, no chargebacks needed.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Pricing FAQ
            </h2>
            <div className="space-y-5">
              {faqs.map((f, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]"
                >
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.question}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA strip */}
          <section className="p-8 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] mb-2">
              Still deciding? Start with the free plan.
            </h2>
            <p className="text-[var(--text-secondary)] mb-5 max-w-xl mx-auto">
              No card. No trial expiry. Use BotWave for as long as the 300 msgs/month covers you, then upgrade only if you need more.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:opacity-90 text-white text-sm font-semibold transition-opacity"
              >
                Create free account →
              </Link>
              <Link
                href="/faq"
                className="px-5 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
              >
                Read the FAQ
              </Link>
            </div>
          </section>

          {/* Related links, internal-link mesh for SEO */}
          <section className="mt-10 text-sm text-[var(--text-muted)] text-center">
            See also:{' '}
            <Link href="/compare" className="text-blue-500 hover:underline">
              comparisons
            </Link>{' '}
            ·{' '}
            <Link href="/use-cases" className="text-blue-500 hover:underline">
              use cases
            </Link>{' '}
            ·{' '}
            <Link href="/security" className="text-blue-500 hover:underline">
              security
            </Link>{' '}
            ·{' '}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              privacy
            </Link>{' '}
            ·{' '}
            <Link href="/terms" className="text-blue-500 hover:underline">
              terms
            </Link>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
