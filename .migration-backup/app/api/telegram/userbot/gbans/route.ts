/**
 * Telegram Userbot GBan API
 * 
 * GET /api/telegram/userbot/gbans?sessionId=xxx
 * POST /api/telegram/userbot/gbans  { sessionId, userId, reason }
 * DELETE /api/telegram/userbot/gbans  { sessionId, userId }
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
      .from('userbot_gbans')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[UB-GBANS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch gbans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, userId: targetUserId, reason } = await request.json();
    if (!sessionId || !targetUserId) {
      return NextResponse.json({ error: 'sessionId and userId required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('userbot_gbans')
      .upsert(
        { session_id: sessionId, user_id: targetUserId, reason: reason || '' },
        { onConflict: 'session_id,user_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[UB-GBANS] POST error:', error);
    return NextResponse.json({ error: 'Failed to add gban' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, userId: targetUserId } = await request.json();
    if (!sessionId || !targetUserId) {
      return NextResponse.json({ error: 'sessionId and userId required' }, { status: 400 });
    }
    if (!(await verifySession(supabase, sessionId, user.id))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await supabase
      .from('userbot_gbans')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', targetUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UB-GBANS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove gban' }, { status: 500 });
  }
}
