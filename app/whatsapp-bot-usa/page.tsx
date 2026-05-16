import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'WhatsApp Bot for USA (2026) — Free Automation for American Businesses & Communities',
  description: 'Free WhatsApp bot for US businesses and communities. Auto-replies, AI chat, stickers, anti-spam, group management. 100+ commands. No coding. Works with any US number.',
  keywords: ['whatsapp bot usa', 'whatsapp bot united states', 'free whatsapp bot us', 'whatsapp automation usa', 'whatsapp business bot usa', 'botwave usa', 'whatsapp chatbot america'],
  openGraph: {
    title: 'WhatsApp Bot for USA (2026) — Free Automation',
    description: 'Free WhatsApp bot for US businesses. 100+ commands, no coding. Auto-replies, AI chat, group management.',
    url: 'https://www.botwave.online/whatsapp-bot-usa',
    type: 'website',
    images: [{ url: '/api/og?title=WhatsApp+Bot+for+USA+(2026)+%E2%80%94+Free+Automation', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/whatsapp-bot-usa',
  },
};

export default function USALandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-6">
            WORKS IN THE USA 🇺🇸
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Free WhatsApp Bot<br />for the United States
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            WhatsApp is growing fast in the US. BotWave gives you 100+ commands — auto-replies, AI chat, stickers, group management, anti-spam — all free. No coding needed. Set up in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 text-lg"
            >
              Get Started Free →
            </Link>
            <Link
              href="/blog/how-to-create-free-whatsapp-bot-2026"
              className="px-8 py-4 border border-white/10 hover:border-emerald-500/30 text-slate-300 font-semibold rounded-lg transition-all duration-300 text-lg"
            >
              Read the Setup Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Why US Users Choose BotWave</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Works with Any US Number', desc: 'T-Mobile, AT&T, Verizon, Google Fi — BotWave works with all US carriers and WhatsApp numbers.' },
              { title: 'AI-Powered Automation', desc: 'Google Gemini AI answers customer questions, writes responses, and translates — all inside WhatsApp.' },
              { title: 'Small Business Ready', desc: 'Auto-replies for customer support, appointment scheduling, and FAQ handling. Great for local businesses.' },
              { title: 'Community & Group Tools', desc: 'Manage church groups, neighborhood chats, sports leagues with anti-spam, polls, and moderation.' },
              { title: 'Privacy First', desc: 'Your session runs from your own device. Messages are never stored on our servers.' },
              { title: 'Free to Start', desc: '300 messages/month free. No credit card needed. Scale up only when you need more.' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">Related Articles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { slug: 'how-to-create-free-whatsapp-bot-2026', title: 'How to Create a Free WhatsApp Bot in 2026' },
              { slug: 'best-free-bot-platforms-2026', title: 'Best Free Bot Platforms in 2026 Compared' },
              { slug: 'whatsapp-ai-chatbot-free', title: 'Free WhatsApp AI Chatbot (2026)' },
              { slug: 'whatsapp-bot-commands-list-2026', title: 'Complete WhatsApp Bot Commands List (2026)' },
            ].map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="glass-card rounded-xl p-4 hover:border-emerald-500/30 transition-all duration-300">
                <p className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">{post.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
