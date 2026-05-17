/**
 * Telegram Bot Command Router
 * 
 * Routes incoming Telegram messages to appropriate command handlers.
 * Maps existing Botwave commands + Telegram-specific moderation commands.
 */

import type { PlatformMessage, PlatformAdapter, TelegramBotConfig } from '../../../core/types';
import { TelegramBotAdapter } from './adapter';
import {
  handleBanCommand,
  handleUnbanCommand,
  handleMuteCommand,
  handleUnmuteCommand,
  handleKickCommand,
  handleWarnCommand,
  handleWarnsCommand,
  handlePinCommand,
  handleUnpinCommand,
  handleRulesCommand,
  handleSetRulesCommand,
  handleAdminsCommand,
  handlePurgeCommand,
} from './commands/moderation';
import {
  checkAntiFlood,
  isSpamMessage,
  containsLink,
  isNightModeActive,
  isLockedMediaType,
  hasPendingCaptcha,
  checkCaptchaAnswer,
  generateCaptcha,
  setCaptchaForUser,
  formatWelcomeMessage,
  handleFilterCommand,
  handleFiltersCommand,
  checkFilters,
  handleSaveNoteCommand,
  handleNoteCommand,
  handleNotesCommand,
} from './commands/groupManagement';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type CommandFn = (msg: PlatformMessage, adapter: PlatformAdapter, config: TelegramBotConfig) => Promise<void>;

