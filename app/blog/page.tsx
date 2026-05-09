'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';

const posts = [
  {
        slug: 'how-to-create-free-whatsapp-bot-2026',
        title: 'How to Create a Free WhatsApp Bot in 2026 (No Coding Needed)',
    excerpt: 'Step-by-step guide to setting up your own WhatsApp bot for free using BotWave. Stickers, AI chat, games, polls — all live in under 2 minutes.',
    date: '2026-05-01',
    readTime: '5 min read',
    tags: ['Tutorial', 'WhatsApp Bot', 'Free'],
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
    slug: 'whatsapp-bot-vs-telegram-bot-africa',
    title: 'WhatsApp Bot vs Telegram Bot: Which is Better for Africa?',
    excerpt: 'Telegram bots have been around longer, but WhatsApp dominates Africa. We compare features, reach, and cost to help you pick the right platform.',
    date: '2026-05-05',
    readTime: '7 min read',
    tags: ['Comparison', 'Telegram', 'Africa'],
  },
];

export default function BlogPage() {
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
              WhatsApp Bot Tips, Guides & Comparisons
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Learn how to automate WhatsApp, grow your community, and get the most out of BotWave.
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
