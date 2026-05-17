/**
 * Anti-Raid system — automatic detection and response to mass-join raids.
 * Tracks join rate per group and triggers protective measures.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import {
  getTelegramConfig,
  updateTelegramConfig,
  trackJoin,
  getRecentJoinCount,
  startRaidSession,
  endRaidSession,
  isRaidActive,
} from '../utils/db';

export function registerAntiraidHandlers(bot: Bot, sessionId: string): void {
  // /antiraid — show or toggle anti-raid settings
  bot.command('antiraid', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.match?.toString() || '').trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase();

    const config = await getTelegramConfig(sessionId);

    if (!subcommand || subcommand === '') {
      const raidActive = await isRaidActive(sessionId, ctx.chat.id.toString());
      await ctx.reply(
        `🛡️ <b>Anti-Raid Settings</b>\n\n` +
        `Status: ${config.antiraid_enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `Threshold: ${config.antiraid_threshold} joins/min\n` +
        `Mode: ${config.antiraid_mode}\n` +
        `Duration: ${config.antiraid_duration_mins} minutes\n` +
        `Raid Active: ${raidActive ? '⚠️ YES' : 'No'}\n\n` +
        `<b>Commands:</b>\n` +
        `/antiraid on/off — Enable/disable\n` +
        `/antiraid threshold <n> — Set joins/min threshold\n` +
        `/antiraid mode <restrict|ban|captcha|lockdown>\n` +
        `/antiraid duration <mins> — Set auto-end duration`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (subcommand === 'on') {
      await updateTelegramConfig(sessionId, { antiraid_enabled: true });
      await ctx.reply('✅ Anti-raid protection enabled.');
    } else if (subcommand === 'off') {
      await updateTelegramConfig(sessionId, { antiraid_enabled: false });
      await ctx.reply('❌ Anti-raid protection disabled.');
    } else if (subcommand === 'threshold') {
      const val = parseInt(args[1], 10);
      if (!val || val < 1) {
        await ctx.reply('Usage: /antiraid threshold <number> (e.g., 15)');
        return;
      }
      await updateTelegramConfig(sessionId, { antiraid_threshold: val });
      await ctx.reply(`✅ Anti-raid threshold set to ${val} joins/min.`);
    } else if (subcommand === 'mode') {
      const validModes = ['restrict', 'ban', 'captcha', 'lockdown'];
      const mode = args[1]?.toLowerCase();
      if (!mode || !validModes.includes(mode)) {
        await ctx.reply(`Usage: /antiraid mode <${validModes.join('|')}>`);
        return;
      }
      await updateTelegramConfig(sessionId, { antiraid_mode: mode });
      await ctx.reply(`✅ Anti-raid mode set to: ${mode}`);
    } else if (subcommand === 'duration') {
      const val = parseInt(args[1], 10);
      if (!val || val < 1) {
        await ctx.reply('Usage: /antiraid duration <minutes>');
        return;
      }
      await updateTelegramConfig(sessionId, { antiraid_duration_mins: val });
      await ctx.reply(`✅ Anti-raid auto-end duration set to ${val} minutes.`);
    } else {
      await ctx.reply('Unknown subcommand. Use /antiraid to see all options.');
    }
  });

  // /raid on|off — manually trigger or end raid mode
  bot.command('raid', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (arg === 'on') {
      await startRaidSession(sessionId, ctx.chat.id.toString(), 'manual');
      await ctx.reply('⚠️ <b>RAID MODE ACTIVATED</b>\n\nNew members will be restricted.', { parse_mode: 'HTML' });
    } else if (arg === 'off') {
      await endRaidSession(sessionId, ctx.chat.id.toString());
      await ctx.reply('✅ Raid mode deactivated.');
    } else {
      await ctx.reply('Usage: /raid on|off');
    }
  });
}

/**
 * Check new member joins for raid detection. Called from factory.ts.
 */
export async function checkRaid(
  bot: Bot,
  sessionId: string,
  chatId: string,
  userId: number,
): Promise<boolean> {
  const config = await getTelegramConfig(sessionId);
  if (!config.antiraid_enabled) return false;

  await trackJoin(sessionId, chatId, userId.toString());

  const raidActive = await isRaidActive(sessionId, chatId);

  if (!raidActive) {
    const joinCount = await getRecentJoinCount(sessionId, chatId);
    if (joinCount >= config.antiraid_threshold) {
      await startRaidSession(sessionId, chatId, 'auto');
      try {
        await bot.api.sendMessage(
          Number(chatId),
          `⚠️ <b>RAID DETECTED!</b>\n\n` +
          `${joinCount} joins in the last minute. Anti-raid mode activated.\n` +
          `Mode: ${config.antiraid_mode}\n` +
          `Auto-end in ${config.antiraid_duration_mins} minutes.`,
          { parse_mode: 'HTML' },
        );
      } catch {}

      // Auto-end after duration
      setTimeout(async () => {
        await endRaidSession(sessionId, chatId);
        try {
          await bot.api.sendMessage(
            Number(chatId),
            '✅ Raid mode has been automatically deactivated.',
          );
        } catch {}
      }, config.antiraid_duration_mins * 60_000);
    } else {
      return false;
    }
  }

  // Apply raid protection to new member
  try {
    switch (config.antiraid_mode) {
      case 'ban':
        await bot.api.banChatMember(Number(chatId), userId);
        break;
      case 'restrict':
        await bot.api.restrictChatMember(Number(chatId), userId, {
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
        });
        break;
      case 'lockdown':
        await bot.api.setChatPermissions(Number(chatId), {
          can_send_messages: false,
          can_invite_users: false,
        });
        break;
      // captcha mode: handled by existing captcha handler
    }
  } catch {}

  return true;
}
