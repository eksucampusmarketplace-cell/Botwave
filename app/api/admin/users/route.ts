import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { getCachedAdminUsers, cacheAdminUsers, getCachedAcquisitionData, cacheAcquisitionData } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeAcquisition = request.nextUrl.searchParams.get('acquisition') === 'true';

    // Return cached acquisition analytics if requested
    if (includeAcquisition) {
      const cached = await getCachedAcquisitionData();
      if (cached) return NextResponse.json({ success: true, ...cached as Record<string, unknown> });
    }

    // Check user list cache
    const cachedUsers = await getCachedAdminUsers();
    if (cachedUsers && !includeAcquisition) {
      return NextResponse.json({ success: true, data: cachedUsers });
    }

    const supabase = await createAdminClient();

    // Fetch all profiles (including new acquisition columns)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, created_at, signup_source, signup_referrer, utm_source, utm_medium, utm_campaign, last_login_at, login_count')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      // Fallback: try without new columns (migration not applied yet)
      const { data: fallbackProfiles, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      const users = buildUserData(fallbackProfiles || [], [], []);
      await cacheAdminUsers(users);
      return NextResponse.json({ success: true, data: users });
    }

    // Fetch all sessions grouped by user
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, user_id, phone_number, session_name, state, last_active, created_at');

    // Fetch feature counts per user
    const { data: features } = await supabase
      .from('bot_features')
      .select('user_id, enabled');

    const users = buildUserData(profiles || [], sessions || [], features || []);
    await cacheAdminUsers(users);

    if (includeAcquisition) {
      const acquisition = buildAcquisitionAnalytics(profiles || []);
      const result = { data: users, acquisition };
      await cacheAcquisitionData(result);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function buildUserData(profiles: any[], sessions: any[], features: any[]) {
  const sessionsByUser: Record<string, any[]> = {};
  for (const s of sessions) {
    if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
    sessionsByUser[s.user_id].push(s);
  }

  const featuresByUser: Record<string, number> = {};
  for (const f of features) {
    if (f.enabled) {
      featuresByUser[f.user_id] = (featuresByUser[f.user_id] || 0) + 1;
    }
  }

  return profiles.map(p => {
    const userSessions = sessionsByUser[p.id] || [];
    const activeSessions = userSessions.filter((s: any) => s.state === 'active').length;
    const totalSessions = userSessions.length;
    const lastActive = userSessions
      .map((s: any) => s.last_active)
      .filter(Boolean)
      .sort()
      .pop() || null;

    return {
      id: p.id,
      username: p.username,
      created_at: p.created_at,
      signup_source: p.signup_source || 'direct',
      signup_referrer: p.signup_referrer || null,
      utm_source: p.utm_source || null,
      utm_medium: p.utm_medium || null,
      utm_campaign: p.utm_campaign || null,
      last_login_at: p.last_login_at || null,
      login_count: p.login_count || 0,
      totalSessions,
      activeSessions,
      enabledFeatures: featuresByUser[p.id] || 0,
      lastActive,
      sessions: userSessions.map((s: any) => ({
        id: s.id,
        phone_number: s.phone_number,
        session_name: s.session_name,
        state: s.state,
        last_active: s.last_active,
      })),
    };
  });
}

function buildAcquisitionAnalytics(profiles: any[]) {
  const sourceCounts: Record<string, number> = {};
  const dailySignups: Record<string, number> = {};
  const sourceByDay: Record<string, Record<string, number>> = {};

  for (const p of profiles) {
    const source = p.signup_source || 'direct';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    const day = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : 'unknown';
    dailySignups[day] = (dailySignups[day] || 0) + 1;

    if (!sourceByDay[day]) sourceByDay[day] = {};
    sourceByDay[day][source] = (sourceByDay[day][source] || 0) + 1;
  }

  // Get last 30 days of signups
  const now = new Date();
  const last30Days: Array<{ date: string; total: number; sources: Record<string, number> }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().split('T')[0];
    last30Days.push({
      date: day,
      total: dailySignups[day] || 0,
      sources: sourceByDay[day] || {},
    });
  }

  return {
    totalUsers: profiles.length,
    sourceCounts,
    last30Days,
  };
}
