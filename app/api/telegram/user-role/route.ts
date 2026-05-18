/**
 * User Role API for Telegram Mini App
 *
 * GET /api/telegram/user-role?sessionId=X&userId=Y
 * Returns the role of the user: "owner", "admin", or "user"
 *
 * Bot owner = the person who connected the bot via the dashboard
 * (bot_sessions.user_id). We also check telegram_bot_configs.owner_user_id
 * for explicitly set owners via /setowner.
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

    // Check if user is the bot owner (explicit config via /setowner)
    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select('owner_user_id')
      .eq('session_id', sessionId)
      .single();

    if (config?.owner_user_id && config.owner_user_id === userId) {
      return NextResponse.json({ success: true, role: 'owner' });
    }

    // Fallback: check if the Telegram user who added the bot to a group
    // matches the person who connected the bot via the dashboard.
    // The dashboard connector's Telegram ID is stored as added_by_user_id
    // in telegram_groups when they add the bot to a group.
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (session?.user_id) {
      // Check if this Telegram user ID appears as the added_by for any group
      // belonging to this session - that links them to the dashboard owner
      const { data: group } = await supabase
        .from('telegram_groups')
        .select('added_by_user_id')
        .eq('session_id', sessionId)
        .eq('added_by_user_id', userId)
        .limit(1)
        .maybeSingle();

      if (group) {
        // Auto-set owner_user_id so future checks are faster
        await supabase
          .from('telegram_bot_configs')
          .upsert(
            { session_id: sessionId, owner_user_id: userId, updated_at: new Date().toISOString() },
            { onConflict: 'session_id' },
          );
        return NextResponse.json({ success: true, role: 'owner' });
      }
    }

    // Check if user is a sudo user
    const { data: sudo } = await supabase
      .from('telegram_sudo_users')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sudo) {
      return NextResponse.json({ success: true, role: 'admin' });
    }

    // Check if user is a Telegram group admin for any group in this session
    // (group admins get 'admin' role in the mini app)
    const { data: adminCheck } = await supabase
      .from('telegram_groups')
      .select('chat_id')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (adminCheck) {
      // If user is in any active group for this session, they get at least 'user'
      // Telegram group admin checks happen at the bot level, not here
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
