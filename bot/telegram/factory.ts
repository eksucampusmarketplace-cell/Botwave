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
import { registerFeedbackHandlers } from './handlers/feedback';
import { registerExportConfigHandlers } from './handlers/exportconfig';
import { registerFeatureRequestHandlers } from './handlers/featureRequest';
import { registerTranslateHandlers } from './handlers/translate';
import { registerSupportGuardHandlers } from './handlers/supportguard';
import { registerIgnoreChatHandlers } from './handlers/ignorechat';
import { registerGroupWelcomeHandlers } from './handlers/groupwelcome';
import { registerLoopProtection } from './handlers/loopProtection';
import { registerChannelHandlers } from './handlers/channels';
import { isIgnoredChat } from './utils/db';
import { getGroupConfig, ensureGroupConfig } from './utils/db';
import { isElevated, invalidateAdminCache } from './utils/permissions';
import { ensureConfig, getAdminOnlyMode, isGroupAllowed, isUserAllowed } from './utils/db';
import { checkCooldown, setCooldown } from './utils/cooldown';
import { getSessionById } from '../database';

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

  // Middleware: admin-only mode check (only admins can interact when enabled)
  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
      try {
        const adminOnly = await getAdminOnlyMode(sessionId, ctx.chat.id.toString());
        if (adminOnly) {
          const elevated = ctx.from ? await isElevated(ctx, sessionId) : false;
          if (!elevated) return;
        }
      } catch { /* non-critical */ }
    }
    await next();
  });

  // Middleware: access control (silent ignore disallowed groups/users)
  // Runs before any heavier check so blocklisted / non-allowlisted chats
  // and users are dropped cheaply and invisibly.
  bot.on('message', async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      const groupOk = await isGroupAllowed(sessionId, ctx.chat.id);
      if (!groupOk) return;
    }
    if (ctx.from) {
      const userOk = await isUserAllowed(sessionId, ctx.from.id);
      if (!userOk) return;
    }
    await next();
  });

  // Middleware: ignored chat check (skip all processing if chat is ignored)
  bot.on('message', async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
      const ignored = await isIgnoredChat(sessionId, ctx.chat.id.toString());
      if (ignored) return;
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

  // Middleware: command cooldown per user (guarded by per-session toggle)
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.from || !ctx.message?.text) { await next(); return; }
    const text = ctx.message.text;
    if (!text.startsWith('/')) { await next(); return; }

    let commandThrottlingEnabled = false;
    try {
      const session = await getSessionById(sessionId);
      commandThrottlingEnabled = session?.command_throttling_enabled === true;
    } catch {
      commandThrottlingEnabled = false;
    }

    if (!commandThrottlingEnabled) {
      await next();
      return;
    }

    const cmd = text.split(/[@\s]/)[0].slice(1).toLowerCase();
    if (!cmd) { await next(); return; }
    const remaining = checkCooldown(ctx.from.id, cmd);
    if (remaining > 0) {
      await ctx.reply(`Please wait ${remaining}s before using /${cmd} again.`).catch(() => {});
      return;
    }
    setCooldown(ctx.from.id, cmd);
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
  registerFeedbackHandlers(bot, sessionId);
  registerExportConfigHandlers(bot, sessionId);
  registerFeatureRequestHandlers(bot, sessionId);
  registerTranslateHandlers(bot, sessionId);
  registerSupportGuardHandlers(bot, sessionId);
  registerIgnoreChatHandlers(bot, sessionId);
  registerGroupWelcomeHandlers(bot, sessionId);

  // Loop protection for bot-to-bot communication
  registerLoopProtection(bot, sessionId);

  // Channel management (announce, setchannel, channels)
  registerChannelHandlers(bot, sessionId);

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
    const filterMatch = await checkFilters(
      sessionId,
      ctx.chat.id.toString(),
      ctx.message.text || '',
    );
    if (filterMatch) {
      if (filterMatch.image_url) {
        try {
          await ctx.replyWithPhoto(filterMatch.image_url, {
            caption: filterMatch.response,
            parse_mode: 'HTML',
          });
        } catch {
          await ctx.reply(filterMatch.response);
        }
      } else {
        await ctx.reply(filterMatch.response);
      }
    }

    // Award XP
    await processXp(ctx, sessionId);

    // Track analytics
    await processAnalytics(sessionId, ctx.chat.id.toString(), ctx.from.id.toString(), 'text');

    await next();
  });
}
