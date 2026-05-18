// bot/autoScaler.ts
// Auto-scaling worker thread manager. Dormant by default - spawns workers
// only when scaling signals trigger. Falls back to standalone immediately
// if all workers die.

import { Worker } from 'worker_threads';
import path from 'path';
import {
  type MainToWorkerMsg,
  type WorkerToMainMsg,
  type WorkerInitData,
  SHARED_FLAGS_SIZE,
  FLAG_428_ACTIVE,
  FLAG_EVOLUTION_DOWN,
  FLAG_COOLDOWN_EXPIRES,
  FLAG_PAUSED,
} from './workerProtocol';
import {
  trigger428Cooldown,
  is428CooldownActive,
  markEvolutionDown,
  markEvolutionRecovered,
  isEvolutionHealthy,
} from '../whatsapp/evolution/client';
import { refreshHeartbeat, tryAcquireLock, untrackSession } from './sessionCoordinator';
import { getSessionsNeedingBot } from '../database';
import { stopAndRemoveBot } from '../BotManager';

// ─── Configuration ──────────────────────────────────────────────────────────

const MAX_WORKER_THREADS = parseInt(process.env.MAX_WORKER_THREADS || '40', 10);
const SCALE_THRESHOLD = parseInt(process.env.SCALE_THRESHOLD || '25', 10);
const SYNC_CYCLE_WARNING_MS = 90_000;
const LOCK_EXPIRY_MS = 180_000;

// Hysteresis: scale up at threshold, scale down at threshold * 0.5
const SCALE_DOWN_THRESHOLD_RATIO = 0.5;

// Cooldowns
const SCALE_UP_COOLDOWN_MS = 60_000;
const SCALE_DOWN_COOLDOWN_MS = 120_000;
const AUTO_SCALE_INTERVAL_MS = 30_000;

// Crash loop detection
const CRASH_LOOP_WINDOW_MS = 90_000;
const CRASH_LOOP_MAX = 3;
const CRASH_LOOP_BACKOFF_MS = 5 * 60_000;

// Rate limiter gating
const RATE_LIMIT_INTERVAL_MS = 8_000;

// ─── State ──────────────────────────────────────────────────────────────────

interface WorkerInfo {
  worker: Worker;
  id: number;
  sessions: Set<string>;
  lastStatsMs: number;
  lastSyncCycleMs: number;
  memMB: number;
  ready: boolean;
}

const workers = new Map<number, WorkerInfo>();
const sharedFlags = new SharedArrayBuffer(SHARED_FLAGS_SIZE);
const flags = new Int32Array(sharedFlags);

let autoScaleHandle: ReturnType<typeof setInterval> | null = null;
let lastScaleUpAt = 0;
let lastScaleDownAt = 0;
let lastSyncCycleDurationMs = 0;
let activeSessionCount = 0;
let isScaledMode = false;
let standaloneSyncRunning = true;

// Crash tracking per worker slot
const crashHistory = new Map<number, number[]>();
const backoffUntil = new Map<number, number>();

// Rate limiter queue (main-thread gating for createInstance)
let lastInstanceCreatedAt = 0;
interface CreateRequest {
  workerId: number;
  sessionId: string;
  resolve: () => void;
}
const createQueue: CreateRequest[] = [];
let createQueueTimer: ReturnType<typeof setTimeout> | null = null;

// Callbacks for integration with index.ts
let onStandaloneSyncStart: (() => void) | null = null;
let onStandaloneSyncStop: (() => void) | null = null;

// Track pending worker readiness for session distribution
let pendingWorkerReadyCount = 0;

// Cache session data so redistributeSessions can re-assign with full info
const sessionDataCache = new Map<string, { phone: string; state: string; userId: string }>();

// ─── Public API ─────────────────────────────────────────────────────────────

export function setStandaloneSyncCallbacks(
  onStart: () => void,
  onStop: () => void
): void {
  onStandaloneSyncStart = onStart;
  onStandaloneSyncStop = onStop;
}

export function updateScalingMetrics(syncCycleMs: number, sessionCount: number): void {
  lastSyncCycleDurationMs = syncCycleMs;
  activeSessionCount = sessionCount;
}

export function isInScaledMode(): boolean {
  return isScaledMode;
}

export function getWorkerCount(): number {
  return workers.size;
}

