import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotWave — WhatsApp Automation',
  description: 'Next-gen WhatsApp bot automation service. Connect your number and automate with AI.',
  keywords: ['whatsapp', 'bot', 'automation', 'ai', 'sticker', 'download'],
  authors: [{ name: 'Decisive Analyst' }],
  themeColor: '#00ff88',
  icons: {
    icon: '/favicon.ico',
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
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
