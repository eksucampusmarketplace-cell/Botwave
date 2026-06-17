/**
 * Broadcast system - bot owner can send a message to all active groups.
 */

import { Bot } from 'grammy';
import { isOwner } from '../utils/permissions';
import { getActiveChats } from '../utils/db';

interface BroadcastStats {
  total: number;
  sent: number;
  failed: number;
  timestamp: string;
}

const lastBroadcast = new Map<string, BroadcastStats>();

export function registerBroadcastHandlers(bot: Bot, sessionId: string): void {
  // /broadcast <message> - send to all active groups
  bot.command('broadcast', async (ctx) => {
    if (!ctx.from) return;

    const ownerCheck = await isOwner(sessionId, ctx.from.id);
    if (!ownerCheck) {
      await ctx.reply('❌ Only the bot owner can use this command.');
      return;
    }

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply('Usage: /broadcast <message>');
      return;
    }

    const chatIds = await getActiveChats(sessionId);
    if (chatIds.length === 0) {
      await ctx.reply('No active groups found.');
      return;
    }

    await ctx.reply(`📡 Broadcasting to ${chatIds.length} groups...`);

    let sent = 0;
    let failed = 0;

    for (const chatId of chatIds) {
      try {
        await ctx.api.sendMessage(
          Number(chatId),
          `📢 <b>Broadcast</b>\n\n${text}`,
          { parse_mode: 'HTML' },
        );
        sent++;
        // Rate limit: ~30 msgs/sec
        if (sent % 30 === 0) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch {
        failed++;
      }
    }

    const stats: BroadcastStats = {
      total: chatIds.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    };
    lastBroadcast.set(sessionId, stats);

    await ctx.reply(
      `✅ <b>Broadcast Complete</b>\n\n` +
      `📨 Sent: ${sent}\n` +
      `❌ Failed: ${failed}\n` +
      `📊 Total: ${chatIds.length}`,
      { parse_mode: 'HTML' },
    );
  });

  // /broadcaststats - show last broadcast stats
  bot.command('broadcaststats', async (ctx) => {
    if (!ctx.from) return;

    const ownerCheck = await isOwner(sessionId, ctx.from.id);
    if (!ownerCheck) {
      await ctx.reply('❌ Only the bot owner can use this command.');
      return;
    }

    const stats = lastBroadcast.get(sessionId);
    if (!stats) {
      await ctx.reply('No broadcasts have been sent yet.');
      return;
    }

    await ctx.reply(
      `📊 <b>Last Broadcast Stats</b>\n\n` +
      `📨 Sent: ${stats.sent}\n` +
      `❌ Failed: ${stats.failed}\n` +
      `📊 Total: ${stats.total}\n` +
      `🕐 Time: ${stats.timestamp}`,
      { parse_mode: 'HTML' },
    );
  });
}
