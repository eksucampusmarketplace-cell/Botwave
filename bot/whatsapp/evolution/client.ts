// bot/evolutionClient.ts
// REST client for Evolution API endpoints.

import { redisSet428Cooldown, redisGet428Cooldown, redisAcquirePairingLock, redisReleasePairingLock, redisRecordProxyFailure, redisIsProxyBlacklisted, redisClearProxyFailures, redisGetSessionProxy, redisSetSessionProxy, redisClearSessionProxy, redisAddProxyCountrySession, redisRemoveProxyCountrySession, redisGetProxyCountrySessions } from '../../infrastructure/redis';
import { getSessionById } from '../../database';

// eslint-disable-next-line @typescript-eslint/no-var-requires
let HttpsProxyAgent: any;
try {
  HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
} catch {
  HttpsProxyAgent = null;
}

const BASE = process.env.EVOLUTION_API_URL || '';
const KEY  = process.env.EVOLUTION_API_KEY  || '';
const REQUEST_TIMEOUT = 30_000;
// Keep-alive interval: always use 60s. The previous 4-minute interval for
// multi-worker setups assumed workers provide redundant health checks, but
// when workers are configured yet dead (common after architecture changes),
// the main service is effectively standalone and 4min is too slow to detect
// disconnections. 60s is safe for any topology.
const KEEPALIVE_INTERVAL = 60 * 1000;

// Proxy pool for distributing WebSocket connections across different IPs.
// Each proxy string is "host:port:user:pass".
const PROXY_LIST = (process.env.PROXY_LIST || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);
let proxyCounter = 0;

// Log proxy pool status at startup so you can verify config in Render logs
if (PROXY_LIST.length > 0) {
  console.log(`[PROXY] Pool loaded: ${PROXY_LIST.length} proxies configured`);
  PROXY_LIST.forEach((p, i) => {
    const parts = p.split(':');
    console.log(`[PROXY]   #${i + 1}: ${parts[0]}:${parts[1]} (user: ${parts[2] || 'none'})`);
  });
} else {
  console.log('[PROXY] No PROXY_LIST configured - all connections will use server IP directly');
}

// Track consecutive Evolution API failures for health gating.
// Only counts failures from instance-creation and message-sending endpoints.
// Reconnection 404s (connectionState, delete) are expected after a restart
// and must NOT poison this counter.
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

// ─── Global 428 Cooldown (Redis-backed, shared across workers) ─────────
// When ANY instance receives a 428 ("Connection Closed" - WhatsApp rate limit),
// ALL new connection/creation attempts are paused. The cooldown is stored in
// Redis so all workers share the same state. Falls back to in-memory if Redis
// is unavailable.
let global428CooldownUntil = 0;
const COOLDOWN_DURATION_MS = 300_000; // 5 minutes — WhatsApp 428 often needs >60s

/** Activate the 428 cooldown. Stores in Redis (shared) + local fallback. */
export function trigger428Cooldown(source: string, retryAfterSec?: number): void {
  const cooldownSec = retryAfterSec && retryAfterSec > 0 ? retryAfterSec : COOLDOWN_DURATION_MS / 1000;
  const now = Date.now();
  if (now < global428CooldownUntil) {
    console.log(`[428-COOLDOWN] Already in cooldown (${Math.round((global428CooldownUntil - now) / 1000)}s remaining) - triggered by ${source}`);
    return;
  }
  global428CooldownUntil = now + cooldownSec * 1000;
  // Store in Redis for cross-worker visibility (fire-and-forget)
  redisSet428Cooldown('global', cooldownSec).catch(() => {});
  console.warn(`[428-COOLDOWN] ⚠️ ACTIVATED - all new connections paused for ${cooldownSec}s (triggered by ${source})`);
}

/** Activate a per-session 428 cooldown in Redis. */
export function triggerSession428Cooldown(sessionId: string, cooldownSec = 300): void {
  redisSet428Cooldown(sessionId, cooldownSec).catch(() => {});
  // Also set global fallback
  trigger428Cooldown(`session ${sessionId.slice(0, 8)}`, cooldownSec);
}

/** Check if the global 428 cooldown is currently active (local + Redis). */
export function is428CooldownActive(): boolean {
  return Date.now() < global428CooldownUntil;
}

/** Async check of 428 cooldown including Redis (for cross-worker accuracy). */
export async function is428CooldownActiveAsync(sessionId?: string): Promise<boolean> {
  if (Date.now() < global428CooldownUntil) return true;
  // Check Redis for global cooldown
  const globalRemaining = await redisGet428Cooldown('global');
  if (globalRemaining > 0) {
    // Sync local state
    global428CooldownUntil = Date.now() + globalRemaining * 1000;
    return true;
  }
  // Check per-session cooldown if provided
  if (sessionId) {
    const sessionRemaining = await redisGet428Cooldown(sessionId);
    if (sessionRemaining > 0) return true;
  }
  return false;
}

/** Get remaining cooldown time in seconds (0 if not active). */
export function get428CooldownRemaining(): number {
  const remaining = global428CooldownUntil - Date.now();
  return remaining > 0 ? Math.round(remaining / 1000) : 0;
}

// ─── Post-Crash Reconnect Queue (Thundering Herd Prevention) ──────────
// When Evolution API crashes and comes back, all sessions detect the failure
// simultaneously and try to reconnect at once. This slams Evolution right
// after restart and can crash it again. The reconnect queue staggers
// reconnections so they trickle in over time instead of flooding.
let evolutionWasDown = false;
let recoveryStartedAt = 0;
let reconnectSlotCounter = 0;
const RECONNECT_STAGGER_MS = 3_000; // 3 seconds between each reconnection
const RECOVERY_WINDOW_MS = 120_000; // queue is active for 2 min after recovery

/** Called when Evolution API becomes unreachable (consecutive failures). */
export function markEvolutionDown(): void {
  if (!evolutionWasDown) {
    evolutionWasDown = true;
    console.warn('[EVO-RECONNECT-QUEUE] Evolution API marked as DOWN - reconnections will be queued on recovery');
  }
}

/** Called when Evolution API comes back (first successful response after downtime). */
export function markEvolutionRecovered(): void {
  if (evolutionWasDown) {
    evolutionWasDown = false;
    recoveryStartedAt = Date.now();
    reconnectSlotCounter = 0;
    console.log('[EVO-RECONNECT-QUEUE] Evolution API RECOVERED - staggered reconnection queue active');
  }
}

/** Check if the reconnect queue is active (within recovery window). */
export function isReconnectQueueActive(): boolean {
  if (recoveryStartedAt === 0) return false;
  if (Date.now() - recoveryStartedAt > RECOVERY_WINDOW_MS) {
    recoveryStartedAt = 0;
    return false;
  }
  return true;
}

/**
 * Get the delay (in ms) this session should wait before reconnecting.
 * Each caller gets a progressively later slot. Returns 0 if no queue is active.
 */
export function getReconnectDelay(): number {
  if (!isReconnectQueueActive()) return 0;
  const slot = reconnectSlotCounter++;
  return slot * RECONNECT_STAGGER_MS;
}

/** Returns true if Evolution was recently down (for log/diagnostic purposes). */
export function wasEvolutionRecentlyDown(): boolean {
  return isReconnectQueueActive();
}

// ─── Rate-Limited Instance Creation ────────────────────────────────────
// Max 1 new instance creation per RATE_LIMIT_INTERVAL_MS to avoid
// WhatsApp's thundering herd detection (multiple Baileys connections
// from the same IP within seconds).
let lastInstanceCreatedAt = 0;
const RATE_LIMIT_INTERVAL_MS = 8_000; // 8 seconds between instance creations

// ─── Pairing Code Stability ───────────────────────────────────────────
// Once a pairing code is generated for an instance, don't allow deletion
// for PAIRING_STABILITY_MS. This gives the user time to enter the code
// before BotWave's auto-retry loop destroys the instance.
const pairingCodeTimestamps = new Map<string, number>();
const PAIRING_STABILITY_MS = 60 * 1000; // 60 seconds - matches WhatsApp pairing code validity

/** Record that a pairing code was just generated for an instance. */
export function markPairingCodeGenerated(instanceName: string): void {
  pairingCodeTimestamps.set(instanceName, Date.now());
}

/** Check if an instance is within the pairing stability window. */
export function isPairingStabilityActive(instanceName: string): boolean {
  const ts = pairingCodeTimestamps.get(instanceName);
  if (!ts) return false;
  if (Date.now() - ts < PAIRING_STABILITY_MS) return true;
  pairingCodeTimestamps.delete(instanceName);
  return false;
}

/** Clear the pairing stability window (e.g. when pairing succeeds). */
export function clearPairingStability(instanceName: string): void {
  pairingCodeTimestamps.delete(instanceName);
}

// ─── Pairing Rate-Limit Backoff ───────────────────────────────────────
// After repeated failed pairing attempts for the same number, add
// increasing cooldown to avoid WhatsApp rate-limiting the number.
// Counter auto-resets if no attempt has been made in PAIRING_ATTEMPT_TTL_MS
// to prevent infinite backoff loops when reconnects keep failing.
const pairingAttemptCounts = new Map<string, { count: number; lastAttempt: number }>();
const PAIRING_BACKOFF_STEPS = [0, 0, 0, 30_000, 45_000, 60_000]; // 0,0,0,30s,45s,60s max
const PAIRING_ATTEMPT_TTL_MS = 10 * 60 * 1000; // reset counter after 10 min of inactivity

/** Record a pairing attempt for a phone number. Returns wait time in ms (0 = no wait). */
export function recordPairingAttempt(phoneNumber: string): number {
  const now = Date.now();
  const entry = pairingAttemptCounts.get(phoneNumber) || { count: 0, lastAttempt: 0 };
  // Reset counter if last attempt was more than TTL ago
  if (entry.lastAttempt > 0 && (now - entry.lastAttempt) > PAIRING_ATTEMPT_TTL_MS) {
    entry.count = 0;
  }
  entry.count++;
  entry.lastAttempt = now;
  pairingAttemptCounts.set(phoneNumber, entry);
  const backoffIdx = Math.min(entry.count - 1, PAIRING_BACKOFF_STEPS.length - 1);
  return PAIRING_BACKOFF_STEPS[backoffIdx];
}

