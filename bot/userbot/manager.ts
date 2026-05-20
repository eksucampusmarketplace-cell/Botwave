/**
 * Userbot Manager - manages multiple Telegram userbot instances.
 * Each BotWave session with platform=telegram_userbot gets its own GramJS client.
 * Follows the same pattern as TelegramBotInstance / BotManager.
 */

import { TelegramClient } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram/tl';
import { UserbotClient, type UserbotClientConfig } from './client';
import {
  commandHandlers,
  handleIncomingPm,
  handleAfkMention,
  handleNoteRetrieval,
  handleFilterCheck,
  handleGbanCheck,
  handleAntifloodCheck,
} from './handlers';
import {
  ensureUserbotConfig,
  getUserbotConfig,
  updateSessionState,
  updateSessionLastActive,
} from './utils/db';
import {
  readDelay,
  shouldMarkRead,
  floodWaitDelay,
  waitForRateLimit,
  getMessageSendDelay,
} from './utils/humanizer';
import { logProxyStatus } from './utils/proxy';

const COMMAND_TO_MODULE: Record<string, string> = {
  // admin
  ban: 'admin', unban: 'admin', kick: 'admin', mute: 'admin', unmute: 'admin',
  promote: 'admin', demote: 'admin', pin: 'admin', unpin: 'admin',
  // pmpermit
  approve: 'pmpermit', disapprove: 'pmpermit', block: 'pmpermit', unblock: 'pmpermit', pmguard: 'pmpermit',
  // afk
  afk: 'afk', unafk: 'afk',
  // notes
  save: 'notes', get: 'notes', clear: 'notes', notes: 'notes',
  // filters
  filter: 'filters', stop: 'filters', filters: 'filters',
  // purge
  purge: 'purge', purgeme: 'purge', del: 'purge',
  // gban
  gban: 'gban', ungban: 'gban', gbanlist: 'gban',
  // stickers
  kang: 'stickers', stickerid: 'stickers', getsticker: 'stickers', stickers: 'stickers',
  // antiflood
  antiflood: 'antiflood',
  // welcome
  setwelcome: 'welcome', setgoodbye: 'welcome', welcome: 'welcome', goodbye: 'welcome',
  // chattools
  chatinfo: 'chattools', admins: 'chattools', invite: 'chattools', leave: 'chattools',
  setname: 'chattools', setbio: 'chattools', username: 'chattools', zombies: 'chattools',
  groupname: 'chattools', groupbio: 'chattools',
  // texttools
  reverse: 'texttools', mock: 'texttools', vapor: 'texttools', tiny: 'texttools',
  flip: 'texttools', b64encode: 'texttools', b64decode: 'texttools', upper: 'texttools',
  lower: 'texttools', clap: 'texttools', spoiler: 'texttools', mono: 'texttools', strike: 'texttools',
  // search
  google: 'search', wiki: 'search', calc: 'search', currency: 'search', time: 'search',
  // translate
  tr: 'translate', translate: 'translate', langs: 'translate',
  // fun
  dice: 'fun', dart: 'fun', slot: 'fun', basketball: 'fun', football: 'fun',
  bowling: 'fun', coinflip: 'fun', rng: 'fun', '8ball': 'fun', rate: 'fun',
  pp: 'fun', decide: 'fun', roll: 'fun',
  // reminders
  remind: 'reminders', reminders: 'reminders', cancelremind: 'reminders', clearreminders: 'reminders',
  // media
  download: 'media', forward: 'media', copy: 'media', mediainfo: 'media',
  // misc (alive, ping, info, id, stats, help)
  alive: 'misc', ping: 'misc', info: 'misc', id: 'misc', stats: 'misc', help: 'misc',
  // settings (setprefix, setalive, setlog, addsudo, rmsudo, lang)
  setprefix: 'settings', setalive: 'settings', setlog: 'settings', addsudo: 'settings', rmsudo: 'settings', lang: 'settings',
};

interface ManagedUserbot {
  client: UserbotClient;
  sessionId: string;
  userId: string;
  startedAt: number;
}

