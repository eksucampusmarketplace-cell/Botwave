/**
 * Karma system — upvote/downvote via +/- reply, /karma, /mykarma commands.
 */

import { Bot } from 'grammy';
import { mentionUser, escapeHtml } from '../utils/format';
import { getGroupConfig } from '../utils/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function adjustKarma(sessionId: string, chatId: string, userId: string, delta: number, fromUserId: string): Promise<number> {
  // Upsert karma row
  const { data: existing } = await supabase
    .from('telegram_karma')
    .select('score')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();

  const newScore = (existing?.score || 0) + delta;

  await supabase
    .from('telegram_karma')
    .upsert({
      session_id: sessionId,
      chat_id: chatId,
      user_id: userId,
      score: newScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,chat_id,user_id' });

  return newScore;
}

async function getKarma(sessionId: string, chatId: string, userId: string): Promise<number> {
  const { data } = await supabase
    .from('telegram_karma')
    .select('score')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.score || 0;
}

async function getKarmaLeaderboard(sessionId: string, chatId: string, limit = 10): Promise<Array<{ user_id: string; score: number }>> {
  const { data } = await supabase
    .from('telegram_karma')
    .select('user_id, score')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .order('score', { ascending: false })
    .limit(limit);
  return data || [];
}

export function registerKarmaHandlers(bot: Bot, sessionId: string): void {
  // Listen for + or - as reply
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    if ((text === '+' || text === '-' || text === '+1' || text === '-1') && ctx.message.reply_to_message?.from) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      if (!(config as Record<string, unknown>).karma_enabled) {
        await next();
        return;
      }

      const target = ctx.message.reply_to_message.from;
      if (target.id === ctx.from.id) {
        await ctx.reply("You can't change your own karma.");
        return;
      }
      if (target.is_bot) {
        await next();
        return;
      }

      const delta = text.startsWith('+') ? 1 : -1;
      const chatId = ctx.chat.id.toString();
      const newScore = await adjustKarma(sessionId, chatId, target.id.toString(), delta, ctx.from.id.toString());
      const icon = delta > 0 ? '👍' : '👎';
      await ctx.reply(`${icon} ${escapeHtml(target.first_name)}'s karma: ${newScore}`, { parse_mode: 'HTML' });
      return;
    }
    await next();
  });

  bot.command('karma', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const top = await getKarmaLeaderboard(sessionId, chatId);
    if (top.length === 0) {
      await ctx.reply('No karma data yet. Reply with + or - to give karma!');
      return;
    }
    let text = '🏆 <b>Karma Leaderboard</b>\n\n';
    for (let i = 0; i < top.length; i++) {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      text += `${medal} User ${top[i].user_id}: <b>${top[i].score}</b>\n`;
    }
    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('mykarma', async (ctx) => {
    if (!ctx.from) return;
    const chatId = ctx.chat!.id.toString();
    const score = await getKarma(sessionId, chatId, ctx.from.id.toString());
    await ctx.reply(`Your karma: <b>${score}</b>`, { parse_mode: 'HTML' });
  });
}
