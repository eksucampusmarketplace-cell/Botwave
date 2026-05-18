import Redis from 'ioredis';
import type { EmailEnvelope, QueuedEmail, EmailResult } from './types';

// Lazy import to avoid circular dependency (index.ts re-exports from queue.ts)
async function sendEmailDirect(envelope: EmailEnvelope): Promise<EmailResult> {
  const mod = await import('./index');
  return mod.sendEmailDirect(envelope);
}

const QUEUE_KEY = 'botwave:email:queue';
const DLQ_KEY = 'botwave:email:dlq';
const PROCESSING_KEY = 'botwave:email:processing';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

let redis: Redis | null = null;
let processingInterval: ReturnType<typeof setInterval> | null = null;

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

function generateId(): string {
  return `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueEmail(envelope: EmailEnvelope): Promise<string> {
  const r = getRedis();
  const queued: QueuedEmail = {
    ...envelope,
    id: generateId(),
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  if (!r) {
    // No Redis - send directly (fire-and-forget)
    sendEmailDirect(envelope).catch((err) =>
      console.error('[EMAIL-QUEUE] Direct send failed:', err),
    );
    return queued.id;
  }

  try {
    await r.lpush(QUEUE_KEY, JSON.stringify(queued));
  } catch {
    // Fallback to direct send
    sendEmailDirect(envelope).catch((err) =>
      console.error('[EMAIL-QUEUE] Direct send fallback failed:', err),
    );
  }
  return queued.id;
}

async function processOne(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;

  try {
    const raw = await r.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
    if (!raw) return false;

    const email: QueuedEmail = JSON.parse(raw);
    email.attempts++;

    const result: EmailResult = await sendEmailDirect(email);

    // Remove from processing
    await r.lrem(PROCESSING_KEY, 1, raw);

    if (result.success) {
      return true;
    }

    email.lastError = result.error;

    if (email.attempts >= MAX_RETRIES) {
      await r.lpush(DLQ_KEY, JSON.stringify(email));
      console.error(`[EMAIL-QUEUE] Email ${email.id} moved to DLQ after ${email.attempts} attempts: ${result.error}`);
    } else {
      // Re-queue with delay
      const delay = RETRY_DELAYS[email.attempts - 1] || 120_000;
      setTimeout(async () => {
        try {
          const rc = getRedis();
          if (rc) await rc.lpush(QUEUE_KEY, JSON.stringify(email));
        } catch {
          // Silently fail
        }
      }, delay);
    }
    return true;
  } catch (err) {
    console.error('[EMAIL-QUEUE] Processing error:', err);
    return false;
  }
}

export function startEmailQueueProcessor(intervalMs = 2000): void {
  if (processingInterval) return;
  processingInterval = setInterval(async () => {
    // Process up to 5 emails per tick
    for (let i = 0; i < 5; i++) {
      const hadWork = await processOne();
      if (!hadWork) break;
    }
  }, intervalMs);
  console.log('[EMAIL-QUEUE] Processor started');
}

export function stopEmailQueueProcessor(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  deadLetter: number;
}> {
  const r = getRedis();
  if (!r) return { pending: 0, processing: 0, deadLetter: 0 };
  try {
    const [pending, processing, deadLetter] = await Promise.all([
      r.llen(QUEUE_KEY),
      r.llen(PROCESSING_KEY),
      r.llen(DLQ_KEY),
    ]);
    return { pending, processing, deadLetter };
  } catch {
    return { pending: 0, processing: 0, deadLetter: 0 };
  }
}

export async function retryDeadLetterQueue(): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  let count = 0;
  try {
    while (true) {
      const raw = await r.rpop(DLQ_KEY);
      if (!raw) break;
      const email: QueuedEmail = JSON.parse(raw);
      email.attempts = 0;
      email.lastError = undefined;
      await r.lpush(QUEUE_KEY, JSON.stringify(email));
      count++;
    }
  } catch {
    // Partial retry is fine
  }
  return count;
}
