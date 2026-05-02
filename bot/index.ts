import { initializeBot } from './bot/BotManager';

const bot = initializeBot();

bot.start().catch((error) => {
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