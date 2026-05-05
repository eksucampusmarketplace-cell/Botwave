import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionPairingCode, updateSessionStatus, updateSessionWorker, clearAuthState, getSessionUserId, getFeatureEnabled, incrementLeaderboard, acquirePairingLock, releasePairingLock, isWorkerPairingLocked, logPairingEvent, updateQueuePosition } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage, handleGroupParticipantsUpdate } from './handlers/MessageHandler';
import { MessageQueue } from './utils/MessageQueue';
import { startPresenceSimulation, stopPresenceSimulation, getBrowserConfigForSession } from './utils/advancedAntiban';
import { SELF_URL, getNextWorker } from './workerConfig';
import { tryAcquireLock, releaseLock, refreshHeartbeat, detectConflict } from './sessionCoordinator';
import { EvolutionSocketAdapter } from './evolutionSocket';
import { createInstance, deleteInstance, getPairingCode, getInstanceStatus, setWebhook, trackInstance, untrackInstance, restartInstance, connectInstance } from './evolutionClient';
import { queueLink, cancelPendingLinks } from './linkQueue';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let HttpsProxyAgent: any;
try {
  HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
  console.log('[PROXY] https-proxy-agent loaded successfully');
} catch (err) {
  console.error('[PROXY] FAILED to load https-proxy-agent:', err);
  HttpsProxyAgent = null;
}
import P from 'pino';

const USE_EVOLUTION = !!process.env.EVOLUTION_API_URL;

// Cast to any: pino v10 types are incompatible with Baileys 6.x Logger typedef
const logger = P({ level: 'info' }) as any;

const MAX_RECONNECT_ATTEMPTS = 5;
const SESSION_STAGGER_DELAY = 5000;
const PAIRING_TIMEOUT_MS = 180_000;

// Proxy pool for Baileys direct mode — distributes WebSocket connections
// across different IPs to avoid WhatsApp 428 bans from shared Render IP.
const PROXY_LIST = (process.env.PROXY_LIST || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);
let baileysProxyCounter = 0;

// Log proxy pool status at startup
if (PROXY_LIST.length > 0) {
  console.log(`[PROXY] Baileys proxy pool: ${PROXY_LIST.length} proxies loaded`);
  PROXY_LIST.forEach((p, i) => {
    const parts = p.split(':');
    console.log(`[PROXY]   #${i + 1}: ${parts[0]}:${parts[1]} (user: ${parts[2] || 'none'})`);
  });
} else {
  console.log('[PROXY] No PROXY_LIST env var — Baileys will connect with server IP directly');
}

function getNextBaileysProxy(): any | undefined {
  if (PROXY_LIST.length === 0 || !HttpsProxyAgent) return undefined;
  const entry = PROXY_LIST[baileysProxyCounter % PROXY_LIST.length];
  baileysProxyCounter++;
  const parts = entry.split(':');
  if (parts.length < 4) {
    console.warn(`[PROXY] Invalid proxy entry (expected host:port:user:pass): ${entry}`);
    return undefined;
  }
  const [host, port, user, pass] = parts;
  const proxyUrl = `http://${user}:${pass}@${host}:${port}`;
  const proxyIndex = ((baileysProxyCounter - 1) % PROXY_LIST.length) + 1;
  console.log(`[PROXY] Baileys direct: assigned proxy #${proxyIndex}/${PROXY_LIST.length} → ${host}:${port} (user: ${user})`);
  return new HttpsProxyAgent(proxyUrl);
}

// Cache the Baileys/WhatsApp Web version to avoid fetching on every start().
// fetchLatestBaileysVersion() adds 500-2000ms latency per call and risks
// returning a version incompatible with the current Baileys library.
let cachedWAVersion: [number, number, number] | null = null;

