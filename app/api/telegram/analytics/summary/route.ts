import { authorizeTelegramRequest } from '@/lib/telegram-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Deeper analytics for the mini-app Stats tab. Returns:
 *
 *  - groups / dms — counts from telegram_groups by chat_type
 *  - members — distinct user_ids across telegram_xp (people seen by the bot)
 *  - messages_7d / messages_30d — sum of telegram_analytics.count
 *  - active_users_7d / active_users_30d — distinct user_ids in that window
 *  - messages_per_day — last 30 days as [{date, count}, ...] for a sparkline
 *  - top_users — top 10 users by telegram_xp (legacy)
 *  - top_users_by_messages — top 10 active senders in last 30 days
 *  - top_chats — top 10 chats by message volume in last 30 days
 *  - top_commands — top 10 message_type buckets (proxy for "what people use")
 *  - mod_actions_7d / mod_actions_30d — moderation log counts
 *
 * Owner-only — gated by `requireRole: 'admin'` (Telegram-group admin OR bot
 * owner — the bot owner is always admin from the role detector).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const day7 = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const day30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

    // ── Group / DM split from telegram_groups ───────────────────────────────
    const { data: groupRows } = await supabase
      .from('telegram_groups')
      .select('chat_id, chat_type, is_active')
      .eq('session_id', sessionId);

    let groupsCount = 0;
    let dmsCount = 0;
    for (const r of groupRows || []) {
      if (r.is_active === false) continue;
      const t = (r.chat_type || '').toLowerCase();
      if (t === 'group' || t === 'supergroup' || t === 'channel') groupsCount += 1;
      else if (t === 'private') dmsCount += 1;
    }

    // ── Distinct members the bot has seen (XP table) ────────────────────────
    const { data: memberRows } = await supabase
      .from('telegram_xp')
      .select('user_id')
      .eq('session_id', sessionId);
    const membersCount = new Set((memberRows || []).map(m => m.user_id)).size;

    // ── 30-day analytics rollup ────────────────────────────────────────────
    const { data: rows30 } = await supabase
      .from('telegram_analytics')
      .select('date, user_id, chat_id, count, message_type')
      .eq('session_id', sessionId)
      .gte('date', day30);

    let messages30d = 0;
    let messages7d = 0;
    const active7d = new Set<string>();
    const active30d = new Set<string>();
    const perDay = new Map<string, number>();
    const userTotals = new Map<string, number>();
    const chatTotals = new Map<string, number>();
    const cmdTotals = new Map<string, number>();

    for (const r of rows30 || []) {
      const c = Number(r.count) || 0;
      messages30d += c;
      perDay.set(r.date, (perDay.get(r.date) || 0) + c);
      if (r.user_id) {
        active30d.add(r.user_id);
        userTotals.set(r.user_id, (userTotals.get(r.user_id) || 0) + c);
      }
      if (r.chat_id) chatTotals.set(r.chat_id, (chatTotals.get(r.chat_id) || 0) + c);
      if (r.message_type) cmdTotals.set(r.message_type, (cmdTotals.get(r.message_type) || 0) + c);

      if (r.date >= day7) {
        messages7d += c;
        if (r.user_id) active7d.add(r.user_id);
      }
    }

    // Fill missing days with 0 so the sparkline is a continuous 30-bar series
    const messagesPerDay: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      messagesPerDay.push({ date: d, count: perDay.get(d) || 0 });
    }

    const topByCount = <T,>(m: Map<string, number>, mapItem: (k: string, v: number) => T, n = 10) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => mapItem(k, v));

    const topUsersByMessages = topByCount(userTotals, (user_id, messages) => ({ user_id, messages }));
    const topChats = topByCount(chatTotals, (chat_id, messages) => ({ chat_id, messages }));
    const topCommands = topByCount(cmdTotals, (message_type, count) => ({ message_type, count }));

    // ── XP leaderboard (legacy field, keep for backwards-compat) ────────────
    const { data: topUsers } = await supabase
      .from('telegram_xp')
      .select('user_id, xp, level')
      .eq('session_id', sessionId)
      .order('xp', { ascending: false })
      .limit(10);

    // Top chat titles for the topChats list (1 lookup per chat is cheap on 10 rows)
    if (topChats.length > 0) {
      const chatIds = topChats.map(c => c.chat_id);
      const { data: titleRows } = await supabase
        .from('telegram_groups')
        .select('chat_id, chat_title')
        .eq('session_id', sessionId)
        .in('chat_id', chatIds);
      const titles = new Map<string, string>((titleRows || []).map(r => [r.chat_id, r.chat_title || '']));
      for (const c of topChats) {
        (c as { chat_id: string; messages: number; chat_title?: string }).chat_title = titles.get(c.chat_id) || '';
      }
    }

    // ── Moderation log counts ──────────────────────────────────────────────
    const sevenIso = new Date(Date.now() - 7 * 86400_000).toISOString();
    const thirtyIso = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ count: modActions7d }, { count: modActions30d }] = await Promise.all([
      supabase
        .from('telegram_mod_log')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('created_at', sevenIso),
      supabase
        .from('telegram_mod_log')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('created_at', thirtyIso),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        groups: groupsCount,
        dms: dmsCount,
        total_chats: groupsCount + dmsCount,
        total_members: membersCount,
        messages_7d: messages7d,
        messages_30d: messages30d,
        active_users_7d: active7d.size,
        active_users_30d: active30d.size,
        messages_per_day: messagesPerDay,
        top_users: topUsers || [],
        top_users_by_messages: topUsersByMessages,
        top_chats: topChats,
        top_commands: topCommands,
        mod_actions: modActions7d || 0,
        mod_actions_7d: modActions7d || 0,
        mod_actions_30d: modActions30d || 0,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS-SUMMARY] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
