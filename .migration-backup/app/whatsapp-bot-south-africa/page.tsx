import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'WhatsApp Bot for South Africa (2026)',
  description: 'Free WhatsApp bot for South African businesses and communities. Auto-replies, AI chat, stickers, anti-spam, group management. Works with any SA number. No coding needed.',
  keywords: ['whatsapp bot south africa', 'free whatsapp bot sa', 'whatsapp automation south africa', 'whatsapp business bot sa', 'chatbot south africa', 'botwave south africa'],
  openGraph: {
    title: 'WhatsApp Bot for South Africa (2026) - Free Automation',
    description: 'Free WhatsApp bot for SA businesses and communities. 100+ commands, no coding. Set up in 2 minutes.',
    url: 'https://www.botwave.online/whatsapp-bot-south-africa',
    type: 'website',
    images: [{ url: '/api/og?title=WhatsApp+Bot+for+South+Africa+(2026)+%E2%80%94+Free+Automation', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/whatsapp-bot-south-africa',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/',
    },
  },
};

export default function SouthAfricaLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-6">
            BUILT FOR SOUTH AFRICA 🇿🇦
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Free WhatsApp Bot<br />for South Africa
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            100+ commands for SA businesses and communities. Auto-replies, AI chat, stickers, anti-spam, group management - all free. Works with Vodacom, MTN, Cell C, and Telkom numbers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 text-lg"
            >
              Get Started Free →
            </Link>
            <Link
              href="/blog/whatsapp-bot-south-africa"
              className="px-8 py-4 border border-white/10 hover:border-emerald-500/30 text-slate-300 font-semibold rounded-lg transition-all duration-300 text-lg"
            >
              Read the Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Why South African Users Choose BotWave</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Works with Any SA Number', desc: 'Vodacom, MTN, Cell C, Telkom - BotWave works with all South African mobile networks.' },
              { title: 'Business Automation', desc: 'Auto-replies for customer queries, order confirmations, and promotions. Ideal for SA SMEs and entrepreneurs.' },
              { title: 'Community Management', desc: 'Church groups, stokvel communities, sports clubs - manage large WhatsApp groups with anti-spam and moderation.' },
              { title: 'AI Chat in Any Language', desc: 'AI assistant works in English, Afrikaans, Zulu, Xhosa, and more. Powered by Google Gemini.' },
              { title: 'Anti-Ban Protection', desc: 'Human-like response delays, message variation, and rate limiting keep your number safe.' },
              { title: 'Free Tier Available', desc: 'Start with 300 messages/month free. No credit card needed. Upgrade only when you need more.' },
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
              { slug: 'whatsapp-bot-south-africa', title: 'WhatsApp Bot for South Africa - Full Guide (2026)' },
              { slug: 'whatsapp-bot-vs-telegram-bot-africa', title: 'WhatsApp Bot vs Telegram Bot: Which is Better for Africa?' },
              { slug: 'free-whatsapp-group-management-bot', title: 'Free WhatsApp Group Management Bot (2026)' },
              { slug: 'how-to-create-free-whatsapp-bot-2026', title: 'How to Create a Free WhatsApp Bot in 2026' },
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
