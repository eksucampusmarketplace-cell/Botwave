/**
 * Rules handler: set and display group rules (editable text).
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerRulesHandlers(bot: Bot, sessionId: string): void {
  bot.command('rules', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    const rules = config.rules_text;

    if (!rules) {
      await ctx.reply('📜 No rules have been set for this group.\nAdmins can use /setrules to set them.');
      return;
    }

    await ctx.reply(`📜 <b>Group Rules</b>\n\n${rules}`, { parse_mode: 'HTML' });
  });

  bot.command('setrules', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply('Usage: /setrules <rules text>\n\nYou can use HTML formatting.');
      return;
    }

    await updateTelegramConfig(sessionId, { rules_text: text });
    await ctx.reply('✅ Rules updated.');
  });

  bot.command('clearrules', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    await updateTelegramConfig(sessionId, { rules_text: null });
    await ctx.reply('✅ Rules cleared.');
  });
}
