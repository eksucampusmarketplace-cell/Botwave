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

    // Fetch real stats from database
    let totalUsers = 0;
    let activeSessions = 0;
    let totalMessages = 0;

    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      totalUsers = userCount || 0;

      const { count: sessionCount } = await supabase
        .from('bot_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('state', 'active');
      activeSessions = sessionCount || 0;

      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      totalMessages = msgCount || 0;
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Return actual error, not fake data
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeSessions,
        totalMessages,
        systemStatus: totalUsers > 0 ? 'Healthy' : 'No Data'
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}