/**
 * Purge handler for Telegram userbot.
 * Commands: .purge (reply), .purgeme <count>, .del (reply)
 * Bulk-deletes messages with humanized pacing to avoid flood bans.
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

const PURGE_BATCH_SIZE = 100;
const BATCH_DELAY_MIN = 500;
const BATCH_DELAY_MAX = 1500;

export const purgeHandler: HandlerFn = async (client, event) => {
  const msg = event.message;

  if (!msg.replyTo) {
    await msg.edit({ text: '❌ Reply to a message to purge from that point.' });
    return;
  }

  const chatId = msg.chatId;
  if (!chatId) return;

  await waitForRateLimit('message_delete');

  const fromId = msg.replyTo.replyToMsgId;
  const toId = msg.id;

  const messageIds: number[] = [];
  for (let i = fromId; i <= toId; i++) {
    messageIds.push(i);
  }

  let deleted = 0;
  for (let i = 0; i < messageIds.length; i += PURGE_BATCH_SIZE) {
    const batch = messageIds.slice(i, i + PURGE_BATCH_SIZE);
    try {
      await client.deleteMessages(chatId, batch, { revoke: true });
      deleted += batch.length;
    } catch {}

    if (i + PURGE_BATCH_SIZE < messageIds.length) {
      await humanDelay(BATCH_DELAY_MIN, BATCH_DELAY_MAX);
    }
  }

  try {
    const status = await client.sendMessage(chatId, {
      message: `✅ Purged ${deleted} messages.`,
    });
    await mediumPause();
    await status.delete({ revoke: true });
  } catch {}
};

export const purgemeHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);
  const count = parseInt(args[0], 10) || 10;
  const chatId = msg.chatId;
  if (!chatId) return;

  await waitForRateLimit('message_delete');

  try {
    const me = await client.getMe();
    const myId = me && 'id' in me ? me.id : null;
    if (!myId) return;

    const messages = await client.getMessages(chatId, {
      limit: Math.min(count + 1, 200),
      fromUser: myId,
    });

    const ids = messages.map(m => m.id);
    let deleted = 0;

    for (let i = 0; i < ids.length; i += PURGE_BATCH_SIZE) {
      const batch = ids.slice(i, i + PURGE_BATCH_SIZE);
      try {
        await client.deleteMessages(chatId, batch, { revoke: true });
        deleted += batch.length;
      } catch {}

      if (i + PURGE_BATCH_SIZE < ids.length) {
        await humanDelay(BATCH_DELAY_MIN, BATCH_DELAY_MAX);
      }
    }

    const status = await client.sendMessage(chatId, {
      message: `✅ Purged ${deleted} of my messages.`,
    });
    await mediumPause();
    await status.delete({ revoke: true });
  } catch {}
};

export const delHandler: HandlerFn = async (client, event) => {
  const msg = event.message;

  if (!msg.replyTo) {
    await msg.edit({ text: '❌ Reply to a message to delete it.' });
    return;
  }

  const chatId = msg.chatId;
  if (!chatId) return;

  await waitForRateLimit('message_delete');
  await shortPause();

  try {
    await client.deleteMessages(chatId, [msg.replyTo.replyToMsgId, msg.id], {
      revoke: true,
    });
  } catch {
    try {
      await client.deleteMessages(chatId, [msg.replyTo.replyToMsgId], {
        revoke: true,
      });
      await msg.delete({ revoke: true });
    } catch {}
  }
};

export const purgeHandlers: Record<string, HandlerFn> = {
  purge: purgeHandler,
  purgeme: purgemeHandler,
  del: delHandler,
};
