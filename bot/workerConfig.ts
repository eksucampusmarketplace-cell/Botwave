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
 * Pings each candidate worker and returns the first healthy one.
 * Falls back to null (main service handles it) if no workers respond.
 */
export async function assignWorkerAsync(): Promise<string | null> {
  if (!WORKER_URLS.length) return null;

  for (let i = 0; i < WORKER_URLS.length; i++) {
    const url = WORKER_URLS[(counter + i) % WORKER_URLS.length];
    if (await isWorkerHealthy(url)) {
      counter = counter + i + 1;
      return url;
    }
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
  if (WORKER_URLS.length === 0) return null;

  // Filter out the current worker so we always switch to a different IP
  const others = WORKER_URLS.filter(url => url !== currentWorkerUrl);
  if (others.length === 0) return null; // only one worker, can't switch

  // Pick the next one round-robin from the remaining workers
  return others[counter++ % others.length];
}
