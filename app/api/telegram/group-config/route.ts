/**
 * Telegram Group Config API
 *
 * GET /api/telegram/group-config?sessionId=X&chatId=Y
 * POST /api/telegram/group-config  { sessionId, chatId, ...configFields }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');

    if (!sessionId || !chatId) {
      return NextResponse.json({ error: 'sessionId and chatId are required' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Special case: list all groups for this session
    if (chatId === '__list__') {
      const { data: groups } = await supabase
        .from('telegram_group_configs')
        .select('chat_id, chat_title')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false });
      return NextResponse.json({ success: true, data: groups || [] });
    }

    const { data: config } = await supabase
      .from('telegram_group_configs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .single();

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[GROUP-CONFIG] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch group config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId, chatId, ...configFields } = body;

    if (!sessionId || !chatId) {
      return NextResponse.json({ error: 'sessionId and chatId are required' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Remove fields that shouldn't be directly set
    delete configFields.id;
    delete configFields.created_at;
    delete configFields.updated_at;

    const { data: config, error } = await supabase
      .from('telegram_group_configs')
      .upsert(
        {
          session_id: sessionId,
          chat_id: chatId,
          ...configFields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,chat_id' },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[GROUP-CONFIG] POST error:', error);
    return NextResponse.json({ error: 'Failed to update group config' }, { status: 500 });
  }
}
