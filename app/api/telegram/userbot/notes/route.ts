/**
 * Telegram Userbot Notes API
 * 
 * GET /api/telegram/userbot/notes?sessionId=xxx
 * POST /api/telegram/userbot/notes  { sessionId, name, content }
 * DELETE /api/telegram/userbot/notes  { sessionId, name }
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
      .from('userbot_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('name');

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[UB-NOTES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, name, content } = await request.json();
    if (!sessionId || !name || !content) {
      return NextResponse.json({ error: 'sessionId, name, and content required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('userbot_notes')
      .upsert(
        { session_id: sessionId, name: name.toLowerCase(), content },
        { onConflict: 'session_id,name' },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[UB-NOTES] POST error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, name } = await request.json();
    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await supabase
      .from('userbot_notes')
      .delete()
      .eq('session_id', sessionId)
      .eq('name', name.toLowerCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UB-NOTES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
