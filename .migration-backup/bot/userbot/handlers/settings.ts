/**
 * Settings handler for Telegram userbot.
 * Commands: .setprefix, .setalive, .setlog, .addsudo, .rmsudo, .sudolist
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import { waitForRateLimit, shortPause } from '../utils/humanizer';
import { getUserbotConfig, updateUserbotConfig } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const setPrefixHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0] || args[0].length > 2) {
    await msg.edit({ text: '❌ Usage: .setprefix <char> (1-2 chars)' });
    return;
  }

  await updateUserbotConfig(sessionId, { prefix: args[0] });
  await shortPause();
  await msg.edit({ text: `✅ Prefix changed to: \`${args[0]}\`` });
};

export const setAliveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const content = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!content) {
    await msg.edit({ text: '❌ Usage: .setalive <message>' });
    return;
  }

  await updateUserbotConfig(sessionId, { alive_message: content });
  await shortPause();
  await msg.edit({ text: `✅ Alive message updated.` });
};

export const setLogHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args[0] === 'off' || args[0] === 'disable') {
    await updateUserbotConfig(sessionId, { log_chat_id: null });
    await msg.edit({ text: '✅ Log chat disabled.' });
    return;
  }

  if (args[0] === 'here') {
    const chatId = msg.chatId?.toString() || null;
    await updateUserbotConfig(sessionId, { log_chat_id: chatId });
    await msg.edit({ text: `✅ Log chat set to this chat.` });
    return;
  }

  if (args[0]) {
    await updateUserbotConfig(sessionId, { log_chat_id: args[0] });
    await msg.edit({ text: `✅ Log chat set to: ${args[0]}` });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  await msg.edit({
    text: `📋 Log chat: ${config.log_chat_id || 'Not set'}\nUsage: .setlog <chatid|here|off>`,
  });
};

export const addSudoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let userId: string | null = null;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) userId = replied[0].senderId.toString();
    } catch {}
  }

  if (!userId && args[0]) userId = args[0];

  if (!userId) {
    await msg.edit({ text: '❌ Reply to a user or provide a user ID.' });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  const sudoUsers = [...config.sudo_users];

  if (sudoUsers.includes(userId)) {
    await msg.edit({ text: '⚠️ User is already a sudo user.' });
    return;
  }

  sudoUsers.push(userId);
  await updateUserbotConfig(sessionId, { sudo_users: sudoUsers });
  await shortPause();
  await msg.edit({ text: `✅ Added ${userId} as sudo user.` });
};

export const rmSudoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let userId: string | null = null;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) userId = replied[0].senderId.toString();
    } catch {}
  }

  if (!userId && args[0]) userId = args[0];

  if (!userId) {
    await msg.edit({ text: '❌ Reply to a user or provide a user ID.' });
    return;
  }

  const config = await getUserbotConfig(sessionId);
  const sudoUsers = config.sudo_users.filter(id => id !== userId);

  if (sudoUsers.length === config.sudo_users.length) {
    await msg.edit({ text: '⚠️ User is not a sudo user.' });
    return;
  }

  await updateUserbotConfig(sessionId, { sudo_users: sudoUsers });
  await shortPause();
  await msg.edit({ text: `✅ Removed ${userId} from sudo users.` });
};

export const sudoListHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const config = await getUserbotConfig(sessionId);

  if (config.sudo_users.length === 0) {
    await msg.edit({ text: '📋 No sudo users configured.' });
    return;
  }

  const list = config.sudo_users.map((id, i) => `${i + 1}. \`${id}\``).join('\n');
  await shortPause();
  await msg.edit({ text: `📋 **Sudo Users** (${config.sudo_users.length}):\n\n${list}` });
};

// ─── Language Command ─────────────────────────────────────────────────────────

const USERBOT_LANGUAGES: Record<string, string> = {
  en: 'English', fr: 'French', es: 'Spanish', pt: 'Portuguese', de: 'German',
  ar: 'Arabic', hi: 'Hindi', yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa',
  sw: 'Swahili', zu: 'Zulu', am: 'Amharic', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', ru: 'Russian', tr: 'Turkish', it: 'Italian', nl: 'Dutch',
  pl: 'Polish', uk: 'Ukrainian', vi: 'Vietnamese', th: 'Thai', id: 'Indonesian',
};

const langMemory = new Map<string, string>();

export const langHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    const current = langMemory.get(sessionId) || 'en';
    const name = USERBOT_LANGUAGES[current] || 'English';
    await msg.edit({
      text: `🌍 **Language Settings**\n\nCurrent: ${name} (${current})\n\n**Commands:**\n  \`.lang list\` - Show all languages\n  \`.lang set <code>\` - Set language\n  \`.lang reset\` - Reset to English`,
    });
    return;
  }

  if (sub === 'list' || sub === 'ls') {
    const list = Object.entries(USERBOT_LANGUAGES).map(([c, n]) => `  \`${c}\` - ${n}`).join('\n');
    await msg.edit({ text: `🌍 **Supported Languages**\n\n${list}\n\nUse \`.lang set <code>\` to change.` });
    return;
  }

  if (sub === 'set') {
    const code = args[1]?.toLowerCase();
    if (!code || !USERBOT_LANGUAGES[code]) {
      await msg.edit({ text: `❌ Invalid language code. Use \`.lang list\` to see available languages.` });
      return;
    }
    langMemory.set(sessionId, code);
    await shortPause();
    await msg.edit({ text: `✅ Language set to **${USERBOT_LANGUAGES[code]}** (${code})` });
    return;
  }

  if (sub === 'reset' || sub === 'off') {
    langMemory.set(sessionId, 'en');
    await msg.edit({ text: '✅ Language reset to **English**.' });
    return;
  }

  // Direct shortcut: .lang fr
  if (USERBOT_LANGUAGES[sub]) {
    langMemory.set(sessionId, sub);
    await shortPause();
    await msg.edit({ text: `✅ Language set to **${USERBOT_LANGUAGES[sub]}** (${sub})` });
    return;
  }

  await msg.edit({ text: `❌ Unknown language: ${sub}\nUse \`.lang list\` to see codes.` });
};

export const settingsHandlers: Record<string, HandlerFn> = {
  setprefix: setPrefixHandler,
  setalive: setAliveHandler,
  setlog: setLogHandler,
  addsudo: addSudoHandler,
  rmsudo: rmSudoHandler,
  sudolist: sudoListHandler,
  lang: langHandler,
};