/** Clear pairing attempt counter (e.g. when pairing succeeds). */
export function clearPairingAttempts(phoneNumber: string): void {
  pairingAttemptCounts.delete(phoneNumber);
}

/** Wait until the rate limiter allows a new instance creation. */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastInstanceCreatedAt;
  if (elapsed < RATE_LIMIT_INTERVAL_MS) {
    const waitMs = RATE_LIMIT_INTERVAL_MS - elapsed;
    console.log(`[RATE-LIMIT] Waiting ${Math.round(waitMs / 1000)}s before next instance creation`);
    await new Promise(r => setTimeout(r, waitMs));
  }
}

// Proxy health tracking: when proxies fail, fall back to direct VPS connection.
// Tracks per-proxy failure counts and a global "proxy disabled" flag.
const proxyFailures = new Map<string, number>();
let proxyPoolDisabled = false;
let proxyRecoveryTimer: ReturnType<typeof setInterval> | null = null;
const PROXY_FAIL_THRESHOLD = 3;
const PROXY_RECOVERY_CHECK_MS = 10 * 60 * 1000; // check every 10 min

/** Send an admin alert email (non-blocking, best-effort). */
async function sendProxyAlert(subject: string, details: Record<string, string | number>): Promise<void> {
  try {
    const { sendAlertEmail, buildAlertHtml } = await import('../../../lib/email-service');
    await sendAlertEmail({
      subject: `[BotWave] ${subject}`,
      text: Object.entries(details).map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: buildAlertHtml(subject, 'critical', details),
    });
  } catch (err) {
    console.error('[PROXY-ALERT] Failed to send alert email:', err);
  }
}

/**
 * Record a proxy failure. If a proxy exceeds the failure threshold,
 * disable it. If all proxies are disabled, fall back to direct VPS.
 */
export function recordProxyFailure(instanceName: string, proxyHost: string, error: string): void {
  const count = (proxyFailures.get(proxyHost) || 0) + 1;
  proxyFailures.set(proxyHost, count);
  console.warn(`[PROXY] Failure #${count} for ${proxyHost} (instance: ${instanceName}): ${error}`);

  if (count >= PROXY_FAIL_THRESHOLD && !proxyPoolDisabled) {
    // Check if all proxies are failing
    const allFailing = PROXY_LIST.every(p => {
      const host = p.split(':')[0];
      return (proxyFailures.get(host) || 0) >= PROXY_FAIL_THRESHOLD;
    });

    if (allFailing) {
      proxyPoolDisabled = true;
      console.error('[PROXY] ALL proxies failing - falling back to direct VPS connection');
      sendProxyAlert('Proxy Pool Down - Falling Back to Direct VPS', {
        'Status': 'All proxies failed, using direct VPS IP',
        'Failed Proxies': PROXY_LIST.length.toString(),
        'Last Error': error,
        'Instance': instanceName,
        'Action': 'Sessions will reconnect without proxy. Add/fix proxies when available.',
      });
      // Disable proxy on all tracked instances so reconnections use direct VPS
      disableProxiesOnAllInstances();
      startProxyRecoveryCheck();
    }
  }
}

/** Reset proxy failure count (called when a proxy connection succeeds). */
export function recordProxySuccess(proxyHost: string): void {
  proxyFailures.delete(proxyHost);
  if (proxyPoolDisabled) {
    // Check if any proxy is now healthy
    const anyHealthy = PROXY_LIST.some(p => {
      const host = p.split(':')[0];
      return !proxyFailures.has(host) || (proxyFailures.get(host) || 0) < PROXY_FAIL_THRESHOLD;
    });
    if (anyHealthy) {
      proxyPoolDisabled = false;
      console.log('[PROXY] Proxy pool recovered - re-enabling proxy connections');
      stopProxyRecoveryCheck();
      sendProxyAlert('Proxy Pool Recovered', {
        'Status': 'At least one proxy is healthy again',
        'Action': 'New sessions will use proxy connections',
      });
    }
  }
}

