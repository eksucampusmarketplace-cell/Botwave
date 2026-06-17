/**
 * Handler registry for Telegram userbot.
 * Aggregates all command handlers and passive handlers (filters, afk, pmpermit, antiflood).
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import { adminHandlers } from './admin';
import { pmPermitHandlers, handleIncomingPm } from './pmpermit';
import { afkHandlers, handleAfkMention } from './afk';
import { noteHandlers, handleNoteRetrieval } from './notes';
import { filterHandlers, handleFilterCheck } from './filters';
import { purgeHandlers } from './purge';
import { gbanHandlers, handleGbanCheck } from './gban';
import { miscHandlers } from './misc';
import { settingsHandlers } from './settings';
import { stickerHandlers } from './stickers';
import { antifloodHandlers, handleAntifloodCheck } from './antiflood';
import { welcomeHandlers } from './welcome';
import { chatToolHandlers } from './chattools';
import { textToolHandlers } from './texttools';
import { mediaHandlers } from './media';
import { searchHandlers } from './search';
import { funHandlers } from './fun';
import { translateHandlers } from './translate';
import { reminderHandlers } from './reminders';

export type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

// All command handlers merged into one map
export const commandHandlers: Record<string, HandlerFn> = {
  ...adminHandlers,
  ...pmPermitHandlers,
  ...afkHandlers,
  ...noteHandlers,
  ...filterHandlers,
  ...purgeHandlers,
  ...gbanHandlers,
  ...miscHandlers,
  ...settingsHandlers,
  ...stickerHandlers,
  ...antifloodHandlers,
  ...welcomeHandlers,
  ...chatToolHandlers,
  ...textToolHandlers,
  ...mediaHandlers,
  ...searchHandlers,
  ...funHandlers,
  ...translateHandlers,
  ...reminderHandlers,
};

// Passive handlers run on every incoming message (non-command)
export {
  handleIncomingPm,
  handleAfkMention,
  handleNoteRetrieval,
  handleFilterCheck,
  handleGbanCheck,
  handleAntifloodCheck,
};
