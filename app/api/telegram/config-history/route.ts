/**
 * Telegram Config History API
 * 
 * GET /api/telegram/config-history?sessionId=xxx&type=bot|group&chatId=xxx
 *   List config snapshots for versioning/rollback.
 * 
 * POST /api/telegram/config-history  { sessionId, type, chatId?, snapshot, changeSummary? }
 *   Save a config snapshot (called automatically on save).
 * 
 * PUT /api/telegram/config-history   { sessionId, snapshotId }
 *   Rollback to a specific snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const configType = params.get('type') || 'bot';
    const chatId = params.get('chatId');

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    let query = supabase
      .from('telegram_config_history')
      .select('id, config_type, chat_id, change_summary, changed_by, created_at')
      .eq('session_id', sessionId)
      .eq('config_type', configType)
      .order('created_at', { ascending: false })
      .limit(10);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    }

    const { data: history } = await query;

    return NextResponse.json({ success: true, data: history || [] });
  } catch (error) {
    console.error('[CONFIG-HISTORY] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch config history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, type, chatId, snapshot, changeSummary } = await request.json();
    if (!sessionId || !snapshot) {
      return NextResponse.json({ error: 'sessionId and snapshot required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('telegram_config_history')
      .insert({
        session_id: sessionId,
        config_type: type || 'bot',
        chat_id: chatId || null,
        config_snapshot: snapshot,
        changed_by: user.id,
        change_summary: changeSummary || null,
      })
      .select('id, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[CONFIG-HISTORY] POST error:', error);
    return NextResponse.json({ error: 'Failed to save config history' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, snapshotId } = await request.json();
    if (!sessionId || !snapshotId) {
      return NextResponse.json({ error: 'sessionId and snapshotId required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Load snapshot
    const { data: snapshot } = await supabase
      .from('telegram_config_history')
      .select('config_snapshot, config_type, chat_id')
      .eq('id', snapshotId)
      .eq('session_id', sessionId)
      .single();

    if (!snapshot) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });

    const configData = snapshot.config_snapshot as Record<string, unknown>;

    // Remove internal fields
    delete configData.id;
    delete configData.created_at;
    delete configData.updated_at;

    let table: string;
    let onConflict: string;
    const upsertData: Record<string, unknown> = {
      ...configData,
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    };

    if (snapshot.config_type === 'group' && snapshot.chat_id) {
      table = 'telegram_group_configs';
      onConflict = 'session_id,chat_id';
      upsertData.chat_id = snapshot.chat_id;
    } else if (snapshot.config_type === 'userbot') {
      table = 'userbot_config';
      onConflict = 'session_id';
    } else {
      table = 'telegram_bot_configs';
      onConflict = 'session_id';
    }

    const { error } = await supabase
      .from(table)
      .upsert(upsertData, { onConflict })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Config rolled back successfully' });
  } catch (error) {
    console.error('[CONFIG-HISTORY] PUT error:', error);
    return NextResponse.json({ error: 'Failed to rollback config' }, { status: 500 });
  }
}
