import { createClient } from '@supabase/supabase-js';
import { resilientRead, resilientWrite, isCircuitOpen, setStaleCache, invalidateStaleCache, getCircuitStats } from './circuitBreaker';
import { trackMap } from './memoryGuard';
import { cacheSession, getCachedSession, invalidateSessionCache, invalidateQRCache, cachePairingLock, getCachedPairingLock, invalidatePairingLock, cacheSessionUserId, getCachedSessionUserId, cacheSessionExists, getCachedSessionExists, cacheSettings, getCachedSettings, cacheFeature, getCachedFeature, cacheAutoReplies, getCachedAutoReplies, cacheAfkState, getCachedAfkState, cacheSubscription, getCachedSubscription, cacheLeaderboard, getCachedLeaderboard, invalidateRedisKey, invalidateRedisPattern, bufferLeaderboardIncrement, drainLeaderboardBuffer, getBufferedSessionIds, bufferTrackMessage, drainMessageBuffer } from './redisSessionCache';
import { queueWrite } from './writeQueue';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'CRITICAL: NEXT_PUBLIC_SUPABASE_URL environment variable is not set. ' +
    'Please set it in your .env file.'
  );
}

if (!supabaseServiceKey) {
  throw new Error(
    'CRITICAL: SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
    'Please set it in your .env file.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── In-memory cache layer ──────────────────────────────────────────────────
// Reduces Supabase load for frequently-read, rarely-changed data.
// Each cache entry stores the value and an expiry timestamp.
// TTL is 60s — stale data is acceptable for settings/features/auto-replies
// since they only change when the user explicitly updates them.

interface CacheEntry<T> { value: T; expiresAt: number; }

const CACHE_TTL_MS = 60_000; // 60 seconds
const CACHE_TTL_MEDIUM_MS = 120_000; // 2 minutes — leaderboard, stats
const CACHE_TTL_LONG_MS = 300_000; // 5 minutes — settings, features, subscriptions, welcome msgs

const settingsCache = new Map<string, CacheEntry<any>>();
const featureCache = new Map<string, CacheEntry<boolean>>();
const autoReplyCache = new Map<string, CacheEntry<any[]>>();
const sessionUserIdCache = new Map<string, CacheEntry<string | null>>();
const afkCache = new Map<string, CacheEntry<any>>();
const subscriptionCache = new Map<string, CacheEntry<any>>();
const welcomeCache = new Map<string, CacheEntry<string | null>>();
const pollCache = new Map<string, CacheEntry<any>>();
const leaderboardCache = new Map<string, CacheEntry<any[]>>();
const remindersCache = new Map<string, CacheEntry<any[]>>();
const notesCache = new Map<string, CacheEntry<any[]>>();
const scheduledMsgsCache = new Map<string, CacheEntry<any[]>>();
const sessionStatsCache = new Map<string, CacheEntry<any>>();
const healthEventsCache = new Map<string, CacheEntry<any[]>>();
const webhookRetryCache = new Map<string, CacheEntry<any[]>>();
const rewardBalanceCache = new Map<string, CacheEntry<any>>();
const referralCache = new Map<string, CacheEntry<any>>();
const pairingCountsCache = new Map<string, CacheEntry<Record<string, number>>>();

// Register all caches with memory guard for periodic cleanup
const getExpiresAt = (v: unknown) => {
  const entry = v as CacheEntry<unknown> | undefined;
  return entry?.expiresAt ?? null;
};
trackMap('settingsCache', settingsCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('featureCache', featureCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('autoReplyCache', autoReplyCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('sessionUserIdCache', sessionUserIdCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('afkCache', afkCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('subscriptionCache', subscriptionCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('welcomeCache', welcomeCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('pollCache', pollCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('leaderboardCache', leaderboardCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('remindersCache', remindersCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('notesCache', notesCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('scheduledMsgsCache', scheduledMsgsCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('sessionStatsCache', sessionStatsCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('healthEventsCache', healthEventsCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('webhookRetryCache', webhookRetryCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('rewardBalanceCache', rewardBalanceCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('referralCache', referralCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);
trackMap('pairingCountsCache', pairingCountsCache as Map<string, unknown>, CACHE_TTL_MS * 2, getExpiresAt);

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number = CACHE_TTL_MS): void {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

/** Invalidate all cache entries for a given prefix (e.g. userId or sessionId). */
export function invalidateCache(prefix: string): void {
  for (const cache of [settingsCache, featureCache, autoReplyCache, sessionUserIdCache, afkCache, subscriptionCache, welcomeCache, pollCache, leaderboardCache, remindersCache, notesCache, scheduledMsgsCache, sessionStatsCache, healthEventsCache, webhookRetryCache, rewardBalanceCache, referralCache, pairingCountsCache]) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
  invalidateStaleCache(prefix);
}

export { getCircuitStats };

export async function initDatabase() {
  console.log('Database initialized');

  const { error } = await supabase.from('bot_sessions').select('id').limit(1);
  if (error && error.code === 'PGRST205') {
    throw new Error(
      'CRITICAL: bot_sessions table not found in Supabase.\n' +
      'Please run the migrations in order:\n' +
      '  1. supabase/migrations/001_initial_schema.sql\n' +
      '  2. supabase/migrations/002_rate_limit_settings.sql\n' +
      '  3. supabase/migrations/003_service_role_policies.sql\n' +
      '  4. supabase/migrations/004_user_stats_settings.sql\n' +
      'Run these in your Supabase SQL Editor before starting the bot.'
    );
  }
}

export async function getUserSessions(userId?: string) {
  return resilientRead({
    cacheKey: `sessions:${userId || 'all'}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      let query = supabase
        .from('bot_sessions')
        .select('*')
        .in('state', ['qr_pending', 'pairing_sent', 'active', 'needs_reauth']);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== 'PGRST205') {
          console.error('Error fetching sessions:', error);
        }
        return [];
      }
      return data;
    },
  });
}

export async function getSessionById(sessionId: string) {
  // Try Redis cache first
  const cached = await getCachedSession(sessionId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`Error fetching session ${sessionId}:`, error);
    }
    return null;
  }

  // Cache in Redis for subsequent reads
  if (data) {
    await cacheSession(sessionId, data);
    await cacheSessionExists(sessionId);
  }
  return data;
}

export async function getSessionsNeedingBot(selfUrl?: string, isWorker?: boolean) {
  return resilientRead({
    cacheKey: `sessionsNeeding:${selfUrl || 'main'}:${isWorker}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const actionableStates = ['qr_pending', 'pairing_sent', 'active', 'inactive'];

      let query = supabase
        .from('bot_sessions')
        .select('*')
        .in('state', actionableStates);

      if (selfUrl && isWorker) {
        query = query.eq('worker_url', selfUrl);
      } else {
        query = query.is('worker_url', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[DB] Error fetching sessions needing bot:', error);
        return [];
      }
      if (data && data.length > 0) {
        console.log(`[DB] Found ${data.length} session(s):`, data.map(s => `${s.id.slice(0,8)}(${s.state},phone=${s.phone_number ? 'yes' : 'NO'},worker=${s.worker_url ? (() => { try { return new URL(s.worker_url).hostname; } catch { return s.worker_url; } })() : 'main'})`).join(', '));
      }
      return data;
    },
  });
}

export async function updateSessionQR(sessionId: string, qr: string, expiresAt: string, generatedAt: string) {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      qr_code: qr,
      qr_expires_at: expiresAt,
      qr_generated_at: generatedAt,
      state: 'qr_pending',
      auth_state: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .neq('state', 'pairing_sent')  // never overwrite pairing_sent
    .neq('state', 'active');       // never overwrite an active session

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`Error updating QR for session ${sessionId}:`, error);
    }
  } else {
    console.log(`Updated QR for session ${sessionId}`);
    // Invalidate Redis caches so next read fetches fresh data
    await invalidateSessionCache(sessionId);
    await invalidateQRCache(sessionId);
  }
}

export async function updateSessionPairingCode(sessionId: string, code: string) {
  const dbTimestamp = new Date().toISOString();
  const codeLength = code?.length || 0;
  const isEmptyCode = !code || code.trim() === '';
  console.log(`[PAIRING-DB] === Saving pairing code ===> session=${sessionId} code="${code}" codeLen=${codeLength} isEmpty=${isEmptyCode} dbTimestamp=${dbTimestamp}`);

  // Read current state BEFORE the update so we can log what happened
  const { data: preState, error: preErr } = await supabase
    .from('bot_sessions')
    .select('state, pairing_code, updated_at')
    .eq('id', sessionId)
    .single();

  if (preErr) {
    console.error(`[PAIRING-DB] Pre-read FAILED for ${sessionId}:`, preErr.message, preErr.code);
  } else {
    console.log(`[PAIRING-DB] Pre-state: state=${preState?.state} existingCode=${preState?.pairing_code ? `"${preState.pairing_code}"` : 'null'} lastUpdated=${preState?.updated_at}`);
  }

  const { error, count } = await supabase
    .from('bot_sessions')
    .update({
      pairing_code: code,
      state: isEmptyCode ? 'qr_pending' : 'pairing_sent',
      updated_at: dbTimestamp
    })
    .eq('id', sessionId)
    .neq('state', 'active');  // never overwrite an active session

  if (error) {
    console.error(`[PAIRING-DB] ERROR saving pairing code for ${sessionId}: code=${error.code} message=${error.message} details=${error.details}`);
  } else if (count === 0) {
    console.warn(`[PAIRING-DB] BLOCKED — no rows updated for ${sessionId}. Session is likely in 'active' state (protected). code="${code}"`);
  } else {
    console.log(`[PAIRING-DB] SUCCESS — pairing code saved for ${sessionId}: code="${code}" rowsUpdated=${count} at=${dbTimestamp}`);
  }

  // Post-update verification: confirm the code actually persisted
  const { data: postState, error: postErr } = await supabase
    .from('bot_sessions')
    .select('state, pairing_code, updated_at')
    .eq('id', sessionId)
    .single();

  if (postErr) {
    console.error(`[PAIRING-DB] Post-read FAILED for ${sessionId}:`, postErr.message);
  } else {
    const codeMatch = postState?.pairing_code === code;
    console.log(`[PAIRING-DB] VERIFY — session=${sessionId} state=${postState?.state} dbCode="${postState?.pairing_code}" expected="${code}" match=${codeMatch} updatedAt=${postState?.updated_at}`);
    if (!codeMatch && !isEmptyCode) {
      console.error(`[PAIRING-DB] CODE MISMATCH! Saved "${code}" but DB has "${postState?.pairing_code}". Possible race condition or filter blocked the update.`);
    }
  }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const timestamp = new Date().toISOString();
  // Defense-in-depth: never regress an active session to pairing_sent or
  // qr_pending. Stale webhooks or race conditions can attempt this; the
  // Supabase filter ensures the update is silently skipped in those cases.
  const PROTECTED_STATES = ['active'];
  const REGRESSIVE_STATUSES = ['pairing_sent', 'qr_pending'];
  const isRegression = REGRESSIVE_STATUSES.includes(status);

  // Log current state before changing
  const { data: preState } = await supabase
    .from('bot_sessions')
    .select('state, pairing_code')
    .eq('id', sessionId)
    .single();
  console.log(`[PAIRING-STATE] Updating session=${sessionId}: ${preState?.state || 'unknown'} → ${status} (isRegression=${isRegression}, hasPairingCode=${!!preState?.pairing_code}) at=${timestamp}`);

  const updatePayload: Record<string, any> = {
    state: status,
    updated_at: timestamp
  };

  const clearedFields: string[] = [];

  if (status === 'active') {
    updatePayload.last_active = timestamp;
    updatePayload.qr_code = null;
    updatePayload.qr_expires_at = null;
    updatePayload.qr_generated_at = null;
    updatePayload.pairing_code = null;
    clearedFields.push('qr_code', 'pairing_code');
    if (preState?.pairing_code) {
      console.log(`[PAIRING-STATE] Clearing pairing_code="${preState.pairing_code}" because session is now active`);
    }
  }

  if (status === 'needs_reauth') {
    updatePayload.qr_code = null;
    updatePayload.qr_expires_at = null;
    updatePayload.qr_generated_at = null;
    updatePayload.pairing_code = null;
    updatePayload.auth_state = null;
    clearedFields.push('qr_code', 'pairing_code', 'auth_state');
  }

  let query = supabase
    .from('bot_sessions')
    .update(updatePayload)
    .eq('id', sessionId);

  // When setting a regressive state, add a filter so the update only applies
  // if the session is NOT already in a protected (higher) state.
  if (isRegression) {
    for (const ps of PROTECTED_STATES) {
      query = query.neq('state', ps);
    }
  }

  const { error, count } = await query;

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`[PAIRING-STATE] Error updating status for ${sessionId} to ${status}:`, error);
    }
  } else if (isRegression && count === 0) {
    console.warn(`[PAIRING-STATE] BLOCKED state regression for ${sessionId}: attempted ${status} but session is in a protected state (current=${preState?.state})`);
  } else {
    const extra = clearedFields.length ? ` (cleared: ${clearedFields.join(', ')})` : '';
    console.log(`[DB] Status updated for ${sessionId}: ${status}${extra}`);
    // Invalidate Redis caches after state change
    await invalidateSessionCache(sessionId);
    await invalidateQRCache(sessionId);
  }
}

export async function clearAuthState(sessionId: string) {
  const { error } = await supabase
    .from('bot_sessions')
    .update({ auth_state: null, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error(`[DB] Error clearing auth state for ${sessionId}:`, error);
  } else {
    console.log(`[DB] Auth state cleared for ${sessionId}`);
  }
}

export async function updateSessionWorker(sessionId: string, workerUrl: string | null) {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      worker_url: workerUrl,
      state: 'qr_pending',
      pairing_code: null,
      qr_code: null,
      qr_expires_at: null,
      qr_generated_at: null,
      auth_state: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error(`Error updating worker for session ${sessionId}:`, error);
  } else {
    console.log(`[DB] Session ${sessionId} reassigned to worker: ${workerUrl ?? 'main'}`);
  }
}

/**
 * Find sessions stuck on unresponsive workers and reassign them.
 * Called periodically from the main service sync loop.
 */
export async function recoverStaleSessions(isWorkerHealthy: (url: string) => Promise<boolean>): Promise<number> {
  const STALE_THRESHOLD_MS = 90_000; // 90 seconds without update
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  const { data: stuck, error } = await supabase
    .from('bot_sessions')
    .select('id, worker_url, state, updated_at')
    .in('state', ['qr_pending', 'pairing_sent', 'needs_reauth'])
    .not('worker_url', 'is', null)
    .lt('updated_at', cutoff);

  if (error || !stuck || stuck.length === 0) return 0;

  console.log(`[RECOVERY] Found ${stuck.length} stale session(s) to check: ${stuck.map(s => `${s.id.slice(0,8)}(${s.state}@${s.worker_url})`).join(', ')}`);

  let recovered = 0;
  for (const session of stuck) {
    // needs_reauth = the worker already gave up and released the lock.
    // Clear the worker assignment so the session isn't stuck assigned to
    // a worker that's no longer managing it. The user can retry from the
    // dashboard, and the session will be assigned to any available worker.
    if (session.state === 'needs_reauth') {
      console.log(`[RECOVERY] Session ${session.id.slice(0, 8)} is needs_reauth on ${session.worker_url} — clearing worker assignment so user can retry`);
      const { error: updateErr } = await supabase
        .from('bot_sessions')
        .update({
          worker_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (!updateErr) {
        recovered++;
      } else {
        console.error(`[RECOVERY] Failed to clear worker for session ${session.id.slice(0, 8)}:`, updateErr);
      }
      continue;
    }

    const healthy = await isWorkerHealthy(session.worker_url);
    if (!healthy) {
      console.log(`[RECOVERY] Session ${session.id.slice(0, 8)} stuck on dead worker ${session.worker_url} (state=${session.state}, stale since ${session.updated_at}). Clearing auth and reassigning to main service.`);
      const { error: updateErr } = await supabase
        .from('bot_sessions')
        .update({
          worker_url: null,
          state: 'qr_pending',
          pairing_code: null,
          qr_code: null,
          auth_state: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (!updateErr) {
        recovered++;
        console.log(`[RECOVERY] Session ${session.id.slice(0, 8)} recovered successfully — reset to qr_pending on main`);
      } else {
        console.error(`[RECOVERY] Failed to recover session ${session.id.slice(0, 8)}:`, updateErr);
      }
    } else {
      console.log(`[RECOVERY] Worker ${session.worker_url} is healthy for session ${session.id.slice(0, 8)} — skipping`);
    }
  }
  return recovered;
}

/**
 * Count active pairing sessions per worker_url.
 * Used by assignWorkerAsync to pick the least-loaded worker.
 */
export async function getPairingCountsByWorker(): Promise<Record<string, number>> {
  const cached = getCached(pairingCountsCache, '__all__');
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: 'pairingCounts',
    fallbackValue: {} as Record<string, number>,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_sessions')
        .select('worker_url')
        .in('state', ['qr_pending', 'pairing_sent']);

      if (error || !data) return {};

      const counts: Record<string, number> = {};
      for (const row of data) {
        const key = row.worker_url || '__main__';
        counts[key] = (counts[key] || 0) + 1;
      }
      setCache(pairingCountsCache, '__all__', counts);
      return counts;
    },
  });
}

/**
 * Log a pairing event to the pairing_events table for audit trail.
 */
export async function logPairingEvent(
  sessionId: string,
  eventType: string,
  workerUrl: string | null,
  statusCode?: number,
  details?: Record<string, unknown>,
) {
  // Verify the session still exists before inserting to avoid FK violations.
  // Check Redis cache first to skip the Supabase round-trip when possible.
  const existsInRedis = await getCachedSessionExists(sessionId);
  if (!existsInRedis) {
    const { data: exists } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!exists) {
      console.warn(`[AUDIT] Skipping pairing event ${eventType} — session ${sessionId} not found in bot_sessions`);
      return;
    }
    await cacheSessionExists(sessionId);
  }

  const { error } = await supabase
    .from('pairing_events')
    .insert({
      session_id: sessionId,
      event_type: eventType,
      worker_url: workerUrl,
      status_code: statusCode ?? null,
      details: details ?? null,
    });

  if (error) {
    // Non-critical — don't block pairing flow on audit logging failures.
    // The table may not exist yet if the migration hasn't been run.
    if (error.code !== 'PGRST205' && error.code !== '42P01') {
      console.error(`[AUDIT] Failed to log pairing event ${eventType} for ${sessionId}:`, error.message);
    }
  }
}

/**
 * Acquire a DB-level pairing lock for a session.
 * Sets pairing_lock_acquired_at = NOW() so other workers can see
 * that a pairing is in progress on this worker.
 */
export async function acquirePairingLock(sessionId: string, workerUrl?: string | null): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      pairing_lock_acquired_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error && error.code !== 'PGRST205') {
    console.error(`[DB] Failed to acquire pairing lock for ${sessionId}:`, error);
  } else {
    await cachePairingLock(sessionId, workerUrl ?? null);
  }
}

/**
 * Release the DB-level pairing lock for a session.
 */
export async function releasePairingLock(sessionId: string, workerUrl?: string | null): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      pairing_lock_acquired_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error && error.code !== 'PGRST205') {
    console.error(`[DB] Failed to release pairing lock for ${sessionId}:`, error);
  } else {
    await invalidatePairingLock(workerUrl ?? null);
  }
}

/**
 * Check if any session on a given worker_url has a DB-level pairing lock
 * that is less than 3 minutes old (the pairing code TTL).
 */
export async function isWorkerPairingLocked(workerUrl: string | null): Promise<boolean> {
  // Try Redis first — avoids a Supabase round-trip on every sync cycle
  const cachedLock = await getCachedPairingLock(workerUrl);
  if (cachedLock) return true;

  const cutoff = new Date(Date.now() - 180_000).toISOString();

  let query = supabase
    .from('bot_sessions')
    .select('id')
    .gt('pairing_lock_acquired_at', cutoff)
    .limit(1);

  if (workerUrl) {
    query = query.eq('worker_url', workerUrl);
  } else {
    query = query.is('worker_url', null);
  }

  const { data, error } = await query;
  if (error) return false;
  const locked = (data?.length ?? 0) > 0;
  if (locked && data?.[0]) {
    await cachePairingLock(data[0].id, workerUrl);
  }
  return locked;
}

/**
 * Update the queue_position for a session so the dashboard can show
 * the user where they are in the pairing queue.
 */
export async function updateQueuePosition(sessionId: string, position: number | null): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      queue_position: position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error && error.code !== 'PGRST205') {
    console.error(`[DB] Failed to update queue position for ${sessionId}:`, error);
  }
}

export async function savePoll(sessionId: string, chatJid: string, question: string, options: string[], createdByJid: string) {
  const { data, error } = await supabase
    .from('polls')
    .insert({
      session_id: sessionId,
      group_jid: chatJid,
      question: question,
      options: options,
      created_by_jid: createdByJid,
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error saving poll:', error);
    }
    return null;
  }
  invalidateCache(sessionId);
  return data;
}

export async function recordVote(pollId: string, optionIndex: number) {
  const { data, error } = await supabase
    .from('polls')
    .select('votes')
    .eq('id', pollId)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST205') {
      console.error('Poll not found:', error);
    }
    return null;
  }

  const votes = data.votes || {};
  votes[optionIndex] = (votes[optionIndex] || 0) + 1;

  const { error: updateError } = await supabase
    .from('polls')
    .update({ votes: votes })
    .eq('id', pollId);

  if (updateError) {
    console.error('Error recording vote:', updateError);
    return null;
  }

  return { ...data, votes };
}

export async function getLeaderboard(sessionId: string, limit: number = 10) {
  const cacheKey = `${sessionId}:${limit}`;
  const cached = getCached(leaderboardCache, cacheKey);
  if (cached !== undefined) return cached;

  // Redis tier — survives across serverless invocations
  const redisCached = await getCachedLeaderboard(sessionId, limit);
  if (redisCached) {
    setCache(leaderboardCache, cacheKey, redisCached, CACHE_TTL_MEDIUM_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `leaderboard:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('user_jid, user_name, message_count')
        .eq('session_id', sessionId)
        .order('message_count', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.code !== 'PGRST205') {
          console.error('Error fetching leaderboard:', error);
        }
        return [];
      }
      const result = data || [];
      setCache(leaderboardCache, cacheKey, result, CACHE_TTL_MEDIUM_MS);
      await cacheLeaderboard(sessionId, limit, result);
      return result;
    },
  });
}

// ─── Feature Toggle Check ─────────────────────────────────────────────────────

// Features that default to OFF when no toggle row exists
const FEATURES_DEFAULT_OFF = new Set(['welcome', 'autoview', 'anti_delete']);

export async function getFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
  const cacheKey = `${userId}:${featureName}`;
  const cached = getCached(featureCache, cacheKey);
  if (cached !== undefined) return cached;

  const defaultVal = !FEATURES_DEFAULT_OFF.has(featureName);

  // Redis tier
  const redisCached = await getCachedFeature(userId, featureName);
  if (redisCached !== null) {
    setCache(featureCache, cacheKey, redisCached, CACHE_TTL_LONG_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `feature:${cacheKey}`,
    fallbackValue: defaultVal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_features')
        .select('enabled')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .single();

      let result: boolean;
      if (error) {
        result = defaultVal;
      } else {
        result = data?.enabled ?? defaultVal;
      }
      setCache(featureCache, cacheKey, result, CACHE_TTL_LONG_MS);
      await cacheFeature(userId, featureName, result);
      return result;
    },
  });
}

// ─── Leaderboard Tracking ─────────────────────────────────────────────────────

export async function incrementLeaderboard(sessionId: string, userJid: string, userName: string) {
  try {
    // Try Redis buffer first — avoids 2 Supabase calls per group message
    const buffered = await bufferLeaderboardIncrement(sessionId, userJid, userName);
    if (buffered) return;

    // Fallback: direct Supabase write
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('id, message_count')
      .eq('session_id', sessionId)
      .eq('user_jid', userJid)
      .single();

    if (existing) {
      await supabase
        .from('leaderboard')
        .update({
          message_count: (existing.message_count || 0) + 1,
          user_name: userName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('leaderboard').insert({
        session_id: sessionId,
        user_jid: userJid,
        user_name: userName,
        message_count: 1,
      });
    }
    invalidateCache(sessionId);
  } catch {
    // non-critical — leaderboard tracking should never break message handling
  }
}

/**
 * Flush buffered leaderboard increments from Redis to Supabase.
 * Call this periodically (e.g. every 30s) from the bot's main loop.
 */
export async function flushLeaderboardBuffers(): Promise<void> {
  try {
    const sessionIds = await getBufferedSessionIds();
    for (const sessionId of sessionIds) {
      const entries = await drainLeaderboardBuffer(sessionId);
      if (!entries) continue;
      for (const entry of entries) {
        const { data: existing } = await supabase
          .from('leaderboard')
          .select('id, message_count')
          .eq('session_id', sessionId)
          .eq('user_jid', entry.userJid)
          .single();

        if (existing) {
          await supabase
            .from('leaderboard')
            .update({
              message_count: (existing.message_count || 0) + entry.increment,
              user_name: entry.userName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('leaderboard').insert({
            session_id: sessionId,
            user_jid: entry.userJid,
            user_name: entry.userName,
            message_count: entry.increment,
          });
        }
      }
      await invalidateRedisPattern(`lb:${sessionId}:*`);
      invalidateCache(sessionId);
    }
  } catch (err) {
    console.error('[DB] Error flushing leaderboard buffers:', err);
  }
}

/**
 * Flush buffered message tracking from Redis to Supabase.
 * Call this periodically (e.g. every 30s) from the bot's main loop.
 */
export async function flushMessageBuffer(): Promise<void> {
  try {
    const messages = await drainMessageBuffer(50);
    if (messages.length === 0) return;
    const rows = messages.map((m) => ({
      session_id: m.session_id,
      sender_jid: m.sender_jid,
      sender_name: m.sender_name,
      content: m.content,
      message_type: m.message_type,
      is_group: m.is_group,
      group_jid: m.group_jid,
    }));
    const { error } = await supabase.from('messages').insert(rows);
    if (error) {
      console.error('[DB] Error flushing message buffer:', error);
    }
  } catch (err) {
    console.error('[DB] Error flushing message buffer:', err);
  }
}

// ─── Auto-Reply Rules ─────────────────────────────────────────────────────────

export async function getAutoReplies(sessionId: string) {
  const cached = getCached(autoReplyCache, sessionId);
  if (cached !== undefined) return cached;

  // Redis tier
  const redisCached = await getCachedAutoReplies(sessionId);
  if (redisCached) {
    setCache(autoReplyCache, sessionId, redisCached, CACHE_TTL_LONG_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `autoreplies:${sessionId}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_replies')
        .select('*')
        .eq('session_id', sessionId)
        .eq('enabled', true);

      if (error) {
        if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
          console.error('Error fetching auto replies:', error);
        }
        return [];
      }
      const result = data || [];
      setCache(autoReplyCache, sessionId, result, CACHE_TTL_LONG_MS);
      await cacheAutoReplies(sessionId, result);
      return result;
    },
  });
}

// ─── Active Poll Lookup ───────────────────────────────────────────────────────

export async function getActivePoll(sessionId: string, chatJid: string) {
  const cacheKey = `${sessionId}:${chatJid}`;
  const cached = getCached(pollCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `poll:${cacheKey}`,
    fallbackValue: null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('session_id', sessionId)
        .eq('group_jid', chatJid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setCache(pollCache, cacheKey, null);
        return null;
      }
      setCache(pollCache, cacheKey, data);
      return data;
    },
  });
}

