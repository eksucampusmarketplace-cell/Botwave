import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionPairingCode, updateSessionStatus, getSessionUserId, getFeatureEnabled, incrementLeaderboard } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage, handleGroupParticipantsUpdate } from './handlers/MessageHandler';
import { MessageQueue } from './utils/MessageQueue';
import { startPresenceSimulation, stopPresenceSimulation, registerSessionStart } from './utils/advancedAntiban';
import { SELF_URL } from './workerConfig';
import P from 'pino';

// Cast to any: pino v10 types are incompatible with Baileys 6.x Logger typedef
const logger = P({ level: 'info' }) as any;

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
  private isPairingSent: boolean = false;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  async start(): Promise<void> {
    console.log(`[${this.sessionId}] start() called. Phone: ${this.phoneNumber}`);

    // Register session for warmup tracking (advanced anti-ban)
    registerSessionStart(this.sessionId);

    console.log(`[${this.sessionId}] Loading auth state from Supabase...`);
    const { state, saveCreds } = await useSupabaseAuthState(this.sessionId);
    console.log(`[${this.sessionId}] Auth state loaded. Registered: ${state.creds.registered}`);
    
    let version: any;
    try {
      console.log(`[${this.sessionId}] Fetching latest Baileys version...`);
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log(`[${this.sessionId}] Baileys version: ${JSON.stringify(version)}`);
    } catch (err) {
      console.error(`[${this.sessionId}] CRITICAL: Failed to fetch Baileys version:`, err);
      throw err;
    }

    console.log(`[${this.sessionId}] Creating WASocket...`);
    this.socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['Mac OS', 'Chrome', '14.4.1'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 10000,
    });
    console.log(`[${this.sessionId}] WASocket created. Setting up event handlers...`);

    // Attach metadata for downstream handlers
    (this.socket as any).sessionId = this.sessionId;
    (this.socket as any).userId = this.userId;

    this.messageQueue = new MessageQueue(this.socket, this.sessionId);

    this.socket.ev.on('creds.update', saveCreds);

    // Track whether we've requested a pairing code for this connection cycle
    let pairingCodeRequested = false;

    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      console.log(`[${this.sessionId}] connection.update:`, JSON.stringify({ connection, qr: !!qr, registered: this.socket?.authState?.creds?.registered }));

      // When we receive a QR, the WebSocket IS connected and ready.
      // Request pairing code here (once per cycle) — this is the right
      // moment because sendNode() requires an active WebSocket.
      if (qr && !this.socket.authState.creds.registered) {
        this.qrCode = qr;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 60 * 1000);
        await updateSessionQR(this.sessionId, qr, expiresAt.toISOString(), now.toISOString());

        if (!pairingCodeRequested) {
          pairingCodeRequested = true;
          const cleanPhone = this.phoneNumber.replace(/\D/g, '');
          console.log(`[${this.sessionId}] Phone raw: "${this.phoneNumber}" -> cleaned: "${cleanPhone}"`);
          if (cleanPhone) {
            // Use setTimeout to let Baileys finish processing the current
            // event before we send a new request on the same WebSocket.
            const sock = this.socket;
            const sid = this.sessionId;
            const setSent = (v: boolean) => { this.isPairingSent = v; };
            setTimeout(async () => {
              console.log(`[${sid}] >>> Calling sock.requestPairingCode("${cleanPhone}")...`);
              try {
                const code = await sock.requestPairingCode(cleanPhone);
                console.log(`[${sid}] <<< requestPairingCode returned: "${code}"`);
                await updateSessionPairingCode(sid, code);
                await updateSessionStatus(sid, 'pairing_sent');
                setSent(true);
                console.log(`[${sid}] Pairing code saved to DB!`);
              } catch (err: any) {
                console.error(`[${sid}] <<< requestPairingCode FAILED:`, err);
                console.error(`[${sid}] Error name: ${err?.name}, message: ${err?.message}, stack: ${err?.stack?.slice(0, 200)}`);
                pairingCodeRequested = false; // Allow retry on next QR
              }
            }, 100);
          } else {
            console.error(`[${this.sessionId}] EMPTY phone number! Cannot request pairing code. Raw: "${this.phoneNumber}"`);
          }
        }

        // Auto-restart after 60 seconds to get a fresh code if not connected
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(async () => {
          if (!this.isReady && this.qrCode === qr) {
            console.log(`Code expired for session ${this.sessionId}, restarting connection...`);
            this.reconnectAttempts = 0;
            pairingCodeRequested = false;
            this.socket?.end(new Error('QR_TIMEOUT'));
          }
        }, 62000);
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
        this.isPairingSent = false;

        // 401 = credentials rejected by WhatsApp. Do NOT reconnect immediately;
        // rapid retries worsen IP reputation. Set a 5-minute cooldown.
        if (statusCode === 401) {
          console.log(`Session ${this.sessionId}: 401 auth failure. Setting needs_reauth with 5-min cooldown.`);
          this.isReconnecting = false;
          this.socket = null;
          await updateSessionStatus(this.sessionId, 'needs_reauth');

          const appUrl = SELF_URL || process.env.NEXT_PUBLIC_APP_URL || '';
          if (appUrl) {
            try {
              await fetch(`${appUrl}/api/notify/session-down`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId, userId: this.userId }),
              });
            } catch (err) {
              console.error('Failed to send session-down notification (non-fatal):', err);
            }
          }
          return;
        }

        if (!shouldReconnect) {
          console.log(`Session ${this.sessionId} logged out or kicked. Updating to needs_reauth.`);
          this.isReconnecting = false;
          await updateSessionStatus(this.sessionId, 'needs_reauth');

          const appUrl = SELF_URL || process.env.NEXT_PUBLIC_APP_URL || '';
          if (appUrl) {
            try {
              await fetch(`${appUrl}/api/notify/session-down`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId, userId: this.userId }),
              });
            } catch (err) {
              console.error('Failed to send session-down notification (non-fatal):', err);
            }
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
        this.isPairingSent = false;
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
      isQrPending: !!this.qrCode,
      isPairingSent: this.isPairingSent,
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
export async function syncSessionsWithDb(isWorker?: boolean) {
  const sessions = await getSessionsNeedingBot(SELF_URL || undefined, isWorker);

  for (const session of sessions) {
    const bot = activeBots.get(session.id);

    if (session.state === 'active' && bot) {
      continue;
    }

    // If the session needs a fresh connection but an old dead bot
    // is still in the map, stop it first so a new one can take over.
    // Never kill a bot that has already sent a pairing code and is waiting.
    if (bot && (session.state === 'qr_pending' || session.state === 'pairing_sent')) {
      const status = bot.getStatus();
      if (!status.isReady && !status.isReconnecting && !status.isPairingSent) {
        console.log(`[SYNC] Replacing dead bot for session: ${session.id} (state: ${session.state})`);
        await bot.stop();
        activeBots.delete(session.id);
      }
    }

    if (!activeBots.has(session.id)) {
      console.log(`[SYNC] Starting bot for session: ${session.id} | phone: ${session.phone_number} | state: ${session.state} | worker_url: ${session.worker_url}`);
      const newBot = new BotWaveBot({
        sessionId: session.id,
        userId: session.user_id,
        phoneNumber: session.phone_number,
      });
      activeBots.set(session.id, newBot);
      newBot.start().catch(err => console.error(`[SYNC] Failed to start bot ${session.id}:`, err));

      // Stagger: wait 2 seconds between each session start
      await new Promise(resolve => setTimeout(resolve, SESSION_STAGGER_DELAY));
    }
  }

  for (const [id, bot] of activeBots) {
    const session = sessions.find(s => s.id === id);
    if (!session) {
      // Don't kill bots that are mid-reconnect (e.g. 515 pairing restart)
      // or in qr_pending state during the handshake
      const status = bot.getStatus();
      if (status.isReconnecting || status.isQrPending) {
        continue;
      }
      console.log(`Stopping bot for removed session: ${id}`);
      await bot.stop();
      activeBots.delete(id);
    }
  }
}
