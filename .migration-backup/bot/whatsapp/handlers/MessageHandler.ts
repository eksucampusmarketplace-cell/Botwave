import { delay } from '../../../lib/utils';
import { getUserSettings, getAfkState, setAfkState, getAutoReplies, incrementLeaderboard, getSessionUserId, getSessionById, trackCommand, trackMessage, getUserSubscription, incrementQuotaUsage, getFeatureEnabled, getWelcomeMessage, isActiveBotPhone, getChatbotFlows, getCustomCommands, getProducts, loadFlowSession, saveFlowSession, deleteFlowSession } from '../../database';
// import { matchIntent, classifyWithAI, getQuotedText, type NLPContext } from '../nlp/nlpEngine';
// import { processSavageMode } from './SavageMode';
import { trackCommandExecution } from '../../../lib/error-tracker';

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
import { sendReply, setRequestLanguage, clearRequestLanguage, getUserLangFallback } from '../commands/helpers';
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
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

// ─── JID Normalization ──────────────────────────────────────────────────────

function normalizeJid(jid: string): string {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@').trim();
}

function normalizePhoneDigits(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
}

function normalizeLidValue(value?: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeJid(value).toLowerCase();
  return normalized.endsWith('@lid') ? normalized.slice(0, -4) : normalized;
}

// ─── Rate Limiting (configurable via env vars) ──────────────────────────────
// Session: max outbound messages per minute (default 120, safe for WhatsApp anti-ban)
// User: max command invocations per minute per JID (default 200)
// Flood: rapid-fire threshold within short window (default 12 in 10s)
// Command cooldown: minimum gap between commands from same user (default 2s)

const userMessageTracker: Map<string, number[]> = new Map();
const sessionMessageTracker: Map<string, number[]> = new Map();
const spamTracker: Map<string, { count: number; lastTime: number; warned: boolean }> = new Map();
const commandCooldownTracker: Map<string, number> = new Map();
const SESSION_RATE_LIMIT = parseInt(process.env.SESSION_RATE_LIMIT || '120', 10);
const USER_RATE_LIMIT = parseInt(process.env.USER_RATE_LIMIT || '200', 10);
const SPAM_THRESHOLD = parseInt(process.env.FLOOD_THRESHOLD || '12', 10);
const SPAM_WINDOW = 10_000;
const COMMAND_COOLDOWN_MS = parseInt(process.env.COMMAND_COOLDOWN_MS || '300', 10);

function isUserRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = userMessageTracker.get(userId) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recentTimestamps.length >= USER_RATE_LIMIT) {
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

  if (recentTimestamps.length >= SESSION_RATE_LIMIT) {
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

// ─── Per-User Command Cooldown ──────────────────────────────────────────────

function isCommandOnCooldown(userId: string): boolean {
  const lastCommand = commandCooldownTracker.get(userId);
  if (!lastCommand) return false;
  return Date.now() - lastCommand < COMMAND_COOLDOWN_MS;
}

function markCommandUsed(userId: string): void {
  commandCooldownTracker.set(userId, Date.now());
  // Periodic cleanup — prevent unbounded growth
  if (commandCooldownTracker.size > 2000) {
    const cutoff = Date.now() - COMMAND_COOLDOWN_MS * 5;
    for (const [k, t] of commandCooldownTracker) {
      if (t < cutoff) commandCooldownTracker.delete(k);
    }
  }
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

// ─── Periodic Cleanup for Rate Limit Maps ───────────────────────────────────
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    // Clean up stale entries from rate tracking maps
    for (const [key, timestamps] of userMessageTracker) {
      const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
      if (recent.length === 0) userMessageTracker.delete(key);
      else userMessageTracker.set(key, recent);
    }
    for (const [key, timestamps] of sessionMessageTracker) {
      const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
      if (recent.length === 0) sessionMessageTracker.delete(key);
      else sessionMessageTracker.set(key, recent);
    }
    for (const [key, tracker] of spamTracker) {
      if (now - tracker.lastTime > SPAM_WINDOW * 3) spamTracker.delete(key);
    }
    for (const [key, t] of afkReplyCooldown) {
      if (now - t > AFK_COOLDOWN_MS * 2) afkReplyCooldown.delete(key);
    }
  }, 120_000); // every 2 minutes
}

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
    const isGroup = chatJid.endsWith('@g.us');
    const pushName = message.pushName || 'User';
    const sessionId = (sock as any).sessionId || queue?.['sessionId'];

    let userId = (sock as any).userId as string | undefined;
    let sessionRecord: Record<string, any> | null = null;
    if (sessionId) {
      try {
        sessionRecord = await getSessionById(sessionId);
      } catch {
        sessionRecord = null;
      }
    }

    if (!userId && sessionRecord?.user_id) {
      userId = String(sessionRecord.user_id);
      (sock as any).userId = userId;
      console.warn(`[MSG] sock.userId missing for session=${sessionId}; recovered from DB session row`);
    }

    // Load user's command prefix from settings (default '!').
    // If userId is missing, try session-row fallback before defaulting.
    let commandPrefix = DEFAULT_COMMAND_PREFIX;
    let ownerSettings: { afk_enabled?: boolean; afk_message?: string; skip_probability?: number; command_prefix?: string } | null = null;
    if (userId) {
      try {
        ownerSettings = await getUserSettings(userId);
        if (ownerSettings?.command_prefix) commandPrefix = ownerSettings.command_prefix;
      } catch { /* non-critical */ }
    } else if (sessionRecord?.command_prefix) {
      commandPrefix = String(sessionRecord.command_prefix);
      console.warn(`[MSG] userId missing while processing session=${sessionId}; using session-row command_prefix fallback (${commandPrefix})`);
    } else {
      console.warn(`[MSG] userId missing while processing session=${sessionId}; falling back to default prefix "${DEFAULT_COMMAND_PREFIX}"`);
    }

    const isCommand = content.startsWith(commandPrefix);
    const commandThrottlingEnabled = sessionRecord?.command_throttling_enabled === true;

    // Owner's outgoing messages - autopilot learning disabled
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

    // Bot-detection filter: skip messages from other active BotWave sessions
    // to prevent infinite auto-reply/AI loops between two bots.
    if (!fromMe) {
      try {
        const isSenderBot = await isActiveBotPhone(senderJid);
        if (isSenderBot) return;
      } catch { /* non-critical – allow message through on error */ }
    }

    // Owner detection: Evolution group events may set fromMe=false and may use @lid.
    const ownerJidEarly = (sock as any).user?.id ? normalizeJid((sock as any).user.id) : null;
    const ownerLidEarlyRaw = (sock as any).user?.lid ? String((sock as any).user.lid) : null;
    const senderLidEarlyRaw = rawParticipant && rawParticipant.endsWith('@lid') ? String(rawParticipant) : null;

    const ownerLidEarly = normalizeLidValue(ownerLidEarlyRaw);
    const senderLidEarly = normalizeLidValue(senderLidEarlyRaw);

    const ownerPhone = normalizePhoneDigits((sock as any).user?.id || null);
    const senderPhone = normalizePhoneDigits(participantPn || rawParticipant || senderJid);
    const sessionPhone = normalizePhoneDigits((sessionRecord as any)?.phone_number || null);

    const isOwnerByPhone = !!(ownerPhone && senderPhone && ownerPhone === senderPhone);
    const isOwnerBySessionPhone = !!(sessionPhone && senderPhone && sessionPhone === senderPhone);
    const isOwnerByJid = !!(ownerJidEarly && senderJid === ownerJidEarly);
    const isOwnerByLid = !!(ownerLidEarly && senderLidEarly && senderLidEarly === ownerLidEarly);

    const isOwnerEarly = !!(
      fromMe ||
      isOwnerByPhone ||
      isOwnerBySessionPhone ||
      isOwnerByJid ||
      isOwnerByLid
    );

    if (process.env.DEBUG_OWNER_DETECTION === '1') {
      console.log(
        `[OWNER-DETECT] session=${sessionId} fromMe=${fromMe} isGroup=${isGroup} sender=${senderJid} rawParticipant=${rawParticipant || 'n/a'} ` +
        `ownerJid=${ownerJidEarly || 'n/a'} ownerLid=${ownerLidEarly || 'n/a'} senderLid=${senderLidEarly || 'n/a'} ` +
        `senderPhone=${senderPhone || 'n/a'} ownerPhone=${ownerPhone || 'n/a'} sessionPhone=${sessionPhone || 'n/a'} ` +
        `=> isOwner=${isOwnerEarly} (phone=${isOwnerByPhone}, sessionPhone=${isOwnerBySessionPhone}, jid=${isOwnerByJid}, lid=${isOwnerByLid})`
      );
    }

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

    // In Evolution API mode, the bot owner's outgoing group messages may have
    // fromMe=false (Evolution API bug). If isOwnerEarly is false but we have a
    // valid userId, check if this session's phone matches the sender's phone
    // as a last-resort owner detection. If still not owner, block the command.
    // This ensures only the bot's linked owner can run commands.
    if (isCommand && !isOwnerEarly) {
      // Last-resort: try matching sender phone against session phone number
      if (!sessionRecord?.phone_number || !senderPhone || normalizePhoneDigits(String(sessionRecord.phone_number)) !== senderPhone) {
        return;
      }
    }

    if (isCommand && userId) {
      if (commandThrottlingEnabled) {
        // Per-user command cooldown to prevent spam without hurting games
        if (isCommandOnCooldown(senderJid)) return;
        markCommandUsed(senderJid);
      }

      const quotaOk = await incrementQuotaUsage(userId);
      if (!quotaOk) {
        const sub = await getUserSubscription(userId);
        const upgradeMsg = sub.plan === 'free'
          ? `You've hit your monthly message limit (${sub.quotaLimit}). Upgrade your plan at the dashboard to continue using commands!`
          : `You've reached your ${sub.plan} plan limit (${sub.quotaLimit} messages). Upgrade for more or wait for your next billing cycle.`;
        await sendReply(chatJid, upgradeMsg, sock, message.key, queue);
        return;
      }

    }

    if (isCommand) {
      if (!commandThrottlingEnabled || !isUserRateLimited(senderJid)) {
        await processCommand(context, sock);
      } else {
        console.log(`User rate limited: ${senderJid}`);
        const response = pickResponse(spamWarnings, { name: pushName });
        await sendReply(chatJid, response, sock, message.key, queue);
      }
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
      const flowHandled = await processChatbotFlow(context, sock);
      if (flowHandled) {
        otherHandlerReplied = true;
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

    // Only update tracking state if the bot actually replied to something
    // (command result, auto-reply, chatbot flow, AFK mention, etc.)
    // otherHandlerReplied is true when auto-reply, chatbot flow, or AI reply was sent.
    // Commands always send a reply (result, error, or usage hint), so track those too.
    const botReplied = otherHandlerReplied || isCommand;
    if (botReplied) {
      if (isGroup) markGroupReplied(chatJid);
      trackContactReply(senderJid);
      trackWhoSentLast(chatJid, true);
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

  // Alias expansion (async - loads from Redis if not cached)
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
  // sends @s.whatsapp.net - the retry in evolutionClient.updateMessage
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
      const lang = (userSettings as any)?.language_preference || getUserLangFallback(context.userId);
      if (lang && lang !== 'en') {
        setRequestLanguage(context.chatJid, lang);
        console.log(`[LANG] Set request language for ${context.chatJid}: ${lang} (userId=${context.userId})`);
      }
    } catch (langErr: any) {
      console.error(`[LANG] Failed to load language preference for userId=${context.userId}:`, langErr?.message || langErr);
      // Fallback to in-memory cache even on DB error
      const fallbackLang = getUserLangFallback(context.userId);
      if (fallbackLang && fallbackLang !== 'en') {
        setRequestLanguage(context.chatJid, fallbackLang);
        console.log(`[LANG] Using in-memory fallback language for ${context.chatJid}: ${fallbackLang}`);
      }
    }
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
      // Check user's custom commands before sending unknown command help
      const customHandled = await processCustomCommand(context, sock, commandName, args, vars);
      if (!customHandled) {
        // Check e-commerce commands
        const shopHandled = await processShopCommand(context, sock, commandName, args, vars);
        if (!shopHandled) {
          if (context.isGroup) {
            console.log(`Unknown command: !${commandName} in group - silently ignored`);
          } else {
            console.log(`Unknown command: !${commandName} - sending help hint`);
            await sendUnknownCommand(context, sock, vars);
          }
        }
      }
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
  // AFK mentions only fire in DMs - in groups, quote/mention patterns from
  // other members would trigger unwanted AFK replies to everyone
  if (context.isGroup) return;

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

function isAutoReplyActiveNow(rule: any, userTimezone?: string): boolean {
  if (!rule.schedule_enabled) return true;
  const tz = userTimezone || 'UTC';
  let now: Date;
  try {
    const formatted = new Date().toLocaleString('en-US', { timeZone: tz });
    now = new Date(formatted);
  } catch {
    now = new Date();
  }
  const currentDay = now.getDay();
  if (rule.active_days && Array.isArray(rule.active_days) && !rule.active_days.includes(currentDay)) {
    return false;
  }
  if (rule.schedule_start && rule.schedule_end) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = rule.schedule_start.split(':').map(Number);
    const [endH, endM] = rule.schedule_end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (startMinutes <= endMinutes) {
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false;
    } else {
      if (currentMinutes < startMinutes && currentMinutes > endMinutes) return false;
    }
  }
  return true;
}

async function processAutoReply(context: MessageContext, sock: any): Promise<boolean> {
  if (!context.sessionId) return false;
  const prefix = context.commandPrefix || DEFAULT_COMMAND_PREFIX;
  if (context.message.startsWith(prefix)) return false;
  // Auto-replies only fire in DMs by default to avoid responding to group messages unintentionally
  if (context.isGroup) return false;

  try {
    const rules = await getAutoReplies(context.sessionId);
    if (!rules.length) return false;

    let userTimezone: string | undefined;
    if (context.userId) {
      try {
        const settings = await getUserSettings(context.userId);
        userTimezone = settings?.timezone;
      } catch { /* use UTC */ }
    }

    const msgLower = context.message.toLowerCase();

    for (const rule of rules) {
      const trigger = (rule.trigger || '').toLowerCase();
      if (!trigger) continue;

      if (!isAutoReplyActiveNow(rule, userTimezone)) continue;

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

// ─── Chatbot Flow Execution ─────────────────────────────────────────────────

interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'condition' | 'delay';
  content: string;
  next?: string;
  options?: { label: string; next: string }[];
}

// Flow state is persisted to the `flow_sessions` table via
// loadFlowSession / saveFlowSession / deleteFlowSession in bot/database.ts.
// Replaces the legacy in-memory `flowSessionState: Map` that was wiped on
// every bot restart, dropping any user mid-flow. TTL matches legacy behavior.
const FLOW_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function findNodeById(nodes: FlowNode[], id: string): FlowNode | undefined {
  return nodes.find(n => n.id === id);
}

function getNextNodeId(nodes: FlowNode[], currentIndex: number): string | undefined {
  return nodes[currentIndex + 1]?.id;
}

function getNodeText(node: FlowNode): string {
  return node.content || '';
}

async function executeFlowNode(
  node: FlowNode, nodes: FlowNode[], flow: { id: string },
  sessionId: string, senderJid: string,
  context: MessageContext, sock: any,
): Promise<boolean> {
  const text = getNodeText(node);
  const currentIdx = nodes.findIndex(n => n.id === node.id);

  if (node.type === 'message') {
    if (text) {
      await sendReply(context.chatJid, text, sock, context.rawMessage.key, context.queue);
    }
    // Auto-advance to next node
    const nextId = node.next || getNextNodeId(nodes, currentIdx);
    if (nextId) {
      const nextNode = findNodeById(nodes, nextId);
      if (nextNode) {
        // If next is a delay, schedule it then continue
        if (nextNode.type === 'delay') {
          const delaySec = parseInt(nextNode.content, 10) || 3;
          await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
          const afterDelayId = nextNode.next || getNextNodeId(nodes, nodes.findIndex(n => n.id === nextNode.id));
          if (afterDelayId) {
            const afterNode = findNodeById(nodes, afterDelayId);
            if (afterNode) return executeFlowNode(afterNode, nodes, flow, sessionId, senderJid, context, sock);
          }
          await deleteFlowSession(sessionId, senderJid);
          return true;
        }
        // If next is question or condition, wait for user input
        if (nextNode.type === 'question' || nextNode.type === 'condition') {
          const qText = getNodeText(nextNode);
          if (qText) {
            let optionsText = '';
            if (nextNode.options && nextNode.options.length > 0) {
              optionsText = '\n\n' + nextNode.options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
            }
            await sendReply(context.chatJid, qText + optionsText, sock, context.rawMessage.key, context.queue);
          }
          await saveFlowSession(sessionId, senderJid, flow.id, nextNode.id, FLOW_EXPIRY_MS);
          return true;
        }
        // If next is another message, auto-execute it
        return executeFlowNode(nextNode, nodes, flow, sessionId, senderJid, context, sock);
      }
    }
    await deleteFlowSession(sessionId, senderJid);
    return true;
  }

  if (node.type === 'question' || node.type === 'condition') {
    if (text) {
      let optionsText = '';
      if (node.options && node.options.length > 0) {
        optionsText = '\n\n' + node.options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
      }
      await sendReply(context.chatJid, text + optionsText, sock, context.rawMessage.key, context.queue);
    }
    // Wait for user input
    await saveFlowSession(sessionId, senderJid, flow.id, node.id, FLOW_EXPIRY_MS);
    return true;
  }

  if (node.type === 'delay') {
    const delaySec = parseInt(node.content, 10) || 3;
    await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
    const nextId = node.next || getNextNodeId(nodes, currentIdx);
    if (nextId) {
      const nextNode = findNodeById(nodes, nextId);
      if (nextNode) return executeFlowNode(nextNode, nodes, flow, sessionId, senderJid, context, sock);
    }
    await deleteFlowSession(sessionId, senderJid);
    return true;
  }

  return false;
}

async function processChatbotFlow(context: MessageContext, sock: any): Promise<boolean> {
  if (!context.userId || !context.sessionId) return false;
  // Chatbot flows only fire in DMs by default to avoid responding to group messages unintentionally
  if (context.isGroup) return false;

  const sessionId = context.sessionId;
  const senderJid = context.senderJid;
  const msgLower = context.message.toLowerCase().trim();

  // Check if user is mid-flow (waiting for response to question/condition).
  // State is loaded from `flow_sessions` table — survives bot restarts.
  const activeState = await loadFlowSession(sessionId, senderJid);
  if (activeState) {
    try {
      const flows = await getChatbotFlows(context.userId);
      const flow = flows.find((f: { id: string }) => f.id === activeState.flowId);
      if (flow && Array.isArray(flow.nodes)) {
        const nodes = flow.nodes as FlowNode[];
        const currentNode = findNodeById(nodes, activeState.nodeId);
        if (currentNode && (currentNode.type === 'question' || currentNode.type === 'condition')) {
          let nextId: string | undefined;

          // Try to match user input to an option
          if (currentNode.options && currentNode.options.length > 0) {
            // Match by number (1, 2, 3...) or label text
            const numChoice = parseInt(msgLower, 10);
            if (numChoice > 0 && numChoice <= currentNode.options.length) {
              nextId = currentNode.options[numChoice - 1].next;
            } else {
              const matched = currentNode.options.find(
                (opt) => msgLower === (opt.label || '').toLowerCase()
              );
              if (matched) nextId = matched.next;
            }
          }

          // If no option matched, use node's default next or advance sequentially
          if (!nextId) {
            const currentIdx = nodes.findIndex(n => n.id === currentNode.id);
            nextId = currentNode.next || getNextNodeId(nodes, currentIdx);
          }

          if (nextId) {
            const nextNode = findNodeById(nodes, nextId);
            if (nextNode) {
              await deleteFlowSession(sessionId, senderJid);
              return executeFlowNode(nextNode, nodes, flow, sessionId, senderJid, context, sock);
            }
          }
        }
      }
      await deleteFlowSession(sessionId, senderJid);
    } catch {
      await deleteFlowSession(sessionId, senderJid);
    }
    return true; // Consumed the message even if flow ended
  }

  // Check if message matches any flow trigger
  try {
    const flows = await getChatbotFlows(context.userId);
    if (!flows.length) return false;

    for (const flow of flows) {
      const trigger = (flow.trigger || '').toLowerCase();
      if (!trigger) continue;

      if (msgLower === trigger || msgLower.includes(trigger)) {
        const nodes = Array.isArray(flow.nodes) ? (flow.nodes as FlowNode[]) : [];
        if (nodes.length > 0) {
          return executeFlowNode(nodes[0], nodes, flow, sessionId, senderJid, context, sock);
        }
      }
    }
  } catch {
    // non-critical
  }
  return false;
}

// ─── Custom Command Processing ──────────────────────────────────────────────

const customCmdCooldowns = new Map<string, number>();

async function processCustomCommand(
  context: MessageContext, sock: any, commandName: string, args: string[], vars: TemplateVars,
): Promise<boolean> {
  if (!context.userId) return false;

  try {
    const commands = await getCustomCommands(context.userId);
    if (!commands.length) return false;

    const prefix = context.commandPrefix || DEFAULT_COMMAND_PREFIX;
    const fullCmd = `${prefix}${commandName}`;
    const fullMessage = `${fullCmd} ${args.join(' ')}`.trim();

    for (const cmd of commands) {
      const trigger = (cmd.command || '').toLowerCase();
      if (!trigger) continue;

      const matchType = cmd.match_type || 'exact';
      let matched = false;

      if (matchType === 'exact') {
        matched = fullCmd.toLowerCase() === trigger;
      } else if (matchType === 'contains') {
        matched = fullMessage.toLowerCase().includes(trigger.replace(/^!/, ''));
      } else if (matchType === 'startsWith') {
        matched = fullCmd.toLowerCase().startsWith(trigger);
      } else {
        matched = fullCmd.toLowerCase() === trigger;
      }

      if (!matched) continue;

      // Cooldown enforcement
      if (cmd.cooldown && cmd.cooldown > 0) {
        const cooldownKey = `${cmd.id}:${context.senderJid}`;
        const lastUsed = customCmdCooldowns.get(cooldownKey) || 0;
        if (Date.now() - lastUsed < cmd.cooldown * 1000) {
          const remaining = Math.ceil((cmd.cooldown * 1000 - (Date.now() - lastUsed)) / 1000);
          await sendReply(
            context.chatJid,
            `⏳ This command is on cooldown. Try again in ${remaining}s.`,
            sock, context.rawMessage.key, context.queue,
          );
          return true;
        }
        customCmdCooldowns.set(cooldownKey, Date.now());
      }

      // Pick response (supports random selection from multiple responses separated by |||)
      let responseText = cmd.response || '';
      if (responseText.includes('|||')) {
        const responses = responseText.split('|||').map((r: string) => r.trim()).filter(Boolean);
        responseText = responses[Math.floor(Math.random() * responses.length)] || responseText;
      }

      // Replace template variables
      responseText = responseText
        .replace(/\{name\}/g, vars.name || 'User')
        .replace(/\{user\}/g, vars.name || 'User')
        .replace(/\{time\}/g, vars.time || '')
        .replace(/\{date\}/g, vars.date || '')
        .replace(/\{group\}/g, vars.group || '')
        .replace(/\{args\}/g, args.join(' '));

      // Send image if image_url is set
      if (cmd.image_url) {
        try {
          await sock.sendMessage(context.chatJid, {
            image: { url: cmd.image_url },
            caption: responseText,
          });
        } catch {
          await sendReply(context.chatJid, responseText, sock, context.rawMessage.key, context.queue);
        }
      } else {
        await sendReply(context.chatJid, responseText, sock, context.rawMessage.key, context.queue);
      }
      return true;
    }
  } catch (err) {
    console.error('[CUSTOM-CMD] Processing error:', err);
  }
  return false;
}

// ─── E-Commerce Shop Commands ───────────────────────────────────────────────

const shopCarts = new Map<string, { items: { productId: string; name: string; price: number; qty: number }[] }>();

async function processShopCommand(
  context: MessageContext, sock: any, commandName: string, args: string[], vars: TemplateVars,
): Promise<boolean> {
  if (!context.userId) return false;

  const cmd = commandName.toLowerCase();
  if (!['shop', 'buy', 'cart', 'checkout'].includes(cmd)) return false;

  try {
    const products = await getProducts(context.userId);
    const cartKey = `${context.userId}:${context.senderJid}`;

    if (cmd === 'shop') {
      if (!products.length) {
        await sendReply(context.chatJid, '🏪 Shop is empty. The owner hasn\'t added any products yet.', sock, context.rawMessage.key, context.queue);
        return true;
      }
      let shopText = '🏪 *Shop Menu*\n\n';
      products.forEach((p: any, i: number) => {
        shopText += `${i + 1}. *${p.name}* — $${p.price}\n`;
        if (p.description) shopText += `   _${p.description}_\n`;
      });
      shopText += `\nTo buy: !buy [item number] [quantity]`;
      await sendReply(context.chatJid, shopText, sock, context.rawMessage.key, context.queue);
      return true;
    }

    if (cmd === 'buy') {
      const itemNum = parseInt(args[0]) - 1;
      const qty = parseInt(args[1]) || 1;
      if (isNaN(itemNum) || itemNum < 0 || itemNum >= products.length) {
        await sendReply(context.chatJid, '❌ Invalid item number. Use !shop to see available items.', sock, context.rawMessage.key, context.queue);
        return true;
      }
      const product = products[itemNum];
      const cart = shopCarts.get(cartKey) || { items: [] };
      const existing = cart.items.find(i => i.productId === product.id);
      if (existing) {
        existing.qty += qty;
      } else {
        cart.items.push({ productId: product.id, name: product.name, price: product.price, qty });
      }
      shopCarts.set(cartKey, cart);
      await sendReply(context.chatJid, `✅ Added ${qty}x *${product.name}* to your cart. Total items: ${cart.items.reduce((s, i) => s + i.qty, 0)}`, sock, context.rawMessage.key, context.queue);
      return true;
    }

    if (cmd === 'cart') {
      const cart = shopCarts.get(cartKey);
      if (!cart || !cart.items.length) {
        await sendReply(context.chatJid, '🛒 Your cart is empty. Use !shop to browse and !buy to add items.', sock, context.rawMessage.key, context.queue);
        return true;
      }
      let cartText = '🛒 *Your Cart*\n\n';
      let total = 0;
      cart.items.forEach((item, i) => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        cartText += `${i + 1}. ${item.name} x${item.qty} — $${subtotal.toFixed(2)}\n`;
      });
      cartText += `\n*Total: $${total.toFixed(2)}*\n\nUse !checkout to complete your order.`;
      await sendReply(context.chatJid, cartText, sock, context.rawMessage.key, context.queue);
      return true;
    }

    if (cmd === 'checkout') {
      const cart = shopCarts.get(cartKey);
      if (!cart || !cart.items.length) {
        await sendReply(context.chatJid, '🛒 Your cart is empty. Nothing to checkout.', sock, context.rawMessage.key, context.queue);
        return true;
      }
      const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
      let orderText = '📦 *Order Confirmed!*\n\n';
      cart.items.forEach(item => {
        orderText += `• ${item.name} x${item.qty} — $${(item.price * item.qty).toFixed(2)}\n`;
      });
      orderText += `\n*Total: $${total.toFixed(2)}*\n\nThe shop owner will contact you to arrange payment and delivery. Thank you! 🙏`;
      shopCarts.delete(cartKey);
      await sendReply(context.chatJid, orderText, sock, context.rawMessage.key, context.queue);
      return true;
    }
  } catch (err) {
    console.error('[SHOP] Processing error:', err);
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

// NLP Processing - disabled
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

    const isEnabled = await getFeatureEnabled(userId, 'welcome', sessionId);
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
