/**
 * Telegram Filters CRUD API
 * GET /api/telegram/filters?sessionId=xxx
 * POST /api/telegram/filters (create/update)
 * DELETE /api/telegram/filters?sessionId=xxx&keyword=xxx
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
    const { sessionId, chat_id, keyword, response, media_type, media_file_id, initData } = await request.json();
    if (!keyword || !response) {
      return NextResponse.json({ error: 'keyword and response required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, telegramUserId, ownerUserId } = auth;

    const { data, error } = await supabase
      .from('telegram_filters')
      .upsert({
        session_id: sessionId,
        chat_id: chat_id || '0',
        keyword,
        response,
        media_type: media_type || null,
        media_file_id: media_file_id || null,
        created_by: telegramUserId || ownerUserId,
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
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const keyword = params.get('keyword');
    if (!keyword) {
      return NextResponse.json({ error: 'keyword required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

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
