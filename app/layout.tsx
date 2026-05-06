import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/pwa/PWARegister';
import ThemeProvider from '@/components/ui/ThemeProvider';

export const viewport: Viewport = {
  themeColor: '#059669',
};

export const metadata: Metadata = {
  title: 'BotWave - WhatsApp Automation Platform',
  description: 'Automate your WhatsApp with powerful bot features. Sticker maker, AI chat, media downloader, group tools and more. Free to use.',
  keywords: ['whatsapp', 'bot', 'automation', 'ai', 'sticker', 'download'],
  authors: [{ name: 'Decisive Analyst' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BotWave',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
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
