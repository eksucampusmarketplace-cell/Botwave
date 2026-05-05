import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Fetch sessions
    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('id, phone_number, session_name, state, last_active, created_at, user_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // Try to fetch usernames from profiles (may not have FK relationship)
    const userIds = [...new Set((sessions || []).map((s: any) => s.user_id).filter(Boolean))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p.username;
        }
      }
    }

    const formattedSessions = (sessions || []).map((s: any) => ({
      id: s.id,
      phone_number: s.phone_number,
      session_name: s.session_name,
      state: s.state,
      last_active: s.last_active,
      created_at: s.created_at,
      username: profileMap[s.user_id] || s.session_name || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: formattedSessions
    });
  } catch (error) {
    console.error('Admin sessions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}