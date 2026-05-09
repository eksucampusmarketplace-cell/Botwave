import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/pwa/PWARegister';
import ThemeProvider from '@/components/ui/ThemeProvider';

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: {
    default: 'BotWave - Free WhatsApp Bot That Actually Works (2026) | Stop Paying for Bots',
    template: '%s | BotWave',
  },
  description: 'Everyone is paying $20/mo for WhatsApp bots that barely work. BotWave is 100% free with 50+ commands — stickers, AI chat, games, anti-spam, media downloads. No coding. No catch. Works in Nigeria & worldwide. Why is nobody talking about this?',
  keywords: [
    'whatsapp bot',
    'whatsapp automation',
    'free whatsapp bot',
    'whatsapp bot nigeria',
    'whatsapp sticker maker',
    'whatsapp ai bot',
    'whatsapp group bot',
    'whatsapp automation tool',
    'whatsapp bot free',
    'botwave',
    'whatsapp media downloader',
    'whatsapp anti-spam bot',
    'whatsapp games bot',
    'automate whatsapp',
    'whatsapp bot platform',
    'telegram bot alternative',
    'free bot platform',
    'best free bot 2026',
    'chat bot free',
    'messaging bot',
    'bot maker free',
    'no code bot builder',
    'whatsapp bot africa',
    'whatsapp bot for business',
    'whatsapp group management bot',
    'free ai chatbot whatsapp',
    'whatsapp bot maker',
    'how to make whatsapp bot',
    'whatsapp bot for groups',
    'whatsapp bot download',
    'whatsapp bot commands',
    'whatsapp bot sticker',
    'whatsapp chatbot free',
    'whatsapp bot 2026',
    'best whatsapp bot',
    'whatsapp bot for class groups',
    'whatsapp bot for business nigeria',
    'free whatsapp chatbot nigeria',
    'whatsapp group admin bot',
    'whatsapp anti spam bot',
    'whatsapp poll bot',
    'whatsapp trivia bot',
    'whatsapp media bot',
  ],
  authors: [{ name: 'Decisive Analyst' }],
  creator: 'Decisive Analyst',
  publisher: 'BotWave',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.botwave.online'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://www.botwave.online',
    siteName: 'BotWave',
    title: 'BotWave - The Free Bot Platform Everyone is Switching To',
    description: 'Why pay for Telegram bots, Twitter bots, or TikTok automation when BotWave gives you 50+ WhatsApp commands for FREE? AI chat, stickers, games, anti-spam. No coding. No catch.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BotWave - Free WhatsApp Bot Automation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotWave - Free WhatsApp Bot That Puts Paid Bots to Shame',
    description: 'I replaced my $20/mo Telegram bot with this FREE WhatsApp bot. 50+ commands, AI chat, stickers, games. No coding needed. Why is nobody talking about this?',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BotWave',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'BotWave',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'NGN',
              },
              description: 'Free WhatsApp bot automation platform. Create stickers, AI chat, media downloads, group management, games and more.',
              url: 'https://www.botwave.online',
              author: {
                '@type': 'Person',
                name: 'Decisive Analyst',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is BotWave?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave is a free WhatsApp bot automation platform. You connect your own WhatsApp number by scanning a QR code, and the bot adds powerful features like sticker creation, AI chat, media downloads, games, polls, and group management — all through simple commands.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is BotWave free to use?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! BotWave has a free tier that includes all basic commands, 300 messages per month, 10 AI queries per day, and 1 WhatsApp session. Paid plans start at just ₦500/month for more messages and features.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How do I set up a WhatsApp bot with BotWave?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Sign up at www.botwave.online, go to your dashboard, and click "Connect WhatsApp". Scan the QR code with your phone and your bot is live — no coding needed. The whole process takes under 2 minutes.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Will my WhatsApp number get banned?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave has built-in anti-ban protection including human-like response delays, message variation, rate limiting, and session warmup. Your session runs from your own device IP, which significantly reduces ban risk compared to server-based bots.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What commands does the WhatsApp bot support?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave supports 50+ commands including !sticker (create stickers), !ai (AI chat), !download (media downloader), !trivia (games), !poll (polls), !weather, !translate, !joke, !quote, and many more. Type !help in any chat to see the full list.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Can I use BotWave for my business?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Absolutely. BotWave works great for businesses — use auto-replies for customer support, polls for feedback, stickers for branding, and AI chat for answering FAQs. The Standard and Boss plans support multiple WhatsApp sessions and unlimited messages.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Does BotWave work in Nigeria?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, BotWave is built for users in Nigeria and across Africa. Payments are in Naira (₦) via bank transfer, and the platform is optimized for Nigerian internet speeds and WhatsApp usage patterns.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How is BotWave different from other WhatsApp bots?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave runs from your own WhatsApp number (not a shared number), includes advanced anti-ban protection, supports AI chat via Groq, has built-in games and group management, and offers a web dashboard to manage everything. Most other bots charge more and offer fewer features.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is BotWave better than Telegram bots?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Telegram bots are powerful, but they only work on Telegram. In Nigeria and most of Africa, WhatsApp is the dominant messaging platform. BotWave gives you Telegram-level bot features (AI chat, games, media tools, automation) directly on WhatsApp — where your audience already is.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Why is BotWave free when other bot platforms charge $20-50/month?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Most bot platforms host your connection on their servers, which costs them money per user. BotWave is different — your WhatsApp session runs from your own device via QR code, so there is no expensive server infrastructure per user. This lets us offer a generous free tier that other platforms cannot match.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the difference between BotWave and Evolution API?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Evolution API is a powerful open-source WhatsApp API platform designed for developers — it requires technical setup, server management, and coding knowledge. BotWave is built on top of Evolution API but wraps it in a simple web dashboard that anyone can use. No coding, no server setup, just scan QR and go.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is BotWave safe to use? Will my data be secure?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Your WhatsApp session runs from your own device IP (not our servers), so your messages are never routed through us. Credentials are stored securely with row-level security, and we never read or store your WhatsApp messages. The anti-ban system also protects your account from automated detection.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How does BotWave protect my WhatsApp account from bans?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave has the most advanced anti-ban system of any WhatsApp bot. It includes session warmup (gradual message increase over 7 days), human-like typing delays, message variation, rate limiting, activity hours simulation, and media fingerprint jittering. Your session runs from your own device IP, not a shared server.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Do I need to be a developer to use BotWave?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No! Unlike Evolution API, Baileys, or other WhatsApp libraries that require coding, BotWave is 100% no-code. Sign up, scan QR code, and your bot is live. All configuration happens through a web dashboard.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Can BotWave help me grow my community?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Absolutely. Use polls for engagement, trivia games to keep groups active, anti-spam to keep groups clean, and the built-in referral system to grow organically. Many campus group admins and small business owners use BotWave to manage groups of hundreds of members effortlessly.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
