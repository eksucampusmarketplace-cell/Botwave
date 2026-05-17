/**
 * Handler registration factory — wires all Telegram handlers to a Bot instance.
 * Each handler set is scoped by sessionId for per-session isolation.
 */

import { Bot } from 'grammy';
import { registerStartHandlers } from './handlers/start';
import { registerModerationHandlers } from './handlers/moderation';
import { registerWelcomeHandlers } from './handlers/welcome';
import { registerCaptchaHandlers } from './handlers/captcha';
import { registerNotesHandlers } from './handlers/notes';
import { registerFiltersHandlers, checkFilters } from './handlers/filters';
import { registerFunHandlers } from './handlers/fun';
import { registerInfoHandlers } from './handlers/info';
import { registerAntifloodHandlers, checkFlood } from './handlers/antiflood';
import { registerAntilinkHandlers, checkAntilink } from './handlers/antilink';
import { registerNightmodeHandlers, isNightModeActive } from './handlers/nightmode';
import { registerPurgeHandlers } from './handlers/purge';
import { registerPinsHandlers } from './handlers/pins';
import { registerRulesHandlers } from './handlers/rules';
import { registerXpHandlers, processXp } from './handlers/xp';
import { registerMiniAppsHandlers } from './handlers/miniapps';
import { registerPromoteHandlers } from './handlers/promote';
import { getTelegramConfig } from './utils/db';
import { isElevated } from './utils/permissions';
import { ensureConfig } from './utils/db';

/**
 * Register all Telegram-specific command handlers on the bot instance.
 * Must be called BEFORE bot.start().
 */
export async function registerAllHandlers(bot: Bot, sessionId: string): Promise<void> {
  // Ensure config row exists for this session
  await ensureConfig(sessionId);

  // Middleware: night mode check (before commands)
  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
      const config = await getTelegramConfig(sessionId);
      if (isNightModeActive(config)) {
        const elevated = ctx.from ? await isElevated(ctx, sessionId) : false;
        if (!elevated) {
          try { await ctx.deleteMessage(); } catch {}
          return; // Silently drop message during night mode
        }
      }
    }
    await next();
  });

  // Middleware: anti-flood check
  bot.on('message', async (ctx, next) => {
    const flooded = await checkFlood(ctx, sessionId);
    if (flooded) return;
    await next();
  });

  // Middleware: anti-link check
  bot.on('message:text', async (ctx, next) => {
    const blocked = await checkAntilink(ctx, sessionId);
    if (blocked) return;
    await next();
  });

  // Register all command handlers
  registerStartHandlers(bot, sessionId);
  registerModerationHandlers(bot, sessionId);
  registerPromoteHandlers(bot, sessionId);
  registerWelcomeHandlers(bot, sessionId);
  registerCaptchaHandlers(bot, sessionId);
  registerNotesHandlers(bot, sessionId);
  registerFiltersHandlers(bot, sessionId);
  registerFunHandlers(bot, sessionId);
  registerInfoHandlers(bot, sessionId);
  registerAntifloodHandlers(bot, sessionId);
  registerAntilinkHandlers(bot, sessionId);
  registerNightmodeHandlers(bot, sessionId);
  registerPurgeHandlers(bot, sessionId);
  registerPinsHandlers(bot, sessionId);
  registerRulesHandlers(bot, sessionId);
  registerXpHandlers(bot, sessionId);
  registerMiniAppsHandlers(bot, sessionId);

  // Middleware: auto-filter responses and XP on text messages (runs after commands)
  bot.on('message:text', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    // Check keyword filters
    const filterResponse = await checkFilters(
      bot,
      sessionId,
      ctx.chat.id.toString(),
      ctx.message.text || '',
    );
    if (filterResponse) {
      await ctx.reply(filterResponse);
    }

    // Award XP
    await processXp(ctx, sessionId);
  });
}
