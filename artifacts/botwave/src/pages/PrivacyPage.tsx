import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const LAST_UPDATED = '2026-05-22';

interface Section {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
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
      'Messages in groups where the bot is active, needed to detect commands and apply moderation rules you configured.',
      'Your WhatsApp / Telegram session token, needed to maintain the connection from your device.',
      'Your email address and authentication info, for login, password reset, and billing.',
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
    id: 'data-stored',
    title: 'What data we store',
    items: [
      'Email address — for login, billing, and password reset.',
      'Hashed password — we never store plain-text passwords.',
      'WhatsApp/Telegram session credentials — encrypted. Required to maintain your bot connection.',
      'Bot configuration — your welcome message, anti-spam settings, custom commands.',
      'Usage counts — messages sent this month, AI queries today. Not message content.',
      'Billing info — plan, payment status. Card details are handled by Flutterwave, not BotWave.',
    ],
  },
  {
    id: 'data-not-stored',
    title: 'What we do NOT store',
    items: [
      'The content of messages your bot processes — all message text is handled in memory only.',
      'Images, videos, or media sent in groups.',
      'Phone numbers of group members (only your own account phone number for session purposes).',
      'Private 1:1 message content of any kind.',
      'Your WhatsApp or Telegram contacts.',
    ],
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    items: [
      'Google Gemini — powers AI features. Messages sent via !ai are processed by Google. See Google\'s privacy policy.',
      'Supabase — our database provider. Data at rest is encrypted.',
      'Flutterwave — handles payment processing. Card data never touches BotWave servers.',
      'We do not use Google Analytics, Facebook Pixel, or any advertising trackers.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    paragraphs: [
      'You can request deletion of your account and all associated data at any time by emailing support@botwave.online or from the Account Settings page in your dashboard. We will process deletion requests within 14 days.',
      'You can export your bot configuration data at any time from Settings → Export.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: [
      'Questions about this privacy policy? Email us at support@botwave.online. We respond to all privacy inquiries within 3 business days.',
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
            <span className="text-[var(--text-primary)]">Privacy Policy</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">Privacy Policy</h1>
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
                {section.paragraphs?.map((p, i) => (
                  <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">{p}</p>
                ))}
                {section.items && (
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