const commands: Record<string, CommandFn> = {
  // Moderation
  ban: (msg, adapter) => handleBanCommand(msg, adapter),
  unban: (msg, adapter) => handleUnbanCommand(msg, adapter),
  mute: (msg, adapter) => handleMuteCommand(msg, adapter),
  unmute: (msg, adapter) => handleUnmuteCommand(msg, adapter),
  kick: (msg, adapter) => handleKickCommand(msg, adapter),
  warn: (msg, adapter, config) => handleWarnCommand(msg, adapter, config),
  warns: (msg, adapter) => handleWarnsCommand(msg, adapter),
  pin: (msg, adapter) => handlePinCommand(msg, adapter),
  unpin: (msg, adapter) => handleUnpinCommand(msg, adapter),
  rules: (msg, adapter, config) => handleRulesCommand(msg, adapter, config),
  setrules: (msg, adapter) => handleSetRulesCommand(msg, adapter),
  admins: (msg, adapter) => handleAdminsCommand(msg, adapter),
  purge: (msg, adapter) => handlePurgeCommand(msg, adapter),

  // Group management
  filter: (msg, adapter) => handleFilterCommand(msg, adapter),
  filters: (msg, adapter) => handleFiltersCommand(msg, adapter),
  savenote: (msg, adapter) => handleSaveNoteCommand(msg, adapter),
  note: (msg, adapter) => handleNoteCommand(msg, adapter),
  notes: (msg, adapter) => handleNotesCommand(msg, adapter),

  // Core Botwave features
  help: async (msg, adapter) => {
    const helpText = `🤖 *Botwave Telegram Bot*\n\n` +
      `*General:*\n` +
      `/help - Show this help\n` +
      `/start - Welcome message\n` +
      `/ping - Check bot status\n` +
      `/id - Get user/chat ID\n` +
      `/info - Get user info\n\n` +
      `*AI:*\n` +
      `/ai <question> - Ask AI anything\n\n` +
      `*Fun:*\n` +
      `/joke - Random joke\n` +
      `/quote - Inspirational quote\n` +
      `/fact - Random fact\n` +
      `/meme - Random meme\n\n` +
      `*Games:*\n` +
      `/trivia - Start trivia\n` +
      `/wordgame - Word game\n\n` +
      `*Tools:*\n` +
      `/weather <city> - Weather info\n` +
      `/define <word> - Dictionary\n` +
      `/translate <lang> <text> - Translate\n\n` +
      `*Media:*\n` +
      `/sticker - Reply to image to make sticker\n` +
      `/download <url> - Download media\n\n` +
      `*Moderation (admins):*\n` +
      `/ban - Ban user\n` +
      `/unban - Unban user\n` +
      `/mute [duration] - Mute user\n` +
      `/unmute - Unmute user\n` +
      `/kick - Kick user\n` +
      `/warn - Warn user\n` +
      `/warns - Check warnings\n` +
      `/purge - Delete messages\n` +
      `/pin - Pin message\n` +
      `/unpin - Unpin message\n` +
      `/rules - Show group rules\n` +
      `/setrules - Set group rules\n` +
      `/admins - List admins\n\n` +
      `*Notes & Filters:*\n` +
      `/filter <keyword> <response>\n` +
      `/filters - List filters\n` +
      `/savenote <name> <content>\n` +
      `/note <name> - Get note\n` +
      `/notes - List notes\n\n` +
      `_Powered by Botwave - botwave.online_`;
    await adapter.sendText(msg.chatId, helpText, { parseMode: 'Markdown' });
  },

  start: async (msg, adapter) => {
    if (msg.isGroup) return;
    await adapter.sendText(
      msg.chatId,
      `Welcome to Botwave! 🤖\n\nI'm your Telegram bot powered by Botwave.\nUse /help to see all available commands.\n\nManage me at botwave.online`,
    );
  },

  ping: async (msg, adapter) => {
    const latency = Date.now() - msg.timestamp;
    await adapter.sendText(msg.chatId, `🏓 Pong! Latency: ${latency}ms`);
  },

  id: async (msg, adapter) => {
    let text = `Your ID: ${msg.sender.id}\nChat ID: ${msg.chatId}`;
    if (msg.sender.username) text += `\nUsername: @${msg.sender.username}`;
    await adapter.sendText(msg.chatId, text);
  },

  info: async (msg, adapter) => {
    const user = msg.sender;
    let text = `User Info:\n` +
      `ID: ${user.id}\n` +
      `Name: ${user.displayName}`;
    if (user.username) text += `\nUsername: @${user.username}`;
    await adapter.sendText(msg.chatId, text);
  },

  ai: async (msg, adapter) => {
    const question = msg.commandArgs?.join(' ');
    if (!question) {
      await adapter.sendText(msg.chatId, 'Usage: /ai <your question>');
      return;
    }
    try {
      const { getAIResponse } = await import('./aiHandler');
      const response = await getAIResponse(msg.sessionId, question, msg.sender.displayName);
      await adapter.sendText(msg.chatId, response, { replyToMessageId: msg.id });
    } catch (err) {
      console.error(`[TG-BOT:${msg.sessionId}] AI error:`, err);
      await adapter.sendText(msg.chatId, 'AI is currently unavailable. Please try again later.');
    }
  },

  joke: async (msg, adapter) => {
    try {
      const res = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await res.json();
      await adapter.sendText(msg.chatId, `${data.setup}\n\n${data.punchline} 😄`);
    } catch {
      await adapter.sendText(msg.chatId, 'Could not fetch a joke right now. Try again!');
    }
  },

  quote: async (msg, adapter) => {
    try {
      const res = await fetch('https://api.quotable.io/random');
      const data = await res.json();
      await adapter.sendText(msg.chatId, `"${data.content}"\n\n— ${data.author}`);
    } catch {
      await adapter.sendText(msg.chatId, '"The best time to start is now." — Unknown');
    }
  },

  fact: async (msg, adapter) => {
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
      const data = await res.json();
      await adapter.sendText(msg.chatId, `💡 ${data.text}`);
    } catch {
      await adapter.sendText(msg.chatId, '💡 Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.');
    }
  },

  weather: async (msg, adapter) => {
    const city = msg.commandArgs?.join(' ');
    if (!city) {
      await adapter.sendText(msg.chatId, 'Usage: /weather <city>');
      return;
    }
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      await adapter.sendText(msg.chatId, 'Weather service not configured.');
      return;
    }
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
      const data = await res.json();
      if (data.cod !== 200) {
        await adapter.sendText(msg.chatId, `Could not find weather for "${city}".`);
        return;
      }
      const text = `🌤 Weather in ${data.name}:\n` +
        `Temperature: ${data.main.temp}°C (feels like ${data.main.feels_like}°C)\n` +
        `Conditions: ${data.weather[0].description}\n` +
        `Humidity: ${data.main.humidity}%\n` +
        `Wind: ${data.wind.speed} m/s`;
      await adapter.sendText(msg.chatId, text);
    } catch {
      await adapter.sendText(msg.chatId, 'Weather service error. Try again.');
    }
  },
};

// ─── Message Processing Pipeline ────────────────────────────────────────────

