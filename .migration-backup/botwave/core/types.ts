/**
 * Platform Abstraction Layer for Botwave
 * 
 * Defines a unified interface for all messaging platforms (WhatsApp, Telegram Bot, Telegram Userbot).
 * Each platform implements PlatformAdapter so command handlers work identically across platforms.
 */

export type Platform = 'whatsapp' | 'telegram_bot' | 'telegram_userbot';

export interface PlatformUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  isBot?: boolean;
}

export interface PlatformChat {
  id: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  memberCount?: number;
}

export interface PlatformMessage {
  id: string;
  platform: Platform;
  sessionId: string;
  chatId: string;
  sender: PlatformUser;
  chat: PlatformChat;
  text?: string;
  caption?: string;
  isCommand: boolean;
  commandName?: string;
  commandArgs?: string[];
  isGroup: boolean;
  isOwner: boolean;
  timestamp: number;
  replyToMessageId?: string;
  mediaType?: 'photo' | 'video' | 'audio' | 'sticker' | 'document' | 'voice' | 'animation';
  mediaBuffer?: Buffer;
  rawMessage: unknown;
}

export interface SendOptions {
  replyToMessageId?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
}

export interface PlatformAdapter {
  readonly platform: Platform;
  readonly sessionId: string;

  sendText(chatId: string, text: string, options?: SendOptions): Promise<void>;
  sendMedia(chatId: string, media: Buffer, type: 'photo' | 'video' | 'audio' | 'sticker' | 'document', caption?: string, options?: SendOptions): Promise<void>;
  sendSticker(chatId: string, sticker: Buffer, options?: SendOptions): Promise<void>;
  deleteMessage(chatId: string, messageId: string): Promise<boolean>;
  
  // Group management
  banUser(chatId: string, userId: string): Promise<boolean>;
  unbanUser(chatId: string, userId: string): Promise<boolean>;
  muteUser(chatId: string, userId: string, untilDate?: number): Promise<boolean>;
  unmuteUser(chatId: string, userId: string): Promise<boolean>;
  kickUser(chatId: string, userId: string): Promise<boolean>;
  pinMessage(chatId: string, messageId: string): Promise<boolean>;
  unpinMessage(chatId: string, messageId: string): Promise<boolean>;
  
  // Info
  getChatMember(chatId: string, userId: string): Promise<{ status: string; user: PlatformUser } | null>;
  getChatAdmins(chatId: string): Promise<PlatformUser[]>;
  
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  isConnected(): boolean;
}

export interface TelegramBotConfig {
  webhookUrl?: string;
  webhookSecret?: string;
  welcomeMessage?: string;
  goodbyeMessage?: string;
  rulesText?: string;
  antifloodEnabled: boolean;
  antifloodMaxPerMin: number;
  antispamEnabled: boolean;
  antilinkEnabled: boolean;
  antilinkWhitelist: string[];
  captchaEnabled: boolean;
  captchaType: string;
  warnLimit: number;
  warnAction: string;
  nightModeEnabled: boolean;
  nightModeStart?: string;
  nightModeEnd?: string;
  lockedTypes: string[];
  logChannelId?: string;
}

export interface TelegramUserbotConfig {
  autoForwardRules: Array<{
    sourceId: string;
    destinationId: string;
    keywords?: string[];
    enabled: boolean;
  }>;
  channelMonitors: Array<{
    channelId: string;
    keywords: string[];
    notifyChat: string;
    enabled: boolean;
  }>;
  warmingEnabled: boolean;
  warmingConfig: {
    activityTypes?: string[];
    frequency?: number;
    duration?: number;
  };
  rateLimitMsgIntervalMs: number;
  rateLimitJoinIntervalMs: number;
  rateLimitForwardIntervalMs: number;
  rateLimitReactIntervalMs: number;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  whatsapp: 'WhatsApp',
  telegram_bot: 'Telegram Bot',
  telegram_userbot: 'Telegram Userbot',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  whatsapp: '#25D366',
  telegram_bot: '#0088cc',
  telegram_userbot: '#7B68EE',
};
