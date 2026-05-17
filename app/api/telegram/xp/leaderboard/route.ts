/**
 * Telegram XP Leaderboard API
 * GET /api/telegram/xp/leaderboard?sessionId=xxx&chatId=xxx&limit=20
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
    const limit = parseInt(params.get('limit') || '20', 10);

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    let query = supabase
      .from('telegram_xp')
      .select('*')
      .eq('session_id', sessionId)
      .order('xp', { ascending: false })
      .limit(limit);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    }

    const { data: leaderboard } = await query;

    return NextResponse.json({ success: true, data: leaderboard || [] });
  } catch (error) {
    console.error('[TG-XP] Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
