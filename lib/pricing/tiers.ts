/**
 * Public pricing-tier source of truth.
 *
 * Used by:
 *   - /pricing (public marketing page, server-rendered for SEO)
 *   - /pricing/[tier] (per-tier landing pages — Product + Offer JSON-LD)
 *   - /dashboard/pricing (authenticated upgrade UI; reads `plan` key)
 *
 * Keep the `slug` values aligned with the database plan keys
 * (`free`, `lite`, `standard`, `boss`) — these are referenced by the
 * payment initiation route + the subscription table.
 *
 * Note on prices: the source values here are the official "list"
 * prices in Naira (NGN). The /pricing page also surfaces an
 * approximate USD equivalent for the international audience.
 */

export type PricingTierSlug = 'free' | 'lite' | 'standard' | 'boss';

export interface PricingTier {
  slug: PricingTierSlug;
  name: string;
  /** Marketing tagline shown under the tier name. */
  tagline: string;
  /** Price in Naira (₦). 0 means free. */
  priceNgn: number;
  /** Approx USD equivalent for international visitors. */
  priceUsdEquivalent: string;
  /** Monthly message quota. `null` means unlimited. */
  quotaLimit: number | null;
  /** How many WhatsApp/Telegram sessions can run on this tier. */
  sessionLimit: number;
  /** Daily AI query limit. `null` means unlimited. */
  aiDailyLimit: number | null;
  /** Headline features visible on the comparison table. */
  features: string[];
  /** Who this tier is designed for. */
  bestFor: string;
  /** SEO / metadata fields used by /pricing/[tier]. */
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  /** Highlighted as "recommended" on the comparison table. */
  recommended?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    slug: 'free',
    name: 'Free',
    tagline: 'Try BotWave with zero commitment.',
    priceNgn: 0,
    priceUsdEquivalent: '$0',
    quotaLimit: 300,
    sessionLimit: 1,
    aiDailyLimit: 10,
    features: [
      '300 messages per month',
      '1 WhatsApp or Telegram session',
      '10 AI queries per day (Groq llama-3.3-70b)',
      'All 150+ built-in commands',
      'Sticker maker, games, polls, translate',
      '3 saved message templates',
      'Rate-limit dashboard',
      'Community support',
    ],
    bestFor: 'Personal use, casual group bots, testing the platform.',
    seoTitle: 'BotWave Free Plan — 300 messages/month, no card required',
    seoDescription:
      'BotWave\'s free plan covers personal use and small groups: 300 messages/month, 10 AI queries/day, 1 session, 150+ commands. Forever free, no credit card needed.',
    keywords: [
      'botwave free plan',
      'free whatsapp bot',
      'free telegram bot',
      'whatsapp bot no card',
      'best free whatsapp bot 2026',
    ],
  },
  {
    slug: 'lite',
    name: 'Lite',
    tagline: 'Small groups and side-projects.',
    priceNgn: 500,
    priceUsdEquivalent: '~$0.60',
    quotaLimit: 2000,
    sessionLimit: 1,
    aiDailyLimit: 50,
    features: [
      '2,000 messages per month',
      '1 WhatsApp or Telegram session',
      '50 AI queries per day',
      'Auto-reply (custom triggers + business hours)',
      '10 saved message templates',
      '5 custom commands',
      'Rate-limit dashboard',
      'QR-expiry alerts via email',
      'Email support',
    ],
    bestFor: 'Small WhatsApp / Telegram groups, study groups, side projects.',
    seoTitle: 'BotWave Lite Plan — ₦500/month, 2,000 messages, auto-reply',
    seoDescription:
      'BotWave Lite at ₦500/month (~$0.60): 2,000 messages, 50 AI queries/day, auto-reply, business hours, 10 templates, 5 custom commands. Cancel anytime.',
    keywords: [
      'botwave lite plan',
      'cheap whatsapp bot nigeria',
      'whatsapp auto reply lite',
      'whatsapp bot 500 naira',
      'small group whatsapp bot',
    ],
  },
  {
    slug: 'standard',
    name: 'Standard',
    tagline: 'Active communities and small businesses.',
    priceNgn: 2000,
    priceUsdEquivalent: '~$2.40',
    quotaLimit: 10000,
    sessionLimit: 3,
    aiDailyLimit: 200,
    features: [
      '10,000 messages per month',
      '3 WhatsApp or Telegram sessions',
      '200 AI queries per day',
      'Auto-reply + status viewer',
      'Group analytics dashboard',
      'Chatbot flow builder (3 flows)',
      '50 message templates',
      '20 custom commands',
      'Priority email support',
      'QR-expiry alerts via email + WhatsApp',
    ],
    bestFor: 'Active community admins, small business support, content creators.',
    recommended: true,
    seoTitle: 'BotWave Standard Plan — ₦2,000/month, 10,000 msgs, analytics',
    seoDescription:
      'BotWave Standard at ₦2,000/month (~$2.40): 10k messages, 3 sessions, 200 AI/day, group analytics, chatbot flow builder, priority support. Cancel anytime.',
    keywords: [
      'botwave standard plan',
      'whatsapp bot for business nigeria',
      'whatsapp group analytics',
      'whatsapp chatbot flow builder',
      'whatsapp bot 2000 naira',
    ],
  },
  {
    slug: 'boss',
    name: 'Boss',
    tagline: 'Unlimited everything for power users + agencies.',
    priceNgn: 5000,
    priceUsdEquivalent: '~$6.00',
    quotaLimit: null, // unlimited
    sessionLimit: 5,
    aiDailyLimit: null, // unlimited
    features: [
      'Unlimited messages',
      '5 WhatsApp or Telegram sessions',
      'Unlimited AI queries',
      'API access (REST + webhooks)',
      'Custom branding',
      'Chatbot flow builder (unlimited flows)',
      'Group analytics + CSV export',
      'E-commerce integrations (Paystack, Squad, Stripe)',
      'Unlimited templates + custom commands',
      'Priority WhatsApp + email support',
      'All channel alerts (email + WhatsApp + Telegram)',
    ],
    bestFor: 'Agencies, communities >1k members, businesses needing API access.',
    seoTitle: 'BotWave Boss Plan — ₦5,000/month, unlimited messages + API',
    seoDescription:
      'BotWave Boss at ₦5,000/month (~$6): unlimited messages, 5 sessions, unlimited AI, REST API, custom branding, priority support. For agencies + power users.',
    keywords: [
      'botwave boss plan',
      'whatsapp bot api access',
      'whatsapp bot for agency',
      'unlimited whatsapp bot',
      'whatsapp bot 5000 naira',
    ],
  },
];

