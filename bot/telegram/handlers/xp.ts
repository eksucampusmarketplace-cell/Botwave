/**
 * XP / leveling system: track messages, award XP, show leaderboard.
 */

import { Bot, Context } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig, awardXp, getXp, getXpLeaderboard } from '../utils/db';
import { escapeHtml, mentionById } from '../utils/format';

export function registerXpHandlers(bot: Bot, sessionId: string): void {
  bot.command('xp', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (arg === 'on') {
      await updateTelegramConfig(sessionId, { xp_enabled: true });
      await ctx.reply('✅ XP system enabled. Members earn XP for messages.');
    } else if (arg === 'off') {
      await updateTelegramConfig(sessionId, { xp_enabled: false });
      await ctx.reply('✅ XP system disabled.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      const status = config.xp_enabled ? 'ON' : 'OFF';
      await ctx.reply(
        `⭐ <b>XP System</b>\n\n` +
        `Status: ${status}\n\n` +
        `Usage:\n` +
        `/xp on - Enable XP tracking\n` +
        `/xp off - Disable XP tracking\n` +
        `/level - Check your level\n` +
        `/leaderboard - View top members`,
        { parse_mode: 'HTML' },
      );
    }
  });

  bot.command('level', async (ctx) => {
    if (!ctx.from) return;

    const xpData = await getXp(sessionId, ctx.chat!.id.toString(), ctx.from.id.toString());
    if (!xpData) {
      await ctx.reply('You have no XP yet. Send messages to earn XP!');
      return;
    }

    const nextLevelXp = (xpData.level + 1) * 100;
    const progress = Math.floor((xpData.xp / nextLevelXp) * 100);

    await ctx.reply(
      `⭐ <b>${escapeHtml(ctx.from.first_name)}'s Level</b>\n\n` +
      `Level: ${xpData.level}\n` +
      `XP: ${xpData.xp} / ${nextLevelXp}\n` +
      `Progress: ${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))} ${progress}%\n` +
      `Streak: ${xpData.streak_days} days 🔥`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('leaderboard', async (ctx) => {
    const top = await getXpLeaderboard(sessionId, ctx.chat!.id.toString(), 10);
    if (top.length === 0) {
      await ctx.reply('📊 No XP data yet.');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((entry, i) => {
      const medal = medals[i] || `${i + 1}.`;
      return `${medal} <code>${entry.user_id}</code> — Level ${entry.level} (${entry.xp} XP)`;
    });

    await ctx.reply(
      `📊 <b>XP Leaderboard</b>\n\n${lines.join('\n')}`,
      { parse_mode: 'HTML' },
    );
  });
}

/**
 * Middleware: award XP for a message. Call from the main message handler.
 */
export async function processXp(
  ctx: Context,
  sessionId: string,
): Promise<void> {
  if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') return;

  const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
  if (!config.xp_enabled) return;

  const result = await awardXp(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
  if (result.leveledUp) {
    await ctx.reply(
      `🎉 ${ctx.from.first_name} leveled up to <b>Level ${result.level}</b>!`,
      { parse_mode: 'HTML' },
    );
  }
}
