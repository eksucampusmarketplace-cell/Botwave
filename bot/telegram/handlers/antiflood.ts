/**
 * Anti-flood handler: auto-mute users who send messages too quickly.
 */

import { Bot, Context } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { mentionUser } from '../utils/format';
import { logModAction } from '../utils/db';

// In-memory flood tracker: sessionId:chatId:userId -> timestamps
const floodTracker = new Map<string, number[]>();

export function registerAntifloodHandlers(bot: Bot, sessionId: string): void {
  bot.command('antiflood', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    const config = await getTelegramConfig(sessionId);

    if (arg === 'on') {
      await updateTelegramConfig(sessionId, { antiflood_enabled: true });
      await ctx.reply('✅ Anti-flood enabled.');
    } else if (arg === 'off') {
      await updateTelegramConfig(sessionId, { antiflood_enabled: false });
      await ctx.reply('✅ Anti-flood disabled.');
    } else if (arg && !isNaN(parseInt(arg, 10))) {
      const limit = parseInt(arg, 10);
      if (limit < 2 || limit > 100) {
        await ctx.reply('❌ Limit must be between 2 and 100.');
        return;
      }
      await updateTelegramConfig(sessionId, { antiflood_max_per_min: limit });
      await ctx.reply(`✅ Anti-flood limit set to ${limit} messages/minute.`);
    } else {
      const status = config.antiflood_enabled ? 'ON' : 'OFF';
      await ctx.reply(
        `🌊 <b>Anti-Flood Settings</b>\n\n` +
        `Status: ${status}\n` +
        `Limit: ${config.antiflood_max_per_min} messages/minute\n\n` +
        `Usage:\n` +
        `/antiflood on - Enable\n` +
        `/antiflood off - Disable\n` +
        `/antiflood <number> - Set limit`,
        { parse_mode: 'HTML' },
      );
    }
  });
}

/**
 * Middleware-style flood check. Returns true if the user should be muted.
 */
export async function checkFlood(
  ctx: Context,
  sessionId: string,
): Promise<boolean> {
  if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') return false;

  const config = await getTelegramConfig(sessionId);
  if (!config.antiflood_enabled) return false;

  const key = `${sessionId}:${ctx.chat.id}:${ctx.from.id}`;
  const now = Date.now();
  const window = 60_000; // 1 minute

  let timestamps = floodTracker.get(key) || [];
  timestamps.push(now);
  timestamps = timestamps.filter(t => now - t < window);
  floodTracker.set(key, timestamps);

  if (timestamps.length > config.antiflood_max_per_min) {
    floodTracker.delete(key);

    try {
      await ctx.restrictChatMember(ctx.from.id, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      }, {
        until_date: Math.floor(Date.now() / 1000) + 300, // 5 min mute
      });

      await logModAction(
        sessionId,
        ctx.chat.id.toString(),
        'flood_mute',
        ctx.from.id.toString(),
        ctx.me.id.toString(),
        'Anti-flood triggered',
      );

      await ctx.reply(
        `🌊 ${ctx.from.first_name} has been muted for 5 minutes (flood detected).`,
      );
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