/** Periodically test if proxies have recovered by fetching through each proxy. */
function startProxyRecoveryCheck(): void {
  if (proxyRecoveryTimer) return;
  proxyRecoveryTimer = setInterval(async () => {
    console.log('[PROXY] Recovery check: testing proxy connectivity...');
    for (const entry of PROXY_LIST) {
      const parts = entry.split(':');
      if (parts.length < 4) continue;
      const [host, port, user, pass] = parts;
      try {
        // Test through the actual proxy, not the server's own IP
        const proxyUrl = `http://${user}:${pass}@${host}:${port}`;
        const agent = HttpsProxyAgent ? new HttpsProxyAgent(proxyUrl) : null;
        if (!agent) {
          console.log(`[PROXY] Recovery check: HttpsProxyAgent not available - skipping`);
          break;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        await fetch('https://web.whatsapp.com', {
          signal: controller.signal,
          // @ts-expect-error -- Node fetch supports agent option
          agent,
        });
        clearTimeout(timeout);
        recordProxySuccess(host);
        console.log(`[PROXY] Recovery check: ${host}:${port} is reachable via proxy`);
      } catch {
        console.log(`[PROXY] Recovery check: ${host}:${port} still failing`);
      }
    }
  }, PROXY_RECOVERY_CHECK_MS);
}

function stopProxyRecoveryCheck(): void {
  if (proxyRecoveryTimer) {
    clearInterval(proxyRecoveryTimer);
    proxyRecoveryTimer = null;
  }
}

/** Check if proxy pool is currently disabled (falling back to direct VPS). */
export function isProxyPoolDisabled(): boolean {
  return proxyPoolDisabled;
}

/**
 * Check if the Evolution API endpoint is healthy enough to accept new
 * instance creation requests. Returns false if the last N requests all failed.
 */
export function isEvolutionHealthy(): boolean {
  return consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
}

/** Reset the failure counter. Called after any successful API response. */
export function resetEvolutionHealth(): void {
  consecutiveFailures = 0;
}

// Sticky proxy: in-memory fallback (used when Redis is unavailable)
const sessionProxyMap = new Map<string, number>();

/** Set the sticky proxy for a session (call after successful proxy assignment). */
export function setSessionProxy(sessionId: string, proxyIndex: number): void {
  sessionProxyMap.set(sessionId, proxyIndex);
}

/** Get the sticky proxy index for a session, or -1 if none assigned. */
export function getSessionProxyIndex(sessionId: string): number {
  return sessionProxyMap.get(sessionId) ?? -1;
}

/**
 * Clear the sticky proxy for a session (both in-memory and Redis).
 * Also removes the session from the proxy's country group so the slot is freed.
 * Call this before re-creating an instance so a fresh proxy is assigned.
 */
export async function clearSessionProxy(sessionId: string, phoneNumber?: string): Promise<void> {
  // Remove from country group if we know the proxy + phone
  const proxyStr = await redisGetSessionProxy(sessionId);
  if (proxyStr && phoneNumber) {
    const proxyHost = proxyStr.split(':')[0];
    const countryCode = extractCountryCode(phoneNumber);
    if (countryCode) {
      await redisRemoveProxyCountrySession(proxyHost, countryCode, sessionId);
    }
  }
  sessionProxyMap.delete(sessionId);
  await redisClearSessionProxy(sessionId);
  console.log(`[PROXY] Cleared sticky proxy for session ${sessionId.slice(0, 8)} — will pick a fresh proxy on next assignment`);
}

/** Parse a proxy string (host:port:user:pass) into a structured object. */
function parseProxy(proxyStr: string): { host: string; port: string; protocol: string; username: string; password: string } | null {
  const parts = proxyStr.split(':');
  if (parts.length < 4) return null;
  return { host: parts[0], port: parts[1], protocol: 'http', username: parts[2], password: parts[3] };
}

// Max sessions from the same country code per proxy IP.
// Keeps WhatsApp traffic on each proxy looking like a single geographic region.
const MAX_SESSIONS_PER_PROXY_COUNTRY = 5;

/**
 * Extract the country dial code from a phone number (e.g. "+62895..." → "62").
 * Returns the first 1-3 digits after stripping non-digits and leading '+'.
 */
export function extractCountryCode(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  // ITU country codes are 1-3 digits. Check common 1-digit first, then 2, then 3.
  const oneDigit = ['1', '7'];
  const twoDigit = [
    '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45',
    '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61',
    '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94',
    '95', '98',
  ];
  if (oneDigit.includes(digits.slice(0, 1))) return digits.slice(0, 1);
  if (twoDigit.includes(digits.slice(0, 2))) return digits.slice(0, 2);
  return digits.slice(0, 3);
}

/**
 * Pick a healthy proxy from the pool (async — uses Redis for health + sticky assignment).
 * Country-aware: groups sessions by phone country code per proxy IP.
 *
 * Priority order:
 * 1. Reuse sticky proxy (if still healthy and not blacklisted)
 * 2. Prefer a proxy that already has sessions from the same country code (< cap)
 * 3. Prefer a proxy with no sessions yet (empty)
 * 4. Fall back to least-loaded proxy that hasn't hit the per-country cap
 * 5. If all proxies are full or blacklisted, return null (caller falls back to direct)
 */
async function getNextProxyAsync(sessionId?: string, phoneNumber?: string): Promise<{ host: string; port: string; protocol: string; username: string; password: string } | null> {
  // Check for user's custom (BYOP) proxy before using the shared pool
  if (sessionId) {
    try {
      const session = await getSessionById(sessionId);
      if (session?.proxy_type === 'custom' && session.proxy_host && session.proxy_port) {
        console.log(`[PROXY] Using custom BYOP proxy for session ${sessionId.slice(0, 8)}: ${session.proxy_host}:${session.proxy_port}`);
        return {
          host: session.proxy_host,
          port: session.proxy_port,
          protocol: 'http',
          username: session.proxy_username || '',
          password: session.proxy_password || '',
        };
      }
    } catch (err) {
      console.warn(`[PROXY] Failed to check custom proxy for session ${sessionId.slice(0, 8)}:`, err);
    }
  }

  if (PROXY_LIST.length === 0) return null;
  if (proxyPoolDisabled) {
    console.log('[PROXY] Pool disabled (fallback mode) - skipping proxy assignment');
    return null;
  }

  const countryCode = phoneNumber ? extractCountryCode(phoneNumber) : '';

  // Try Redis-backed sticky proxy first
  if (sessionId) {
    const stickyProxyStr = await redisGetSessionProxy(sessionId);
    if (stickyProxyStr) {
      const stickyHost = stickyProxyStr.split(':')[0];
      const blacklisted = await redisIsProxyBlacklisted(stickyHost);
      if (!blacklisted) {
        const parsed = parseProxy(stickyProxyStr);
        if (parsed) return parsed;
      }
      console.log(`[PROXY] Sticky proxy ${stickyHost} for session ${sessionId?.slice(0, 8)} is blacklisted — rotating`);
    }
  }

  // Gather health + country data for all proxies
  type ProxyScore = {
    idx: number;
    host: string;
    sameCountryCount: number;
    totalCount: number;
    blacklisted: boolean;
  };
  const scores: ProxyScore[] = [];

  for (let i = 0; i < PROXY_LIST.length; i++) {
    const candidate = PROXY_LIST[i];
    const candidateHost = candidate.split(':')[0];
    const blacklisted = await redisIsProxyBlacklisted(candidateHost);
    if (blacklisted) {
      scores.push({ idx: i, host: candidateHost, sameCountryCount: 0, totalCount: 0, blacklisted: true });
      continue;
    }

    const members = await redisGetProxyCountrySessions(candidateHost);
    const totalCount = members.length;
    const sameCountryCount = countryCode
      ? members.filter(m => m.startsWith(`${countryCode}:`)).length
      : 0;

    scores.push({ idx: i, host: candidateHost, sameCountryCount, totalCount, blacklisted: false });
  }

  const healthy = scores.filter(s => !s.blacklisted);
  if (healthy.length === 0) {
    console.warn(`[PROXY] All ${PROXY_LIST.length} proxies are blacklisted — no proxy available`);
    return null;
  }

  let chosen: ProxyScore | null = null;

  if (countryCode) {
    // 1st: proxy that already has same-country sessions and hasn't hit the cap
    const sameCountry = healthy
      .filter(s => s.sameCountryCount > 0 && s.sameCountryCount < MAX_SESSIONS_PER_PROXY_COUNTRY)
      .sort((a, b) => a.sameCountryCount - b.sameCountryCount);
    if (sameCountry.length > 0) {
      chosen = sameCountry[0];
    }

    // 2nd: empty proxy (no sessions yet)
    if (!chosen) {
      const empty = healthy.filter(s => s.totalCount === 0);
      if (empty.length > 0) {
        chosen = empty[0];
      }
    }

    // 3rd: proxy with fewest total sessions that doesn't have a conflicting country
    if (!chosen) {
      const noConflict = healthy
        .filter(s => s.sameCountryCount === 0 && s.totalCount < MAX_SESSIONS_PER_PROXY_COUNTRY)
        .sort((a, b) => a.totalCount - b.totalCount);
      if (noConflict.length > 0) {
        chosen = noConflict[0];
      }
    }
  }

  // Fallback: least-loaded healthy proxy
  if (!chosen) {
    const leastLoaded = [...healthy].sort((a, b) => a.totalCount - b.totalCount);
    chosen = leastLoaded[0];
  }

  if (!chosen) {
    console.warn(`[PROXY] No suitable proxy found for country +${countryCode}`);
    return null;
  }

  const proxyStr = PROXY_LIST[chosen.idx];
  proxyCounter = chosen.idx + 1;

  // Persist sticky assignment and country grouping
  if (sessionId) {
    await redisSetSessionProxy(sessionId, proxyStr);
    sessionProxyMap.set(sessionId, chosen.idx);
    if (countryCode) {
      await redisAddProxyCountrySession(chosen.host, countryCode, sessionId);
    }
    console.log(`[PROXY] Assigned proxy ${chosen.host} to session ${sessionId.slice(0, 8)} (country=+${countryCode}, sameCountry=${chosen.sameCountryCount}/${MAX_SESSIONS_PER_PROXY_COUNTRY}, total=${chosen.totalCount})`);
  }

  return parseProxy(proxyStr);
}

/**
 * Synchronous proxy picker (legacy fallback — used where async is impractical).
 * Prefers sticky proxy from in-memory map, falls back to round-robin.
 */
function getNextProxy(sessionId?: string): { host: string; port: string; protocol: string; username: string; password: string } | null {
  if (PROXY_LIST.length === 0) return null;
  if (proxyPoolDisabled) return null;

  let index: number;
  if (sessionId) {
    const stickyIdx = sessionProxyMap.get(sessionId);
    if (stickyIdx !== undefined && stickyIdx < PROXY_LIST.length) {
      const stickyHost = PROXY_LIST[stickyIdx].split(':')[0];
      const failures = proxyFailures.get(stickyHost) || 0;
      if (failures < PROXY_FAIL_THRESHOLD) {
        index = stickyIdx;
      } else {
        index = proxyCounter % PROXY_LIST.length;
        proxyCounter++;
      }
    } else {
      index = proxyCounter % PROXY_LIST.length;
      proxyCounter++;
    }
    sessionProxyMap.set(sessionId, index);
  } else {
    index = proxyCounter % PROXY_LIST.length;
    proxyCounter++;
  }

  return parseProxy(PROXY_LIST[index]);
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': KEY,
};

/**
 * Build the webhook URL that Evolution API should POST events to.
 * Prefers WEBHOOK_BASE_URL (internal Docker network) to avoid
 * routing through the public internet for container-to-container calls.
 */
function getWebhookUrl(): string {
  const base =
    process.env.WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SELF_URL ||
    '';
  return base ? `${base}/api/evolution/webhook` : '';
}

/**
 * Strip a data-URI prefix ("data:…;base64,") and return raw base64.
 * Evolution API validates with isBase64() which rejects data URIs.
 */
function stripDataUri(input: string): string {
  const idx = input.indexOf(';base64,');
  if (idx !== -1) return input.slice(idx + 8);
  return input;
}

/**
 * Safely parse a Response body as JSON. Returns null if the body is not valid
 * JSON (e.g. when Render returns an HTML 502/503 error page).
 */
async function safeJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Wrapper around fetch with timeout and basic error checking.
 */
async function apiFetch(url: string, options: RequestInit & { skipHealthCount?: boolean } = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const { skipHealthCount, ...fetchOptions } = options;
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    if (!res.ok) {
      // Clone before reading so the original body stays usable for callers
      const text = await res.clone().text().catch(() => '');
      console.error(`[EVO-CLIENT] ${options.method || 'GET'} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
      // Only count failures that indicate the API itself is broken (5xx, auth errors).
      // 404s during reconnection are expected - Evolution API may still be loading.
      if (!skipHealthCount && res.status >= 500) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          markEvolutionDown();
        }
      }
    } else {
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        markEvolutionRecovered();
      }
      consecutiveFailures = 0;
    }
    return res;
  } catch (err) {
    // Network errors always count - the API is unreachable
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      markEvolutionDown();
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retry a function up to `attempts` times with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Wait for Evolution API to become reachable before starting session sync.
 * Polls the fetchInstances endpoint (lightweight, no side effects) with
 * increasing delays. Returns true if the API responded, false if all
 * attempts were exhausted.
 */
export async function waitForEvolutionReady(maxAttempts = 10, baseDelayMs = 3000): Promise<boolean> {
  if (!BASE) return false;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(`${BASE}/instance/fetchInstances`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        console.log(`[EVO-CLIENT] Evolution API ready (attempt ${i}/${maxAttempts})`);
        consecutiveFailures = 0;
        return true;
      }
      console.warn(`[EVO-CLIENT] Evolution API not ready: status=${res.status} (attempt ${i}/${maxAttempts})`);
    } catch (err: any) {
      console.warn(`[EVO-CLIENT] Evolution API unreachable: ${err.message} (attempt ${i}/${maxAttempts})`);
    }
    if (i < maxAttempts) {
      const delay = Math.min(baseDelayMs * i, 15000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`[EVO-CLIENT] Evolution API did not become ready after ${maxAttempts} attempts`);
  return false;
}

// Create a new WhatsApp instance for a session, including webhook config.
// If the instance already exists (403), log and continue - the caller will
// connect to the existing instance via getPairingCode.
export async function createInstance(instanceName: string, phoneNumber: string) {
  // Guard: refuse to create new instances if Evolution API has been failing
  if (!isEvolutionHealthy()) {
    console.error(`[EVO-CLIENT] createInstance BLOCKED: Evolution API has ${consecutiveFailures} consecutive failures - refusing to accept new pairing sessions`);
    throw new Error('Evolution API is unhealthy - cannot create new instances');
  }

  // Guard: refuse during 428 cooldown to prevent cascading disconnects
  if (is428CooldownActive()) {
    const remaining = get428CooldownRemaining();
    console.warn(`[EVO-CLIENT] createInstance BLOCKED: 428 cooldown active (${remaining}s remaining) - refusing ${instanceName}`);
    throw new Error(`428 cooldown active - ${remaining}s remaining`);
  }

  // Rate limit: wait if we created an instance too recently
  await waitForRateLimit();

  const webhookUrl = getWebhookUrl();
  console.log(`[EVO-CLIENT] createInstance: name=${instanceName} phone=${phoneNumber} webhookUrl=${webhookUrl || 'NONE'}`);

  const payload: Record<string, unknown> = {
    instanceName,
    number: phoneNumber.replace(/\D/g, ''),
    qrcode: false,
    integration: 'WHATSAPP-BAILEYS',
  };

  // Proxy is set after creation via retry loop (tries all available proxies).
  if (PROXY_LIST.length > 0) {
    console.log(`[PROXY] Will assign proxy from pool of ${PROXY_LIST.length} to instance ${instanceName}`);
  } else {
    console.warn(`[PROXY] No proxy available for instance ${instanceName} - connecting with server IP (risk of 428 ban)`);
  }

  // NOTE: Do NOT include proxy or webhook config in the create payload.
  // Evolution API v2.3.7 has a race condition where setProxy is called on
  // waInstances[name] before the instance is fully registered, causing
  // "Cannot read properties of undefined (reading 'setProxy')" errors.
  // Instead, set proxy separately after creation succeeds.

  const res = await withRetry(async () => {
    const r = await apiFetch(`${BASE}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // 502/503 = Render's reverse proxy couldn't reach the upstream.
    // Throw so withRetry retries after a backoff instead of crashing
    // when we try to parse the HTML error page as JSON.
    if (r.status === 502 || r.status === 503) {
      throw new Error(`Evolution API returned ${r.status} (transient) - will retry`);
    }

    // If instance creation fails with 403 (name in use) or 400 (stale/corrupt
    // instance state), force-delete the old instance and retry. The 400 case
    // commonly occurs after WhatsApp logs out a session - Evolution API's
    // internal state is inconsistent and createInstance rejects even though
    // the instance no longer functions.
    if (r.status === 403 || r.status === 400) {
      const body = await r.clone().text().catch(() => '');
      console.warn(`[EVO-CLIENT] Instance "${instanceName}" creation rejected (status=${r.status}, body=${body.slice(0, 200)}) - force-deleting and retrying`);
      await deleteInstanceAndVerify(instanceName);
      // Extra pause after verified deletion to let DB constraints fully propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      return apiFetch(`${BASE}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    return r;
  }, 4, 2000); // 4 attempts, 2s base delay for 502/503 recovery
  const result = await safeJson(res);
  if (!result) {
    console.error(`[EVO-CLIENT] createInstance: response body is not valid JSON (status=${res.status}) - treating as failure`);
    return { error: true, status: res.status, message: 'Non-JSON response from Evolution API' };
  }
  const instanceId = result?.instance?.instanceId || 'none';
  console.log(`[EVO-CLIENT] createInstance result for ${instanceName}: status=${res.status} instanceId=${instanceId}`);
  lastInstanceCreatedAt = Date.now();

  // Set proxy via separate API call after instance is fully created.
  // This avoids the race condition where setProxy is called before the
  // instance is registered in waInstances.
  // Proxy MUST be set BEFORE pairing starts so WhatsApp sees a consistent
  // IP from the very first connection. Changing IP mid-session causes bans.
  // Retry through all available proxies if one fails.
  if (res.status === 200 || res.status === 201) {
    // Small delay to let Evolution API fully register the instance
    await new Promise(resolve => setTimeout(resolve, 1500));
    const maxProxyAttempts = PROXY_LIST.length || 0;
    let proxySet = false;
    for (let pi = 0; pi < maxProxyAttempts && !proxySet; pi++) {
      // Use async Redis-backed proxy picker (health-aware + sticky + country-grouped)
      const p = await getNextProxyAsync(instanceName, phoneNumber);
      if (!p) break;
      try {
        const proxyRes = await apiFetch(`${BASE}/proxy/set/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            enabled: true,
            host: p.host,
            port: p.port,
            protocol: p.protocol,
            username: p.username,
            password: p.password,
          }),
        });
        if (proxyRes.status === 200 || proxyRes.status === 201) {
          console.log(`[PROXY] Proxy SET for ${instanceName} - ${p.host}:${p.port} (attempt ${pi + 1}/${maxProxyAttempts})`);
          recordProxySuccess(p.host);
          await redisClearProxyFailures(p.host);
          proxySet = true;
        } else if (proxyRes.status === 404) {
          console.warn(`[PROXY] Instance ${instanceName} not found (404) - skipping remaining proxy attempts`);
          break;
        } else {
          const body = await proxyRes.text().catch(() => '');
          console.warn(`[PROXY] Failed to set proxy for ${instanceName} (status=${proxyRes.status}, attempt ${pi + 1}/${maxProxyAttempts}): ${body.slice(0, 200)}`);
          recordProxyFailure(instanceName, p.host, `setProxy status=${proxyRes.status}`);
          await redisRecordProxyFailure(p.host);
        }
      } catch (err) {
        console.warn(`[PROXY] setProxy attempt ${pi + 1}/${maxProxyAttempts} failed for ${instanceName} (${p.host}:${p.port}):`, err);
        recordProxyFailure(instanceName, p.host, String(err));
        await redisRecordProxyFailure(p.host);
      }
    }
    if (!proxySet && maxProxyAttempts > 0) {
      console.error(`[PROXY] All ${maxProxyAttempts} proxies failed for ${instanceName} - aborting instance creation (server IP fallback disabled)`);
      // Delete the instance we just created to avoid running on server IP
      try {
        await apiFetch(`${BASE}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers,
        });
      } catch {
        // best-effort cleanup
      }
      return null;
    }
  }

  // Ensure readMessages and readStatus are OFF so the bot doesn't auto-read
  // incoming messages. Evolution API defaults can vary - set explicitly.
  if (res.status === 200 || res.status === 201) {
    try {
      await apiFetch(`${BASE}/settings/set/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rejectCall: false,
          msgCall: '',
          groupsIgnore: false,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false,
        }),
        skipHealthCount: true,
      });
      console.log(`[EVO-CLIENT] Settings enforced for ${instanceName}: readMessages=false, readStatus=false`);
    } catch (err) {
      console.warn(`[EVO-CLIENT] Failed to set settings for ${instanceName} (non-fatal):`, err);
    }
  }

  // Set per-instance webhook separately (non-fatal - global webhook is the fallback)
  if (webhookUrl && (res.status === 200 || res.status === 201)) {
    setWebhook(instanceName).catch(err => {
      console.warn(`[EVO-CLIENT] setWebhook after create failed for ${instanceName} (non-fatal, global webhook active):`, err);
    });
  }

  return result;
}

/**
 * Enable proxy on an existing instance after successful pairing.
 * Called after linking succeeds so the ongoing connection uses a proxy.
 * Tries up to PROXY_LIST.length proxies before giving up.
 */
export async function enableInstanceProxy(instanceName: string): Promise<boolean> {
  const maxAttempts = PROXY_LIST.length || 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proxy = await getNextProxyAsync(instanceName);
    if (!proxy) {
      console.log(`[PROXY] enableInstanceProxy: no healthy proxy available for ${instanceName}`);
      return false;
    }
    try {
      const res = await apiFetch(`${BASE}/proxy/set/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enabled: true,
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol,
          username: proxy.username,
          password: proxy.password,
        }),
        skipHealthCount: true,
      });
      const ok = res.status === 200 || res.status === 201;
      console.log(`[PROXY] enableInstanceProxy ${instanceName}: status=${res.status} ok=${ok} proxy=${proxy.host}:${proxy.port} attempt=${attempt + 1}/${maxAttempts}`);
      if (ok) {
        recordProxySuccess(proxy.host);
        await redisClearProxyFailures(proxy.host);
        return true;
      }
      if (res.status === 404) {
        console.warn(`[PROXY] enableInstanceProxy: instance ${instanceName} not found (404) - aborting`);
        return false;
      }
      recordProxyFailure(instanceName, proxy.host, `enableInstanceProxy status=${res.status}`);
      await redisRecordProxyFailure(proxy.host);
    } catch (err) {
      console.warn(`[PROXY] enableInstanceProxy ${instanceName} attempt ${attempt + 1} failed for ${proxy.host}:${proxy.port}:`, err);
      recordProxyFailure(instanceName, proxy.host, String(err));
      await redisRecordProxyFailure(proxy.host);
    }
  }
  console.error(`[PROXY] enableInstanceProxy ${instanceName}: all ${maxAttempts} proxies failed`);
  return false;
}

