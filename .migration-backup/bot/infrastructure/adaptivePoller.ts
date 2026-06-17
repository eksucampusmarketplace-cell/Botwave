/**
 * Adaptive Poller - Dynamically adjusts polling intervals based on system health.
 *
 * Problem: Fixed polling intervals waste queries when Supabase is throttled
 * (circuit OPEN) and are unnecessarily slow during healthy periods after recovery.
 *
 * Solution: Each polling loop gets a multiplier based on circuit breaker state:
 *   CLOSED     → 1x (normal intervals)
 *   HALF_OPEN  → 2x (cautious, fewer queries while testing recovery)
 *   OPEN       → skipped entirely (handled by circuit breaker checks in index.ts)
 *   RECOVERING → 1.5x for 2 minutes after circuit closes (ease back in)
 *
 * Also tracks error rates per-poller to detect which specific loops are problematic.
 */

import { getCircuitState } from './circuitBreaker';

let lastRecoveryTime = 0;
const RECOVERY_COOLDOWN_MS = 2 * 60_000; // 2 min gentle period after recovery

const pollerErrors = new Map<string, { errors: number; lastError: number; total: number }>();

/**
 * Record that the circuit just recovered. Called from index.ts when
 * circuit transitions from OPEN/HALF_OPEN back to CLOSED.
 */
export function markRecovery(): void {
  lastRecoveryTime = Date.now();
  console.log('[ADAPTIVE] Circuit recovered - entering 2min gentle polling period');
}

/**
 * Get the polling interval multiplier based on current system health.
 * Multiply your base interval by this value.
 */
export function getPollingMultiplier(): number {
  const state = getCircuitState();

  if (state === 'HALF_OPEN') return 2.0;
  if (state === 'OPEN') return Infinity; // caller should skip entirely

  // Recently recovered - ease back in
  if (lastRecoveryTime > 0 && Date.now() - lastRecoveryTime < RECOVERY_COOLDOWN_MS) {
    return 1.5;
  }

  return 1.0;
}

/**
 * Record a poller error for tracking.
 */
export function recordPollerError(pollerName: string): void {
  const existing = pollerErrors.get(pollerName) || { errors: 0, lastError: 0, total: 0 };
  existing.errors++;
  existing.total++;
  existing.lastError = Date.now();
  pollerErrors.set(pollerName, existing);
}

/**
 * Record a poller success - resets the consecutive error count.
 */
export function recordPollerSuccess(pollerName: string): void {
  const existing = pollerErrors.get(pollerName);
  if (existing) {
    existing.errors = 0;
  }
}

/**
 * Get adaptive polling stats for health/logging.
 */
export function getAdaptiveStats() {
  const state = getCircuitState();
  const multiplier = getPollingMultiplier();
  const isRecovering = lastRecoveryTime > 0 && Date.now() - lastRecoveryTime < RECOVERY_COOLDOWN_MS;
  const recoverySecondsLeft = isRecovering
    ? Math.round((RECOVERY_COOLDOWN_MS - (Date.now() - lastRecoveryTime)) / 1000)
    : 0;

  const pollers: Record<string, { consecutiveErrors: number; totalErrors: number; lastErrorAge: number | null }> = {};
  for (const [name, data] of pollerErrors.entries()) {
    pollers[name] = {
      consecutiveErrors: data.errors,
      totalErrors: data.total,
      lastErrorAge: data.lastError ? Math.round((Date.now() - data.lastError) / 1000) : null,
    };
  }

  return {
    circuitState: state,
    multiplier,
    isRecovering,
    recoverySecondsLeft,
    pollers,
  };
}
