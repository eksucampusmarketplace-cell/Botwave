import './env';
import { initializeBot, syncSessionsWithDb, getActiveBotSocket } from './BotManager';
import { recoverStaleSessions, getDueReminders, markReminderDelivered, getDueScheduledMessages, markScheduledMessageSent } from './database';
import { WORKER_URLS, IS_WORKER, SELF_URL, isWorkerHealthy } from './workerConfig';
import { cleanupOnStartup, startHeartbeatLoop, stopHeartbeatLoop, recoverOrphanedSessions, auditSessions, getInstanceId, autoRecoverNeedsReauth } from './sessionCoordinator';
import { startMonetizationScheduler, stopMonetizationScheduler } from './monetization';
import { waitForEvolutionReady, resetEvolutionHealth } from './evolutionClient';

const bot = initializeBot();

async function start() {
  console.log(`[BOT] Starting bot service... IS_WORKER=${IS_WORKER} WORKER_URLS=${WORKER_URLS.join(',') || 'none'} SELF_URL=${process.env.SELF_URL || 'not set'} INSTANCE=${getInstanceId()}`);
  await bot.start();

  // Coordinator: clean up stale locks from previous run, start heartbeat
  await cleanupOnStartup();
  startHeartbeatLoop();
  
  // Wait for Evolution API to be reachable before syncing sessions.
  // This prevents the cascade where 404s during loading poison the health counter.
  const USE_EVOLUTION = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
  if (USE_EVOLUTION) {
    console.log('[BOT] Waiting for Evolution API to become ready...');
    const ready = await waitForEvolutionReady(15, 2000);
    if (ready) {
      console.log('[BOT] Evolution API is ready — proceeding with session sync');
      resetEvolutionHealth();
    } else {
      console.warn('[BOT] Evolution API did not become ready — sessions will retry during sync loop');
    }
  }

  // Initial sync
  console.log('[BOT] Running initial session sync...');
  await syncSessionsWithDb(IS_WORKER);
  console.log('[BOT] Initial sync complete. Polling every 5s...');
  
  // Periodically sync sessions from database
  setInterval(async () => {
    try {
      await syncSessionsWithDb(IS_WORKER);
    } catch (error) {
      console.error('Error syncing sessions:', error);
    }
  }, 5000); // Every 5 seconds

  // Main service: recover sessions stuck on dead workers every 30s
  if (!IS_WORKER) {
    setInterval(async () => {
      try {
        const recovered = await recoverStaleSessions(isWorkerHealthy);
        if (recovered > 0) {
          console.log(`[RECOVERY] Recovered ${recovered} session(s) from dead workers`);
        }
      } catch (err) {
        console.error('[RECOVERY] Error recovering stale sessions:', err);
      }
    }, 30_000);
  }

  // Coordinator: orphan recovery (every 60s, main only) + audit (every 120s)
  if (!IS_WORKER) {
    setInterval(async () => {
      try {
        const recovered = await recoverOrphanedSessions();
        if (recovered > 0) {
          console.log(`[COORD] Recovered ${recovered} orphaned session(s)`);
        }
      } catch (err) {
        console.error('[COORD] Orphan recovery error:', err);
      }
    }, 60_000);

    setInterval(async () => {
      try {
        await auditSessions();
      } catch (err) {
        console.error('[COORD] Audit error:', err);
      }
    }, 120_000);

    // Auto-recovery: retry needs_reauth sessions every 90s
    setInterval(async () => {
      try {
        const recovered = await autoRecoverNeedsReauth();
        if (recovered > 0) {
          console.log(`[AUTO-RECOVERY] Auto-recovered ${recovered} session(s) from needs_reauth`);
        }
      } catch (err) {
        console.error('[AUTO-RECOVERY] Error:', err);
      }
    }, 90_000);
  }

  // Reminder + Scheduled Message delivery loop (every 15s)
  setInterval(async () => {
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
    } catch (err) {
      console.error('[REMIND/SCHED] Error in delivery loop:', err);
    }
  }, 15_000);

  // Monetization: dunning + trial notifications (main only, every 30min)
  if (!IS_WORKER) {
    startMonetizationScheduler();
  }

  // ── Keepalive cron ──
  // Main: pings self + all workers + Evolution API every 30s (~100 MB/month)
  // Workers: ping only themselves every 30s (~13 MB/month each)
  // Uses HEAD requests to minimise response body bandwidth.
  const KEEPALIVE_INTERVAL = 30_000; // 30 seconds
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
            }
          } catch (err: any) {
            console.warn(`[KEEPALIVE] ${target.name} UNREACHABLE: ${err.message}`);
          }
        }),
      );
    };
    pingAll();
    setInterval(pingAll, KEEPALIVE_INTERVAL);
    console.log(`[KEEPALIVE] Pinging ${keepAliveTargets.length} target(s) every ${KEEPALIVE_INTERVAL / 1000}s: ${keepAliveTargets.map(t => t.name).join(', ')}`);
  }
}

console.log('[BOT] Bot process starting...');
start().catch((error) => {
  console.error('[BOT] FATAL: Bot startup failed:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[BOT] Received SIGINT — shutting down gracefully (preserving Evolution API instances for reconnect)...');
  stopHeartbeatLoop();
  stopMonetizationScheduler();
  await bot.stop(true);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[BOT] Received SIGTERM — shutting down gracefully (preserving Evolution API instances for reconnect)...');
  stopHeartbeatLoop();
  stopMonetizationScheduler();
  await bot.stop(true);
  process.exit(0);
});
