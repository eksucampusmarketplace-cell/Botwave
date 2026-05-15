# BotWave Scaling Architecture

> **Status**: Planning document — not yet implemented.
> **Current mode**: Standalone (single main process handles all sessions).
> **When to implement**: When consistently at 50+ active WhatsApp sessions.

---

## Current Architecture (Standalone)

```
┌──────────────────────────────────────────────┐
│  botwave-bot (main process)                  │
│  ┌─────────────────────────────────────────┐ │
│  │  Main Thread                            │ │
│  │  - HTTP server + keep-alive             │ │
│  │  - Session sync loop (every 5s)         │ │
│  │  - Orphan recovery (every 120s)         │ │
│  │  - Heartbeat refresh                    │ │
│  │  - ALL session management               │ │
│  └─────────────────────────────────────────┘ │
│                    │                          │
│                    ▼                          │
│  ┌─────────────────────────────────────────┐ │
│  │  Evolution API (Docker container)       │ │
│  │  - All Baileys WebSocket connections    │ │
│  │  - Memory: 1.5GB limit                 │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### How the sync loop works now

The main process runs `syncSessionsWithDb()` every 5 seconds:

1. Fetches all sessions from the database
2. Sorts them: active → inactive → pairing_sent → qr_pending
3. For each session without an active bot:
   - Acquires a distributed lock
   - Creates a new bot instance (Evolution API call)
   - Waits 2-8s jitter between each session start
4. Refreshes heartbeats for all active bots

### The bottleneck at scale

Each session in the sync loop takes ~2-5s (instance creation, pairing code, DB updates,
stagger delays). At 200 sessions:

- 200 sessions × ~3s avg = **~10 minutes per full sync cycle**
- Heartbeat expiry is 180s (3 min) — sessions get detected as orphaned before the
  loop gets back to them
- Orphan recovery fires constantly, wasting cycles

### What breaks at 200 sessions

| Problem | Impact |
|---------|--------|
| Evolution API memory | 200 WebSocket connections from one container is heavy on RAM |
| WhatsApp rate limits (428) | Too many pairing code requests in parallel |
| Sync loop cycle time | Exceeds heartbeat timeout, causing false orphan detection |
| Docker container memory | Each Baileys instance holds message stores in memory |

---

## Future Architecture: Dynamic In-Process Worker Threads

> **Key principle**: The main process STILL handles sessions. Workers run INSIDE
> the same process using Node.js `worker_threads`. No separate containers, no
> network issues, no coordination bugs. This avoids the 3-worker problem from the
> old architecture.
>
> **Workers scale dynamically** — the main thread monitors session count and
> spawns/kills worker threads as needed. At 5 sessions you might have 1 worker.
> At 200 sessions you might have 200 workers (one per session). The system
> auto-scales without manual config changes.

```
┌──────────────────────────────────────────────────────────────────┐
│  botwave-bot (single process, single container)                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Main Thread (Orchestrator)                                │  │
│  │  - HTTP server + keep-alive                                │  │
│  │  - Monitors session count, spawns/kills workers as needed  │  │
│  │  - Orphan recovery, audit, monetization                    │  │
│  │  - Aggregates heartbeats from all worker threads           │  │
│  │  - Falls back to handling sessions directly if 0 workers   │  │
│  └──────┬────────┬────────┬────────┬────────┬────────────────┘  │
│         │        │        │        │        │                    │
│    ┌────▼──┐ ┌───▼───┐ ┌─▼─────┐ │    ┌───▼───┐                │
│    │ WT 1  │ │ WT 2  │ │ WT 3  │ │... │ WT N  │                │
│    │ Ses A │ │ Ses B │ │ Ses C │ │    │ Ses N │                │
│    │ loop  │ │ loop  │ │ loop  │ │    │ loop  │                │
│    └───┬───┘ └───┬───┘ └───┬───┘      └───┬───┘                │
│        │         │         │               │                    │
│        ▼         ▼         ▼               ▼                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Evolution API (shared container, scales memory with load) │  │
│  │  - All WebSocket connections via same network namespace    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### How dynamic worker threads would work

#### 1. Auto-scaling based on session count

The main thread runs a scaling loop (every 30s) that adjusts the number of
worker threads based on current load. Workers are cheap (~5-10MB each), so
scaling aggressively is safe:

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const MIN_WORKERS = 0;       // 0 = standalone mode (main handles everything)
const MAX_WORKERS = 200;     // Hard ceiling
const SESSIONS_PER_WORKER = 1; // 1:1 mapping at high scale

const workers = new Map<number, Worker>();

