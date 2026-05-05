import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch all sessions grouped by user
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, user_id, phone_number, session_name, state, last_active, created_at');

    // Fetch feature counts per user
    const { data: features } = await supabase
      .from('bot_features')
      .select('user_id, enabled');

    // Build user data with aggregated info
    const sessionsByUser: Record<string, any[]> = {};
    for (const s of sessions || []) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);
    }

    const featuresByUser: Record<string, number> = {};
    for (const f of features || []) {
      if (f.enabled) {
        featuresByUser[f.user_id] = (featuresByUser[f.user_id] || 0) + 1;
      }
    }

    const users = (profiles || []).map(p => {
      const userSessions = sessionsByUser[p.id] || [];
      const activeSessions = userSessions.filter(s => s.state === 'active').length;
      const totalSessions = userSessions.length;
      const lastActive = userSessions
        .map(s => s.last_active)
        .filter(Boolean)
        .sort()
        .pop() || null;

      return {
        id: p.id,
        username: p.username,
        created_at: p.created_at,
        totalSessions,
        activeSessions,
        enabledFeatures: featuresByUser[p.id] || 0,
        lastActive,
        sessions: userSessions.map(s => ({
          id: s.id,
          phone_number: s.phone_number,
          session_name: s.session_name,
          state: s.state,
          last_active: s.last_active,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
