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

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does BotWave work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BotWave connects to your WhatsApp or Telegram account via QR code. Once connected, the bot runs from your device IP with 150+ commands including AI chat, sticker maker, media downloader, auto-replies, and group management.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is BotWave free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, BotWave offers a free tier with essential features. Premium plans unlock advanced features like AI chat, scheduled messages, analytics, and higher message limits.',
      },
    },
    {
      '@type': 'Question',
      name: 'Will my WhatsApp account get banned?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BotWave uses advanced anti-ban technology including session warmup, daily message caps, human-like typing simulation, and presence scheduling to minimize ban risk. The bot runs from your own device IP, not a shared server.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does BotWave support Telegram?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, BotWave supports Telegram Bots and Telegram Userbots. You can manage groups, set up welcome messages, anti-spam, captcha verification, and more.',
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', url: '/' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePage />
    </>
  );
}
