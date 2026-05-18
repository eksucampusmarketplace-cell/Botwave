import type { Metadata } from 'next';
import BlogListClient from './_components/BlogListClient';

export const metadata: Metadata = {
  title: 'Blog - Bot Automation Tips, Guides & Comparisons',
  description: 'Learn how to automate WhatsApp & Telegram, grow your community, and get the most out of BotWave. Tutorials, comparisons, and guides for free bot automation.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'BotWave Blog - WhatsApp & Telegram Bot Guides',
    description: 'Tutorials, comparisons, and guides for free WhatsApp and Telegram bot automation with BotWave.',
    url: 'https://www.botwave.online/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  return <BlogListClient />;
}
