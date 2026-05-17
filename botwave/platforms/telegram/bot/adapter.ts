/**
 * Telegram Bot Adapter
 * 
 * Implements PlatformAdapter using grammy for Telegram Bot API.
 * Supports webhook mode for receiving updates and Bot API for sending.
 */

import { Bot, webhookCallback, Context, GrammyError, HttpError } from 'grammy';
import type { PlatformAdapter, PlatformMessage, PlatformUser, SendOptions, TelegramBotConfig } from '../../../core/types';
import { InputFile } from 'grammy';

export class TelegramBotAdapter implements PlatformAdapter {
  readonly platform = 'telegram_bot' as const;
  readonly sessionId: string;

  private bot: Bot;
  private connected = false;
  private config: TelegramBotConfig;
  private messageHandler?: (msg: PlatformMessage) => Promise<void>;
  private memberJoinHandler?: (chatId: string, users: PlatformUser[], inviter?: PlatformUser) => Promise<void>;
  private memberLeaveHandler?: (chatId: string, user: PlatformUser) => Promise<void>;

  constructor(
    sessionId: string,
    botToken: string,
    config: TelegramBotConfig,
  ) {
    this.sessionId = sessionId;
    this.config = config;
    this.bot = new Bot(botToken);
    this.setupHandlers();
  }

  onMessage(handler: (msg: PlatformMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  onMemberJoin(handler: (chatId: string, users: PlatformUser[], inviter?: PlatformUser) => Promise<void>): void {
    this.memberJoinHandler = handler;
  }

  onMemberLeave(handler: (chatId: string, user: PlatformUser) => Promise<void>): void {
    this.memberLeaveHandler = handler;
  }

  getBot(): Bot {
    return this.bot;
  }

  getWebhookCallback() {
    return webhookCallback(this.bot, 'express');
  }

  updateConfig(config: Partial<TelegramBotConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private setupHandlers(): void {
    this.bot.on('message:text', async (ctx) => {
      if (!this.messageHandler) return;
      const msg = this.contextToPlatformMessage(ctx);
      if (msg) {
        await this.messageHandler(msg);
      }
    });

    this.bot.on('message:photo', async (ctx) => {
      if (!this.messageHandler) return;
      const msg = this.contextToPlatformMessage(ctx, 'photo');
      if (msg) await this.messageHandler(msg);
    });

    this.bot.on('message:video', async (ctx) => {
      if (!this.messageHandler) return;
      const msg = this.contextToPlatformMessage(ctx, 'video');
      if (msg) await this.messageHandler(msg);
    });

    this.bot.on('message:sticker', async (ctx) => {
      if (!this.messageHandler) return;
      const msg = this.contextToPlatformMessage(ctx, 'sticker');
      if (msg) await this.messageHandler(msg);
    });

    this.bot.on('message:document', async (ctx) => {
      if (!this.messageHandler) return;
      const msg = this.contextToPlatformMessage(ctx, 'document');
      if (msg) await this.messageHandler(msg);
    });

    // New member joined
    this.bot.on('chat_member', async (ctx) => {
      const update = ctx.chatMember;
      if (!update) return;

      const newStatus = update.new_chat_member.status;
      const oldStatus = update.old_chat_member.status;
      const chatId = String(update.chat.id);
      const user = this.telegramUserToPlatform(update.new_chat_member.user);
      const inviter = update.from ? this.telegramUserToPlatform(update.from) : undefined;

      if (
        (oldStatus === 'left' || oldStatus === 'kicked') &&
        (newStatus === 'member' || newStatus === 'administrator')
      ) {
        if (this.memberJoinHandler) {
          await this.memberJoinHandler(chatId, [user], inviter);
        }
      } else if (
        (oldStatus === 'member' || oldStatus === 'administrator') &&
        (newStatus === 'left' || newStatus === 'kicked')
      ) {
        if (this.memberLeaveHandler) {
          await this.memberLeaveHandler(chatId, user);
        }
      }
    });

    this.bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`[TG-BOT:${this.sessionId}] Error handling update ${ctx.update.update_id}:`);
      const e = err.error;
      if (e instanceof GrammyError) {
        console.error(`[TG-BOT:${this.sessionId}] Grammy error:`, e.description);
      } else if (e instanceof HttpError) {
        console.error(`[TG-BOT:${this.sessionId}] HTTP error:`, e);
      } else {
        console.error(`[TG-BOT:${this.sessionId}] Unknown error:`, e);
      }
    });
  }

  private telegramUserToPlatform(user: { id: number; first_name: string; last_name?: string; username?: string; is_bot?: boolean }): PlatformUser {
    return {
      id: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name,
      isBot: user.is_bot,
    };
  }

  private contextToPlatformMessage(
    ctx: Context,
    mediaType?: PlatformMessage['mediaType'],
  ): PlatformMessage | null {
    const msg = ctx.message;
    if (!msg) return null;

    const text = msg.text || msg.caption || '';
    const commandPrefix = '/';
    const isCommand = text.startsWith(commandPrefix);
    let commandName: string | undefined;
    let commandArgs: string[] | undefined;

    if (isCommand) {
      const parts = text.slice(1).split(/\s+/);
      commandName = parts[0].split('@')[0].toLowerCase();
      commandArgs = parts.slice(1);
    }

    const sender = this.telegramUserToPlatform(msg.from!);
    const chatType = msg.chat.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';

    return {
      id: String(msg.message_id),
      platform: 'telegram_bot',
      sessionId: this.sessionId,
      chatId: String(msg.chat.id),
      sender,
      chat: {
        id: String(msg.chat.id),
        type: chatType === 'private' ? 'private' : chatType === 'channel' ? 'channel' : chatType === 'supergroup' ? 'supergroup' : 'group',
        title: 'title' in msg.chat ? msg.chat.title : undefined,
      },
      text,
      caption: msg.caption,
      isCommand,
      commandName,
      commandArgs,
      isGroup,
      isOwner: false,
      timestamp: msg.date * 1000,
      replyToMessageId: msg.reply_to_message ? String(msg.reply_to_message.message_id) : undefined,
      mediaType,
      rawMessage: msg,
    };
  }

