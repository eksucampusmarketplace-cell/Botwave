import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy - How BotWave Handles Your Data | BotWave',
  description: 'BotWave privacy policy. We do not store messages, read private chats, or share data. Your WhatsApp session runs from your own device.',
  keywords: ['botwave privacy', 'whatsapp bot privacy', 'botwave data policy', 'is botwave safe'],
  openGraph: {
    title: 'BotWave Privacy Policy',
    description: 'How BotWave handles your data. No message storage, no private chat access.',
    url: 'https://www.botwave.online/privacy',
    type: 'website',
  },
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: 'What BotWave Can Access',
    items: [
      'Messages in groups where the bot is active (needed to detect commands)',
      'Your WhatsApp session token (needed to maintain the connection)',
      'Your email and account info (for login and billing)',
    ],
  },
  {
    title: 'What BotWave Cannot Do',
    items: [
      'Read your private or DM messages',
      'Access your WhatsApp contacts list',
      'Send messages without your bot being active',
      'Access your phone storage or data',
      'Share your session with other users',
    ],
  },
  {
    title: 'Message Processing',
    items: [
      'All messages are processed in memory only',
      'No message content is stored in any database',
      'Processing happens on your server session, not centrally',
      'After the bot responds (or ignores), the message data is discarded',
    ],
  },
  {
    title: 'Session Security',
    items: [
      'Session credentials are stored in Supabase with row-level security',
      'Only your authenticated account can access your sessions',
      'API communication is encrypted',
      'No plain-text secrets are stored',
      'Your QR session runs from your own device IP',
    ],
  },
  {
    title: 'What We Store',
    items: [
      'Your email address (for login)',
      'Your plan and billing info',
      'Session connection status (active/disconnected)',
      'Bot configuration settings (welcome messages, anti-spam rules)',
      'Aggregate usage counts (messages sent this month)',
    ],
  },
  {
    title: 'What We Never Store',
    items: [
      'Message content or chat history',
      'Contact lists or phone numbers of group members',
      'Media files (images, videos, stickers)',
      'Location data',
      'Browsing history or device information',
    ],
  },
  {
    title: 'Third-Party Services',
    items: [
      'Supabase (database and authentication)',
      'AI providers (for !ai command responses, no conversation history stored)',
      'No analytics trackers or advertising networks',
      'No data is sold to or shared with third parties',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Privacy</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Privacy Policy</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-4">Last updated: May 2026</p>
          <p className="text-[var(--text-secondary)] mb-10">
            BotWave is built for WhatsApp and Telegram communities in Africa. Trust is everything. This page explains exactly what we access, what we store, and what we do not.
          </p>

          <div className="space-y-8">
            {sections.map(section => (
              <div key={section.title} className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{section.title}</h2>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Questions?</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              If you have questions about how your data is handled, check the <Link href="/faq" className="text-blue-500 hover:underline">FAQ</Link> or reach out via the dashboard.
            </p>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