// ─── New: User Settings ─────────────────────────────────────────────────

export async function getUserSettings(userId: string) {
  const cached = getCached(settingsCache, userId);
  if (cached !== undefined) return cached;

  // Redis tier
  const redisCached = await getCachedSettings(userId);
  if (redisCached) {
    setCache(settingsCache, userId, redisCached, CACHE_TTL_LONG_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `settings:${userId}`,
    fallbackValue: null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('user_id, bot_name, command_prefix, ai_model, ai_system_prompt')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== 'PGRST205') {
          console.error('Error fetching user settings:', error);
        }
        return null;
      }
      setCache(settingsCache, userId, data, CACHE_TTL_LONG_MS);
      await cacheSettings(userId, data);
      return data;
    },
  });
}

export async function upsertUserSettings(userId: string, settings: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting user settings:', error);
    return null;
  }
  invalidateCache(userId);
  await invalidateRedisKey(`settings:${userId}`);
  return data;
}

// ─── New: AFK State ───────────────────────────────────────────────────────────

export async function getAfkState(sessionId: string, userJid: string) {
  const cacheKey = `${sessionId}:${userJid}`;
  const cached = getCached(afkCache, cacheKey);
  if (cached !== undefined) return cached;

  // Redis tier
  const redisCached = await getCachedAfkState(sessionId, userJid);
  if (redisCached) {
    setCache(afkCache, cacheKey, redisCached);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `afk:${cacheKey}`,
    fallbackValue: null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('afk_states')
        .select('is_afk, afk_reason, afk_since')
        .eq('session_id', sessionId)
        .eq('user_jid', userJid)
        .single();

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== 'PGRST205') {
          console.error('Error fetching AFK state:', error);
        }
        setCache(afkCache, cacheKey, null);
        return null;
      }
      setCache(afkCache, cacheKey, data);
      await cacheAfkState(sessionId, userJid, data);
      return data;
    },
  });
}

