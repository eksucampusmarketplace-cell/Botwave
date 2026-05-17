/**
 * Admin Tools — /mentionall, /settitle, /setdesc, /adminlist, /banghosts, /admincache, /anonadmin, /adminerror
 */

import { Bot } from 'grammy';
import { requireAdmin, getAdminList, invalidateAdminCache } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerAdminToolsHandlers(bot: Bot, sessionId: string): void {
  bot.command('mentionall', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const config = await getTelegramConfig(sessionId);
    if (!(config as Record<string, unknown>).mentionall_enabled) {
      await ctx.reply('Mention-all is disabled. Enable it from settings.');
      return;
    }

    const args = (ctx.message?.text || '').split(/\s+/).slice(1).join(' ');
    const message = args || 'Attention everyone!';

    try {
      const admins = await ctx.getChatAdministrators();
      const members = await bot.api.getChatMemberCount(ctx.chat!.id);
      let text = `📢 <b>${escapeHtml(message)}</b>\n\n`;
      for (const admin of admins.slice(0, 50)) {
        if (!admin.user.is_bot) {
          text += `<a href="tg://user?id=${admin.user.id}">${escapeHtml(admin.user.first_name)}</a> `;
        }
      }
      text += `\n\n👥 ${members} members in this group`;
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('Could not fetch member list.');
    }
  });

  bot.command('settitle', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const title = (ctx.message?.text || '').split(/\s+/).slice(1).join(' ');
    if (!title) {
      await ctx.reply('Usage: /settitle <new title>');
      return;
    }
    try {
      await ctx.setChatTitle(title);
      await ctx.reply(`✅ Group title changed to: <b>${escapeHtml(title)}</b>`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Failed to change title. Make sure I have admin permissions.');
    }
  });

  bot.command('setdesc', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const desc = (ctx.message?.text || '').split(/\s+/).slice(1).join(' ');
    if (!desc) {
      await ctx.reply('Usage: /setdesc <new description>');
      return;
    }
    try {
      await ctx.setChatDescription(desc);
      await ctx.reply('✅ Group description updated.');
    } catch {
      await ctx.reply('❌ Failed to change description.');
    }
  });

  bot.command('adminlist', async (ctx) => {
    try {
      const admins = await ctx.getChatAdministrators();
      const chatTitle = ctx.chat!.type !== 'private' ? (ctx.chat as { title?: string }).title || 'this group' : 'this chat';
      let text = `👑 <b>Admins of ${escapeHtml(chatTitle)}</b>\n\n`;
      const creator = admins.find(a => a.status === 'creator');
      if (creator) {
        const title = (creator as { custom_title?: string }).custom_title;
        text += `👑 <a href="tg://user?id=${creator.user.id}">${escapeHtml(creator.user.first_name)}</a>`;
        if (title) text += ` — <i>${escapeHtml(title)}</i>`;
        text += '\n';
      }
      const regularAdmins = admins.filter(a => a.status === 'administrator' && !a.user.is_bot);
      for (const admin of regularAdmins) {
        const title = (admin as { custom_title?: string }).custom_title;
        text += `⭐ <a href="tg://user?id=${admin.user.id}">${escapeHtml(admin.user.first_name)}</a>`;
        if (title) text += ` — <i>${escapeHtml(title)}</i>`;
        text += '\n';
      }
      const botAdmins = admins.filter(a => a.user.is_bot);
      if (botAdmins.length > 0) {
        text += `\n🤖 Bots: ${botAdmins.map(a => escapeHtml(a.user.first_name)).join(', ')}`;
      }
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not fetch admin list.');
    }
  });

  bot.command('banghosts', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await ctx.reply('🔍 Scanning for deleted accounts... This may take a moment.');
    // Note: Telegram Bot API doesn't provide a way to list all members.
    // This command will ban deleted accounts when they send a message.
    // Enable auto-ban via config.
    const config = await getTelegramConfig(sessionId);
    const enabled = (config as Record<string, unknown>).ban_ghosts_enabled;
    if (!enabled) {
      await ctx.reply('Ghost banning is now enabled. Deleted accounts will be banned when they send a message.\nUse /banghosts off to disable.');
      await import('../utils/db').then(db => db.updateTelegramConfig(sessionId, { ban_ghosts_enabled: true } as Record<string, unknown>));
    } else {
      const args = (ctx.message?.text || '').split(/\s+/).slice(1);
      if (args[0] === 'off') {
        await import('../utils/db').then(db => db.updateTelegramConfig(sessionId, { ban_ghosts_enabled: false } as Record<string, unknown>));
        await ctx.reply('Ghost banning disabled.');
      } else {
        await ctx.reply('Ghost banning is already enabled. Use /banghosts off to disable.');
      }
    }
  });

  // /admincache — Force refresh the admin cache for this chat
  bot.command('admincache', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.chat || ctx.chat.type === 'private') return;
    invalidateAdminCache(ctx.chat.id);
    try {
      await getAdminList(ctx.chat.id, ctx.api);
      await ctx.reply('✅ Admin cache has been updated.');
    } catch {
      await ctx.reply('❌ Failed to update admin cache.');
    }
  });

  // /anonadmin — Allow anonymous admins to use all commands without permission checks
  bot.command('anonadmin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { anon_admin: true });
      await ctx.reply('✅ Anonymous admin mode enabled. Anonymous admins can now use all commands without permission checks.\n⚠️ This is not recommended for security reasons.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { anon_admin: false });
      await ctx.reply('✅ Anonymous admin mode disabled.');
    } else {
      const config = await getTelegramConfig(sessionId);
      await ctx.reply(
        `👤 <b>Anonymous Admin</b>\n\n` +
        `Status: ${config.anon_admin ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `Usage: /anonadmin <yes/no/on/off>`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // /adminerror — Toggle error messages when normal users use admin commands
  bot.command('adminerror', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { admin_error_messages: true });
      await ctx.reply('✅ Admin error messages enabled. Normal users will see error messages when using admin commands.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { admin_error_messages: false });
      await ctx.reply('✅ Admin error messages disabled.');
    } else {
      const config = await getTelegramConfig(sessionId);
      await ctx.reply(
        `⚠️ <b>Admin Error Messages</b>\n\n` +
        `Status: ${config.admin_error_messages !== false ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `Usage: /adminerror <yes/no/on/off>`,
        { parse_mode: 'HTML' },
      );
    }
  });
}
