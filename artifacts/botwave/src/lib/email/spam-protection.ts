import Redis from 'ioredis';

const HOURLY_LIMIT_PREFIX = 'botwave:email_hour:';
const DAILY_LIMIT_PREFIX = 'botwave:email_day:';
const BOUNCE_PREFIX = 'botwave:email_bounce:';
const COMPLAINT_PREFIX = 'botwave:email_complaint:';

const HOURLY_LIMIT = 100; // max emails per hour per channel
const DAILY_LIMIT = 500; // max emails per day per channel
const BOUNCE_THRESHOLD = 5; // suspend after 5 bounces in 24h
const COMPLAINT_THRESHOLD = 3; // suspend after 3 complaints in 24h

let redis: Redis | null = null;

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

export interface SpamCheckResult {
  allowed: boolean;
  reason?: string;
  hourlyCount?: number;
  dailyCount?: number;
}

export async function checkChannelRateLimit(channel: string): Promise<SpamCheckResult> {
  const r = getRedis();
  if (!r) return { allowed: true };

  try {
    const hourKey = HOURLY_LIMIT_PREFIX + channel;
    const dayKey = DAILY_LIMIT_PREFIX + channel;

    const [hourCount, dayCount] = await Promise.all([
      r.incr(hourKey),
      r.incr(dayKey),
    ]);

    // Set TTL on first increment
    if (hourCount === 1) await r.expire(hourKey, 3600);
    if (dayCount === 1) await r.expire(dayKey, 86400);

    if (hourCount > HOURLY_LIMIT) {
      return { allowed: false, reason: `Hourly limit reached (${HOURLY_LIMIT})`, hourlyCount: hourCount, dailyCount: dayCount };
    }
    if (dayCount > DAILY_LIMIT) {
      return { allowed: false, reason: `Daily limit reached (${DAILY_LIMIT})`, hourlyCount: hourCount, dailyCount: dayCount };
    }

    return { allowed: true, hourlyCount: hourCount, dailyCount: dayCount };
  } catch {
    return { allowed: true };
  }
}

export async function recordBounce(channel: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  try {
    const key = BOUNCE_PREFIX + channel;
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, 86400);
    return count;
  } catch {
    return 0;
  }
}

export async function recordComplaint(channel: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  try {
    const key = COMPLAINT_PREFIX + channel;
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, 86400);
    return count;
  } catch {
    return 0;
  }
}

export async function getChannelHealth(channel: string): Promise<{
  hourlyCount: number;
  dailyCount: number;
  bounceCount: number;
  complaintCount: number;
  status: 'healthy' | 'warning' | 'critical';
}> {
  const r = getRedis();
  if (!r) return { hourlyCount: 0, dailyCount: 0, bounceCount: 0, complaintCount: 0, status: 'healthy' };

  try {
    const [hourly, daily, bounces, complaints] = await Promise.all([
      r.get(HOURLY_LIMIT_PREFIX + channel).then(Number),
      r.get(DAILY_LIMIT_PREFIX + channel).then(Number),
      r.get(BOUNCE_PREFIX + channel).then(Number),
      r.get(COMPLAINT_PREFIX + channel).then(Number),
    ]);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (bounces >= BOUNCE_THRESHOLD || complaints >= COMPLAINT_THRESHOLD) {
      status = 'critical';
    } else if (bounces >= 3 || complaints >= 2 || daily > DAILY_LIMIT * 0.8) {
      status = 'warning';
    }

    return {
      hourlyCount: hourly || 0,
      dailyCount: daily || 0,
      bounceCount: bounces || 0,
      complaintCount: complaints || 0,
      status,
    };
  } catch {
    return { hourlyCount: 0, dailyCount: 0, bounceCount: 0, complaintCount: 0, status: 'healthy' };
  }
}

export async function getAllChannelHealth(): Promise<Record<string, Awaited<ReturnType<typeof getChannelHealth>>>> {
  const channels = ['auth', 'notify', 'billing', 'welcome', 'alerts', 'usermail'];
  const results: Record<string, Awaited<ReturnType<typeof getChannelHealth>>> = {};
  await Promise.all(
    channels.map(async (ch) => {
      results[ch] = await getChannelHealth(ch);
    }),
  );
  return results;
}
