/**
 * Federation (TrustNet) commands — cross-group ban sharing.
 * Groups join a federation, and bans are shared across all member groups.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { isOwner } from '../utils/permissions';
import {
  createFederation,
  getFederationByInviteCode,
  getFederationForChat,
  getUserFederations,
  getFederationChats,
  joinFederation,
  leaveFederation,
  addFederationBan,
  removeFederationBan,
  getFederationBans,
  isFederationBanned,
  addFederationAdmin,
  removeFederationAdmin,
  getFederationAdmins,
  isFederationAdmin,
} from '../utils/db';
import { resolveTarget } from '../utils/resolve';

export function registerFederationHandlers(bot: Bot, sessionId: string): void {
  // /newfed <name> — create a new federation
  bot.command('newfed', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

    const name = (ctx.match?.toString() || '').trim();
    if (!name) {
      await ctx.reply('Usage: /newfed <federation name>');
      return;
    }

    const fed = await createFederation(sessionId, name, ctx.from.id.toString());
    if (!fed) {
      await ctx.reply('❌ Failed to create federation.');
      return;
    }

    await ctx.reply(
      `✅ <b>Federation created!</b>\n\n` +
      `📛 Name: <b>${fed.name}</b>\n` +
      `🔑 Invite Code: <code>${fed.invite_code}</code>\n\n` +
      `Share the invite code with other groups to join your federation.\n` +
      `Use /joinfed ${fed.invite_code} in a group to join.`,
      { parse_mode: 'HTML' },
    );
  });

  // /joinfed <code> — join group to a federation
  bot.command('joinfed', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;

    const code = (ctx.match?.toString() || '').trim();
    if (!code) {
      await ctx.reply('Usage: /joinfed <invite_code>');
      return;
    }

    const existing = await getFederationForChat(ctx.chat.id.toString());
    if (existing) {
      await ctx.reply(`This group is already in federation "<b>${existing.name}</b>". Use /leavefed first.`, { parse_mode: 'HTML' });
      return;
    }

    const fed = await getFederationByInviteCode(code);
    if (!fed) {
      await ctx.reply('❌ Invalid invite code.');
      return;
    }

    const ok = await joinFederation(fed.id, ctx.chat.id.toString(), ctx.from.id.toString());
    if (ok) {
      await ctx.reply(`✅ This group has joined federation "<b>${fed.name}</b>".`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('❌ Failed to join federation.');
    }
  });

  // /leavefed — leave current federation
  bot.command('leavefed', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') return;
    if (!(await requireAdmin(ctx, sessionId))) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    await leaveFederation(ctx.chat.id.toString());
    await ctx.reply(`✅ Left federation "<b>${fed.name}</b>".`, { parse_mode: 'HTML' });
  });

  // /fedinfo — show federation details
  bot.command('fedinfo', async (ctx) => {
    if (!ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    const chats = await getFederationChats(fed.id);
    const admins = await getFederationAdmins(fed.id);
    const bans = await getFederationBans(fed.id);

    await ctx.reply(
      `🛡️ <b>Federation Info</b>\n\n` +
      `📛 Name: <b>${fed.name}</b>\n` +
      `👤 Owner: <code>${fed.owner_user_id}</code>\n` +
      `🔑 Invite: <code>${fed.invite_code}</code>\n` +
      `👥 Groups: ${chats.length}\n` +
      `👮 Admins: ${admins.length}\n` +
      `🚫 Bans: ${bans.length}`,
      { parse_mode: 'HTML' },
    );
  });

  // /myfeds — list federations you own
  bot.command('myfeds', async (ctx) => {
    if (!ctx.from) return;

    const feds = await getUserFederations(ctx.from.id.toString());
    if (feds.length === 0) {
      await ctx.reply('You don\'t own any federations. Use /newfed to create one.');
      return;
    }

    const list = feds.map((f, i) => `${i + 1}. <b>${f.name}</b> — <code>${f.invite_code}</code>`).join('\n');
    await ctx.reply(`🛡️ <b>Your Federations</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /fedchats — list member groups
  bot.command('fedchats', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    if (fed.owner_user_id !== ctx.from.id.toString()) {
      await ctx.reply('❌ Only the federation owner can view member groups.');
      return;
    }

    const chats = await getFederationChats(fed.id);
    if (chats.length === 0) {
      await ctx.reply('No groups in this federation yet.');
      return;
    }

    const list = chats.map((c, i) => `${i + 1}. <code>${c.chat_id}</code>`).join('\n');
    await ctx.reply(`👥 <b>Federation Groups</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /fban <user> [reason] — ban user across all fed groups
  bot.command('fban', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    const isFedAdmin = fed.owner_user_id === ctx.from.id.toString() ||
      await isFederationAdmin(fed.id, ctx.from.id.toString());
    if (!isFedAdmin) {
      await ctx.reply('❌ Only federation admins can use this command.');
      return;
    }

    const { userId, reason } = resolveTarget(ctx);
    if (!userId) {
      await ctx.reply('Usage: /fban <user_id or reply> [reason]');
      return;
    }

    await addFederationBan(fed.id, userId.toString(), reason || null, ctx.from.id.toString());

    const chats = await getFederationChats(fed.id);
    let banned = 0;
    for (const chat of chats) {
      try {
        await ctx.api.banChatMember(Number(chat.chat_id), userId);
        banned++;
      } catch {
        // May fail if bot isn't admin in that group
      }
    }

    await ctx.reply(
      `🚫 <b>Federation Ban</b>\n\n` +
      `User <code>${userId}</code> has been banned across ${banned}/${chats.length} federation groups.` +
      (reason ? `\nReason: ${reason}` : ''),
      { parse_mode: 'HTML' },
    );
  });

  // /unfban <user> — unban from federation
  bot.command('unfban', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    const isFedAdmin = fed.owner_user_id === ctx.from.id.toString() ||
      await isFederationAdmin(fed.id, ctx.from.id.toString());
    if (!isFedAdmin) {
      await ctx.reply('❌ Only federation admins can use this command.');
      return;
    }

    const { userId } = resolveTarget(ctx);
    if (!userId) {
      await ctx.reply('Usage: /unfban <user_id or reply>');
      return;
    }

    await removeFederationBan(fed.id, userId.toString());

    const chats = await getFederationChats(fed.id);
    for (const chat of chats) {
      try {
        await ctx.api.unbanChatMember(Number(chat.chat_id), userId);
      } catch {}
    }

    await ctx.reply(`✅ User <code>${userId}</code> has been unbanned from the federation.`, { parse_mode: 'HTML' });
  });

  // /fbans — list federation bans
  bot.command('fbans', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    const bans = await getFederationBans(fed.id);
    if (bans.length === 0) {
      await ctx.reply('No bans in this federation.');
      return;
    }

    const list = bans.slice(0, 20).map((b, i) =>
      `${i + 1}. <code>${b.user_id}</code>${b.reason ? ` — ${b.reason}` : ''}`
    ).join('\n');

    await ctx.reply(
      `🚫 <b>Federation Bans</b> (${bans.length} total)\n\n${list}`,
      { parse_mode: 'HTML' },
    );
  });

  // /fpromote <user> — add federation admin
  bot.command('fpromote', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    if (fed.owner_user_id !== ctx.from.id.toString()) {
      await ctx.reply('❌ Only the federation owner can promote admins.');
      return;
    }

    const { userId } = resolveTarget(ctx);
    if (!userId) {
      await ctx.reply('Usage: /fpromote <user_id or reply>');
      return;
    }

    await addFederationAdmin(fed.id, userId.toString(), ctx.from.id.toString());
    await ctx.reply(`✅ User <code>${userId}</code> is now a federation admin.`, { parse_mode: 'HTML' });
  });

  // /fdemote <user> — remove federation admin
  bot.command('fdemote', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    if (fed.owner_user_id !== ctx.from.id.toString()) {
      await ctx.reply('❌ Only the federation owner can demote admins.');
      return;
    }

    const { userId } = resolveTarget(ctx);
    if (!userId) {
      await ctx.reply('Usage: /fdemote <user_id or reply>');
      return;
    }

    await removeFederationAdmin(fed.id, userId.toString());
    await ctx.reply(`✅ User <code>${userId}</code> has been removed as federation admin.`, { parse_mode: 'HTML' });
  });

  // /fedadmins — list federation admins
  bot.command('fedadmins', async (ctx) => {
    if (!ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    const admins = await getFederationAdmins(fed.id);
    const list = [
      `👑 Owner: <code>${fed.owner_user_id}</code>`,
      ...admins.map((a, i) => `${i + 1}. <code>${a.user_id}</code>`),
    ].join('\n');

    await ctx.reply(`👮 <b>Federation Admins</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /fbroadcast <text> — send message to all fed groups
  bot.command('fbroadcast', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    const fed = await getFederationForChat(ctx.chat.id.toString());
    if (!fed) {
      await ctx.reply('This group is not in any federation.');
      return;
    }

    if (fed.owner_user_id !== ctx.from.id.toString()) {
      await ctx.reply('❌ Only the federation owner can broadcast.');
      return;
    }

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply('Usage: /fbroadcast <message>');
      return;
    }

    const chats = await getFederationChats(fed.id);
    let sent = 0;
    for (const chat of chats) {
      try {
        await ctx.api.sendMessage(Number(chat.chat_id), `📢 <b>Federation Broadcast</b>\n\n${text}`, { parse_mode: 'HTML' });
        sent++;
      } catch {}
    }

    await ctx.reply(`✅ Broadcast sent to ${sent}/${chats.length} groups.`);
  });
}

/**
 * Middleware: check if new chat members are federation-banned.
 * Called from factory.ts on new_chat_members events.
 */
export async function checkFederationBan(
  bot: Bot,
  chatId: string,
  userId: number,
): Promise<boolean> {
  const fed = await getFederationForChat(chatId);
  if (!fed) return false;

  const banned = await isFederationBanned(fed.id, userId.toString());
  if (banned) {
    try {
      await bot.api.banChatMember(Number(chatId), userId);
      await bot.api.sendMessage(
        Number(chatId),
        `🚫 User <code>${userId}</code> is federation-banned and has been removed.`,
        { parse_mode: 'HTML' },
      );
    } catch {}
    return true;
  }
  return false;
}
