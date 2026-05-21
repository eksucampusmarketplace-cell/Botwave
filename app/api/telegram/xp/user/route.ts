import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId');

    if (!sessionId || !chatId || !userId) {
      return NextResponse.json(
        { error: 'sessionId, chatId, and userId are required' },
        { status: 400 }
      );
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get user XP data
    const { data: xpData } = await supabase
      .from('telegram_xp')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    if (!xpData) {
      return NextResponse.json({
        success: true,
        data: { xp: 0, level: 1, rank: 0, messages: 0 },
      });
    }

    // Calculate rank
    const { count: rank } = await supabase
      .from('telegram_xp')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .gt('xp', xpData.xp || 0);

    return NextResponse.json({
      success: true,
      data: {
        xp: xpData.xp || 0,
        level: xpData.level || 1,
        rank: (rank || 0) + 1,
        messages: xpData.messages || 0,
      },
    });
  } catch (error) {
    console.error('[XP-USER] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch XP data' }, { status: 500 });
  }
}
