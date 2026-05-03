export const SELF_URL = process.env.SELF_URL || '';
export const IS_WORKER = process.env.IS_WORKER === 'true';
export const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

export const WORKER_URLS = (process.env.WORKER_URLS || '')
  .split(',').map(u => u.trim()).filter(Boolean);

let counter = 0;

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
