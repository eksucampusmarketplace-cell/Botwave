/**
 * Optional Redis layer for high-frequency operations.
 *
 * When REDIS_URL is set, heartbeats, session locks, and keepalive pings
 * go through Redis instead of Supabase, dramatically reducing DB egress.
 * If Redis is unavailable or REDIS_URL is not set, all operations fall
 * back to Supabase transparently.
 *
 * Swap providers any time by changing the REDIS_URL env var.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let redisHealthy = false;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying after 5 attempts
        return Math.min(times * 500, 3000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      redisHealthy = true;
      console.log('[REDIS] Connected');
    });
    redis.on('error', (err) => {
      redisHealthy = false;
      console.error('[REDIS] Error:', err.message);
    });
    redis.on('close', () => {
      redisHealthy = false;
    });

    redis.connect().catch((err) => {
      console.error('[REDIS] Initial connection failed:', err.message);
      redisHealthy = false;
    });
  } catch (err: any) {
    console.error('[REDIS] Failed to create client:', err.message);
    redis = null;
  }
} else {
  console.log('[REDIS] No REDIS_URL set — using Supabase for all operations');
}

/** Whether Redis is connected and usable right now. */
export function isRedisAvailable(): boolean {
  return redis !== null && redisHealthy;
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────

/**
 * Write a heartbeat timestamp for a session to Redis.
 * Key: `hb:{sessionId}`, Value: ISO timestamp, TTL: 180s.
 */
export async function redisSetHeartbeat(sessionId: string, instanceId: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    await redis!.set(`hb:${sessionId}`, JSON.stringify({ instanceId, ts: Date.now() }), 'EX', 180);
    return true;
  } catch {
    return false;
  }
}

/**
 * Batch-write heartbeats for multiple sessions.
 */
export async function redisSetHeartbeatBatch(sessionIds: string[], instanceId: string): Promise<boolean> {
  if (!isRedisAvailable() || sessionIds.length === 0) return false;
  try {
    const pipeline = redis!.pipeline();
    const payload = JSON.stringify({ instanceId, ts: Date.now() });
    for (const sid of sessionIds) {
      pipeline.set(`hb:${sid}`, payload, 'EX', 180);
    }
    await pipeline.exec();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get heartbeat data for a session from Redis.
 */
export async function redisGetHeartbeat(sessionId: string): Promise<{ instanceId: string; ts: number } | null> {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await redis!.get(`hb:${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Session Locks ───────────────────────────────────────────────────────────

/**
 * Attempt to acquire a session lock in Redis using SET NX (atomic).
 * Key: `lock:{sessionId}`, Value: instanceId, TTL: 180s.
 * Returns true if lock acquired or already owned.
 */
export async function redisAcquireLock(sessionId: string, instanceId: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    // Try atomic set-if-not-exists
    const result = await redis!.set(`lock:${sessionId}`, instanceId, 'EX', 180, 'NX');
    if (result === 'OK') return true;

    // Check if we already own it
    const owner = await redis!.get(`lock:${sessionId}`);
    if (owner === instanceId) {
      // Refresh TTL
      await redis!.expire(`lock:${sessionId}`, 180);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Release a session lock in Redis (only if we own it).
 */
export async function redisReleaseLock(sessionId: string, instanceId: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    const owner = await redis!.get(`lock:${sessionId}`);
    if (owner === instanceId) {
      await redis!.del(`lock:${sessionId}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check who owns a session lock in Redis.
 */
export async function redisGetLockOwner(sessionId: string): Promise<string | null> {
  if (!isRedisAvailable()) return null;
  try {
    return await redis!.get(`lock:${sessionId}`);
  } catch {
    return null;
  }
}

// ─── Keepalive State ─────────────────────────────────────────────────────────

/**
 * Record a keepalive ping result in Redis.
 * Key: `ka:{targetUrl}`, TTL: 120s.
 */
export async function redisSetKeepalive(targetUrl: string, status: 'ok' | 'fail'): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    await redis!.set(`ka:${targetUrl}`, JSON.stringify({ status, ts: Date.now() }), 'EX', 120);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get last keepalive result for a target.
 */
export async function redisGetKeepalive(targetUrl: string): Promise<{ status: string; ts: number } | null> {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await redis!.get(`ka:${targetUrl}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Health Check ────────────────────────────────────────────────────────────

/**
 * Check Redis connectivity and latency.
 */
export async function checkRedisHealth(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
  if (!redis) {
    return { available: false, latencyMs: 0, error: 'No REDIS_URL configured' };
  }
  const start = Date.now();
  try {
    await redis.ping();
    return { available: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { available: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Gracefully disconnect Redis on shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    redis = null;
    redisHealthy = false;
  }
}