export async function setAfkState(sessionId: string, userJid: string, isAfk: boolean, reason?: string) {
  const { error } = await supabase
    .from('afk_states')
    .upsert(
      {
        session_id: sessionId,
        user_jid: userJid,
        is_afk: isAfk,
        afk_reason: reason || null,
        afk_since: isAfk ? new Date().toISOString() : null,
      },
      { onConflict: 'session_id,user_jid' },
    );

  if (error) {
    console.error('Error setting AFK state:', error);
  }
  invalidateCache(`${sessionId}:${userJid}`);
  await invalidateRedisKey(`afk:${sessionId}:${userJid}`);
}

// ─── New: Get session's user_id for BYOK lookup ──────────────────────────────

export async function getSessionUserId(sessionId: string): Promise<string | null> {
  const cached = getCached(sessionUserIdCache, sessionId);
  if (cached !== undefined) return cached;

  // Try Redis before hitting Supabase — user_id never changes for a session
  const redisCached = await getCachedSessionUserId(sessionId);
  if (redisCached) {
    setCache(sessionUserIdCache, sessionId, redisCached, CACHE_TTL_LONG_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `sessionUser:${sessionId}`,
    fallbackValue: null as string | null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (error) {
        return null;
      }
      const result = data?.user_id || null;
      setCache(sessionUserIdCache, sessionId, result, CACHE_TTL_LONG_MS);
      if (result) {
        await cacheSessionUserId(sessionId, result);
      }
      return result;
    },
  });
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function createReminder(sessionId: string, userJid: string, chatJid: string, message: string, remindAt: Date) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      session_id: sessionId,
      user_jid: userJid,
      chat_jid: chatJid,
      message,
      remind_at: remindAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating reminder:', error);
    return null;
  }
  invalidateCache(`${sessionId}:${userJid}`);
  return data;
}

