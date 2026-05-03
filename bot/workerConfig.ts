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
