/**
 * Telegram Bot Manager — grammy-based handler for Telegram bot sessions.
 *
 * Uses long polling (no webhook needed). Completely independent from
 * Evolution API / WhatsApp infrastructure.
 *
 * Implements the same interface as EvolutionBot/BotWaveBot so the sync
 * loop in BotManager.ts can manage it uniformly.
 */

import { Bot, GrammyError, HttpError } from 'grammy';
import { createClient } from '@supabase/supabase-js';
import { getUserSettings, getAutoReplies, trackCommand, trackMessage, incrementLeaderboard, incrementQuotaUsage, getUserSubscription, creditReward } from '../database';
import { getCommand, type MessageContext, type TemplateVars } from '../whatsapp/commands/registry';
import { refreshHeartbeat } from '../scaling/sessionCoordinator';
import { registerAllHandlers } from './factory';
import { getTelegramConfig, getDueScheduledMessages, markScheduledMessageSent } from './utils/db';
import { checkNightMode } from './handlers/nightmode';

// Import all command modules to trigger self-registration
import '../whatsapp/commands';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEFAULT_COMMAND_PREFIX = '/';

interface TelegramBotConfig {
  sessionId: string;
  userId: string;
  botToken: string;
  botUsername?: string;
}

/**
 * Adapter that wraps a grammy Bot instance to provide a sendMessage
 * interface compatible with the WhatsApp socket used by command handlers.
 */
class TelegramSocketAdapter {
  private bot: Bot;
  public sessionId: string;
  public userId: string;

  constructor(bot: Bot, sessionId: string, userId: string) {
    this.bot = bot;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async sendMessage(chatId: string | number, content: { text?: string; react?: { text: string; key: any } }): Promise<any> {
    if (content.react) {
      // Telegram reactions are not universally supported, skip silently
      return;
    }
    if (content.text) {
      return this.bot.api.sendMessage(Number(chatId), content.text, { parse_mode: 'Markdown' }).catch((err) => {
        // Retry without Markdown if parse fails
        if (err instanceof GrammyError && err.description?.includes('parse')) {
          return this.bot.api.sendMessage(Number(chatId), content.text!);
        }
        throw err;
      });
    }
  }
}

export class TelegramBotInstance {
  private sessionId: string;
  private userId: string;
  private botToken: string;
  private botUsername: string;
  private bot: Bot | null = null;
  private socketAdapter: TelegramSocketAdapter | null = null;
  private isReady: boolean = false;
  private isReconnecting: boolean = false;
  private isPairingSent: boolean = false;
  private pairingStartedAt: number = 0;
  private stopped: boolean = false;
  private heartbeatHandle: NodeJS.Timeout | null = null;
  private nightModeHandle: NodeJS.Timeout | null = null;
  private scheduleHandle: NodeJS.Timeout | null = null;

  public getSocket(): any { return this.isReady ? this.socketAdapter : null; }

  constructor(config: TelegramBotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.botToken = config.botToken;
    this.botUsername = config.botUsername || '';
  }

