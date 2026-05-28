import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BotWave Learn - Learn to Code for Free',
  description: 'A complete coding education platform that takes you from zero to professional developer. Free interactive lessons in Python, JavaScript, Web Development, and more.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{' '}
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}