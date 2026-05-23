/**
 * Telegram Moderation Log API
 * GET /api/telegram/modlog?sessionId=xxx&chatId=yyy&limit=50&offset=0
 *
 * Caller must be admin of the requested chat (or bot owner for session-wide).
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
    });
    if (!auth.ok) return auth.response;
    const { supabase, role } = auth;

    let query = supabase
      .from('telegram_moderation_log')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    } else if (role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const { data: logs, count } = await query;
    return NextResponse.json({ success: true, data: logs || [], total: count || 0 });
  } catch (error) {
    console.error('[MODLOG] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch mod log' }, { status: 500 });
  }
}
