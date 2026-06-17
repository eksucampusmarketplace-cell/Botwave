import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const posts = [
  { slug: 'telegram-anti-spam-bot', title: 'Free Telegram Anti-Spam Bot (2026)', excerpt: 'Set up a free Telegram anti-spam bot in 2 minutes. Block spam, scam links, flood messages, and raid attacks.', date: '2026-05-18', readTime: '5 min read', tags: ['Telegram', 'Anti-Spam', 'Security'] },
  { slug: 'telegram-bot-for-groups-nigeria', title: 'Telegram Bot for Groups in Nigeria (2026)', excerpt: 'Set up a free Telegram bot for your Nigerian group in under 2 minutes. AI chat, stickers, games, polls, anti-spam - all built in.', date: '2026-05-16', readTime: '6 min read', tags: ['Telegram', 'Nigeria', 'Groups'] },
  { slug: 'free-telegram-group-management-bot', title: 'Free Telegram Group Management Bot (2026)', excerpt: 'Manage your Telegram group like a pro with a free bot. Anti-spam, welcome messages, AI chat, trivia games, polls, and moderation tools.', date: '2026-05-16', readTime: '7 min read', tags: ['Telegram', 'Groups', 'Management'] },
  { slug: 'telegram-userbot-automation', title: 'Telegram Userbot Automation (2026)', excerpt: 'Automate your real Telegram account with BotWave userbot mode. Auto-replies, AI chat, media tools - all running from your personal account.', date: '2026-05-16', readTime: '8 min read', tags: ['Telegram', 'Userbot', 'Automation'] },
  { slug: 'telegram-bot-south-africa', title: 'Telegram Bot for South Africa (2026)', excerpt: 'Free Telegram bot for South African businesses, communities, and groups. Auto-replies, AI chat, anti-spam, stickers.', date: '2026-05-15', readTime: '6 min read', tags: ['South Africa', 'Business', 'Groups'] },
  { slug: 'telegram-bot-for-schools', title: 'Telegram Bot for Schools & Campus Groups (2026)', excerpt: 'How Nigerian students and lecturers use Telegram bots for class groups, study sessions, campus announcements.', date: '2026-05-14', readTime: '7 min read', tags: ['Education', 'Campus', 'Nigeria'] },
  { slug: 'telegram-ai-chatbot-free', title: 'Free Telegram AI Chatbot (2026)', excerpt: 'Get a free AI chatbot on Telegram powered by Google Gemini. Ask questions, get homework help, translate languages, write messages.', date: '2026-05-13', readTime: '6 min read', tags: ['AI', 'ChatGPT', 'Free'] },
  { slug: 'telegram-bot-commands-list-2026', title: 'Telegram Bot Commands List (2026)', excerpt: 'Full list of all 100+ BotWave Telegram bot commands. Stickers, AI chat, games, polls, media downloads, group management, and more.', date: '2026-05-12', readTime: '45 min read', tags: ['Commands', 'Reference', 'Tutorial'] },
  { slug: 'best-free-bot-platforms-2026', title: 'Best Free Bot Platforms 2026 vs Rivals', excerpt: 'Honest comparison of the best free Telegram bot platforms in 2026. Features, pricing, and which is best for your community.', date: '2026-05-11', readTime: '9 min read', tags: ['Comparison', 'Best Of', 'Platforms'] },
  { slug: 'telegram-bot-for-business-nigeria', title: 'Telegram Bot for Business in Nigeria (2026)', excerpt: 'How Nigerian businesses use Telegram bots to automate customer support, send order updates, run promotions, and manage inquiries.', date: '2026-05-10', readTime: '8 min read', tags: ['Business', 'Nigeria', 'Automation'] },
  { slug: 'automate-telegram-messages', title: 'How to Automate Telegram Messages Free (2026)', excerpt: 'Complete guide to automating Telegram messages without coding or paying monthly fees. Auto-replies, scheduled messages, AI responses.', date: '2026-05-09', readTime: '10 min read', tags: ['Tutorial', 'Automation', 'Free'] },
  { slug: 'telegram-group-moderation-bot', title: 'Free Telegram Group Moderation Bot (2026)', excerpt: 'Moderate Telegram groups automatically. Welcome messages, anti-spam, keyword triggers, polls, and admin shortcuts.', date: '2026-05-08', readTime: '7 min read', tags: ['Groups', 'Management', 'Free'] },
  { slug: 'best-free-telegram-bot-groups-nigeria', title: 'Best Free Telegram Bot Groups in Nigeria (2026)', excerpt: 'Find the best Telegram groups using BotWave in Nigeria. Entertainment, education, business, and community groups.', date: '2026-05-07', readTime: '5 min read', tags: ['Nigeria', 'Groups', 'Community'] },
  { slug: 'how-to-create-telegram-bot-2026', title: 'How to Create a Free Telegram Bot in 2026', excerpt: 'Complete step-by-step guide to creating your own Telegram bot for free in 2026. No coding required.', date: '2026-05-06', readTime: '8 min read', tags: ['Tutorial', 'Setup', 'Free'] },
  { slug: 'telegram-sticker-bot', title: 'Free Telegram Sticker Bot - How to Make Stickers', excerpt: 'Create custom Telegram stickers from any image, photo, or GIF for free. Works without any extra apps or subscriptions.', date: '2026-05-05', readTime: '4 min read', tags: ['Stickers', 'Media', 'Free'] },
  { slug: 'telegram-bot-welcome-message', title: 'Telegram Auto Welcome Message for Groups (2026)', excerpt: 'Automatically greet new members with a custom welcome message in your Telegram group. Easy setup, no coding.', date: '2026-05-04', readTime: '5 min read', tags: ['Groups', 'Management', 'Telegram'] },
  { slug: 'telegram-translate-bot', title: 'Telegram Auto-Translate Bot Guide (2026)', excerpt: 'Translate any message in your Telegram group instantly with a free bot. Supports 50+ languages.', date: '2026-05-03', readTime: '5 min read', tags: ['Tools', 'Telegram', 'AI'] },
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
            Tutorials, comparisons, and guides for Telegram bot automation.
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
