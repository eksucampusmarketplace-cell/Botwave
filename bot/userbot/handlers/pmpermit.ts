/**
 * PM Permit handler for Telegram userbot.
 * Controls who can PM the user account. Unapproved users get warned,
 * then blocked after exceeding the limit.
 *
 * Commands: .approve, .disapprove, .block, .unblock, .pmguard on/off
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  responseDelay,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';
import {
  getUserbotConfig,
  updateUserbotConfig,
  getPmPermitApproved,
  approvePmUser,
  disapprovePmUser,
  incrementPmWarn,
} from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const approveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  // If replying to someone in a group, approve that user
  let targetId = chatId.toString();
  if (msg.replyTo) {
    try {
      const replied = await client.getMessages(chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        targetId = replied[0].senderId.toString();
      }
    } catch {}
  } else {
    const args = (msg.text || '').split(/\s+/).slice(1);
    if (args[0]) targetId = args[0];
  }

  await approvePmUser(sessionId, targetId);
  await shortPause();
  await msg.edit({ text: `✅ Approved. User can now PM freely.` });
};

export const disapproveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  let targetId = chatId.toString();
  if (msg.replyTo) {
    try {
      const replied = await client.getMessages(chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        targetId = replied[0].senderId.toString();
      }
    } catch {}
  } else {
    const args = (msg.text || '').split(/\s+/).slice(1);
    if (args[0]) targetId = args[0];
  }

  await disapprovePmUser(sessionId, targetId);
  await shortPause();
  await msg.edit({ text: `❌ Disapproved. User PM permit revoked.` });
};

export const blockHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await shortPause();

  try {
    const inputUser = await client.getInputEntity(chatId);
    await client.invoke(new Api.contacts.Block({ id: inputUser as Api.TypeInputPeer }));
    await mediumPause();
    await msg.edit({ text: '✅ User blocked.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Block failed: ${errorMsg}` });
  }
};

export const unblockHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await shortPause();

  try {
    const inputUser = await client.getInputEntity(chatId);
    await client.invoke(new Api.contacts.Unblock({ id: inputUser as Api.TypeInputPeer }));
    await mediumPause();
    await msg.edit({ text: '✅ User unblocked.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Unblock failed: ${errorMsg}` });
  }
};

export const pmguardHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args[0] === 'on') {
    await updateUserbotConfig(sessionId, { pm_permit_enabled: true });
    await msg.edit({ text: '🛡️ PM Guard enabled. Unapproved users will be warned.' });
  } else if (args[0] === 'off') {
    await updateUserbotConfig(sessionId, { pm_permit_enabled: false });
    await msg.edit({ text: '🛡️ PM Guard disabled.' });
  } else {
    const config = await getUserbotConfig(sessionId);
    await msg.edit({
      text: `🛡️ PM Guard: ${config.pm_permit_enabled ? 'ON' : 'OFF'}\nLimit: ${config.pm_permit_limit} warnings\nUse: .pmguard on/off`,
    });
  }
};

/**
 * Incoming PM handler — checks if PM permit is enabled and handles unapproved users.
 * This is called for every incoming PM, not as a command.
 */
export async function handleIncomingPm(
  client: TelegramClient,
  event: NewMessageEvent,
  sessionId: string,
): Promise<boolean> {
  const msg = event.message;
  if (!msg.isPrivate || msg.out) return false;

  const config = await getUserbotConfig(sessionId);
  if (!config.pm_permit_enabled) return false;

  const senderId = msg.senderId?.toString();
  if (!senderId) return false;

  // Check if user is approved
  const approved = await getPmPermitApproved(sessionId);
  if (approved.includes(senderId)) return false;

  // Check if user is in sudo list
  if (config.sudo_users.includes(senderId)) return false;

  await waitForRateLimit('message_send');

  // Increment warning count
  const warnCount = await incrementPmWarn(sessionId, senderId);

  if (warnCount >= config.pm_permit_limit) {
    // Block the user after exceeding limit
    await responseDelay();

    if (shouldShowTyping() && msg.chatId) {
      try {
        const peer = await client.getInputEntity(msg.chatId);
        await client.invoke(
          new Api.messages.SetTyping({
            peer,
            action: new Api.SendMessageTypingAction(),
          }),
        );
        await typingDelay(50);
      } catch {}
    }

    try {
      await client.sendMessage(msg.chatId!, {
        message: `⚠️ You have been blocked for spamming. (${warnCount}/${config.pm_permit_limit} warnings)`,
      });
      await shortPause();
      const inputUser = await client.getInputEntity(msg.chatId!);
      if (config.anti_pm_block) {
        await client.invoke(new Api.contacts.Block({ id: inputUser as Api.TypeInputPeer }));
      }
      if (config.anti_pm_report) {
        await client.invoke(
          new Api.messages.ReportSpam({ peer: inputUser as Api.TypeInputPeer }),
        );
      }
    } catch {}
    return true;
  }

  // Send warning message with humanized delay
  await responseDelay();

  if (shouldShowTyping() && msg.chatId) {
    try {
      const peer = await client.getInputEntity(msg.chatId);
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await typingDelay(config.pm_permit_message.length);
    } catch {}
  }

  const warningText = `${config.pm_permit_message}\n\n⚠️ Warning ${warnCount}/${config.pm_permit_limit}`;

  try {
    // If PM permit image is set, send as photo with caption
    if (config.pm_permit_image && msg.chatId) {
      try {
        await client.sendFile(msg.chatId, {
          file: config.pm_permit_image,
          caption: warningText,
          forceDocument: false,
        });
      } catch {
        // Fall back to text if image fails
        await client.sendMessage(msg.chatId!, { message: warningText });
      }
    } else {
      await client.sendMessage(msg.chatId!, { message: warningText });
    }
  } catch {}

  return true;
}

export const pmPermitHandlers: Record<string, HandlerFn> = {
  approve: approveHandler,
  disapprove: disapproveHandler,
  block: blockHandler,
  unblock: unblockHandler,
  pmguard: pmguardHandler,
};
