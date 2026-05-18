/**
 * Community VoteKick - /votekick @user starts a vote, 5 votes in 60s kicks.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { resolveTarget } from '../utils/resolve';
import { mentionUser, escapeHtml } from '../utils/format';
import { getGroupConfig } from '../utils/db';
import { isAdmin } from '../utils/permissions';

interface ActiveVote {
  chatId: string;
  targetId: number;
  targetName: string;
  voters: Set<number>;
  requiredVotes: number;
  messageId: number;
  timer: ReturnType<typeof setTimeout>;
}

const activeVotes = new Map<string, ActiveVote>();

export function registerVotekickHandlers(bot: Bot, sessionId: string): void {
  bot.command('votekick', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!(config as Record<string, unknown>).votekick_enabled) {
      await ctx.reply('VoteKick is disabled. An admin can enable it from settings.');
      return;
    }

    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /votekick [reply/@user]');
      return;
    }
    if (targetId === ctx.from!.id) {
      await ctx.reply("You can't votekick yourself.");
      return;
    }
    if (targetId === ctx.me.id) {
      await ctx.reply("You can't votekick me.");
      return;
    }

    const chatId = ctx.chat!.id.toString();
    const voteKey = `${chatId}:${targetId}`;

    if (activeVotes.has(voteKey)) {
      await ctx.reply('A vote is already in progress for this user.');
      return;
    }

    const requiredVotes = 5;
    const targetName = user ? mentionUser(user) : `User ${targetId}`;

    const keyboard = new InlineKeyboard()
      .text(`👢 Kick (1/${requiredVotes})`, `votekick:${targetId}`);

    const msg = await ctx.reply(
      `🗳 <b>Vote to kick</b> ${targetName}\n` +
      `Started by: ${mentionUser(ctx.from!)}\n` +
      `Votes needed: ${requiredVotes} in 60 seconds\n\n` +
      `Click the button below to vote.`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );

    const timer = setTimeout(async () => {
      activeVotes.delete(voteKey);
      try {
        await bot.api.editMessageText(
          ctx.chat!.id, msg.message_id,
          `🗳 Vote to kick ${targetName} has expired. Not enough votes.`,
          { parse_mode: 'HTML' },
        );
      } catch { /* message may have been deleted */ }
    }, 60_000);

    activeVotes.set(voteKey, {
      chatId,
      targetId,
      targetName,
      voters: new Set([ctx.from!.id]),
      requiredVotes,
      messageId: msg.message_id,
      timer,
    });
  });

  bot.callbackQuery(/^votekick:(\d+)$/, async (ctx) => {
    const targetId = parseInt(ctx.match![1]);
    const chatId = ctx.chat!.id.toString();
    const voteKey = `${chatId}:${targetId}`;
    const vote = activeVotes.get(voteKey);

    if (!vote) {
      await ctx.answerCallbackQuery({ text: 'This vote has expired.' });
      return;
    }

    if (ctx.from.id === targetId) {
      await ctx.answerCallbackQuery({ text: "You can't vote on your own kick!" });
      return;
    }

    if (vote.voters.has(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: 'You already voted.' });
      return;
    }

    vote.voters.add(ctx.from.id);
    const count = vote.voters.size;

    if (count >= vote.requiredVotes) {
      clearTimeout(vote.timer);
      activeVotes.delete(voteKey);

      try {
        await bot.api.banChatMember(ctx.chat!.id, targetId);
        await bot.api.unbanChatMember(ctx.chat!.id, targetId);
      } catch { /* may lack permissions */ }

      await ctx.editMessageText(
        `🗳 ${vote.targetName} has been kicked by community vote! (${count}/${vote.requiredVotes} votes)`,
        { parse_mode: 'HTML' },
      );
    } else {
      const keyboard = new InlineKeyboard()
        .text(`👢 Kick (${count}/${vote.requiredVotes})`, `votekick:${targetId}`);
      await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    }

    await ctx.answerCallbackQuery({ text: 'Vote recorded!' });
  });
}
