/**
 * Button captcha for new members.
 * Restricts new members until they click a verify button.
 */

import { Bot, InlineKeyboard } from 'grammy';
import {
  getTelegramConfig,
  setCaptchaPending,
  markCaptchaVerified,
  isCaptchaVerified,
} from '../utils/db';

export function registerCaptchaHandlers(bot: Bot, sessionId: string): void {
  bot.on(':new_chat_members', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    if (!config.captcha_enabled) return;

    for (const member of ctx.message!.new_chat_members!) {
      if (member.is_bot) continue;

      try {
        await ctx.restrictChatMember(member.id, {
          can_send_messages: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
        });
      } catch (err) {
        console.error(`[TG-CAPTCHA] Failed to restrict ${member.id}:`, err);
        continue;
      }

      const expiresAt = new Date(Date.now() + 60_000);
      await setCaptchaPending(sessionId, ctx.chat.id.toString(), member.id.toString(), expiresAt);

      const keyboard = new InlineKeyboard()
        .text(`✅ I'm human — click to verify`, `captcha:${member.id}:${ctx.chat.id}`);

      const msg = await ctx.reply(
        `👋 Welcome ${member.first_name}!\n` +
        `Please click the button below to verify you are human.\n` +
        `You have 60 seconds.`,
        { reply_markup: keyboard },
      );

      // Auto-kick after 60 seconds if not verified
      const chatId = ctx.chat.id;
      const msgId = msg.message_id;
      const memberId = member.id;

      setTimeout(async () => {
        try {
          const verified = await isCaptchaVerified(sessionId, chatId.toString(), memberId.toString());
          if (!verified) {
            await bot.api.banChatMember(chatId, memberId);
            await bot.api.unbanChatMember(chatId, memberId);
            await bot.api.deleteMessage(chatId, msgId).catch(() => {});
          }
        } catch (err) {
          console.error(`[TG-CAPTCHA] Auto-kick failed for ${memberId}:`, err);
        }
      }, 60_000);
    }
  });

  bot.callbackQuery(/^captcha:(\d+):(-?\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match![1], 10);
    const chatId = parseInt(ctx.match![2], 10);

    if (ctx.from.id !== userId) {
      await ctx.answerCallbackQuery({ text: 'This is not for you.', show_alert: true });
      return;
    }

    try {
      await ctx.api.restrictChatMember(chatId, userId, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
    } catch (err) {
      console.error(`[TG-CAPTCHA] Failed to unrestrict ${userId}:`, err);
    }

    await markCaptchaVerified(sessionId, chatId.toString(), userId.toString());
    await ctx.answerCallbackQuery({ text: '✅ Verified! Welcome.' });
    await ctx.deleteMessage().catch(() => {});
  });
}