export class UserbotManager {
  private userbots: Map<string, ManagedUserbot> = new Map();
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    logProxyStatus();
  }

  async startUserbot(config: UserbotClientConfig): Promise<boolean> {
    const { sessionId } = config;

    if (this.userbots.has(sessionId)) {
      console.log(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} already running`);
      return true;
    }

    console.log(`[USERBOT-MGR] Starting userbot for session ${sessionId.slice(0, 8)}...`);

    const ubClient = new UserbotClient(config);

    // Attach session ID to client for handlers to reference
    (ubClient.client as unknown as { _sessionId: string })._sessionId = sessionId;

    const connected = await ubClient.connect();
    if (!connected) {
      console.error(`[USERBOT-MGR] Failed to connect session ${sessionId.slice(0, 8)}`);
      await updateSessionState(sessionId, 'error');
      return false;
    }

    // Initialize config in DB
    await ensureUserbotConfig(sessionId);

    // Register event handlers
    this.registerHandlers(ubClient, sessionId);

    // Start presence simulation
    const dbConfig = await getUserbotConfig(sessionId);
    if (dbConfig.presence_simulation) {
      ubClient.startPresenceSimulation(dbConfig.timezone_offset);
    }

    this.userbots.set(sessionId, {
      client: ubClient,
      sessionId,
      userId: config.userId,
      startedAt: Date.now(),
    });

    await updateSessionState(sessionId, 'connected');
    console.log(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} started successfully`);

    // Send one-time welcome message on first connect
    this.sendOneTimeWelcome(ubClient, sessionId).catch(err =>
      console.warn(`[USERBOT-MGR] Welcome message failed for ${sessionId.slice(0, 8)}:`, err),
    );

    return true;
  }

  async stopUserbot(sessionId: string, preserveState = false): Promise<void> {
    const ub = this.userbots.get(sessionId);
    if (!ub) return;

    console.log(`[USERBOT-MGR] Stopping session ${sessionId.slice(0, 8)}...`);
    await ub.client.disconnect();
    this.userbots.delete(sessionId);
    if (!preserveState) {
      await updateSessionState(sessionId, 'disconnected');
    }
  }

  async stopAll(preserveState = false): Promise<void> {
    console.log(`[USERBOT-MGR] Stopping all ${this.userbots.size} userbots...`);
    const promises = Array.from(this.userbots.keys()).map(id => this.stopUserbot(id, preserveState));
    await Promise.allSettled(promises);
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
  }

  getStatus(sessionId: string): string {
    const ub = this.userbots.get(sessionId);
    if (!ub) return 'stopped';
    return ub.client.isConnected() ? 'connected' : 'disconnected';
  }

  getSessionIds(): string[] {
    return Array.from(this.userbots.keys());
  }

  getCount(): number {
    return this.userbots.size;
  }

  private welcomeSent = new Set<string>();

  private async sendOneTimeWelcome(ubClient: UserbotClient, sessionId: string): Promise<void> {
    if (this.welcomeSent.has(sessionId)) return;

    const config = await getUserbotConfig(sessionId);
    if ((config as unknown as Record<string, unknown>).welcome_sent) {
      this.welcomeSent.add(sessionId);
      return;
    }

    try {
      const me = await ubClient.client.getMe();
      const firstName = (me && 'firstName' in me) ? (me as { firstName?: string }).firstName || 'there' : 'there';

      await ubClient.client.sendMessage('me', {
        message: `🎉 **Welcome to BotWave Userbot, ${firstName}!**\n\n` +
          `Your Telegram Userbot is now live and connected.\n\n` +
          `**Quick start:**\n` +
          `  \`.help\` - See all commands\n` +
          `  \`.alive\` - Check bot status\n` +
          `  \`.lang list\` - Change language\n` +
          `  \`.setprefix !\` - Change command prefix\n\n` +
          `**Manage from dashboard:** https://www.botwave.online/dashboard\n\n` +
          `_This is a one-time message. You won't see it again._`,
        parseMode: 'md',
      });

      // Mark as sent in DB so it persists
      const { createClient } = await import('@supabase/supabase-js');
      const createAdminClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const admin = await createAdminClient();
      await admin.from('userbot_config').update({ welcome_sent: true }).eq('session_id', sessionId);

      this.welcomeSent.add(sessionId);
      console.log(`[USERBOT-MGR] Welcome message sent for ${sessionId.slice(0, 8)}`);
    } catch (err) {
      console.warn(`[USERBOT-MGR] Failed to send welcome for ${sessionId.slice(0, 8)}:`, err);
    }
  }

  startHeartbeat(intervalMs = 30_000): void {
    if (this.heartbeatHandle) return;

    this.heartbeatHandle = setInterval(async () => {
      for (const [sessionId, ub] of this.userbots) {
        try {
          const connected = ub.client.isConnected();

          // Even if client.connected is true, verify with a real API call
          // GramJS can report connected on a stale TCP socket
          if (connected) {
            try {
              await ub.client.client.invoke(
                new Api.Ping({ pingId: BigInt(Math.floor(Math.random() * 1e15)) as any }),
              );
              await updateSessionLastActive(sessionId);
            } catch (pingErr) {
              console.warn(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} ping failed - connection stale, forcing reconnect`);
              await this.reconnectSession(sessionId, ub);
            }
          } else {
            console.warn(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} disconnected, attempting reconnect...`);
            await this.reconnectSession(sessionId, ub);
          }
        } catch (err) {
          console.error(`[USERBOT-MGR] Heartbeat error for ${sessionId.slice(0, 8)}:`, err);
        }
      }
    }, intervalMs);
  }

  private async reconnectSession(sessionId: string, ub: ManagedUserbot): Promise<void> {
    try {
      // Disconnect first to clean up stale state
      try { await ub.client.client.disconnect(); } catch {}

      const reconnected = await ub.client.connect();
      if (reconnected) {
        // Re-register event handlers - they are lost on manual reconnect
        this.registerHandlers(ub.client, sessionId);
        await updateSessionState(sessionId, 'connected');
        console.log(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} reconnected + handlers re-registered`);

        // Reset fail counter
        const failKey = `_reconnectFails_${sessionId}`;
        (this as unknown as Record<string, number>)[failKey] = 0;
      } else {
        console.error(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} reconnect returned false`);
        await updateSessionState(sessionId, 'error');
      }
    } catch (reconnectErr) {
      console.error(`[USERBOT-MGR] Session ${sessionId.slice(0, 8)} reconnect failed:`, reconnectErr);
      const failKey = `_reconnectFails_${sessionId}`;
      const fails = ((this as unknown as Record<string, number>)[failKey] || 0) + 1;
      (this as unknown as Record<string, number>)[failKey] = fails;
      if (fails >= 3) {
        await updateSessionState(sessionId, 'error');
        (this as unknown as Record<string, number>)[failKey] = 0;
      }
    }
  }

  // ─── Handler Registration ─────────────────────────────────────────────────

  private registerHandlers(ubClient: UserbotClient, sessionId: string): void {
    const client = ubClient.client;

    // Remove any existing handlers to prevent duplicates on reconnect
    try {
      (client as any)._eventBuilders = [];
    } catch {}

    // Handle outgoing commands (from the user themselves)
    client.addEventHandler(async (event: NewMessageEvent) => {
      try {
        await this.handleOutgoingCommand(client, event, sessionId);
      } catch (err) {
        console.error(`[USERBOT-MGR] Command handler error:`, err);
      }
    }, new NewMessage({ outgoing: true }));

    // Handle incoming messages (from others)
    client.addEventHandler(async (event: NewMessageEvent) => {
      try {
        await this.handleIncomingMessage(client, event, sessionId);
      } catch (err) {
        console.error(`[USERBOT-MGR] Incoming handler error:`, err);
      }
    }, new NewMessage({ incoming: true }));

    // Handle chat member joins for gban enforcement
    client.addEventHandler(async (update: Api.TypeUpdate) => {
      try {
        if (update instanceof Api.UpdateChannelParticipant) {
          const newParticipant = update.newParticipant;
          if (newParticipant && 'userId' in newParticipant) {
            const userId = (newParticipant.userId as any).toString();
            const channelId = (update.channelId as any).toString();
            await handleGbanCheck(client, userId, channelId, sessionId);
          }
        }
      } catch {}
    });

    console.log(`[USERBOT-MGR] Handlers registered for ${sessionId.slice(0, 8)}`);
  }

  private async handleOutgoingCommand(
    client: TelegramClient,
    event: NewMessageEvent,
    sessionId: string,
  ): Promise<void> {
    const msg = event.message;
    const text = msg.text || '';
    if (!text) return;

    const config = await getUserbotConfig(sessionId);
    const prefix = config.prefix;

    if (!text.startsWith(prefix)) {
      // Only log for short messages that look like they could be commands (start with punctuation)
      if (text.length < 30 && /^[.!/\\]/.test(text)) {
        console.log(`[USERBOT-MGR] ${sessionId.slice(0, 8)} outgoing msg "${text.slice(0, 20)}" does not match prefix "${prefix}"`);
      }
      return;
    }

    const command = text.slice(prefix.length).split(/\s+/)[0].toLowerCase();

    // Check if command's module is disabled
    const moduleName = COMMAND_TO_MODULE[command];
    if (moduleName && config.disabled_modules.includes(moduleName)) {
      console.log(`[USERBOT-MGR] ${sessionId.slice(0, 8)} command ${command} blocked - module "${moduleName}" disabled`);
      return;
    }

    const handler = commandHandlers[command];
    if (!handler) {
      console.log(`[USERBOT-MGR] ${sessionId.slice(0, 8)} unknown command: ${prefix}${command}`);
      return;
    }

    console.log(`[USERBOT-MGR] ${sessionId.slice(0, 8)} executing: ${prefix}${command} (chat: ${msg.chatId})`);

    try {
      await handler(client, event);
      console.log(`[USERBOT-MGR] ${sessionId.slice(0, 8)} completed: ${prefix}${command}`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'seconds' in err) {
        const floodErr = err as { seconds: number };
        console.warn(`[USERBOT-MGR] FloodWait: ${floodErr.seconds}s for ${command}`);
        await floodWaitDelay(floodErr.seconds);
      } else {
        console.error(`[USERBOT-MGR] Command ${command} error:`, err);
      }
    }

    // Log command execution
    if (config.log_chat_id) {
      try {
        await waitForRateLimit('message_send');
        const delay = getMessageSendDelay();
        await new Promise(r => setTimeout(r, delay));

        await client.sendMessage(config.log_chat_id, {
          message: `📋 Command: \`${prefix}${command}\`\nChat: \`${msg.chatId}\`\nTime: ${new Date().toISOString()}`,
        });
      } catch {}
    }
  }

  private async handleIncomingMessage(
    client: TelegramClient,
    event: NewMessageEvent,
    sessionId: string,
  ): Promise<void> {
    const msg = event.message;

    // Humanized read delay
    await readDelay();

    // Mark as read (probabilistic - humans don't always read every message)
    if (shouldMarkRead() && msg.chatId) {
      try {
        const ub = this.userbots.get(sessionId);
        if (ub) {
          await ub.client.markRead(msg.chatId as any, msg.id);
        }
      } catch {}
    }

    try {
      // Run passive handlers in priority order:

      // 1. Antiflood check (mutes flooders before anything else)
      if (await handleAntifloodCheck(client, event)) return;

      // 2. PM Permit check (blocks further processing if handled)
      if (await handleIncomingPm(client, event, sessionId)) return;

      // 3. AFK auto-reply
      if (await handleAfkMention(client, event, sessionId)) return;

      // 4. Note retrieval (#notename)
      if (await handleNoteRetrieval(client, event, sessionId)) return;

      // 5. Filter matching
      if (await handleFilterCheck(client, event, sessionId)) return;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'seconds' in err) {
        const floodErr = err as { seconds: number };
        console.warn(`[USERBOT-MGR] FloodWait in incoming handler: ${floodErr.seconds}s`);
        await floodWaitDelay(floodErr.seconds);
      } else {
        console.error(`[USERBOT-MGR] Incoming handler error for ${sessionId.slice(0, 8)}:`, err);
      }
    }
  }
}