/**
 * Disable proxy on an existing instance so it falls back to direct VPS connection.
 * Used when the proxy pool is down and sessions need to reconnect without proxy.
 */
export async function disableInstanceProxy(instanceName: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${BASE}/proxy/set/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled: false }),
      skipHealthCount: true,
    });
    const ok = res.status === 200 || res.status === 201;
    console.log(`[PROXY] disableInstanceProxy ${instanceName}: status=${res.status} ok=${ok}`);
    return ok;
  } catch (err) {
    console.warn(`[PROXY] disableInstanceProxy ${instanceName} failed:`, err);
    return false;
  }
}

// Get pairing code for an instance (pass phone number as query param).
// Triggers Baileys connection if not yet started, then polls for the code
// since Baileys generates it asynchronously (~2-4s after connection starts).
export interface PairingResult {
  pairingCode: string;
  qrCode: string | null;
  qrBase64: string | null;
}

export async function getPairingCode(instanceName: string, phoneNumber: string): Promise<PairingResult | null> {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const flowStart = Date.now();
  console.log(`[PAIRING-EVO-CLIENT] ======= getPairingCode START ======= instance=${instanceName} phone=${cleanPhone} at=${new Date(flowStart).toISOString()}`);

  // Distributed pairing lock: prevent concurrent pairing requests from multiple workers
  const lockAcquired = await redisAcquirePairingLock(instanceName);
  if (!lockAcquired) {
    console.warn(`[PAIRING-EVO-CLIENT] Another worker is already pairing instance=${instanceName} — aborting`);
    return null;
  }

  try {
    return await getPairingCodeInner(instanceName, cleanPhone, flowStart);
  } finally {
    await redisReleasePairingLock(instanceName);
  }
}

