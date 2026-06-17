/**
 * Analytics - /stats, /groupstats commands + message tracking middleware.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { escapeHtml } from '../utils/format';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function trackMessageAnalytics(sessionId: string, chatId: string, userId: string, msgType: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('telegram_analytics').upsert({
    session_id: sessionId,
    chat_id: chatId,
    user_id: userId,
    date: today,
    message_type: msgType,
    count: 1,
  }, { onConflict: 'session_id,chat_id,user_id,date,message_type', ignoreDuplicates: false });

  try {
    await supabase.rpc('increment_analytics_count', {
      p_session_id: sessionId,
      p_chat_id: chatId,
      p_user_id: userId,
      p_date: today,
      p_message_type: msgType,
    });
  } catch { /* RPC may not exist yet, graceful fallback */ }
}

export function registerAnalyticsHandlers(bot: Bot, sessionId: string): void {
  bot.command('stats', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const { data: weekly } = await supabase
      .from('telegram_analytics')
      .select('count, message_type, user_id')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .gte('date', weekAgo);

    const totalMessages = (weekly || []).reduce((sum, r: any) => sum + (r.count || 0), 0);
    const uniqueUsers = new Set((weekly || []).map((r: any) => r.user_id)).size;

    const { count: memberCount } = await supabase
      .from('telegram_xp')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('chat_id', chatId);

    let text = `📊 <b>Group Statistics</b>\n\n`;
    text += `📨 Messages (7 days): <b>${totalMessages}</b>\n`;
    text += `👥 Active users (7 days): <b>${uniqueUsers}</b>\n`;
    text += `📋 Tracked members: <b>${memberCount || 0}</b>\n`;

    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('groupstats', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const chatId = ctx.chat!.id.toString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const { data: topUsers } = await supabase
      .from('telegram_analytics')
      .select('user_id, count')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .gte('date', weekAgo)
      .order('count', { ascending: false })
      .limit(10);

    let text = `📊 <b>Top Active Users (7 days)</b>\n\n`;
    if (!topUsers || topUsers.length === 0) {
      text += 'No data yet.';
    } else {
      for (let i = 0; i < topUsers.length; i++) {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        text += `${medal} User <code>${topUsers[i].user_id}</code>: ${topUsers[i].count} msgs\n`;
      }
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  });
}

export async function processAnalytics(sessionId: string, chatId: string, userId: string, msgType: string): Promise<void> {
  try {
    await trackMessageAnalytics(sessionId, chatId, userId, msgType);
  } catch { /* non-critical */ }
}
