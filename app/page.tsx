import type { Metadata } from 'next';
import HomePage from './HomePageClient';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  description: 'Free WhatsApp & Telegram bot with 150+ commands. AI chat, stickers, anti-spam, group management. No coding. Used by 5,000+ users in Nigeria.',
  alternates: {
    canonical: '/',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/',
    },
  },
};

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'BotWave',
  applicationCategory: 'CommunicationApplication',
  operatingSystem: 'Web',
  url: 'https://www.botwave.online',
  description: 'WhatsApp & Telegram bot automation platform. Connect your number, get 150+ commands, AI chat, anti-spam, sticker maker, and more.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier available with premium plans',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '120',
    bestRating: '5',
  },
};

// FAQPage JSON-LD intentionally not emitted from the homepage. The same
// questions already render on /faq with a single canonical FAQPage block,
// and duplicating them here triggered Google Search Console "FAQ enhancement
// invalid" reports. The site keeps a single source of truth for FAQ schema.

export default function Page() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', url: '/' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <HomePage />
    </>
  );
}
