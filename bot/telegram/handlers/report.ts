/**
 * Report system: /report, /reports, /resolve, /dismiss
 * Users can report messages to admins with inline action buttons.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin, isAdmin } from '../utils/permissions';
import { mentionUser, escapeHtml, truncate } from '../utils/format';
import {
  createReport,
  getReports,
  resolveReport,
  dismissReport,
} from '../utils/db';

export function registerReportHandlers(bot: Bot, sessionId: string): void {
  bot.command('report', async (ctx) => {
    if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('This command only works in groups.');
      return;
    }

    const replyMsg = ctx.message?.reply_to_message;
    if (!replyMsg || !replyMsg.from) {
      await ctx.reply('Reply to the message you want to report.');
      return;
    }

    if (replyMsg.from.id === ctx.from.id) {
      await ctx.reply("You can't report your own message.");
      return;
    }

    if (replyMsg.from.is_bot) {
      await ctx.reply("You can't report a bot.");
      return;
    }

    const reason = (ctx.match?.toString() || '').trim() || 'No reason given';
    const chatId = ctx.chat.id.toString();

    const reportId = await createReport(
      sessionId,
      chatId,
      ctx.from.id.toString(),
      replyMsg.from.id.toString(),
      replyMsg.message_id.toString(),
      reason,
    );

    const reporterName = mentionUser(ctx.from);
    const reportedName = mentionUser(replyMsg.from);
    const msgPreview = truncate(replyMsg.text || replyMsg.caption || '[media]', 60);

    const keyboard = new InlineKeyboard()
      .text('Resolve', `report_resolve:${reportId}`)
      .text('Dismiss', `report_dismiss:${reportId}`);

    await ctx.reply(
      `<b>Report #${reportId}</b>\n\n` +
      `Reporter: ${reporterName}\n` +
      `Reported: ${reportedName}\n` +
      `Reason: ${escapeHtml(reason)}\n` +
      `Message: <i>${escapeHtml(msgPreview)}</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  });

  bot.command('reports', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();

    const reports = await getReports(sessionId, chatId, 'pending');
    if (reports.length === 0) {
      await ctx.reply('No pending reports.');
      return;
    }

    let text = `<b>Pending Reports</b> (${reports.length})\n\n`;
    for (const r of reports.slice(0, 10)) {
      const date = new Date(r.created_at).toLocaleDateString();
      text += `#${r.id} - Reporter: ${r.reporter_user_id}, ` +
        `Reported: ${r.reported_user_id}\n` +
        `Reason: ${escapeHtml(truncate(r.reason || 'N/A', 40))} (${date})\n\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('resolve', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    const reportId = parseInt(arg, 10);
    if (isNaN(reportId)) {
      await ctx.reply('Usage: /resolve <report_id>');
      return;
    }

    const ok = await resolveReport(sessionId, reportId, ctx.from!.id.toString());
    if (ok) {
      await ctx.reply(`Report #${reportId} resolved.`);
    } else {
      await ctx.reply(`Report #${reportId} not found or already handled.`);
    }
  });

  bot.command('dismiss', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    const reportId = parseInt(arg, 10);
    if (isNaN(reportId)) {
      await ctx.reply('Usage: /dismiss <report_id>');
      return;
    }

    const ok = await dismissReport(sessionId, reportId, ctx.from!.id.toString());
    if (ok) {
      await ctx.reply(`Report #${reportId} dismissed.`);
    } else {
      await ctx.reply(`Report #${reportId} not found or already handled.`);
    }
  });

  // Inline callbacks for report actions
  bot.callbackQuery(/^report_resolve:(\d+)$/, async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await isAdmin(ctx))) {
      await ctx.answerCallbackQuery({ text: 'Only admins can do this.', show_alert: true });
      return;
    }

    const reportId = parseInt(ctx.match![1], 10);
    const ok = await resolveReport(sessionId, reportId, ctx.from.id.toString());
    if (ok) {
      await ctx.answerCallbackQuery({ text: 'Report resolved.' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } else {
      await ctx.answerCallbackQuery({ text: 'Already handled.', show_alert: true });
    }
  });

  bot.callbackQuery(/^report_dismiss:(\d+)$/, async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await isAdmin(ctx))) {
      await ctx.answerCallbackQuery({ text: 'Only admins can do this.', show_alert: true });
      return;
    }

    const reportId = parseInt(ctx.match![1], 10);
    const ok = await dismissReport(sessionId, reportId, ctx.from.id.toString());
    if (ok) {
      await ctx.answerCallbackQuery({ text: 'Report dismissed.' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } else {
      await ctx.answerCallbackQuery({ text: 'Already handled.', show_alert: true });
    }
  });
}
