/**
 * Groups API for Telegram Mini App
 *
 * GET /api/telegram/groups?sessionId=X
 * Returns the list of active groups for a bot session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('telegram_groups')
      .select('chat_id, chat_title, chat_type, is_active, added_by_user_id, created_at')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GROUPS] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[GROUPS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 },
    );
  }
}
