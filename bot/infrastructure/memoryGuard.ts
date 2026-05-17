/**
 * Memory Guard — Prevents memory leaks in long-running Node.js processes.
 *
 * Problem: In-memory Maps used for rate limiting, dedup, cooldowns, and caching
 * grow unbounded over time. A bot running for days/weeks accumulates thousands
 * of stale entries, consuming RAM that Render's free tier (512MB) can't spare.
 *
 * Solution: Periodic sweep of all registered Maps. Entries older than their TTL
 * are evicted. Also monitors RSS memory and logs warnings when usage is high.
 *
 * Usage:
 *   import { trackMap, startMemoryGuard, stopMemoryGuard } from './memoryGuard';
 *   trackMap('userRateLimit', myMap, 60_000); // evict entries older than 60s
 *   startMemoryGuard(); // runs every 5 minutes
 */

interface TrackedMap {
  name: string;
  map: Map<string, unknown>;
  maxAgeMs: number;
  /** Extract timestamp from the value. Defaults to checking .lastTime, .timestamp, .expiresAt, or treating number values as timestamps. */
  getTimestamp?: (value: unknown) => number | null;
}

const trackedMaps: TrackedMap[] = [];
let guardHandle: NodeJS.Timeout | null = null;

const SWEEP_INTERVAL_MS = 5 * 60_000; // every 5 minutes
const MEMORY_WARN_MB = 400; // warn when RSS exceeds this (Render free = 512MB)

/**
 * Register a Map for periodic cleanup.
 *
 * @param name - Human-readable label for logging
 * @param map - The Map instance to sweep
 * @param maxAgeMs - Evict entries older than this (milliseconds)
 * @param getTimestamp - Optional function to extract a timestamp from the value
 */
export function trackMap(
  name: string,
  map: Map<string, unknown>,
  maxAgeMs: number,
  getTimestamp?: (value: unknown) => number | null,
): void {
  trackedMaps.push({ name, map, maxAgeMs, getTimestamp });
}

/** Default timestamp extractor — handles common patterns in the codebase. */
function defaultGetTimestamp(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
    return value[value.length - 1]; // last timestamp in array
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.lastTime === 'number') return obj.lastTime;
    if (typeof obj.timestamp === 'number') return obj.timestamp;
    if (typeof obj.expiresAt === 'number') return obj.expiresAt;
    if (typeof obj.storedAt === 'number') return obj.storedAt;
  }
  return null;
}

/** Run one sweep cycle across all tracked maps. */
function sweep(): void {
  const now = Date.now();
  let totalEvicted = 0;
  const details: string[] = [];

  for (const tracked of trackedMaps) {
    const before = tracked.map.size;
    if (before === 0) continue;

    const extractor = tracked.getTimestamp || defaultGetTimestamp;
    for (const [key, value] of tracked.map.entries()) {
      const ts = extractor(value);
      if (ts !== null && now - ts > tracked.maxAgeMs) {
        tracked.map.delete(key);
      }
    }

    const evicted = before - tracked.map.size;
    if (evicted > 0) {
      totalEvicted += evicted;
      details.push(`${tracked.name}:-${evicted}(${tracked.map.size} left)`);
    }
  }

  if (totalEvicted > 0) {
    console.log(`[MEMORY] Swept ${totalEvicted} stale entries: ${details.join(', ')}`);
  }

  // Memory usage check
  const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  if (rssMB > MEMORY_WARN_MB) {
    console.warn(`[MEMORY] HIGH RSS: ${rssMB}MB (heap: ${heapMB}MB) — approaching Render 512MB limit`);
  }
}

/** Start the periodic memory guard. Returns the interval handle. */
export function startMemoryGuard(): NodeJS.Timeout {
  if (guardHandle) return guardHandle;
  guardHandle = setInterval(sweep, SWEEP_INTERVAL_MS);
  console.log(`[MEMORY] Guard started — sweeping ${trackedMaps.length} map(s) every ${SWEEP_INTERVAL_MS / 1000}s`);
  return guardHandle;
}

/** Stop the memory guard. */
export function stopMemoryGuard(): void {
  if (guardHandle) {
    clearInterval(guardHandle);
    guardHandle = null;
  }
}

/** Get current memory stats for health endpoints. */
export function getMemoryStats(): {
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  trackedMaps: Array<{ name: string; size: number; maxAgeMs: number }>;
} {
  const mem = process.memoryUsage();
  return {
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    trackedMaps: trackedMaps.map(t => ({
      name: t.name,
      size: t.map.size,
      maxAgeMs: t.maxAgeMs,
    })),
  };
}
