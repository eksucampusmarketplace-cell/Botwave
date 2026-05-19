import type { MetadataRoute } from 'next';
import { whatsappCommands, telegramCommands, userbotCommands } from '@/lib/commands/data';
import { docPages } from '@/lib/docs/data';
import { faqItems } from '@/lib/faq/data';
import { useCases } from '@/lib/usecases/data';
import { fixPages } from '@/lib/fix/data';
import { howToPages } from '@/lib/howto/data';
import { comparePages as compareData } from '@/lib/compare/data';
import { landingPages } from '@/lib/landing/data';

const LANDING_CHUNK_SIZE = 5000;

export async function generateSitemaps() {
  const landingChunks = Math.ceil(landingPages.length / LANDING_CHUNK_SIZE);
  const ids = [
    { id: 0 },  // core pages
    { id: 1 },  // commands
    { id: 2 },  // docs, faq, use-cases, compare, fix, how-to
    { id: 3 },  // blog posts
  ];
  for (let i = 0; i < landingChunks; i++) {
    ids.push({ id: 10 + i }); // landing pages chunks start at id=10
  }
  return ids;
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.botwave.online';

  if (id === 0) return corePages(baseUrl);
  if (id === 1) return commandPages(baseUrl);
  if (id === 2) return contentPages(baseUrl);
  if (id === 3) return blogPages(baseUrl);
  if (id >= 10) return landingChunk(baseUrl, id - 10);

  return [];
}

function corePages(baseUrl: string): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date('2026-05-16'), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/signup`, lastModified: new Date('2026-05-07'), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date('2026-05-07'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/features`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/features/ai`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/features/moderation`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/features/media`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/status`, lastModified: new Date('2026-05-19'), changeFrequency: 'daily', priority: 0.5 },
    { url: `${baseUrl}/changelog`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/templates`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/integrations`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/academy`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/case-studies`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/security`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/community-commands`, lastModified: new Date('2026-05-19'), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date('2026-05-19'), changeFrequency: 'monthly', priority: 0.6 },
  ];
}

function commandPages(baseUrl: string): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/commands`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/commands/whatsapp`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/telegram`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/userbot`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.7 },
    ...whatsappCommands.map(cmd => ({
      url: `${baseUrl}/commands/whatsapp/${cmd.slug}`,
      lastModified: new Date('2026-05-15'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...telegramCommands.map(cmd => ({
      url: `${baseUrl}/commands/telegram/${cmd.slug}`,
      lastModified: new Date('2026-05-15'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...userbotCommands.map(cmd => ({
      url: `${baseUrl}/commands/userbot/${cmd.slug}`,
      lastModified: new Date('2026-05-15'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}

function contentPages(baseUrl: string): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/docs`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.9 },
    ...docPages.map(doc => ({
      url: `${baseUrl}/docs/${doc.slug}`,
      lastModified: new Date('2026-05-14'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/faq`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.7 },
    ...faqItems.map(faq => ({
      url: `${baseUrl}/faq/${faq.slug}`,
      lastModified: new Date('2026-05-12'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    { url: `${baseUrl}/use-cases`, lastModified: new Date('2026-05-16'), changeFrequency: 'monthly', priority: 0.8 },
    ...useCases.map(uc => ({
      url: `${baseUrl}/use-cases/${uc.slug}`,
      lastModified: new Date('2026-05-14'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/compare`, lastModified: new Date('2026-05-16'), changeFrequency: 'monthly', priority: 0.7 },
    ...compareData.map(page => ({
      url: `${baseUrl}/compare/${page.slug}`,
      lastModified: new Date('2026-05-14'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/fix`, lastModified: new Date('2026-05-16'), changeFrequency: 'weekly', priority: 0.7 },
    ...fixPages.map(page => ({
      url: `${baseUrl}/fix/${page.slug}`,
      lastModified: new Date('2026-05-14'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/how-to`, lastModified: new Date('2026-05-16'), changeFrequency: 'weekly', priority: 0.8 },
    ...howToPages.map(page => ({
      url: `${baseUrl}/how-to/${page.slug}`,
      lastModified: new Date('2026-05-14'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}

function blogPages(baseUrl: string): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/blog`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-create-free-whatsapp-bot-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/blog/best-free-whatsapp-bot-groups-nigeria`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/whatsapp-bot-vs-telegram-bot-africa`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/whatsapp-bot-for-business-nigeria`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/free-whatsapp-group-management-bot`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-automate-whatsapp-messages-free`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/best-free-bot-platforms-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/free-whatsapp-sticker-bot-how-to-make-stickers`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-commands-list-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-anti-spam-bot-for-groups`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-ai-chatbot-free`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-for-schools-campus-groups`, lastModified: new Date('2026-05-13'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-south-africa`, lastModified: new Date('2026-05-13'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-bot-for-groups-nigeria`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/telegram-userbot-automation`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/free-telegram-group-management-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-bot-vs-whatsapp-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-anti-spam-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
  ];
}

function landingChunk(baseUrl: string, chunkIndex: number): MetadataRoute.Sitemap {
  const start = chunkIndex * LANDING_CHUNK_SIZE;
  const end = Math.min(start + LANDING_CHUNK_SIZE, landingPages.length);
  const chunk = landingPages.slice(start, end);

  return chunk.map((page, i) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date('2026-05-17'),
    changeFrequency: 'monthly' as const,
    priority: page.category === 'country' ? 0.6 : 0.5,
  }));
}
