/**
 * Botwave Core Package
 * 
 * Re-exports shared types, utilities, and database helpers used across all platforms.
 */

export type {
  Platform,
  PlatformUser,
  PlatformChat,
  PlatformMessage,
  SendOptions,
  PlatformAdapter,
  TelegramBotConfig,
  TelegramUserbotConfig,
} from './types';

export {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
} from './types';
