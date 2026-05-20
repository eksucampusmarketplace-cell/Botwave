/**
 * Feature Request handler for Telegram — /feature, /suggest, /idea commands.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import { createClient } from '@supabase/supabase-js';
import { processFeatureRequest } from '../../../lib/feature-requests';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

export function registerFeatureRequestHandlers(bot: Bot, _sessionId: string): void {
  const handler = async (ctx: any) => {
    const text = (ctx.message?.text || '').split(/\s+/).slice(1).join(' ').trim()
      || ctx.message?.reply_to_message?.text;

    if (!text || text.length < 10) {
      await ctx.reply(
        '<b>Feature Requests</b>\n\n' +
        'Suggest a new feature for the bot!\n\n' +
        '<b>Usage:</b> /feature &lt;your idea&gt;\n' +
        '<b>Example:</b> /feature Add a command to generate memes from text\n\n' +
        '<i>Your suggestion will be analyzed by AI and reviewed by admins.</i>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (text.length > 2000) {
      await ctx.reply('Your feature description is too long (max 2000 characters). Please shorten it.');
      return;
    }

    const thinking = await ctx.reply('Analyzing your feature request...');

    try {
      const userId = ctx.from?.id?.toString() || 'unknown';
      const userName = ctx.from?.username
        ? `@${ctx.from.username}`
        : ctx.from?.first_name || userId;

      const { data: inserted, error: insertError } = await supabase
        .from('feature_requests')
        .insert({
          user_identifier: userName,
          platform: 'telegram',
          description: text,
          status: 'processing',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[FeatureReq:TG] Insert error:', insertError);
        await ctx.api.editMessageText(
          ctx.chat!.id,
          thinking.message_id,
          'Could not save your request right now. Please try again later.',
        );
        return;
      }

      const requestId = inserted.id;
      const shortId = requestId.slice(0, 8);

      const aiResponse = await processFeatureRequest(text);
      const newStatus = aiResponse ? 'completed' : 'failed';

      await supabase
        .from('feature_requests')
        .update({
          ai_response: aiResponse,
          status: newStatus,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (aiResponse) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          thinking.message_id,
          `<b>Feature Request #${escapeHtml(shortId)}</b>\n\n` +
          `Your idea has been received and analyzed.\n` +
          `Status: <b>Completed</b>\n\n` +
          `<i>The admin team will review the AI analysis and decide on implementation.</i>`,
          { parse_mode: 'HTML' },
        );
      } else {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          thinking.message_id,
          `<b>Feature Request #${escapeHtml(shortId)}</b>\n\n` +
          `Your idea has been saved but AI analysis is temporarily unavailable.\n` +
          `Status: <b>Pending Review</b>\n\n` +
          `<i>The admin team will review it manually.</i>`,
          { parse_mode: 'HTML' },
        );
      }
    } catch (err) {
      console.error('[FeatureReq:TG] Error:', err);
      await ctx.api.editMessageText(
        ctx.chat!.id,
        thinking.message_id,
        'Something went wrong. Please try again later.',
      );
    }
  };

  bot.command('feature', handler);
  bot.command('suggest', handler);
  bot.command('idea', handler);
}