async function getPairingCodeInner(instanceName: string, cleanPhone: string, flowStart: number): Promise<PairingResult | null> {
  const connectStart = Date.now();
  const connectRes = await withRetry(() =>
    apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    }).then(r => {
      if (r.status === 502 || r.status === 503) {
        throw new Error(`Evolution API returned ${r.status} (transient) - will retry`);
      }
      return r;
    }),
  );
  const connectData: any = await safeJson(connectRes);
  const connectDuration = Date.now() - connectStart;
  console.log(`[PAIRING-EVO-CLIENT] Initial connect response: status=${connectRes.status} pairingCode=${connectData?.pairingCode || 'none'} base64=${connectData?.base64 ? 'yes' : 'no'} state=${connectData?.state || 'unknown'} duration=${connectDuration}ms`);
  if (connectData?.pairingCode) {
    // If pairing code is present but QR data is missing, the Evolution API's
    // async toDataURL callback hasn't completed yet. Wait briefly and retry.
    if (!connectData.code) {
      console.log(`[PAIRING-EVO-CLIENT] Got pairing code but QR data missing - retrying after 1.5s`);
      await new Promise(r => setTimeout(r, 1500));
      try {
        const retryRes = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, { method: 'GET', headers });
        const retryData: any = await safeJson(retryRes);
        if (retryData?.code) {
          console.log(`[PAIRING-EVO-CLIENT] QR data received on retry. totalDuration=${Date.now() - flowStart}ms`);
          return { pairingCode: connectData.pairingCode, qrCode: retryData.code, qrBase64: retryData.base64 || null };
        }
      } catch (retryErr: any) {
        console.warn(`[PAIRING-EVO-CLIENT] QR retry failed: ${retryErr?.message}`);
      }
    }
    console.log(`[PAIRING-EVO-CLIENT] Got code on first try: "${connectData.pairingCode}" hasQR=${!!connectData.code} totalDuration=${Date.now() - flowStart}ms`);
    return { pairingCode: connectData.pairingCode, qrCode: connectData.code || null, qrBase64: connectData.base64 || null };
  }

  const POLL_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 3000;
  const INITIAL_WAIT_MS = 2000;
  console.log(`[PAIRING-EVO-CLIENT] No code on first try, waiting ${INITIAL_WAIT_MS}ms then polling (${POLL_ATTEMPTS} attempts, ${POLL_INTERVAL_MS}ms apart)...`);
  await new Promise(r => setTimeout(r, INITIAL_WAIT_MS));

  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const pollStart = Date.now();
    const elapsed = pollStart - flowStart;
    try {
      const res = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
        method: 'GET',
        headers,
      });
      if (res.status === 502 || res.status === 503) {
        console.warn(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: got ${res.status} (transient) - skipping`);
        continue;
      }
      const data: any = await safeJson(res);
      if (!data) {
        console.warn(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: non-JSON response - skipping`);
        continue;
      }
      const pollDuration = Date.now() - pollStart;
      const hasQrCount = typeof data?.count === 'number';
      console.log(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: status=${res.status} pairingCode=${data?.pairingCode || 'none'} base64=${data?.base64 ? 'yes' : 'no'} qrCount=${hasQrCount ? data.count : 'n/a'} pollDuration=${pollDuration}ms totalElapsed=${elapsed}ms`);
      if (data?.pairingCode) {
        // If pairing code is present but QR data not ready, retry once
        if (!data.code) {
          console.log(`[PAIRING-EVO-CLIENT] Poll ${i + 1}: pairing code present but QR missing - retrying after 1.5s`);
          await new Promise(r => setTimeout(r, 1500));
          try {
            const retryRes = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, { method: 'GET', headers });
            const retryData: any = await safeJson(retryRes);
            if (retryData?.code) {
              console.log(`[PAIRING-EVO-CLIENT] QR data received on poll retry. totalDuration=${Date.now() - flowStart}ms`);
              return { pairingCode: data.pairingCode, qrCode: retryData.code, qrBase64: retryData.base64 || null };
            }
          } catch { /* non-fatal */ }
        }
        console.log(`[PAIRING-EVO-CLIENT] Got code on poll ${i + 1}: "${data.pairingCode}" hasQR=${!!data.code} totalDuration=${Date.now() - flowStart}ms`);
        return { pairingCode: data.pairingCode, qrCode: data.code || null, qrBase64: data.base64 || null };
      }
    } catch (err: any) {
      console.error(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS} FAILED: error=${err?.message} totalElapsed=${elapsed}ms`);
    }
    if (i < POLL_ATTEMPTS - 1) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  const totalDuration = Date.now() - flowStart;
  console.error(`[PAIRING-EVO-CLIENT] ======= getPairingCode FAILED ======= No code after ${POLL_ATTEMPTS} polls for ${instanceName}. totalDuration=${totalDuration}ms`);
  return null;
}

// Fetch the latest pairing code without triggering a new connection.
// Safe to call repeatedly - returns current QR data when instance is connecting.
export async function refreshPairingCode(instanceName: string, phoneNumber: string): Promise<PairingResult | null> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const res = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    });
    if (res.status === 502 || res.status === 503) return null;
    const data: any = await safeJson(res);
    if (!data?.pairingCode) return null;
    // If pairing code is present but QR data not ready, retry once
    if (!data.code) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const retryRes = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, { method: 'GET', headers });
        const retryData: any = await safeJson(retryRes);
        if (retryData?.code) {
          return { pairingCode: data.pairingCode, qrCode: retryData.code, qrBase64: retryData.base64 || null };
        }
      } catch { /* non-fatal */ }
    }
    return { pairingCode: data.pairingCode, qrCode: data.code || null, qrBase64: data.base64 || null };
  } catch {
    return null;
  }
}

// Get connection status of an instance.
// 404 = instance deleted by Evolution API (DEL_TEMP_INSTANCES or LOGOUT cascade).
// Returns 'gone' for 404 so BotManager can immediately mark needs_reauth
// instead of waiting through multiple 'unknown' polls.
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const res = await apiFetch(`${BASE}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
      skipHealthCount: true,
    });
    if (res.status === 502 || res.status === 503) return 'unknown';
    // 404 = instance was deleted (REMOVED by Evolution API). Return 'gone'
    // so BotManager can immediately transition to needs_reauth.
    if (res.status === 404) {
      console.warn(`[EVO-CLIENT] getInstanceStatus ${instanceName}: 404 - instance GONE (deleted by Evolution API)`);
      return 'gone';
    }
    const data: any = await safeJson(res);
    if (!data) return 'unknown';
    const state = data?.instance?.state || 'unknown';
    // Only log non-routine state changes (avoid flooding logs during polling)
    if (state !== 'open' && state !== 'connecting') {
      console.log(`[EVO-CLIENT] getInstanceStatus ${instanceName}: ${state}`);
    }
    return state;
  } catch (err) {
    console.warn(`[EVO-CLIENT] getInstanceStatus ${instanceName} failed:`, err);
    return 'unknown';
  }
}

// Restart an existing instance (reconnects without deleting auth state).
// Uses the Evolution API restart endpoint which closes the current WebSocket
// and re-establishes the connection using persisted auth credentials.
// NOTE: This only works when the instance is in 'open' or 'connecting' state.
// For instances in 'close' state, use connectInstance() instead.
export async function restartInstance(instanceName: string): Promise<boolean> {
  console.log(`[EVO-CLIENT] restartInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/restart/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ instanceName }),
    });
    const ok = res.ok;
    console.log(`[EVO-CLIENT] restartInstance ${instanceName}: status=${res.status} ok=${ok}`);
    return ok;
  } catch (err) {
    console.warn(`[EVO-CLIENT] restartInstance ${instanceName} failed:`, err);
    return false;
  }
}

// Reconnect an instance using the best available method based on its current state.
// - 'open'/'connecting': uses restartInstance (closes + reopens WebSocket)
// - 'close': uses connectInstance (reconnects using saved auth)
// - 'unknown'/'gone': returns false (instance needs to be recreated)
// This is the preferred method for auto-recovery and deaf session detection.
export async function reconnectInstance(instanceName: string, phoneNumber?: string): Promise<boolean> {
  const state = await getInstanceStatus(instanceName);
  console.log(`[EVO-CLIENT] reconnectInstance: ${instanceName} state=${state}`);

  if (state === 'open' || state === 'connecting') {
    return restartInstance(instanceName);
  }

  if (state === 'close') {
    const connectState = await connectInstance(instanceName, phoneNumber);
    return connectState === 'open' || connectState === 'connecting';
  }

  console.warn(`[EVO-CLIENT] reconnectInstance: ${instanceName} in state '${state}' - cannot reconnect`);
  return false;
}

// Connect to an existing instance without requesting a new pairing code.
// This triggers Baileys to reconnect using saved auth credentials.
export async function connectInstance(instanceName: string, phoneNumber?: string): Promise<string> {
  // Guard: refuse during 428 cooldown
  if (is428CooldownActive()) {
    const remaining = get428CooldownRemaining();
    console.warn(`[EVO-CLIENT] connectInstance BLOCKED: 428 cooldown active (${remaining}s remaining) - refusing ${instanceName}`);
    return 'cooldown';
  }
  console.log(`[EVO-CLIENT] connectInstance: ${instanceName} phone=${phoneNumber || 'none'}`);
  try {
    let url = `${BASE}/instance/connect/${instanceName}`;
    if (phoneNumber) {
      url += `?number=${phoneNumber.replace(/\D/g, '')}`;
    }
    const res = await apiFetch(url, {
      method: 'GET',
      headers,
    });
    if (res.status === 502 || res.status === 503) return 'unknown';
    const data: any = await safeJson(res);
    if (!data) return 'unknown';
    const state = data?.state || data?.instance?.state || 'unknown';
    console.log(`[EVO-CLIENT] connectInstance ${instanceName}: status=${res.status} state=${state}`);
    return state;
  } catch (err) {
    console.warn(`[EVO-CLIENT] connectInstance ${instanceName} failed:`, err);
    return 'unknown';
  }
}

