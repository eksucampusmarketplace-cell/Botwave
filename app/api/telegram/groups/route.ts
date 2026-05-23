/**
 * Groups API for Telegram Mini App
 *
 * GET /api/telegram/groups?sessionId=X
 * Returns the list of groups the caller has authority over. Bot owner sees
 * every active group on the session; Telegram group admins see only the
 * groups where Telegram reports them as administrator/creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'user' });
    if (!auth.ok) return auth.response;
    const { supabase, role, telegramUserId, botToken } = auth;

    const { data, error } = await supabase
      .from('telegram_groups')
      .select('chat_id, chat_title, chat_type, is_active, added_by_user_id, created_at')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GROUPS] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 },
      );
    }

    const rows = data || [];

    // Bot owner / cookie auth: show everything.
    if (role === 'owner' || !telegramUserId || !botToken) {
      return NextResponse.json({ success: true, data: rows });
    }

    // Telegram caller: filter to groups they administer in Telegram. We do
    // this with one getChatMember per group; the role cache in
    // resolveTelegramRole prevents this from being expensive on subsequent
    // requests, but the FIRST request still pays N. Acceptable for typical
    // groups counts; revisit when we have bots with >50 groups.
    const allowed: typeof rows = [];
    for (const g of rows) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${g.chat_id}&user_id=${telegramUserId}`,
        );
        const j = await res.json();
        if (j.ok && (j.result?.status === 'creator' || j.result?.status === 'administrator')) {
          allowed.push(g);
        }
      } catch {
        // ignore individual group failures
      }
    }

    return NextResponse.json({ success: true, data: allowed });
  } catch (error) {
    console.error('[GROUPS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 },
    );
  }
}
