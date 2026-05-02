import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function initDatabase() {
  console.log('Database initialized');
}

export async function getUserSessions() {
  const { data, error } = await supabase
    .from('bot_sessions')
    .select('*');
  
  if (error) {
    console.error('Error fetching sessions:', error);
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
