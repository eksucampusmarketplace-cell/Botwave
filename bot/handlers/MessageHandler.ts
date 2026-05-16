import { delay } from '../../lib/utils';
import { getUserSettings, getAfkState, setAfkState, getAutoReplies, incrementLeaderboard, getSessionUserId, trackCommand, trackMessage, getUserSubscription, incrementQuotaUsage, creditReward, checkAndCashout, getFeatureEnabled, getWelcomeMessage } from '../database';
// import { matchIntent, classifyWithAI, getQuotedText, type NLPContext } from '../nlp/nlpEngine';
// import { processSavageMode } from './SavageMode';
import { trackCommandExecution } from '../../lib/error-tracker';

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
import { sendReply, setRequestLanguage, clearRequestLanguage } from '../commands/helpers';
import { hasActiveAIChat, handleAIReply } from '../commands/info';
import { cacheMessage, checkReactRules, expandAlias, getGhostDelay } from '../commands/social';
// import {
//   markOwnerActiveForContact,
//   collectOwnerMessage,
//   collectIncomingMessage,
//   shouldAutopilotReply,
//   scheduleAutopilotReply,
//   cancelPendingAutopilotReply,
//   isAutopilotEnabled,
//   loadAutopilotState,
//   bufferIncomingForBatch,
// } from './AutopilotEngine';

// Import all command modules to trigger self-registration
import '../commands';

