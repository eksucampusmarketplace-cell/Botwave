/**
 * Info commands: id, info, chatinfo, admins, setowner, addsudo, delsudo, sudolist.
 */

import { Bot } from 'grammy';
import { mentionUser, mentionById, escapeHtml } from '../utils/format';
import {
  requireAdmin,
  requireOwnerOrSudo,
  isOwner,
  isSudoUser,
  addSudoUser,
  removeSudoUser,
  getSudoUsers,
} from '../utils/permissions';
import { resolveTarget } from '../utils/resolve';
import { updateTelegramConfig } from '../utils/db';

export function registerInfoHandlers(bot: Bot, sessionId: string): void {
  bot.command('id', async (ctx) => {
    if (!ctx.from) return;

    const replied = ctx.message?.reply_to_message?.from;
    if (replied) {
      await ctx.reply(
        `👤 <b>${escapeHtml(replied.first_name)}</b>\n` +
        `ID: <code>${replied.id}</code>\n` +
        `Username: ${replied.username ? '@' + replied.username : 'N/A'}`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    let msg = `👤 <b>Your Info</b>\n` +
      `ID: <code>${ctx.from.id}</code>\n` +
      `Username: ${ctx.from.username ? '@' + ctx.from.username : 'N/A'}`;

    if (ctx.chat && ctx.chat.type !== 'private') {
      msg += `\n\n💬 <b>Chat Info</b>\n` +
        `Chat ID: <code>${ctx.chat.id}</code>\n` +
        `Title: ${escapeHtml(ctx.chat.title || '')}`;
    }
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.command(['chatinfo', 'info'], async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group chat.');
      return;
    }

    let memberCount = 0;
    try {
      memberCount = await ctx.getChatMemberCount();
    } catch { /* ignore */ }

    await ctx.reply(
      `💬 <b>Chat Info</b>\n\n` +
      `Title: ${escapeHtml(ctx.chat.title || '')}\n` +
      `Chat ID: <code>${ctx.chat.id}</code>\n` +
      `Type: ${ctx.chat.type}\n` +
      `Members: ${memberCount}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('admins', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group chat.');
      return;
    }

    try {
      const admins = await ctx.getChatAdministrators();
      const list = admins.map(a => {
        const name = escapeHtml(a.user.first_name);
        const tag = a.status === 'creator' ? '👑' : '⭐';
        return `${tag} ${mentionById(a.user.id, name)}`;
      }).join('\n');
      await ctx.reply(`👑 <b>Admins</b>\n\n${list}`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not fetch admin list.');
    }
  });

  // Owner commands
  bot.command('setowner', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const target = resolveTarget(ctx);
    if (!target.userId) {
      await ctx.reply('Usage: /setowner <reply|@username|userid>');
      return;
    }

    await updateTelegramConfig(sessionId, { owner_user_id: target.userId.toString() });
    await ctx.reply(`✅ Owner set to user ID <code>${target.userId}</code>.`, { parse_mode: 'HTML' });
  });

  // Sudo commands
  bot.command('addsudo', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const target = resolveTarget(ctx);
    if (!target.userId) {
      await ctx.reply('Usage: /addsudo <reply|@username|userid>');
      return;
    }

    const ok = await addSudoUser(sessionId, target.userId.toString());
    if (ok) {
      await ctx.reply(`✅ User <code>${target.userId}</code> added as sudo.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('❌ Failed to add sudo user.');
    }
  });

  bot.command('delsudo', async (ctx) => {
    if (!(await requireOwnerOrSudo(ctx, sessionId))) return;

    const target = resolveTarget(ctx);
    if (!target.userId) {
      await ctx.reply('Usage: /delsudo <reply|@username|userid>');
      return;
    }

    const ok = await removeSudoUser(sessionId, target.userId.toString());
    if (ok) {
      await ctx.reply(`✅ User <code>${target.userId}</code> removed from sudo.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('❌ Failed to remove sudo user.');
    }
  });

  bot.command('sudolist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const sudos = await getSudoUsers(sessionId);
    if (sudos.length === 0) {
      await ctx.reply('📋 No sudo users configured.');
      return;
    }

    const list = sudos.map(id => `• <code>${id}</code>`).join('\n');
    await ctx.reply(`🔑 <b>Sudo Users</b>\n\n${list}`, { parse_mode: 'HTML' });
  });
}
