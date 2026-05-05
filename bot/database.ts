import { createClient } from '@supabase/supabase-js';

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
}

export async function getSessionById(sessionId: string) {
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
  return data;
}

export async function getSessionsNeedingBot(selfUrl?: string, isWorker?: boolean) {
  // Only fetch actionable states. needs_reauth sessions require user
  // interaction (re-pair from the dashboard) — workers can't do anything
  // with them and including them just pollutes sync logs.
  const actionableStates = ['qr_pending', 'pairing_sent', 'active'];

  let query = supabase
    .from('bot_sessions')
    .select('*')
    .in('state', actionableStates);

  if (selfUrl && isWorker) {
    // Dedicated worker: only pick up sessions explicitly assigned to it
    query = query.eq('worker_url', selfUrl);
  } else {
    // Main service: pick up sessions that have no worker assigned
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
    .neq('state', 'pairing_sent');  // never overwrite pairing_sent

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`Error updating QR for session ${sessionId}:`, error);
    }
  } else {
    console.log(`Updated QR for session ${sessionId}`);
  }
}

export async function updateSessionPairingCode(sessionId: string, code: string) {
  console.log(`[DB] Saving pairing code for ${sessionId}: ${code}`);
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      pairing_code: code,
      state: 'qr_pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error(`[DB] ERROR saving pairing code for ${sessionId}:`, error);
  } else {
    console.log(`[DB] Pairing code saved successfully for ${sessionId}`);
  }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const updatePayload: Record<string, any> = {
    state: status,
    updated_at: new Date().toISOString()
  };

  const clearedFields: string[] = [];

  if (status === 'active') {
    updatePayload.last_active = new Date().toISOString();
    updatePayload.qr_code = null;
    updatePayload.qr_expires_at = null;
    updatePayload.qr_generated_at = null;
    updatePayload.pairing_code = null;
    clearedFields.push('qr_code', 'pairing_code');
  }

  if (status === 'needs_reauth') {
    updatePayload.qr_code = null;
    updatePayload.qr_expires_at = null;
    updatePayload.qr_generated_at = null;
    updatePayload.pairing_code = null;
    updatePayload.auth_state = null;
    clearedFields.push('qr_code', 'pairing_code', 'auth_state');
  }

  const { error } = await supabase
    .from('bot_sessions')
    .update(updatePayload)
    .eq('id', sessionId);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`[DB] Error updating status for ${sessionId} to ${status}:`, error);
    }
  } else {
    const extra = clearedFields.length ? ` (cleared: ${clearedFields.join(', ')})` : '';
    console.log(`[DB] Status updated for ${sessionId}: ${status}${extra}`);
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
  return counts;
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
  // The session may have been deleted between the time the event occurred and
  // the audit log insert (race condition with cascade deletes).
  const { data: exists } = await supabase
    .from('bot_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!exists) {
    console.warn(`[AUDIT] Skipping pairing event ${eventType} — session ${sessionId} not found in bot_sessions`);
    return;
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
export async function acquirePairingLock(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      pairing_lock_acquired_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error && error.code !== 'PGRST205') {
    console.error(`[DB] Failed to acquire pairing lock for ${sessionId}:`, error);
  }
}

/**
 * Release the DB-level pairing lock for a session.
 */
export async function releasePairingLock(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      pairing_lock_acquired_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error && error.code !== 'PGRST205') {
    console.error(`[DB] Failed to release pairing lock for ${sessionId}:`, error);
  }
}

/**
 * Check if any session on a given worker_url has a DB-level pairing lock
 * that is less than 3 minutes old (the pairing code TTL).
 */
export async function isWorkerPairingLocked(workerUrl: string | null): Promise<boolean> {
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
  return (data?.length ?? 0) > 0;
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
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('session_id', sessionId)
    .order('message_count', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error fetching leaderboard:', error);
    }
    return [];
  }
  return data;
}

// ─── Feature Toggle Check ─────────────────────────────────────────────────────

// Features that default to OFF when no toggle row exists
const FEATURES_DEFAULT_OFF = new Set(['welcome']);

export async function getFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bot_features')
    .select('enabled')
    .eq('user_id', userId)
    .eq('feature_name', featureName)
    .single();

  if (error) {
    // No row found — use feature-specific default
    if (error.code === 'PGRST116') {
      return !FEATURES_DEFAULT_OFF.has(featureName);
    }
    return !FEATURES_DEFAULT_OFF.has(featureName);
  }
  return data?.enabled ?? !FEATURES_DEFAULT_OFF.has(featureName);
}

// ─── Leaderboard Tracking ─────────────────────────────────────────────────────

export async function incrementLeaderboard(sessionId: string, userJid: string, userName: string) {
  try {
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
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
  } catch {
    // non-critical — leaderboard tracking should never break message handling
  }
}

// ─── Auto-Reply Rules ─────────────────────────────────────────────────────────

