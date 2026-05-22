import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import { PRICING_TIERS, getTierBySlug, productOfferJsonLd, pricingTierSlugs } from '@/lib/pricing/tiers';

export function generateStaticParams() {
  return pricingTierSlugs().map((slug) => ({ tier: slug }));
}

export function generateMetadata({ params }: { params: { tier: string } }): Metadata {
  const tier = getTierBySlug(params.tier);
  if (!tier) return {};
  return {
    title: tier.seoTitle,
    description: tier.seoDescription,
    keywords: tier.keywords,
    openGraph: {
      title: tier.seoTitle,
      description: tier.seoDescription,
      url: `https://www.botwave.online/pricing/${tier.slug}`,
      type: 'website',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`BotWave ${tier.name} plan`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: { canonical: `/pricing/${tier.slug}` },
  };
}

function formatPrice(priceNgn: number, usd: string): string {
  if (priceNgn === 0) return 'Free';
  return `₦${priceNgn.toLocaleString('en-NG')} / month (${usd})`;
}

const tierFaqs: Record<string, { question: string; answer: string }[]> = {
  free: [
    {
      question: 'How long does the Free plan last?',
      answer:
        'Forever. There is no time limit on the Free plan, it is not a trial. You get 300 messages every month for as long as you keep your account.',
    },
    {
      question: 'What happens if I send my 301st message in a month?',
      answer:
        'The bot keeps replying for a small grace buffer, then we surface a friendly upgrade banner in the dashboard. We never silently mute the bot mid-conversation.',
    },
    {
      question: 'Does the Free plan include AI?',
      answer:
        'Yes, 10 !ai queries per day. That is enough for casual personal use. For a busy group, the Standard plan\'s 200 AI/day is a better fit.',
    },
  ],
  lite: [
    {
      question: 'What is the cheapest BotWave paid plan?',
      answer:
        'Lite at ₦500/month (~$0.60). It includes auto-reply, business hours, 10 templates, and 5 custom commands, designed for small groups and side projects.',
    },
    {
      question: 'Can I do business automation on the Lite plan?',
      answer:
        'Yes for small operations (~2,000 messages/month). For active customer-support inboxes or larger communities, Standard or Boss is a better fit.',
    },
    {
      question: 'Does Lite include group analytics?',
      answer:
        'Not on Lite. Group analytics is a Standard-and-up feature. Lite focuses on auto-reply + custom commands at the lowest possible price.',
    },
  ],
  standard: [
    {
      question: 'Why is Standard "the most popular" plan?',
      answer:
        'It hits the sweet spot for active community admins and small businesses, 10,000 messages, 3 sessions, 200 AI/day, group analytics, chatbot flow builder, and priority support, all for ₦2,000 ($2.40) / month.',
    },
    {
      question: 'What does the chatbot flow builder do?',
      answer:
        'Drag-and-drop visual flows: trigger → condition → action. Set up appointment booking, FAQ trees, lead capture, or onboarding sequences without writing code. Standard includes 3 flows; Boss is unlimited.',
    },
    {
      question: 'Can I run a Telegram bot on the Standard plan?',
      answer:
        'Yes. The 3 paired sessions can be any mix of WhatsApp + Telegram, e.g. 2 WhatsApp groups and 1 Telegram group, or all 3 on Telegram.',
    },
  ],
  boss: [
    {
      question: 'What does API access on the Boss plan let me do?',
      answer:
        'REST endpoints + webhooks to: send messages, broadcast to lists, query message stats, manage groups (add/remove, role changes), trigger custom commands programmatically. Full docs at /docs/api after you upgrade.',
    },
    {
      question: 'Is Boss suitable for agencies running bots for multiple clients?',
      answer:
        'Yes, 5 sessions cover up to 5 client communities, and the API + custom branding combo lets agencies whitelabel BotWave inside their own dashboards. For >5 clients, contact us about an Enterprise tier with per-client tenancy.',
    },
    {
      question: 'Does Boss include any enterprise SLA?',
      answer:
        'Boss includes priority WhatsApp + email support and best-effort response within 4 working hours. A formal SLA (uptime guarantee, dedicated channel) is available on the upcoming Enterprise plan.',
    },
  ],
};

export default function PricingTierPage({ params }: { params: { tier: string } }) {
  const tier = getTierBySlug(params.tier);
  if (!tier) notFound();

  const faqs = [...(tierFaqs[tier.slug] ?? [])];
  // Always include a "compare plans" Q&A so each page has at least one
  // generic Q (helpful for AI-engine ingestion).
  faqs.push({
    question: `How does the ${tier.name} plan compare to other BotWave plans?`,
    answer: `BotWave has four tiers, Free, Lite, Standard, and Boss. ${tier.name} is the ${
      tier.slug === 'free'
        ? 'entry point, 300 messages/month at zero cost, ideal for personal use.'
        : tier.slug === 'lite'
        ? 'cheapest paid plan, ₦500/month for small groups and side projects.'
        : tier.slug === 'standard'
        ? 'most popular tier, ₦2,000/month with group analytics, chatbot flows, priority support.'
        : 'top tier, ₦5,000/month with unlimited messages, API access, custom branding.'
    } See the full /pricing page for a side-by-side comparison.`,
  });

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Pricing', url: '/pricing' },
          { name: tier.name, url: `/pricing/${tier.slug}` },
        ]}
      />
      <FAQSchema items={faqs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productOfferJsonLd(tier)),
        }}
      />
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/pricing" className="hover:text-[var(--primary)]">Pricing</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{tier.name}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">
            {tier.recommended ? 'Most popular plan' : 'BotWave plan'}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-3">
            BotWave {tier.name}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-2">{tier.tagline}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mb-8">
            {formatPrice(tier.priceNgn, tier.priceUsdEquivalent)}
          </p>

          {/* Features card */}
          <section className="mb-10 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              What&apos;s included
            </h2>
            <ul className="space-y-2 list-none">
              {tier.features.map((f, i) => (
                <li
                  key={i}
                  className="text-sm text-[var(--text-secondary)] leading-relaxed flex items-start gap-3"
                >
                  <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Best-for + limits */}
          <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Designed for
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tier.bestFor}</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Limits at a glance
              </h3>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-none">
                <li>
                  Messages / month:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {tier.quotaLimit === null ? 'Unlimited' : tier.quotaLimit.toLocaleString()}
                  </strong>
                </li>
                <li>
                  Paired sessions: <strong className="text-[var(--text-primary)]">{tier.sessionLimit}</strong>
                </li>
                <li>
                  AI queries / day:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {tier.aiDailyLimit === null ? 'Unlimited' : tier.aiDailyLimit}
                  </strong>
                </li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 text-center">
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
              {tier.priceNgn === 0 ? 'Ready to try BotWave?' : `Ready to upgrade to ${tier.name}?`}
            </h2>
            <p className="text-[var(--text-secondary)] mb-5 max-w-xl mx-auto">
              {tier.priceNgn === 0
                ? 'Create a free account, pair your number, run 150+ commands. No card required.'
                : 'Sign in (or sign up) and click Upgrade in your dashboard, billing is monthly and you can cancel anytime.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={tier.priceNgn === 0 ? '/signup' : '/dashboard/pricing'}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:opacity-90 text-white text-sm font-semibold transition-opacity"
              >
                {tier.priceNgn === 0 ? 'Create free account →' : `Upgrade to ${tier.name} →`}
              </Link>
              <Link
                href="/pricing"
                className="px-5 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
              >
                Compare all plans
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              {tier.name} plan, FAQ
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

          {/* Other tiers, internal-link mesh */}
          <section className="text-sm text-[var(--text-secondary)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Other BotWave plans</h2>
            <ul className="space-y-1 list-none">
              {PRICING_TIERS.filter((t) => t.slug !== tier.slug).map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/pricing/${other.slug}`}
                    className="text-blue-500 hover:underline"
                  >
                    {other.name}, {formatPrice(other.priceNgn, other.priceUsdEquivalent)}
                  </Link>
                  <span className="text-[var(--text-muted)]"> · {other.bestFor}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
