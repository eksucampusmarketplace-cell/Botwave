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
import { registerPingHandlers } from './handlers/ping';
import { registerLogChannelHandlers } from './handlers/logchannel';
import { registerBlacklistHandlers, checkBlacklist } from './handlers/blacklist';
import { registerReportHandlers } from './handlers/report';
import { registerLocksHandlers, checkLocks } from './handlers/locks';
import { registerPollHandlers } from './handlers/polls';
import { registerScheduleHandlers } from './handlers/schedule';
import { registerFederationHandlers, checkFederationBan } from './handlers/federation';
import { registerAntiraidHandlers, checkRaid } from './handlers/antiraid';
import { registerTicketHandlers } from './handlers/tickets';
import { registerStickerHandlers } from './handlers/stickers';
import { registerBroadcastHandlers } from './handlers/broadcast';
import { registerGroupLifecycleHandlers } from './handlers/group_lifecycle';
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

  // Middleware: blacklist check
  bot.on('message', async (ctx, next) => {
    const blocked = await checkBlacklist(ctx, sessionId);
    if (blocked) return;
    await next();
  });

  // Middleware: locks check
  bot.on('message', async (ctx, next) => {
    const blocked = await checkLocks(ctx, sessionId);
    if (blocked) return;
    await next();
  });

  // Group lifecycle: detect bot being added/removed from groups (must be before commands)
  registerGroupLifecycleHandlers(bot, sessionId);

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
  registerPingHandlers(bot, sessionId);
  registerLogChannelHandlers(bot, sessionId);
  registerBlacklistHandlers(bot, sessionId);
  registerReportHandlers(bot, sessionId);
  registerLocksHandlers(bot, sessionId);
  registerPollHandlers(bot, sessionId);
  registerScheduleHandlers(bot, sessionId);
  registerFederationHandlers(bot, sessionId);
  registerAntiraidHandlers(bot, sessionId);
  registerTicketHandlers(bot, sessionId);
  registerStickerHandlers(bot, sessionId);
  registerBroadcastHandlers(bot, sessionId);

  // Middleware: federation ban check + anti-raid on new chat members
  bot.on('chat_member', async (ctx) => {
    if (!ctx.chatMember) return;
    const newMember = ctx.chatMember.new_chat_member;
    if (newMember.status !== 'member') return;
    const chatId = ctx.chat.id.toString();
    const userId = newMember.user.id;

    // Check federation ban
    await checkFederationBan(bot, chatId, userId);

    // Check anti-raid
    await checkRaid(bot, sessionId, chatId, userId);
  });

  // Middleware: auto-filter responses and XP on text messages (runs after commands)
  bot.on('message:text', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    // Check keyword filters
    const filterResponse = await checkFilters(
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