export function getScalingStatus(): {
  mode: string;
  workerCount: number;
  sessionCount: number;
  lastSyncCycleMs: number;
  workerDetails: { id: number; sessions: number; syncCycleMs: number; memMB: number }[];
} {
  return {
    mode: isScaledMode ? 'scaled' : 'standalone',
    workerCount: workers.size,
    sessionCount: activeSessionCount,
    lastSyncCycleMs: lastSyncCycleDurationMs,
    workerDetails: Array.from(workers.values()).map(w => ({
      id: w.id,
      sessions: w.sessions.size,
      syncCycleMs: w.lastSyncCycleMs,
      memMB: w.memMB,
    })),
  };
}

// ─── Shared Flags Management ────────────────────────────────────────────────

function updateSharedFlags(): void {
  Atomics.store(flags, FLAG_428_ACTIVE, is428CooldownActive() ? 1 : 0);
  Atomics.store(flags, FLAG_EVOLUTION_DOWN, isEvolutionHealthy() ? 0 : 1);
  const cooldownExpires = is428CooldownActive()
    ? Math.floor(Date.now() / 1000) + 60
    : 0;
  Atomics.store(flags, FLAG_COOLDOWN_EXPIRES, cooldownExpires);
}

// ─── Worker Lifecycle ───────────────────────────────────────────────────────

function getWorkerEntryPath(): string {
  // In production (compiled), use .js; in dev, use .ts via ts-node
  const ext = __filename.endsWith('.ts') ? '.ts' : '.js';
  return path.join(path.dirname(__filename), `workerThread${ext}`);
}

function spawnWorker(id: number): WorkerInfo | null {
  // Check crash loop backoff
  const backoff = backoffUntil.get(id);
  if (backoff && Date.now() < backoff) {
    console.log(`[SCALE] Worker ${id} in crash backoff until ${new Date(backoff).toISOString()} - skipping spawn`);
    return null;
  }

  const workerData: WorkerInitData = { workerId: id, sharedFlags };
  const entryPath = getWorkerEntryPath();

  console.log(`[SCALE] Spawning worker ${id} from ${entryPath}`);

  const worker = new Worker(entryPath, { workerData });

  const info: WorkerInfo = {
    worker,
    id,
    sessions: new Set(),
    lastStatsMs: Date.now(),
    lastSyncCycleMs: 0,
    memMB: 0,
    ready: false,
  };

  worker.on('message', (msg: WorkerToMainMsg) => handleWorkerMessage(id, msg));
  worker.on('error', (err) => {
    console.error(`[SCALE] Worker ${id} error:`, err);
  });
  worker.on('exit', (code) => handleWorkerExit(id, code));

  workers.set(id, info);
  return info;
}

function handleWorkerExit(workerId: number, code: number): void {
  const info = workers.get(workerId);
  const sessionCount = info?.sessions.size ?? 0;
  const sessionIds = info ? Array.from(info.sessions) : [];

  console.log(`[SCALE] Worker ${workerId} exited (code=${code}) - had ${sessionCount} session(s)`);
  workers.delete(workerId);

  if (code !== 0) {
    // Track crash for loop detection
    const history = crashHistory.get(workerId) || [];
    history.push(Date.now());
    // Keep only recent crashes
    const recent = history.filter(t => Date.now() - t < CRASH_LOOP_WINDOW_MS);
    crashHistory.set(workerId, recent);

    if (recent.length >= CRASH_LOOP_MAX) {
      console.warn(`[SCALE] Worker ${workerId} crash loop detected (${recent.length} crashes in ${CRASH_LOOP_WINDOW_MS / 1000}s) - backing off for ${CRASH_LOOP_BACKOFF_MS / 60000}min`);
      backoffUntil.set(workerId, Date.now() + CRASH_LOOP_BACKOFF_MS);
    } else {
      // Respawn immediately
      const newInfo = spawnWorker(workerId);
      if (newInfo) {
        // Redistribute crashed worker's sessions
        redistributeSessions(sessionIds, workerId);
        return;
      }
    }
  }

  // If we couldn't respawn, redistribute to other workers or fall back
  if (sessionIds.length > 0) {
    redistributeSessions(sessionIds, workerId);
  }

  // If all workers are gone, fall back to standalone
  if (workers.size === 0 && isScaledMode) {
    console.warn('[SCALE] ALL workers exited - falling back to standalone mode');
    isScaledMode = false;
    standaloneSyncRunning = true;
    onStandaloneSyncStart?.();
  }
}