async function getWAVersion(): Promise<[number, number, number]> {
  if (!cachedWAVersion) {
    const { version } = await fetchLatestBaileysVersion();
    cachedWAVersion = version;
    console.log(`[WA-VERSION] Cached Baileys version: ${JSON.stringify(cachedWAVersion)}`);
  }
  return cachedWAVersion;
}

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
  private pairingStartedAt: number = 0;

  public getSocket(): any { return this.isReady ? this.socket : null; }

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
    this.workerUrl = SELF_URL || null;
  }

  async start(): Promise<void> {
    console.log(`[${this.sessionId}] start() called. Phone: ${this.phoneNumber}`);

    // Mark pairing start IMMEDIATELY — before any async calls — so the
    // sync loop (which runs every 5s) sees this bot as "starting" and
    // doesn't create a duplicate. Without this, the async gap between
    // activeBots.set() and the first await allows a concurrent sync
    // cycle to see pairingStartedAt=0 and start another bot.
    // Cleared below if the session turns out to be already registered.
    this.pairingStartedAt = Date.now();

    console.log(`[${this.sessionId}] Loading auth state from Supabase...`);
    const { state, saveCreds } = await useSupabaseAuthState(this.sessionId);
    console.log(`[${this.sessionId}] Auth state loaded. Registered: ${state.creds.registered}`);

    // Session is already registered — no pairing needed. Clear the
    // early pairingStartedAt so the sync loop doesn't treat this as
    // a pairing-in-progress session (which would block other sessions).
    if (state.creds.registered) {
      this.pairingStartedAt = 0;
    }

    let version: [number, number, number];
    try {
      console.log(`[${this.sessionId}] Getting cached Baileys version...`);
      version = await getWAVersion();
      console.log(`[${this.sessionId}] Baileys version: ${JSON.stringify(version)}`);
    } catch (err) {
      console.error(`[${this.sessionId}] CRITICAL: Failed to get Baileys version:`, err);
      throw err;
    }

    // Evolution API does NOT set browser config when using phone number pairing.
    // Setting a custom browser changes the companion_platform_id sent to WhatsApp
    // during the link_code_companion_reg handshake, which can cause pairing rejection.
    // Only set browser fingerprint diversity AFTER successful pairing (on reconnect).
    const isRegistered = state.creds.registered;
    const browserConfig = isRegistered ? getBrowserConfigForSession(this.sessionId) : undefined;
    // Get proxy agent for this session's WebSocket connection
    const proxyAgent = getNextBaileysProxy();
    if (proxyAgent) {
      console.log(`[${this.sessionId}] Creating WASocket with PROXY agent...`);
    } else {
      console.log(`[${this.sessionId}] Creating WASocket WITHOUT proxy (direct IP)`);
    }
    console.log(`[${this.sessionId}] Creating WASocket... registered=${isRegistered} browser=${JSON.stringify(browserConfig || 'default')}`);
    this.socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      ...(browserConfig ? { browser: browserConfig } : {}),
      ...(proxyAgent ? { agent: proxyAgent, fetchAgent: proxyAgent } : {}),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 30_000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30_000,
      retryRequestDelayMs: 350,
      fireInitQueries: true,
      qrTimeout: PAIRING_TIMEOUT_MS,
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
      const { connection, lastDisconnect, qr, isNewLogin } = update;

      console.log(`[${this.sessionId}] connection.update:`, JSON.stringify({ connection, qr: !!qr, registered: this.socket?.authState?.creds?.registered, isNewLogin: isNewLogin || undefined }));

      // isNewLogin = true means WhatsApp accepted the pairing code
      if (isNewLogin) {
        console.log(`[${this.sessionId}] PAIRING SUCCESS — WhatsApp accepted the pairing code! Connection will restart to complete handshake.`);
      }

      // When we receive a QR, the WebSocket IS connected and ready.
      // Request pairing code here — this is the right moment because
      // sendNode() requires an active WebSocket.
      // IMPORTANT: Each QR refresh means Baileys cycled the connection
      // and generated new identity keys. Any previously issued pairing
      // code is now INVALID. We MUST request a fresh code each time.
      if (qr && !this.socket.authState.creds.registered) {
        this.qrCode = qr;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 180 * 1000);
        await updateSessionQR(this.sessionId, qr, expiresAt.toISOString(), now.toISOString());

        {
          const cleanPhone = this.phoneNumber.replace(/\D/g, '');
          console.log(`[${this.sessionId}] Phone raw: "${this.phoneNumber}" -> cleaned: "${cleanPhone}"`);
          if (cleanPhone) {
            // Use the pairing queue to serialize pairing code requests across
            // all sessions on this worker. This prevents multiple concurrent
            // requestPairingCode() calls which trigger WhatsApp 428 errors.
            try {
              console.log(`[${this.sessionId}] >>> Queuing pairing code request for "${cleanPhone}"...`);
              const code = await queueLink(this.sessionId, cleanPhone, async (phone: string) => {
                await delay(2000);
                return this.socket.requestPairingCode(phone);
              });
              console.log(`[${this.sessionId}] <<< requestPairingCode returned: "${code}"`);
              // Guard: if a terminal handler (428, loggedOut, max-retries) ran
              // while this request was in-flight, the session is already in
              // needs_reauth. Do NOT overwrite that state with pairing_sent.
              // pairingStartedAt === -1 is the sentinel for "terminated".
              if (this.pairingStartedAt === -1 || !this.socket) {
                console.log(`[${this.sessionId}] Pairing code "${code}" received but session already terminated (pairingStartedAt=${this.pairingStartedAt}, socket=${!!this.socket}) — discarding`);
                return;
              }
              await updateSessionPairingCode(this.sessionId, code);
              await updateSessionStatus(this.sessionId, 'pairing_sent');
              this.isPairingSent = true;
              this.pairingStartedAt = Date.now();
              pairingCodeRequested = true;
              console.log(`[${this.sessionId}] Pairing code saved to DB!`);
              logPairingEvent(this.sessionId, 'code_generated', this.workerUrl).catch(() => {});
            } catch (err: any) {
              console.error(`[${this.sessionId}] <<< requestPairingCode FAILED:`, err);
              console.error(`[${this.sessionId}] Error name: ${err?.name}, message: ${err?.message}, stack: ${err?.stack?.slice(0, 200)}`);
              pairingCodeRequested = false;
            }
          } else {
            console.error(`[${this.sessionId}] EMPTY phone number! Cannot request pairing code. Raw: "${this.phoneNumber}"`);
          }
        }

        // Auto-restart after 3 minutes to get a fresh code if not connected.
        // This matches the "CODE VALID FOR" countdown shown in the UI and gives
        // users enough time to navigate WhatsApp Settings > Linked Devices.
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(async () => {
          // Guard: if a terminal handler (428, loggedOut, max-retries) already
          // moved the session to needs_reauth and cleared the socket, do NOT
          // overwrite that state. The timer was scheduled before the error
          // occurred and is now stale.
          if (this.pairingStartedAt <= 0 || !this.socket) {
            console.log(`[${this.sessionId}] QR timeout fired but session already terminated (pairingStartedAt=${this.pairingStartedAt}, socket=${!!this.socket}) — skipping restart`);
            return;
          }
          if (!this.isReady && this.qrCode === qr) {
            console.log(`Code expired for session ${this.sessionId}, restarting connection...`);
            // Reset pairingStartedAt BEFORE closing so syncSessionsWithDb
            // sees this session as "pairing in progress" and doesn't start
            // another session concurrently during the restart window.
            this.pairingStartedAt = Date.now();
            this.reconnectAttempts = 0;
            pairingCodeRequested = false;
            this.isPairingSent = false;
            // Clear stale QR display: update state to qr_pending and clear
            // the expired pairing code so the UI shows "Generating..." instead
            // of displaying the stale, expired code.
            await updateSessionStatus(this.sessionId, 'qr_pending');
            await updateSessionPairingCode(this.sessionId, '');
            // Clear stale auth state before reconnecting so the next
            // attempt generates fresh credentials instead of reusing
            // the incomplete pairing creds (which would cause a 401).
            await clearAuthState(this.sessionId);
            this.socket?.end(new Error('QR_TIMEOUT'));
          }
        }, PAIRING_TIMEOUT_MS);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorMessage = (lastDisconnect?.error as Boom)?.message || 'unknown';
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[${this.sessionId}] Connection closed. statusCode=${statusCode} error="${errorMessage}" shouldReconnect=${shouldReconnect} reconnectAttempts=${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} isPairingSent=${this.isPairingSent} isReconnecting=${this.isReconnecting}`);

        // Baileys can fire duplicate close events (e.g. stream error + websocket close).
        // If we already handled a close and are mid-reconnect with no active socket,
        // or the session was already terminated (pairingStartedAt === -1), ignore
        // the stale event to prevent overwriting the DB state.
        if (this.pairingStartedAt === -1) {
          console.log(`Session ${this.sessionId}: ignoring close event — session already terminated`);
          return;
        }
        if (this.isReconnecting && !this.socket) {
          console.log(`Session ${this.sessionId}: ignoring duplicate close event (already reconnecting)`);
          return;
        }

        this.isReady = false;
        this.isPairingSent = false;

        // 401 = credentials rejected by WhatsApp (stale/invalid auth state).
        // Following Evolution API's pattern: clear stale creds and retry with
        // a fresh pairing flow instead of immediately giving up.
        if (statusCode === 401) {
          this.isPairingSent = false;
          this.socket = null;
          cancelPendingLinks(this.sessionId);

          console.log(`[${this.sessionId}] 401 auth failure on worker ${this.workerUrl ?? 'main'}. Clearing stale auth and retrying fresh pairing...`);
          await clearAuthState(this.sessionId);

          // If we haven't exhausted reconnect attempts, retry on the same worker
          // with fresh credentials (auth_state cleared → next start() gets new creds).
          if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            this.isReconnecting = true;
            await updateSessionStatus(this.sessionId, 'qr_pending');
            const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
            console.log(`[${this.sessionId}] 401 retry ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms with fresh creds`);
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.start(), delay);
            return;
          }

          // Exhausted retries on this worker — try switching to a different worker IP
          const nextWorker = getNextWorker(this.workerUrl);

          if (nextWorker) {
            console.log(`[${this.sessionId}] 401 retries exhausted on ${this.workerUrl ?? 'main'} — switching to ${nextWorker}`);
            this.workerUrl = nextWorker;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            await updateSessionWorker(this.sessionId, nextWorker);
            console.log(`[${this.sessionId}] Reassigned to ${nextWorker}. Worker sync loop will pick it up.`);
          } else {
            // All workers exhausted — fall back to needs_reauth so user can re-pair
            console.log(`[${this.sessionId}] 401 auth failure. All retries and workers exhausted. Setting needs_reauth and releasing lock.`);
            this.isReconnecting = false;
            await releaseLock(this.sessionId);
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
                console.error(`[${this.sessionId}] Failed to send session-down notification (non-fatal):`, err);
              }
            }
          }
          return;
        }

        // 428 = "Connection Terminated by Server" during pairing.
        // WhatsApp sends this when multiple unregistered WebSocket connections
        // open from the same IP. Reconnecting is harmful: each attempt creates
        // a NEW pairing code (invalidating the one the user entered) and opens
        // yet another WebSocket that will also be terminated.
        // Fail fast so the user can retry from a clean state.
        if (statusCode === 428 && !this.isReady) {
          console.log(`[ERR_428] [${this.sessionId}] 428 during pairing — WhatsApp rejected concurrent connection. Not reconnecting.`);
          logPairingEvent(this.sessionId, '428_received', this.workerUrl, 428).catch(() => {});
          // Cancel queued pairing code requests so they don't resolve after
          // cleanup and overwrite needs_reauth back to pairing_sent.
          cancelPendingLinks(this.sessionId);
          // Cancel the QR expiry timer to prevent it from overwriting
          // needs_reauth back to qr_pending after this handler finishes.
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.isReconnecting = false;
          this.pairingStartedAt = -1;
          this.isPairingSent = false;
          this.socket = null;
          await clearAuthState(this.sessionId);
          await releaseLock(this.sessionId);
          await releasePairingLock(this.sessionId);
          await updateSessionStatus(this.sessionId, 'needs_reauth');
          return;
        }

        if (!shouldReconnect) {
          console.log(`[${this.sessionId}] Logged out by WhatsApp (statusCode=${statusCode}). Clearing auth, releasing lock, setting needs_reauth.`);
          cancelPendingLinks(this.sessionId);
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.isReconnecting = false;
          this.pairingStartedAt = -1;
          this.socket = null;
          await clearAuthState(this.sessionId);
          await releaseLock(this.sessionId);
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
            console.log(`[${this.sessionId}] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Clearing auth, releasing lock, stopping.`);
            cancelPendingLinks(this.sessionId);
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
              this.reconnectTimeout = null;
            }
            this.isReconnecting = false;
            this.pairingStartedAt = -1;
            await clearAuthState(this.sessionId);
            await releaseLock(this.sessionId);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
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
          console.log(`[${this.sessionId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}). statusCode=${statusCode}`);
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
        console.log(`[${this.sessionId}] Connection OPEN. Pairing successful! reconnectAttempts=${this.reconnectAttempts} workerUrl=${this.workerUrl ?? 'main'}`);
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
        // Release DB pairing lock and log success
        releasePairingLock(this.sessionId).catch(() => {});
        logPairingEvent(this.sessionId, 'pairing_success', this.workerUrl).catch(() => {});

        // Start presence simulation (advanced anti-ban)
        startPresenceSimulation(this.socket, this.sessionId);
      }
    });

    this.socket.ev.on('messages.upsert', async (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';
          // Allow fromMe commands (userbot mode: owner can use !help etc.)
          if (msg.key.fromMe && !text.trimStart().startsWith('!')) continue;
          await handleMessage(msg, this.socket, this.messageQueue ?? undefined);
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
    cancelPendingLinks(this.sessionId);
    this.pairingStartedAt = -1;
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
      pairingStartedAt: this.pairingStartedAt,
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
  private pairingStartedAt: number = 0;
  private pollHandle: NodeJS.Timeout | null = null;
  private presenceHandle: NodeJS.Timeout | null = null;
  private socketAdapter: EvolutionSocketAdapter | null = null;
  private previousDbState: string;

  public getSocket(): any { return this.isReady ? this.socketAdapter : null; }

  constructor(config: BotConfig & { previousDbState?: string }) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
    this.previousDbState = config.previousDbState || 'qr_pending';
  }

  /**
   * Try to reconnect to an existing Evolution API instance.
   * Retries with backoff because the Evolution API may still be loading
   * instances from its database after a concurrent restart.
   * Returns true if the instance was found and is now connected/connecting.
   */
  private async tryReconnectExisting(): Promise<boolean> {
    const MAX_RECONNECT_RETRIES = 4;
    const BASE_DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_RECONNECT_RETRIES; attempt++) {
      console.log(`[EVO] Reconnect attempt ${attempt}/${MAX_RECONNECT_RETRIES} for ${this.sessionId}...`);

      const state = await getInstanceStatus(this.sessionId);
      console.log(`[EVO] Instance state for ${this.sessionId}: ${state}`);

      if (state === 'unknown') {
        if (attempt < MAX_RECONNECT_RETRIES) {
          const waitMs = BASE_DELAY_MS * attempt;
          console.log(`[EVO] Instance ${this.sessionId} not found yet — Evolution API may still be loading. Retrying in ${waitMs}ms...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        console.log(`[EVO] Instance ${this.sessionId} not found after ${MAX_RECONNECT_RETRIES} attempts — cannot reconnect`);
        return false;
      }

      // Instance exists — ensure webhook points to this deploy's URL
      await setWebhook(this.sessionId);
      trackInstance(this.sessionId);

      if (state === 'open') {
        console.log(`[EVO] Instance ${this.sessionId} is already open — marking active`);
        this.isReady = true;
        this.isReconnecting = false;
        this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId);
        await updateSessionStatus(this.sessionId, 'active');
        this.startPresenceLoop();
        return true;
      }

      if (state === 'close' || state === 'connecting') {
        console.log(`[EVO] Instance ${this.sessionId} is ${state} — attempting reconnect via connect endpoint`);
        const connectState = await connectInstance(this.sessionId);
        console.log(`[EVO] connectInstance result for ${this.sessionId}: ${connectState}`);

        if (connectState === 'open') {
          this.isReady = true;
          this.isReconnecting = false;
          this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId);
          await updateSessionStatus(this.sessionId, 'active');
          this.startPresenceLoop();
          return true;
        }

        if (connectState === 'connecting') {
          console.log(`[EVO] Instance ${this.sessionId} is connecting — poll loop will track state`);
          return true;
        }

        // Connection attempt didn't succeed — retry if attempts remain
        if (attempt < MAX_RECONNECT_RETRIES) {
          const waitMs = BASE_DELAY_MS * attempt;
          console.log(`[EVO] Connect returned ${connectState} for ${this.sessionId} — retrying in ${waitMs}ms...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
      }
    }

    console.log(`[EVO] All reconnect attempts exhausted for ${this.sessionId} — will fall through to fresh pairing`);
    return false;
  }

  async start(): Promise<void> {
    console.log(`[EVO] Starting session ${this.sessionId} for ${this.phoneNumber} (previousDbState=${this.previousDbState})`);
    this.isReconnecting = true;

    // Mark pairing start EARLY so the queue blocks other sessions immediately.
    // Only for fresh sessions that will need to pair (not reconnecting existing ones).
    if (this.previousDbState === 'qr_pending') {
      this.pairingStartedAt = Date.now();
    }

    try {
      // If the session was previously active or mid-pairing, try to reconnect
      // to the existing Evolution API instance instead of deleting and recreating.
      // This preserves the WhatsApp linked device across redeploys.
      // For pairing_sent: the pairing may have completed on Evolution API's side
      // even though Botwave restarted before seeing the connection.update webhook.
      if (this.previousDbState === 'active' || this.previousDbState === 'pairing_sent') {
        const reconnected = await this.tryReconnectExisting();
        if (reconnected) {
          console.log(`[EVO] Successfully reconnected session ${this.sessionId} — skipping fresh pairing`);
          this.startPollLoop();
          return;
        }
        console.log(`[EVO] Reconnect failed for ${this.sessionId} — falling through to fresh instance creation`);
      }

      // Clean up any stale instance before creating a new one
      await deleteInstance(this.sessionId);

      // Wait for Evolution API to finish cleaning up before creating
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create instance on Evolution API (includes webhook config)
      const createResult = await createInstance(this.sessionId, this.phoneNumber) as Record<string, unknown> | null;
      if (createResult?.status === 403 || createResult?.error) {
        console.error(`[EVO] Failed to create instance for ${this.sessionId}:`, JSON.stringify(createResult));
        await updateSessionStatus(this.sessionId, 'inactive');
        this.isReconnecting = false;
        return;
      }
      console.log(`[EVO] Instance created for ${this.sessionId}`);

      // Ensure webhook is configured (safety net if create didn't set it)
      await setWebhook(this.sessionId);

      // Register for keep-alive pings so Evolution API doesn't auto-delete
      trackInstance(this.sessionId);

      // Fetch pairing code — getPairingCode now handles its own polling
      const code = await getPairingCode(this.sessionId, this.phoneNumber);

      if (code) {
        console.log(`[EVO] Pairing code for ${this.sessionId}: ${code}`);
        await updateSessionPairingCode(this.sessionId, code);
        await updateSessionStatus(this.sessionId, 'pairing_sent');
        this.isPairingSent = true;
        this.pairingStartedAt = Date.now();
        this.isReconnecting = false;
      } else {
        console.warn(`[EVO] No pairing code returned for ${this.sessionId}`);
        await updateSessionStatus(this.sessionId, 'inactive');
        this.isReconnecting = false;
        return;
      }

      // Start poll loop to monitor connection state
      this.startPollLoop();

    } catch (err) {
      console.error(`[EVO] Failed to start session ${this.sessionId}:`, err);
      await updateSessionStatus(this.sessionId, 'inactive');
      this.isReconnecting = false;
    }
  }

  /**
   * Poll Evolution API every 5 seconds to detect connection state changes.
   * Handles transitions between connecting, open, close, and unknown states.
   * Tracks both pairing and reconnection lifecycles with proper timeouts.
   */
  private startPollLoop(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }

    let pairingWaitStart = Date.now();
    // Use module-level PAIRING_TIMEOUT_MS (180s = 3 min for pairing)
    const RECONNECT_TIMEOUT_MS = 60_000; // 1 min for reconnecting after redeploy
    const reconnectStart = Date.now();
    let unknownStateCount = 0;
    const MAX_UNKNOWN_BEFORE_RECREATE = 6;
    let isRecreating = false;

    this.pollHandle = setInterval(async () => {
      if (isRecreating) return;

      try {
        const state = await getInstanceStatus(this.sessionId);

        if (state === 'open' && !this.isReady) {
          unknownStateCount = 0;
          this.isReady = true;
          this.isPairingSent = false;
          this.isReconnecting = false;
          await updateSessionStatus(this.sessionId, 'active');
          console.log(`[EVO] Session ${this.sessionId} is now active!`);

          this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId);
          this.startPresenceLoop();
        } else if (state === 'connecting') {
          unknownStateCount = 0;
          // Waiting for connection — applies to both pairing and reconnect.
          // Check for timeouts so we don't wait forever.
          if (this.isPairingSent) {
            // Pairing in progress — use pairing timeout
          } else if (this.isReconnecting && Date.now() - reconnectStart > RECONNECT_TIMEOUT_MS) {
            console.log(`[EVO] Reconnect timed out for ${this.sessionId} — stuck in connecting for ${RECONNECT_TIMEOUT_MS / 1000}s`);
            this.isReconnecting = false;
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }
          }
        } else if (state === 'close' || state === 'refused') {
          unknownStateCount = 0;
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
            console.log(`[EVO] Pairing timed out for ${this.sessionId}`);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            this.isPairingSent = false;
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }
          } else if (this.isReconnecting && !this.isPairingSent) {
            // Reconnect attempt ended with close/refused — the session is
            // genuinely disconnected. Update DB immediately to avoid stale
            // "active" state in the dashboard.
            console.log(`[EVO] Reconnect ended with ${state} for ${this.sessionId} — marking needs_reauth`);
            this.isReconnecting = false;
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }
          }
        } else if (state === 'unknown') {
          unknownStateCount++;
          if (this.isPairingSent && unknownStateCount < MAX_UNKNOWN_BEFORE_RECREATE * 2) {
            // User has a pairing code in hand — don't recreate yet, wait longer
            // to tolerate short network hiccups to the Evolution API endpoint
            console.log(`[EVO] Skipping recreate for ${this.sessionId} — pairing code is in user's hand (${unknownStateCount} unknown polls)`);
          } else if (unknownStateCount >= MAX_UNKNOWN_BEFORE_RECREATE) {
            console.log(`[EVO] Instance gone for ${this.sessionId} (${unknownStateCount} unknown polls). Recreating...`);
            isRecreating = true;
            unknownStateCount = 0;
            try {
              await deleteInstance(this.sessionId);
              await new Promise(resolve => setTimeout(resolve, 2000));
              await createInstance(this.sessionId, this.phoneNumber);
              await setWebhook(this.sessionId);
              const freshCode = await getPairingCode(this.sessionId, this.phoneNumber);
              if (freshCode) {
                await updateSessionPairingCode(this.sessionId, freshCode);
                await updateSessionStatus(this.sessionId, 'pairing_sent');
                this.isPairingSent = true;
                this.pairingStartedAt = Date.now();
                pairingWaitStart = Date.now();
                console.log(`[EVO] Instance recreated for ${this.sessionId}, new code: ${freshCode}`);
              } else {
                console.warn(`[EVO] Instance recreated but no pairing code for ${this.sessionId}`);
                await updateSessionStatus(this.sessionId, 'qr_pending');
              }
            } catch (err) {
              console.error(`[EVO] Failed to recreate instance for ${this.sessionId}:`, err);
            }
            isRecreating = false;
          }
        }
      } catch (err) {
        console.error(`[EVO] Poll error for ${this.sessionId}:`, err);
      }
    }, 5000);
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
        // Only send 'unavailable' — avoid 'available' which triggers
        // "syncing with WhatsApp" notifications on the user's phone
        if (Math.random() < unavailableProb) {
          await this.socketAdapter.sendPresenceUpdate('unavailable');
        }
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

  async stop(preserveInstance = false): Promise<void> {
    this.stopPresenceLoop();
    untrackInstance(this.sessionId);
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    if (!preserveInstance) {
      try { await deleteInstance(this.sessionId); } catch { /* non-critical */ }
    } else {
      console.log(`[EVO] Preserving instance ${this.sessionId} for reconnect after restart`);
    }
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
      pairingStartedAt: this.pairingStartedAt,
    };
  }
}

