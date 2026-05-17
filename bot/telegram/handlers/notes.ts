/**
 * Notes handlers: savenote, note, delnote, notes list.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { saveNote, getNote, deleteNote, listNotes, getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerNotesHandlers(bot: Bot, sessionId: string): void {
  bot.command('savenote', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const args = (ctx.match?.toString() || '').split(/\s+/);
    const name = args[0]?.toLowerCase();
    if (!name) {
      await ctx.reply('Usage: /savenote <name> [text]\nOr reply to a message with /savenote <name>');
      return;
    }

    const content = args.slice(1).join(' ') || ctx.message?.reply_to_message?.text || '';
    if (!content) {
      await ctx.reply('Provide text or reply to a message.');
      return;
    }

    await saveNote(sessionId, ctx.chat!.id.toString(), name, content);
    await ctx.reply(`✅ Note <b>${escapeHtml(name)}</b> saved.`, { parse_mode: 'HTML' });
  });

  bot.command('note', async (ctx) => {
    const name = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!name) {
      await ctx.reply('Usage: /note <name>');
      return;
    }

    const note = await getNote(sessionId, ctx.chat!.id.toString(), name);
    if (!note) {
      await ctx.reply(`❌ No note named "${escapeHtml(name)}".`, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(note.content, { parse_mode: 'HTML' }).catch(() => {
      ctx.reply(note.content);
    });
  });

  // Also support #notename shorthand
  bot.hears(/^#(\w+)$/, async (ctx) => {
    const name = ctx.match![1].toLowerCase();
    const note = await getNote(sessionId, ctx.chat!.id.toString(), name);
    if (note) {
      await ctx.reply(note.content, { parse_mode: 'HTML' }).catch(() => {
        ctx.reply(note.content);
      });
    }
  });

  bot.command('delnote', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const name = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!name) {
      await ctx.reply('Usage: /delnote <name>');
      return;
    }

    const deleted = await deleteNote(sessionId, ctx.chat!.id.toString(), name);
    if (deleted) {
      await ctx.reply(`✅ Note <b>${escapeHtml(name)}</b> deleted.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ No note named "${escapeHtml(name)}".`, { parse_mode: 'HTML' });
    }
  });

  bot.command('notes', async (ctx) => {
    const notes = await listNotes(sessionId, ctx.chat!.id.toString());
    if (notes.length === 0) {
      await ctx.reply('📝 No notes saved in this chat.');
      return;
    }

    const list = notes.map(n => `• <code>${escapeHtml(n.note_name)}</code>`).join('\n');
    await ctx.reply(`📝 <b>Saved Notes</b>\n\n${list}\n\nUse /note <name> or #name to retrieve.`, { parse_mode: 'HTML' });
  });

  // /get <name> — Alias for /note
  bot.command('get', async (ctx) => {
    const name = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!name) { await ctx.reply('Usage: /get <name>'); return; }
    const n = await getNote(sessionId, ctx.chat!.id.toString(), name);
    if (!n) { await ctx.reply(`❌ No note named "${escapeHtml(name)}".`, { parse_mode: 'HTML' }); return; }
    await ctx.reply(n.content, { parse_mode: 'HTML' }).catch(() => { ctx.reply(n.content); });
  });

  // /save <name> <text> — Alias for /savenote
  bot.command('save', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const args = (ctx.match?.toString() || '').split(/\s+/);
    const name = args[0]?.toLowerCase();
    if (!name) { await ctx.reply('Usage: /save <name> <text>'); return; }
    const content = args.slice(1).join(' ') || ctx.message?.reply_to_message?.text || '';
    if (!content) { await ctx.reply('Provide text or reply to a message.'); return; }
    await saveNote(sessionId, ctx.chat!.id.toString(), name, content);
    await ctx.reply(`✅ Note <b>${escapeHtml(name)}</b> saved.`, { parse_mode: 'HTML' });
  });

  // /clear <name> — Alias for /delnote
  bot.command('clear', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const name = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!name) { await ctx.reply('Usage: /clear <name>'); return; }
    const deleted = await deleteNote(sessionId, ctx.chat!.id.toString(), name);
    await ctx.reply(deleted ? `✅ Note deleted.` : `❌ No note named "${escapeHtml(name)}".`, { parse_mode: 'HTML' });
  });

  // /saved — Alias for /notes
  bot.command('saved', async (ctx) => {
    const allNotes = await listNotes(sessionId, ctx.chat!.id.toString());
    if (allNotes.length === 0) { await ctx.reply('📝 No notes saved.'); return; }
    const list = allNotes.map(n => `• <code>${escapeHtml(n.note_name)}</code>`).join('\n');
    await ctx.reply(`📝 <b>Saved Notes</b> (${allNotes.length})\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /clearall — Delete all notes
  bot.command('clearall', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const allNotes = await listNotes(sessionId, ctx.chat!.id.toString());
    for (const n of allNotes) {
      await deleteNote(sessionId, ctx.chat!.id.toString(), n.note_name);
    }
    await ctx.reply(`✅ All ${allNotes.length} notes deleted.`);
  });

  // /privatenotes <yes/no> — Send notes via PM
  bot.command('privatenotes', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { private_notes: true } as Record<string, unknown>);
      await ctx.reply('✅ Notes will be sent via PM.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { private_notes: false } as Record<string, unknown>);
      await ctx.reply('✅ Notes will be sent in the group.');
    } else {
      await ctx.reply('Usage: /privatenotes <yes/no/on/off>');
    }
  });
}
