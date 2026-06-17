import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const layers = [
  {
    name: 'SecureToken Layer',
    tagline: 'Your device, your IP',
    description: 'BotWave uses the official Telegram Bot API — fully sanctioned by Telegram. Your bot token is unique to your account and is never shared. Telegram bots are officially encouraged, meaning zero platform ban risk.',
    color: 'emerald',
    icon: '🏠',
  },
  {
    name: 'Anti-Ban Engine',
    tagline: '7-day warmup + human-like behavior',
    description: 'New sessions start with 15 messages per day and scale to 200 over 7 days. The bot adds random delays (1-5s per message), sends typing indicators, reads messages before replying, and occasionally ignores messages entirely. 50-100 response variations per command ensure no two messages are identical.',
    color: 'blue',
    icon: '🛡️',
  },
  {
    name: 'Community Shield',
    tagline: 'Anti-spam and flood protection',
    description: 'Detects spam floods (5+ messages in 10 seconds triggers a warning), rate limits per-session (10 msgs/min) and per-user (20 msgs/min), and uses an LRU buffer to never send the exact same message twice. Hard cap of 200 messages per day per session.',
    color: 'violet',
    icon: '⚡',
  },
  {
    name: 'Ghost Mode',
    tagline: 'Activity hours and stealth behavior',
    description: 'Configure the bot to only operate during certain hours. Outside those hours it stays completely silent. This mimics natural human messaging patterns and significantly reduces bot detection.',
    color: 'orange',
    icon: '👻',
  },
  {
    name: 'Session Isolation',
    tagline: 'No cross-account contamination',
    description: 'Each Telegram session runs in a fully isolated container. An issue on one session cannot affect another. Session credentials are encrypted at rest.',
    color: 'red',
    icon: '🔒',
  },
];

const doList = [
  'Scan your own phone — never a virtual number or SIM farm',
  'Start with the free tier warmup period before high-volume use',
  'Use the bot in groups where you are the legitimate admin',
  'Enable ghost mode if you need the bot to be quiet at night',
  'Keep your message rate under 100/day for the first month',
];

const dontList = [
  "Send the same message to thousands of contacts (that's spam)",
  'Use the bot to scrape contacts or phone numbers',
  'Automate DMs to people who have not messaged you first',
  'Use the bot in groups where you are not an admin',
  'Share your session credentials with anyone',
];

const colorMap: Record<string, string> = {
  emerald: 'border-emerald-500/20 bg-emerald-500/5',
  blue: 'border-blue-500/20 bg-blue-500/5',
  violet: 'border-violet-500/20 bg-violet-500/5',
  orange: 'border-orange-500/20 bg-orange-500/5',
  red: 'border-red-500/20 bg-red-500/5',
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Security</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Security & Anti-Ban</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            BotWave uses a multi-layer approach to protect your Telegram accounts and keep your bots running smoothly. Here's exactly how it works.
          </p>

          <div className="space-y-5 mb-16">
            {layers.map(layer => (
              <div key={layer.name} className={`p-6 rounded-2xl border ${colorMap[layer.color]}`}>
                <div className="flex items-start gap-4">
                  <span className="text-2xl shrink-0">{layer.icon}</span>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-[var(--text-primary)]">{layer.name}</h3>
                      <span className="text-xs text-[var(--text-muted)] italic">{layer.tagline}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{layer.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="font-bold text-emerald-500 mb-4">✓ Do this</h3>
              <ul className="space-y-2">
                {doList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
              <h3 className="font-bold text-red-500 mb-4">✗ Avoid this</h3>
              <ul className="space-y-2">
                {dontList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-red-500 mt-0.5 shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h3 className="font-bold text-[var(--text-primary)] mb-3">Responsible Disclosure</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Found a security vulnerability? Please email us at <a href="mailto:security@botwave.online" className="text-blue-500 hover:underline">security@botwave.online</a> before disclosing publicly. We respond to all security reports within 24 hours and will credit responsible disclosures.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
