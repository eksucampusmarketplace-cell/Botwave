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
  console.log('[REDIS] No REDIS_URL set - using Supabase for all operations');
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

// ─── 428 Cooldown (shared across workers) ────────────────────────────────────

/**
 * Activate a 428 cooldown for a specific session in Redis.
 * Key: `cooldown428:{sessionId}`, TTL: cooldownSec.
 * Falls back to global key if sessionId is 'global'.
 */
export async function redisSet428Cooldown(sessionId: string, cooldownSec: number): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    const key = sessionId === 'global' ? 'cooldown428:global' : `cooldown428:${sessionId}`;
    await redis!.set(key, JSON.stringify({ ts: Date.now(), expiresAt: Date.now() + cooldownSec * 1000 }), 'EX', cooldownSec);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a 428 cooldown is active for a session (or globally).
 * Returns remaining seconds, or 0 if not active.
 */
export async function redisGet428Cooldown(sessionId: string): Promise<number> {
  if (!isRedisAvailable()) return 0;
  try {
    const key = sessionId === 'global' ? 'cooldown428:global' : `cooldown428:${sessionId}`;
    const ttl = await redis!.ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch {
    return 0;
  }
}

// ─── Webhook Dedup (shared across workers) ───────────────────────────────────

/**
 * Mark a webhook message as seen using Redis SETNX (atomic).
 * Returns true if this is the first time (not a duplicate), false if already seen.
 * Key: `webhookdedup:{sessionId}:{messageId}`, TTL: 300s (5 minutes).
 */
export async function redisMarkWebhookSeen(sessionId: string, messageId: string): Promise<boolean> {
  if (!isRedisAvailable()) return true; // fallback: treat as unseen
  try {
    const key = `webhookdedup:${sessionId}:${messageId}`;
    const result = await redis!.set(key, '1', 'EX', 300, 'NX');
    return result === 'OK'; // true = first time, false = duplicate
  } catch {
    return true; // on error, treat as unseen to avoid dropping messages
  }
}

// ─── Distributed Pairing Lock ────────────────────────────────────────────────

/**
 * Acquire a distributed pairing lock for a session.
 * Prevents multiple workers from requesting pairing codes simultaneously.
 * Key: `pairinglock:{sessionId}`, TTL: 60s.
 */
export async function redisAcquirePairingLock(sessionId: string): Promise<boolean> {
  if (!isRedisAvailable()) return true; // fallback: allow
  try {
    const result = await redis!.set(`pairinglock:${sessionId}`, '1', 'EX', 60, 'NX');
    return result === 'OK';
  } catch {
    return true; // on error, allow pairing to proceed
  }
}

/**
 * Release a distributed pairing lock for a session.
 */
export async function redisReleasePairingLock(sessionId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.del(`pairinglock:${sessionId}`);
  } catch { /* ignore */ }
}

// ─── Proxy Health & Blacklist (shared across workers) ────────────────────────

const PROXY_FAILURES_PREFIX = 'proxy:failure:';
const PROXY_BLACKLIST_PREFIX = 'proxy:blacklist:';
const PROXY_BLACKLIST_TTL = 1800; // 30 minutes — keep bad proxies blocked longer to prevent flapping
const REDIS_PROXY_FAIL_THRESHOLD = 3;

/**
 * Record a proxy failure in Redis. After REDIS_PROXY_FAIL_THRESHOLD failures
 * within 5 minutes, the proxy is blacklisted for PROXY_BLACKLIST_TTL seconds.
 * Returns the current failure count.
 */
export async function redisRecordProxyFailure(proxyHost: string): Promise<number> {
  if (!isRedisAvailable()) return 0;
  try {
    const key = `${PROXY_FAILURES_PREFIX}${proxyHost}`;
    const failures = await redis!.incr(key);
    await redis!.expire(key, 300);
    if (failures >= REDIS_PROXY_FAIL_THRESHOLD) {
      await redis!.setex(`${PROXY_BLACKLIST_PREFIX}${proxyHost}`, PROXY_BLACKLIST_TTL, '1');
    }
    return failures;
  } catch {
    return 0;
  }
}

/**
 * Check if a proxy is currently blacklisted (too many recent failures).
 */
export async function redisIsProxyBlacklisted(proxyHost: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    return (await redis!.get(`${PROXY_BLACKLIST_PREFIX}${proxyHost}`)) === '1';
  } catch {
    return false;
  }
}

/**
 * Clear proxy failure count and blacklist status (call on successful connection).
 */
export async function redisClearProxyFailures(proxyHost: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.del(`${PROXY_FAILURES_PREFIX}${proxyHost}`);
    await redis!.del(`${PROXY_BLACKLIST_PREFIX}${proxyHost}`);
  } catch { /* ignore */ }
}

/**
 * Get the sticky proxy assignment for a session from Redis.
 * Returns the proxy string (host:port:user:pass) or null.
 */
export async function redisGetSessionProxy(sessionId: string): Promise<string | null> {
  if (!isRedisAvailable()) return null;
  try {
    return await redis!.get(`session:proxy:${sessionId}`);
  } catch {
    return null;
  }
}

/**
 * Store the sticky proxy assignment for a session in Redis (24h TTL).
 */
export async function redisSetSessionProxy(sessionId: string, proxy: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.set(`session:proxy:${sessionId}`, proxy, 'EX', 86400);
  } catch { /* ignore */ }
}

/**
 * Clear the sticky proxy assignment for a session.
 */
export async function redisClearSessionProxy(sessionId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.del(`session:proxy:${sessionId}`);
  } catch { /* ignore */ }
}

// ─── Country-Proxy Grouping ──────────────────────────────────────────────────

/**
 * Add a session to a proxy's country group in Redis.
 * Key: proxy:country:{proxyHost} → Redis Set of "countryCode:sessionId" entries.
 * TTL: 24h (matches session proxy TTL).
 */
export async function redisAddProxyCountrySession(proxyHost: string, countryCode: string, sessionId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const key = `proxy:country:${proxyHost}`;
    await redis!.sadd(key, `${countryCode}:${sessionId}`);
    await redis!.expire(key, 86400);
  } catch { /* ignore */ }
}

/**
 * Remove a session from a proxy's country group.
 */
export async function redisRemoveProxyCountrySession(proxyHost: string, countryCode: string, sessionId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.srem(`proxy:country:${proxyHost}`, `${countryCode}:${sessionId}`);
  } catch { /* ignore */ }
}

/**
 * Get all country:session entries for a proxy.
 * Returns an array of "countryCode:sessionId" strings.
 */
export async function redisGetProxyCountrySessions(proxyHost: string): Promise<string[]> {
  if (!isRedisAvailable()) return [];
  try {
    return await redis!.smembers(`proxy:country:${proxyHost}`);
  } catch {
    return [];
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
