export interface FixPage {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
}

export const fixPages: FixPage[] = [
  {
    slug: 'whatsapp-bot-disconnected',
    title: 'WhatsApp Bot Keeps Disconnecting',
    description: 'Why your WhatsApp bot session disconnects and how to fix it. Covers QR expiry, 401 auth errors, 428 rate limits, and network issues.',
    seoTitle: 'Fix: WhatsApp Bot Keeps Disconnecting - Troubleshooting Guide',
    seoDescription: 'Why your WhatsApp bot keeps disconnecting and how to fix it. Covers session expiry, auth errors, rate limits, multi-device conflicts.',
    keywords: ['whatsapp bot disconnecting', 'fix whatsapp bot connection', 'whatsapp bot reconnect', 'whatsapp session expired'],
  },
  {
    slug: 'whatsapp-bot-banned',
    title: 'WhatsApp Bot Got Banned',
    description: 'Why WhatsApp bans bots and how BotWave prevents it. Anti-ban system explained with recovery steps.',
    seoTitle: 'Fix: WhatsApp Bot Got Banned - Prevention and Recovery',
    seoDescription: 'Why WhatsApp bots get banned and how to prevent it. BotWave anti-ban system with human-like behavior, session warmup, and rate limiting.',
    keywords: ['whatsapp bot banned', 'prevent whatsapp bot ban', 'whatsapp anti ban', 'whatsapp bot ban fix'],
  },
  {
    slug: 'whatsapp-qr-not-scanning',
    title: 'WhatsApp QR Code Not Scanning',
    description: 'Troubleshoot QR code scanning issues during bot setup. Camera problems, expired QR, and pairing code alternatives.',
    seoTitle: 'Fix: WhatsApp QR Code Not Scanning - Setup Troubleshooting',
    seoDescription: 'Fix QR code scanning issues when connecting WhatsApp bot. Camera tips, QR expiry, pairing code method, and browser compatibility.',
    keywords: ['whatsapp qr not scanning', 'whatsapp bot qr code fix', 'whatsapp qr expired', 'whatsapp pairing code'],
  },
  {
    slug: 'whatsapp-auto-reply-not-working',
    title: 'WhatsApp Auto-Reply Not Working',
    description: 'Fix auto-reply issues including session disconnection, command not recognized, and permission problems.',
    seoTitle: 'Fix: WhatsApp Auto-Reply Not Working - Troubleshooting',
    seoDescription: 'Fix WhatsApp bot auto-reply issues. Check session status, command syntax, permissions, and rate limits.',
    keywords: ['whatsapp auto reply not working', 'whatsapp bot not responding', 'whatsapp bot commands not working'],
  },
  {
    slug: 'whatsapp-bot-slow-response',
    title: 'WhatsApp Bot Responding Slowly',
    description: 'Why bot responses are delayed. Covers anti-ban delays, server load, rate limiting, and session warmup.',
    seoTitle: 'Fix: WhatsApp Bot Slow Response - Why Bot Replies Are Delayed',
    seoDescription: 'Why your WhatsApp bot responds slowly. Anti-ban delays are intentional. Learn about typing simulation and rate limiting.',
    keywords: ['whatsapp bot slow', 'whatsapp bot delay', 'why bot reply slow', 'whatsapp bot response time'],
  },
  {
    slug: 'whatsapp-bot-not-reading-messages',
    title: 'WhatsApp Bot Not Reading Messages',
    description: 'Bot not responding to messages. Check session status, prefix, admin permissions, and message types.',
    seoTitle: 'Fix: WhatsApp Bot Not Reading Messages',
    seoDescription: 'Fix WhatsApp bot not responding to messages. Check if session is active, correct prefix used, and permissions set.',
    keywords: ['whatsapp bot not reading messages', 'bot not responding whatsapp', 'whatsapp bot ignore messages'],
  },
  {
    slug: 'whatsapp-sticker-not-sending',
    title: 'WhatsApp Sticker Command Not Working',
    description: 'Fix sticker creation issues. Media format, file size limits, and correct command syntax.',
    seoTitle: 'Fix: WhatsApp Sticker Bot Not Working',
    seoDescription: 'Fix !sticker command issues. Check media format, file size (under 1MB for static, 500KB for animated), and reply to correct media type.',
    keywords: ['whatsapp sticker bot not working', 'sticker command fail', 'whatsapp bot sticker error'],
  },
  {
    slug: 'telegram-bot-not-responding',
    title: 'Telegram Bot Not Responding',
    description: 'Troubleshoot Telegram bot connection issues. Token validity, webhook setup, and group permissions.',
    seoTitle: 'Fix: Telegram Bot Not Responding - Connection Troubleshooting',
    seoDescription: 'Fix Telegram bot not responding. Check bot token, webhook status, group privacy settings, and admin permissions.',
    keywords: ['telegram bot not responding', 'telegram bot not working', 'fix telegram bot', 'telegram bot offline'],
  },
  {
    slug: 'telegram-userbot-session-expired',
    title: 'Telegram Userbot Session Expired',
    description: 'Fix userbot authentication issues. MTProto session renewal, 2FA verification, and flood wait errors.',
    seoTitle: 'Fix: Telegram Userbot Session Expired',
    seoDescription: 'Fix Telegram userbot session expiry. Re-authenticate MTProto session, handle flood wait errors, and 2FA issues.',
    keywords: ['telegram userbot session expired', 'mtproto session fix', 'telegram userbot auth error'],
  },
  {
    slug: 'whatsapp-download-not-working',
    title: 'WhatsApp Download Command Not Working',
    description: 'Fix video download issues. Supported platforms, URL format, file size limits, and geo-restrictions.',
    seoTitle: 'Fix: WhatsApp Download Bot Not Working',
    seoDescription: 'Fix !download command issues. Supported platforms (TikTok, YouTube, Instagram), URL format, and file size limits.',
    keywords: ['whatsapp download bot not working', 'tiktok download bot error', 'youtube download whatsapp fix'],
  },
  {
    slug: 'whatsapp-bot-not-joining-group',
    title: 'WhatsApp Bot Not Working in Group',
    description: 'Bot works in private but not in groups. Check admin status, group settings, and invite link.',
    seoTitle: 'Fix: WhatsApp Bot Not Working in Group',
    seoDescription: 'Fix WhatsApp bot not responding in groups. Check if bot number is admin, group privacy settings, and message visibility.',
    keywords: ['whatsapp bot not working in group', 'bot not responding in group', 'whatsapp group bot fix'],
  },
  {
    slug: 'whatsapp-ai-not-responding',
    title: 'WhatsApp AI Command Not Working',
    description: 'Fix !ai command issues. Daily limit reached, server load, and quota resets.',
    seoTitle: 'Fix: WhatsApp AI Bot Not Responding',
    seoDescription: 'Fix !ai command not working. Check daily query limit (10/day free), server status, and syntax.',
    keywords: ['whatsapp ai bot not working', 'ai command not responding', 'whatsapp ai limit'],
  },
];
