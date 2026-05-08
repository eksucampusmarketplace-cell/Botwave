/**
 * Circuit Breaker + Resilience Layer for Supabase.
 *
 * Prevents the bot from hammering Supabase when it's throttled (522/504),
 * which creates a vicious cycle of retries making throttling worse.
 *
 * States:
 *   CLOSED  = normal operation, requests go through
 *   OPEN    = Supabase is down, block all requests, serve from stale cache
 *   HALF    = tentatively allow one request to test recovery
 *
 * Also provides:
 *   - Stale cache: serves last-known-good data when circuit is open
 *   - Request deduplication: collapses concurrent identical reads into one query
 *   - Exponential backoff wrapper for write retries
 */

import { markRecovery } from './adaptivePoller';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const FAILURE_THRESHOLD = 5;       // consecutive failures before opening
const RECOVERY_TIMEOUT_MS = 30_000; // wait 30s before trying again
const HALF_OPEN_MAX = 1;           // allow 1 probe request in half-open

let state: CircuitState = 'CLOSED';
let consecutiveFailures = 0;
let lastFailureTime = 0;
let halfOpenInFlight = 0;

// Stats for logging
let totalBlocked = 0;
let totalFallbacks = 0;

export function getCircuitState(): CircuitState {
  if (state === 'OPEN') {
    if (Date.now() - lastFailureTime >= RECOVERY_TIMEOUT_MS) {
      state = 'HALF_OPEN';
      halfOpenInFlight = 0;
      console.log('[CIRCUIT] Transitioning OPEN -> HALF_OPEN (testing recovery)');
    }
  }
  return state;
}

export function isCircuitOpen(): boolean {
  return getCircuitState() === 'OPEN';
}

export function recordSuccess(): void {
  if (state === 'HALF_OPEN') {
    console.log(`[CIRCUIT] Recovery confirmed — HALF_OPEN -> CLOSED (blocked ${totalBlocked} requests during outage, served ${totalFallbacks} from stale cache)`);
    totalBlocked = 0;
    totalFallbacks = 0;
    markRecovery();
  }
  state = 'CLOSED';
  consecutiveFailures = 0;
  halfOpenInFlight = 0;
}

export function recordFailure(error?: unknown): void {
  consecutiveFailures++;
  lastFailureTime = Date.now();

  if (state === 'HALF_OPEN') {
    state = 'OPEN';
    console.log('[CIRCUIT] Probe failed — HALF_OPEN -> OPEN (will retry in 30s)');
    return;
  }

  if (consecutiveFailures >= FAILURE_THRESHOLD && state === 'CLOSED') {
    state = 'OPEN';
    const errMsg = error instanceof Error ? error.message : String(error || '');
    console.log(`[CIRCUIT] ${consecutiveFailures} consecutive failures — CLOSED -> OPEN. Last error: ${errMsg.slice(0, 200)}`);
  }
}

function canAttemptRequest(): boolean {
  const s = getCircuitState();
  if (s === 'CLOSED') return true;
  if (s === 'HALF_OPEN' && halfOpenInFlight < HALF_OPEN_MAX) {
    halfOpenInFlight++;
    return true;
  }
  totalBlocked++;
  return false;
}

function isSupabaseError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('522') ||
    msg.includes('504') ||
    msg.includes('502') ||
    msg.includes('timed out') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('AuthRetryableFetchError')
  );
}

// ─── Stale Cache ──────────────────────────────────────────────────────────────
// Stores last-known-good values with no expiry. Used as fallback when circuit
// is open or Supabase returns an error.

const staleCache = new Map<string, { value: unknown; storedAt: number }>();
const STALE_MAX_AGE_MS = 10 * 60_000; // serve stale data up to 10 minutes old

export function setStaleCache(key: string, value: unknown): void {
  staleCache.set(key, { value, storedAt: Date.now() });
}