export async function getDueReminders(): Promise<any[]> {
  return resilientRead({
    cacheKey: 'dueReminders',
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, bot_sessions!inner(state)')
        .eq('delivered', false)
        .lte('remind_at', new Date().toISOString())
        .eq('bot_sessions.state', 'active')
        .limit(50);

      if (error) {
        console.error('[DB] Error fetching due reminders:', error);
        return [];
      }
      return data || [];
    },
  });
}

export async function markReminderDelivered(reminderId: string) {
  const { error } = await supabase
    .from('reminders')
    .update({ delivered: true })
    .eq('id', reminderId);

  if (error) {
    console.error('[DB] Error marking reminder delivered:', error);
  }
  remindersCache.clear();
}

export async function getUserReminders(sessionId: string, userJid: string): Promise<any[]> {
  const cacheKey = `${sessionId}:${userJid}`;
  const cached = getCached(remindersCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `reminders:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('id, message, remind_at')
        .eq('session_id', sessionId)
        .eq('user_jid', userJid)
        .eq('delivered', false)
        .order('remind_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[DB] Error fetching user reminders:', error);
        return [];
      }
      const result = data || [];
      setCache(remindersCache, cacheKey, result);
      return result;
    },
  });
}

export async function deleteReminder(reminderId: string, userJid: string) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_jid', userJid);

  if (error) {
    console.error('[DB] Error deleting reminder:', error);
    return false;
  }
  remindersCache.clear();
  return true;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function createNote(sessionId: string, userJid: string, title: string, content: string) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      session_id: sessionId,
      user_jid: userJid,
      title,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating note:', error);
    return null;
  }
  invalidateCache(`${sessionId}:${userJid}`);
  return data;
}

export async function getUserNotes(sessionId: string, userJid: string): Promise<any[]> {
  const cacheKey = `${sessionId}:${userJid}`;
  const cached = getCached(notesCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `notes:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, created_at')
        .eq('session_id', sessionId)
        .eq('user_jid', userJid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[DB] Error fetching user notes:', error);
        return [];
      }
      const result = data || [];
      setCache(notesCache, cacheKey, result);
      return result;
    },
  });
}