function getDesiredWorkerCount(sessionCount: number): number {
  if (sessionCount <= 25) return 0;   // Standalone handles up to 25 easily
  if (sessionCount <= 50) return 3;   // 3 workers for 25-50 sessions
  // Above 50: scale linearly, one worker per session batch
  return Math.min(Math.ceil(sessionCount / SESSIONS_PER_WORKER), MAX_WORKERS);
}

// Scaling loop — runs every 30s on main thread
async function autoScale() {
  const sessionCount = await getActiveSessionCount();
  const desired = getDesiredWorkerCount(sessionCount);
  const current = workers.size;

  if (desired > current) {
    // Scale up: spawn new workers
    for (let i = current; i < desired; i++) {
      const worker = new Worker('./dist/bot/bot/workerThread.js', {
        workerData: { workerId: i }
      });
      workers.set(i, worker);
      worker.on('exit', () => workers.delete(i)); // Auto-cleanup on crash
    }
    console.log(`[SCALE] Scaled UP: ${current} → ${desired} workers (${sessionCount} sessions)`);
  } else if (desired < current) {
    // Scale down: gracefully terminate excess workers
    for (let i = current - 1; i >= desired; i--) {
      const worker = workers.get(i);
      if (worker) {
        worker.postMessage({ type: 'shutdown' });
        workers.delete(i);
      }
    }
    console.log(`[SCALE] Scaled DOWN: ${current} → ${desired} workers (${sessionCount} sessions)`);
  }
}
```

#### 2. Session-to-worker assignment

Sessions are assigned to workers dynamically. When a new session appears, the
main thread picks the worker with the fewest sessions (least-loaded):

```typescript
// Main thread: assign session to least-loaded worker
function assignSession(sessionId: string): Worker | null {
  if (workers.size === 0) return null; // Standalone mode — main handles it

  let leastLoaded: Worker | null = null;
  let minLoad = Infinity;

  for (const [id, worker] of workers) {
    const load = getWorkerSessionCount(id);
    if (load < minLoad) {
      minLoad = load;
      leastLoaded = worker;
    }
  }

  if (leastLoaded) {
    leastLoaded.postMessage({ type: 'assign_session', sessionId });
  }
  return leastLoaded;
}
```

#### 3. Each worker runs its own sync loop

Each worker thread manages its assigned sessions independently. It has its own
`activeBots` Map, its own sync loop, and refreshes heartbeats for its own sessions:

```typescript
// In worker thread (workerThread.ts):
const myActiveBots = new Map<string, EvolutionBot>();

parentPort?.on('message', (msg) => {
  if (msg.type === 'assign_session') {
    startBotForSession(msg.sessionId);
  }
  if (msg.type === 'unassign_session') {
    stopBotForSession(msg.sessionId);
  }
  if (msg.type === 'shutdown') {
    gracefulShutdown();
  }
});

// Worker's own heartbeat loop
setInterval(() => {
  for (const [id, bot] of myActiveBots) {
    parentPort?.postMessage({
      type: 'heartbeat',
      sessionId: id,
      timestamp: Date.now(),
      isReady: bot.getStatus().isReady
    });
  }
}, 30_000);
```

#### 4. Heartbeat aggregation on main thread

The main thread aggregates heartbeats from all workers and feeds them into the
existing orphan recovery system:

```typescript
// Main thread: aggregate worker heartbeats
worker.on('message', (msg) => {
  if (msg.type === 'heartbeat') {
    refreshHeartbeat(msg.sessionId); // Uses existing Redis heartbeat system
  }
  if (msg.type === 'session_ready') {
    updateSessionStatus(msg.sessionId, 'active');
  }
  if (msg.type === 'session_failed') {
    // Worker reports a session failed — main can reassign to another worker
    reassignSession(msg.sessionId);
  }
});
```

#### 5. Shared Evolution API connections

Worker threads share the same network namespace (they're in the same process),
so they all talk to Evolution API at `http://evolution-api:8080`. No Docker
networking needed. The rate limiter (`waitForRateLimit`) is per-process and
shared across all threads via the same V8 heap.

---

## What Could Break with Worker Threads

These are the known risks and their mitigations. All must be addressed during
implementation.

### 1. Shared State Races

**Risk**: `activeBots` Map is currently accessed from one thread. With
worker_threads, each thread needs its OWN `activeBots`. The main thread needs a
coordination layer to avoid two workers claiming the same session.

**Mitigation**: The distributed lock system (Redis via `tryAcquireLock`) already
prevents duplicate ownership. Each worker maintains its own `activeBots` Map and
acquires a Redis lock before starting any session. The main thread's orchestrator
assigns sessions to specific workers, so two workers should never try the same
session. Redis locks are the safety net if they do.

