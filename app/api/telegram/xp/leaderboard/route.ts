/**
 * Telegram XP Leaderboard API
 * GET /api/telegram/xp/leaderboard?sessionId=xxx&chatId=xxx&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const chatId = params.get('chatId');
    const limit = parseInt(params.get('limit') || '20', 10);

    const auth = chatId
      ? await authorizeTelegramRequest(request, {
          sessionId,
          chatId,
          requireRole: 'user',
          requireChatId: true,
        })
      : await authorizeTelegramRequest(request, {
          sessionId,
          requireRole: 'owner',
          source: 'cookie',
        });

    if (!auth.ok) return auth.response;
    const { supabase } = auth;

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
