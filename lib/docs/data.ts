export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  platform: 'all' | 'whatsapp' | 'telegram' | 'userbot';
  content: string;
  seoKeywords: string[];
  relatedDocs: string[];
}

export const docPages: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started with BotWave',
    description: 'Set up your first bot in under 2 minutes. Connect WhatsApp, Telegram Bot, or Telegram Userbot from one dashboard.',
    category: 'Setup',
    platform: 'all',
    content: `## Getting Started with BotWave

### Step 1: Create an Account
Go to [botwave.online/signup](https://www.botwave.online/signup) and create a free account. No credit card needed.

### Step 2: Choose Your Platform
From your dashboard, pick which platform you want to connect:

**WhatsApp Bot**
1. Click "Connect WhatsApp"
2. Scan the QR code with your phone (WhatsApp > Settings > Linked Devices > Link a Device)
3. Wait for the connection to establish
4. Your bot is now live in all your groups

**Telegram Bot**
1. Open Telegram, search for @BotFather
2. Send /newbot and follow the prompts
3. Copy the bot token
4. Paste it in the BotWave dashboard
5. Add the bot to your group and make it admin

**Telegram Userbot**
1. Go to my.telegram.org and log in
2. Create an application to get your API ID and API Hash
3. Enter these in the BotWave dashboard
4. Scan the QR code or enter the verification code
5. Your userbot is live

### Step 3: Test It
Send a command in any group where your bot is active:
- WhatsApp: Type \`!ping\` or \`!help\`
- Telegram Bot: Type \`/start\` or \`/help\`
- Telegram Userbot: Type \`.alive\` or \`.ping\`

### What's Next?
- Browse the [Command Gallery](/commands) to see all available commands
- Set up [welcome messages](/docs/welcome-messages) for your groups
- Enable [anti-spam protection](/docs/anti-spam-setup)
- Try the [AI assistant](/docs/ai-commands)`,
    seoKeywords: ['botwave setup', 'how to set up whatsapp bot', 'whatsapp bot setup guide', 'telegram bot setup'],
    relatedDocs: ['connect-whatsapp', 'connect-telegram', 'anti-spam-setup'],
  },
  {
    slug: 'connect-whatsapp',
    title: 'How to Connect WhatsApp',
    description: 'Step-by-step guide to connecting your WhatsApp number to BotWave via QR code scan.',
    category: 'Setup',
    platform: 'whatsapp',
    content: `## How to Connect WhatsApp to BotWave

### Prerequisites
- A WhatsApp account on your phone
- A web browser on your computer or phone

### Connection Steps

1. **Sign up / Log in** at [botwave.online](https://www.botwave.online)
2. Go to your **Dashboard**
3. Click **"Connect WhatsApp"**
4. A QR code will appear on screen
5. On your phone, open **WhatsApp**
6. Go to **Settings > Linked Devices > Link a Device**
7. Scan the QR code shown on the dashboard
8. Wait 5-10 seconds for the connection to establish
9. You'll see a green "Connected" status

### After Connecting
- Your bot automatically works in all your groups
- Test it by typing \`!ping\` in any group
- Type \`!help\` to see all available commands

### Troubleshooting

**QR code expired?**
Click "Refresh QR" to get a new one. QR codes expire after 60 seconds.

**Connection drops after a few hours?**
This usually means your phone lost internet connection. Make sure your phone stays connected to WiFi or data. BotWave uses WhatsApp's Linked Devices feature, which requires your phone to have internet.

**"Session already exists" error?**
Go to WhatsApp > Settings > Linked Devices and remove the old BotWave session. Then try connecting again.

**Bot not responding in groups?**
Make sure you're using the \`!\` prefix. Type \`!ping\` to test. If it still doesn't work, check that the bot session is showing as "Active" in your dashboard.`,
    seoKeywords: ['connect whatsapp bot', 'whatsapp qr code bot', 'whatsapp bot setup', 'link whatsapp bot'],
    relatedDocs: ['getting-started', 'qr-troubleshooting', 'anti-ban-explained'],
  },
  {
    slug: 'connect-telegram',
    title: 'How to Connect Telegram Bot',
    description: 'Create a Telegram bot via @BotFather and connect it to BotWave. Zero ban risk setup.',
    category: 'Setup',
    platform: 'telegram',
    content: `## How to Connect a Telegram Bot

### Creating Your Bot Token

1. Open Telegram and search for **@BotFather**
2. Send \`/newbot\`
3. Choose a name for your bot (e.g., "My Group Manager")
4. Choose a username ending in "bot" (e.g., "mygroup_mgr_bot")
5. BotFather will give you a **token** like \`123456:ABCdef...\`
6. Copy this token

### Connecting to BotWave

1. Log in to [botwave.online](https://www.botwave.online)
2. Go to your **Dashboard**
3. Click **"Connect Telegram Bot"**
4. Paste your bot token
5. Click **"Connect"**
6. You'll see "Connected" with your bot's username

### Adding the Bot to Groups

1. Open your Telegram group
2. Click the group name > "Add Members"
3. Search for your bot's username
4. Add it to the group
5. **Make the bot an admin** (required for moderation commands)
6. The bot is now active

### Why Telegram Bot is Zero Ban Risk
The Telegram Bot API is an official, sanctioned API by Telegram. Your personal account is never involved. The bot runs as a separate entity. There is no risk of your personal account being banned.

### Testing
Type \`/start\` or \`/ping\` in a group where the bot is admin.`,
    seoKeywords: ['telegram bot setup', 'botfather tutorial', 'create telegram bot', 'telegram bot token'],
    relatedDocs: ['getting-started', 'connect-userbot', 'anti-spam-setup'],
  },
  {
    slug: 'connect-userbot',
    title: 'How to Set Up Telegram Userbot',
    description: 'Connect your Telegram account as a userbot using MTProto API credentials.',
    category: 'Setup',
    platform: 'userbot',
    content: `## How to Set Up Telegram Userbot

### What is a Userbot?
A userbot automates your real Telegram account. Unlike a regular bot, it acts as YOU. It can do everything you can do: ban users, delete messages, pin posts, and more. Commands use a \`.\` prefix.

### Getting API Credentials

1. Go to [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Click **"API development tools"**
4. Fill in the form:
   - App title: anything (e.g., "BotWave")
   - Short name: anything (e.g., "botwave")
   - Platform: Other
5. Click **"Create application"**
6. Note your **API ID** (a number) and **API Hash** (a string)

### Connecting to BotWave

1. Log in to [botwave.online](https://www.botwave.online)
2. Go to your **Dashboard**
3. Click **"Connect Telegram Userbot"**
4. Enter your **API ID** and **API Hash**
5. Scan the QR code with your Telegram app, or enter the verification code sent to your Telegram
6. You'll see "Connected" with your account name

### Important Notes
- The userbot uses your admin rights in groups. If you're not an admin, admin commands won't work.
- Use \`.alive\` to check if the userbot is running.
- Use \`.help\` to see all available commands.
- The userbot runs on BotWave's servers, so it stays online even when your phone is off.`,
    seoKeywords: ['telegram userbot setup', 'telegram userbot', 'mtproto userbot', 'telegram api credentials'],
    relatedDocs: ['getting-started', 'connect-telegram', 'userbot-privacy'],
  },
  {
    slug: 'anti-spam-setup',
    title: 'Anti-Spam and Moderation Setup',
    description: 'Set up automated spam protection for WhatsApp and Telegram groups. Anti-flood, captcha, blacklist, and more.',
    category: 'Features',
    platform: 'all',
    content: `## Setting Up Anti-Spam Protection

### WhatsApp Anti-Spam

BotWave includes built-in flood detection for WhatsApp groups:
- **Flood detection**: If a user sends 5+ messages in 10 seconds, they get a warning
- **Rate limiting**: Maximum 10 messages per minute per session, 20 per user
- **Anti-delete**: Enable with \`!antidelete on\` to recover deleted messages

### Telegram Bot Anti-Spam

Full suite of anti-spam tools:

**Anti-Flood**
\`/antiflood 5\` - Auto-mute users who send more than 5 messages in 10 seconds.

**CAPTCHA Verification**
\`/captcha on\` - New members must solve a challenge before posting. Blocks automated spam bots.

**Anti-Link**
\`/antilink on\` - Automatically delete messages containing links. Whitelist specific domains.

**Blacklist**
\`/blacklist add [word]\` - Auto-delete messages containing blacklisted words or phrases.

**Anti-Raid**
\`/antiraid on\` - Detect and block mass join attacks. Useful during raids.

### Telegram Userbot Anti-Spam

**.antiflood [limit]**
Set flood limit for groups where you're admin. Uses your admin rights directly.

**.gban @user**
Globally ban a spammer across ALL your groups with one command.

### Recommended Setup for New Groups
1. Enable anti-flood: \`/antiflood 5\` or \`.antiflood 5\`
2. Enable captcha (Telegram): \`/captcha on\`
3. Blacklist common spam words: \`/blacklist add crypto\`, \`/blacklist add earn money\`
4. Set welcome message with rules: \`/welcome Welcome {name}! Read the pinned rules.\``,
    seoKeywords: ['whatsapp anti spam bot', 'telegram anti spam', 'group spam protection', 'whatsapp moderation bot'],
    relatedDocs: ['getting-started', 'anti-ban-explained', 'moderation-commands'],
  },
  {
    slug: 'anti-ban-explained',
    title: 'How the Anti-Ban System Works',
    description: 'Understand how BotWave protects your WhatsApp account from bans with advanced anti-detection technology.',
    category: 'Security',
    platform: 'whatsapp',
    content: `## How the BotWave Anti-Ban System Works

### Why WhatsApp Bans Bots
WhatsApp detects bots by looking for patterns that don't match human behavior:
- Sending identical messages repeatedly
- Responding instantly every time
- Being active 24/7 with no breaks
- Sending the same media files (identical file hashes)
- High message volume from a single account

### How BotWave Prevents Bans

**Session Warmup**
New sessions start with a limit of 15 messages/day. Over 7 days, this gradually increases to 200 messages/day. This mimics how a real person would start using a new device.

**Human-Like Timing**
- Read receipts are sent first, then typing indicators, then the actual response
- Random delays between 1-5 seconds before replying
- 5% chance of a 15-30 second "distracted" delay
- 3% chance of a 30-60 second delay
- Quieter responses late at night (12am-6am)

**Message Variation**
- 50-100 different response templates per command
- Dynamic variable injection (name, time, date)
- Occasional typos and casual phrasing
- Zero-width characters for unique byte fingerprints

**Read-But-Skip**
15% of the time in groups, the bot reads a message but doesn't respond. Like a real person who reads but doesn't reply to everything.

**Media Fingerprint Jittering**
Random bytes are appended to stickers and images so each file has a unique hash. WhatsApp can't detect them as bot-generated.

**Daily Limits**
Hard cap of 200 messages per day per session. This keeps your account well within normal usage patterns.

### Your Device, Your IP
The most important anti-ban feature: your WhatsApp session runs from your own device IP via QR code. You're not sharing a server IP with thousands of other bot users. This alone drastically reduces ban risk compared to other bot platforms.`,
    seoKeywords: ['whatsapp anti ban', 'whatsapp bot ban protection', 'how to avoid whatsapp ban', 'whatsapp bot safe', 'anti ban system'],
    relatedDocs: ['connect-whatsapp', 'qr-troubleshooting', 'getting-started'],
  },
  {
    slug: 'qr-troubleshooting',
    title: 'QR Code Login Troubleshooting',
    description: 'Fix common QR code scanning issues when connecting WhatsApp or Telegram Userbot to BotWave.',
    category: 'Troubleshooting',
    platform: 'whatsapp',
    content: `## QR Code Troubleshooting

### QR Code Expired
QR codes expire after about 60 seconds. Click "Refresh QR" to get a new one. Make sure you scan quickly after the code appears.

### QR Code Won't Scan
- Make sure your phone camera is clean and focused
- Increase your screen brightness
- Try zooming in on the QR code
- Make sure you're scanning from WhatsApp > Settings > Linked Devices > Link a Device

### Connected But Disconnects After a Few Hours
Common causes:
1. **Phone lost internet** - Your phone needs to stay connected to WiFi or mobile data
2. **WhatsApp updated** - Sometimes WhatsApp updates reset linked devices. Reconnect.
3. **Too many linked devices** - WhatsApp allows up to 4 linked devices. Remove unused ones.

### "Session Already Exists" Error
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices
3. Find and remove the old BotWave session
4. Go back to the BotWave dashboard
5. Click "Connect WhatsApp" again
6. Scan the new QR code

### Session Shows "Disconnected" in Dashboard
This can happen after a server restart. Click "Reconnect" in the dashboard. If that doesn't work, remove the linked device from your phone and scan a fresh QR code.

### Bot Connected But Not Responding
1. Check that the session shows "Active" in the dashboard
2. Make sure you're using the \`!\` prefix: \`!ping\`
3. Check if you've hit the daily message limit (200 on free plan)
4. Try in a different group to rule out group-specific issues`,
    seoKeywords: ['whatsapp qr code not working', 'whatsapp bot disconnected', 'whatsapp linked device issues', 'qr scan troubleshooting'],
    relatedDocs: ['connect-whatsapp', 'anti-ban-explained', 'reconnecting-sessions'],
  },
  {
    slug: 'ai-commands',
    title: 'AI Commands and Auto-Reply Setup',
    description: 'Use AI-powered commands for chat assistance, content generation, group summaries, and automated replies.',
    category: 'Features',
    platform: 'all',
    content: `## AI Commands

### WhatsApp AI (\`!ai\`)
Type \`!ai\` followed by any question or prompt:
- \`!ai explain blockchain simply\`
- \`!ai write a birthday message for my friend\`
- \`!ai what's the capital of Nigeria\`

Reply to any message with \`!ai\` to ask the AI about that specific message.

### Group Digest (\`!digest\`)
Get an AI summary of recent group messages:
- \`!digest\` - summarize the last few hours
- \`!digest today\` - full day summary
- \`!digest 50\` - last 50 messages

### Telegram Bot AI (\`/ai\`)
Same functionality, just with the \`/\` prefix:
- \`/ai help me understand recursion\`
- Reply to a message with \`/ai\` to get context-aware answers

### Smart FAQ (\`!ask\`)
Ask BotWave about its own features:
- \`!ask how do I make stickers\`
- \`!ask what are the pricing plans\`
- \`!ask is my data safe\`

### Auto-Reply Setup
Set automatic responses for when you're away:
- WhatsApp: \`!afk studying\` - auto-reply to tags with your reason
- Userbot: \`.afk busy\` - same for Telegram

### AI Limits
- Free plan: 10 AI queries per day
- Standard plan: 100 queries per day
- Boss plan: Unlimited queries`,
    seoKeywords: ['whatsapp ai bot', 'whatsapp ai chatbot', 'ai auto reply whatsapp', 'whatsapp ai commands'],
    relatedDocs: ['getting-started', 'anti-spam-setup', 'welcome-messages'],
  },
  {
    slug: 'welcome-messages',
    title: 'Welcome and Goodbye Messages',
    description: 'Set up automatic welcome and goodbye messages for group members. Customize with variables.',
    category: 'Features',
    platform: 'all',
    content: `## Welcome and Goodbye Messages

### Setting a Welcome Message

**WhatsApp:**
\`!welcome Welcome to the group, {name}! Please read the pinned rules.\`

**Telegram Bot:**
\`/welcome Hey {name}, welcome to {group}! We have {count} members.\`

**Telegram Userbot:**
\`.setwelcome Welcome {name}!\`

### Available Variables
- \`{name}\` - New member's name
- \`{group}\` - Group name (Telegram only)
- \`{count}\` - Member count (Telegram only)

### Disabling Welcome Messages
- WhatsApp: \`!welcome off\`
- Telegram: \`/welcome off\`
- Userbot: \`.rmwelcome\`

### Setting a Goodbye Message
- WhatsApp: \`!goodbye Bye {name}, we'll miss you!\`
- Telegram: \`/goodbye {name} has left the chat.\`

### Tips
- Keep welcome messages short and useful
- Include a link to group rules
- Mention the command prefix so new members know how to use the bot
- For Telegram, combine with CAPTCHA for spam protection`,
    seoKeywords: ['whatsapp welcome bot', 'telegram welcome message', 'auto greet new members', 'welcome message bot'],
    relatedDocs: ['getting-started', 'anti-spam-setup', 'ai-commands'],
  },
  {
    slug: 'reconnecting-sessions',
    title: 'Reconnecting Disconnected Sessions',
    description: 'How to reconnect when your WhatsApp or Telegram session disconnects from BotWave.',
    category: 'Troubleshooting',
    platform: 'all',
    content: `## Reconnecting Disconnected Sessions

### Why Sessions Disconnect
- Phone lost internet connection (WhatsApp)
- WhatsApp app was updated
- Server maintenance (rare)
- Session was idle for too long
- You manually logged out from linked devices

### Reconnecting WhatsApp
1. Open your BotWave dashboard
2. Find the disconnected session
3. Click "Reconnect" or "Re-scan QR"
4. If reconnect doesn't work, scan a new QR code

### Reconnecting Telegram Bot
Telegram bot sessions rarely disconnect. If they do:
1. Check that your bot token is still valid
2. Open @BotFather, send /mybots, select your bot
3. If the token was revoked, generate a new one and update it in BotWave

### Reconnecting Telegram Userbot
1. Open your BotWave dashboard
2. The userbot should auto-reconnect on server restart
3. If it doesn't, re-enter your API credentials

### Preventing Disconnections
- Keep your phone connected to internet (WhatsApp)
- Don't unlink devices from WhatsApp settings while the bot is running
- Don't revoke your Telegram bot token while the bot is active`,
    seoKeywords: ['whatsapp bot disconnected', 'reconnect whatsapp bot', 'bot session expired', 'whatsapp bot not responding'],
    relatedDocs: ['qr-troubleshooting', 'connect-whatsapp', 'connect-telegram'],
  },
];

export function getDocBySlug(slug: string): DocPage | undefined {
  return docPages.find(d => d.slug === slug);
}

export function getDocsByCategory(category: string): DocPage[] {
  return docPages.filter(d => d.category === category);
}

export function getAllDocCategories(): string[] {
  return [...new Set(docPages.map(d => d.category))];
}
