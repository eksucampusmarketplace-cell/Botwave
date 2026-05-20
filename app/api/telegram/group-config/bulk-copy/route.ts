/**
 * Telegram Group Config Bulk Copy API
 * 
 * POST /api/telegram/group-config/bulk-copy
 * { sessionId, sourceChatId, targetChatIds: number[], fields?: string[] }
 * 
 * Copies config from one group to one or more target groups.
 * Optionally specify which fields to copy; defaults to all.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  TELEGRAM_GROUP_CONFIG_COLUMNS,
  filterValidColumns,
} from '@/lib/telegram-valid-columns';

export const dynamic = 'force-dynamic';

const SKIP_FIELDS = new Set([
  'id', 'session_id', 'chat_id', 'chat_title',
  'created_at', 'updated_at',
  'last_summary_sent_at',
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, sourceChatId, targetChatIds, fields } = await request.json();

    if (!sessionId || !sourceChatId || !Array.isArray(targetChatIds) || targetChatIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionId, sourceChatId, and targetChatIds[] are required' },
        { status: 400 },
      );
    }

    if (targetChatIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 target groups at a time' }, { status: 400 });
    }

    // Verify session
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Load source config
    const { data: sourceConfig } = await supabase
      .from('telegram_group_configs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chat_id', sourceChatId)
      .single();

    if (!sourceConfig) {
      return NextResponse.json({ error: 'Source group config not found' }, { status: 404 });
    }

    // Build the fields to copy
    let configToCopy: Record<string, unknown> = {};

    if (fields && Array.isArray(fields) && fields.length > 0) {
      // Only copy specified fields
      for (const field of fields) {
        if (SKIP_FIELDS.has(field)) continue;
        if (TELEGRAM_GROUP_CONFIG_COLUMNS.has(field) && field in sourceConfig) {
          configToCopy[field] = sourceConfig[field];
        }
      }
    } else {
      // Copy all config fields (except identifiers)
      configToCopy = filterValidColumns(sourceConfig, TELEGRAM_GROUP_CONFIG_COLUMNS);
      for (const skip of SKIP_FIELDS) {
        delete configToCopy[skip];
      }
    }

    if (Object.keys(configToCopy).length === 0) {
      return NextResponse.json({ error: 'No valid fields to copy' }, { status: 400 });
    }

    // Apply to each target
    const results: { chatId: number; success: boolean; error?: string }[] = [];

    for (const targetChatId of targetChatIds) {
      if (targetChatId === sourceChatId) continue;

      const { error } = await supabase
        .from('telegram_group_configs')
        .upsert(
          {
            session_id: sessionId,
            chat_id: targetChatId,
            ...configToCopy,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,chat_id' },
        );

      results.push({
        chatId: targetChatId,
        success: !error,
        error: error?.message,
      });
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      message: `Config copied to ${successCount}/${results.length} groups`,
      results,
    });
  } catch (error) {
    console.error('[GROUP-CONFIG] Bulk copy error:', error);
    return NextResponse.json({ error: 'Failed to bulk copy config' }, { status: 500 });
  }
}
