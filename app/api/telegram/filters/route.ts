/**
 * Telegram Filters CRUD API
 * GET /api/telegram/filters?sessionId=xxx
 * POST /api/telegram/filters (create/update)
 * DELETE /api/telegram/filters?sessionId=xxx&keyword=xxx
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

    const { data: filters } = await supabase
      .from('telegram_filters')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: filters || [] });
  } catch (error) {
    console.error('[TG-FILTERS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chat_id, keyword, response, media_type, media_file_id } = await request.json();
    if (!sessionId || !keyword || !response) {
      return NextResponse.json({ error: 'sessionId, keyword, response required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('telegram_filters')
      .upsert({
        session_id: sessionId,
        chat_id: chat_id || '0',
        keyword,
        response,
        media_type: media_type || null,
        media_file_id: media_file_id || null,
        created_by: user.id,
      }, { onConflict: 'session_id,chat_id,keyword' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[TG-FILTERS] POST error:', error);
    return NextResponse.json({ error: 'Failed to save filter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const keyword = params.get('keyword');
    if (!sessionId || !keyword) {
      return NextResponse.json({ error: 'sessionId and keyword required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await supabase
      .from('telegram_filters')
      .delete()
      .eq('session_id', sessionId)
      .eq('keyword', keyword);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-FILTERS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
