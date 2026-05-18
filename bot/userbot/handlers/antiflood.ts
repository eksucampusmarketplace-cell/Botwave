/**
 * Antiflood handler for Telegram userbot.
 * Detects rapid message flooding in groups and auto-mutes offenders.
 * Commands: .antiflood <count>, .antiflood off, .antiflood
 * Deeply humanized - adds random delays before taking action.
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  humanDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

interface FloodTracker {
  count: number;
  firstMsgTime: number;
  lastMsgTime: number;
  warned: boolean;
}

// Per-chat antiflood settings: chatId -> max messages per 10s window
const antifloodSettings: Map<string, number> = new Map();
// Per-user-per-chat flood tracking
const floodTrackers: Map<string, FloodTracker> = new Map();
const FLOOD_WINDOW_MS = 10_000;

export const antifloodHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId?.toString() || '';
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args[0] === 'off' || args[0] === 'disable') {
    antifloodSettings.delete(chatId);
    await shortPause();
    await msg.edit({ text: '✅ Antiflood disabled for this chat.' });
    return;
  }

  if (args[0]) {
    const limit = parseInt(args[0], 10);
    if (isNaN(limit) || limit < 3 || limit > 50) {
      await msg.edit({ text: '❌ Usage: .antiflood <3-50> or .antiflood off' });
      return;
    }
    antifloodSettings.set(chatId, limit);
    await shortPause();
    await msg.edit({ text: `✅ Antiflood set to ${limit} messages per 10 seconds.` });
    return;
  }

  const current = antifloodSettings.get(chatId);
  await msg.edit({
    text: current
      ? `🛡️ Antiflood: **${current}** msgs/10s in this chat.\nUse .antiflood <count> or .antiflood off`
      : '🛡️ Antiflood is **OFF** for this chat.\nUse .antiflood <count> to enable.',
  });
};

/**
 * Check incoming messages for flood patterns.
 * Returns true if the message was handled (user muted for flooding).
 */
export async function handleAntifloodCheck(
  client: TelegramClient,
  event: NewMessageEvent,
): Promise<boolean> {
  const msg = event.message;
  if (msg.out || msg.isPrivate) return false;

  const chatId = msg.chatId?.toString() || '';
  const limit = antifloodSettings.get(chatId);
  if (!limit) return false;

  const senderId = msg.senderId?.toString() || '';
  if (!senderId) return false;

  const key = `${chatId}:${senderId}`;
  const now = Date.now();
  let tracker = floodTrackers.get(key);

  if (!tracker || now - tracker.firstMsgTime > FLOOD_WINDOW_MS) {
    tracker = { count: 1, firstMsgTime: now, lastMsgTime: now, warned: false };
    floodTrackers.set(key, tracker);
    return false;
  }

  tracker.count++;
  tracker.lastMsgTime = now;

  if (tracker.count >= limit && !tracker.warned) {
    tracker.warned = true;

    await waitForRateLimit('ban_action');
    await humanDelay(1000, 3000);

    try {
      const chatPeer = await client.getInputEntity(chatId);
      const userPeer = await client.getInputEntity(senderId);

      // Mute for 5 minutes
      const muteUntil = Math.floor(Date.now() / 1000) + 300;
      await client.invoke(
        new Api.channels.EditBanned({
          channel: chatPeer as unknown as Api.TypeInputChannel,
          participant: userPeer,
          bannedRights: new Api.ChatBannedRights({
            untilDate: muteUntil,
            sendMessages: true,
          }),
        }),
      );

      await mediumPause();
      await client.sendMessage(chatId, {
        message: `⚠️ User muted for 5 minutes (flood detected: ${tracker.count} msgs in 10s).`,
        replyTo: msg.id,
      });
    } catch {}

    return true;
  }

  return false;
}

// Cleanup old trackers periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, tracker] of floodTrackers) {
    if (now - tracker.lastMsgTime > FLOOD_WINDOW_MS * 3) {
      floodTrackers.delete(key);
    }
  }
}, 30_000);

export const antifloodHandlers: Record<string, HandlerFn> = {
  antiflood: antifloodHandler,
};
