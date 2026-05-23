/**
 * Telegram Bot/Userbot Config API
 * 
 * GET/PUT config for telegram_bot_configs or telegram_userbot_configs.
 * GET /api/telegram/config?sessionId=xxx&type=bot|userbot
 * PUT /api/telegram/config
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';
import {
  TELEGRAM_BOT_CONFIG_COLUMNS,
  USERBOT_CONFIG_COLUMNS,
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
    const type = searchParams.get('type') || 'bot';

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

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
    const body = await request.json();
    const { sessionId, type, initData, ...configFields } = body;

    // Writing the bot-wide config is bot-owner-only. Group admins cannot
    // change the session-wide defaults that affect every group they don't
    // administer. They must use /api/telegram/group-config with a chatId.
    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'owner' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const table = type === 'userbot' ? 'telegram_userbot_configs' : 'telegram_bot_configs';
    const validColumns = type === 'userbot' ? USERBOT_CONFIG_COLUMNS : TELEGRAM_BOT_CONFIG_COLUMNS;

    // Convert antilink_whitelist from string to array if needed
    if ('antilink_whitelist' in configFields) {
      configFields.antilink_whitelist = normalizeAntilinkWhitelist(configFields.antilink_whitelist);
    }

    // Filter to only valid DB columns
    let filtered = filterValidColumns(configFields, validColumns);

    // Validate numeric fields
    filtered = validateNumericFields(filtered);

    const { data: config, error } = await supabase
      .from(table)
      .upsert({
        session_id: sessionId,
        ...filtered,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
      .select()
      .single();

    if (error) {
      console.error('[TG-CONFIG] Upsert error:', error);
      return NextResponse.json(
        { error: parseSupabaseError(error), details: error.details || null },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[TG-CONFIG] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
