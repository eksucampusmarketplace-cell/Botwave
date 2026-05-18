/**
 * Reminder/scheduler handler for Telegram userbot.
 * Commands: .remind <time> <message>, .reminders, .clearreminders
 * Supports: 5m, 2h, 1d time formats.
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  responseDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

interface Reminder {
  id: number;
  chatId: string;
  userId: string;
  message: string;
  triggerAt: number;
  createdAt: number;
  timer: ReturnType<typeof setTimeout>;
}

let nextId = 1;
const activeReminders: Map<number, Reminder> = new Map();

function parseTimeString(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  return value * (multipliers[unit] || 0);
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

export const remindHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const parts = (msg.text || '').split(/\s+/).slice(1);

  if (parts.length < 2) {
    await msg.edit({
      text: '❌ Usage: .remind <time> <message>\nExamples: .remind 5m Check the oven\n.remind 2h Call mom\n.remind 1d Pay bills',
    });
    return;
  }

  const timeStr = parts[0];
  const reminderMsg = parts.slice(1).join(' ');
  const delayMs = parseTimeString(timeStr);

  if (!delayMs || delayMs < 5000) {
    await msg.edit({ text: '❌ Invalid time. Use: 5s, 5m, 2h, 1d, 1w (min 5s)' });
    return;
  }

  if (delayMs > 604_800_000) {
    await msg.edit({ text: '❌ Maximum reminder time is 7 days (1w).' });
    return;
  }

  const chatId = msg.chatId?.toString() || '';
  const userId = msg.senderId?.toString() || '';
  const id = nextId++;

  const timer = setTimeout(async () => {
    try {
      await waitForRateLimit('message_send');
      await responseDelay();
      await client.sendMessage(chatId, {
        message: `⏰ **Reminder:** ${reminderMsg}`,
      });
    } catch {}
    activeReminders.delete(id);
  }, delayMs);

  const reminder: Reminder = {
    id,
    chatId,
    userId,
    message: reminderMsg,
    triggerAt: Date.now() + delayMs,
    createdAt: Date.now(),
    timer,
  };

  activeReminders.set(id, reminder);

  await shortPause();
  await msg.edit({
    text: `⏰ Reminder set for **${formatDuration(delayMs)}** from now.\nID: ${id}\nMessage: ${reminderMsg}`,
  });
};

export const remindersListHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const userId = msg.senderId?.toString() || '';

  const userReminders = Array.from(activeReminders.values())
    .filter(r => r.userId === userId);

  if (userReminders.length === 0) {
    await msg.edit({ text: '📋 No active reminders.' });
    return;
  }

  const lines = ['📋 **Active Reminders**\n'];
  for (const r of userReminders) {
    const timeLeft = r.triggerAt - Date.now();
    lines.push(`**#${r.id}** — ${r.message}\n  ⏳ In ${formatDuration(timeLeft)}`);
  }

  await shortPause();
  await msg.edit({ text: lines.join('\n') });
};

export const clearRemindersHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const userId = msg.senderId?.toString() || '';
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args[0] && args[0] !== 'all') {
    const id = parseInt(args[0], 10);
    const reminder = activeReminders.get(id);
    if (reminder && reminder.userId === userId) {
      clearTimeout(reminder.timer);
      activeReminders.delete(id);
      await shortPause();
      await msg.edit({ text: `✅ Reminder #${id} cancelled.` });
    } else {
      await msg.edit({ text: `❌ Reminder #${args[0]} not found.` });
    }
    return;
  }

  let count = 0;
  for (const [id, r] of activeReminders) {
    if (r.userId === userId) {
      clearTimeout(r.timer);
      activeReminders.delete(id);
      count++;
    }
  }

  await shortPause();
  await msg.edit({ text: `✅ Cleared ${count} reminder(s).` });
};

export const reminderHandlers: Record<string, HandlerFn> = {
  remind: remindHandler,
  reminders: remindersListHandler,
  cancelremind: clearRemindersHandler,
  clearreminders: clearRemindersHandler,
};
