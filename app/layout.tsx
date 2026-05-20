import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { PWARegister } from '@/components/pwa/PWARegister';
import ThemeProvider from '@/components/ui/ThemeProvider';
import LanguageBanner from '@/components/ui/LanguageBanner';
import LanguageOnboarding from '@/components/ui/LanguageOnboarding';
import SupportChat from '@/components/ui/SupportChat';

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: {
    default: 'BotWave - Free WhatsApp & Telegram Bot Platform (2026) | Stop Paying for Bots',
    template: '%s | BotWave',
  },
  description: 'Everyone is paying $20/mo for bots that barely work. BotWave is 100% free with 150+ commands across WhatsApp & Telegram - stickers, AI chat, games, anti-spam, media downloads. WhatsApp Bot, Telegram Bot & Userbot. No coding. No catch. Works in Nigeria & worldwide.',
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
    'telegram bot free',
    'telegram userbot',
    'telegram group bot',
    'telegram bot nigeria',
    'free telegram bot 2026',
    'telegram bot vs whatsapp bot',
    'telegram userbot automation',
    'telegram group management bot',
    'telegram anti-spam bot',
    'telegram bot platform',
  ],
  authors: [{ name: 'BotWave Team' }],
  creator: 'BotWave Team',
  publisher: 'BotWave',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.botwave.online'),
  alternates: {},
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://www.botwave.online',
    siteName: 'BotWave',
    title: 'BotWave - Free WhatsApp & Telegram Bot Platform Everyone is Switching To',
    description: 'Why pay for bots when BotWave gives you 150+ commands across WhatsApp & Telegram for FREE? AI chat, stickers, games, anti-spam. WhatsApp Bot, Telegram Bot & Userbot. No coding. No catch.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BotWave - Free WhatsApp & Telegram Bot Automation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotWave - Free WhatsApp & Telegram Bot Platform That Puts Paid Bots to Shame',
    description: 'BotWave gives you 150+ commands across WhatsApp & Telegram for FREE. AI chat, stickers, games, group management. WhatsApp Bot, Telegram Bot & Userbot. No coding needed.',
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
    <html lang="en" data-theme="light">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
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
              applicationSubCategory: 'Chat Bot Platform',
              operatingSystem: 'Web',
              datePublished: '2026-01-15',
              dateModified: new Date().toISOString().split('T')[0],
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '5000',
              },
              description: 'BotWave is a free WhatsApp and Telegram bot automation platform with 150+ commands including stickers, AI chat, media downloads, group management, games, and anti-spam. No coding required. Works in Nigeria and worldwide.',
              url: 'https://www.botwave.online',
              sameAs: [
                'https://www.botwave.online/blog',
              ],
              keywords: 'whatsapp bot, free whatsapp bot, telegram bot alternative, whatsapp automation, bot maker, chatbot platform, whatsapp bot nigeria, messaging bot, no code bot builder, whatsapp group bot, ai chatbot whatsapp',
              author: {
                '@type': 'Person',
                name: 'BotWave Team',
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
                    text: 'BotWave is a free WhatsApp bot automation platform. You connect your own WhatsApp number by scanning a QR code, and the bot adds powerful features like sticker creation, AI chat, media downloads, games, polls, and group management - all through simple commands.',
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
                    text: 'Sign up at www.botwave.online, go to your dashboard, and click "Connect WhatsApp". Scan the QR code with your phone and your bot is live - no coding needed. The whole process takes under 2 minutes.',
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
                    text: 'Absolutely. BotWave works great for businesses - use auto-replies for customer support, polls for feedback, stickers for branding, and AI chat for answering FAQs. The Standard and Boss plans support multiple WhatsApp sessions and unlimited messages.',
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
                    text: 'BotWave runs from your own WhatsApp number (not a shared number), includes advanced anti-ban protection, supports AI chat via Google Gemini, has built-in games and group management, and offers a web dashboard to manage everything. Most other bots charge more and offer fewer features.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is BotWave better than Telegram bots?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Telegram bots are powerful, but they only work on Telegram. In Nigeria and most of Africa, WhatsApp is the dominant messaging platform. BotWave gives you Telegram-level bot features (AI chat, games, media tools, automation) directly on WhatsApp - where your audience already is.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Why is BotWave free when other bot platforms charge $20-50/month?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Most bot platforms host your connection on their servers, which costs them money per user. BotWave is different - your WhatsApp session runs from your own device via QR code, so there is no expensive server infrastructure per user. This lets us offer a generous free tier that other platforms cannot match.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the difference between BotWave and Evolution API?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Evolution API is a powerful open-source WhatsApp API platform designed for developers - it requires technical setup, server management, and coding knowledge. BotWave is built on top of Evolution API but wraps it in a simple web dashboard that anyone can use. No coding, no server setup, just scan QR and go.',
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
                {
                  '@type': 'Question',
                  name: 'What is the difference between Telegram Bot and Telegram Userbot on BotWave?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'A Telegram Bot runs via the official Telegram Bot API - zero ban risk, ideal for group management. A Telegram Userbot uses your real Telegram account via MTProto to automate actions like .ban, .mute, .afk, .purge as if you typed them yourself. BotWave supports both from one dashboard.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How many groups can my bot manage at once?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'On the free plan, your bot can manage all the groups that your connected account is in - there is no group limit. The message cap is 300/month on the free tier. Paid plans remove message limits entirely.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Does BotWave work on iPhone or only Android?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave works with any device that has WhatsApp or Telegram. You connect via QR code or API token through the web dashboard at www.botwave.online - it works on iPhone, Android, desktop, or any browser.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Can I use BotWave for my church, school, or business group?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! BotWave is used by church groups, campus groups, business communities, and social clubs across Nigeria and Africa. Features like polls, announcements, anti-spam, and AI chat are perfect for managing large groups of any kind.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is my WhatsApp number safe - can BotWave read my private chats?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No. BotWave only processes messages in groups where the bot is active. Private/DM messages are never read, stored, or logged. All message processing happens in memory and is discarded immediately. Your session runs on your device IP, not our servers.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What Telegram userbot commands does BotWave support?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave supports 100+ userbot commands: admin (.ban, .mute, .kick, .promote), purge (.purge, .del), gban, PM Permit (.approve, .block, .pmguard), AFK, Notes, Filters, Stickers (.kang), Translate (.tr), Text tools, Fun games (.dice, .slot), Chat tools, Reminders, and full settings (.setprefix, .lang, .setalive). See the complete list at botwave.online/telegram-userbot-commands.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is BotWave better than Combot or Rose Bot for Telegram?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'BotWave offers more features for free than Combot ($5-15/mo) and Rose Bot. It includes AI chat (Gemini), sticker creation, games, WhatsApp support, antiflood, captcha, and a full web dashboard. Combot and Rose Bot are Telegram-only with limited free tiers. BotWave supports WhatsApp + Telegram from one dashboard.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How do I set up a Telegram anti-spam bot for free?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Create a bot via @BotFather on Telegram, paste the token in BotWave dashboard, add the bot to your group as admin. Anti-spam activates automatically. For advanced protection, use the Telegram Userbot with .antiflood and .gban commands. Full guide at botwave.online/blog/telegram-anti-spam-bot.',
                  },
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'BotWave',
              url: 'https://www.botwave.online',
              logo: 'https://www.botwave.online/icons/icon-512x512.png',
              description: 'BotWave is the free bot automation platform for WhatsApp and Telegram communities in Africa. 150+ commands across WhatsApp, Telegram Bot, and Telegram Userbot — no coding needed.',
              foundingDate: '2026',
              founder: { '@type': 'Organization', name: 'BotWave Team' },
              brand: {
                '@type': 'Brand',
                name: 'BotWave',
                logo: 'https://www.botwave.online/icons/icon-512x512.png',
                slogan: 'Stop Paying for Bots',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                url: 'https://www.botwave.online/docs',
                availableLanguage: ['English', 'Yoruba', 'Hausa', 'Igbo', 'Pidgin'],
              },
              areaServed: [
                { '@type': 'Country', name: 'Nigeria' },
                { '@type': 'Continent', name: 'Africa' },
                { '@type': 'Place', name: 'Worldwide' },
              ],
              sameAs: [
                'https://www.botwave.online/blog',
                'https://www.botwave.online/docs',
              ],
              knowsAbout: ['WhatsApp automation', 'Telegram bots', 'community management', 'anti-spam', 'AI chatbots', 'group moderation', 'no-code bot builder', 'WhatsApp bot Nigeria'],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'BotWave',
              url: 'https://www.botwave.online',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.botwave.online/commands?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <div id="gtx-wrapper" className="gtx-collapsed">
          <div id="google_translate_element" />
        </div>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <PWARegister />
        <LanguageOnboarding />
        <LanguageBanner />
        <SupportChat />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,fr,yo,ha,ig,zu,af,hi,ar,es,pt,de,sw,am,pcm',
                layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
                autoDisplay: false,
              }, 'google_translate_element');

              setTimeout(function() {
                var combo = document.querySelector('#google_translate_element .goog-te-combo');
                var wrapper = document.getElementById('gtx-wrapper');
                if (combo && wrapper) {
                  wrapper.classList.add('gtx-collapsed');

                  function updateGlobeDim() {
                    var toggles = document.querySelectorAll('.gtx-nav-toggle');
                    toggles.forEach(function(t) {
                      if (combo.value && combo.value !== 'en' && combo.value !== '') {
                        t.classList.add('gtx-lang-active');
                      } else {
                        t.classList.remove('gtx-lang-active');
                      }
                    });
                  }

                  combo.addEventListener('change', function() {
                    updateGlobeDim();
                    setTimeout(function() { wrapper.classList.add('gtx-collapsed'); }, 300);
                  });
                  document.addEventListener('click', function(e) {
                    if (!wrapper.contains(e.target) && !e.target.closest('.gtx-nav-toggle')) {
                      wrapper.classList.add('gtx-collapsed');
                    }
                  });

                  updateGlobeDim();
                }
              }, 1500);
            }
          `}
        </Script>
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
