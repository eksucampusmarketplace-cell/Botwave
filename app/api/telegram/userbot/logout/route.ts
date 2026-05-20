/**
 * Telegram Userbot Logout API
 * 
 * POST /api/telegram/userbot/logout  { sessionId }
 * Clears the session string from the database to force re-login.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId } = body;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const admin = await createAdminClient();

    // Verify the session belongs to the user
    const { data: session } = await admin
      .from('bot_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('platform', 'telegram_userbot')
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Clear session string and set state to disconnected
    await admin
      .from('bot_sessions')
      .update({
        session_string: null,
        state: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Clear userbot config's session-specific data
    await admin
      .from('userbot_config')
      .update({
        welcome_sent: false,
      })
      .eq('session_id', sessionId);

    return NextResponse.json({ success: true, message: 'Userbot logged out. Session string cleared.' });
  } catch (error) {
    console.error('Userbot logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
