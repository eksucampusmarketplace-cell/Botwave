import './env';
import { initializeBot, syncSessionsWithDb, getActiveBotSocket } from './BotManager';
import { recoverStaleSessions, recoverStaleStandaloneSessions, getDueReminders, markReminderDelivered, getDueScheduledMessages, markScheduledMessageSent, getCircuitStats } from './database';
import { WORKER_URLS, IS_WORKER, SELF_URL, isWorkerHealthy } from './workerConfig';
import { cleanupOnStartup, startHeartbeatLoop, stopHeartbeatLoop, recoverOrphanedSessions, auditSessions, getInstanceId, autoRecoverNeedsReauth } from './sessionCoordinator';
import { startMonetizationScheduler, stopMonetizationScheduler } from './monetization';
import { waitForEvolutionReady, resetEvolutionHealth, verifyEvolutionDataPersistence } from './evolutionClient';
import { disconnectRedis } from './redis';
import { isCircuitOpen } from './circuitBreaker';
import { installShutdownHandlers, registerInterval, onShutdown, isShutdown } from './gracefulShutdown';
import { trackMap, startMemoryGuard, stopMemoryGuard } from './memoryGuard';
import { startWriteQueueReplay, stopWriteQueueReplay, getWriteQueueStats } from './writeQueue';
import { getPollingMultiplier, recordPollerError, recordPollerSuccess } from './adaptivePoller';
import { disconnectSessionCache } from './redisSessionCache';
import { createServer as createHttpServer } from 'http';
import { startHealthMonitor, stopHealthMonitor } from '../lib/health-monitor';

const bot = initializeBot();

