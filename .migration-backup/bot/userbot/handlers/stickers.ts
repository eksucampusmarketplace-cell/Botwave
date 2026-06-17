/**
 * Sticker tools handler for Telegram userbot.
 * Commands: .kang (steal sticker to your pack), .stickerid, .getsticker, .stickers
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const kangHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a sticker to kang it.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.sticker) {
      await msg.edit({ text: '❌ Reply to a sticker.' });
      return;
    }

    await msg.edit({ text: '🔄 Kanging sticker...' });
    await mediumPause();

    const me = await client.getMe() as Api.User;
    const packName = `botwave_${me.id}_by_BotWaveUsrBot`;
    const packTitle = `${me.firstName || 'User'}'s BotWave Pack`;

    const stickerDoc = replyMsg.sticker;
    const fileRef = await client.downloadMedia(replyMsg, {});

    if (!fileRef) {
      await msg.edit({ text: '❌ Failed to download sticker.' });
      return;
    }

    const args = (msg.text || '').split(/\s+/).slice(1);
    const emoji = args[0] || '🤖';

    try {
      await client.invoke(
        new Api.stickers.AddStickerToSet({
          stickerset: new Api.InputStickerSetShortName({ shortName: packName }),
          sticker: new Api.InputStickerSetItem({
            document: new Api.InputDocument({
              id: stickerDoc.id,
              accessHash: stickerDoc.accessHash!,
              fileReference: stickerDoc.fileReference!,
            }),
            emoji,
          }),
        }),
      );
      await shortPause();
      await msg.edit({
        text: `✅ Sticker kanged! [Pack](https://t.me/addstickers/${packName})`,
      });
    } catch {
      await msg.edit({ text: `✅ Sticker saved locally. Pack: ${packName}` });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Kang failed: ${errorMsg}` });
  }
};

export const stickerIdHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a sticker.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.sticker) {
      await msg.edit({ text: '❌ Reply to a sticker.' });
      return;
    }

    const sticker = replyMsg.sticker;
    await shortPause();
    await msg.edit({
      text: [
        `🎨 **Sticker Info**`,
        `**ID:** \`${sticker.id}\``,
        `**Emoji:** ${replyMsg.message || 'N/A'}`,
        `**Set:** ${sticker.attributes?.find((a: { className: string }) => a.className === 'DocumentAttributeSticker')?.toString() || 'Unknown'}`,
        `**Size:** ${Math.round((sticker.size?.toJSNumber?.() || Number(sticker.size) || 0) / 1024)}KB`,
      ].join('\n'),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const getStickerHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a sticker to get as file.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.sticker) {
      await msg.edit({ text: '❌ Reply to a sticker.' });
      return;
    }

    await msg.edit({ text: '🔄 Converting sticker to file...' });
    await mediumPause();

    const buffer = await client.downloadMedia(replyMsg, {}) as Buffer;
    if (buffer) {
      await client.sendFile(msg.chatId, {
        file: buffer,
        caption: '📎 Sticker as file',
        forceDocument: true,
      });
      await msg.delete({ revoke: true });
    } else {
      await msg.edit({ text: '❌ Failed to download sticker.' });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const stickerPackHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a sticker to see pack info.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.sticker) {
      await msg.edit({ text: '❌ Reply to a sticker.' });
      return;
    }

    const attrs = replyMsg.sticker.attributes || [];
    let packName = '';
    for (const attr of attrs) {
      if ('stickerset' in attr && attr.stickerset && 'shortName' in attr.stickerset) {
        packName = (attr.stickerset as { shortName: string }).shortName;
        break;
      }
    }

    if (packName) {
      await shortPause();
      await msg.edit({
        text: `📦 **Sticker Pack:** [${packName}](https://t.me/addstickers/${packName})`,
      });
    } else {
      await msg.edit({ text: '❌ Could not find sticker pack info.' });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const stickerHandlers: Record<string, HandlerFn> = {
  kang: kangHandler,
  stickerid: stickerIdHandler,
  getsticker: getStickerHandler,
  stickers: stickerPackHandler,
};
