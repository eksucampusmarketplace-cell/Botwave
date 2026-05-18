import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Media Features - Sticker Maker, Video Download, Logo Generator | BotWave',
  description: 'BotWave media tools: sticker maker, TikTok/YouTube/Instagram downloader, logo generator, background remover, OCR, text to speech, QR codes. All free inside WhatsApp.',
  keywords: ['whatsapp sticker maker bot', 'tiktok download whatsapp', 'youtube download whatsapp', 'whatsapp media bot', 'instagram download bot', 'whatsapp logo maker'],
  openGraph: {
    title: 'BotWave Media Tools - Creative Suite',
    description: 'Sticker maker, video downloader, logo generator, and more. All free inside WhatsApp.',
    url: 'https://www.botwave.online/features/media',
    type: 'website',
  },
  alternates: { canonical: '/features/media' },
};

const mediaFeatures = [
  {
    title: 'Sticker Maker',
    command: '!sticker',
    description: 'Convert any image, video, or GIF into a WhatsApp sticker instantly. Send or reply to media with !sticker and the bot converts it. Supports different crop modes.',
    capabilities: ['Image to sticker', 'Video to animated sticker', 'GIF to sticker', 'Reply to any media to convert'],
    link: '/commands/whatsapp/sticker',
  },
  {
    title: 'Video and Audio Downloader',
    command: '!download [url]',
    description: 'Download videos from TikTok (no watermark), YouTube, Instagram Reels, Twitter/X, and other platforms directly into your chat. Auto-detects the platform from the URL.',
    capabilities: ['TikTok without watermark', 'YouTube videos', 'Instagram Reels and posts', 'Twitter/X videos', 'Auto-detect platform from URL'],
    link: '/commands/whatsapp/download',
  },
  {
    title: 'Music Download',
    command: '!music [song name]',
    aliases: ['!song', '!findsong'],
    description: 'Search for and download audio tracks directly in chat. Get MP3 files sent as audio messages that play inline in WhatsApp.',
    capabilities: ['Search by song name', 'Audio-only extraction', 'Inline playback', 'Artist and title metadata'],
    link: '/commands/whatsapp/music',
  },
  {
    title: 'Logo Generator',
    command: '!logo [style] [name]',
    aliases: ['!logogen', '!logocreate', '!logomaker'],
    description: 'Generate professional logos with 45+ styles directly in WhatsApp. Supports taglines (use | separator), custom hex colors, and size presets (square, wide, tall, banner, story).',
    capabilities: ['45+ logo styles (neon, gradient, vintage, etc.)', 'Custom text and hex colors', 'Multiple size presets', 'Brand kit with !brandkit', '!logo preview to see all styles'],
    link: '/commands/whatsapp/logo',
  },
  {
    title: 'Background Remover',
    command: '!removebg',
    description: 'Remove the background from any image. Reply to a photo or send one with the command. Outputs a transparent PNG.',
    capabilities: ['AI-powered background detection', 'Transparent PNG output', 'Works with photos and graphics', 'Reply to any image to process'],
    link: '/commands/whatsapp/removebg',
  },
  {
    title: 'Text to Speech',
    command: '!tts [text]',
    description: 'Convert text into spoken audio. The bot sends back a voice message with the text read aloud. Useful for accessibility or creating audio content.',
    capabilities: ['Text to voice message', 'Natural-sounding speech', 'Plays inline in chat', 'Works with any text length'],
    link: '/commands/whatsapp/tts',
  },
  {
    title: 'View Once Saver',
    command: '!viewonce',
    description: 'Save view-once media that would otherwise disappear. Reply to a view-once message and the bot resends it as a permanent message you can keep.',
    capabilities: ['Save view-once images', 'Save view-once videos', 'Resend as regular media', 'Works by replying to view-once'],
    link: '/commands/whatsapp/viewonce',
  },
  {
    title: 'Status Saver',
    command: '!savestatus',
    description: 'Save WhatsApp statuses (stories) before they disappear after 24 hours. The media gets sent directly to your chat.',
    capabilities: ['Save image statuses', 'Save video statuses', 'Works on contact statuses', 'Media sent to your chat'],
    link: '/commands/whatsapp/savestatus',
  },
  {
    title: 'Image Editing Suite',
    command: '!blur, !crop, !resize, !rotate, !compress',
    description: 'Full image manipulation toolkit. Blur, crop, resize, rotate, compress, adjust brightness/contrast, convert to grayscale, or invert colors directly in chat.',
    capabilities: ['Blur images', 'Crop to specific dimensions', 'Resize images', 'Rotate by degrees', 'Compress file size', 'Grayscale and invert'],
    link: '/commands',
  },
  {
    title: 'Sticker to Image/GIF',
    command: '!toimg / !togif',
    description: 'Convert stickers back to regular images or GIFs. Reply to any sticker to get the original image file or animation.',
    capabilities: ['Sticker to PNG image', 'Animated sticker to GIF', 'Preserve quality', 'Reply to any sticker'],
    link: '/commands',
  },
  {
    title: 'QR Code Generator and Reader',
    command: '!qr [text] / !qrread',
    description: 'Generate QR codes from text or URLs. Also read/decode QR codes from images by replying with !qrread.',
    capabilities: ['Generate QR from text/URL', 'Read QR codes from images', 'Works with any content', 'High resolution output'],
    link: '/commands',
  },
];

export default function MediaFeaturesPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BotWave Media Tools',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web, WhatsApp, Telegram',
    description: 'Media creation and download tools for WhatsApp. Sticker maker, video downloader, logo generator, background remover, and image editing.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: mediaFeatures.map(f => f.title).join(', '),
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
            <span className="text-[var(--text-primary)]">Media Features</span>
          </nav>

          <div className="mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-4">Media Cluster</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Creative Suite - Media Tools Inside Your Chat</h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Create stickers, download videos from any platform, generate logos, remove backgrounds, convert formats, and edit images. Everything works directly inside WhatsApp with simple commands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaFeatures.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-orange-400/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{feature.title}</h2>
                  <code className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-xs font-mono">{feature.command}</code>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{feature.description}</p>
                <ul className="space-y-1 mb-4">
                  {feature.capabilities.map((cap, j) => (
                    <li key={j} className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">+</span>
                      {cap}
                    </li>
                  ))}
                </ul>
                <Link href={feature.link} className="text-xs font-medium text-orange-600 hover:underline">
                  View command details
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/features/ai" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🧠</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors">AI Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">WaveAI chat, group digest, document scanning, translation</p>
            </Link>
            <Link href="/features/moderation" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🛡️</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-red-500 transition-colors">Moderation Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Anti-delete recovery, admin controls, group analytics</p>
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
