import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'AI Features - WaveAI Chat, Digest, Translation, OCR | BotWave',
  description: 'BotWave AI features: intelligent chat (WaveAI), group digest summaries, document scanning, OCR text extraction, translation. All free, powered by Google Gemini.',
  keywords: ['whatsapp ai bot', 'whatsapp ai chatbot', 'ai auto reply whatsapp', 'whatsapp ai assistant', 'gemini whatsapp bot', 'ai customer support whatsapp'],
  openGraph: {
    title: 'BotWave AI Features - WaveAI',
    description: 'AI chat, group digest, document scanning, OCR, translation. Free AI on WhatsApp and Telegram.',
    url: 'https://www.botwave.online/features/ai',
    type: 'website',
  },
  alternates: { canonical: '/features/ai' },
};

const aiFeatures = [
  {
    title: 'WaveAI Chat',
    command: '!ai [message]',
    aliases: ['!ask', '!chat'],
    description: 'Ask anything and get intelligent, conversational responses. Powered by Google Gemini 2.0 Flash. Handles general knowledge, coding, math, writing, advice, and more. Works in groups and private chats.',
    useCases: ['Homework help in student groups', 'Quick answers without leaving WhatsApp', 'Content writing and brainstorming', 'Code explanations and debugging'],
    link: '/commands/whatsapp/ai',
  },
  {
    title: 'Group Digest',
    command: '!digest',
    aliases: ['!summary', '!tldr'],
    description: 'AI summarizes recent group messages so you can catch up without reading hundreds of messages. Shows key topics, active participants, and highlights from any time period.',
    useCases: ['Catching up on busy work groups', 'Getting highlights from active communities', 'Quick recap of overnight messages', 'Finding key discussions and decisions'],
    link: '/commands/whatsapp/digest',
  },
  {
    title: 'Document and Receipt Scanner',
    command: '!scan',
    aliases: ['!receipt', '!invoice'],
    description: 'Send an image of a receipt, invoice, or document and the AI extracts all text, amounts, dates, and key information in a structured format. Uses Gemini vision capabilities.',
    useCases: ['Scanning receipts for expense tracking', 'Extracting text from documents', 'Reading handwritten notes', 'Parsing invoices and bills'],
    link: '/commands/whatsapp/scan',
  },
  {
    title: 'OCR Text Extraction',
    command: '!ocr',
    aliases: ['!readtext'],
    description: 'Extract text from any image using optical character recognition. Reply to an image or send an image with the command. Works with screenshots, printed text, and documents.',
    useCases: ['Reading text from screenshots', 'Extracting printed text from photos', 'Copying text from images', 'Converting image documents to editable text'],
    link: '/commands/whatsapp/ocr',
  },
  {
    title: 'Smart Translation',
    command: '!translate [lang] [text]',
    aliases: ['!tr'],
    description: 'Translate text between 20+ languages. Reply to a message or type text after the language code. Supports Yoruba, Hindi, Arabic, French, Spanish, and more.',
    useCases: ['International group communication', 'Translating customer messages', 'Learning new languages', 'Cross-language content sharing'],
    link: '/commands/whatsapp/translate',
  },
  {
    title: 'Chat Recap',
    command: '!recap',
    aliases: [],
    description: 'Summarize group chat activity with AI. Similar to digest but focuses on recent conversation flow and key takeaways. Helps you understand what happened while you were away.',
    useCases: ['Quick summary of recent chat', 'Understanding group mood and activity', 'Catching up after being offline', 'Identifying important messages'],
    link: '/commands',
  },
];

export default function AIFeaturesPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BotWave AI Features',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web, WhatsApp, Telegram',
    description: 'AI-powered features for WhatsApp and Telegram including chat, group digest, document scanning, OCR, and translation. Powered by Google Gemini.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: aiFeatures.map(f => f.title).join(', '),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/features" className="hover:text-[var(--primary)]">Features</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">AI Features</span>
          </nav>

          <div className="mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium mb-4">AI Cluster</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">WaveAI - Intelligence Built Into Every Message</h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Every AI feature in BotWave is free and powered by Google Gemini 2.0 Flash. Ask questions, summarize group chats, scan documents, extract text from images, and translate languages without leaving WhatsApp.
            </p>
          </div>

          <div className="space-y-8">
            {aiFeatures.map((feature, i) => (
              <div
                key={i}
                className="p-6 md:p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">{feature.title}</h2>
                      <code className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 text-sm font-mono">{feature.command}</code>
                    </div>
                    {feature.aliases.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mb-3">
                        Aliases: {feature.aliases.map(a => <code key={a} className="px-1 py-0.5 rounded bg-[var(--border)] text-[var(--text-muted)] font-mono mx-0.5">{a}</code>)}
                      </p>
                    )}
                    <p className="text-[var(--text-secondary)] mb-4">{feature.description}</p>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Use cases:</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {feature.useCases.map((uc, j) => (
                          <li key={j} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">+</span>
                            {uc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Link
                    href={feature.link}
                    className="flex-shrink-0 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 text-sm font-medium hover:bg-purple-500/20 transition-colors"
                  >
                    View command
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">How AI works in BotWave</h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>+ AI is powered by Google Gemini 2.0 Flash with smart key rotation</li>
              <li>+ Free tier includes 10 AI queries per day per session</li>
              <li>+ All processing happens server-side - no API key needed from you</li>
              <li>+ Vision capabilities for image analysis and document scanning</li>
              <li>+ Context-aware responses in group conversations</li>
            </ul>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/features/moderation" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🛡️</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-red-500 transition-colors">Moderation Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Anti-delete recovery, admin controls, group analytics</p>
            </Link>
            <Link href="/features/media" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-orange-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🎨</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-orange-500 transition-colors">Media Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Sticker maker, video downloader, logo generator, TTS</p>
            </Link>
            <Link href="/commands" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">📋</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">All Commands</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Browse 150+ commands across all platforms</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
