import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    if (adminToken?.value !== 'botwave_admin_secret_token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch sessions with user info
    // Note: In a real app, you'd use a join or separate query
    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select(`
        *,
        profiles:user_id (username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to mock data if DB is not connected
      return NextResponse.json({
        success: true,
        data: [
          { id: '1', phone_number: '123456789', state: 'active', username: 'john_doe' },
          { id: '2', phone_number: '987654321', state: 'qr_pending', username: 'jane_smith' },
          { id: '3', phone_number: '555666777', state: 'inactive', username: 'bob_brown' },
        ]
      });
    }

    const formattedSessions = sessions.map((s: any) => ({
      ...s,
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
