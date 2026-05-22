import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import WebPageSchema from '@/components/seo/WebPageSchema';
import FAQSchema from '@/components/seo/FAQSchema';

const LAST_UPDATED = '2026-05-22';

export const metadata: Metadata = {
  title: 'Terms of Service - BotWave',
  description:
    'BotWave Terms of Service. Rules for using the WhatsApp and Telegram bot automation platform — acceptable use, account responsibilities, intellectual property, liability, and termination. Updated May 2026.',
  keywords: [
    'botwave terms',
    'botwave tos',
    'botwave terms of service',
    'whatsapp bot terms',
    'telegram bot terms',
    'whatsapp automation rules',
  ],
  openGraph: {
    title: 'BotWave Terms of Service',
    description: 'Terms and conditions for using BotWave bot automation platform.',
    url: 'https://www.botwave.online/terms',
    type: 'website',
  },
  alternates: { canonical: '/terms' },
};

interface Section {
  id: string;
  title: string;
  intro?: string;
  content?: string;
  items?: string[];
  paragraphs?: string[];
}

const sections: Section[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of these Terms',
    paragraphs: [
      'By creating an account, signing in, or otherwise using BotWave (the "Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service and the accompanying Privacy Policy. If you do not agree to any part of these terms, do not use the Service.',
      'These terms form a binding legal agreement between you ("you" or "your") and BotWave Team ("we", "us", "BotWave"). We reserve the right to update these terms; material changes will be announced at least 14 days in advance by email or in-dashboard banner.',
    ],
  },
  {
    id: 'service-description',
    title: '2. Service description',
    paragraphs: [
      'BotWave is a self-service automation platform for WhatsApp and Telegram. You connect your own messaging account (via WhatsApp pairing code or Telegram bot token / userbot session) and the Service runs configurable bots — group moderation, AI replies, sticker maker, media downloader, games, scheduled messages, and other features described on the Features pages.',
      'BotWave is a software platform. We do not provide WhatsApp or Telegram themselves, we do not endorse or guarantee any specific outcome, and we do not act as a messaging service of record. Your WhatsApp session runs from your own device IP via Baileys; your Telegram bot uses the official Telegram Bot API; your Telegram userbot uses the official MTProto session you authenticate yourself.',
    ],
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and account registration',
    items: [
      'You must be at least 13 years old to use the Service. If you are under 18, you must have parental or guardian consent.',
      'You must provide accurate, complete information when registering an account. You are responsible for keeping your login credentials confidential.',
      'You may not maintain more than one free-tier account. Multiple paid accounts under a single legal entity are allowed.',
      'You are responsible for all activity that occurs under your account, including any sessions or bots you connect.',
      'You agree to notify us immediately at support@botwave.online if you discover any unauthorised use of your account.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable use',
    intro:
      'You agree that you will NOT use BotWave to do any of the following. This list is illustrative, not exhaustive — anything that materially harms users, the Service, or third parties is prohibited.',
    items: [
      'Send spam, unsolicited bulk messages, or unsolicited marketing.',
      'Engage in harassment, hate speech, threats, doxxing, or any form of abusive behaviour.',
      'Distribute illegal content — CSAM, terrorism content, malware, fraudulent schemes, intellectual property infringement.',
      'Attempt to reverse-engineer, decompile, disassemble, or otherwise extract source code from the Service, except where such restriction is prohibited by law.',
      'Circumvent rate limits, anti-abuse mechanisms, anti-ban protections, or any technical limitation of the Service.',
      'Use the Service to violate WhatsApp\'s, Telegram\'s, or any other platform\'s Terms of Service.',
      'Use the Service to impersonate other people or organisations.',
      'Resell, sublicense, white-label, or redistribute the Service without prior written authorisation.',
      'Scrape, harvest, or otherwise programmatically extract user content, contact lists, or session data from group members.',
      'Use the Service to send messages to recipients who have not opted in or who have explicitly opted out.',
      'Run automated voting, brigading, review-fraud, or coordinated inauthentic behaviour campaigns.',
      'Interfere with or disrupt the Service\'s servers, networks, or infrastructure.',
      'Probe, scan, or test the Service\'s security without prior written permission (see our Security page for the responsible disclosure process).',
    ],
  },
  {
    id: 'bot-ownership',
    title: '5. Bot ownership, content, and responsibility',
    paragraphs: [
      'When you connect a WhatsApp number or Telegram account to BotWave, the bot runs under your identity — to anyone receiving its messages, it is your number / your bot account. You are therefore solely responsible for the bot\'s behaviour and for every message it sends.',
      'BotWave provides the platform; you provide the configuration, custom commands, welcome messages, AI prompts, and decisions about which features to enable. We do not pre-moderate user-generated configuration, but we reserve the right to suspend any account whose bot is found to violate these terms, applicable law, or another platform\'s rules.',
      'You retain all intellectual property rights in custom commands, message templates, and other configuration content you create. You grant BotWave a limited, non-exclusive licence to host, process, and execute that content solely to operate the Service for you.',
    ],
  },
  {
    id: 'whatsapp-telegram-compliance',
    title: '6. WhatsApp and Telegram platform compliance',
    paragraphs: [
      'BotWave is not affiliated with, endorsed by, or sponsored by WhatsApp, Meta, Telegram FZ-LLC, or any of their subsidiaries. The names "WhatsApp" and "Telegram" are trademarks of their respective owners and are used here only for descriptive purposes.',
      'You are responsible for complying with WhatsApp\'s Terms of Service and Telegram\'s Terms of Service when using BotWave. While BotWave includes anti-ban protections — session warmup, message variation, rate limiting, presence simulation — no system is 100% ban-proof. Bans, restrictions, or content removals imposed by WhatsApp or Telegram are outside BotWave\'s control, and BotWave is not liable for resulting losses.',
      'If you operate a regulated business (financial services, healthcare, alcohol, gambling, political messaging in jurisdictions where it is regulated), it is your responsibility to ensure your bot\'s messaging complies with applicable local laws.',
    ],
  },
  {
    id: 'data-privacy',
    title: '7. Data, privacy, and security',
    paragraphs: [
      'Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. The short version: we never store message content; we store only the minimum data needed to run the service; you can delete your account at any time.',
      'You are responsible for the lawful basis (consent, contract, legitimate interest, etc.) for processing any personal data of group members via your bot. If your jurisdiction\'s data protection law requires you to be a "controller" of that processing, you must comply with the controller obligations under that law.',
    ],
  },
  {
    id: 'pricing',
    title: '8. Pricing, billing, and refunds',
    items: [
      'BotWave offers a free tier (300 messages / month, 10 AI queries / day, 1 session, all 150+ commands).',
      'Paid tiers (Starter, Standard, Boss) are billed monthly in advance in Nigerian Naira (NGN). Conversion to other currencies is at the rate set by our payment processor at the time of billing.',
      'You may cancel a paid subscription at any time; the cancellation takes effect at the end of the current billing period, and the Service continues until then.',
      'Refunds for paid subscriptions are issued on a case-by-case basis within the first 7 days of a new subscription. After 7 days, no refunds are issued for partial periods, but you can still cancel to prevent future charges.',
      'If a paid subscription auto-renews and you did not intend to renew, contact support@botwave.online within 7 days of the renewal and we will issue a refund of the renewal charge.',
      'Failed payments will suspend access to paid-tier features after a 7-day grace period; sessions on the free tier remain connected.',
      'Prices may change with at least 30 days\' notice; existing paid subscriptions are honoured at the previous price until the end of the then-current billing period.',
    ],
  },
  {
    id: 'service-availability',
    title: '9. Service availability and SLA',
    paragraphs: [
      'BotWave aims for 99.5%+ monthly uptime for the web dashboard and 99% monthly uptime for individual bot containers. Real-time availability is published at the Status page.',
      'The Service may be temporarily unavailable for maintenance, deploys, or unexpected outages. We try to schedule planned maintenance during low-traffic windows and announce it on the Status page at least 24 hours in advance.',
      'We are not liable for losses arising from service interruptions caused by upstream providers (WhatsApp / Telegram outages, hosting provider outages, certificate authority outages, DDoS attacks, force majeure events).',
    ],
  },
  {
    id: 'limitation-of-liability',
    title: '10. Limitation of liability',
    paragraphs: [
      'The Service is provided "as is" and "as available", without warranties of any kind — express, implied, or statutory — including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy.',
      'To the maximum extent permitted by applicable law, BotWave will not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to loss of profits, loss of revenue, loss of business opportunity, loss of WhatsApp / Telegram account, account bans, reputational harm, or data loss.',
      'BotWave\'s total cumulative liability arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid BotWave in the 12 months preceding the event giving rise to the claim, or (b) NGN 10,000.',
      'Some jurisdictions do not allow exclusion of certain warranties or limitation of certain damages. In those jurisdictions, the above exclusions and limitations apply only to the extent permitted by law.',
    ],
  },
  {
    id: 'indemnification',
    title: '11. Indemnification',
    paragraphs: [
      'You agree to indemnify, defend, and hold harmless BotWave, its team, and its infrastructure providers from any claim, damage, loss, or expense (including reasonable legal fees) arising out of (a) your use of the Service, (b) your violation of these Terms or applicable law, (c) the content your bot sends, or (d) your infringement of any third-party right (including intellectual property and privacy rights).',
    ],
  },
  {
    id: 'termination',
    title: '12. Termination',
    items: [
      'You may delete your account at any time from Dashboard → Settings → Delete account. All sessions will be disconnected, your configuration will be wiped, and personal data will be deleted within 30 days (see Privacy Policy for full retention windows).',
      'BotWave may suspend or terminate your account immediately, without prior notice, for material breach of these Terms — particularly violations of Acceptable Use that risk user safety, platform compliance, or system integrity.',
      'BotWave may also terminate your account with 30 days\' notice for any reason or no reason, in which case any unused paid balance will be refunded pro-rata.',
      'Termination does not affect rights and obligations that by their nature should survive — including Sections 10 (Limitation of Liability), 11 (Indemnification), 13 (Intellectual Property), and 16 (Governing Law).',
    ],
  },
  {
    id: 'intellectual-property',
    title: '13. Intellectual property',
    paragraphs: [
      'BotWave and its original content, features, functionality, design, source code, and "BotWave" branding are owned by BotWave Team and protected by international copyright, trademark, trade-secret, and other intellectual property laws.',
      'Open-source components used in the Service (Baileys, grammY, Next.js, Supabase libraries, etc.) are governed by their own licences; nothing in these Terms limits your rights under those licences.',
      'User-generated content (custom commands, message templates, configuration) remains your property. You grant BotWave a worldwide, non-exclusive, royalty-free licence to host, store, and process that content solely to operate the Service for you.',
      'Trademarks of third parties — WhatsApp, Telegram, Meta, etc. — are the property of their respective owners and are used here only for descriptive purposes.',
    ],
  },
  {
    id: 'modifications',
    title: '14. Modifications to the Service',
    paragraphs: [
      'BotWave is under active development; we add features, deprecate features, change defaults, and adjust pricing tiers from time to time. We will provide reasonable advance notice (at least 14 days for deprecations, 30 days for price changes) for changes that materially affect existing users.',
      'We may release beta or experimental features that are clearly labelled as such; those features may change or be removed without the notice period above.',
    ],
  },
  {
    id: 'third-party',
    title: '15. Third-party services and links',
    paragraphs: [
      'BotWave integrates with — or links to — third-party services including but not limited to WhatsApp, Telegram, Supabase, Groq, Google Gemini, Resend, Cloudflare, GitHub, Contabo, and various payment processors. BotWave is not responsible for the practices, content, or availability of those third-party services.',
      'Your interactions with those third parties are governed by their own terms and privacy policies.',
    ],
  },
  {
    id: 'governing-law',
    title: '16. Governing law and disputes',
    paragraphs: [
      'These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-laws principles. Disputes arising out of or relating to these Terms will be resolved exclusively in the competent courts of Lagos, Nigeria — except where mandatory consumer protection laws in your jurisdiction grant you the right to bring proceedings locally.',
      'Before initiating formal legal action, you agree to first attempt to resolve any dispute in good faith with BotWave by sending a written notice to support@botwave.online. We will respond within 30 days.',
    ],
  },
  {
    id: 'miscellaneous',
    title: '17. Miscellaneous',
    items: [
      'Severability — if any provision of these Terms is held invalid or unenforceable, the remaining provisions remain in full force.',
      'No waiver — failure to enforce any provision is not a waiver of the right to enforce it later.',
      'Assignment — you may not assign these Terms; we may assign them to a successor entity (e.g. in a corporate restructure) on notice to you.',
      'Entire agreement — these Terms, together with the Privacy Policy and any other policies referenced here, constitute the entire agreement between you and BotWave.',
      'Headings — section headings are for convenience only and have no substantive effect.',
      'Language — these Terms are written in English. Any translation is provided for convenience only; the English text controls.',
    ],
  },
  {
    id: 'contact',
    title: '18. Contact',
    paragraphs: [
      'For questions about these Terms, email support@botwave.online. For privacy-specific requests (data access, deletion, etc.), see the Privacy Policy contact section.',
    ],
  },
];

