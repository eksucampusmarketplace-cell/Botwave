
import { Link } from 'wouter';
import LastReviewed from '@/components/seo/LastReviewed';

const footerLinks = {
  Platform: [
    { href: '/commands', label: 'Bot Commands' },
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
    { href: '/guest-posts', label: 'Guest Posts' },
    { href: '/fix', label: 'Troubleshooting' },
  ],
  'Telegram Bot': [
    { href: '/telegram-bot', label: 'Telegram Bot' },
    { href: '/telegram-bot-for-groups', label: 'Bot for Groups' },
    { href: '/telegram-auto-reply', label: 'Auto Reply Bot' },
    { href: '/telegram-group-analytics', label: 'Group Analytics' },
    { href: '/deploy-telegram-bot', label: 'Deploy Telegram Bot' },
    { href: '/blog/telegram-bot-for-groups-nigeria', label: 'Telegram Bot for Groups' },
    { href: '/blog/telegram-anti-spam-bot', label: 'Anti-Spam Bot' },
    { href: '/blog/free-telegram-group-management-bot', label: 'Group Management Bot' },
  ],
  Regions: [
    { href: '/telegram-bot-nigeria', label: 'Telegram Bot Nigeria' },
    { href: '/blog/telegram-bot-for-groups-nigeria', label: 'Bot Guide: Nigeria' },
    { href: '/blog/best-free-bot-platforms-2026', label: 'Best Bot Platforms 2026' },
    { href: '/blog/telegram-bot-commands-list-2026', label: 'Commands List 2026' },
    { href: '/blog/how-to-automate-telegram-messages-free', label: 'Automate Telegram Free' },
    { href: '/blog/telegram-ai-chatbot-free', label: 'Free AI Chatbot' },
    { href: '/blog/telegram-anti-spam-bot', label: 'Anti-Spam Bot' },
    { href: '/blog/free-telegram-group-management-bot', label: 'Group Bot Guide' },
  ],
  Community: [
    { href: 'https://t.me/botwavegrp', label: 'Telegram Support Group' },
    { href: 'https://t.me/BotWaveUpdates', label: 'Telegram Updates Channel' },
    { href: '/community', label: 'Community Hub' },
    { href: '/community-commands', label: 'Community Commands' },
  ],
  Company: [
    { href: '/what-is-botwave', label: 'What is BotWave?' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/security', label: 'Security' },
    { href: '/integrations', label: 'Integrations' },
    { href: '/signup', label: 'Get Started Free' },
    { href: '/login', label: 'Login' },
    { href: '/status', label: 'System Status' },
    { href: '/search-engines', label: 'Search Engines' },
    { href: '/docs/search-engine-optimization-guide-2026', label: '2026 SEO Guide' },
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
              Free Telegram bot platform with 150+ commands. AI chat, stickers, games, anti-spam, media downloads. No coding required. Works in Nigeria &amp; worldwide.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['Node.js', 'grammy', 'grammY', 'Postgres', 'AI'].map((tech) => (
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
          <div className="flex flex-col gap-1 items-center sm:items-start">
            <p className="text-xs text-[var(--text-muted)]">
              &copy; {new Date().getFullYear()} BotWave &middot; Built by BotWave Team &middot; Free Telegram Bot Platform
            </p>
            <LastReviewed />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
            <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-[var(--primary)] transition-colors">Security</Link>
            <Link href="/faq" className="hover:text-[var(--primary)] transition-colors">FAQ</Link>
            <Link href="/status" className="hover:text-[var(--primary)] transition-colors">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
