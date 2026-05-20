/**
 * Feedback handler: /feedback <message>
 * Sends user feedback to the admin log channel or bot owner PM.
 */

import { Bot } from 'grammy';
import { createClient } from '@supabase/supabase-js';
import { mentionById } from '../utils/format';
import { checkCooldown, setCooldown } from '../utils/cooldown';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export function registerFeedbackHandlers(bot: Bot, sessionId: string): void {
  bot.command('feedback', async (ctx) => {
    if (!ctx.from) return;

    const remaining = checkCooldown(ctx.from.id, 'feedback');
    if (remaining > 0) {
      await ctx.reply(`Please wait ${remaining}s before sending another feedback.`);
      return;
    }

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        '<b>Send Feedback</b>\n\n' +
        'Usage: /feedback <your message>\n\n' +
        'Your feedback will be forwarded to the bot admin.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (text.length > 1000) {
      await ctx.reply('Feedback is too long (max 1000 characters).');
      return;
    }

    setCooldown(ctx.from.id, 'feedback');

    const userName = ctx.from.first_name || ctx.from.username || 'User';
    const chatTitle = ctx.chat?.title || 'Private';
    const feedbackMsg =
      `<b>New Feedback</b>\n\n` +
      `<b>From:</b> ${mentionById(ctx.from.id, userName)}\n` +
      `<b>Chat:</b> ${chatTitle}\n` +
      `<b>Message:</b>\n<i>${text}</i>`;

    // Try to send to log channel first
    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select('log_channel_id, owner_user_id')
      .eq('session_id', sessionId)
      .single();

    let sent = false;

    if (config?.log_channel_id) {
      try {
        await ctx.api.sendMessage(Number(config.log_channel_id), feedbackMsg, { parse_mode: 'HTML' });
        sent = true;
      } catch {}
    }

    if (!sent && config?.owner_user_id) {
      try {
        await ctx.api.sendMessage(Number(config.owner_user_id), feedbackMsg, { parse_mode: 'HTML' });
        sent = true;
      } catch {}
    }

    // Store in DB regardless
    await supabase.from('telegram_feedback').insert({
      session_id: sessionId,
      user_id: ctx.from.id.toString(),
      user_name: userName,
      chat_id: ctx.chat?.id?.toString(),
      message: text,
    }).catch(() => {});

    await ctx.reply(sent
      ? 'Thank you! Your feedback has been forwarded to the admin.'
      : 'Thank you! Your feedback has been recorded.',
    );
  });
}
