/**
 * Admin handler module for Telegram userbot.
 * Commands: .ban, .unban, .kick, .mute, .unmute, .promote, .demote, .pin, .unpin
 * All admin actions are humanized with delays and rate limiting.
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  mediumPause,
  shortPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

async function getTargetUser(
  client: TelegramClient,
  event: NewMessageEvent,
): Promise<Api.TypeInputUser | null> {
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  // If replying to a message, target that user
  if (msg.replyTo) {
    try {
      const replied = await client.getMessages(msg.chatId!, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        return await client.getInputEntity(replied[0].senderId);
      }
    } catch {}
  }

  // If username/id provided as argument
  if (args[0]) {
    try {
      return await client.getInputEntity(args[0]);
    } catch {}
  }

  return null;
}

function getReason(text: string): string {
  const parts = (text || '').split(/\s+/).slice(2);
  return parts.join(' ') || 'No reason provided';
}

export const banHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await shortPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({
          untilDate: 0,
          viewMessages: true,
          sendMessages: true,
          sendMedia: true,
          sendStickers: true,
          sendGifs: true,
          sendGames: true,
          sendInline: true,
          embedLinks: true,
        }),
      }),
    );
    const reason = getReason(msg.text || '');
    await mediumPause();
    await msg.edit({ text: `✅ Banned user. Reason: ${reason}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Ban failed: ${errorMsg}` });
  }
};

export const unbanHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await shortPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
      }),
    );
    await mediumPause();
    await msg.edit({ text: '✅ User unbanned.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Unban failed: ${errorMsg}` });
  }
};

export const kickHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await shortPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    // Ban then immediately unban = kick
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({
          untilDate: 0,
          viewMessages: true,
        }),
      }),
    );
    await shortPause();
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
      }),
    );
    await mediumPause();
    await msg.edit({ text: '✅ User kicked.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Kick failed: ${errorMsg}` });
  }
};

export const muteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await shortPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({
          untilDate: 0,
          sendMessages: true,
          sendMedia: true,
          sendStickers: true,
          sendGifs: true,
          sendGames: true,
          sendInline: true,
        }),
      }),
    );
    await mediumPause();
    await msg.edit({ text: '✅ User muted.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Mute failed: ${errorMsg}` });
  }
};

export const unmuteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('ban_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await shortPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as Api.TypeInputChannel,
        participant: target as Api.TypeInputPeer,
        bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
      }),
    );
    await mediumPause();
    await msg.edit({ text: '✅ User unmuted.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Unmute failed: ${errorMsg}` });
  }
};

export const promoteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  const args = (msg.text || '').split(/\s+/).slice(2);
  const title = args.join(' ') || 'Admin';

  await mediumPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditAdmin({
        channel: chatPeer as Api.TypeInputChannel,
        userId: target,
        adminRights: new Api.ChatAdminRights({
          changeInfo: true,
          deleteMessages: true,
          banUsers: true,
          inviteUsers: true,
          pinMessages: true,
          manageCall: true,
        }),
        rank: title,
      }),
    );
    await mediumPause();
    await msg.edit({ text: `✅ Promoted as "${title}".` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Promote failed: ${errorMsg}` });
  }
};

export const demoteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const target = await getTargetUser(client, event);
  if (!target) {
    await msg.edit({ text: '❌ Reply to a user or provide a username/ID.' });
    return;
  }

  await mediumPause();

  try {
    const chatPeer = await client.getInputEntity(msg.chatId!);
    await client.invoke(
      new Api.channels.EditAdmin({
        channel: chatPeer as Api.TypeInputChannel,
        userId: target,
        adminRights: new Api.ChatAdminRights({}),
        rank: '',
      }),
    );
    await mediumPause();
    await msg.edit({ text: '✅ Demoted.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Demote failed: ${errorMsg}` });
  }
};

export const pinHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;

  if (!msg.replyTo) {
    await msg.edit({ text: '❌ Reply to a message to pin it.' });
    return;
  }

  const silent = (msg.text || '').includes('-s') || (msg.text || '').includes('silent');

  await shortPause();

  try {
    await client.pinMessage(msg.chatId!, msg.replyTo.replyToMsgId, {
      notify: !silent,
    });
    await mediumPause();
    await msg.edit({ text: '✅ Message pinned.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Pin failed: ${errorMsg}` });
  }
};

export const unpinHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;

  await shortPause();

  try {
    if (msg.replyTo) {
      await client.unpinMessage(msg.chatId!, msg.replyTo.replyToMsgId);
    } else {
      // Unpin the latest pinned message
      await client.unpinMessage(msg.chatId!, undefined);
    }
    await mediumPause();
    await msg.edit({ text: '✅ Message unpinned.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Unpin failed: ${errorMsg}` });
  }
};

export const adminHandlers: Record<string, HandlerFn> = {
  ban: banHandler,
  unban: unbanHandler,
  kick: kickHandler,
  mute: muteHandler,
  unmute: unmuteHandler,
  promote: promoteHandler,
  demote: demoteHandler,
  pin: pinHandler,
  unpin: unpinHandler,
};
