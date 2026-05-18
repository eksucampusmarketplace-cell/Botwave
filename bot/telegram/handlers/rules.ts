/**
 * Rules handler: set and display group rules (editable text).
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerRulesHandlers(bot: Bot, sessionId: string): void {
  bot.command('rules', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
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

  // /privaterules <yes/no> — Send rules via PM instead of group
  bot.command('privaterules', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { private_rules: true } as Record<string, unknown>);
      await ctx.reply('✅ Rules will be sent via PM.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { private_rules: false } as Record<string, unknown>);
      await ctx.reply('✅ Rules will be sent in the group.');
    } else {
      await ctx.reply('Usage: /privaterules <yes/no/on/off>');
    }
  });

  // /resetrules — Reset rules to empty
  bot.command('resetrules', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { rules_text: null });
    await ctx.reply('✅ Rules have been reset.');
  });

  // /setrulesbutton <text> — Set custom text for rules button
  bot.command('setrulesbutton', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /setrulesbutton <button text>'); return; }
    await updateTelegramConfig(sessionId, { rules_button_text: text } as Record<string, unknown>);
    await ctx.reply(`✅ Rules button text set to: ${escapeHtml(text)}`, { parse_mode: 'HTML' });
  });

  // /resetrulesbutton — Reset rules button text to default
  bot.command('resetrulesbutton', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { rules_button_text: null } as Record<string, unknown>);
    await ctx.reply('✅ Rules button text reset to default.');
  });
}
