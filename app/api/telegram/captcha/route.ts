/**
 * Unified CAPTCHA API for Mini App
 *
 * GET  /api/telegram/captcha?sessionId=X&chatId=Y - Get CAPTCHA settings
 * PUT  /api/telegram/captcha - Update CAPTCHA settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CAPTCHA_FIELDS = [
  'captcha_enabled',
  'captcha_mode',
  'captcha_mute_time',
  'captcha_kick',
  'captcha_kick_time',
  'captcha_rules',
  'captcha_button_text',
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Try per-group config first
    if (chatId) {
      const { data: groupConfig } = await supabase
        .from('telegram_group_configs')
        .select(CAPTCHA_FIELDS.join(','))
        .eq('session_id', sessionId)
        .eq('chat_id', chatId)
        .single();

      if (groupConfig) {
        return NextResponse.json({ success: true, data: groupConfig });
      }
    }

    // Fallback to global config
    const { data: globalConfig } = await supabase
      .from('telegram_bot_configs')
      .select(CAPTCHA_FIELDS.join(','))
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({ success: true, data: globalConfig || {} });
  } catch (error) {
    console.error('[TG-CAPTCHA-API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch CAPTCHA settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { sessionId, chatId, ...fields } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of CAPTCHA_FIELDS) {
      if (key in fields) updates[key] = fields[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    if (chatId) {
      const { error } = await supabase
        .from('telegram_group_configs')
        .upsert(
          { session_id: sessionId, chat_id: chatId, ...updates },
          { onConflict: 'session_id,chat_id' },
        )
        .select()
        .single();
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('telegram_bot_configs')
        .upsert(
          { session_id: sessionId, ...updates },
          { onConflict: 'session_id' },
        )
        .select()
        .single();
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-CAPTCHA-API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update CAPTCHA settings' }, { status: 500 });
  }
}