// ─── Shared Bot Map + Sync ────────────────────────────────────────────────────

type AnyBot = BotWaveBot | EvolutionBot;
const activeBots: Map<string, AnyBot> = new Map();

export function getActiveBotSocket(sessionId: string): any | null {
  const bot = activeBots.get(sessionId);
  return bot?.getSocket() ?? null;
}

export function initializeBot() {
  return {
    start: async () => {
      await initDatabase();
      console.log(`BotWave bot service started (mode: ${USE_EVOLUTION ? 'Evolution API' : 'Baileys direct'})`);

      // Warn if Evolution API may not persist sessions across redeploys
      if (USE_EVOLUTION) {
        console.log('[BOT] Evolution API mode — ensure DATABASE_SAVE_DATA_INSTANCE=true is set on your Evolution API service for sessions to survive redeploys');
      }
    },
    stop: async (preserveInstances = false) => {
      for (const [id, bot] of activeBots) {
        if (bot instanceof EvolutionBot) {
          await bot.stop(preserveInstances);
        } else {
          await bot.stop();
        }
        await releaseLock(id);
      }
      activeBots.clear();
    },
  };
}

/**
 * Sync sessions from DB — starts new bots and stops removed ones.
 * Only one session pairs at a time per worker to avoid WhatsApp 428
 * ("Connection Terminated by Server") when multiple unregistered
 * WebSocket connections open from the same IP simultaneously.
 * Sessions already pairing for >3 minutes are considered stale and
 * don't block new pairings.
 */
