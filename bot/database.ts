import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function initDatabase() {
  console.log('Database initialized');
}

export async function getUserSessions(userId?: string) {
  let query = supabase
    .from('bot_sessions')
    .select('*')
    .in('state', ['qr_pending', 'active']);

  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching sessions:', error);
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
    console.error(`Error fetching session ${sessionId}:`, error);
    return null;
  }
  return data;
}

export async function getSessionsNeedingBot() {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('*')
    .in('state', ['qr_pending', 'active']);
  
  if (error) {
    console.error('Error fetching sessions needing bot:', error);
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
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error(`Error updating QR for session ${sessionId}:`, error);
  } else {
    console.log(`Updated QR for session ${sessionId}`);
  }
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const { error } = await supabase
    .from('bot_sessions')
    .update({ 
      state: status,
      last_active: status === 'active' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error(`Error updating status for session ${sessionId}:`, error);
  } else {
    console.log(`Updated status for session ${sessionId} to ${status}`);
  }
}

export async function savePoll(sessionId: string, chatJid: string, question: string, options: string[]) {
  const { error } = await supabase
    .from('auto_replies')
    .insert({
      user_id: sessionId,
      trigger_keyword: `poll_${chatJid}`,
      reply_text: JSON.stringify({ question, options, votes: {} }),
      is_active: true,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving poll:', error);
    return null;
  }
  return { sessionId, chatJid, question, options };
}

export async function recordVote(pollId: string, optionIndex: number) {
  const { data, error } = await supabase
    .from('auto_replies')
    .select('reply_text')
    .eq('id', pollId)
    .single();

  if (error || !data) {
    console.error('Poll not found:', error);
    return null;
  }

  const pollData = JSON.parse(data.reply_text);
  pollData.votes[optionIndex] = (pollData.votes[optionIndex] || 0) + 1;

  await supabase
    .from('auto_replies')
    .update({ reply_text: JSON.stringify(pollData) })
    .eq('id', pollId);

  return pollData;
}

export async function getLeaderboard(sessionId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender_jid, sender_name, count')
    .eq('session_id', sessionId)
    .order('count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
  return data;
}
