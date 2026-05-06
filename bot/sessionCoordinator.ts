/**
 * Session Coordinator — Idempotent session lifecycle management.
 *
 * Guarantees:
 *  1. One session = one bot = one WebSocket (never duplicated)
 *  2. Safe to call any operation multiple times (idempotent)
 *  3. Process restarts are detected and handled cleanly
 *  4. Orphaned sessions are recovered automatically
 *  5. All state changes go through DB as single source of truth
 *
 * Mechanism:
 *  - locked_by: which instance owns the session's bot process
 *  - locked_at: when the lock was acquired
 *  - heartbeat_at: last time the bot confirmed it's alive (updated every 30s)
 *  - Lock expiry: 90 seconds without heartbeat = lock is stale
 */

import { createClient } from '@supabase/supabase-js';
import { SELF_URL, IS_WORKER, isWorkerHealthy } from './workerConfig';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const INSTANCE_ID = SELF_URL || `main-${process.pid}`;
const LOCK_EXPIRY_MS = 90_000; // 90s without heartbeat = stale lock
const HEARTBEAT_INTERVAL = 30_000; // heartbeat every 30s
const AUTO_RECOVERY_COOLDOWN_MS = 120_000; // wait 2 min before auto-retry
const AUTO_RECOVERY_MAX_ATTEMPTS = 3; // max auto-recovery tries per session

let heartbeatHandle: NodeJS.Timeout | null = null;
// Track auto-recovery attempts per session (in-memory, resets on restart)
const autoRecoveryAttempts = new Map<string, number>();
const ownedSessions: Set<string> = new Set();

// ─── Lock Acquisition ─────────────────────────────────────────────────────────

/**
 * Try to acquire a lock on a session. Returns true if acquired (or already owned).
 * Idempotent: calling multiple times with the same instance is safe.
 */
export async function tryAcquireLock(sessionId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // First check current lock state
  const { data: session, error: fetchErr } = await supabase
    .from('bot_sessions')
    .select('locked_by, locked_at, heartbeat_at')
    .eq('id', sessionId)
    .single();

  if (fetchErr || !session) {
    console.error(`[COORD] Failed to check lock for ${sessionId}:`, fetchErr);
    return false;
  }

  // Already owned by us — refresh
  if (session.locked_by === INSTANCE_ID) {
    await refreshHeartbeat(sessionId);
    ownedSessions.add(sessionId);
    return true;
  }

  // Owned by someone else — check if stale
  if (session.locked_by) {
    const heartbeatAge = session.heartbeat_at
      ? Date.now() - new Date(session.heartbeat_at).getTime()
      : Infinity;
    const lockAge = session.locked_at
      ? Date.now() - new Date(session.locked_at).getTime()
      : Infinity;

    if (heartbeatAge < LOCK_EXPIRY_MS && lockAge < LOCK_EXPIRY_MS * 2) {
      console.log(`[COORD] Session ${sessionId.slice(0, 8)} locked by ${session.locked_by} (heartbeat ${Math.round(heartbeatAge / 1000)}s ago) — skipping`);
      return false;
    }

    console.log(`[COORD] Session ${sessionId.slice(0, 8)} has stale lock from ${session.locked_by} (heartbeat ${Math.round(heartbeatAge / 1000)}s ago) — taking over`);
  }

  // Acquire lock with conditional update (only if unlocked, ours, or stale)
  const staleTime = new Date(Date.now() - LOCK_EXPIRY_MS).toISOString();
  const { data: updated, error: lockErr } = await supabase
    .from('bot_sessions')
    .update({
      locked_by: INSTANCE_ID,
      locked_at: now,
      heartbeat_at: now,
    })
    .eq('id', sessionId)
    .or(`locked_by.is.null,locked_by.eq.${INSTANCE_ID},heartbeat_at.lt.${staleTime}`)
    .select('id');

  if (lockErr) {
    console.error(`[COORD] Failed to acquire lock for ${sessionId}:`, lockErr);
    return false;
  }

  if (updated && updated.length > 0) {
    console.log(`[COORD] Lock acquired for session ${sessionId.slice(0, 8)} by ${INSTANCE_ID}`);
    ownedSessions.add(sessionId);
    return true;
  }

  console.log(`[COORD] Lock race lost for session ${sessionId.slice(0, 8)} — another instance grabbed it`);
  return false;
}