function redistributeSessions(sessionIds: string[], excludeWorkerId: number): void {
  if (workers.size === 0) {
    console.log(`[SCALE] No workers available - ${sessionIds.length} session(s) will be picked up by standalone sync`);
    // Clear cached data for these sessions
    for (const sid of sessionIds) sessionDataCache.delete(sid);
    return;
  }

  for (const sessionId of sessionIds) {
    const target = getLeastLoadedWorker(excludeWorkerId);
    if (target) {
      const cached = sessionDataCache.get(sessionId);
      assignSessionToWorker(
        target,
        sessionId,
        cached?.phone || '',
        cached?.state || 'active',
        cached?.userId || '',
      );
    }
  }
}

function getLeastLoadedWorker(excludeId?: number): WorkerInfo | null {
  let best: WorkerInfo | null = null;
  for (const [id, info] of workers) {
    if (id === excludeId) continue;
    if (!info.ready) continue;
    if (!best || info.sessions.size < best.sessions.size) {
      best = info;
    }
  }
  return best;
}

function assignSessionToWorker(
  workerInfo: WorkerInfo,
  sessionId: string,
  phone: string,
  state: string,
  userId: string
): void {
  workerInfo.sessions.add(sessionId);
  sessionDataCache.set(sessionId, { phone, state, userId });
  sendToWorker(workerInfo.id, {
    type: 'assign_session',
    sessionId,
    phone,
    state,
    userId,
  });
}

function unassignSessionFromWorker(workerId: number, sessionId: string): void {
  const info = workers.get(workerId);
  if (!info) return;
  info.sessions.delete(sessionId);
  sendToWorker(workerId, { type: 'unassign_session', sessionId });
}

function sendToWorker(workerId: number, msg: MainToWorkerMsg): void {
  const info = workers.get(workerId);
  if (!info) return;
  try {
    info.worker.postMessage(msg);
  } catch (err) {
    console.error(`[SCALE] Failed to send message to worker ${workerId}:`, err);
  }
}

function sendToAllWorkers(msg: MainToWorkerMsg): void {
  for (const [id] of workers) {
    sendToWorker(id, msg);
  }
}

// ─── Message Handling ───────────────────────────────────────────────────────

function handleWorkerMessage(workerId: number, msg: WorkerToMainMsg): void {
  const info = workers.get(workerId);

  switch (msg.type) {
    case 'worker_ready':
      if (info) {
        info.ready = true;
        pendingWorkerReadyCount = Math.max(0, pendingWorkerReadyCount - 1);
        console.log(`[SCALE] Worker ${workerId} ready (pending: ${pendingWorkerReadyCount})`);
        // When all newly spawned workers are ready, distribute sessions
        if (pendingWorkerReadyCount === 0 && isScaledMode) {
          distributeSessionsToWorkers().catch(err =>
            console.error('[SCALE] Failed to distribute sessions:', err)
          );
        }
      }
      break;

    case 'heartbeat':
      // Worker reports a session heartbeat - refresh in Redis/Supabase
      refreshHeartbeat(msg.sessionId).catch(err =>
        console.error(`[SCALE] Heartbeat refresh failed for ${msg.sessionId}:`, err)
      );
      break;

    case 'session_ready':
      console.log(`[SCALE] Worker ${workerId}: session ${msg.sessionId.slice(0, 8)} is ready`);
      break;

    case 'session_failed':
      console.log(`[SCALE] Worker ${workerId}: session ${msg.sessionId.slice(0, 8)} failed - ${msg.reason}`);
      if (info) info.sessions.delete(msg.sessionId);
      break;

    case 'session_disconnected':
      console.log(`[SCALE] Worker ${workerId}: session ${msg.sessionId.slice(0, 8)} disconnected`);
      if (info) info.sessions.delete(msg.sessionId);
      break;

    case 'worker_stats':
      if (info) {
        info.lastStatsMs = Date.now();
        info.lastSyncCycleMs = msg.syncCycleMs;
        info.memMB = msg.memMB;
      }
      break;

    case 'request_create_instance':
      handleCreateInstanceRequest(workerId, msg.sessionId);
      break;

    case 'report_428':
      console.warn(`[SCALE] Worker ${workerId} reports 428 from ${msg.source}`);
      trigger428Cooldown(`worker-${workerId}:${msg.source}`);
      updateSharedFlags();
      sendToAllWorkers({ type: 'pause' });
      break;

    case 'report_evo_failure':
      markEvolutionDown();
      updateSharedFlags();
      break;

    case 'report_evo_success':
      markEvolutionRecovered();
      updateSharedFlags();
      break;
  }
}

