/**
 * Telegram Scheduled Messages API
 * GET /api/telegram/scheduled?sessionId=xxx
 * POST /api/telegram/scheduled (create)
 * DELETE /api/telegram/scheduled?sessionId=xxx&id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function verifySession(supabase: any, sessionId: string, userId: string) {
  const { data } = await supabase
    .from('bot_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chat_id, message, scheduled_at, repeat_cron } = await request.json();
    if (!sessionId || !chat_id || !message || !scheduled_at) {
      return NextResponse.json({ error: 'sessionId, chat_id, message, scheduled_at required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const id = params.get('id');
    if (!sessionId || !id) {
      return NextResponse.json({ error: 'sessionId and id required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