  async start(): Promise<void> {
    if (this.stopped) return;

    console.log(`[TG-BOT] Starting Telegram bot for session ${this.sessionId.slice(0, 8)} (@${this.botUsername})`);

    try {
      this.bot = new Bot(this.botToken);
      this.socketAdapter = new TelegramSocketAdapter(this.bot, this.sessionId, this.userId);

      // Verify bot token is valid
      const me = await this.bot.api.getMe();
      this.botUsername = me.username || this.botUsername;
      console.log(`[TG-BOT] Bot verified: @${me.username} (${me.first_name})`);

      // Load user settings and register handlers in parallel for faster startup
      let commandPrefix = DEFAULT_COMMAND_PREFIX;
      const [settings] = await Promise.all([
        getUserSettings(this.userId).catch(() => null),
        registerAllHandlers(this.bot, this.sessionId),
      ]);
      if (settings?.command_prefix) commandPrefix = settings.command_prefix;

      // Register legacy message handler for command registry compatibility
      this.bot.on('message:text', async (ctx) => {
        if (this.stopped) return;

        try {
          const text = ctx.message.text || '';
          const chatId = ctx.chat.id.toString();
          const senderId = ctx.from.id.toString();
          const pushName = ctx.from.first_name || ctx.from.username || 'User';
          const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
          const isOwner = false; // Telegram bot messages are never "from owner"
          const isCommand = text.startsWith(commandPrefix) || text.startsWith('/');

          // Track message
          trackMessage(
            this.sessionId,
            senderId,
            pushName,
            text.substring(0, 500),
            'text',
            isGroup,
            isGroup ? chatId : null,
          ).catch(() => {});

          // Track leaderboard in groups
          if (isGroup && !isCommand) {
            incrementLeaderboard(this.sessionId, senderId, pushName).catch(() => {});
          }

          if (isCommand) {
            await this.handleCommand(ctx, text, chatId, senderId, pushName, isGroup, isOwner, commandPrefix);
          } else {
            await this.handleAutoReply(ctx, text, chatId, senderId, pushName, isGroup);
          }
        } catch (err) {
          console.error(`[TG-BOT] Error handling message for ${this.sessionId.slice(0, 8)}:`, err);
        }
      });

      // Note: chat_member events for new member joins are handled in factory.ts
      // (federation ban check + anti-raid). Group lifecycle (bot add/remove)
      // is handled via my_chat_member in group_lifecycle.ts.

      // Error handler
      this.bot.catch((err) => {
        if (this.stopped) return;
        const ctx = err.ctx;
        console.error(`[TG-BOT] Error for session ${this.sessionId.slice(0, 8)}:`, err.error);

        if (err.error instanceof GrammyError) {
          if (err.error.error_code === 401) {
            console.error(`[TG-BOT] Bot token revoked for ${this.sessionId.slice(0, 8)} — marking inactive`);
            this.markInactive('Bot token revoked');
          }
        } else if (err.error instanceof HttpError) {
          console.error(`[TG-BOT] HTTP error for ${this.sessionId.slice(0, 8)}:`, err.error);
        }
      });

      // Start long polling (non-blocking)
      // Explicitly include my_chat_member so the group lifecycle handler fires
      this.bot.start({
        drop_pending_updates: true,
        allowed_updates: [
          'message',
          'edited_message',
          'callback_query',
          'chat_member',
          'my_chat_member',
          'inline_query',
          'chosen_inline_result',
          'poll',
          'poll_answer',
        ],
        onStart: () => {
          if (this.stopped) return;
          this.isReady = true;
          console.log(`[TG-BOT] Long polling started for session ${this.sessionId.slice(0, 8)} (@${this.botUsername})`);

          // Mark session as active in DB
          supabase
            .from('bot_sessions')
            .update({
              state: 'active',
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', this.sessionId)
            .then(({ error }) => {
              if (error) console.error(`[TG-BOT] Failed to mark ${this.sessionId.slice(0, 8)} as active:`, error);
            });
        },
      });

      // Set menu button to open Mini App (inline WebApp feature)
      try {
        const tgConfig = await getTelegramConfig(this.sessionId);
        const miniappUrl = tgConfig.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL;
        if (miniappUrl) {
          const panelUrl = `${miniappUrl}/miniapp/admin/index.html?sessionId=${this.sessionId}`;
          await this.bot.api.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: '📱 Open Panel',
              web_app: { url: panelUrl },
            },
          });
          console.log(`[TG-BOT] Menu button set to Mini App for ${this.sessionId.slice(0, 8)}`);
        }
      } catch (menuErr) {
        console.warn(`[TG-BOT] Failed to set menu button for ${this.sessionId.slice(0, 8)}:`, menuErr);
      }

      // Night mode scheduler: check every 60 seconds
      this.nightModeHandle = setInterval(async () => {
        if (this.stopped || !this.isReady || !this.bot) return;
        try {
          await checkNightMode(this.bot, this.sessionId);
        } catch (err) {
          console.error(`[TG-BOT] Night mode check failed for ${this.sessionId.slice(0, 8)}:`, err);
        }
      }, 60_000);

      // Scheduled messages: check every 30 seconds
      this.scheduleHandle = setInterval(async () => {
        if (this.stopped || !this.isReady || !this.bot) return;
        try {
          const due = await getDueScheduledMessages();
          for (const msg of due) {
            try {
              await this.bot!.api.sendMessage(Number(msg.chat_id), msg.content, { parse_mode: 'HTML' });
              await markScheduledMessageSent(msg.id, msg.schedule_type, msg.time_of_day);
            } catch (sendErr) {
              console.error(`[TG-BOT] Failed to send scheduled message ${msg.id}:`, sendErr);
            }
          }
        } catch (err) {
          console.error(`[TG-BOT] Scheduled message check failed for ${this.sessionId.slice(0, 8)}:`, err);
        }
      }, 30_000);

      // Heartbeat: refresh lock periodically so session isn't marked as orphaned
      this.heartbeatHandle = setInterval(() => {
        if (this.stopped || !this.isReady) return;
        refreshHeartbeat(this.sessionId).catch((err) => {
          console.error(`[TG-BOT] Heartbeat failed for ${this.sessionId.slice(0, 8)}:`, err);
        });

        // Update last_active
        supabase
          .from('bot_sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', this.sessionId)
          .then(({ error }) => {
            if (error) console.error(`[TG-BOT] last_active update failed for ${this.sessionId.slice(0, 8)}:`, error);
          });
      }, 60_000);

    } catch (err) {
      console.error(`[TG-BOT] Failed to start bot for ${this.sessionId.slice(0, 8)}:`, err);

      if (err instanceof GrammyError && err.error_code === 401) {
        await this.markInactive('Invalid bot token');
      } else if (err instanceof GrammyError && err.error_code === 409) {
        console.error(`[TG-BOT] Conflict: another instance is polling for ${this.sessionId.slice(0, 8)}`);
        await this.markInactive('Another bot instance is running');
      } else {
        await this.markInactive('Failed to start');
      }
    }
  }