let isSyncing = false;
export async function syncSessionsWithDb(isWorker?: boolean) {
  // Prevent overlapping sync cycles. setInterval fires every 5s but
  // this function can take longer due to stagger delays (5s per session).
  // Without this guard, concurrent cycles can race on activeBots state.
  if (isSyncing) return;
  isSyncing = true;
  try {
    await _syncSessionsWithDbInner(isWorker);
  } finally {
    isSyncing = false;
  }
}

async function _syncSessionsWithDbInner(isWorker?: boolean) {
  const sessions = await getSessionsNeedingBot(SELF_URL || undefined, isWorker);

  // Release stale DB-level pairing locks for sessions on THIS worker that
  // have no corresponding active bot in memory. This handles:
  //   - Worker restart/crash (activeBots is empty, but DB locks persist)
  //   - Reconnect API reassigning a session without clearing the lock
  //   - Any handler that forgot to call releasePairingLock()
  // Without this, a session can block itself (its own stale lock makes
  // isWorkerPairingLocked return true, preventing it from starting).
  const staleReleases: Promise<void>[] = [];
  for (const session of sessions) {
    if (!activeBots.has(session.id)) {
      staleReleases.push(releasePairingLock(session.id).catch(() => {}));
    }
  }
  // Wait for stale lock releases to complete before checking
  // isWorkerPairingLocked — otherwise the check would still see them.
  if (staleReleases.length > 0) {
    await Promise.all(staleReleases);
  }

  // Check if any in-memory bot is actively pairing (started <3 min ago).
  // pairingStartedAt is set BEFORE the WebSocket opens (in start()) so
  // even bots still connecting count as "pairing in progress".
  // Use module-level PAIRING_TIMEOUT_MS (180s = 3 min, matches pairing code expiry)
  let pairingInProgress = false;
  for (const [, bot] of activeBots) {
    const status = bot.getStatus();
    if (!status.isReady && status.pairingStartedAt > 0) {
      const elapsed = Date.now() - status.pairingStartedAt;
      if (elapsed < PAIRING_TIMEOUT_MS) {
        pairingInProgress = true;
        break;
      }
    }
  }

  // Also check the DB-level pairing lock so cross-worker pairing is serialized.
  // This catches cases where another worker is pairing but this worker's
  // in-memory state doesn't know about it (shared-nothing architecture).
  if (!pairingInProgress) {
    try {
      const dbLocked = await isWorkerPairingLocked(SELF_URL || null);
      if (dbLocked) {
        pairingInProgress = true;
      }
    } catch (err) {
      // Non-critical — fall back to in-memory check only
      console.warn('[SYNC] Failed to check DB pairing lock:', err);
    }
  }

  for (const session of sessions) {
    const bot = activeBots.get(session.id);

    if (session.state === 'active' && bot) {
      continue;
    }

    // If the session needs a fresh connection but an old dead bot
    // is still in the map, stop it first so a new one can take over.
    // Never kill a bot that is actively pairing or waiting for a code.
    if (bot && (session.state === 'qr_pending' || session.state === 'pairing_sent')) {
      const status = bot.getStatus();
      // Guard: pairingStartedAt > 0 means the bot is actively trying to pair
      // (set before WebSocket opens). isPairingSent means code was already sent.
      // isReconnecting means Baileys is reconnecting after a drop.
      // Only replace if NONE of these are true — the bot is truly dead.
      const isActivelyPairing = status.pairingStartedAt > 0 && (Date.now() - status.pairingStartedAt) < PAIRING_TIMEOUT_MS;
      if (!status.isReady && !status.isReconnecting && !status.isPairingSent && !isActivelyPairing) {
        console.log(`[SYNC] Replacing dead bot for session: ${session.id} (state: ${session.state})`);
        await bot.stop();
        activeBots.delete(session.id);
      } else {
        console.log(`[SYNC] Keeping active bot for session: ${session.id.slice(0, 8)} (isPairingSent=${status.isPairingSent} pairingAge=${status.pairingStartedAt > 0 ? Math.round((Date.now() - status.pairingStartedAt) / 1000) + 's' : 'none'} isReconnecting=${status.isReconnecting})`);
      }
    }

    if (!activeBots.has(session.id)) {
      // Queue pairing: skip starting new sessions while another is actively
      // pairing on this worker. The session stays in the DB and will be
      // picked up on the next sync cycle (5s) once the current pairing
      // completes or its 3-minute timeout expires.
      if (pairingInProgress && (session.state === 'qr_pending' || session.state === 'pairing_sent')) {
        console.log(`[SYNC] Session ${session.id.slice(0, 8)} queued — another session is pairing on this worker`);
        // Update queue position so the dashboard can show the user their place
        updateQueuePosition(session.id, 1).catch(() => {});
        continue;
      }
      // Check for conflicts — another instance may already be running this session
      const conflict = await detectConflict(session.id);
      if (conflict) {
        console.log(`[SYNC] Session ${session.id.slice(0, 8)} is actively managed by ${conflict} — skipping to avoid duplicate`);
        continue;
      }

      // Try to acquire lock — idempotent, prevents duplicates
      const locked = await tryAcquireLock(session.id);
      if (!locked) {
        console.log(`[SYNC] Could not acquire lock for session ${session.id.slice(0, 8)} — another instance owns it`);
        continue;
      }

      // If the session is in pairing_sent but we have no active bot for it,
      // the process restarted mid-pairing.
      if (session.state === 'pairing_sent') {
        if (USE_EVOLUTION) {
          // In Evolution API mode, the pairing may have completed on the
          // Evolution API side. Pass the state through so EvolutionBot can
          // check the actual instance status before deciding to re-pair.
          console.log(`[SYNC] Session ${session.id} is pairing_sent (Evolution mode) — will check instance status before re-pairing`);
        } else {
          // In direct Baileys mode, the old pairing code is dead (WebSocket
          // gone). Reset to qr_pending with fresh auth to avoid a 401 from
          // WhatsApp seeing two connections with the same creds.
          console.log(`[SYNC] Session ${session.id} is pairing_sent but no active bot — process likely restarted. Resetting to qr_pending with fresh auth.`);
          await clearAuthState(session.id);
          await updateSessionStatus(session.id, 'qr_pending');
          session.state = 'qr_pending';
        }
      }

      console.log(`[SYNC] Starting bot for session: ${session.id} | phone: ${session.phone_number} | state: ${session.state} | worker: ${session.worker_url || 'main'} | will_pair: ${session.state === 'qr_pending' || session.state === 'pairing_sent'}`);
      const newBot = USE_EVOLUTION
        ? new EvolutionBot({
            sessionId: session.id,
            userId: session.user_id,
            phoneNumber: session.phone_number,
            previousDbState: session.state,
          })
        : new BotWaveBot({
            sessionId: session.id,
            userId: session.user_id,
            phoneNumber: session.phone_number,
          });
      activeBots.set(session.id, newBot);
      newBot.start().catch(err => console.error(`[SYNC] Failed to start bot ${session.id}:`, err));

      // Mark pairing in progress so subsequent sessions in this cycle are queued
      if (session.state === 'qr_pending' || session.state === 'pairing_sent') {
        pairingInProgress = true;
        // Acquire DB-level pairing lock so other workers see it too
        acquirePairingLock(session.id).catch(() => {});
        // Clear queue position since this session is now active
        updateQueuePosition(session.id, null).catch(() => {});
        // Log pairing event for audit trail
        logPairingEvent(session.id, 'pairing_started', SELF_URL || null).catch(() => {});
      }

      // Stagger: wait between each session start
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
      await releaseLock(id);
      activeBots.delete(id);
    }
  }

  // Refresh heartbeats for all active bots
  for (const [id] of activeBots) {
    await refreshHeartbeat(id);
  }
}