export async function deleteNote(noteId: string, userJid: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_jid', userJid);

  if (error) {
    console.error('[DB] Error deleting note:', error);
    return false;
  }
  notesCache.clear();
  return true;
}

// ─── Scheduled Messages ───────────────────────────────────────────────────────

export async function createScheduledMessage(sessionId: string, userJid: string, targetJid: string, message: string, sendAt: Date) {
  const { data, error } = await supabase
    .from('scheduled_messages')
    .insert({
      session_id: sessionId,
      user_jid: userJid,
      target_jid: targetJid,
      message,
      send_at: sendAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating scheduled message:', error);
    return null;
  }
  invalidateCache(`${sessionId}:${userJid}`);
  return data;
}

export async function getDueScheduledMessages(): Promise<any[]> {
  return resilientRead({
    cacheKey: 'dueScheduled',
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*, bot_sessions!inner(state)')
        .eq('sent', false)
        .lte('send_at', new Date().toISOString())
        .eq('bot_sessions.state', 'active')
        .limit(50);

      if (error) {
        console.error('[DB] Error fetching due scheduled messages:', error);
        return [];
      }
      return data || [];
    },
  });
}

export async function markScheduledMessageSent(messageId: string) {
  const { error } = await supabase
    .from('scheduled_messages')
    .update({ sent: true })
    .eq('id', messageId);

  if (error) {
    console.error('[DB] Error marking scheduled message sent:', error);
  }
  scheduledMsgsCache.clear();
}

