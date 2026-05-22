/**
 * Telegram Bot Messages API
 *
 * GET /api/telegram/messages?sessionId=X           - global bot messages
 * GET /api/telegram/messages?sessionId=X&chatId=Y  - per-group overrides (falls back to global)
 * PUT /api/telegram/messages - update global or per-group messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = [
  'start_text',
  'start_group_dm_text',
  'help_text',
  'welcome_message',
  'goodbye_message',
  'rules_text',
  'start_buttons_json',
  'welcome_image_url',
  'goodbye_image_url',
];

const GROUP_MESSAGE_FIELDS = [
  'welcome_message',
  'goodbye_message',
  'rules_text',
  'welcome_image_url',
  'goodbye_image_url',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    // Always fetch global config
    const { data: globalConfig } = await supabase
      .from('telegram_bot_configs')
      .select(EDITABLE_FIELDS.join(','))
      .eq('session_id', sessionId)
      .single();

    const result: Record<string, unknown> = { ...((globalConfig as unknown as Record<string, unknown>) || {}) };

    // If chatId is provided, overlay per-group overrides
    if (chatId) {
      const { data: groupConfig } = await supabase
        .from('telegram_group_configs')
        .select(GROUP_MESSAGE_FIELDS.join(','))
        .eq('session_id', sessionId)
        .eq('chat_id', chatId)
        .single();

      if (groupConfig) {
        for (const field of GROUP_MESSAGE_FIELDS) {
          const val = (groupConfig as unknown as Record<string, unknown>)[field];
          if (val !== null && val !== undefined && val !== '') {
            result[field] = val;
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[TG-MESSAGES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, chatId, initData, ...fields } = body;

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    // Separate global fields from per-group fields
    const globalUpdates: Record<string, unknown> = {};
    const groupUpdates: Record<string, unknown> = {};

    for (const key of EDITABLE_FIELDS) {
      if (key in fields) {
        if (chatId && GROUP_MESSAGE_FIELDS.includes(key)) {
          groupUpdates[key] = fields[key];
        } else {
          globalUpdates[key] = fields[key];
        }
      }
    }

    // Update global config if there are global fields
    if (Object.keys(globalUpdates).length > 0) {
      const { error } = await supabase
        .from('telegram_bot_configs')
        .upsert(
          {
            session_id: sessionId,
            ...globalUpdates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' },
        )
        .select()
        .single();

      if (error) throw error;
    }

    // Update per-group config if chatId is provided and there are group fields
    if (chatId && Object.keys(groupUpdates).length > 0) {
      const { error } = await supabase
        .from('telegram_group_configs')
        .upsert(
          {
            session_id: sessionId,
            chat_id: chatId,
            ...groupUpdates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,chat_id' },
        )
        .select()
        .single();

      if (error) throw error;
    }

    if (Object.keys(globalUpdates).length === 0 && Object.keys(groupUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-MESSAGES] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
  }
}
