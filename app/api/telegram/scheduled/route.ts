/**
 * Telegram Scheduled Messages API
 * GET /api/telegram/scheduled?sessionId=xxx
 * POST /api/telegram/scheduled (create)
 * DELETE /api/telegram/scheduled?sessionId=xxx&id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId');

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const { data: messages } = await supabase
      .from('telegram_scheduled_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('scheduled_at', { ascending: true });

    return NextResponse.json({ success: true, data: messages || [] });
  } catch (error) {
    console.error('[TG-SCHEDULED] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chat_id, message, scheduled_at, repeat_cron, initData } = await request.json();
    if (!chat_id || !message || !scheduled_at) {
      return NextResponse.json({ error: 'chat_id, message, scheduled_at required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const { data, error } = await supabase
      .from('telegram_scheduled_messages')
      .insert({
        session_id: sessionId,
        chat_id,
        message,
        scheduled_at,
        repeat_cron: repeat_cron || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[TG-SCHEDULED] POST error:', error);
    return NextResponse.json({ error: 'Failed to create scheduled message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const id = params.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    await supabase
      .from('telegram_scheduled_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-SCHEDULED] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled message' }, { status: 500 });
  }
}
