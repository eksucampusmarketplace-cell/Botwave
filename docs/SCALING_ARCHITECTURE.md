# BotWave Scaling Architecture

> **Status**: Ready to build — dormant until triggered.
> **Current mode**: Standalone (single main process handles all sessions).
> **Built-in behavior**: Workers are deployed in the code but stay dormant. The main
> thread runs everything in standalone mode until it detects scaling pressure, then
> automatically spawns workers. No manual intervention needed.

---

## Table of Contents

1. [Current Architecture (Standalone)](#current-architecture-standalone)
2. [⚠️ WAIT — Do We Even Need worker_threads?](#-wait--do-we-even-need-worker_threads)
3. [Simpler Alternative: Concurrent Sync Loop](#simpler-alternative-concurrent-sync-loop)
4. [Decision Matrix: Which Approach When](#decision-matrix-which-approach-when)
5. [Dormant-Until-Needed: How Workers Wake Up](#dormant-until-needed-how-workers-wake-up)
6. [Full System Architecture](#full-system-architecture)
7. [⚠️ CRITICAL: V8 Isolate Reality (What the Old Doc Got Wrong)](#-critical-v8-isolate-reality-what-the-old-doc-got-wrong)
8. [Communication Protocol (Main ↔ Workers)](#communication-protocol-main--workers)
9. [Auto-Scaling: How It Decides](#auto-scaling-how-it-decides)
10. [Scale Transitions: What Happens at Each Stage](#scale-transitions-what-happens-at-each-stage)
11. [Crash Handling](#crash-handling)
12. [Evolution API Crash Behavior](#evolution-api-crash-behavior)
13. [What Could Break with Worker Threads](#what-could-break-with-worker-threads)
14. [Compared to Old 3-Worker Containers](#compared-to-old-3-worker-containers-what-broke-before)
15. [What NOT to Do](#what-not-to-do)
16. [Memory Planning](#memory-planning)
17. [Resilience Features (Already Implemented)](#resilience-features-already-implemented)
18. [Files That Change](#files-that-change)
19. [Implementation Checklist](#implementation-checklist)

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

## ⚠️ WAIT — Do We Even Need worker_threads?

> **This section was added after two rounds of deep review. It questions the
> fundamental assumption of the entire architecture below. Read this FIRST.**

### The assumption we never questioned

The entire worker_threads architecture is built on this assumption:

> "The sync loop is too slow at 200 sessions because it processes sessions
> sequentially. Workers split the load across parallel threads."

**But the sync loop is slow because of `await` delays, not CPU work.** Let's
look at what actually happens for each session type:

#### Active sessions (already connected)

```
1. Check if activeBots.has(session.id)  →  YES (Map lookup, ~0ms)
2. Skip to next session                 →  continue
```

**Time per active session: ~0ms.** Active sessions with a running bot are
skipped instantly. They don't hit Evolution API. They don't do any I/O.

#### Heartbeat refresh (end of sync loop)

```
1. tryAcquireLock(id)    →  Redis call (~5ms)
2. refreshHeartbeat(id)  →  Redis call (~5ms)
```

**Time per heartbeat: ~10ms.** At 200 sessions: 200 × 10ms = **2 seconds.**

#### New/pairing sessions (the actual bottleneck)

```
1. detectConflict(id)         →  DB call (~20ms)
2. tryAcquireLock(id)         →  Redis call (~5ms)
3. new EvolutionBot(...)      →  in-memory (~0ms)
4. Jitter delay               →  await 2-8s (avg 5s)
5. Reconnect queue delay      →  await 0-78s (if Evolution just recovered)
6. bot.start()                →  createInstance call (~2-5s)
7. SESSION_STAGGER_DELAY      →  await 15s (between pairing starts)
```

**Time per NEW pairing session: ~20-25s** (dominated by `await` delays)
But: `MAX_CONCURRENT_PAIRING = 2` — only 2 new pairing starts per cycle!

### The math that changes everything

At 200 sessions with typical mix (180 active, 15 pairing_sent, 5 qr_pending):

| Phase | Sessions | Time per session | Total |
|-------|----------|-----------------|-------|
| Active sessions (skip) | 180 | ~0ms | ~0s |
| Pairing_sent (check status) | 15 | ~5ms | ~0.1s |
| New pairing (MAX 2 per cycle) | 2 | ~20s | ~40s |
| Heartbeat refresh | 200 | ~10ms | ~2s |
| **Total sync cycle** | | | **~42s** |

**42 seconds. NOT 10 minutes.** The original "200 × 3s = 10 min" estimate was
wrong because it assumed every session goes through the slow path. In reality:

- Active sessions are instant (Map.has() → skip)
- Only NEW sessions that need instance creation are slow
- `MAX_CONCURRENT_PAIRING = 2` already caps the slow path to 2 per cycle
- The 15s `SESSION_STAGGER_DELAY` is the real bottleneck, and it's intentional
  (prevents WhatsApp 428 rate limits)

### Why worker_threads don't help with the real bottleneck

The slow part of the sync loop is **intentional waiting** (`await` delays):

| Delay | Purpose | Would workers help? |
|-------|---------|-------------------|
| 2-8s jitter | Prevent thundering herd | **No** — still need to stagger globally |
| 15s stagger | Prevent WhatsApp 428 | **No** — WhatsApp rate limits are per-IP, not per-thread |
| 8s rate limit | 1 createInstance per 8s | **No** — Evolution API gets slammed if you remove this |
| 3s reconnect queue | Post-crash stagger | **No** — same reason, global limit |

**worker_threads parallelize CPU work. The sync loop has almost no CPU work.**
It's 99% I/O (Redis, DB, Evolution API calls) and intentional delays. Node.js
already handles I/O concurrently on a single thread — that's its entire design.

### The rate limiter is the hard ceiling

The rate limiter enforces 1 `createInstance` call per 8 seconds. This is a
**global** limit (per Evolution API, per IP). With workers, you'd need the
main-thread gating pattern (from the V8 Isolate section) which serializes
all createInstance calls anyway — so workers gain you NOTHING here.

```
200 new sessions × 8s rate limit = 1,600 seconds = ~27 minutes
Workers can't change this. The limit is on Evolution API / WhatsApp's end.
```

### What worker_threads WOULD help with (edge cases)

Workers genuinely help in exactly ONE scenario:

**The heartbeat refresh loop is too slow.** If `tryAcquireLock` + 
`refreshHeartbeat` takes >1s per session (Redis under load), then:
- 200 sessions × 1s = 200s heartbeat refresh
- Heartbeat timeout is 180s → sessions get falsely orphaned

This is the ONLY case where parallelizing makes sense — and even then,
you could just run heartbeats in a `Promise.all` batch instead of a `for`
loop. No worker_threads needed.

---

## Simpler Alternative: Concurrent Sync Loop

> **This is probably what you should build first.** It solves 90% of the scaling
> problem with 10% of the complexity. No worker_threads, no shared state issues,
> no V8 Isolate headaches.

### The problem restated

The sync loop processes sessions in a `for` loop with `await`. Each `await`
blocks the entire loop:

```typescript
// CURRENT: Sequential — each session blocks the next
for (const session of sessions) {
  await processSession(session);  // 0ms for active, 20s for new pairing
}
```

### The fix: Concurrent batching

```typescript
// NEW: Process sessions in concurrent batches
// Active sessions: process all at once (they're instant — just Map.has checks)
// New sessions: process with concurrency limit (respect rate limits)

const active = sessions.filter(s => activeBots.has(s.id));
const needsWork = sessions.filter(s => !activeBots.has(s.id));

// Active sessions: instant, no I/O, safe to batch
// (skip loop — they're already handled by the existing `continue` logic)

// New sessions: process up to 3 concurrently (still respects rate limiter)
await pMap(needsWork, async (session) => {
  await processNewSession(session);
}, { concurrency: 3 });

// Heartbeat refresh: batch all at once (parallel Redis calls)
await Promise.all(
  Array.from(activeBots.keys()).map(async (id) => {
    await tryAcquireLock(id);
    await refreshHeartbeat(id);
  })
);
```

### What this changes

| Metric | Current (sequential) | Concurrent sync loop | worker_threads |
|--------|---------------------|---------------------|----------------|
| Heartbeat refresh (200 sessions) | ~2s (sequential Redis) | **~50ms** (parallel Redis) | ~50ms per worker |
| New session setup | 2 per cycle, ~40s | 3 per cycle, ~25s | Same (rate limited) |
| Complexity | Simple | Small refactor | Major rewrite |
| Risk of breaking things | N/A | Low | High |
| Memory overhead | 0 | 0 | 300MB-1GB |
| Shared state issues | None | None | Many (see V8 Isolate section) |
| Implementation effort | N/A | ~1 session | 3-5 sessions |
| Lines of code changed | 0 | ~50 | ~500-1000 |

### The heartbeat fix alone buys you to 500+ sessions

The real scaling ceiling is heartbeat refresh time vs. heartbeat timeout:

```
Current (sequential):   200 sessions × 10ms = 2s     ✅ Fine
                        500 sessions × 10ms = 5s     ✅ Fine
                       1000 sessions × 10ms = 10s    ✅ Fine
                       5000 sessions × 10ms = 50s    ⚠️ Getting close to 180s

With Promise.all:       200 sessions = ~50ms          ✅ 
                       1000 sessions = ~200ms         ✅
                       5000 sessions = ~500ms         ✅
```

By batching heartbeat refreshes with `Promise.all`, a single Node.js process
can handle **thousands** of sessions without heartbeat timeout issues.

### What you still can't fix without workers

The only remaining bottleneck is the rate-limited instance creation: 1 new
instance per 8 seconds, 2 pairing sessions per cycle, 15s stagger between
them. At 200 pending sessions, it takes ~27 minutes to pair them all.

But this isn't a "sync loop too slow" problem — it's a "WhatsApp doesn't let
you connect 200 sessions at once" problem. Workers don't fix it.

---

## Decision Matrix: Which Approach When

| Situation | Recommended | Why |
|-----------|-------------|-----|
| 5-50 sessions | Current code (no changes) | Sync loop handles this fine |
| 50-200 sessions, heartbeats timing out | **Concurrent sync loop** | Batch `Promise.all` for heartbeats, done in 1 session |
| 200-500 sessions, sync loop CPU is maxed | Concurrent sync loop + optimize DB queries | Still single-thread, just smarter I/O batching |
| 500+ sessions, single Node.js process genuinely can't keep up | **worker_threads** (the architecture below) | Only at this point does the complexity pay off |
| 200+ NEW sessions pairing simultaneously | Nothing helps — WhatsApp rate limits | This is a WhatsApp constraint, not a BotWave one |

### Recommended build order

1. **Now**: Do nothing. 5-25 sessions works fine.
2. **At 50+ sessions**: Implement concurrent sync loop (~50 lines of code change)
3. **At 500+ sessions**: If the concurrent sync loop isn't enough, THEN build
   the worker_threads architecture below.

The worker_threads architecture is still the right design for extreme scale.
But it's the **third step**, not the first.

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
│  SHARED STATE (managed by main thread, NOT shared memory):       │
│  ├── Rate limiter gate — workers ask main before createInstance  │
│  ├── 428 cooldown flag — main broadcasts pause/resume to workers │
│  ├── Evolution down/recovered — main detects, tells workers      │
│  └── Reconnect queue — main controls slot assignment             │
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

## ⚠️ CRITICAL: V8 Isolate Reality (What the Old Doc Got Wrong)

> **The previous version of this doc claimed worker_threads share the V8 heap.
> THIS IS WRONG.** Each worker thread gets its own V8 Isolate with its own
> heap, its own garbage collector, and its own module-level variables. This
> changes the entire design of shared state.

### What "separate V8 Isolate" means in practice

When you `new Worker('./workerThread.js')`, Node.js creates a brand new V8
isolate. That worker loads all the same modules fresh — its own copy of
`evolutionClient.ts`, its own copy of `BotManager.ts`, etc. Every module-level
variable (`let consecutiveFailures = 0`, `let global428CooldownUntil = 0`,
`let evolutionWasDown = false`, `let lastInstanceCreatedAt = 0`) is a separate
copy per worker.

**This means the following things DO NOT work as previously described:**

| What we said was shared | Reality | Consequence |
|------------------------|---------|-------------|
| Rate limiter (`lastInstanceCreatedAt`) | Each worker has its own copy | 3 workers could fire 3 `createInstance` calls simultaneously |
| 428 cooldown (`global428CooldownUntil`) | Each worker has its own copy | Worker 0 gets a 428, workers 1-2 don't know and keep hammering |
| Evolution down flag (`evolutionWasDown`) | Each worker has its own copy | Worker 0 detects Evolution down, workers 1-2 keep trying |
| Reconnect queue counter | Each worker has its own copy | Stagger breaks — all workers start at slot 0 |
| `consecutiveFailures` | Each worker has its own copy | Each worker independently counts to 5, slower detection |

### The fix: Main Thread as the Single Source of Truth

All shared state MUST flow through the main thread via `postMessage`. Workers
don't make global decisions — they ask the main thread.

```
OLD (BROKEN) DESIGN:
  Worker 0: calls createInstance → checks its own lastInstanceCreatedAt → proceeds
  Worker 1: calls createInstance → checks its own lastInstanceCreatedAt → proceeds
  Worker 2: calls createInstance → checks its own lastInstanceCreatedAt → proceeds
  Result: 3 simultaneous createInstance calls, Evolution gets slammed

NEW (CORRECT) DESIGN:
  Worker 0: sends { type: 'request_create_instance', sessionId } to main
  Main: checks global rate limiter → approved → sends { type: 'create_approved' }
  Worker 0: proceeds with createInstance
  Worker 1: sends { type: 'request_create_instance', sessionId } to main
  Main: rate limiter says wait 6s → sends { type: 'create_queued', waitMs: 6000 }
  Worker 1: waits 6s, then creates
```

### New message types needed (added to protocol below)

```typescript
// Worker → Main: "I need to create an instance"
{ type: 'request_create_instance', sessionId: string }

// Main → Worker: "Go ahead" or "Wait"
{ type: 'create_approved', sessionId: string }
{ type: 'create_queued', sessionId: string, waitMs: number }

// Worker → Main: "I saw a 428 from WhatsApp"
{ type: 'report_428', source: string }

// Main → ALL Workers: "428 detected, everyone stop"
// (reuses existing 'pause' message)

// Worker → Main: "Evolution API returned 5xx / ECONNREFUSED"
{ type: 'report_evo_failure' }

// Worker → Main: "Evolution API responded OK after failures"
{ type: 'report_evo_success' }
```

### What CAN be shared via SharedArrayBuffer

Only raw bytes can be shared — not JS objects. For simple flags and counters,
`SharedArrayBuffer` + `Atomics` works:

```typescript
// Main thread creates shared flags
const sharedFlags = new SharedArrayBuffer(16); // 4 Int32 slots
const flags = new Int32Array(sharedFlags);
// flags[0] = is428CooldownActive (0 or 1)
// flags[1] = isEvolutionDown (0 or 1)
// flags[2] = cooldownExpiresAt (unix timestamp in seconds)
// flags[3] = reserved

// Pass to each worker via workerData
const worker = new Worker('./workerThread.js', {
  workerData: { sharedFlags }
});

// Worker reads flags directly (no postMessage needed)
const is428Active = Atomics.load(flags, 0) === 1;

// Main writes flags
Atomics.store(flags, 0, 1); // All workers see it immediately
```

**However**, the rate limiter queue (which needs request/response semantics)
MUST use `postMessage` — you can't do request/response with shared memory
alone.

### Memory reality

Each worker thread loads its own copy of all modules:
- V8 isolate overhead: ~10-30MB per worker (not 5-10MB as previously stated)
- Module loading: each worker loads BotManager, evolutionClient, handlers, etc.
- Estimated per-worker memory: **30-50MB** (isolate + modules + activeBots)

At 40 workers: 40 × 40MB = **~1.6GB** just for worker threads
At 10 workers: 10 × 40MB = **~400MB**

This is still manageable on a 16GB VPS, but it's 3-5x more than previously
estimated. The memory planning table has been updated below.

---

## Communication Protocol (Main ↔ Workers)

All communication uses `parentPort.postMessage()`. Messages are serialized via
V8's Structured Clone Algorithm — fast for small objects (our messages are tiny
JSON-like objects, well under 1KB, so serialization cost is negligible). These
are the exact message types:

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

// Rate limiter responses (see V8 Isolate section above)
{ type: 'create_approved', sessionId: string }
{ type: 'create_queued', sessionId: string, waitMs: number }
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

// Rate limiter request (worker asks main before creating an instance)
{ type: 'request_create_instance', sessionId: string }

// Failure reporting (so main can track global health)
{ type: 'report_428', source: string }      // WhatsApp rate limited this worker
{ type: 'report_evo_failure' }               // Evolution API returned 5xx/timeout
{ type: 'report_evo_success' }               // Evolution API responded OK
```

### Example: Full lifecycle of a new session through workers

```
Timeline:

T+0s    DB sync: main sees new session 'abc123' (qr_pending)
T+0s    Main checks workers: WT0 has 5, WT1 has 3, WT2 has 4
T+0s    Main → WT1: { type: 'assign_session', sessionId: 'abc123', phone: '+234...' }
T+0s    WT1 receives message, adds 'abc123' to its local session list

T+1s    WT1: acquires Redis lock for abc123
T+1s    WT1 → Main: { type: 'request_create_instance', sessionId: 'abc123' }
T+1s    Main: rate limiter clear → Main → WT1: { type: 'create_approved' }
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

**Status**: ⚠️ **NOT automatically safe.** The rate limiter (`waitForRateLimit`
in `evolutionClient.ts`) uses a module-level `lastInstanceCreatedAt` variable.
Since each worker thread gets its own V8 Isolate, each has its own copy of this
variable. Without the fix described in the V8 Isolate section above, 3 workers
could fire 3 `createInstance` calls simultaneously.

**Fix**: Workers MUST request permission from main thread before creating
instances. Main thread holds the single rate limiter and serializes all
`createInstance` calls across workers. See `request_create_instance` /
`create_approved` messages in the communication protocol.

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

**Risk**: Each worker_thread has its own V8 Isolate, event loop, and full copy
of all loaded modules.

**Status**: ⚠️ **More significant than previously stated.** worker_threads do
NOT share the V8 heap — each gets its own Isolate. Each worker loads its own
copy of BotManager, evolutionClient, all handlers, etc. Estimated per-worker
memory is **30-50MB** (not 5-10MB as previously stated).

- At 10 workers: ~300-500MB
- At 20 workers: ~600MB-1GB
- At 40 workers: ~1.2-2GB

Still manageable on a 16GB VPS, but this is a real cost. The practical max is
closer to **20-30 workers** before the bot process itself becomes a significant
memory consumer alongside Evolution API.

**Mitigation**: Each worker should load ONLY the modules it needs (a slim
`workerThread.ts` that imports just `syncSessionsWithDb` and `evolutionClient`,
not the entire bot codebase). This could cut per-worker memory to ~15-25MB.

### 5. Session Handoff During Scale Transitions

**Risk**: When transitioning from standalone to workers (or vice versa), there's
a window where bot objects need to be transferred. But you can't transfer a Bot
object across threads — it has event listeners, timers, WebSocket references,
etc. that are bound to a specific event loop.

**Impact**: During the transition, the worker creates NEW bot objects for its
assigned sessions. The old bot objects on main are destroyed. This means:
- Brief gap (~5s) where heartbeats aren't being refreshed for some sessions
- Evolution API instances survive (they're on Evolution API, not in the bot)
- Worker picks up management of the existing Evolution instance, doesn't recreate

**Mitigation**: 
- Extend `LOCK_EXPIRY_MS` temporarily during transitions (2x normal)
- Main refreshes all heartbeats one final time before handing off
- Workers start by checking Evolution instance status, not creating new ones

### 6. Webhook Delivery While Transitioning

**Risk**: Webhooks from Evolution API hit `botwave-web`, which updates the DB.
Workers read from DB on their sync loop. But during a transition, a webhook
might arrive for a session that's mid-handoff — neither the old owner (main)
nor the new owner (worker) is actively managing it.

**Impact**: Low. The webhook updates DB state regardless of who's managing the
session. The next sync loop cycle (from whichever thread picks it up) will see
the updated state. Worst case: a 5-10s delay in processing a webhook event
during transition.

### 7. Database Connection Pool Exhaustion

**Risk**: Each worker creates its own Supabase client (separate module load =
separate client instance). With 20 workers, that's 20+ concurrent DB
connections.

**Mitigation**: Use a single shared Supabase connection from the main thread,
or have workers request DB operations through main via `postMessage`. 
Alternative: Supabase JS client uses HTTP (not persistent connections), so this
is less of a concern than with traditional connection pools — but request
concurrency should still be monitored.

### 8. Auto-Scaler Oscillation (Threshold Flapping)

**Risk**: Sessions fluctuate around the 25-session threshold. Users
connect/disconnect throughout the day. The count goes 24 → 26 → 23 → 27 → 24.
Each crossing triggers scale-up or scale-down (with cooldown). Even with 120s
cooldown for scale-down, this could mean:
- 10:00 AM: 26 sessions → spawn 3 workers, transfer sessions (~5s gap)
- 10:04 AM: 24 sessions → 120s cooldown starts
- 10:06 AM: 23 sessions → drain workers, transfer back to main (~30s)
- 10:08 AM: 27 sessions → spawn workers again

**Impact**: Every transition has a ~5s heartbeat gap and disrupts session
management. Frequent transitions waste resources and risk dropping messages.

**Mitigation**: Add hysteresis to the threshold:
- Scale UP at 30 sessions (not 25)
- Scale DOWN at 15 sessions (not 25)
- This creates a 15-session dead zone where the current mode stays active
- Much harder to oscillate between 15 and 30 than between 24 and 26

### 9. Process Restart Wipes All Workers

**Risk**: When the Docker container restarts (deploy, crash, etc.), the main
process boots fresh. All worker threads were in-memory — they're gone. The main
thread starts in standalone mode and has to rebuild `activeBots` from scratch.

**Impact**: This is actually the SAME as current behavior (no worse). But the
doc implies workers add resilience — they don't add resilience against main
process death. The only thing that survives a restart is Evolution API instances
(separate container) and the DB state.

### 10. The "200 Workers" Number is Wrong

**Risk**: The doc previously described scaling "up to 200 workers." Each worker
uses 30-50MB of memory. 200 workers = 6-10GB just for bot threads, before
Evolution API or anything else.

**Reality**: At most you'd want 10-20 workers (5-15 sessions each). The formula
`ceil(sessions / 5)` at 200 sessions = 40 workers = 1.2-2GB. Still heavy.

With the concurrent sync loop alternative (see above), you may never need
worker_threads at all — `Promise.all` for heartbeats handles 1000+ sessions.

---

## Compared to Old 3-Worker Containers (What Broke Before)

| Problem | Old 3 containers | worker_threads (new approach) |
|---------|------------------|-------------------------------|
| Network issues | Docker networking failed between containers | No network — same process |
| Health check timeouts | Container health checks expired, sessions got stuck | No health checks needed — main monitors threads directly |
| Session stuck on dead worker | Worker container dies, sessions locked until orphan recovery | Thread dies, main respawns immediately, sessions reassigned |
| Coordination bugs | Redis locks + HTTP between containers = complex | `parentPort` messages + main-thread gating = simpler |
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

- **DO NOT use `cluster` module.** Cluster forks entirely separate OS processes.
  `worker_threads` creates separate V8 Isolates within the same process — they
  can share raw byte buffers via `SharedArrayBuffer` but NOT JS objects or module
  state. Still lighter than cluster (shared process, shared libuv thread pool).

- **DO NOT assume module-level variables are shared across workers.** They are
  NOT. Every `let`, `const`, `Map`, `Set` at the module level is a separate copy
  in each worker. All shared state MUST go through the main thread (see the
  V8 Isolate Reality section above).

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

| Sessions | Evolution API RAM | Bot Process RAM | Workers | Per-Worker | VPS Total |
|----------|-------------------|-----------------|---------|------------|-----------|
| 5-25     | 1.5 GB            | 512 MB          | 0       | N/A        | 4 GB      |
| 25-50    | 2 GB              | 1-1.5 GB        | 3       | ~40 MB     | 8 GB      |
| 50-100   | 3 GB              | 1.5-2.5 GB      | 5-10    | ~40 MB     | 12 GB     |
| 100-200  | 4 GB              | 2-4 GB          | 10-20   | ~40 MB     | 16 GB     |

Each Baileys WebSocket connection uses ~20-40 MB of RAM in Evolution API
(auth state, message store, connection buffers).

Each worker thread uses **~30-50 MB** (V8 Isolate + module loading + activeBots
Map). This is higher than the 5-10MB previously estimated because each worker
loads its own copy of all imported modules. With slim worker modules that only
import what they need, this could be reduced to ~15-25MB.

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
| `bot/evolutionClient.ts` | Modified — workers delegate rate limiting and health tracking to main thread via messages. Module-level state (rate limiter, 428 cooldown, Evolution down flag) is NOT shared across threads | Medium — state management refactor |
| `bot/sessionCoordinator.ts` | No changes — Redis locks work across threads | None |
| `deploy/docker-compose.yml` | Modified — increase bot memory limit, add MAX_WORKER_THREADS | Low — config only |

**Estimated effort**: 3-5 sessions to build, test, and verify (increased from
2-3 due to V8 Isolate complexity — rate limiter gating and shared state
management add significant implementation work).

---

## Implementation Checklist

When building the worker thread system:

### Phase 1: Core (must have)
- [ ] Create `bot/workerThread.ts` — slim worker entry point (import ONLY needed modules)
- [ ] Create `bot/autoScaler.ts` — signal detection, worker lifecycle, scaling decisions
- [ ] Add `parentPort` message protocol (all message types listed above)
- [ ] Each worker gets its own `activeBots` Map — no shared mutable state
- [ ] **Main-thread rate limiter gate**: workers send `request_create_instance`, main responds with `create_approved` or `create_queued`
- [ ] **SharedArrayBuffer for flags**: 428 cooldown and Evolution down state shared via `Atomics` (see V8 Isolate section)
- [ ] **Workers report health events to main**: `report_428`, `report_evo_failure`, `report_evo_success` — main aggregates and broadcasts
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
- [ ] **Session handoff during transitions**: extend heartbeat temporarily, main does final refresh before handoff
- [ ] **DB connection monitoring**: track concurrent Supabase requests across workers, add backpressure if needed

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
