/**
 * Offline Write Queue — Buffers non-critical writes when Supabase is unreachable.
 *
 * Problem: When the circuit breaker is OPEN, non-critical writes (command tracking,
 * message tracking, health events) are silently dropped. This means analytics data
 * is lost during every outage window.
 *
 * Solution: Instead of dropping writes, buffer them in memory with a max queue size.
 * When the circuit closes (Supabase recovers), replay all buffered writes with
 * rate limiting so we don't slam the database with a burst.
 *
 * Guarantees:
 *   - Queue has a hard cap (MAX_QUEUE_SIZE) to prevent OOM
 *   - Oldest entries are dropped when queue is full (FIFO eviction)
 *   - Replay is rate-limited (REPLAY_BATCH_SIZE items every REPLAY_INTERVAL_MS)
 *   - If replay fails, items go back to the queue for the next attempt
 *   - Only non-critical writes are queued (tracking, logging, stats)
 */

import { isCircuitOpen } from './circuitBreaker';

interface QueuedWrite {
  label: string;
  writeFn: () => Promise<void>;
  queuedAt: number;
}

const queue: QueuedWrite[] = [];
const MAX_QUEUE_SIZE = 500;
const REPLAY_BATCH_SIZE = 10;
const REPLAY_INTERVAL_MS = 5_000; // replay 10 items every 5s
const MAX_WRITE_AGE_MS = 30 * 60_000; // drop writes older than 30 min

let replayHandle: NodeJS.Timeout | null = null;
let totalQueued = 0;
let totalReplayed = 0;
let totalDropped = 0;

/**
 * Queue a non-critical write for later execution.
 * If the circuit is closed, executes immediately instead of queuing.
 * Returns true if queued/executed, false if dropped.
 */
export async function queueWrite(label: string, writeFn: () => Promise<void>): Promise<boolean> {
  // If circuit is healthy, execute immediately
  if (!isCircuitOpen()) {
    try {
      await writeFn();
      return true;
    } catch {
      // Failed even though circuit was closed — queue it
    }
  }

  // Evict oldest entry if at capacity
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
    totalDropped++;
  }

  queue.push({ label, writeFn, queuedAt: Date.now() });
  totalQueued++;
  return true;
}

/** Replay buffered writes in batches. Called periodically. */
async function replayBatch(): Promise<void> {
  if (isCircuitOpen() || queue.length === 0) return;

  const now = Date.now();
  const batch = queue.splice(0, REPLAY_BATCH_SIZE);
  let replayed = 0;
  let failed = 0;

  for (const item of batch) {
    // Drop stale writes
    if (now - item.queuedAt > MAX_WRITE_AGE_MS) {
      totalDropped++;
      continue;
    }

    try {
      await item.writeFn();
      replayed++;
      totalReplayed++;
    } catch {
      failed++;
      // Put back at end of queue for next attempt (if not too old)
      if (now - item.queuedAt < MAX_WRITE_AGE_MS) {
        queue.push(item);
      } else {
        totalDropped++;
      }
    }
  }

  if (replayed > 0 || failed > 0) {
    console.log(`[WRITE-QUEUE] Replayed ${replayed}, failed ${failed}, remaining ${queue.length}`);
  }
}

/** Start the replay loop. Returns the interval handle. */
export function startWriteQueueReplay(): NodeJS.Timeout {
  if (replayHandle) return replayHandle;
  replayHandle = setInterval(replayBatch, REPLAY_INTERVAL_MS);
  return replayHandle;
}

/** Stop the replay loop. */
export function stopWriteQueueReplay(): void {
  if (replayHandle) {
    clearInterval(replayHandle);
    replayHandle = null;
  }
}

/** Get queue stats for health endpoints / logging. */
export function getWriteQueueStats() {
  return {
    pending: queue.length,
    totalQueued,
    totalReplayed,
    totalDropped,
    oldestAge: queue.length > 0 ? Math.round((Date.now() - queue[0].queuedAt) / 1000) : null,
  };
}
