import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionStatus, getSessionUserId, getFeatureEnabled, incrementLeaderboard } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage, handleGroupParticipantsUpdate } from './handlers/MessageHandler';
import { MessageQueue } from './utils/MessageQueue';
import { startPresenceSimulation, stopPresenceSimulation, registerSessionStart } from './utils/advancedAntiban';
import P from 'pino';

const logger = P({ level: 'info' });

const MAX_RECONNECT_ATTEMPTS = 5;
const SESSION_STAGGER_DELAY = 2000;

interface BotConfig {
  sessionId: string;
  userId: string;
  phoneNumber: string;
}

export class BotWaveBot {
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private socket: any = null;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: MessageQueue | null = null;
  private isReconnecting: boolean = false;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  async start(): Promise<void> {
    // Register session for warmup tracking (advanced anti-ban)
    registerSessionStart(this.sessionId);

    const { state, saveCreds } = await useSupabaseAuthState(this.sessionId);
    
    let version: any;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch (err) {
      console.warn(`Failed to fetch latest Baileys version for session ${this.sessionId}, using fallback:`, err);
      version = [2, 3000, 1015901307]; // Safe fallback version
    }

    this.socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: Browsers.macOS('Chrome'),
      syncFullHistory: false,
      markOnline: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
    });

    // Attach metadata for downstream handlers
    (this.socket as any).sessionId = this.sessionId;
    (this.socket as any).userId = this.userId;

    this.messageQueue = new MessageQueue(this.socket, this.sessionId);

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        const expiresAt = new Date(Date.now() + 60 * 1000);
        await updateSessionQR(this.sessionId, qr, expiresAt.toISOString());
        console.log(`QR Code generated for session: ${this.sessionId}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`Connection closed for session ${this.sessionId}. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        // Baileys can fire duplicate close events (e.g. stream error + websocket close).
        // If we already handled a close and are mid-reconnect with no active socket,
        // ignore the stale event to prevent overwriting the DB state.
        if (this.isReconnecting && !this.socket) {
          console.log(`Session ${this.sessionId}: ignoring duplicate close event (already reconnecting)`);
          return;
        }

        this.isReady = false;

        if (!shouldReconnect) {
          console.log(`Session ${this.sessionId} logged out or kicked. Updating to needs_reauth.`);
          this.isReconnecting = false;
          await updateSessionStatus(this.sessionId, 'needs_reauth');

          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify/session-down`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: this.sessionId, userId: this.userId }),
            });
          } catch (err) {
            console.error('Failed to send session-down notification:', err);
          }
        } else {
          // Hard limit: max 3 reconnect attempts
          if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(`Session ${this.sessionId}: max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping.`);
            this.isReconnecting = false;
            await updateSessionStatus(this.sessionId, 'disconnected');
            this.socket = null;
            return;
          }

          this.isReconnecting = true;
          // Keep state as qr_pending during pairing restart (515)
          // so syncSessionsWithDb doesn't kill the bot mid-handshake
          if (statusCode !== 515) {
            await updateSessionStatus(this.sessionId, 'inactive');
          }
          this.socket = null;
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          this.reconnectTimeout = setTimeout(() => {
            // Keep isReconnecting=true until connection opens (or max retries).
            // Setting it false here would create a race where syncSessionsWithDb
            // sees isReconnecting=false and kills the bot before start() finishes.
            this.start();
          }, delay);
        }
      } else if (connection === 'open') {
        console.log(`Session connected: ${this.sessionId}`);
        this.isReady = true;
        this.isReconnecting = false;
        this.qrCode = null;
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        await updateSessionStatus(this.sessionId, 'active');

        // Start presence simulation (advanced anti-ban)
        startPresenceSimulation(this.socket, this.sessionId);
      }
    });

    this.socket.ev.on('messages.upsert', async (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await handleMessage(msg, this.socket, this.messageQueue ?? undefined);
          }
        }
      }
    });

    // Welcome bot — greet new group members
    this.socket.ev.on('group-participants.update', async (update: any) => {
      await handleGroupParticipantsUpdate(update, this.socket, this.sessionId, this.userId, this.messageQueue ?? undefined);
    });
  }

  async stop(): Promise<void> {
    stopPresenceSimulation(this.sessionId);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.isReady = false;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: this.qrCode,
      isReconnecting: this.isReconnecting,
    };
  }
}

const activeBots: Map<string, BotWaveBot> = new Map();

export function initializeBot() {
  return {
    start: async () => {
      await initDatabase();
      console.log('BotWave bot service started');
    },
    stop: async () => {
      for (const [, bot] of activeBots) {
        await bot.stop();
      }
      activeBots.clear();
    },
  };
}

/**
 * Sync sessions from DB — starts new bots and stops removed ones.
 * Sessions are staggered by 2 seconds to avoid suspicious simultaneous connections.
 */
export async function syncSessionsWithDb() {
  const sessions = await getSessionsNeedingBot();

  for (const session of sessions) {
    const bot = activeBots.get(session.id);

    if (session.state === 'active' && bot) {
      continue;
    }

    if (!bot) {
      console.log(`Starting bot for session: ${session.id}`);
      const newBot = new BotWaveBot({
        sessionId: session.id,
        userId: session.user_id,
        phoneNumber: session.phone_number,
      });
      activeBots.set(session.id, newBot);
      newBot.start().catch(err => console.error(`Failed to start bot ${session.id}:`, err));

      // Stagger: wait 2 seconds between each session start
      await new Promise(resolve => setTimeout(resolve, SESSION_STAGGER_DELAY));
    }
  }

  for (const [id, bot] of activeBots) {
    const session = sessions.find(s => s.id === id);
    if (!session) {
      // Don't kill bots that are mid-reconnect (e.g. 515 pairing restart)
      if (bot.getStatus().isReconnecting) {
        continue;
      }
      console.log(`Stopping bot for removed session: ${id}`);
      await bot.stop();
      activeBots.delete(id);
    }
  }
}
