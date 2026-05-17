/**
 * Session Persistence for Telegram Userbot
 * 
 * Saves and loads encrypted session strings from Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export async function saveSessionString(sessionId: string, sessionString: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('bot_sessions')
      .update({
        telegram_session_string: sessionString,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error(`[SESSION-PERSIST:${sessionId}] Save failed:`, error);
      return false;
    }

    console.log(`[SESSION-PERSIST:${sessionId}] Session string saved`);
    return true;
  } catch (err) {
    console.error(`[SESSION-PERSIST:${sessionId}] Save error:`, err);
    return false;
  }
}

export async function loadSessionString(sessionId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('telegram_session_string')
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;
    return data.telegram_session_string || null;
  } catch (err) {
    console.error(`[SESSION-PERSIST:${sessionId}] Load error:`, err);
    return null;
  }
}

export async function clearSessionString(sessionId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('bot_sessions')
      .update({
        telegram_session_string: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return !error;
  } catch {
    return false;
  }
}
