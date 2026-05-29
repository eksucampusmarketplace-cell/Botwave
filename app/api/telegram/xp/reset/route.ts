/**
 * Telegram XP Reset API
 * POST /api/telegram/xp/reset { sessionId, chatId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chatId, initData } = await request.json();

    const auth = chatId
      ? await authorizeTelegramRequest(
          request,
          { sessionId, chatId: String(chatId), requireRole: 'admin', requireChatId: true },
          initData,
        )
      : await authorizeTelegramRequest(request, {
          sessionId,
          requireRole: 'owner',
          source: 'cookie',
        });

    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    let query = supabase
      .from('telegram_xp')
      .delete()
      .eq('session_id', sessionId);

    if (chatId) {
      query = query.eq('chat_id', String(chatId));
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'XP reset successfully' });
  } catch (error) {
    console.error('[TG-XP] Reset error:', error);
    return NextResponse.json({ error: 'Failed to reset XP' }, { status: 500 });
  }
}