// ─── Rate Limiter Gating ────────────────────────────────────────────────────

function handleCreateInstanceRequest(workerId: number, sessionId: string): void {
  const now = Date.now();
  const elapsed = now - lastInstanceCreatedAt;

  if (elapsed >= RATE_LIMIT_INTERVAL_MS) {
    // Approved immediately
    lastInstanceCreatedAt = now;
    sendToWorker(workerId, { type: 'create_approved', sessionId });
  } else {
    // Queue it
    const waitMs = RATE_LIMIT_INTERVAL_MS - elapsed;
    sendToWorker(workerId, { type: 'create_queued', sessionId, waitMs });

    // Schedule approval after waitMs
    createQueue.push({
      workerId,
      sessionId,
      resolve: () => {
        lastInstanceCreatedAt = Date.now();
        sendToWorker(workerId, { type: 'create_approved', sessionId });
      },
    });

    if (!createQueueTimer) {
      processCreateQueue();
    }
  }
}

function processCreateQueue(): void {
  if (createQueue.length === 0) {
    createQueueTimer = null;
    return;
  }

  const next = createQueue[0];
  const now = Date.now();
  const elapsed = now - lastInstanceCreatedAt;

  if (elapsed >= RATE_LIMIT_INTERVAL_MS) {
    createQueue.shift();
    next.resolve();
    // Process next immediately (it might also be ready)
    processCreateQueue();
  } else {
    const waitMs = RATE_LIMIT_INTERVAL_MS - elapsed;
    createQueueTimer = setTimeout(() => {
      createQueueTimer = null;
      processCreateQueue();
    }, waitMs);
  }
}

// ─── Auto-Scale Loop ────────────────────────────────────────────────────────

function autoScaleLoop(): void {
  const now = Date.now();

  // Update shared flags for workers to read
  updateSharedFlags();

  // Determine desired worker count
  let desired = 0;

  // Signal 1: Session count threshold
  if (activeSessionCount > SCALE_THRESHOLD) {
    if (activeSessionCount <= 50) desired = 3;
    else if (activeSessionCount <= 100) desired = Math.ceil(activeSessionCount / 10);
    else desired = Math.ceil(activeSessionCount / 5);
  }

  // Signal 2: Sync cycle time pressure
  if (lastSyncCycleDurationMs > SYNC_CYCLE_WARNING_MS && desired === 0) {
    desired = 3;
  }

  // Signal 3: Emergency - heartbeat expiry danger
  if (lastSyncCycleDurationMs > LOCK_EXPIRY_MS * 0.6) {
    desired = Math.max(desired, Math.ceil(activeSessionCount / 5));
    console.warn(`[SCALE] EMERGENCY: sync cycle ${lastSyncCycleDurationMs}ms approaching heartbeat expiry ${LOCK_EXPIRY_MS}ms`);
  }

  // Cap at maximum
  desired = Math.min(desired, MAX_WORKER_THREADS);

  // Hysteresis for scale-down: only scale down if below threshold * ratio
  const scaleDownThreshold = Math.floor(SCALE_THRESHOLD * SCALE_DOWN_THRESHOLD_RATIO);
  const currentWorkers = workers.size;

  if (desired > currentWorkers) {
    // Scale up
    if (now - lastScaleUpAt < SCALE_UP_COOLDOWN_MS) return;
    const toSpawn = desired - currentWorkers;
    console.log(`[SCALE] Scaling UP: ${currentWorkers} → ${desired} workers (${activeSessionCount} sessions, sync ${lastSyncCycleDurationMs}ms)`);
    scaleUp(toSpawn);
    lastScaleUpAt = now;
  } else if (desired < currentWorkers && activeSessionCount <= scaleDownThreshold && lastSyncCycleDurationMs < SYNC_CYCLE_WARNING_MS) {
    // Scale down only if clearly below threshold (hysteresis)
    if (now - lastScaleDownAt < SCALE_DOWN_COOLDOWN_MS) return;
    console.log(`[SCALE] Scaling DOWN: ${currentWorkers} → ${desired} workers (${activeSessionCount} sessions, sync ${lastSyncCycleDurationMs}ms)`);
    scaleDown(1); // Scale down one at a time
    lastScaleDownAt = now;
  }
}

