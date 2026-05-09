// bot/evolutionSocket.ts
// Baileys-compatible socket adapter that routes calls through Evolution API.
// This allows MessageHandler.ts, antiban.ts, and MessageQueue.ts to work
// unchanged — they call sock.sendMessage(), sock.readMessages(), etc. and
// the calls are transparently forwarded to Evolution API REST endpoints.

import {
  sendText,
  sendMedia,
  sendStatus,
  sendSticker,
  sendAudio,
  markAsRead,
  sendPresence,
  fetchGroupInfo,
  updateProfileStatus,
  updateProfilePicture,
  fetchProfilePictureUrl,
  fetchProfile,
  checkOnWhatsApp,
  updateMessage,
  deleteForEveryone,
} from './evolutionClient';

export class EvolutionSocketAdapter {
  public sessionId: string;
  public userId: string;
  private instanceName: string;
  // Mimics Baileys sock.user — used by MessageQueue to check connection
  public user: { id: string } | null = null;

  constructor(instanceName: string, sessionId: string, userId: string, phoneNumber?: string) {
    this.instanceName = instanceName;
    this.sessionId = sessionId;
    this.userId = userId;
    // Set user.id to the real phone JID when available so that the owner
    // check in MessageHandler (normalizeJid comparison) works correctly in
    // group chats where fromMe may be false. Falls back to instanceName
    // for backward compatibility.
    const cleanPhone = phoneNumber?.replace(/\D/g, '');
    this.user = { id: cleanPhone ? `${cleanPhone}@s.whatsapp.net` : `${instanceName}@s.whatsapp.net` };
  }

