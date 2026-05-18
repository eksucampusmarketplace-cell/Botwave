/**
 * AFK (Away From Keyboard) handler for Telegram userbot.
 * Commands: .afk [reason], .unafk
 * Auto-replies to mentions/PMs when AFK with humanized delays.
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
import { getUserbotConfig, updateUserbotConfig } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

const recentAfkReplies = new Map<string, number>();
const AFK_REPLY_COOLDOWN = 5 * 60_000; // 5 minutes per user

export const afkHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const reason = (msg.text || '').split(/\s+/).slice(1).join(' ') || 'AFK';

  await updateUserbotConfig(sessionId, {
    afk_enabled: true,
    afk_reason: reason,
    afk_since: new Date().toISOString(),
  });

  await shortPause();
  await msg.edit({ text: `💤 Going AFK: ${reason}` });
};

export const unafkHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const config = await getUserbotConfig(sessionId);
  if (!config.afk_enabled) {
    await msg.edit({ text: '❌ You are not AFK.' });
    return;
  }

  const duration = config.afk_since
    ? formatDuration(Date.now() - new Date(config.afk_since).getTime())
    : 'unknown';

  await updateUserbotConfig(sessionId, {
    afk_enabled: false,
    afk_reason: '',
    afk_since: null,
  });

  recentAfkReplies.clear();
  await shortPause();
  await msg.edit({ text: `✅ Back online! Was AFK for ${duration}.` });
};

/**
 * Handle incoming messages while AFK.
 * Auto-replies with humanized timing, with per-user cooldown.
 */
export async function handleAfkMention(
  client: TelegramClient,
  event: NewMessageEvent,
  sessionId: string,
): Promise<boolean> {
  const msg = event.message;
  if (msg.out) return false;

  const config = await getUserbotConfig(sessionId);
  if (!config.afk_enabled) return false;

  const senderId = msg.senderId?.toString();
  if (!senderId) return false;

  // Check cooldown
  const lastReply = recentAfkReplies.get(senderId) || 0;
  if (Date.now() - lastReply < AFK_REPLY_COOLDOWN) return false;

  // Only reply to PMs and mentions
  const isPrivate = msg.isPrivate;
  const me = await client.getMe();
  const myId = me && 'id' in me ? me.id.toString() : '';
  const myUsername = me && 'username' in me ? (me.username || '') : '';
  const isMentioned = (msg.text || '').includes(`@${myUsername}`) ||
    (msg.mentioned);

  if (!isPrivate && !isMentioned) return false;

  await waitForRateLimit('message_send');
  recentAfkReplies.set(senderId, Date.now());

  const duration = config.afk_since
    ? formatDuration(Date.now() - new Date(config.afk_since).getTime())
    : '';

  const afkText = `💤 I'm currently AFK${config.afk_reason ? `: ${config.afk_reason}` : ''}`
    + (duration ? `\n⏱️ Since: ${duration} ago` : '');

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
      await typingDelay(afkText.length);
    } catch {}
  }

  try {
    await client.sendMessage(msg.chatId!, {
      message: afkText,
      replyTo: msg.id,
    });
  } catch {}

  return true;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export const afkHandlers: Record<string, HandlerFn> = {
  afk: afkHandler,
  unafk: unafkHandler,
};
