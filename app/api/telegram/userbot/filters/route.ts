/**
 * Telegram Userbot Filters API
 * 
 * GET /api/telegram/userbot/filters?sessionId=xxx
 * POST /api/telegram/userbot/filters  { sessionId, chatId, keyword, response }
 * DELETE /api/telegram/userbot/filters  { sessionId, chatId, keyword }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function verifySession(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, userId: string) {
  const { data } = await supabase
    .from('bot_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  return !!data;
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

    const { data } = await supabase
      .from('userbot_filters')
      .select('*')
      .eq('session_id', sessionId)
      .order('keyword');

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[UB-FILTERS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chatId, keyword, response } = await request.json();
    if (!sessionId || !keyword || !response) {
      return NextResponse.json({ error: 'sessionId, keyword, and response required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('userbot_filters')
      .upsert(
        { session_id: sessionId, chat_id: chatId || 'global', keyword: keyword.toLowerCase(), response },
        { onConflict: 'session_id,chat_id,keyword' },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[UB-FILTERS] POST error:', error);
    return NextResponse.json({ error: 'Failed to save filter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chatId, keyword } = await request.json();
    if (!sessionId || !keyword) {
      return NextResponse.json({ error: 'sessionId and keyword required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await supabase
      .from('userbot_filters')
      .delete()
      .eq('session_id', sessionId)
      .eq('chat_id', chatId || 'global')
      .eq('keyword', keyword.toLowerCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UB-FILTERS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
