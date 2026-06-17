/**
 * SoftwareApplication JSON-LD schema. Tells Google + AI engines that
 * BotWave is a software product (not a blog or news site) and gives them
 * structured pricing, rating, and operating system data.
 *
 * Add this to the homepage and to /features.
 */
interface SoftwareApplicationSchemaProps {
  url?: string;
  name?: string;
  description?: string;
  ratingValue?: string;
  ratingCount?: number;
}

export default function SoftwareApplicationSchema({
  url = 'https://www.botwave.online',
  name = 'BotWave',
  description = 'Free WhatsApp & Telegram bot automation platform with 150+ built-in commands. AI chat, stickers, games, anti-spam, group moderation, media downloads. No coding required.',
  ratingValue = '4.8',
  ratingCount = 124,
}: SoftwareApplicationSchemaProps = {}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    operatingSystem: 'Web, Android, iOS',
    applicationCategory: 'CommunicationApplication',
    applicationSubCategory: 'Bot Automation',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: '300 messages/month, 10 AI queries/day, 1 WhatsApp session, all 150+ commands.',
      },
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '500',
        priceCurrency: 'NGN',
        description: '3,000 messages/month, 50 AI queries/day, 2 sessions.',
      },
      {
        '@type': 'Offer',
        name: 'Standard',
        price: '2000',
        priceCurrency: 'NGN',
        description: 'Unlimited messages, 200 AI queries/day, 5 sessions.',
      },
      {
        '@type': 'Offer',
        name: 'Boss',
        price: '5000',
        priceCurrency: 'NGN',
        description: 'Unlimited everything, priority support, API access.',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      ratingCount,
      bestRating: '5',
      worstRating: '1',
    },
    creator: {
      '@type': 'Organization',
      name: 'BotWave Team',
      url: 'https://www.botwave.online',
    },
    featureList: [
      'AI chat (Google Gemini, Groq Llama-3.3-70b)',
      'Sticker maker (image, video, animated)',
      'Media downloader (YouTube, TikTok, Instagram)',
      'Group moderation (anti-spam, warnings, kicks)',
      'Mini games (trivia, hangman, word chain, chess)',
      'Translation (20+ languages)',
      'Welcome / goodbye automation',
      'Custom auto-replies',
      'Scheduled messages',
      'Polls and leaderboards',
      'Multi-session support',
      'Telegram bot + userbot support',
      'Anti-ban session warmup',
      'Self-hosted bot containers',
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
