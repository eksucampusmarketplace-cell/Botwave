import { initializeBot, syncSessionsWithDb } from './BotManager';

const bot = initializeBot();

async function start() {
  await bot.start();
  
  // Initial sync
  await syncSessionsWithDb();
  
  // Periodically sync sessions from database
  setInterval(async () => {
    try {
      await syncSessionsWithDb();
    } catch (error) {
      console.error('Error syncing sessions:', error);
    }
  }, 5000); // Every 5 seconds
}

start().catch((error) => {
  console.error('Bot startup failed:', error);
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