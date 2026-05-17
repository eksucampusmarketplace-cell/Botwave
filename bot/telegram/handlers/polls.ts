/**
 * Poll/quiz handler: /poll, /quiz, /stoppoll, /pollresults
 * Native Telegram poll creation with flags.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';

export function registerPollHandlers(bot: Bot, sessionId: string): void {
  /**
   * /poll <question> | <option1> | <option2> [| option3] [--anon] [--multi]
   */
  bot.command('poll', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const raw = (ctx.match?.toString() || '').trim();
    if (!raw) {
      await ctx.reply(
        '<b>Create a Poll</b>\n\n' +
        'Usage: /poll Question | Option 1 | Option 2 | ...\n\n' +
        'Flags:\n' +
        '<code>--anon</code> — anonymous voting\n' +
        '<code>--multi</code> — allow multiple answers\n\n' +
        'Example: /poll Best language? | TypeScript | Python | Rust --multi',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const isAnon = raw.includes('--anon');
    const isMulti = raw.includes('--multi');
    const cleaned = raw.replace(/--anon/g, '').replace(/--multi/g, '').trim();

    const parts = cleaned.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      await ctx.reply('Need at least a question and 2 options separated by |');
      return;
    }

    const question = parts[0];
    const options = parts.slice(1);

    if (options.length > 10) {
      await ctx.reply('Telegram allows a maximum of 10 poll options.');
      return;
    }

    try {
      await ctx.api.sendPoll(ctx.chat!.id, question, options, {
        is_anonymous: isAnon,
        allows_multiple_answers: isMulti,
      });
    } catch (err) {
      await ctx.reply(`❌ Failed to create poll: ${err}`);
    }
  });

  /**
   * /quiz <question> | <correct_answer> | <wrong1> | <wrong2> [--anon]
   * First option after question is the correct answer.
   */
  bot.command('quiz', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const raw = (ctx.match?.toString() || '').trim();
    if (!raw) {
      await ctx.reply(
        '<b>Create a Quiz</b>\n\n' +
        'Usage: /quiz Question | Correct Answer | Wrong 1 | Wrong 2\n\n' +
        'The first option is always the correct answer.\n' +
        'Options are shuffled when displayed.\n\n' +
        'Example: /quiz Capital of France? | Paris | London | Berlin',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const isAnon = raw.includes('--anon');
    const cleaned = raw.replace(/--anon/g, '').trim();

    const parts = cleaned.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      await ctx.reply('Need at least a question, correct answer, and 1 wrong answer.');
      return;
    }

    const question = parts[0];
    const options = parts.slice(1);

    if (options.length > 10) {
      await ctx.reply('Telegram allows a maximum of 10 quiz options.');
      return;
    }

    // correct_option_id is 0 (first option is always correct)
    try {
      await ctx.api.sendPoll(ctx.chat!.id, question, options, {
        type: 'quiz',
        correct_option_ids: [0],
        is_anonymous: isAnon,
      });
    } catch (err) {
      await ctx.reply(`❌ Failed to create quiz: ${err}`);
    }
  });

  /**
   * /stoppoll — reply to a poll to stop it
   */
  bot.command('stoppoll', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const replyMsg = ctx.message?.reply_to_message;
    if (!replyMsg || !replyMsg.poll) {
      await ctx.reply('Reply to a poll message to stop it.');
      return;
    }

    try {
      await ctx.api.stopPoll(ctx.chat!.id, replyMsg.message_id);
      await ctx.reply('Poll stopped.');
    } catch (err) {
      await ctx.reply(`❌ Failed to stop poll: ${err}`);
    }
  });
}
