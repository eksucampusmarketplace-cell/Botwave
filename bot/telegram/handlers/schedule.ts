/**
 * Scheduled messages: /schedule
 * One-time and daily recurring announcements.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { parseDuration } from '../utils/resolve';
import { escapeHtml, truncate } from '../utils/format';
import {
  createScheduledMessage,
  getScheduledMessages,
  cancelScheduledMessage,
} from '../utils/db';

export function registerScheduleHandlers(bot: Bot, sessionId: string): void {
  bot.command('schedule', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('This command only works in groups.');
      return;
    }

    const raw = (ctx.match?.toString() || '').trim();
    if (!raw) {
      await ctx.reply(
        '<b>Schedule Messages</b>\n\n' +
        '<code>/schedule 30m Hello world</code> — send in 30 minutes\n' +
        '<code>/schedule 2h Reminder!</code> — send in 2 hours\n' +
        '<code>/schedule daily 09:00 Good morning!</code> — daily at 09:00 UTC\n' +
        '<code>/schedule list</code> — view scheduled messages\n' +
        '<code>/schedule cancel 5</code> — cancel message #5',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const args = raw.split(/\s+/);
    const sub = args[0].toLowerCase();
    const chatId = ctx.chat.id.toString();

    if (sub === 'list') {
      const messages = await getScheduledMessages(sessionId, chatId);
      if (messages.length === 0) {
        await ctx.reply('No active scheduled messages.');
        return;
      }

      let text = '<b>Scheduled Messages</b>\n\n';
      for (const m of messages.slice(0, 10)) {
        const preview = truncate(m.content, 40);
        const next = m.next_send_at
          ? new Date(m.next_send_at).toISOString().slice(0, 16).replace('T', ' ')
          : '?';
        text += `#${m.id} [${m.schedule_type}] ${next} UTC\n  ${escapeHtml(preview)}\n\n`;
      }
      await ctx.reply(text, { parse_mode: 'HTML' });
      return;
    }

    if (sub === 'cancel') {
      const msgId = parseInt(args[1], 10);
      if (isNaN(msgId)) {
        await ctx.reply('Usage: /schedule cancel <id>');
        return;
      }

      const ok = await cancelScheduledMessage(sessionId, chatId, msgId);
      if (ok) {
        await ctx.reply(`Cancelled scheduled message #${msgId}.`);
      } else {
        await ctx.reply(`Message #${msgId} not found or already cancelled.`);
      }
      return;
    }

    if (sub === 'daily') {
      if (args.length < 3) {
        await ctx.reply('Usage: /schedule daily HH:MM Your message here');
        return;
      }

      const timeStr = args[1];
      const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
      if (!timeMatch) {
        await ctx.reply('Invalid time format. Use HH:MM (e.g. 09:00).');
        return;
      }

      const hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      if (hour > 23 || minute > 59) {
        await ctx.reply('Invalid time. Hours: 00-23, Minutes: 00-59.');
        return;
      }

      const content = args.slice(2).join(' ');
      if (!content) {
        await ctx.reply('Please provide a message to schedule.');
        return;
      }

      // Calculate first send time
      const now = new Date();
      const nextSend = new Date(now);
      nextSend.setUTCHours(hour, minute, 0, 0);
      if (nextSend <= now) {
        nextSend.setUTCDate(nextSend.getUTCDate() + 1);
      }

      const id = await createScheduledMessage(
        sessionId,
        chatId,
        content,
        'daily',
        nextSend,
        ctx.from!.id.toString(),
        timeStr,
      );

      await ctx.reply(
        `Daily message #${id} scheduled\n` +
        `Time: ${timeStr} UTC every day\n` +
        `Next send: ${nextSend.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
      );
      return;
    }

    // One-time schedule: /schedule 30m Hello world
    const durationStr = args[0];
    const duration = parseDuration(durationStr);
    if (!duration) {
      await ctx.reply(
        'Specify delay like <code>30m</code>, <code>2h</code>, or <code>1d</code>.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const content = args.slice(1).join(' ');
    if (!content) {
      await ctx.reply('Please provide a message to schedule.');
      return;
    }

    const sendAt = new Date(Date.now() + duration * 1000);
    const id = await createScheduledMessage(
      sessionId,
      chatId,
      content,
      'once',
      sendAt,
      ctx.from!.id.toString(),
    );

    await ctx.reply(
      `Scheduled message #${id}\n` +
      `Will be sent at ${sendAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    );
  });
}
