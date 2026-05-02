import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Fetch sessions with user info
    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select(`
        id,
        phone_number,
        session_name,
        state,
        last_active,
        created_at,
        user_id,
        profiles:user_id (username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // Project response to minimum necessary fields
    const formattedSessions = (sessions || []).map((s: any) => ({
      id: s.id,
      phone_number: s.phone_number,
      session_name: s.session_name,
      state: s.state,
      last_active: s.last_active,
      created_at: s.created_at,
      username: s.profiles?.username || 'Unknown'
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