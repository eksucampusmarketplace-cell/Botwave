import { delay } from '../../lib/utils';
import { getUserSettings, getAfkState, setAfkState, getAutoReplies, incrementLeaderboard, getSessionUserId, trackCommand, trackMessage, getUserSubscription, incrementQuotaUsage, creditReward, checkAndCashout, getFeatureEnabled, getWelcomeMessage } from '../database';
import { MessageQueue } from '../utils/MessageQueue';
import {
  pickResponse,
  currentTimeStr,
  currentDateStr,
} from '../utils/antiban';
import {
  afkReplies,
  spamWarnings,
  autoReplyDefaults,
  welcomeReplies,
  goodbyeReplies,
} from '../utils/responsePools';
import {
  shouldSkipResponse,
  isGroupOnCooldown,
  markGroupReplied,
  addMessageJitter,
  getActivityConfig,
  shortenForQuietHours,
  naturalDelay,
  shouldThrottleContact,
  trackContactReply,
  checkBurstAndDelay,
  simulateGoingOnline,
  shouldSilentlyIgnore,
  trackWhoSentLast,
  shouldAvoidDoubleText,
  trackGroupMessage,
  getGroupReplyDelay,
} from '../utils/advancedAntiban';
import { getCommand, type MessageContext, type TemplateVars } from '../commands/registry';
import { sendUnknownCommand } from '../commands';
import { sendReply } from '../commands/helpers';

// Import all command modules to trigger self-registration
import '../commands';

const COMMAND_PREFIX = '!';
const RATE_LIMIT_WINDOW = 60000;

// ─── JID Normalization ──────────────────────────────────────────────────────

function normalizeJid(jid: string): string {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@').trim();
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const userMessageTracker: Map<string, number[]> = new Map();
const sessionMessageTracker: Map<string, number[]> = new Map();
const spamTracker: Map<string, { count: number; lastTime: number; warned: boolean }> = new Map();
const SPAM_THRESHOLD = 5;
const SPAM_WINDOW = 10000;

function isUserRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = userMessageTracker.get(userId) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recentTimestamps.length >= 20) {
    return true;
  }

  recentTimestamps.push(now);
  userMessageTracker.set(userId, recentTimestamps);
  return false;
}

function isSessionRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const timestamps = sessionMessageTracker.get(sessionId) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recentTimestamps.length >= 10) {
    return true;
  }

  recentTimestamps.push(now);
  sessionMessageTracker.set(sessionId, recentTimestamps);
  return false;
}

function isSpamming(userId: string): boolean {
  const now = Date.now();
  const tracker = spamTracker.get(userId);

  if (!tracker) {
    spamTracker.set(userId, { count: 1, lastTime: now, warned: false });
    return false;
  }

  if (now - tracker.lastTime > SPAM_WINDOW) {
    tracker.count = 1;
    tracker.lastTime = now;
    tracker.warned = false;
    return false;
  }

  tracker.count++;
  tracker.lastTime = now;

  if (tracker.count >= SPAM_THRESHOLD) {
    if (!tracker.warned) {
      tracker.warned = true;
      return true;
    }
    return false;
  }

  return false;
}

// ─── Message Deduplication ──────────────────────────────────────────────────

const processedMessages = new Set<string>();
const DEDUP_MAX_SIZE = 500;
const DEDUP_CLEANUP_AT = 600;

function isDuplicateMessage(msgId: string): boolean {
  if (processedMessages.has(msgId)) return true;

  processedMessages.add(msgId);
  if (processedMessages.size >= DEDUP_CLEANUP_AT) {
    const arr = Array.from(processedMessages);
    processedMessages.clear();
    for (const id of arr.slice(-DEDUP_MAX_SIZE)) {
      processedMessages.add(id);
    }
  }
  return false;
}

// ─── AFK Reply Cooldown ─────────────────────────────────────────────────────

const afkReplyCooldown: Map<string, number> = new Map();
const AFK_COOLDOWN_MS = 5 * 60 * 1000;

// ─── Main Message Handler ───────────────────────────────────────────────────

