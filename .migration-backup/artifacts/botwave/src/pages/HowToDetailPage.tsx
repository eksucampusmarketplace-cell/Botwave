import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { howToPages } from '@/lib/howto/data';

const howToContent: Record<string, string> = {
  'create-telegram-bot': `## Create a Telegram Bot in Under 2 Minutes

### What You Need
- A Telegram account on your phone
- A web browser

### Step 1: Sign Up for Free
Go to [botwave.online/signup](https://www.botwave.online/signup) and create your free account. No credit card needed.

### Step 2: Create a Bot via @BotFather
Open Telegram and search for @BotFather:
- Send /newbot to @BotFather
- Choose a name for your bot (e.g. "My Group Bot")
- Choose a username ending in "bot" (e.g. "mygroupbot")
- Copy the token @BotFather sends you

### Step 3: Connect to BotWave
After logging in, click "Connect Telegram Bot" in your dashboard and paste your bot token.

### Step 4: Add Bot to Your Group
In Telegram, open your group and add your new bot as a member. Make it an admin so it can manage messages.

### Step 5: Test Your Bot
Go to your Telegram group and type:

\`\`\`
/ping
\`\`\`

The bot should reply immediately. Type \`/help\` to see all available commands.

### What's Next?
- Browse the [Commands page](/commands) to see all 100+ Telegram commands
- Set up welcome messages with \`/welcome\`
- Enable anti-spam with \`/antispam on\``,

  'auto-reply-telegram': `## Set Up Telegram Auto-Reply

### Enable Auto-Reply
Once your Telegram Bot is connected, auto-reply works in multiple ways:

### Method 1: Keyword Auto-Reply
Set up custom responses to specific words or phrases:

\`\`\`
/autorespond [keyword] [reply message]
\`\`\`

Example:
\`\`\`
/autorespond price Our products start at ₦5,000. DM for catalog.
\`\`\`

Now whenever anyone says "price" in the group, the bot automatically replies.

### Method 2: AFK Auto-Response
Tell the bot you're away and it will reply to all messages:

\`\`\`
/afk [optional message]
\`\`\`

Example:
\`\`\`
/afk I'm in a meeting, will reply in 2 hours
\`\`\`

To turn it off: \`/afk off\`

### Method 3: AI Auto-Reply (Autopilot)
The AI command can be set to auto-reply to questions:

\`\`\`
/autopilot on
\`\`\`

The AI will read messages and automatically reply when it detects a question.

### Tips
- Use keyword auto-reply for common business questions (price, location, hours)
- Use AFK for when you're sleeping or in meetings
- Combine both for maximum coverage`,

  'telegram-ai-assistant': `## Use Telegram AI Assistant

The \`/ai\` command connects you to Google Gemini AI directly inside Telegram.

### Basic Usage

Just type \`/ai\` followed by your question:

\`\`\`
/ai what is the capital of Nigeria?
/ai explain photosynthesis simply
/ai write a professional email declining a job offer
/ai translate: good morning everyone → Yoruba
\`\`\`

### Asking About a Message
Reply to any message with \`/ai\` to ask the AI about it:

1. Long-press any message in Telegram
2. Tap Reply
3. Type \`/ai\` and send

The AI will read and respond to the original message.

### What the AI Can Do
- Answer factual questions
- Write and edit text
- Translate between 50+ languages
- Summarize documents
- Explain complex topics
- Give advice and recommendations
- Code help (basic)
- Math (basic)

### Daily Limits
- Free tier: 10 AI queries per day
- The counter resets at midnight

### Tips
- Be specific in your prompts for better answers
- Send a document (PDF, Word) and ask /ai to summarize it
- Use /ai in groups for shared AI access`,
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-600',
  advanced: 'bg-red-500/10 text-red-500',
};

export default function HowToDetailPage() {
  const params = useParams<{ slug: string }>();
  const page = howToPages.find(p => p.slug === params.slug);

  if (!page) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Guide not found</h1>
          <Link href="/how-to" className="text-blue-500 hover:underline">← All guides</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const content = howToContent[page.slug];

  function renderContent(c: string) {
    return c.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-[var(--text-primary)] mt-10 mb-4">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith('```')) return null;
      if (line.startsWith('- ')) return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-blue-500 mt-1 shrink-0">·</span>
          <span className="text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
        </div>
      );
      if (line.match(/^\d+\. /)) return (
        <div key={i} className="flex items-start gap-2 my-1 ml-2">
          <span className="text-blue-500 shrink-0 font-mono text-xs mt-1">{line.match(/^(\d+)\./)?.[1]}.</span>
          <span className="text-sm text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /, '').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
        </div>
      );
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />;
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
            <Link href="/how-to" className="hover:text-[var(--primary)]">Guides</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{page.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[page.difficulty] || 'bg-gray-500/10 text-gray-500'}`}>
              {page.difficulty}
            </span>
            <span className="text-xs text-[var(--text-muted)]">⏱ {page.timeToComplete}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">{page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{page.description}</p>

          {content ? (
            <div className="mb-12">{renderContent(content)}</div>
          ) : (
            <div className="mb-12 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <p className="text-[var(--text-secondary)]">{page.description}</p>
              <p className="text-sm text-[var(--text-muted)] mt-4">Full guide available at <a href="https://www.botwave.online/how-to/{page.slug}" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">botwave.online</a></p>
            </div>
          )}

          <div className="p-6 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-2xl text-center mb-8">
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Ready to try it?</h3>
            <Link href="/signup" className="inline-flex px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Get Started Free →
            </Link>
          </div>

          <Link href="/how-to" className="text-sm text-blue-500 hover:underline">← All guides</Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