export async function getUserScheduledMessages(sessionId: string, userJid: string): Promise<any[]> {
  const cacheKey = `${sessionId}:${userJid}`;
  const cached = getCached(scheduledMsgsCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `scheduled:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('id, message, send_at')
        .eq('session_id', sessionId)
        .eq('user_jid', userJid)
        .eq('sent', false)
        .order('send_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[DB] Error fetching user scheduled messages:', error);
        return [];
      }
      const result = data || [];
      setCache(scheduledMsgsCache, cacheKey, result);
      return result;
    },
  });
}

export async function deleteScheduledMessage(messageId: string, userJid: string) {
  const { error } = await supabase
    .from('scheduled_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_jid', userJid);

  if (error) {
    console.error('[DB] Error deleting scheduled message:', error);
    return false;
  }
  scheduledMsgsCache.clear();
  return true;
}

// ─── Session Stats ────────────────────────────────────────────────────────────

export async function getSessionStats(sessionId: string) {
  const cached = getCached(sessionStatsCache, sessionId);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `sessionStats:${sessionId}`,
    fallbackValue: { totalMessages: 0, topUsers: [] as any[], session: null },
    queryFn: async () => {
      const [messagesResult, leaderboardResult, sessionResult] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId),
        supabase
          .from('leaderboard')
          .select('user_jid, user_name, message_count')
          .eq('session_id', sessionId)
          .order('message_count', { ascending: false })
          .limit(5),
        supabase
          .from('bot_sessions')
          .select('created_at, last_active, state, session_name')
          .eq('id', sessionId)
          .single(),
      ]);

      const result = {
        totalMessages: messagesResult.count || 0,
        topUsers: leaderboardResult.data || [],
        session: sessionResult.data,
      };
      setCache(sessionStatsCache, sessionId, result, CACHE_TTL_MEDIUM_MS);
      return result;
    },
  });
}

// ─── Command & Message Tracking ───────────────────────────────────────────────

export async function trackCommand(
  sessionId: string,
  userId: string,
  senderJid: string,
  commandName: string,
): Promise<void> {
  await queueWrite('trackCommand', async () => {
    const { data: existing } = await supabase
      .from('user_stats')
      .select('id, total_commands')
      .eq('session_id', sessionId)
      .eq('sender_jid', senderJid)
      .single();

    if (existing) {
      await supabase
        .from('user_stats')
        .update({ total_commands: (existing.total_commands || 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_stats').insert({
        user_id: userId,
        session_id: sessionId,
        sender_jid: senderJid,
        total_commands: 1,
      });
    }
  });
}

export async function trackMessage(
  sessionId: string,
  senderJid: string,
  senderName: string | null,
  content: string | null,
  messageType: string,
  isGroup: boolean,
  groupJid: string | null,
): Promise<void> {
  // Try Redis buffer first — bulk-insert later to cut per-message Supabase writes
  const buffered = await bufferTrackMessage({
    session_id: sessionId,
    sender_jid: senderJid,
    sender_name: senderName,
    content: content ? content.substring(0, 500) : null,
    message_type: messageType,
    is_group: isGroup,
    group_jid: groupJid,
    timestamp: new Date().toISOString(),
  });
  if (buffered) return;

  // Fallback: direct Supabase insert
  await queueWrite('trackMessage', async () => {
    const { error } = await supabase.from('messages').insert({
      session_id: sessionId,
      sender_jid: senderJid,
      sender_name: senderName,
      content: content ? content.substring(0, 500) : null,
      message_type: messageType,
      is_group: isGroup,
      group_jid: groupJid,
    });
    if (error) throw error;
  });
}

// ─── Health Event Tracking ────────────────────────────────────────────────────

export type HealthEventType = 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'message_sent' | 'message_failed' | 'webhook_retry' | 'webhook_dead_letter';

export async function logHealthEvent(
  sessionId: string,
  eventType: HealthEventType,
  details?: string,
): Promise<void> {
  await queueWrite('logHealthEvent', async () => {
    const { error } = await supabase.from('bot_health_events').insert({
      session_id: sessionId,
      event_type: eventType,
      details: details ? details.substring(0, 500) : null,
    });
    if (error) throw error;
  });
}

export async function getHealthEvents(sessionId: string, limit = 50) {
  const cacheKey = `${sessionId}:${limit}`;
  const cached = getCached(healthEventsCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `healthEvents:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_health_events')
        .select('id, event_type, details, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[DB] Error fetching health events:', error);
        return [];
      }
      const result = data || [];
      setCache(healthEventsCache, cacheKey, result);
      return result;
    },
  });
}

