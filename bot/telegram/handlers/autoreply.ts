/**
 * Auto-reply system: enhanced keyword triggers using the existing filters table.
 * /addautoreply <keyword> | <response>
 * /delautoreply <keyword>
 * /autoreplies — list all
 * /clearautoreplies — remove all
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { escapeHtml } from '../utils/format';
import { addFilter, removeFilter, getFilters } from '../utils/db';

export function registerAutoReplyHandlers(bot: Bot, sessionId: string): void {
  bot.command('addautoreply', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const text = (ctx.match?.toString() || '').trim();
    const sepIdx = text.indexOf('|');
    if (sepIdx === -1 || !text) {
      await ctx.reply(
        '📝 <b>Add Auto-Reply</b>\n\n' +
        'Usage: /addautoreply keyword | response\n\n' +
        'Example: /addautoreply hello | Hi there! Welcome!\n' +
        'Example: /addautoreply price | Our prices start at $10\n\n' +
        '<i>Triggers when someone sends a message containing the keyword.</i>',
        { parse_mode: 'HTML' },
      );
      return;
    }
    const keyword = text.slice(0, sepIdx).trim().toLowerCase();
    const response = text.slice(sepIdx + 1).trim();
    if (!keyword || !response) {
      await ctx.reply('Both keyword and response are required.');
      return;
    }
    if (keyword.length > 100) {
      await ctx.reply('Keyword too long. Max 100 characters.');
      return;
    }
    if (response.length > 2000) {
      await ctx.reply('Response too long. Max 2000 characters.');
      return;
    }

    const chatId = ctx.chat!.id.toString();
    await addFilter(sessionId, chatId, keyword, response);
    await ctx.reply(
      `✅ Auto-reply added!\n\n<b>Trigger:</b> ${escapeHtml(keyword)}\n<b>Response:</b> ${escapeHtml(response.slice(0, 200))}${response.length > 200 ? '...' : ''}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('delautoreply', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const keyword = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!keyword) {
      await ctx.reply('Usage: /delautoreply <keyword>');
      return;
    }
    const chatId = ctx.chat!.id.toString();
    await removeFilter(sessionId, chatId, keyword);
    await ctx.reply(`🗑️ Auto-reply removed: <b>${escapeHtml(keyword)}</b>`, { parse_mode: 'HTML' });
  });

  bot.command('autoreplies', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const filters = await getFilters(sessionId, chatId);
    if (!filters || filters.length === 0) {
      await ctx.reply('📝 No auto-replies set.\n\nUse /addautoreply keyword | response to add one.');
      return;
    }
    const list = filters.map((f, i) =>
      `${i + 1}. <b>${escapeHtml(f.keyword)}</b> → ${escapeHtml((f.response || '').slice(0, 60))}${(f.response || '').length > 60 ? '...' : ''}`
    ).join('\n');
    await ctx.reply(`📝 <b>Auto-Replies / Filters (${filters.length})</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  bot.command('clearautoreplies', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const filters = await getFilters(sessionId, chatId);
    if (!filters || filters.length === 0) {
      await ctx.reply('No auto-replies to clear.');
      return;
    }
    for (const f of filters) {
      await removeFilter(sessionId, chatId, f.keyword);
    }
    await ctx.reply(`🗑️ Cleared ${filters.length} auto-replies.`);
  });
}
