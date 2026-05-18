/**
 * Global Ban (GBan) handler for Telegram userbot.
 * Commands: .gban <user> [reason], .ungban <user>, .gbanlist
 * Bans a user across all chats where the userbot is admin.
 * Heavily humanized with delays between each chat action.
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  longPause,
  humanDelay,
} from '../utils/humanizer';
import { addGban, removeGban, getGbanList, isGbanned } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

async function getTargetUserId(
  client: TelegramClient,
  event: NewMessageEvent,
): Promise<string | null> {
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        return replied[0].senderId.toString();
      }
    } catch {}
  }

  if (args[0]) return args[0];
  return null;
}

export const gbanHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const targetId = await getTargetUserId(client, event);
  if (!targetId) {
    await msg.edit({ text: '❌ Reply to a user or provide username/ID.' });
    return;
  }

  const args = (msg.text || '').split(/\s+/).slice(2);
  const reason = args.join(' ') || 'No reason';

  if (await isGbanned(sessionId, targetId)) {
    await msg.edit({ text: '⚠️ User is already gbanned.' });
    return;
  }

  await addGban(sessionId, targetId, reason);
  await msg.edit({ text: `🔨 GBanning user ${targetId}...\nReason: ${reason}` });

  let banned = 0;
  let failed = 0;

  try {
    const dialogs = await client.getDialogs({ limit: 200 });

    for (const dialog of dialogs) {
      if (!dialog.isGroup && !dialog.isChannel) continue;

      await waitForRateLimit('ban_action');
      await humanDelay(1500, 4000);

      try {
        const chatPeer = await client.getInputEntity(dialog.id!);
        const inputUser = await client.getInputEntity(targetId);
        await client.invoke(
          new Api.channels.EditBanned({
            channel: chatPeer as any,
            participant: inputUser as any,
            bannedRights: new Api.ChatBannedRights({
              untilDate: 0,
              viewMessages: true,
              sendMessages: true,
            }),
          }),
        );
        banned++;
      } catch {
        failed++;
      }
    }
  } catch {}

  await mediumPause();
  await msg.edit({
    text: `✅ GBan complete for ${targetId}\nReason: ${reason}\nBanned in: ${banned} chats\nFailed: ${failed}`,
  });
};

export const ungbanHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const targetId = await getTargetUserId(client, event);
  if (!targetId) {
    await msg.edit({ text: '❌ Reply to a user or provide username/ID.' });
    return;
  }

  if (!(await isGbanned(sessionId, targetId))) {
    await msg.edit({ text: '⚠️ User is not gbanned.' });
    return;
  }

  await removeGban(sessionId, targetId);
  await msg.edit({ text: `🔓 Ungbanning user ${targetId}...` });

  let unbanned = 0;

  try {
    const dialogs = await client.getDialogs({ limit: 200 });

    for (const dialog of dialogs) {
      if (!dialog.isGroup && !dialog.isChannel) continue;

      await waitForRateLimit('ban_action');
      await humanDelay(1500, 4000);

      try {
        const chatPeer = await client.getInputEntity(dialog.id!);
        const inputUser = await client.getInputEntity(targetId);
        await client.invoke(
          new Api.channels.EditBanned({
            channel: chatPeer as any,
            participant: inputUser as any,
            bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
          }),
        );
        unbanned++;
      } catch {}
    }
  } catch {}

  await mediumPause();
  await msg.edit({
    text: `✅ Ungban complete for ${targetId}\nUnbanned in: ${unbanned} chats`,
  });
};

export const gbanlistHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const gbans = await getGbanList(sessionId);
  if (gbans.length === 0) {
    await msg.edit({ text: '📋 GBan list is empty.' });
    return;
  }

  const list = gbans
    .map((g, i) => `${i + 1}. \`${g.user_id}\` — ${g.reason}`)
    .join('\n');

  await shortPause();
  await msg.edit({ text: `📋 **GBan List** (${gbans.length}):\n\n${list}` });
};

/**
 * Check if a user joining a chat is gbanned — auto-ban them.
 */
export async function handleGbanCheck(
  client: TelegramClient,
  userId: string,
  chatId: any,
  sessionId: string,
): Promise<boolean> {
  if (!(await isGbanned(sessionId, userId))) return false;

  await waitForRateLimit('ban_action');
  await humanDelay(2000, 5000);

  try {
    const chatPeer = await client.getInputEntity(chatId);
    const inputUser = await client.getInputEntity(userId);
    await client.invoke(
      new Api.channels.EditBanned({
        channel: chatPeer as any,
        participant: inputUser as any,
        bannedRights: new Api.ChatBannedRights({
          untilDate: 0,
          viewMessages: true,
        }),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export const gbanHandlers: Record<string, HandlerFn> = {
  gban: gbanHandler,
  ungban: ungbanHandler,
  gbanlist: gbanlistHandler,
};