export async function getHealthSummary(sessionIds: string[]) {
  if (!sessionIds.length) return { totalErrors: 0, totalReconnects: 0, recentEvents: [] };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [errResult, reconnResult, recentResult] = await Promise.all([
    supabase
      .from('bot_health_events')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .eq('event_type', 'error')
      .gte('created_at', since),
    supabase
      .from('bot_health_events')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .eq('event_type', 'reconnecting')
      .gte('created_at', since),
    supabase
      .from('bot_health_events')
      .select('*')
      .in('session_id', sessionIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    totalErrors: errResult.count || 0,
    totalReconnects: reconnResult.count || 0,
    recentEvents: recentResult.data || [],
  };
}

// ─── Webhook Retry Queue ──────────────────────────────────────────────────────

export async function enqueueWebhookRetry(
  sessionId: string,
  event: string,
  payload: unknown,
  errorMessage?: string,
): Promise<void> {
  try {
    await supabase.from('webhook_retry_queue').insert({
      session_id: sessionId,
      event,
      payload,
      error_message: errorMessage || null,
      next_retry_at: new Date(Date.now() + 5000).toISOString(),
    });
  } catch (error) {
    console.error('[DB] Error enqueuing webhook retry:', error);
  }
}

export async function getPendingWebhookRetries(limit = 10) {
  const cacheKey = `pending:${limit}`;
  const cached = getCached(webhookRetryCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `webhookRetry:${cacheKey}`,
    fallbackValue: [] as any[],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_retry_queue')
        .select('id, session_id, event, payload, attempts, next_retry_at')
        .eq('status', 'pending')
        .lte('next_retry_at', new Date().toISOString())
        .order('next_retry_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[DB] Error fetching webhook retries:', error);
        return [];
      }
      const result = data || [];
      setCache(webhookRetryCache, cacheKey, result);
      return result;
    },
  });
}

