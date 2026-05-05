import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/pwa/PWARegister';

export const viewport: Viewport = {
  themeColor: '#00ff88',
};

export const metadata: Metadata = {
  title: 'BotWave',
  description: 'Next-gen WhatsApp bot automation service. Connect your number and automate with AI.',
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
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
