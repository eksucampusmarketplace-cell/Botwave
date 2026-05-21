import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    // Get total members count from analytics
    const { count: totalMembers } = await supabase
      .from('telegram_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('chat_id', chatId || '');

    // Get messages in last 7 days
    const { count: messages7d } = await supabase
      .from('telegram_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', sevenDaysAgo);

    // Get active users in last 7 days
    const { data: activeUsersData } = await supabase
      .from('telegram_analytics')
      .select('user_id')
      .eq('session_id', sessionId)
      .gte('created_at', sevenDaysAgo);

    const uniqueUsers = new Set(activeUsersData?.map(a => a.user_id) || []);

    // Get top users by XP
    const { data: topUsers } = await supabase
      .from('telegram_xp')
      .select('user_id, xp, level')
      .eq('session_id', sessionId)
      .order('xp', { ascending: false })
      .limit(10);

    // Get mod actions count
    const { count: modActions } = await supabase
      .from('telegram_mod_log')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', sevenDaysAgo);

    return NextResponse.json({
      success: true,
      data: {
        total_members: totalMembers || 0,
        messages_7d: messages7d || 0,
        active_users_7d: uniqueUsers.size,
        top_users: topUsers || [],
        mod_actions: modActions || 0,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS-SUMMARY] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