  /**
   * Baileys-compatible sendMessage.
   * Handles text, sticker, document, image content types.
   */
  async sendMessage(jid: string, content: Record<string, unknown>, _options?: Record<string, unknown>) {
    // Status broadcast — route through the dedicated sendStatus endpoint
    if (jid === 'status@broadcast') {
      return this.sendStatusMessage(content, _options);
    }

    // Edit an existing message
    if (content.edit && content.text && typeof content.text === 'string') {
      const key = content.edit as { remoteJid: string; fromMe: boolean; id: string };
      return updateMessage(this.instanceName, key, content.text);
    }

    // Delete a message for everyone
    if (content.delete) {
      const key = content.delete as { remoteJid: string; fromMe: boolean; id: string; participant?: string };
      return deleteForEveryone(this.instanceName, key);
    }

    // React to a message
    if (content.react) {
      // Reactions are not yet supported via Evolution REST — skip silently
      return null;
    }

    const to = jid.replace(/@s\.whatsapp\.net$|@g\.us$/g, '');

    // Text message
    if (content.text && typeof content.text === 'string') {
      const mentioned = Array.isArray(content.mentions) ? content.mentions as string[] : undefined;
      return sendText(this.instanceName, to, content.text, mentioned);
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
      const caption = (content.caption as string) || '';
      return sendMedia(
        this.instanceName, to,
        `data:${mimetype};base64,${base64}`,
        mimetype, 'document', fileName, caption,
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

    // Audio — use dedicated WhatsApp audio endpoint for proper opus encoding
    if (content.audio) {
      let base64: string;
      if (Buffer.isBuffer(content.audio)) {
        base64 = (content.audio as Buffer).toString('base64');
      } else {
        base64 = String(content.audio);
      }
      return sendAudio(this.instanceName, to, base64);
    }

    // Fallback: try as text if there's a caption
    if (content.caption && typeof content.caption === 'string') {
      return sendText(this.instanceName, to, content.caption);
    }

    console.warn(`[EVO-SOCK] Unsupported content type for ${jid}:`, Object.keys(content));
    return null;
  }

  /**
   * Route status broadcast messages through Evolution API's sendStatus endpoint.
   * The sendStatus endpoint expects { type, content, caption?, statusJidList?, allContacts? }
   * instead of the regular sendMedia payload.
   */
  private async sendStatusMessage(content: Record<string, unknown>, options?: Record<string, unknown>) {
    const statusJidList = (options?.statusJidList as string[]) || [];
    const caption = (content.caption as string) || '';

    // Text status
    if (content.text && typeof content.text === 'string') {
      return sendStatus(this.instanceName, 'text', content.text, {
        statusJidList,
        backgroundColor: (content.backgroundColor as string) || '#000000',
        font: (content.font as number) ?? 0,
      });
    }

    // Image status
    if (content.image) {
      let base64: string;
      if (Buffer.isBuffer(content.image)) {
        base64 = (content.image as Buffer).toString('base64');
      } else if (typeof content.image === 'object' && 'url' in (content.image as Record<string, unknown>)) {
        base64 = (content.image as Record<string, string>).url;
      } else {
        base64 = String(content.image);
      }
      return sendStatus(this.instanceName, 'image', base64, { caption, statusJidList });
    }

    // Video status
    if (content.video) {
      let base64: string;
      if (Buffer.isBuffer(content.video)) {
        base64 = (content.video as Buffer).toString('base64');
      } else {
        base64 = String(content.video);
      }
      return sendStatus(this.instanceName, 'video', base64, { caption, statusJidList });
    }

    // Audio status
    if (content.audio) {
      let base64: string;
      if (Buffer.isBuffer(content.audio)) {
        base64 = (content.audio as Buffer).toString('base64');
      } else {
        base64 = String(content.audio);
      }
      return sendStatus(this.instanceName, 'audio', base64, { statusJidList });
    }

    console.warn('[EVO-SOCK] Unsupported status content type:', Object.keys(content));
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
   * Evolution API's sendPresence requires a target phone number.
   * Global presence updates (no JID) are not supported via REST — skip them.
   */
  async sendPresenceUpdate(type: string, jid?: string) {
    if (!jid) return;
    return sendPresence(this.instanceName, jid, type);
  }

  /**
   * Baileys-compatible groupMetadata.
   * Fetches group info + participants from Evolution API.
   */
  async groupMetadata(jid: string) {
    const data = await fetchGroupInfo(this.instanceName, jid) as Record<string, any> | null;
    if (!data) {
      return { subject: 'Unknown', participants: [], desc: '', creation: 0 };
    }
    return {
      subject: data.subject || data.name || 'Unknown',
      participants: data.participants || [],
      desc: data.desc || data.description || '',
      creation: data.creation || 0,
    };
  }

  /**
   * Download media from an incoming message.
   * Evolution API webhook messages include a `url` field inside the
   * media-specific message object (imageMessage, videoMessage, etc.).
   */
  async downloadMediaMessage(_msg: unknown, _type: string): Promise<Buffer | null> {
    const msg = _msg as Record<string, unknown>;
    const message = msg?.message as Record<string, unknown> | undefined;
    if (!message) return null;

    // Check all media message types for a URL
    const mediaKeys = [
      'imageMessage',
      'videoMessage',
      'audioMessage',
      'documentMessage',
      'documentWithCaptionMessage',
      'stickerMessage',
    ];

    let mediaUrl: string | undefined;
    for (const key of mediaKeys) {
      const mediaMsg = message[key] as Record<string, unknown> | undefined;
      if (mediaMsg?.url && typeof mediaMsg.url === 'string') {
        mediaUrl = mediaMsg.url;
        break;
      }
      // documentWithCaptionMessage nests further
      if (key === 'documentWithCaptionMessage' && mediaMsg) {
        const inner = (mediaMsg as any)?.message?.documentMessage;
        if (inner?.url && typeof inner.url === 'string') {
          mediaUrl = inner.url;
          break;
        }
      }
    }

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

  /** Update the WhatsApp profile bio / about text. */
  async updateProfileStatus(status: string) {
    return updateProfileStatus(this.instanceName, status);
  }

  /** Update the WhatsApp profile picture from a base64-encoded image. */
  async updateProfilePicture(pictureBase64: string) {
    return updateProfilePicture(this.instanceName, pictureBase64);
  }

  /** Fetch profile picture URL for a JID/number. */
  async fetchProfilePictureUrl(jid: string) {
    try {
      const result = await fetchProfilePictureUrl(this.instanceName, jid) as Record<string, string> | null;
      return result?.profilePictureUrl || result?.profilePicUrl || result?.url || null;
    } catch {
      return null;
    }
  }

  /** Fetch full profile (name, about, picture) for a JID/number. */
  async fetchProfile(jid: string) {
    try {
      return await fetchProfile(this.instanceName, jid);
    } catch {
      return null;
    }
  }

  /** Check if numbers are on WhatsApp. */
  async onWhatsApp(numbers: string[]) {
    try {
      return await checkOnWhatsApp(this.instanceName, numbers);
    } catch {
      return [];
    }
  }
}
