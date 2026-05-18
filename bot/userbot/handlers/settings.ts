/**
 * Settings handler for Telegram userbot.
 * Commands: .setprefix, .setalive, .setlog, .addsudo, .rmsudo, .sudolist
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import { waitForRateLimit, shortPause } from '../utils/humanizer';
import { getUserbotConfig, updateUserbotConfig } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const setPrefixHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0] || args[0].length > 2) {
    await msg.edit({ text: '❌ Usage: .setprefix <char> (1-2 chars)' });
    return;
  }

  await updateUserbotConfig(sessionId, { prefix: args[0] });
  await shortPause();
  await msg.edit({ text: `✅ Prefix changed to: \`${args[0]}\`` });
};

export const setAliveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const content = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!content) {
    await msg.edit({ text: '❌ Usage: .setalive <message>' });
    return;
  }

  await updateUserbotConfig(sessionId, { alive_message: content });
  await shortPause();
  await msg.edit({ text: `✅ Alive message updated.` });
};

export const setLogHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args[0] === 'off' || args[0] === 'disable') {
    await updateUserbotConfig(sessionId, { log_chat_id: null });
    await msg.edit({ text: '✅ Log chat disabled.' });
    return;
  }

  if (args[0] === 'here') {
    const chatId = msg.chatId?.toString() || null;
    await updateUserbotConfig(sessionId, { log_chat_id: chatId });
    await msg.edit({ text: `✅ Log chat set to this chat.` });
    return;
  }

  if (args[0]) {
    await updateUserbotConfig(sessionId, { log_chat_id: args[0] });
    await msg.edit({ text: `✅ Log chat set to: ${args[0]}` });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  await msg.edit({
    text: `📋 Log chat: ${config.log_chat_id || 'Not set'}\nUsage: .setlog <chatid|here|off>`,
  });
};

export const addSudoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let userId: string | null = null;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) userId = replied[0].senderId.toString();
    } catch {}
  }

  if (!userId && args[0]) userId = args[0];

  if (!userId) {
    await msg.edit({ text: '❌ Reply to a user or provide a user ID.' });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  const sudoUsers = [...config.sudo_users];

  if (sudoUsers.includes(userId)) {
    await msg.edit({ text: '⚠️ User is already a sudo user.' });
    return;
  }

  sudoUsers.push(userId);
  await updateUserbotConfig(sessionId, { sudo_users: sudoUsers });
  await shortPause();
  await msg.edit({ text: `✅ Added ${userId} as sudo user.` });
};

export const rmSudoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let userId: string | null = null;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) userId = replied[0].senderId.toString();
    } catch {}
  }

  if (!userId && args[0]) userId = args[0];

  if (!userId) {
    await msg.edit({ text: '❌ Reply to a user or provide a user ID.' });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  const sudoUsers = config.sudo_users.filter(id => id !== userId);

  if (sudoUsers.length === config.sudo_users.length) {
    await msg.edit({ text: '⚠️ User is not a sudo user.' });
    return;
  }

  await updateUserbotConfig(sessionId, { sudo_users: sudoUsers });
  await shortPause();
  await msg.edit({ text: `✅ Removed ${userId} from sudo users.` });
};

export const sudoListHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const config = await getUserbotConfig(sessionId);

  if (config.sudo_users.length === 0) {
    await msg.edit({ text: '📋 No sudo users configured.' });
    return;
  }

  const list = config.sudo_users.map((id, i) => `${i + 1}. \`${id}\``).join('\n');
  await shortPause();
  await msg.edit({ text: `📋 **Sudo Users** (${config.sudo_users.length}):\n\n${list}` });
};

export const settingsHandlers: Record<string, HandlerFn> = {
  setprefix: setPrefixHandler,
  setalive: setAliveHandler,
  setlog: setLogHandler,
  addsudo: addSudoHandler,
  rmsudo: rmSudoHandler,
  sudolist: sudoListHandler,
};