export function getStaleCache<T>(key: string): T | undefined {
  const entry = staleCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > STALE_MAX_AGE_MS) {
    staleCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function invalidateStaleCache(prefix: string): void {
  for (const key of staleCache.keys()) {
    if (key.startsWith(prefix)) staleCache.delete(key);
  }
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of staleCache.entries()) {
    if (now - entry.storedAt > STALE_MAX_AGE_MS) {
      staleCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[CIRCUIT] Cleaned ${cleaned} expired stale cache entries (${staleCache.size} remaining)`);
  }
}, 5 * 60_000);

// ─── Request Deduplication ────────────────────────────────────────────────────
// If multiple callers request the same key simultaneously, only one Supabase
// query fires. The rest await the same promise.

const inflightRequests = new Map<string, Promise<unknown>>();

// ─── Resilient Query Wrapper ──────────────────────────────────────────────────

export interface ResilientReadOptions<T> {
  cacheKey: string;
  queryFn: () => Promise<T>;
  fallbackValue: T;
}

/**
 * Execute a Supabase read with circuit breaker, dedup, and stale fallback.
 *
 * 1. If circuit is OPEN, immediately return stale cache or fallback
 * 2. Deduplicate concurrent identical reads
 * 3. On success: record success, update stale cache
 * 4. On failure: record failure, return stale cache or fallback
 */
export async function resilientRead<T>(opts: ResilientReadOptions<T>): Promise<T> {
  const { cacheKey, queryFn, fallbackValue } = opts;

  // Circuit open — don't even try
  if (!canAttemptRequest()) {
    const stale = getStaleCache<T>(cacheKey);
    if (stale !== undefined) {
      totalFallbacks++;
      return stale;
    }
    return fallbackValue;
  }

  // Dedup: if same query is already in-flight, piggyback on it
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    try {
      return (await existing) as T;
    } catch {
      const stale = getStaleCache<T>(cacheKey);
      return stale !== undefined ? stale : fallbackValue;
    }
  }

  // Execute the query
  const promise = (async (): Promise<T> => {
    try {
      const result = await queryFn();
      recordSuccess();
      setStaleCache(cacheKey, result);
      return result;
    } catch (err) {
      if (isSupabaseError(err)) {
        recordFailure(err);
      }
      const stale = getStaleCache<T>(cacheKey);
      if (stale !== undefined) {
        totalFallbacks++;
        return stale;
      }
      return fallbackValue;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

// ─── Resilient Write Wrapper ──────────────────────────────────────────────────

export interface ResilientWriteOptions {
  writeFn: () => Promise<void>;
  maxRetries?: number;
  label?: string;
}

/**
 * Execute a Supabase write with exponential backoff.
 * Non-critical writes (logging, tracking) should use maxRetries=1.
 * Critical writes (state changes) should use maxRetries=3.
 */
export async function resilientWrite(opts: ResilientWriteOptions): Promise<boolean> {
  const { writeFn, maxRetries = 2, label = 'write' } = opts;

  // If circuit is open, skip non-critical writes entirely
  if (isCircuitOpen()) {
    console.log(`[CIRCUIT] Skipping ${label} — circuit is OPEN`);
    return false;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await writeFn();
      recordSuccess();
      return true;
    } catch (err) {
      if (isSupabaseError(err)) {
        recordFailure(err);
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`[CIRCUIT] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          console.error(`[CIRCUIT] ${label} failed after ${maxRetries + 1} attempts — giving up`);
        }
      } else {
        // Non-Supabase error (e.g. validation) — don't retry
        console.error(`[CIRCUIT] ${label} non-retriable error:`, err);
        return false;
      }
    }
  }
  return false;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getCircuitStats() {
  return {
    state: getCircuitState(),
    consecutiveFailures,
    totalBlocked,
    totalFallbacks,
    staleCacheSize: staleCache.size,
    inflightRequests: inflightRequests.size,
    lastFailureAge: lastFailureTime ? Math.round((Date.now() - lastFailureTime) / 1000) : null,
  };
}
