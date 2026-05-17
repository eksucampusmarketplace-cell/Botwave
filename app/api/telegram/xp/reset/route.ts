/**
 * Telegram XP Reset API
 * POST /api/telegram/xp/reset { sessionId, chatId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chatId } = await request.json();
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
      .delete()
      .eq('session_id', sessionId);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'XP reset successfully' });
  } catch (error) {
    console.error('[TG-XP] Reset error:', error);
    return NextResponse.json({ error: 'Failed to reset XP' }, { status: 500 });
  }
}
