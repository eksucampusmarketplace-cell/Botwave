/**
 * Locks handler: /lock, /unlock, /locks, /open, /close
 * Granular media type locking for groups.
 */

import { Bot, type Context } from 'grammy';
import { requireAdmin, isAdmin } from '../utils/permissions';
import { getLocks, setLock, clearAllLocks } from '../utils/db';

const VALID_LOCK_TYPES = [
  'photo',
  'video',
  'sticker',
  'gif',
  'voice',
  'audio',
  'document',
  'link',
  'forward',
  'poll',
  'contact',
  'video_note',
] as const;

type LockType = typeof VALID_LOCK_TYPES[number];

export function registerLocksHandlers(bot: Bot, sessionId: string): void {
  bot.command('lock', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (!arg) {
      await ctx.reply(
        `Usage: /lock <type>\n\nValid types: ${VALID_LOCK_TYPES.join(', ')}, all`,
      );
      return;
    }

    if (arg === 'all') {
      for (const t of VALID_LOCK_TYPES) {
        await setLock(sessionId, chatId, t, true);
      }
      await ctx.reply('Locked: all media types.');
      return;
    }

    if (!VALID_LOCK_TYPES.includes(arg as LockType)) {
      await ctx.reply(
        `❌ Invalid lock type. Valid: ${VALID_LOCK_TYPES.join(', ')}, all`,
      );
      return;
    }

    await setLock(sessionId, chatId, arg, true);
    await ctx.reply(`Locked: ${arg}`);
  });

  bot.command('unlock', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (!arg) {
      await ctx.reply(
        `Usage: /unlock <type>\n\nValid types: ${VALID_LOCK_TYPES.join(', ')}, all`,
      );
      return;
    }

    if (arg === 'all') {
      await clearAllLocks(sessionId, chatId);
      await ctx.reply('Unlocked: all media types.');
      return;
    }

    if (!VALID_LOCK_TYPES.includes(arg as LockType)) {
      await ctx.reply(
        `❌ Invalid lock type. Valid: ${VALID_LOCK_TYPES.join(', ')}, all`,
      );
      return;
    }

    await setLock(sessionId, chatId, arg, false);
    await ctx.reply(`Unlocked: ${arg}`);
  });

  bot.command('locks', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const locks = await getLocks(sessionId, chatId);

    let text = `<b>Lock Status</b>\n\n`;
    for (const t of VALID_LOCK_TYPES) {
      const locked = locks.includes(t);
      text += `${locked ? '🔴' : '🟢'} ${t}\n`;
    }
    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('open', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    try {
      await ctx.api.setChatPermissions(ctx.chat!.id, {
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
        can_invite_users: true,
      });
      await ctx.reply('Group opened — all members can send messages.');
    } catch {
      await ctx.reply('❌ Failed to open group. Am I admin?');
    }
  });

  bot.command('close', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    try {
      await ctx.api.setChatPermissions(ctx.chat!.id, {
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
        can_invite_users: false,
      });
      await ctx.reply('Group closed — members cannot send messages.');
    } catch {
      await ctx.reply('❌ Failed to close group. Am I admin?');
    }
  });
}

/**
 * Middleware to check locked media types. Returns true if the message was blocked.
 */
export async function checkLocks(
  ctx: Context,
  sessionId: string,
): Promise<boolean> {
  if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') return false;
  if (!ctx.message) return false;

  // Skip admins
  if (await isAdmin(ctx)) return false;

  const chatId = ctx.chat.id.toString();
  const locks = await getLocks(sessionId, chatId);
  if (locks.length === 0) return false;

  const msg = ctx.message;
  let blocked = false;

  if (msg.photo && locks.includes('photo')) blocked = true;
  if (msg.video && locks.includes('video')) blocked = true;
  if (msg.sticker && locks.includes('sticker')) blocked = true;
  if (msg.animation && locks.includes('gif')) blocked = true;
  if (msg.voice && locks.includes('voice')) blocked = true;
  if (msg.audio && locks.includes('audio')) blocked = true;
  if (msg.document && !msg.animation && locks.includes('document')) blocked = true;
  if (msg.poll && locks.includes('poll')) blocked = true;
  if (msg.contact && locks.includes('contact')) blocked = true;
  if (msg.video_note && locks.includes('video_note')) blocked = true;
  if (msg.forward_date && locks.includes('forward')) blocked = true;

  if (
    locks.includes('link') &&
    msg.entities?.some((e) => e.type === 'url' || e.type === 'text_link')
  ) {
    blocked = true;
  }

  if (blocked) {
    try {
      await ctx.deleteMessage();
    } catch {}
  }

  return blocked;
}