export async function getAutoReplies(sessionId: string) {
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
  return data || [];
}

// ─── Active Poll Lookup ───────────────────────────────────────────────────────

export async function getActivePoll(sessionId: string, chatJid: string) {
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
    return null;
  }
  return data;
}

// ─── New: User Settings (Groq API Key, etc.) ─────────────────────────────────

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.error('Error fetching user settings:', error);
    }
    return null;
  }
  return data;
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
  return data;
}

// ─── New: AFK State ───────────────────────────────────────────────────────────

export async function getAfkState(sessionId: string, userJid: string) {
  const { data, error } = await supabase
    .from('afk_states')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_jid', userJid)
    .single();

  if (error) {
    if (error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.error('Error fetching AFK state:', error);
    }
    return null;
  }
  return data;
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
}

// ─── New: Get session's user_id for BYOK lookup ──────────────────────────────

export async function getSessionUserId(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (error) {
    return null;
  }
  return data?.user_id || null;
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
  return data;
}

export async function getDueReminders(): Promise<any[]> {
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
}

export async function markReminderDelivered(reminderId: string) {
  const { error } = await supabase
    .from('reminders')
    .update({ delivered: true })
    .eq('id', reminderId);

  if (error) {
    console.error('[DB] Error marking reminder delivered:', error);
  }
}

export async function getUserReminders(sessionId: string, userJid: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_jid', userJid)
    .eq('delivered', false)
    .order('remind_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[DB] Error fetching user reminders:', error);
    return [];
  }
  return data || [];
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
  return data;
}

export async function getUserNotes(sessionId: string, userJid: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_jid', userJid)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[DB] Error fetching user notes:', error);
    return [];
  }
  return data || [];
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
  return data;
}

export async function getDueScheduledMessages(): Promise<any[]> {
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
}

export async function markScheduledMessageSent(messageId: string) {
  const { error } = await supabase
    .from('scheduled_messages')
    .update({ sent: true })
    .eq('id', messageId);

  if (error) {
    console.error('[DB] Error marking scheduled message sent:', error);
  }
}

export async function getUserScheduledMessages(sessionId: string, userJid: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_jid', userJid)
    .eq('sent', false)
    .order('send_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[DB] Error fetching user scheduled messages:', error);
    return [];
  }
  return data || [];
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
  return true;
}

// ─── Session Stats ────────────────────────────────────────────────────────────

export async function getSessionStats(sessionId: string) {
  const [messagesResult, leaderboardResult, sessionResult] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId),
    supabase
      .from('leaderboard')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_count', { ascending: false })
      .limit(5),
    supabase
      .from('bot_sessions')
      .select('created_at, last_active, state, session_name')
      .eq('id', sessionId)
      .single(),
  ]);

  return {
    totalMessages: messagesResult.count || 0,
    topUsers: leaderboardResult.data || [],
    session: sessionResult.data,
  };
}

// ─── Command & Message Tracking ───────────────────────────────────────────────

export async function trackCommand(
  sessionId: string,
  userId: string,
  senderJid: string,
  commandName: string,
): Promise<void> {
  try {
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
  } catch (error) {
    // Non-critical: don't crash the bot over stats
    console.error('[DB] Error tracking command:', error);
  }
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
  try {
    await supabase.from('messages').insert({
      session_id: sessionId,
      sender_jid: senderJid,
      sender_name: senderName,
      content: content ? content.substring(0, 500) : null,
      message_type: messageType,
      is_group: isGroup,
      group_jid: groupJid,
    });
  } catch (error) {
    console.error('[DB] Error tracking message:', error);
  }
}

// ─── Health Event Tracking ────────────────────────────────────────────────────

export type HealthEventType = 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'message_sent' | 'message_failed' | 'webhook_retry' | 'webhook_dead_letter';

export async function logHealthEvent(
  sessionId: string,
  eventType: HealthEventType,
  details?: string,
): Promise<void> {
  try {
    await supabase.from('bot_health_events').insert({
      session_id: sessionId,
      event_type: eventType,
      details: details ? details.substring(0, 500) : null,
    });
  } catch (error) {
    console.error('[DB] Error logging health event:', error);
  }
}

export async function getHealthEvents(sessionId: string, limit = 50) {
  const { data, error } = await supabase
    .from('bot_health_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DB] Error fetching health events:', error);
    return [];
  }
  return data || [];
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
  const { data, error } = await supabase
    .from('webhook_retry_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[DB] Error fetching webhook retries:', error);
    return [];
  }
  return data || [];
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
  const { data: session } = await supabase
    .from('bot_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!session) return null;

  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user_id)
    .single();

  return data || null;
}

export async function updateSessionSettings(sessionId: string, updates: Record<string, unknown>) {
  const { data: session } = await supabase
    .from('bot_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!session) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: session.user_id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating session settings:', error);
    return null;
  }
  return data;
}
