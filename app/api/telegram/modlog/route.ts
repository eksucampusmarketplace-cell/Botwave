/**
 * Telegram Moderation Log API
 * GET /api/telegram/modlog?sessionId=xxx&limit=50&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const limit = parseInt(params.get('limit') || '50', 10);
    const offset = parseInt(params.get('offset') || '0', 10);

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { data: logs, count } = await supabase
      .from('telegram_moderation_log')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({ success: true, data: logs || [], total: count || 0 });
  } catch (error) {
    console.error('[TG-MODLOG] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch moderation log' }, { status: 500 });
  }
}
