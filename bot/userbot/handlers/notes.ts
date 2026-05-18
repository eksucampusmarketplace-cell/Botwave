/**
 * Notes handler for Telegram userbot.
 * Commands: .save <name> <content>, .get <name>, .notes, .clear <name>
 * Stores per-session notes retrievable by keyword.
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';
import { saveNote, getNote, deleteNote, listNotes } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const saveNoteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args.length < 2) {
    await msg.edit({ text: '❌ Usage: .save <name> <content>' });
    return;
  }

  const name = args[0];
  let content: string;

  if (msg.replyTo) {
    try {
      const replied = await client.getMessages(msg.chatId!, {
        ids: [msg.replyTo.replyToMsgId],
      });
      content = replied[0]?.text || args.slice(1).join(' ');
    } catch {
      content = args.slice(1).join(' ');
    }
  } else {
    content = args.slice(1).join(' ');
  }

  await saveNote(sessionId, name, content);
  await shortPause();
  await msg.edit({ text: `✅ Note "${name}" saved.` });
};

export const getNoteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .get <name>' });
    return;
  }

  const note = await getNote(sessionId, args[0]);
  if (!note) {
    await msg.edit({ text: `❌ Note "${args[0]}" not found.` });
    return;
  }

  await shortPause();

  if (shouldShowTyping() && msg.chatId) {
    try {
      const { Api } = await import('telegram/tl');
      const peer = await client.getInputEntity(msg.chatId);
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await typingDelay(note.content.length);
    } catch {}
  }

  try {
    await client.sendMessage(msg.chatId!, { message: note.content });
    await msg.delete({ revoke: true });
  } catch {
    await msg.edit({ text: note.content });
  }
};

export const listNotesHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;

  const notes = await listNotes(sessionId);
  if (notes.length === 0) {
    await msg.edit({ text: '📝 No notes saved yet.' });
    return;
  }

  const list = notes.map((n, i) => `${i + 1}. \`${n.name}\``).join('\n');
  await shortPause();
  await msg.edit({ text: `📝 **Saved Notes** (${notes.length}):\n\n${list}` });
};

export const clearNoteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .clear <name>' });
    return;
  }

  const deleted = await deleteNote(sessionId, args[0]);
  await shortPause();
  await msg.edit({
    text: deleted ? `✅ Note "${args[0]}" deleted.` : `❌ Note "${args[0]}" not found.`,
  });
};

/**
 * Check incoming messages for #notename triggers.
 */
export async function handleNoteRetrieval(
  client: TelegramClient,
  event: NewMessageEvent,
  sessionId: string,
): Promise<boolean> {
  const msg = event.message;
  const text = msg.text || '';
  if (!text.startsWith('#')) return false;

  const noteName = text.slice(1).split(/\s/)[0].toLowerCase();
  if (!noteName) return false;

  const note = await getNote(sessionId, noteName);
  if (!note) return false;

  await waitForRateLimit('message_send');

  if (shouldShowTyping() && msg.chatId) {
    try {
      const { Api } = await import('telegram/tl');
      const peer = await client.getInputEntity(msg.chatId);
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await typingDelay(note.content.length);
    } catch {}
  }

  try {
    await client.sendMessage(msg.chatId!, {
      message: note.content,
      replyTo: msg.id,
    });
  } catch {}

  return true;
}

export const noteHandlers: Record<string, HandlerFn> = {
  save: saveNoteHandler,
  get: getNoteHandler,
  notes: listNotesHandler,
  clear: clearNoteHandler,
};
