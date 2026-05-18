/**
 * Telegram Bot Messages API
 *
 * GET /api/telegram/messages?sessionId=X - return all editable text fields
 * PUT /api/telegram/messages - update one or more text fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = [
  'start_text',
  'start_group_dm_text',
  'help_text',
  'welcome_message',
  'goodbye_message',
  'rules_text',
  'start_buttons_json',
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select(EDITABLE_FIELDS.join(','))
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({ success: true, data: config || {} });
  } catch (error) {
    console.error('[TG-MESSAGES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { sessionId, ...fields } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Only allow editable fields
    const updates: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in fields) {
        updates[key] = fields[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: config, error } = await supabase
      .from('telegram_bot_configs')
      .upsert(
        {
          session_id: sessionId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[TG-MESSAGES] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
  }
}
