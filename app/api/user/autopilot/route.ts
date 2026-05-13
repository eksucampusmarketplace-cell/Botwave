import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCachedAutopilot,
  cacheAutopilot,
  invalidateAutopilot,
} from '@/lib/redisApiCache';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for autopilot_personas (RLS only allows service_role)
    const adminSupabase = createClient(
      (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!),
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const sessionId = req.nextUrl.searchParams.get('sessionId');

    // If sessionId provided, fetch for that session; otherwise fetch all for user
    if (sessionId) {
      const cached = await getCachedAutopilot(user.id, sessionId);
      if (cached) return NextResponse.json(cached);

      const { data, error } = await adminSupabase
        .from('autopilot_personas')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const result = {
        enabled: data?.enabled ?? false,
        mode: data?.mode ?? 'offline',
        selfDescription: data?.self_description ?? '',
        styleProfile: data?.style_profile ?? null,
        sampleCount: Array.isArray(data?.sample_messages) ? data.sample_messages.length : 0,
        replyDelayMinutes: data?.reply_delay_minutes ?? 3,
        inactivityMinutes: data?.inactivity_minutes ?? 5,
        maxDailyReplies: data?.max_daily_replies ?? 30,
        dailyRepliesUsed: data?.daily_replies_used ?? 0,
        lastSyncAt: data?.last_sync_at ?? null,
        contactOverrides: data?.contact_overrides ?? {},
      };
      await cacheAutopilot(user.id, sessionId, result);
      return NextResponse.json(result);
    }

    // No sessionId — fetch user's bot_sessions first, then enrich with autopilot config
    const { data: botSessions, error: sessError } = await supabase
      .from('bot_sessions')
      .select('id, state')
      .eq('user_id', user.id);

    if (sessError) throw sessError;

    const { data: autopilotData, error: apError } = await adminSupabase
      .from('autopilot_personas')
      .select('session_id, enabled, mode, self_description, reply_delay_minutes, inactivity_minutes, max_daily_replies, daily_replies_used, last_sync_at, contact_overrides')
      .eq('user_id', user.id);

    if (apError) throw apError;

    // Build a map of autopilot configs keyed by session_id
    const apMap = new Map<string, typeof autopilotData[number]>();
    for (const ap of autopilotData || []) {
      apMap.set(ap.session_id, ap);
    }

    // Merge: every bot_session appears, enriched with autopilot config if it exists
    const sessions = (botSessions || []).map((s) => {
      const ap = apMap.get(s.id);
      return {
        session_id: s.id,
        status: s.state,
        enabled: ap?.enabled ?? false,
        mode: ap?.mode ?? 'offline',
      };
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching autopilot:', error);
    return NextResponse.json({ error: 'Failed to fetch autopilot data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, enabled, mode, selfDescription, replyDelayMinutes, inactivityMinutes, maxDailyReplies, contactOverrides } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      user_id: user.id,
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    };

    if (enabled !== undefined) updateData.enabled = enabled;
    if (mode !== undefined) updateData.mode = mode;
    if (selfDescription !== undefined) updateData.self_description = selfDescription.substring(0, 2000);
    if (replyDelayMinutes !== undefined) updateData.reply_delay_minutes = Math.max(1, Math.min(30, replyDelayMinutes));
    if (inactivityMinutes !== undefined) updateData.inactivity_minutes = Math.max(1, Math.min(60, inactivityMinutes));
    if (maxDailyReplies !== undefined) updateData.max_daily_replies = Math.max(5, Math.min(200, maxDailyReplies));
    if (contactOverrides !== undefined) updateData.contact_overrides = contactOverrides;

    const adminSupabase = createClient(
      (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!),
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await adminSupabase
      .from('autopilot_personas')
      .upsert(updateData, { onConflict: 'user_id,session_id' });

    if (error) throw error;

    await invalidateAutopilot(user.id, sessionId);
    return NextResponse.json({ success: true, message: 'Autopilot settings saved' });
  } catch (error) {
    console.error('Error saving autopilot:', error);
    return NextResponse.json({ error: 'Failed to save autopilot settings' }, { status: 500 });
  }
}