const faqs = [
  {
    question: 'Can I use BotWave for commercial purposes?',
    answer:
      'Yes. BotWave is explicitly built for businesses, vendors, and creators in addition to community group admins. The free tier covers personal and light commercial use; paid tiers support higher volumes and additional sessions. You are responsible for ensuring your bot\'s messaging complies with WhatsApp\'s and Telegram\'s Terms of Service for commercial messaging.',
  },
  {
    question: 'Is BotWave affiliated with WhatsApp, Meta, or Telegram?',
    answer:
      'No. BotWave is an independent platform. We are not endorsed by, affiliated with, or sponsored by WhatsApp, Meta, or Telegram. The names "WhatsApp" and "Telegram" are trademarks of their respective owners.',
  },
  {
    question: 'What happens if WhatsApp bans my number?',
    answer:
      'BotWave includes a multi-layer anti-ban system (session warmup, rate limiting, message variation, presence simulation) that significantly reduces ban risk, but no system is 100% ban-proof. WhatsApp bans are imposed by WhatsApp, not by BotWave, and we are not liable for resulting losses. If your number is banned despite following best practices, contact support and we can help diagnose the cause and reconnect a new session.',
  },
  {
    question: 'How do I cancel a paid subscription?',
    answer:
      'Open Dashboard → Billing → Cancel subscription. Cancellation takes effect at the end of the current billing period, and you keep paid-tier access until then. After cancellation you are automatically downgraded to the free tier; your sessions stay connected.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'Refunds are available within the first 7 days of a new paid subscription, no questions asked. After 7 days, partial refunds are case-by-case. Auto-renewal charges that you did not intend to renew can be refunded within 7 days of the renewal — email support@botwave.online.',
  },
  {
    question: 'What counts as a violation of acceptable use?',
    answer:
      'The clearest violations are spam, harassment, illegal content, circumventing anti-abuse limits, and using BotWave to break another platform\'s Terms of Service. The full list is in Section 4 of these Terms.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Terms of Service', url: '/terms' },
        ]}
      />
      <WebPageSchema
        url="https://www.botwave.online/terms"
        name="BotWave Terms of Service"
        description="Terms and conditions for using BotWave WhatsApp and Telegram bot automation platform."
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
            <span className="text-[var(--text-primary)]">Terms of Service</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Last reviewed: {new Date(LAST_UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
            These Terms govern your use of BotWave — the no-code WhatsApp and Telegram bot automation platform at www.botwave.online. Please read them carefully. By creating an account or using the Service you confirm you agree to these Terms and to the accompanying <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
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

          <div className="space-y-8">
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
              </section>
            ))}
          </div>

          <section
            id="faq"
            className="mt-12 p-6 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl scroll-mt-32"
          >
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              Frequently asked questions about the Terms
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
              Related pages
            </h2>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 text-sm">
                Privacy Policy
              </Link>
              <Link href="/security" className="text-blue-400 hover:text-blue-300 text-sm">
                Security
              </Link>
              <Link href="/about" className="text-blue-400 hover:text-blue-300 text-sm">
                About BotWave
              </Link>
              <Link href="/integrations" className="text-blue-400 hover:text-blue-300 text-sm">
                Integrations
              </Link>
              <Link href="/status" className="text-blue-400 hover:text-blue-300 text-sm">
                System Status
              </Link>
              <a
                href="mailto:support@botwave.online?subject=Terms%20of%20Service"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Email support
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