**Remaining gap**: The in-memory `activeBots` Map has no cross-thread visibility.
If the main thread needs to know which sessions are running (e.g., for the
`/api/sessions/status` endpoint), it must aggregate from worker messages — it
cannot read worker-local Maps directly.

### 2. Evolution API Concurrency

**Risk**: Right now the sync loop is sequential — only one `createInstance` call
at a time. With N workers running in parallel, you could have N simultaneous
`createInstance` calls hitting Evolution API.

**Status**: This is actually fine. The rate limiter (`waitForRateLimit` in
`evolutionClient.ts`) is per-process — worker_threads share the same V8 heap, so
the `lastInstanceCreatedAt` timestamp and `RATE_LIMIT_INTERVAL_MS` gate are
shared across all threads. Only one instance creation can happen per 8-second
window regardless of thread count.

### 3. Heartbeat Conflicts

**Risk**: Each worker refreshes heartbeats for its own sessions. The main thread
runs orphan recovery. If a worker is slow (e.g., blocked on a long Evolution API
call), its sessions might get flagged as orphans by the main thread before the
worker gets to refresh them.

**Mitigation**: Increase `LOCK_EXPIRY_MS` from 180s to 600s+ when running with
workers. This gives workers enough time to complete their sync loops without
triggering false orphan detection. The scaling formula:

```
LOCK_EXPIRY_MS = max(180_000, sessions_per_worker * 5_000 * 2)
```

At 200 sessions with 200 workers (1 per worker), each worker handles 1 session
so the expiry stays at 180s. At 200 sessions with 10 workers (20 per worker),
each sync loop takes ~60s so expiry should be 200s+.

### 4. Memory Overhead

**Risk**: Each worker_thread has its own event loop and call stack.

**Status**: Negligible. worker_threads share the V8 heap (unlike `cluster` which
forks entirely separate processes). Each thread adds ~5-10MB overhead. Even at
200 workers, that's ~1-2GB — well within VPS capacity. The real memory consumer
is Evolution API (Baileys WebSocket connections), not the bot threads.

---

## Compared to Old 3-Worker Containers (What Broke Before)

| Problem | Old 3 containers | worker_threads (new approach) |
|---------|------------------|-------------------------------|
| Network issues | Docker networking failed between containers | No network — same process |
| Health check timeouts | Container health checks expired, sessions got stuck | No health checks needed — main monitors threads directly |
| Session stuck on dead worker | Worker container dies, sessions locked until orphan recovery | Thread dies, main respawns immediately, sessions reassigned |
| Coordination bugs | Redis locks + HTTP between containers = complex | Shared memory + `parentPort` messages = simpler |
| Deploy complexity | 4 containers to build/deploy/monitor | 1 container, workers auto-scale |
| Scaling | Fixed at 3, manual config to change | Dynamic — auto-scales 0 to 200 based on session count |
| Resource waste | 3 containers always running even with 5 sessions | 0 workers at low load, scales up only when needed |

---

## Dynamic Scaling Tiers

Workers grow and shrink automatically based on active session count:

| Active Sessions | Workers | Sessions/Worker | Sync Cycle Time | Mode |
|-----------------|---------|-----------------|-----------------|------|
| 1-25            | 0       | All on main     | ~75s max        | Standalone |
| 25-50           | 3       | ~8-17 each      | ~25-50s         | Light scaling |
| 50-100          | 10-20   | ~5-10 each      | ~15-30s         | Medium scaling |
| 100-150         | 30-50   | ~3-5 each       | ~10-15s         | Heavy scaling |
| 150-200         | 50-200  | ~1-3 each       | ~3-10s          | Max scaling |

The scaling is **fully automatic** — no env var changes needed. The main thread
monitors session count every 30s and adjusts workers accordingly. Scaling down
is graceful: the main thread tells excess workers to finish their current cycle
and then exit.

### Config changes needed

```yaml
# docker-compose.yml — botwave-bot
environment:
  # Workers auto-scale — these are just safety limits
  - MAX_WORKER_THREADS=200         # Hard ceiling (default: 200)
  - LOCK_EXPIRY_MS=600000          # Increase from 180s for larger batches
deploy:
  resources:
    limits:
      memory: 4G                    # Increase from 1G for worker thread overhead
    reservations:
      memory: 1G

# docker-compose.yml — evolution-api
deploy:
  resources:
    limits:
      memory: 4G                    # Scale with session count
    reservations:
      memory: 1G
```

