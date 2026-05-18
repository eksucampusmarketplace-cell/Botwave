export interface UseCase {
  slug: string;
  title: string;
  headline: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  painPoints: string[];
  solutions: { title: string; description: string; command?: string }[];
  testimonialQuote?: string;
  ctaText: string;
}

export const useCases: UseCase[] = [
  {
    slug: 'schools',
    title: 'BotWave for Schools',
    headline: 'Manage school WhatsApp groups without the chaos',
    description: 'Class groups, department groups, faculty groups. Schools run on WhatsApp but moderation is a nightmare. BotWave fixes that.',
    seoTitle: 'WhatsApp Bot for Schools - Manage Class Groups | BotWave',
    seoDescription: 'Manage school WhatsApp groups with automated moderation, anti-spam, welcome messages, and AI assistance. Free for Nigerian schools.',
    seoKeywords: ['whatsapp bot for schools', 'school group management', 'whatsapp class group bot', 'school whatsapp moderation'],
    painPoints: [
      'Students spamming irrelevant content in class groups',
      'Admins manually removing off-topic messages',
      'New students not knowing group rules',
      'Important announcements getting lost in chat noise',
      'No way to track who is being disruptive',
    ],
    solutions: [
      { title: 'Auto-Welcome with Rules', description: 'Every new student gets a welcome message with the group rules. No more repeating yourself.', command: '!welcome' },
      { title: 'Anti-Spam Protection', description: 'Auto-detect and warn users who flood the group. 5 messages in 10 seconds? Warning issued.', command: '!antidelete' },
      { title: 'Warning System', description: 'Track rule violations per student. 3 warnings and they can be removed automatically.', command: '!warn' },
      { title: 'Announcements', description: 'Tag every group member at once for important announcements. No one misses it.', command: '!tagall' },
      { title: 'AI Homework Help', description: 'Students can ask the AI bot questions directly in the group. Saves lecturers time.', command: '!ai' },
      { title: 'Trivia Games', description: 'Keep engagement high with educational quizzes. Works great for revision sessions.', command: '!trivia' },
    ],
    ctaText: 'Set up BotWave for your school',
  },
  {
    slug: 'businesses',
    title: 'BotWave for Businesses',
    headline: 'Automate customer replies on WhatsApp',
    description: 'Small businesses in Nigeria live on WhatsApp. BotWave handles customer questions, order inquiries, and support automatically so you can focus on running your business.',
    seoTitle: 'WhatsApp Bot for Business - Auto-Reply & Customer Support | BotWave',
    seoDescription: 'Automate WhatsApp customer support for your Nigerian business. Auto-reply, FAQ bot, order management. Free to start.',
    seoKeywords: ['whatsapp bot for business', 'whatsapp business automation', 'whatsapp auto reply bot', 'business whatsapp bot nigeria'],
    painPoints: [
      'Replying to the same customer questions over and over',
      'Missing messages while you sleep',
      'No way to send bulk announcements to customers',
      'Customers asking for prices, availability, location repeatedly',
      'Managing multiple groups for different product categories',
    ],
    solutions: [
      { title: 'AI Auto-Replies', description: 'The AI learns your business info and answers customer questions 24/7. Price inquiries, location, hours, all handled.', command: '!ai' },
      { title: 'AFK Auto-Response', description: 'Set a custom away message when you are busy or sleeping. Customers know you will reply soon.', command: '!afk' },
      { title: 'Broadcast Messages', description: 'Send announcements to all group members. New product? Sale? Let everyone know at once.', command: '!tagall' },
      { title: 'Group Moderation', description: 'Keep customer groups clean. Auto-warn spammers, delete off-topic content.', command: '!warn' },
      { title: 'Translation', description: 'Auto-translate messages for customers who speak different languages.', command: '!translate' },
      { title: 'Receipt Scanning', description: 'Customers can send payment receipts and the bot extracts the details automatically.', command: '!scan' },
    ],
    ctaText: 'Automate your business WhatsApp',
  },
  {
    slug: 'creators',
    title: 'BotWave for Creators',
    headline: 'Manage your fan community without burning out',
    description: 'Content creators, musicians, and influencers use WhatsApp groups to stay close to fans. BotWave keeps the vibes high and the spam low.',
    seoTitle: 'WhatsApp Bot for Creators - Community Management | BotWave',
    seoDescription: 'Manage creator WhatsApp fan groups with automated moderation, engagement tools, games, and AI. Keep fans engaged without the burnout.',
    seoKeywords: ['whatsapp bot for creators', 'creator community bot', 'fan group management whatsapp', 'influencer whatsapp bot'],
    painPoints: [
      'Fan groups getting too noisy to manage',
      'Spam links and scammers in your community',
      'Fans asking repetitive questions about your work',
      'Keeping engagement high between content drops',
      'Managing multiple groups across platforms',
    ],
    solutions: [
      { title: 'Anti-Spam', description: 'Block spam, scam links, and self-promotion automatically. Keep the group focused on your community.', command: '!antidelete' },
      { title: 'Games and Engagement', description: 'Trivia, hangman, word chains, polls. Keep fans entertained between your posts.', command: '!trivia' },
      { title: 'Sticker Maker', description: 'Fans can create stickers from your content. Memes spread your brand.', command: '!sticker' },
      { title: 'Music Sharing', description: 'Share your tracks or any music directly in the group.', command: '!music' },
      { title: 'Media Downloads', description: 'Download TikTok, YouTube, and Instagram content for your fans.', command: '!download' },
      { title: 'AI FAQ Bot', description: 'Let the AI answer fan questions about your schedule, releases, and collabs.', command: '!ai' },
    ],
    ctaText: 'Set up BotWave for your community',
  },
  {
    slug: 'churches',
    title: 'BotWave for Churches',
    headline: 'Keep your church WhatsApp group organized',
    description: 'Church groups need order, not chaos. BotWave helps pastors and admins keep groups focused, share announcements, and engage members respectfully.',
    seoTitle: 'WhatsApp Bot for Churches - Group Management | BotWave',
    seoDescription: 'Manage church WhatsApp groups with automated welcome messages, announcements, moderation, and devotional content. Free.',
    seoKeywords: ['whatsapp bot for churches', 'church group management', 'church whatsapp bot', 'religious group bot'],
    painPoints: [
      'Members sharing irrelevant content in church groups',
      'New members not knowing the group purpose and rules',
      'Important announcements from pastors getting buried',
      'Managing multiple units and departments on WhatsApp',
      'Late-night messages disturbing members',
    ],
    solutions: [
      { title: 'Welcome Messages', description: 'Greet new members with the group purpose and rules. Set the right tone from the start.', command: '!welcome' },
      { title: 'Announcements', description: 'Tag all members for service updates, prayer meetings, and events.', command: '!tagall' },
      { title: 'Moderation', description: 'Gentle warning system for off-topic posts. Keep discussions respectful.', command: '!warn' },
      { title: 'Polls', description: 'Vote on event dates, program choices, and group decisions.', command: '!poll' },
      { title: 'AI Assistance', description: 'Members can ask questions about service times, locations, and programs.', command: '!ai' },
      { title: 'Group Digest', description: 'Get a summary of what was discussed for members who missed the conversation.', command: '!digest' },
    ],
    ctaText: 'Set up BotWave for your church',
  },
  {
    slug: 'crypto',
    title: 'BotWave for Crypto Communities',
    headline: 'Protect your crypto group from scammers',
    description: 'Crypto WhatsApp and Telegram groups are spam magnets. BotWave locks them down with anti-scam protection, moderation, and engagement tools.',
    seoTitle: 'WhatsApp & Telegram Bot for Crypto Groups | BotWave',
    seoDescription: 'Protect crypto community groups from scammers and spam. Anti-flood, global bans, CAPTCHA verification. Free for WhatsApp and Telegram.',
    seoKeywords: ['crypto group bot', 'whatsapp crypto bot', 'telegram crypto group management', 'anti scam bot crypto'],
    painPoints: [
      'Scammers joining and sending fake investment links',
      'Impersonators pretending to be admins',
      'Spam bots flooding the group',
      'Managing bans across multiple community groups',
      'New members falling for scam messages before admins can delete them',
    ],
    solutions: [
      { title: 'Anti-Flood', description: 'Auto-mute users who spam messages rapidly. Stops flood attacks instantly.', command: '!antidelete' },
      { title: 'CAPTCHA (Telegram)', description: 'New members must pass a challenge to post. Blocks automated bots.', command: '/captcha' },
      { title: 'Global Bans', description: 'Ban a scammer once, banned in ALL your groups. One command.', command: '.gban' },
      { title: 'Federation (Telegram)', description: 'Link multiple groups together. Share ban lists across your network.', command: '/federation' },
      { title: 'Blacklist', description: 'Auto-delete messages containing known scam keywords.', command: '/blacklist' },
      { title: 'PM Permit (Userbot)', description: 'Block unknown DMs to prevent scammers from messaging you directly.', command: '.pmpermit' },
    ],
    ctaText: 'Protect your crypto community',
  },
  {
    slug: 'vendors',
    title: 'BotWave for Online Vendors',
    headline: 'Turn your WhatsApp into a storefront',
    description: 'Nigerian vendors use WhatsApp for everything: listing products, taking orders, customer support. BotWave automates the repetitive parts so you can sell more.',
    seoTitle: 'WhatsApp Bot for Vendors - Auto-Reply & Order Management | BotWave',
    seoDescription: 'Automate your WhatsApp vendor business. Auto-reply to customer inquiries, manage groups, share product media. Free for Nigerian vendors.',
    seoKeywords: ['whatsapp bot for vendors', 'online vendor bot', 'whatsapp selling bot', 'nigerian vendor whatsapp bot'],
    painPoints: [
      'Answering "How much?" hundreds of times a day',
      'Missing customer messages while packaging orders',
      'No way to broadcast new product arrivals to all customers',
      'Customers deleting payment proof after sending',
      'Managing different customer groups for different products',
    ],
    solutions: [
      { title: 'AI Price Bot', description: 'AI answers common questions like pricing, sizes, availability, and location automatically.', command: '!ai' },
      { title: 'AFK Auto-Reply', description: 'Set "packing orders, will reply soon" messages. Customers know you are busy, not ignoring them.', command: '!afk' },
      { title: 'Broadcast', description: 'New arrivals? Restocks? Flash sales? Tag all members in your customer group.', command: '!tagall' },
      { title: 'Anti-Delete', description: 'Catch payment screenshots that get deleted. No more "I already paid" disputes.', command: '!antidelete' },
      { title: 'Receipt Scanning', description: 'Customer sends payment receipt, bot extracts amount and details automatically.', command: '!scan' },
      { title: 'Logo Maker', description: 'Create quick branding and product labels right in WhatsApp.', command: '!logo' },
    ],
    ctaText: 'Automate your vendor WhatsApp',
  },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return useCases.find(u => u.slug === slug);
}
