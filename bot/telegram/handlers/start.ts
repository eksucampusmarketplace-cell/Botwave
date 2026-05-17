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
  `👋 Hi {first_name}!\n\n` +
  `I'm <b>{bot_name}</b>, a smart group management bot.\n\n` +
  `🔧 <b>Need help or support?</b>\n` +
  `All support is handled through our main channels below.\n\n` +
  `📱 <b>Managing a group?</b>\n` +
  `Add me to your group and open the Mini App to configure everything.`;

const DEFAULT_START_GROUP_DM =
  `👋 Hey {first_name}!\n\n` +
  `I've been added to <b>{group_name}</b>. Let's get set up!\n\n` +
  `Open the Mini App below to configure commands, auto-moderation, ` +
  `welcome messages, and more.\n\n` +
  `Tip: Start with the <b>Commands</b> tab to enable the features you need.`;

const DEFAULT_HELP_TEXT =
  `⚡ <b>{bot_name} Commands</b>\n\n` +
  `<b>📱 Open the Mini App for full command documentation</b>\n` +
  `All commands are listed with detailed descriptions and usage examples.\n` +
  `Configure all features deeply through the visual interface.\n\n` +
  `<b>🛡️ Quick Reference:</b>\n\n` +
  `<b>Moderation:</b> /ban, /unban, /tban, /mute, /unmute, /tmute, /kick\n` +
  `<b>Warnings:</b> /warn, /unwarn, /warns, /resetwarns\n` +
  `<b>Admin:</b> /promote, /demote, /admins, /id, /info\n` +
  `<b>Security:</b> /antiflood, /antilink, /captcha, /nightmode\n` +
  `<b>Locks:</b> /lock, /unlock, /locks\n` +
  `<b>Blacklist:</b> /blacklist, /unblacklist, /blacklistmode\n` +
  `<b>Notes:</b> /savenote, /note, /delnote, /notes\n` +
  `<b>Filters:</b> /addfilter, /delfilter, /filters\n` +
  `<b>Reports:</b> /report, /reports\n` +
  `<b>Polls:</b> /poll, /quiz, /stoppoll\n` +
  `<b>Schedule:</b> /schedule\n` +
  `<b>Log:</b> /setlog, /unsetlog, /logchannel\n` +
  `<b>Fun:</b> /joke, /quote, /dice, /coin, /8ball, /afk\n` +
  `<b>Games:</b> /games, /game\n` +
  `<b>Group:</b> /rules, /setrules, /pin, /unpin, /purge, /del\n` +
  `<b>XP:</b> /xp, /leaderboard\n` +
  `<b>Federation:</b> /newfed, /joinfed, /fban, /unfban, /fedinfo\n` +
  `<b>Anti-Raid:</b> /antiraid, /raid\n` +
  `<b>Tickets:</b> /ticket, /tickets, /close, /assign, /treply\n` +
  `<b>Stickers:</b> /kang, /stickerinfo, /getsticker\n` +
  `<b>Broadcast:</b> /broadcast, /broadcaststats\n` +
  `<b>Utility:</b> /ping\n\n` +
  `💡 <b>Tip:</b> Use /panel to open the full management interface.`;

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
        .text('❓ Help', 'help_main')
        .url('💬 Support', `https://t.me/${botInfo.username}`)
        .row();

      await ctx.reply(appendFooter(text), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      // Group: silently init, try to DM the admin with setup instructions
      const user = ctx.from;
      if (!user) {
        await ctx.reply('👋 Hi! Use /help to see available commands.');
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
      dmKeyboard.text('❓ Help', 'help_main');

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
    await ctx.reply('✅ Start message updated.');
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
    await ctx.reply('✅ Help message updated.');
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
    const text = `<b>${name}</b>\n\n` + cmds.map(c => `• ${c}`).join('\n');

    const backBtn = new InlineKeyboard().text('← Back', 'help_back');

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

    try {
      await ctx.editMessageText(
        appendFooter('❓ <b>Help Categories</b>\n\nChoose a category:'),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    } catch {
      await ctx.reply(
        appendFooter('❓ <b>Help Categories</b>\n\nChoose a category:'),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    }
  });

  // ── Callback: help_categories — show interactive category picker ───────

  bot.callbackQuery('help_categories', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = buildCategoryKeyboard();

    try {
      await ctx.editMessageText(
        appendFooter('❓ <b>Help Categories</b>\n\nChoose a category:'),
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
    } catch {
      await ctx.reply(
        appendFooter('❓ <b>Help Categories</b>\n\nChoose a category:'),
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
