import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

interface ComparisonRow {
  feature: string;
  botwave: string;
  other: string;
}

interface ComparisonData {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  intro: string;
  rows: ComparisonRow[];
  verdict: string;
}

const comparisons: ComparisonData[] = [
  {
    slug: 'evolution-api',
    name: 'Evolution API',
    seoTitle: 'BotWave vs Evolution API - Full Comparison (2026)',
    seoDescription: 'Compare BotWave and Evolution API for WhatsApp automation. Features, anti-ban, pricing, ease of use. Which is better for your use case?',
    seoKeywords: ['botwave vs evolution api', 'evolution api alternative', 'whatsapp api comparison', 'best whatsapp bot platform'],
    intro: 'Evolution API is an open-source WhatsApp API that wraps Baileys. BotWave also uses Baileys but adds a full product layer on top: dashboard, commands, AI, anti-ban, and multi-platform support.',
    rows: [
      { feature: 'Setup', botwave: 'Sign up, scan QR, done. No coding.', other: 'Self-host, configure Docker, set up API endpoints.' },
      { feature: 'Anti-Ban System', botwave: 'Built-in: session warmup, human-like delays, message variation, read-but-skip, media jittering.', other: 'No built-in anti-ban. You implement your own.' },
      { feature: 'Commands', botwave: '150+ built-in commands: stickers, AI, games, moderation, media downloads.', other: 'No built-in commands. API only, you build everything.' },
      { feature: 'AI Chat', botwave: 'Built-in AI chat. Type !ai in any group to get a response.', other: 'No AI features. Integrate your own.' },
      { feature: 'Dashboard', botwave: 'Web dashboard for session management, settings, analytics.', other: 'API-only. Build your own dashboard or use third-party.' },
      { feature: 'Telegram Support', botwave: 'Yes. Telegram Bot + Userbot from the same dashboard.', other: 'WhatsApp only.' },
      { feature: 'Pricing', botwave: 'Free tier available. Paid plans from N500/month.', other: 'Free (self-hosted). Server costs apply.' },
      { feature: 'Target User', botwave: 'Non-technical users, community managers, businesses.', other: 'Developers building custom WhatsApp integrations.' },
      { feature: 'Hosting', botwave: 'Managed. We handle the servers.', other: 'Self-hosted. You manage the infrastructure.' },
    ],
    verdict: 'Evolution API is great if you are a developer building a custom WhatsApp integration. BotWave is better if you want a ready-to-use bot with commands, AI, and anti-ban without writing code. Different tools for different needs.',
  },
  {
    slug: 'baileys',
    name: 'Baileys (Raw Library)',
    seoTitle: 'BotWave vs Baileys - Do You Need a Framework? (2026)',
    seoDescription: 'BotWave vs raw Baileys library. Baileys is the engine, BotWave is the full product. Compare features, setup time, and capabilities.',
    seoKeywords: ['botwave vs baileys', 'baileys whatsapp bot', 'baileys alternative', 'whatsapp bot without coding'],
    intro: 'Baileys is the open-source Node.js library that connects to WhatsApp via the multi-device web protocol. BotWave is built on top of Baileys, adding everything else you need: commands, AI, dashboard, anti-ban, and hosting.',
    rows: [
      { feature: 'What it is', botwave: 'Complete bot platform with dashboard, commands, and hosting.', other: 'JavaScript library for WhatsApp web protocol.' },
      { feature: 'Setup Time', botwave: '2 minutes. Sign up and scan QR.', other: 'Hours to days. Write code, handle events, deploy.' },
      { feature: 'Coding Required', botwave: 'No.', other: 'Yes. JavaScript/TypeScript required.' },
      { feature: 'Anti-Ban', botwave: 'Built-in advanced system with warmup, delays, variation.', other: 'None. You implement your own.' },
      { feature: 'Commands', botwave: '150+ commands ready to use.', other: 'Zero. You build each command from scratch.' },
      { feature: 'Session Management', botwave: 'Dashboard with reconnect, status, analytics.', other: 'Manual. Handle auth state, reconnection in code.' },
      { feature: 'Updates', botwave: 'We handle protocol updates and breaking changes.', other: 'You update Baileys yourself and fix breaking changes.' },
      { feature: 'Customization', botwave: 'Settings via dashboard. Custom commands coming soon.', other: 'Full control. Build anything you want.' },
    ],
    verdict: 'Baileys is a library for developers who want full control and are comfortable writing Node.js code. BotWave is for everyone else who wants a working bot today without touching code. We use Baileys under the hood, so you get the same connection quality.',
  },
  {
    slug: 'telegram-bots',
    name: 'Telegram Bots',
    seoTitle: 'WhatsApp Bots vs Telegram Bots - Full Comparison (2026)',
    seoDescription: 'Compare WhatsApp bots and Telegram bots. Ban risk, API support, features, user base. BotWave supports both platforms.',
    seoKeywords: ['whatsapp bot vs telegram bot', 'telegram bot comparison', 'whatsapp automation vs telegram', 'best messaging bot platform'],
    intro: 'Telegram has an official Bot API. WhatsApp does not (for consumer accounts). This creates fundamental differences in how bots work on each platform. BotWave supports both, so you do not have to choose.',
    rows: [
      { feature: 'Official API', botwave: 'Supports both. Baileys for WhatsApp, Bot API for Telegram, GramJS for Userbot.', other: 'Official Bot API. Well-documented, no ban risk.' },
      { feature: 'Ban Risk', botwave: 'WhatsApp: low with anti-ban. Telegram: zero.', other: 'Zero for bots. Userbot has some risk.' },
      { feature: 'User Base (Africa)', botwave: 'WhatsApp dominates. 90%+ of messaging in Nigeria.', other: 'Growing but smaller in Africa. Bigger in Eastern Europe, Iran, Russia.' },
      { feature: 'Group Size Limit', botwave: 'WhatsApp: 1,024 members. Telegram: 200,000 members.', other: 'Telegram groups can be massive.' },
      { feature: 'Bot Features', botwave: '150+ commands across both platforms.', other: 'Inline keyboards, webhooks, payments, sticker packs.' },
      { feature: 'Media Support', botwave: 'Stickers, images, video, audio, documents on both.', other: 'Same, plus custom emoji, animations, polls natively.' },
      { feature: 'Administration', botwave: 'Moderation commands on both platforms.', other: 'Fine-grained permissions, custom admin titles.' },
      { feature: 'Best For', botwave: 'African communities, Nigerian businesses, WhatsApp-heavy users.', other: 'Tech communities, crypto groups, large public channels.' },
    ],
    verdict: 'If your community is on WhatsApp (most of Africa), you need a WhatsApp bot. If they are on Telegram, you need a Telegram bot. BotWave lets you manage both from one dashboard. You do not have to choose one platform.',
  },
];

