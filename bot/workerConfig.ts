import { getPairingCountsByWorker } from './database';

export const SELF_URL = process.env.SELF_URL || '';
export const IS_WORKER = process.env.IS_WORKER === 'true';
export const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

export const WORKER_URLS = (process.env.WORKER_URLS || '')
  .split(',').map(u => u.trim()).filter(Boolean);

let counter = 0;

const HEALTH_CHECK_TIMEOUT = 5_000;

/**
 * Ping a worker URL to check if it's reachable.
 * Returns true if the worker responds within the timeout.
 */
export async function isWorkerHealthy(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
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
