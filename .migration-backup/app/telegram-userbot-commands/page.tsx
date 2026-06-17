import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Telegram Userbot Commands List (2026)',
  description: 'Complete list of 100+ Telegram userbot commands. Admin (.ban, .mute, .kick), moderation (.purge, .gban), stickers (.kang), AI (.ai), translate (.tr), notes, filters, PM permit, and more. Free with BotWave.',
  keywords: ['telegram userbot commands', 'telegram userbot commands list', 'telegram userbot', 'userbot commands 2026', 'telegram userbot automation', 'gramjs userbot', 'telegram admin commands', 'telegram purge command', 'telegram gban'],
  openGraph: {
    title: 'Telegram Userbot Commands List (2026) - 100+ Commands',
    description: 'Complete list of 100+ Telegram userbot commands: admin, moderation, stickers, AI, translate, and more.',
    url: 'https://www.botwave.online/telegram-userbot-commands',
    type: 'website',
    images: [{ url: '/api/og?title=Telegram+Userbot+Commands+List+(2026)', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/telegram-userbot-commands' },
};

const commandSections = [
  {
    title: 'Admin Commands',
    emoji: '👮',
    desc: 'Full group administration from your account. No need to add a separate bot.',
    commands: [
      { cmd: '.ban <user>', desc: 'Ban a user from the group (reply or mention)' },
      { cmd: '.unban <user>', desc: 'Unban a previously banned user' },
      { cmd: '.kick <user>', desc: 'Kick user without banning (they can rejoin)' },
      { cmd: '.mute <user>', desc: 'Mute a user (they can\'t send messages)' },
      { cmd: '.unmute <user>', desc: 'Unmute a previously muted user' },
      { cmd: '.promote <user>', desc: 'Promote a user to admin' },
      { cmd: '.demote <user>', desc: 'Demote an admin back to regular user' },
      { cmd: '.pin', desc: 'Pin the replied message in the group' },
      { cmd: '.unpin', desc: 'Unpin the currently pinned message' },
    ],
  },
  {
    title: 'Purge Commands',
    emoji: '🧹',
    desc: 'Mass message deletion - essential for group cleanup.',
    commands: [
      { cmd: '.purge', desc: 'Delete all messages from replied message to current' },
      { cmd: '.purgeme <n>', desc: 'Delete your last N messages' },
      { cmd: '.del', desc: 'Delete the replied message' },
    ],
  },
  {
    title: 'Global Ban (GBan)',
    emoji: '🌍',
    desc: 'Ban a user across ALL groups where you are admin - one command.',
    commands: [
      { cmd: '.gban <user>', desc: 'Globally ban a user across all your groups' },
      { cmd: '.ungban <user>', desc: 'Remove global ban' },
      { cmd: '.gbanlist', desc: 'View all globally banned users' },
    ],
  },
  {
    title: 'PM Permit',
    emoji: '🔒',
    desc: 'Control who can PM you. Auto-warn and block unapproved contacts.',
    commands: [
      { cmd: '.approve <user>', desc: 'Allow a user to PM you' },
      { cmd: '.disapprove <user>', desc: 'Revoke PM permission' },
      { cmd: '.block <user>', desc: 'Block a user on Telegram' },
      { cmd: '.unblock <user>', desc: 'Unblock a user' },
      { cmd: '.pmguard on/off', desc: 'Enable/disable PM guard system' },
    ],
  },
  {
    title: 'AFK (Away From Keyboard)',
    emoji: '💤',
    desc: 'Auto-reply when someone mentions you while away.',
    commands: [
      { cmd: '.afk [reason]', desc: 'Set AFK status with optional reason' },
      { cmd: '.unafk', desc: 'Turn off AFK mode' },
    ],
  },
  {
    title: 'Notes & Filters',
    emoji: '📝',
    desc: 'Save and auto-send text snippets. Create keyword auto-replies.',
    commands: [
      { cmd: '.save <name> <text>', desc: 'Save a note' },
      { cmd: '.get <name>', desc: 'Retrieve a saved note' },
      { cmd: '.notes', desc: 'List all saved notes' },
      { cmd: '.clear <name>', desc: 'Delete a note' },
      { cmd: '.filter <trigger> <reply>', desc: 'Create auto-reply filter' },
      { cmd: '.stop <trigger>', desc: 'Remove a filter' },
      { cmd: '.filters', desc: 'List all active filters' },
    ],
  },
  {
    title: 'Sticker Commands',
    emoji: '🎨',
    desc: 'Create and manage Telegram sticker packs.',
    commands: [
      { cmd: '.kang', desc: 'Add replied sticker/image to your pack' },
      { cmd: '.stickerid', desc: 'Get the file ID of a sticker' },
      { cmd: '.getsticker', desc: 'Get sticker as PNG image' },
      { cmd: '.stickers <query>', desc: 'Search Telegram sticker packs' },
    ],
  },
  {
    title: 'Search & Info',
    emoji: '🔍',
    desc: 'Web search, calculations, and information lookup.',
    commands: [
      { cmd: '.google <query>', desc: 'Search Google from Telegram' },
      { cmd: '.wiki <topic>', desc: 'Search Wikipedia' },
      { cmd: '.calc <expression>', desc: 'Calculator' },
      { cmd: '.currency <amount> <from> <to>', desc: 'Currency converter' },
      { cmd: '.time <city>', desc: 'Get current time for any city' },
    ],
  },
  {
    title: 'Translate',
    emoji: '🌐',
    desc: 'Translate messages in 25+ languages.',
    commands: [
      { cmd: '.tr <lang>', desc: 'Translate replied message to target language' },
      { cmd: '.translate <lang> <text>', desc: 'Translate text directly' },
      { cmd: '.langs', desc: 'List all supported language codes' },
    ],
  },
  {
    title: 'Text Tools',
    emoji: '✍️',
    desc: 'Fun text transformations and formatting.',
    commands: [
      { cmd: '.reverse <text>', desc: 'Reverse text' },
      { cmd: '.mock <text>', desc: 'SpOnGeBoB mOcK tExT' },
      { cmd: '.vapor <text>', desc: 'Ｖａｐｏｒｗａｖｅ text' },
      { cmd: '.tiny <text>', desc: 'ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ text' },
      { cmd: '.flip <text>', desc: '˙ʇxǝʇ pǝddᴉlɟ' },
      { cmd: '.upper / .lower', desc: 'UPPERCASE / lowercase' },
      { cmd: '.spoiler <text>', desc: 'Wrap in Telegram spoiler tags' },
      { cmd: '.mono / .strike', desc: 'Monospace / Strikethrough formatting' },
    ],
  },
  {
    title: 'Fun & Games',
    emoji: '🎲',
    desc: 'Interactive games and random generators.',
    commands: [
      { cmd: '.dice', desc: 'Roll a Telegram animated dice' },
      { cmd: '.dart', desc: 'Throw a dart' },
      { cmd: '.slot', desc: 'Spin the slot machine' },
      { cmd: '.basketball', desc: 'Shoot a basketball' },
      { cmd: '.football / .bowling', desc: 'Animated sports games' },
      { cmd: '.coinflip', desc: 'Flip a coin' },
      { cmd: '.rng <min> <max>', desc: 'Random number generator' },
      { cmd: '.8ball <question>', desc: 'Magic 8-ball answer' },
      { cmd: '.rate <thing>', desc: 'Rate anything 0-10' },
      { cmd: '.decide <a> or <b>', desc: 'Make a random decision' },
    ],
  },
  {
    title: 'Chat Tools',
    emoji: '💬',
    desc: 'Group information and management utilities.',
    commands: [
      { cmd: '.chatinfo', desc: 'Get detailed group/chat information' },
      { cmd: '.admins', desc: 'List all group admins' },
      { cmd: '.invite', desc: 'Get group invite link' },
      { cmd: '.leave', desc: 'Leave the current group' },
      { cmd: '.groupname <name>', desc: 'Change group name' },
      { cmd: '.groupbio <bio>', desc: 'Change group description' },
      { cmd: '.zombies', desc: 'Count deleted accounts in group' },
    ],
  },
  {
    title: 'Media',
    emoji: '📸',
    desc: 'Download and forward media files.',
    commands: [
      { cmd: '.download', desc: 'Download replied media to your device' },
      { cmd: '.forward', desc: 'Forward replied message to saved messages' },
      { cmd: '.copy', desc: 'Copy message without forward tag' },
      { cmd: '.mediainfo', desc: 'Get details about replied media file' },
    ],
  },
  {
    title: 'Welcome & Goodbye',
    emoji: '👋',
    desc: 'Automatic greetings for new and departing members.',
    commands: [
      { cmd: '.setwelcome <text>', desc: 'Set custom welcome message' },
      { cmd: '.setgoodbye <text>', desc: 'Set custom goodbye message' },
      { cmd: '.welcome on/off', desc: 'Toggle welcome messages' },
      { cmd: '.goodbye on/off', desc: 'Toggle goodbye messages' },
    ],
  },
  {
    title: 'Antiflood',
    emoji: '🛡️',
    desc: 'Automatic flood protection - mute/ban spammers.',
    commands: [
      { cmd: '.antiflood <n>', desc: 'Set flood limit (n messages before action)' },
      { cmd: '.antiflood off', desc: 'Disable antiflood protection' },
    ],
  },
  {
    title: 'Reminders',
    emoji: '⏰',
    desc: 'Schedule reminders that fire later.',
    commands: [
      { cmd: '.remind <time> <text>', desc: 'Set a reminder (e.g. .remind 1h meeting)' },
      { cmd: '.reminders', desc: 'List all pending reminders' },
      { cmd: '.cancelremind <id>', desc: 'Cancel a specific reminder' },
      { cmd: '.clearreminders', desc: 'Cancel all reminders' },
    ],
  },
  {
    title: 'Settings',
    emoji: '⚙️',
    desc: 'Configure your userbot behavior.',
    commands: [
      { cmd: '.setprefix <char>', desc: 'Change command prefix (default: .)' },
      { cmd: '.setalive <text>', desc: 'Customize .alive response' },
      { cmd: '.setlog here/off/<id>', desc: 'Set logging chat' },
      { cmd: '.addsudo <user>', desc: 'Grant sudo access (they can use your bot)' },
      { cmd: '.rmsudo <user>', desc: 'Remove sudo access' },
      { cmd: '.lang set <code>', desc: 'Change bot language (25+ supported)' },
      { cmd: '.lang list', desc: 'Show all available languages' },
    ],
  },
  {
    title: 'System',
    emoji: '📊',
    desc: 'Status and diagnostics.',
    commands: [
      { cmd: '.alive', desc: 'Check if userbot is running' },
      { cmd: '.ping', desc: 'Measure response latency' },
      { cmd: '.info <user>', desc: 'Get detailed user info' },
      { cmd: '.id', desc: 'Get chat/user IDs' },
      { cmd: '.stats', desc: 'Show userbot statistics' },
      { cmd: '.help', desc: 'Show all available modules and commands' },
    ],
  },
];

export default function TelegramUserbotCommands() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4 leading-tight">
            Telegram Userbot Commands List
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-4">
            100+ commands for the BotWave Telegram Userbot. Admin, moderation, stickers, AI, translate, notes, filters, PM permit, games, and more.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Last updated: May 2026 - Default prefix: <code className="px-1.5 py-0.5 bg-[var(--surface)] rounded text-blue-500 font-mono">.</code> (changeable with .setprefix)
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {commandSections.map(({ title, emoji, desc, commands }) => (
            <div key={title} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[var(--border)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {emoji} {title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{desc}</p>
              </div>
              <div className="divide-y divide-[var(--border)]/50">
                {commands.map(({ cmd, desc: cmdDesc }) => (
                  <div key={cmd} className="flex items-start gap-4 px-5 py-3">
                    <code className="shrink-0 text-sm font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{cmd}</code>
                    <span className="text-sm text-[var(--text-secondary)]">{cmdDesc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="text-center mt-12 space-y-4">
            <p className="text-[var(--text-muted)] text-sm">
              All commands work with BotWave&apos;s free Telegram Userbot. Set up in 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg text-lg">
                Get Started Free →
              </Link>
              <Link href="/telegram-bot-nigeria" className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl text-lg">
                Telegram Bot Nigeria
              </Link>
            </div>
          </div>
        </div>
      </section>

        <Footer />
    </main>
  );
}
