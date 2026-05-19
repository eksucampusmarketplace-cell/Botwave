import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'About BotWave - Free WhatsApp & Telegram Bot Platform | BotWave',
  description: 'BotWave is a free WhatsApp and Telegram bot automation platform. Learn about our mission, team, and what makes us different from other projects named BotWave.',
  keywords: ['about botwave', 'botwave online', 'whatsapp bot platform', 'telegram bot platform', 'botwave vs botwave'],
  openGraph: {
    title: 'About BotWave',
    description: 'Free WhatsApp & Telegram bot automation. Learn what BotWave is and what makes us different.',
    url: 'https://www.botwave.online/about',
    type: 'website',
  },
  alternates: { canonical: '/about' },
};

const stats = [
  { label: 'Commands Available', value: '150+' },
  { label: 'Countries Supported', value: '50+' },
  { label: 'Platforms', value: '3' },
  { label: 'Price', value: 'Free' },
];

const values = [
  {
    title: 'Free Forever',
    description: 'We believe bot automation should be accessible to everyone. Our core platform is and always will be free. No trials, no credit card, no catch.',
    icon: '💸',
  },
  {
    title: 'Your Device, Your IP',
    description: 'Unlike other bot services, your WhatsApp session runs from your own device via QR code. You never share a server IP with other bot users, dramatically reducing ban risk.',
    icon: '🛡️',
  },
  {
    title: 'Community-First',
    description: 'Built for group admins, school communities, church groups, and small businesses who need automation without the enterprise price tag.',
    icon: '🤝',
  },
  {
    title: 'Open & Transparent',
    description: 'We publish our security practices, anti-ban techniques, and status page openly. No black boxes.',
    icon: '🔓',
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base-100">
        {/* Hero */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-primary">BotWave</span>
            </h1>
            <p className="text-lg md:text-xl text-base-content/70 max-w-3xl mx-auto leading-relaxed">
              BotWave is a free WhatsApp and Telegram bot automation platform built for communities
              who need powerful tools without the enterprise price tag. 150+ commands, AI-powered
              chat, games, moderation, media tools — all free.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 px-4 bg-base-200/50">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-base-content/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* About Our Name */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              About Our Name
            </h2>
            <div className="bg-base-200 rounded-2xl p-6 md:p-8 space-y-4">
              <p className="text-base-content/80 leading-relaxed">
                If you searched for &quot;BotWave&quot; and found us, you might have also seen other
                projects using a similar name — including a Raspberry Pi internet radio project on
                GitHub, and a Chinese enterprise AI company at botwave.com.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                <strong className="text-base-content">We are not affiliated with either of those projects.</strong>{' '}
                BotWave (<Link href="https://www.botwave.online" className="text-primary hover:underline">botwave.online</Link>)
                is an independent, free chat bot automation platform focused on WhatsApp and Telegram.
                We were founded in 2026 and are built specifically for group admins and communities
                in Africa and worldwide.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                To avoid confusion: our official website is always{' '}
                <strong className="text-primary">www.botwave.online</strong> — that&apos;s the only
                domain we operate.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 bg-base-200/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">What We Stand For</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((v) => (
                <div key={v.title} className="bg-base-100 rounded-xl p-6 border border-base-300">
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Three Platforms, One Dashboard</h2>
            <p className="text-base-content/70 mb-8">
              BotWave supports WhatsApp Bot, Telegram Bot, and Telegram Userbot — all managed from
              a single web dashboard. No coding required.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-base-200 rounded-xl p-5">
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-semibold">WhatsApp Bot</h3>
                <p className="text-xs text-base-content/60 mt-1">Connect via QR code. 100+ commands for groups.</p>
              </div>
              <div className="bg-base-200 rounded-xl p-5">
                <div className="text-2xl mb-2">🤖</div>
                <h3 className="font-semibold">Telegram Bot</h3>
                <p className="text-xs text-base-content/60 mt-1">Full bot API integration. Inline buttons, media.</p>
              </div>
              <div className="bg-base-200 rounded-xl p-5">
                <div className="text-2xl mb-2">👤</div>
                <h3 className="font-semibold">Telegram Userbot</h3>
                <p className="text-xs text-base-content/60 mt-1">Run commands from your own Telegram account.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-base-content/70 mb-6">
              Create your free account and connect your first bot in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="btn btn-primary btn-lg"
              >
                Create Free Account
              </Link>
              <Link
                href="/commands"
                className="btn btn-ghost btn-lg"
              >
                View All Commands
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
