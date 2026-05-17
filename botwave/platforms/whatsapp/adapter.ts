/**
 * WhatsApp Platform Adapter
 * 
 * Wraps existing Baileys/Evolution API calls into the PlatformAdapter interface.
 * This allows existing WhatsApp functionality to work through the unified platform layer.
 */

import type { PlatformAdapter, PlatformMessage, PlatformUser, SendOptions } from '../types';

export class WhatsAppAdapter implements PlatformAdapter {
  readonly platform = 'whatsapp' as const;
  readonly sessionId: string;

  private sock: any;
  private connected = false;

  constructor(sessionId: string, sock: any) {
    this.sessionId = sessionId;
    this.sock = sock;
    this.connected = true;
  }

  updateSock(sock: any): void {
    this.sock = sock;
  }

  async sendText(chatId: string, text: string, options?: SendOptions): Promise<void> {
    try {
      const content: any = { text };
      if (options?.replyToMessageId) {
        content.quoted = { key: { id: options.replyToMessageId } };
      }
      await this.sock.sendMessage(chatId, content);
    } catch (err) {
      console.error(`[WA:${this.sessionId}] sendText failed:`, err);
    }
  }

  async sendMedia(
    chatId: string,
    media: Buffer,
    type: 'photo' | 'video' | 'audio' | 'sticker' | 'document',
    caption?: string,
    options?: SendOptions,
  ): Promise<void> {
    try {
      const content: any = {};
      switch (type) {
        case 'photo':
          content.image = media;
          if (caption) content.caption = caption;
          break;
        case 'video':
          content.video = media;
          if (caption) content.caption = caption;
          break;
        case 'audio':
          content.audio = media;
          content.mimetype = 'audio/mp4';
          break;
        case 'sticker':
          content.sticker = media;
          break;
        case 'document':
          content.document = media;
          if (caption) content.caption = caption;
          content.mimetype = 'application/octet-stream';
          break;
      }
      await this.sock.sendMessage(chatId, content);
    } catch (err) {
      console.error(`[WA:${this.sessionId}] sendMedia(${type}) failed:`, err);
    }
  }

  async sendSticker(chatId: string, sticker: Buffer, _options?: SendOptions): Promise<void> {
    await this.sendMedia(chatId, sticker, 'sticker');
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.sock.sendMessage(chatId, {
        delete: { remoteJid: chatId, id: messageId, fromMe: false },
      });
      return true;
    } catch (err) {
      console.error(`[WA:${this.sessionId}] deleteMessage failed:`, err);
      return false;
    }
  }

  async banUser(_chatId: string, _userId: string): Promise<boolean> {
    // WhatsApp doesn't have a direct ban API via Baileys
    return false;
  }

  async unbanUser(_chatId: string, _userId: string): Promise<boolean> {
    return false;
  }

  async muteUser(_chatId: string, _userId: string, _untilDate?: number): Promise<boolean> {
    return false;
  }

  async unmuteUser(_chatId: string, _userId: string): Promise<boolean> {
    return false;
  }

  async kickUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.sock.groupParticipantsUpdate(chatId, [userId], 'remove');
      return true;
    } catch (err) {
      console.error(`[WA:${this.sessionId}] kickUser failed:`, err);
      return false;
    }
  }

  async pinMessage(_chatId: string, _messageId: string): Promise<boolean> {
    return false;
  }

  async unpinMessage(_chatId: string, _messageId: string): Promise<boolean> {
    return false;
  }

  async getChatMember(_chatId: string, _userId: string): Promise<{ status: string; user: PlatformUser } | null> {
    return null;
  }

  async getChatAdmins(chatId: string): Promise<PlatformUser[]> {
    try {
      const metadata = await this.sock.groupMetadata(chatId);
      return metadata.participants
        .filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin')
        .map((p: any) => ({
          id: p.id,
          displayName: p.id.split('@')[0],
        }));
    } catch {
      return [];
    }
  }

  async start(): Promise<void> {
    this.connected = true;
  }

  async stop(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
