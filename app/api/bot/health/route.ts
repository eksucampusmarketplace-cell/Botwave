import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getCachedHealth, cacheHealth } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cached = await getCachedHealth(user.id);
    if (cached) return NextResponse.json({ success: true, data: cached });

    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, session_name, state, last_active, created_at')
      .eq('user_id', user.id);

    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          errors24h: 0,
          reconnects24h: 0,
          messagesDelivered24h: 0,
          messagesFailed24h: 0,
          webhookRetries: 0,
          webhookDeadLetters: 0,
          uptimeBySession: [],
          recentEvents: [],
        },
      });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [errCount, reconnCount, sentCount, failedCount, retryCount, dlCount, recentEvents] = await Promise.all([
      supabase.from('bot_health_events').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('event_type', 'error').gte('created_at', since24h),
      supabase.from('bot_health_events').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('event_type', 'reconnecting').gte('created_at', since24h),
      supabase.from('bot_health_events').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('event_type', 'message_sent').gte('created_at', since24h),
      supabase.from('bot_health_events').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('event_type', 'message_failed').gte('created_at', since24h),
      supabase.from('webhook_retry_queue').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('status', 'pending'),
      supabase.from('webhook_retry_queue').select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds).eq('status', 'dead_letter'),
      supabase.from('bot_health_events').select('id, session_id, event_type, details, created_at')
        .in('session_id', sessionIds).gte('created_at', since24h)
        .order('created_at', { ascending: false }).limit(30),
    ]);

    // Compute uptime per session from connect/disconnect events
    const uptimeBySession = (sessions || []).map(s => {
      const isOnline = s.state === 'active';
      const lastActive = s.last_active ? new Date(s.last_active).toISOString() : null;
      return {
        sessionId: s.id,
        sessionName: s.session_name,
        state: s.state,
        isOnline,
        lastActive,
        createdAt: s.created_at,
      };
    });

    const healthData = {
      errors24h: errCount.count || 0,
      reconnects24h: reconnCount.count || 0,
      messagesDelivered24h: sentCount.count || 0,
      messagesFailed24h: failedCount.count || 0,
      webhookRetries: retryCount.count || 0,
      webhookDeadLetters: dlCount.count || 0,
      uptimeBySession,
      recentEvents: recentEvents.data || [],
    };
    await cacheHealth(user.id, healthData);
    return NextResponse.json({ success: true, data: healthData });
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
  }
}
