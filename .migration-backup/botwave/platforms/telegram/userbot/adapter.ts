/**
 * Telegram Userbot Adapter
 * 
 * Implements PlatformAdapter using GramJS (telegram) for MTProto userbot functionality.
 * Supports session string persistence, auto-reconnect, and strict rate limiting.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import type { PlatformAdapter, PlatformMessage, PlatformUser, SendOptions, TelegramUserbotConfig } from '../../../core/types';

export class TelegramUserbotAdapter implements PlatformAdapter {
  readonly platform = 'telegram_userbot' as const;
  readonly sessionId: string;

  private client: TelegramClient;
  private connected = false;
  private config: TelegramUserbotConfig;
  private lastMessageTime = 0;
  private lastJoinTime = 0;
  private messageHandler?: (msg: PlatformMessage) => Promise<void>;

  constructor(
    sessionId: string,
    apiId: number,
    apiHash: string,
    sessionString: string,
    config: TelegramUserbotConfig,
  ) {
    this.sessionId = sessionId;
    this.config = config;
    const session = new StringSession(sessionString);
    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
    });
  }

  getClient(): TelegramClient {
    return this.client;
  }

  getSessionString(): string {
    return (this.client.session as StringSession).save();
  }

  onMessage(handler: (msg: PlatformMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  updateConfig(config: Partial<TelegramUserbotConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async enforceRateLimit(type: 'message' | 'join'): Promise<void> {
    const now = Date.now();
    if (type === 'message') {
      const elapsed = now - this.lastMessageTime;
      const interval = this.config.rateLimitMsgIntervalMs || 2000;
      if (elapsed < interval) {
        await new Promise(resolve => setTimeout(resolve, interval - elapsed));
      }
      this.lastMessageTime = Date.now();
    } else if (type === 'join') {
      const elapsed = now - this.lastJoinTime;
      const interval = this.config.rateLimitJoinIntervalMs || 300000;
      if (elapsed < interval) {
        await new Promise(resolve => setTimeout(resolve, interval - elapsed));
      }
      this.lastJoinTime = Date.now();
    }
  }

  private telegramUserToPlatform(user: Api.User): PlatformUser {
    return {
      id: String(user.id),
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      displayName: user.lastName
        ? `${user.firstName || ''} ${user.lastName}`.trim()
        : user.firstName || 'Unknown',
      isBot: user.bot,
    };
  }

  // ─── PlatformAdapter Implementation ─────────────────────────────────────────

  async sendText(chatId: string, text: string, options?: SendOptions): Promise<void> {
    await this.enforceRateLimit('message');
    try {
      await this.client.sendMessage(chatId, {
        message: text,
        replyTo: options?.replyToMessageId ? Number(options.replyToMessageId) : undefined,
        parseMode: options?.parseMode === 'HTML' ? 'html' : undefined,
        linkPreview: options?.disableWebPagePreview ? false : undefined,
      });
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] sendText failed:`, err);
    }
  }

  async sendMedia(
    chatId: string,
    media: Buffer,
    type: 'photo' | 'video' | 'audio' | 'sticker' | 'document',
    caption?: string,
    options?: SendOptions,
  ): Promise<void> {
    await this.enforceRateLimit('message');
    try {
      const forceDocument = type === 'document';
      await this.client.sendFile(chatId, {
        file: media,
        caption,
        forceDocument,
        replyTo: options?.replyToMessageId ? Number(options.replyToMessageId) : undefined,
      });
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] sendMedia(${type}) failed:`, err);
    }
  }

  async sendSticker(chatId: string, sticker: Buffer, options?: SendOptions): Promise<void> {
    await this.sendMedia(chatId, sticker, 'sticker', undefined, options);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.client.deleteMessages(chatId, [Number(messageId)], { revoke: true });
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] deleteMessage failed:`, err);
      return false;
    }
  }

  async banUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.client.invoke(
        new Api.channels.EditBanned({
          channel: chatId,
          participant: userId,
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
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] banUser failed:`, err);
      return false;
    }
  }

  async unbanUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.client.invoke(
        new Api.channels.EditBanned({
          channel: chatId,
          participant: userId,
          bannedRights: new Api.ChatBannedRights({
            untilDate: 0,
          }),
        }),
      );
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] unbanUser failed:`, err);
      return false;
    }
  }

  async muteUser(chatId: string, userId: string, untilDate?: number): Promise<boolean> {
    try {
      await this.client.invoke(
        new Api.channels.EditBanned({
          channel: chatId,
          participant: userId,
          bannedRights: new Api.ChatBannedRights({
            untilDate: untilDate || 0,
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
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] muteUser failed:`, err);
      return false;
    }
  }

  async unmuteUser(chatId: string, userId: string): Promise<boolean> {
    return this.unbanUser(chatId, userId);
  }

  async kickUser(chatId: string, userId: string): Promise<boolean> {
    const banned = await this.banUser(chatId, userId);
    if (banned) {
      // Immediately unban so user can rejoin
      await this.unbanUser(chatId, userId);
    }
    return banned;
  }

  async pinMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.client.pinMessage(chatId, Number(messageId));
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] pinMessage failed:`, err);
      return false;
    }
  }

  async unpinMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.client.unpinMessage(chatId, Number(messageId));
      return true;
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] unpinMessage failed:`, err);
      return false;
    }
  }

  async getChatMember(_chatId: string, _userId: string): Promise<{ status: string; user: PlatformUser } | null> {
    // GramJS doesn't have a simple getChatMember equivalent
    return null;
  }

  async getChatAdmins(_chatId: string): Promise<PlatformUser[]> {
    return [];
  }

  async start(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;

      // Set up message handler
      this.client.addEventHandler(async (event: any) => {
        if (!this.messageHandler) return;
        if (!event.message) return;

        const msg = event.message;
        const text = msg.text || '';
        const isCommand = text.startsWith('/') || text.startsWith('!');
        let commandName: string | undefined;
        let commandArgs: string[] | undefined;

        if (isCommand) {
          const prefix = text[0];
          const parts = text.slice(1).split(/\s+/);
          commandName = parts[0].toLowerCase();
          commandArgs = parts.slice(1);
        }

        const platformMsg: PlatformMessage = {
          id: String(msg.id),
          platform: 'telegram_userbot',
          sessionId: this.sessionId,
          chatId: String(msg.chatId || msg.peerId),
          sender: {
            id: String(msg.senderId || ''),
            displayName: 'User',
          },
          chat: {
            id: String(msg.chatId || msg.peerId),
            type: msg.isGroup ? 'group' : 'private',
          },
          text,
          isCommand,
          commandName,
          commandArgs,
          isGroup: !!msg.isGroup,
          isOwner: true,
          timestamp: msg.date * 1000,
          rawMessage: msg,
        };

        await this.messageHandler(platformMsg);
      });

      console.log(`[TG-UB:${this.sessionId}] Adapter started and connected`);
    } catch (err) {
      console.error(`[TG-UB:${this.sessionId}] Failed to start:`, err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.connected = false;
    try {
      await this.client.disconnect();
    } catch {
      // Best effort
    }
    console.log(`[TG-UB:${this.sessionId}] Adapter stopped`);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
