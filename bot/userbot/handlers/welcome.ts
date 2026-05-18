/**
 * Welcome/Goodbye handler for Telegram userbot.
 * Commands: .setwelcome <msg>, .setgoodbye <msg>, .welcome on/off, .goodbye on/off
 * Greets new members and says goodbye to leaving members with humanized delays.
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  responseDelay,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

interface WelcomeConfig {
  welcomeEnabled: boolean;
  welcomeMsg: string;
  goodbyeEnabled: boolean;
  goodbyeMsg: string;
}

const chatWelcome: Map<string, WelcomeConfig> = new Map();

function getConfig(chatId: string): WelcomeConfig {
  let config = chatWelcome.get(chatId);
  if (!config) {
    config = {
      welcomeEnabled: false,
      welcomeMsg: 'Welcome {mention} to {title}! 👋',
      goodbyeEnabled: false,
      goodbyeMsg: 'Goodbye {name}! 👋',
    };
    chatWelcome.set(chatId, config);
  }
  return config;
}

export const setWelcomeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId?.toString() || '';
  const content = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!content) {
    await msg.edit({
      text: '❌ Usage: .setwelcome <message>\nVariables: {mention}, {name}, {title}, {id}, {count}',
    });
    return;
  }

  const config = getConfig(chatId);
  config.welcomeMsg = content;
  config.welcomeEnabled = true;
  chatWelcome.set(chatId, config);

  await shortPause();
  await msg.edit({ text: `✅ Welcome message set and enabled.\nPreview: ${content}` });
};

export const setGoodbyeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId?.toString() || '';
  const content = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!content) {
    await msg.edit({
      text: '❌ Usage: .setgoodbye <message>\nVariables: {name}, {title}, {id}',
    });
    return;
  }

  const config = getConfig(chatId);
  config.goodbyeMsg = content;
  config.goodbyeEnabled = true;
  chatWelcome.set(chatId, config);

  await shortPause();
  await msg.edit({ text: `✅ Goodbye message set and enabled.\nPreview: ${content}` });
};

export const welcomeToggleHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const chatId = msg.chatId?.toString() || '';
  const args = (msg.text || '').split(/\s+/).slice(1);
  const config = getConfig(chatId);

  if (args[0] === 'on') {
    config.welcomeEnabled = true;
    await msg.edit({ text: '✅ Welcome messages enabled.' });
  } else if (args[0] === 'off') {
    config.welcomeEnabled = false;
    await msg.edit({ text: '✅ Welcome messages disabled.' });
  } else {
    await msg.edit({
      text: `👋 Welcome: ${config.welcomeEnabled ? 'ON' : 'OFF'}\nMessage: ${config.welcomeMsg}\nUse .welcome on/off`,
    });
  }
};

export const goodbyeToggleHandler: HandlerFn = async (client, event) => {
  const msg = event.message;
  const chatId = msg.chatId?.toString() || '';
  const args = (msg.text || '').split(/\s+/).slice(1);
  const config = getConfig(chatId);

  if (args[0] === 'on') {
    config.goodbyeEnabled = true;
    await msg.edit({ text: '✅ Goodbye messages enabled.' });
  } else if (args[0] === 'off') {
    config.goodbyeEnabled = false;
    await msg.edit({ text: '✅ Goodbye messages disabled.' });
  } else {
    await msg.edit({
      text: `👋 Goodbye: ${config.goodbyeEnabled ? 'ON' : 'OFF'}\nMessage: ${config.goodbyeMsg}\nUse .goodbye on/off`,
    });
  }
};

/**
 * Handle new member join events for welcome messages.
 */
export async function handleWelcome(
  client: TelegramClient,
  chatId: string,
  user: { id: string; firstName: string; lastName?: string; username?: string },
  memberCount?: number,
): Promise<void> {
  const config = chatWelcome.get(chatId);
  if (!config?.welcomeEnabled) return;

  await waitForRateLimit('message_send');
  await responseDelay();

  const mention = user.username ? `@${user.username}` : user.firstName;
  const name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;

  let chatTitle = 'this group';
  try {
    const entity = await client.getEntity(chatId);
    if ('title' in entity) chatTitle = (entity as { title: string }).title;
  } catch {}

  const text = config.welcomeMsg
    .replace(/\{mention\}/g, mention)
    .replace(/\{name\}/g, name)
    .replace(/\{title\}/g, chatTitle)
    .replace(/\{id\}/g, user.id)
    .replace(/\{count\}/g, String(memberCount || '?'));

  if (shouldShowTyping()) {
    try {
      const peer = await client.getInputEntity(chatId);
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await typingDelay(text.length);
    } catch {}
  }

  try {
    await client.sendMessage(chatId, { message: text });
  } catch {}
}

/**
 * Handle member leave events for goodbye messages.
 */
export async function handleGoodbye(
  client: TelegramClient,
  chatId: string,
  user: { id: string; firstName: string; lastName?: string },
): Promise<void> {
  const config = chatWelcome.get(chatId);
  if (!config?.goodbyeEnabled) return;

  await waitForRateLimit('message_send');
  await responseDelay();

  const name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;

  let chatTitle = 'this group';
  try {
    const entity = await client.getEntity(chatId);
    if ('title' in entity) chatTitle = (entity as { title: string }).title;
  } catch {}

  const text = config.goodbyeMsg
    .replace(/\{name\}/g, name)
    .replace(/\{title\}/g, chatTitle)
    .replace(/\{id\}/g, user.id);

  try {
    await client.sendMessage(chatId, { message: text });
  } catch {}
}

export const welcomeHandlers: Record<string, HandlerFn> = {
  setwelcome: setWelcomeHandler,
  setgoodbye: setGoodbyeHandler,
  welcome: welcomeToggleHandler,
  goodbye: goodbyeToggleHandler,
};
