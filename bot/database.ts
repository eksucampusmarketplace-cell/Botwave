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
    .in('state', ['qr_pending', 'active', 'needs_reauth']);

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

export async function getSessionsNeedingBot() {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('*')
    .in('state', ['qr_pending', 'active', 'needs_reauth']);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error fetching sessions needing bot:', error);
    }
    return [];
  }
  return data;
}

export async function updateSessionQR(sessionId: string, qr: string, expiresAt: string) {
  const { error } = await supabase
    .from('bot_sessions')
    .update({
      qr_code: qr,
      qr_expires_at: expiresAt,
      state: 'qr_pending',
      auth_state: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`Error updating QR for session ${sessionId}:`, error);
    }
  } else {
    console.log(`Updated QR for session ${sessionId}`);
  }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const updatePayload: Record<string, string> = {
    state: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'active') {
    updatePayload.last_active = new Date().toISOString();
  }

  const { error } = await supabase
    .from('bot_sessions')
    .update(updatePayload)
    .eq('id', sessionId);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error(`Error updating status for session ${sessionId}:`, error);
    }
  } else {
    console.log(`Updated status for session ${sessionId} to ${status}`);
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

export async function getFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bot_features')
    .select('enabled')
    .eq('user_id', userId)
    .eq('feature_name', featureName)
    .single();

  if (error) {
    // Default to enabled if no feature toggle found
    return error.code === 'PGRST116';
  }
  return data?.enabled ?? true;
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
    .eq('is_active', true);

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
