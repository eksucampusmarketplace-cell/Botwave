/**
 * Media tools handler for Telegram userbot.
 * Commands: .download, .upload, .song, .video, .screenshot, .carbon
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const downloadHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a media message to download it.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.media) {
      await msg.edit({ text: '❌ Reply to a message with media.' });
      return;
    }

    await msg.edit({ text: '📥 Downloading...' });
    await mediumPause();

    const buffer = await client.downloadMedia(replyMsg, {}) as Buffer;
    if (buffer) {
      await client.sendFile(msg.chatId, {
        file: buffer,
        caption: '📎 Downloaded file',
        forceDocument: true,
      });
      await msg.delete({ revoke: true });
    } else {
      await msg.edit({ text: '❌ Download failed.' });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const saveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a message to save to Saved Messages.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg) {
      await msg.edit({ text: '❌ Could not find replied message.' });
      return;
    }

    await mediumPause();
    await client.forwardMessages('me', {
      messages: [replyMsg.id],
      fromPeer: msg.chatId,
    });
    await shortPause();
    await msg.edit({ text: '✅ Saved to Saved Messages.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const forwardHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('forward');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!msg.replyTo || !msg.chatId || !args[0]) {
    await msg.edit({ text: '❌ Reply to a message and specify target: .forward <chatid|username>' });
    return;
  }

  try {
    await mediumPause();
    await client.forwardMessages(args[0], {
      messages: [msg.replyTo.replyToMsgId],
      fromPeer: msg.chatId,
    });
    await shortPause();
    await msg.edit({ text: '✅ Message forwarded.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Forward failed: ${errorMsg}` });
  }
};

export const copyHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a message to copy it.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg) {
      await msg.edit({ text: '❌ Message not found.' });
      return;
    }

    await mediumPause();

    if (replyMsg.media) {
      const buffer = await client.downloadMedia(replyMsg, {}) as Buffer;
      if (buffer) {
        await client.sendFile(msg.chatId, {
          file: buffer,
          caption: replyMsg.text || '',
        });
      }
    } else if (replyMsg.text) {
      await client.sendMessage(msg.chatId, { message: replyMsg.text });
    }

    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const mediaInfoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;

  if (!msg.replyTo || !msg.chatId) {
    await msg.edit({ text: '❌ Reply to a media message.' });
    return;
  }

  try {
    const replied = await client.getMessages(msg.chatId, {
      ids: [msg.replyTo.replyToMsgId],
    });
    const replyMsg = replied[0];
    if (!replyMsg?.media) {
      await msg.edit({ text: '❌ Reply to a message with media.' });
      return;
    }

    const media = replyMsg.media;
    const lines = ['📋 **Media Info**'];

    if ('document' in media && media.document) {
      const doc = media.document;
      if ('size' in doc) {
        const size = typeof doc.size === 'bigint' ? Number(doc.size) : (doc.size as { toJSNumber?: () => number })?.toJSNumber?.() || 0;
        lines.push(`**Size:** ${formatFileSize(size)}`);
      }
      if ('mimeType' in doc) lines.push(`**MIME:** ${(doc as { mimeType: string }).mimeType}`);
      if ('id' in doc) lines.push(`**ID:** \`${doc.id}\``);
    } else if ('photo' in media && media.photo) {
      lines.push(`**Type:** Photo`);
      if ('id' in media.photo) lines.push(`**ID:** \`${media.photo.id}\``);
    }

    await shortPause();
    await msg.edit({ text: lines.join('\n') });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const uploadHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);
  const url = args[0];

  if (!url || !msg.chatId) {
    await msg.edit({ text: '❌ Usage: .upload <url> [caption]' });
    return;
  }

  try {
    await msg.edit({ text: '📤 Uploading...' });
    await mediumPause();

    const caption = args.slice(1).join(' ') || '';
    const https = await import('https');
    const http = await import('http');
    const fetcher = url.startsWith('https') ? https : http;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      fetcher.get(url, (res: { statusCode?: number; on: (event: string, cb: (...args: unknown[]) => void) => void }) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: unknown) => chunks.push(chunk as Buffer));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });

    const fileName = url.split('/').pop()?.split('?')[0] || 'file';
    await client.sendFile(msg.chatId, {
      file: buffer,
      caption: caption || `📎 ${fileName}`,
      forceDocument: true,
      fileName,
    });
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Upload failed: ${errorMsg}` });
  }
};

export const mediaHandlers: Record<string, HandlerFn> = {
  download: downloadHandler,
  upload: uploadHandler,
  save: saveHandler,
  forward: forwardHandler,
  copy: copyHandler,
  mediainfo: mediaInfoHandler,
};