function scaleUp(count: number): void {
  if (!isScaledMode && count > 0) {
    // Transitioning from standalone to scaled mode
    isScaledMode = true;
    standaloneSyncRunning = false;
    onStandaloneSyncStop?.();
    console.log('[SCALE] Entering scaled mode - standalone sync loop stopped');
  }

  // Find available worker IDs and spawn workers
  let nextId = 0;
  for (let i = 0; i < count; i++) {
    while (workers.has(nextId)) nextId++;
    const info = spawnWorker(nextId);
    if (info) pendingWorkerReadyCount++;
    nextId++;
  }
  // Session distribution happens when workers report ready (see handleWorkerMessage)
}

// ─── Session Distribution ────────────────────────────────────────────────────

async function distributeSessionsToWorkers(): Promise<void> {
  const readyWorkers = Array.from(workers.values()).filter(w => w.ready);
  if (readyWorkers.length === 0) {
    console.log('[SCALE] No ready workers - cannot distribute sessions');
    return;
  }

  // Get sessions from DB
  const sessions = await getSessionsNeedingBot();
  if (sessions.length === 0) {
    console.log('[SCALE] No sessions to distribute');
    return;
  }

  console.log(`[SCALE] Distributing ${sessions.length} session(s) across ${readyWorkers.length} worker(s)`);

  // Stop bots on main thread and hand off to workers
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    // Stop bot on main thread (preserves Evolution API instances)
    await stopAndRemoveBot(session.id);
    untrackSession(session.id);

    // Assign to worker via round-robin
    const worker = readyWorkers[i % readyWorkers.length];
    assignSessionToWorker(
      worker,
      session.id,
      session.phone_number || '',
      session.state,
      session.user_id || '',
    );

    // Stagger assignments to avoid thundering herd on Evolution API
    if (i < sessions.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`[SCALE] Distribution complete - ${sessions.length} session(s) assigned to ${readyWorkers.length} worker(s)`);
}

function scaleDown(count: number): void {
  // Shut down least loaded workers first
  const sorted = Array.from(workers.values())
    .filter(w => w.ready)
    .sort((a, b) => a.sessions.size - b.sessions.size);

  for (let i = 0; i < count && i < sorted.length; i++) {
    const w = sorted[i];
    console.log(`[SCALE] Shutting down worker ${w.id} (${w.sessions.size} sessions)`);

    // Refresh heartbeats for all sessions before handoff
    const sessionIds = Array.from(w.sessions);
    for (const sid of sessionIds) {
      refreshHeartbeat(sid).catch(() => {});
    }

    sendToWorker(w.id, { type: 'shutdown' });

    // Redistribute sessions to remaining workers
    for (const sid of sessionIds) {
      const target = getLeastLoadedWorker(w.id);
      if (target) {
        const cached = sessionDataCache.get(sid);
        assignSessionToWorker(
          target,
          sid,
          cached?.phone || '',
          cached?.state || 'active',
          cached?.userId || '',
        );
      }
    }
  }
}

// ─── Start / Stop ───────────────────────────────────────────────────────────

export function startAutoScaler(): void {
  if (autoScaleHandle) return;

  console.log(`[SCALE] Auto-scaler started (threshold=${SCALE_THRESHOLD}, max_workers=${MAX_WORKER_THREADS}, check_interval=${AUTO_SCALE_INTERVAL_MS / 1000}s)`);
  console.log(`[SCALE] Current mode: STANDALONE (dormant - 0 workers, waiting for scaling signals)`);

  autoScaleHandle = setInterval(() => {
    try {
      autoScaleLoop();
    } catch (err) {
      console.error('[SCALE] Auto-scale loop error:', err);
    }
  }, AUTO_SCALE_INTERVAL_MS);
}

export function stopAutoScaler(): void {
  if (autoScaleHandle) {
    clearInterval(autoScaleHandle);
    autoScaleHandle = null;
  }

  // Gracefully shut down all workers
  if (workers.size > 0) {
    console.log(`[SCALE] Shutting down ${workers.size} worker(s)...`);
    sendToAllWorkers({ type: 'shutdown' });
  }

  // Clear rate limiter queue
  if (createQueueTimer) {
    clearTimeout(createQueueTimer);
    createQueueTimer = null;
  }
  createQueue.length = 0;
}

export function getSharedFlags(): SharedArrayBuffer {
  return sharedFlags;
}
