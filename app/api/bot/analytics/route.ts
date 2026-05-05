import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's sessions
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, session_name')
      .eq('user_id', user.id);

    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          messagesByDay: [],
          messagesByType: [],
          commandBreakdown: [],
          topGroups: [],
          peakHours: [],
        },
      });
    }

    // Messages by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('timestamp, message_type, is_group, group_jid, content')
      .in('session_id', sessionIds)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: true });

    const messages = recentMessages || [];

    // Aggregate messages by day
    const dayMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    const hourMap: Record<number, number> = {};
    const groupMap: Record<string, number> = {};
    const commandMap: Record<string, number> = {};

    for (const msg of messages) {
      // By day
      const day = new Date(msg.timestamp).toISOString().split('T')[0];
      dayMap[day] = (dayMap[day] || 0) + 1;

      // By type
      const type = msg.message_type || 'text';
      typeMap[type] = (typeMap[type] || 0) + 1;

      // By hour
      const hour = new Date(msg.timestamp).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;

      // Top groups
      if (msg.is_group && msg.group_jid) {
        groupMap[msg.group_jid] = (groupMap[msg.group_jid] || 0) + 1;
      }

      // Command breakdown
      if (msg.content && msg.content.startsWith('!')) {
        const cmd = msg.content.split(' ')[0].toLowerCase();
        commandMap[cmd] = (commandMap[cmd] || 0) + 1;
      }
    }

    // Format data
    const messagesByDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const messagesByType = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const commandBreakdown = Object.entries(commandMap)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topGroups = Object.entries(groupMap)
      .map(([jid, count]) => ({ jid, name: jid.split('@')[0], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      count: hourMap[i] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        messagesByDay,
        messagesByType,
        commandBreakdown,
        topGroups,
        peakHours,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
