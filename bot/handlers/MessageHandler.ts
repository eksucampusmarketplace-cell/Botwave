import { delay } from '../../lib/utils';
import axios from 'axios';
import sharp from 'sharp';
import { downloadMediaMessage as baileysDownloadMedia } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { savePoll, recordVote, getLeaderboard, getUserSettings, getAfkState, setAfkState, getAutoReplies, getActivePoll, incrementLeaderboard, getFeatureEnabled, getSessionUserId, createReminder, getUserReminders, deleteReminder, createNote, getUserNotes, deleteNote, createScheduledMessage, getUserScheduledMessages, deleteScheduledMessage, getSessionStats, trackCommand, trackMessage } from '../database';
import { MessageQueue } from '../utils/MessageQueue';
import {
  humanSend,
  pickResponse,
  currentTimeStr,
  currentDateStr,
  getTimeTone,
  timeGreeting,
} from '../utils/antiban';
import {
  stickerReplies,
  afkReplies,
  jokePool,
  quotePool,
  horoscopeSigns,
  horoscopeReadings,
  pingReplies,
  helpIntros,
  unknownCommandReplies,
  docReplies,
  translateReplies,
  weatherReplies,
  dictReplies,
  aiIntros,
  gameStartReplies,
  pollReplies,
  leaderboardReplies,
  downloadReplies,
  welcomeReplies,
  spamWarnings,
  autoReplyDefaults,
} from '../utils/responsePools';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';
import {
  isDailyCapReached,
  trackMessageSent,
  shouldSkipResponse,
  isGroupOnCooldown,
  markGroupReplied,
  addMessageJitter,
  getActivityConfig,
  shortenForQuietHours,
  naturalDelay,
  shouldThrottleContact,
  trackContactReply,
  getTypingSpeedMultiplier,
  trackGroupMessage,
  getGroupReplyDelay,
  checkBurstAndDelay,
  simulateGoingOnline,
  shouldSilentlyIgnore,
  trackWhoSentLast,
  shouldAvoidDoubleText,
} from '../utils/advancedAntiban';

const COMMAND_PREFIX = '!';
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 10;

function normalizeJid(jid: string): string {
  // Remove the device suffix (:XX) from JIDs for comparison
  // e.g. "1234567890:12@s.whatsapp.net" → "1234567890@s.whatsapp.net"
  return jid.replace(/:\d+@/, '@');
}

interface MessageContext {
  senderJid: string;
  chatJid: string;
  message: string;
  rawMessage: any;
  isGroup: boolean;
  pushName?: string;
  sessionId?: string;
  userId?: string;
  queue?: MessageQueue;
}

const userMessageTracker: Map<string, number[]> = new Map();
const sessionMessageTracker: Map<string, number[]> = new Map();
interface NumberGuessGame { type: 'numberguess'; target: number; attempts: number; userJid: string }
interface TriviaGame { type: 'trivia'; question: string; answer: string; options: string[]; userJid: string }
interface HangmanGame { type: 'hangman'; word: string; guessed: Set<string>; wrongGuesses: number; userJid: string }
interface WordChainGame { type: 'wordchain'; lastWord: string; usedWords: Set<string>; userJid: string }
type GameState = NumberGuessGame | TriviaGame | HangmanGame | WordChainGame;
const gameStates: Map<string, GameState> = new Map();

