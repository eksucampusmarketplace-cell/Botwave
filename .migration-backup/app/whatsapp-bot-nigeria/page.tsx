import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LatestPostsCompact from '@/components/blog/LatestPostsCompact';

export const metadata: Metadata = {
  title: 'WhatsApp Bot for Nigeria (2026), Free Automation',
  description: 'The #1 free WhatsApp bot built for Nigeria. Auto-replies, AI chat, stickers, anti-spam, group management, games - all in Naira pricing. 100+ commands. No coding. Set up in 2 minutes.',
  keywords: ['whatsapp bot nigeria', 'free whatsapp bot nigeria', 'whatsapp automation nigeria', 'whatsapp business bot nigeria', 'whatsapp group bot nigeria', 'nigerian whatsapp bot', 'botwave nigeria'],
  openGraph: {
    title: 'WhatsApp Bot for Nigeria (2026) - Free Automation',
    description: 'The #1 free WhatsApp bot built for Nigeria. 100+ commands, Naira pricing, no coding. Set up in 2 minutes.',
    url: 'https://www.botwave.online/whatsapp-bot-nigeria',
    type: 'website',
    images: [{ url: '/api/og?title=WhatsApp+Bot+for+Nigeria+(2026)+%E2%80%94+Free+Automation', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/whatsapp-bot-nigeria',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/',
    },
  },
};

export default function NigeriaLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-6">
            MADE FOR NIGERIA 🇳🇬
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            The Free WhatsApp Bot<br />Built for Nigeria
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            100+ commands. Naira pricing. No coding. Auto-replies, AI chat, stickers, anti-spam, group management, games - everything Nigerian businesses and communities need on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 text-lg"
            >
              Get Started Free →
            </Link>
            <Link
              href="/blog/whatsapp-bot-for-business-nigeria"
              className="px-8 py-4 border border-white/10 hover:border-emerald-500/30 text-slate-300 font-semibold rounded-lg transition-all duration-300 text-lg"
            >
              Read the Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Why Nigerian Users Love BotWave</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Naira Pricing', desc: 'Free forever (300 msgs/mo). Paid plans coming soon, billed in Naira when they launch. No dollar conversion headaches.' },
              { title: 'Works on Nigerian Networks', desc: 'Optimized for MTN, Glo, Airtel, and 9mobile data speeds. Low bandwidth friendly.' },
              { title: 'Business Ready', desc: 'Auto-replies for customer support, order updates, and promotions. Perfect for SMEs.' },
              { title: 'Campus Groups', desc: 'Class groups, departmental chats, study sessions - manage hundreds of members effortlessly.' },
              { title: 'Anti-Ban Protection', desc: 'Advanced anti-ban system protects your number. Human-like delays, message variation, rate limiting.' },
              { title: 'No Coding Needed', desc: 'Scan QR code and your bot is live. Web dashboard to manage everything.' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Pricing in Naira</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { plan: 'Free', price: '₦0', msgs: '300 msgs/mo', sessions: '1 session' },
              { plan: 'Lite', price: 'Coming Soon', msgs: '2,000 msgs/mo', sessions: '1 session' },
              { plan: 'Standard', price: 'Coming Soon', msgs: '10,000 msgs/mo', sessions: '3 sessions' },
              { plan: 'Boss', price: 'Coming Soon', msgs: 'Unlimited', sessions: '5 sessions' },
            ].map((item) => (
              <div key={item.plan} className="glass-card rounded-xl p-6 text-center">
                <h3 className="text-sm font-mono text-emerald-400 mb-2">{item.plan}</h3>
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">{item.price}</p>
                <p className="text-xs text-slate-400">{item.msgs}</p>
                <p className="text-xs text-slate-400">{item.sessions}</p>
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
              { slug: 'whatsapp-bot-for-business-nigeria', title: 'WhatsApp Bot for Business in Nigeria (2026)' },
              { slug: 'best-free-whatsapp-bot-groups-nigeria', title: 'Free WhatsApp Bot for Nigerian Groups (2026)' },
              { slug: 'whatsapp-bot-for-schools-campus-groups', title: 'WhatsApp Bot for Schools & Campus Groups (2026)' },
              { slug: 'how-to-create-free-whatsapp-bot-2026', title: 'How to Create a Free WhatsApp Bot in 2026' },
            ].map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="glass-card rounded-xl p-4 hover:border-emerald-500/30 transition-all duration-300">
                <p className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">{post.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LatestPostsCompact limit={4} />

        <Footer />
    </main>
  );
}
