/**
 * Telegram Notes CRUD API
 * GET /api/telegram/notes?sessionId=xxx
 * POST /api/telegram/notes (create)
 * DELETE /api/telegram/notes?sessionId=xxx&name=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

// The DB column is `note_name` but the dashboard / mini-app speak `name`.
// Map between the two so neither side has to know about the other.
type NoteRow = {
  id: string;
  session_id: string;
  chat_id: string;
  note_name: string;
  content: string;
  media_type: string | null;
  media_file_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function toApiNote(row: NoteRow) {
  const { note_name, ...rest } = row;
  return { ...rest, name: note_name };
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId');

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const { data: notes } = await supabase
      .from('telegram_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    const mapped = ((notes as NoteRow[] | null) || []).map(toApiNote);
    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('[TG-NOTES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chat_id, name, content, media_type, media_file_id, initData } = await request.json();
    if (!name || !content) {
      return NextResponse.json({ error: 'name and content required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, telegramUserId, ownerUserId } = auth;

    const { data, error } = await supabase
      .from('telegram_notes')
      .upsert({
        session_id: sessionId,
        chat_id: chat_id || '0',
        note_name: String(name).toLowerCase(),
        content,
        media_type: media_type || null,
        media_file_id: media_file_id || null,
        created_by: telegramUserId || ownerUserId || null,
      }, { onConflict: 'session_id,chat_id,note_name' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: data ? toApiNote(data as NoteRow) : null });
  } catch (error) {
    console.error('[TG-NOTES] POST error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const name = params.get('name');
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    await supabase
      .from('telegram_notes')
      .delete()
      .eq('session_id', sessionId)
      .eq('note_name', name.toLowerCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-NOTES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
