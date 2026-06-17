/**
 * Anti-Raid system - automatic detection and response to mass-join raids.
 * Tracks join rate per group and triggers protective measures.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig, trackJoin, getRecentJoinCount, startRaidSession, endRaidSession, isRaidActive } from '../utils/db';

export function registerAntiraidHandlers(bot: Bot, sessionId: string): void {
  // /antiraid - show or toggle anti-raid settings
  bot.command('antiraid', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.match?.toString() || '').trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase();

    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());

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
        `/antiraid on/off - Enable/disable\n` +
        `/antiraid threshold <n> - Set joins/min threshold\n` +
        `/antiraid mode <restrict|ban|captcha|lockdown>\n` +
        `/antiraid duration <mins> - Set auto-end duration`,
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

  // /raidtime - View or set the desired antiraid duration
  bot.command('raidtime', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `⏱ <b>Raid Time</b>\n\nCurrent: ${config.antiraid_time || '6h'}\n\nUsage: /raidtime <time>\nExample: /raidtime 3h`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    await updateTelegramConfig(sessionId, { antiraid_time: arg });
    await ctx.reply(`✅ Antiraid duration set to: ${arg}`);
  });

  // /raidactiontime - View or set how long new joiners are temp-banned
  bot.command('raidactiontime', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `⏱ <b>Raid Action Time</b>\n\nCurrent: ${config.antiraid_action_time || '1h'}\n\nUsage: /raidactiontime <time>\nExample: /raidactiontime 2h`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    await updateTelegramConfig(sessionId, { antiraid_action_time: arg });
    await ctx.reply(`✅ Raid action time set to: ${arg}`);
  });

  // /autoantiraid - Set joins per minute to auto-enable antiraid
  bot.command('autoantiraid', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['0', 'off', 'no'].includes(arg)) {
      await updateTelegramConfig(sessionId, { auto_antiraid_threshold: 0 });
      await ctx.reply('✅ Automatic antiraid disabled.');
      return;
    }
    const num = parseInt(arg, 10);
    if (!num || num < 1) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `🛡️ <b>Auto AntiRaid</b>\n\n` +
        `Current threshold: ${config.auto_antiraid_threshold || 0} joins/min (${config.auto_antiraid_threshold ? 'Enabled' : 'Disabled'})\n\n` +
        `Usage: /autoantiraid <number/off/no>\nExample: /autoantiraid 15`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    await updateTelegramConfig(sessionId, { auto_antiraid_threshold: num });
    await ctx.reply(`✅ Auto antiraid will trigger if over ${num} users join in under a minute.`);
  });

  // /raid on|off - manually trigger or end raid mode
  bot.command('raid', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('⚠️ This command can only be used in group chats.');
      return;
    }
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
  const config = await getGroupConfig(sessionId, chatId);
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
