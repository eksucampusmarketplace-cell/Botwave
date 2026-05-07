import { registerCommand, type MessageContext } from './registry';
import { sendReply, botStartTime, getQuotedMessage, axios } from './helpers';
import { createReminder, getUserReminders, deleteReminder, createNote, getUserNotes, deleteNote, createScheduledMessage, getUserScheduledMessages, deleteScheduledMessage, getSessionStats, getSessionSettings, updateSessionSettings } from '../database';
import { currentTimeStr, currentDateStr } from '../utils/antiban';
import crypto from 'crypto';

function parseTimeString(timeStr: string): Date | null {
  const now = new Date();

  // Match patterns: 5m, 10min, 1h, 2hr, 30s, 1d, 1day
  const match = timeStr.match(/^(\d+)\s*(s|sec|m|min|h|hr|hour|d|day)s?$/i);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const ms = now.getTime();

    if (unit === 's' || unit === 'sec') return new Date(ms + amount * 1000);
    if (unit === 'm' || unit === 'min') return new Date(ms + amount * 60000);
    if (unit === 'h' || unit === 'hr' || unit === 'hour') return new Date(ms + amount * 3600000);
    if (unit === 'd' || unit === 'day') return new Date(ms + amount * 86400000);
  }

  return null;
}

async function handleRemind(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for reminders.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (args.length === 0) {
    // Show pending reminders
    const reminders = await getUserReminders(context.sessionId, context.senderJid);
    if (reminders.length === 0) {
      await sendReply(context.chatJid, 'You have no pending reminders. Use: !remind 30m Take a break', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Your Reminders:*\n';
    reminders.forEach((r, i) => {
      const timeLeft = Math.max(0, new Date(r.remind_at).getTime() - Date.now());
      const mins = Math.ceil(timeLeft / 60000);
      msg += `${i + 1}. "${r.message}" — in ${mins}min\n`;
    });
    msg += '\nUse !remind cancel <number> to remove one.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Cancel a reminder: !remind cancel 1
  if (args[0].toLowerCase() === 'cancel' && args[1]) {
    const reminders = await getUserReminders(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < reminders.length) {
      await deleteReminder(reminders[index].id, context.senderJid);
      await sendReply(context.chatJid, `Reminder "${reminders[index].message}" cancelled.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid reminder number. Use !remind to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // Create a reminder: !remind 30m Take a break
  const remindAt = parseTimeString(args[0]);
  if (!remindAt) {
    await sendReply(context.chatJid, 'Invalid time format. Examples: !remind 5m Drink water, !remind 1h Check email, !remind 2d Follow up', sock, context.rawMessage.key, context.queue);
    return;
  }

  const message = args.slice(1).join(' ') || 'Reminder!';
  const reminder = await createReminder(context.sessionId, context.senderJid, context.chatJid, message, remindAt);
  if (reminder) {
    const mins = Math.ceil((remindAt.getTime() - Date.now()) / 60000);
    await sendReply(context.chatJid, `Got it! I'll remind you in ${mins} minute(s): "${message}"`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, 'Failed to set reminder. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleNote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for notes.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const subCommand = (args[0] || 'list').toLowerCase();

  if (subCommand === 'list' || args.length === 0) {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    if (notes.length === 0) {
      await sendReply(context.chatJid, 'No notes saved. Use: !note save <title> | <content>', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Your Notes:*\n';
    notes.forEach((n, i) => {
      const preview = n.content.length > 50 ? n.content.slice(0, 50) + '...' : n.content;
      msg += `${i + 1}. *${n.title}* — ${preview}\n`;
    });
    msg += '\nUse !note view <number> to read, !note delete <number> to remove.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (subCommand === 'save' || subCommand === 'add') {
    const rest = args.slice(1).join(' ');
    const parts = rest.split('|').map(p => p.trim());
    const title = parts[0] || 'Untitled';
    const content = parts[1] || parts[0] || '';
    if (!content) {
      await sendReply(context.chatJid, 'Usage: !note save My Title | This is the content', sock, context.rawMessage.key, context.queue);
      return;
    }
    const note = await createNote(context.sessionId, context.senderJid, title, content);
    if (note) {
      await sendReply(context.chatJid, `Note saved: *${title}*`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Failed to save note. Try again.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (subCommand === 'view' || subCommand === 'read') {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < notes.length) {
      const n = notes[index];
      await sendReply(context.chatJid, `*${n.title}*\n\n${n.content}\n\n_Saved: ${new Date(n.created_at).toLocaleDateString()}_`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid note number. Use !note to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (subCommand === 'delete' || subCommand === 'del' || subCommand === 'remove') {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < notes.length) {
      await deleteNote(notes[index].id, context.senderJid);
      await sendReply(context.chatJid, `Note "${notes[index].title}" deleted.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid note number. Use !note to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  await sendReply(context.chatJid, 'Usage: !note save <title> | <content>, !note list, !note view <n>, !note delete <n>', sock, context.rawMessage.key, context.queue);
}

async function handleStats(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session info not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const stats = await getSessionStats(context.sessionId);

    // Calculate uptime
    const uptimeMs = process.uptime() * 1000;
    const uptimeHrs = Math.floor(uptimeMs / 3600000);
    const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = uptimeHrs > 0 ? `${uptimeHrs}h ${uptimeMins}m` : `${uptimeMins}m`;

    let msg = `*BOT STATUS*\n\n`;
    msg += `Status: Online\n`;
    msg += `Uptime: ${uptimeStr}\n`;

    if (stats.session) {
      msg += `\n*SESSION*\n`;
      msg += `Name: ${stats.session.session_name || 'Default'}\n`;
      msg += `Connected: ${stats.session.state === 'active' ? 'Yes' : stats.session.state}\n`;
      msg += `Created: ${new Date(stats.session.created_at).toLocaleDateString()}\n`;
      if (stats.session.last_active) {
        const lastActiveAgo = Date.now() - new Date(stats.session.last_active).getTime();
        const agoMins = Math.floor(lastActiveAgo / 60000);
        msg += `Last Active: ${agoMins < 1 ? 'Just now' : agoMins < 60 ? `${agoMins}m ago` : `${Math.floor(agoMins / 60)}h ago`}\n`;
      }
    }

    msg += `\n*MESSAGES*\n`;
    msg += `Total: ${stats.totalMessages}\n`;
    msg += `Active Games: N/A\n`;
    msg += `Dedup Cache: N/A\n`;

    if (stats.topUsers.length > 0) {
      msg += '\n*TOP USERS*\n';
      stats.topUsers.slice(0, 5).forEach((u, i) => {
        const name = u.user_name || u.user_jid.split('@')[0];
        msg += `${i + 1}. ${name} — ${u.message_count} msgs\n`;
      });
    }

    msg += `\n_BotWave v1.0 | ${currentTimeStr()} ${currentDateStr()}_`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Stats error:', error);
    await sendReply(context.chatJid, 'Failed to fetch stats.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleSchedule(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for scheduling.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (args.length === 0) {
    // Show pending scheduled messages
    const scheduled = await getUserScheduledMessages(context.sessionId, context.senderJid);
    if (scheduled.length === 0) {
      await sendReply(context.chatJid, 'No scheduled messages. Use: !schedule 1h Hello future me!', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Scheduled Messages:*\n';
    scheduled.forEach((s, i) => {
      const timeLeft = Math.max(0, new Date(s.send_at).getTime() - Date.now());
      const mins = Math.ceil(timeLeft / 60000);
      const preview = s.message.length > 30 ? s.message.slice(0, 30) + '...' : s.message;
      msg += `${i + 1}. "${preview}" — sends in ${mins}min\n`;
    });
    msg += '\nUse !schedule cancel <number> to remove.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Cancel: !schedule cancel 1
  if (args[0].toLowerCase() === 'cancel' && args[1]) {
    const scheduled = await getUserScheduledMessages(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < scheduled.length) {
      await deleteScheduledMessage(scheduled[index].id, context.senderJid);
      await sendReply(context.chatJid, 'Scheduled message cancelled.', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid number. Use !schedule to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // Create: !schedule 1h Hello future me!
  const sendAt = parseTimeString(args[0]);
  if (!sendAt) {
    await sendReply(context.chatJid, 'Invalid time. Examples: !schedule 30m Check in, !schedule 2h Meeting time', sock, context.rawMessage.key, context.queue);
    return;
  }

  const message = args.slice(1).join(' ') || 'Scheduled message';
  const scheduled = await createScheduledMessage(context.sessionId, context.senderJid, context.chatJid, message, sendAt);
  if (scheduled) {
    const mins = Math.ceil((sendAt.getTime() - Date.now()) / 60000);
    await sendReply(context.chatJid, `Message scheduled for ${mins} minute(s) from now: "${message}"`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, 'Failed to schedule message. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handlePurge(context: MessageContext, args: string[], sock: any): Promise<void> {
  const count = parseInt(args[0]) || 5;
  if (count < 1 || count > 100) {
    await sendReply(context.chatJid, '!purge [1-100] — Delete your own last N messages\n\nExample: !purge 10', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Method 1: Use sendMessage with delete protocol (works on Baileys direct)
  if (typeof sock.sendMessage === 'function') {
    try {
      // Delete the command message itself first
      try {
        await sock.sendMessage(context.chatJid, { delete: context.rawMessage.key });
      } catch {
        // command msg delete failed, continue
      }

      // Fetch recent messages from this chat to find bot's own messages
      let deleted = 0;
      const botJid = (sock as any).user?.id;
      const normalizedBotJid = botJid ? botJid.replace(/:\d+@/, '@').trim() : '';

      // Try to use store/fetchMessageHistory if available
      if (typeof sock.fetchMessageHistory === 'function') {
        try {
          const messages = await sock.fetchMessageHistory(context.chatJid, count * 3);
          if (Array.isArray(messages)) {
            for (const msg of messages) {
              if (deleted >= count) break;
              const key = msg?.key;
              if (!key) continue;
              const isFromBot = key.fromMe || key.participant === normalizedBotJid || key.participant === botJid;
              if (isFromBot) {
                try {
                  await sock.sendMessage(context.chatJid, { delete: key });
                  deleted++;
                } catch {
                  // individual delete failed
                }
              }
            }
          }
        } catch {
          // fetchMessageHistory not available
        }
      }

      // Try chatModify clear approach as well
      if (deleted === 0 && typeof sock.chatModify === 'function') {
        try {
          await sock.chatModify(
            { clear: { messages: [{ id: context.rawMessage.key.id, fromMe: true, timestamp: Date.now() }] } },
            context.chatJid,
          );
          deleted = 1;
        } catch {
          // chatModify failed
        }
      }

      if (deleted > 0) {
        // Send confirmation directly via sock to get the message key for auto-delete
        let confirmKey: any = null;
        try {
          const sent = await sock.sendMessage(context.chatJid, {
            text: `Purged ${deleted} message(s).`,
          });
          confirmKey = sent?.key;
        } catch {
          await sendReply(context.chatJid, `Purged ${deleted} message(s).`, sock, context.rawMessage.key, context.queue);
        }
        // Auto-delete the confirmation after 3 seconds
        if (confirmKey) {
          setTimeout(async () => {
            try {
              await sock.sendMessage(context.chatJid, { delete: confirmKey });
            } catch { /* ignore */ }
          }, 3000);
        }
      } else {
        await sendReply(
          context.chatJid,
          `Purge attempted for ${count} message(s). Note: The bot can only delete its own messages. In groups, the bot needs admin rights to delete others' messages.`,
          sock, context.rawMessage.key, context.queue,
        );
      }
    } catch (err) {
      console.error('[PURGE] Error:', err);
      await sendReply(context.chatJid, 'Purge failed. Make sure the bot has admin rights in groups.', sock, context.rawMessage.key, context.queue);
    }
  } else {
    await sendReply(context.chatJid, 'Purge is not available in this connection mode.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleCalc(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*CALCULATOR*\n\n!calc [expression]\n\nExamples:\n!calc 2^10 + sqrt(144)\n!calc (5+3) * 2\n!calc sin(45)', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    let expr = args.join(' ')
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1*Math.PI/180)')
      .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1*Math.PI/180)')
      .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1*Math.PI/180)')
      .replace(/log\(([^)]+)\)/gi, 'Math.log10($1)')
      .replace(/ln\(([^)]+)\)/gi, 'Math.log($1)')
      .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
      .replace(/pi/gi, 'Math.PI')
      .replace(/\^/g, '**');
    // Security: only allow math characters
    if (/[^0-9+\-*/().%\s,Mathesincoqrtlgabp]/.test(expr.replace(/Math\.\w+/g, ''))) {
      throw new Error('Invalid characters');
    }
    const fn = new Function(`"use strict"; return (${expr})`);
    const result = fn();
    await sendReply(context.chatJid, `*RESULT*\n\n${args.join(' ')} = *${result}*`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Invalid expression. Use numbers and operators (+, -, *, /, ^, sqrt, sin, cos, tan).', sock, context.rawMessage.key, context.queue);
  }
}

async function handleCountdown(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*COUNTDOWN*\n\n!countdown [YYYY-MM-DD]\n\nExample: !countdown 2025-12-25', sock, context.rawMessage.key, context.queue);
    return;
  }
  const target = new Date(args[0]);
  if (isNaN(target.getTime())) {
    await sendReply(context.chatJid, 'Invalid date format. Use YYYY-MM-DD', sock, context.rawMessage.key, context.queue);
    return;
  }
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    await sendReply(context.chatJid, `*COUNTDOWN*\n\n${args[0]} was *${Math.abs(days)}* days ago.`, sock, context.rawMessage.key, context.queue);
  } else if (days === 0) {
    await sendReply(context.chatJid, `*COUNTDOWN*\n\n${args[0]} is *today*!`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, `*COUNTDOWN*\n\n*${days}* days until ${args[0]}`, sock, context.rawMessage.key, context.queue);
  }
}

async function handleCalendar(context: MessageContext, sock: any): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('en', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  let cal = `*${monthName} ${year}*\n\n`;
  cal += '` Su  Mo  Tu  We  Th  Fr  Sa `\n`';
  let dayCount = 0;
  for (let i = 0; i < firstDay; i++) { cal += '    '; dayCount++; }
  for (let d = 1; d <= daysInMonth; d++) {
    const marker = d === today ? `*${d.toString().padStart(2)}*` : d.toString().padStart(3) + ' ';
    cal += d === today ? ` ${marker}` : marker;
    dayCount++;
    if (dayCount % 7 === 0 && d < daysInMonth) cal += ' `\n`';
  }
  cal += ' `';
  await sendReply(context.chatJid, cal, sock, context.rawMessage.key, context.queue);
}

async function handleUptime(context: MessageContext, sock: any): Promise<void> {
  const uptime = Date.now() - botStartTime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  await sendReply(context.chatJid, `*BOT UPTIME*\n\n${parts.join(' ')}`, sock, context.rawMessage.key, context.queue);
}

async function handleId(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedParticipant = context.rawMessage?.message?.extendedTextMessage?.contextInfo?.participant;
  let info = `*CHAT INFO*\n\n*Chat JID:* ${context.chatJid}\n*Your JID:* ${context.senderJid}`;
  if (context.isGroup) info += `\n*Type:* Group`;
  else info += `\n*Type:* Private`;
  if (quotedParticipant) info += `\n*Quoted user:* ${quotedParticipant}`;
  if (context.rawMessage.key?.id) info += `\n*Message ID:* ${context.rawMessage.key.id}`;
  await sendReply(context.chatJid, info, sock, context.rawMessage.key, context.queue);
}

async function handlePaste(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
  const text = args.length > 0 ? args.join(' ') : quotedText;
  if (!text) {
    await sendReply(context.chatJid, '*PASTE*\n\n!paste [text]\nor reply to a message with !paste', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const response = await axios.post('https://paste.rs/', text, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 10000,
    });
    await sendReply(context.chatJid, `*PASTE CREATED*\n\n${response.data}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Failed to create paste.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleBase64(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 2) {
    await sendReply(
      context.chatJid,
      '*BASE64*\n\n!base64 encode [text] — Encode text\n!base64 decode [encoded] — Decode base64\n\nExample: !base64 encode Hello World',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  const action = args[0].toLowerCase();
  const input = args.slice(1).join(' ');

  if (action === 'encode' || action === 'enc' || action === 'e') {
    const encoded = Buffer.from(input, 'utf-8').toString('base64');
    await sendReply(context.chatJid, `*ENCODED*\n\n${encoded}`, sock, context.rawMessage.key, context.queue);
  } else if (action === 'decode' || action === 'dec' || action === 'd') {
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf-8');
      await sendReply(context.chatJid, `*DECODED*\n\n${decoded}`, sock, context.rawMessage.key, context.queue);
    } catch {
      await sendReply(context.chatJid, 'Invalid base64 input.', sock, context.rawMessage.key, context.queue);
    }
  } else {
    await sendReply(context.chatJid, 'Use !base64 encode or !base64 decode', sock, context.rawMessage.key, context.queue);
  }
}

async function handleHash(context: MessageContext, args: string[], sock: any, commandName: string): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      '*HASH GENERATOR*\n\n!hash [text] — Generate MD5 + SHA-256\n!md5 [text] — MD5 only\n!sha256 [text] — SHA-256 only\n\nExample: !hash Hello World',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  const input = args.join(' ');
  const md5 = crypto.createHash('md5').update(input).digest('hex');
  const sha256 = crypto.createHash('sha256').update(input).digest('hex');

  if (commandName === 'md5') {
    await sendReply(context.chatJid, `*MD5*\n\n${md5}`, sock, context.rawMessage.key, context.queue);
  } else if (commandName === 'sha256') {
    await sendReply(context.chatJid, `*SHA-256*\n\n${sha256}`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, `*HASH*\n\n*MD5:* ${md5}\n*SHA-256:* ${sha256}`, sock, context.rawMessage.key, context.queue);
  }
}

async function handlePick(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!pick [option1, option2, ...]\n\nExample: !pick pizza, burger, sushi', sock, context.rawMessage.key, context.queue); return; }
  const options = args.join(' ').split(',').map(o => o.trim()).filter(Boolean);
  if (options.length < 2) { await sendReply(context.chatJid, 'Need at least 2 options separated by commas.', sock, context.rawMessage.key, context.queue); return; }
  const choice = options[Math.floor(Math.random() * options.length)];
  await sendReply(context.chatJid, `🎯 I pick: *${choice}*`, sock, context.rawMessage.key, context.queue);
}

async function handleCoinFlip(context: MessageContext, sock: any): Promise<void> {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  await sendReply(context.chatJid, `🪙 *${result}!*`, sock, context.rawMessage.key, context.queue);
}

async function handleDice(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sides = parseInt(args[0]) || 6;
  const result = Math.floor(Math.random() * sides) + 1;
  await sendReply(context.chatJid, `🎲 Rolled a *${result}* (d${sides})`, sock, context.rawMessage.key, context.queue);
}

async function handlePassword(context: MessageContext, args: string[], sock: any): Promise<void> {
  const length = Math.min(Math.max(parseInt(args[0]) || 16, 4), 128);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  const bytes = crypto.randomBytes(length);
  const password = Array.from(bytes).map(b => chars[b % chars.length]).join('');
  await sendReply(context.chatJid, `🔐 *Generated Password (${length} chars)*\n\n\`${password}\``, sock, context.rawMessage.key, context.queue);
}

async function handleUUID(context: MessageContext, sock: any): Promise<void> {
  const uuid = crypto.randomUUID();
  await sendReply(context.chatJid, `*UUID*\n\n${uuid}`, sock, context.rawMessage.key, context.queue);
}

async function handleEpoch(context: MessageContext, sock: any): Promise<void> {
  const now = Date.now();
  const secs = Math.floor(now / 1000);
  await sendReply(context.chatJid, `*EPOCH / UNIX TIMESTAMP*\n\n*Seconds:* ${secs}\n*Milliseconds:* ${now}\n*ISO:* ${new Date(now).toISOString()}`, sock, context.rawMessage.key, context.queue);
}

async function handleBMI(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 2) { await sendReply(context.chatJid, '*BMI CALCULATOR*\n\n!bmi [weight kg] [height cm]\n\nExample: !bmi 70 175', sock, context.rawMessage.key, context.queue); return; }
  const weight = parseFloat(args[0]);
  const heightCm = parseFloat(args[1]);
  if (isNaN(weight) || isNaN(heightCm) || weight <= 0 || heightCm <= 0) {
    await sendReply(context.chatJid, 'Invalid values. Use: !bmi [weight in kg] [height in cm]', sock, context.rawMessage.key, context.queue);
    return;
  }
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  await sendReply(context.chatJid, `*BMI RESULT*\n\n*BMI:* ${bmi.toFixed(1)}\n*Category:* ${category}\n\nWeight: ${weight}kg | Height: ${heightCm}cm`, sock, context.rawMessage.key, context.queue);
}

async function handleAge(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '*AGE CALCULATOR*\n\n!age [YYYY-MM-DD]\n\nExample: !age 2000-05-15', sock, context.rawMessage.key, context.queue); return; }
  const birth = new Date(args[0]);
  if (isNaN(birth.getTime())) { await sendReply(context.chatJid, 'Invalid date format. Use YYYY-MM-DD', sock, context.rawMessage.key, context.queue); return; }
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
  await sendReply(context.chatJid, `*AGE*\n\n*${years}* years, *${months}* months, *${days}* days\n\nTotal: ${totalDays.toLocaleString()} days`, sock, context.rawMessage.key, context.queue);
}

const unitConversions: Record<string, Record<string, number>> = {
  km: { mi: 0.621371, m: 1000, ft: 3280.84, yd: 1093.61 },
  mi: { km: 1.60934, m: 1609.34, ft: 5280, yd: 1760 },
  m: { km: 0.001, mi: 0.000621371, ft: 3.28084, cm: 100, in: 39.3701 },
  ft: { m: 0.3048, cm: 30.48, in: 12, km: 0.0003048, mi: 0.000189394 },
  kg: { lb: 2.20462, g: 1000, oz: 35.274, st: 0.157473 },
  lb: { kg: 0.453592, g: 453.592, oz: 16, st: 0.0714286 },
  g: { kg: 0.001, lb: 0.00220462, oz: 0.035274 },
  oz: { g: 28.3495, kg: 0.0283495, lb: 0.0625 },
  c: { f: -1, k: -2 }, // special handling
  f: { c: -1, k: -2 },
  k: { c: -1, f: -2 },
  l: { gal: 0.264172, ml: 1000, pt: 2.11338, qt: 1.05669 },
  gal: { l: 3.78541, ml: 3785.41, pt: 8, qt: 4 },
  cm: { in: 0.393701, m: 0.01, ft: 0.0328084, mm: 10 },
  in: { cm: 2.54, m: 0.0254, ft: 0.0833333, mm: 25.4 },
};

async function handleUnit(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 3) {
    await sendReply(context.chatJid, '*UNIT CONVERTER*\n\n!unit [value] [from] [to]\n\nExamples:\n!unit 100 km mi\n!unit 72 kg lb\n!unit 37 c f\n!unit 5 l gal', sock, context.rawMessage.key, context.queue);
    return;
  }
  const value = parseFloat(args[0]);
  const from = args[1].toLowerCase();
  const to = args[2].toLowerCase();
  if (isNaN(value)) { await sendReply(context.chatJid, 'Invalid number.', sock, context.rawMessage.key, context.queue); return; }

  // Temperature special handling
  if ((from === 'c' || from === 'f' || from === 'k') && (to === 'c' || to === 'f' || to === 'k')) {
    let result: number;
    if (from === to) result = value;
    else if (from === 'c' && to === 'f') result = value * 9/5 + 32;
    else if (from === 'f' && to === 'c') result = (value - 32) * 5/9;
    else if (from === 'c' && to === 'k') result = value + 273.15;
    else if (from === 'k' && to === 'c') result = value - 273.15;
    else if (from === 'f' && to === 'k') result = (value - 32) * 5/9 + 273.15;
    else result = (value - 273.15) * 9/5 + 32;
    await sendReply(context.chatJid, `*CONVERT*\n\n${value} ${from.toUpperCase()} = *${result.toFixed(2)} ${to.toUpperCase()}*`, sock, context.rawMessage.key, context.queue);
    return;
  }

  const conversions = unitConversions[from];
  if (!conversions || !conversions[to]) {
    await sendReply(context.chatJid, `Unknown conversion: ${from} → ${to}\n\nSupported: km, mi, m, ft, cm, in, kg, lb, g, oz, l, gal, c, f, k`, sock, context.rawMessage.key, context.queue);
    return;
  }
  const result = value * conversions[to];
  await sendReply(context.chatJid, `*CONVERT*\n\n${value} ${from} = *${result.toFixed(4)} ${to}*`, sock, context.rawMessage.key, context.queue);
}


// ─── Register Productivity Commands ─────────────────────────────────────────

registerCommand({ name: 'remind', aliases: ['remind', 'reminder', 'remindme'], category: 'productivity', description: 'Set a reminder', execute: (ctx, args, sock) => handleRemind(ctx, args, sock) });
registerCommand({ name: 'note', aliases: ['note', 'notes', 'memo'], category: 'productivity', description: 'Manage notes', execute: (ctx, args, sock) => handleNote(ctx, args, sock) });
registerCommand({ name: 'stats', aliases: ['stats', 'status', 'stat', 'info'], category: 'productivity', description: 'Session stats', execute: (ctx, _a, sock) => handleStats(ctx, sock) });
registerCommand({ name: 'schedule', aliases: ['schedule', 'sched'], category: 'productivity', description: 'Schedule messages', execute: (ctx, args, sock) => handleSchedule(ctx, args, sock) });
registerCommand({ name: 'purge', aliases: ['purge', 'del'], category: 'productivity', description: 'Delete recent messages', execute: (ctx, args, sock) => handlePurge(ctx, args, sock) });
registerCommand({ name: 'calc', aliases: ['calc', 'calculate', 'math'], category: 'productivity', description: 'Calculator', execute: (ctx, args, sock) => handleCalc(ctx, args, sock) });
registerCommand({ name: 'countdown', aliases: ['countdown'], category: 'productivity', description: 'Countdown to date', execute: (ctx, args, sock) => handleCountdown(ctx, args, sock) });
registerCommand({ name: 'cal', aliases: ['cal', 'calendar'], category: 'productivity', description: 'Show calendar', execute: (ctx, _a, sock) => handleCalendar(ctx, sock) });
registerCommand({ name: 'uptime', aliases: ['uptime'], category: 'productivity', description: 'Bot uptime', execute: (ctx, _a, sock) => handleUptime(ctx, sock) });
registerCommand({ name: 'id', aliases: ['id', 'chatid'], category: 'productivity', description: 'Show chat/user ID', execute: (ctx, _a, sock) => handleId(ctx, sock) });
registerCommand({ name: 'paste', aliases: ['paste', 'pastebin'], category: 'productivity', description: 'Create paste', execute: (ctx, args, sock) => handlePaste(ctx, args, sock) });
registerCommand({ name: 'base64', aliases: ['base64', 'b64'], category: 'productivity', description: 'Base64 encode/decode', execute: (ctx, args, sock) => handleBase64(ctx, args, sock) });
registerCommand({ name: 'hash', aliases: ['hash', 'md5', 'sha256'], category: 'productivity', description: 'Hash text', execute: (ctx, args, sock, _v, cmdName) => handleHash(ctx, args, sock, cmdName) });
registerCommand({ name: 'pick', aliases: ['pick', 'choose'], category: 'utility', description: 'Pick random option', execute: (ctx, args, sock) => handlePick(ctx, args, sock) });
registerCommand({ name: 'coinflip', aliases: ['coinflip', 'flip'], category: 'utility', description: 'Flip a coin', execute: (ctx, _a, sock) => handleCoinFlip(ctx, sock) });
registerCommand({ name: 'dice', aliases: ['dice', 'roll'], category: 'utility', description: 'Roll dice', execute: (ctx, args, sock) => handleDice(ctx, args, sock) });
registerCommand({ name: 'password', aliases: ['password', 'genpass'], category: 'utility', description: 'Generate password', execute: (ctx, args, sock) => handlePassword(ctx, args, sock) });
registerCommand({ name: 'uuid', aliases: ['uuid'], category: 'utility', description: 'Generate UUID', execute: (ctx, _a, sock) => handleUUID(ctx, sock) });
registerCommand({ name: 'epoch', aliases: ['epoch', 'timestamp'], category: 'utility', description: 'Show epoch time', execute: (ctx, _a, sock) => handleEpoch(ctx, sock) });
registerCommand({ name: 'bmi', aliases: ['bmi'], category: 'utility', description: 'Calculate BMI', execute: (ctx, args, sock) => handleBMI(ctx, args, sock) });
registerCommand({ name: 'age', aliases: ['age'], category: 'utility', description: 'Calculate age', execute: (ctx, args, sock) => handleAge(ctx, args, sock) });
registerCommand({ name: 'unit', aliases: ['unit'], category: 'utility', description: 'Unit conversion', execute: (ctx, args, sock) => handleUnit(ctx, args, sock) });
