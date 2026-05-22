import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import WebPageSchema from '@/components/seo/WebPageSchema';
import FAQSchema from '@/components/seo/FAQSchema';

const LAST_UPDATED = '2026-05-22';

export const metadata: Metadata = {
  title: 'Privacy Policy - How BotWave Handles Your Data',
  description:
    'BotWave privacy policy. We do not store WhatsApp message content, we never read your private chats, we do not sell or share data with advertisers, and your session runs from your own device IP. Updated May 2026.',
  keywords: [
    'botwave privacy',
    'whatsapp bot privacy',
    'botwave data policy',
    'is botwave safe',
    'whatsapp bot gdpr',
    'whatsapp bot data retention',
    'whatsapp automation privacy',
  ],
  openGraph: {
    title: 'BotWave Privacy Policy',
    description:
      'How BotWave handles your data. No message storage, no private chat access, no ad trackers, no data sales.',
    url: 'https://www.botwave.online/privacy',
    type: 'website',
  },
  alternates: { canonical: '/privacy' },
};

interface Section {
  id: string;
  title: string;
  intro?: string;
  items?: string[];
  table?: { label: string; value: string }[];
  paragraphs?: string[];
}

const sections: Section[] = [
  {
    id: 'overview',
    title: 'TL;DR — what BotWave does and does not do with your data',
    paragraphs: [
      'BotWave is a no-code platform for running WhatsApp and Telegram bots. We do not store message content, we do not read your private DMs, we do not sell your data to advertisers, and we do not embed third-party trackers or ad networks. Your WhatsApp session runs from your own device IP via the Baileys library, which significantly reduces ban risk.',
      'We only store the minimum data needed to keep your bot connected and your account secure: your email, hashed session credentials, plan/billing info, and aggregate usage counts (e.g. messages sent this month). Everything else — including the content of group messages your bot sees — is processed in memory and discarded after the command is handled.',
    ],
  },
  {
    id: 'what-botwave-can-access',
    title: 'What BotWave can access',
    items: [
      'Messages in groups where the bot is active — needed to detect commands and apply moderation rules you configured.',
      'Your WhatsApp / Telegram session token — needed to maintain the connection from your device.',
      'Your email address and authentication info — for login, password reset, and billing.',
      'Your dashboard configuration — bot settings, welcome messages, anti-spam rules, custom commands.',
    ],
  },
  {
    id: 'what-botwave-cannot-do',
    title: 'What BotWave cannot do',
    items: [
      'Read your private 1:1 messages or DMs (the bot only sees messages in chats where it is added).',
      'Access your WhatsApp or Telegram contacts list.',
      'Send messages from your number without your bot being explicitly active.',
      'Access your phone storage, camera, microphone, or device data.',
      'Share your session with other users or impersonate you elsewhere.',
      'Read messages in chats where the bot is not added.',
    ],
  },
  {
    id: 'message-processing',
    title: 'How messages are processed',
    paragraphs: [
      'When a message hits a chat where your bot is active, BotWave processes it in memory only. The flow is:',
    ],
    items: [
      '1. Message arrives via Baileys (WhatsApp) or grammY / GramJS (Telegram).',
      '2. The bot checks whether it starts with a configured command prefix (! for WhatsApp, / for Telegram bots, . for userbots).',
      '3. If it is not a command, the bot ignores it. No content is logged, stored, or analysed.',
      '4. If it is a command, the bot executes it (e.g. converts an image to a sticker) and replies.',
      '5. After replying, the message data is dropped from memory. Only an aggregate counter — "you used 1 command" — is incremented in Supabase.',
    ],
  },
  {
    id: 'data-retention',
    title: 'Data retention windows',
    intro:
      'We keep data only as long as we need it to provide the service. Specific retention windows:',
    table: [
      { label: 'Session credentials (encrypted)', value: 'For as long as the session is active; deleted within 30 days of session deletion.' },
      { label: 'Account email and auth info', value: 'For the lifetime of your account; deleted within 30 days of account deletion.' },
      { label: 'Aggregate usage counts', value: 'Indefinitely (anonymised after account deletion).' },
      { label: 'Bot configuration settings', value: 'For the lifetime of your account; deleted with your account.' },
      { label: 'Message content', value: 'NEVER stored. Processed in memory only.' },
      { label: 'Support emails / chats', value: 'Up to 2 years from last contact, then deleted.' },
      { label: 'Server logs (IP, request path)', value: 'Up to 30 days, then rotated.' },
      { label: 'AI prompt history (!ai)', value: 'Not persisted by BotWave. Some upstream AI providers (Groq, Gemini) may retain prompts for abuse monitoring per their own policies.' },
    ],
  },
  {
    id: 'session-security',
    title: 'Session security',
    items: [
      'Session credentials are stored in Supabase with Postgres row-level security (RLS) — only your authenticated account can read your session row.',
      'All API and websocket traffic uses TLS encryption.',
      'No plain-text secrets are stored; tokens are encrypted at rest using AES-256 with keys rotated per deployment.',
      'Your QR / pairing session runs from your own device IP — not from BotWave servers — which reduces both ban risk and exposure.',
      'Bot containers are isolated per platform (WhatsApp vs Telegram) so a compromise of one cannot affect the other.',
      'Admin access to the platform is protected by 2FA and IP allowlists.',
    ],
  },
  {
    id: 'what-we-store',
    title: 'What we store about you',
    items: [
      'Your email address (used for login, password reset, and account notices).',
      'A hashed password (bcrypt) — we never store plaintext passwords.',
      'Your plan and billing info (handled by our payment processor; we only store the subscription state and last-4 of the payment method).',
      'Session connection status (active / disconnected / banned) and the timestamp of the last successful connection.',
      'Bot configuration (welcome messages, anti-spam thresholds, custom commands, command toggles).',
      'Aggregate usage counts (messages sent this month, AI queries this day) for plan-limit enforcement.',
      'Coarse-grained referrer (e.g. "google" / "twitter") if provided at signup, used for analytics rollups only.',
    ],
  },
  {
    id: 'what-we-never-store',
    title: 'What we never store',
    items: [
      'Message content or chat history from any chat (private, group, or otherwise).',
      'Contact lists or phone numbers of group members (only your own session JID is stored).',
      'Media files (images, videos, stickers, voice notes, documents).',
      'Location data.',
      'Browsing history, advertising IDs, or device fingerprints.',
      'Banking, card, or payment instrument details (handled entirely by the payment processor).',
    ],
  },
  {
    id: 'cookies-and-tracking',
    title: 'Cookies and tracking',
    intro:
      'We use only the cookies strictly required to run the service. There are no advertising cookies, no third-party trackers, and no cross-site tracking pixels.',
    items: [
      'Auth cookies (sb-*-auth-token, set by Supabase) — keep you logged in. Strictly necessary.',
      'Theme preference (botwave-theme) — remembers dark/light mode. First-party only.',
      'Language preference (botwave-lang) — remembers your selected language. First-party only.',
      'CSRF tokens — short-lived, used to prevent cross-site request forgery on dashboard actions.',
      'No Google Analytics, no Facebook Pixel, no Hotjar, no third-party advertising network.',
    ],
  },
  {
    id: 'third-parties',
    title: 'Third-party services we rely on',
    intro:
      'BotWave is built on a small set of infrastructure providers. Each has its own privacy policy; we only share with them the data strictly required for them to do their job.',
    items: [
      'Supabase (database + auth) — stores your account, session credentials, and bot config.',
      'Groq (default AI provider for !ai) — receives AI prompts only when you explicitly invoke an AI command.',
      'Google Gemini (fallback AI provider, opt-in) — same as above, only on explicit !ai invocation.',
      'Resend / Nodemailer (transactional email) — sends password resets and billing notices to your email.',
      'Cloudflare (CDN, DDoS protection) — sits in front of www.botwave.online; sees request headers but no payloads.',
      'Contabo (VPS hosting) — physical infrastructure for the application servers and bot containers.',
      'GitHub Container Registry (Docker image hosting) — we publish build images here for deployment.',
    ],
  },
  {
    id: 'ai-providers',
    title: 'AI providers and your prompts',
    paragraphs: [
      'When you use the !ai command, your prompt is sent to a third-party AI provider (Groq by default, Google Gemini as opt-in fallback). BotWave does not retain a copy of the prompt or response — but the AI provider may retain prompts for short periods to detect abuse, per their own policies.',
      'If you do not want any data sent to AI providers, you can disable the !ai command for your sessions from the dashboard.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights (GDPR, UK GDPR, CCPA)',
    intro:
      'Regardless of where you live, you have the following rights over your BotWave data:',
    items: [
      'Right to access — request a copy of all personal data we hold about you.',
      'Right to rectification — correct any inaccurate personal data.',
      'Right to erasure — delete your account and all associated personal data. Trigger this yourself from Dashboard → Settings → Delete account, or email support.',
      'Right to data portability — export your bot configuration and account metadata in machine-readable JSON.',
      'Right to object — opt out of any specific processing activity.',
      'Right to restrict processing — temporarily pause processing while a dispute is resolved.',
      'Right to withdraw consent — revoke previously granted consents.',
      'Right to lodge a complaint with a supervisory authority (e.g. your country\'s data protection regulator).',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: [
      'BotWave is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. If you believe a child has signed up for an account, please email support and we will delete the account immediately.',
    ],
  },
  {
    id: 'international-transfers',
    title: 'International data transfers',
    paragraphs: [
      'BotWave\'s primary infrastructure is hosted in the European Union (Contabo, Germany). Backups and some auxiliary services (e.g. Supabase, Cloudflare) may store data in the United States or other jurisdictions. Where personal data leaves the EEA / UK / Nigeria, we rely on Standard Contractual Clauses or the relevant provider\'s adequacy framework as the transfer mechanism.',
    ],
  },
  {
    id: 'breach-notification',
    title: 'Security breach notification',
    paragraphs: [
      'If we ever detect a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours and notify affected users by email without undue delay.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this policy from time to time as the service evolves. When we make material changes — e.g. adding a new third-party processor, changing how AI prompts are handled, or changing retention windows — we will update the "Last reviewed" date at the top of this page and, where the change materially affects you, notify you by email or in-dashboard banner before the change takes effect.',
    ],
  },
  {
    id: 'contact',
    title: 'How to contact us about privacy',
    paragraphs: [
      'For any privacy-related question, request, or complaint, email support@botwave.online with the subject line "Privacy". We aim to respond to all privacy requests within 7 days, and to fulfil access / erasure requests within 30 days as required by GDPR.',
    ],
  },
];

const faqs = [
  {
    question: 'Does BotWave store my WhatsApp messages?',
    answer:
      'No. Message content is never stored. The bot processes messages in memory only to detect and execute commands, then discards them. Only aggregate usage counts (e.g. "you sent 12 commands today") are persisted, never the message content itself.',
  },
  {
    question: 'Can BotWave read my private 1:1 chats?',
    answer:
      'No. The bot only sees messages in chats where it has been added. Private 1:1 chats between you and another contact are not visible to the bot unless you explicitly add it to that conversation.',
  },
  {
    question: 'Is BotWave GDPR-compliant?',
    answer:
      'Yes. We respect every GDPR right — access, rectification, erasure, portability, restriction, objection, and withdrawal of consent. You can trigger account deletion yourself from the dashboard, and we will delete all associated personal data within 30 days. Aggregate usage counts are anonymised after deletion.',
  },
  {
    question: 'Where is my data physically stored?',
    answer:
      'Primary infrastructure is in the European Union (Contabo, Germany). Some auxiliary services (Supabase auth, Cloudflare CDN) may store data in the United States or other regions under Standard Contractual Clauses.',
  },
  {
    question: 'Does BotWave use Google Analytics or Facebook Pixel?',
    answer:
      'No. There are zero third-party tracking pixels or advertising cookies. We use only first-party cookies strictly required to run the service (auth, theme preference, language preference, CSRF protection).',
  },
  {
    question: 'How do I delete my BotWave account?',
    answer:
      'Open the dashboard, go to Settings, and click "Delete account". This permanently disconnects all your bot sessions, wipes your configuration, and queues your personal data for deletion within 30 days. If you cannot access the dashboard, email support@botwave.online and we will process the deletion manually.',
  },
  {
    question: 'Does BotWave sell my data to advertisers or training datasets?',
    answer:
      'No. We do not sell, license, or share personal data with advertisers, data brokers, or AI training providers. The only third parties who see your data are the infrastructure providers listed in the "Third-party services" section, and only the minimum data each needs to do their job.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Privacy Policy', url: '/privacy' },
        ]}
      />
      <WebPageSchema
        url="https://www.botwave.online/privacy"
        name="BotWave Privacy Policy"
        description="How BotWave handles your data. No message storage, no private chat access, GDPR-compliant."
        dateModified={LAST_UPDATED}
        datePublished="2025-11-01"
      />
      <FAQSchema items={faqs} />
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Privacy Policy</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Last reviewed: {new Date(LAST_UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
            BotWave is built for WhatsApp and Telegram communities in Nigeria, Africa, and worldwide. Trust is everything, and trust starts with knowing exactly what we do — and what we never do — with your data. This page explains in plain English what we access, what we store, how long we keep it, and the rights you have over it.
          </p>

          <nav
            aria-label="On this page"
            className="mb-10 p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              On this page
            </h2>
            <ol className="space-y-1.5 list-none text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl scroll-mt-32"
              >
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                  {section.title}
                </h2>
                {section.intro && (
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                    {section.intro}
                  </p>
                )}
                {section.paragraphs?.map((p, i) => (
                  <p
                    key={i}
                    className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3"
                  >
                    {p}
                  </p>
                ))}
                {section.items && (
                  <ul className="space-y-2 mt-2 list-none">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[var(--text-secondary)] text-sm leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.table && (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {section.table.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-[var(--border)] last:border-b-0"
                          >
                            <td className="py-2 pr-4 align-top font-medium text-[var(--text-primary)] w-1/3">
                              {row.label}
                            </td>
                            <td className="py-2 text-[var(--text-secondary)]">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

          <section
            id="faq"
            className="mt-12 p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl scroll-mt-32"
          >
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Frequently asked privacy questions
            </h2>
            <div className="space-y-6">
              {faqs.map((f, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                    {f.question}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Privacy questions?
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-3">
              Email <a href="mailto:support@botwave.online?subject=Privacy" className="text-blue-500 hover:underline">support@botwave.online</a> with the subject "Privacy", or check the {" "}
              <Link href="/faq" className="text-blue-500 hover:underline">
                FAQ
              </Link>{' '}
              and{' '}
              <Link href="/security" className="text-blue-500 hover:underline">
                Security
              </Link>{' '}
              pages for related info.
            </p>
            <p className="text-[var(--text-muted)] text-xs">
              See also: <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link>, <Link href="/security" className="text-blue-500 hover:underline">Security</Link>, <Link href="/status" className="text-blue-500 hover:underline">System Status</Link>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
