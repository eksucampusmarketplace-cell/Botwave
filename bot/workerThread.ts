// bot/workerThread.ts
// Slim worker thread entry point. Each worker runs its own sync loop
// for a subset of sessions assigned by the main thread.
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

// Only import after parentPort check (this file should only run as a worker)
if (!parentPort) {
  console.error('[WT] This file must be run as a worker thread');
  process.exit(1);
}

// ─── Worker Identity ────────────────────────────────────────────────────────

const initData = workerData as WorkerInitData;
const WORKER_ID = initData.workerId;
const sharedFlags = new Int32Array(initData.sharedFlags);
const PREFIX = `[WT-${WORKER_ID}]`;

// ─── Assigned Sessions ──────────────────────────────────────────────────────

interface AssignedSession {
  sessionId: string;
  phone: string;
  state: string;
  userId: string;
}

const assignedSessions = new Map<string, AssignedSession>();
let isPaused = false;
let isShuttingDown = false;
let syncLoopHandle: ReturnType<typeof setInterval> | null = null;
let lastSyncCycleMs = 0;

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

// ─── Message Handling from Main ─────────────────────────────────────────────

parentPort.on('message', (msg: MainToWorkerMsg) => {
  switch (msg.type) {
    case 'assign_session':
      assignedSessions.set(msg.sessionId, {
        sessionId: msg.sessionId,
        phone: msg.phone,
        state: msg.state,
        userId: msg.userId,
      });
      console.log(`${PREFIX} Session assigned: ${msg.sessionId.slice(0, 8)} (total: ${assignedSessions.size})`);
      break;

    case 'unassign_session':
      assignedSessions.delete(msg.sessionId);
      console.log(`${PREFIX} Session unassigned: ${msg.sessionId.slice(0, 8)} (total: ${assignedSessions.size})`);
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
      // The actual instance creation happens in the sync loop
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

// ─── Sync Loop ──────────────────────────────────────────────────────────────

async function runSyncCycle(): Promise<void> {
  if (isPaused || isShuttingDown || assignedSessions.size === 0) return;

  // Check shared flags
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

  // Send heartbeats for all assigned sessions
  for (const [sessionId] of assignedSessions) {
    sendToMain({
      type: 'heartbeat',
      sessionId,
      timestamp: Date.now(),
      state: 'active',
    });
  }

  lastSyncCycleMs = Date.now() - cycleStart;
}

function startSyncLoop(): void {
  if (syncLoopHandle) return;

  // Run sync every 5 seconds (matches main thread interval)
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
    sessionCount: assignedSessions.size,
    syncCycleMs: lastSyncCycleMs,
    memMB: Math.round(memUsage.rss / 1024 / 1024),
  });
}

// Report stats every 30 seconds
const statsHandle = setInterval(reportStats, 30_000);

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function gracefulShutdown(): void {
  isShuttingDown = true;

  if (syncLoopHandle) {
    clearInterval(syncLoopHandle);
    syncLoopHandle = null;
  }

  clearInterval(statsHandle);

  console.log(`${PREFIX} Shutdown complete — ${assignedSessions.size} session(s) will be redistributed`);
  process.exit(0);
}

// ─── Worker Ready ───────────────────────────────────────────────────────────

console.log(`${PREFIX} Worker thread started (pid=${process.pid})`);
startSyncLoop();
sendToMain({ type: 'worker_ready', workerId: WORKER_ID });