// Delete an instance (used when session is removed).
// 404s are expected (instance already gone) - don't count them as failures.
export async function deleteInstance(instanceName: string): Promise<number> {
  console.log(`[EVO-CLIENT] deleteInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers,
      skipHealthCount: true,
    });
    console.log(`[EVO-CLIENT] deleteInstance ${instanceName}: status=${res.status}`);
    return res.status;
  } catch (err) {
    console.warn(`[EVO-CLIENT] deleteInstance ${instanceName} failed (non-critical):`, err);
    return 0;
  }
}

/**
 * Delete an instance and poll until Evolution API confirms it is fully gone.
 * Evolution API's delete endpoint returns 200 immediately but cleanup is
 * async (event-driven). Without verification, a subsequent createInstance
 * races against the cleanup and gets 403 "name already in use".
 *
 * If the instance persists after the first delete + polling cycle, we retry
 * the delete up to {@link MAX_DELETE_RETRIES} times. This handles cases where
 * the first delete's DB cleanup fails (e.g. P2028 transaction timeout) and
 * the instance record remains in the database.
 */
export async function deleteInstanceAndVerify(instanceName: string, maxWaitMs = 15_000): Promise<void> {
  // CRITICAL GUARD: Never delete an instance that is currently connected (open).
  // This prevents accidentally wiping a working session's auth state.
  const preDeleteState = await getInstanceStatus(instanceName);
  if (preDeleteState === 'open') {
    console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: BLOCKED - instance ${instanceName} is OPEN (connected). Refusing to delete a live session.`);
    return;
  }

  // GUARD: Don't delete during pairing stability window
  if (isPairingStabilityActive(instanceName)) {
    console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: BLOCKED - instance ${instanceName} is within pairing stability window. Code may still be valid.`);
    return;
  }

  const MAX_DELETE_RETRIES = 3;
  const POLL_INTERVAL = 2000;

  for (let attempt = 1; attempt <= MAX_DELETE_RETRIES; attempt++) {
    const deleteStatus = await deleteInstance(instanceName);

    // FAST PATH: 404 means instance is already gone - no need to poll
    if (deleteStatus === 404) {
      console.log(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} already gone (delete returned 404) - skipping verify`);
      return;
    }

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const state = await getInstanceStatus(instanceName);
      if (state === 'unknown' || state === 'gone') {
        console.log(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} confirmed gone (state=${state}) after ${Date.now() - start}ms (attempt ${attempt})`);
        return;
      }
      console.log(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still exists (state=${state}), waiting... (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }

    if (attempt < MAX_DELETE_RETRIES) {
      console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still present after ${maxWaitMs}ms - retrying delete (attempt ${attempt + 1}/${MAX_DELETE_RETRIES})`);
    }
  }
  console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still present after ${MAX_DELETE_RETRIES} delete attempts - proceeding anyway`);
}

// Configure webhook for an existing instance.
// Retries with backoff to handle FK constraint errors that occur when the
// instance record hasn't fully propagated to the database yet.
export async function setWebhook(instanceName: string) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn(`[EVO-CLIENT] setWebhook skipped for ${instanceName}: no webhook URL configured`);
    return;
  }

  console.log(`[EVO-CLIENT] setWebhook for ${instanceName}: url=${webhookUrl}`);
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await apiFetch(`${BASE}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            // Empty events array = subscribe to ALL events.
            // Previously used specific event names (MESSAGES_UPSERT, etc.)
            // but Evolution API v2.3.7 may not recognize those constants,
            // causing messages.upsert to never be forwarded.
            events: [],
          },
        }),
      });
      console.log(`[EVO-CLIENT] setWebhook ${instanceName}: status=${res.status} (attempt ${attempt})`);
      if (res.ok) return;
      const body = await res.text().catch(() => '');
      const isConstraintError = body.includes('foreign key') || body.includes('P2003') || body.includes('P2025');
      if (!isConstraintError || attempt === MAX_RETRIES) {
        console.error(`[EVO-CLIENT] setWebhook ${instanceName} failed: status=${res.status} body=${body}`);
        return;
      }
      console.warn(`[EVO-CLIENT] setWebhook ${instanceName} FK constraint error (attempt ${attempt}/${MAX_RETRIES}) - retrying in ${BASE_DELAY * attempt}ms`);
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
    } catch (err) {
      console.error(`[EVO-CLIENT] Failed to set webhook for ${instanceName} (attempt ${attempt}/${MAX_RETRIES}):`, err);
      if (attempt === MAX_RETRIES) return;
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
    }
  }
}

// Send a text message through an instance
export async function sendText(instanceName: string, to: string, text: string, mentioned?: string[]) {
  const payload: Record<string, unknown> = { number: to, text, delay: 0 };
  if (mentioned && mentioned.length > 0) {
    payload.mentioned = mentioned;
  }
  const res = await apiFetch(`${BASE}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Send media (image, video, document) through an instance
export async function sendMedia(
  instanceName: string,
  to: string,
  mediaBase64: string,
  mimetype: string,
  mediatype: 'image' | 'video' | 'document',
  fileName?: string,
  caption?: string,
) {
  const res = await apiFetch(`${BASE}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      number: to,
      mediatype,
      mimetype,
      media: stripDataUri(mediaBase64),
      fileName: fileName || 'file',
      caption: caption || '',
      delay: 0,
    }),
  });
  return res.json();
}

// Post a status (story) through an instance
export async function sendStatus(
  instanceName: string,
  type: 'text' | 'image' | 'video' | 'audio',
  contentBase64OrUrl: string,
  options?: {
    caption?: string;
    statusJidList?: string[];
    allContacts?: boolean;
    backgroundColor?: string;
    font?: number;
  },
) {
  const payload: Record<string, unknown> = {
    type,
    content: type === 'text' ? contentBase64OrUrl : stripDataUri(contentBase64OrUrl),
    ...(options?.caption ? { caption: options.caption } : {}),
    ...(options?.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    ...(options?.font !== undefined ? { font: options.font } : {}),
  };

  if (options?.statusJidList?.length) {
    payload.statusJidList = options.statusJidList;
  } else {
    payload.allContacts = true;
  }

  const res = await apiFetch(`${BASE}/message/sendStatus/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Send a sticker through an instance
export async function sendSticker(instanceName: string, to: string, stickerBase64: string) {
  const res = await apiFetch(`${BASE}/message/sendSticker/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, sticker: stripDataUri(stickerBase64), delay: 0 }),
  });
  return res.json();
}

// Send audio using the dedicated WhatsApp audio endpoint (encodes to opus)
export async function sendAudio(instanceName: string, to: string, audioBase64: string) {
  const res = await apiFetch(`${BASE}/message/sendWhatsAppAudio/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, audio: stripDataUri(audioBase64), delay: 0, encoding: true }),
  });
  return res.json();
}

// ─── LID ↔ JID Cache ─────────────────────────────────────────────────────────
// WhatsApp now uses LIDs (long-term identifiers) for some contacts. When the
// bot sends a message using the phone JID but Evolution API stored it with the
// LID, updateMessage fails with "RemoteJid does not match". This cache stores
// the mapping so subsequent edits skip the failed first attempt.
// Key: "instanceName:phoneJid" → Value: LID (e.g. "201503339978753@lid")
const lidCache = new Map<string, string>();
const LID_CACHE_MAX_SIZE = 1000;

function cacheLidMapping(instanceName: string, phoneJid: string, lid: string): void {
  if (lidCache.size >= LID_CACHE_MAX_SIZE) {
    const firstKey = lidCache.keys().next().value;
    if (firstKey) lidCache.delete(firstKey);
  }
  lidCache.set(`${instanceName}:${phoneJid}`, lid);
}

function getCachedLid(instanceName: string, phoneJid: string): string | undefined {
  return lidCache.get(`${instanceName}:${phoneJid}`);
}

// Edit (update) an existing text message.
// Throws on non-2xx so callers' catch blocks can fall back to normal send.
// Handles LID/phone JID mismatch: if the first attempt fails because the
// stored message uses LID addressing, we look up the stored key and retry.
// Uses an in-memory LID cache to avoid the DB lookup on subsequent edits.
export async function updateMessage(
  instanceName: string,
  key: { remoteJid: string; fromMe: boolean; id: string },
  text: string,
) {
  const isGroup = key.remoteJid.endsWith('@g.us');
  const isLid = key.remoteJid.endsWith('@lid');
  const number = key.remoteJid.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '');

  // Check LID cache: if we previously discovered that this phone JID maps
  // to a LID for this instance, use the LID directly to avoid the 400 error.
  const cachedLid = !isLid && !isGroup ? getCachedLid(instanceName, key.remoteJid) : undefined;
  const effectiveKey = cachedLid ? { ...key, remoteJid: cachedLid } : key;
  const effectiveNumber = cachedLid || number;

  if (cachedLid) {
    console.log(`[EDIT-DEBUG] updateMessage: using cached LID ${cachedLid} for ${key.remoteJid}`);
  }

  const res = await apiFetch(`${BASE}/chat/updateMessage/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: effectiveNumber, key: effectiveKey, text }),
  });
  if (res.ok) {
    return res.json();
  }

  const body = await res.text();
  console.log(`[EDIT-DEBUG] updateMessage FAILED (${res.status}): ${body.slice(0, 300)}`);

  // If "RemoteJid does not match", the DB likely stores the message with a
  // different JID format. Look up the stored key and retry with its remoteJid.
  if (body.includes('RemoteJid does not match')) {
    try {
      const stored = await findMessageByKeyId(instanceName, key.id);
      if (stored?.key?.remoteJid && stored.key.remoteJid !== effectiveKey.remoteJid) {
        const storedJid = stored.key.remoteJid;
        const fixedKey = { ...key, remoteJid: storedJid };
        console.log(`[EDIT-DEBUG] Retrying with stored JID: ${storedJid} (was ${key.remoteJid})`);
        const res2 = await apiFetch(`${BASE}/chat/updateMessage/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: storedJid, key: fixedKey, text }),
        });
        if (res2.ok) {
          // Cache the mapping for future edits to this chat
          if (!isGroup && storedJid !== key.remoteJid) {
            cacheLidMapping(instanceName, key.remoteJid, storedJid);
          }
          return res2.json();
        }
        const body2 = await res2.text();
        throw new Error(`updateMessage retry failed (${res2.status}): ${body2.slice(0, 200)}`);
      } else if (!stored) {
        console.log(`[EDIT-DEBUG] Message not found in DB by key.id=${key.id}`);
      }
    } catch (lookupErr) {
      if (lookupErr instanceof Error && lookupErr.message.includes('retry failed')) throw lookupErr;
      console.error('[EVO-CLIENT] Key lookup failed:', lookupErr);
    }
  }

  throw new Error(`updateMessage failed (${res.status}): ${body.slice(0, 200)}`);
}

// Fetch recent messages for a chat from Evolution API's database.
export async function findMessages(instanceName: string, where: Record<string, unknown>, limit = 50): Promise<any[]> {
  try {
    const res = await apiFetch(`${BASE}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ where, limit }),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    // Evolution API v2.3+ returns paginated: { messages: { records: [...] } }
    const messages = Array.isArray(data) ? data
      : data?.messages?.records || data?.messages || data?.data || [];
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

// Look up a message by its key.id in Evolution API's database.
async function findMessageByKeyId(instanceName: string, keyId: string): Promise<any> {
  const res = await apiFetch(`${BASE}/chat/findMessages/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ where: { key: { id: keyId } } }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  // Evolution API v2.3+ returns paginated: { messages: { records: [...] } }
  const messages = Array.isArray(data) ? data
    : data?.messages?.records || data?.messages || data?.data || [];
  return Array.isArray(messages) ? messages[0] || null : null;
}

// Delete a message for everyone
export async function deleteForEveryone(
  instanceName: string,
  key: { remoteJid: string; fromMe: boolean; id: string; participant?: string },
) {
  const res = await apiFetch(`${BASE}/chat/deleteMessageForEveryone/${instanceName}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(key),
  });
  return res.json();
}

// Mark messages as read
export async function markAsRead(instanceName: string, keys: Array<{ remoteJid: string; fromMe: boolean; id: string }>) {
  const res = await apiFetch(`${BASE}/chat/markMessageAsRead/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      readMessages: keys.map(k => ({
        remoteJid: k.remoteJid,
        fromMe: k.fromMe,
        id: k.id,
      })),
    }),
  });
  return res.json();
}

// Send a reaction emoji to a message
export async function sendReaction(
  instanceName: string,
  key: { remoteJid: string; fromMe: boolean; id: string },
  reaction: string,
) {
  const res = await apiFetch(`${BASE}/message/sendReaction/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, reaction }),
  });
  return res.ok ? await safeJson(res) : null;
}