  // ─── PlatformAdapter Implementation ─────────────────────────────────────────

  async sendText(chatId: string, text: string, options?: SendOptions): Promise<void> {
    try {
      await this.bot.api.sendMessage(Number(chatId), text, {
        parse_mode: options?.parseMode,
        reply_parameters: options?.replyToMessageId
          ? { message_id: Number(options.replyToMessageId) }
          : undefined,
        link_preview_options: options?.disableWebPagePreview
          ? { is_disabled: true }
          : undefined,
      });
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] sendText failed:`, err);
    }
  }

  async sendMedia(
    chatId: string,
    media: Buffer,
    type: 'photo' | 'video' | 'audio' | 'sticker' | 'document',
    caption?: string,
    options?: SendOptions,
  ): Promise<void> {
    const numericChatId = Number(chatId);
    const file = new InputFile(media);
    const replyParams = options?.replyToMessageId
      ? { message_id: Number(options.replyToMessageId) }
      : undefined;

    try {
      switch (type) {
        case 'photo':
          await this.bot.api.sendPhoto(numericChatId, file, {
            caption,
            reply_parameters: replyParams,
          });
          break;
        case 'video':
          await this.bot.api.sendVideo(numericChatId, file, {
            caption,
            reply_parameters: replyParams,
          });
          break;
        case 'audio':
          await this.bot.api.sendAudio(numericChatId, file, {
            caption,
            reply_parameters: replyParams,
          });
          break;
        case 'sticker':
          await this.bot.api.sendSticker(numericChatId, file, {
            reply_parameters: replyParams,
          });
          break;
        case 'document':
          await this.bot.api.sendDocument(numericChatId, file, {
            caption,
            reply_parameters: replyParams,
          });
          break;
      }
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] sendMedia(${type}) failed:`, err);
    }
  }

  async sendSticker(chatId: string, sticker: Buffer, options?: SendOptions): Promise<void> {
    await this.sendMedia(chatId, sticker, 'sticker', undefined, options);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.bot.api.deleteMessage(Number(chatId), Number(messageId));
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] deleteMessage failed:`, err);
      return false;
    }
  }

  async banUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.bot.api.banChatMember(Number(chatId), Number(userId));
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] banUser failed:`, err);
      return false;
    }
  }

  async unbanUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.bot.api.unbanChatMember(Number(chatId), Number(userId), { only_if_banned: true });
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] unbanUser failed:`, err);
      return false;
    }
  }

  async muteUser(chatId: string, userId: string, untilDate?: number): Promise<boolean> {
    try {
      await this.bot.api.restrictChatMember(Number(chatId), Number(userId), {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      }, {
        until_date: untilDate,
      });
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] muteUser failed:`, err);
      return false;
    }
  }

  async unmuteUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.bot.api.restrictChatMember(Number(chatId), Number(userId), {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] unmuteUser failed:`, err);
      return false;
    }
  }

  async kickUser(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.bot.api.banChatMember(Number(chatId), Number(userId));
      // Immediately unban so user can rejoin
      await this.bot.api.unbanChatMember(Number(chatId), Number(userId), { only_if_banned: true });
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] kickUser failed:`, err);
      return false;
    }
  }

  async pinMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.bot.api.pinChatMessage(Number(chatId), Number(messageId));
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] pinMessage failed:`, err);
      return false;
    }
  }

  async unpinMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      await this.bot.api.unpinChatMessage(Number(chatId), Number(messageId));
      return true;
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] unpinMessage failed:`, err);
      return false;
    }
  }

  async getChatMember(chatId: string, userId: string): Promise<{ status: string; user: PlatformUser } | null> {
    try {
      const member = await this.bot.api.getChatMember(Number(chatId), Number(userId));
      return {
        status: member.status,
        user: this.telegramUserToPlatform(member.user),
      };
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] getChatMember failed:`, err);
      return null;
    }
  }

  async getChatAdmins(chatId: string): Promise<PlatformUser[]> {
    try {
      const admins = await this.bot.api.getChatAdministrators(Number(chatId));
      return admins.map(a => this.telegramUserToPlatform(a.user));
    } catch (err) {
      console.error(`[TG-BOT:${this.sessionId}] getChatAdmins failed:`, err);
      return [];
    }
  }

  async start(): Promise<void> {
    // In webhook mode, we don't call bot.start() — updates come via webhook
    this.connected = true;
    console.log(`[TG-BOT:${this.sessionId}] Adapter started (webhook mode)`);
  }

  async stop(): Promise<void> {
    this.connected = false;
    try {
      await this.bot.api.deleteWebhook();
    } catch {
      // Best effort
    }
    console.log(`[TG-BOT:${this.sessionId}] Adapter stopped`);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
