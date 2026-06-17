import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fixPages } from '@/lib/fix/data';

const fixContent: Record<string, string> = {
  'whatsapp-bot-disconnected': `## Why Telegram Bots Disconnect

Telegram Bot sessions are long-lived API connections. They can occasionally drop for a few reasons.

### Common Causes

**Token Revoked**
If you regenerated your bot token in @BotFather without updating BotWave, the session will fail.

**Solution**: Go to @BotFather → /mybots → Select your bot → API Token → Revoke. Then paste the new token in BotWave dashboard.

**Rate Limit (429)**
If the bot sent too many messages too fast, Telegram's API will temporarily block the session.

**Solution**: Wait 10-15 minutes before reconnecting. BotWave rate limits are set well below Telegram's limits by default.

**Network Issue**
If the BotWave server lost its connection to Telegram's API servers, the session drops.

**Solution**: Usually auto-reconnects within 60 seconds. Check the session status in your dashboard.

**Bot Removed from Group**
If the bot was removed from a group it was polling, it may show as disconnected.

**Solution**: Re-add the bot to the group and give it admin permissions.

### How to Reconnect

1. Go to BotWave dashboard
2. Find the disconnected session (shown in red)
3. Click "Reconnect"
4. Verify your bot token is still valid in @BotFather
5. Wait 5-10 seconds for connection`,

  'whatsapp-bot-banned': `## Telegram Bot Restrictions

Unlike unofficial messaging APIs, Telegram Bots use the official Bot API — so there is zero platform ban risk for bots. However, Telegram Userbots (personal account automation) can sometimes get restricted.

### Telegram Bot (zero ban risk)
Telegram bots are officially supported and encouraged by Telegram. Your bot cannot be "banned" by Telegram for normal automation use. The only way a bot gets disabled is if:
- You delete it yourself in @BotFather
- Telegram removes it for ToS violations (spam, scams, illegal content)
- Your token expires (it doesn't — tokens are permanent unless revoked)

### Telegram Userbot Restrictions
Userbots use your real Telegram account via MTProto. Telegram can restrict accounts for:
- Sending spam to users who haven't messaged you first
- Rapid joining/leaving many groups
- Getting reported by many users

### If Your Userbot Account Got Restricted

1. **SpamBot check**: Message @SpamBot on Telegram — it will tell you if you're restricted
2. **Request unban**: @SpamBot also has an "I didn't send spam" button for appeals
3. **Wait**: Most restrictions lift automatically in 24-48 hours
4. **Reduce activity**: Lower your message rate in BotWave settings

### Best Practices

- Only message users who have messaged you first
- Don't mass-join groups you didn't create
- Keep your message rate under 50 per hour for Userbots`,

  'whatsapp-qr-not-scanning': `## Fix Telegram Bot Token Not Working

### Quick Diagnosis

**Get a fresh token**
Open Telegram → @BotFather → /mybots → select your bot → API Token.
Copy the full token (it starts with a number, e.g. \`123456789:ABCdef...\`).

**Check for copy errors**
Make sure there are no extra spaces, line breaks, or missing characters. The token must be copied exactly.

**Verify the bot exists**
In @BotFather, type /mybots to list your bots. If your bot is missing, you may need to create a new one with /newbot.

### Common Token Errors

**"Unauthorized" error**
Your token is invalid or was revoked. Solution: Generate a new token in @BotFather → Revoke current token.

**"Bot was kicked" error**
The bot was removed from the group. Re-add it and grant admin permissions.

**"Forbidden: bot is not a member" error**
Add the bot to your group first, then try the command.

### Creating a New Bot Token

1. Open Telegram and search @BotFather
2. Send /newbot
3. Choose a display name (e.g. "My Group Bot")
4. Choose a username ending in "bot" (e.g. "mygroupbot")
5. Copy the token @BotFather provides
6. Paste it into BotWave dashboard → Connect Telegram Bot

### Bot Not Responding in Group

If the token connects but the bot doesn't respond to commands:
- Make sure the bot is added to the group as an admin
- Check if commands are enabled: @BotFather → /mybots → Edit Bot → Edit Commands
- Confirm the command prefix matches (default is /)`,
};

export default function FixDetailPage() {
  const params = useParams<{ slug: string }>();
  const page = fixPages.find(p => p.slug === params.slug);

  if (!page) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Guide not found</h1>
          <Link href="/fix" className="text-blue-500 hover:underline">← All troubleshooting guides</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const content = fixContent[page.slug];

  function renderContent(c: string) {
    return c.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-[var(--text-primary)] mt-10 mb-4">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-[var(--text-primary)] mt-4 mb-1">{line.slice(2, -2)}</p>;
      if (line.startsWith('- ')) return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-red-500 mt-1 shrink-0">·</span>
          <span className="text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>') }} />
        </div>
      );
      if (line.match(/^\d+\. /)) return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-blue-500 shrink-0 font-mono text-xs mt-1">{line.match(/^(\d+)\./)?.[1]}.</span>
          <span className="text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /, '').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>') }} />
        </div>
      );
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>') }} />;
    });
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/fix" className="hover:text-[var(--primary)]">Fix</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{page.title}</span>
          </nav>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Troubleshooting</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">{page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{page.description}</p>

          {content ? (
            <div className="mb-12">{renderContent(content)}</div>
          ) : (
            <div className="mb-12 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <p className="text-[var(--text-secondary)]">{page.description}</p>
            </div>
          )}

          <div className="p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl mb-8">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Still stuck?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Get live help from the BotWave support community.</p>
            <div className="flex flex-wrap gap-3">
              <a href="https://t.me/botwavegrp" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">
                Telegram Support Group
              </a>
              <a href="https://t.me/botwaveonline" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-600 text-sm font-medium hover:bg-blue-600/20 transition-colors">
                Telegram Channel
              </a>
            </div>
          </div>

          <Link href="/fix" className="text-sm text-blue-500 hover:underline">← All troubleshooting guides</Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