// Update profile status/bio text
export async function updateProfileStatus(instanceName: string, status: string) {
  const res = await apiFetch(`${BASE}/chat/updateProfileStatus/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status }),
  });
  return res.json();
}

// Update profile picture (base64 image)
export async function updateProfilePicture(instanceName: string, pictureBase64: string) {
  const res = await apiFetch(`${BASE}/chat/updateProfilePicture/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ picture: pictureBase64 }),
  });
  return res.json();
}

// Fetch profile picture URL for a number
export async function fetchProfilePictureUrl(instanceName: string, number: string) {
  const cleanNumber = number.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '') || number;
  const res = await apiFetch(`${BASE}/chat/fetchProfilePictureUrl/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: cleanNumber }),
  });
  return res.json();
}

// Fetch full profile (name, about/status, picture) for a number
export async function fetchProfile(instanceName: string, number: string) {
  const cleanNumber = number.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '') || number;
  const res = await apiFetch(`${BASE}/chat/fetchProfile/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: cleanNumber }),
  });
  return res.json();
}

// Check if a number is on WhatsApp
export async function checkOnWhatsApp(instanceName: string, numbers: string[]) {
  const cleanNumbers = numbers.map(n => n.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, ''));
  const res = await apiFetch(`${BASE}/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ numbers: cleanNumbers }),
  });
  return res.json();
}

// Send presence update (composing, paused, available, unavailable)
export async function sendPresence(instanceName: string, jid: string, presence: string) {
  // Strip JID suffix - Evolution API expects plain number
  const number = jid.replace(/@s\.whatsapp\.net$|@g\.us$/g, '') || jid;
  const res = await apiFetch(`${BASE}/chat/sendPresence/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number, presence, delay: 0 }),
  });
  return res.json();
}

// Keep-alive: ping Evolution API to prevent instance auto-deletion.
// Also detects disconnected instances and triggers reconnection.
let keepAliveHandle: NodeJS.Timeout | null = null;
const trackedInstances = new Set<string>();

// Callback invoked when keep-alive detects a disconnected instance.
// Set by BotManager to trigger reconnection without circular imports.
let onDisconnectDetected: ((instanceName: string, state: string) => void) | null = null;

export function setKeepAliveDisconnectHandler(handler: (instanceName: string, state: string) => void): void {
  onDisconnectDetected = handler;
}

// Track per-instance last message activity for activity-based presence.
// Updated by the webhook handler when messages arrive.
const lastActivityTimestamp = new Map<string, number>();

export function recordMessageActivity(instanceName: string): void {
  lastActivityTimestamp.set(instanceName, Date.now());
}

export function getLastActivity(instanceName: string): number {
  return lastActivityTimestamp.get(instanceName) || 0;
}

export function trackInstance(instanceName: string): void {
  trackedInstances.add(instanceName);
  ensureKeepAlive();
}

export function untrackInstance(instanceName: string): void {
  trackedInstances.delete(instanceName);
  lastActivityTimestamp.delete(instanceName);
  instanceOwnerCache.delete(instanceName);
  if (trackedInstances.size === 0 && keepAliveHandle) {
    clearInterval(keepAliveHandle);
    keepAliveHandle = null;
  }
}

/** Disable proxy on all currently tracked instances (used during proxy pool fallback). */
function disableProxiesOnAllInstances(): void {
  if (trackedInstances.size === 0) return;
  console.log(`[PROXY] Disabling proxy on ${trackedInstances.size} tracked instance(s)...`);
  for (const name of trackedInstances) {
    disableInstanceProxy(name).catch(err => {
      console.warn(`[PROXY] Failed to disable proxy on ${name}:`, err);
    });
  }
}

// Grace period tracking for 'unknown' state - Evolution API may still be
// loading instances after restart. Don't panic until several consecutive unknowns.
const unknownGraceCounts = new Map<string, number>();
const UNKNOWN_GRACE_THRESHOLD = 5; // 5 × 60s = 5 min grace period

// WhatsApp presence heartbeat interval - sends a presence update to WhatsApp
// (not just polling Evolution API) to keep WhatsApp's activity tracker fresh
// and prevent the 14-day inactivity unlink.
const PRESENCE_HEARTBEAT_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
let presenceHeartbeatHandle: NodeJS.Timeout | null = null;

// Cache ownerJid per instance for presence heartbeat (avoids extra API calls)
const instanceOwnerCache = new Map<string, string>();

export function setInstanceOwner(instanceName: string, ownerJid: string): void {
  instanceOwnerCache.set(instanceName, ownerJid);
}

