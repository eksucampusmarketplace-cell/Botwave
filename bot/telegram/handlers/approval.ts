/**
 * Approval — /approval, /approve, /unapprove, /approved, /unapproveall
 * Approve trustworthy users to bypass locks, blocklists, and antiflood.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import {
  approveUser,
  unapproveUser,
  isApprovedUser,
  getApprovedUsers,
  unapproveAllUsers,
} from '../utils/db';
import { escapeHtml } from '../utils/format';

function resolveTarget(ctx: { message?: { reply_to_message?: { from?: { id: number; first_name: string; username?: string } } }; match?: string | RegExpMatchArray }): { id: string; name: string } | null {
  const reply = ctx.message?.reply_to_message?.from;
  if (reply) return { id: reply.id.toString(), name: reply.first_name };
  const arg = (ctx.match?.toString() || '').trim();
  if (arg) return { id: arg.replace(/^@/, ''), name: arg };
  return null;
}

export function registerApprovalHandlers(bot: Bot, sessionId: string): void {
  // /approval — Check a user's approval status
  bot.command('approval', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') return;
    const target = resolveTarget(ctx);
    if (!target) {
      if (!ctx.from) return;
      const approved = await isApprovedUser(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
      await ctx.reply(approved ? '✅ You are an approved user.' : '❌ You are not approved.');
      return;
    }
    const approved = await isApprovedUser(sessionId, ctx.chat.id.toString(), target.id);
    await ctx.reply(
      approved
        ? `✅ ${escapeHtml(target.name)} is an approved user.`
        : `❌ ${escapeHtml(target.name)} is not approved.`,
      { parse_mode: 'HTML' },
    );
  });

  // /approve — Approve a user (admin only)
  bot.command('approve', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat || !ctx.from) return;
    const target = resolveTarget(ctx);
    if (!target) {
      await ctx.reply('Usage: /approve <reply/username/userid>');
      return;
    }
    await approveUser(sessionId, ctx.chat.id.toString(), target.id, ctx.from.id.toString());
    await ctx.reply(
      `✅ ${escapeHtml(target.name)} has been approved. Locks, blocklists, and antiflood won't apply to them.`,
      { parse_mode: 'HTML' },
    );
  });

  // /unapprove — Unapprove a user (admin only)
  bot.command('unapprove', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat) return;
    const target = resolveTarget(ctx);
    if (!target) {
      await ctx.reply('Usage: /unapprove <reply/username/userid>');
      return;
    }
    await unapproveUser(sessionId, ctx.chat.id.toString(), target.id);
    await ctx.reply(
      `✅ ${escapeHtml(target.name)} has been unapproved. They are now subject to locks, blocklists, and antiflood.`,
      { parse_mode: 'HTML' },
    );
  });

  // /approved — List all approved users (admin only)
  bot.command('approved', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat) return;
    const users = await getApprovedUsers(sessionId, ctx.chat.id.toString());
    if (users.length === 0) {
      await ctx.reply('No approved users in this chat.');
      return;
    }
    const list = users
      .map((u, i) => `${i + 1}. <code>${escapeHtml(u.user_id)}</code> (by ${escapeHtml(u.approved_by)})`)
      .join('\n');
    await ctx.reply(`👥 <b>Approved Users</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /unapproveall — Unapprove ALL users (admin only)
  bot.command('unapproveall', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat) return;
    await unapproveAllUsers(sessionId, ctx.chat.id.toString());
    await ctx.reply('✅ All approved users have been removed. This cannot be undone.');
  });
}
