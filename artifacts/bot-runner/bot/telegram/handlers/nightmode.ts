/**
 * Night mode handler: auto-lock the group during specified hours.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';

export function registerNightmodeHandlers(bot: Bot, sessionId: string): void {
  bot.command('nightmode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());

    if (arg === 'on') {
      await updateTelegramConfig(sessionId, { night_mode_enabled: true });
      const start = config.night_mode_start || '22:00';
      const end = config.night_mode_end || '06:00';
      await ctx.reply(`🌙 Night mode enabled (${start} - ${end}).`);
    } else if (arg === 'off') {
      await updateTelegramConfig(sessionId, { night_mode_enabled: false });
      await ctx.reply('☀️ Night mode disabled.');
    } else if (arg.includes('-')) {
      const [start, end] = arg.split('-').map(s => s.trim());
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        await ctx.reply('Usage: /nightmode HH:MM-HH:MM (e.g., 22:00-06:00)');
        return;
      }
      await updateTelegramConfig(sessionId, {
        night_mode_enabled: true,
        night_mode_start: start,
        night_mode_end: end,
      });
      await ctx.reply(`🌙 Night mode set: ${start} - ${end}.`);
    } else {
      const status = config.night_mode_enabled ? 'ON' : 'OFF';
      const start = config.night_mode_start || '22:00';
      const end = config.night_mode_end || '06:00';
      await ctx.reply(
        `🌙 <b>Night Mode Settings</b>\n\n` +
        `Status: ${status}\n` +
        `Hours: ${start} - ${end}\n\n` +
        `Usage:\n` +
        `/nightmode on - Enable\n` +
        `/nightmode off - Disable\n` +
        `/nightmode 22:00-06:00 - Set hours`,
        { parse_mode: 'HTML' },
      );
    }
  });
}

/**
 * Run night mode check for a session: lock/unlock groups based on schedule.
 * Called every 60 seconds from TelegramBotManager.
 */
export async function checkNightMode(bot: Bot, sessionId: string): Promise<void> {
  const config = await getGroupConfig(sessionId, 'global');
  if (!config.night_mode_enabled) return;

  const active = isNightModeActive(config);

  // Get groups from config (stored as array of chat IDs)
  const chatIds: number[] = config.night_mode_groups || [];
  if (chatIds.length === 0) return;

  for (const chatId of chatIds) {
    try {
      await bot.api.setChatPermissions(chatId, {
        can_send_messages: !active,
        can_send_audios: !active,
        can_send_documents: !active,
        can_send_photos: !active,
        can_send_videos: !active,
        can_send_video_notes: !active,
        can_send_voice_notes: !active,
        can_send_polls: !active,
        can_send_other_messages: !active,
      });
    } catch {
      // Group may not exist or bot may not have permissions
    }
  }
}

/**
 * Check if night mode is active. Returns true if group should be locked.
 */
export function isNightModeActive(config: {
  night_mode_enabled: boolean;
  night_mode_start: string | null;
  night_mode_end: string | null;
}): boolean {
  if (!config.night_mode_enabled) return false;

  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = (config.night_mode_start || '22:00').split(':').map(Number);
  const [endH, endM] = (config.night_mode_end || '06:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Crosses midnight (e.g., 22:00-06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
