/**
 * Bot Ignored Chats API
 *
 * GET    /api/telegram/bot/ignored-chats?sessionId=xxx
 * POST   /api/telegram/bot/ignored-chats  { sessionId, chatId, chatTitle? }
 * DELETE /api/telegram/bot/ignored-chats  { sessionId, chatId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function verifySession(userId: string, sessionId: string) {
  const admin = await createAdminClient();
  const { data } = await admin
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
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const admin = await createAdminClient();
    const { data } = await admin
      .from('bot_ignored_chats')
      .select('id, chat_id, chat_title, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[BOT-IGNORED] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch ignored chats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chatId, chatTitle } = await request.json();
    if (!sessionId || !chatId) {
      return NextResponse.json({ error: 'sessionId and chatId required' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('bot_ignored_chats')
      .upsert(
        { session_id: sessionId, chat_id: chatId, chat_title: chatTitle || null },
        { onConflict: 'session_id,chat_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[BOT-IGNORED] POST error:', error);
    return NextResponse.json({ error: 'Failed to add ignored chat' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chatId } = await request.json();
    if (!sessionId || !chatId) {
      return NextResponse.json({ error: 'sessionId and chatId required' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const admin = await createAdminClient();
    await admin
      .from('bot_ignored_chats')
      .delete()
      .eq('session_id', sessionId)
      .eq('chat_id', chatId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOT-IGNORED] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove ignored chat' }, { status: 500 });
  }
}
