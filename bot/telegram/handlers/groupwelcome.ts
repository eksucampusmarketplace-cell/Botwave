/**
 * Auto-welcome new members in the BotWave Telegram support group.
 * Sends rules, tips, and translation info when a new user joins.
 */

import { Bot } from 'grammy';

const SUPPORT_GROUP_ID = -1003986594255;

export function registerGroupWelcomeHandlers(bot: Bot, _sessionId: string): void {
  // Listen for new members joining via chat_member updates
  bot.on('chat_member', async (ctx) => {
    if (!ctx.chatMember || ctx.chat.id !== SUPPORT_GROUP_ID) return;

    const newMember = ctx.chatMember.new_chat_member;
    const oldMember = ctx.chatMember.old_chat_member;

    // Only trigger when someone joins (status changes to "member")
    if (newMember.status !== 'member') return;
    if (oldMember.status === 'member' || oldMember.status === 'administrator' || oldMember.status === 'creator') return;

    const user = newMember.user;
    const firstName = user.first_name || 'there';

    const welcomeText =
      `Welcome to BotWave Support, <b>${firstName}</b>! 👋\n\n` +
      `📋 <b>Group Rules:</b>\n` +
      `1. Be respectful to all members\n` +
      `2. Use English for faster support\n` +
      `3. No spam, ads, or self-promotion\n` +
      `4. Describe your issue clearly with screenshots if possible\n` +
      `5. No userbot commands here — only /commands\n\n` +
      `💡 <b>Quick Tips:</b>\n` +
      `• Use <code>/help</code> to see bot commands\n` +
      `• Use <code>/tr text</code> to translate text to English\n` +
      `• Manage your bot at https://botwave.online/dashboard\n\n` +
      `🔗 <b>Useful Links:</b>\n` +
      `• Updates: @BotWaveUpdates\n` +
      `• WhatsApp Support: https://chat.whatsapp.com/GMyXXv1hhnbI7JcCF5sNEf`;

    try {
      const msg = await ctx.reply(welcomeText, { parse_mode: 'HTML' });

      // Auto-delete welcome after 2 minutes to keep chat clean
      setTimeout(async () => {
        try { await bot.api.deleteMessage(SUPPORT_GROUP_ID, msg.message_id); } catch {}
      }, 120_000);
    } catch (err) {
      console.error('[GROUP-WELCOME] Failed to send welcome:', err);
    }
  });
}