---

## Migration Path

The migration is designed to be **backwards compatible** — the system always
works in standalone mode as a fallback:

1. **Phase 1** (current, 1-25 sessions): Standalone. Main thread does everything.
   Zero workers. This is what's running now and it works.

2. **Phase 2** (25-50 sessions): Auto-scaling kicks in. Main thread spawns 3
   workers. If a worker crashes, main thread respawns it. If ALL workers crash,
   main thread falls back to standalone mode automatically.

3. **Phase 3** (50-100 sessions): Workers scale to 10-20. Evolution API memory
   increased to 3GB. VPS may need upgrade to 12GB+ RAM.

4. **Phase 4** (100-200 sessions): Workers scale to 50-200. Evolution API at
   4GB. VPS at 16GB+ RAM. Consider splitting Evolution API into 2 containers
   behind a load balancer at this scale.

---

## What NOT to Do

- **DO NOT use separate Docker containers for workers.** This caused the 3-worker
  problem: network issues between containers, health check timeouts, sessions
  getting stuck when workers went down, coordination bugs across Docker networks.

- **DO NOT use `cluster` module.** Cluster forks separate processes with separate
  V8 heaps. `worker_threads` share the same V8 heap and can share memory directly
  via `SharedArrayBuffer`. Cluster would multiply memory usage unnecessarily.

- **DO NOT split Evolution API into multiple containers** before 200+ sessions.
  One Evolution API container with enough memory is simpler and avoids the
  WebSocket routing problem.

- **DO NOT set a fixed worker count.** The whole point is dynamic scaling. The
  only config is `MAX_WORKER_THREADS` as a safety ceiling.

---

## Memory Planning

Based on current observations:

| Sessions | Evolution API RAM | Bot Process RAM | Workers | VPS Total |
|----------|-------------------|-----------------|---------|-----------|
| 5-25     | 1.5 GB            | 512 MB          | 0       | 4 GB      |
| 25-50    | 2 GB              | 1 GB            | 3       | 8 GB      |
| 50-100   | 3 GB              | 1.5 GB          | 10-20   | 12 GB     |
| 100-200  | 4 GB              | 2-4 GB          | 50-200  | 16 GB     |

Each Baileys WebSocket connection uses ~20-40 MB of RAM in Evolution API
(auth state, message store, connection buffers). Each worker thread uses ~5-10MB.

---

## Resilience Features (Already Implemented)

These features are already in the codebase and handle most failure scenarios:

1. **Thundering herd backoff** (`evolutionClient.ts`): When Evolution crashes
   and recovers, reconnections are staggered through a queue (3s between each)
   for 2 minutes after recovery.

2. **428 cooldown** (`evolutionClient.ts`): When WhatsApp rate-limits any
   instance, ALL new connections pause for 60s.

3. **Circuit breaker** (`circuitBreaker.ts`): When Supabase has 5+ consecutive
   failures, all DB requests are blocked for 30s to prevent hammering.

4. **Orphan recovery** (`sessionCoordinator.ts`): Detects sessions with expired
   heartbeats and recovers them — preserves state instead of nuking.

5. **Adaptive polling** (`adaptivePoller.ts`): Polling intervals increase during
   degraded conditions to reduce load.

6. **Active-first startup**: Sync loop connects active sessions before pairing
   sessions to stabilize established connections first.

---

## Implementation Checklist (For Future Reference)

When you're ready to implement dynamic worker threads:

- [ ] Create `bot/workerThread.ts` — the entry point for each worker thread
- [ ] Add `parentPort` message protocol (assign_session, unassign_session, heartbeat, shutdown)
- [ ] Each worker gets its own `activeBots` Map — no shared mutable state
- [ ] Main thread orchestrator: auto-scale loop (every 30s), session assignment (least-loaded)
- [ ] Main thread fallback: if all workers die, revert to standalone mode
- [ ] Worker crash recovery: main detects exit, respawns, reassigns sessions
- [ ] Heartbeat aggregation: main collects heartbeats from workers, feeds to Redis
- [ ] Update `LOCK_EXPIRY_MS` to scale dynamically with sessions-per-worker
- [ ] Add `MAX_WORKER_THREADS` env var (default: 200, safety ceiling)
- [ ] Increase bot container memory limit in docker-compose (1G → 4G)
- [ ] Increase Evolution API memory to match session count
- [ ] Load test at 50 sessions, then 100, then 200
- [ ] Monitor via Portainer: per-thread CPU/memory, total process memory
- [ ] Add `/api/scaling/status` endpoint showing worker count, session distribution