function ensurePresenceHeartbeat(): void {
  if (presenceHeartbeatHandle) return;
  presenceHeartbeatHandle = setInterval(async () => {
    for (const name of trackedInstances) {
      try {
        // Evolution API requires `number` and `delay` fields - omitting them
        // causes 400 errors. Use cached ownerJid to get the number.
        const ownerJid = instanceOwnerCache.get(name);
        if (!ownerJid) {
          // No owner cached - skip this instance silently
          continue;
        }
        const number = ownerJid.replace(/@s\.whatsapp\.net$|@g\.us$/g, '');
        if (!number) continue;

        await apiFetch(`${BASE}/chat/sendPresence/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ number, presence: 'available', delay: 0 }),
        });
        // Brief delay then go offline - mimics a real user checking their phone
        setTimeout(async () => {
          try {
            await apiFetch(`${BASE}/chat/sendPresence/${name}`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ number, presence: 'unavailable', delay: 0 }),
            });
          } catch { /* non-critical */ }
        }, 5000 + Math.random() * 5000);
        console.log(`[EVO-CLIENT] presence heartbeat sent for ${name}`);
      } catch (err) {
        console.warn(`[EVO-CLIENT] presence heartbeat failed for ${name}:`, err);
      }
      // Stagger between instances to avoid burst
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    }
  }, PRESENCE_HEARTBEAT_INTERVAL);
}

function ensureKeepAlive(): void {
  if (keepAliveHandle) return;
  console.log(`[EVO-CLIENT] Starting keep-alive loop for ${trackedInstances.size} instance(s), interval=${KEEPALIVE_INTERVAL / 1000}s`);

  // Also start the presence heartbeat loop for WhatsApp activity tracking
  ensurePresenceHeartbeat();

  keepAliveHandle = setInterval(async () => {
    for (const name of trackedInstances) {
      try {
        const res = await apiFetch(`${BASE}/instance/connectionState/${name}`, {
          method: 'GET',
          headers,
        });
        const data: any = await res.json();
        const state = data?.instance?.state || 'unknown';
        console.log(`[EVO-CLIENT] keep-alive ping ${name}: state=${state}`);

        // Handle 'unknown' state with grace period - Evolution API may still
        // be loading instances after restart. Don't trigger reconnection.
        if (state === 'unknown') {
          const count = (unknownGraceCounts.get(name) || 0) + 1;
          unknownGraceCounts.set(name, count);
          if (count <= UNKNOWN_GRACE_THRESHOLD) {
            console.log(`[EVO-CLIENT] keep-alive: ${name} is unknown (${count}/${UNKNOWN_GRACE_THRESHOLD} grace) - waiting for Evolution API to load`);
            continue;
          }
          console.warn(`[EVO-CLIENT] keep-alive: ${name} exceeded unknown grace threshold - treating as disconnected`);
        } else {
          unknownGraceCounts.delete(name);
        }

        // Notify BotManager when a tracked instance is disconnected so it can
        // trigger reconnection immediately instead of waiting for the 5s poll.
        if ((state === 'close' || state === 'refused') && onDisconnectDetected) {
          console.log(`[EVO-CLIENT] keep-alive detected ${name} is ${state} - notifying BotManager for reconnection`);
          onDisconnectDetected(name, state);
        }

        // If instance is 'close', attempt to reconnect it directly via the
        // Evolution API connect endpoint. This is the keep-alive's primary
        // purpose: ensure sessions stay connected even if the poll loop
        // hasn't detected the disconnect yet.
        if (state === 'close') {
          // Skip auto-reconnect during 428 cooldown to avoid triggering more rate limits
          if (is428CooldownActive()) {
            console.log(`[EVO-CLIENT] keep-alive: SKIPPING auto-reconnect for ${name} - 428 cooldown active (${get428CooldownRemaining()}s remaining)`);
          } else {
            console.log(`[EVO-CLIENT] keep-alive: attempting auto-reconnect for ${name}...`);
            try {
              const connectRes = await apiFetch(`${BASE}/instance/connect/${name}`, {
                method: 'GET',
                headers,
              });
              const connectData: any = await connectRes.json();
              const newState = connectData?.instance?.state || connectData?.state || 'unknown';
              console.log(`[EVO-CLIENT] keep-alive: reconnect attempt for ${name} -> ${newState}`);
            } catch (connectErr) {
              console.warn(`[EVO-CLIENT] keep-alive: reconnect attempt failed for ${name}:`, connectErr);
            }
          }
        }
      } catch (err) {
        console.warn(`[EVO-CLIENT] keep-alive ping ${name} failed:`, err);
      }
    }
  }, KEEPALIVE_INTERVAL);
}

// Download media from a message via Evolution API's getBase64FromMediaMessage endpoint.
// This is more reliable than direct CDN download because Evolution API uses the
// active Baileys client to decrypt and fetch the media.
// `fullMessage` must be the full WhatsApp message with both `key` and `message` properties.
export async function getBase64FromMediaMessage(instanceName: string, fullMessage: Record<string, unknown>): Promise<Buffer | null> {
  try {
    const res = await apiFetch(`${BASE}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: fullMessage }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.base64) return Buffer.from(data.base64, 'base64');
    return null;
  } catch (err) {
    console.error(`[EVO-CLIENT] getBase64FromMediaMessage failed for ${instanceName}:`, err);
    return null;
  }
}

// Fetch group metadata (info + participants) via Evolution API
export async function fetchGroupInfo(instanceName: string, groupJid: string) {
  const jid = groupJid.includes('@') ? groupJid : `${groupJid}@g.us`;
  try {
    const res = await apiFetch(`${BASE}/group/findGroupInfos/${instanceName}?groupJid=${jid}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[EVO-CLIENT] fetchGroupInfo ${instanceName} ${jid} failed:`, err);
    return null;
  }
}

/**
 * Verify that Evolution API has data persistence enabled.
 * Queries the fetchInstances endpoint and checks if instances survive.
 * Called on startup to warn operators if sessions will be lost on redeploy.
 */
export async function verifyEvolutionDataPersistence(): Promise<{ persisted: boolean; instanceCount: number }> {
  if (!BASE) return { persisted: false, instanceCount: 0 };
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances`, {
      method: 'GET',
      headers,
      skipHealthCount: true,
    });
    if (!res.ok) return { persisted: false, instanceCount: 0 };
    const data: any = await res.json();
    const instances = Array.isArray(data) ? data : [];
    // If Evolution API returned instances, it means DATABASE_SAVE_DATA_INSTANCE=true
    // is working (instances survived the last restart).
    return { persisted: instances.length > 0, instanceCount: instances.length };
  } catch {
    return { persisted: false, instanceCount: 0 };
  }
}

/**
 * Fetch all instance names currently known to Evolution API.
 * Used for startup state reconciliation: compare DB-active sessions against
 * what Evolution API actually has, and mark orphaned DB sessions accordingly.
 */
export async function fetchAllEvolutionInstances(): Promise<Set<string>> {
  if (!BASE) return new Set();
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances`, {
      method: 'GET',
      headers,
      skipHealthCount: true,
    });
    if (!res.ok) return new Set();
    const data: any = await res.json();
    const instances = Array.isArray(data) ? data : [];
    const names = new Set<string>();
    for (const inst of instances) {
      const name = inst?.instance?.instanceName || inst?.name || inst?.instanceName;
      if (name) names.add(name);
    }
    console.log(`[EVO-CLIENT] fetchAllEvolutionInstances: ${names.size} instance(s) found`);
    return names;
  } catch (err) {
    console.warn('[EVO-CLIENT] fetchAllEvolutionInstances failed:', err);
    return new Set();
  }
}

// ─── Socket.io WebSocket Client ───────────────────────────────────────────────
// Connects to Evolution API's socket.io server for real-time event delivery.
// This provides ~10ms disconnect detection vs 60s HTTP polling - the fastest
// detection layer in the 4-layer system.
//
// Requires on Evolution API:
//   WEBSOCKET_ENABLED=true
//   WEBSOCKET_GLOBAL_EVENTS=true
//   WEBSOCKET_ALLOWED_HOSTS=*

let evoSocketClient: ReturnType<typeof import('socket.io-client').io> | null = null;
let evoSocketReconnectTimer: NodeJS.Timeout | null = null;

export function startEvolutionWebSocket(): void {
  if (!BASE) return;
  if (evoSocketClient) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { io } = require('socket.io-client') as typeof import('socket.io-client');

    const wsUrl = BASE.replace(/\/+$/, '');
    console.log(`[EVO-WS] Connecting to Evolution API WebSocket at ${wsUrl}...`);

    evoSocketClient = io(wsUrl, {
      query: { apikey: KEY },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    evoSocketClient.on('connect', () => {
      console.log('[EVO-WS] Connected to Evolution API WebSocket (real-time events active)');
      if (evoSocketReconnectTimer) {
        clearTimeout(evoSocketReconnectTimer);
        evoSocketReconnectTimer = null;
      }
    });

    evoSocketClient.on('disconnect', (reason: string) => {
      console.warn(`[EVO-WS] Disconnected from Evolution API WebSocket: ${reason}`);
    });

    evoSocketClient.on('connect_error', (err: Error) => {
      console.warn(`[EVO-WS] Connection error: ${err.message} - will retry automatically`);
    });

    // Catch parse errors from malformed WebSocket frames.
    // Evolution API sometimes sends non-JSON payloads (HTML error pages,
    // partial frames during restarts) that crash the socket.io parser.
    // This handler prevents those from killing the connection entirely.
    evoSocketClient.on('error', (err: Error) => {
      const msg = err.message || String(err);
      if (msg.includes('parse') || msg.includes('SyntaxError') || msg.includes('Unexpected token')) {
        console.warn(`[EVO-WS] Parse error (non-fatal, ignoring): ${msg}`);
      } else {
        console.error(`[EVO-WS] Socket error: ${msg}`);
      }
    });

    // Listen for connection.update events - instant disconnect detection + 428 cooldown
    evoSocketClient.on('connection.update', (msg: Record<string, unknown>) => {
      const instanceName = msg.instance as string;
      const data = msg.data as Record<string, unknown> | undefined;
      const state = data?.state as string | undefined;
      const statusCode = (data?.statusCode || data?.disconnectionReasonCode) as number | undefined;
      if (!instanceName || !state) return;

      if (!trackedInstances.has(instanceName)) return;

      console.log(`[EVO-WS] connection.update for ${instanceName}: state=${state} statusCode=${statusCode || 'none'}`);

      // Detect 428 (WhatsApp rate limit) - trigger global cooldown
      if (statusCode === 428) {
        trigger428Cooldown(`WebSocket connection.update for ${instanceName}`);
      }

      if ((state === 'close' || state === 'refused') && onDisconnectDetected) {
        console.log(`[EVO-WS] INSTANT disconnect detected for ${instanceName} via WebSocket - notifying BotManager`);
        onDisconnectDetected(instanceName, state);
      }
    });

    // Listen for messages.upsert - track activity for deaf session detection
    evoSocketClient.on('messages.upsert', (msg: Record<string, unknown>) => {
      const instanceName = msg.instance as string;
      if (instanceName && trackedInstances.has(instanceName)) {
        recordMessageActivity(instanceName);
      }
    });

  } catch (err) {
    console.warn('[EVO-WS] Failed to initialize socket.io client (non-fatal, falling back to HTTP polling):', err);
  }
}

export function stopEvolutionWebSocket(): void {
  if (evoSocketClient) {
    evoSocketClient.disconnect();
    evoSocketClient = null;
  }
  if (evoSocketReconnectTimer) {
    clearTimeout(evoSocketReconnectTimer);
    evoSocketReconnectTimer = null;
  }
}

// Fetch instance info (includes user JID)
export async function fetchInstanceInfo(instanceName: string) {
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    const instance = Array.isArray(data) ? data[0] : data;
    console.log(`[EVO-CLIENT] fetchInstanceInfo ${instanceName}: found=${!!instance} state=${instance?.instance?.state || 'unknown'}`);
    return instance;
  } catch (err) {
    console.warn(`[EVO-CLIENT] fetchInstanceInfo ${instanceName} failed:`, err);
    return null;
  }
}