  private async handleCommand(
    ctx: any,
    text: string,
    chatId: string,
    senderId: string,
    pushName: string,
    isGroup: boolean,
    isOwner: boolean,
    commandPrefix: string,
  ): Promise<void> {
    // Strip prefix and parse command + args
    let cmdText = text;
    if (cmdText.startsWith(commandPrefix)) {
      cmdText = cmdText.slice(commandPrefix.length);
    } else if (cmdText.startsWith('/')) {
      cmdText = cmdText.slice(1);
    }

    // Handle /command@botname format
    const parts = cmdText.split(/\s+/);
    let commandName = (parts[0] || '').toLowerCase();
    // Strip @botname suffix
    if (commandName.includes('@')) {
      commandName = commandName.split('@')[0];
    }
    const args = parts.slice(1);

    // Skip commands that have native Grammy handlers registered in factory.ts.
    // Those handlers already replied; processing them again through the legacy
    // WhatsApp command bridge would send a duplicate (incomplete) response.
    // Also includes WhatsApp command aliases (e.g. 'h', 'commands', 'pong')
    // that map to the same commands — without these, aliases bypass the
    // native check and fall through to the WhatsApp bridge, producing
    // garbled responses (e.g. docx caption sent as plain text).
    const NATIVE_TG_COMMANDS = new Set([
      'start', 'help', 'h', 'commands', 'panel', 'setstart', 'sethelp',
      'ban', 'unban', 'tban', 'mute', 'unmute', 'tmute', 'kick', 'warn',
      'unwarn', 'warns', 'resetwarns', 'promote', 'demote', 'settitle',
      'welcome', 'setwelcome', 'goodbye', 'setgoodbye',
      'captcha', 'savenote', 'note', 'delnote', 'notes',
      'addfilter', 'delfilter', 'filters',
      'joke', 'jokes', 'funny', 'quote', 'quotes', 'q', 'inspire', 'motivation',
      'dice', 'coin', '8ball', 'eightball', 'magic', 'magic8ball',
      'choose', 'roll',
      'afk', 'back',
      'antiflood', 'antilink', 'whitelist', 'nightmode',
      'purge', 'del', 'pin', 'unpin',
      'rules', 'setrules', 'clearrules',
      'xp', 'leaderboard', 'level',
      'games', 'game', 'mgame', 'multiplayer', 'setgamesurl',
      'ping', 'pong', 'alive', 'id', 'info', 'admins', 'chatinfo',
      'addsudo', 'delsudo', 'sudolist', 'setowner',
      'setlog', 'unsetlog', 'logchannel',
      'blacklist', 'unblacklist', 'blacklistmode', 'blacklisted',
      'report', 'reports', 'resolve', 'dismiss',
      'lock', 'unlock', 'locks', 'open', 'close',
      'poll', 'quiz', 'stoppoll',
      'schedule',
      // Federation
      'newfed', 'joinfed', 'leavefed', 'fedinfo', 'myfeds', 'fedchats',
      'fban', 'unfban', 'fbans', 'fpromote', 'fdemote', 'fedadmins', 'fbroadcast',
      // Anti-Raid
      'antiraid', 'raid',
      // Tickets
      'ticket', 'tickets', 'closeticket', 'assign', 'escalate', 'treply',
      // Stickers
      'kang', 'stickerinfo', 'getsticker',
      // Broadcast
      'broadcast', 'broadcaststats',
      // Group management
      'groups', 'mygroups',
      // Start button resets
      'resetstart', 'resethelp', 'setstartbuttons',
    ]);

    if (NATIVE_TG_COMMANDS.has(commandName)) return;

    // Map common Telegram commands to BotWave commands
    const commandMap: Record<string, string> = {};
    const mappedCommand = commandMap[commandName] || commandName;

    const handler = getCommand(mappedCommand);
    if (!handler) {
      return;
    }

    // Check owner-only commands
    if (handler.ownerOnly && !isOwner) {
      return;
    }

    // Quota check
    if (this.userId) {
      const quotaOk = await incrementQuotaUsage(this.userId);
      if (!quotaOk) {
        const sub = await getUserSubscription(this.userId);
        const upgradeMsg = sub.plan === 'free'
          ? `You've hit your monthly message limit (${sub.quotaLimit}). Upgrade your plan at botwave.online to continue!`
          : `You've reached your ${sub.plan} plan limit (${sub.quotaLimit} messages).`;
        await ctx.reply(upgradeMsg);
        return;
      }
      void creditReward(this.userId, 'command_use', commandName).catch(() => {});
    }

    // Track command execution
    trackCommand(this.sessionId, this.userId, senderId, commandName).catch(() => {});

    // Build context compatible with existing command handlers
    const messageContext: MessageContext = {
      senderJid: senderId,
      chatJid: chatId,
      message: text,
      rawMessage: ctx.message,
      isGroup,
      isOwner,
      pushName,
      sessionId: this.sessionId,
      userId: this.userId,
      commandPrefix,
    };

    const vars: TemplateVars = {
      name: pushName,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      group: isGroup ? ctx.chat.title || chatId : undefined,
    };

    // Create a Telegram-aware sock wrapper for command handlers
    const sock = this.createSockWrapper(ctx);

    try {
      await handler.execute(messageContext, args, sock, vars, mappedCommand);
    } catch (err) {
      console.error(`[TG-BOT] Command "${commandName}" failed for ${this.sessionId.slice(0, 8)}:`, err);
      await ctx.reply('An error occurred processing that command.').catch(() => {});
    }
  }

