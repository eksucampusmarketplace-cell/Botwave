/**
 * Ticket/Support system — users can create support tickets
 * that admins can manage, assign, and escalate.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import {
  createTicket,
  getTicket,
  getOpenTickets,
  closeTicket,
  assignTicket,
  escalateTicket,
  addTicketMessage,
  getTelegramConfig,
} from '../utils/db';
import { resolveTarget } from '../utils/resolve';

export function registerTicketHandlers(bot: Bot, sessionId: string): void {
  // /ticket <subject> — open a support ticket
  bot.command('ticket', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const subject = (ctx.match?.toString() || '').trim();
    if (!subject) {
      await ctx.reply('Usage: /ticket <describe your issue>');
      return;
    }

    const ticketId = await createTicket(
      sessionId,
      ctx.chat.id.toString(),
      ctx.from.id.toString(),
      subject,
    );

    if (!ticketId) {
      await ctx.reply('❌ Failed to create ticket.');
      return;
    }

    await addTicketMessage(ticketId, ctx.from.id.toString(), subject, false, false);

    await ctx.reply(
      `🎫 <b>Ticket #${ticketId} Created</b>\n\n` +
      `Subject: ${subject}\n` +
      `Status: Open\n\n` +
      `An admin will review your ticket shortly.`,
      { parse_mode: 'HTML' },
    );

    // Notify log channel if set
    const config = await getTelegramConfig(sessionId);
    if (config.log_channel_id) {
      try {
        await ctx.api.sendMessage(
          Number(config.log_channel_id),
          `🎫 <b>New Ticket #${ticketId}</b>\n` +
          `From: <code>${ctx.from.id}</code> (${ctx.from.first_name})\n` +
          `Subject: ${subject}`,
          { parse_mode: 'HTML' },
        );
      } catch {}
    }
  });

  // /tickets — list open tickets (admin)
  bot.command('tickets', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const tickets = await getOpenTickets(sessionId, ctx.chat.id.toString());
    if (tickets.length === 0) {
      await ctx.reply('No open tickets.');
      return;
    }

    const list = tickets.map(t =>
      `#${t.id} [${t.priority.toUpperCase()}] ${t.status} — ${t.subject}`
    ).join('\n');

    await ctx.reply(
      `🎫 <b>Open Tickets</b> (${tickets.length})\n\n<code>${list}</code>`,
      { parse_mode: 'HTML' },
    );
  });

  // /close <ticket_id> — close a ticket
  bot.command('close', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const ticketId = parseInt((ctx.match?.toString() || '').trim(), 10);
    if (!ticketId) {
      await ctx.reply('Usage: /close <ticket_id>');
      return;
    }

    const ticket = await getTicket(sessionId, ticketId);
    if (!ticket) {
      await ctx.reply('❌ Ticket not found.');
      return;
    }

    await closeTicket(sessionId, ticketId);
    await addTicketMessage(ticketId, ctx.from.id.toString(), 'Ticket closed', true, true);

    await ctx.reply(`✅ Ticket #${ticketId} has been closed.`);

    // Try to notify creator
    try {
      await ctx.api.sendMessage(
        Number(ticket.creator_id),
        `🎫 Your ticket #${ticketId} has been closed.\n\nSubject: ${ticket.subject}`,
      );
    } catch {}
  });

  // /assign <ticket_id> <@admin> — assign ticket to admin
  bot.command('assign', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.match?.toString() || '').trim().split(/\s+/);
    const ticketId = parseInt(args[0], 10);
    const assignee = args[1];

    if (!ticketId || !assignee) {
      await ctx.reply('Usage: /assign <ticket_id> <@admin or user_id>');
      return;
    }

    const ticket = await getTicket(sessionId, ticketId);
    if (!ticket) {
      await ctx.reply('❌ Ticket not found.');
      return;
    }

    const assigneeId = assignee.replace('@', '');
    await assignTicket(sessionId, ticketId, assigneeId);
    await addTicketMessage(ticketId, ctx.from.id.toString(), `Assigned to ${assignee}`, true, true);

    await ctx.reply(`✅ Ticket #${ticketId} assigned to ${assignee}.`);
  });

  // /escalate <ticket_id> — escalate priority
  bot.command('escalate', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const ticketId = parseInt((ctx.match?.toString() || '').trim(), 10);
    if (!ticketId) {
      await ctx.reply('Usage: /escalate <ticket_id>');
      return;
    }

    const ticket = await getTicket(sessionId, ticketId);
    if (!ticket) {
      await ctx.reply('❌ Ticket not found.');
      return;
    }

    await escalateTicket(sessionId, ticketId);
    await addTicketMessage(ticketId, ctx.from.id.toString(), 'Priority escalated to HIGH', true, true);

    await ctx.reply(`⚠️ Ticket #${ticketId} has been escalated to HIGH priority.`);
  });

  // /reply <ticket_id> <message> — reply to ticket (DMs the creator)
  bot.command('treply', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    const spaceIdx = text.indexOf(' ');
    if (spaceIdx === -1) {
      await ctx.reply('Usage: /treply <ticket_id> <message>');
      return;
    }

    const ticketId = parseInt(text.substring(0, spaceIdx), 10);
    const message = text.substring(spaceIdx + 1).trim();

    if (!ticketId || !message) {
      await ctx.reply('Usage: /treply <ticket_id> <message>');
      return;
    }

    const ticket = await getTicket(sessionId, ticketId);
    if (!ticket) {
      await ctx.reply('❌ Ticket not found.');
      return;
    }

    await addTicketMessage(ticketId, ctx.from.id.toString(), message, true);

    // DM the ticket creator
    try {
      await ctx.api.sendMessage(
        Number(ticket.creator_id),
        `💬 <b>Reply to Ticket #${ticketId}</b>\n\n${message}`,
        { parse_mode: 'HTML' },
      );
      await ctx.reply(`✅ Reply sent to ticket creator.`);
    } catch {
      await ctx.reply(`✅ Reply saved, but couldn't DM the user (they may not have started the bot).`);
    }
  });
}
