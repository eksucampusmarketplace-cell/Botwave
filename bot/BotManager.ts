import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionPairingCode, getSessionPairingCode, updateSessionStatus, updateSessionWorker, clearAuthState, getSessionUserId, getFeatureEnabled, incrementLeaderboard, acquirePairingLock, releasePairingLock, isWorkerPairingLocked, logPairingEvent, updateQueuePosition, logHealthEvent, creditReward, getUserSettings } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage, handleGroupParticipantsUpdate } from './handlers/MessageHandler';
// Autoview removed entirely
// import { handleStatusUpdate, cleanupStatusViewer } from './handlers/StatusViewer';
import { cacheMessage, handleMessageRevoke, cleanupSessionCache } from './handlers/AntiDeleteHandler';
import { MessageQueue } from './utils/MessageQueue';
import { startPresenceSimulation, stopPresenceSimulation, getBrowserConfigForSession } from './utils/advancedAntiban';
import { SELF_URL, getNextWorker } from './workerConfig';
import { tryAcquireLock, releaseLock, refreshHeartbeat, detectConflict, resetAutoRecovery } from './sessionCoordinator';
import { EvolutionSocketAdapter } from './evolutionSocket';
import { createInstance, deleteInstance, deleteInstanceAndVerify, getPairingCode, refreshPairingCode, getInstanceStatus, setWebhook, trackInstance, untrackInstance, restartInstance, connectInstance, recordProxyFailure, recordProxySuccess, isProxyPoolDisabled, disableInstanceProxy, setKeepAliveDisconnectHandler, recordMessageActivity, getLastActivity, startEvolutionWebSocket, stopEvolutionWebSocket, trigger428Cooldown, is428CooldownActive, get428CooldownRemaining, markPairingCodeGenerated, clearPairingStability, recordPairingAttempt, clearPairingAttempts, getReconnectDelay, wasEvolutionRecentlyDown, type PairingResult } from './evolutionClient';
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
import { readFile } from 'fs/promises';
import path from 'path';
import { cacheJSON, getCachedJSON } from './redisSessionCache';

const USE_EVOLUTION = !!process.env.EVOLUTION_API_URL;

// ─── Session Welcome Video (sent once on first pairing) ─────────────────────

let sessionWelcomeVideoBuffer: Buffer | null = null;

async function getSessionWelcomeVideo(): Promise<Buffer | null> {
  if (sessionWelcomeVideoBuffer) return sessionWelcomeVideoBuffer;
  try {
    sessionWelcomeVideoBuffer = await readFile(path.resolve(process.cwd(), 'bot', 'assets', 'botwave-demo.mp4'));
    return sessionWelcomeVideoBuffer;
  } catch {
    return null;
  }
}

async function sendSessionWelcome(sessionId: string, ownerJid: string, sock: any): Promise<void> {
  const redisKey = `session_welcome:${sessionId}`;
  try {
    const alreadySent = await getCachedJSON<boolean>(redisKey);
    if (alreadySent) return;
  } catch {}

  try {
    await cacheJSON(redisKey, true, 365 * 24 * 60 * 60); // 1 year TTL
  } catch {}

  try {
    const video = await getSessionWelcomeVideo();
    const welcomeText =
      `Welcome to *BotWave*! \u{1F44B}\n\n` +
      `Your WhatsApp is now connected and ready to go!\n\n` +
      `Here's what I can do:\n` +
      `\u{1F3A8} *!sticker* \u2014 Turn images into stickers\n` +
      `\u{1F916} *!ai [question]* \u2014 AI-powered answers\n` +
      `\u{1F3B5} *!music [song]* \u2014 Download music\n` +
      `\u{1F4E5} *!download [url]* \u2014 Download media\n` +
      `\u{1F3AE} *!trivia* \u2014 Play trivia games\n` +
      `\u{1F4AC} *!help* \u2014 See all 50+ commands\n\n` +
      `Add me to your group and type *!help* to get started!\n\n` +
      `📢 *Follow our channel for updates & tips:*\nhttps://whatsapp.com/channel/0029Vb89xfPCMY0IvFWi6B0X\n\n` +
      `_Created by Decisive Analyst | botwave.online_`;

    if (video) {
      await sock.sendMessage(ownerJid, {
        video,
        caption: welcomeText,
        gifPlayback: false,
      });
    } else {
      await sock.sendMessage(ownerJid, { text: welcomeText });
    }
    console.log(`[SESSION-WELCOME] Sent welcome to ${sessionId}`);
  } catch (err) {
    console.error(`[SESSION-WELCOME] Failed to send welcome for ${sessionId}:`, err);
  }
}

// Cast to any: pino v10 types are incompatible with Baileys 6.x Logger typedef
const logger = P({ level: 'info' }) as any;

