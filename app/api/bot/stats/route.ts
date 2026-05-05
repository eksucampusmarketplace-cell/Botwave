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
      .select('id, state, last_active, created_at')
      .eq('user_id', user.id);

    const sessionIds = (sessions || []).map(s => s.id);
    const activeSessions = (sessions || []).filter(s => s.state === 'active');

    let totalMessages = 0;
    let totalCommands = 0;

    if (sessionIds.length > 0) {
      // Count messages for user's sessions
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      totalMessages = msgCount || 0;

      // Sum total_commands from user_stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('total_commands')
        .in('session_id', sessionIds);
      totalCommands = (statsData || []).reduce((sum, s) => sum + (s.total_commands || 0), 0);
    }

    // Calculate uptime: percentage of time any session has been active
    // Based on longest-running active session
    let uptimePercent = 0;
    if (activeSessions.length > 0) {
      const now = Date.now();
      const oldestActive = activeSessions.reduce((oldest, s) => {
        const created = new Date(s.created_at).getTime();
        return created < oldest ? created : oldest;
      }, now);
      const totalLifetimeMs = now - oldestActive;
      // If session is currently active, compute uptime from last_active
      // Simple heuristic: if active and last_active recent, high uptime
      const lastActive = activeSessions[0].last_active
        ? new Date(activeSessions[0].last_active).getTime()
        : now;
      const timeSinceLastActive = now - lastActive;
      // If last active within 5 minutes, consider it up
      if (timeSinceLastActive < 5 * 60 * 1000 && totalLifetimeMs > 0) {
        uptimePercent = Math.min(99, Math.round((totalLifetimeMs / (totalLifetimeMs + 60_000)) * 100));
      } else if (totalLifetimeMs > 0) {
        // Degrade uptime if not recently active
        uptimePercent = Math.max(0, Math.round(((totalLifetimeMs - timeSinceLastActive) / totalLifetimeMs) * 100));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalMessages,
        totalCommands,
        uptimePercent,
        activeSessions: activeSessions.length,
        totalSessions: (sessions || []).length,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