const triviaQuestions = [
  { q: 'What planet is known as the Red Planet?', a: 'mars', opts: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { q: 'How many continents are there?', a: '7', opts: ['5', '6', '7', '8'] },
  { q: 'What is the chemical symbol for gold?', a: 'au', opts: ['Go', 'Gd', 'Au', 'Ag'] },
  { q: 'Which ocean is the largest?', a: 'pacific', opts: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
  { q: 'What year did the Titanic sink?', a: '1912', opts: ['1905', '1912', '1920', '1898'] },
  { q: 'What is the smallest country in the world?', a: 'vatican', opts: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'] },
  { q: 'How many bones are in the human body?', a: '206', opts: ['186', '206', '216', '256'] },
  { q: 'What gas do plants absorb from the atmosphere?', a: 'carbon dioxide', opts: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'] },
  { q: 'Which animal is the largest mammal?', a: 'blue whale', opts: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'] },
  { q: 'What is the hardest natural substance?', a: 'diamond', opts: ['Gold', 'Iron', 'Diamond', 'Platinum'] },
  { q: 'In which country is the Great Barrier Reef?', a: 'australia', opts: ['Indonesia', 'Australia', 'Philippines', 'Brazil'] },
  { q: 'What is the speed of light in km/s (approx)?', a: '300000', opts: ['150,000', '200,000', '300,000', '400,000'] },
  { q: 'Who painted the Mona Lisa?', a: 'da vinci', opts: ['Michelangelo', 'Da Vinci', 'Raphael', 'Picasso'] },
  { q: 'What is the capital of Japan?', a: 'tokyo', opts: ['Osaka', 'Tokyo', 'Kyoto', 'Yokohama'] },
  { q: 'How many sides does a hexagon have?', a: '6', opts: ['5', '6', '7', '8'] },
];

const hangmanWords = [
  'javascript', 'python', 'whatsapp', 'computer', 'programming', 'algorithm',
  'database', 'keyboard', 'internet', 'software', 'hardware', 'function',
  'variable', 'elephant', 'chocolate', 'universe', 'adventure', 'butterfly',
  'telescope', 'dinosaur', 'pineapple', 'waterfall', 'hurricane', 'astronomy',
];
const spamTracker: Map<string, { count: number; lastTime: number; warned: boolean }> = new Map();
const SPAM_THRESHOLD = 5; // messages in 10 seconds = spam
const SPAM_WINDOW = 10000;

// Message deduplication — Baileys can deliver the same message event twice
// (e.g. on reconnect, sync, or WebSocket hiccup). Track recent message IDs.
const processedMessages = new Set<string>();
const DEDUP_MAX_SIZE = 500;
const DEDUP_CLEANUP_AT = 600;

function isDuplicateMessage(msgId: string): boolean {
  if (processedMessages.has(msgId)) return true;
  processedMessages.add(msgId);
  // Periodic cleanup to avoid memory leak
  if (processedMessages.size > DEDUP_CLEANUP_AT) {
    const entries = Array.from(processedMessages);
    const toRemove = entries.slice(0, entries.length - DEDUP_MAX_SIZE);
    toRemove.forEach(id => processedMessages.delete(id));
  }
  return false;
}

// AFK auto-reply cooldown per user — don't spam the same person
// Key: `${sessionId}:${senderJid}` → last reply timestamp
const afkReplyCooldown: Map<string, number> = new Map();
const AFK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour default

export async function handleMessage(message: any, sock: any, queue?: MessageQueue): Promise<void> {
  try {
    const chatJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    const msgId = message.key.id;

    // Dedup: skip if we already processed this exact message
    if (msgId && isDuplicateMessage(msgId)) {
      return;
    }

    // Extract text to check for command prefix
    const content =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      '';

    // Allow fromMe commands (userbot mode: bot owner can use !help etc.)
    // Skip non-command fromMe messages to avoid infinite loops
    if (fromMe && !content.trimStart().startsWith('!')) return;

    if (!content) return;

    const senderJid = message.key.participant || chatJid;
    const isGroup = chatJid.endsWith('@g.us');
    const isCommand = content.startsWith(COMMAND_PREFIX);
    const pushName = message.pushName || 'User';
    const sessionId = (sock as any).sessionId || queue?.['sessionId'];
    const userId = (sock as any).userId;

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      rawMessage: message,
      isGroup,
      pushName,
      sessionId,
      userId,
      queue,
    };

    // Track who sent last for double-text avoidance
    if (!fromMe) trackWhoSentLast(chatJid, false);

    // Session-level rate limit
    if (sessionId && isSessionRateLimited(sessionId)) {
      console.log(`Session rate limited: ${sessionId}`);
      return;
    }

    // Daily cap + warmup check (advanced anti-ban)
    if (sessionId && isDailyCapReached(sessionId)) {
      console.log(`Daily cap reached for session: ${sessionId}`);
      return;
    }

    // Smart reply filtering — skip ultra-short msgs, emoji-only, etc in groups
    if (!isCommand && shouldSilentlyIgnore(isGroup, content, senderJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    // Anti-spam flood detection
    if (isGroup && isSpamming(senderJid)) {
      const response = pickResponse(spamWarnings, { name: pushName, time: currentTimeStr() });
      await sendReply(chatJid, response, sock, message.key, queue);
      return;
    }

    // Per-group cooldown (advanced anti-ban)
    if (isGroup && isGroupOnCooldown(chatJid)) {
      return; // Silently skip — don't even warn, just act like a human who's busy
    }

    // Avoid double-texting in non-command scenarios
    if (!isCommand && shouldAvoidDoubleText(chatJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    // Track group activity for reply delay calculation
    if (isGroup) {
      trackGroupMessage(chatJid);
    }

    // Simulate going online naturally before responding
    await simulateGoingOnline(sock);

    // Per-contact reply frequency throttling (advanced anti-ban)
    if (shouldThrottleContact(senderJid)) {
      try { await sock.readMessages([message.key]); } catch { /* non-critical */ }
      return;
    }

    // Fetch owner settings for skip probability + AFK
    let ownerSkipProbability: number | undefined;
    let ownerSettings: { afk_enabled?: boolean; afk_message?: string; skip_probability?: number } | null = null;
    if (userId) {
      try {
        ownerSettings = await getUserSettings(userId);
        ownerSkipProbability = ownerSettings?.skip_probability ?? undefined;
      } catch { /* non-critical */ }
    }

    // Read-but-skip probability (advanced anti-ban) — owner-controlled
    if (shouldSkipResponse(isGroup, isCommand, ownerSkipProbability)) {
      // Mark as read but don't respond — like a real person ignoring a message
      try {
        await sock.readMessages([message.key]);
      } catch { /* non-critical */ }
      return;
    }

    // Natural delay variation (advanced anti-ban)
    if (sessionId) {
      await naturalDelay(sessionId);

      // Burst detection — if bot is replying too fast, add cooldown
      const burstDelay = checkBurstAndDelay(sessionId);
      if (burstDelay > 0) {
        await delay(burstDelay);
      }
    }

    // Group reply delay — simulate reading backlog in busy groups
    if (isGroup) {
      const groupDelay = getGroupReplyDelay(chatJid);
      if (groupDelay > 0) {
        await delay(groupDelay);
      }
    }

    // Track message for leaderboard (groups only, non-commands)
    if (isGroup && sessionId && !isCommand) {
      incrementLeaderboard(sessionId, senderJid, pushName).catch(() => {});
    }

    // Track all incoming messages for stats (non-blocking)
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

    // Check if sender mentioned an AFK user (groups)
    await checkAfkMentions(context, sock);

    // Private chat AFK auto-response: if someone DMs the bot owner and
    // the owner has AFK enabled, respond with the AFK message.
    // ONLY for non-command messages — commands should get their normal response.
    if (!isGroup && !isCommand && sessionId) {
      const ownerJid = (sock as any).user?.id;
      if (ownerJid && senderJid !== ownerJid) {
        // Check afk_states table (not user_settings) for the owner's AFK status
        try {
          const ownerAfk = await getAfkState(sessionId, ownerJid);
          if (ownerAfk?.is_afk) {
            // Per-user cooldown — don't spam the same person
            const cooldownKey = `${sessionId}:${senderJid}`;
            const lastReply = afkReplyCooldown.get(cooldownKey) || 0;
            if (Date.now() - lastReply > AFK_COOLDOWN_MS) {
              afkReplyCooldown.set(cooldownKey, Date.now());
              const afkMsg = ownerAfk.afk_reason || 'I am currently away';
              const response = pickResponse(afkReplies, { name: pushName || 'User', time: currentTimeStr() });
              await sendReply(
                chatJid,
                `${response}${ownerAfk.afk_reason ? `\n_Reason: ${ownerAfk.afk_reason}_` : ''}`,
                sock,
                message.key,
                queue,
              );
            }
          }
        } catch { /* afk check non-critical */ }
      }
    }

    // Owner-only command restriction:
    // Only the bot owner (the WhatsApp account linked to this session) can use ! commands.
    // Other users' command messages are silently ignored (they still get AFK/auto-replies above).
    const ownerJid = (sock as any).user?.id;
    const isOwner = fromMe || (ownerJid && normalizeJid(senderJid) === normalizeJid(ownerJid));

    if (isCommand && !isOwner) {
      // Non-owner tried to use a command — silently ignore
      // They already got AFK auto-reply above if applicable
      return;
    }

    if (isCommand && !isUserRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else if (isCommand) {
      console.log(`User rate limited: ${senderJid}`);
      const response = pickResponse(spamWarnings, { name: pushName });
      await sendReply(chatJid, response, sock, message.key, queue);
    }

    // Auto-reply only for non-command messages
    if (!isCommand) {
      await processAutoReply(context, sock);
    }

    // Track for daily cap + mark group replied + contact frequency (advanced anti-ban)
    if (sessionId) trackMessageSent(sessionId);
    if (isGroup) markGroupReplied(chatJid);
    trackContactReply(senderJid);
    trackWhoSentLast(chatJid, true); // Track that bot was last to send
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

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

  if (recentTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    return true;
  }

  recentTimestamps.push(now);
  sessionMessageTracker.set(sessionId, recentTimestamps);
  return false;
}

function isSpamming(userId: string): boolean {
  const now = Date.now();
  const tracker = spamTracker.get(userId);

  if (!tracker || now - tracker.lastTime > SPAM_WINDOW) {
    spamTracker.set(userId, { count: 1, lastTime: now, warned: false });
    return false;
  }

  tracker.count++;
  tracker.lastTime = now;

  if (tracker.count >= SPAM_THRESHOLD) {
    if (!tracker.warned) {
      tracker.warned = true;
      return true;
    }
    return false; // Already warned, silently ignore
  }

  return false;
}

// ─── Command Router ───────────────────────────────────────────────────────────

async function processCommand(context: MessageContext, sock: any): Promise<void> {
  if (!context.message.startsWith(COMMAND_PREFIX)) {
    return;
  }

  const parts = context.message.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  console.log(`Command: !${commandName} from ${context.senderJid}`);

  // Track all commands for stats (non-blocking)
  if (context.sessionId && context.userId) {
    trackCommand(context.sessionId, context.userId, context.senderJid, commandName);
  }

  // Small jitter before processing
  await delay(500 + Math.random() * 1500);

  const vars = {
    name: context.pushName || 'User',
    time: currentTimeStr(),
    date: currentDateStr(),
    group: context.isGroup ? context.chatJid.split('@')[0] : undefined,
  };

  switch (commandName) {
    case 'help':
    case 'h':
    case 'commands':
      await sendHelp(context, sock, vars);
      break;
    case 'ping':
    case 'pong':
    case 'alive':
      await sendPing(context, sock, vars);
      break;
    case 'sticker':
    case 's':
    case 'stick':
      await createSticker(context, sock, vars);
      break;
    case 'ai':
    case 'ask':
    case 'chat':
      await handleAICommand(context, args, sock, vars);
      break;
    case 'weather':
    case 'w':
    case 'forecast':
      await handleWeatherCommand(context, args, sock, vars);
      break;
    case 'joke':
    case 'jokes':
    case 'funny':
      await sendJoke(context, sock, vars);
      break;
    case 'play':
    case 'game':
    case 'games':
      await startGame(context, args, sock);
      break;
    case 'trivia':
      await startGame(context, ['trivia'], sock);
      break;
    case 'hangman':
      await startGame(context, ['hangman'], sock);
      break;
    case 'wordchain':
      await startGame(context, ['wordchain'], sock);
      break;
    case 'answer':
      await handleAnswer(context, args, sock);
      break;
    case 'poll':
    case 'survey':
      await createPoll(context, args, sock);
      break;
    case 'vote':
      await handleVote(context, args, sock);
      break;
    case 'leaderboard':
    case 'top':
    case 'scores':
    case 'lb':
      await showLeaderboard(context, sock);
      break;
    case 'download':
    case 'yt':
    case 'tiktok':
      await handleDownload(context, args, sock);
      break;
    case 'afk':
      await handleAfk(context, args, sock, vars);
      break;
    case 'define':
    case 'dictionary':
    case 'dict':
      await handleDefine(context, args, sock, vars);
      break;
    case 'horoscope':
    case 'zodiac':
      await handleHoroscope(context, args, sock, vars);
      break;
    case 'quote':
    case 'quotes':
    case 'q':
      await sendQuote(context, sock, vars);
      break;
    case 'translate':
    case 'tr':
      await handleTranslate(context, args, sock, vars);
      break;
    case 'doc':
    case 'document':
    case 'pdf':
      await handleDoc(context, args, sock, vars);
      break;
    case 'remind':
    case 'reminder':
    case 'remindme':
      await handleRemind(context, args, sock);
      break;
    case 'note':
    case 'notes':
    case 'memo':
      await handleNote(context, args, sock);
      break;
    case 'calc':
    case 'calculate':
    case 'math':
      await handleCalc(context, args, sock);
      break;
    case 'stats':
    case 'status':
    case 'info':
      await handleStats(context, sock);
      break;
    case 'schedule':
    case 'sched':
      await handleSchedule(context, args, sock);
      break;
    case 'save':
    case 'sv':
      await handleSave(context, sock);
      break;
    case 'repost':
    case 'rp':
    case 'repoststatus':
      await handleRepost(context, sock);
      break;
    case 'qr':
    case 'qrcode':
      await handleQR(context, args, sock);
      break;
    case 'tts':
    case 'speak':
    case 'say':
      await handleTTS(context, args, sock);
      break;
    case 'wiki':
    case 'wikipedia':
      await handleWiki(context, args, sock);
      break;
    case 'lyrics':
    case 'lyric':
      await handleLyrics(context, args, sock);
      break;
    case 'currency':
    case 'convert':
    case 'exchange':
      await handleCurrency(context, args, sock);
      break;
    case 'tagall':
    case 'everyone':
    case 'all':
      await handleTagAll(context, args, sock);
      break;
    case 'group':
    case 'groupinfo':
      await handleGroupInfo(context, sock);
      break;
    case 'meme':
    case 'memes':
      await handleMeme(context, sock);
      break;
    case '8ball':
    case 'eightball':
    case 'magic':
      await handle8Ball(context, args, sock);
      break;
    case 'truth':
      await handleTruth(context, sock);
      break;
    case 'dare':
      await handleDare(context, sock);
      break;
    case 'ship':
    case 'love':
      await handleShip(context, args, sock);
      break;
    case 'compliment':
      await handleCompliment(context, args, sock);
      break;
    case 'fortune':
    case 'cookie':
      await handleFortune(context, sock);
      break;
    case 'fact':
    case 'facts':
      await handleFact(context, sock);
      break;
    case 'riddle':
      await handleRiddle(context, sock);
      break;
    case 'img':
    case 'imagine':
    case 'image':
      await handleImg(context, args, sock);
      break;
    case 'short':
    case 'shorten':
      await handleShorten(context, args, sock);
      break;
    default:
      await sendUnknownCommand(context, sock, vars);
  }
}

// ─── AFK Mention Check ───────────────────────────────────────────────────────

async function checkAfkMentions(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) return;

  const mentioned = context.rawMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  for (const jid of mentioned) {
    try {
      const afkState = await getAfkState(context.sessionId, jid);
      if (afkState && afkState.is_afk) {
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

// ─── Helper: Send with Human-Like Flow ────────────────────────────────────────

async function sendReply(
  jid: string,
  content: any,
  sock: any,
  msgKey: any,
  queue?: MessageQueue,
): Promise<void> {
  // Apply message jitter + quiet hours to text content (advanced anti-ban)
  let processedContent = content;
  if (typeof processedContent === 'string') {
    const config = getActivityConfig();
    if (config.shortenResponses) {
      processedContent = shortenForQuietHours(processedContent);
    }
    processedContent = addMessageJitter(processedContent);
  } else if (processedContent?.text && typeof processedContent.text === 'string') {
    const config = getActivityConfig();
    if (config.shortenResponses) {
      processedContent = { ...processedContent, text: shortenForQuietHours(processedContent.text) };
    }
    processedContent = { ...processedContent, text: addMessageJitter(processedContent.text) };
  }

  // Always show typing indicator before sending — even when using queue
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch { /* non-critical */ }

  if (queue) {
    const messageContent = typeof processedContent === 'string' ? { text: processedContent } : processedContent;
    await queue.enqueue(jid, messageContent);
  } else {
    await humanSend(sock, jid, msgKey, processedContent);
  }

  // Clear typing indicator after send
  try {
    await sock.sendPresenceUpdate('paused', jid);
  } catch { /* non-critical */ }
}

// ─── Auto Reply ──────────────────────────────────────────────────────────────

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
        break; // Only match the first rule
      }
    }
  } catch {
    // non-critical
  }
}

// ─── Command Implementations ──────────────────────────────────────────────────

async function sendHelp(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const intro = pickResponse(helpIntros, vars, false);
  const helpMessage = `${intro}

*GENERAL*
!help — Show this menu
!ping — Check bot status
!sticker — Image/video/GIF to sticker
!sticker crop/circle/rounded — Crop modes
!joke — Random joke
!quote — Inspirational quote
!meme — Random meme from Reddit

*TOOLS*
!ai [msg] — AI chat (Groq)
!weather [city] — Weather info
!define [word] — Dictionary lookup
!horoscope [sign] — Daily horoscope
!translate [lang] [text] — Translate text
!doc [title] | [content] — Create .docx file
!calc [expr] — Calculator
!note save/list/view/delete — Notes
!qr [text/url] — Generate QR code
!tts [text] — Text to voice note
!wiki [topic] — Wikipedia summary
!lyrics [song] — Song lyrics
!currency [amt] [FROM] [TO] — Convert currency
!short [url] — Shorten a URL
!img [prompt] — AI image generation

*PRODUCTIVITY*
!remind [time] [msg] — Set reminder
!schedule [time] [msg] — Schedule message
!stats — Bot status & session info

*GAMES & FUN*
!play numberguess — Guess the number
!trivia — Multiple choice trivia
!hangman — Guess the word
!wordchain — Chain words by last letter
!answer [text] — Answer active game
!poll [q] | [opts] — Create poll
!vote [n] — Vote on poll
!leaderboard — Top active users
!8ball [question] — Magic 8-Ball
!truth — Truth question
!dare — Dare challenge
!ship [name1] [name2] — Love calculator
!compliment [name] — Random compliment
!fortune — Fortune cookie
!fact — Random fun fact
!riddle — Random riddle (answer in 30s)

*SOCIAL*
!afk [reason] — Set AFK (auto-reply)
!afk off — Disable AFK
!download [url] — Download media
!save — Reply to save msg to your chat
!repost — Reply to post as Status
!tagall [msg] — Mention all group members
!group — View group info

_Only the bot owner can use commands._`;

  await sendReply(context.chatJid, helpMessage, sock, context.rawMessage.key, context.queue);
}

async function sendPing(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const response = pickResponse(pingReplies, vars);
  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function sendUnknownCommand(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const response = pickResponse(unknownCommandReplies, vars, false);
  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function downloadMedia(message: any, sock: any): Promise<Buffer | null> {
  // Try Baileys standalone download first (works with real Baileys sockets)
  try {
    const buffer = await baileysDownloadMedia(message, 'buffer', {});
    if (buffer) return Buffer.from(buffer);
  } catch {
    // Fallback below
  }

  // Fallback: try sock.downloadMediaMessage (works with EvolutionSocketAdapter)
  try {
    if (typeof (sock as any).downloadMediaMessage === 'function') {
      const buffer = await (sock as any).downloadMediaMessage(message, 'buffer');
      if (buffer) return buffer;
    }
  } catch {
    // Fallback below
  }

  // Last resort: try to get URL directly from message and fetch
  try {
    const msg = message?.message;
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
    for (const type of mediaTypes) {
      const mediaMsg = msg?.[type];
      if (mediaMsg?.url && typeof mediaMsg.url === 'string') {
        const res = await axios.get(mediaMsg.url, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(res.data);
      }
    }
  } catch {
    // All methods failed
  }

  return null;
}

async function createSticker(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  try {
    const args = context.message.replace(/^!sticker\s*/i, '').trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase() || '';

    // Determine media message — direct image/video or quoted
    const quotedMsg = context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasImage = !!(context.rawMessage.message?.imageMessage || quotedMsg?.imageMessage);
    const hasVideo = !!(context.rawMessage.message?.videoMessage || quotedMsg?.videoMessage);
    const hasStickerMedia = !!(context.rawMessage.message?.stickerMessage || quotedMsg?.stickerMessage);

    // Parse sticker type from args
    let stickerType: StickerTypes = StickerTypes.FULL;
    let packName = 'BotWave';
    let authorName = context.pushName || 'User';

    if (['crop', 'cropped'].includes(subcommand)) stickerType = StickerTypes.CROPPED;
    else if (['circle', 'round'].includes(subcommand)) stickerType = StickerTypes.CIRCLE;
    else if (['rounded'].includes(subcommand)) stickerType = StickerTypes.ROUNDED;
    else if (['full'].includes(subcommand)) stickerType = StickerTypes.FULL;
    else if (subcommand === 'pack' && args.length > 1) {
      packName = args.slice(1).join(' ');
    }

    // No media provided — show usage
    if (!hasImage && !hasVideo && !hasStickerMedia) {
      await sendReply(
        context.chatJid,
        `*STICKER MAKER*\n\nSend or reply to an image/video/GIF with:\n\n` +
        `*!sticker* — Full sticker (default)\n` +
        `*!sticker crop* — Cropped to square\n` +
        `*!sticker circle* — Circular crop\n` +
        `*!sticker rounded* — Rounded corners\n` +
        `*!sticker pack [name]* — Set pack name\n\n` +
        `_Supports: images, short videos, GIFs_`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    // Use the quoted message if replying, otherwise the direct message
    const mediaMessage = quotedMsg
      ? { ...context.rawMessage, message: quotedMsg }
      : context.rawMessage;

    const mediaBuffer = await downloadMedia(mediaMessage, sock);
    if (!mediaBuffer) {
      await sendReply(context.chatJid, 'Could not download the media. Please try sending the image again.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Use wa-sticker-formatter for proper sticker creation with metadata
    const sticker = new Sticker(mediaBuffer, {
      pack: packName,
      author: authorName,
      type: stickerType,
      quality: 70,
    });

    const stickerBuffer = await sticker.toBuffer();

    await sendReply(context.chatJid, { sticker: stickerBuffer }, sock, context.rawMessage.key, context.queue);

    // In private chats, omit {name} from sticker replies since it's 1:1
    const stickerVars = context.isGroup ? vars : { time: vars.time, date: vars.date };
    let reply = pickResponse(stickerReplies, stickerVars);

    // Promo check
    if (context.sessionId && context.userId) {
      const showPromo = await shouldShowPromo(
        context.sessionId,
        context.userId,
        context.senderJid,
        'sticker',
      );
      if (showPromo) {
        reply += getPromoMessage();
      }
    }

    await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[STICKER] Error creating sticker:', error);
    await sendReply(context.chatJid, 'Error creating sticker. Make sure the image/video is valid and try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleAICommand(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const query = args.join(' ');
  if (!query) {
    await sendReply(
      context.chatJid,
      'Please provide a message after *!ai*\n\nExample: !ai What is quantum computing?',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // BYOK — get user's Groq API key from Supabase
  let groqKey: string | null = null;
  if (context.sessionId) {
    try {
      const settings = await getUserSettings(context.userId || '');
      groqKey = settings?.groq_api_key || null;
    } catch {
      // fallback
    }
  }

  if (!groqKey) {
    await sendReply(
      context.chatJid,
      'Add your Groq API key in the dashboard to use AI!\nbotwave.com/dashboard -> Settings -> AI Settings\n\nGroq is free at console.groq.com',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    await sendReply(context.chatJid, 'Thinking...', sock, context.rawMessage.key, context.queue);

    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: groqKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful WhatsApp bot assistant called BotWave. Keep responses concise and friendly. Max 300 words.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not process that request.';

    const intro = pickResponse(aiIntros, vars, false);

    await sendReply(context.chatJid, `${intro}\n\n${aiResponse}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Groq API error:', error);
    await sendReply(
      context.chatJid,
      'AI service error. Check your Groq API key or try again later.',
      sock,
      context.rawMessage.key,
      context.queue,
    );
  }
}

async function handleWeatherCommand(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      'Usage: *!weather [city]*\n\nExample: !weather London',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const city = args.join(' ');
  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    const intro = pickResponse(weatherReplies, vars, false);

    if (apiKey) {
      // OpenWeatherMap API (if key configured)
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
        { timeout: 10000 },
      );
      const data = response.data;
      const weatherInfo = `${intro}\n\n*${data.name}, ${data.sys.country}*\n\nTemp: ${data.main.temp}°C\nHumidity: ${data.main.humidity}%\nWind: ${data.wind.speed} m/s\nCondition: ${data.weather[0].description}\nFeels like: ${data.main.feels_like}°C`;
      await sendReply(context.chatJid, weatherInfo, sock, context.rawMessage.key, context.queue);
    } else {
      // Free fallback: wttr.in (no API key needed)
      const response = await axios.get(
        `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
        { timeout: 10000 },
      );
      const data = response.data;
      const current = data?.current_condition?.[0];
      const area = data?.nearest_area?.[0];
      if (!current) {
        await sendReply(context.chatJid, `Could not get weather for "${city}".`, sock, context.rawMessage.key, context.queue);
        return;
      }
      const areaName = area?.areaName?.[0]?.value || city;
      const country = area?.country?.[0]?.value || '';
      const weatherInfo = `${intro}\n\n*${areaName}${country ? ', ' + country : ''}*\n\nTemp: ${current.temp_C}°C\nHumidity: ${current.humidity}%\nWind: ${current.windspeedKmph} km/h\nCondition: ${current.weatherDesc?.[0]?.value || 'N/A'}\nFeels like: ${current.FeelsLikeC}°C`;
      await sendReply(context.chatJid, weatherInfo, sock, context.rawMessage.key, context.queue);
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendReply(context.chatJid, `City "${city}" not found.`, sock, context.rawMessage.key, context.queue);
    } else {
      console.error('Weather API error:', error);
      await sendReply(context.chatJid, 'Weather service temporarily unavailable. Try again later.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function sendJoke(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const joke = pickResponse(jokePool, vars, false);
  await sendReply(context.chatJid, joke, sock, context.rawMessage.key, context.queue);
}

async function sendQuote(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const quote = pickResponse(quotePool, vars, false);
  await sendReply(context.chatJid, quote, sock, context.rawMessage.key, context.queue);
}

async function startGame(context: MessageContext, args: string[], sock: any): Promise<void> {
  const gameType = args[0]?.toLowerCase();

  if (!gameType) {
    const response = `*MINI GAMES*\n\nAvailable:\n!play numberguess\n!trivia\n!hangman\n!wordchain`;
    await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
    return;
  }

  switch (gameType) {
    case 'numberguess': {
      const targetNumber = Math.floor(Math.random() * 100) + 1;
      gameStates.set(context.chatJid, { type: 'numberguess', target: targetNumber, attempts: 0, userJid: context.senderJid });
      await sendReply(
        context.chatJid,
        "I'm thinking of a number between 1 and 100.\nUse *!answer [number]* to guess!",
        sock,
        context.rawMessage.key,
        context.queue,
      );
      break;
    }
    case 'trivia': {
      const trivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
      gameStates.set(context.chatJid, { type: 'trivia', question: trivia.q, answer: trivia.a, options: trivia.opts, userJid: context.senderJid });
      let msg = `*TRIVIA TIME!*\n\n${trivia.q}\n\n`;
      trivia.opts.forEach((opt, i) => { msg += `${i + 1}. ${opt}\n`; });
      msg += '\nUse *!answer [number or text]* to answer!';
      await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
      break;
    }
    case 'hangman': {
      const word = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
      gameStates.set(context.chatJid, { type: 'hangman', word, guessed: new Set<string>(), wrongGuesses: 0, userJid: context.senderJid });
      const display = word.split('').map(() => '_').join(' ');
      await sendReply(context.chatJid, `*HANGMAN*\n\n${display}\n\nWord: ${word.length} letters\nWrong guesses left: 6\n\nGuess a letter with *!answer [letter]*`, sock, context.rawMessage.key, context.queue);
      break;
    }
    case 'wordchain': {
      const starters = ['apple', 'house', 'music', 'table', 'river', 'light', 'ocean', 'stone'];
      const starter = starters[Math.floor(Math.random() * starters.length)];
      gameStates.set(context.chatJid, { type: 'wordchain', lastWord: starter, usedWords: new Set([starter]), userJid: context.senderJid });
      await sendReply(context.chatJid, `*WORD CHAIN*\n\nI start with: *${starter}*\n\nYour turn! Send a word starting with the letter *${starter[starter.length - 1].toUpperCase()}*\n\nUse *!answer [word]*`, sock, context.rawMessage.key, context.queue);
      break;
    }
    default:
      await sendReply(
        context.chatJid,
        `Unknown game. Try: !play numberguess, !trivia, !hangman, !wordchain`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
  }
}

async function handleAnswer(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, 'Please provide an answer.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const game = gameStates.get(context.chatJid);
  if (!game) {
    await sendReply(context.chatJid, 'No active game. Start one with !play', sock, context.rawMessage.key, context.queue);
    return;
  }

  const answer = args.join(' ').toLowerCase().trim();

  switch (game.type) {
    case 'numberguess': {
      const guess = parseInt(args[0], 10);
      if (isNaN(guess)) {
        await sendReply(context.chatJid, 'Please provide a valid number', sock, context.rawMessage.key, context.queue);
        return;
      }
      game.attempts++;
      if (guess === game.target) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `CORRECT! The number was ${game.target}. You got it in ${game.attempts} attempt(s)!`, sock, context.rawMessage.key, context.queue);
      } else if (guess < game.target) {
        await sendReply(context.chatJid, `Too low! Try higher. (Attempt ${game.attempts})`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `Too high! Try lower. (Attempt ${game.attempts})`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'trivia': {
      // Accept option number or text match
      const optionNum = parseInt(answer, 10);
      const isCorrect =
        answer === game.answer ||
        answer.includes(game.answer) ||
        game.answer.includes(answer) ||
        (optionNum >= 1 && optionNum <= game.options.length && game.options[optionNum - 1].toLowerCase().includes(game.answer));
      gameStates.delete(context.chatJid);
      if (isCorrect) {
        await sendReply(context.chatJid, `Correct! The answer is *${game.options.find(o => o.toLowerCase().includes(game.answer)) || game.answer}*`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `Wrong! The correct answer was *${game.options.find(o => o.toLowerCase().includes(game.answer)) || game.answer}*\n\nTry again with !trivia`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'hangman': {
      const letter = answer[0]?.toLowerCase();
      if (!letter || !/[a-z]/.test(letter)) {
        await sendReply(context.chatJid, 'Please guess a single letter (a-z)', sock, context.rawMessage.key, context.queue);
        return;
      }
      if (game.guessed.has(letter)) {
        await sendReply(context.chatJid, `You already guessed "${letter}". Try a different letter.`, sock, context.rawMessage.key, context.queue);
        return;
      }
      game.guessed.add(letter);
      if (!game.word.includes(letter)) {
        game.wrongGuesses++;
      }
      const display = game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ');
      const guessedLetters = Array.from(game.guessed).join(', ');
      if (!display.includes('_')) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `*YOU WIN!*\n\n${display}\n\nThe word was *${game.word}*! Wrong guesses: ${game.wrongGuesses}`, sock, context.rawMessage.key, context.queue);
      } else if (game.wrongGuesses >= 6) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `*GAME OVER!*\n\nThe word was *${game.word}*\n\nTry again with !hangman`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `${display}\n\nGuessed: ${guessedLetters}\nWrong guesses left: ${6 - game.wrongGuesses}`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'wordchain': {
      const word = answer.toLowerCase().trim();
      if (word.length < 2) {
        await sendReply(context.chatJid, 'Word must be at least 2 letters long.', sock, context.rawMessage.key, context.queue);
        return;
      }
      const requiredLetter = game.lastWord[game.lastWord.length - 1];
      if (word[0] !== requiredLetter) {
        await sendReply(context.chatJid, `Your word must start with *${requiredLetter.toUpperCase()}*! (Last word: ${game.lastWord})`, sock, context.rawMessage.key, context.queue);
        return;
      }
      if (game.usedWords.has(word)) {
        await sendReply(context.chatJid, `"${word}" was already used! Try another word starting with *${requiredLetter.toUpperCase()}*`, sock, context.rawMessage.key, context.queue);
        return;
      }
      game.usedWords.add(word);
      // Bot's turn — find a word starting with the last letter of user's word
      const nextLetter = word[word.length - 1];
      const botWords = ['elephant', 'tiger', 'rainbow', 'whisper', 'rocket', 'engine', 'energy', 'yellow', 'wizard', 'dream', 'music', 'castle', 'eagle', 'echo', 'orbit', 'turtle', 'emerald', 'desert', 'train', 'needle', 'eagle', 'evening', 'garden', 'nature', 'escape'];
      const available = botWords.filter(w => w[0] === nextLetter && !game.usedWords.has(w));
      if (available.length === 0) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `Nice one! I can't think of a word starting with *${nextLetter.toUpperCase()}*. You win! Chain length: ${game.usedWords.size} words`, sock, context.rawMessage.key, context.queue);
      } else {
        const botWord = available[Math.floor(Math.random() * available.length)];
        game.usedWords.add(botWord);
        game.lastWord = botWord;
        await sendReply(context.chatJid, `*${word}* — nice!\n\nMy turn: *${botWord}*\n\nYour turn! Word starting with *${botWord[botWord.length - 1].toUpperCase()}*\nChain: ${game.usedWords.size} words`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
  }
}

async function createPoll(context: MessageContext, args: string[], sock: any): Promise<void> {
  const pollInput = args
    .join(' ')
    .split('|')
    .map((s) => s.trim());

  if (pollInput.length < 3) {
    await sendReply(
      context.chatJid,
      'Usage: *!poll [question] | [option1] | [option2] | ...*',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const question = pollInput[0];
  const options = pollInput.slice(1).filter((o) => o.length > 0);

  try {
    await savePoll(context.sessionId || '', context.chatJid, question, options, context.senderJid);

    let pollMessage = `*POLL*\n\n*${question}*\n\n`;
    options.forEach((option, index) => {
      pollMessage += `${index + 1}. ${option}\n`;
    });
    pollMessage += '\nVote: !vote [number]';

    await sendReply(context.chatJid, pollMessage, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Error creating poll:', error);
    await sendReply(context.chatJid, 'Error creating poll.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleVote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, 'Usage: *!vote [number]*\n\nVote for an option in the active poll.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const optionNum = parseInt(args[0], 10);
  if (isNaN(optionNum) || optionNum < 1) {
    await sendReply(context.chatJid, 'Please provide a valid option number.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Voting not available without a session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const poll = await getActivePoll(context.sessionId, context.chatJid);
    if (!poll) {
      await sendReply(context.chatJid, 'No active poll in this chat. Create one with !poll', sock, context.rawMessage.key, context.queue);
      return;
    }

    if (optionNum > (poll.options?.length || 0)) {
      await sendReply(context.chatJid, `Invalid option. Choose 1-${poll.options.length}`, sock, context.rawMessage.key, context.queue);
      return;
    }

    await recordVote(poll.id, optionNum - 1);
    const vars = { name: context.senderJid.split('@')[0], time: currentTimeStr() };
    const response = pickResponse(pollReplies, vars, false);
    await sendReply(context.chatJid, `${response}\nYou voted for: *${poll.options[optionNum - 1]}*`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Vote error:', error);
    await sendReply(context.chatJid, 'Error recording vote. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function showLeaderboard(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'LEADERBOARD - Session not configured.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const leaderboardData = await getLeaderboard(context.sessionId, 10);

    if (!leaderboardData || leaderboardData.length === 0) {
      await sendReply(context.chatJid, 'LEADERBOARD - No messages yet.', sock, context.rawMessage.key, context.queue);
      return;
    }

    let leaderboardMsg = '*LEADERBOARD*\n\n';
    leaderboardData.forEach((entry: any, index: number) => {
      const name = entry.user_name || entry.user_jid?.split('@')[0] || 'Unknown';
      const medal = index === 0 ? '' : index === 1 ? '' : index === 2 ? '' : `${index + 1}.`;
      leaderboardMsg += `${medal} *${name}* - ${entry.message_count || 0} msgs\n`;
    });

    await sendReply(context.chatJid, leaderboardMsg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Leaderboard error:', error);
    await sendReply(context.chatJid, 'Leaderboard temporarily unavailable', sock, context.rawMessage.key, context.queue);
  }
}

async function handleDownload(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      'Usage: *!download [url]*\n\nSupported: YouTube, TikTok, Instagram, Twitter/X links\n\n_Note: Due to platform restrictions, some links may not work. We use a free API._',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const url = args[0];
  if (!url.startsWith('http')) {
    await sendReply(context.chatJid, 'Please provide a valid URL starting with http:// or https://', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    await sendReply(context.chatJid, 'Fetching media... this may take a moment.', sock, context.rawMessage.key, context.queue);

    // Try cobalt API for video/audio download
    const response = await axios.post('https://api.cobalt.tools/api/json', {
      url,
      vCodec: 'h264',
      vQuality: '720',
      aFormat: 'mp3',
    }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 15000,
    });

    if (response.data?.url) {
      // Download the media
      const mediaResponse = await axios.get(response.data.url, { responseType: 'arraybuffer', timeout: 30000 });
      const buffer = Buffer.from(mediaResponse.data);
      const contentType = String(mediaResponse.headers['content-type'] || '');

      if (contentType.includes('video')) {
        await sendReply(context.chatJid, { video: buffer, caption: 'Downloaded via BotWave' }, sock, context.rawMessage.key, context.queue);
      } else if (contentType.includes('audio')) {
        await sendReply(context.chatJid, { audio: buffer, mimetype: 'audio/mpeg' }, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, { document: buffer, mimetype: contentType, fileName: 'download' }, sock, context.rawMessage.key, context.queue);
      }
    } else {
      await sendReply(context.chatJid, 'Could not extract media from that URL. The link may not be supported or the content may be private.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error: any) {
    console.error('[DOWNLOAD] Error:', error?.message || error);
    await sendReply(context.chatJid, 'Download failed. The URL may not be supported or the service is temporarily unavailable. Try again later.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── New Commands from Spec ───────────────────────────────────────────────────

async function handleAfk(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'AFK not available without a session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const subcommand = args[0]?.toLowerCase();
  const reason = args.slice(1).join(' ') || args.join(' ');

  if (subcommand === 'off') {
    await setAfkState(context.sessionId, context.senderJid, false);
    await sendReply(
      context.chatJid,
      `Welcome back, ${vars.name}! AFK mode disabled.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Default: turn on
  const afkReason = subcommand === 'on' ? args.slice(1).join(' ') || undefined : reason || undefined;
  await setAfkState(context.sessionId, context.senderJid, true, afkReason);
  await sendReply(
    context.chatJid,
    `${vars.name} is now AFK.${afkReason ? ` Reason: ${afkReason}` : ''}`,
    sock,
    context.rawMessage.key,
    context.queue,
  );
}

async function handleDefine(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      'Usage: *!define [word]*\n\nExample: !define serendipity',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const word = args.join(' ');

  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const entry = response.data[0];

    if (!entry) {
      await sendReply(context.chatJid, `No definition found for "${word}".`, sock, context.rawMessage.key, context.queue);
      return;
    }

    const intro = pickResponse(dictReplies, vars, false);
    const phonetic = entry.phonetic || '';
    const meanings = entry.meanings
      .slice(0, 3)
      .map((m: any) => {
        const defs = m.definitions.slice(0, 2).map((d: any) => d.definition).join('\n  ');
        return `*${m.partOfSpeech}*\n  ${defs}`;
      })
      .join('\n\n');

    await sendReply(
      context.chatJid,
      `${intro}\n\n*${entry.word}* ${phonetic}\n\n${meanings}`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendReply(context.chatJid, `No definition found for "${word}".`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Dictionary service error.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function handleHoroscope(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    const signs = Object.entries(horoscopeSigns)
      .map(([name, info]) => `${info.emoji} ${name}`)
      .join('\n');
    await sendReply(
      context.chatJid,
      `*HOROSCOPE*\n\nUsage: !horoscope [sign]\n\n${signs}`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const sign = args[0].toLowerCase();
  const signData = horoscopeSigns[sign];

  if (!signData) {
    await sendReply(
      context.chatJid,
      `Unknown sign "${args[0]}". Use !horoscope to see all signs.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const reading = horoscopeReadings[Math.floor(Math.random() * horoscopeReadings.length)];

  await sendReply(
    context.chatJid,
    `${signData.emoji} *${sign.toUpperCase()}* (${signData.element})\n\n${reading}\n\n_${vars.date}_`,
    sock,
    context.rawMessage.key,
    context.queue,
  );
}

async function handleTranslate(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (args.length < 2) {
    await sendReply(
      context.chatJid,
      'Usage: *!translate [lang] [text]*\n\nExample: !translate es Hello world\n\nLanguages: es, fr, de, pt, it, ja, ko, zh, ar, hi, ru',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const targetLang = args[0].toLowerCase();
  const text = args.slice(1).join(' ');

  try {
    // Using a free translation API
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
    );

    const translated = response.data?.responseData?.translatedText;
    if (!translated) {
      await sendReply(context.chatJid, 'Translation failed. Try again.', sock, context.rawMessage.key, context.queue);
      return;
    }

    let reply = pickResponse(translateReplies, vars, false);
    reply += `\n\n*Original:* ${text}\n*Translated (${targetLang}):* ${translated}`;

    // Promo check
    if (context.sessionId && context.userId) {
      const showPromo = await shouldShowPromo(
        context.sessionId,
        context.userId,
        context.senderJid,
        'translate',
      );
      if (showPromo) {
        reply += getPromoMessage();
      }
    }

    await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Translation error:', error);
    await sendReply(context.chatJid, 'Translation service error.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleDoc(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      `*DOCUMENT MAKER*\n\n` +
      `*Option 1 — Title + Content:*\n` +
      `!doc My Title | Your content goes here exactly as you type it\n\n` +
      `*Option 2 — Reply to a message:*\n` +
      `Reply to any message with *!doc My Title* and the replied message becomes the content\n\n` +
      `*Option 3 — Content only:*\n` +
      `!doc Just type your content here and the title will be "Document"\n\n` +
      `_Your formatting, line breaks, and spacing are preserved exactly._`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Use the raw message text (preserves newlines, spacing, formatting exactly)
  const rawText = context.message.replace(/^!doc(ument)?\s*/i, '');

  // Check if replying to a message — use that as content
  const quotedText = context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
    context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';

  let title: string;
  let content: string;

  if (quotedText) {
    // Replying to a message: what you type = title, quoted message = content
    title = rawText.trim() || 'Document';
    content = quotedText;
  } else if (rawText.includes('|')) {
    // Pipe separator: title | content (everything after the first | is content)
    const pipeIndex = rawText.indexOf('|');
    title = rawText.slice(0, pipeIndex).trim() || 'Document';
    content = rawText.slice(pipeIndex + 1).trim();
    if (!content) {
      content = title;
      title = 'Document';
    }
  } else {
    // No pipe, no reply: everything you typed is the content, title is auto
    title = 'Document';
    content = rawText;
  }

  try {
    // Preserve line breaks and formatting — each line becomes its own paragraph
    const contentLines = content.split('\n');
    const contentParagraphs = contentLines.map(line =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 24,
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            ...contentParagraphs,
            new Paragraph({ children: [new TextRun({ text: '' })] }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated by BotWave at ${currentTimeStr()} on ${currentDateStr()}`,
                  size: 16,
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50) || 'Document';

    await sendReply(
      context.chatJid,
      {
        document: buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${safeTitle}.docx`,
      },
      sock,
      context.rawMessage.key,
      context.queue,
    );

    let reply = pickResponse(docReplies, vars);

    // Promo check
    if (context.sessionId && context.userId) {
      const showPromo = await shouldShowPromo(
        context.sessionId,
        context.userId,
        context.senderJid,
        'doc',
      );
      if (showPromo) {
        reply += getPromoMessage();
      }
    }

    await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Doc creation error:', error);
    await sendReply(context.chatJid, 'Error creating document.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Remind Command ──────────────────────────────────────────────────────────

function parseTimeString(timeStr: string): Date | null {
  const now = new Date();

  // Match patterns: 5m, 10min, 1h, 2hr, 30s, 1d, 1day
  const match = timeStr.match(/^(\d+)\s*(s|sec|m|min|h|hr|hour|d|day)s?$/i);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const ms = now.getTime();

    if (unit === 's' || unit === 'sec') return new Date(ms + amount * 1000);
    if (unit === 'm' || unit === 'min') return new Date(ms + amount * 60000);
    if (unit === 'h' || unit === 'hr' || unit === 'hour') return new Date(ms + amount * 3600000);
    if (unit === 'd' || unit === 'day') return new Date(ms + amount * 86400000);
  }

  return null;
}

async function handleRemind(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for reminders.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (args.length === 0) {
    // Show pending reminders
    const reminders = await getUserReminders(context.sessionId, context.senderJid);
    if (reminders.length === 0) {
      await sendReply(context.chatJid, 'You have no pending reminders. Use: !remind 30m Take a break', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Your Reminders:*\n';
    reminders.forEach((r, i) => {
      const timeLeft = Math.max(0, new Date(r.remind_at).getTime() - Date.now());
      const mins = Math.ceil(timeLeft / 60000);
      msg += `${i + 1}. "${r.message}" — in ${mins}min\n`;
    });
    msg += '\nUse !remind cancel <number> to remove one.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Cancel a reminder: !remind cancel 1
  if (args[0].toLowerCase() === 'cancel' && args[1]) {
    const reminders = await getUserReminders(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < reminders.length) {
      await deleteReminder(reminders[index].id, context.senderJid);
      await sendReply(context.chatJid, `Reminder "${reminders[index].message}" cancelled.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid reminder number. Use !remind to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // Create a reminder: !remind 30m Take a break
  const remindAt = parseTimeString(args[0]);
  if (!remindAt) {
    await sendReply(context.chatJid, 'Invalid time format. Examples: !remind 5m Drink water, !remind 1h Check email, !remind 2d Follow up', sock, context.rawMessage.key, context.queue);
    return;
  }

  const message = args.slice(1).join(' ') || 'Reminder!';
  const reminder = await createReminder(context.sessionId, context.senderJid, context.chatJid, message, remindAt);
  if (reminder) {
    const mins = Math.ceil((remindAt.getTime() - Date.now()) / 60000);
    await sendReply(context.chatJid, `Got it! I'll remind you in ${mins} minute(s): "${message}"`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, 'Failed to set reminder. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Note Command ────────────────────────────────────────────────────────────

async function handleNote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for notes.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const subCommand = (args[0] || 'list').toLowerCase();

  if (subCommand === 'list' || args.length === 0) {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    if (notes.length === 0) {
      await sendReply(context.chatJid, 'No notes saved. Use: !note save <title> | <content>', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Your Notes:*\n';
    notes.forEach((n, i) => {
      const preview = n.content.length > 50 ? n.content.slice(0, 50) + '...' : n.content;
      msg += `${i + 1}. *${n.title}* — ${preview}\n`;
    });
    msg += '\nUse !note view <number> to read, !note delete <number> to remove.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (subCommand === 'save' || subCommand === 'add') {
    const rest = args.slice(1).join(' ');
    const parts = rest.split('|').map(p => p.trim());
    const title = parts[0] || 'Untitled';
    const content = parts[1] || parts[0] || '';
    if (!content) {
      await sendReply(context.chatJid, 'Usage: !note save My Title | This is the content', sock, context.rawMessage.key, context.queue);
      return;
    }
    const note = await createNote(context.sessionId, context.senderJid, title, content);
    if (note) {
      await sendReply(context.chatJid, `Note saved: *${title}*`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Failed to save note. Try again.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (subCommand === 'view' || subCommand === 'read') {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < notes.length) {
      const n = notes[index];
      await sendReply(context.chatJid, `*${n.title}*\n\n${n.content}\n\n_Saved: ${new Date(n.created_at).toLocaleDateString()}_`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid note number. Use !note to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (subCommand === 'delete' || subCommand === 'del' || subCommand === 'remove') {
    const notes = await getUserNotes(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < notes.length) {
      await deleteNote(notes[index].id, context.senderJid);
      await sendReply(context.chatJid, `Note "${notes[index].title}" deleted.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid note number. Use !note to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  await sendReply(context.chatJid, 'Usage: !note save <title> | <content>, !note list, !note view <n>, !note delete <n>', sock, context.rawMessage.key, context.queue);
}

// ─── Calc Command ────────────────────────────────────────────────────────────

async function handleCalc(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length === 0) {
    await sendReply(context.chatJid, 'Usage: !calc 2+2, !calc 100/3, !calc sqrt(144)', sock, context.rawMessage.key, context.queue);
    return;
  }

  const expression = args.join(' ');

  // Sanitize: only allow digits, operators, parentheses, decimal points, and math words
  const sanitized = expression.replace(/[^0-9+\-*/().%^, a-z]/gi, '');
  if (!sanitized || sanitized.length > 100) {
    await sendReply(context.chatJid, 'Invalid expression. Only basic math is supported.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    // Replace common math functions with JS equivalents
    let jsExpr = sanitized
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bround\b/gi, 'Math.round')
      .replace(/\bfloor\b/gi, 'Math.floor')
      .replace(/\bceil\b/gi, 'Math.ceil')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\^/g, '**');

    // Block dangerous patterns
    if (/[a-z]/i.test(jsExpr.replace(/Math\.(sqrt|abs|round|floor|ceil|PI)/g, ''))) {
      await sendReply(context.chatJid, 'Invalid expression. Only numbers and basic operators allowed.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const fn = new Function(`return (${jsExpr})`);
    const result = fn();

    if (typeof result !== 'number' || !isFinite(result)) {
      await sendReply(context.chatJid, `Result: undefined (check your expression)`, sock, context.rawMessage.key, context.queue);
      return;
    }

    const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '');
    await sendReply(context.chatJid, `${expression} = *${formatted}*`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Could not evaluate that expression. Try something like: !calc 2 * (3 + 4)', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Stats Command ───────────────────────────────────────────────────────────

async function handleStats(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session info not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const stats = await getSessionStats(context.sessionId);

    // Calculate uptime
    const uptimeMs = process.uptime() * 1000;
    const uptimeHrs = Math.floor(uptimeMs / 3600000);
    const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = uptimeHrs > 0 ? `${uptimeHrs}h ${uptimeMins}m` : `${uptimeMins}m`;

    // Get daily message count from anti-ban tracking
    const { isDailyCapReached } = await import('../utils/advancedAntiban');
    const dailyCapInfo = isDailyCapReached(context.sessionId) ? 'Limit reached' : 'Active';

    let msg = `*BOT STATUS*\n\n`;
    msg += `Status: Online\n`;
    msg += `Uptime: ${uptimeStr}\n`;
    msg += `Daily Sending: ${dailyCapInfo}\n`;

    if (stats.session) {
      msg += `\n*SESSION*\n`;
      msg += `Name: ${stats.session.session_name || 'Default'}\n`;
      msg += `Connected: ${stats.session.state === 'active' ? 'Yes' : stats.session.state}\n`;
      msg += `Created: ${new Date(stats.session.created_at).toLocaleDateString()}\n`;
      if (stats.session.last_active) {
        const lastActiveAgo = Date.now() - new Date(stats.session.last_active).getTime();
        const agoMins = Math.floor(lastActiveAgo / 60000);
        msg += `Last Active: ${agoMins < 1 ? 'Just now' : agoMins < 60 ? `${agoMins}m ago` : `${Math.floor(agoMins / 60)}h ago`}\n`;
      }
    }

    msg += `\n*MESSAGES*\n`;
    msg += `Total: ${stats.totalMessages}\n`;
    msg += `Active Games: ${gameStates.size}\n`;
    msg += `Dedup Cache: ${processedMessages.size} msgs\n`;

    if (stats.topUsers.length > 0) {
      msg += '\n*TOP USERS*\n';
      stats.topUsers.slice(0, 5).forEach((u, i) => {
        const name = u.user_name || u.user_jid.split('@')[0];
        msg += `${i + 1}. ${name} — ${u.message_count} msgs\n`;
      });
    }

    msg += `\n_BotWave v1.0 | ${currentTimeStr()} ${currentDateStr()}_`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Stats error:', error);
    await sendReply(context.chatJid, 'Failed to fetch stats.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Schedule Command ────────────────────────────────────────────────────────

async function handleSchedule(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available for scheduling.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (args.length === 0) {
    // Show pending scheduled messages
    const scheduled = await getUserScheduledMessages(context.sessionId, context.senderJid);
    if (scheduled.length === 0) {
      await sendReply(context.chatJid, 'No scheduled messages. Use: !schedule 1h Hello future me!', sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = '*Scheduled Messages:*\n';
    scheduled.forEach((s, i) => {
      const timeLeft = Math.max(0, new Date(s.send_at).getTime() - Date.now());
      const mins = Math.ceil(timeLeft / 60000);
      const preview = s.message.length > 30 ? s.message.slice(0, 30) + '...' : s.message;
      msg += `${i + 1}. "${preview}" — sends in ${mins}min\n`;
    });
    msg += '\nUse !schedule cancel <number> to remove.';
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Cancel: !schedule cancel 1
  if (args[0].toLowerCase() === 'cancel' && args[1]) {
    const scheduled = await getUserScheduledMessages(context.sessionId, context.senderJid);
    const index = parseInt(args[1]) - 1;
    if (index >= 0 && index < scheduled.length) {
      await deleteScheduledMessage(scheduled[index].id, context.senderJid);
      await sendReply(context.chatJid, 'Scheduled message cancelled.', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Invalid number. Use !schedule to see your list.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // Create: !schedule 1h Hello future me!
  const sendAt = parseTimeString(args[0]);
  if (!sendAt) {
    await sendReply(context.chatJid, 'Invalid time. Examples: !schedule 30m Check in, !schedule 2h Meeting time', sock, context.rawMessage.key, context.queue);
    return;
  }

  const message = args.slice(1).join(' ') || 'Scheduled message';
  const scheduled = await createScheduledMessage(context.sessionId, context.senderJid, context.chatJid, message, sendAt);
  if (scheduled) {
    const mins = Math.ceil((sendAt.getTime() - Date.now()) / 60000);
    await sendReply(context.chatJid, `Message scheduled for ${mins} minute(s) from now: "${message}"`, sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, 'Failed to schedule message. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Save Command — Forward to self ──────────────────────────────────────────

async function handleSave(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) {
    await sendReply(
      context.chatJid,
      `*SAVE MESSAGE*\n\nReply to any message with *!save* to forward it to your private chat (like Saved Messages).\n\nWorks with: text, images, videos, documents, stickers, audio.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    // Get the bot owner's JID (to send to self) — normalize to strip device suffix
    const rawOwnerJid = (sock as any).user?.id;
    const ownerJid = rawOwnerJid ? normalizeJid(rawOwnerJid) : '';
    if (!ownerJid) {
      await sendReply(context.chatJid, 'Could not determine your account. Try again after reconnecting.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Build the forwarded message with a "Saved from" header
    const chatName = context.isGroup ? context.chatJid.split('@')[0] : context.senderJid.split('@')[0];
    const savedHeader = `_Saved from ${chatName} at ${currentTimeStr()} ${currentDateStr()}_\n\n`;

    // Try to forward the quoted message content
    if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      await sock.sendMessage(ownerJid, { text: savedHeader + text });
    } else if (quotedMsg.imageMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: savedHeader + (quotedMsg.imageMessage.caption || ''),
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Image — could not download]' });
      }
    } else if (quotedMsg.videoMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: savedHeader + (quotedMsg.videoMessage.caption || ''),
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Video — could not download]' });
      }
    } else if (quotedMsg.audioMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: quotedMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus',
          ptt: quotedMsg.audioMessage.ptt || false,
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Audio — could not download]' });
      }
    } else if (quotedMsg.documentMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, {
          document: buffer,
          mimetype: quotedMsg.documentMessage.mimetype || 'application/octet-stream',
          fileName: quotedMsg.documentMessage.fileName || 'saved_file',
        });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Document — could not download]' });
      }
    } else if (quotedMsg.stickerMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(ownerJid, { sticker: buffer });
      } else {
        await sock.sendMessage(ownerJid, { text: savedHeader + '[Sticker — could not download]' });
      }
    } else {
      // Unknown message type — send notification
      await sock.sendMessage(ownerJid, { text: savedHeader + '[Message type not supported for save]' });
    }

    await sendReply(context.chatJid, 'Saved to your private chat!', sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[SAVE] Error:', error);
    await sendReply(context.chatJid, 'Failed to save message. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Repost Command — Repost to WhatsApp Status ─────────────────────────────

async function handleRepost(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) {
    await sendReply(
      context.chatJid,
      `*STATUS REPOST*\n\nReply to any message with *!repost* to post it as your WhatsApp Status.\n\nWorks with: text, images, videos.\n\n_Note: Status posting depends on your WhatsApp version and linked device support._`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    const statusJid = 'status@broadcast';

    // Get contact list for statusJidList (required by Baileys)
    let statusJidList: string[] = [];
    try {
      const contacts = await sock.getContacts?.() || [];
      statusJidList = Array.isArray(contacts)
        ? contacts.filter((c: any) => c?.id?.endsWith('@s.whatsapp.net')).map((c: any) => c.id).slice(0, 500)
        : [];
    } catch {
      // If can't get contacts, try without the list
    }

    if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      await sock.sendMessage(statusJid, {
        text,
        font: 0,
        backgroundColor: '#000000',
      }, { statusJidList });
    } else if (quotedMsg.imageMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(statusJid, {
          image: buffer,
          caption: quotedMsg.imageMessage.caption || '',
        }, { statusJidList });
      } else {
        await sendReply(context.chatJid, 'Could not download the image to repost.', sock, context.rawMessage.key, context.queue);
        return;
      }
    } else if (quotedMsg.videoMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(statusJid, {
          video: buffer,
          caption: quotedMsg.videoMessage.caption || '',
        }, { statusJidList });
      } else {
        await sendReply(context.chatJid, 'Could not download the video to repost.', sock, context.rawMessage.key, context.queue);
        return;
      }
    } else {
      await sendReply(context.chatJid, 'This message type cannot be reposted to status. Only text, images, and videos are supported.', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sendReply(context.chatJid, 'Posted to your WhatsApp Status!', sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[REPOST] Error:', error);
    await sendReply(context.chatJid, 'Failed to repost to status. This feature depends on your WhatsApp version.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── QR Code Generator ──────────────────────────────────────────────────────

async function handleQR(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*QR CODE GENERATOR*\n\n!qr [text or URL]\n\nExample: !qr https://google.com', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const text = args.join(' ');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
    const response = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, { image: buffer, caption: `QR code for: ${text}` }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[QR] Error:', error);
    await sendReply(context.chatJid, 'Failed to generate QR code. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Text-to-Speech ─────────────────────────────────────────────────────────

async function handleTTS(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*TEXT TO SPEECH*\n\n!tts [text]\n\nConverts text to a voice note.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const text = args.join(' ').slice(0, 500);
    // Use Google Translate TTS (free, no key)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
    const response = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const buffer = Buffer.from(response.data);
    await sock.sendMessage(context.chatJid, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      ptt: true,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[TTS] Error:', error);
    await sendReply(context.chatJid, 'TTS failed. Try shorter text or try again later.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Wikipedia Summary ──────────────────────────────────────────────────────

async function handleWiki(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*WIKIPEDIA*\n\n!wiki [topic]\n\nExample: !wiki Albert Einstein', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const query = args.join(' ');
    const response = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { timeout: 10000 },
    );
    const data = response.data;
    if (data.type === 'disambiguation') {
      await sendReply(context.chatJid, `Multiple results for "${query}". Try being more specific.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = `*${data.title || query}*\n\n`;
    msg += data.extract || 'No summary available.';
    if (data.content_urls?.desktop?.page) {
      msg += `\n\n🔗 ${data.content_urls.desktop.page}`;
    }
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await sendReply(context.chatJid, `No Wikipedia article found for "${args.join(' ')}". Try different keywords.`, sock, context.rawMessage.key, context.queue);
    } else {
      console.error('[WIKI] Error:', error);
      await sendReply(context.chatJid, 'Wikipedia lookup failed. Try again.', sock, context.rawMessage.key, context.queue);
    }
  }
}

// ─── Lyrics Lookup ──────────────────────────────────────────────────────────

async function handleLyrics(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*LYRICS FINDER*\n\n!lyrics [song name]\n!lyrics [artist] - [song]\n\nExample: !lyrics Bohemian Rhapsody', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const query = args.join(' ');
    // Use lyricsovh free API
    let artist = '';
    let title = query;
    if (query.includes(' - ')) {
      const parts = query.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    let lyrics = '';
    if (artist) {
      try {
        const response = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
          { timeout: 15000 },
        );
        lyrics = response.data?.lyrics || '';
      } catch {
        // Try fallback below
      }
    }

    if (!lyrics) {
      // Fallback: try with just the title as artist search
      try {
        const searchParts = query.split(' ');
        const guessArtist = searchParts[0];
        const guessTitle = searchParts.slice(1).join(' ') || searchParts[0];
        const response = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(guessArtist)}/${encodeURIComponent(guessTitle)}`,
          { timeout: 15000 },
        );
        lyrics = response.data?.lyrics || '';
      } catch {
        // No lyrics found
      }
    }

    if (!lyrics) {
      await sendReply(context.chatJid, `No lyrics found for "${query}".\n\nTry: !lyrics Artist - Song Title`, sock, context.rawMessage.key, context.queue);
      return;
    }

    // Truncate if too long for WhatsApp
    if (lyrics.length > 4000) {
      lyrics = lyrics.slice(0, 4000) + '\n\n... (truncated)';
    }
    await sendReply(context.chatJid, `*${query.toUpperCase()}*\n\n${lyrics.trim()}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[LYRICS] Error:', error);
    await sendReply(context.chatJid, 'Lyrics lookup failed. Try: !lyrics Artist - Song Title', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Currency Converter ─────────────────────────────────────────────────────

async function handleCurrency(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 3) {
    await sendReply(
      context.chatJid,
      '*CURRENCY CONVERTER*\n\n!currency [amount] [FROM] [TO]\n\nExamples:\n!currency 100 USD NGN\n!currency 50 EUR GBP\n!currency 1000 NGN USD',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }
  try {
    const amount = parseFloat(args[0]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(context.chatJid, 'Invalid amount. Use: !currency 100 USD NGN', sock, context.rawMessage.key, context.queue);
      return;
    }
    // Skip "to" if user writes "100 USD to NGN"
    const fromCurrency = args[1].toUpperCase();
    const toCurrency = (args[2].toLowerCase() === 'to' && args[3]) ? args[3].toUpperCase() : args[2].toUpperCase();

    const response = await axios.get(
      `https://api.frankfurter.dev/v2/rates?base=${fromCurrency}&quotes=${toCurrency}`,
      { timeout: 10000 },
    );
    const rates = response.data?.data?.[0]?.quotes;
    if (!rates || !rates[toCurrency]) {
      await sendReply(context.chatJid, `Could not find exchange rate for ${fromCurrency} to ${toCurrency}. Check currency codes.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    const rate = rates[toCurrency];
    const converted = (amount * rate).toFixed(2);
    await sendReply(
      context.chatJid,
      `*CURRENCY EXCHANGE*\n\n${amount.toLocaleString()} ${fromCurrency} = *${parseFloat(converted).toLocaleString()} ${toCurrency}*\n\nRate: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`,
      sock, context.rawMessage.key, context.queue,
    );
  } catch (error) {
    console.error('[CURRENCY] Error:', error);
    await sendReply(context.chatJid, 'Currency conversion failed. Check your currency codes (e.g. USD, EUR, NGN, GBP).', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Tag All Group Members ──────────────────────────────────────────────────

async function handleTagAll(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const groupMetadata = await sock.groupMetadata(context.chatJid);
    const participants = groupMetadata?.participants || [];
    if (!participants.length) {
      await sendReply(context.chatJid, 'Could not fetch group members.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const customMsg = args.length > 0 ? args.join(' ') : 'Attention everyone!';
    const mentions: string[] = [];
    let tagText = `*${customMsg}*\n\n`;

    // Batch to max 50 per message to avoid issues
    const batch = participants.slice(0, 50);
    for (const p of batch) {
      const jid = p.id;
      mentions.push(jid);
      const number = jid.split('@')[0];
      tagText += `@${number} `;
    }

    if (participants.length > 50) {
      tagText += `\n\n_...and ${participants.length - 50} more members_`;
    }

    await sock.sendMessage(context.chatJid, { text: tagText.trim(), mentions }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[TAGALL] Error:', error);
    await sendReply(context.chatJid, 'Failed to tag members. Bot may need admin rights.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Group Info ─────────────────────────────────────────────────────────────

async function handleGroupInfo(context: MessageContext, sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const metadata = await sock.groupMetadata(context.chatJid);
    const admins = metadata.participants?.filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin') || [];
    const totalMembers = metadata.participants?.length || 0;

    let msg = `*GROUP INFO*\n\n`;
    msg += `Name: ${metadata.subject || 'Unknown'}\n`;
    msg += `Members: ${totalMembers}\n`;
    msg += `Admins: ${admins.length}\n`;
    if (metadata.desc) {
      msg += `\nDescription:\n${metadata.desc.slice(0, 500)}\n`;
    }
    msg += `\nCreated: ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString() : 'Unknown'}`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[GROUP] Error:', error);
    await sendReply(context.chatJid, 'Failed to fetch group info.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Random Meme ────────────────────────────────────────────────────────────

async function handleMeme(context: MessageContext, sock: any): Promise<void> {
  try {
    const response = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
    const meme = response.data;
    if (!meme?.url || meme.nsfw) {
      await sendReply(context.chatJid, 'Could not fetch meme. Try again.', sock, context.rawMessage.key, context.queue);
      return;
    }
    const imageResponse = await axios.get(meme.url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(imageResponse.data);
    await sock.sendMessage(context.chatJid, {
      image: buffer,
      caption: `*${meme.title || 'Random Meme'}*\n\nr/${meme.subreddit || 'memes'} | ⬆️ ${meme.ups || 0}`,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[MEME] Error:', error);
    await sendReply(context.chatJid, 'Meme machine broke. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Magic 8-Ball ───────────────────────────────────────────────────────────

async function handle8Ball(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*MAGIC 8-BALL*\n\n!8ball [your question]\n\nAsk me anything and I\'ll predict the answer.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const responses = [
    '🎱 It is certain.',
    '🎱 It is decidedly so.',
    '🎱 Without a doubt.',
    '🎱 Yes, definitely.',
    '🎱 You may rely on it.',
    '🎱 As I see it, yes.',
    '🎱 Most likely.',
    '🎱 Outlook good.',
    '🎱 Yes.',
    '🎱 Signs point to yes.',
    '🎱 Reply hazy, try again.',
    '🎱 Ask again later.',
    '🎱 Better not tell you now.',
    '🎱 Cannot predict now.',
    '🎱 Concentrate and ask again.',
    '🎱 Don\'t count on it.',
    '🎱 My reply is no.',
    '🎱 My sources say no.',
    '🎱 Outlook not so good.',
    '🎱 Very doubtful.',
  ];
  const answer = responses[Math.floor(Math.random() * responses.length)];
  await sendReply(context.chatJid, `*Q:* ${args.join(' ')}\n\n${answer}`, sock, context.rawMessage.key, context.queue);
}

// ─── Truth or Dare ──────────────────────────────────────────────────────────

const truthQuestions = [
  "What's the most embarrassing thing you've done in public?",
  "What's a secret you've never told anyone?",
  "What's the worst lie you've ever told?",
  "Have you ever stalked someone on social media?",
  "What's the most childish thing you still do?",
  "What's the biggest misconception about you?",
  "What's the most trouble you've gotten into?",
  "If you could be invisible for a day, what would you do?",
  "What's the weirdest thing you've searched online?",
  "What's a skill you wish you had?",
  "What's the last thing you lied about?",
  "Who in this group would you swap lives with?",
  "What's the most embarrassing thing on your phone?",
  "What's your guilty pleasure?",
  "If you had to delete one app, which would it be?",
  "What's the longest you've gone without showering?",
  "What's the dumbest thing you've done for love?",
  "What's your biggest fear?",
  "Have you ever blamed someone else for something you did?",
  "What's the worst gift you've ever received?",
];

const dareList = [
  "Send a voice note singing your favorite song",
  "Change your profile picture to something funny for 1 hour",
  "Text your crush and screenshot it",
  "Post a status saying 'I love pineapple on pizza'",
  "Send a selfie with no filter right now",
  "Let someone in the group text from your phone for 2 minutes",
  "Record yourself doing 10 push-ups",
  "Send the last photo in your gallery",
  "Change your name in this group to 'I Lost a Dare'",
  "Send a voice note in a fake accent",
  "Type with your eyes closed: 'I am the smartest person here'",
  "Send your screen time report",
  "Make your status 'Looking for love' for 30 minutes",
  "Send a paragraph complimenting the person above you",
  "Use only emojis for the next 5 messages",
  "Call someone random and say 'I just wanted to hear your voice'",
  "Send the 5th photo in your gallery with no context",
  "Record yourself saying a tongue twister 3 times fast",
  "Let the group choose your status for 1 hour",
  "Send a message to the last person you texted saying 'We need to talk'",
];

async function handleTruth(context: MessageContext, sock: any): Promise<void> {
  const truth = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
  await sendReply(context.chatJid, `*TRUTH*\n\n${truth}`, sock, context.rawMessage.key, context.queue);
}

async function handleDare(context: MessageContext, sock: any): Promise<void> {
  const dare = dareList[Math.floor(Math.random() * dareList.length)];
  await sendReply(context.chatJid, `*DARE*\n\n${dare}`, sock, context.rawMessage.key, context.queue);
}

// ─── Ship / Love Compatibility ──────────────────────────────────────────────

async function handleShip(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 2) {
    await sendReply(context.chatJid, '*LOVE SHIP*\n\n!ship [name1] [name2]\n\nExample: !ship John Mary', sock, context.rawMessage.key, context.queue);
    return;
  }
  const name1 = args[0].replace('@', '');
  const name2 = args.slice(1).join(' ').replace('@', '');

  // Generate deterministic-ish percentage from names
  const combined = (name1 + name2).toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  const percentage = Math.abs(hash % 101);

  let hearts = '';
  let verdict = '';
  if (percentage >= 90) { hearts = '❤️🔥❤️🔥❤️'; verdict = 'SOULMATES! Made for each other!'; }
  else if (percentage >= 70) { hearts = '❤️❤️❤️❤️'; verdict = 'Strong connection! Great match!'; }
  else if (percentage >= 50) { hearts = '❤️❤️❤️'; verdict = 'There\'s potential here...'; }
  else if (percentage >= 30) { hearts = '💛💛'; verdict = 'Maybe just friends...'; }
  else if (percentage >= 10) { hearts = '💔'; verdict = 'It\'s not looking good...'; }
  else { hearts = '💀'; verdict = 'Absolutely not. Run.'; }

  const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

  await sendReply(
    context.chatJid,
    `*LOVE CALCULATOR*\n\n${name1} × ${name2}\n\n${hearts}\n[${bar}] ${percentage}%\n\n${verdict}`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── Compliment Generator ───────────────────────────────────────────────────

async function handleCompliment(context: MessageContext, args: string[], sock: any): Promise<void> {
  const compliments = [
    "You're the type of person everyone needs in their life.",
    "Your energy lights up every room you walk into.",
    "If everyone was like you, the world would be a better place.",
    "You make difficult things look easy.",
    "Your smile could end wars.",
    "You're proof that good things exist.",
    "The world is a better place because you're in it.",
    "You have the best laugh.",
    "You're someone's reason to smile.",
    "Your kindness is a balm to everyone who encounters it.",
    "You're more helpful than you realize.",
    "You bring out the best in other people.",
    "Your ability to recall random facts is impressive.",
    "You're like a ray of sunshine on a cloudy day.",
    "You're the friend everyone wishes they had.",
    "Everything seems brighter when you're around.",
    "You're one of a kind. Literally.",
    "You have impeccable taste.",
    "Your potential is limitless.",
    "You could survive a zombie apocalypse. Easily.",
  ];
  const target = args.length > 0 ? args.join(' ').replace(/@/g, '') : context.pushName || 'You';
  const compliment = compliments[Math.floor(Math.random() * compliments.length)];
  await sendReply(context.chatJid, `*${target}* — ${compliment}`, sock, context.rawMessage.key, context.queue);
}

// ─── Fortune Cookie ─────────────────────────────────────────────────────────

async function handleFortune(context: MessageContext, sock: any): Promise<void> {
  const fortunes = [
    "A beautiful, smart, and loving person will come into your life... after you click this message.",
    "Your hard work will pay off. Not today, but soon.",
    "An unexpected opportunity will arise. Say yes.",
    "Someone is thinking about you right now.",
    "A great adventure awaits you this week.",
    "The answer you're looking for is closer than you think.",
    "Trust your instincts. They haven't failed you yet.",
    "A friend will surprise you with kindness.",
    "Your creativity will solve a major problem soon.",
    "Stop overthinking. The answer is simple.",
    "Money is coming your way — just not the way you expect.",
    "Your next meal will be surprisingly good.",
    "A stranger will change your perspective today.",
    "You'll discover a hidden talent you didn't know you had.",
    "The risk you've been considering? Take it.",
    "Good news will arrive in an unexpected form.",
    "Your patience will be rewarded this month.",
    "Someone admires your strength more than you know.",
    "A new friendship will bring you joy.",
    "You're about to level up. Get ready.",
  ];
  const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  const luckyNumber = Math.floor(Math.random() * 99) + 1;
  await sendReply(context.chatJid, `*FORTUNE COOKIE*\n\n${fortune}\n\nLucky number: ${luckyNumber}`, sock, context.rawMessage.key, context.queue);
}

// ─── Random Fun Fact ────────────────────────────────────────────────────────

async function handleFact(context: MessageContext, sock: any): Promise<void> {
  try {
    // Try uselessfacts API first
    const response = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 8000 });
    if (response.data?.text) {
      await sendReply(context.chatJid, `*DID YOU KNOW?*\n\n${response.data.text}`, sock, context.rawMessage.key, context.queue);
      return;
    }
  } catch {
    // Fallback to local facts
  }

  const facts = [
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.",
    "Octopuses have three hearts, nine brains, and blue blood.",
    "A group of flamingos is called a 'flamboyance'.",
    "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
    "Bananas are berries, but strawberries aren't.",
    "The Eiffel Tower can grow up to 6 inches taller in summer due to heat expansion.",
    "A single cloud can weigh more than 1 million pounds.",
    "There are more possible chess games than atoms in the observable universe.",
    "Cows have best friends and get stressed when separated.",
    "The inventor of the Pringles can is buried in one.",
    "A day on Venus is longer than a year on Venus.",
    "Sharks are older than trees. Sharks: 400M years. Trees: 350M years.",
    "The world's largest desert is Antarctica, not the Sahara.",
    "Human teeth are as strong as shark teeth.",
    "An average person walks about 100,000 miles in their lifetime.",
  ];
  const fact = facts[Math.floor(Math.random() * facts.length)];
  await sendReply(context.chatJid, `*DID YOU KNOW?*\n\n${fact}`, sock, context.rawMessage.key, context.queue);
}

// ─── Riddle ─────────────────────────────────────────────────────────────────

async function handleRiddle(context: MessageContext, sock: any): Promise<void> {
  const riddles = [
    { q: "What has keys but no locks?", a: "A piano" },
    { q: "What gets wetter the more it dries?", a: "A towel" },
    { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", a: "An echo" },
    { q: "What has a head and tail but no body?", a: "A coin" },
    { q: "What can travel around the world while staying in a corner?", a: "A stamp" },
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
    { q: "What has many teeth but can't bite?", a: "A comb" },
    { q: "I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?", a: "A map" },
    { q: "What can you catch but not throw?", a: "A cold" },
    { q: "What has hands but can't clap?", a: "A clock" },
    { q: "I'm tall when I'm young and short when I'm old. What am I?", a: "A candle" },
    { q: "What begins with T, ends with T, and has T in it?", a: "A teapot" },
    { q: "What has one eye but can't see?", a: "A needle" },
    { q: "What goes up but never comes down?", a: "Your age" },
    { q: "What invention lets you look right through a wall?", a: "A window" },
  ];
  const riddle = riddles[Math.floor(Math.random() * riddles.length)];
  await sendReply(
    context.chatJid,
    `*RIDDLE*\n\n${riddle.q}\n\n_Reply with your answer! The answer will be revealed in 30 seconds..._`,
    sock, context.rawMessage.key, context.queue,
  );

  // Reveal answer after 30 seconds (with daily cap check)
  setTimeout(async () => {
    try {
      if (context.sessionId && isDailyCapReached(context.sessionId)) return;
      await sendReply(context.chatJid, `*ANSWER:* ${riddle.a}`, sock, context.rawMessage.key, context.queue);
      if (context.sessionId) trackMessageSent(context.sessionId);
    } catch {
      // Ignore errors in delayed sends
    }
  }, 30000);
}

// ─── AI Image Generation ────────────────────────────────────────────────────

async function handleImg(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*AI IMAGE*\n\n!img [description]\n\nExample: !img a cat wearing sunglasses', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const prompt = args.join(' ');
    await sendReply(context.chatJid, `Generating image for: "${prompt}"...\nThis may take 10-30 seconds.`, sock, context.rawMessage.key, context.queue);

    // Use Pollinations AI (free, no key)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
    const buffer = Buffer.from(response.data);

    await sock.sendMessage(context.chatJid, {
      image: buffer,
      caption: `*AI Generated:* ${prompt}`,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[IMG] Error:', error);
    await sendReply(context.chatJid, 'Image generation failed. Try a simpler description or try again later.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── URL Shortener ──────────────────────────────────────────────────────────

async function handleShorten(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*URL SHORTENER*\n\n!short [url]\n\nExample: !short https://google.com', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const url = args[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      await sendReply(context.chatJid, 'Please provide a valid URL starting with http:// or https://', sock, context.rawMessage.key, context.queue);
      return;
    }
    // Use is.gd free URL shortener (no key needed)
    const response = await axios.get(
      `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`,
      { timeout: 10000 },
    );
    if (response.data?.shorturl) {
      await sendReply(context.chatJid, `*SHORTENED URL*\n\n${response.data.shorturl}\n\nOriginal: ${url}`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Could not shorten that URL. Make sure it\'s valid.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[SHORT] Error:', error);
    await sendReply(context.chatJid, 'URL shortening failed. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Welcome Bot — New Group Members ─────────────────────────────────────────

export async function handleGroupParticipantsUpdate(
  update: any,
  sock: any,
  sessionId: string,
  userId: string,
  queue?: MessageQueue,
): Promise<void> {
  try {
    const { id: groupJid, participants, action } = update;

    if (action !== 'add') return;

    // Check if welcome feature is enabled for this user
    const isEnabled = await getFeatureEnabled(userId, 'welcome');
    if (!isEnabled) return;

    for (const jid of participants) {
      const name = jid.split('@')[0];
      const vars = {
        name,
        time: currentTimeStr(),
        date: currentDateStr(),
        group: groupJid.split('@')[0],
      };

      const welcome = pickResponse(welcomeReplies, vars);
      await sendReply(groupJid, welcome, sock, undefined, queue);

      // Small delay between multiple new members
      if (participants.length > 1) {
        await delay(1000 + Math.random() * 2000);
      }
    }
  } catch (error) {
    console.error('Welcome bot error:', error);
  }
}
