/**
 * Promote/demote handlers for managing admin rights.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin, isCreator } from '../utils/permissions';
import { resolveTarget } from '../utils/resolve';
import { mentionById, escapeHtml } from '../utils/format';
import { logModAction } from '../utils/db';

export function registerPromoteHandlers(bot: Bot, sessionId: string): void {
  bot.command('promote', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const target = resolveTarget(ctx);
    if (!target.userId) {
      await ctx.reply('Usage: /promote <reply|@username|userid> [title]');
      return;
    }

    const title = target.reason || '';

    try {
      await ctx.promoteChatMember(target.userId, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_manage_video_chats: true,
        can_restrict_members: true,
        can_promote_members: false,
        can_change_info: true,
        can_invite_users: true,
        can_pin_messages: true,
      });

      if (title) {
        try {
          await ctx.setChatAdministratorCustomTitle(target.userId, title);
        } catch { /* may not have permission to set title */ }
      }

      await logModAction(
        sessionId,
        ctx.chat!.id.toString(),
        'promote',
        target.userId.toString(),
        ctx.from!.id.toString(),
        title || 'Promoted to admin',
      );

      const titleStr = title ? ` with title "${escapeHtml(title)}"` : '';
      await ctx.reply(
        `⬆️ User <code>${target.userId}</code> has been promoted${titleStr}.`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Could not promote user. Make sure I have sufficient permissions.');
    }
  });

  bot.command('demote', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const target = resolveTarget(ctx);
    if (!target.userId) {
      await ctx.reply('Usage: /demote <reply|@username|userid>');
      return;
    }

    try {
      await ctx.promoteChatMember(target.userId, {
        can_manage_chat: false,
        can_delete_messages: false,
        can_manage_video_chats: false,
        can_restrict_members: false,
        can_promote_members: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
      });

      await logModAction(
        sessionId,
        ctx.chat!.id.toString(),
        'demote',
        target.userId.toString(),
        ctx.from!.id.toString(),
        'Demoted from admin',
      );

      await ctx.reply(
        `⬇️ User <code>${target.userId}</code> has been demoted.`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Could not demote user. Make sure I have sufficient permissions.');
    }
  });

  bot.command('settitle', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const target = resolveTarget(ctx);
    if (!target.userId || !target.reason) {
      await ctx.reply('Usage: /settitle <reply|@username|userid> <title>');
      return;
    }

    try {
      await ctx.setChatAdministratorCustomTitle(target.userId, target.reason);
      await ctx.reply(
        `✅ Custom title set to "${escapeHtml(target.reason)}" for user <code>${target.userId}</code>.`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Could not set title. User must be an admin promoted by me.');
    }
  });
}
