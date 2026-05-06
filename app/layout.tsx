import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/pwa/PWARegister';
import ThemeProvider from '@/components/ui/ThemeProvider';

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: {
    default: 'BotWave - Free WhatsApp Bot Automation Platform | Nigeria',
    template: '%s | BotWave',
  },
  description: 'Free WhatsApp bot for automation in Nigeria. Create stickers, AI chat, media downloads, group management, anti-spam, games and more. No coding needed — just scan QR and go.',
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
    title: 'BotWave - Free WhatsApp Bot Automation Platform',
    description: 'Automate your WhatsApp with powerful bot features. Sticker maker, AI chat, media downloads, group management, games and more. Free forever, no coding needed.',
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
    title: 'BotWave - Free WhatsApp Bot Automation',
    description: 'Automate your WhatsApp with 50+ commands. Stickers, AI chat, media downloads, games, group tools. Free forever.',
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