// ─── Lock Release ─────────────────────────────────────────────────────────────

/**
 * Release a session lock. Safe to call even if not locked.
 */
export async function releaseLock(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      locked_by: null,
      locked_at: null,
      heartbeat_at: null,
    })
    .eq('id', sessionId)
    .eq('locked_by', INSTANCE_ID); // Only release our own locks

  if (error) {
    console.error(`[COORD] Failed to release lock for ${sessionId}:`, error);
  } else {
    console.log(`[COORD] Lock released for session ${sessionId.slice(0, 8)}`);
  }
  ownedSessions.delete(sessionId);
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/**
 * Update heartbeat for a session we own. Called automatically by the heartbeat loop.
 */
export async function refreshHeartbeat(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('locked_by', INSTANCE_ID);

  if (error) {
    console.error(`[COORD] Heartbeat failed for ${sessionId}:`, error);
  }
}

/**
 * Start the heartbeat loop — updates all owned sessions every 30s.
 */
export function startHeartbeatLoop(): void {
  if (heartbeatHandle) return;

  heartbeatHandle = setInterval(async () => {
    if (ownedSessions.size === 0) return;

    const sessionIds = Array.from(ownedSessions);
    const { error } = await supabase
      .from('bot_sessions')
      .update({ heartbeat_at: new Date().toISOString() })
      .eq('locked_by', INSTANCE_ID)
      .in('id', sessionIds);

    if (error) {
      console.error(`[COORD] Heartbeat batch update failed:`, error);
    }
  }, HEARTBEAT_INTERVAL);

  console.log(`[COORD] Heartbeat loop started for instance ${INSTANCE_ID} (every ${HEARTBEAT_INTERVAL / 1000}s)`);
}

export function stopHeartbeatLoop(): void {
  if (heartbeatHandle) {
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }
}

// ─── Orphan Detection ─────────────────────────────────────────────────────────

/**
 * Find sessions that are supposedly active/pairing but have no live bot process.
 * This detects:
 *  - Sessions with stale heartbeats (bot process died)
 *  - Sessions locked by dead instances
 *  - Sessions with no lock at all but in active/pairing state
 */
