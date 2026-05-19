/**
 * WhatsApp Bot - Isolated Entrypoint
 *
 * Starts ONLY WhatsApp bot sessions via Evolution API / Baileys.
 * Connects to Redis for shared state. Skips all Telegram/Grammy logic.
 *
 * Usage: BOT_PLATFORM=whatsapp node dist/bot/bot/whatsapp-entrypoint.js
 */

import './env';
import { isMainThread } from 'worker_threads';

if (!isMainThread) {
  console.error('[WHATSAPP] whatsapp-entrypoint.ts must only run on the main thread.');
  process.exit(1);
}

// Force platform isolation before any other imports read the env
process.env.BOT_PLATFORM = 'whatsapp';

import { initializeBot, syncSessionsWithDb, getActiveBotSocket, getActiveSessionCount, getLastSyncCycleDuration } from './BotManager';
import { recoverStaleSessions, recoverStaleStandaloneSessions, getDueReminders, markReminderDelivered, getDueScheduledMessages, markScheduledMessageSent } from './database';
import { WORKER_URLS, IS_WORKER, SELF_URL, isWorkerHealthy, areAllWorkersDown } from './scaling/workerConfig';
import { cleanupOnStartup, startHeartbeatLoop, stopHeartbeatLoop, recoverOrphanedSessions, auditSessions, getInstanceId, autoRecoverNeedsReauth, cleanupStuckPairingSessions } from './scaling/sessionCoordinator';
import { startMonetizationScheduler, stopMonetizationScheduler } from './whatsapp/monetization';
import { startAutoScaler, stopAutoScaler, setStandaloneSyncCallbacks, updateScalingMetrics, isInScaledMode, getScalingStatus } from './scaling/autoScaler';
import { waitForEvolutionReady, resetEvolutionHealth, verifyEvolutionDataPersistence } from './whatsapp/evolution/client';
import { disconnectRedis } from './infrastructure/redis';
import { isCircuitOpen } from './infrastructure/circuitBreaker';
import { installShutdownHandlers, registerInterval, onShutdown, isShutdown } from './infrastructure/gracefulShutdown';
import { trackMap, startMemoryGuard, stopMemoryGuard } from './infrastructure/memoryGuard';
import { startWriteQueueReplay, stopWriteQueueReplay, getWriteQueueStats } from './infrastructure/writeQueue';
import { getPollingMultiplier, recordPollerError, recordPollerSuccess } from './infrastructure/adaptivePoller';
import { disconnectSessionCache } from './infrastructure/redisSessionCache';
import { createServer as createHttpServer } from 'http';
import { startHealthMonitor, stopHealthMonitor } from '../lib/health-monitor';
import { getCircuitStats } from './database';

const bot = initializeBot();