export async function markWebhookRetryProcessing(id: string): Promise<void> {
  await supabase.from('webhook_retry_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markWebhookRetryCompleted(id: string): Promise<void> {
  await supabase.from('webhook_retry_queue')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markWebhookRetryFailed(id: string, errorMessage: string, attempts: number, maxAttempts: number): Promise<void> {
  const isDeadLetter = attempts >= maxAttempts;
  const backoffMs = Math.min(1000 * Math.pow(2, attempts), 300000);

  await supabase.from('webhook_retry_queue')
    .update({
      status: isDeadLetter ? 'dead_letter' : 'pending',
      attempts,
      error_message: errorMessage,
      next_retry_at: isDeadLetter ? null : new Date(Date.now() + backoffMs).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// ─── Bot Settings (per-session, for !settings command) ────────────────────────

export async function getSessionSettings(sessionId: string) {
  const userId = await getSessionUserId(sessionId);
  if (!userId) return null;
  return getUserSettings(userId);
}

export async function updateSessionSettings(sessionId: string, updates: Record<string, unknown>) {
  const userId = await getSessionUserId(sessionId);
  if (!userId) return null;
  return upsertUserSettings(userId, updates);
}

// ─── Welcome / Goodbye Messages ───────────────────────────────────────────────

export async function getWelcomeMessage(sessionId: string, groupJid: string, messageType: 'welcome' | 'goodbye' = 'welcome'): Promise<string | null> {
  const cacheKey = `${sessionId}:${groupJid}:${messageType}`;
  const cached = getCached(welcomeCache, cacheKey);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `welcome:${cacheKey}`,
    fallbackValue: null as string | null,
    queryFn: async () => {
      const { data } = await supabase
        .from('welcome_messages')
        .select('message_text, enabled')
        .eq('session_id', sessionId)
        .eq('group_jid', groupJid)
        .eq('message_type', messageType)
        .single();

      const result = (data?.enabled && data.message_text) ? data.message_text : null;
      setCache(welcomeCache, cacheKey, result, CACHE_TTL_LONG_MS);
      return result;
    },
  });
}

export async function setFeatureEnabled(userId: string, sessionId: string, featureName: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('bot_features')
    .upsert(
      { user_id: userId, session_id: sessionId, feature_name: featureName, enabled },
      { onConflict: 'user_id,session_id,feature_name' },
    );

  if (error) {
    console.error('[DB] Error setting feature:', error);
    return false;
  }
  invalidateCache(userId);
  await invalidateRedisKey(`feature:${sessionId}:${featureName}`);
  return true;
}

export async function setWelcomeMessage(
  userId: string,
  sessionId: string,
  groupJid: string,
  messageText: string,
  messageType: 'welcome' | 'goodbye' = 'welcome',
): Promise<boolean> {
  const { error } = await supabase
    .from('welcome_messages')
    .upsert(
      {
        user_id: userId,
        session_id: sessionId,
        group_jid: groupJid,
        message_text: messageText,
        message_type: messageType,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,group_jid,message_type' },
    );

  if (error) {
    console.error('[DB] Error setting welcome message:', error);
    return false;
  }
  invalidateCache(sessionId);
  return true;
}

// ─── Monetization: Subscriptions ─────────────────────────────────────────────

const PLAN_CONFIGS: Record<string, { quotaLimit: number; sessionLimit: number; aiDailyLimit: number }> = {
  free: { quotaLimit: 300, sessionLimit: 1, aiDailyLimit: 10 },
  lite: { quotaLimit: 2000, sessionLimit: 1, aiDailyLimit: 50 },
  standard: { quotaLimit: 10000, sessionLimit: 3, aiDailyLimit: 200 },
  boss: { quotaLimit: -1, sessionLimit: 5, aiDailyLimit: -1 },
};

export interface SubscriptionInfo {
  plan: string;
  status: string;
  quotaLimit: number;
  quotaUsed: number;
  sessionLimit: number;
  aiDailyLimit: number;
}

export async function getUserSubscription(userId: string): Promise<SubscriptionInfo> {
  const defaults: SubscriptionInfo = {
    plan: 'free', status: 'active',
    quotaLimit: 300, quotaUsed: 0,
    sessionLimit: 1, aiDailyLimit: 10,
  };

  const cached = getCached(subscriptionCache, userId);
  if (cached !== undefined) return cached as SubscriptionInfo;

  // Redis tier
  const redisCached = await getCachedSubscription<SubscriptionInfo>(userId);
  if (redisCached) {
    setCache(subscriptionCache, userId, redisCached, CACHE_TTL_LONG_MS);
    return redisCached;
  }

  return resilientRead({
    cacheKey: `sub:${userId}`,
    fallbackValue: defaults,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status, quota_limit, quota_used, session_limit, ai_daily_limit, next_renewal')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        setCache(subscriptionCache, userId, defaults, CACHE_TTL_LONG_MS);
        await cacheSubscription(userId, defaults);
        return defaults;
      }

      if (data.plan !== 'free' && data.next_renewal) {
        const renewal = new Date(data.next_renewal);
        if (renewal < new Date()) {
          await supabase
            .from('subscriptions')
            .update({
              plan: 'free', status: 'expired',
              quota_limit: 300, quota_used: 0,
              session_limit: 1, ai_daily_limit: 10,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          setCache(subscriptionCache, userId, defaults, CACHE_TTL_LONG_MS);
          await cacheSubscription(userId, defaults);
          return defaults;
        }
      }

      const result: SubscriptionInfo = {
        plan: data.plan,
        status: data.status,
        quotaLimit: data.quota_limit,
        quotaUsed: data.quota_used,
        sessionLimit: data.session_limit,
        aiDailyLimit: data.ai_daily_limit,
      };
      setCache(subscriptionCache, userId, result, CACHE_TTL_LONG_MS);
      await cacheSubscription(userId, result);
      return result;
    },
  });
}

/**
 * Increment quota usage. Returns false if quota exceeded.
 */
export async function incrementQuotaUsage(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);

  // Unlimited plan
  if (sub.quotaLimit === -1) return true;

  if (sub.quotaUsed >= sub.quotaLimit) return false;

  await supabase
    .from('subscriptions')
    .update({
      quota_used: sub.quotaUsed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  invalidateCache(userId);
  return true;
}

/**
 * Reset monthly quota for all subscriptions (call from cron/scheduler).
 */
export async function resetMonthlyQuotas(): Promise<void> {
  await supabase
    .from('subscriptions')
    .update({ quota_used: 0, updated_at: new Date().toISOString() })
    .neq('plan', ''); // update all
}

// ─── Monetization: Rewards ───────────────────────────────────────────────────

const REWARD_ACTIONS: Record<string, { amount: number; dailyLimit: number; once?: boolean }> = {
  'first_session': { amount: 10, dailyLimit: 1, once: true },
  'command_use': { amount: 1, dailyLimit: 10 },
  'daily_active': { amount: 3, dailyLimit: 1 },
  'referral': { amount: 15, dailyLimit: 100 },
  'plan_upgrade': { amount: 30, dailyLimit: 1, once: true },
  'weekly_streak': { amount: 10, dailyLimit: 1 },
};

const CASHOUT_THRESHOLD = 100;

export interface RewardBalance {
  balance: number;
  totalEarned: number;
  totalCashedOut: number;
}

export async function getRewardBalance(userId: string): Promise<RewardBalance> {
  const cached = getCached(rewardBalanceCache, userId);
  if (cached !== undefined) return cached as RewardBalance;

  const defaults: RewardBalance = { balance: 0, totalEarned: 0, totalCashedOut: 0 };

  return resilientRead({
    cacheKey: `rewardBalance:${userId}`,
    fallbackValue: defaults,
    queryFn: async () => {
      const { data } = await supabase
        .from('reward_balances')
        .select('balance, total_earned, total_cashed_out')
        .eq('user_id', userId)
        .single();

      if (!data) {
        setCache(rewardBalanceCache, userId, defaults);
        return defaults;
      }

      const result: RewardBalance = {
        balance: data.balance,
        totalEarned: data.total_earned,
        totalCashedOut: data.total_cashed_out,
      };
      setCache(rewardBalanceCache, userId, result);
      return result;
    },
  });
}

/**
 * Credit reward to user. Handles daily limits and one-time actions.
 * Returns the amount credited (0 if limit reached).
 */
export async function creditReward(
  userId: string,
  action: string,
  description?: string,
): Promise<number> {
  const config = REWARD_ACTIONS[action];
  if (!config) return 0;

  // Check one-time actions
  if (config.once) {
    const { count } = await supabase
      .from('reward_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action);
    if ((count || 0) > 0) return 0;
  }

  // Check daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('reward_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount || 0) >= config.dailyLimit) return 0;

  const amount = config.amount;

  // Insert transaction
  await supabase.from('reward_transactions').insert({
    user_id: userId,
    action,
    amount,
    description: description || action,
  });

  // Upsert balance
  const current = await getRewardBalance(userId);
  const newBalance = current.balance + amount;
  const newTotalEarned = current.totalEarned + amount;

  await supabase.from('reward_balances').upsert({
    user_id: userId,
    balance: newBalance,
    total_earned: newTotalEarned,
    total_cashed_out: current.totalCashedOut,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  rewardBalanceCache.delete(userId);

  return amount;
}

/**
 * Check if balance meets cashout threshold. If so, initiate airtime cashout.
 * Returns true if cashout was triggered.
 */
export async function checkAndCashout(userId: string, phoneNumber: string): Promise<boolean> {
  const balance = await getRewardBalance(userId);
  if (balance.balance < CASHOUT_THRESHOLD) return false;

  // Import Inlomax client
  const { sendAirtime, detectNetwork } = await import('./utils/inlomax');

  const networkInfo = detectNetwork(phoneNumber);
  const result = await sendAirtime(phoneNumber, CASHOUT_THRESHOLD);

  // Record the cashout attempt
  await supabase.from('airtime_cashouts').insert({
    user_id: userId,
    phone_number: phoneNumber,
    amount: CASHOUT_THRESHOLD,
    network: networkInfo?.network || 'UNKNOWN',
    status: result.success ? 'success' : 'failed',
    inlomax_reference: result.reference,
    error_message: result.error,
  });

  if (result.success) {
    // Deduct from balance
    await supabase.from('reward_balances').update({
      balance: balance.balance - CASHOUT_THRESHOLD,
      total_cashed_out: balance.totalCashedOut + CASHOUT_THRESHOLD,
      last_cashout_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    rewardBalanceCache.delete(userId);

    return true;
  }

  return false;
}

// ─── Referral Code ───────────────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BW-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function getUserReferralCode(userId: string): Promise<{ code: string; totalReferred: number; totalEarned: number } | null> {
  const cached = getCached(referralCache, userId);
  if (cached !== undefined) return cached;

  return resilientRead({
    cacheKey: `referral:${userId}`,
    fallbackValue: null as { code: string; totalReferred: number; totalEarned: number } | null,
    queryFn: async () => {
      const { data: referral } = await supabase
        .from('referrals')
        .select('code, total_referred, total_earned')
        .eq('user_id', userId)
        .single();

      if (referral) {
        const result = { code: referral.code, totalReferred: referral.total_referred || 0, totalEarned: referral.total_earned || 0 };
        setCache(referralCache, userId, result);
        return result;
      }

      // Auto-create referral code
      const code = generateReferralCode();
      const { data: newRef, error } = await supabase
        .from('referrals')
        .insert({ user_id: userId, code, total_referred: 0, total_earned: 0, is_frozen: false, created_at: new Date().toISOString() })
        .select('code, total_referred, total_earned')
        .single();

      if (error || !newRef) return null;
      const result = { code: newRef.code, totalReferred: 0, totalEarned: 0 };
      setCache(referralCache, userId, result);
      return result;
    },
  });
}

/**
 * Check Supabase health by running a lightweight query.
 * Returns latency in ms and whether the connection is healthy.
 */
export async function checkSupabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('bot_sessions').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { healthy: false, latencyMs, error: `${error.code}: ${error.message}` };
    }
    return { healthy: true, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg = err?.message || String(err);
    // Detect Cloudflare 522 / connection timeout errors
    if (msg.includes('522') || msg.includes('timed out') || msg.includes('ECONNREFUSED')) {
      return { healthy: false, latencyMs, error: `Connection timeout (522): Supabase origin server unreachable` };
    }
    return { healthy: false, latencyMs, error: msg };
  }
}

export { PLAN_CONFIGS, REWARD_ACTIONS, CASHOUT_THRESHOLD };
