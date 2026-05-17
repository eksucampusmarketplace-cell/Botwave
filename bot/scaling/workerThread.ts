// bot/workerThread.ts
// Worker thread entry point. Each worker manages a subset of WhatsApp
// sessions assigned by the main thread's auto-scaler. Workers create
// their own bot instances (EvolutionBot or BotWaveBot) and run
// independent heartbeat loops.
//
// V8 Isolate Reality: this file loads its own copies of ALL imported modules.
// Module-level variables in evolutionClient.ts, BotManager.ts etc. are
// NOT shared with other workers or the main thread. Shared state flows
// through SharedArrayBuffer (flags) and postMessage (requests).

import { parentPort, workerData } from 'worker_threads';
import {
  type MainToWorkerMsg,
  type WorkerToMainMsg,
  type WorkerInitData,
  FLAG_428_ACTIVE,
  FLAG_EVOLUTION_DOWN,
  FLAG_PAUSED,
} from './workerProtocol';

// Only run as a worker thread
if (!parentPort) {
  console.error('[WT] This file must be run as a worker thread');
  process.exit(1);
}

// ─── Worker Identity ────────────────────────────────────────────────────────

const initData = workerData as WorkerInitData;
const WORKER_ID = initData.workerId;
const sharedFlags = new Int32Array(initData.sharedFlags);
const PREFIX = `[WT-${WORKER_ID}]`;

// ─── Lazy Module Imports ────────────────────────────────────────────────────
// Loaded in-isolate after parentPort check. Each worker gets its own copies.

import { initDatabase } from '../database';
import { EvolutionBot, BotWaveBot } from '../BotManager';
import { tryAcquireLock, refreshHeartbeat, refreshHeartbeatToSupabase } from './sessionCoordinator';

const USE_EVOLUTION = !!process.env.EVOLUTION_API_URL;

// ─── Session & Bot Management ───────────────────────────────────────────────

interface AssignedSession {
  sessionId: string;
  phone: string;
  state: string;
  userId: string;
}

type AnyBot = EvolutionBot | BotWaveBot;

const assignedSessions = new Map<string, AssignedSession>();
const activeBots = new Map<string, AnyBot>();
let isPaused = false;
let isShuttingDown = false;
let syncLoopHandle: ReturnType<typeof setInterval> | null = null;
let lastSyncCycleMs = 0;
let dbInitialized = false;
let syncCycleCount = 0;
const SUPABASE_SYNC_EVERY_N_CYCLES = 6; // Force Supabase heartbeat every 30s (6 * 5s)

// ─── Shared Flag Readers ────────────────────────────────────────────────────

function is428Active(): boolean {
  return Atomics.load(sharedFlags, FLAG_428_ACTIVE) === 1;
}

function isEvolutionDown(): boolean {
  return Atomics.load(sharedFlags, FLAG_EVOLUTION_DOWN) === 1;
}

function isGloballyPaused(): boolean {
  return Atomics.load(sharedFlags, FLAG_PAUSED) === 1;
}

// ─── Message Sending to Main ────────────────────────────────────────────────

function sendToMain(msg: WorkerToMainMsg): void {
  parentPort!.postMessage(msg);
}

// ─── Database Initialization ────────────────────────────────────────────────

async function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return;
  try {
    await initDatabase();
    dbInitialized = true;
    console.log(`${PREFIX} Database initialized`);
  } catch (err) {
    console.error(`${PREFIX} Database initialization failed:`, err);
    throw err;
  }
}

// ─── Bot Lifecycle ──────────────────────────────────────────────────────────

async function startBotForSession(session: AssignedSession): Promise<void> {
  if (activeBots.has(session.sessionId) || isShuttingDown) return;

  try {
    await ensureDbInitialized();

    const locked = await tryAcquireLock(session.sessionId);
    if (!locked) {
      console.log(`${PREFIX} Could not acquire lock for ${session.sessionId.slice(0, 8)}`);
      sendToMain({ type: 'session_failed', sessionId: session.sessionId, reason: 'lock_failed' });
      return;
    }

    console.log(`${PREFIX} Starting bot for ${session.sessionId.slice(0, 8)} (state=${session.state})`);

    const bot: AnyBot = USE_EVOLUTION
      ? new EvolutionBot({
          sessionId: session.sessionId,
          userId: session.userId,
          phoneNumber: session.phone,
          previousDbState: session.state,
        })
      : new BotWaveBot({
          sessionId: session.sessionId,
          userId: session.userId,
          phoneNumber: session.phone,
        });

    activeBots.set(session.sessionId, bot);

    bot.start().then(() => {
      console.log(`${PREFIX} Bot started successfully for ${session.sessionId.slice(0, 8)}`);
      sendToMain({ type: 'session_ready', sessionId: session.sessionId });
    }).catch(err => {
      console.error(`${PREFIX} Bot start failed for ${session.sessionId.slice(0, 8)}:`, err);
      activeBots.delete(session.sessionId);
      assignedSessions.delete(session.sessionId);
      sendToMain({ type: 'session_failed', sessionId: session.sessionId, reason: String(err) });
    });
  } catch (err) {
    console.error(`${PREFIX} Error in startBotForSession for ${session.sessionId.slice(0, 8)}:`, err);
    sendToMain({ type: 'session_failed', sessionId: session.sessionId, reason: String(err) });
  }
}

