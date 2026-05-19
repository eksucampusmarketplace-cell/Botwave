'use client';

import Link from 'next/link';

const dashboardLinks = {
  'Bot Management': [
    { href: '/dashboard', label: 'Control Panel' },
    { href: '/dashboard/sessions', label: 'Sessions' },
    { href: '/dashboard/messages', label: 'Messages' },
    { href: '/dashboard/flows', label: 'Flow Builder' },
    { href: '/dashboard/auto-replies', label: 'Auto Replies' },
    { href: '/dashboard/custom-commands', label: 'Custom Commands' },
    { href: '/dashboard/scheduled', label: 'Scheduled Messages' },
    { href: '/dashboard/autopilot', label: 'Autopilot' },
  ],
  Analytics: [
    { href: '/dashboard/analytics', label: 'Bot Analytics' },
    { href: '/dashboard/group-analytics', label: 'Group Analytics' },
    { href: '/dashboard/rate-limits', label: 'Rate Limits' },
    { href: '/dashboard/health', label: 'Session Health' },
  ],
  Account: [
    { href: '/dashboard/settings', label: 'Settings' },
    { href: '/dashboard/pricing', label: 'Upgrade Plan' },
    { href: '/dashboard/shop', label: 'Shop' },
    { href: '/dashboard/referrals', label: 'Referrals' },
    { href: '/dashboard/rewards', label: 'Rewards' },
    { href: '/dashboard/mailbox', label: 'Mailbox' },
  ],
  Learn: [
    { href: '/docs', label: 'Documentation' },
    { href: '/how-to', label: 'Guides' },
    { href: '/commands', label: 'All Commands' },
    { href: '/blog', label: 'Blog' },
    { href: '/academy', label: 'Academy' },
    { href: '/faq', label: 'FAQ' },
    { href: '/fix', label: 'Troubleshooting' },
    { href: '/blog/how-to-create-free-whatsapp-bot-2026', label: 'Setup Guide' },
  ],
};

export default function DashboardFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-[var(--bg)] pt-10 pb-6 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {Object.entries(dashboardLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
                {category}
              </h4>
              <ul className="space-y-2 list-none">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[10px] text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} BotWave &middot; WhatsApp &amp; Telegram Bot Platform
          </p>
          <div className="flex gap-3 text-[10px] text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link>
            <Link href="/security" className="hover:text-[var(--primary)] transition-colors">Security</Link>
            <Link href="/status" className="hover:text-[var(--primary)] transition-colors">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