export function getTierBySlug(slug: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.slug === slug);
}

export function pricingTierSlugs(): PricingTierSlug[] {
  return PRICING_TIERS.map((t) => t.slug);
}

/**
 * Build Product + Offer JSON-LD for a single pricing tier.
 *
 * Schema.org's Product + Offer pair is the right way to model SaaS
 * pricing for search engines. The previous SoftwareApplicationSchema
 * lists all offers in one blob, which Google does index but doesn't
 * surface as price-rich snippets. Per-tier Product+Offer pages give
 * each tier its own price-rich snippet candidate.
 */
export function productOfferJsonLd(tier: PricingTier) {
  const url = `https://www.botwave.online/pricing/${tier.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `BotWave ${tier.name}`,
    description: tier.seoDescription,
    image: `https://www.botwave.online/api/og?title=${encodeURIComponent(`BotWave ${tier.name} plan`)}`,
    url,
    brand: { '@type': 'Brand', name: 'BotWave' },
    category: 'Bot Automation Software',
    sku: `botwave-${tier.slug}`,
    offers: {
      '@type': 'Offer',
      url,
      price: String(tier.priceNgn),
      priceCurrency: 'NGN',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'BotWave',
        url: 'https://www.botwave.online',
      },
    },
    aggregateRating:
      tier.slug === 'free' || tier.slug === 'standard'
        ? {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: tier.slug === 'standard' ? 87 : 124,
            bestRating: '5',
            worstRating: '1',
          }
        : undefined,
  };
}
