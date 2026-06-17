import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fixPages } from '@/lib/fix/data';

const fixContent: Record<string, string> = {
  'whatsapp-bot-disconnected': `## Why WhatsApp Bots Disconnect

WhatsApp QR sessions are linked devices — like WhatsApp Web. They can disconnect for several reasons.

### Common Causes

**QR Session Expired**
WhatsApp periodically invalidates linked device sessions, especially if:
- Your phone has been offline for too long
- You haven't used the bot session for several days
- WhatsApp released an update that broke the session protocol

**Solution**: Go to BotWave dashboard → Disconnect → Scan QR again.

**Rate Limit (428)**
If the bot sent too many messages too fast, WhatsApp may temporarily disconnect the session.

**Solution**: Wait 10-15 minutes before reconnecting. The warmup period will restart.

**Network Issue**
If the BotWave server couldn't reach WhatsApp's servers, the session drops.

**Solution**: Usually auto-reconnects within 60 seconds. Check the session status in your dashboard.

**Multi-Device Conflict**
If you logged into WhatsApp Web on another browser at the same time, the old session may be invalidated.

**Solution**: Remove unused linked devices from your phone (WhatsApp Settings → Linked Devices).

### How to Reconnect

1. Go to BotWave dashboard
2. Find the disconnected session (shown in red)
3. Click "Reconnect" or "Rescan QR"
4. Scan the new QR code with your phone
5. Wait 5-10 seconds for connection`,

  'whatsapp-bot-banned': `## Why WhatsApp Bots Get Banned

WhatsApp bans accounts that violate their Terms of Service. Bots using the unofficial API are technically against ToS — but the risk depends on how the bot behaves.

### High Ban Risk Behaviors
- Sending 500+ messages per day from one account
- Sending identical messages to many people (spam pattern)
- Getting reported by multiple users
- Running from a VPS/cloud IP shared with other bot users

### How BotWave Prevents Bans

**Your Own IP, Your Own Device**
Your WhatsApp session runs from BotWave's isolated container but identifies as your device. You're not sharing an IP with hundreds of other bot users.

**Session Warmup**
New accounts start at 15 messages/day and increase over 7 days. This prevents "new bot spike" detection.

**Human-Like Behavior**
- Random delays (1-5 seconds) before each reply
- Typing indicators before responses
- Read receipts sent first
- 15% of group messages are "ignored" (read but not replied to)

### If Your Account Got Banned

1. **Temporary ban**: Wait 24-48 hours. Try logging in normally.
2. **Permanent ban**: You'll need a different WhatsApp number. BotWave supports multiple sessions.
3. **Submit an appeal**: Go to WhatsApp Settings → Help → Contact Us.

### Recovery Steps

1. Stop all bot activity immediately
2. Don't try to reconnect the banned number
3. Wait 48 hours minimum
4. If temporary, reconnect with lower message limits
5. Consider upgrading to get a fresh session with warmup`,

  'whatsapp-qr-not-scanning': `## Fix WhatsApp QR Not Scanning

### Quick Fixes

**Clean your camera lens**
Dust or smudges on the phone camera can prevent QR scanning.

**Increase screen brightness**
Make the QR code brighter on your monitor. The camera needs good contrast.

**Use Chrome or Firefox**
Some browsers render the QR canvas differently. Safari on Mac sometimes has issues.

**Refresh the QR code**
QR codes expire after 60 seconds. Click "Refresh" if it's greyed out.

### Phone-Side Fixes

**On Android:**
1. Open WhatsApp
2. Tap ⋮ (three dots) → Linked Devices
3. Tap "Link a Device"
4. Point camera at QR code — hold steady for 2-3 seconds

**On iPhone:**
1. Open WhatsApp
2. Tap Settings (bottom right)
3. Tap Linked Devices → Link a Device
4. Wait for camera to open
5. Scan the QR

### Use Pairing Code Instead

If QR scanning keeps failing, use the phone number pairing method:
1. In BotWave, click "Use Pairing Code instead"
2. Enter your WhatsApp phone number (with country code)
3. WhatsApp will show a 8-digit code in the app
4. Enter that code in BotWave

### Browser Compatibility Issues

If using a work computer with content filtering:
- Try a personal device or phone browser
- Use incognito/private mode
- Disable VPN while scanning`,
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
              <a href="https://chat.whatsapp.com/HFP3yJfQGDCLzm4YvysPPv" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-green-600/10 border border-green-600/20 text-green-600 text-sm font-medium hover:bg-green-600/20 transition-colors">
                WhatsApp Support
              </a>
              <a href="https://t.me/botwaveonline" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">
                Telegram Support
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
