/**
 * StatusViewer — Auto-view and optionally react to WhatsApp status updates.
 *
 * Anti-ban measures:
 * - Random delay 5–15s between each status view/react
 * - Skip ~15% of statuses randomly (human-like)
 * - Daily cap of 50 views per session
 * - Process one at a time via queue (no bursts)
 * - Never view own statuses
 */

import { getFeatureEnabled, getSessionUserId } from '../database';

const DEFAULT_REACT_EMOJI = '❤️';

// Per-session daily counters (reset at midnight)
const dailyCounters = new Map<string, { count: number; date: string }>();
const DAILY_CAP = 50;
const SKIP_PROBABILITY = 0.15;

// Per-session queue to process statuses one at a time
const statusQueues = new Map<string, Array<{ msg: any; sock: any; sessionId: string; userId: string }>>();
const processingFlags = new Map<string, boolean>();

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyCount(sessionId: string): number {
  const entry = dailyCounters.get(sessionId);
  if (!entry || entry.date !== getTodayStr()) {
    dailyCounters.set(sessionId, { count: 0, date: getTodayStr() });
    return 0;
  }
  return entry.count;
}

function incrementDailyCount(sessionId: string): void {
  const today = getTodayStr();
  const entry = dailyCounters.get(sessionId);
  if (!entry || entry.date !== today) {
    dailyCounters.set(sessionId, { count: 1, date: today });
  } else {
    entry.count++;
  }
}

function randomDelay(): Promise<void> {
  const ms = 5000 + Math.random() * 10000; // 5-15 seconds
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue(sessionId: string): Promise<void> {
  if (processingFlags.get(sessionId)) return;
  processingFlags.set(sessionId, true);

  const queue = statusQueues.get(sessionId) || [];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    try {
      // Check daily cap
      if (getDailyCount(sessionId) >= DAILY_CAP) {
        queue.length = 0; // Clear remaining
        break;
      }

      // Random skip (human-like: don't view every single status)
      if (Math.random() < SKIP_PROBABILITY) {
        continue;
      }

      // Wait before processing (anti-ban delay)
      await randomDelay();

      const { msg, sock } = item;

      // View the status (mark as read)
      try {
        await sock.readMessages([msg.key]);
      } catch {
        // Some statuses may fail to read — non-critical
      }

      // React with emoji
      try {
        await sock.sendMessage(
          msg.key.remoteJid,
          { react: { key: msg.key, text: DEFAULT_REACT_EMOJI } },
          { statusJidList: [msg.key.participant, sock.user?.id].filter(Boolean) },
        );
      } catch {
        // Reaction may fail for some status types — non-critical
      }

      incrementDailyCount(sessionId);
    } catch (error) {
      console.error(`[StatusViewer] Error processing status for ${sessionId}:`, error);
    }
  }

  processingFlags.set(sessionId, false);
}

/**
 * Called for every status@broadcast message received.
 * Queues the status for viewing + reacting with anti-ban delays.
 */
export async function handleStatusUpdate(
  msg: any,
  sock: any,
  sessionId: string,
  userId: string,
): Promise<void> {
  try {
    // Don't view own statuses
    if (msg.key.fromMe) return;

    // Check if autoview is enabled for this user
    const isEnabled = await getFeatureEnabled(userId, 'autoview');
    if (!isEnabled) return;

    // Check daily cap before queueing
    if (getDailyCount(sessionId) >= DAILY_CAP) return;

    // Add to queue
    if (!statusQueues.has(sessionId)) {
      statusQueues.set(sessionId, []);
    }
    statusQueues.get(sessionId)!.push({ msg, sock, sessionId, userId });

    // Start processing if not already running
    processQueue(sessionId).catch((err) =>
      console.error(`[StatusViewer] Queue error for ${sessionId}:`, err),
    );
  } catch (error) {
    console.error('[StatusViewer] Error handling status update:', error);
  }
}

/**
 * Clean up when a session disconnects.
 */
export function cleanupStatusViewer(sessionId: string): void {
  statusQueues.delete(sessionId);
  processingFlags.delete(sessionId);
}
