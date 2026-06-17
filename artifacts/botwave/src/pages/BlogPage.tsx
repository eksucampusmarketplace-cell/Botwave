import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const posts = [
  { slug: 'telegram-bot-vs-whatsapp-bot', title: 'Telegram Bot vs WhatsApp Bot (2026)', excerpt: 'Ban risk, features, setup, group limits, API access, pricing - every difference compared. BotWave supports both platforms from one dashboard.', date: '2026-05-18', readTime: '8 min read', tags: ['Telegram', 'WhatsApp', 'Comparison'] },
  { slug: 'telegram-anti-spam-bot', title: 'Free Telegram Anti-Spam Bot (2026)', excerpt: 'Set up a free Telegram anti-spam bot in 2 minutes. Block spam, scam links, flood messages, and raid attacks.', date: '2026-05-18', readTime: '5 min read', tags: ['Telegram', 'Anti-Spam', 'Security'] },
  { slug: 'telegram-bot-for-groups-nigeria', title: 'Telegram Bot for Groups in Nigeria (2026)', excerpt: 'Set up a free Telegram bot for your Nigerian group in under 2 minutes. AI chat, stickers, games, polls, anti-spam - all built in.', date: '2026-05-16', readTime: '6 min read', tags: ['Telegram', 'Nigeria', 'Groups'] },
  { slug: 'free-telegram-group-management-bot', title: 'Free Telegram Group Management Bot (2026)', excerpt: 'Manage your Telegram group like a pro with a free bot. Anti-spam, welcome messages, AI chat, trivia games, polls, and moderation tools.', date: '2026-05-16', readTime: '7 min read', tags: ['Telegram', 'Groups', 'Management'] },
  { slug: 'telegram-userbot-automation', title: 'Telegram Userbot Automation (2026)', excerpt: 'Automate your real Telegram account with BotWave userbot mode. Auto-replies, AI chat, media tools - all running from your personal account.', date: '2026-05-16', readTime: '8 min read', tags: ['Telegram', 'Userbot', 'Automation'] },
  { slug: 'whatsapp-bot-south-africa', title: 'WhatsApp Bot for South Africa (2026)', excerpt: 'Free WhatsApp bot for South African businesses, communities, and groups. Auto-replies, AI chat, anti-spam, stickers.', date: '2026-05-15', readTime: '6 min read', tags: ['South Africa', 'Business', 'Groups'] },
  { slug: 'whatsapp-bot-for-schools-campus-groups', title: 'WhatsApp Bot for Schools & Campus Groups (2026)', excerpt: 'How Nigerian students and lecturers use WhatsApp bots for class groups, study sessions, campus announcements.', date: '2026-05-14', readTime: '7 min read', tags: ['Education', 'Campus', 'Nigeria'] },
  { slug: 'whatsapp-ai-chatbot-free', title: 'Free WhatsApp AI Chatbot (2026)', excerpt: 'Get a free AI chatbot on WhatsApp powered by Google Gemini. Ask questions, get homework help, translate languages, write messages.', date: '2026-05-13', readTime: '6 min read', tags: ['AI', 'ChatGPT', 'Free'] },
  { slug: 'whatsapp-bot-commands-list-2026', title: 'WhatsApp Bot Commands List (2026)', excerpt: 'Full list of all 100+ BotWave WhatsApp bot commands. Stickers, AI chat, games, polls, media downloads, group management, and more.', date: '2026-05-12', readTime: '45 min read', tags: ['Commands', 'Reference', 'Tutorial'] },
  { slug: 'best-free-bot-platforms-2026', title: 'Best Free Bot Platforms 2026 vs Rivals', excerpt: 'Honest comparison of the best free bot platforms in 2026. Features, pricing, and which is best for WhatsApp, Instagram, Telegram, and more.', date: '2026-05-11', readTime: '9 min read', tags: ['Comparison', 'Best Of', 'Platforms'] },
  { slug: 'whatsapp-bot-for-business-nigeria', title: 'WhatsApp Bot for Business in Nigeria (2026)', excerpt: 'How Nigerian businesses use WhatsApp bots to automate customer support, send order updates, run promotions, and manage inquiries.', date: '2026-05-10', readTime: '8 min read', tags: ['Business', 'Nigeria', 'Automation'] },
  { slug: 'how-to-automate-whatsapp-messages-free', title: 'How to Automate WhatsApp Messages Free (2026)', excerpt: 'Complete guide to automating WhatsApp messages without coding or paying monthly fees. Auto-replies, scheduled messages, AI responses.', date: '2026-05-09', readTime: '10 min read', tags: ['Tutorial', 'Automation', 'Free'] },
  { slug: 'free-whatsapp-group-management-bot', title: 'Free WhatsApp Group Management Bot (2026)', excerpt: 'Manage WhatsApp groups automatically. Welcome messages, anti-spam, keyword triggers, polls, and admin shortcuts.', date: '2026-05-08', readTime: '7 min read', tags: ['Groups', 'Management', 'Free'] },
  { slug: 'best-free-whatsapp-bot-groups-nigeria', title: 'Best Free WhatsApp Bot Groups in Nigeria (2026)', excerpt: 'Find the best WhatsApp groups using BotWave in Nigeria. Entertainment, education, business, and community groups.', date: '2026-05-07', readTime: '5 min read', tags: ['Nigeria', 'Groups', 'Community'] },
  { slug: 'how-to-create-free-whatsapp-bot-2026', title: 'How to Create a Free WhatsApp Bot in 2026', excerpt: 'Complete step-by-step guide to creating your own WhatsApp bot for free in 2026. No coding required.', date: '2026-05-06', readTime: '8 min read', tags: ['Tutorial', 'Setup', 'Free'] },
  { slug: 'free-whatsapp-sticker-bot-how-to-make-stickers', title: 'Free WhatsApp Sticker Bot - How to Make Stickers', excerpt: 'Create custom WhatsApp stickers from any image, photo, or GIF for free. Works without any apps or subscriptions.', date: '2026-05-05', readTime: '4 min read', tags: ['Stickers', 'Media', 'Free'] },
  { slug: 'whatsapp-anti-spam-bot-for-groups', title: 'WhatsApp Anti-Spam Bot for Groups (2026)', excerpt: 'Automatically block spam, suspicious links, flood messages, and new member raids in WhatsApp groups.', date: '2026-05-04', readTime: '6 min read', tags: ['Anti-Spam', 'Security', 'Groups'] },
  { slug: 'whatsapp-bot-vs-telegram-bot-africa', title: 'WhatsApp Bot vs Telegram Bot in Africa', excerpt: 'Which is better for African communities — WhatsApp or Telegram bots? Comparing cost, features, reach, and setup.', date: '2026-05-03', readTime: '7 min read', tags: ['Africa', 'Comparison', 'WhatsApp'] },
];

const allTags = [...new Set(posts.flatMap(p => p.tags))].sort();

export default function BlogPage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const filtered = selectedTag ? posts.filter(p => p.tags.includes(selectedTag)) : posts;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Blog</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Blog</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Tutorials, comparisons, and guides for WhatsApp &amp; Telegram bot automation.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${!selectedTag ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${selectedTag === tag ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">{tag}</span>
                    ))}
                    <span className="text-xs text-[var(--text-muted)] ml-auto">{post.readTime}</span>
                  </div>
                  <h2 className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-3">{post.excerpt}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
