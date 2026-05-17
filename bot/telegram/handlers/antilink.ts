/**
 * Anti-link handler: auto-delete messages with links and optionally warn/mute.
 */

import { Bot, Context } from 'grammy';
import { requireAdmin, isElevated } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';

const URL_REGEX = /https?:\/\/[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+/i;

export function registerAntilinkHandlers(bot: Bot, sessionId: string): void {
  bot.command('antilink', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    const config = await getTelegramConfig(sessionId);

    if (arg === 'on') {
      await updateTelegramConfig(sessionId, { antilink_enabled: true });
      await ctx.reply('✅ Anti-link enabled. Links from non-admins will be deleted.');
    } else if (arg === 'off') {
      await updateTelegramConfig(sessionId, { antilink_enabled: false });
      await ctx.reply('✅ Anti-link disabled.');
    } else {
      const status = config.antilink_enabled ? 'ON' : 'OFF';
      const whitelist = (config.antilink_whitelist || []).join(', ') || 'None';
      await ctx.reply(
        `🔗 <b>Anti-Link Settings</b>\n\n` +
        `Status: ${status}\n` +
        `Whitelisted domains: ${whitelist}\n\n` +
        `Usage:\n` +
        `/antilink on - Enable\n` +
        `/antilink off - Disable\n` +
        `/whitelist add <domain> - Whitelist a domain\n` +
        `/whitelist del <domain> - Remove from whitelist`,
        { parse_mode: 'HTML' },
      );
    }
  });

  bot.command('whitelist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    const parts = text.split(/\s+/);
    const action = parts[0]?.toLowerCase();
    const domain = parts[1]?.toLowerCase();

    if (!action || !domain || !['add', 'del'].includes(action)) {
      await ctx.reply('Usage: /whitelist add|del <domain>');
      return;
    }

    const config = await getTelegramConfig(sessionId);
    let whitelist = config.antilink_whitelist || [];

    if (action === 'add') {
      if (!whitelist.includes(domain)) {
        whitelist.push(domain);
      }
      await updateTelegramConfig(sessionId, { antilink_whitelist: whitelist });
      await ctx.reply(`✅ <code>${domain}</code> added to whitelist.`, { parse_mode: 'HTML' });
    } else {
      whitelist = whitelist.filter(d => d !== domain);
      await updateTelegramConfig(sessionId, { antilink_whitelist: whitelist });
      await ctx.reply(`✅ <code>${domain}</code> removed from whitelist.`, { parse_mode: 'HTML' });
    }
  });
}

/**
 * Middleware-style link check. Returns true if the message should be deleted.
 */
export async function checkAntilink(
  ctx: Context,
  sessionId: string,
): Promise<boolean> {
  if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') return false;
  if (!ctx.message?.text) return false;

  const config = await getTelegramConfig(sessionId);
  if (!config.antilink_enabled) return false;

  // Admins/sudo/owners bypass
  const elevated = await isElevated(ctx, sessionId);
  if (elevated) return false;

  if (!URL_REGEX.test(ctx.message.text)) return false;

  // Check whitelist
  const whitelist = config.antilink_whitelist || [];
  if (whitelist.length > 0) {
    const text = ctx.message.text.toLowerCase();
    const isWhitelisted = whitelist.some(domain => text.includes(domain));
    if (isWhitelisted) return false;
  }

  try {
    await ctx.deleteMessage();
    await ctx.reply(`⚠️ ${ctx.from.first_name}, links are not allowed in this group.`);
    return true;
  } catch {
    return false;
  }
}
