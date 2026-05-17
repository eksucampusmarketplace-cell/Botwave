/**
 * User Role API for Telegram Mini App
 *
 * GET /api/telegram/user-role?sessionId=X&userId=Y
 * Returns the role of the user: "owner", "admin", or "user"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId and userId are required' },
        { status: 400 },
      );
    }

    // Check if user is the bot owner (from config)
    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select('owner_user_id')
      .eq('session_id', sessionId)
      .single();

    if (config?.owner_user_id && config.owner_user_id === userId) {
      return NextResponse.json({ success: true, role: 'owner' });
    }

    // Check if user is a sudo user
    const { data: sudo } = await supabase
      .from('telegram_sudo_users')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sudo) {
      return NextResponse.json({ success: true, role: 'admin' });
    }

    // Default: regular user
    return NextResponse.json({ success: true, role: 'user' });
  } catch (error) {
    console.error('[USER-ROLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to determine user role' },
      { status: 500 },
    );
  }
}
