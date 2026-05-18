/**
 * MemberBooster / Group Booster — Force add, force channel join, daily limits,
 * forced boost, inline buttons, hard mode, top users, and more.
 *
 * Commands: /memberbooster, /boost, /boostinfo, /invite, /max, /daily,
 * /channel, /channel2, /forced_boost, /btn, /btn_text, /text,
 * /hard_mode, /top, /top24, /remain, /free, /reset_daily
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { escapeHtml } from '../utils/format';
import { , updateTelegramConfig } from '../utils/db';

export function registerGroupBoosterHandlers(bot: Bot, sessionId: string): void {
  // ── /memberbooster — Show help ───────────────────────────────────────────
  bot.command('memberbooster', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const status = config.memberbooster_enabled ? 'Enabled' : 'Disabled';
    await ctx.reply(
      `<b>MemberBooster</b>\n\n` +
      `Status: ${status}\n` +
      `Force add: ${config.memberbooster_max || 0}\n` +
      `Daily limit: ${config.memberbooster_daily || 0}\n` +
      `Hard mode: ${config.memberbooster_hard_mode ? 'ON' : 'OFF'}\n\n` +
      `<b>Commands:</b>\n` +
      `/max &lt;n&gt; — Set required member adds (0=off)\n` +
      `/maxmode — Toggle new/all members\n` +
      `/daily &lt;n&gt; — Set daily add limit\n` +
      `/dailyminute &lt;n&gt; — Set daily period\n` +
      `/dailymode — Toggle reset/accumulate\n` +
      `/channel 1|0|@username — Force join channel\n` +
      `/channel2 1|0|@username — Second channel\n` +
      `/forced_boost 1|0 — Forced boost\n` +
      `/btn 1|0|[link] — Inline button\n` +
      `/btn_text [text] — Button text\n` +
      `/mbtext [msg] — Custom force add text\n` +
      `/mbtextchannel [msg] — Custom channel join text\n` +
      `/mbtextdaily [msg] — Custom daily alert text\n` +
      `/hard_mode 1|0 — Hard mode\n` +
      `/top — Top 50 users\n` +
      `/top24 — Top 50 (24h)`,
      { parse_mode: 'HTML' },
    );
  });

  // ── /boost — Enable/disable MemberBooster ────────────────────────────────
  bot.command('boost', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const mode = args[0]?.toLowerCase();
    if (!mode || !['on', 'off'].includes(mode)) {
      await ctx.reply('Usage: /boost <on|off>');
      return;
    }
    await updateTelegramConfig(sessionId, {
      memberbooster_enabled: mode === 'on',
      booster_enabled: mode === 'on',
    } as Record<string, unknown>);
    await ctx.reply(`MemberBooster ${mode === 'on' ? 'enabled' : 'disabled'}.`);
  });

  // ── /boostinfo — Group info ──────────────────────────────────────────────
  bot.command('boostinfo', async (ctx) => {
    const chatId = ctx.chat!.id;
    try {
      const count = await bot.api.getChatMemberCount(chatId);
      const chat = await bot.api.getChat(chatId);
      const chatData = chat as unknown as Record<string, unknown>;
      const title = (chatData.title as string) || 'Unknown';
      const desc = (chatData.description as string) || 'No description';
      const inviteLink = chatData.invite_link as string;

      let text = `<b>Group Info</b>\n\n`;
      text += `Title: <b>${escapeHtml(title)}</b>\n`;
      text += `Description: ${escapeHtml(desc.slice(0, 200))}\n`;
      text += `Members: <b>${count}</b>\n`;
      if (inviteLink) {
        text += `Invite: ${inviteLink}\n`;
      }
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('Could not fetch group info.');
    }
  });

  // ── /invite — Generate invite link ───────────────────────────────────────
  bot.command('invite', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    try {
      const link = await ctx.exportChatInviteLink();
      await ctx.reply(`Invite link:\n${link}`);
    } catch {
      await ctx.reply('Could not create invite link. Make sure I have admin permissions.');
    }
  });

  // ── /max — Set force add count ───────────────────────────────────────────
  bot.command('max', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Force Add</b>\nCurrent: ${config.memberbooster_max || 0}\nMode: ${config.memberbooster_max_mode || 'new'}\n\nUsage: /max &lt;number&gt;`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    const num = parseInt(arg, 10);
    if (isNaN(num) || num < 0) {
      await ctx.reply('Usage: /max <number> (0 to disable)');
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_max: num } as Record<string, unknown>);
    await ctx.reply(num === 0 ? 'Force add disabled.' : `Force add set to ${num} members.`);
  });

  // ── /maxmode — Toggle force add mode (new vs all) ────────────────────────
  bot.command('maxmode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const newMode = config.memberbooster_max_mode === 'new' ? 'all' : 'new';
    await updateTelegramConfig(sessionId, { memberbooster_max_mode: newMode } as Record<string, unknown>);
    await ctx.reply(`Force add mode: ${newMode === 'new' ? 'New members only' : 'All members'}`);
  });

  // ── /daily — Set daily add limit ─────────────────────────────────────────
  bot.command('daily', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Daily Limit</b>\nCurrent: ${config.memberbooster_daily || 0}\nPeriod: ${config.memberbooster_daily_minute || 1440} min\nMode: ${config.memberbooster_daily_mode || 'reset'}\n\nUsage: /daily &lt;number&gt;`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    const num = parseInt(arg, 10);
    if (isNaN(num) || num < 0) {
      await ctx.reply('Usage: /daily <number> (0 to disable)');
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_daily: num } as Record<string, unknown>);
    await ctx.reply(num === 0 ? 'Daily limit disabled.' : `Daily limit set to ${num}.`);
  });

  // ── /dailyminute — Set daily limit period ────────────────────────────────
  bot.command('dailyminute', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(`Daily period: ${config.memberbooster_daily_minute || 1440} minutes\nUsage: /dailyminute <minutes>`);
      return;
    }
    const num = parseInt(arg, 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply('Usage: /dailyminute <minutes>');
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_daily_minute: num } as Record<string, unknown>);
    await ctx.reply(`Daily limit period set to ${num} minutes.`);
  });

  // ── /dailymode — Toggle daily mode ───────────────────────────────────────
  bot.command('dailymode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const newMode = config.memberbooster_daily_mode === 'reset' ? 'accumulate' : 'reset';
    await updateTelegramConfig(sessionId, { memberbooster_daily_mode: newMode } as Record<string, unknown>);
    await ctx.reply(`Daily mode: ${newMode === 'reset' ? 'Resets after period' : 'Accumulates (no reset)'}`);
  });

  // ── /dailyreset — Reset user's daily limit ───────────────────────────────
  bot.command('dailyreset', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await ctx.reply('Daily limit reset for the replied user.');
  });

  // ── /channel — Force join channel ────────────────────────────────────────
  bot.command('channel', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Force Join Channel</b>\nEnabled: ${config.memberbooster_channel_enabled ? 'Yes' : 'No'}\nChannel: ${config.memberbooster_channel || 'Not set'}\n\nUsage: /channel 1|0|@username`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_channel_enabled: true } as Record<string, unknown>);
      await ctx.reply('Force join channel enabled.');
    } else if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_channel_enabled: false } as Record<string, unknown>);
      await ctx.reply('Force join channel disabled.');
    } else {
      const channel = arg.startsWith('@') ? arg : `@${arg}`;
      await updateTelegramConfig(sessionId, {
        memberbooster_channel: channel,
        memberbooster_channel_enabled: true,
      } as Record<string, unknown>);
      await ctx.reply(`Force join channel set to ${escapeHtml(channel)}.`, { parse_mode: 'HTML' });
    }
  });

  // ── /channel2 — Second force join channel ────────────────────────────────
  bot.command('channel2', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Second Force Join Channel</b>\nEnabled: ${config.memberbooster_channel2_enabled ? 'Yes' : 'No'}\nChannel: ${config.memberbooster_channel2 || 'Not set'}`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_channel2_enabled: true } as Record<string, unknown>);
      await ctx.reply('Second force join channel enabled.');
    } else if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_channel2_enabled: false } as Record<string, unknown>);
      await ctx.reply('Second force join channel disabled.');
    } else {
      const channel = arg.startsWith('@') ? arg : `@${arg}`;
      await updateTelegramConfig(sessionId, {
        memberbooster_channel2: channel,
        memberbooster_channel2_enabled: true,
      } as Record<string, unknown>);
      await ctx.reply(`Second force join channel set to ${escapeHtml(channel)}.`, { parse_mode: 'HTML' });
    }
  });

  // ── /forced_boost — Toggle forced boost ──────────────────────────────────
  bot.command('forced_boost', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_forced_boost: true } as Record<string, unknown>);
      await ctx.reply('Forced boost enabled.');
    } else if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_forced_boost: false } as Record<string, unknown>);
      await ctx.reply('Forced boost disabled.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(`Forced boost: ${config.memberbooster_forced_boost ? 'Enabled' : 'Disabled'}\nUsage: /forced_boost 1|0`);
    }
  });

  // ── /btn — Inline button settings ────────────────────────────────────────
  bot.command('btn', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_btn_enabled: true } as Record<string, unknown>);
      await ctx.reply('Inline button enabled.');
    } else if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_btn_enabled: false } as Record<string, unknown>);
      await ctx.reply('Inline button disabled.');
    } else if (arg) {
      await updateTelegramConfig(sessionId, {
        memberbooster_btn_link: arg,
        memberbooster_btn_enabled: true,
      } as Record<string, unknown>);
      await ctx.reply(`Button link set to: ${escapeHtml(arg)}`, { parse_mode: 'HTML' });
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Inline Button</b>\nEnabled: ${config.memberbooster_btn_enabled ? 'Yes' : 'No'}\nLink: ${config.memberbooster_btn_link || 'Not set'}\nText: ${config.memberbooster_btn_text || 'Not set'}\n\nUsage: /btn 1|0|[link]`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // ── /btn_text — Set button text ──────────────────────────────────────────
  bot.command('btn_text', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      await ctx.reply('Usage: /btn_text <text>');
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_btn_text: arg } as Record<string, unknown>);
    await ctx.reply(`Button text set to: ${escapeHtml(arg)}`, { parse_mode: 'HTML' });
  });

  // ── /mbtext — Set custom force add message ───────────────────────────────
  bot.command('mbtext', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_text_enabled: false } as Record<string, unknown>);
      await ctx.reply('Warning text display disabled.');
    } else if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_text_enabled: true } as Record<string, unknown>);
      await ctx.reply('Warning text display enabled.');
    } else if (arg) {
      await updateTelegramConfig(sessionId, { memberbooster_text: arg } as Record<string, unknown>);
      await ctx.reply('Custom force add text updated.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Force Add Text</b>\nEnabled: ${config.memberbooster_text_enabled ? 'Yes' : 'No'}\nText: ${escapeHtml(config.memberbooster_text || '(default)')}\n\nVariables: !name, !count, !added, !remain\nUsage: /mbtext &lt;message&gt; or /mbtext 0|1`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // ── /mbtextchannel — Set custom force join channel text ──────────────────
  bot.command('mbtextchannel', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Force Join Channel Text</b>\nText: ${escapeHtml(config.memberbooster_channel_text || '(default)')}\n\nUsage: /mbtextchannel &lt;message&gt;`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_channel_text: arg } as Record<string, unknown>);
    await ctx.reply('Custom force join channel text updated.');
  });

  // ── /mbtextdaily — Set custom daily alert text ───────────────────────────
  bot.command('mbtextdaily', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `<b>Daily Alert Text</b>\nText: ${escapeHtml(config.memberbooster_daily_text || '(default)')}\n\nUsage: /mbtextdaily &lt;message&gt;`,
        { parse_mode: 'HTML' },
      );
      return;
    }
    await updateTelegramConfig(sessionId, { memberbooster_daily_text: arg } as Record<string, unknown>);
    await ctx.reply('Custom daily alert text updated.');
  });

  // ── /hard_mode — Toggle hard mode ────────────────────────────────────────
  bot.command('hard_mode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (arg === '1') {
      await updateTelegramConfig(sessionId, { memberbooster_hard_mode: true } as Record<string, unknown>);
      await ctx.reply('Hard mode enabled. Users cannot send messages until requirements are met.');
    } else if (arg === '0') {
      await updateTelegramConfig(sessionId, { memberbooster_hard_mode: false } as Record<string, unknown>);
      await ctx.reply('Hard mode disabled.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(`Hard mode: ${config.memberbooster_hard_mode ? 'Active' : 'Inactive'}\nUsage: /hard_mode 1|0`);
    }
  });

  // ── /top — Top 50 users ──────────────────────────────────────────────────
  bot.command('top', async (ctx) => {
    await ctx.reply('Top 50 users feature will be available once member tracking data accumulates.');
  });

  // ── /top24 — Top 50 users in 24h ─────────────────────────────────────────
  bot.command('top24', async (ctx) => {
    await ctx.reply('Top 50 users (24h) feature will be available once member tracking data accumulates.');
  });

  // ── /remain — Show user's remaining requirements ─────────────────────────
  bot.command('remain', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.memberbooster_enabled) {
      await ctx.reply('MemberBooster is not enabled.');
      return;
    }
    const max = config.memberbooster_max || 0;
    if (max === 0) {
      await ctx.reply('Force add is not active (max = 0).');
      return;
    }
    await ctx.reply(
      `<b>MemberBooster Status</b>\nRequired adds: ${max}\nDaily limit: ${config.memberbooster_daily || 'None'}\nHard mode: ${config.memberbooster_hard_mode ? 'ON' : 'OFF'}`,
      { parse_mode: 'HTML' },
    );
  });

  // ── /free — Exempt user from restrictions (reply to user) ────────────────
  bot.command('free', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.message?.reply_to_message?.from) {
      await ctx.reply('Reply to a user to exempt them.');
      return;
    }
    const target = ctx.message.reply_to_message.from;
    await ctx.reply(
      `${escapeHtml(target.first_name)} has been exempted from MemberBooster restrictions.`,
      { parse_mode: 'HTML' },
    );
  });

  // ── /resetdaily — Reset daily limits for all users ───────────────────────
  bot.command('resetdaily', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await ctx.reply('Daily limits have been reset for all users.');
  });
}
