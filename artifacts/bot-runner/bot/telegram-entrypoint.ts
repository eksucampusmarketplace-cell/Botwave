/**
 * Telegram Bot - Isolated Entrypoint
 *
 * Starts ONLY Telegram bot sessions. Connects to Redis for shared state.
 * Skips all WhatsApp/Evolution API logic.
 *
 * Usage: BOT_PLATFORM=telegram node dist/bot/bot/telegram-entrypoint.js
 */

import './env';
import { isMainThread } from 'worker_threads';

if (!isMainThread) {
  console.error('[TELEGRAM] telegram-entrypoint.ts must only run on the main thread.');
  process.exit(1);
}

// Force platform isolation before any other imports read the env
process.env.BOT_PLATFORM = 'telegram';

import { initializeBot, syncSessionsWithDb, getActiveBotSocket, getActiveSessionCount } from './TelegramBotManager';
import { getDueReminders, markReminderDelivered, getDueScheduledMessages, markScheduledMessageSent } from './database';
import { cleanupOnStartup, startHeartbeatLoop, stopHeartbeatLoop, recoverOrphanedSessions, auditSessions, getInstanceId, cleanupStuckPairingSessions } from './scaling/sessionCoordinator';
import { disconnectRedis } from './infrastructure/redis';
import { installShutdownHandlers, registerInterval, onShutdown, isShutdown } from './infrastructure/gracefulShutdown';
import { trackMap, startMemoryGuard, stopMemoryGuard } from './infrastructure/memoryGuard';
import { startWriteQueueReplay, stopWriteQueueReplay } from './infrastructure/writeQueue';
import { getPollingMultiplier, recordPollerError, recordPollerSuccess } from './infrastructure/adaptivePoller';
import { disconnectSessionCache } from './infrastructure/redisSessionCache';
import { createServer as createHttpServer } from 'http';

const bot = initializeBot();

async function start() {
  console.log(`[TELEGRAM] Starting Telegram-only bot service... INSTANCE=${getInstanceId()}`);

  installShutdownHandlers();
  onShutdown('heartbeat', async () => { stopHeartbeatLoop(); });
  onShutdown('memoryGuard', async () => { stopMemoryGuard(); });
  onShutdown('writeQueue', async () => { stopWriteQueueReplay(); });
  onShutdown('sessionCache', async () => { await disconnectSessionCache(); });
  onShutdown('redis', async () => { await disconnectRedis(); });
  onShutdown('bot', async () => { await bot.stop(true); });

  await bot.start();

  await cleanupOnStartup('telegram');
  startHeartbeatLoop();

  // Orphan recovery on startup
  try {
    const recovered = await recoverOrphanedSessions('telegram');
    if (recovered > 0) {
      console.log(`[TELEGRAM] Recovered ${recovered} orphaned session(s)`);
    }
  } catch (err) {
    console.error('[TELEGRAM] Early orphan recovery failed (non-fatal):', err);
  }

  // Initial sync
  console.log('[TELEGRAM] Running initial session sync...');
  await syncSessionsWithDb(false);
  console.log('[TELEGRAM] Initial sync complete. Polling every 5s...');

  // Session sync loop
  registerInterval(setInterval(async () => {
    if (isShutdown()) return;
    const mult = getPollingMultiplier();
    if (mult === Infinity) return;
    try {
      await syncSessionsWithDb(false);
      recordPollerSuccess('sessionSync');
    } catch (error) {
      recordPollerError('sessionSync');
      console.error('[TELEGRAM] Error syncing sessions:', error);
    }
  }, 5_000));

  // Orphan recovery (every 120s)
  registerInterval(setInterval(async () => {
    if (isShutdown()) return;
    try {
      const recovered = await recoverOrphanedSessions('telegram');
      if (recovered > 0) {
        console.log(`[TELEGRAM] Recovered ${recovered} orphaned session(s)`);
      }
      recordPollerSuccess('orphanRecovery');
    } catch (err) {
      recordPollerError('orphanRecovery');
      console.error('[TELEGRAM] Orphan recovery error:', err);
    }
  }, 120_000));

  // Audit (every 300s)
  registerInterval(setInterval(async () => {
    if (isShutdown()) return;
    try {
      await auditSessions();
      recordPollerSuccess('audit');
    } catch (err) {
      recordPollerError('audit');
      console.error('[TELEGRAM] Audit error:', err);
    }
  }, 300_000));

  // Cleanup stuck pairing sessions (every 30 min)
  registerInterval(setInterval(async () => {
    if (isShutdown()) return;
    try {
      const cleaned = await cleanupStuckPairingSessions();
      if (cleaned > 0) {
        console.log(`[TELEGRAM] Cleaned ${cleaned} stuck pairing session(s)`);
      }
    } catch (err) {
      console.error('[TELEGRAM] Stuck session cleanup error:', err);
    }
  }, 1_800_000));

  // Reminder + Scheduled Message delivery (every 30s)
  registerInterval(setInterval(async () => {
    if (isShutdown()) return;
    try {
      const dueReminders = await getDueReminders();
      for (const reminder of dueReminders) {
        const sock = getActiveBotSocket(reminder.session_id);
        if (sock) {
          try {
            const msg = `*Reminder:* ${reminder.message}`;
            if (typeof sock.sendMessage === 'function') {
              await sock.sendMessage(reminder.chat_jid, { text: msg });
            }
            await markReminderDelivered(reminder.id);
          } catch (err) {
            console.error(`[TELEGRAM] Failed to deliver reminder ${reminder.id}:`, err);
          }
        }
      }

      const dueScheduled = await getDueScheduledMessages();
      for (const scheduled of dueScheduled) {
        const sock = getActiveBotSocket(scheduled.session_id);
        if (sock) {
          try {
            if (typeof sock.sendMessage === 'function') {
              await sock.sendMessage(scheduled.target_jid, { text: scheduled.message });
            }
            await markScheduledMessageSent(scheduled.id);
          } catch (err) {
            console.error(`[TELEGRAM] Failed to deliver scheduled message ${scheduled.id}:`, err);
          }
        }
      }
      recordPollerSuccess('reminders');
    } catch (err) {
      recordPollerError('reminders');
      console.error('[TELEGRAM] Reminder/scheduled delivery error:', err);
    }
  }, 30_000));

  registerInterval(startWriteQueueReplay());
  registerInterval(startMemoryGuard());

  console.log('[TELEGRAM] All modules initialized');
}

// Health HTTP server
const healthPort = parseInt(process.env.PORT || '10000', 10);

const healthServer = createHttpServer(async (req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/health' || url === '/api/health') {
    const memUsage = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      status: 'healthy',
      platform: 'telegram',
      sessions: getActiveSessionCount(),
      uptime: Math.round(process.uptime()),
      memory: { rssMB: Math.round(memUsage.rss / 1024 / 1024) },
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(healthPort, () => {
  console.log(`[TELEGRAM] Health endpoint ready on :${healthPort}/health`);
});

console.log('[TELEGRAM] Telegram bot process starting...');
start().catch((error) => {
  console.error('[TELEGRAM] FATAL: Startup failed:', error);
  process.exit(1);
});
