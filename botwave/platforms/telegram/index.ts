/**
 * Telegram Platform Package
 * 
 * Re-exports bot and userbot adapters, routers, and features.
 */

export { TelegramBotAdapter } from './bot/adapter';
export { TelegramUserbotAdapter } from './userbot/adapter';
export { processMessage, handleMemberJoin, handleMemberLeave } from './bot/router';
