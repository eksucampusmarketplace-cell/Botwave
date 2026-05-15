import { getPairingCountsByWorker } from './database';

export const SELF_URL = process.env.SELF_URL || '';
export const IS_WORKER = process.env.IS_WORKER === 'true';
export const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

export const WORKER_URLS = (process.env.WORKER_URLS || '')
  .split(',').map(u => u.trim()).filter(Boolean);

let counter = 0;

// Log worker config at startup
if (IS_WORKER) {
  console.log(`[WORKER-CONFIG] Running as WORKER | SELF_URL=${SELF_URL}`);
} else if (WORKER_URLS.length > 0) {
  console.log(`[WORKER-CONFIG] Running as MAIN | ${WORKER_URLS.length} workers configured:`);
  WORKER_URLS.forEach((url, i) => {
    console.log(`[WORKER-CONFIG]   Worker #${i + 1}: ${url}`);
  });
} else {
  console.log('[WORKER-CONFIG] Running as STANDALONE (no workers configured)');
}

const HEALTH_CHECK_TIMEOUT = 5_000;

// ─── Worker Health Cache ─────────────────────────────────────────────────────
// Cache health check results so we don't hammer dead workers every 5s sync cycle.
// Healthy results cached for 30s, unhealthy for 60s (backoff for dead workers).
const workerHealthCache = new Map<string, { healthy: boolean; checkedAt: number }>();
const HEALTH_CACHE_TTL_HEALTHY = 30_000;  // 30s
const HEALTH_CACHE_TTL_UNHEALTHY = 60_000; // 60s — don't spam dead workers

// Track consecutive failures per worker. After threshold, enter extended backoff.
const workerConsecutiveFailures = new Map<string, number>();
const WORKER_EXTENDED_BACKOFF_THRESHOLD = 5; // 5 consecutive failures
const HEALTH_CACHE_TTL_EXTENDED = 5 * 60_000; // 5 min backoff after sustained failures

/** Check if all configured workers have been unreachable for a sustained period. */
export function areAllWorkersDown(): boolean {
  if (WORKER_URLS.length === 0) return true;
  return WORKER_URLS.every(url => {
    const failures = workerConsecutiveFailures.get(url) || 0;
    return failures >= WORKER_EXTENDED_BACKOFF_THRESHOLD;
  });
}

/**
 * Ping a worker URL to check if it's reachable.
 * Results are cached to avoid overwhelming dead workers with health checks.
 */
export async function isWorkerHealthy(url: string): Promise<boolean> {
  const cached = workerHealthCache.get(url);
  if (cached) {
    const failures = workerConsecutiveFailures.get(url) || 0;
    const ttl = cached.healthy
      ? HEALTH_CACHE_TTL_HEALTHY
      : (failures >= WORKER_EXTENDED_BACKOFF_THRESHOLD ? HEALTH_CACHE_TTL_EXTENDED : HEALTH_CACHE_TTL_UNHEALTHY);
    if (Date.now() - cached.checkedAt < ttl) {
      return cached.healthy;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    const healthy = res.ok;
    workerHealthCache.set(url, { healthy, checkedAt: Date.now() });
    if (healthy) {
      workerConsecutiveFailures.delete(url);
    } else {
      workerConsecutiveFailures.set(url, (workerConsecutiveFailures.get(url) || 0) + 1);
    }
    return healthy;
  } catch {
    workerHealthCache.set(url, { healthy: false, checkedAt: Date.now() });
    workerConsecutiveFailures.set(url, (workerConsecutiveFailures.get(url) || 0) + 1);
    return false;
  }
}

/**
 * Assign a worker for a new session.
 * Queries active pairing counts per worker and picks the healthy worker
 * with the fewest pairing sessions. Falls back to round-robin if DB query
 * fails. Falls back to null (main service) if no workers respond.
 */
export async function assignWorkerAsync(): Promise<string | null> {
  if (!WORKER_URLS.length) {
    console.log('[WORKER] No worker URLs configured — session will run on main service');
    return null;
  }

  console.log(`[WORKER] Checking ${WORKER_URLS.length} worker(s) for assignment...`);

  // Query DB for active pairing counts per worker
  let pairingCounts: Record<string, number> = {};
  try {
    pairingCounts = await getPairingCountsByWorker();
  } catch (err) {
    console.warn('[WORKER] Failed to query pairing counts — falling back to round-robin:', err);
  }

  // Check health of all workers in parallel
  const healthChecks = await Promise.all(
    WORKER_URLS.map(async (url) => {
      const healthy = await isWorkerHealthy(url);
      console.log(`[WORKER] Health check ${url}: ${healthy ? 'HEALTHY' : 'UNREACHABLE'} (pairing: ${pairingCounts[url] || 0})`);
      return { url, healthy };
    })
  );

  // Filter to healthy workers and sort by fewest pairing sessions
  const healthyWorkers = healthChecks
    .filter(w => w.healthy)
    .sort((a, b) => (pairingCounts[a.url] || 0) - (pairingCounts[b.url] || 0));

  if (healthyWorkers.length > 0) {
    const chosen = healthyWorkers[0].url;
    console.log(`[WORKER] Assigned session to ${chosen} (least loaded: ${pairingCounts[chosen] || 0} pairing sessions)`);
    return chosen;
  }

  console.warn('[WORKER] No healthy workers found — session will run on main service');
  counter++;
  return null;
}

/**
 * Synchronous round-robin (legacy). Prefer assignWorkerAsync for new sessions.
 */
export function assignWorker(): string | null {
  if (!WORKER_URLS.length) return null;
  return WORKER_URLS[counter++ % WORKER_URLS.length];
}

// Returns the next worker URL that is different from the current one.
// Used for failover when the current worker gets a 401.
export function getNextWorker(currentWorkerUrl: string | null): string | null {
  if (WORKER_URLS.length === 0) {
    console.log(`[WORKER] getNextWorker: no worker URLs configured`);
    return null;
  }

  // Filter out the current worker so we always switch to a different IP
  const others = WORKER_URLS.filter(url => url !== currentWorkerUrl);
  if (others.length === 0) {
    console.log(`[WORKER] getNextWorker: no other workers available (current: ${currentWorkerUrl})`);
    return null;
  }

  // Pick the next one round-robin from the remaining workers
  const next = others[counter++ % others.length];
  console.log(`[WORKER] getNextWorker: switching from ${currentWorkerUrl} to ${next}`);
  return next;
}