export async function handleMessage(message: any, sock: any, queue?: MessageQueue): Promise<void> {
  try {
    const chatJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    const msgId = message.key.id;

    if (msgId && isDuplicateMessage(msgId)) {
      return;
    }

    const content =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      '';

    if (fromMe && !content.trimStart().startsWith('!')) return;

    if (!content) return;

    // In groups, participant may be a LID (e.g. 94270639878349@lid).
    // participantPn gives the phone number JID even when participant is a LID.
    const rawParticipant = message.key.participant;
    const participantPn = (message.key as any).participantPn;
    const senderJid = normalizeJid(participantPn || rawParticipant || chatJid);
    const isGroup = chatJid.endsWith('@g.us');
    const isCommand = content.startsWith(COMMAND_PREFIX);
    const pushName = message.pushName || 'User';
    const sessionId = (sock as any).sessionId || queue?.['sessionId'];
    const userId = (sock as any).userId;

    // Owner detection: compare phone JID and also LID (WhatsApp's new format)
    const ownerJidEarly = (sock as any).user?.id ? normalizeJid((sock as any).user.id) : null;
    const ownerLidEarly = (sock as any).user?.lid ? normalizeJid((sock as any).user.lid) : null;
    const senderLidEarly = rawParticipant && rawParticipant.endsWith('@lid') ? normalizeJid(rawParticipant) : null;
    const isOwnerEarly = fromMe ||
      (ownerJidEarly && senderJid === ownerJidEarly) ||
      (ownerLidEarly && senderLidEarly && senderLidEarly === ownerLidEarly);

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      rawMessage: message,
      isGroup,
      isOwner: !!isOwnerEarly,
      pushName,
      sessionId,
      userId,
      queue,
    };

    if (!fromMe) trackWhoSentLast(chatJid, false);

    if (!isCommand && sessionId && isSessionRateLimited(sessionId)) {
      console.log(`Session rate limited: ${sessionId}`);
      return;
    }

    if (!isCommand && shouldSilentlyIgnore(isGroup, content, senderJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    if (isGroup && !isCommand && isSpamming(senderJid)) {
      const response = pickResponse(spamWarnings, { name: pushName, time: currentTimeStr() });
      await sendReply(chatJid, response, sock, message.key, queue);
      return;
    }

    if (isGroup && !isCommand && isGroupOnCooldown(chatJid)) {
      return;
    }

    if (!isCommand && shouldAvoidDoubleText(chatJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    if (isGroup) {
      trackGroupMessage(chatJid);
    }

    await simulateGoingOnline(sock);

    if (!isCommand && shouldThrottleContact(senderJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    let ownerSkipProbability: number | undefined;
    let ownerSettings: { afk_enabled?: boolean; afk_message?: string; skip_probability?: number } | null = null;
    if (userId) {
      try {
        ownerSettings = await getUserSettings(userId);
        ownerSkipProbability = ownerSettings?.skip_probability ?? undefined;
      } catch { /* non-critical */ }
    }

    if (shouldSkipResponse(isGroup, isCommand, ownerSkipProbability)) {
      try {
        await sock.readMessages([message.key]);
      } catch { /* non-critical */ }
      return;
    }

    if (sessionId) {
      await naturalDelay(sessionId);

      const burstDelay = checkBurstAndDelay(sessionId);
      if (burstDelay > 0) {
        await delay(burstDelay);
      }
    }

    if (isGroup) {
      const groupDelay = getGroupReplyDelay(chatJid);
      if (groupDelay > 0) {
        await delay(groupDelay);
      }
    }

    if (isGroup && sessionId && !isCommand) {
      incrementLeaderboard(sessionId, senderJid, pushName).catch(() => {});
    }

    if (sessionId) {
      const msgType = message.message?.imageMessage ? 'image'
        : message.message?.videoMessage ? 'video'
        : message.message?.audioMessage ? 'audio'
        : message.message?.stickerMessage ? 'sticker'
        : message.message?.documentMessage ? 'document'
        : 'text';
      trackMessage(
        sessionId,
        senderJid,
        pushName || null,
        content ? content.substring(0, 500) : null,
        msgType,
        isGroup,
        isGroup ? chatJid : null,
      ).catch(() => {});
    }

    await checkAfkMentions(context, sock);

    if (!isGroup && !isCommand && sessionId) {
      const rawOwnerJid = (sock as any).user?.id;
      const ownerJid = rawOwnerJid ? normalizeJid(rawOwnerJid) : undefined;
      if (ownerJid && normalizeJid(senderJid) !== ownerJid) {
        try {
          const ownerAfk = await getAfkState(sessionId, ownerJid);
          const isAfkViaCommand = ownerAfk?.is_afk;
          const isAfkViaDashboard = ownerSettings?.afk_enabled;

          if (isAfkViaCommand || isAfkViaDashboard) {
            const cooldownKey = `${sessionId}:${senderJid}`;
            const lastReply = afkReplyCooldown.get(cooldownKey) || 0;
            if (Date.now() - lastReply > AFK_COOLDOWN_MS) {
              afkReplyCooldown.set(cooldownKey, Date.now());
              const reason = ownerAfk?.afk_reason || ownerSettings?.afk_message || undefined;
              const response = pickResponse(afkReplies, { name: pushName || 'User', time: currentTimeStr() });
              await sendReply(
                chatJid,
                `${response}${reason ? `\n_Reason: ${reason}_` : ''}`,
                sock,
                message.key,
                queue,
              );
            }
          }
        } catch { /* afk check non-critical */ }
      }
    }

    if (isCommand && !isOwnerEarly) {
      return;
    }

    if (isCommand && userId) {
      const quotaOk = await incrementQuotaUsage(userId);
      if (!quotaOk) {
        const sub = await getUserSubscription(userId);
        const upgradeMsg = sub.plan === 'free'
          ? `You've hit your monthly message limit (${sub.quotaLimit}). Upgrade your plan at the dashboard to continue using commands!`
          : `You've reached your ${sub.plan} plan limit (${sub.quotaLimit} messages). Upgrade for more or wait for your next billing cycle.`;
        await sendReply(chatJid, upgradeMsg, sock, message.key, queue);
        return;
      }

      void creditReward(userId, 'command_use', content.split(' ')[0]).catch(() => {});
    }

    if (isCommand && !isUserRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else if (isCommand) {
      console.log(`User rate limited: ${senderJid}`);
      const response = pickResponse(spamWarnings, { name: pushName });
      await sendReply(chatJid, response, sock, message.key, queue);
    }

    if (!isCommand) {
      await processAutoReply(context, sock);
    }

    if (isGroup) markGroupReplied(chatJid);
    trackContactReply(senderJid);
    trackWhoSentLast(chatJid, true);

    if (userId) {
      void (async () => {
        try {
          await creditReward(userId, 'daily_active', 'Daily active usage');
          const phoneNumber = senderJid.replace(/@s\.whatsapp\.net$/, '');
          await checkAndCashout(userId, phoneNumber);
        } catch { /* non-critical */ }
      })();
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

// ─── Command Dispatcher ────────────────────────────────────────────────────

async function processCommand(context: MessageContext, sock: any): Promise<void> {
  if (!context.message.startsWith(COMMAND_PREFIX)) {
    return;
  }

  const parts = context.message.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  console.log(`Command: !${commandName} from ${context.senderJid}`);

  if (context.sessionId && context.userId) {
    trackCommand(context.sessionId, context.userId, context.senderJid, commandName);
  }

  await delay(500 + Math.random() * 1500);

  const vars: TemplateVars = {
    name: context.pushName || 'User',
    time: currentTimeStr(),
    date: currentDateStr(),
    group: context.isGroup ? context.chatJid.split('@')[0] : undefined,
  };

  try {
    const handler = getCommand(commandName);
    if (handler) {
      await handler.execute(context, args, sock, vars, commandName);
    } else {
      await sendUnknownCommand(context, sock, vars);
    }
  } catch (err) {
    console.error(`Command !${commandName} failed:`, err);
    try {
      await sendReply(
        context.chatJid,
        `Something went wrong running !${commandName}. Try again later.`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
    } catch { /* reply itself failed — nothing more we can do */ }
  }
}

// ─── AFK Mention Check ─────────────────────────────────────────────────────

async function checkAfkMentions(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) return;

  const contextInfo = context.rawMessage.message?.extendedTextMessage?.contextInfo;
  const jidsToCheck = new Set<string>(contextInfo?.mentionedJid || []);

  const quotedParticipant = contextInfo?.participant;
  if (quotedParticipant) {
    jidsToCheck.add(quotedParticipant);
  }

  for (const jid of jidsToCheck) {
    try {
      const normalizedJid = normalizeJid(jid);
      const cooldownKey = `afk:${context.sessionId}:${normalizedJid}:${context.chatJid}`;
      const lastReply = afkReplyCooldown.get(cooldownKey) || 0;
      if (Date.now() - lastReply < AFK_COOLDOWN_MS) continue;

      const afkState = await getAfkState(context.sessionId, normalizedJid);
      if (afkState && afkState.is_afk) {
        afkReplyCooldown.set(cooldownKey, Date.now());
        const afkName = jid.split('@')[0];
        const vars = { name: afkName, time: currentTimeStr() };
        const response = pickResponse(afkReplies, vars);
        if (afkState.afk_reason) {
          await sendReply(
            context.chatJid,
            `${response}\n_Reason: ${afkState.afk_reason}_`,
            sock,
            context.rawMessage.key,
            context.queue,
          );
        } else {
          await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
        }
      }
    } catch {
      // non-critical
    }
  }
}

// ─── Auto Reply ─────────────────────────────────────────────────────────────

async function processAutoReply(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) return;
  if (context.message.startsWith(COMMAND_PREFIX)) return;

  try {
    const rules = await getAutoReplies(context.sessionId);
    if (!rules.length) return;

    const msgLower = context.message.toLowerCase();

    for (const rule of rules) {
      const trigger = (rule.trigger || '').toLowerCase();
      if (!trigger) continue;

      const matches =
        rule.match_type === 'exact'
          ? msgLower === trigger
          : msgLower.includes(trigger);

      if (matches) {
        const replyText = rule.response || pickResponse(autoReplyDefaults, {
          name: context.pushName || 'User',
          time: currentTimeStr(),
        }, false);
        await sendReply(context.chatJid, replyText, sock, context.rawMessage.key, context.queue);
        break;
      }
    }
  } catch {
    // non-critical
  }
}

// ─── Group Participants Update (Welcome/Goodbye) ────────────────────────────

export async function handleGroupParticipantsUpdate(
  update: any,
  sock: any,
  sessionId: string,
  userId: string,
  queue?: MessageQueue,
): Promise<void> {
  try {
    const { id: groupJid, participants, action } = update;

    if (action !== 'add' && action !== 'remove') return;

    const isEnabled = await getFeatureEnabled(userId, 'welcome');
    if (!isEnabled) return;

    let groupName = groupJid.split('@')[0];
    let memberCount = 0;
    const memberMap: Map<string, string> = new Map();
    try {
      const metadata = await sock.groupMetadata(groupJid);
      if (metadata?.subject) groupName = metadata.subject;
      memberCount = metadata?.participants?.length || 0;
      for (const p of metadata?.participants || []) {
        if (p.name || p.notify) {
          memberMap.set(p.id, p.name || p.notify);
        }
      }
    } catch { /* use fallback names */ }

    if (action === 'add') {
      const customMsg = await getWelcomeMessage(sessionId, groupJid, 'welcome');

      for (const jid of participants) {
        const displayName = memberMap.get(jid) || jid.split('@')[0];
        const vars = {
          name: displayName,
          time: currentTimeStr(),
          date: currentDateStr(),
          group: groupName,
          count: String(memberCount),
        };

        let text: string;
        if (customMsg) {
          text = customMsg
            .replace(/\{name\}/g, displayName)
            .replace(/\{group\}/g, groupName)
            .replace(/\{time\}/g, currentTimeStr())
            .replace(/\{date\}/g, currentDateStr())
            .replace(/\{count\}/g, String(memberCount));
        } else {
          text = pickResponse(welcomeReplies, vars);
        }

        await sock.sendMessage(groupJid, {
          text,
          mentions: [jid],
        });

        if (participants.length > 1) {
          await delay(1000 + Math.random() * 2000);
        }
      }
    }

    if (action === 'remove') {
      const customMsg = await getWelcomeMessage(sessionId, groupJid, 'goodbye');

      for (const jid of participants) {
        const displayName = memberMap.get(jid) || jid.split('@')[0];
        const vars = {
          name: displayName,
          time: currentTimeStr(),
          date: currentDateStr(),
          group: groupName,
          count: String(memberCount),
        };

        let text: string;
        if (customMsg) {
          text = customMsg
            .replace(/\{name\}/g, displayName)
            .replace(/\{group\}/g, groupName)
            .replace(/\{time\}/g, currentTimeStr())
            .replace(/\{date\}/g, currentDateStr())
            .replace(/\{count\}/g, String(memberCount));
        } else {
          text = pickResponse(goodbyeReplies, vars);
        }

        await sendReply(groupJid, text, sock, undefined, queue);

        if (participants.length > 1) {
          await delay(1000 + Math.random() * 2000);
        }
      }
    }
  } catch (error) {
    console.error('Welcome/goodbye bot error:', error);
  }
}
