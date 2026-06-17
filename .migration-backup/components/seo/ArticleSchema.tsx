/**
 * JSON-LD Article schema for blog posts.
 *
 * Helps search engines (Google, Bing, Yandex, Baidu) and AI engines
 * (Perplexity, ChatGPT Search, Brave Leo, You.com) understand the
 * post is a primary article with author/publisher/dates.
 */

interface ArticleSchemaProps {
  /** Canonical URL of the article — full URL including https://www.botwave.online. */
  url: string;
  /** Article title (same as h1, ≤ 110 chars). */
  headline: string;
  /** 1–2 sentence summary. */
  description: string;
  /** Author display name. Defaults to BotWave Team. */
  authorName?: string;
  /** ISO date the post was first published. */
  datePublished: string;
  /** ISO date of the most recent modification. */
  dateModified?: string;
  /** Optional hero image URL (full URL). */
  image?: string;
  /** Section / category. */
  section?: string;
  /** 2–8 keywords. */
  keywords?: string[];
  /** Word count, optional. */
  wordCount?: number;
}

export default function ArticleSchema({
  url,
  headline,
  description,
  authorName = 'BotWave Team',
  datePublished,
  dateModified,
  image,
  section,
  keywords,
  wordCount,
}: ArticleSchemaProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline,
    description,
    image: image
      ? [image]
      : [`https://www.botwave.online/api/og?title=${encodeURIComponent(headline)}`],
    author: {
      '@type': 'Organization',
      name: authorName,
      url: 'https://www.botwave.online',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BotWave',
      url: 'https://www.botwave.online',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.botwave.online/icon-512.png',
      },
    },
    datePublished,
    dateModified: dateModified ?? datePublished,
    ...(section ? { articleSection: section } : {}),
    ...(keywords && keywords.length ? { keywords: keywords.join(', ') } : {}),
    ...(wordCount ? { wordCount } : {}),
    inLanguage: 'en',
  } as const;

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
