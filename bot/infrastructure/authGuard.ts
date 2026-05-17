/**
 * Supabase Auth Guard — Deduplicates concurrent token refresh requests.
 *
 * Problem: When Supabase returns 409 "Too many concurrent token refresh requests",
 * it means multiple parts of the bot are triggering auth token refreshes at the
 * same time. This causes cascading failures where each retry triggers another
 * refresh, making the problem worse.
 *
 * Solution: Serialize all Supabase auth operations through a single promise.
 * If a refresh is already in flight, subsequent callers wait for the same result
 * instead of firing their own refresh request.
 *
 * Also provides a cooldown after auth failures to prevent retry storms.
 */

let activeRefresh: Promise<boolean> | null = null;
let lastRefreshAttempt = 0;
let consecutiveAuthFailures = 0;

const AUTH_COOLDOWN_MS = 10_000; // wait 10s between refresh attempts
const MAX_AUTH_FAILURES = 3; // after 3 failures, stop trying for a longer period
const BACKOFF_CEILING_MS = 60_000; // max 60s backoff

/**
 * Execute an auth-sensitive operation with deduplication.
 * If another auth operation is already in flight, waits for it instead of
 * firing a duplicate request.
 *
 * @param authFn - The function that performs the auth operation
 * @returns true if auth succeeded, false if failed or in cooldown
 */
export async function withAuthGuard(authFn: () => Promise<boolean>): Promise<boolean> {
  // If we're in cooldown after repeated failures, skip
  const now = Date.now();
  if (consecutiveAuthFailures >= MAX_AUTH_FAILURES) {
    const backoffMs = Math.min(
      AUTH_COOLDOWN_MS * Math.pow(2, consecutiveAuthFailures - MAX_AUTH_FAILURES),
      BACKOFF_CEILING_MS,
    );
    if (now - lastRefreshAttempt < backoffMs) {
      return false;
    }
  }

  // Basic cooldown between attempts
  if (now - lastRefreshAttempt < AUTH_COOLDOWN_MS) {
    // If there's an active refresh, piggyback on it
    if (activeRefresh) {
      return activeRefresh;
    }
    return false;
  }

  // If a refresh is already in flight, wait for it
  if (activeRefresh) {
    return activeRefresh;
  }

  // Execute the auth operation
  lastRefreshAttempt = now;
  activeRefresh = (async () => {
    try {
      const result = await authFn();
      if (result) {
        consecutiveAuthFailures = 0;
      } else {
        consecutiveAuthFailures++;
      }
      return result;
    } catch (err) {
      consecutiveAuthFailures++;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('409') || msg.includes('conflict') || msg.includes('concurrent')) {
        console.warn(`[AUTH-GUARD] Token refresh conflict (attempt ${consecutiveAuthFailures}) — backing off`);
      } else {
        console.error(`[AUTH-GUARD] Auth operation failed:`, msg);
      }
      return false;
    } finally {
      activeRefresh = null;
    }
  })();

  return activeRefresh;
}

/** Reset the auth guard state. Call when the bot successfully connects. */
export function resetAuthGuard(): void {
  consecutiveAuthFailures = 0;
  lastRefreshAttempt = 0;
  activeRefresh = null;
}

/** Get auth guard stats for health monitoring. */
export function getAuthGuardStats() {
  return {
    consecutiveFailures: consecutiveAuthFailures,
    isInCooldown: activeRefresh !== null || (Date.now() - lastRefreshAttempt < AUTH_COOLDOWN_MS),
    hasActiveRefresh: activeRefresh !== null,
    lastAttemptAge: lastRefreshAttempt ? Math.round((Date.now() - lastRefreshAttempt) / 1000) : null,
  };
}
