import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, downloadMedia, getQuotedMessage, getImageFromContext, getHelpHint, pickResponse, axios, delay } from './helpers';
import { downloadReplies } from '../utils/responsePools';
import { getBase64FromMediaMessage } from '../evolutionClient';
import { currentTimeStr, currentDateStr } from '../utils/antiban';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import sharp from 'sharp';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, access } from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

async function findYtDlp(): Promise<string> {
  // Check common locations for yt-dlp binary
  for (const p of ['/tmp/yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp']) {
    try {
      await access(p);
      return p;
    } catch { /* not found, try next */ }
  }
  return 'yt-dlp'; // fall back to PATH lookup
}

function normalizeJid(jid: string): string {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@').trim();
}

async function createSticker(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  try {
    const args = context.message.replace(/^!sticker\s*/i, '').trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase() || '';

    // Determine media message — direct image/video or quoted
    const quotedMsg = getQuotedMessage(context.rawMessage);
    const hasImage = !!(context.rawMessage.message?.imageMessage || quotedMsg?.imageMessage);
    const hasVideo = !!(context.rawMessage.message?.videoMessage || quotedMsg?.videoMessage);
    const hasStickerMedia = !!(context.rawMessage.message?.stickerMessage || quotedMsg?.stickerMessage);

    // Parse sticker type from args
    let stickerType: StickerTypes = StickerTypes.FULL;
    let packName = 'BotWave';
    let authorName = context.pushName || 'User';

    if (['crop', 'cropped'].includes(subcommand)) stickerType = StickerTypes.CROPPED;
    else if (['circle', 'round'].includes(subcommand)) stickerType = StickerTypes.CIRCLE;
    else if (['rounded'].includes(subcommand)) stickerType = StickerTypes.ROUNDED;
    else if (['full'].includes(subcommand)) stickerType = StickerTypes.FULL;
    else if (subcommand === 'pack' && args.length > 1) {
      packName = args.slice(1).join(' ');
    }

    // No media provided — show usage
    if (!hasImage && !hasVideo && !hasStickerMedia) {
      await sendReply(
        context.chatJid,
        `*STICKER MAKER*\n\nSend or reply to an image/video/GIF with:\n\n` +
        `*!sticker* — Full sticker (default)\n` +
        `*!sticker crop* — Cropped to square\n` +
        `*!sticker circle* — Circular crop\n` +
        `*!sticker rounded* — Rounded corners\n` +
        `*!sticker pack [name]* — Set pack name\n\n` +
        `_Supports: images, short videos, GIFs_`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    // Use the quoted message if replying, otherwise the direct message
    const mediaMessage = quotedMsg
      ? { ...context.rawMessage, message: quotedMsg }
      : context.rawMessage;

    const mediaBuffer = await downloadMedia(mediaMessage, sock);
    if (!mediaBuffer) {
      await sendReply(context.chatJid, 'Could not download the media. Please try sending the image again.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Use wa-sticker-formatter for proper sticker creation with metadata
    const sticker = new Sticker(mediaBuffer, {
      pack: packName,
      author: authorName,
      type: stickerType,
      quality: 70,
    });

    const stickerBuffer = await sticker.toBuffer();

    await sendReply(context.chatJid, { sticker: stickerBuffer }, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[STICKER] Error creating sticker:', error);
    await sendReply(context.chatJid, 'Error creating sticker. Make sure the image/video is valid and try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleDownload(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, getHelpHint('download'), sock, context.rawMessage.key, context.queue);
    return;
  }

  const url = args[0];
  if (!url.startsWith('http')) {
    await sendReply(context.chatJid, 'Please provide a valid URL starting with http:// or https://', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    await sendReply(context.chatJid, 'Fetching media... this may take a moment.', sock, context.rawMessage.key, context.queue);

    // Try yt-dlp binary first (supports 1000+ sites)
    let downloaded = false;
    try {
      const tmpFile = path.join(os.tmpdir(), `botwave_dl_${Date.now()}`);
      const ytdlpBin = await findYtDlp();
      await execFileAsync(ytdlpBin, [
        '-f', 'best[ext=mp4][filesize<50M]/best[ext=mp4]/best[filesize<50M]/best',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--max-filesize', '50M',
        '-o', tmpFile + '.%(ext)s',
        '--no-warnings',
        url,
      ], { timeout: 90000 });

      // Find the output file
      const { stdout: files } = await execFileAsync('sh', ['-c', `ls ${tmpFile}.* 2>/dev/null | head -1`]);
      const outFile = files.trim();
      if (outFile) {
        const { readFile } = await import('fs/promises');
        const buffer = await readFile(outFile);
        const ext = path.extname(outFile).toLowerCase();
        if (['.mp4', '.webm', '.mkv', '.mov'].includes(ext)) {
          await sendReply(context.chatJid, { video: buffer, mimetype: 'video/mp4', caption: 'Downloaded via BotWave' }, sock, context.rawMessage.key, context.queue);
        } else if (['.mp3', '.m4a', '.ogg', '.opus', '.wav'].includes(ext)) {
          await sendReply(context.chatJid, { audio: buffer, mimetype: 'audio/mpeg' }, sock, context.rawMessage.key, context.queue);
        } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          await sendReply(context.chatJid, { image: buffer, caption: 'Downloaded via BotWave' }, sock, context.rawMessage.key, context.queue);
        } else {
          await sendReply(context.chatJid, { document: buffer, mimetype: 'application/octet-stream', fileName: `download${ext}` }, sock, context.rawMessage.key, context.queue);
        }
        await unlink(outFile).catch(() => {});
        downloaded = true;
      }
    } catch (dlErr: any) {
      console.error('[DOWNLOAD] yt-dlp failed:', dlErr?.message || dlErr);
    }

    if (!downloaded) {
      // Fallback: direct HTTP download (works for direct media links only)
      const mediaResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const buffer = Buffer.from(mediaResponse.data);
      const contentType = String(mediaResponse.headers['content-type'] || '');

      // Reject HTML/text responses — these are web pages, not actual media
      if (contentType.includes('text/html') || contentType.includes('text/plain') || contentType.includes('application/json')) {
        await sendReply(context.chatJid, 'Download failed. This URL requires yt-dlp which is not available. Try a direct media link instead, or install yt-dlp on the server.', sock, context.rawMessage.key, context.queue);
        return;
      }

      if (contentType.includes('video')) {
        await sendReply(context.chatJid, { video: buffer, mimetype: contentType || 'video/mp4', caption: 'Downloaded via BotWave' }, sock, context.rawMessage.key, context.queue);
      } else if (contentType.includes('audio')) {
        await sendReply(context.chatJid, { audio: buffer, mimetype: contentType || 'audio/mpeg' }, sock, context.rawMessage.key, context.queue);
      } else if (contentType.includes('image')) {
        await sendReply(context.chatJid, { image: buffer, caption: 'Downloaded via BotWave' }, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, { document: buffer, mimetype: contentType, fileName: 'download' }, sock, context.rawMessage.key, context.queue);
      }
    }
  } catch (error: any) {
    console.error('[DOWNLOAD] Error:', error?.message || error);
    await sendReply(context.chatJid, 'Download failed. The URL may not be supported or the service is temporarily unavailable. Try again later.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleSave(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);

  if (!quotedMsg) {
    await sendReply(
      context.chatJid,
      `*SAVE MESSAGE*\n\nReply to any message with *!save* to forward it to your private chat (like Saved Messages).\n\nWorks with: text, images, videos, documents, stickers, audio.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    // Get the bot owner's JID (to send to self) — normalize to strip device suffix
    const rawOwnerJid = (sock as any).user?.id;
    const ownerJid = rawOwnerJid ? normalizeJid(rawOwnerJid) : '';
    if (!ownerJid) {
      await sendReply(context.chatJid, 'Could not determine your account. Try again after reconnecting.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Build the forwarded message with a "Saved from" header
    const chatName = context.isGroup ? context.chatJid.split('@')[0] : context.senderJid.split('@')[0];
    const savedHeader = `_Saved from ${chatName} at ${currentTimeStr()} ${currentDateStr()}_\n\n`;

    // Try to forward the quoted message content
    if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      await sock.sendMessage(ownerJid, { text: savedHeader + text });
    } else if (quotedMsg.imageMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: savedHeader + (quotedMsg.imageMessage.caption || ''),
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Image — could not download]' });
      }
    } else if (quotedMsg.videoMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: savedHeader + (quotedMsg.videoMessage.caption || ''),
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Video — could not download]' });
      }
    } else if (quotedMsg.audioMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: quotedMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus',
          ptt: quotedMsg.audioMessage.ptt || false,
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Audio — could not download]' });
      }
    } else if (quotedMsg.documentMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          document: buffer,
          mimetype: quotedMsg.documentMessage.mimetype || 'application/octet-stream',
          fileName: quotedMsg.documentMessage.fileName || 'saved_file',
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Document — could not download]' });
      }
    } else if (quotedMsg.stickerMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, { sticker: buffer });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Sticker — could not download]' });
      }
    } else {
      // Unknown message type — send notification
      await sock.sendMessage(ownerJid, { text: savedHeader + '[Message type not supported for save]' });
    }

    await sendReply(context.chatJid, 'Saved to your private chat!', sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[SAVE] Error:', error);
    await sendReply(context.chatJid, 'Failed to save message. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleSaveStatus(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);

  if (!quotedMsg) {
    await sendReply(
      context.chatJid,
      `*SAVE STATUS*\n\nReply to someone's status with *!savestatus* to save the media and send it to their chat.\n\nYou can add a custom caption:\n*!savestatus Nice pic!*\n\nAliases: !ss, !savest`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const customCaption = args.length > 0 ? args.join(' ') : '';

  try {
    // Determine target: the status poster's JID (from contextInfo.participant or rawMessage.key.participant)
    const msg = context.rawMessage?.message || context.rawMessage;
    const contextInfo = context.rawMessage?.contextInfo
      || msg?.extendedTextMessage?.contextInfo
      || msg?.imageMessage?.contextInfo
      || msg?.videoMessage?.contextInfo;
    const statusPosterJid = contextInfo?.participant
      || context.rawMessage?.key?.participant
      || context.senderJid;

    // Use the status poster's chat as the target
    const targetJid = statusPosterJid.endsWith('@s.whatsapp.net')
      ? statusPosterJid
      : context.senderJid;

    // Restore binary fields that were serialised as indexed-objects during webhook roundtrip
    const restoredQuoted = restoreBufferFields(quotedMsg) as Record<string, any>;

    if (restoredQuoted.conversation || restoredQuoted.extendedTextMessage?.text) {
      const text = customCaption || restoredQuoted.conversation || restoredQuoted.extendedTextMessage?.text || '';
      await sock.sendMessage(targetJid, { text });
    } else if (restoredQuoted.imageMessage) {
      let mediaBuffer = await downloadMedia({ ...context.rawMessage, message: restoredQuoted }, sock);
      // Evolution API REST fallback
      if (!mediaBuffer && context.sessionId) {
        mediaBuffer = await getBase64FromMediaMessage(context.sessionId, { ...context.rawMessage, message: restoredQuoted });
      }
      if (!mediaBuffer) { await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue); return; }
      const caption = customCaption || restoredQuoted.imageMessage.caption || '';
      await sock.sendMessage(targetJid, { image: mediaBuffer, caption: caption || undefined });
    } else if (restoredQuoted.videoMessage) {
      let mediaBuffer = await downloadMedia({ ...context.rawMessage, message: restoredQuoted }, sock);
      if (!mediaBuffer && context.sessionId) {
        mediaBuffer = await getBase64FromMediaMessage(context.sessionId, { ...context.rawMessage, message: restoredQuoted });
      }
      if (!mediaBuffer) { await sendReply(context.chatJid, 'Could not download the video.', sock, context.rawMessage.key, context.queue); return; }
      const caption = customCaption || restoredQuoted.videoMessage.caption || '';
      await sock.sendMessage(targetJid, { video: mediaBuffer, caption: caption || undefined });
    } else if (restoredQuoted.audioMessage) {
      let mediaBuffer = await downloadMedia({ ...context.rawMessage, message: restoredQuoted }, sock);
      if (!mediaBuffer && context.sessionId) {
        mediaBuffer = await getBase64FromMediaMessage(context.sessionId, { ...context.rawMessage, message: restoredQuoted });
      }
      if (!mediaBuffer) { await sendReply(context.chatJid, 'Could not download the audio.', sock, context.rawMessage.key, context.queue); return; }
      await sock.sendMessage(targetJid, { audio: mediaBuffer, mimetype: 'audio/mpeg' });
    } else {
      await sendReply(context.chatJid, 'This message type is not supported. Only text, images, videos, and audio can be saved.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Use display name if available, fall back to formatted phone number
    let displayName = targetJid.replace('@s.whatsapp.net', '');
    try {
      const contact = await sock.onWhatsApp(targetJid);
      if (contact?.[0]?.exists) {
        // Try to get contact name from store or use the poster's pushName
        const statusPosterPush = contextInfo?.pushName || context.pushName;
        if (statusPosterPush && statusPosterPush !== 'User') {
          displayName = statusPosterPush;
        }
      }
    } catch { /* non-critical, use phone number fallback */ }
    await sendReply(context.chatJid, `Saved and sent to *${displayName}*!`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[SAVESTATUS] Error:', error);
    await sendReply(context.chatJid, 'Failed to save status. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleTTS(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, getHelpHint('tts'), sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const text = args.join(' ').slice(0, 500);
    // Use Google Translate TTS (free, no key)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
    const response = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      ptt: true,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[TTS] Error:', error);
    await sendReply(context.chatJid, 'TTS failed. Try shorter text or try again later.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleQR(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, getHelpHint('qr'), sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const text = args.join(' ');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
    const response = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: `QR code for: ${text}` }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[QR] Error:', error);
    await sendReply(context.chatJid, 'Failed to generate QR code. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleImg(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*AI IMAGE*\n\n!img [description]\n\nExample: !img a cat wearing sunglasses', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const prompt = args.join(' ');
    await sendReply(context.chatJid, `Generating image for: "${prompt}"...\nThis may take 10-30 seconds.`, sock, context.rawMessage.key, context.queue);

    // Use Pollinations AI (free, no key)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
    const buffer = Buffer.from(response.data);

    await sock.sendMessage(context.chatJid, {
      image: buffer,
      caption: `*AI Generated:* ${prompt}`,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[IMG] Error:', error);
    await sendReply(context.chatJid, 'Image generation failed. Try a simpler description or try again later.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleShorten(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*URL SHORTENER*\n\n!short [url]\n\nExample: !short https://google.com', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const url = args[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      await sendReply(context.chatJid, 'Please provide a valid URL starting with http:// or https://', sock, context.rawMessage.key, context.queue);
      return;
    }
    // Use is.gd free URL shortener (no key needed)
    const response = await axios.get(
      `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`,
      { timeout: 10000 },
    );
    if (response.data?.shorturl) {
      await sendReply(context.chatJid, `*SHORTENED URL*\n\n${response.data.shorturl}\n\nOriginal: ${url}`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Could not shorten that URL. Make sure it\'s valid.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[SHORT] Error:', error);
    await sendReply(context.chatJid, 'URL shortening failed. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

function restoreBufferFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) return obj;
  if (Array.isArray(obj)) return obj.map(restoreBufferFields);

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);

  // Detect indexed-object pattern (all numeric keys) — convert to Uint8Array
  if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
    const values = keys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => Number(record[k]));
    return new Uint8Array(values);
  }

  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = restoreBufferFields(record[key]);
  }
  return out;
}

async function handleViewOnce(context: MessageContext, sock: any, args: string[] = []): Promise<void> {
  const isPrivate = args[0]?.toLowerCase() === 'pr';

  const quotedMsg = getQuotedMessage(context.rawMessage);
  const viewOnce = quotedMsg?.viewOnceMessage?.message
    || quotedMsg?.viewOnceMessageV2?.message
    || (quotedMsg as any)?.viewOnceMessageV2Extension?.message
    || null;

  // Also check the top-level message for viewOnce wrapper
  const rawMsg = context.rawMessage?.message as Record<string, any> | undefined;
  const topViewOnce = rawMsg?.viewOnceMessage?.message
    || rawMsg?.viewOnceMessageV2?.message
    || null;

  let inner = viewOnce || topViewOnce;

  // Fallback: Evolution API / recent WhatsApp protocol versions may strip the
  // viewOnce wrapper in quoted messages, leaving just the inner media type
  // (imageMessage, videoMessage, audioMessage) directly in the quotedMessage.
  if (!inner && quotedMsg) {
    if (quotedMsg.imageMessage || quotedMsg.videoMessage || quotedMsg.audioMessage) {
      inner = quotedMsg;
    }
  }

  // Also check the top-level raw message for direct media without wrapper
  if (!inner && rawMsg) {
    if (rawMsg.imageMessage || rawMsg.videoMessage || rawMsg.audioMessage) {
      inner = rawMsg;
    }
  }

  if (!inner) {
    await sendReply(
      context.chatJid,
      '*VIEW ONCE*\n\nReply to a view-once message with:\n• *!viewonce* — resend as normal message in this chat\n• *!viewonce pr* — save to your private chat silently',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // For !viewonce pr, resolve the owner's private JID
  let targetJid = context.chatJid;
  if (isPrivate) {
    const rawOwnerJid = (sock as any).user?.id;
    const ownerJid = rawOwnerJid ? normalizeJid(rawOwnerJid) : '';
    if (!ownerJid) {
      await sendReply(context.chatJid, 'Could not determine your account. Try again after reconnecting.', sock, context.rawMessage.key, context.queue);
      return;
    }
    targetJid = ownerJid;
  }

  try {
    // Restore binary fields (mediaKey, fileEncSha256, etc.) that the JSON
    // webhook roundtrip converted from Uint8Array to indexed-objects.
    const restored = restoreBufferFields(inner) as Record<string, any>;
    const fakeMsg = { ...context.rawMessage, message: restored };
    let buffer = await downloadMedia(fakeMsg, sock);

    // Fallback: use Evolution API REST endpoint to download media.
    // This is more reliable because Evolution API uses the active Baileys
    // client connection to decrypt and fetch media from WhatsApp CDN.
    if (!buffer && context.sessionId) {
      buffer = await getBase64FromMediaMessage(context.sessionId, fakeMsg);
    }

    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the view-once media.', sock, context.rawMessage.key, context.queue);
      return;
    }

    if (isPrivate) {
      const chatName = context.isGroup ? context.chatJid.split('@')[0] : context.senderJid.split('@')[0];
      const senderName = context.pushName || context.senderJid.split('@')[0];
      const header = `_View-once from ${senderName} in ${chatName}_`;

      if (restored.imageMessage) {
        const origCaption = restored.imageMessage.caption || '';
        const caption = origCaption ? `${header}\n\n${origCaption}` : header;
        await sock.sendMessage(targetJid, { image: buffer, caption });
      } else if (restored.videoMessage) {
        const origCaption = restored.videoMessage.caption || '';
        const caption = origCaption ? `${header}\n\n${origCaption}` : header;
        await sock.sendMessage(targetJid, { video: buffer, caption });
      } else if (restored.audioMessage) {
        await sock.sendMessage(targetJid, { text: header });
        await sock.sendMessage(targetJid, { audio: buffer, mimetype: 'audio/mpeg', ptt: true });
      } else {
        await sendReply(context.chatJid, 'Unsupported view-once media type.', sock, context.rawMessage.key, context.queue);
        return;
      }
      await sock.sendMessage(targetJid, { text: '_View-once saved from ' + (context.isGroup ? context.chatJid.split('@')[0] : context.senderJid.split('@')[0]) + '._' });
    } else {
      if (restored.imageMessage) {
        const origCaption = restored.imageMessage.caption || '';
        const caption = origCaption ? `${origCaption}\n\n_View-once saved_` : '_View-once saved_';
        await sock.sendMessage(targetJid, { image: buffer, caption }, { quoted: context.rawMessage });
      } else if (restored.videoMessage) {
        const origCaption = restored.videoMessage.caption || '';
        const caption = origCaption ? `${origCaption}\n\n_View-once saved_` : '_View-once saved_';
        await sock.sendMessage(targetJid, { video: buffer, caption }, { quoted: context.rawMessage });
      } else if (restored.audioMessage) {
        await sock.sendMessage(targetJid, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: context.rawMessage });
      } else {
        await sendReply(context.chatJid, 'Unsupported view-once media type.', sock, context.rawMessage.key, context.queue);
        return;
      }
    }
  } catch (error) {
    console.error('[VIEWONCE] Error:', error);
    await sendReply(context.chatJid, 'Failed to save view-once media.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleToImg(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasStickerQuoted = quotedMsg?.stickerMessage;
  const hasStickerDirect = (context.rawMessage?.message as any)?.stickerMessage;

  if (!hasStickerQuoted && !hasStickerDirect) {
    await sendReply(context.chatJid, '*STICKER TO IMAGE*\n\nReply to a sticker with *!toimg* to convert it back to an image.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = hasStickerQuoted
      ? { ...context.rawMessage, message: quotedMsg }
      : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the sticker.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const pngBuffer = await sharp(buffer).png().toBuffer();
    await sock.sendMessage(context.chatJid, { image: pngBuffer, caption: 'Sticker converted to image' }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[TOIMG] Error:', error);
    await sendReply(context.chatJid, 'Failed to convert sticker to image.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleToGif(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasStickerQuoted = quotedMsg?.stickerMessage;
  const hasVideoQuoted = quotedMsg?.videoMessage;

  if (!hasStickerQuoted && !hasVideoQuoted) {
    await sendReply(context.chatJid, '*TO GIF*\n\nReply to an animated sticker or video with *!togif* to convert it.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = { ...context.rawMessage, message: quotedMsg };
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the media.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const tmpIn = path.join(os.tmpdir(), `botwave_togif_${Date.now()}.webp`);
    const tmpOut = path.join(os.tmpdir(), `botwave_togif_${Date.now()}.mp4`);
    await writeFile(tmpIn, buffer);

    await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', tmpOut], { timeout: 30000 });
    const { readFile } = await import('fs/promises');
    const gifBuffer = await readFile(tmpOut);

    await sock.sendMessage(context.chatJid, { video: gifBuffer, gifPlayback: true, caption: 'Converted to GIF' }, { quoted: context.rawMessage });
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  } catch (error) {
    console.error('[TOGIF] Error:', error);
    await sendReply(context.chatJid, 'Failed to convert to GIF. ffmpeg may not be available.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleToAudio(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasVideo = quotedMsg?.videoMessage;

  if (!hasVideo) {
    await sendReply(context.chatJid, '*TO AUDIO*\n\nReply to a video with *!toaudio* to extract its audio as MP3.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = { ...context.rawMessage, message: quotedMsg };
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the video.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const tmpIn = path.join(os.tmpdir(), `botwave_toaud_${Date.now()}.mp4`);
    const tmpOut = path.join(os.tmpdir(), `botwave_toaud_${Date.now()}.mp3`);
    await writeFile(tmpIn, buffer);

    await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-vn', '-ab', '128k', '-ar', '44100', '-f', 'mp3', tmpOut], { timeout: 30000 });
    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(tmpOut);

    await sock.sendMessage(context.chatJid, { audio: audioBuffer, mimetype: 'audio/mpeg' }, { quoted: context.rawMessage });
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  } catch (error) {
    console.error('[TOAUDIO] Error:', error);
    await sendReply(context.chatJid, 'Failed to extract audio. ffmpeg may not be available.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleRemoveBg(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasImage = quotedMsg?.imageMessage || (context.rawMessage?.message as any)?.imageMessage;

  if (!hasImage) {
    await sendReply(context.chatJid, '*REMOVE BACKGROUND*\n\nReply to an image with *!removebg* to remove its background.\nWorks best with solid-colored backgrounds.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = quotedMsg?.imageMessage ? { ...context.rawMessage, message: quotedMsg } : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sendReply(context.chatJid, 'Removing background... this may take a moment.', sock, context.rawMessage.key, context.queue);

    // Use sharp to do edge-based background removal:
    // 1. Get image metadata and raw pixels
    const image = sharp(buffer);
    const { width, height, channels } = await image.metadata();
    if (!width || !height) throw new Error('Invalid image dimensions');

    const raw = await image.ensureAlpha().raw().toBuffer();
    const ch = 4; // RGBA

    // 2. Sample border pixels to determine background color
    const borderPixels: number[][] = [];
    for (let x = 0; x < width; x++) {
      borderPixels.push(getPixel(raw, x, 0, width, ch));
      borderPixels.push(getPixel(raw, x, height - 1, width, ch));
    }
    for (let y = 0; y < height; y++) {
      borderPixels.push(getPixel(raw, 0, y, width, ch));
      borderPixels.push(getPixel(raw, width - 1, y, width, ch));
    }

    // Average background color
    const bgR = Math.round(borderPixels.reduce((s, p) => s + p[0], 0) / borderPixels.length);
    const bgG = Math.round(borderPixels.reduce((s, p) => s + p[1], 0) / borderPixels.length);
    const bgB = Math.round(borderPixels.reduce((s, p) => s + p[2], 0) / borderPixels.length);

    // 3. Replace similar pixels with transparent
    const tolerance = 50;
    const output = Buffer.from(raw);
    for (let i = 0; i < output.length; i += ch) {
      const dr = Math.abs(output[i] - bgR);
      const dg = Math.abs(output[i + 1] - bgG);
      const db = Math.abs(output[i + 2] - bgB);
      if (dr + dg + db < tolerance * 3) {
        const diff = (dr + dg + db) / (tolerance * 3);
        output[i + 3] = Math.round(diff * 255); // fade alpha
      }
    }

    const resultBuffer = await sharp(output, { raw: { width, height, channels: 4 } }).png().toBuffer();
    await sock.sendMessage(context.chatJid, { image: resultBuffer, caption: 'Background removed (best with solid backgrounds)' }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[REMOVEBG] Error:', error);
    await sendReply(context.chatJid, 'Failed to remove background.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleOCR(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasImage = quotedMsg?.imageMessage || (context.rawMessage?.message as any)?.imageMessage;

  if (!hasImage) {
    await sendReply(context.chatJid, '*OCR — TEXT EXTRACTION*\n\nReply to an image with *!ocr* to extract text from it.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = quotedMsg?.imageMessage ? { ...context.rawMessage, message: quotedMsg } : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sendReply(context.chatJid, 'Extracting text... this may take a moment.', sock, context.rawMessage.key, context.queue);

    const Tesseract = await import('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {});

    const cleanText = text.trim();
    if (!cleanText) {
      await sendReply(context.chatJid, 'No text found in the image.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const truncated = cleanText.length > 4000 ? cleanText.slice(0, 4000) + '\n\n... (truncated)' : cleanText;
    await sendReply(context.chatJid, `*EXTRACTED TEXT*\n\n${truncated}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[OCR] Error:', error);
    await sendReply(context.chatJid, 'Failed to extract text from image.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleWallpaper(context: MessageContext, args: string[], sock: any): Promise<void> {
  try {
    const seed = Date.now();
    let url: string;
    if (args.length > 0) {
      const query = args.join('+');
      url = `https://source.unsplash.com/1920x1080/?${query}&sig=${seed}`;
    } else {
      url = `https://picsum.photos/1920/1080?random=${seed}`;
    }
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: 'Random HD Wallpaper' }, { quoted: context.rawMessage });
  } catch {
    await sendReply(context.chatJid, 'Failed to fetch wallpaper.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleQRRead(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasImage = quotedMsg?.imageMessage || (context.rawMessage?.message as any)?.imageMessage;
  if (!hasImage) {
    await sendReply(context.chatJid, '*QR CODE READER*\n\nReply to an image containing a QR code with *!qrread* to scan it.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const msgForDownload = quotedMsg?.imageMessage ? { ...context.rawMessage, message: quotedMsg } : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue);
      return;
    }
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    if (code) {
      await sendReply(context.chatJid, `*QR CODE CONTENT*\n\n${code.data}`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'No QR code found in the image.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[QRREAD] Error:', error);
    await sendReply(context.chatJid, 'Failed to scan QR code.', sock, context.rawMessage.key, context.queue);
  }
}

function getPixel(buf: Buffer, x: number, y: number, width: number, channels: number): number[] {
  const idx = (y * width + x) * channels;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

async function handleBlur(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*BLUR*\n\nReply to an image with !blur [amount 1-100]', sock, context.rawMessage.key, context.queue); return; }
  try {
    const amount = Math.min(Math.max(parseInt(args[0]) || 5, 1), 100);
    const result = await sharp(buffer).blur(amount).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: `Blur: ${amount}` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to blur image.', sock, context.rawMessage.key, context.queue); }
}

async function handleGrayscale(context: MessageContext, sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*GRAYSCALE*\n\nReply to an image with !grayscale', sock, context.rawMessage.key, context.queue); return; }
  try {
    const result = await sharp(buffer).grayscale().toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: 'Grayscale' }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to convert image.', sock, context.rawMessage.key, context.queue); }
}

async function handleRotate(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*ROTATE*\n\nReply to an image with !rotate [degrees]', sock, context.rawMessage.key, context.queue); return; }
  try {
    const degrees = parseInt(args[0]) || 90;
    const result = await sharp(buffer).rotate(degrees).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: `Rotated ${degrees}°` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to rotate image.', sock, context.rawMessage.key, context.queue); }
}

async function handleResize(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*RESIZE*\n\nReply to an image with !resize [width] [height]', sock, context.rawMessage.key, context.queue); return; }
  try {
    const width = parseInt(args[0]) || 500;
    const height = parseInt(args[1]) || undefined;
    const result = await sharp(buffer).resize(Math.min(width, 4096), height ? Math.min(height, 4096) : undefined).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: `Resized to ${width}${height ? 'x'+height : ''}` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to resize image.', sock, context.rawMessage.key, context.queue); }
}

async function handleInvert(context: MessageContext, sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*INVERT*\n\nReply to an image with !invert', sock, context.rawMessage.key, context.queue); return; }
  try {
    const result = await sharp(buffer).negate({ alpha: false }).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: 'Inverted colors' }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to invert image.', sock, context.rawMessage.key, context.queue); }
}

async function handleBrightness(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*BRIGHTNESS*\n\nReply to an image with !brightness [0.1-3.0]\nDefault: 1.0, higher = brighter', sock, context.rawMessage.key, context.queue); return; }
  try {
    const factor = Math.min(Math.max(parseFloat(args[0]) || 1.5, 0.1), 3.0);
    const result = await sharp(buffer).modulate({ brightness: factor }).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: `Brightness: ${factor}x` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to adjust brightness.', sock, context.rawMessage.key, context.queue); }
}

async function handleContrast(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*CONTRAST*\n\nReply to an image with !contrast [0.1-3.0]\nDefault: 1.0, higher = more contrast', sock, context.rawMessage.key, context.queue); return; }
  try {
    const factor = Math.min(Math.max(parseFloat(args[0]) || 1.5, 0.1), 3.0);
    const result = await sharp(buffer).linear(factor, -(128 * factor) + 128).toBuffer();
    await sock.sendMessage(context.chatJid, { image: result, caption: `Contrast: ${factor}x` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to adjust contrast.', sock, context.rawMessage.key, context.queue); }
}

async function handleCrop(context: MessageContext, args: string[], sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*CROP*\n\nReply to an image with !crop [x] [y] [width] [height]\nor !crop center (square crop from center)', sock, context.rawMessage.key, context.queue); return; }
  try {
    if (args[0] === 'center' || !args.length) {
      const meta = await sharp(buffer).metadata();
      const size = Math.min(meta.width || 500, meta.height || 500);
      const left = Math.floor(((meta.width || 500) - size) / 2);
      const top = Math.floor(((meta.height || 500) - size) / 2);
      const result = await sharp(buffer).extract({ left, top, width: size, height: size }).toBuffer();
      await sock.sendMessage(context.chatJid, { image: result, caption: 'Center cropped' }, { quoted: context.rawMessage });
    } else {
      const left = parseInt(args[0]) || 0;
      const top = parseInt(args[1]) || 0;
      const width = parseInt(args[2]) || 200;
      const height = parseInt(args[3]) || 200;
      const result = await sharp(buffer).extract({ left, top, width, height }).toBuffer();
      await sock.sendMessage(context.chatJid, { image: result, caption: `Cropped: ${left},${top} ${width}x${height}` }, { quoted: context.rawMessage });
    }
  } catch { await sendReply(context.chatJid, 'Failed to crop image. Check dimensions.', sock, context.rawMessage.key, context.queue); }
}

async function handleCompress(context: MessageContext, sock: any): Promise<void> {
  const buffer = await getImageFromContext(context, sock);
  if (!buffer) { await sendReply(context.chatJid, '*COMPRESS*\n\nReply to an image with !compress', sock, context.rawMessage.key, context.queue); return; }
  try {
    const original = buffer.length;
    const result = await sharp(buffer).jpeg({ quality: 60 }).toBuffer();
    const compressed = result.length;
    const saved = Math.round((1 - compressed / original) * 100);
    await sock.sendMessage(context.chatJid, { image: result, caption: `Compressed: ${(original/1024).toFixed(0)}KB → ${(compressed/1024).toFixed(0)}KB (${saved}% smaller)` }, { quoted: context.rawMessage });
  } catch { await sendReply(context.chatJid, 'Failed to compress image.', sock, context.rawMessage.key, context.queue); }
}

// ─── Register Media Commands ────────────────────────────────────────────────

registerCommand({ name: 'sticker', aliases: ['sticker', 's', 'stick'], category: 'media', description: 'Create sticker from image', execute: (ctx, _a, sock, vars) => createSticker(ctx, sock, vars) });
registerCommand({ name: 'download', aliases: ['download', 'yt', 'tiktok'], category: 'media', description: 'Download media', execute: (ctx, args, sock) => handleDownload(ctx, args, sock) });
registerCommand({ name: 'save', aliases: ['save', 'sv'], category: 'media', description: 'Save media', execute: (ctx, _a, sock) => handleSave(ctx, sock) });
registerCommand({ name: 'savestatus', aliases: ['savestatus', 'savest'], category: 'media', description: 'Save WhatsApp status', execute: (ctx, args, sock) => handleSaveStatus(ctx, args, sock) });
registerCommand({ name: 'tts', aliases: ['tts', 'speak', 'say'], category: 'media', description: 'Text to speech', execute: (ctx, args, sock) => handleTTS(ctx, args, sock) });
registerCommand({ name: 'qr', aliases: ['qr', 'qrcode'], category: 'media', description: 'Generate QR code', execute: (ctx, args, sock) => handleQR(ctx, args, sock) });
registerCommand({ name: 'img', aliases: ['img', 'imagine', 'image', 'draw', 'generate'], category: 'media', description: 'Generate AI image', execute: (ctx, args, sock) => handleImg(ctx, args, sock) });
registerCommand({ name: 'short', aliases: ['short', 'shorten'], category: 'media', description: 'Shorten URL', execute: (ctx, args, sock) => handleShorten(ctx, args, sock) });
registerCommand({ name: 'viewonce', aliases: ['viewonce', 'vo'], category: 'media', description: 'View once-only media', execute: (ctx, args, sock) => handleViewOnce(ctx, sock, args) });
registerCommand({ name: 'toimg', aliases: ['toimg', 'toimage', 'stickertoimg'], category: 'media', description: 'Convert sticker to image', execute: (ctx, _a, sock) => handleToImg(ctx, sock) });
registerCommand({ name: 'togif', aliases: ['togif', 'stickertogif'], category: 'media', description: 'Convert sticker to GIF', execute: (ctx, _a, sock) => handleToGif(ctx, sock) });
registerCommand({ name: 'toaudio', aliases: ['toaudio', 'tomp3', 'mp3'], category: 'media', description: 'Convert to audio', execute: (ctx, _a, sock) => handleToAudio(ctx, sock) });
registerCommand({ name: 'removebg', aliases: ['removebg', 'rbg'], category: 'media', description: 'Remove image background', execute: (ctx, _a, sock) => handleRemoveBg(ctx, sock) });
registerCommand({ name: 'ocr', aliases: ['ocr', 'readtext'], category: 'media', description: 'Extract text from image', execute: (ctx, _a, sock) => handleOCR(ctx, sock) });
registerCommand({ name: 'wallpaper', aliases: ['wallpaper', 'wp'], category: 'media', description: 'Random HD wallpaper', execute: (ctx, args, sock) => handleWallpaper(ctx, args, sock) });
registerCommand({ name: 'qrread', aliases: ['qrread', 'scanqr'], category: 'media', description: 'Read QR code', execute: (ctx, _a, sock) => handleQRRead(ctx, sock) });
registerCommand({ name: 'blur', aliases: ['blur'], category: 'media', description: 'Blur an image', execute: (ctx, args, sock) => handleBlur(ctx, args, sock) });
registerCommand({ name: 'grayscale', aliases: ['grayscale', 'greyscale', 'bw'], category: 'media', description: 'Grayscale an image', execute: (ctx, _a, sock) => handleGrayscale(ctx, sock) });
registerCommand({ name: 'rotate', aliases: ['rotate'], category: 'media', description: 'Rotate an image', execute: (ctx, args, sock) => handleRotate(ctx, args, sock) });
registerCommand({ name: 'resize', aliases: ['resize'], category: 'media', description: 'Resize an image', execute: (ctx, args, sock) => handleResize(ctx, args, sock) });
registerCommand({ name: 'invert', aliases: ['invert', 'negative'], category: 'media', description: 'Invert image colors', execute: (ctx, _a, sock) => handleInvert(ctx, sock) });
registerCommand({ name: 'brightness', aliases: ['brightness'], category: 'media', description: 'Adjust image brightness', execute: (ctx, args, sock) => handleBrightness(ctx, args, sock) });
registerCommand({ name: 'contrast', aliases: ['contrast'], category: 'media', description: 'Adjust image contrast', execute: (ctx, args, sock) => handleContrast(ctx, args, sock) });
registerCommand({ name: 'crop', aliases: ['crop'], category: 'media', description: 'Crop an image', execute: (ctx, args, sock) => handleCrop(ctx, args, sock) });
registerCommand({ name: 'compress', aliases: ['compress'], category: 'media', description: 'Compress an image', execute: (ctx, _a, sock) => handleCompress(ctx, sock) });
