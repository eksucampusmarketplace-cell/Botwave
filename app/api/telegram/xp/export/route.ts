/**
 * Telegram XP Export API
 * GET /api/telegram/xp/export?sessionId=xxx&chatId=xxx&format=csv
 * 
 * Returns XP leaderboard as CSV for download.
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
    const chatId = params.get('chatId');

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    let query = supabase
      .from('telegram_xp')
      .select('user_id, username, display_name, xp, level, messages_count, chat_id, last_message_at')
      .eq('session_id', sessionId)
      .order('xp', { ascending: false })
      .limit(10000);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    }

    const { data: leaderboard } = await query;

    if (!leaderboard || leaderboard.length === 0) {
      return new NextResponse('No data', { status: 204 });
    }

    // Build CSV
    const headers = ['Rank', 'User ID', 'Username', 'Display Name', 'XP', 'Level', 'Messages', 'Chat ID', 'Last Active'];
    const rows = leaderboard.map((entry, i) => [
      i + 1,
      entry.user_id || '',
      entry.username || '',
      (entry.display_name || '').replace(/,/g, ' '),
      entry.xp || 0,
      entry.level || 1,
      entry.messages_count || 0,
      entry.chat_id || '',
      entry.last_message_at || '',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="xp-leaderboard-${sessionId.slice(0, 8)}.csv"`,
      },
    });
  } catch (error) {
    console.error('[TG-XP] Export error:', error);
    return NextResponse.json({ error: 'Failed to export leaderboard' }, { status: 500 });
  }
}
