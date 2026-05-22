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
        {/*
          FAQPage JSON-LD was removed from the root layout because it injected
          a site-wide FAQ schema on every page (login, /admin, /pricing, blog,
          etc.). Google Search Console flagged it because (a) FAQPage on
          non-FAQ pages is policy-invalid, and (b) /faq pages ended up with
          two FAQPage blocks (this one + the per-page one). FAQ schema now
          lives only on app/faq/page.tsx and app/faq/[slug]/page.tsx.
        */}
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
