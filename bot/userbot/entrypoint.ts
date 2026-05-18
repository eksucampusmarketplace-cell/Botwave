/**
 * Isolated entrypoint for the Telegram Userbot container.
 * Runs as a standalone process — errors here do NOT affect the TG bot or WhatsApp containers.
 *
 * Pattern follows telegram-entrypoint.ts:
 * - Syncs userbot sessions from DB
 * - Starts/stops GramJS clients as sessions change
 * - Health HTTP endpoint on port 10002
 * - Heartbeat loop for session liveness
 */

import http from 'http';
import { createClient } from '@supabase/supabase-js';
import { UserbotManager } from './manager';
import type { UserbotClientConfig } from './client';

// ─── Environment ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEALTH_PORT = parseInt(process.env.USERBOT_HEALTH_PORT || '10002', 10);
const SYNC_INTERVAL = parseInt(process.env.USERBOT_SYNC_INTERVAL || '10000', 10);
const DEFAULT_API_ID = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[USERBOT] Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const manager = new UserbotManager();

// ─── Session Sync ────────────────────────────────────────────────────────────

async function syncSessions(): Promise<void> {
  try {
    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('id, user_id, credentials, state, platform')
      .eq('platform', 'telegram_userbot')
      .in('state', ['active', 'pairing_sent']);

    if (error) {
      console.error('[USERBOT] Session sync error:', error.message);
      return;
    }

    if (!sessions || sessions.length === 0) {
      // Stop any orphaned userbots
      const running = manager.getSessionIds();
      for (const id of running) {
        console.log(`[USERBOT] Stopping orphaned session ${id.slice(0, 8)}`);
        await manager.stopUserbot(id);
      }
      return;
    }

    const activeIds = new Set(sessions.map(s => s.id));

    // Stop sessions no longer in DB
    for (const id of manager.getSessionIds()) {
      if (!activeIds.has(id)) {
        console.log(`[USERBOT] Stopping removed session ${id.slice(0, 8)}`);
        await manager.stopUserbot(id);
      }
    }

    // Start new sessions
    for (const session of sessions) {
      if (manager.getStatus(session.id) !== 'stopped') continue;

      const creds = session.credentials as Record<string, string> | null;
      if (!creds?.session_string) {
        console.warn(`[USERBOT] Session ${session.id.slice(0, 8)} has no session_string, skipping`);
        continue;
      }

      const config: UserbotClientConfig = {
        sessionId: session.id,
        userId: session.user_id,
        apiId: parseInt(creds.api_id || String(DEFAULT_API_ID), 10),
        apiHash: creds.api_hash || DEFAULT_API_HASH,
        sessionString: creds.session_string,
        phoneNumber: creds.phone_number,
      };

      if (!config.apiId || !config.apiHash) {
        console.error(`[USERBOT] Session ${session.id.slice(0, 8)} missing api_id/api_hash`);
        continue;
      }

      try {
        await manager.startUserbot(config);
      } catch (err) {
        console.error(`[USERBOT] Failed to start ${session.id.slice(0, 8)}:`, err);
      }
    }
  } catch (err) {
    console.error('[USERBOT] Session sync error:', err);
  }
}

// ─── Health Server ───────────────────────────────────────────────────────────

function startHealthServer(): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'botwave-userbot',
        uptime: process.uptime(),
        sessions: manager.getCount(),
        sessionIds: manager.getSessionIds().map(id => id.slice(0, 8)),
        timestamp: new Date().toISOString(),
      }));
    } else if (req.url === '/sessions') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const statuses = manager.getSessionIds().map(id => ({
        id: id.slice(0, 8),
        status: manager.getStatus(id),
      }));
      res.end(JSON.stringify({ sessions: statuses }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[USERBOT] Health server listening on port ${HEALTH_PORT}`);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    BotWave Telegram Userbot Service        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`[USERBOT] Starting with API_ID: ${DEFAULT_API_ID ? 'configured' : 'NOT SET'}`);
  console.log(`[USERBOT] Supabase: ${SUPABASE_URL}`);

  // Start health server
  startHealthServer();

  // Start heartbeat
  manager.startHeartbeat(30_000);

  // Initial sync
  await syncSessions();

  // Periodic sync
  setInterval(syncSessions, SYNC_INTERVAL);

  console.log(`[USERBOT] Session sync running every ${SYNC_INTERVAL / 1000}s`);
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`[USERBOT] ${signal} received — shutting down...`);
  await manager.stopAll();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[USERBOT] Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[USERBOT] Unhandled rejection:', err);
});

main().catch(err => {
  console.error('[USERBOT] Fatal error:', err);
  process.exit(1);
});
