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

    // Resetting XP without a chatId wipes EVERY group on the session. Only
    // the bot owner can do that. Group admins must scope to their own chat.
    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, chatId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, role } = auth;

    if (!chatId && role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

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
