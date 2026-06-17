/**
 * Sudo User Management - /addsudo, /delsudo, /sudolist commands.
 * Bot owner only.
 */

import { Bot } from 'grammy';
import { requireOwnerOrSudo, addSudoUser, removeSudoUser, getSudoUsers, invalidateSudoCache } from '../utils/permissions';
import { resolveTarget } from '../utils/resolve';
import { escapeHtml } from '../utils/format';

export function registerSudoHandlers(bot: Bot, sessionId: string): void {
  bot.command('addsudo', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /addsudo [reply/@user/id]');
      return;
    }

    const ok = await addSudoUser(sessionId, targetId.toString());
    if (ok) {
      const name = user ? escapeHtml(user.first_name) : `User ${targetId}`;
      await ctx.reply(`✅ ${name} is now a sudo user.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('❌ Failed to add sudo user.');
    }
  });

  bot.command('delsudo', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /delsudo [reply/@user/id]');
      return;
    }

    const ok = await removeSudoUser(sessionId, targetId.toString());
    if (ok) {
      const name = user ? escapeHtml(user.first_name) : `User ${targetId}`;
      await ctx.reply(`✅ ${name} removed from sudo users.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('❌ Failed to remove sudo user.');
    }
  });

  bot.command('sudolist', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const sudos = await getSudoUsers(sessionId);
    if (sudos.length === 0) {
      await ctx.reply('No sudo users configured.');
      return;
    }

    let text = '👑 <b>Sudo Users</b>\n\n';
    for (const uid of sudos) {
      text += `• <code>${uid}</code>\n`;
    }
    await ctx.reply(text, { parse_mode: 'HTML' });
  });
}
