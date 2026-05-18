/**
 * Handler registration factory - wires all Telegram handlers to a Bot instance.
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
import { registerKarmaHandlers } from './handlers/karma';
import { registerVotekickHandlers } from './handlers/votekick';
import { registerJoinApprovalHandlers } from './handlers/joinapproval';
import { registerAdminToolsHandlers } from './handlers/admintools';
import { registerAutoDeleteHandlers } from './handlers/autodelete';
import { registerSudoHandlers } from './handlers/sudo';
import { registerLanguageHandlers } from './handlers/language';
import { registerGroqAiHandlers } from './handlers/groqai';
import { registerAnalyticsHandlers, processAnalytics } from './handlers/analytics';
import { registerChannelForceHandlers } from './handlers/channelforce';
import { registerGroupBoosterHandlers } from './handlers/groupbooster';
import { registerNameHistoryHandlers } from './handlers/namehistory';
import { registerGamesHandlers } from './handlers/games';
import { registerSlowModeHandlers } from './handlers/slowmode';
import { registerTextToolsHandlers } from './handlers/texttools';
import { registerQuickToolsHandlers } from './handlers/quicktools';
import { registerProfileToolsHandlers } from './handlers/profiletools';
import { registerMediaToolsHandlers } from './handlers/mediatools';
import { registerFunExtrasHandlers } from './handlers/funextras';
import { registerAutoReplyHandlers } from './handlers/autoreply';
import { registerMediaDownloadHandlers } from './handlers/mediadownload';
import { registerImageEditHandlers } from './handlers/imageedit';
import { registerInfoLookupHandlers } from './handlers/infolookup';
import { registerApprovalHandlers } from './handlers/approval';
import { registerCleanCommandHandlers } from './handlers/cleancommand';
import { registerCleanServiceHandlers } from './handlers/cleanservice';
import { registerConnectionsHandlers } from './handlers/connections';
import { registerDisablingHandlers } from './handlers/disabling';
import { registerTopicsHandlers } from './handlers/topics';
import { getGroupConfig, ensureGroupConfig } from './utils/db';
import { isElevated, invalidateAdminCache } from './utils/permissions';
import { ensureConfig } from './utils/db';

/**
 * Register all Telegram-specific command handlers on the bot instance.
 * Must be called BEFORE bot.start().
 */
export async function registerAllHandlers(bot: Bot, sessionId: string): Promise<void> {
  // Ensure config row exists for this session
  await ensureConfig(sessionId);

  // Middleware: auto-register group config on first activity (Part 9)
  bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      const chatId = ctx.chat.id.toString();
      const chatTitle = ctx.chat.title || undefined;
      await ensureGroupConfig(sessionId, chatId, chatTitle);
    }
    await next();
  });

  // Middleware: night mode check (before commands)
  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
      const config = await getGroupConfig(sessionId, ctx.chat.id.toString());
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
  registerKarmaHandlers(bot, sessionId);
  registerVotekickHandlers(bot, sessionId);
  registerJoinApprovalHandlers(bot, sessionId);
  registerAdminToolsHandlers(bot, sessionId);
  registerAutoDeleteHandlers(bot, sessionId);
  registerSudoHandlers(bot, sessionId);
  registerLanguageHandlers(bot, sessionId);
  registerGroqAiHandlers(bot, sessionId);
  registerAnalyticsHandlers(bot, sessionId);
  registerChannelForceHandlers(bot, sessionId);
  registerGroupBoosterHandlers(bot, sessionId);
  registerNameHistoryHandlers(bot, sessionId);
  registerGamesHandlers(bot, sessionId);
  registerSlowModeHandlers(bot, sessionId);
  registerTextToolsHandlers(bot, sessionId);
  registerQuickToolsHandlers(bot, sessionId);
  registerProfileToolsHandlers(bot, sessionId);
  registerMediaToolsHandlers(bot, sessionId);
  registerFunExtrasHandlers(bot, sessionId);
  registerAutoReplyHandlers(bot, sessionId);
  registerMediaDownloadHandlers(bot, sessionId);
  registerImageEditHandlers(bot, sessionId);
  registerInfoLookupHandlers(bot, sessionId);
  registerApprovalHandlers(bot, sessionId);
  registerCleanCommandHandlers(bot, sessionId);
  registerCleanServiceHandlers(bot, sessionId);
  registerConnectionsHandlers(bot, sessionId);
  registerDisablingHandlers(bot, sessionId);
  registerTopicsHandlers(bot, sessionId);

  // Invalidate admin cache on chat_member updates
  bot.on('chat_member', async (ctx) => {
    if (ctx.chat) invalidateAdminCache(ctx.chat.id);
  });

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
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.from || !ctx.chat) { await next(); return; }

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

    // Track analytics
    await processAnalytics(sessionId, ctx.chat.id.toString(), ctx.from.id.toString(), 'text');

    await next();
  });
}
