/**
 * Pin/unpin message handlers.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';
import { , updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerPinsHandlers(bot: Bot, sessionId: string): void {
  bot.command('pin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    if (!ctx.message?.reply_to_message) {
      await ctx.reply('Reply to a message to pin it.');
      return;
    }

    const silent = (ctx.match?.toString() || '').trim().toLowerCase() === 'silent';

    try {
      await ctx.pinChatMessage(ctx.message.reply_to_message.message_id, {
        disable_notification: silent,
      });
      await ctx.reply('📌 Message pinned.');
    } catch {
      await ctx.reply('❌ Could not pin message.');
    }
  });

  bot.command('unpin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (arg === 'all') {
      try {
        await ctx.unpinAllChatMessages();
        await ctx.reply('📌 All messages unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin messages.');
      }
      return;
    }

    if (ctx.message?.reply_to_message) {
      try {
        await ctx.unpinChatMessage(ctx.message.reply_to_message.message_id);
        await ctx.reply('📌 Message unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin message.');
      }
    } else {
      try {
        await ctx.unpinChatMessage();
        await ctx.reply('📌 Latest pinned message unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin message.');
      }
    }
  });

  // /pinned — Show link to currently pinned message
  bot.command('pinned', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
    try {
      const chat = await ctx.api.getChat(ctx.chat.id);
      if ('pinned_message' in chat && chat.pinned_message) {
        const msgId = chat.pinned_message.message_id;
        await ctx.reply(
          `📌 <b>Pinned Message</b>\n\n` +
          `Message ID: <code>${msgId}</code>\n` +
          `Preview: ${escapeHtml((chat.pinned_message.text || '').slice(0, 100))}`,
          { parse_mode: 'HTML' },
        );
      } else {
        await ctx.reply('No message is currently pinned.');
      }
    } catch {
      await ctx.reply('❌ Could not fetch pinned message.');
    }
  });

  // /permapin <text> — Pin a message permanently (bot sends and pins it)
  bot.command('permapin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /permapin <text>'); return; }
    try {
      const msg = await ctx.reply(text, { parse_mode: 'HTML' });
      await ctx.pinChatMessage(msg.message_id, { disable_notification: false });
    } catch {
      await ctx.reply('❌ Could not send or pin message.');
    }
  });

  // /unpinall — Unpin all messages
  bot.command('unpinall', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    try {
      await ctx.unpinAllChatMessages();
      await ctx.reply('📌 All messages unpinned.');
    } catch {
      await ctx.reply('❌ Could not unpin messages.');
    }
  });

  // /antichannelpin <yes/no> — Automatically unpin messages sent by linked channel
  bot.command('antichannelpin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { anti_channel_pin: true } as Record<string, unknown>);
      await ctx.reply('✅ Anti-channel pin enabled. Channel pins will be auto-unpinned.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { anti_channel_pin: false } as Record<string, unknown>);
      await ctx.reply('✅ Anti-channel pin disabled.');
    } else {
      await ctx.reply('Usage: /antichannelpin <yes/no/on/off>');
    }
  });

  // /cleanlinked <yes/no> — Auto-delete messages from linked channel
  bot.command('cleanlinked', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_linked: true } as Record<string, unknown>);
      await ctx.reply('✅ Linked channel messages will be auto-deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_linked: false } as Record<string, unknown>);
      await ctx.reply('✅ Linked channel cleanup disabled.');
    } else {
      await ctx.reply('Usage: /cleanlinked <yes/no/on/off>');
    }
  });
}
