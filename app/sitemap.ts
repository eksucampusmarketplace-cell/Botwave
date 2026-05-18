import type { MetadataRoute } from 'next';
import { whatsappCommands, telegramCommands, userbotCommands } from '@/lib/commands/data';
import { docPages } from '@/lib/docs/data';
import { faqItems } from '@/lib/faq/data';
import { useCases } from '@/lib/usecases/data';
import { fixPages } from '@/lib/fix/data';
import { howToPages } from '@/lib/howto/data';
import { comparePages as compareData } from '@/lib/compare/data';
import { landingPages } from '@/lib/landing/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.botwave.online';
  const now = new Date('2026-05-18');

  const commandPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/commands`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/commands/whatsapp`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/telegram`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/userbot`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...whatsappCommands.map(cmd => ({
      url: `${baseUrl}/commands/whatsapp/${cmd.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...telegramCommands.map(cmd => ({
      url: `${baseUrl}/commands/telegram/${cmd.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...userbotCommands.map(cmd => ({
      url: `${baseUrl}/commands/userbot/${cmd.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const docsPagesSitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...docPages.map(doc => ({
      url: `${baseUrl}/docs/${doc.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const faqPagesSitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...faqItems.map(faq => ({
      url: `${baseUrl}/faq/${faq.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  const useCasePages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/use-cases`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...useCases.map(uc => ({
      url: `${baseUrl}/use-cases/${uc.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const comparePagesSitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...compareData.map(page => ({
      url: `${baseUrl}/compare/${page.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const fixPagesSitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/fix`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...fixPages.map(page => ({
      url: `${baseUrl}/fix/${page.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const howToPagesSitemap: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/how-to`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...howToPages.map(page => ({
      url: `${baseUrl}/how-to/${page.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  return [
    ...commandPages,
    ...docsPagesSitemap,
    ...faqPagesSitemap,
    ...useCasePages,
    ...comparePagesSitemap,
    ...fixPagesSitemap,
    ...howToPagesSitemap,
    ...landingPages.map(page => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    {
      url: baseUrl,
      lastModified: new Date('2026-05-16'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date('2026-05-07'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date('2026-05-07'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/how-to-create-free-whatsapp-bot-2026`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/best-free-whatsapp-bot-groups-nigeria`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-bot-vs-telegram-bot-africa`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-bot-for-business-nigeria`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/free-whatsapp-group-management-bot`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/how-to-automate-whatsapp-messages-free`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/best-free-bot-platforms-2026`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/free-whatsapp-sticker-bot-how-to-make-stickers`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-bot-commands-list-2026`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-anti-spam-bot-for-groups`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-ai-chatbot-free`,
      lastModified: new Date('2026-05-10'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-bot-for-schools-campus-groups`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/whatsapp-bot-south-africa`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Country landing pages (whatsapp-bot-nigeria, etc) are now generated from lib/landing/data.ts
    // Telegram blog posts
    {
      url: `${baseUrl}/blog/telegram-bot-for-groups-nigeria`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/telegram-userbot-automation`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/free-telegram-group-management-bot`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Landing pages (deploy, what-is, country, feature pages) are now generated from lib/landing/data.ts
    // New Telegram blog posts
    {
      url: `${baseUrl}/blog/telegram-bot-vs-whatsapp-bot`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/telegram-anti-spam-bot`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Ecosystem pages
    {
      url: `${baseUrl}/templates`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/integrations`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/features/ai`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/moderation`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/media`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/academy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/case-studies`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
