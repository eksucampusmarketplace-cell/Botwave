/**
 * Telegram Filters CRUD API
 * GET /api/telegram/filters?sessionId=xxx&chatId=yyy
 * POST /api/telegram/filters (create/update)
 * DELETE /api/telegram/filters?sessionId=xxx&keyword=xxx&chatId=yyy
 *
 * Group admins must pass chatId so they can only see/modify filters for the
 * chat they administer. Bot owner can omit chatId for a session-wide view.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const chatId = params.get('chatId');

    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      chatId,
      requireRole: 'admin',
    });
    if (!auth.ok) return auth.response;
    const { supabase, role } = auth;

    let query = supabase
      .from('telegram_filters')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (chatId) {
      query = query.eq('chat_id', chatId);
    } else if (role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const { data: filters } = await query;
    return NextResponse.json({ success: true, data: filters || [] });
  } catch (error) {
    console.error('[TG-FILTERS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, keyword, response, media_type, media_file_id, initData } = body;
    const chatId = body.chatId ?? body.chat_id ?? null;

    if (!keyword || !response) {
      return NextResponse.json({ error: 'keyword and response required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, chatId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, telegramUserId, ownerUserId, role } = auth;

    if (!chatId && role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('telegram_filters')
      .upsert({
        session_id: sessionId,
        chat_id: chatId || '0',
        keyword: String(keyword).toLowerCase(),
        response,
        media_type: media_type || null,
        media_file_id: media_file_id || null,
        created_by: telegramUserId || ownerUserId || null,
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
    const chatId = params.get('chatId');
    if (!keyword) {
      return NextResponse.json({ error: 'keyword required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      chatId,
      requireRole: 'admin',
    });
    if (!auth.ok) return auth.response;
    const { supabase, role } = auth;

    let q = supabase
      .from('telegram_filters')
      .delete()
      .eq('session_id', sessionId)
      .eq('keyword', keyword.toLowerCase());

    if (chatId) {
      q = q.eq('chat_id', chatId);
    } else if (role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    await q;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-FILTERS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
