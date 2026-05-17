/**
 * Keyword filter / auto-reply handlers for groups.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { addFilter, removeFilter, getFilters } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerFiltersHandlers(bot: Bot, sessionId: string): void {
  bot.command('addfilter', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    const sepIndex = text.indexOf(' ');
    if (sepIndex === -1) {
      await ctx.reply('Usage: /addfilter <keyword> <response>');
      return;
    }

    const keyword = text.slice(0, sepIndex).toLowerCase();
    const response = text.slice(sepIndex + 1).trim();
    if (!response) {
      await ctx.reply('Usage: /addfilter <keyword> <response>');
      return;
    }

    await addFilter(sessionId, ctx.chat!.id.toString(), keyword, response);
    await ctx.reply(`✅ Filter <b>${escapeHtml(keyword)}</b> added.`, { parse_mode: 'HTML' });
  });

  bot.command('delfilter', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const keyword = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!keyword) {
      await ctx.reply('Usage: /delfilter <keyword>');
      return;
    }

    const deleted = await removeFilter(sessionId, ctx.chat!.id.toString(), keyword);
    if (deleted) {
      await ctx.reply(`✅ Filter <b>${escapeHtml(keyword)}</b> removed.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ No filter named "${escapeHtml(keyword)}".`, { parse_mode: 'HTML' });
    }
  });

  bot.command('filters', async (ctx) => {
    const filters = await getFilters(sessionId, ctx.chat!.id.toString());
    if (filters.length === 0) {
      await ctx.reply('📋 No filters set in this chat.');
      return;
    }

    const list = filters.map(f => `• <code>${escapeHtml(f.keyword)}</code>`).join('\n');
    await ctx.reply(`📋 <b>Active Filters</b>\n\n${list}`, { parse_mode: 'HTML' });
  });
}

/**
 * Middleware-style filter checker — call this from the main message handler.
 */
export async function checkFilters(
  bot: Bot,
  sessionId: string,
  chatId: string,
  text: string,
): Promise<string | null> {
  const filters = await getFilters(sessionId, chatId);
  const lowerText = text.toLowerCase();

  for (const filter of filters) {
    if (filter.is_regex) {
      try {
        const regex = new RegExp(filter.keyword, 'i');
        if (regex.test(text)) return filter.response;
      } catch { /* skip invalid regex */ }
    } else {
      if (lowerText.includes(filter.keyword)) return filter.response;
    }
  }
  return null;
}
