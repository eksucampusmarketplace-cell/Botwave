/**
 * Filters handler for Telegram userbot.
 * Commands: .filter <keyword> <response>, .filters, .stop <keyword>
 * Auto-responds to messages matching keywords in chats.
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  responseDelay,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';
import { addFilter, getFilters, deleteFilter } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const addFilterHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args.length < 2) {
    await msg.edit({ text: '❌ Usage: .filter <keyword> <response>' });
    return;
  }

  const keyword = args[0];
  let response: string;

  if (msg.replyTo) {
    try {
      const replied = await client.getMessages(msg.chatId!, {
        ids: [msg.replyTo.replyToMsgId],
      });
      response = replied[0]?.text || args.slice(1).join(' ');
    } catch {
      response = args.slice(1).join(' ');
    }
  } else {
    response = args.slice(1).join(' ');
  }

  const chatId = msg.chatId?.toString() || '';
  await addFilter(sessionId, chatId, keyword, response);
  await shortPause();
  await msg.edit({ text: `✅ Filter "${keyword}" added for this chat.` });
};

export const listFiltersHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const chatId = msg.chatId?.toString() || '';

  const filters = await getFilters(sessionId, chatId);
  if (filters.length === 0) {
    await msg.edit({ text: '🔍 No filters set for this chat.' });
    return;
  }

  const list = filters.map((f, i) => `${i + 1}. \`${f.keyword}\` → ${f.response.slice(0, 50)}${f.response.length > 50 ? '...' : ''}`).join('\n');
  await shortPause();
  await msg.edit({ text: `🔍 **Active Filters** (${filters.length}):\n\n${list}` });
};

export const stopFilterHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .stop <keyword>' });
    return;
  }

  const chatId = msg.chatId?.toString() || '';
  const deleted = await deleteFilter(sessionId, chatId, args[0]);
  await shortPause();
  await msg.edit({
    text: deleted ? `✅ Filter "${args[0]}" removed.` : `❌ Filter "${args[0]}" not found.`,
  });
};

/**
 * Check incoming messages against active filters for the chat.
 */
export async function handleFilterCheck(
  client: TelegramClient,
  event: NewMessageEvent,
  sessionId: string,
): Promise<boolean> {
  const msg = event.message;
  if (msg.out) return false;

  const text = (msg.text || '').toLowerCase();
  if (!text) return false;

  const chatId = msg.chatId?.toString() || '';
  const filters = await getFilters(sessionId, chatId);

  for (const filter of filters) {
    if (text.includes(filter.keyword.toLowerCase())) {
      await waitForRateLimit('message_send');
      await responseDelay();

      if (shouldShowTyping() && msg.chatId) {
        try {
          const { Api } = await import('telegram/tl');
          const peer = await client.getInputEntity(msg.chatId);
          await client.invoke(
            new Api.messages.SetTyping({
              peer,
              action: new Api.SendMessageTypingAction(),
            }),
          );
          await typingDelay(filter.response.length);
        } catch {}
      }

      try {
        await client.sendMessage(msg.chatId!, {
          message: filter.response,
          replyTo: msg.id,
        });
      } catch {}

      return true;
    }
  }

  return false;
}

export const filterHandlers: Record<string, HandlerFn> = {
  filter: addFilterHandler,
  filters: listFiltersHandler,
  stop: stopFilterHandler,
};
