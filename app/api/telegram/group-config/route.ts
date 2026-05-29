/**
 * Telegram Group Config API
 *
 * GET /api/telegram/group-config?sessionId=X&chatId=Y
 * POST /api/telegram/group-config  { sessionId, chatId, ...configFields }
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';
import {
  TELEGRAM_GROUP_CONFIG_COLUMNS,
  filterValidColumns,
  normalizeAntilinkWhitelist,
  validateNumericFields,
  parseSupabaseError,
} from '@/lib/telegram-valid-columns';

export const dynamic = 'force-dynamic';

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

    const { data: config } = await supabase
      .from('telegram_group_configs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .single();

    // Convert antilink_whitelist array to comma-separated string for the UI
    if (config && Array.isArray(config.antilink_whitelist)) {
      config.antilink_whitelist = config.antilink_whitelist.join(', ');
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[GROUP-CONFIG] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch group config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, chatId, initData, ...configFields } = body;

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, chatId, requireRole: 'admin', requireChatId: true },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    // Convert antilink_whitelist from string to array if needed
    if ('antilink_whitelist' in configFields) {
      configFields.antilink_whitelist = normalizeAntilinkWhitelist(configFields.antilink_whitelist);
    }

    // Filter to only valid DB columns
    let filtered = filterValidColumns(configFields, TELEGRAM_GROUP_CONFIG_COLUMNS);

    // Validate numeric fields
    filtered = validateNumericFields(filtered);

    const { data: config, error } = await supabase
      .from('telegram_group_configs')
      .upsert(
        {
          session_id: sessionId,
          chat_id: chatId,
          ...filtered,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,chat_id' },
      )
      .select()
      .single();

    if (error) {
      console.error('[GROUP-CONFIG] Upsert error:', error);
      return NextResponse.json(
        { error: parseSupabaseError(error), details: error.details || null },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[GROUP-CONFIG] POST error:', error);
    return NextResponse.json({ error: 'Failed to update group config' }, { status: 500 });
  }
}
