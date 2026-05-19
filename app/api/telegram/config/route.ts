/**
 * Telegram Bot/Userbot Config API
 * 
 * GET/PUT config for telegram_bot_configs or telegram_userbot_configs.
 * GET /api/telegram/config?sessionId=xxx&type=bot|userbot
 * PUT /api/telegram/config
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
    const type = searchParams.get('type') || 'bot';

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
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

    const table = type === 'userbot' ? 'telegram_userbot_configs' : 'telegram_bot_configs';
    const { data: config } = await supabase
      .from(table)
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Convert antilink_whitelist array to comma-separated string for the dashboard
    if (config && Array.isArray(config.antilink_whitelist)) {
      config.antilink_whitelist = config.antilink_whitelist.join(', ');
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[TG-CONFIG] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId, type, ...configFields } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
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

    const table = type === 'userbot' ? 'telegram_userbot_configs' : 'telegram_bot_configs';

    // Convert antilink_whitelist from string to array if needed
    if (typeof configFields.antilink_whitelist === 'string') {
      configFields.antilink_whitelist = configFields.antilink_whitelist
        ? configFields.antilink_whitelist.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
    }

    // Strip internal-only fields that don't exist in the DB
    delete configFields.id;
    delete configFields.created_at;

    const { data: config, error } = await supabase
      .from(table)
      .upsert({
        session_id: sessionId,
        ...configFields,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[TG-CONFIG] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