export async function detectOrphanedSessions(): Promise<any[]> {
  const staleTime = new Date(Date.now() - LOCK_EXPIRY_MS).toISOString();

  const { data, error } = await supabase
    .from('bot_sessions')
    .select('id, state, locked_by, locked_at, heartbeat_at, worker_url, phone_number, updated_at')
    .in('state', ['qr_pending', 'pairing_sent', 'active'])
    .or(`locked_by.is.null,heartbeat_at.is.null,heartbeat_at.lt.${staleTime}`);

  if (error) {
    console.error('[COORD] Error detecting orphaned sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Recover orphaned sessions — reset them to a recoverable state.
 * Only the main service should run this (not workers).
 */
export async function recoverOrphanedSessions(): Promise<number> {
  if (IS_WORKER) return 0;

  const orphans = await detectOrphanedSessions();
  if (orphans.length === 0) return 0;

  console.log(`[COORD] Found ${orphans.length} orphaned session(s): ${orphans.map(s =>
    `${s.id.slice(0, 8)}(${s.state},lock=${s.locked_by ?? 'none'},hb=${s.heartbeat_at ? Math.round((Date.now() - new Date(s.heartbeat_at).getTime()) / 1000) + 's ago' : 'never'})`
  ).join(', ')}`);

  let recovered = 0;
  for (const session of orphans) {
    // If it has a worker_url, check if that worker is alive
    if (session.worker_url) {
      const healthy = await isWorkerHealthy(session.worker_url);
      if (healthy) {
        // Worker is alive but heartbeat is stale — maybe the worker just hasn't
        // started the heartbeat loop yet. Give it a pass if lock is recent.
        const lockAge = session.locked_at
          ? Date.now() - new Date(session.locked_at).getTime()
          : Infinity;
        if (lockAge < LOCK_EXPIRY_MS * 2) {
          console.log(`[COORD] Worker ${session.worker_url} is healthy for ${session.id.slice(0, 8)} — lock is recent, skipping`);
          continue;
        }
      }
    }

    // Reset the session
    console.log(`[COORD] Recovering orphaned session ${session.id.slice(0, 8)} (was ${session.state}, locked_by=${session.locked_by ?? 'none'})`);
    const { error: updateErr } = await supabase
      .from('bot_sessions')
      .update({
        state: 'qr_pending',
        locked_by: null,
        locked_at: null,
        heartbeat_at: null,
        auth_state: null,
        pairing_code: null,
        qr_code: null,
        qr_expires_at: null,
        qr_generated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (!updateErr) {
      recovered++;
      console.log(`[COORD] Session ${session.id.slice(0, 8)} recovered — reset to qr_pending with clean state`);
    } else {
      console.error(`[COORD] Failed to recover session ${session.id.slice(0, 8)}:`, updateErr);
    }
  }

  return recovered;
}

// ─── Startup Cleanup ──────────────────────────────────────────────────────────

/**
 * On process startup, release any stale locks that belong to our instance ID.
 * This handles the case where the process crashed without cleaning up.
 */
export async function cleanupOnStartup(): Promise<void> {
  console.log(`[COORD] Startup cleanup for instance ${INSTANCE_ID}...`);

  // Release any locks from a previous run of this same instance
  const { data, error } = await supabase
    .from('bot_sessions')
    .update({
      locked_by: null,
      locked_at: null,
      heartbeat_at: null,
    })
    .eq('locked_by', INSTANCE_ID)
    .select('id, state');

  if (error) {
    console.error('[COORD] Startup cleanup failed:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`[COORD] Released ${data.length} stale lock(s) from previous run: ${data.map(s => `${s.id.slice(0, 8)}(${s.state})`).join(', ')}`);

    // Reset pairing_sent sessions to qr_pending (old pairing code is dead)
    for (const session of data) {
      if (session.state === 'pairing_sent') {
        await supabase
          .from('bot_sessions')
          .update({
            state: 'qr_pending',
            auth_state: null,
            pairing_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);
        console.log(`[COORD] Session ${session.id.slice(0, 8)} was pairing_sent on restart — reset to qr_pending`);
      }
    }
  } else {
    console.log('[COORD] No stale locks to clean up');
  }
}

// ─── Auto-Recovery for needs_reauth ──────────────────────────────────────────

/**
 * Automatically recover sessions stuck in needs_reauth.
 * 
 * For sessions that were previously active (have last_active), reset them to
 * qr_pending so the sync loop picks them up and tries to reconnect. If the
 * WhatsApp session is still linked on the user's phone, the bot may reconnect
 * automatically. If not, a new pairing code is generated and the user is
 * notified via push notification / email.
 * 
 * Safeguards:
 *  - Only recovers sessions that have been in needs_reauth for > 2 minutes
 *  - Max 3 auto-recovery attempts per session (resets on process restart)
 *  - Only runs on the main service (not workers)
 *  - Skips sessions that never had a successful connection (no last_active)
 */
export async function autoRecoverNeedsReauth(): Promise<number> {
  if (IS_WORKER) return 0;

  const cooldownCutoff = new Date(Date.now() - AUTO_RECOVERY_COOLDOWN_MS).toISOString();

  const { data: stale, error } = await supabase
    .from('bot_sessions')
    .select('id, user_id, last_active, updated_at, phone_number, session_name')
    .eq('state', 'needs_reauth')
    .lt('updated_at', cooldownCutoff)
    .not('last_active', 'is', null); // only recover sessions that were previously connected

  if (error || !stale || stale.length === 0) return 0;

  let recovered = 0;
  for (const session of stale) {
    const attempts = autoRecoveryAttempts.get(session.id) || 0;
    if (attempts >= AUTO_RECOVERY_MAX_ATTEMPTS) {
      continue; // exhausted auto-recovery for this session
    }

    const sid = session.id.slice(0, 8);
    const newAttempt = attempts + 1;
    autoRecoveryAttempts.set(session.id, newAttempt);

    console.log(`[AUTO-RECOVERY] Session ${sid} (${session.session_name || session.phone_number || 'unknown'}) — attempt ${newAttempt}/${AUTO_RECOVERY_MAX_ATTEMPTS}. Resetting to qr_pending for reconnection...`);

    const { error: updateErr } = await supabase
      .from('bot_sessions')
      .update({
        state: 'qr_pending',
        locked_by: null,
        locked_at: null,
        heartbeat_at: null,
        worker_url: null,
        pairing_code: null,
        qr_code: null,
        qr_expires_at: null,
        qr_generated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('state', 'needs_reauth'); // conditional: only if still needs_reauth

    if (!updateErr) {
      recovered++;
      console.log(`[AUTO-RECOVERY] Session ${sid} reset to qr_pending (attempt ${newAttempt}). Sync loop will attempt reconnection.`);

      // Send push notification to user about auto-recovery attempt
      if (newAttempt >= AUTO_RECOVERY_MAX_ATTEMPTS) {
        console.log(`[AUTO-RECOVERY] Session ${sid} exhausted auto-recovery (${AUTO_RECOVERY_MAX_ATTEMPTS} attempts). User must re-pair manually.`);
        // Try to notify via session-down endpoint
        const appUrl = SELF_URL || process.env.NEXT_PUBLIC_APP_URL || '';
        if (appUrl && session.user_id) {
          fetch(`${appUrl}/api/notify/session-down`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id, userId: session.user_id }),
          }).catch(() => {});
        }
      }
    } else {
      console.error(`[AUTO-RECOVERY] Failed to reset session ${sid}:`, updateErr);
    }
  }

  return recovered;
}

/**
 * Reset auto-recovery attempts for a session (call when session becomes active).
 */
export function resetAutoRecovery(sessionId: string): void {
  autoRecoveryAttempts.delete(sessionId);
}

// ─── Conflict Detection ──────────────────────────────────────────────────────

/**
 * Check if a session is being run by multiple instances simultaneously.
 * Returns the conflicting instance ID, or null if clean.
 */
export async function detectConflict(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('locked_by, heartbeat_at')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;

  // No lock = no conflict
  if (!data.locked_by) return null;

  // We own it = no conflict
  if (data.locked_by === INSTANCE_ID) return null;

  // Someone else owns it with a fresh heartbeat = conflict
  if (data.heartbeat_at) {
    const age = Date.now() - new Date(data.heartbeat_at).getTime();
    if (age < LOCK_EXPIRY_MS) {
      return data.locked_by;
    }
  }

  return null;
}

// ─── Session State Audit ──────────────────────────────────────────────────────

/**
 * Full audit of all sessions — logs anomalies for debugging.
 * Call periodically from main service (e.g. every 60s).
 */
export async function auditSessions(): Promise<void> {
  const { data: sessions, error } = await supabase
    .from('bot_sessions')
    .select('id, state, locked_by, locked_at, heartbeat_at, worker_url, updated_at')
    .in('state', ['qr_pending', 'pairing_sent', 'active', 'needs_reauth']);

  if (error || !sessions) return;

  const anomalies: string[] = [];

  for (const s of sessions) {
    const sid = s.id.slice(0, 8);

    // Active session with no heartbeat
    if (s.state === 'active' && !s.heartbeat_at) {
      anomalies.push(`${sid}: active but no heartbeat`);
    }

    // Active session with stale heartbeat
    if (s.state === 'active' && s.heartbeat_at) {
      const age = Date.now() - new Date(s.heartbeat_at).getTime();
      if (age > LOCK_EXPIRY_MS) {
        anomalies.push(`${sid}: active but heartbeat stale (${Math.round(age / 1000)}s)`);
      }
    }

    // Pairing with no lock
    if (s.state === 'pairing_sent' && !s.locked_by) {
      anomalies.push(`${sid}: pairing_sent but no lock holder`);
    }

    // Lock without heartbeat
    if (s.locked_by && !s.heartbeat_at) {
      anomalies.push(`${sid}: locked by ${s.locked_by} but no heartbeat`);
    }

    // Needs reauth for too long (> 10 minutes)
    if (s.state === 'needs_reauth' && s.updated_at) {
      const age = Date.now() - new Date(s.updated_at).getTime();
      if (age > 600_000) {
        anomalies.push(`${sid}: needs_reauth for ${Math.round(age / 60000)}min`);
      }
    }
  }

  if (anomalies.length > 0) {
    console.log(`[COORD-AUDIT] ${anomalies.length} anomaly(ies) detected:\n  ${anomalies.join('\n  ')}`);
  }
}

export function getOwnedSessions(): string[] {
  return Array.from(ownedSessions);
}

export function getInstanceId(): string {
  return INSTANCE_ID;
}
