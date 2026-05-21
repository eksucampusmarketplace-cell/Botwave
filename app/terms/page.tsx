import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service - BotWave',
  description: 'BotWave terms of service. Rules for using BotWave WhatsApp and Telegram bot automation platform.',
  keywords: ['botwave terms', 'botwave tos', 'botwave terms of service'],
  openGraph: {
    title: 'BotWave Terms of Service',
    description: 'Terms and conditions for using BotWave bot automation platform.',
    url: 'https://www.botwave.online/terms',
    type: 'website',
  },
  alternates: { canonical: '/terms' },
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing or using BotWave ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. BotWave reserves the right to update these terms at any time.',
  },
  {
    title: '2. Service Description',
    content: 'BotWave is a bot automation platform for WhatsApp and Telegram. Users can connect their own messaging accounts to automate group management, moderation, and other features. The Service runs bots from the user\'s own device IP, not from BotWave servers.',
  },
  {
    title: '3. Account Registration',
    content: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 13 years old to use the Service. One person may not maintain more than one free account.',
  },
  {
    title: '4. Acceptable Use',
    items: [
      'You may not use BotWave to send spam or unsolicited messages',
      'You may not use the Service for harassment, hate speech, or illegal activities',
      'You may not attempt to reverse-engineer, decompile, or hack the Service',
      'You may not use the Service to violate WhatsApp or Telegram\'s Terms of Service',
      'You may not resell or redistribute the Service without authorization',
      'You may not create bots that impersonate other users or organizations',
      'You are responsible for all content sent through bots you create or manage',
    ],
  },
  {
    title: '5. Bot Ownership & Responsibility',
    content: 'When you create or connect a bot through BotWave, you are solely responsible for the bot\'s behavior and the content it sends. BotWave is a platform provider and does not endorse or control the content of user-created bots. If your bot violates these terms, your account may be suspended.',
  },
  {
    title: '6. WhatsApp & Telegram Compliance',
    content: 'BotWave integrates with WhatsApp and Telegram via their respective APIs. You are responsible for complying with WhatsApp\'s and Telegram\'s Terms of Service. BotWave is not affiliated with, endorsed by, or sponsored by WhatsApp, Meta, or Telegram. Account bans by WhatsApp or Telegram are outside BotWave\'s control.',
  },
  {
    title: '7. Data & Privacy',
    content: 'Your use of the Service is also governed by our Privacy Policy. BotWave processes messages in memory only and does not store message content. Session credentials are stored securely with row-level security. See our Privacy Policy for full details.',
  },
  {
    title: '8. Service Availability',
    content: 'BotWave aims for high availability but does not guarantee 100% uptime. The Service may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control. BotWave is not liable for any losses resulting from service interruptions.',
  },
  {
    title: '9. Limitation of Liability',
    content: 'BotWave is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.',
  },
  {
    title: '10. Termination',
    content: 'BotWave may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the dashboard. Upon termination, your bot sessions will be disconnected and your data will be deleted within 30 days.',
  },
  {
    title: '11. Intellectual Property',
    content: 'BotWave and its original content, features, and functionality are owned by BotWave and are protected by international copyright, trademark, and other intellectual property laws. User-generated content (custom commands, bot configurations) remains the property of the user.',
  },
  {
    title: '12. Contact',
    content: 'For questions about these Terms of Service, contact us at support@botwave.online or through the in-app support chat.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Terms of Service</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Terms of Service</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-4">Last updated: May 2026</p>
          <p className="text-[var(--text-secondary)] mb-10">
            Please read these terms carefully before using BotWave. By using the platform, you agree to these terms.
          </p>

          <div className="space-y-8">
            {sections.map(section => (
              <div key={section.title} className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{section.title}</h2>
                {section.content && (
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{section.content}</p>
                )}
                {'items' in section && section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)] text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Related Pages</h2>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 text-sm">
                Privacy Policy
              </Link>
              <Link href="/about" className="text-blue-400 hover:text-blue-300 text-sm">
                About BotWave
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
