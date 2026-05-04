import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionPairingCode, updateSessionStatus, updateSessionWorker, getSessionUserId, getFeatureEnabled, incrementLeaderboard } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage, handleGroupParticipantsUpdate } from './handlers/MessageHandler';
import { MessageQueue } from './utils/MessageQueue';
import { startPresenceSimulation, stopPresenceSimulation, registerSessionStart } from './utils/advancedAntiban';
import { SELF_URL, getNextWorker } from './workerConfig';
import { EvolutionSocketAdapter } from './evolutionSocket';
import { createInstance, deleteInstance, getPairingCode, getInstanceStatus, setWebhook, trackInstance, untrackInstance } from './evolutionClient';
import P from 'pino';

const USE_EVOLUTION = !!process.env.EVOLUTION_API_URL;

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
  private workerUrl: string | null = null;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
    this.workerUrl = SELF_URL || null;
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
        // If we already sent a pairing code, ignore subsequent QR refreshes
        if (this.isPairingSent) {
          console.log(`[${this.sessionId}] Ignoring QR refresh — pairing code already sent`);
          return;
        }

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

        // 401 = credentials rejected by WhatsApp. Try switching to a different
        // worker IP before giving up. If no other workers, fall back to needs_reauth.
        if (statusCode === 401) {
          this.isReconnecting = false;
          this.isPairingSent = false;
          this.socket = null;

          // Try to switch to a different worker IP before giving up
          const nextWorker = getNextWorker(this.workerUrl);

          if (nextWorker) {
            console.log(`[${this.sessionId}] 401 on worker ${this.workerUrl ?? 'main'} — switching to ${nextWorker}`);
            this.workerUrl = nextWorker;
            await updateSessionWorker(this.sessionId, nextWorker);
            // Session is now qr_pending on the new worker.
            // That worker's sync loop will pick it up within 5 seconds.
            console.log(`[${this.sessionId}] Reassigned to ${nextWorker}. New connection will start shortly.`);
          } else {
            // No other workers available — fall back to needs_reauth
            console.log(`[${this.sessionId}] 401 auth failure. No other workers available. Setting needs_reauth.`);
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

// ─── Evolution API Bot ────────────────────────────────────────────────────────
// Used when EVOLUTION_API_URL is set. Replaces direct Baileys connection with
// Evolution API REST calls. Messages are handled via webhook; this class only
// manages connection lifecycle + presence simulation.

class EvolutionBot {
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private isReady: boolean = false;
  private isPairingSent: boolean = false;
  private isReconnecting: boolean = false;
  private pollHandle: NodeJS.Timeout | null = null;
  private presenceHandle: NodeJS.Timeout | null = null;
  private socketAdapter: EvolutionSocketAdapter | null = null;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  async start(): Promise<void> {
    console.log(`[EVO] Starting session ${this.sessionId} for ${this.phoneNumber}`);
    this.isReconnecting = true;

    // Register for warmup tracking (advanced anti-ban)
    registerSessionStart(this.sessionId);

    try {
      // Clean up any stale instance before creating a new one
      await deleteInstance(this.sessionId);

      // Create instance on Evolution API (includes webhook config)
      await createInstance(this.sessionId, this.phoneNumber);
      console.log(`[EVO] Instance created for ${this.sessionId}`);

      // Ensure webhook is configured (safety net if create didn't set it)
      await setWebhook(this.sessionId);

      // Register for keep-alive pings so Evolution API doesn't auto-delete
      trackInstance(this.sessionId);

      // Wait briefly then fetch pairing code
      await new Promise(r => setTimeout(r, 2000));
      const code = await getPairingCode(this.sessionId, this.phoneNumber);

      if (code) {
        console.log(`[EVO] Pairing code for ${this.sessionId}: ${code}`);
        await updateSessionPairingCode(this.sessionId, code);
        await updateSessionStatus(this.sessionId, 'pairing_sent');
        this.isPairingSent = true;
        this.isReconnecting = false;
      } else {
        console.warn(`[EVO] No pairing code returned for ${this.sessionId}`);
        await updateSessionStatus(this.sessionId, 'inactive');
        this.isReconnecting = false;
        return;
      }

      // Poll Evolution API every 5 seconds to detect connection state changes.
      // Also track how long we've been waiting for a pairing code to be used.
      let pairingWaitStart = Date.now();
      const PAIRING_TIMEOUT_MS = 120_000; // 2 minutes to pair

      this.pollHandle = setInterval(async () => {
        try {
          const state = await getInstanceStatus(this.sessionId);

          if (state === 'open' && !this.isReady) {
            this.isReady = true;
            this.isPairingSent = false;
            this.isReconnecting = false;
            await updateSessionStatus(this.sessionId, 'active');
            console.log(`[EVO] Session ${this.sessionId} is now active!`);

            // Create socket adapter for presence simulation
            this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId);
            this.startPresenceLoop();
          } else if (state === 'close' || state === 'refused') {
            if (this.isReady) {
              // Was connected, now disconnected
              this.isReady = false;
              this.isPairingSent = false;
              await updateSessionStatus(this.sessionId, 'needs_reauth');
              this.stopPresenceLoop();
              console.log(`[EVO] Session ${this.sessionId} closed/refused -> needs_reauth`);

              const appUrl = SELF_URL || process.env.NEXT_PUBLIC_APP_URL || '';
              if (appUrl) {
                try {
                  await fetch(`${appUrl}/api/notify/session-down`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: this.sessionId, userId: this.userId }),
                  });
                } catch (err) {
                  console.error('[EVO] Failed to send session-down notification:', err);
                }
              }
            } else if (this.isPairingSent && Date.now() - pairingWaitStart > PAIRING_TIMEOUT_MS) {
              // Pairing code was never used — timed out
              console.log(`[EVO] Pairing timed out for ${this.sessionId}`);
              await updateSessionStatus(this.sessionId, 'needs_reauth');
              this.isPairingSent = false;
              if (this.pollHandle) {
                clearInterval(this.pollHandle);
                this.pollHandle = null;
              }
            }
          }
        } catch (err) {
          console.error(`[EVO] Poll error for ${this.sessionId}:`, err);
        }
      }, 5000);

    } catch (err) {
      console.error(`[EVO] Failed to start session ${this.sessionId}:`, err);
      await updateSessionStatus(this.sessionId, 'inactive');
      this.isReconnecting = false;
    }
  }

  private startPresenceLoop(): void {
    this.stopPresenceLoop();
    const simulate = async () => {
      if (!this.socketAdapter) return;
      try {
        const hour = new Date().getHours();
        let unavailableProb = 0.2;
        if (hour >= 0 && hour < 6) unavailableProb = 0.8;
        else if (hour >= 6 && hour < 9) unavailableProb = 0.5;
        else if (hour >= 22) unavailableProb = 0.4;
        const shouldBeUnavailable = Math.random() < unavailableProb;
        await this.socketAdapter.sendPresenceUpdate(shouldBeUnavailable ? 'unavailable' : 'available');
      } catch { /* non-critical */ }
      const nextDelay = (5 + Math.random() * 10) * 60 * 1000;
      this.presenceHandle = setTimeout(simulate, nextDelay);
    };
    this.presenceHandle = setTimeout(simulate, 10000 + Math.random() * 20000);
  }

  private stopPresenceLoop(): void {
    if (this.presenceHandle) {
      clearTimeout(this.presenceHandle);
      this.presenceHandle = null;
    }
  }

  async stop(): Promise<void> {
    this.stopPresenceLoop();
    untrackInstance(this.sessionId);
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    try { await deleteInstance(this.sessionId); } catch { /* non-critical */ }
    this.isReady = false;
    this.isPairingSent = false;
    this.isReconnecting = false;
    this.socketAdapter = null;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: null as string | null,
      isReconnecting: this.isReconnecting,
      isQrPending: false,
      isPairingSent: this.isPairingSent,
    };
  }
}

// ─── Shared Bot Map + Sync ────────────────────────────────────────────────────

type AnyBot = BotWaveBot | EvolutionBot;
const activeBots: Map<string, AnyBot> = new Map();

export function initializeBot() {
  return {
    start: async () => {
      await initDatabase();
      console.log(`BotWave bot service started (mode: ${USE_EVOLUTION ? 'Evolution API' : 'Baileys direct'})`);
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
      const newBot = USE_EVOLUTION
        ? new EvolutionBot({
            sessionId: session.id,
            userId: session.user_id,
            phoneNumber: session.phone_number,
          })
        : new BotWaveBot({
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