  private async handleAutoReply(
    ctx: any,
    text: string,
    chatId: string,
    senderId: string,
    pushName: string,
    isGroup: boolean,
  ): Promise<void> {
    try {
      const autoReplies = await getAutoReplies(this.sessionId);
      if (!autoReplies || autoReplies.length === 0) return;

      const lowerText = text.toLowerCase();
      for (const rule of autoReplies) {
        if (!rule.is_active) continue;
        const triggers: string[] = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger];
        const matched = triggers.some((t: string) => {
          const lower = t.toLowerCase();
          return rule.match_type === 'exact'
            ? lowerText === lower
            : lowerText.includes(lower);
        });

        if (matched && rule.response) {
          await ctx.reply(rule.response);
          break;
        }
      }
    } catch (err) {
      console.error(`[TG-BOT] Auto-reply error for ${this.sessionId.slice(0, 8)}:`, err);
    }
  }

  /**
   * Creates a socket-like wrapper that translates WhatsApp-style
   * sendMessage calls to Telegram API calls via grammy context.
   */
  private createSockWrapper(ctx: any) {
    const bot = this.bot!;
    const sessionId = this.sessionId;
    const userId = this.userId;

    return {
      sessionId,
      userId,
      sendMessage: async (chatId: string | number, content: any) => {
        const targetChatId = Number(chatId) || ctx.chat.id;

        if (content.text) {
          return bot.api.sendMessage(targetChatId, content.text, { parse_mode: 'Markdown' }).catch(() => {
            return bot.api.sendMessage(targetChatId, content.text);
          });
        }
        if (content.document && Buffer.isBuffer(content.document)) {
          // Document messages (e.g. docx help guide) — send as file
          try {
            const { InputFile } = await import('grammy');
            return bot.api.sendDocument(
              targetChatId,
              new InputFile(content.document, content.fileName || 'file'),
              { caption: content.caption || undefined },
            );
          } catch {
            // Fallback: send caption as text if document upload fails
            if (content.caption) {
              return bot.api.sendMessage(targetChatId, content.caption);
            }
          }
        }
        if (content.image || content.caption) {
          // Image messages — send caption as text for now
          if (content.caption) {
            return bot.api.sendMessage(targetChatId, content.caption);
          }
        }
        if (content.react) {
          // Skip reactions on Telegram
          return;
        }
      },
      user: {
        id: bot.botInfo?.id?.toString() || '',
      },
    };
  }

  private async markInactive(reason: string): Promise<void> {
    console.log(`[TG-BOT] Marking ${this.sessionId.slice(0, 8)} as inactive: ${reason}`);
    const { error } = await supabase
      .from('bot_sessions')
      .update({
        state: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId);

    if (error) {
      console.error(`[TG-BOT] Failed to mark ${this.sessionId.slice(0, 8)} as inactive:`, error);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.isReady = false;

    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
    if (this.nightModeHandle) {
      clearInterval(this.nightModeHandle);
      this.nightModeHandle = null;
    }
    if (this.scheduleHandle) {
      clearInterval(this.scheduleHandle);
      this.scheduleHandle = null;
    }

    if (this.bot) {
      try {
        await this.bot.stop();
        console.log(`[TG-BOT] Stopped bot for session ${this.sessionId.slice(0, 8)}`);
      } catch (err) {
        console.error(`[TG-BOT] Error stopping bot ${this.sessionId.slice(0, 8)}:`, err);
      }
      this.bot = null;
    }

    this.socketAdapter = null;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isReconnecting: this.isReconnecting,
      isQrPending: false,
      isPairingSent: this.isPairingSent,
      pairingStartedAt: this.pairingStartedAt,
    };
  }
}
