import type { Metadata } from 'next';
import HomePage from './HomePageClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/',
    },
  },
};

export default function Page() {
  return <HomePage />;
}
