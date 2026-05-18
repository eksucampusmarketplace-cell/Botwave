'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';

const posts = [
  {
    slug: 'telegram-bot-vs-whatsapp-bot',
    title: 'Telegram Bot vs WhatsApp Bot (2026) — Which is Better? Full Comparison',
    excerpt: 'Ban risk, features, setup, group limits, API access, pricing — every difference compared. BotWave supports both platforms from one dashboard.',
    date: '2026-05-18',
    readTime: '8 min read',
    tags: ['Telegram', 'WhatsApp', 'Comparison'],
  },
  {
    slug: 'telegram-anti-spam-bot',
    title: 'Free Telegram Anti-Spam Bot (2026) — Protect Your Groups',
    excerpt: 'Set up a free Telegram anti-spam bot in 2 minutes. Block spam, scam links, flood messages, and raid attacks. Works with Bot API and Userbot.',
    date: '2026-05-18',
    readTime: '5 min read',
    tags: ['Telegram', 'Anti-Spam', 'Security'],
  },
  {
    slug: 'telegram-bot-for-groups-nigeria',
    title: 'Telegram Bot for Groups in Nigeria (2026) — Free Setup with BotWave',
    excerpt: 'Set up a free Telegram bot for your Nigerian group in under 2 minutes. AI chat, stickers, games, polls, anti-spam — all built in. No coding needed.',
    date: '2026-05-16',
    readTime: '6 min read',
    tags: ['Telegram', 'Nigeria', 'Groups'],
  },
  {
    slug: 'free-telegram-group-management-bot',
    title: 'Free Telegram Group Management Bot (2026) — Anti-Spam, Polls, Games & More',
    excerpt: 'Manage your Telegram group like a pro with a free bot. Anti-spam, welcome messages, AI chat, trivia games, polls, and moderation tools — all built in.',
    date: '2026-05-16',
    readTime: '7 min read',
    tags: ['Telegram', 'Groups', 'Management'],
  },
  {
    slug: 'telegram-userbot-automation',
    title: 'Telegram Userbot Automation (2026) — Automate Your Real Telegram Account',
    excerpt: 'Automate your real Telegram account with BotWave userbot mode. Auto-replies, AI chat, media tools — all running from your personal account. Free setup.',
    date: '2026-05-16',
    readTime: '8 min read',
    tags: ['Telegram', 'Userbot', 'Automation'],
  },
  {
    slug: 'whatsapp-bot-south-africa',
    title: 'WhatsApp Bot for South Africa (2026) — Free Automation & Group Management',
    excerpt: 'Free WhatsApp bot for South African businesses, communities, and groups. Auto-replies, AI chat, anti-spam, stickers, and group management.',
    date: '2026-05-15',
    readTime: '6 min read',
    tags: ['South Africa', 'Business', 'Groups'],
  },
  {
    slug: 'whatsapp-bot-for-schools-campus-groups',
    title: 'WhatsApp Bot for Schools & Campus Groups (2026) — Study, Manage, Engage',
    excerpt: 'How Nigerian students and lecturers use WhatsApp bots for class groups, study sessions, campus announcements, and group management.',
    date: '2026-05-14',
    readTime: '7 min read',
    tags: ['Education', 'Campus', 'Nigeria'],
  },
  {
    slug: 'whatsapp-ai-chatbot-free',
    title: 'Free WhatsApp AI Chatbot (2026) — ChatGPT-Like AI on WhatsApp',
    excerpt: 'Get a free AI chatbot on WhatsApp powered by Google Gemini. Ask questions, get homework help, translate languages, write messages — all inside WhatsApp.',
    date: '2026-05-13',
    readTime: '6 min read',
    tags: ['AI', 'ChatGPT', 'Free'],
  },
  {
    slug: 'whatsapp-bot-commands-list-2026',
    title: 'Complete WhatsApp Bot Commands List (2026) — 100+ BotWave Commands',
    excerpt: 'Full list of all 100+ BotWave WhatsApp bot commands. Stickers, AI chat, games, polls, media downloads, group management, music, logos, study tools, and more. With examples for every command.',
    date: '2026-05-12',
    readTime: '45 min read',
    tags: ['Commands', 'Reference', 'Tutorial'],
  },
  {
    slug: 'best-free-bot-platforms-2026',
    title: 'Best Free Bot Platforms in 2026 Compared — BotWave vs ManyChat vs Chatfuel',
    excerpt: 'Honest comparison of the best free bot platforms in 2026. Features, pricing, and which is best for WhatsApp, Instagram, Telegram, and more.',
    date: '2026-05-11',
    readTime: '9 min read',
    tags: ['Comparison', 'Best Of', 'Platforms'],
  },
  {
    slug: 'whatsapp-bot-for-business-nigeria',
    title: 'WhatsApp Bot for Business in Nigeria (2026) — Automate Sales & Support',
    excerpt: 'How Nigerian businesses use WhatsApp bots to automate customer support, send order updates, run promotions, and manage inquiries. Free setup.',
    date: '2026-05-10',
    readTime: '8 min read',
    tags: ['Business', 'Nigeria', 'Automation'],
  },
  {
    slug: 'how-to-automate-whatsapp-messages-free',
    title: 'How to Automate WhatsApp Messages for Free (2026 Guide)',
    excerpt: 'Complete guide to automating WhatsApp messages without coding or paying monthly fees. Auto-replies, scheduled messages, AI responses, and more.',
    date: '2026-05-09',
    readTime: '6 min read',
    tags: ['Automation', 'Tutorial', 'Free'],
  },
  {
    slug: 'free-whatsapp-group-management-bot',
    title: 'Free WhatsApp Group Management Bot (2026) — Anti-Spam, Polls, Games',
    excerpt: 'Manage your WhatsApp groups like a pro with a free bot. Anti-spam, welcome messages, polls, trivia games, and moderation tools.',
    date: '2026-05-08',
    readTime: '7 min read',
    tags: ['Groups', 'Anti-Spam', 'Management'],
  },
  {
    slug: 'free-whatsapp-sticker-bot-how-to-make-stickers',
    title: 'Free WhatsApp Sticker Bot — How to Make Custom Stickers Instantly (2026)',
    excerpt: 'Create custom WhatsApp stickers from any image in seconds. No app download needed. Just send an image and type !sticker.',
    date: '2026-05-07',
    readTime: '4 min read',
    tags: ['Stickers', 'Tutorial', 'Free'],
  },
  {
    slug: 'whatsapp-anti-spam-bot-for-groups',
    title: 'WhatsApp Anti-Spam Bot for Groups (2026) — Stop Spam Automatically',
    excerpt: 'Keep your WhatsApp groups spam-free with an automatic anti-spam bot. Blocks scam links, betting ads, chain messages, and offensive content.',
    date: '2026-05-06',
    readTime: '5 min read',
    tags: ['Anti-Spam', 'Groups', 'Security'],
  },
  {
    slug: 'whatsapp-bot-vs-telegram-bot-africa',
    title: 'WhatsApp Bot vs Telegram Bot: Which is Better for Africa?',
    excerpt: 'Telegram bots have been around longer, but WhatsApp dominates Africa. We compare features, reach, and cost to help you pick the right platform.',
    date: '2026-05-05',
    readTime: '7 min read',
    tags: ['Comparison', 'Telegram', 'Africa'],
  },
  {
    slug: 'best-free-whatsapp-bot-groups-nigeria',
    title: 'Best Free WhatsApp Bot for Groups in Nigeria (2026)',
    excerpt: 'Looking for a WhatsApp bot to manage your campus group, business chat, or community? Here are the features that matter and why BotWave is the top choice.',
    date: '2026-05-03',
    readTime: '6 min read',
    tags: ['Nigeria', 'Groups', 'Best Of'],
  },
  {
    slug: 'how-to-create-free-whatsapp-bot-2026',
    title: 'How to Create a Free WhatsApp Bot in 2026 (No Coding Needed)',
    excerpt: 'Step-by-step guide to setting up your own WhatsApp bot for free using BotWave. Stickers, AI chat, games, polls — all live in under 2 minutes.',
    date: '2026-05-01',
    readTime: '5 min read',
    tags: ['Tutorial', 'WhatsApp Bot', 'Free'],
  },
];

export default function BlogListClient() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-4">
              BLOG
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
              Bot Automation Tips, Guides & Comparisons
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Learn how to automate WhatsApp & Telegram, grow your community, and get the most out of BotWave.
            </p>
          </motion.div>

          <div className="space-y-6">
            {posts.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`} className="block glass-card rounded-xl p-8 hover:border-emerald-500/30 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-slate-500 font-mono">{post.date}</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500 font-mono">{post.readTime}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-slate-400 mb-4 leading-relaxed">{post.excerpt}</p>
                  <div className="flex gap-2 flex-wrap">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-slate-400 font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
