/**
 * Telegram Bot Token Validation Endpoint
 * 
 * Validates a Telegram bot token by calling getMe on the Bot API.
 * POST /api/telegram/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 });
    }

    // Validate token format (number:alphanumeric)
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token.trim())) {
      return NextResponse.json({
        error: 'Invalid token format. Expected format: 123456789:ABCDefGhIjKlMnOpQrStUvWxYz',
      }, { status: 400 });
    }

    // Call Telegram getMe to validate the token
    const response = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json({
        success: false,
        error: 'Invalid bot token. Please check with @BotFather.',
      }, { status: 400 });
    }

    const botInfo = data.result;

    return NextResponse.json({
      success: true,
      data: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
        canJoinGroups: botInfo.can_join_groups,
        canReadAllGroupMessages: botInfo.can_read_all_group_messages,
        supportsInlineQueries: botInfo.supports_inline_queries,
      },
    });
  } catch (error) {
    console.error('[TG-VALIDATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 },
    );
  }
}
