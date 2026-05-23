/**
 * Telegram Scheduled Messages API
 * GET /api/telegram/scheduled?sessionId=xxx
 * POST /api/telegram/scheduled (create)
 * DELETE /api/telegram/scheduled?sessionId=xxx&id=xxx
 *
 * The dashboard / mini-app speak {message, scheduled_at, status}; the DB
 * (telegram_scheduled_messages, migration 035) speaks
 * {content, next_send_at, is_active, schedule_type, time_of_day}. This
 * route translates between the two so neither side has to know about the
 * other.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

type ScheduledRow = {
  id: number;
  session_id: string;
  chat_id: number | string;
  content: string;
  schedule_type: string;
  time_of_day: string | null;
  next_send_at: string;
  max_sends: number | null;
  send_count: number;
  is_active: boolean;
  created_by: number | string | null;
  media_url: string | null;
  created_at: string;
};

/** DB → dashboard shape. Keeps existing dashboard fields working. */
function toApiScheduled(row: ScheduledRow) {
  return {
    id: row.id,
    session_id: row.session_id,
    chat_id: String(row.chat_id),
    message: row.content,
    scheduled_at: row.next_send_at,
    status: row.is_active ? 'pending' : 'sent',
    schedule_type: row.schedule_type,
    time_of_day: row.time_of_day,
    send_count: row.send_count,
    max_sends: row.max_sends,
    media_url: row.media_url,
    created_at: row.created_at,
  };
}

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
      .from('telegram_scheduled_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('next_send_at', { ascending: true });

    if (chatId) {
      query = query.eq('chat_id', Number(chatId));
    } else if (role !== 'owner') {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const { data: rows } = await query;
    const mapped = ((rows as ScheduledRow[] | null) || []).map(toApiScheduled);
    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('[TG-SCHEDULED] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      chat_id,
      message,
      scheduled_at,
      schedule_type,
      time_of_day,
      media_url,
      initData,
    } = await request.json();

    if (!chat_id || !message || !scheduled_at) {
      return NextResponse.json(
        { error: 'chat_id, message, scheduled_at required' },
        { status: 400 },
      );
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, chatId: String(chat_id), requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, telegramUserId } = auth;

    // chat_id is BIGINT in DB. Dashboard sends it as a string; coerce safely.
    const chatIdNum = Number(chat_id);
    if (!Number.isFinite(chatIdNum)) {
      return NextResponse.json({ error: 'chat_id must be numeric' }, { status: 400 });
    }

    // created_by is BIGINT on this table (Telegram user ids only). If the
    // caller is a dashboard user (UUID), leave it null rather than crash.
    const createdByNum = telegramUserId ? Number(telegramUserId) : null;

    const { data, error } = await supabase
      .from('telegram_scheduled_messages')
      .insert({
        session_id: sessionId,
        chat_id: chatIdNum,
        content: message,
        schedule_type: schedule_type || 'once',
        time_of_day: time_of_day || null,
        next_send_at: scheduled_at,
        is_active: true,
        media_url: media_url || null,
        created_by: Number.isFinite(createdByNum) ? createdByNum : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      data: data ? toApiScheduled(data as ScheduledRow) : null,
    });
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
    const chatId = params.get('chatId');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // id is SERIAL (integer) after migration 036.
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'id must be numeric' }, { status: 400 });
    }

    // Look up the chat_id from the row so we can scope auth correctly
    // without the caller having to know it.
    const adminClient = (await authorizeTelegramRequest(request, {
      sessionId,
      requireRole: 'admin',
    }));
    if (!adminClient.ok) return adminClient.response;
    const lookupSupabase = adminClient.supabase;
    const { data: row } = await lookupSupabase
      .from('telegram_scheduled_messages')
      .select('chat_id')
      .eq('session_id', sessionId)
      .eq('id', idNum)
      .maybeSingle();
    const rowChatId = row?.chat_id != null ? String(row.chat_id) : null;

    // Re-authorize against the row's chat_id (or caller-supplied chatId for
    // legacy clients). Group admins can only delete their own chat's rows.
    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      chatId: chatId ?? rowChatId,
      requireRole: 'admin',
    });
    if (!auth.ok) return auth.response;
    const { supabase, role } = auth;

    if (!rowChatId) {
      return NextResponse.json({ success: true });
    }
    if (chatId && chatId !== rowChatId && role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabase
      .from('telegram_scheduled_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('id', idNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-SCHEDULED] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled message' }, { status: 500 });
  }
}
