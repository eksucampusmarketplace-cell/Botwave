/**
 * Telegram Notes CRUD API
 * GET /api/telegram/notes?sessionId=xxx
 * POST /api/telegram/notes (create)
 * DELETE /api/telegram/notes?sessionId=xxx&name=xxx
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

    const { data: notes } = await supabase
      .from('telegram_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: notes || [] });
  } catch (error) {
    console.error('[TG-NOTES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, chat_id, name, content, media_type, media_file_id } = await request.json();
    if (!sessionId || !name || !content) {
      return NextResponse.json({ error: 'sessionId, name, content required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('telegram_notes')
      .upsert({
        session_id: sessionId,
        chat_id: chat_id || '0',
        name,
        content,
        media_type: media_type || null,
        media_file_id: media_file_id || null,
        created_by: user.id,
      }, { onConflict: 'session_id,chat_id,name' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[TG-NOTES] POST error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const name = params.get('name');
    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await supabase
      .from('telegram_notes')
      .delete()
      .eq('session_id', sessionId)
      .eq('name', name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-NOTES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