const MAX_RECONNECT_ATTEMPTS = 5;
const SESSION_STAGGER_DELAY = 15_000; // 15s between pairing starts to avoid WhatsApp 428 rate limits
const PAIRING_TIMEOUT_MS = 180_000; // 3 min — matches UI countdown in QRCodeDisplay
const MAX_CONCURRENT_PAIRING = 2; // Max sessions pairing simultaneously — prevents 428 storms

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
  if (isProxyPoolDisabled()) {
    console.log('[PROXY] Baileys: proxy pool disabled (fallback mode) — connecting directly');
    return undefined;
  }
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
      markOnlineOnConnect: true,
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
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
          console.log(`[${this.sessionId}] Cleared QR timeout — pairing accepted`);
        }
      }

      // When creds become registered (phone accepted pairing), cancel the
      // QR-expiry timeout so it doesn't clear auth state after a successful
      // pairing. Baileys sets registered=true before connection='open'.
      if (this.socket?.authState?.creds?.registered && this.reconnectTimeout && !this.isReady) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
        console.log(`[${this.sessionId}] Cleared QR timeout — creds registered`);
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
        console.log(`[PAIRING] ======= QR received, starting pairing code flow =======`);
        console.log(`[PAIRING] session=${this.sessionId} timestamp=${now.toISOString()} qrLen=${qr.length}`);
        await updateSessionQR(this.sessionId, qr, expiresAt.toISOString(), now.toISOString());

        {
          const cleanPhone = this.phoneNumber.replace(/\D/g, '');
          console.log(`[PAIRING] Phone: raw="${this.phoneNumber}" cleaned="${cleanPhone}" cleanLen=${cleanPhone.length}`);
          if (cleanPhone) {
            // Use the pairing queue to serialize pairing code requests across
            // all sessions on this worker. This prevents multiple concurrent
            // requestPairingCode() calls which trigger WhatsApp 428 errors.
            try {
              const queueStartTime = Date.now();
              console.log(`[PAIRING] >>> Queuing pairing code request for "${cleanPhone}" at ${new Date(queueStartTime).toISOString()}`);
              const queuePos = (await import('./linkQueue')).getQueuePosition(this.sessionId);
              if (queuePos) {
                console.log(`[PAIRING] Queue position: #${queuePos.position} estimatedWait=${queuePos.estimatedWaitMinutes}min`);
              } else {
                console.log(`[PAIRING] Queue position: front (no wait)`);
              }
              const code = await queueLink(this.sessionId, cleanPhone, async (phone: string) => {
                console.log(`[PAIRING] Baileys requestPairingCode executing for "${phone}" (2s delay first)...`);
                await delay(2000);
                const requestStart = Date.now();
                console.log(`[PAIRING] Calling socket.requestPairingCode("${phone}") at ${new Date(requestStart).toISOString()}`);
                const result = await this.socket.requestPairingCode(phone);
                const requestDuration = Date.now() - requestStart;
                console.log(`[PAIRING] socket.requestPairingCode returned in ${requestDuration}ms: "${result}"`);
                return result;
              });
              const totalDuration = Date.now() - queueStartTime;
              const codeAge = 0; // freshly generated
              console.log(`[PAIRING] <<< requestPairingCode returned: "${code}" totalDuration=${totalDuration}ms codeAge=${codeAge}ms`);
              console.log(`[PAIRING] Code analysis: len=${code?.length || 0} isAlphanumeric=${/^[A-Z0-9]+$/i.test(code || '')} isEmpty=${!code || code.trim() === ''}`);
              // Guard: if a terminal handler (428, loggedOut, max-retries) ran
              // while this request was in-flight, the session is already in
              // needs_reauth. Do NOT overwrite that state with pairing_sent.
              // pairingStartedAt === -1 is the sentinel for "terminated".
              if (this.pairingStartedAt === -1 || !this.socket) {
                console.log(`[PAIRING] DISCARDING code "${code}" — session terminated during request (pairingStartedAt=${this.pairingStartedAt}, socket=${!!this.socket})`);
                return;
              }
              console.log(`[PAIRING] Saving code to DB...`);
              const dbSaveStart = Date.now();
              await updateSessionPairingCode(this.sessionId, code);
              console.log(`[PAIRING] DB save took ${Date.now() - dbSaveStart}ms`);
              console.log(`[PAIRING] Updating state to pairing_sent...`);
              await updateSessionStatus(this.sessionId, 'pairing_sent');
              this.isPairingSent = true;
              this.pairingStartedAt = Date.now();
              pairingCodeRequested = true;
              console.log(`[PAIRING] === COMPLETE === session=${this.sessionId} code="${code}" totalFlow=${Date.now() - queueStartTime}ms isPairingSent=${this.isPairingSent} pairingStartedAt=${new Date(this.pairingStartedAt).toISOString()}`);
              logPairingEvent(this.sessionId, 'code_generated', this.workerUrl).catch(() => {});
            } catch (err: any) {
              console.error(`[PAIRING] <<< requestPairingCode FAILED for session=${this.sessionId}:`);
              console.error(`[PAIRING] Error: name=${err?.name} message=${err?.message} code=${err?.code || 'none'}`);
              console.error(`[PAIRING] Stack: ${err?.stack?.slice(0, 500)}`);
              if (err?.message?.includes('428') || err?.statusCode === 428) {
                console.error(`[PAIRING] 428 RATE LIMIT — WhatsApp rejected pairing code request. Too many requests.`);
              }
              pairingCodeRequested = false;
              logPairingEvent(this.sessionId, 'code_failed', this.workerUrl, err?.statusCode, { error: err?.message }).catch(() => {});
            }
          } else {
            console.error(`[PAIRING] EMPTY phone number! Cannot request pairing code. Raw: "${this.phoneNumber}"`);
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
          if (!this.isReady && this.qrCode === qr && !this.socket?.authState?.creds?.registered) {
            console.log(`[PAIRING] Code EXPIRED for session ${this.sessionId} after ${PAIRING_TIMEOUT_MS / 1000}s. Clearing stale code and restarting...`);
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
        // Preserve isPairingSent during pairing handshake reconnects (e.g. 515).
        // Only clear it on terminal events (401, 428, logout) or connection open.
        // Clearing it here caused the QR timeout to misfire during normal
        // pairing handshake cycles, leaving sessions stuck in pairing_sent.
        if (statusCode !== 515 && !this.socket?.authState?.creds?.registered) {
          this.isPairingSent = false;
        }

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

        // 428 = "Connection Terminated by Server".
        // During pairing: WhatsApp rejected concurrent unregistered connections.
        // On established session: WhatsApp force-closed the connection (IP conflict,
        // auth drift, or anti-spam). Either way, don't retry — clear auth and let
        // user re-pair from a clean state.
        if (statusCode === 428) {
          const wasEstablished = this.reconnectAttempts > 0 || this.pairingStartedAt === 0;
          console.log(`[ERR_428] [${this.sessionId}] 428 connection terminated (established=${wasEstablished}). Not reconnecting.`);
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
          logHealthEvent(this.sessionId, 'disconnected', `Logged out (statusCode=${statusCode})`).catch(() => {});

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
          // Reconnect with exponential backoff — preserve auth credentials so the
          // session auto-recovers after temporary disconnects (network blip, Render
          // restart, etc.) without forcing the user to re-pair.
          // Only give up after MAX_RECONNECT_ATTEMPTS if the session was never
          // successfully connected (pairing phase). Once connected, retry indefinitely
          // with capped backoff — the auth state is valid and worth preserving.
          const wasEverConnected = this.isReady || this.reconnectAttempts > 0;
          if (!wasEverConnected && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(`[${this.sessionId}] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached during initial pairing. Setting needs_reauth (auth preserved for manual retry).`);
            cancelPendingLinks(this.sessionId);
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
              this.reconnectTimeout = null;
            }
            this.isReconnecting = false;
            this.pairingStartedAt = -1;
            await releaseLock(this.sessionId);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            this.socket = null;
            return;
          }

          this.isReconnecting = true;
          logHealthEvent(this.sessionId, 'reconnecting', `Attempt ${this.reconnectAttempts + 1}, statusCode=${statusCode}`).catch(() => {});
          // Keep state as qr_pending during pairing restart (515)
          // so syncSessionsWithDb doesn't kill the bot mid-handshake
          if (statusCode !== 515) {
            await updateSessionStatus(this.sessionId, 'inactive');
          }
          this.socket = null;
          this.reconnectAttempts++;
          // Longer backoff for established sessions: cap at 2 minutes instead of 30s
          const maxDelay = wasEverConnected ? 120000 : 30000;
          const reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), maxDelay);
          console.log(`[${this.sessionId}] Reconnecting in ${reconnectDelay}ms (attempt ${this.reconnectAttempts}, wasConnected=${wasEverConnected}). statusCode=${statusCode}`);
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          this.reconnectTimeout = setTimeout(() => {
            this.start();
          }, reconnectDelay);
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
        resetAutoRecovery(this.sessionId);
        // Release DB pairing lock and log success
        releasePairingLock(this.sessionId).catch(() => {});
        logPairingEvent(this.sessionId, 'pairing_success', this.workerUrl).catch(() => {});

        logHealthEvent(this.sessionId, 'connected', 'Connection established').catch(() => {});

        // Send 'available' on connect so WhatsApp shows the device as online
        // instead of "last seen" — prevents the linked device appearing inactive.
        try {
          await this.socket.sendPresenceUpdate('available');
        } catch { /* non-critical */ }

        // Start presence simulation (advanced anti-ban)
        startPresenceSimulation(this.socket, this.sessionId);

        // Send welcome video to owner on first session pairing
        const ownerJid = this.socket?.user?.id;
        if (ownerJid) {
          void sendSessionWelcome(this.sessionId, ownerJid, this.socket);
        }
      }
    });

    this.socket.ev.on('messages.upsert', async (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          // Status broadcasts — disabled (Evolution API sendReaction is unreliable
          // and can send garbled messages to contacts)
          if (msg.key.remoteJid === 'status@broadcast') {
            continue;
          }

          // Anti-delete: detect protocolMessage REVOKE (type 0)
          const proto = msg.message?.protocolMessage;
          if (proto && proto.type === 0 && proto.key) {
            handleMessageRevoke(msg, this.sessionId, this.userId).catch((err: any) => {
              console.error('[ANTI-DELETE] revoke handler error:', err);
            });
            continue;
          }

          // Cache every message for anti-delete recovery
          cacheMessage(this.sessionId, msg).catch(() => {});

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';
          // Allow fromMe commands (userbot mode: owner can use prefix+help etc.)
          let cmdPrefix = '!';
          try {
            const settings = await getUserSettings(this.userId);
            if (settings?.command_prefix) cmdPrefix = settings.command_prefix;
          } catch { /* non-critical */ }
          if (msg.key.fromMe && !text.trimStart().startsWith(cmdPrefix)) continue;
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
    // cleanupStatusViewer(this.sessionId); // Autoview removed
    cleanupSessionCache(this.sessionId);
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

const EVO_RECONNECT_MAX_BACKOFF_MS = 120_000; // cap at 2 min (like Baileys)
const EVO_RECONNECT_GIVE_UP_DEFAULT_MS = 30 * 60 * 1000; // 30 min for new sessions
const EVO_RECONNECT_GIVE_UP_ACTIVE_MS = 2 * 60 * 60 * 1000; // 2h for previously-active sessions

// Deaf session detection: if an active session receives no webhook events
// for this long, force a restart via /instance/restart to recover from
// the Baileys "deaf session" bug (messages.upsert stops firing silently).
const DEAF_SESSION_THRESHOLD_MS = 35 * 60 * 1000; // 35 minutes
const DEAF_SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min

// Auth state health check interval — proactively verify sessions are
// still authenticated before WhatsApp silently drops them.
const AUTH_HEALTH_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

class EvolutionBot {
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private isReady: boolean = false;
  private isPairingSent: boolean = false;
  private isReconnecting: boolean = false;
  private stopped: boolean = false;
  private pairingStartedAt: number = 0;
  private pollHandle: NodeJS.Timeout | null = null;
  private presenceHandle: NodeJS.Timeout | null = null;
  private deafCheckHandle: NodeJS.Timeout | null = null;
  private authHealthHandle: NodeJS.Timeout | null = null;
  private socketAdapter: EvolutionSocketAdapter | null = null;
  private previousDbState: string;
  private workerUrl: string | null = null;
  private reconnectAttempts: number = 0;
  private reconnectSince: number = 0; // timestamp when reconnection loop started
  private wasEverActive: boolean = false; // tracks if session was ever in 'open' state

  public getSocket(): any { return this.isReady ? this.socketAdapter : null; }

  constructor(config: BotConfig & { previousDbState?: string }) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
    this.previousDbState = config.previousDbState || 'qr_pending';
    this.workerUrl = SELF_URL || null;
  }

  /**
   * Try to reconnect to an existing Evolution API instance.
   * Retries with backoff because the Evolution API may still be loading
   * instances from its database after a concurrent restart.
   * Returns true if the instance was found and is now connected/connecting.
   *
   * For previously-active sessions, uses more retries and longer backoff
   * to give Evolution API time to fully restore instances from its database.
   */
  private async tryReconnectExisting(): Promise<boolean> {
    // Previously-active sessions get more patience — the Evolution API may
    // need 30-60s+ to fully load and reconnect instances from its DB after
    // a restart. Quick giveup causes unnecessary re-pairing.
    const wasActive = this.previousDbState === 'active' || this.previousDbState === 'inactive';
    const MAX_RECONNECT_RETRIES = wasActive ? 15 : 8;
    const BASE_DELAY_MS = wasActive ? 4000 : 3000;
    const MAX_DELAY_MS = wasActive ? 15000 : 12000;

    for (let attempt = 1; attempt <= MAX_RECONNECT_RETRIES; attempt++) {
      console.log(`[EVO] Reconnect attempt ${attempt}/${MAX_RECONNECT_RETRIES} for ${this.sessionId} (wasActive=${wasActive})...`);

      const state = await getInstanceStatus(this.sessionId);
      console.log(`[EVO] Instance state for ${this.sessionId}: ${state}`);

      // Instance definitively deleted — bail immediately, no retries
      if (state === 'gone') {
        console.warn(`[EVO] Instance ${this.sessionId} GONE (404) during reconnect — bailing immediately`);
        return false;
      }

      // 428 cooldown active — stop reconnection attempts to avoid making it worse
      if (state === 'cooldown') {
        console.warn(`[EVO] 428 cooldown active during reconnect for ${this.sessionId} — pausing reconnection`);
        return false;
      }

      if (state === 'unknown') {
        if (attempt < MAX_RECONNECT_RETRIES) {
          const waitMs = Math.min(BASE_DELAY_MS * attempt, MAX_DELAY_MS);
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
        clearPairingStability(this.sessionId);
        clearPairingAttempts(this.phoneNumber);
        this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
        await updateSessionStatus(this.sessionId, 'active');
        this.startPresenceLoop();
        return true;
      }

      if (state === 'close' || state === 'connecting') {
        console.log(`[EVO] Instance ${this.sessionId} is ${state} — attempting reconnect via connect endpoint`);
        const connectState = await connectInstance(this.sessionId, this.phoneNumber);
        console.log(`[EVO] connectInstance result for ${this.sessionId}: ${connectState}`);

        if (connectState === 'open') {
          this.isReady = true;
          this.isReconnecting = false;
          this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
          await updateSessionStatus(this.sessionId, 'active');
          this.startPresenceLoop();
          return true;
        }

        if (connectState === 'connecting') {
          console.log(`[EVO] Instance ${this.sessionId} is connecting — poll loop will track state`);
          return true;
        }

        // 428 cooldown kicked in mid-reconnect — bail and let cooldown expire
        if (connectState === 'cooldown') {
          console.warn(`[EVO] 428 cooldown blocked connectInstance for ${this.sessionId} — stopping reconnect`);
          return false;
        }

        // If connectInstance returns 'unknown' but getInstanceStatus said
        // 'close'/'connecting', the instance was likely deleted (e.g. 401
        // logout). Verify by re-checking status — if now 'unknown', the
        // instance is gone and further retries are pointless.
        if (connectState === 'unknown') {
          const recheck = await getInstanceStatus(this.sessionId);
          if (recheck === 'unknown') {
            console.log(`[EVO] Instance ${this.sessionId} disappeared after connect attempt (likely 401 logout) — bailing out`);
            return false;
          }
        }

        // Connection attempt didn't succeed — retry if attempts remain
        if (attempt < MAX_RECONNECT_RETRIES) {
          const waitMs = Math.min(BASE_DELAY_MS * attempt, MAX_DELAY_MS);
          console.log(`[EVO] Connect returned ${connectState} for ${this.sessionId} — retrying in ${waitMs}ms...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
      }
    }

    console.log(`[EVO] All reconnect attempts exhausted for ${this.sessionId} — will fall through to soft reconnect / fresh pairing`);
    return false;
  }

  /**
   * Try to reconnect by creating a new instance WITHOUT requesting a pairing code.
   * If Evolution API has auth credentials in its database (DATABASE_SAVE_DATA_INSTANCE=true),
   * the instance may auto-connect using the saved auth state — no user action needed.
   * Returns true if auto-connect succeeded or is in progress.
   */
  private async trySoftReconnect(): Promise<boolean> {
    console.log(`[EVO] Attempting soft reconnect for ${this.sessionId} — creating instance without pairing code`);

    try {
      // Create the instance — this registers it with Evolution API.
      // If Evolution API has auth data in its Prisma DB, the Baileys
      // connection may restore automatically using saved credentials.
      const createResult = await createInstance(this.sessionId, this.phoneNumber) as Record<string, unknown> | null;
      if (createResult?.status === 403 || createResult?.error) {
        console.log(`[EVO] Soft reconnect: instance creation failed for ${this.sessionId}:`, JSON.stringify(createResult));
        return false;
      }

      await setWebhook(this.sessionId);
      trackInstance(this.sessionId);

      // Try to connect the instance — this triggers Baileys to reconnect
      // using saved auth credentials if they exist.
      const connectState = await connectInstance(this.sessionId, this.phoneNumber);
      console.log(`[EVO] Soft reconnect: connectInstance result for ${this.sessionId}: ${connectState}`);

      if (connectState === 'open') {
        console.log(`[EVO] Soft reconnect SUCCESS for ${this.sessionId} — auto-connected without re-pairing!`);
        this.isReady = true;
        this.isReconnecting = false;
        clearPairingStability(this.sessionId);
        clearPairingAttempts(this.phoneNumber);
        this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
        await updateSessionStatus(this.sessionId, 'active');
        this.startPresenceLoop();
        return true;
      }

      // Give it a few seconds for the connection to establish
      if (connectState === 'connecting') {
        console.log(`[EVO] Soft reconnect: instance ${this.sessionId} is connecting — waiting up to 30s for connection...`);
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const state = await getInstanceStatus(this.sessionId);
          console.log(`[EVO] Soft reconnect poll ${i + 1}/6: state=${state} for ${this.sessionId}`);
          if (state === 'open') {
            console.log(`[EVO] Soft reconnect SUCCESS for ${this.sessionId} — connected after ${(i + 1) * 5}s!`);
            this.isReady = true;
            this.isReconnecting = false;
            clearPairingStability(this.sessionId);
            clearPairingAttempts(this.phoneNumber);
            this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
            await updateSessionStatus(this.sessionId, 'active');
            this.startPresenceLoop();
            return true;
          }
          if (state === 'unknown') break; // Instance gone — no point waiting
        }
      }

      // Soft reconnect didn't work — clean up the instance so fresh pairing
      // can start with a clean slate.
      console.log(`[EVO] Soft reconnect FAILED for ${this.sessionId} — auth data likely not persisted in Evolution API`);
      await deleteInstance(this.sessionId);
      return false;
    } catch (err) {
      console.error(`[EVO] Soft reconnect error for ${this.sessionId}:`, err);
      try { await deleteInstance(this.sessionId); } catch { /* non-critical */ }
      return false;
    }
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
      // NOTE: Skip reconnect for 'inactive' sessions — the instance was already
      // deleted during dead-bot cleanup, so 15 reconnect attempts just waste 2+
      // minutes polling a non-existent instance.
      if (this.previousDbState === 'active' || this.previousDbState === 'pairing_sent') {
        const reconnected = await this.tryReconnectExisting();
        if (reconnected) {
          console.log(`[EVO] Successfully reconnected session ${this.sessionId} — skipping fresh pairing`);
          this.startPollLoop();
          return;
        }
        console.log(`[EVO] Reconnect failed for ${this.sessionId} — trying soft reconnect before fresh pairing`);

        // For previously-active sessions, try soft reconnect: create instance
        // and let Evolution API use saved auth data to reconnect without a
        // new pairing code. This avoids forcing users to re-pair after every
        // redeploy when Evolution API has DATABASE_SAVE_DATA_INSTANCE=true.
        if (this.previousDbState === 'active') {
          const softReconnected = await this.trySoftReconnect();
          if (softReconnected) {
            console.log(`[EVO] Soft reconnect succeeded for ${this.sessionId} — no re-pairing needed!`);
            this.startPollLoop();
            return;
          }
          console.log(`[EVO] Soft reconnect also failed for ${this.sessionId} — falling through to fresh pairing`);
        }
      } else if (this.previousDbState === 'inactive') {
        // Inactive = was connected but disconnected (close/refused webhook).
        // The instance may still exist on Evolution API with saved auth.
        // Try soft reconnect before falling through to fresh pairing —
        // this replicates what the 3-worker setup did implicitly when
        // orphan recovery moved a session to a new worker.
        console.log(`[EVO] Session ${this.sessionId} was inactive — trying soft reconnect before fresh pairing`);
        const softReconnected = await this.trySoftReconnect();
        if (softReconnected) {
          console.log(`[EVO] Soft reconnect succeeded for inactive session ${this.sessionId} — no re-pairing needed!`);
          this.startPollLoop();
          return;
        }
        console.log(`[EVO] Soft reconnect failed for inactive session ${this.sessionId} — falling through to fresh pairing`);
      }

      // PRE-START OPEN CHECK: Before deleting anything, check if Evolution API
      // already has this instance as 'open' (connected). This can happen when
      // BotWave restarts but the user already paired successfully on Evolution API.
      // Deleting an open instance would wipe the auth state and force re-pairing.
      const preStartState = await getInstanceStatus(this.sessionId);
      if (preStartState === 'open') {
        console.log(`[EVO] PRE-START GUARD: Instance ${this.sessionId} is already OPEN on Evolution API — skipping fresh pairing, marking active`);
        this.isReady = true;
        this.isReconnecting = false;
        clearPairingStability(this.sessionId);
        clearPairingAttempts(this.phoneNumber);
        this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
        await updateSessionStatus(this.sessionId, 'active');
        await setWebhook(this.sessionId);
        trackInstance(this.sessionId);
        this.startPresenceLoop();
        this.startPollLoop();
        return;
      }

      // Clean up any stale instance and verify it is fully removed before
      // creating a new one. Evolution API's delete is async (event-driven);
      // without verification, createInstance races against the cleanup and
      // gets 403 "name already in use".
      // FAST PATH: skip delete+verify entirely when the instance is already
      // confirmed gone (404). This avoids ~10s of redundant fetch timeouts.
      if (preStartState === 'gone') {
        console.log(`[EVO] Instance ${this.sessionId} already confirmed gone — skipping deleteInstanceAndVerify`);
      } else {
        await deleteInstanceAndVerify(this.sessionId);
      }

      // Create instance on Evolution API (includes proxy setup with retry).
      // Proxy is set BEFORE pairing so WhatsApp sees a consistent IP.
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
      const evoPairingStart = Date.now();
      console.log(`[PAIRING-EVO] === Requesting pairing code via Evolution API === session=${this.sessionId} phone=${this.phoneNumber} at=${new Date(evoPairingStart).toISOString()}`);
      const backoffMs = recordPairingAttempt(this.phoneNumber);
      if (backoffMs > 0) {
        console.log(`[PAIRING-EVO] Rate-limit backoff: waiting ${backoffMs / 1000}s before pairing attempt for ${this.phoneNumber}`);
        await new Promise(r => setTimeout(r, backoffMs));
      }
      const pairingResult = await getPairingCode(this.sessionId, this.phoneNumber);
      const evoPairingDuration = Date.now() - evoPairingStart;

      if (pairingResult) {
        markPairingCodeGenerated(this.sessionId);
        const code = pairingResult.pairingCode;
        console.log(`[PAIRING-EVO] Code received: "${code}" len=${code.length} hasQR=${!!pairingResult.qrCode} duration=${evoPairingDuration}ms session=${this.sessionId}`);
        console.log(`[PAIRING-EVO] Saving to DB...`);
        const dbStart = Date.now();
        // Save QR FIRST (before state becomes pairing_sent)
        if (pairingResult.qrCode) {
          await updateSessionQR(this.sessionId, pairingResult.qrCode, new Date(Date.now() + 180000).toISOString(), new Date().toISOString());
        }
        // THEN save pairing code (this sets state = pairing_sent)
        await updateSessionPairingCode(this.sessionId, code);
        console.log(`[PAIRING-EVO] DB save took ${Date.now() - dbStart}ms`);
        this.isPairingSent = true;
        this.pairingStartedAt = Date.now();
        this.isReconnecting = false;
        console.log(`[PAIRING-EVO] === COMPLETE === session=${this.sessionId} code="${code}" totalFlow=${Date.now() - evoPairingStart}ms`);
      } else {
        console.error(`[PAIRING-EVO] NO CODE returned after ${evoPairingDuration}ms for session=${this.sessionId}. Setting inactive.`);
        await updateSessionStatus(this.sessionId, 'inactive');
        this.isReconnecting = false;
        logPairingEvent(this.sessionId, 'evo_code_failed', this.workerUrl, undefined, { duration: evoPairingDuration }).catch(() => {});
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
    // Use module-level PAIRING_TIMEOUT_MS (3 min — matches UI countdown)
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
          this.reconnectAttempts = 0;
          this.reconnectSince = 0;
          this.wasEverActive = true;
          // Clear pairing guards on successful connection
          clearPairingStability(this.sessionId);
          clearPairingAttempts(this.phoneNumber);
          await updateSessionStatus(this.sessionId, 'active');
          console.log(`[EVO] Session ${this.sessionId} is now active!`);

          // Refresh webhook config so the instance uses the latest events list.
          // This ensures existing sessions pick up webhook config changes after deploys.
          void setWebhook(this.sessionId).catch(err =>
            console.error(`[EVO] Failed to refresh webhook for ${this.sessionId}:`, err));

          // Credit first-session reward (₦10, one-time, non-blocking)
          void creditReward(this.userId, 'first_session', 'First WhatsApp session connected').catch(() => {});

          this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
          this.startPresenceLoop();
          this.startDeafSessionDetector();
          this.startAuthHealthCheck();

          // Send welcome video to owner on first session pairing
          const cleanPhone = this.phoneNumber.replace(/\D/g, '');
          const ownerJid = `${cleanPhone}@s.whatsapp.net`;
          void sendSessionWelcome(this.sessionId, ownerJid, this.socketAdapter);
        } else if (state === 'connecting') {
          unknownStateCount = 0;
          // Waiting for connection — applies to both pairing and reconnect.
          // Check for timeouts so we don't wait forever.
          if (this.isPairingSent) {
            // Pairing in progress — poll for updated pairing code in case
            // Evolution API internally reconnected and generated a new one
            // (the old code shown on the dashboard would be invalid).
            try {
              const latestResult = await refreshPairingCode(this.sessionId, this.phoneNumber);
              if (latestResult) {
                // Always update QR — it rotates every ~20-30s even when
                // pairing code stays the same across rotations.
                if (latestResult.qrCode) {
                  await updateSessionQR(this.sessionId, latestResult.qrCode, new Date(Date.now() + 180000).toISOString(), new Date().toISOString());
                }
                const dbCode = await getSessionPairingCode(this.sessionId);
                if (dbCode !== latestResult.pairingCode) {
                  console.log(`[EVO] Pairing code CHANGED for ${this.sessionId}: "${dbCode}" → "${latestResult.pairingCode}" — updating DB`);
                  await updateSessionPairingCode(this.sessionId, latestResult.pairingCode);
                }
              }
            } catch (err) {
              // Non-fatal — just means we couldn't check for updated code
            }

            // Check pairing timeout
            if (Date.now() - pairingWaitStart > PAIRING_TIMEOUT_MS) {
              const finalState = await getInstanceStatus(this.sessionId);
              if (finalState === 'open') {
                console.log(`[EVO] Pairing timeout (connecting) but instance is OPEN for ${this.sessionId} — transitioning to active`);
                this.isReady = true;
                this.isPairingSent = false;
                this.isReconnecting = false;
                clearPairingStability(this.sessionId);
                clearPairingAttempts(this.phoneNumber);
                await updateSessionStatus(this.sessionId, 'active');
                void setWebhook(this.sessionId).catch(err =>
                  console.error(`[EVO] Failed to refresh webhook for ${this.sessionId}:`, err));
                void creditReward(this.userId, 'first_session', 'First WhatsApp session connected').catch(() => {});
                this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
                this.startPresenceLoop();
                const cleanPhone = this.phoneNumber.replace(/\D/g, '');
                const ownerJid = `${cleanPhone}@s.whatsapp.net`;
                void sendSessionWelcome(this.sessionId, ownerJid, this.socketAdapter);
                return;
              }
              // Auto-retry with fresh code
              console.log(`[EVO] Pairing timed out (connecting) for ${this.sessionId} (finalState=${finalState}) — auto-retrying`);
              isRecreating = true;
              try {
                await deleteInstanceAndVerify(this.sessionId);
                if (this.stopped) { isRecreating = false; return; }
                await createInstance(this.sessionId, this.phoneNumber);
                if (this.stopped) { isRecreating = false; return; }
                const freshResult = await getPairingCode(this.sessionId, this.phoneNumber);
                if (this.stopped) { isRecreating = false; return; }
                if (freshResult) {
                  markPairingCodeGenerated(this.sessionId);
                  if (freshResult.qrCode) {
                    await updateSessionQR(this.sessionId, freshResult.qrCode, new Date(Date.now() + 180000).toISOString(), new Date().toISOString());
                  }
                  await updateSessionPairingCode(this.sessionId, freshResult.pairingCode);
                  this.pairingStartedAt = Date.now();
                  pairingWaitStart = Date.now();
                  console.log(`[EVO] Auto-retry (connecting) succeeded for ${this.sessionId}, new code: ${freshResult.pairingCode}`);
                } else {
                  console.log(`[EVO] Auto-retry (connecting) failed for ${this.sessionId} — setting needs_reauth`);
                  await updateSessionStatus(this.sessionId, 'needs_reauth');
                  this.isPairingSent = false;
                  if (this.pollHandle) { clearInterval(this.pollHandle); this.pollHandle = null; }
                }
              } catch (retryErr) {
                console.error(`[EVO] Auto-retry (connecting) error for ${this.sessionId}:`, retryErr);
                await updateSessionStatus(this.sessionId, 'needs_reauth');
                this.isPairingSent = false;
                if (this.pollHandle) { clearInterval(this.pollHandle); this.pollHandle = null; }
              }
              isRecreating = false;
            }
          } else if (this.isReconnecting && Date.now() - reconnectStart > RECONNECT_TIMEOUT_MS) {
            console.log(`[EVO] Reconnect timed out for ${this.sessionId} — stuck in connecting for ${RECONNECT_TIMEOUT_MS / 1000}s`);
            this.isReconnecting = false;
            await releasePairingLock(this.sessionId);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }
          }
        } else if (state === 'close' || state === 'refused') {
          unknownStateCount = 0;
          if (this.isReady) {
            // Was connected, now disconnected — retry with exponential
            // backoff. Previously-active sessions get 2h window (vs 30min
            // for new sessions) since their auth is likely valid and just
            // needs time for WhatsApp to come back.
            this.isReady = false;
            this.isPairingSent = false;
            this.stopPresenceLoop();
            this.stopDeafSessionDetector();
            this.stopAuthHealthCheck();

            if (this.reconnectSince === 0) {
              this.reconnectSince = Date.now();
            }
            this.reconnectAttempts++;

            const elapsed = Date.now() - this.reconnectSince;
            const giveUpMs = this.wasEverActive ? EVO_RECONNECT_GIVE_UP_ACTIVE_MS : EVO_RECONNECT_GIVE_UP_DEFAULT_MS;
            console.log(`[EVO] Session ${this.sessionId} closed/refused — reconnect attempt ${this.reconnectAttempts} (elapsed ${Math.round(elapsed / 1000)}s / ${giveUpMs / 1000}s, wasEverActive=${this.wasEverActive})`);

            // Stop polling while we attempt reconnection
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }

            this.isReconnecting = true;

            // Try reconnecting to existing instance first
            const reconnected = await this.tryReconnectExisting();
            if (reconnected) {
              console.log(`[EVO] Session ${this.sessionId} auto-reconnected after temporary disconnect (attempt ${this.reconnectAttempts})`);
              this.reconnectAttempts = 0;
              this.reconnectSince = 0;
              this.startPollLoop();
              return;
            }

            // Try soft reconnect (re-create instance with saved auth)
            const softReconnected = await this.trySoftReconnect();
            if (softReconnected) {
              console.log(`[EVO] Session ${this.sessionId} soft-reconnected (attempt ${this.reconnectAttempts})`);
              this.reconnectAttempts = 0;
              this.reconnectSince = 0;
              this.startPollLoop();
              return;
            }

            // Both failed — check if we should keep retrying or give up
            if (elapsed < giveUpMs) {
              // Exponential backoff, capped at 2 minutes
              const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), EVO_RECONNECT_MAX_BACKOFF_MS);
              console.log(`[EVO] Session ${this.sessionId} reconnect failed — retrying in ${backoff / 1000}s (attempt ${this.reconnectAttempts}, elapsed ${Math.round(elapsed / 1000)}s)`);
              await updateSessionStatus(this.sessionId, 'inactive');
              // Schedule retry: wait, then restart poll loop which will
              // detect close/refused again and trigger the next attempt
              setTimeout(() => {
                if (this.stopped) return;
                this.isReconnecting = true;
                this.startPollLoop();
              }, backoff);
              return;
            }

            // Exhausted retry window — now set needs_reauth
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.reconnectSince = 0;
            await releasePairingLock(this.sessionId);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            console.log(`[EVO] Session ${this.sessionId} closed/refused -> needs_reauth after ${Math.round(elapsed / 1000)}s of retries`);

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
            return; // Poll handle already cleared
          } else if (this.isPairingSent) {
            // Instance closed during pairing — auto-retry immediately with
            // a fresh code instead of waiting for the full pairing timeout.
            // This handles proxy drops that kill the connection during pairing.
            console.log(`[EVO] Instance closed during pairing for ${this.sessionId} (pairingAge=${Math.round((Date.now() - pairingWaitStart) / 1000)}s) — auto-retrying immediately`);
            if (Date.now() - pairingWaitStart > PAIRING_TIMEOUT_MS) {
              // Pairing timeout exceeded — give up
              console.log(`[EVO] Pairing timed out for ${this.sessionId} — setting needs_reauth`);
              await updateSessionStatus(this.sessionId, 'needs_reauth');
              this.isPairingSent = false;
              if (this.pollHandle) { clearInterval(this.pollHandle); this.pollHandle = null; }
              return;
            }
            // Before destroying the instance, do a final state check —
            // the user may have linked their phone during the timeout window
            // but the poll returned 'close' due to a race condition.
            const finalState = await getInstanceStatus(this.sessionId);
            if (finalState === 'open') {
              console.log(`[EVO] Pairing timeout fired but instance is OPEN for ${this.sessionId} — transitioning to active instead of recreating`);
              this.isReady = true;
              this.isPairingSent = false;
              this.isReconnecting = false;
              clearPairingStability(this.sessionId);
              clearPairingAttempts(this.phoneNumber);
              await updateSessionStatus(this.sessionId, 'active');
              console.log(`[EVO] Session ${this.sessionId} is now active (caught at timeout boundary)!`);
              void setWebhook(this.sessionId).catch(err =>
                console.error(`[EVO] Failed to refresh webhook for ${this.sessionId}:`, err));
              void creditReward(this.userId, 'first_session', 'First WhatsApp session connected').catch(() => {});
              this.socketAdapter = new EvolutionSocketAdapter(this.sessionId, this.sessionId, this.userId, this.phoneNumber);
              this.startPresenceLoop();
              const cleanPhone = this.phoneNumber.replace(/\D/g, '');
              const ownerJid = `${cleanPhone}@s.whatsapp.net`;
              void sendSessionWelcome(this.sessionId, ownerJid, this.socketAdapter);
              // Continue polling to monitor for disconnects
              return;
            }

            // Pairing timed out — auto-retry with a fresh code instead of
            // going straight to needs_reauth. This gives users another chance
            // without requiring manual reconnection from the dashboard.
            console.log(`[EVO] Pairing timed out for ${this.sessionId} (finalState=${finalState}) — auto-retrying with fresh code`);
            isRecreating = true;
            try {
              await deleteInstanceAndVerify(this.sessionId);
              if (this.stopped) { isRecreating = false; return; }
              // createInstance already calls setWebhook internally after success
              await createInstance(this.sessionId, this.phoneNumber);
              if (this.stopped) { isRecreating = false; return; }
              const freshResult2 = await getPairingCode(this.sessionId, this.phoneNumber);
              if (this.stopped) { isRecreating = false; return; }
              if (freshResult2) {
                markPairingCodeGenerated(this.sessionId);
                if (freshResult2.qrCode) {
                  await updateSessionQR(this.sessionId, freshResult2.qrCode, new Date(Date.now() + 180000).toISOString(), new Date().toISOString());
                }
                await updateSessionPairingCode(this.sessionId, freshResult2.pairingCode);
                this.pairingStartedAt = Date.now();
                pairingWaitStart = Date.now();
                console.log(`[EVO] Auto-retry succeeded for ${this.sessionId}, new code: ${freshResult2.pairingCode}`);
              } else {
                console.log(`[EVO] Auto-retry failed (no code) for ${this.sessionId} — setting needs_reauth`);
                await updateSessionStatus(this.sessionId, 'needs_reauth');
                this.isPairingSent = false;
                if (this.pollHandle) {
                  clearInterval(this.pollHandle);
                  this.pollHandle = null;
                }
              }
            } catch (retryErr) {
              console.error(`[EVO] Auto-retry error for ${this.sessionId}:`, retryErr);
              await updateSessionStatus(this.sessionId, 'needs_reauth');
              this.isPairingSent = false;
              if (this.pollHandle) {
                clearInterval(this.pollHandle);
                this.pollHandle = null;
              }
            }
            isRecreating = false;
          } else if (this.isReconnecting && !this.isPairingSent) {
            // Reconnect attempt ended with close/refused — the session is
            // genuinely disconnected. Update DB immediately to avoid stale
            // "active" state in the dashboard.
            console.log(`[EVO] Reconnect ended with ${state} for ${this.sessionId} — marking needs_reauth`);
            this.isReconnecting = false;
            await releasePairingLock(this.sessionId);
            await updateSessionStatus(this.sessionId, 'needs_reauth');
            if (this.pollHandle) {
              clearInterval(this.pollHandle);
              this.pollHandle = null;
            }
          }
        } else if (state === 'gone') {
          // Instance was deleted by Evolution API (404 response).
          // Immediately mark needs_reauth — don't wait through 'unknown' polls.
          console.warn(`[EVO] Instance GONE (404) for ${this.sessionId} — immediately marking needs_reauth`);
          this.isReady = false;
          this.isPairingSent = false;
          this.isReconnecting = false;
          this.stopPresenceLoop();
          this.stopDeafSessionDetector();
          this.stopAuthHealthCheck();
          await releasePairingLock(this.sessionId);
          await updateSessionStatus(this.sessionId, 'needs_reauth');
          if (this.pollHandle) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
          }
          return;
        } else if (state === 'cooldown') {
          // 428 cooldown is active — skip this poll cycle, don't reconnect
          console.log(`[EVO] Poll for ${this.sessionId} — 428 cooldown active (${get428CooldownRemaining()}s remaining), skipping`);
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
              await deleteInstanceAndVerify(this.sessionId);
              if (this.stopped) { isRecreating = false; return; }
              // createInstance already calls setWebhook internally after success
              await createInstance(this.sessionId, this.phoneNumber);
              if (this.stopped) { isRecreating = false; return; }
              const freshResult3 = await getPairingCode(this.sessionId, this.phoneNumber);
              if (this.stopped) { isRecreating = false; return; }
              if (freshResult3) {
                markPairingCodeGenerated(this.sessionId);
                if (freshResult3.qrCode) {
                  await updateSessionQR(this.sessionId, freshResult3.qrCode, new Date(Date.now() + 180000).toISOString(), new Date().toISOString());
                }
                await updateSessionPairingCode(this.sessionId, freshResult3.pairingCode);
                this.isPairingSent = true;
                this.pairingStartedAt = Date.now();
                pairingWaitStart = Date.now();
                console.log(`[EVO] Instance recreated for ${this.sessionId}, new code: ${freshResult3.pairingCode}`);
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
    // Record initial activity so the deaf session detector doesn't
    // immediately trigger on a freshly connected session.
    recordMessageActivity(this.sessionId);

    const simulate = async () => {
      if (!this.socketAdapter) return;
      try {
        const hour = new Date().getHours();
        const lastActivity = getLastActivity(this.sessionId);
        const idleMinutes = lastActivity ? (Date.now() - lastActivity) / 60_000 : Infinity;

        let unavailableProb = 0.2;
        if (hour >= 0 && hour < 6) unavailableProb = 0.8;
        else if (hour >= 6 && hour < 9) unavailableProb = 0.5;
        else if (hour >= 22) unavailableProb = 0.4;

        // Activity-based presence: if session has been idle for >30 min,
        // always send 'available' to keep WhatsApp's activity tracker fresh
        // and prevent 14-day companion device unlinking.
        if (idleMinutes > 30) {
          await this.socketAdapter.sendPresenceUpdate('available');
          // Brief delay then go offline — mimics a real user checking phone
          setTimeout(async () => {
            try {
              if (this.socketAdapter) {
                await this.socketAdapter.sendPresenceUpdate('unavailable');
              }
            } catch { /* non-critical */ }
          }, 3000 + Math.random() * 5000);
        } else if (Math.random() < unavailableProb) {
          await this.socketAdapter.sendPresenceUpdate('unavailable');
        } else {
          await this.socketAdapter.sendPresenceUpdate('available');
        }
      } catch { /* non-critical */ }

      // More frequent presence when idle (every 3-5 min) to keep WhatsApp
      // activity tracker fresh. Normal frequency when active (5-10 min).
      const lastActivity = getLastActivity(this.sessionId);
      const idleMinutes = lastActivity ? (Date.now() - lastActivity) / 60_000 : Infinity;
      const nextDelay = idleMinutes > 30
        ? (3 + Math.random() * 2) * 60 * 1000   // 3-5 min when idle
        : (5 + Math.random() * 5) * 60 * 1000;  // 5-10 min when active
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

  private startDeafSessionDetector(): void {
    this.stopDeafSessionDetector();
    this.deafCheckHandle = setInterval(async () => {
      if (!this.isReady || this.stopped) return;
      const lastActivity = getLastActivity(this.sessionId);
      if (!lastActivity) return;

      const silentMs = Date.now() - lastActivity;
      if (silentMs > DEAF_SESSION_THRESHOLD_MS) {
        console.warn(`[DEAF-DETECT] Session ${this.sessionId} has received no events for ${Math.round(silentMs / 60_000)}min — forcing instance restart to recover`);
        try {
          await restartInstance(this.sessionId);
          // Reset activity timestamp so we don't immediately trigger again
          recordMessageActivity(this.sessionId);
        } catch (err) {
          console.error(`[DEAF-DETECT] Failed to restart instance ${this.sessionId}:`, err);
        }
      }
    }, DEAF_SESSION_CHECK_INTERVAL_MS);
  }

  private stopDeafSessionDetector(): void {
    if (this.deafCheckHandle) {
      clearInterval(this.deafCheckHandle);
      this.deafCheckHandle = null;
    }
  }

  private startAuthHealthCheck(): void {
    this.stopAuthHealthCheck();
    this.authHealthHandle = setInterval(async () => {
      if (!this.isReady || this.stopped) return;
      try {
        const state = await getInstanceStatus(this.sessionId);
        if (state === 'close' || state === 'refused') {
          console.warn(`[AUTH-HEALTH] Session ${this.sessionId} auth check found state=${state} — triggering reconnect`);
          // The poll loop will handle the actual reconnection
        } else if (state === 'open') {
          console.log(`[AUTH-HEALTH] Session ${this.sessionId} auth check OK (state=open)`);
        }
      } catch (err) {
        console.warn(`[AUTH-HEALTH] Session ${this.sessionId} auth check failed:`, err);
      }
    }, AUTH_HEALTH_CHECK_INTERVAL_MS);
  }

  private stopAuthHealthCheck(): void {
    if (this.authHealthHandle) {
      clearInterval(this.authHealthHandle);
      this.authHealthHandle = null;
    }
  }

  async stop(preserveInstance = false): Promise<void> {
    this.stopped = true;
    this.stopPresenceLoop();
    this.stopDeafSessionDetector();
    this.stopAuthHealthCheck();
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
  // Register keep-alive disconnect handler so the Evolution API keep-alive
  // loop and WebSocket can trigger immediate reconnection in BotManager
  // when they detect a session went offline — faster than the 5s poll loop.
  if (USE_EVOLUTION) {
    setKeepAliveDisconnectHandler((instanceName: string, state: string) => {
      const bot = activeBots.get(instanceName);
      if (bot && bot instanceof EvolutionBot) {
        const status = bot.getStatus();
        if (status.isReady && !status.isReconnecting) {
          console.log(`[KEEPALIVE-HANDLER] Instance ${instanceName} detected as ${state} — triggering immediate reconnect via poll loop restart`);
          // Force the poll loop to detect the disconnect immediately
          // by restarting it (next poll will see close/refused and trigger reconnection)
          (bot as any).startPollLoop();
        }
      }
    });

    // Start socket.io WebSocket client for real-time events from Evolution API
    startEvolutionWebSocket();
  }

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
      stopEvolutionWebSocket();
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
  // Skip sync entirely during 428 cooldown — no new connections should be attempted
  if (is428CooldownActive()) {
    console.log(`[SYNC] Skipping sync cycle — 428 cooldown active (${get428CooldownRemaining()}s remaining)`);
    return;
  }

  if (wasEvolutionRecentlyDown()) {
    console.log('[SYNC] Evolution API recently recovered — reconnections will be staggered via queue');
  }

  const sessions = await getSessionsNeedingBot(SELF_URL || undefined, isWorker);

  // Active-first startup: sort sessions so active/inactive sessions connect
  // first, then qr_pending/pairing_sent sessions. This ensures established
  // sessions reconnect and stabilize before any new pairing attempts start,
  // preventing the thundering herd that causes 428 cascades.
  sessions.sort((a, b) => {
    const priority = (s: typeof a) => {
      if (s.state === 'active') return 0;
      if (s.state === 'inactive') return 1;
      if (s.state === 'pairing_sent') return 2;
      if (s.state === 'qr_pending') return 3;
      return 4;
    };
    return priority(a) - priority(b);
  });

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

  // Track how many NEW pairing sessions we start in THIS sync cycle.
  // Only limit new starts — already-running pairing sessions are already
  // connected to WhatsApp and won't cause additional 428 rate limits.
  let newPairingStartsThisCycle = 0;

  for (const session of sessions) {
    const bot = activeBots.get(session.id);

    if ((session.state === 'active' || session.state === 'inactive') && bot) {
      // If the session is inactive and the bot is dead (not ready, not
      // reconnecting), clean it up so a fresh bot can retry on the next cycle.
      // This prevents sessions from getting permanently stuck after a transient
      // error (e.g. Evolution API returned 502 during creation).
      if (session.state === 'inactive') {
        const status = bot.getStatus();
        if (!status.isReady && !status.isReconnecting) {
          console.log(`[SYNC] Cleaning up dead bot for inactive session ${session.id.slice(0, 8)} — will retry on next cycle`);
          await bot.stop();
          activeBots.delete(session.id);
        }
      }
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

      // Enforce concurrency limit for NEW pairing sessions started this cycle
      const isPairingSession = session.state === 'qr_pending' || session.state === 'pairing_sent';
      if (isPairingSession && newPairingStartsThisCycle >= MAX_CONCURRENT_PAIRING) {
        console.log(`[SYNC] Pairing limit reached (${newPairingStartsThisCycle}/${MAX_CONCURRENT_PAIRING} new this cycle) — deferring session ${session.id.slice(0, 8)} to next cycle`);
        await releaseLock(session.id);
        continue;
      }

      // Active-first stabilization: when transitioning from active/inactive
      // sessions to pairing sessions, wait 10s so established sessions
      // have time to connect before new pairing attempts open more sockets.
      if (isPairingSession) {
        const hasActiveBotsStartingThisCycle = sessions.some(s =>
          (s.state === 'active' || s.state === 'inactive') && !activeBots.has(s.id)
        );
        if (hasActiveBotsStartingThisCycle) {
          console.log(`[SYNC] Stabilization gap: waiting 10s before starting pairing session ${session.id.slice(0, 8)} — active sessions connecting first`);
          await new Promise(resolve => setTimeout(resolve, 10_000));
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

      // Stagger all session starts with random jitter (2-8s) to prevent
      // thundering herd on Evolution API after deploy. Workers naturally
      // spread load across 3 instances; single service needs artificial jitter.
      const jitterMs = 2000 + Math.random() * 6000;
      await new Promise(resolve => setTimeout(resolve, jitterMs));

      // Post-crash reconnect queue: if Evolution just recovered from downtime,
      // each session gets a progressively longer delay to avoid slamming
      // Evolution with all reconnections at once (thundering herd).
      const reconnectDelay = getReconnectDelay();
      if (reconnectDelay > 0) {
        console.log(`[SYNC] Reconnect queue: delaying ${session.id.slice(0, 8)} by ${Math.round(reconnectDelay / 1000)}s (Evolution just recovered)`);
        await new Promise(resolve => setTimeout(resolve, reconnectDelay));
      }

      newBot.start().catch(err => console.error(`[SYNC] Failed to start bot ${session.id}:`, err));

      if (isPairingSession) {
        newPairingStartsThisCycle++;
        // Acquire DB-level pairing lock so other workers see it too
        acquirePairingLock(session.id).catch(() => {});
        // Clear queue position since this session is now active
        updateQueuePosition(session.id, null).catch(() => {});
        // Log pairing event for audit trail
        logPairingEvent(session.id, 'pairing_started', SELF_URL || null).catch(() => {});
      }

      // Stagger: wait between each NEW pairing start to avoid WhatsApp 428.
      // Skip the delay for active/inactive sessions — they already have valid
      // auth and just need to reconnect quickly after a redeploy.
      if (isPairingSession) {
        await new Promise(resolve => setTimeout(resolve, SESSION_STAGGER_DELAY));
      }
    }
  }

  for (const [id, bot] of activeBots) {
    const session = sessions.find(s => s.id === id);
    if (!session) {
      // Don't kill bots that are mid-reconnect (e.g. 515 pairing restart)
      // or in qr_pending state during the handshake
      const status = bot.getStatus();
      if (status.isReconnecting || status.isQrPending || status.isPairingSent) {
        continue;
      }
      console.log(`Stopping bot for removed session: ${id}`);
      await bot.stop();
      await releaseLock(id);
      activeBots.delete(id);
    }
  }

  // Refresh heartbeats for all active bots. If the lock was lost (e.g.
  // orphan recovery cleared it), re-acquire it so heartbeats can resume.
  for (const [id] of activeBots) {
    const bot = activeBots.get(id);
    if (!bot) continue;
    const status = bot.getStatus();
    if (!status.isReady && !status.isReconnecting && !status.isPairingSent) continue;

    const reacquired = await tryAcquireLock(id);
    if (!reacquired) {
      // Another instance owns it — we should stop our local bot to avoid duplicates
      const conflict = await detectConflict(id);
      if (conflict) {
        console.log(`[SYNC] Session ${id.slice(0, 8)} locked by ${conflict} — stopping local bot to avoid duplicate`);
        await bot.stop();
        activeBots.delete(id);
        continue;
      }
    }
    await refreshHeartbeat(id);
  }
}
