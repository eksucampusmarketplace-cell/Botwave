/**
 * Telegram Bot Manager (Replit Edition)
 *
 * Clean Telegram-only replacement for BotManager.ts.
 * Handles only telegram_bot sessions via grammy long-polling.
 * No WhatsApp, no Baileys, no Evolution API.
 */

import { initDatabase, getSessionsNeedingBot, releasePairingLock, acquirePairingLock, logPairingEvent, updateQueuePosition } from './database';
import { TelegramBotInstance } from './telegram/manager';
import { tryAcquireLock, releaseLock, refreshHeartbeat, detectConflict } from './scaling/sessionCoordinator';

export const BOT_PLATFORM = 'telegram';

const activeBots = new Map<string, TelegramBotInstance>();
let isSyncing = false;
let lastSyncCycleDurationMs = 0;

export function getActiveSessionCount(): number {
  return activeBots.size;
}

export function getActiveBotSocket(sessionId: string): TelegramBotInstance | null {
  return activeBots.get(sessionId) ?? null;
}

export function initializeBot() {
  return {
    start: async () => {
      await initDatabase();
      console.log('[TELEGRAM] BotWave Telegram bot service started');
    },
    stop: async (_preserveInstances = false) => {
      for (const [id, bot] of activeBots) {
        await bot.stop();
        await releaseLock(id);
      }
      activeBots.clear();
    },
  };
}

export async function syncSessionsWithDb(isWorker?: boolean) {
  if (isSyncing) return;
  const syncStart = Date.now();
  isSyncing = true;
  try {
    await _syncSessionsWithDbInner(isWorker);
  } finally {
    isSyncing = false;
    lastSyncCycleDurationMs = Date.now() - syncStart;
  }
}

const MAX_CONCURRENT_PAIRING = 3;

async function _syncSessionsWithDbInner(isWorker?: boolean) {
  const SELF_URL = process.env.SELF_URL || '';
  const allSessions = await getSessionsNeedingBot(SELF_URL || undefined, isWorker);

  // Only handle telegram_bot sessions
  const sessions = allSessions.filter(s => {
    const platform = (s as any).platform || 'whatsapp';
    return platform === 'telegram_bot';
  });

  if (allSessions.length !== sessions.length) {
    console.log(`[SYNC] Platform filter (telegram): ${sessions.length}/${allSessions.length} sessions match`);
  }

  // Active-first: sort so active/connecting sessions reconnect before new pairings
  sessions.sort((a, b) => {
    const priority = (s: typeof a) => {
      if (s.state === 'active') return 0;
      if (s.state === 'connecting') return 0;
      if (s.state === 'inactive') return 1;
      if (s.state === 'pairing_sent') return 2;
      if (s.state === 'qr_pending') return 3;
      return 4;
    };
    return priority(a) - priority(b);
  });

  // Release stale pairing locks for sessions we have no active bot for
  const staleReleases: Promise<void>[] = [];
  for (const session of sessions) {
    if (!activeBots.has(session.id)) {
      staleReleases.push(releasePairingLock(session.id).catch(() => {}));
    }
  }
  if (staleReleases.length > 0) await Promise.all(staleReleases);

  let newPairingStartsThisCycle = 0;

  for (const session of sessions) {
    const bot = activeBots.get(session.id);

    if ((session.state === 'active' || session.state === 'connecting') && bot) {
      if (session.state === 'inactive') {
        const status = bot.getStatus();
        if (!status.isReady && !status.isReconnecting) {
          console.log(`[SYNC] Cleaning up dead bot for inactive session ${session.id.slice(0, 8)}`);
          await bot.stop();
          activeBots.delete(session.id);
        }
      }
      continue;
    }

    if (bot && (session.state === 'qr_pending' || session.state === 'pairing_sent')) {
      const status = bot.getStatus();
      if (!status.isReady && !status.isReconnecting && !status.isPairingSent) {
        console.log(`[SYNC] Replacing dead bot for session: ${session.id} (state: ${session.state})`);
        await bot.stop();
        activeBots.delete(session.id);
      } else {
        continue;
      }
    }

    if (!activeBots.has(session.id)) {
      const conflict = await detectConflict(session.id);
      if (conflict) {
        console.log(`[SYNC] Session ${session.id.slice(0, 8)} managed by ${conflict} - skipping`);
        continue;
      }

      const locked = await tryAcquireLock(session.id);
      if (!locked) {
        console.log(`[SYNC] Could not acquire lock for session ${session.id.slice(0, 8)}`);
        continue;
      }

      const isPairingSession = session.state === 'qr_pending' || session.state === 'pairing_sent';
      if (isPairingSession && newPairingStartsThisCycle >= MAX_CONCURRENT_PAIRING) {
        console.log(`[SYNC] Pairing limit reached - deferring session ${session.id.slice(0, 8)}`);
        await releaseLock(session.id);
        continue;
      }

      const botToken = (session as any).telegram_bot_token;
      if (!botToken) {
        console.log(`[SYNC] Telegram bot session ${session.id.slice(0, 8)} has no bot token - skipping`);
        await releaseLock(session.id);
        continue;
      }

      console.log(`[SYNC] Starting Telegram bot for session: ${session.id.slice(0, 8)} | state: ${session.state}`);
      const tgBot = new TelegramBotInstance({
        sessionId: session.id,
        userId: session.user_id,
        botToken,
        botUsername: (session as any).telegram_bot_username || '',
      });
      activeBots.set(session.id, tgBot);
      tgBot.start().catch(err => console.error(`[SYNC] Failed to start Telegram bot ${session.id.slice(0, 8)}:`, err));

      if (isPairingSession) {
        newPairingStartsThisCycle++;
        acquirePairingLock(session.id).catch(() => {});
        updateQueuePosition(session.id, null).catch(() => {});
        logPairingEvent(session.id, 'pairing_started', SELF_URL || null).catch(() => {});
      }
    }
  }

  // Stop bots for removed sessions
  for (const [id, bot] of activeBots) {
    const session = sessions.find(s => s.id === id);
    if (!session) {
      console.log(`[SYNC] Session ${id.slice(0, 8)} no longer in DB - stopping`);
      await bot.stop();
      await releaseLock(id);
      activeBots.delete(id);
      continue;
    }
  }

  // Refresh heartbeats in parallel
  const heartbeatEntries: { id: string; bot: TelegramBotInstance }[] = [];
  for (const [id] of activeBots) {
    const bot = activeBots.get(id);
    if (!bot) continue;
    const status = bot.getStatus();
    if (!status.isReady && !status.isReconnecting && !status.isPairingSent) continue;
    heartbeatEntries.push({ id, bot });
  }

  const conflictIds: string[] = [];
  await Promise.all(
    heartbeatEntries.map(async ({ id }) => {
      const reacquired = await tryAcquireLock(id);
      if (!reacquired) {
        const conflict = await detectConflict(id);
        if (conflict) conflictIds.push(id);
        return;
      }
      await refreshHeartbeat(id);
    })
  );

  for (const id of conflictIds) {
    const bot = activeBots.get(id);
    if (bot) {
      console.log(`[SYNC] Session ${id.slice(0, 8)} locked by another instance - stopping`);
      await bot.stop();
      activeBots.delete(id);
    }
  }
}
