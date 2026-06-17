/**
 * Unified CAPTCHA API for Mini App
 *
 * GET  /api/telegram/captcha?sessionId=X&chatId=Y - Get per-group CAPTCHA settings
 * PUT  /api/telegram/captcha - Update per-group CAPTCHA settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

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
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');

    const auth = await authorizeTelegramRequest(request, {
      sessionId,
      chatId,
      requireRole: 'admin',
      requireChatId: true,
    });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const { data: groupConfig } = await supabase
      .from('telegram_group_configs')
      .select(CAPTCHA_FIELDS.join(','))
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .single();

    return NextResponse.json({ success: true, data: groupConfig || {} });
  } catch (error) {
    console.error('[TG-CAPTCHA-API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch CAPTCHA settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, chatId, initData, ...fields } = body;

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, chatId, requireRole: 'admin', requireChatId: true },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const updates: Record<string, unknown> = {};
    for (const key of CAPTCHA_FIELDS) {
      if (key in fields) updates[key] = fields[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('telegram_group_configs')
      .upsert(
        { session_id: sessionId, chat_id: chatId, ...updates },
        { onConflict: 'session_id,chat_id' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-CAPTCHA-API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update CAPTCHA settings' }, { status: 500 });
  }
}
