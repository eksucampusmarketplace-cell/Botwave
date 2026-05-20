/**
 * Telegram User Info API
 * 
 * GET /api/telegram/user-info?sessionId=xxx&chatId=xxx&userId=xxx
 * 
 * Returns user profile data from XP, warnings, and mod log.
 * Used by the Mini App member profile popup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const chatId = params.get('chatId');
    const userId = params.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'sessionId and userId required' }, { status: 400 });
    }

    // Verify session
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Fetch XP data
    let xpQuery = supabase
      .from('telegram_xp')
      .select('xp, level, messages_count, username, display_name, last_message_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (chatId) xpQuery = xpQuery.eq('chat_id', chatId);

    const { data: xpData } = await xpQuery.single();

    // Fetch warnings
    let warnQuery = supabase
      .from('telegram_warnings')
      .select('id, reason, warned_by, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (chatId) warnQuery = warnQuery.eq('chat_id', chatId);

    const { data: warnings } = await warnQuery;

    // Fetch recent mod actions involving this user
    let modlogQuery = supabase
      .from('telegram_modlog')
      .select('action, reason, admin_id, admin_name, created_at')
      .eq('session_id', sessionId)
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (chatId) modlogQuery = modlogQuery.eq('chat_id', chatId);

    const { data: modActions } = await modlogQuery;

    return NextResponse.json({
      success: true,
      data: {
        userId,
        username: xpData?.username || null,
        displayName: xpData?.display_name || null,
        xp: xpData?.xp || 0,
        level: xpData?.level || 1,
        messagesCount: xpData?.messages_count || 0,
        lastActive: xpData?.last_message_at || null,
        warnings: warnings || [],
        warningCount: warnings?.length || 0,
        recentModActions: modActions || [],
      },
    });
  } catch (error) {
    console.error('[TG-USER-INFO] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 500 });
  }
}
