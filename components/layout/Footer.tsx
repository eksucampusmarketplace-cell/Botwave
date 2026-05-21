'use client';

import Link from 'next/link';

const footerLinks = {
  Platform: [
    { href: '/commands', label: 'Bot Commands' },
    { href: '/commands/whatsapp', label: 'WhatsApp Commands' },
    { href: '/commands/telegram', label: 'Telegram Commands' },
    { href: '/features/ai', label: 'AI Chat Features' },
    { href: '/features/media', label: 'Media Tools' },
    { href: '/features/moderation', label: 'Moderation' },
    { href: '/compare', label: 'Compare Bots' },
    { href: '/faq', label: 'FAQ' },
  ],
  Resources: [
    { href: '/docs', label: 'Documentation' },
    { href: '/how-to', label: 'Guides & Tutorials' },
    { href: '/blog', label: 'Blog' },
    { href: '/academy', label: 'BotWave Academy' },
    { href: '/changelog', label: 'Changelog' },
    { href: '/use-cases', label: 'Use Cases' },
    { href: '/case-studies', label: 'Case Studies' },
    { href: '/fix', label: 'Troubleshooting' },
  ],
  'WhatsApp Bot': [
    { href: '/blog/how-to-create-free-whatsapp-bot-2026', label: 'Create a WhatsApp Bot (2026)' },
    { href: '/blog/best-free-whatsapp-bot-groups-nigeria', label: 'Best Free Bot for Groups' },
    { href: '/blog/whatsapp-bot-for-business-nigeria', label: 'WhatsApp Bot for Business' },
    { href: '/blog/whatsapp-ai-chatbot-free', label: 'Free AI Chatbot' },
    { href: '/blog/whatsapp-anti-spam-bot-for-groups', label: 'Anti-Spam Bot' },
    { href: '/blog/free-whatsapp-sticker-bot-how-to-make-stickers', label: 'Sticker Maker Bot' },
    { href: '/blog/whatsapp-bot-commands-list-2026', label: 'Commands List 2026' },
    { href: '/blog/how-to-automate-whatsapp-messages-free', label: 'Automate Messages Free' },
  ],
  'Telegram Bot': [
    { href: '/blog/telegram-bot-for-groups-nigeria', label: 'Telegram Bot for Groups' },
    { href: '/blog/telegram-anti-spam-bot', label: 'Telegram Anti-Spam Bot' },
    { href: '/blog/telegram-userbot-automation', label: 'Userbot Automation Guide' },
    { href: '/blog/telegram-bot-vs-whatsapp-bot', label: 'Telegram vs WhatsApp Bot' },
    { href: '/blog/free-telegram-group-management-bot', label: 'Group Management Bot' },
    { href: '/telegram-bot-nigeria', label: 'Telegram Bot Nigeria' },
    { href: '/telegram-userbot-commands', label: 'Userbot Commands' },
    { href: '/deploy-telegram-bot', label: 'Deploy Telegram Bot' },
  ],
  Regions: [
    { href: '/whatsapp-bot-nigeria', label: 'WhatsApp Bot Nigeria' },
    { href: '/whatsapp-bot-south-africa', label: 'WhatsApp Bot South Africa' },
    { href: '/whatsapp-bot-india', label: 'WhatsApp Bot India' },
    { href: '/whatsapp-bot-usa', label: 'WhatsApp Bot USA' },
    { href: '/blog/whatsapp-bot-south-africa', label: 'Bot Guide: South Africa' },
    { href: '/blog/whatsapp-bot-vs-telegram-bot-africa', label: 'WhatsApp vs Telegram (Africa)' },
    { href: '/blog/whatsapp-bot-for-schools-campus-groups', label: 'Bot for Schools & Campus' },
    { href: '/blog/best-free-bot-platforms-2026', label: 'Best Bot Platforms 2026' },
  ],
  Community: [
    { href: 'https://chat.whatsapp.com/GMyXXv1hhnbI7JcCF5sNEf', label: 'WhatsApp Support Group' },
    { href: 'https://t.me/botwavegrp', label: 'Telegram Support Group' },
    { href: 'https://t.me/BotWaveUpdates', label: 'Telegram Updates Channel' },
  ],
  Company: [
    { href: '/what-is-botwave', label: 'What is BotWave?' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/security', label: 'Security' },
    { href: '/integrations', label: 'Integrations' },
    { href: '/signup', label: 'Get Started Free' },
    { href: '/login', label: 'Login' },
    { href: '/status', label: 'System Status' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[var(--bg)] border-t border-[var(--border)] pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Brand section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div className="max-w-sm">
            <Link href="/" className="inline-block mb-3">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Wave</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Free WhatsApp &amp; Telegram bot platform with 150+ commands. AI chat, stickers, games, anti-spam, media downloads. No coding required. Works in Nigeria &amp; worldwide.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['Node.js', 'Baileys', 'grammy', 'Supabase', 'AI'].map((tech) => (
                <span key={tech} className="px-2 py-1 bg-[var(--bg-alt)] border border-[var(--border)] rounded-md text-[10px] text-[var(--text-muted)] font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/10"
            >
              Get Started Free
            </Link>
            <Link
              href="/commands"
              className="px-6 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] text-sm font-medium rounded-xl transition-colors"
            >
              View Commands
            </Link>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5 list-none">
                {links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors leading-snug block"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors leading-snug block"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} BotWave &middot; Built by BotWave Team &middot; Free WhatsApp &amp; Telegram Bot Platform
          </p>
          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
            <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link>
            <Link href="/security" className="hover:text-[var(--primary)] transition-colors">Security</Link>
            <Link href="/faq" className="hover:text-[var(--primary)] transition-colors">FAQ</Link>
            <Link href="/status" className="hover:text-[var(--primary)] transition-colors">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
