# BotWave Scaling Architecture

> **Status**: Ready to build — dormant until triggered.
> **Current mode**: Standalone (single main process handles all sessions).
> **Built-in behavior**: Workers are deployed in the code but stay dormant. The main
> thread runs everything in standalone mode until it detects scaling pressure, then
> automatically spawns workers. No manual intervention needed.

---

## Table of Contents

1. [Current Architecture (Standalone)](#current-architecture-standalone)
2. [Dormant-Until-Needed: How Workers Wake Up](#dormant-until-needed-how-workers-wake-up)
3. [Full System Architecture](#full-system-architecture)
4. [Communication Protocol (Main ↔ Workers)](#communication-protocol-main--workers)
5. [Auto-Scaling: How It Decides](#auto-scaling-how-it-decides)
6. [Scale Transitions: What Happens at Each Stage](#scale-transitions-what-happens-at-each-stage)
7. [Crash Handling](#crash-handling)
8. [Evolution API Crash Behavior](#evolution-api-crash-behavior)
9. [What Could Break with Worker Threads](#what-could-break-with-worker-threads)
10. [Compared to Old 3-Worker Containers](#compared-to-old-3-worker-containers-what-broke-before)
11. [What NOT to Do](#what-not-to-do)
12. [Memory Planning](#memory-planning)
13. [Resilience Features (Already Implemented)](#resilience-features-already-implemented)
14. [Files That Change](#files-that-change)
15. [Implementation Checklist](#implementation-checklist)

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

## Dormant-Until-Needed: How Workers Wake Up

> **Core idea**: You deploy the worker code NOW, but it does NOTHING until the
> main thread's auto-scaler detects that standalone mode can't keep up. The code
> sits dormant — zero overhead, zero behavior change — until the signal comes.

### What "dormant" means

When the bot process starts:

```
1. Main thread boots up normally (HTTP server, sync loop, everything)
2. Auto-scaler starts its monitoring loop (every 30s)
3. Auto-scaler checks: "Do I need workers?"
4. Answer is NO (5 active sessions) → does nothing
5. Main thread continues running everything in standalone mode
6. Repeat forever until conditions change
```

**At this point, worker_threads code exists in the codebase but has never been
imported or executed.** No threads are spawned. No extra memory used. No CPU
overhead. The `import { Worker } from 'worker_threads'` only runs when the
auto-scaler actually calls `spawnWorker()`.

### The signals that wake up workers

The auto-scaler watches THREE signals. ANY ONE of them can trigger worker
creation:

#### Signal 1: Session count threshold

```
IF activeSessionCount > SCALE_THRESHOLD (default: 25)
THEN spawn workers
```

This is the simplest trigger. When you have more than 25 active sessions, the
sync loop starts taking too long. Workers split the load.

#### Signal 2: Sync cycle time pressure

```
IF lastSyncCycleDurationMs > SYNC_CYCLE_WARNING_MS (default: 90_000)
THEN spawn workers
```

This catches the case where you have 20 sessions but Evolution API is slow
(high latency, timeouts). The session count is under 25, but the sync loop is
still too slow. Workers help by running multiple sync loops in parallel.

**This is the smart signal** — it triggers based on actual pressure, not just a
number. If Evolution API is fast, 25 sessions might be fine in standalone. If
Evolution API is slow, even 15 sessions might need workers.

#### Signal 3: Heartbeat expiry danger

```
IF lastSyncCycleDurationMs > (LOCK_EXPIRY_MS * 0.6)
THEN spawn workers immediately (emergency scale)
```

This is the emergency trigger. If the sync loop is taking more than 60% of the
heartbeat timeout, sessions are about to start getting falsely orphaned. Workers
are needed NOW to prevent cascading recovery loops.

### How workers go back to sleep

When the load drops, workers are gracefully shut down:

```
1. Auto-scaler sees 8 active sessions (was 30, users disconnected)
2. Desired worker count = 0 (below threshold)
3. WAIT 120s cooldown (avoid flapping if sessions come back)
4. Still 8 sessions → send 'shutdown' to all workers
5. Each worker finishes its current sync cycle (doesn't drop sessions mid-loop)
6. Workers send all session state back to main
7. Main thread resumes standalone sync loop
8. Workers exit, memory freed
9. Back to dormant state — zero workers, zero overhead
```

### The lifecycle

```
DORMANT (0 workers)                     ← You are here
    │
    │  Signal detected (sessions > 25 OR sync too slow OR heartbeat danger)
    ▼
SCALING UP (spawning workers)
    │
    │  Workers take over session batches from main
    ▼
ACTIVE (N workers running)
    │
    │  Load drops below threshold for 120s
    ▼
SCALING DOWN (draining workers)
    │
    │  Workers hand sessions back to main
    ▼
DORMANT (0 workers)                     ← Full circle, zero overhead
```

**Building it now means**: The code is deployed. The auto-scaler monitors. When
you grow to 25+ sessions (or Evolution gets slow), workers spawn automatically.
When load drops, they go away. You never have to touch it.

---

## Full System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  botwave-bot (ONE process, ONE container)                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MAIN THREAD (the boss)                                    │  │
│  │                                                            │  │
│  │  Always running:                                           │  │
│  │  ├── HTTP server (/api/health, /api/sessions/status)       │  │
│  │  ├── Auto-scaler (checks every 30s — spawn/kill workers)   │  │
│  │  ├── Heartbeat aggregator (collects from workers OR self)  │  │
│  │  ├── Orphan recovery (every 120s)                          │  │
│  │  ├── Keep-alive pings to Evolution API                     │  │
│  │  └── 428 cooldown / thundering herd detection              │  │
│  │                                                            │  │
│  │  In STANDALONE mode (0 workers):                           │  │
│  │  └── Sync loop runs directly on main thread (current code) │  │
│  │                                                            │  │
│  │  In SCALED mode (1+ workers):                              │  │
│  │  ├── Orchestrator assigns sessions to workers              │  │
│  │  ├── Main does NOT run sync loop itself                    │  │
│  │  └── Aggregates stats/heartbeats from workers              │  │
│  └──────┬────────┬────────┬────────┬────────┬────────────────┘  │
│         │        │        │        │        │                    │
│    ┌────▼──┐ ┌───▼───┐ ┌─▼─────┐ │    ┌───▼───┐                │
│    │ WT 0  │ │ WT 1  │ │ WT 2  │ │... │ WT N  │  (only exist   │
│    │ Ses A │ │ Ses B │ │ Ses C │ │    │ Ses N │   when scaled) │
│    │ Ses D │ │ Ses E │ │ Ses F │ │    │       │                │
│    │ loop  │ │ loop  │ │ loop  │ │    │ loop  │                │
│    └───┬───┘ └───┬───┘ └───┬───┘      └───┬───┘                │
│        │         │         │               │                    │
│        ▼         ▼         ▼               ▼                    │
│  SHARED (same V8 heap — zero copy):                             │
│  ├── Rate limiter (1 createInstance per 8s globally)            │
│  ├── 428 cooldown flag                                          │
│  ├── Evolution down/recovered state                             │
│  └── Reconnect queue counter                                    │
│                    │                                             │
│                    │ HTTP (Docker network)                       │
│                    ▼                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Evolution API (separate container)                        │  │
│  │  └── All Baileys WebSocket connections                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol (Main ↔ Workers)

All communication uses `parentPort.postMessage()` — instant, zero network,
zero serialization cost. These are the exact message types:

### Main → Worker messages

```typescript
// "Handle this session"
{ type: 'assign_session', sessionId: string, phone: string, state: string }

// "Stop handling this session" (reassignment or scale-down)
{ type: 'unassign_session', sessionId: string }

// "Finish current work and exit" (graceful shutdown)
{ type: 'shutdown' }

// "Stop all sync activity" (428 cooldown or Evolution down)
{ type: 'pause' }

// "Resume sync activity" (cooldown over or Evolution recovered)
{ type: 'resume' }

// "Report your stats now" (on-demand, for /api/scaling/status endpoint)
{ type: 'report_stats' }
```

### Worker → Main messages

```typescript
// Periodic: "session X is alive" (every 30s per session)
{ type: 'heartbeat', sessionId: string, timestamp: number, state: string }

// Once: "session X connected and is working"
{ type: 'session_ready', sessionId: string }

// Once: "session X failed, I can't handle it — reassign or retry"
{ type: 'session_failed', sessionId: string, reason: string }

// Once: "session X got 401/logout from WhatsApp"
{ type: 'session_disconnected', sessionId: string }

// Periodic: "my current load" (every 30s)
{
  type: 'worker_stats',
  workerId: number,
  sessionCount: number,
  syncCycleMs: number,    // How long my last sync loop took
  memMB: number           // My heap usage
}
```

### Example: Full lifecycle of a new session through workers

```
Timeline:

T+0s    DB sync: main sees new session 'abc123' (qr_pending)
T+0s    Main checks workers: WT0 has 5, WT1 has 3, WT2 has 4
T+0s    Main → WT1: { type: 'assign_session', sessionId: 'abc123', phone: '+234...' }
T+0s    WT1 receives message, adds 'abc123' to its local session list

T+1s    WT1: acquires Redis lock for abc123
T+2s    WT1: calls createInstance on Evolution API
T+3s    WT1: instance created, requests pairing code
T+7s    WT1: pairing code "ABCD1234" received, saved to DB
T+7s    WT1 → Main: { type: 'heartbeat', sessionId: 'abc123', state: 'pairing_sent' }

T+45s   User enters code on WhatsApp
T+46s   Webhook → botwave-web → DB update: state=active
T+47s   WT1's sync loop sees state=active in DB
T+47s   WT1 → Main: { type: 'session_ready', sessionId: 'abc123' }
T+47s   WT1 → Main: { type: 'heartbeat', sessionId: 'abc123', state: 'active' }

T+47s+  WT1 continues managing abc123 (heartbeats, message processing)
        Main aggregates heartbeat into Redis for orphan recovery
```

### Example: Worker crash and recovery

```
T+0s    WT1 crashes (unhandled exception in session 'xyz789')
T+0s    Main gets 'exit' event from WT1
T+0s    Main logs: "[SCALE] Worker 1 crashed (code=1) — had 4 sessions"

T+1s    Main spawns new WT1
T+1s    Main redistributes WT1's 4 sessions:
        → WT0 (least loaded): gets 2 sessions
        → WT2: gets 1 session
        → new WT1: gets 1 session
T+1s    Main → WT0: { type: 'assign_session', sessionId: 'abc' }
        Main → WT0: { type: 'assign_session', sessionId: 'def' }
        Main → WT2: { type: 'assign_session', sessionId: 'ghi' }
        Main → WT1: { type: 'assign_session', sessionId: 'xyz789' }

T+3s    All 4 sessions reconnect to their existing Evolution instances
        (instances live on Evolution API, not in the worker — they survived)
T+5s    All sessions back to state=open
        Total downtime per session: ~5 seconds
```

---

## Auto-Scaling: How It Decides

### The auto-scaler loop (runs every 30s on main thread)

```typescript
async function autoScaleLoop() {
  // ── Collect metrics ──
  const sessionCount = await getActiveSessionCount();
  const lastSyncMs = getLastSyncCycleDuration();
  const lockExpiryMs = getLockExpiryMs();
  const currentWorkers = workers.size;

  // ── Determine desired worker count ──
  let desired = 0;

  // Signal 1: Session count threshold
  if (sessionCount > SCALE_THRESHOLD) {
    if (sessionCount <= 50) desired = 3;
    else if (sessionCount <= 100) desired = Math.ceil(sessionCount / 10);
    else desired = Math.ceil(sessionCount / 5);
  }

  // Signal 2: Sync cycle time pressure (overrides session-count decision)
  if (lastSyncMs > SYNC_CYCLE_WARNING_MS && desired === 0) {
    desired = 3; // Minimum workers when under time pressure
  }

  // Signal 3: Emergency — heartbeat expiry danger
  if (lastSyncMs > lockExpiryMs * 0.6) {
    desired = Math.max(desired, Math.ceil(sessionCount / 5)); // Aggressive scale
    console.warn('[SCALE] EMERGENCY: sync cycle approaching heartbeat expiry');
  }

  // Cap at maximum
  desired = Math.min(desired, MAX_WORKER_THREADS);

  // ── Apply scaling decision ──
  if (desired > currentWorkers) {
    // Check cooldown (60s after last scale-up)
    if (Date.now() - lastScaleUpAt < SCALE_UP_COOLDOWN_MS) return;
    scaleUp(desired - currentWorkers);
  } else if (desired < currentWorkers) {
    // Check cooldown (120s after last scale-down — longer to avoid flapping)
    if (Date.now() - lastScaleDownAt < SCALE_DOWN_COOLDOWN_MS) return;
    scaleDown(currentWorkers - desired);
  }
}
```

### Scaling decisions table

| Condition | Sessions | Sync Cycle | Decision |
|-----------|----------|------------|----------|
| Normal low load | 5 | 15s | 0 workers (standalone) |
| Normal medium | 20 | 60s | 0 workers (standalone, under threshold) |
| Threshold crossed | 26 | 78s | 3 workers (session count signal) |
| Growing | 50 | N/A | 5 workers (ceil(50/10)) |
| Slow Evolution API | 15 | 95s | 3 workers (sync time signal — even though sessions < 25) |
| Emergency | 30 | 140s | 6 workers (heartbeat danger signal, aggressive) |
| High scale | 100 | N/A | 20 workers (ceil(100/5)) |
| Max scale | 200 | N/A | 40 workers (ceil(200/5), capped) |
| Dropping load | 10 (was 50) | 30s | After 120s cooldown → 0 workers |

### Scale-up cooldown prevents flapping

```
T+0s     Auto-scaler: 26 sessions → spawn 3 workers
T+30s    Auto-scaler: 28 sessions → want 3 workers (already have 3, no change)
T+60s    Auto-scaler: 35 sessions → want 3 workers (still fine)
T+90s    Auto-scaler: 52 sessions → want 6 workers (cooldown expired, scale up)
T+120s   Auto-scaler: 55 sessions → want 6 workers (already have 6, no change)
```

### Scale-down is slow and cautious

```
T+0s     Auto-scaler: 10 sessions → want 0 workers
T+0s     Start cooldown timer (120s)
T+30s    Auto-scaler: 12 sessions → still want 0, but cooldown active
T+60s    Auto-scaler: 8 sessions → still want 0, cooldown active
T+90s    Auto-scaler: 9 sessions → still want 0, cooldown active
T+120s   Auto-scaler: 8 sessions → cooldown expired
T+120s   Shut down ONE worker (not all at once)
T+150s   Shut down second worker
T+180s   Shut down last worker
T+180s   Main resumes standalone sync loop
```

Scaling down one worker at a time prevents shock — sessions are redistributed
gradually instead of all dumping back to main at once.

---

## Scale Transitions: What Happens at Each Stage

### Standalone → Workers (first time scaling up)

```
BEFORE: Main thread doing everything (current behavior)

1. Auto-scaler detects signal (sessions > 25 or sync too slow)
2. Main thread logs: "[SCALE] Scaling trigger: 28 sessions, spawning 3 workers"
3. Main spawns Worker 0, Worker 1, Worker 2
4. Main STOPS its own sync loop (sets syncLoopActive = false)
5. Main distributes all 28 sessions across 3 workers:
   - WT0: sessions [1-10] (least-loaded first)
   - WT1: sessions [11-19]
   - WT2: sessions [20-28]
6. Each worker starts its own sync loop for its batch
7. Sessions don't disconnect — Evolution instances are on Evolution API,
   workers just take over management of existing instances

AFTER: Main is orchestrator only, workers handle sync loops

Total transition time: ~2 seconds
Session downtime: 0 (no disconnects)
```

### Workers → Standalone (scaling back down)

```
BEFORE: 3 workers running, handling 10 sessions total

1. Auto-scaler detects all signals below threshold for 120s
2. Main → WT2: { type: 'shutdown' } (least loaded worker first)
3. WT2 finishes current sync cycle
4. WT2 sends session state back to main for each of its sessions
5. WT2 exits cleanly
6. Main reassigns WT2's sessions to WT0 and WT1
   ... (repeat for WT1, then WT0)
7. When last worker shuts down:
   - Main restarts its own sync loop (syncLoopActive = true)
   - Main takes over all remaining sessions directly
8. Back to standalone mode — zero workers, zero overhead

AFTER: Main doing everything again (identical to current behavior)

Total transition time: ~30-60 seconds (gradual)
Session downtime: 0 (sessions are handed off, not dropped)
```

### Adding workers mid-operation (scaling up further)

```
BEFORE: 3 workers running, 50 sessions, getting busier

1. Auto-scaler: 55 sessions → want 6 workers (have 3)
2. Main spawns Worker 3, Worker 4, Worker 5
3. Main rebalances by moving SOME sessions from overloaded workers:
   - WT0 had 18 sessions → gives 6 to WT3
   - WT1 had 17 sessions → gives 5 to WT4
   - WT2 had 20 sessions → gives 7 to WT5
4. Main → WT0: { type: 'unassign_session', sessionId: ... } (× 6)
   Main → WT3: { type: 'assign_session', sessionId: ... } (× 6)
   (repeat for WT1→WT4 and WT2→WT5)
5. New workers pick up sessions seamlessly

AFTER: 6 workers, ~9 sessions each

Rebalancing happens WITHOUT disconnecting any sessions from Evolution API.
Workers just start/stop managing the bot object locally.
```

---

## Crash Handling

### Single worker crash

```
1. Worker 2 crashes (unhandled exception, OOM, etc.)
2. Main thread receives 'exit' event immediately (< 1ms)
3. Main logs: "[SCALE] Worker 2 exited (code=1, signal=null) — had 8 sessions"
4. Main marks Worker 2's sessions as "orphaned-by-worker"
5. Main spawns replacement Worker 2 (same ID)
6. Main redistributes the 8 sessions:
   - If other workers exist: spread across them (least-loaded)
   - If no other workers: assign to new Worker 2
7. Sessions reconnect to their existing Evolution instances (~5s)
8. Main logs: "[SCALE] Worker 2 recovered, 8 sessions redistributed"
```

### Worker crash loop (same worker keeps crashing)

```
1. Worker 2 crashes
2. Main respawns Worker 2
3. Worker 2 crashes again within 30s
4. Main respawns Worker 2 (crash count = 2)
5. Worker 2 crashes AGAIN within 30s
6. Main logs: "[SCALE] Worker 2 crash loop detected (3 crashes in 90s)"
7. Main does NOT respawn Worker 2
8. Main redistributes its sessions to other healthy workers
9. Main reduces desired worker count by 1 for 5 minutes (backoff)
10. After 5 minutes, auto-scaler may decide to add a worker again
```

### ALL workers crash

```
1. All workers exit (e.g., shared dependency broke)
2. Main detects all workers gone
3. Main logs: "[SCALE] ALL workers crashed — falling back to standalone mode"
4. Main immediately restarts its own sync loop
5. Main handles all sessions directly (exactly like current behavior)
6. After 60s cooldown, auto-scaler may try spawning workers again
7. If workers crash again immediately → standalone mode stays active
8. Main never crashes from worker failures (workers are isolated threads)
```

### Main thread crash

```
1. Main process crashes (this is the same as current behavior)
2. Docker restart policy: restart=unless-stopped
3. Container restarts
4. Main boots fresh, starts in standalone mode
5. Auto-scaler kicks in after first 30s check
6. Evolution API instances survive (they're in a separate container)
7. Sessions reconnect on next sync cycle
```

---

## Evolution API Crash Behavior

### When Evolution goes down (with workers)

```
1. apiFetch detects 5 consecutive failures
2. markEvolutionDown() called (shared state — all threads see it)
3. Main sends to ALL workers: { type: 'pause' }
4. All workers stop their sync loops
5. All workers log: "[WT-N] Paused — Evolution API down"
6. Main's keep-alive loop continues polling Evolution (lightweight pings)

   ... Evolution is being restarted by Docker ...

7. Keep-alive gets first successful response
8. markEvolutionRecovered() → reconnect queue activates
9. Main sends 'resume' to workers ONE AT A TIME (staggered):
   - T+0s:  Main → WT0: { type: 'resume' }
   - T+10s: Main → WT1: { type: 'resume' }
   - T+20s: Main → WT2: { type: 'resume' }
10. Each worker's sessions reconnect with individual 3s stagger
    (existing thundering herd backoff still applies within each worker)
11. Total reconnection spread: workers × 10s + sessions × 3s

    Example: 3 workers, 30 sessions (10 each)
    - WT0 resumes at T+0s, sessions reconnect T+0s to T+30s
    - WT1 resumes at T+10s, sessions reconnect T+10s to T+40s
    - WT2 resumes at T+20s, sessions reconnect T+20s to T+50s
    - All 30 sessions reconnected over 50 seconds (vs. instant flood)
```

### Without workers (standalone — current behavior)

Evolution crash recovery uses the same thundering herd backoff already
implemented in `evolutionClient.ts`: 3s stagger per session, 2-minute window.

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

At 200 sessions with 40 workers (5 per worker), each sync loop takes ~15s so
expiry stays at 180s. At 200 sessions with 10 workers (20 per worker), each
sync loop takes ~60s so expiry should be 200s+.

### 4. Memory Overhead

**Risk**: Each worker_thread has its own event loop and call stack.

**Status**: Negligible. worker_threads share the V8 heap (unlike `cluster` which
forks entirely separate processes). Each thread adds ~5-10MB overhead. Even at
40 workers (max practical), that's ~200-400MB — well within VPS capacity. The
real memory consumer is Evolution API (Baileys WebSocket connections), not the
bot threads.

---

## Compared to Old 3-Worker Containers (What Broke Before)

| Problem | Old 3 containers | worker_threads (new approach) |
|---------|------------------|-------------------------------|
| Network issues | Docker networking failed between containers | No network — same process |
| Health check timeouts | Container health checks expired, sessions got stuck | No health checks needed — main monitors threads directly |
| Session stuck on dead worker | Worker container dies, sessions locked until orphan recovery | Thread dies, main respawns immediately, sessions reassigned |
| Coordination bugs | Redis locks + HTTP between containers = complex | Shared memory + `parentPort` messages = simpler |
| Deploy complexity | 4 containers to build/deploy/monitor | 1 container, workers auto-scale |
| Scaling | Fixed at 3, manual config to change | Dynamic — auto-scales 0 to 200 based on load signals |
| Resource waste | 3 containers always running even with 5 sessions | 0 workers at low load, scales up only when needed |
| Startup | All 3 containers boot simultaneously | Workers spawn only when needed, one at a time |
| Debugging | Logs spread across 4 containers | Single log stream with `[WT-N]` prefix |

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

- **DO NOT force workers to start.** The auto-scaler decides when workers are
  needed. If you set `FORCE_WORKERS=true` or similar, you bypass the dormant
  logic and lose the benefit of automatic scaling.

---

## Memory Planning

Based on current observations:

| Sessions | Evolution API RAM | Bot Process RAM | Workers | VPS Total |
|----------|-------------------|-----------------|---------|-----------|
| 5-25     | 1.5 GB            | 512 MB          | 0       | 4 GB      |
| 25-50    | 2 GB              | 1 GB            | 3       | 8 GB      |
| 50-100   | 3 GB              | 1.5 GB          | 5-10    | 12 GB     |
| 100-200  | 4 GB              | 2-4 GB          | 20-40   | 16 GB     |

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

## Files That Change

| File | Change | Risk |
|------|--------|------|
| `bot/workerThread.ts` | **NEW** — worker entry point, manages assigned sessions | Medium — new code |
| `bot/autoScaler.ts` | **NEW** — scaling logic, worker lifecycle, signal detection | Medium — new code |
| `bot/index.ts` | Modified — starts auto-scaler, delegates to workers when scaled | Low — wraps existing code |
| `bot/BotManager.ts` | Modified — `syncSessionsWithDb` accepts session subset from worker | Low — refactor only |
| `bot/evolutionClient.ts` | No changes — shared across threads automatically | None |
| `bot/sessionCoordinator.ts` | No changes — Redis locks work across threads | None |
| `deploy/docker-compose.yml` | Modified — increase bot memory limit, add MAX_WORKER_THREADS | Low — config only |

**Estimated effort**: 2-3 sessions to build, test, and verify.

---

## Implementation Checklist

When building the worker thread system:

### Phase 1: Core (must have)
- [ ] Create `bot/workerThread.ts` — worker entry point with own sync loop
- [ ] Create `bot/autoScaler.ts` — signal detection, worker lifecycle, scaling decisions
- [ ] Add `parentPort` message protocol (all message types listed above)
- [ ] Each worker gets its own `activeBots` Map — no shared mutable state
- [ ] Main thread orchestrator: session assignment (least-loaded strategy)
- [ ] Main thread mode switch: standalone ↔ scaled (sync loop on/off)
- [ ] Main thread fallback: if all workers die, revert to standalone mode immediately

### Phase 2: Resilience (must have)
- [ ] Worker crash recovery: detect exit, respawn, redistribute sessions
- [ ] Crash loop detection: 3 crashes in 90s → stop respawning that slot for 5min
- [ ] Heartbeat aggregation: workers → main → Redis
- [ ] `LOCK_EXPIRY_MS` auto-scales based on sessions-per-worker
- [ ] Evolution API down: main sends 'pause' to all workers
- [ ] Evolution API recovered: staggered 'resume' to workers (10s apart)
- [ ] Graceful shutdown: workers finish current cycle before exiting

### Phase 3: Observability (nice to have)
- [ ] Add `[WT-N]` prefix to all worker log lines
- [ ] Add `/api/scaling/status` endpoint (worker count, session distribution, sync times)
- [ ] `worker_stats` messages every 30s (session count, sync cycle time, memory)
- [ ] Log all scaling decisions with metrics that triggered them

### Phase 4: Config & Deploy
- [ ] Add `MAX_WORKER_THREADS` env var (default: 200, safety ceiling)
- [ ] Add `SCALE_THRESHOLD` env var (default: 25, can override)
- [ ] Increase bot container memory limit in docker-compose (1G → 4G)
- [ ] Test at 5 sessions (verify dormant — 0 workers)
- [ ] Test at 30 sessions (verify scale-up triggers)
- [ ] Test at 10 sessions after scale-up (verify scale-down)
- [ ] Test worker crash recovery (kill -9 a worker thread)
- [ ] Test Evolution API crash with workers active
