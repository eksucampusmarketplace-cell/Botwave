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

  await msg.edit({ text });
};

export const pingHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const start = Date.now();

  await client.invoke(new Api.Ping({ pingId: BigInt(Math.floor(Math.random() * 1e15)) }));
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

export const helpHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const sessionId = (client as unknown as { _sessionId: string })._sessionId;
  const config = await getUserbotConfig(sessionId);
  const p = config.prefix;

  const text = [
    `📖 **BotWave Userbot Commands**`,
    `Prefix: \`${p}\``,
    ``,
    `**🛡️ Admin**`,
    `\`${p}ban\` \`${p}unban\` \`${p}kick\` \`${p}mute\` \`${p}unmute\``,
    `\`${p}promote\` \`${p}demote\` \`${p}pin\` \`${p}unpin\``,
    ``,
    `**🔒 PM Permit**`,
    `\`${p}approve\` \`${p}disapprove\` \`${p}block\` \`${p}unblock\` \`${p}pmguard\``,
    ``,
    `**💤 AFK**`,
    `\`${p}afk [reason]\` \`${p}unafk\``,
    ``,
    `**📝 Notes**`,
    `\`${p}save <name> <text>\` \`${p}get <name>\` \`${p}notes\` \`${p}clear <name>\``,
    ``,
    `**🔍 Filters**`,
    `\`${p}filter <keyword> <response>\` \`${p}filters\` \`${p}stop <keyword>\``,
    ``,
    `**🗑️ Purge**`,
    `\`${p}purge\` (reply) \`${p}purgeme <count>\` \`${p}del\` (reply)`,
    ``,
    `**🔨 GBan**`,
    `\`${p}gban\` \`${p}ungban\` \`${p}gbanlist\``,
    ``,
    `**🔧 Utility**`,
    `\`${p}alive\` \`${p}ping\` \`${p}info\` \`${p}id\` \`${p}stats\` \`${p}help\``,
    ``,
    `**⚙️ Settings**`,
    `\`${p}setprefix <char>\` \`${p}setafkmsg\` \`${p}setalive <msg>\``,
    `\`${p}setlog <chatid>\` \`${p}addsudo <user>\` \`${p}rmsudo <user>\``,
  ].join('\n');

  await shortPause();
  await msg.edit({ text });
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
