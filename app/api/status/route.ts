import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('id, session_name, state, last_active, created_at, phone_number')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[STATUS API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    const now = Date.now();
    const allSessions = sessions || [];
    const activeSessions = allSessions.filter(s => s.state === 'active');
    const totalSessions = allSessions.length;

    const sessionStatuses = allSessions.map(s => {
      const isOnline = s.state === 'active';
      const lastSeen = s.last_active ? new Date(s.last_active).getTime() : null;
      const uptimeMs = isOnline && lastSeen ? now - new Date(s.created_at).getTime() : 0;

      return {
        id: s.id,
        name: `Bot ${s.session_name ? s.session_name.charAt(0).toUpperCase() + '***' : 'Unknown'}`,
        phone: 'Hidden',
        status: isOnline ? 'online' : s.state === 'needs_reauth' ? 'needs_reauth' : 'offline',
        lastActive: s.last_active,
        createdAt: s.created_at,
        uptimeDays: Math.floor(uptimeMs / (1000 * 60 * 60 * 24)),
      };
    });

    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { count: events24h } = await supabase
      .from('bot_health_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h);

    const overallUptime = totalSessions > 0
      ? Math.round((activeSessions.length / totalSessions) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalSessions,
          activeSessions: activeSessions.length,
          uptimePercent: overallUptime,
          events24h: events24h || 0,
          lastChecked: new Date().toISOString(),
        },
        sessions: sessionStatuses,
      },
    });
  } catch (error) {
    console.error('[STATUS API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
