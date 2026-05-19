import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'WhatsApp Bot for India (2026) - Free Automation for Indian Businesses & Groups',
  description: 'Free WhatsApp bot for Indian businesses and communities. Auto-replies, AI chat, stickers, anti-spam, group management. Works with Jio, Airtel, Vi numbers. 100+ commands. No coding.',
  keywords: ['whatsapp bot india', 'free whatsapp bot india', 'whatsapp automation india', 'whatsapp business bot india', 'whatsapp group bot india', 'botwave india', 'whatsapp chatbot india'],
  openGraph: {
    title: 'WhatsApp Bot for India (2026) - Free Automation',
    description: 'Free WhatsApp bot for Indian businesses. 100+ commands, no coding. Works with Jio, Airtel, Vi.',
    url: 'https://www.botwave.online/whatsapp-bot-india',
    type: 'website',
    images: [{ url: '/api/og?title=WhatsApp+Bot+for+India+(2026)+%E2%80%94+Free+Automation', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/whatsapp-bot-india',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/',
    },
  },
};

export default function IndiaLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-6">
            MADE FOR INDIA 🇮🇳
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Free WhatsApp Bot<br />for India
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            100+ commands for Indian businesses and communities. Auto-replies, AI chat in Hindi and English, stickers, anti-spam, group management - all free. Works with Jio, Airtel, and Vi.
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Why Indian Users Love BotWave</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Works with All Indian Networks', desc: 'Jio, Airtel, Vi (Vodafone Idea), BSNL - BotWave works seamlessly with every Indian carrier.' },
              { title: 'AI Chat in Hindi & English', desc: 'Ask questions, translate, write - the AI works in Hindi, English, Tamil, Telugu, and 100+ languages.' },
              { title: 'Business Automation', desc: 'Auto-replies for customer queries, order updates, and support. Perfect for Indian D2C brands and service businesses.' },
              { title: 'Group Management', desc: 'Manage college groups, family groups, business communities with anti-spam, polls, and welcome messages.' },
              { title: 'Free Forever Tier', desc: '300 messages/month free. No credit card. No hidden charges. Upgrade only when your business grows.' },
              { title: 'Low Bandwidth Friendly', desc: 'Optimized for Indian internet speeds. Works great even on slower mobile data connections.' },
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
              { slug: 'whatsapp-ai-chatbot-free', title: 'Free WhatsApp AI Chatbot (2026) - ChatGPT-Like AI' },
              { slug: 'how-to-automate-whatsapp-messages-free', title: 'How to Automate WhatsApp Messages for Free' },
              { slug: 'whatsapp-bot-commands-list-2026', title: 'Complete WhatsApp Bot Commands List (2026)' },
            ].map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="glass-card rounded-xl p-4 hover:border-emerald-500/30 transition-all duration-300">
                <p className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">{post.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

        <Footer />
    </main>
  );
}