async function start() {
  console.log(`[BOT] Starting bot service... IS_WORKER=${IS_WORKER} WORKER_URLS=${WORKER_URLS.join(',') || 'none'} SELF_URL=${process.env.SELF_URL || 'not set'} INSTANCE=${getInstanceId()}`);

  // ── Install graceful shutdown before anything else ──
  installShutdownHandlers();
  onShutdown('heartbeat', async () => { stopHeartbeatLoop(); });
  onShutdown('monetization', async () => { stopMonetizationScheduler(); });
  onShutdown('memoryGuard', async () => { stopMemoryGuard(); });
  onShutdown('writeQueue', async () => { stopWriteQueueReplay(); });
  onShutdown('sessionCache', async () => { await disconnectSessionCache(); });
  onShutdown('redis', async () => { await disconnectRedis(); });
  onShutdown('healthMonitor', async () => { stopHealthMonitor(); });
  onShutdown('bot', async () => { await bot.stop(true); });

  await bot.start();

  // Coordinator: clean up stale locks from previous run, start heartbeat
  await cleanupOnStartup();
  startHeartbeatLoop();

  // Immediate orphan recovery on startup — don't wait 120s for the regular cycle.
  // This ensures active sessions from a crashed/redeployed worker are unlocked
  // and ready for reconnection BEFORE the first sync picks them up.
  if (!IS_WORKER) {
    try {
      const recovered = await recoverOrphanedSessions();
      if (recovered > 0) {
        console.log(`[STARTUP] Immediately recovered ${recovered} orphaned session(s) for fast reconnection`);
      }
    } catch (err) {
      console.error('[STARTUP] Early orphan recovery failed (non-fatal):', err);
    }
  }

  // Wait for Evolution API to be reachable before syncing sessions.
  // This prevents the cascade where 404s during loading poison the health counter.
  const USE_EVOLUTION = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
  if (USE_EVOLUTION) {
    console.log('[BOT] Waiting for Evolution API to become ready...');
    const ready = await waitForEvolutionReady(15, 2000);
    if (ready) {
      console.log('[BOT] Evolution API is ready — proceeding with session sync');
      resetEvolutionHealth();

      // Verify data persistence — warn loudly if instances won't survive restarts
      const { persisted, instanceCount } = await verifyEvolutionDataPersistence();
      if (instanceCount > 0) {
        console.log(`[BOT] Evolution API has ${instanceCount} persisted instance(s) — DATABASE_SAVE_DATA_INSTANCE=true is working`);
      } else {
        console.warn('[BOT] ⚠ Evolution API has 0 persisted instances. If you have active sessions, DATABASE_SAVE_DATA_INSTANCE may not be set to true on your Evolution API service. Sessions will be lost on Evolution API restart and users will need to re-pair.');
        console.warn('[BOT] ⚠ To fix: set DATABASE_SAVE_DATA_INSTANCE=true in your Evolution API environment variables');
      }
    } else {
      console.warn('[BOT] Evolution API did not become ready — sessions will retry during sync loop');
    }
  }

  // Initial sync
  console.log('[BOT] Running initial session sync...');
  await syncSessionsWithDb(IS_WORKER);
  console.log('[BOT] Initial sync complete. Polling every 5s...');

  // Start background health monitoring (main service only)
  startHealthMonitor();
  
  // ── Polling intervals ──
  // All intervals are registered for graceful shutdown cleanup.
  // Adaptive polling multiplier adjusts intervals during degraded conditions.
  // Base: sync 5s, recovery 60s, orphan 120s, audit 300s, reauth 180s, reminders 30s

  // Periodically sync sessions from database
  registerInterval(setInterval(async () => {
    if (isShutdown() || isCircuitOpen()) return;
    const mult = getPollingMultiplier();
    if (mult === Infinity) return;
    try {
      await syncSessionsWithDb(IS_WORKER);
      recordPollerSuccess('sessionSync');
    } catch (error) {
      recordPollerError('sessionSync');
      console.error('Error syncing sessions:', error);
    }
  }, 5_000));

  // Main service: recover sessions stuck on dead workers every 60s
  if (!IS_WORKER) {
    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        // Worker-based recovery (sessions with worker_url set)
        const recovered = await recoverStaleSessions(isWorkerHealthy);
        if (recovered > 0) {
          console.log(`[RECOVERY] Recovered ${recovered} session(s) from dead workers`);
        }

        // Standalone recovery (sessions with worker_url=null stuck without heartbeat).
        // This replaces the implicit retry that 3 workers provided: when a session
        // died on one worker, orphan recovery would move it to another. In standalone
        // mode, this loop detects stuck sessions and resets them for the sync loop.
        if (WORKER_URLS.length === 0) {
          const standaloneRecovered = await recoverStaleStandaloneSessions();
          if (standaloneRecovered > 0) {
            console.log(`[RECOVERY] Recovered ${standaloneRecovered} stale standalone session(s)`);
          }
        }

        recordPollerSuccess('staleRecovery');
      } catch (err) {
        recordPollerError('staleRecovery');
        console.error('[RECOVERY] Error recovering stale sessions:', err);
      }
    }, 60_000));
  }

  // Coordinator: orphan recovery (every 120s, main only) + audit (every 300s)
  if (!IS_WORKER) {
    // Accelerated orphan recovery 15s after startup — catches any sessions that
    // became orphaned between our startup recovery and the first sync completing.
    setTimeout(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await recoverOrphanedSessions();
        if (recovered > 0) {
          console.log(`[STARTUP] Accelerated recovery: ${recovered} orphaned session(s)`);
        }
      } catch (err) {
        console.error('[STARTUP] Accelerated orphan recovery failed:', err);
      }
    }, 15_000);

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await recoverOrphanedSessions();
        if (recovered > 0) {
          console.log(`[COORD] Recovered ${recovered} orphaned session(s)`);
        }
        recordPollerSuccess('orphanRecovery');
      } catch (err) {
        recordPollerError('orphanRecovery');
        console.error('[COORD] Orphan recovery error:', err);
      }
    }, 120_000));

    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        await auditSessions();
        recordPollerSuccess('audit');
      } catch (err) {
        recordPollerError('audit');
        console.error('[COORD] Audit error:', err);
      }
    }, 300_000));

    // Auto-recovery: retry needs_reauth sessions every 180s
    registerInterval(setInterval(async () => {
      if (isShutdown() || isCircuitOpen()) return;
      try {
        const recovered = await autoRecoverNeedsReauth();
        if (recovered > 0) {
          console.log(`[AUTO-RECOVERY] Auto-recovered ${recovered} session(s) from needs_reauth`);
        }
        recordPollerSuccess('autoRecovery');
      } catch (err) {
        recordPollerError('autoRecovery');
        console.error('[AUTO-RECOVERY] Error:', err);
      }
    }, 180_000));
  }

  // Reminder + Scheduled Message delivery loop (every 30s)
  registerInterval(setInterval(async () => {
    if (isShutdown() || isCircuitOpen()) return;
    try {
      // Deliver due reminders
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
            console.log(`[REMIND] Delivered reminder ${reminder.id} to ${reminder.chat_jid}`);
          } catch (err) {
            console.error(`[REMIND] Failed to deliver reminder ${reminder.id}:`, err);
          }
        }
      }

      // Deliver due scheduled messages
      const dueScheduled = await getDueScheduledMessages();
      for (const scheduled of dueScheduled) {
        const sock = getActiveBotSocket(scheduled.session_id);
        if (sock) {
          try {
            if (typeof sock.sendMessage === 'function') {
              await sock.sendMessage(scheduled.target_jid, { text: scheduled.message });
            }
            await markScheduledMessageSent(scheduled.id);
            console.log(`[SCHED] Delivered scheduled message ${scheduled.id} to ${scheduled.target_jid}`);
          } catch (err) {
            console.error(`[SCHED] Failed to deliver scheduled message ${scheduled.id}:`, err);
          }
        }
      }
      recordPollerSuccess('reminders');
    } catch (err) {
      recordPollerError('reminders');
      console.error('[REMIND/SCHED] Error in delivery loop:', err);
    }
  }, 30_000));

  // Monetization: dunning + trial notifications (main only, every 30min)
  if (!IS_WORKER) {
    startMonetizationScheduler();
  }

  // ── Start write queue replay ──
  registerInterval(startWriteQueueReplay());

  // ── Start memory guard ──
  registerInterval(startMemoryGuard());

  // ── Circuit breaker + write queue status log (every 60s) ──
  registerInterval(setInterval(() => {
    const stats = getCircuitStats();
    const wq = getWriteQueueStats();
    if (stats.state !== 'CLOSED' || stats.totalBlocked > 0 || wq.pending > 0) {
      console.log(`[CIRCUIT] state=${stats.state} failures=${stats.consecutiveFailures} blocked=${stats.totalBlocked} fallbacks=${stats.totalFallbacks} staleCache=${stats.staleCacheSize} inflight=${stats.inflightRequests} writeQueue=${wq.pending}`);
    }
  }, 60_000));

  // ── Keepalive cron ──
  // Main: pings self + all workers + Evolution API every 60s
  // Workers: ping only themselves every 60s
  // Uses HEAD requests to minimise response body bandwidth.
  const KEEPALIVE_INTERVAL = 60_000; // 60 seconds (was 30s)
  const KEEPALIVE_TIMEOUT = 5_000;

  const keepAliveTargets: { name: string; url: string }[] = [];

  // Every service pings itself to stay warm
  if (SELF_URL) {
    keepAliveTargets.push({ name: 'self', url: `${SELF_URL}/api/health` });
  }

  // Only main pings workers + Evolution API (saves worker bandwidth)
  if (!IS_WORKER) {
    for (const wUrl of WORKER_URLS) {
      keepAliveTargets.push({ name: `worker(${wUrl})`, url: `${wUrl}/api/health` });
    }
    const evoUrl = process.env.EVOLUTION_API_URL;
    if (evoUrl) {
      keepAliveTargets.push({ name: 'evolution-api', url: evoUrl });
    }
  }

  if (keepAliveTargets.length > 0) {
    // Track consecutive Evolution API failures for self-healing.
    // After 3+ consecutive failures, trigger readiness wait + session re-sync.
    // This replicates what workers did implicitly: if Evolution API went down,
    // each worker would independently detect it and retry connections when it
    // came back. In standalone, we must do this explicitly.
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
              console.warn(`[KEEPALIVE] ${target.name} (${target.url}): status=${res.status}`);
              if (target.name === 'evolution-api') evoConsecutiveFailures++;
            } else {
              // Evolution API came back online after failures — trigger recovery
              if (target.name === 'evolution-api' && evoConsecutiveFailures >= 3 && !evoRecoveryInProgress) {
                evoRecoveryInProgress = true;
                console.log(`[KEEPALIVE] Evolution API recovered after ${evoConsecutiveFailures} consecutive failures — triggering session re-sync`);
                evoConsecutiveFailures = 0;
                resetEvolutionHealth();
                // Run a sync cycle to reconnect all sessions to the
                // now-healthy Evolution API — don't wait for the regular 5s cycle
                syncSessionsWithDb(IS_WORKER).catch(err =>
                  console.error('[KEEPALIVE] Recovery sync failed:', err)
                ).finally(() => { evoRecoveryInProgress = false; });
              } else if (target.name === 'evolution-api') {
                evoConsecutiveFailures = 0;
              }
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[KEEPALIVE] ${target.name} UNREACHABLE: ${msg}`);
            if (target.name === 'evolution-api') evoConsecutiveFailures++;
          }
        }),
      );

      // Log when Evolution API is consistently failing
      if (evoConsecutiveFailures >= 3 && evoConsecutiveFailures % 3 === 0) {
        console.error(`[KEEPALIVE] Evolution API has been unreachable for ${evoConsecutiveFailures} consecutive checks (${evoConsecutiveFailures}min) — sessions may be disconnecting`);
      }
    };
    pingAll();
    registerInterval(setInterval(pingAll, KEEPALIVE_INTERVAL));
    console.log(`[KEEPALIVE] Pinging ${keepAliveTargets.length} target(s) every ${KEEPALIVE_INTERVAL / 1000}s: ${keepAliveTargets.map(t => t.name).join(', ')}`);
  }

  console.log('[BOT] All resilience modules initialized: gracefulShutdown, memoryGuard, writeQueue, adaptivePoller, authGuard, redisSessionCache');
}

// ── Lightweight health HTTP server for worker health checks ──
// The main web server (customServer.js) provides /api/health via Next.js,
// but workers only run this bot process. This simple server lets the
// orchestrator health-check workers without spinning up full Next.js.
const healthPort = parseInt(process.env.PORT || '10000', 10);

const healthServer = createHttpServer(async (req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/health') {
    const memUsage = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      instance: process.env.SELF_URL || 'unknown',
      isWorker: process.env.IS_WORKER === 'true',
      uptime: Math.round(process.uptime()),
      memory: { rssMB: Math.round(memUsage.rss / 1024 / 1024) },
    }));
  } else if (url === '/api/internal/trigger-sync' && req.method === 'POST') {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    console.log('[INTERNAL] Trigger-sync received — running immediate session sync');
    try {
      await syncSessionsWithDb(IS_WORKER);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Sync triggered' }));
    } catch (err) {
      console.error('[INTERNAL] Trigger-sync failed:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sync failed' }));
    }
  } else {
    console.log(`[HEALTH] 404 for ${req.method} ${req.url}`);
    res.writeHead(404);
    res.end();
  }
});

// Start health server immediately so keepalive checks work during bot startup
healthServer.listen(healthPort, () => {
  console.log(`[BOT] Health endpoint ready on :${healthPort}/api/health`);
});

console.log('[BOT] Bot process starting...');
start().catch((error) => {
  console.error('[BOT] FATAL: Bot startup failed:', error);
  process.exit(1);
});
// SIGTERM/SIGINT are now handled by gracefulShutdown.ts — no manual handlers needed
