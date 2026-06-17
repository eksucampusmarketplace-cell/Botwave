/**
 * Miscellaneous utility handlers for Telegram userbot.
 * Commands: .alive, .ping, .info, .id, .stats, .repo, .help
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';
import { getUserbotConfig } from '../utils/db';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

const startTime = Date.now();

export const aliveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const config = await getUserbotConfig(sessionId);

  const uptime = formatUptime(Date.now() - startTime);
  const me = await client.getMe() as Api.User;

  const text = config.alive_message
    + `\n\n👤 ${me.firstName || ''} ${me.lastName || ''}`.trim()
    + `\n⏱️ Uptime: ${uptime}`
    + `\n📡 Connected via proxy`
    + `\n🔧 BotWave Userbot v1.0`;

  await shortPause();

  if (shouldShowTyping() && msg.chatId) {
    try {
      const peer = await client.getInputEntity(msg.chatId);
      await client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await typingDelay(text.length);
    } catch {}
  }

  // If alive_image is set, send as photo with caption
  if (config.alive_image && msg.chatId) {
    try {
      await client.sendFile(msg.chatId, {
        file: config.alive_image,
        caption: text,
        forceDocument: false,
      });
      await msg.delete({ revoke: true });
      return;
    } catch {
      // Fall back to text-only if image fails
    }
  }

  await msg.edit({ text });
};

export const pingHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const start = Date.now();

  await client.invoke(new Api.Ping({ pingId: BigInt(Math.floor(Math.random() * 1e15)) as any }));
  const latency = Date.now() - start;

  await shortPause();
  await msg.edit({ text: `🏓 Pong! Latency: ${latency}ms` });
};

export const infoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;

  let targetEntity: Api.User | null = null;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        const entity = await client.getEntity(replied[0].senderId);
        if (entity instanceof Api.User) targetEntity = entity;
      }
    } catch {}
  }

  const args = (msg.text || '').split(/\s+/).slice(1);
  if (!targetEntity && args[0]) {
    try {
      const entity = await client.getEntity(args[0]);
      if (entity instanceof Api.User) targetEntity = entity;
    } catch {}
  }

  if (!targetEntity) {
    try {
      targetEntity = await client.getMe() as Api.User;
    } catch {}
  }

  if (!targetEntity) {
    await msg.edit({ text: '❌ Could not find user.' });
    return;
  }

  const u = targetEntity;
  const lines = [
    `📋 **User Info**`,
    `**Name:** ${u.firstName || ''} ${u.lastName || ''}`.trim(),
    u.username ? `**Username:** @${u.username}` : null,
    `**ID:** \`${u.id}\``,
    `**Bot:** ${u.bot ? 'Yes' : 'No'}`,
    `**Verified:** ${u.verified ? 'Yes' : 'No'}`,
    `**Restricted:** ${u.restricted ? 'Yes' : 'No'}`,
    `**Scam:** ${u.scam ? 'Yes' : 'No'}`,
    `**Premium:** ${u.premium ? 'Yes' : 'No'}`,
  ].filter(Boolean);

  await shortPause();
  await msg.edit({ text: lines.join('\n') });
};

export const idHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;

  let text = `💬 **Chat ID:** \`${chatId}\``;

  if (msg.replyTo && chatId) {
    try {
      const replied = await client.getMessages(chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.senderId) {
        text += `\n👤 **User ID:** \`${replied[0].senderId}\``;
      }
    } catch {}
  }

  const me = await client.getMe() as Api.User;
  text += `\n🤖 **My ID:** \`${me.id}\``;

  await shortPause();
  await msg.edit({ text });
};

export const statsHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;

  await msg.edit({ text: '📊 Gathering stats...' });

  try {
    const dialogs = await client.getDialogs({ limit: 500 });
    let groups = 0;
    let channels = 0;
    let users = 0;
    let bots = 0;

    for (const d of dialogs) {
      if (d.isGroup) groups++;
      else if (d.isChannel) channels++;
      else if (d.entity instanceof Api.User) {
        if (d.entity.bot) bots++;
        else users++;
      }
    }

    const uptime = formatUptime(Date.now() - startTime);
    const text = [
      `📊 **Account Stats**`,
      `👥 Groups: ${groups}`,
      `📢 Channels: ${channels}`,
      `👤 Users: ${users}`,
      `🤖 Bots: ${bots}`,
      `📁 Total dialogs: ${dialogs.length}`,
      `⏱️ Uptime: ${uptime}`,
    ].join('\n');

    await shortPause();
    await msg.edit({ text });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Stats failed: ${errorMsg}` });
  }
};

const HELP_MODULES: { name: string; emoji: string; commands: string[] }[] = [
  { name: 'Admin', emoji: '🛡️', commands: ['ban', 'unban', 'kick', 'mute', 'unmute', 'promote', 'demote', 'pin', 'unpin'] },
  { name: 'PM Permit', emoji: '🔒', commands: ['approve', 'disapprove', 'block', 'unblock', 'pmguard on/off'] },
  { name: 'AFK', emoji: '💤', commands: ['afk [reason]', 'unafk'] },
  { name: 'Notes', emoji: '📝', commands: ['save <name> <text>', 'get <name>', 'notes', 'clear <name>'] },
  { name: 'Filters', emoji: '🔍', commands: ['filter <keyword> <response>', 'filters', 'stop <keyword>'] },
  { name: 'Purge', emoji: '🗑️', commands: ['purge (reply)', 'purgeme <count>', 'del (reply)'] },
  { name: 'GBan', emoji: '🔨', commands: ['gban', 'ungban', 'gbanlist'] },
  { name: 'Stickers', emoji: '🎨', commands: ['kang (reply)', 'stickerid', 'getsticker', 'stickers'] },
  { name: 'Chat Tools', emoji: '💬', commands: ['chatinfo', 'admins', 'invite <user>', 'leave', 'setname', 'setbio', 'username', 'zombies', 'groupname', 'groupbio'] },
  { name: 'Text Tools', emoji: '✏️', commands: ['reverse', 'mock', 'vapor', 'tiny', 'flip', 'b64encode', 'b64decode', 'upper', 'lower', 'clap', 'spoiler', 'mono', 'strike'] },
  { name: 'Search', emoji: '🔎', commands: ['google <query>', 'wiki <query>', 'calc <expr>', 'currency <from> <to> <amt>', 'time <city>'] },
  { name: 'Translate', emoji: '🌍', commands: ['tr <lang> <text>', 'translate <lang> <text>', 'langs'] },
  { name: 'Fun', emoji: '🎮', commands: ['dice', 'dart', 'slot', 'basketball', 'football', 'bowling', 'coinflip', 'rng <min> <max>', '8ball <question>', 'rate', 'pp', 'decide', 'roll'] },
  { name: 'Reminders', emoji: '⏰', commands: ['remind <time> <text>', 'reminders', 'cancelremind <id>', 'clearreminders'] },
  { name: 'Media', emoji: '📁', commands: ['download (reply)', 'forward (reply)', 'copy (reply)', 'mediainfo (reply)'] },
  { name: 'Antiflood', emoji: '🚫', commands: ['antiflood <count>', 'antiflood off'] },
  { name: 'Welcome', emoji: '👋', commands: ['setwelcome <text>', 'setgoodbye <text>', 'welcome', 'goodbye'] },
  { name: 'Settings', emoji: '⚙️', commands: ['setprefix <char>', 'setalive <msg>', 'setlog here/off/<id>', 'addsudo <user>', 'rmsudo <user>', 'lang [set/list/reset] <code>'] },
  { name: 'Utility', emoji: '🔧', commands: ['alive', 'ping', 'info', 'id', 'stats', 'help'] },
];

export const helpHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const config = await getUserbotConfig(sessionId);
  const p = config.prefix;
  const args = (msg.text || '').split(/\s+/).slice(1);

  // .help <module> - show specific module
  if (args[0]) {
    const query = args[0].toLowerCase();
    const mod = HELP_MODULES.find(m => m.name.toLowerCase() === query || m.name.toLowerCase().replace(/\s/g, '') === query);
    if (mod) {
      const cmds = mod.commands.map(c => `  \`${p}${c}\``).join('\n');
      await msg.edit({ text: `${mod.emoji} **${mod.name} Commands**\n\n${cmds}` });
      return;
    }
  }

  // Default: full help overview
  const sections = HELP_MODULES.map(mod => {
    const cmds = mod.commands.map(c => `\`${p}${c.split(' ')[0]}\``).join(' ');
    return `${mod.emoji} **${mod.name}**\n${cmds}`;
  });

  const text = [
    `📖 **BotWave Userbot Help**`,
    `Prefix: \`${p}\` | Modules: ${HELP_MODULES.length}`,
    `Use \`${p}help <module>\` for detailed commands`,
    ``,
    ...sections,
  ].join('\n\n');

  await shortPause();
  await msg.edit({ text, parseMode: 'md' });
};

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export const miscHandlers: Record<string, HandlerFn> = {
  alive: aliveHandler,
  ping: pingHandler,
  info: infoHandler,
  id: idHandler,
  stats: statsHandler,
  help: helpHandler,
};
