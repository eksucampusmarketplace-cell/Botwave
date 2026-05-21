/**
 * Telegram Analytics Summary API
 *
 * GET /api/telegram/analytics/summary?sessionId=X&chatId=Y
 * Returns aggregate stats for the mini app Stats tab.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const chatId = params.get('chatId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Count total active groups for this session
    let groupQuery = supabase
      .from('telegram_groups')
      .select('chat_id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('is_active', true);

    if (chatId) {
      groupQuery = groupQuery.eq('chat_id', chatId);
    }

    const { count: totalGroups } = await groupQuery;

    // Get member count from group configs (chat_member_count field if available)
    let memberQuery = supabase
      .from('telegram_group_configs')
      .select('chat_member_count')
      .eq('session_id', sessionId);

    if (chatId) {
      memberQuery = memberQuery.eq('chat_id', chatId);
    }

    const { data: groupConfigs } = await memberQuery;
    const totalMembers = (groupConfigs || []).reduce(
      (sum, g) => sum + ((g as Record<string, number>).chat_member_count || 0),
      0,
    );

    // Count XP entries as a proxy for active users
    let xpQuery = supabase
      .from('telegram_xp')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (chatId) {
      xpQuery = xpQuery.eq('chat_id', chatId);
    }

    const { count: activeUsers } = await xpQuery;

    // Estimate messages in last 7 days from modlog entries
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let modlogQuery = supabase
      .from('telegram_modlog')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', sevenDaysAgo);

    if (chatId) {
      modlogQuery = modlogQuery.eq('chat_id', chatId);
    }

    const { count: modActions7d } = await modlogQuery;

    return NextResponse.json({
      success: true,
      data: {
        total_groups: totalGroups || 0,
        total_members: totalMembers || 0,
        active_users: activeUsers || 0,
        messages_7d: modActions7d || 0,
        mod_actions_7d: modActions7d || 0,
      },
    });
  } catch (error) {
    console.error('[TG-ANALYTICS] Summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
