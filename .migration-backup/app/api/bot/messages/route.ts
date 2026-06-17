import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search') || '';
    const sessionId = url.searchParams.get('session_id') || '';
    const msgType = url.searchParams.get('type') || '';

    // Get user's sessions
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('user_id', user.id);

    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0, page, pages: 0 });
    }

    // Filter by specific session if provided
    const filterIds = sessionId ? [sessionId].filter(id => sessionIds.includes(id)) : sessionIds;
    if (filterIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0, page, pages: 0 });
    }

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .in('session_id', filterIds)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`content.ilike.%${search}%,sender_name.ilike.%${search}%`);
    }
    if (msgType) {
      query = query.eq('message_type', msgType);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: data || [],
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
