/**
 * Graceful Shutdown Manager
 *
 * Ensures clean process termination on SIGTERM/SIGINT:
 *   1. Stops accepting new work (sets shuttingDown flag)
 *   2. Clears all polling intervals so no new DB queries fire
 *   3. Drains in-flight promises (circuit breaker, writes)
 *   4. Disconnects Redis cleanly
 *   5. Stops the bot (preserves Evolution API instances)
 *   6. Force-kills after SHUTDOWN_TIMEOUT_MS if cleanup hangs
 *
 * Why: Render sends SIGTERM on every deploy. Without graceful shutdown,
 * in-flight Supabase writes get dropped, Redis connections leak, and
 * the bot process hangs until Render force-kills it (causing 502s).
 */

const SHUTDOWN_TIMEOUT_MS = 15_000; // force exit after 15s (extra time for auth flush)

let isShuttingDown = false;
const registeredIntervals: NodeJS.Timeout[] = [];
const shutdownCallbacks: Array<{ name: string; fn: () => Promise<void> }> = [];

/** Check if the process is shutting down. Polling loops should check this. */
export function isShutdown(): boolean {
  return isShuttingDown;
}

/**
 * Register a setInterval handle so it can be cleared on shutdown.
 * Returns the same handle for chaining.
 */
export function registerInterval(handle: NodeJS.Timeout): NodeJS.Timeout {
  registeredIntervals.push(handle);
  return handle;
}

/**
 * Register an async cleanup callback to run during shutdown.
 * Callbacks execute in registration order with a per-callback 3s timeout.
 */
export function onShutdown(name: string, fn: () => Promise<void>): void {
  shutdownCallbacks.push({ name, fn });
}

/**
 * Execute the full shutdown sequence. Called by SIGTERM/SIGINT handlers.
 */
async function executeShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return; // prevent double shutdown
  isShuttingDown = true;

  console.log(`[SHUTDOWN] ${signal} received - starting graceful shutdown...`);

  // 1. Clear all registered intervals immediately
  for (const handle of registeredIntervals) {
    clearInterval(handle);
  }
  console.log(`[SHUTDOWN] Cleared ${registeredIntervals.length} interval(s)`);

  // 2. Run registered cleanup callbacks in order
  for (const cb of shutdownCallbacks) {
    try {
      await Promise.race([
        cb.fn(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
        ),
      ]);
      console.log(`[SHUTDOWN] ${cb.name}: done`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SHUTDOWN] ${cb.name}: ${msg}`);
    }
  }

  console.log('[SHUTDOWN] Cleanup complete - exiting');
  process.exit(0);
}

/**
 * Install SIGTERM and SIGINT handlers. Call once at startup.
 */
export function installShutdownHandlers(): void {
  // Force-kill timer as safety net
  const forceExit = (signal: string) => {
    const timer = setTimeout(() => {
      console.error(`[SHUTDOWN] Force exit after ${SHUTDOWN_TIMEOUT_MS}ms timeout`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    // Unref so it doesn't keep the process alive if cleanup finishes
    timer.unref();
    executeShutdown(signal);
  };

  process.on('SIGTERM', () => forceExit('SIGTERM'));
  process.on('SIGINT', () => forceExit('SIGINT'));

  // Catch unhandled rejections - log but don't crash
  process.on('unhandledRejection', (reason) => {
    console.error('[PROCESS] Unhandled rejection:', reason);
  });
}
