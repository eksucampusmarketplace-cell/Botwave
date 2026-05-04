import './env';
import { initializeBot, syncSessionsWithDb } from './BotManager';
import { recoverStaleSessions } from './database';
import { WORKER_URLS, IS_WORKER, isWorkerHealthy } from './workerConfig';

const bot = initializeBot();

async function start() {
  console.log(`[BOT] Starting bot service... IS_WORKER=${IS_WORKER} WORKER_URLS=${WORKER_URLS.join(',') || 'none'} SELF_URL=${process.env.SELF_URL || 'not set'}`);
  await bot.start();
  
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

  // Keep-alive pings: main service pings all workers every 2 minutes
  // to prevent Render free tier from spinning them down
  if (!IS_WORKER && WORKER_URLS.length > 0) {
    const pingWorkers = async () => {
      for (const url of WORKER_URLS) {
        try {
          const res = await fetch(`${url}/api/health`);
          console.log(`[KEEPALIVE] Worker ${url}: status=${res.status}`);
        } catch (err: any) {
          console.warn(`[KEEPALIVE] Worker ${url} UNREACHABLE: ${err.message}`);
        }
      }
    };
    setInterval(pingWorkers, 2 * 60 * 1000);
    console.log(`[BOT] Keeping ${WORKER_URLS.length} worker(s) alive with pings every 2min: ${WORKER_URLS.join(', ')}`);
  }
}

console.log('[BOT] Bot process starting...');
start().catch((error) => {
  console.error('[BOT] FATAL: Bot startup failed:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[BOT] Received SIGINT — shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[BOT] Received SIGTERM — shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});