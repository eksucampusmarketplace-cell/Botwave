import './env';
import { initializeBot, syncSessionsWithDb } from './BotManager';
import { WORKER_URLS, IS_WORKER } from './workerConfig';

const bot = initializeBot();

async function start() {
  console.log('[BOT] Starting bot service...');
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

  // Keep-alive pings: main service pings all workers every 10 minutes
  // to prevent Render free tier from spinning them down
  if (!IS_WORKER && WORKER_URLS.length > 0) {
    const pingWorkers = async () => {
      for (const url of WORKER_URLS) {
        try {
          await fetch(`${url}/api/health`);
        } catch (err: any) {
          console.warn(`Worker ${url} ping failed:`, err.message);
        }
      }
    };
    setInterval(pingWorkers, 10 * 60 * 1000);
    console.log(`Keeping ${WORKER_URLS.length} worker(s) alive with pings`);
  }
}

console.log('[BOT] Bot process starting...');
start().catch((error) => {
  console.error('[BOT] FATAL: Bot startup failed:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down bot...');
  await bot.stop();
  process.exit(0);
});