async function stopBotForSession(sessionId: string): Promise<void> {
  const bot = activeBots.get(sessionId);
  if (!bot) return;

  try {
    if (bot instanceof EvolutionBot) {
      await bot.stop(true); // preserve Evolution API instances
    } else {
      await bot.stop();
    }
  } catch (err) {
    console.error(`${PREFIX} Error stopping bot ${sessionId.slice(0, 8)}:`, err);
  }

  activeBots.delete(sessionId);
  assignedSessions.delete(sessionId);
}

// ─── Message Handling from Main ─────────────────────────────────────────────

parentPort.on('message', (msg: MainToWorkerMsg) => {
  switch (msg.type) {
    case 'assign_session': {
      const session: AssignedSession = {
        sessionId: msg.sessionId,
        phone: msg.phone,
        state: msg.state,
        userId: msg.userId,
      };
      assignedSessions.set(msg.sessionId, session);
      console.log(`${PREFIX} Session assigned: ${msg.sessionId.slice(0, 8)} (total: ${assignedSessions.size})`);
      startBotForSession(session).catch(err =>
        console.error(`${PREFIX} Failed to start bot after assignment:`, err)
      );
      break;
    }

    case 'unassign_session':
      console.log(`${PREFIX} Session unassigned: ${msg.sessionId.slice(0, 8)}`);
      stopBotForSession(msg.sessionId).catch(err =>
        console.error(`${PREFIX} Failed to stop bot after unassignment:`, err)
      );
      break;

    case 'pause':
      isPaused = true;
      console.log(`${PREFIX} PAUSED by main thread`);
      break;

    case 'resume':
      isPaused = false;
      console.log(`${PREFIX} RESUMED by main thread`);
      break;

    case 'report_stats':
      reportStats();
      break;

    case 'create_approved':
      console.log(`${PREFIX} Instance creation approved for ${msg.sessionId.slice(0, 8)}`);
      break;

    case 'create_queued':
      console.log(`${PREFIX} Instance creation queued for ${msg.sessionId.slice(0, 8)} (wait ${msg.waitMs}ms)`);
      break;

    case 'shutdown':
      console.log(`${PREFIX} Shutdown requested — finishing current cycle...`);
      gracefulShutdown();
      break;
  }
});

// ─── Sync Loop (Heartbeats + Health) ────────────────────────────────────────

async function runSyncCycle(): Promise<void> {
  if (isPaused || isShuttingDown || activeBots.size === 0) return;

  if (is428Active()) {
    console.log(`${PREFIX} Skipping sync — 428 cooldown active`);
    return;
  }

  if (isEvolutionDown()) {
    console.log(`${PREFIX} Skipping sync — Evolution API is down`);
    return;
  }

  if (isGloballyPaused()) {
    console.log(`${PREFIX} Skipping sync — globally paused`);
    return;
  }

  const cycleStart = Date.now();
  syncCycleCount++;

  // Every Nth cycle, force heartbeats to Supabase (not just Redis).
  // The orphan detector queries Supabase, so Redis-only heartbeats
  // cause false orphan detection and session reclamation.
  const forceSupabase = syncCycleCount % SUPABASE_SYNC_EVERY_N_CYCLES === 0;

  const heartbeatPromises: Promise<void>[] = [];
  for (const [sessionId] of activeBots) {
    const hbFn = forceSupabase ? refreshHeartbeatToSupabase : refreshHeartbeat;
    heartbeatPromises.push(
      hbFn(sessionId).catch(err =>
        console.error(`${PREFIX} Heartbeat failed for ${sessionId.slice(0, 8)}:`, err)
      )
    );
  }
  await Promise.all(heartbeatPromises);

  lastSyncCycleMs = Date.now() - cycleStart;
}

function startSyncLoop(): void {
  if (syncLoopHandle) return;

  syncLoopHandle = setInterval(async () => {
    try {
      await runSyncCycle();
    } catch (err) {
      console.error(`${PREFIX} Sync cycle error:`, err);
    }
  }, 5_000);

  console.log(`${PREFIX} Sync loop started (5s interval)`);
}

// ─── Stats Reporting ────────────────────────────────────────────────────────

function reportStats(): void {
  const memUsage = process.memoryUsage();
  sendToMain({
    type: 'worker_stats',
    workerId: WORKER_ID,
    sessionCount: activeBots.size,
    syncCycleMs: lastSyncCycleMs,
    memMB: Math.round(memUsage.rss / 1024 / 1024),
  });
}

// Report stats every 30 seconds
const statsHandle = setInterval(reportStats, 30_000);

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

async function gracefulShutdown(): Promise<void> {
  isShuttingDown = true;

  if (syncLoopHandle) {
    clearInterval(syncLoopHandle);
    syncLoopHandle = null;
  }

  clearInterval(statsHandle);

  // Stop all bots gracefully
  const stopPromises: Promise<void>[] = [];
  for (const [sessionId] of activeBots) {
    stopPromises.push(stopBotForSession(sessionId));
  }
  await Promise.allSettled(stopPromises);

  console.log(`${PREFIX} Shutdown complete — ${assignedSessions.size} session(s) will be redistributed`);
  process.exit(0);
}

// ─── Worker Ready ───────────────────────────────────────────────────────────

console.log(`${PREFIX} Worker thread started (pid=${process.pid})`);
startSyncLoop();
sendToMain({ type: 'worker_ready', workerId: WORKER_ID });
