import type { MetadataRoute } from 'next';

// Crawlers we explicitly want indexing the public site. Listing them by name
// (in addition to the catch-all '*' rule) is a positive signal that the site
// is happy to be crawled by each engine. Most matter for "AI answer engines"
// — Perplexity, ChatGPT search, Claude, Brave Leo etc. — which look at a
// host's posture toward their named UA before deciding to ingest pages.
//
// Order: traditional search → AI/LLM crawlers → ad/media crawlers we don't
// want eating crawl budget. The catch-all (`*`) at the end keeps any
// unlisted bot allowed by default.
const PRIVATE_PATHS = ['/api/', '/dashboard/', '/admin/'];

const ALLOWED_BOTS = [
  // Traditional search engines
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Bingbot',
  'Slurp',          // Yahoo
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'Applebot',
  // AI / LLM crawlers (training + live search)
  'GPTBot',         // OpenAI training crawler
  'OAI-SearchBot',  // ChatGPT live search
  'ChatGPT-User',   // ChatGPT live browsing
  'Google-Extended', // Google AI training (Gemini)
  'ClaudeBot',      // Anthropic web crawler
  'Claude-Web',     // Anthropic live browsing
  'anthropic-ai',   // Anthropic legacy UA
  'PerplexityBot',  // Perplexity training
  'Perplexity-User', // Perplexity live search
  'CCBot',          // Common Crawl (feeds many LLMs)
  'Bytespider',     // ByteDance / Doubao
  'Amazonbot',      // Alexa / Amazon AI
  'cohere-ai',      // Cohere
  'Diffbot',
  'FacebookBot',    // Meta AI
  'Meta-ExternalAgent',
  'ImagesiftBot',
  'Omgilibot',
  'YouBot',         // You.com
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...ALLOWED_BOTS.map(userAgent => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
      // Catch-all: any other crawler is still allowed by default.
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: 'https://www.botwave.online/sitemap.xml',
    host: 'https://www.botwave.online',
  };
}