export function generateStaticParams() {
  return comparisons.map(c => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const comp = comparisons.find(c => c.slug === params.slug);
  if (!comp) return {};
  return {
    title: comp.seoTitle,
    description: comp.seoDescription,
    keywords: comp.seoKeywords,
    openGraph: {
      title: comp.seoTitle,
      description: comp.seoDescription,
      url: `https://www.botwave.online/compare/${comp.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/compare/${comp.slug}` },
  };
}

export default function ComparisonPage({ params }: { params: { slug: string } }) {
  const comp = comparisons.find(c => c.slug === params.slug);
  if (!comp) notFound();

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-[var(--primary)]">Compare</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">vs {comp.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">BotWave vs {comp.name}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{comp.intro}</p>

          <div className="overflow-x-auto mb-10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="text-left py-4 pr-4 text-[var(--text-primary)] font-bold">Feature</th>
                  <th className="text-left py-4 px-4 text-blue-500 font-bold">BotWave</th>
                  <th className="text-left py-4 pl-4 text-[var(--text-muted)] font-bold">{comp.name}</th>
                </tr>
              </thead>
              <tbody>
                {comp.rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="py-4 pr-4 text-[var(--text-primary)] font-medium text-sm align-top min-w-[140px]">{row.feature}</td>
                    <td className="py-4 px-4 text-[var(--text-secondary)] text-sm align-top">{row.botwave}</td>
                    <td className="py-4 pl-4 text-[var(--text-secondary)] text-sm align-top">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl mb-10">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Verdict</h2>
            <p className="text-[var(--text-secondary)]">{comp.verdict}</p>
          </div>

          <div className="p-8 bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Try BotWave free</h3>
            <p className="text-[var(--text-secondary)] mb-4">No credit card. No coding. Set up in 2 minutes.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
