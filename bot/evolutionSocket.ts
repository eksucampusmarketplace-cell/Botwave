// bot/evolutionSocket.ts
// Baileys-compatible socket adapter that routes calls through Evolution API.
// This allows MessageHandler.ts, antiban.ts, and MessageQueue.ts to work
// unchanged — they call sock.sendMessage(), sock.readMessages(), etc. and
// the calls are transparently forwarded to Evolution API REST endpoints.

import {
  sendText,
  sendMedia,
  sendSticker,
  markAsRead,
  sendPresence,
} from './evolutionClient';

export class EvolutionSocketAdapter {
  public sessionId: string;
  public userId: string;
  private instanceName: string;
  // Mimics Baileys sock.user — used by MessageQueue to check connection
  public user: { id: string } | null = null;

  constructor(instanceName: string, sessionId: string, userId: string) {
    this.instanceName = instanceName;
    this.sessionId = sessionId;
    this.userId = userId;
    // Set user to signal "connected" — MessageQueue checks sock.user
    this.user = { id: `${instanceName}@s.whatsapp.net` };
  }

  /**
   * Baileys-compatible sendMessage.
   * Handles text, sticker, document, image content types.
   */
  async sendMessage(jid: string, content: Record<string, unknown>, _options?: Record<string, unknown>) {
    const to = jid.replace(/@s\.whatsapp\.net$|@g\.us$/g, '');

    // Text message
    if (content.text && typeof content.text === 'string') {
      return sendText(this.instanceName, jid, content.text);
    }

    // Sticker
    if (content.sticker && Buffer.isBuffer(content.sticker)) {
      const base64 = (content.sticker as Buffer).toString('base64');
      return sendSticker(this.instanceName, to, `data:image/webp;base64,${base64}`);
    }

    // Document (e.g. .docx files)
    if (content.document && Buffer.isBuffer(content.document)) {
      const base64 = (content.document as Buffer).toString('base64');
      const mimetype = (content.mimetype as string) || 'application/octet-stream';
      const fileName = (content.fileName as string) || 'document';
      return sendMedia(
        this.instanceName, to,
        `data:${mimetype};base64,${base64}`,
        mimetype, 'document', fileName,
      );
    }

    // Image
    if (content.image) {
      let base64: string;
      if (Buffer.isBuffer(content.image)) {
        const mimetype = (content.mimetype as string) || 'image/jpeg';
        base64 = `data:${mimetype};base64,${(content.image as Buffer).toString('base64')}`;
      } else if (typeof content.image === 'object' && 'url' in (content.image as Record<string, unknown>)) {
        base64 = (content.image as Record<string, string>).url;
      } else {
        base64 = String(content.image);
      }
      const mimetype = (content.mimetype as string) || 'image/jpeg';
      const caption = (content.caption as string) || '';
      return sendMedia(this.instanceName, to, base64, mimetype, 'image', 'image.jpg', caption);
    }

    // Video
    if (content.video) {
      let base64: string;
      if (Buffer.isBuffer(content.video)) {
        const mimetype = (content.mimetype as string) || 'video/mp4';
        base64 = `data:${mimetype};base64,${(content.video as Buffer).toString('base64')}`;
      } else {
        base64 = String(content.video);
      }
      const mimetype = (content.mimetype as string) || 'video/mp4';
      return sendMedia(this.instanceName, to, base64, mimetype, 'video', 'video.mp4');
    }

    // Audio
    if (content.audio) {
      let base64: string;
      if (Buffer.isBuffer(content.audio)) {
        const mimetype = (content.mimetype as string) || 'audio/ogg; codecs=opus';
        base64 = `data:${mimetype};base64,${(content.audio as Buffer).toString('base64')}`;
      } else {
        base64 = String(content.audio);
      }
      const mimetype = (content.mimetype as string) || 'audio/ogg; codecs=opus';
      return sendMedia(this.instanceName, to, base64, mimetype, 'document', 'audio.ogg');
    }

    // Fallback: try as text if there's a caption
    if (content.caption && typeof content.caption === 'string') {
      return sendText(this.instanceName, jid, content.caption);
    }

    console.warn(`[EVO-SOCK] Unsupported content type for ${jid}:`, Object.keys(content));
    return null;
  }

  /**
   * Baileys-compatible readMessages.
   */
  async readMessages(keys: Array<{ remoteJid?: string; fromMe?: boolean; id?: string }>) {
    const validKeys = keys
      .filter(k => k.remoteJid && k.id)
      .map(k => ({
        remoteJid: k.remoteJid!,
        fromMe: k.fromMe ?? false,
        id: k.id!,
      }));
    if (validKeys.length > 0) {
      return markAsRead(this.instanceName, validKeys);
    }
  }

  /**
   * Baileys-compatible sendPresenceUpdate.
   */
  async sendPresenceUpdate(type: string, jid?: string) {
    return sendPresence(this.instanceName, jid || '', type);
  }

  /**
   * Stub for downloadMediaMessage — Evolution API handles media differently.
   * For incoming media from webhooks, the media URL is provided directly.
   * Returns null; callers should handle gracefully.
   */
  async downloadMediaMessage(_msg: unknown, _type: string): Promise<Buffer | null> {
    // Evolution API webhook messages include mediaUrl for media content.
    // The actual download is handled in the webhook route.
    const msg = _msg as Record<string, unknown>;
    const message = msg?.message as Record<string, unknown> | undefined;
    const imageMsg = message?.imageMessage as Record<string, unknown> | undefined;
    const mediaUrl = imageMsg?.url as string | undefined;

    if (mediaUrl) {
      try {
        const res = await fetch(mediaUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          return Buffer.from(arrayBuf);
        }
      } catch (err) {
        console.error('[EVO-SOCK] Failed to download media:', err);
      }
    }
    return null;
  }
}