export async function processMessage(
  msg: PlatformMessage,
  adapter: TelegramBotAdapter,
  config: TelegramBotConfig,
): Promise<void> {
  // Skip bot messages
  if (msg.sender.isBot) return;

  // CAPTCHA check: if user has pending captcha, check their answer
  if (msg.isGroup && hasPendingCaptcha(msg.chatId, msg.sender.id)) {
    if (msg.text && checkCaptchaAnswer(msg.chatId, msg.sender.id, msg.text)) {
      await adapter.sendText(msg.chatId, `${msg.sender.displayName} passed verification! Welcome! ✅`);
      await adapter.unmuteUser(msg.chatId, msg.sender.id);
    }
    return; // Don't process other commands while captcha is pending
  }

  // Night mode: mute non-admin messages during night hours
  if (msg.isGroup && isNightModeActive(config)) {
    const admins = await adapter.getChatAdmins(msg.chatId);
    const isAdmin = admins.some(a => a.id === msg.sender.id);
    if (!isAdmin) {
      await adapter.deleteMessage(msg.chatId, msg.id);
      return;
    }
  }

  // Anti-flood: check message rate
  if (msg.isGroup && config.antifloodEnabled) {
    if (checkAntiFlood(msg.chatId, msg.sender.id, config.antifloodMaxPerMin)) {
      await adapter.muteUser(msg.chatId, msg.sender.id, Math.floor(Date.now() / 1000) + 300);
      await adapter.sendText(msg.chatId, `${msg.sender.displayName} has been muted for 5 minutes (flooding).`);
      return;
    }
  }

  // Anti-spam: detect spam patterns
  if (msg.isGroup && config.antispamEnabled && msg.text) {
    if (isSpamMessage(msg.text)) {
      await adapter.deleteMessage(msg.chatId, msg.id);
      await adapter.sendText(msg.chatId, `⚠️ Spam detected from ${msg.sender.displayName}. Message removed.`);
      return;
    }
  }

  // Anti-link: block unauthorized links
  if (msg.isGroup && config.antilinkEnabled && msg.text) {
    if (containsLink(msg.text, config.antilinkWhitelist)) {
      const admins = await adapter.getChatAdmins(msg.chatId);
      const isAdmin = admins.some(a => a.id === msg.sender.id);
      if (!isAdmin) {
        await adapter.deleteMessage(msg.chatId, msg.id);
        await adapter.sendText(msg.chatId, `⚠️ Links are not allowed in this group.`);
        return;
      }
    }
  }

  // Locked media types
  if (msg.isGroup && isLockedMediaType(msg, config.lockedTypes)) {
    const admins = await adapter.getChatAdmins(msg.chatId);
    const isAdmin = admins.some(a => a.id === msg.sender.id);
    if (!isAdmin) {
      await adapter.deleteMessage(msg.chatId, msg.id);
      return;
    }
  }

  // Process commands
  if (msg.isCommand && msg.commandName) {
    const handler = commands[msg.commandName];
    if (handler) {
      try {
        await handler(msg, adapter, config);
      } catch (err) {
        console.error(`[TG-BOT:${msg.sessionId}] Command ${msg.commandName} error:`, err);
      }
      return;
    }
  }

  // Check custom filters
  if (msg.text) {
    const filterMatched = await checkFilters(msg, adapter);
    if (filterMatched) return;
  }

  // Auto-reply: check keyword triggers from dashboard
  if (msg.text && supabase) {
    try {
      const { data: autoReplies } = await supabase
        .from('auto_replies')
        .select('trigger_keyword, response_text, is_regex')
        .eq('session_id', msg.sessionId)
        .eq('enabled', true);

      if (autoReplies) {
        for (const reply of autoReplies) {
          const text = msg.text.toLowerCase();
          const matches = reply.is_regex
            ? new RegExp(reply.trigger_keyword, 'i').test(text)
            : text.includes(reply.trigger_keyword.toLowerCase());

          if (matches) {
            await adapter.sendText(msg.chatId, reply.response_text, { replyToMessageId: msg.id });
            return;
          }
        }
      }
    } catch {
      // Non-critical
    }
  }
}

// ─── Member Event Handlers ──────────────────────────────────────────────────

export async function handleMemberJoin(
  chatId: string,
  users: Array<{ id: string; username?: string; firstName?: string; displayName: string }>,
  adapter: TelegramBotAdapter,
  config: TelegramBotConfig,
  sessionId: string,
): Promise<void> {
  for (const user of users) {
    // CAPTCHA: mute new user and send challenge
    if (config.captchaEnabled) {
      await adapter.muteUser(chatId, user.id);
      const captcha = generateCaptcha();
      setCaptchaForUser(chatId, user.id, captcha.answer);
      await adapter.sendText(
        chatId,
        `Welcome ${user.displayName}!\n\nPlease verify you're human.\n${captcha.question}\n\nYou have 2 minutes to answer.`,
      );
      continue;
    }

    // Welcome message
    if (config.welcomeMessage) {
      const text = formatWelcomeMessage(config.welcomeMessage, {
        name: user.displayName,
        username: user.username,
      });
      await adapter.sendText(chatId, text);
    }
  }
}

export async function handleMemberLeave(
  chatId: string,
  user: { id: string; displayName: string; username?: string },
  adapter: TelegramBotAdapter,
  config: TelegramBotConfig,
): Promise<void> {
  if (config.goodbyeMessage) {
    const text = formatWelcomeMessage(config.goodbyeMessage, {
      name: user.displayName,
      username: user.username,
    });
    await adapter.sendText(chatId, text);
  }
}
