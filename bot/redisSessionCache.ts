/**
 * Redis Session Cache — Caches session and QR data in Redis.
 *
 * Problem: Session lookups and QR code reads happen very frequently during
 * pairing flows and message handling. Each one hits Supabase directly.
 *
 * Solution: Cache session data in Redis with short TTLs. This is especially
 * useful for:
 *   - getSessionById (hot path during message handling)
 *   - Session state checks (called by every polling loop)
 *   - QR code reads (polled by the dashboard every few seconds)
 *
 * Falls back to Supabase transparently when Redis is unavailable.
 * Write-through: when session data changes, we invalidate the Redis cache
 * so the next read fetches fresh data from Supabase.
 */

import { isRedisAvailable } from './redis';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;

// Reuse the same connection pattern as redis.ts
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.connect().catch(() => { /* handled by redis.ts main instance */ });
  } catch {
    redis = null;
  }
}

const SESSION_TTL = 30; // 30 seconds — short TTL for session data
const QR_TTL = 15; // 15 seconds — QR changes frequently during pairing

function isAvailable(): boolean {
  return redis !== null && isRedisAvailable();
}

// ─── Session Cache ───────────────────────────────────────────────────────────

/**
 * Cache a session object in Redis.
 */
export async function cacheSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`sess:${sessionId}`, JSON.stringify(data), 'EX', SESSION_TTL);
  } catch {
    // Non-critical — fall back to Supabase
  }
}

/**
 * Get a cached session from Redis.
 * Returns null if not cached or Redis unavailable.
 */
export async function getCachedSession(sessionId: string): Promise<Record<string, unknown> | null> {
  if (!isAvailable()) return null;
  try {
    const raw = await redis!.get(`sess:${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Invalidate a cached session (call after writes).
 */
export async function invalidateSessionCache(sessionId: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.del(`sess:${sessionId}`);
  } catch {
    // Non-critical
  }
}

// ─── QR Code Cache ──────────────────────────────────────────────────────────

/**
 * Cache QR code data for a session.
 */
export async function cacheQRData(sessionId: string, qrData: { qr_code: string; qr_expires_at: string; pairing_code?: string }): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`qr:${sessionId}`, JSON.stringify(qrData), 'EX', QR_TTL);
  } catch {
    // Non-critical
  }
}

/**
 * Get cached QR data from Redis.
 */
export async function getCachedQRData(sessionId: string): Promise<{ qr_code: string; qr_expires_at: string; pairing_code?: string } | null> {
  if (!isAvailable()) return null;
  try {
    const raw = await redis!.get(`qr:${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Invalidate QR cache (call when new QR is generated or session becomes active).
 */
export async function invalidateQRCache(sessionId: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.del(`qr:${sessionId}`);
  } catch {
    // Non-critical
  }
}

// ─── Batch Session State Cache ──────────────────────────────────────────────

/**
 * Cache multiple session states at once (used by sync loop).
 */
export async function cacheSessionStates(sessions: Array<{ id: string; state: string; worker_url?: string | null }>): Promise<void> {
  if (!isAvailable() || sessions.length === 0) return;
  try {
    const pipeline = redis!.pipeline();
    for (const sess of sessions) {
      pipeline.set(
        `sstate:${sess.id}`,
        JSON.stringify({ state: sess.state, worker_url: sess.worker_url }),
        'EX',
        SESSION_TTL,
      );
    }
    await pipeline.exec();
  } catch {
    // Non-critical
  }
}

/**
 * Get cached session state.
 */
export async function getCachedSessionState(sessionId: string): Promise<{ state: string; worker_url: string | null } | null> {
  if (!isAvailable()) return null;
  try {
    const raw = await redis!.get(`sstate:${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Pairing Lock Cache ─────────────────────────────────────────────────────

const PAIRING_LOCK_TTL = 180; // 3 minutes — matches pairing code TTL

/**
 * Cache a pairing lock in Redis (mirrors DB pairing_lock_acquired_at).
 * Used by isWorkerPairingLocked to avoid a Supabase round-trip.
 */
export async function cachePairingLock(sessionId: string, workerUrl: string | null): Promise<void> {
  if (!isAvailable()) return;
  try {
    const key = `plock:${workerUrl || '__main__'}`;
    await redis!.set(key, sessionId, 'EX', PAIRING_LOCK_TTL);
  } catch {
    // Non-critical
  }
}

/**
 * Check if a worker has a pairing lock cached in Redis.
 * Returns the session ID if locked, null otherwise.
 */
export async function getCachedPairingLock(workerUrl: string | null): Promise<string | null> {
  if (!isAvailable()) return null;
  try {
    const key = `plock:${workerUrl || '__main__'}`;
    return await redis!.get(key);
  } catch {
    return null;
  }
}

/**
 * Clear pairing lock from Redis (call when lock is released).
 */
export async function invalidatePairingLock(workerUrl: string | null): Promise<void> {
  if (!isAvailable()) return;
  try {
    const key = `plock:${workerUrl || '__main__'}`;
    await redis!.del(key);
  } catch {
    // Non-critical
  }
}

// ─── Session User ID Cache ──────────────────────────────────────────────────

const USER_ID_TTL = 300; // 5 minutes — user_id never changes for a session

/**
 * Cache the user_id for a session in Redis.
 */
export async function cacheSessionUserId(sessionId: string, userId: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`suid:${sessionId}`, userId, 'EX', USER_ID_TTL);
  } catch {
    // Non-critical
  }
}

/**
 * Get cached user_id for a session from Redis.
 */
export async function getCachedSessionUserId(sessionId: string): Promise<string | null> {
  if (!isAvailable()) return null;
  try {
    return await redis!.get(`suid:${sessionId}`);
  } catch {
    return null;
  }
}

// ─── Session Existence Cache ────────────────────────────────────────────────

const EXISTS_TTL = 60; // 1 minute — short TTL for existence checks

/**
 * Mark a session as existing in Redis (avoids Supabase existence checks).
 */
export async function cacheSessionExists(sessionId: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`sexists:${sessionId}`, '1', 'EX', EXISTS_TTL);
  } catch {
    // Non-critical
  }
}

/**
 * Check if a session is known to exist via Redis cache.
 * Returns true if cached, false means unknown (not necessarily non-existent).
 */
export async function getCachedSessionExists(sessionId: string): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    const val = await redis!.get(`sexists:${sessionId}`);
    return val === '1';
  } catch {
    return false;
  }
}

/** Disconnect the session cache Redis client on shutdown. */
export async function disconnectSessionCache(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    redis = null;
  }
}