const DEFAULT_COMMAND_PREFIX = '!';
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

  if (recentTimestamps.length >= 60) {
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

  if (recentTimestamps.length >= 30) {
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

    const content =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      '';

    if (!content) return;

    // In groups, participant may be a LID (e.g. 94270639878349@lid).
    // participantPn gives the phone number JID even when participant is a LID.
    const rawParticipant = message.key.participant;
    const participantPn = (message.key as any).participantPn;
    const senderJid = normalizeJid(participantPn || rawParticipant || chatJid);
    // Normalize owner JID to phone number only for comparison
    const ownerPhone = (sock as any).user?.id?.replace(/:\d+@/, '@').replace(/@.*/, '') ?? null;
    const senderPhone = senderJid.replace(/@.*/, '');
    const isOwnerByPhone = ownerPhone && senderPhone === ownerPhone;
    const isGroup = chatJid.endsWith('@g.us');
    const pushName = message.pushName || 'User';
    const sessionId = (sock as any).sessionId || queue?.['sessionId'];
    const userId = (sock as any).userId;

    // Load user's command prefix from settings (default '!')
    let commandPrefix = DEFAULT_COMMAND_PREFIX;
    let ownerSettings: { afk_enabled?: boolean; afk_message?: string; skip_probability?: number; command_prefix?: string } | null = null;
    if (userId) {
      try {
        ownerSettings = await getUserSettings(userId);
        if (ownerSettings?.command_prefix) commandPrefix = ownerSettings.command_prefix;
      } catch { /* non-critical */ }
    }

    const isCommand = content.startsWith(commandPrefix);

    // Owner's outgoing messages — autopilot learning disabled
    if (fromMe && !isCommand) {
      // if (userId && sessionId) {
      //   markOwnerActiveForContact(sessionId, chatJid);
      //   collectOwnerMessage(userId, sessionId, content, chatJid, pushName).catch(() => {});
      //   cancelPendingAutopilotReply(sessionId, chatJid);
      // }
      return;
    }

    if (msgId && isDuplicateMessage(msgId)) {
      return;
    }

    // Owner detection: compare phone JID and also LID (WhatsApp's new format)
    const ownerJidEarly = (sock as any).user?.id ? normalizeJid((sock as any).user.id) : null;
    const ownerLidEarly = (sock as any).user?.lid ? normalizeJid((sock as any).user.lid) : null;
    const senderLidEarly = rawParticipant && rawParticipant.endsWith('@lid') ? normalizeJid(rawParticipant) : null;
    const isOwnerEarly = fromMe ||
      isOwnerByPhone ||
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
      commandPrefix,
    };

    if (!fromMe) trackWhoSentLast(chatJid, false);

    if (!isCommand && sessionId && isSessionRateLimited(sessionId)) {
      console.log(`Session rate limited: ${sessionId}`);
      return;
    }

    if (!isCommand && shouldSilentlyIgnore(isGroup, content, senderJid)) {
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
      return;
    }

    if (isGroup) {
      trackGroupMessage(chatJid);
    }

    // Cache messages for !recap and !spy
    if (content && content.length > 0) {
      cacheMessage(chatJid, senderJid, pushName, content);
    }

    await simulateGoingOnline(sock);

    if (!isCommand && shouldThrottleContact(senderJid)) {
      return;
    }

    const ownerSkipProbability = ownerSettings?.skip_probability ?? undefined;

    if (shouldSkipResponse(isGroup, isCommand, ownerSkipProbability)) {
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

    // Track whether any handler already replied (for autopilot priority)
    let otherHandlerReplied = false;

    // Reply-to-AI: if user replies to a bot AI message, continue the conversation
    if (!isCommand && !fromMe && content) {
      const contextInfo = message.message?.extendedTextMessage?.contextInfo;
      if (contextInfo?.quotedMessage) {
        const quotedParticipant = contextInfo.participant;
        const myJid = (sock as any).user?.id ? normalizeJid((sock as any).user.id) : null;
        const myLid = (sock as any).user?.lid ? normalizeJid((sock as any).user.lid) : null;
        const isReplyToBot = quotedParticipant && (
          (myJid && normalizeJid(quotedParticipant) === myJid) ||
          (myLid && normalizeJid(quotedParticipant) === myLid)
        );

        if (isReplyToBot && hasActiveAIChat(chatJid)) {
          const vars: TemplateVars = {
            name: pushName || 'User',
            time: currentTimeStr(),
            date: currentDateStr(),
            group: isGroup ? chatJid.split('@')[0] : undefined,
          };
          await handleAIReply(context, sock, vars);
          otherHandlerReplied = true;
        }
      }
    }

    if (!isCommand && !otherHandlerReplied) {
      const autoReplied = await processAutoReply(context, sock);
      if (autoReplied) {
        otherHandlerReplied = true;
      }
      // NLP and Autopilot disabled
      // else if (userId) {
      //   const skipNlp = !isGroup && sessionId
      //     ? await isAutopilotEnabled(userId, sessionId)
      //     : false;
      //   if (!skipNlp) {
      //     await processNLP(context, sock);
      //   }
      // }
    }

    // Savage mode disabled
    // if (!isCommand && !fromMe && userId && content) {
    //   const savageQuotedText = getQuotedText(message);
    //   processSavageMode(content, userId, false, pushName, savageQuotedText)
    //     .then(async (roast) => {
    //       if (roast) {
    //         otherHandlerReplied = true;
    //         await sendReply(chatJid, roast, sock, message.key, queue);
    //       }
    //     })
    //     .catch((err) => console.error('[SAVAGE] Error in savage mode:', err));
    // }

    // Autopilot disabled
    // if (!isCommand && !fromMe && userId && sessionId && content) {
    //   collectIncomingMessage(userId, sessionId, content, chatJid, pushName).catch(() => {});
    //   const shouldReply = await shouldAutopilotReply(
    //     userId, sessionId, isGroup, fromMe, otherHandlerReplied, chatJid,
    //   );
    //   if (shouldReply) {
    //     const apState = await loadAutopilotState(userId, sessionId);
    //     const sendFn = async (text: string) => {
    //       await sendReply(chatJid, text, sock, undefined, queue);
    //     };
    //     bufferIncomingForBatch(sessionId, chatJid, content, pushName, (combinedText, name) => {
    //       scheduleAutopilotReply(
    //         userId, sessionId, chatJid, combinedText, name,
    //         apState.replyDelayMinutes,
    //         sendFn,
    //         sock,
    //         message.key,
    //       );
    //     });
    //   }
    // }

    // Auto-react check for groups
    if (isGroup && !isCommand && content) {
      const reactEmoji = checkReactRules(chatJid, content);
      if (reactEmoji && message.key) {
        try {
          await sock.sendMessage(chatJid, { react: { text: reactEmoji, key: message.key } });
        } catch { /* non-critical */ }
      }
    }

    // Ghost mode: schedule deletion of messages from users who enabled it.
    // Works for both the bot owner (fromMe=true) and other users in groups.
    {
      const ghostDelay = getGhostDelay(senderJid);
      if (ghostDelay && message.key) {
        setTimeout(async () => {
          try {
            await sock.sendMessage(chatJid, { delete: message.key });
          } catch { /* deletion may fail if bot is not admin, non-critical */ }
        }, ghostDelay * 1000);
      }
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
  const prefix = context.commandPrefix || DEFAULT_COMMAND_PREFIX;
  if (!context.message.startsWith(prefix)) {
    return;
  }

  const parts = context.message.slice(prefix.length).split(' ');
  let commandName = parts[0].toLowerCase();
  let args = parts.slice(1);

  // Alias expansion (async — loads from Redis if not cached)
  const aliasExpansion = await expandAlias(context.senderJid, commandName);
  if (aliasExpansion) {
    const aliasParts = aliasExpansion.replace(new RegExp(`^\\${prefix}`), '').split(' ');
    commandName = aliasParts[0].toLowerCase();
    args = [...aliasParts.slice(1), ...args];
    console.log(`Alias expanded: !${parts[0]} -> !${commandName} ${args.join(' ')}`);
  }

  console.log(`Command: !${commandName} from ${context.senderJid}`);

  if (context.sessionId && context.userId) {
    trackCommand(context.sessionId, context.userId, context.senderJid, commandName);
  }

  // Edit-on-reply: replace the command text with the result in-place.
  // Evolution API stores DM messages with @lid remoteJid but the webhook
  // sends @s.whatsapp.net — the retry in evolutionClient.updateMessage
  // looks up the stored @lid key and retries with it.
  const cmdKey = context.rawMessage.key;
  if (cmdKey.fromMe) {
    try {
      await sock.sendMessage(context.chatJid, { text: '\u23f3', edit: cmdKey });
    } catch (editErr: any) {
      console.error(`[EDIT-CMD] Edit-to-hourglass failed in ${context.isGroup ? 'group' : 'DM'} ${context.chatJid}:`, editErr?.message || editErr);
    }
  } else {
    try {
      await sock.sendMessage(context.chatJid, { delete: cmdKey });
    } catch {
      // Deletion may fail (not admin in group). Continue.
    }
  }

  await delay(500 + Math.random() * 1500);

  const vars: TemplateVars = {
    name: context.pushName || 'User',
    time: currentTimeStr(),
    date: currentDateStr(),
    group: context.isGroup ? context.chatJid.split('@')[0] : undefined,
  };

  // Set language context for auto-translation in sendReply
  if (context.userId) {
    try {
      const userSettings = await getUserSettings(context.userId);
      const lang = (userSettings as any)?.language_preference;
      if (lang && lang !== 'en') {
        setRequestLanguage(context.chatJid, lang);
      }
    } catch { /* non-critical */ }
  }

  try {
    const handler = getCommand(commandName);
    if (handler) {
      const startMs = Date.now();
      await handler.execute(context, args, sock, vars, commandName);
      const durationMs = Date.now() - startMs;
      console.log(`Command !${commandName} completed in ${durationMs}ms`);
      trackCommandExecution(commandName, true, durationMs, context.sessionId);
    } else {
      console.log(`Unknown command: !${commandName} — sending help hint`);
      await sendUnknownCommand(context, sock, vars);
    }
  } catch (err: any) {
    const durationMs = Date.now() - Date.now(); // approximate
    console.error(`Command !${commandName} failed:`, err);
    trackCommandExecution(commandName, false, 0, context.sessionId, err?.message);
    try {
      await sendReply(
        context.chatJid,
        `Something went wrong running !${commandName}. Try again later.`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
    } catch (replyErr) {
      console.error(`Failed to send error reply for !${commandName}:`, replyErr);
    }
  } finally {
    clearRequestLanguage(context.chatJid);
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

async function processAutoReply(context: MessageContext, sock: any): Promise<boolean> {
  if (!context.sessionId) return false;
  const prefix = context.commandPrefix || DEFAULT_COMMAND_PREFIX;
  if (context.message.startsWith(prefix)) return false;

  try {
    const rules = await getAutoReplies(context.sessionId);
    if (!rules.length) return false;

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
        return true;
      }
    }
  } catch {
    // non-critical
  }
  return false;
}

// ─── NLP Processing ─────────────────────────────────────────────────────────
//
// Detects natural-language requests and maps them to bot commands.
// Only fires when:
//   - The "nlp" feature toggle is ON for this user (default OFF)
//   - The user is clearly addressing the bot (group) or sending a request (DM)
//   - No auto-reply rule already handled the message

// NLP Processing — disabled
// async function processNLP(context: MessageContext, sock: any): Promise<void> {
//   if (!context.userId) return;
//   try {
//     const enabled = await getFeatureEnabled(context.userId, 'nlp');
//     if (!enabled) return;
//     const nlpCtx: NLPContext = {};
//     if (context.isGroup) {
//       const rawMsg = context.rawMessage;
//       const quotedParticipant = rawMsg.message?.extendedTextMessage?.contextInfo?.participant;
//       const ownerJid = (sock as any).user?.id ? normalizeJid((sock as any).user.id) : null;
//       if (quotedParticipant && ownerJid && normalizeJid(quotedParticipant) === ownerJid) {
//         nlpCtx.isReplyToOwner = true;
//       }
//       const mentionedJids = rawMsg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
//       if (ownerJid && mentionedJids.some((jid: string) => normalizeJid(jid) === ownerJid)) {
//         nlpCtx.mentionsOwner = true;
//       }
//       const ownerName = (sock as any).user?.name;
//       if (ownerName && ownerName.length >= 3) {
//         nlpCtx.ownerName = ownerName;
//       }
//     }
//     let intent = matchIntent(context.message, context.isGroup, nlpCtx);
//     let source: 'pattern' | 'ai' = 'pattern';
//     if (!intent) {
//       const quotedText = getQuotedText(context.rawMessage);
//       intent = await classifyWithAI(context.message, context.isGroup, quotedText, nlpCtx);
//       if (intent) source = 'ai';
//     }
//     if (!intent) return;
//     console.log(`[NLP] Matched intent: ${intent.command} (confidence=${intent.confidence}, source=${source}) from "${context.message.slice(0, 60)}"`);
//     const handler = getCommand(intent.command);
//     if (!handler) return;
//     if (handler.ownerOnly && !context.isOwner) return;
//     const vars: TemplateVars = {
//       name: context.pushName || 'User',
//       time: currentTimeStr(),
//       date: currentDateStr(),
//       group: context.isGroup ? context.chatJid.split('@')[0] : undefined,
//     };
//     if (context.sessionId && context.userId) {
//       trackCommand(context.sessionId, context.userId, context.senderJid, intent.command);
//     }
//     await handler.execute(context, intent.args, sock, vars, intent.command);
//     console.log(`[NLP] Command ${intent.command} executed via NLP (${source})`);
//   } catch (err) {
//     console.error('[NLP] Error processing intent:', err);
//   }
// }

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
