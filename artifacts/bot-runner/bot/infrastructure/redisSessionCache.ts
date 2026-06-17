/**
 * Redis Session Cache - Caches session and QR data in Redis.
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

const SESSION_TTL = 60; // 60 seconds — reduces Supabase load; invalidated explicitly on state changes
const QR_TTL = 10; // 10 seconds — reduced to prevent stale QR display during pairing

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
    // Non-critical - fall back to Supabase
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

const PAIRING_LOCK_TTL = 180; // 3 minutes - matches pairing code TTL

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

const USER_ID_TTL = 300; // 5 minutes - user_id never changes for a session

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

const EXISTS_TTL = 60; // 1 minute - short TTL for existence checks

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

// ─── Generic JSON Cache (settings, features, auto-replies, AFK, etc.) ───────

const SETTINGS_TTL = 300;     // 5 min - settings rarely change
const FEATURE_TTL = 300;      // 5 min - feature toggles rarely change
const AUTO_REPLY_TTL = 300;   // 5 min - auto-reply rules rarely change
const AFK_TTL = 60;           // 1 min - AFK can change frequently
const SUBSCRIPTION_TTL = 300; // 5 min - subscriptions rarely change
const LEADERBOARD_TTL = 120;  // 2 min - leaderboard changes per message

export async function cacheJSON(key: string, data: unknown, ttl: number): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`bw:${key}`, JSON.stringify(data), 'EX', ttl);
  } catch {
    // Non-critical
  }
}

export async function getCachedJSON<T = unknown>(key: string): Promise<T | null> {
  if (!isAvailable()) return null;
  try {
    const raw = await redis!.get(`bw:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function invalidateRedisKey(key: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.del(`bw:${key}`);
  } catch {
    // Non-critical
  }
}

export async function invalidateRedisPattern(pattern: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    const keys = await redis!.keys(`bw:${pattern}`);
    if (keys.length > 0) {
      await redis!.del(...keys);
    }
  } catch {
    // Non-critical
  }
}

// Convenience wrappers with correct TTLs
export async function cacheSettings(userId: string, data: unknown): Promise<void> {
  await cacheJSON(`settings:${userId}`, data, SETTINGS_TTL);
}
export async function getCachedSettings<T = unknown>(userId: string): Promise<T | null> {
  return getCachedJSON<T>(`settings:${userId}`);
}

export async function cacheFeature(userId: string, featureName: string, enabled: boolean): Promise<void> {
  await cacheJSON(`feature:${userId}:${featureName}`, enabled, FEATURE_TTL);
}
export async function getCachedFeature(userId: string, featureName: string): Promise<boolean | null> {
  return getCachedJSON<boolean>(`feature:${userId}:${featureName}`);
}

export async function cacheAutoReplies(sessionId: string, data: unknown[]): Promise<void> {
  await cacheJSON(`autoreplies:${sessionId}`, data, AUTO_REPLY_TTL);
}
export async function getCachedAutoReplies<T = unknown>(sessionId: string): Promise<T[] | null> {
  return getCachedJSON<T[]>(`autoreplies:${sessionId}`);
}

export async function cacheAfkState(sessionId: string, userJid: string, data: unknown): Promise<void> {
  await cacheJSON(`afk:${sessionId}:${userJid}`, data, AFK_TTL);
}
export async function getCachedAfkState<T = unknown>(sessionId: string, userJid: string): Promise<T | null> {
  return getCachedJSON<T>(`afk:${sessionId}:${userJid}`);
}

export async function cacheSubscription(userId: string, data: unknown): Promise<void> {
  await cacheJSON(`sub:${userId}`, data, SUBSCRIPTION_TTL);
}
export async function getCachedSubscription<T = unknown>(userId: string): Promise<T | null> {
  return getCachedJSON<T>(`sub:${userId}`);
}

export async function cacheLeaderboard(sessionId: string, limit: number, data: unknown[]): Promise<void> {
  await cacheJSON(`lb:${sessionId}:${limit}`, data, LEADERBOARD_TTL);
}
export async function getCachedLeaderboard<T = unknown>(sessionId: string, limit: number): Promise<T[] | null> {
  return getCachedJSON<T[]>(`lb:${sessionId}:${limit}`);
}

// ─── Leaderboard Write Buffer ───────────────────────────────────────────────
// Instead of hitting Supabase with a read+write on every group message,
// buffer increments in Redis (HINCRBY) and flush periodically.

export async function bufferLeaderboardIncrement(
  sessionId: string, userJid: string, userName: string,
): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    const countKey = `lbbuf:count:${sessionId}`;
    const nameKey = `lbbuf:name:${sessionId}`;
    const pipeline = redis!.pipeline();
    pipeline.hincrby(countKey, userJid, 1);
    pipeline.hset(nameKey, userJid, userName);
    pipeline.expire(countKey, 600);
    pipeline.expire(nameKey, 600);
    await pipeline.exec();
    return true;
  } catch {
    return false;
  }
}

export async function drainLeaderboardBuffer(
  sessionId: string,
): Promise<Array<{ userJid: string; userName: string; increment: number }> | null> {
  if (!isAvailable()) return null;
  try {
    const countKey = `lbbuf:count:${sessionId}`;
    const nameKey = `lbbuf:name:${sessionId}`;
    const counts = await redis!.hgetall(countKey);
    if (!counts || Object.keys(counts).length === 0) return null;
    const names = await redis!.hgetall(nameKey);
    const pipeline = redis!.pipeline();
    pipeline.del(countKey);
    pipeline.del(nameKey);
    await pipeline.exec();
    return Object.entries(counts).map(([userJid, count]) => ({
      userJid,
      userName: names[userJid] || userJid.split('@')[0],
      increment: parseInt(count, 10) || 1,
    }));
  } catch {
    return null;
  }
}

export async function getBufferedSessionIds(): Promise<string[]> {
  if (!isAvailable()) return [];
  try {
    const keys = await redis!.keys('lbbuf:count:*');
    return keys.map((k) => k.replace('lbbuf:count:', ''));
  } catch {
    return [];
  }
}

// ─── Message Tracking Buffer ────────────────────────────────────────────────
// Instead of INSERT per message, queue in Redis list, bulk-insert periodically.

interface BufferedMessage {
  session_id: string;
  sender_jid: string;
  sender_name: string | null;
  content: string | null;
  message_type: string;
  is_group: boolean;
  group_jid: string | null;
  timestamp: string;
}

export async function bufferTrackMessage(msg: BufferedMessage): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    await redis!.rpush('msgbuf', JSON.stringify(msg));
    await redis!.expire('msgbuf', 600);
    return true;
  } catch {
    return false;
  }
}

export async function drainMessageBuffer(batchSize: number = 50): Promise<BufferedMessage[]> {
  if (!isAvailable()) return [];
  try {
    const items: BufferedMessage[] = [];
    for (let i = 0; i < batchSize; i++) {
      const raw = await redis!.lpop('msgbuf');
      if (!raw) break;
      items.push(JSON.parse(raw));
    }
    return items;
  } catch {
    return [];
  }
}

// Export TTL constants for use in database.ts
export { SETTINGS_TTL, FEATURE_TTL, AUTO_REPLY_TTL, AFK_TTL, SUBSCRIPTION_TTL, LEADERBOARD_TTL };

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
