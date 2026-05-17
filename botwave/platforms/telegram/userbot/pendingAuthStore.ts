/**
 * Shared in-memory store for pending Telegram userbot auth clients.
 * 
 * Separated from route files because Next.js does not allow
 * non-standard exports (like Maps) from API route modules.
 */

import type { TelegramClient } from 'telegram';

export const pendingClients = new Map<string, { client: TelegramClient; phoneCodeHash: string }>();
