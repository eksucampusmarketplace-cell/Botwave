import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Moderation Features - Community Shield Anti-Spam & Protection | BotWave',
  description: 'BotWave moderation: anti-delete recovery, flood detection, admin controls, CAPTCHA, anti-raid, link blocking. Protect WhatsApp and Telegram groups automatically.',
  keywords: ['whatsapp anti spam bot', 'whatsapp group moderation', 'telegram anti spam', 'group moderation bot', 'whatsapp admin bot', 'recover deleted messages whatsapp'],
  openGraph: {
    title: 'BotWave Moderation - Community Shield',
    description: 'Anti-delete recovery, flood detection, CAPTCHA, admin controls. Automated group protection.',
    url: 'https://www.botwave.online/features/moderation',
    type: 'website',
  },
  alternates: { canonical: '/features/moderation' },
};

const whatsappModeration = [
  {
    title: 'Anti-Delete Recovery',
    commands: ['!antidelete on/off', '!recover', '!recover pr'],
    description: 'When enabled, the bot silently caches messages. If someone deletes a message, use !recover to see what was deleted in the last 10 minutes. Use !recover pr to get deleted messages sent to your private chat silently.',
    capabilities: ['Caches all messages silently', 'Recovers text, images, videos, stickers', 'Tags who deleted what in groups', 'Private recovery with !recover pr', 'Works on media and text messages'],
  },
  {
    title: 'Admin Controls',
    commands: ['!kick @user', '!promote @user', '!demote @user', '!tagall [message]'],
    description: 'Full suite of admin commands for managing members. Kick members, promote or demote admins, and tag everyone in the group for important announcements.',
    capabilities: ['Kick by reply, mention, or phone number', 'Promote members to admin', 'Demote admins back to member', 'Tag all group members at once'],
  },
  {
    title: 'Welcome and Goodbye Messages',
    commands: ['!welcome [message]', '!welcome off', '!goodbye [message]', '!goodbye off'],
    description: 'Automatically greet new members and say goodbye when someone leaves. Custom messages with variable support for group name and member name.',
    capabilities: ['Custom welcome messages', 'Custom goodbye messages', 'Toggle on/off anytime', 'Auto-send when members join/leave'],
  },
  {
    title: 'Message Purge',
    commands: ['!purge [count]'],
    description: 'Delete multiple recent messages at once. Useful for cleaning up spam or off-topic conversations in a group without deleting one by one.',
    capabilities: ['Bulk delete messages', 'Specify number of messages to remove', 'Cleans up chat quickly', 'Admin-only access'],
  },
  {
    title: 'Ghost Mode',
    commands: ['!ghost [seconds]', '!ghost off'],
    description: 'Auto-delete your own messages after a set time. Messages disappear like Snapchat. Useful for sharing sensitive info that should not persist.',
    capabilities: ['Configurable timer (seconds)', 'Auto-deletes your messages', 'Toggle on/off', 'Works in groups and private chats'],
  },
  {
    title: 'Group Analytics',
    commands: ['!spy', '!stats'],
    description: 'View activity stats for your group. See who is most active, message counts, peak hours, and engagement patterns. Helps you understand group health.',
    capabilities: ['Message count per member', 'Activity timeline', 'Peak hours detection', 'Session statistics'],
  },
];

const telegramModeration = [
  {
    title: 'Anti-Flood Protection',
    commands: ['/antiflood [limit]', '/antiflood off'],
    description: 'Auto-mute users who send too many messages too fast. Configurable threshold. Stops flood and spam attacks in real-time.',
    capabilities: ['Configurable message limit per 10 seconds', 'Auto-mute on violation', 'Protects against raid attacks'],
  },
  {
    title: 'Anti-Link',
    commands: ['/antilink on', '/antilink off', '/antilink whitelist [domain]'],
    description: 'Automatically delete messages containing links. Whitelist specific domains you want to allow. Stops promotional spam instantly.',
    capabilities: ['Auto-delete messages with links', 'Domain whitelisting', 'Configurable actions'],
  },
  {
    title: 'CAPTCHA Verification',
    commands: ['/captcha on', '/captcha off'],
    description: 'New members must click a verification button before they can post. Blocks automated spam bots and raid accounts from ever sending a message in your group.',
    capabilities: ['Button-based verification', 'Auto-kick on timeout', 'Blocks bot accounts', 'Custom button text'],
  },
  {
    title: 'Anti-Raid',
    commands: ['/antiraid on', '/antiraid off'],
    description: 'Detect mass join attacks and automatically lock the group. When many accounts join within seconds, the bot blocks further joins and alerts admins.',
    capabilities: ['Mass join detection', 'Auto-lock group', 'Admin alerts'],
  },
  {
    title: 'Night Mode',
    commands: ['/nightmode on', '/nightmode off', '/nightmode [start] [end]'],
    description: 'Automatically restrict group during specified hours. Only admins can post during night mode. Useful for school and work groups.',
    capabilities: ['Configurable quiet hours', 'Admin-only posting during night', 'Auto-enable/disable by schedule'],
  },
  {
    title: 'Moderation Commands',
    commands: ['/ban', '/mute', '/kick', '/unban', '/unmute'],
    description: 'Standard moderation controls. Ban, mute, or kick users. All actions are logged and can be reversed by admins.',
    capabilities: ['Ban with reason', 'Timed mutes', 'Kick users', 'Reverse any action'],
  },
];

export default function ModerationFeaturesPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BotWave Community Shield',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web, WhatsApp, Telegram',
    description: 'Automated moderation and protection for WhatsApp and Telegram groups. Anti-delete recovery, flood detection, admin tools, and CAPTCHA verification.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
            <span className="text-[var(--text-primary)]">Moderation</span>
          </nav>

          <div className="mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-4">Moderation Cluster</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Community Shield - Protect Your Groups Automatically</h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Stop spending hours moderating manually. BotWave detects deleted messages, stops floods, verifies new members, and gives you full admin control from simple commands.
            </p>
          </div>

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white text-lg font-bold">W</div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">WhatsApp Moderation</h2>
            </div>
            <div className="space-y-6">
              {whatsappModeration.map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-secondary)] mb-4">{feature.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Commands:</h4>
                      <div className="space-y-1">
                        {feature.commands.map((cmd, j) => (
                          <code key={j} className="block text-sm px-2 py-1 rounded bg-green-500/5 text-green-700 dark:text-green-400 font-mono">{cmd}</code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">What it does:</h4>
                      <ul className="space-y-1">
                        {feature.capabilities.map((cap, j) => (
                          <li key={j} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">+</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg font-bold">T</div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Telegram Bot Moderation</h2>
            </div>
            <div className="space-y-6">
              {telegramModeration.map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-secondary)] mb-4">{feature.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Commands:</h4>
                      <div className="space-y-1">
                        {feature.commands.map((cmd, j) => (
                          <code key={j} className="block text-sm px-2 py-1 rounded bg-blue-500/5 text-blue-700 dark:text-blue-400 font-mono">{cmd}</code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">What it does:</h4>
                      <ul className="space-y-1">
                        {feature.capabilities.map((cap, j) => (
                          <li key={j} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">+</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/features/ai" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🧠</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors">AI Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">WaveAI chat, auto-replies, document analysis, translation</p>
            </Link>
            <Link href="/features/media" className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-orange-400/50 transition-colors group">
              <span className="text-2xl mb-2 block">🎨</span>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-orange-500 transition-colors">Media Cluster</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Sticker maker, video downloader, logo generator, OCR</p>
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
