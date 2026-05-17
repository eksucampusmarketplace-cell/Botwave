/**
 * /ping command — simple health check to verify bot is alive.
 */

import { Bot } from 'grammy';

export function registerPingHandlers(bot: Bot, _sessionId: string): void {
  bot.command(['ping', 'pong', 'alive'], async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply('Pong!');
    const latency = Date.now() - start;
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        msg.message_id,
        `Pong! Latency: ${latency}ms`,
      );
    } catch {
      // edit may fail in some contexts, ignore
    }
  });
}
