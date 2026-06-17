/**
 * Telegram Moderation Log API
 * GET /api/telegram/modlog?sessionId=xxx&chatId=yyy&limit=50&offset=0
 *
 * Caller must be admin of the requested chat.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const chatId = params.get('chatId');
    const limit = parseInt(params.get('limit') || '50', 10);
    const offset = parseInt(params.get('offset') || '0', 10);

    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      chatId,
      requireRole: 'admin',
      requireChatId: true,
    });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const { data: logs, count } = await supabase
      .from('telegram_moderation_log')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return NextResponse.json({ success: true, data: logs || [], total: count || 0 });
  } catch (error) {
    console.error('[MODLOG] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch mod log' }, { status: 500 });
  }
}
