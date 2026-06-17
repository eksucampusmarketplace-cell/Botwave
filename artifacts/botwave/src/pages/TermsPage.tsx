import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const LAST_UPDATED = '2026-05-22';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of these Terms',
    paragraphs: [
      'By creating an account, signing in, or otherwise using BotWave (the "Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service and the accompanying Privacy Policy.',
      'These terms form a binding legal agreement between you and BotWave Team ("we", "us", "BotWave"). We reserve the right to update these terms; material changes will be announced at least 14 days in advance by email or in-dashboard banner.',
    ],
    items: [],
  },
  {
    id: 'service',
    title: '2. Service description',
    paragraphs: [
      'BotWave is a self-service automation platform for WhatsApp and Telegram. You connect your own messaging account (via WhatsApp pairing code or Telegram bot token / userbot session) and the Service runs configurable bots, group moderation, AI replies, sticker maker, media downloader, games, scheduled messages, and other features.',
      'BotWave is a software platform. We do not provide WhatsApp or Telegram themselves and do not act as a messaging service of record.',
    ],
    items: [],
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and account registration',
    paragraphs: [],
    items: [
      'You must be at least 13 years old to use the Service. If you are under 18, you must have parental or guardian consent.',
      'You must provide accurate, complete information when registering an account.',
      'You may not maintain more than one free-tier account.',
      'You are responsible for all activity that occurs under your account.',
      'You agree to notify us immediately at support@botwave.online if you discover any unauthorised use of your account.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable use',
    paragraphs: ['You agree that you will NOT use BotWave to:'],
    items: [
      'Send spam, unsolicited bulk messages, or unsolicited marketing.',
      'Engage in harassment, hate speech, threats, doxxing, or any form of abusive behaviour.',
      'Distribute illegal content, malware, fraudulent schemes, or intellectual property infringement.',
      'Circumvent rate limits, anti-abuse mechanisms, or any technical limitation of the Service.',
      'Use the Service to violate WhatsApp\'s, Telegram\'s, or any other platform\'s Terms of Service.',
      'Impersonate another person or entity.',
    ],
  },
  {
    id: 'free-tier',
    title: '5. Free tier and paid plans',
    paragraphs: [
      'The Free tier is permanently free with the limits described on the Pricing page. We reserve the right to adjust free-tier limits with 30 days notice.',
      'Paid plans are billed monthly via Flutterwave. You can cancel anytime. We issue prorated refunds for unused portions of a billing period upon request.',
    ],
    items: [],
  },
  {
    id: 'intellectual-property',
    title: '6. Intellectual property',
    paragraphs: [
      'BotWave, its logos, and all platform content are owned by BotWave Team and protected by intellectual property laws. You may not copy, modify, or distribute our software without permission.',
      'You retain ownership of all content you create using the Service (bot configurations, custom commands, templates).',
    ],
    items: [],
  },
  {
    id: 'liability',
    title: '7. Limitation of liability',
    paragraphs: [
      'BotWave is provided "as is" without warranties of any kind. We are not liable for WhatsApp or Telegram account bans that may occur as a result of bot usage, even when using our anti-ban features. Using messaging automation carries inherent platform risk.',
      'Our total liability to you for any claim arising from these Terms will not exceed the amount you paid us in the 3 months preceding the claim.',
    ],
    items: [],
  },
  {
    id: 'termination',
    title: '8. Termination',
    paragraphs: [
      'We may terminate or suspend your account immediately, without prior notice, if you violate these Terms. You may also delete your account at any time from Settings → Account.',
    ],
    items: [],
  },
  {
    id: 'contact',
    title: '9. Contact',
    paragraphs: [
      'Questions? Email us at support@botwave.online. We respond within 3 business days.',
    ],
    items: [],
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

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Terms of Service</h1>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            Last updated: {new Date(LAST_UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <nav className="p-4 rounded-xl bg-[var(--bg-alt)] border border-[var(--border)] mb-10">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Contents</p>
            <ul className="space-y-1">
              {sections.map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm text-blue-500 hover:underline">{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">
            {sections.map(section => (
              <section key={section.id} id={section.id}>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">{section.title}</h2>
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">{p}</p>
                ))}
                {section.items.length > 0 && (
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="text-blue-500 mt-1 shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
