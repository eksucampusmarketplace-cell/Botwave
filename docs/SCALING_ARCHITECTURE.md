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

## Future Architecture: In-Process Worker Threads

> **Key principle**: The main process STILL handles sessions. Workers run INSIDE
> the same process using Node.js `worker_threads`. No separate containers, no
> network issues, no coordination bugs. This avoids the 3-worker problem from the
> old architecture.

```
┌───────────────────────────────────────────────────────────┐
│  botwave-bot (single process, single container)           │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Main Thread                                        │  │
│  │  - HTTP server + keep-alive                         │  │
│  │  - Orchestration (assigns batches to workers)       │  │
│  │  - Orphan recovery, audit, monetization             │  │
│  │  - Aggregates heartbeats from all worker threads    │  │
│  └───────────────┬───────────────┬─────────────────────┘  │
│                  │               │                         │
│    ┌─────────────▼──┐  ┌────────▼────────┐  ┌──────────┐ │
│    │  Worker Thread 1│  │ Worker Thread 2 │  │ WT 3 ... │ │
│    │  Sessions A-G   │  │ Sessions H-N    │  │ O-Z      │ │
│    │  - Own sync loop│  │ - Own sync loop │  │          │ │
│    │  - Own heartbeat│  │ - Own heartbeat │  │          │ │
│    └────────────────-┘  └─────────────────┘  └──────────┘ │
│                  │               │               │         │
│                  ▼               ▼               ▼         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Evolution API (shared container, 2-3GB memory)     │  │
│  │  - WebSocket connections shared via same network    │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### How worker threads would work

#### 1. Session assignment

The main thread assigns sessions to worker threads based on a consistent hash
(e.g., first char of session ID). This ensures:
- Each session always goes to the same worker (no hand-off needed)
- Adding/removing workers only reassigns a portion of sessions
- The main thread maintains the mapping: `session_id → worker_thread_id`

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// Main thread: create workers and assign sessions
const NUM_WORKERS = 3; // Scale based on session count
const workers: Worker[] = [];

for (let i = 0; i < NUM_WORKERS; i++) {
  const worker = new Worker('./dist/bot/bot/workerThread.js', {
    workerData: { workerId: i, totalWorkers: NUM_WORKERS }
  });
  workers.push(worker);
}

// Assign session to worker by consistent hash
function getWorkerForSession(sessionId: string): Worker {
  const hash = sessionId.charCodeAt(0) % NUM_WORKERS;
  return workers[hash];
}
```

#### 2. Each worker runs its own sync loop

Each worker thread has its own sync loop that only processes its batch of sessions.
This means 3 workers process the full session list 3x faster:

```typescript
// In worker thread:
async function workerSyncLoop() {
  const mySessions = await getSessionsForWorker(workerData.workerId, workerData.totalWorkers);
  for (const session of mySessions) {
    // Same logic as current syncSessionsWithDb, but only for this batch
    await processSession(session);
  }
}
```

#### 3. Heartbeat aggregation

Each worker thread refreshes heartbeats for its own sessions. The main thread
aggregates health status from all workers for the orphan recovery system:

```typescript
// Worker sends heartbeat updates to main thread
parentPort?.postMessage({
  type: 'heartbeat',
  sessionId: session.id,
  timestamp: Date.now()
});

// Main thread listens and aggregates
worker.on('message', (msg) => {
  if (msg.type === 'heartbeat') {
    updateHeartbeat(msg.sessionId, msg.timestamp);
  }
});
```

#### 4. Shared Evolution API connections

Worker threads share the same network namespace (they're in the same process),
so they all talk to Evolution API at `http://evolution-api:8080`. No Docker
networking needed.

### Migration path

The migration from standalone to worker threads is designed to be **backwards
compatible** — the main thread still handles everything if no workers are created:

1. **Phase 1** (current): Standalone. Main thread does everything. `NUM_WORKERS=0`.
2. **Phase 2** (50+ sessions): Enable `NUM_WORKERS=3`. Main thread becomes
   orchestrator, workers handle sync loops. All existing session state is preserved.
3. **Phase 3** (100+ sessions): Increase workers to 5-7. Increase Evolution API
   memory to 3-4GB. Consider adding a second Evolution API container.

### Config changes needed

When implementing worker threads, update these configs:

```yaml
# docker-compose.yml — botwave-bot
environment:
  - NUM_WORKER_THREADS=3          # NEW: number of in-process workers
  - LOCK_EXPIRY_MS=600000         # Increase from 180s to 600s for larger batches

# docker-compose.yml — evolution-api
deploy:
  resources:
    limits:
      memory: 3G                   # Increase from 1.5GB for 50+ sessions
    reservations:
      memory: 1G
```

### What NOT to do

- **DO NOT use separate Docker containers for workers.** This caused the 3-worker
  problem: network issues between containers, health check timeouts, sessions
  getting stuck when workers went down, coordination bugs across Docker networks.

- **DO NOT use `cluster` module.** Cluster forks separate processes with separate
  V8 heaps. `worker_threads` share the same V8 heap and can share memory directly
  via `SharedArrayBuffer`.

- **DO NOT split Evolution API into multiple containers** (at least not until 200+
  sessions). One Evolution API container with enough memory is simpler and avoids
  the WebSocket routing problem.

---

## Memory Planning

Based on current observations:

| Sessions | Evolution API RAM | Bot Process RAM | VPS Total |
|----------|-------------------|-----------------|-----------|
| 5-25     | 1.5 GB            | 512 MB          | 4 GB      |
| 25-50    | 2 GB              | 1 GB            | 8 GB      |
| 50-100   | 3 GB              | 1.5 GB          | 12 GB     |
| 100-200  | 4 GB              | 2 GB            | 16 GB     |

Each Baileys WebSocket connection uses ~20-40 MB of RAM in Evolution API
(auth state, message store, connection buffers).

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

When you're ready to implement worker threads:

- [ ] Create `bot/workerThread.ts` — the entry point for each worker thread
- [ ] Move `syncSessionsWithDb` inner loop to worker thread
- [ ] Add session-to-worker assignment (consistent hash)
- [ ] Add `parentPort` message protocol for heartbeats and status
- [ ] Add main thread orchestrator that creates/monitors workers
- [ ] Add `NUM_WORKER_THREADS` env var (default: 0 = standalone mode)
- [ ] Update `LOCK_EXPIRY_MS` to scale with batch size
- [ ] Increase Evolution API memory limit in docker-compose
- [ ] Load test with 50 sessions before deploying
- [ ] Monitor memory usage via Portainer after deploying
