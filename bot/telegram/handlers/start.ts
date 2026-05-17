/**
 * /start, /help, and /panel command handlers.
 * All text is editable via per-session config.
 * Matches Nexus bot reference: mini app buttons, help categories,
 * inline keyboard navigation, and "Powered by Botwave" footer.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { requireAdmin } from '../utils/permissions';

const POWERED_BY = '\n\n⚡ <b>Powered by Botwave</b>';

function appendFooter(text: string): string {
  return text + POWERED_BY;
}

function formatMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  }
  return result;
}

// ── Default editable messages ────────────────────────────────────────────

const DEFAULT_START_PRIVATE =
  `👋 <b>Hey {first_name}!</b>\n\n` +
  `I'm <b>{bot_name}</b> — a powerful group management bot with 50+ commands.\n\n` +
  `🛡️ <b>What I can do:</b>\n` +
  `├ Moderation — bans, mutes, warns, purge\n` +
  `├ Auto-mod — anti-flood, anti-link, anti-raid\n` +
  `├ Notes & Filters — auto-replies, saved notes\n` +
  `├ Federation — cross-group ban system\n` +
  `├ XP System — levels, leaderboards\n` +
  `├ Tickets — support ticket system\n` +
  `├ Stickers — steal & manage stickers\n` +
  `└ Games, Polls, Scheduling & more!\n\n` +
  `📱 <b>Add me to a group to get started!</b>\n` +
  `Use /help to see all available commands.`;

const DEFAULT_START_GROUP_DM =
  `👋 <b>Hey {first_name}!</b>\n\n` +
  `I've been added to <b>{group_name}</b>. Let's get set up!\n\n` +
  `⚡ <b>Quick Setup:</b>\n` +
  `├ Open the panel below to configure everything\n` +
  `├ Set welcome messages, rules, and moderation\n` +
  `├ Enable anti-flood, anti-link, captcha\n` +
  `└ Configure XP, filters, and more\n\n` +
  `💡 <b>Tip:</b> Use /help in the group to see all commands.`;

const DEFAULT_HELP_TEXT =
  `⚡ <b>{bot_name} — Command Reference</b>\n\n` +
  `━━━━━━━━━━━━━━━━━━━━\n\n` +
  `🛡️ <b>Moderation</b>\n` +
  `<code>/ban</code> <code>/unban</code> <code>/tban</code> <code>/mute</code> <code>/unmute</code> <code>/tmute</code> <code>/kick</code>\n` +
  `<code>/warn</code> <code>/unwarn</code> <code>/warns</code> <code>/resetwarns</code> <code>/purge</code> <code>/del</code>\n\n` +
  `👮 <b>Admin Tools</b>\n` +
  `<code>/promote</code> <code>/demote</code> <code>/admins</code> <code>/id</code> <code>/info</code> <code>/ping</code>\n\n` +
  `🔒 <b>Security</b>\n` +
  `<code>/antiflood</code> <code>/antilink</code> <code>/captcha</code> <code>/nightmode</code>\n` +
  `<code>/lock</code> <code>/unlock</code> <code>/locks</code>\n` +
  `<code>/blacklist</code> <code>/unblacklist</code> <code>/blacklistmode</code>\n\n` +
  `📝 <b>Notes & Filters</b>\n` +
  `<code>/savenote</code> <code>/note</code> <code>/delnote</code> <code>/notes</code>\n` +
  `<code>/addfilter</code> <code>/delfilter</code> <code>/filters</code>\n\n` +
  `👋 <b>Greetings</b>\n` +
  `<code>/setwelcome</code> <code>/setgoodbye</code> <code>/setrules</code> <code>/welcome</code> <code>/rules</code>\n\n` +
  `📊 <b>Reports & Polls</b>\n` +
  `<code>/report</code> <code>/reports</code> <code>/poll</code> <code>/quiz</code> <code>/stoppoll</code>\n\n` +
  `🎮 <b>Fun & Games</b>\n` +
  `<code>/joke</code> <code>/quote</code> <code>/dice</code> <code>/coin</code> <code>/8ball</code> <code>/afk</code> <code>/games</code>\n\n` +
  `🛡️ <b>Federation</b>\n` +
  `<code>/newfed</code> <code>/joinfed</code> <code>/fban</code> <code>/unfban</code> <code>/fedinfo</code> <code>/fpromote</code>\n\n` +
  `🚨 <b>Anti-Raid</b>  <code>/antiraid</code> <code>/raid</code>\n\n` +
  `🎫 <b>Tickets</b>  <code>/ticket</code> <code>/tickets</code> <code>/close</code> <code>/assign</code> <code>/treply</code>\n\n` +
  `🎨 <b>Stickers</b>  <code>/kang</code> <code>/stickerinfo</code> <code>/getsticker</code>\n\n` +
  `📡 <b>Broadcast</b> <i>(owner)</i>  <code>/broadcast</code> <code>/broadcaststats</code>\n\n` +
  `📋 <b>Logs</b>  <code>/setlog</code> <code>/unsetlog</code> <code>/logchannel</code> <code>/schedule</code>\n\n` +
  `⭐ <b>XP</b>  <code>/xp</code> <code>/leaderboard</code>\n\n` +
  `━━━━━━━━━━━━━━━━━━━━\n` +
  `💡 Click <b>Browse Commands</b> below for detailed help per category.\n` +
  `Use <code>/panel</code> to open the full management interface.`;

// ── Help categories for inline keyboard navigation ───────────────────────

const HELP_CATEGORIES: Record<string, string[]> = {
  '🛡️ Moderation': [
    '/warn [@user|reply] [reason] — Warn a user',
    '/unwarn [@user|reply] — Remove a warning',
    '/warns [@user|reply] — Show user warnings',
    '/resetwarns [@user|reply] — Clear all warnings',
    '/mute [@user|reply] [reason] — Mute a user',
    '/unmute [@user|reply] — Unmute a user',
    '/tmute [@user|reply] [duration] — Temp mute',
    '/ban [@user|reply] [reason] — Ban a user',
    '/unban [@user|reply] — Unban a user',
    '/tban [@user|reply] [duration] [reason] — Temp ban',
    '/kick [@user|reply] [reason] — Kick a user',
    '/purge [count] — Delete recent messages',
  ],
  '👮 Admin Tools': [
    '/promote [@user|reply] — Promote to admin',
    '/demote [@user|reply] — Demote admin',
    '/admins — List all admins',
    '/id — Show user/chat ID',
    '/info — Show user/group info',
    '/ping — Check bot latency',
  ],
  '🔒 Locks & Filters': [
    '/lock <type> — Lock a message type',
    '/unlock <type> — Unlock a message type',
    '/locks — Show all locks',
    '/addfilter <keyword> <response> — Add auto-reply',
    '/delfilter <keyword> — Remove filter',
    '/filters — List all keyword filters',
    '/blacklist <word> — Add word to blacklist',
    '/unblacklist <word> — Remove from blacklist',
    '/blacklistmode <action> — Set blacklist action',
  ],
  '👋 Greetings': [
    '/setwelcome [text] — Set welcome message',
    '/setgoodbye [text] — Set goodbye message',
    '/setrules [text] — Set group rules',
    '/welcome — Preview welcome message',
    '/rules — Show group rules',
  ],
  '📊 Reports & Polls': [
    '/report [reply] [reason] — Report a user',
    '/reports — View pending reports (admin)',
    '/poll <question> | <opt1> | <opt2> — Create a poll',
    '/quiz <question> | <correct> | <wrong> — Create quiz',
    '/stoppoll [reply] — Stop a poll',
  ],
  '📝 Notes & Schedule': [
    '/savenote <name> [text] — Save a note',
    '/note <name> — Get a note',
    '/delnote <name> — Delete a note',
    '/notes — List all notes',
    '/schedule — Manage scheduled messages',
  ],
  '🎮 Fun & Games': [
    '/games — Open mini app games',
    '/game <id> — Play a specific game',
    '/joke — Get a random joke',
    '/quote — Get a random quote',
    '/dice — Roll a dice',
    '/coin — Flip a coin',
    '/8ball <question> — Ask the magic 8-ball',
    '/afk [reason] — Set AFK status',
  ],
  '⚙️ Bot Settings': [
    '/panel — Open Mini App control panel',
    '/setlog — Set log channel',
    '/unsetlog — Remove log channel',
    '/logchannel — Show current log channel',
    '/nightmode — Toggle night mode',
    '/antiflood — Toggle flood protection',
    '/antilink — Toggle link protection',
    '/help — Show this message',
  ],
  '🛡️ Federation': [
    '/newfed <name> — Create a new federation',
    '/joinfed <code> — Join group to a federation',
    '/leavefed — Leave current federation',
    '/fedinfo — Show federation details',
    '/myfeds — List federations you own',
    '/fedchats — List member groups',
    '/fban <user> [reason] — Ban across all fed groups',
    '/unfban <user> — Unban from federation',
    '/fbans — List federation bans',
    '/fpromote <user> — Add federation admin',
    '/fdemote <user> — Remove federation admin',
    '/fedadmins — List federation admins',
    '/fbroadcast <text> — Broadcast to all fed groups',
  ],
  '🚨 Anti-Raid': [
    '/antiraid — Show anti-raid settings',
    '/antiraid on/off — Enable/disable',
    '/antiraid threshold <n> — Set joins/min threshold',
    '/antiraid mode <restrict|ban|captcha|lockdown>',
    '/antiraid duration <mins> — Set auto-end duration',
    '/raid on — Manually trigger raid mode',
    '/raid off — Manually end raid mode',
  ],
  '🎫 Tickets': [
    '/ticket <subject> — Open a support ticket',
    '/tickets — List open tickets (admin)',
    '/close <id> — Close a ticket',
    '/assign <id> <@admin> — Assign ticket',
    '/escalate <id> — Escalate priority',
    '/treply <id> <message> — Reply to ticket',
  ],
  '🎨 Stickers': [
    '/kang — Reply to sticker to steal it',
    '/stickerinfo — Reply to sticker for info',
    '/getsticker — Reply to sticker to get as file',
  ],
  '📡 Broadcast': [
    '/broadcast <message> — Send to all groups (owner)',
    '/broadcaststats — Show last broadcast stats',
  ],
};

export function registerStartHandlers(bot: Bot, sessionId: string): void {
  // ── /start ──────────────────────────────────────────────────────────────

  bot.command('start', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    const botInfo = ctx.me;
    const botName = botInfo.first_name || botInfo.username || 'Botwave';
    const miniappUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';

    if (ctx.chat.type === 'private') {
      const template = config.start_text || DEFAULT_START_PRIVATE;
      const text = formatMessage(template, {
        first_name: ctx.from?.first_name || 'there',
        bot_name: botName,
      });

      const keyboard = new InlineKeyboard();

      if (miniappUrl) {
        keyboard.webApp('📱 Open Panel', miniappUrl).row();
      }

      keyboard
        .text('❓ Commands', 'help_main')
        .text('📖 Categories', 'help_categories')
        .row()
        .url('➕ Add to Group', `https://t.me/${botInfo.username}?startgroup=true`)
        .row();

      await ctx.reply(appendFooter(text), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      // Group: silently init, try to DM the admin with setup instructions
      const user = ctx.from;
      if (!user) {
        const totalCmds = Object.values(HELP_CATEGORIES).reduce((a, b) => a + b.length, 0);
        await ctx.reply(
          `👋 Hi! I'm <b>${botName}</b> — a powerful group management bot.\n\nUse /help to see all <b>${totalCmds}+</b> available commands.`,
          { parse_mode: 'HTML' },
        );
        return;
      }

      const template = config.start_group_dm_text || DEFAULT_START_GROUP_DM;
      const dmText = formatMessage(template, {
        first_name: user.first_name || 'there',
        bot_name: botName,
        group_name: ctx.chat.title || 'your group',
      });

      const dmKeyboard = new InlineKeyboard();
      if (miniappUrl) {
        dmKeyboard.webApp('⚡ Open Settings', miniappUrl).row();
      }
      dmKeyboard.text('❓ Commands', 'help_main').text('📖 Categories', 'help_categories');

      try {
        await ctx.api.sendMessage(user.id, appendFooter(dmText), {
          parse_mode: 'HTML',
          reply_markup: dmKeyboard,
        });
        await ctx.reply(
          `✅ I've sent you setup instructions in DM, ${user.first_name}!`,
        );
      } catch {
        await ctx.reply(
          `👋 Hi! To set me up, please ` +
          `<a href="https://t.me/${botInfo.username}?start=setup">start a DM with me</a> first.`,
          { parse_mode: 'HTML' },
        );
      }
    }
  });

  // ── /help ───────────────────────────────────────────────────────────────

  bot.command('help', async (ctx) => {
    await sendHelpMessage(ctx, sessionId);
  });

  // ── /panel — open mini app directly ─────────────────────────────────────

  bot.command('panel', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    const miniappUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';

    if (!miniappUrl) {
      await ctx.reply(
        '❌ Mini App URL not configured.\n\nUse /setgamesurl to set it, or configure it on your Botwave dashboard.',
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .webApp('⚡ Open Settings Panel', miniappUrl);

    await ctx.reply('📱 <b>Open the panel below to manage your bot:</b>', {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  });

  // ── /setstart — customize start message ─────────────────────────────────

  bot.command('setstart', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        'Usage: /setstart <message text>\n\n' +
        'Variables: {first_name}, {bot_name}, {group_name}\n' +
        'HTML formatting supported.',
      );
      return;
    }
    await updateTelegramConfig(sessionId, { start_text: text });
    await ctx.reply('✅ Start message updated!');
  });

  // ── /sethelp — customize help message ───────────────────────────────────

  bot.command('sethelp', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        'Usage: /sethelp <message text>\n\n' +
        'Variables: {bot_name}\n' +
        'HTML formatting supported.',
      );
      return;
    }
    await updateTelegramConfig(sessionId, { help_text: text });
    await ctx.reply('✅ Help message updated!');
  });

  // ── /resetstart — reset start message to default ───────────────────────

  bot.command('resetstart', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { start_text: null });
    await ctx.reply('✅ Start message reset to default.');
  });

  // ── /resethelp — reset help message to default ─────────────────────────

  bot.command('resethelp', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { help_text: null });
    await ctx.reply('✅ Help message reset to default.');
  });

  // ── /setstartbuttons — set custom inline buttons on /start ─────────────

  bot.command('setstartbuttons', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        '📝 <b>Set Start Buttons</b>\n\n' +
        'Usage: <code>/setstartbuttons &lt;json&gt;</code>\n\n' +
        '<b>Example:</b>\n' +
        '<code>[{"text":"🌐 Website","url":"https://example.com"}]</code>\n\n' +
        'Use <code>/setstartbuttons clear</code> to remove custom buttons.',
        { parse_mode: 'HTML' },
      );
      return;
    }
    if (text.toLowerCase() === 'clear') {
      await updateTelegramConfig(sessionId, {} as Record<string, unknown>);
      await ctx.reply('✅ Custom start buttons removed.');
      return;
    }
    try {
      const buttons = JSON.parse(text);
      if (!Array.isArray(buttons)) throw new Error('Must be an array');
      for (const btn of buttons) {
        if (!btn.text) throw new Error('Each button needs "text"');
        if (!btn.url && !btn.callback_data) throw new Error('Each button needs "url" or "callback_data"');
      }
      await updateTelegramConfig(sessionId, { start_buttons_json: text } as Record<string, unknown>);
      await ctx.reply(`✅ Updated ${buttons.length} custom button${buttons.length === 1 ? '' : 's'}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.reply(`❌ Invalid JSON: ${msg}`);
    }
  });

  // ── Callback: help_main (from /start buttons) ──────────────────────────

  bot.callbackQuery('help_main', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendHelpMessage(ctx, sessionId);
  });

  // ── Callback: help category navigation ─────────────────────────────────

  bot.callbackQuery(/^help_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const idx = parseInt(ctx.match![1]);
    const categories = Object.entries(HELP_CATEGORIES);

    if (idx < 0 || idx >= categories.length) return;

    const [name, cmds] = categories[idx];
    const text = `<b>${name}</b>\n\n` + cmds.map(c => `  ${c}`).join('\n') + `\n\n<i>${cmds.length} commands</i>`;

    const backBtn = new InlineKeyboard().text('← Back to Categories', 'help_back').row().text('🏠 Main Help', 'help_main');

    try {
      await ctx.editMessageText(appendFooter(text), {
        parse_mode: 'HTML',
        reply_markup: backBtn,
      });
    } catch {
      await ctx.reply(appendFooter(text), {
        parse_mode: 'HTML',
        reply_markup: backBtn,
      });
    }
  });

  // ── Callback: help_back — show category list ───────────────────────────

  bot.callbackQuery('help_back', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = buildCategoryKeyboard();
    const totalCmds = Object.values(HELP_CATEGORIES).reduce((a, b) => a + b.length, 0);
    const catMsg = `❓ <b>Help Categories</b>\n\n<b>${Object.keys(HELP_CATEGORIES).length}</b> categories • <b>${totalCmds}</b> commands\n\nChoose a category:`;

    try {
      await ctx.editMessageText(
        appendFooter(catMsg),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    } catch {
      await ctx.reply(
        appendFooter(catMsg),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    }
  });

  // ── Callback: help_categories — show interactive category picker ───────

  bot.callbackQuery('help_categories', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = buildCategoryKeyboard();
    const totalCmds = Object.values(HELP_CATEGORIES).reduce((a, b) => a + b.length, 0);
    const catMsg = `❓ <b>Help Categories</b>\n\n<b>${Object.keys(HELP_CATEGORIES).length}</b> categories • <b>${totalCmds}</b> commands\n\nChoose a category:`;

    try {
      await ctx.editMessageText(
        appendFooter(catMsg),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    } catch {
      await ctx.reply(
        appendFooter(catMsg),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    }
  });
}

// ── Helper: build category keyboard ──────────────────────────────────────

function buildCategoryKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const categories = Object.keys(HELP_CATEGORIES);
  for (let i = 0; i < categories.length; i += 2) {
    keyboard.text(categories[i], `help_${i}`);
    if (categories[i + 1]) {
      keyboard.text(categories[i + 1], `help_${i + 1}`);
    }
    keyboard.row();
  }
  keyboard.text('🏠 Main Help', 'help_main');
  return keyboard;
}

// ── Helper: send help message with mini app + categories ─────────────────

async function sendHelpMessage(
  ctx: { reply: (...args: any[]) => Promise<any>; me: any },
  sessionId: string,
): Promise<void> {
  const config = await getTelegramConfig(sessionId);
  const botInfo = ctx.me;
  const botName = botInfo.first_name || botInfo.username || 'Botwave';
  const miniappUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';

  const template = config.help_text || DEFAULT_HELP_TEXT;
  const text = formatMessage(template, {
    bot_name: botName,
  });

  const keyboard = new InlineKeyboard();

  if (miniappUrl) {
    keyboard.webApp('📱 Open Mini App', miniappUrl).row();
  }

  keyboard.text('📖 Browse Commands', 'help_categories').row();

  await ctx.reply(appendFooter(text), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}
