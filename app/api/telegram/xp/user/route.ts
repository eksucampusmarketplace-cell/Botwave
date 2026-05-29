import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId');

    if (!sessionId || !chatId || !userId) {
      return NextResponse.json(
        { error: 'sessionId, chatId, and userId are required' },
        { status: 400 },
      );
    }

    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      requireRole: 'owner',
      source: 'cookie',
    });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

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