async function start() {
  console.log(`[WHATSAPP] Starting WhatsApp-only bot service... IS_WORKER=${IS_WORKER} WORKER_URLS=${WORKER_URLS.join(',') || 'none'} SELF_URL=${process.env.SELF_URL || 'not set'} INSTANCE=${getInstanceId()}`);

  installShutdownHandlers();
  onShutdown('heartbeat', async () => { stopHeartbeatLoop(); });
  onShutdown('monetization', async () => { stopMonetizationScheduler(); });
  onShutdown('memoryGuard', async () => { stopMemoryGuard(); });
  onShutdown('writeQueue', async () => { stopWriteQueueReplay(); });
  onShutdown('sessionCache', async () => { await disconnectSessionCache(); });
  onShutdown('redis', async () => { await disconnectRedis(); });
  onShutdown('healthMonitor', async () => { stopHealthMonitor(); });
  onShutdown('autoScaler', async () => { stopAutoScaler(); });
  onShutdown('bot', async () => { await bot.stop(true); });

  await bot.start();

  await cleanupOnStartup('whatsapp');
  startHeartbeatLoop();

  // Immediate orphan recovery on startup
  if (!IS_WORKER) {
    try {
      const recovered = await recoverOrphanedSessions('whatsapp');
      if (recovered > 0) {
        console.log(`[WHATSAPP] Immediately recovered ${recovered} orphaned session(s)`);
      }
    } catch (err) {
      console.error('[WHATSAPP] Early orphan recovery failed (non-fatal):', err);
    }
  }

  // Wait for Evolution API
  const USE_EVOLUTION = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
  if (USE_EVOLUTION) {
    console.log('[WHATSAPP] Waiting for Evolution API to become ready...');
    const ready = await waitForEvolutionReady(15, 2000);
    if (ready) {
      console.log('[WHATSAPP] Evolution API is ready');
      resetEvolutionHealth();
      const { persisted, instanceCount } = await verifyEvolutionDataPersistence();
      if (instanceCount > 0) {
        console.log(`[WHATSAPP] Evolution API has ${instanceCount} persisted instance(s)`);
      } else {
        console.warn('[WHATSAPP] Evolution API has 0 persisted instances - DATABASE_SAVE_DATA_INSTANCE may not be set');
      }
    } else {
      console.warn('[WHATSAPP] Evolution API did not become ready - sessions will retry during sync loop');
    }
  }

  // Initial sync
  console.log('[WHATSAPP] Running initial session sync...');
  await syncSessionsWithDb(IS_WORKER);
  console.log('[WHATSAPP] Initial sync complete. Polling every 5s...');

  startHealthMonitor();

  // Auto-scaler integration
  let standaloneSyncHandle: ReturnType<typeof setInterval> | null = null;

  function startStandaloneSync(): void {
    if (standaloneSyncHandle) return;
    console.log('[WHATSAPP] Starting standalone sync loop (5s)');
    standaloneSyncHandle = registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      const mult = getPollingMultiplier();
      if (mult === Infinity) return;
      try {
        await syncSessionsWithDb(IS_WORKER);
        updateScalingMetrics(getLastSyncCycleDuration(), getActiveSessionCount());
        recordPollerSuccess('sessionSync');
      } catch (error) {
        recordPollerError('sessionSync');
        console.error('[WHATSAPP] Error syncing sessions:', error);
      }
    }, 5_000));
  }

  function stopStandaloneSync(): void {
    if (standaloneSyncHandle) {
      clearInterval(standaloneSyncHandle);
      standaloneSyncHandle = null;
      console.log('[WHATSAPP] Standalone sync loop stopped (scaled mode active)');
    }
  }

  setStandaloneSyncCallbacks(startStandaloneSync, stopStandaloneSync);
  startStandaloneSync();
  startAutoScaler();

  // Stale session recovery (every 60s, main only)
  if (!IS_WORKER) {
    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await recoverStaleSessions(isWorkerHealthy);
        if (recovered > 0) {
          console.log(`[WHATSAPP] Recovered ${recovered} session(s) from dead workers`);
        }
        if (WORKER_URLS.length === 0) {
          const standaloneRecovered = await recoverStaleStandaloneSessions();
          if (standaloneRecovered > 0) {
            console.log(`[WHATSAPP] Recovered ${standaloneRecovered} stale standalone session(s)`);
          }
        }
        recordPollerSuccess('staleRecovery');
      } catch (err) {
        recordPollerError('staleRecovery');
        console.error('[WHATSAPP] Error recovering stale sessions:', err);
      }
    }, 60_000));
  }

  // Coordinator: orphan recovery + audit + auto-recovery (main only)
  if (!IS_WORKER) {
    setTimeout(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await recoverOrphanedSessions('whatsapp');
        if (recovered > 0) {
          console.log(`[WHATSAPP] Accelerated recovery: ${recovered} orphaned session(s)`);
        }
      } catch (err) {
        console.error('[WHATSAPP] Accelerated orphan recovery failed:', err);
      }
    }, 15_000);

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await recoverOrphanedSessions('whatsapp');
        if (recovered > 0) {
          console.log(`[WHATSAPP] Recovered ${recovered} orphaned session(s)`);
        }
        recordPollerSuccess('orphanRecovery');
      } catch (err) {
        recordPollerError('orphanRecovery');
        console.error('[WHATSAPP] Orphan recovery error:', err);
      }
    }, 120_000));

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        await auditSessions();
        recordPollerSuccess('audit');
      } catch (err) {
        recordPollerError('audit');
        console.error('[WHATSAPP] Audit error:', err);
      }
    }, 300_000));

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await autoRecoverNeedsReauth();
        if (recovered > 0) {
          console.log(`[WHATSAPP] Auto-recovered ${recovered} session(s) from needs_reauth`);
        }
        recordPollerSuccess('autoRecovery');
      } catch (err) {
        recordPollerError('autoRecovery');
        console.error('[WHATSAPP] Auto-recovery error:', err);
      }
    }, 300_000));

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const cleaned = await cleanupStuckPairingSessions();
        if (cleaned > 0) {
          console.log(`[WHATSAPP] Cleaned ${cleaned} stuck pairing session(s)`);
        }
      } catch (err) {
        console.error('[WHATSAPP] Stuck session cleanup error:', err);
      }
    }, 1_800_000));
  }

  // Reminder + Scheduled Message delivery (every 30s)
  registerInterval(setInterval(async () => {
    if (isShutdown() || isCircuitOpen()) return;
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
            console.error(`[WHATSAPP] Failed to deliver reminder ${reminder.id}:`, err);
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
            console.error(`[WHATSAPP] Failed to deliver scheduled message ${scheduled.id}:`, err);
          }
        }
      }
      recordPollerSuccess('reminders');
    } catch (err) {
      recordPollerError('reminders');
      console.error('[WHATSAPP] Reminder/scheduled delivery error:', err);
    }
  }, 30_000));

  // Monetization (main only)
  if (!IS_WORKER) {
    startMonetizationScheduler();
  }

  registerInterval(startWriteQueueReplay());
  registerInterval(startMemoryGuard());

  // Circuit breaker + write queue status log (every 60s)
  registerInterval(setInterval(() => {
    const stats = getCircuitStats();
    const wq = getWriteQueueStats();
    if (stats.state !== 'CLOSED' || stats.totalBlocked > 0 || wq.pending > 0) {
      console.log(`[WHATSAPP][CIRCUIT] state=${stats.state} failures=${stats.consecutiveFailures} blocked=${stats.totalBlocked} fallbacks=${stats.totalFallbacks} staleCache=${stats.staleCacheSize} inflight=${stats.inflightRequests} writeQueue=${wq.pending}`);
    }
  }, 60_000));

  // Keepalive cron
  const KEEPALIVE_INTERVAL = 60_000;
  const KEEPALIVE_TIMEOUT = 5_000;

  const keepAliveTargets: { name: string; url: string }[] = [];

  if (SELF_URL) {
    keepAliveTargets.push({ name: 'self', url: `${SELF_URL}/api/health` });
  }

  if (!IS_WORKER) {
    if (!areAllWorkersDown()) {
      for (const wUrl of WORKER_URLS) {
        keepAliveTargets.push({ name: `worker(${wUrl})`, url: `${wUrl}/api/health` });
      }
    }
    const evoUrl = process.env.EVOLUTION_API_URL;
    if (evoUrl) {
      keepAliveTargets.push({ name: 'evolution-api', url: evoUrl });
    }
  }

  if (keepAliveTargets.length > 0) {
    let evoConsecutiveFailures = 0;
    let evoRecoveryInProgress = false;

    const pingAll = async () => {
      await Promise.allSettled(
        keepAliveTargets.map(async (target) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), KEEPALIVE_TIMEOUT);
            const res = await fetch(target.url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) {
              console.warn(`[WHATSAPP][KEEPALIVE] ${target.name} (${target.url}): status=${res.status}`);
              if (target.name === 'evolution-api') evoConsecutiveFailures++;
            } else {
              if (target.name === 'evolution-api' && evoConsecutiveFailures >= 3 && !evoRecoveryInProgress) {
                evoRecoveryInProgress = true;
                console.log(`[WHATSAPP][KEEPALIVE] Evolution API recovered after ${evoConsecutiveFailures} failures - triggering re-sync`);
                evoConsecutiveFailures = 0;
                resetEvolutionHealth();
                syncSessionsWithDb(IS_WORKER).catch(err =>
                  console.error('[WHATSAPP][KEEPALIVE] Recovery sync failed:', err)
                ).finally(() => { evoRecoveryInProgress = false; });
              } else if (target.name === 'evolution-api') {
                evoConsecutiveFailures = 0;
              }
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[WHATSAPP][KEEPALIVE] ${target.name} UNREACHABLE: ${msg}`);
            if (target.name === 'evolution-api') evoConsecutiveFailures++;
          }
        }),
      );

      if (evoConsecutiveFailures >= 3 && evoConsecutiveFailures % 3 === 0) {
        console.error(`[WHATSAPP][KEEPALIVE] Evolution API unreachable for ${evoConsecutiveFailures} consecutive checks`);
      }
    };
    pingAll();
    registerInterval(setInterval(pingAll, KEEPALIVE_INTERVAL));
    console.log(`[WHATSAPP][KEEPALIVE] Pinging ${keepAliveTargets.length} target(s) every ${KEEPALIVE_INTERVAL / 1000}s`);
  }

  console.log('[WHATSAPP] All resilience modules initialized');
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
      platform: 'whatsapp',
      sessions: getActiveSessionCount(),
      uptime: Math.round(process.uptime()),
      memory: { rssMB: Math.round(memUsage.rss / 1024 / 1024) },
      timestamp: new Date().toISOString(),
      instance: process.env.SELF_URL || 'unknown',
      isWorker: process.env.IS_WORKER === 'true',
    }));
  } else if (url === '/api/scaling/status' && req.method === 'GET') {
    const status = getScalingStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  } else if (url === '/api/internal/trigger-sync' && req.method === 'POST') {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    console.log('[WHATSAPP] Trigger-sync received');
    try {
      await syncSessionsWithDb(IS_WORKER);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Sync triggered' }));
    } catch (err) {
      console.error('[WHATSAPP] Trigger-sync failed:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sync failed' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(healthPort, () => {
  console.log(`[WHATSAPP] Health endpoint ready on :${healthPort}/health`);
});

console.log('[WHATSAPP] WhatsApp bot process starting...');
start().catch((error) => {
  console.error('[WHATSAPP] FATAL: Startup failed:', error);
  process.exit(1);
});
