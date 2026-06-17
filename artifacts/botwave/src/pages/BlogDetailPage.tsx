import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const posts = [
  { slug: 'telegram-bot-vs-whatsapp-bot', title: 'Telegram Bot vs WhatsApp Bot (2026)', excerpt: 'Ban risk, features, setup, group limits, API access, pricing - every difference compared. BotWave supports both platforms from one dashboard.', date: '2026-05-18', readTime: '8 min read', tags: ['Telegram', 'WhatsApp', 'Comparison'], content: `WhatsApp and Telegram are the two biggest messaging platforms for bot automation in 2026. Both are huge in Nigeria, South Africa, and across Africa. But they work very differently for bots.\n\n## Platform Overview\n\n**WhatsApp** has 2 billion+ users and is the dominant platform in Africa. However, WhatsApp doesn't have an official public API for automation — bots use the WhatsApp Web protocol via QR scan.\n\n**Telegram** is the second largest with 800M+ users. Telegram has an official Bot API (free, public) and also supports userbots via MTProto.\n\n## Key Differences\n\n### Ban Risk\n- **WhatsApp**: Moderate ban risk. Unofficial API means ToS violation risk. BotWave reduces this with anti-ban features.\n- **Telegram**: Zero ban risk for Bot API. Telegram bots are officially supported and encouraged.\n\n### Features\n- **WhatsApp**: Richer media support, QR-based connection, better for personal numbers\n- **Telegram**: Better API, inline bots, channels, supergroups, webhooks\n\n### Setup\n- **WhatsApp**: Scan QR code in BotWave dashboard. Takes 60 seconds.\n- **Telegram Bot**: Get token from @BotFather, paste in dashboard. Takes 2 minutes.\n- **Telegram Userbot**: Need API credentials from my.telegram.org. Takes 5 minutes.\n\n## Which Should You Use?\n\nUse **WhatsApp** if your community is already there (most African communities).\n\nUse **Telegram Bot** if you want an official API with no ban risk and better developer features.\n\nUse **Telegram Userbot** if you need to automate your personal Telegram account.\n\nWith BotWave, you can run all three from one dashboard — no need to choose.` },
  { slug: 'telegram-anti-spam-bot', title: 'Free Telegram Anti-Spam Bot (2026)', excerpt: 'Set up a free Telegram anti-spam bot in 2 minutes. Block spam, scam links, flood messages, and raid attacks.', date: '2026-05-18', readTime: '5 min read', tags: ['Telegram', 'Anti-Spam', 'Security'], content: `Telegram groups get hit by spam bots, scam links, and raid attacks constantly. BotWave has built-in anti-spam protection that works automatically once you connect.\n\n## What BotWave Blocks\n\n- **Spam messages**: Repeated messages from the same user detected and warned\n- **Scam links**: Auto-detect and delete suspicious URLs\n- **Flood attacks**: Rate-limiting when users send too many messages too fast\n- **Raid attacks**: Mass join detection with CAPTCHA verification\n- **Off-topic content**: Keyword-based filtering\n\n## Setup in 2 Minutes\n\n1. Go to BotWave dashboard → Connect Telegram Bot\n2. Get token from @BotFather in Telegram\n3. Add the bot to your group\n4. Make the bot an admin\n5. Anti-spam is active immediately\n\n## Anti-Spam Commands\n\nOnce active, admins can use:\n- \`/antispam on|off\` — toggle protection\n- \`/antiflood [limit]\` — set message rate limit\n- \`/warn @user\` — manually warn a user\n- \`/kick @user\` — remove from group\n- \`/ban @user\` — ban from group\n\nThe bot handles everything automatically. You only need to intervene for edge cases.` },
  { slug: 'whatsapp-ai-chatbot-free', title: 'Free WhatsApp AI Chatbot (2026)', excerpt: 'Get a free AI chatbot on WhatsApp powered by Google Gemini. Ask questions, get homework help, translate languages, write messages.', date: '2026-05-13', readTime: '6 min read', tags: ['AI', 'ChatGPT', 'Free'], content: `AI inside WhatsApp is real in 2026. BotWave brings Google Gemini AI directly into your WhatsApp chats and groups — for free.\n\n## What the AI Can Do\n\n- Answer questions on any topic\n- Write messages, emails, and captions\n- Translate text between 50+ languages\n- Summarize long documents (send a PDF)\n- Help with homework and study\n- Generate ideas and brainstorm\n- Explain complex topics simply\n\n## How to Use It\n\nOnce your WhatsApp is connected to BotWave, just use the !ai command:\n\n\`\`\`\n!ai explain quantum computing simply\n!ai write a welcome message for my business group\n!ai translate this to Yoruba: good morning everyone\n\`\`\`\n\nYou can also reply to any message with \`!ai\` to ask the AI about it.\n\n## Is It Really Free?\n\nYes. BotWave's free tier includes 10 AI queries per day, powered by Groq's llama-3.3-70b (fast and smart). No credit card required.\n\nPaid tiers get higher AI limits and access to more powerful models.` },
];

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const post = posts.find(p => p.slug === params.slug);

  if (!post) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Article not found</h1>
          <p className="text-[var(--text-secondary)] mb-6">This article may have moved or been updated.</p>
          <Link href="/blog" className="text-blue-500 hover:underline">← Browse all articles</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const related = posts.filter(p => p.slug !== post.slug && p.tags.some(t => post.tags.includes(t))).slice(0, 3);

  function renderContent(content: string) {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold text-[var(--text-primary)] mt-10 mb-4">{line.slice(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">{line.slice(4)}</h3>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-[var(--text-primary)] mt-4 mb-1">{line.slice(2, -2)}</p>;
      } else if (line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 ml-2">
            <span className="text-blue-500 mt-1 shrink-0">·</span>
            <span className="text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>') }} />
          </div>
        );
      } else if (line.startsWith('```')) {
        return null;
      } else if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      } else {
        return <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>') }} />;
      }
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
            <Link href="/blog" className="hover:text-[var(--primary)]">Blog</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{post.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">{post.title}</h1>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-10">
            <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>

          <div className="mb-12">
            {renderContent(post.content)}
          </div>

          <div className="p-6 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl text-center mb-12">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Ready to try BotWave?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Free forever. No coding. No credit card.</p>
            <Link href="/signup" className="inline-flex px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Get Started Free →
            </Link>
          </div>

          {related.length > 0 && (
            <div>
              <h3 className="font-bold text-[var(--text-primary)] mb-4">Related Articles</h3>
              <div className="space-y-3">
                {related.map(r => (
                  <Link key={r.slug} href={`/blog/${r.slug}`} className="group block p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors">
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 text-sm transition-colors">{r.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{r.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <Link href="/blog" className="text-sm text-blue-500 hover:underline">← All articles</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
