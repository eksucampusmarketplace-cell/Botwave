import { createClient } from '@supabase/supabase-js';

// Validate required environment variables at module load
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
  
  // Check if tables exist - fail fast if missing
  const { error } = await supabase.from('bot_sessions').select('id').limit(1);
  if (error && error.code === 'PGRST205') {
    throw new Error(
      'CRITICAL: bot_sessions table not found in Supabase.\n' +
      'Please run the migrations in order:\n' +
      '  1. supabase/migrations/001_initial_schema.sql\n' +
      '  2. supabase/migrations/002_rate_limit_settings.sql\n' +
      '  3. supabase/migrations/003_service_role_policies.sql\n' +
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
  // Only include last_active when status is 'active'
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
  // Using the correct 'polls' table from the schema
  const { data, error } = await supabase
    .from('polls')
    .insert({
      session_id: sessionId,
      group_jid: chatJid,
      question: question,
      options: options,
      created_by_jid: createdByJid, // Real sender JID passed from caller
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