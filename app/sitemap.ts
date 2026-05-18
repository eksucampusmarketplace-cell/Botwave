import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.botwave.online';

  return [
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
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'weekly',
      priority: 0.8,
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
    {
      url: `${baseUrl}/whatsapp-bot-nigeria`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/whatsapp-bot-south-africa`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/whatsapp-bot-india`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/whatsapp-bot-usa`,
      lastModified: new Date('2026-05-13'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
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
    // Telegram deploy page
    {
      url: `${baseUrl}/deploy-telegram-bot`,
      lastModified: new Date('2026-05-18'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
