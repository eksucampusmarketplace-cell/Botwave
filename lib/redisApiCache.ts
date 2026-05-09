/**
 * Redis API Cache — Shared Redis caching layer for Next.js API routes.
 *
 * The bot process uses bot/redisSessionCache.ts with its own Redis connection.
 * API routes run in a separate Next.js serverless context and need their own
 * lightweight Redis helper. This module provides generic get/set/invalidate
 * plus domain-specific convenience wrappers with sensible TTLs.
 *
 * When REDIS_URL is not set or Redis is unavailable, every function is a no-op
 * that returns null/undefined so the caller falls through to Supabase.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL;

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
    redis.connect().catch(() => {});
  } catch {
    redis = null;
  }
}

function isAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

// ─── TTL Constants (seconds) ─────────────────────────────────────────────────

const SUBSCRIPTION_TTL = 300; // 5 min — plan info rarely changes
const SETTINGS_TTL = 300; // 5 min
const CUSTOM_CMDS_TTL = 300; // 5 min
const PRODUCTS_TTL = 300; // 5 min
const TEMPLATES_TTL = 300; // 5 min
const FLOWS_TTL = 300; // 5 min
const FEATURES_TTL = 300; // 5 min
const SESSIONS_TTL = 30; // 30 sec — sessions change frequently
const REFERRAL_TTL = 300; // 5 min
const REWARDS_TTL = 300; // 5 min
const PAYMENT_HISTORY_TTL = 120; // 2 min
const PROFILE_TTL = 600; // 10 min — username→id mapping rarely changes
const API_KEYS_TTL = 300; // 5 min
const STATS_TTL = 60; // 1 min — stats refresh frequently
const HEALTH_TTL = 60; // 1 min — health data refreshes frequently
const ANALYTICS_TTL = 120; // 2 min — analytics aggregation is expensive

// ─── Generic Helpers ─────────────────────────────────────────────────────────

export async function apiCacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!isAvailable()) return null;
  try {
    const raw = await redis!.get(`api:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function apiCacheSet(key: string, data: unknown, ttl: number): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.set(`api:${key}`, JSON.stringify(data), 'EX', ttl);
  } catch {
    // Non-critical
  }
}

export async function apiCacheDel(key: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    await redis!.del(`api:${key}`);
  } catch {
    // Non-critical
  }
}

export async function apiCacheDelPattern(pattern: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    const keys = await redis!.keys(`api:${pattern}`);
    if (keys.length > 0) {
      await redis!.del(...keys);
    }
  } catch {
    // Non-critical
  }
}

// ─── Subscription (plan gating) ─────────────────────────────────────────────

export async function getCachedUserPlan(userId: string): Promise<{ plan: string } | null> {
  return apiCacheGet<{ plan: string }>(`sub:plan:${userId}`);
}

export async function cacheUserPlan(userId: string, plan: string): Promise<void> {
  await apiCacheSet(`sub:plan:${userId}`, { plan }, SUBSCRIPTION_TTL);
}

export async function getCachedSubscriptionFull(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`sub:full:${userId}`);
}

export async function cacheSubscriptionFull(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`sub:full:${userId}`, data, SUBSCRIPTION_TTL);
}

export async function invalidateSubscription(userId: string): Promise<void> {
  await apiCacheDel(`sub:plan:${userId}`);
  await apiCacheDel(`sub:full:${userId}`);
  await apiCacheDel(`rewards:${userId}`);
}

// ─── Reward Balances ─────────────────────────────────────────────────────────

export async function getCachedRewards(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`rewards:${userId}`);
}

export async function cacheRewards(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`rewards:${userId}`, data, REWARDS_TTL);
}

export async function invalidateRewards(userId: string): Promise<void> {
  await apiCacheDel(`rewards:${userId}`);
}

// ─── User Settings ───────────────────────────────────────────────────────────

export async function getCachedApiSettings(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`settings:${userId}`);
}

export async function cacheApiSettings(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`settings:${userId}`, data, SETTINGS_TTL);
}

export async function invalidateApiSettings(userId: string): Promise<void> {
  await apiCacheDel(`settings:${userId}`);
}

// ─── Custom Commands ─────────────────────────────────────────────────────────

export async function getCachedCustomCmds(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`cmds:${userId}`);
}

export async function cacheCustomCmds(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`cmds:${userId}`, data, CUSTOM_CMDS_TTL);
}

export async function invalidateCustomCmds(userId: string): Promise<void> {
  await apiCacheDel(`cmds:${userId}`);
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getCachedProducts(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`products:${userId}`);
}

export async function cacheProducts(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`products:${userId}`, data, PRODUCTS_TTL);
}

export async function invalidateProducts(userId: string): Promise<void> {
  await apiCacheDel(`products:${userId}`);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getCachedTemplates(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`templates:${userId}`);
}

export async function cacheTemplates(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`templates:${userId}`, data, TEMPLATES_TTL);
}

export async function invalidateTemplates(userId: string): Promise<void> {
  await apiCacheDel(`templates:${userId}`);
}

// ─── Chatbot Flows ───────────────────────────────────────────────────────────

export async function getCachedFlows(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`flows:${userId}`);
}

export async function cacheFlows(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`flows:${userId}`, data, FLOWS_TTL);
}

export async function invalidateFlows(userId: string): Promise<void> {
  await apiCacheDel(`flows:${userId}`);
}

// ─── Bot Features ────────────────────────────────────────────────────────────

export async function getCachedFeatures(userId: string, sessionId?: string): Promise<unknown[] | null> {
  const key = sessionId ? `features:${userId}:${sessionId}` : `features:${userId}`;
  return apiCacheGet<unknown[]>(key);
}

export async function cacheFeatures(userId: string, data: unknown[], sessionId?: string): Promise<void> {
  const key = sessionId ? `features:${userId}:${sessionId}` : `features:${userId}`;
  await apiCacheSet(key, data, FEATURES_TTL);
}

export async function invalidateFeatures(userId: string): Promise<void> {
  await apiCacheDelPattern(`features:${userId}*`);
}

// ─── Bot Sessions ────────────────────────────────────────────────────────────

export async function getCachedSessions(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`sessions:${userId}`);
}

export async function cacheSessions(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`sessions:${userId}`, data, SESSIONS_TTL);
}

export async function invalidateSessions(userId: string): Promise<void> {
  await apiCacheDel(`sessions:${userId}`);
}

// ─── Referrals ───────────────────────────────────────────────────────────────

export async function getCachedReferralData(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`referral:${userId}`);
}

export async function cacheReferralData(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`referral:${userId}`, data, REFERRAL_TTL);
}

export async function invalidateReferralData(userId: string): Promise<void> {
  await apiCacheDel(`referral:${userId}`);
}

// ─── Payment History ─────────────────────────────────────────────────────────

export async function getCachedPaymentHistory(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`payments:${userId}`);
}

export async function cachePaymentHistory(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`payments:${userId}`, data, PAYMENT_HISTORY_TTL);
}

export async function invalidatePaymentHistory(userId: string): Promise<void> {
  await apiCacheDel(`payments:${userId}`);
}

// ─── Profile Lookups (username → id) ─────────────────────────────────────────

export async function getCachedProfileId(username: string): Promise<string | null> {
  return apiCacheGet<string>(`profile:uname:${username.toLowerCase()}`);
}

export async function cacheProfileId(username: string, id: string): Promise<void> {
  await apiCacheSet(`profile:uname:${username.toLowerCase()}`, id, PROFILE_TTL);
}

export async function invalidateProfileId(username: string): Promise<void> {
  await apiCacheDel(`profile:uname:${username.toLowerCase()}`);
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export async function getCachedApiKeys(userId: string): Promise<unknown[] | null> {
  return apiCacheGet<unknown[]>(`apikeys:${userId}`);
}

export async function cacheApiKeys(userId: string, data: unknown[]): Promise<void> {
  await apiCacheSet(`apikeys:${userId}`, data, API_KEYS_TTL);
}

export async function invalidateApiKeys(userId: string): Promise<void> {
  await apiCacheDel(`apikeys:${userId}`);
}

// ─── Referral Code Lookup (code → referral row) ─────────────────────────────

export async function getCachedReferralByCode(code: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`refcode:${code.toUpperCase()}`);
}

export async function cacheReferralByCode(code: string, data: unknown): Promise<void> {
  await apiCacheSet(`refcode:${code.toUpperCase()}`, data, REFERRAL_TTL);
}

export async function invalidateReferralByCode(code: string): Promise<void> {
  await apiCacheDel(`refcode:${code.toUpperCase()}`);
}

// ─── Bot Stats ──────────────────────────────────────────────────────────────

export async function getCachedStats(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`stats:${userId}`);
}

export async function cacheStats(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`stats:${userId}`, data, STATS_TTL);
}

export async function invalidateStats(userId: string): Promise<void> {
  await apiCacheDel(`stats:${userId}`);
}

// ─── Bot Health ─────────────────────────────────────────────────────────────

export async function getCachedHealth(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`health:${userId}`);
}

export async function cacheHealth(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`health:${userId}`, data, HEALTH_TTL);
}

export async function invalidateHealth(userId: string): Promise<void> {
  await apiCacheDel(`health:${userId}`);
}

// ─── Bot Analytics ──────────────────────────────────────────────────────────

export async function getCachedAnalytics(userId: string): Promise<Record<string, unknown> | null> {
  return apiCacheGet<Record<string, unknown>>(`analytics:${userId}`);
}

export async function cacheAnalytics(userId: string, data: unknown): Promise<void> {
  await apiCacheSet(`analytics:${userId}`, data, ANALYTICS_TTL);
}

export async function invalidateAnalytics(userId: string): Promise<void> {
  await apiCacheDel(`analytics:${userId}`);
}
