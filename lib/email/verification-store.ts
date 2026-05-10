import Redis from 'ioredis';

const CODE_PREFIX = 'botwave:verify:';
const CODE_TTL = 600; // 10 minutes
const RATE_PREFIX = 'botwave:verify_rate:';
const RATE_TTL = 60; // 1 request per 60s

let redis: Redis | null = null;

// In-memory fallback when Redis is not available
const memStore = new Map<string, { code: string; expiresAt: number }>();
const memRateLimit = new Map<string, number>();

function getRedis(): Redis | null {
  if (redis && redis.status === 'ready') return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.connect().catch(() => {});
    return redis;
  } catch {
    return null;
  }
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeVerificationCode(email: string, code: string): Promise<void> {
  const key = CODE_PREFIX + email.toLowerCase();
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, code, 'EX', CODE_TTL);
      return;
    } catch { /* fall through to memory */ }
  }
  memStore.set(key, { code, expiresAt: Date.now() + CODE_TTL * 1000 });
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const key = CODE_PREFIX + email.toLowerCase();
  const r = getRedis();
  if (r) {
    try {
      const stored = await r.get(key);
      if (stored === code) {
        await r.del(key);
        return true;
      }
      return false;
    } catch { /* fall through */ }
  }
  const entry = memStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return false;
  }
  if (entry.code === code) {
    memStore.delete(key);
    return true;
  }
  return false;
}

const PENDING_PREFIX = 'botwave:pending_signup:';
const PENDING_TTL = 900; // 15 minutes
const memPending = new Map<string, { data: string; expiresAt: number }>();

export interface PendingSignupData {
  email: string;
  password: string;
  username: string;
  referralCode?: string;
  signup_source?: string;
  signup_referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export async function storePendingSignup(email: string, data: PendingSignupData): Promise<void> {
  const key = PENDING_PREFIX + email.toLowerCase();
  const payload = JSON.stringify(data);
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, payload, 'EX', PENDING_TTL);
      return;
    } catch { /* fall through */ }
  }
  memPending.set(key, { data: payload, expiresAt: Date.now() + PENDING_TTL * 1000 });
}

export async function getPendingSignup(email: string): Promise<PendingSignupData | null> {
  const key = PENDING_PREFIX + email.toLowerCase();
  const r = getRedis();
  if (r) {
    try {
      const raw = await r.get(key);
      if (raw) return JSON.parse(raw);
      return null;
    } catch { /* fall through */ }
  }
  const entry = memPending.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memPending.delete(key);
    return null;
  }
  return JSON.parse(entry.data);
}

export async function clearPendingSignup(email: string): Promise<void> {
  const key = PENDING_PREFIX + email.toLowerCase();
  const r = getRedis();
  if (r) {
    try { await r.del(key); } catch { /* ignore */ }
  }
  memPending.delete(key);
}

export async function checkRateLimit(email: string): Promise<boolean> {
  const key = RATE_PREFIX + email.toLowerCase();
  const r = getRedis();
  if (r) {
    try {
      const exists = await r.exists(key);
      if (exists) return false;
      await r.set(key, '1', 'EX', RATE_TTL);
      return true;
    } catch { /* fall through */ }
  }
  const lastSent = memRateLimit.get(key);
  if (lastSent && Date.now() - lastSent < RATE_TTL * 1000) return false;
  memRateLimit.set(key, Date.now());
  return true;
}
