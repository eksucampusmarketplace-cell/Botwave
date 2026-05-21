/**
 * Telegram XP User API
 *
 * GET /api/telegram/xp/user?sessionId=X&userId=Y&chatId=Z
 * Returns the XP data for a specific user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const params = new URL(request.url).searchParams;
    const sessionId = params.get('sessionId');
    const userId = params.get('userId');
    const chatId = params.get('chatId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId and userId are required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('telegram_xp')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (chatId) {
      query = query.eq('chat_id', chatId);
    }

    const { data: xpRecords } = await query;

    if (!xpRecords || xpRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: { user_id: userId, xp: 0, level: 1, messages: 0 },
      });
    }

    // If multiple records (from different chats), aggregate
    const totalXp = xpRecords.reduce((sum, r) => sum + (r.xp || 0), 0);
    const totalMessages = xpRecords.reduce((sum, r) => sum + (r.messages || 0), 0);
    const maxLevel = Math.max(...xpRecords.map((r) => r.level || 1));

    // Get rank among all users for this session
    const { data: allUsers } = await supabase
      .from('telegram_xp')
      .select('user_id, xp')
      .eq('session_id', sessionId)
      .order('xp', { ascending: false });

    let rank = 0;
    if (allUsers) {
      // Aggregate per user
      const userTotals = new Map<string, number>();
      for (const u of allUsers) {
        userTotals.set(u.user_id, (userTotals.get(u.user_id) || 0) + (u.xp || 0));
      }
      const sorted = [...userTotals.entries()].sort((a, b) => b[1] - a[1]);
      rank = sorted.findIndex(([uid]) => uid === userId) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        xp: totalXp,
        level: maxLevel,
        messages: totalMessages,
        rank: rank || 0,
      },
    });
  } catch (error) {
    console.error('[TG-XP] User error:', error);
    return NextResponse.json({ error: 'Failed to fetch user XP' }, { status: 500 });
  }
}
