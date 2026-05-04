import { delay } from '../../lib/utils';
import axios from 'axios';
import sharp from 'sharp';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { savePoll, recordVote, getLeaderboard, getUserSettings, getAfkState, setAfkState, getAutoReplies, getActivePoll, incrementLeaderboard, getFeatureEnabled, getSessionUserId, createReminder, getUserReminders, deleteReminder, createNote, getUserNotes, deleteNote, createScheduledMessage, getUserScheduledMessages, deleteScheduledMessage, getSessionStats } from '../database';
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
} from '../utils/advancedAntiban';

const COMMAND_PREFIX = '!';
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 10;

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
const gameStates: Map<string, { target: number; attempts: number; userJid: string }> = new Map();
const spamTracker: Map<string, { count: number; lastTime: number; warned: boolean }> = new Map();
const SPAM_THRESHOLD = 5; // messages in 10 seconds = spam
const SPAM_WINDOW = 10000;

export async function handleMessage(message: any, sock: any, queue?: MessageQueue): Promise<void> {
  try {
    const chatJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;

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

    // Track group activity for reply delay calculation
    if (isGroup) {
      trackGroupMessage(chatJid);
    }

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
    const isCommand = content.startsWith(COMMAND_PREFIX);
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

    // Check if sender mentioned an AFK user (groups)
    await checkAfkMentions(context, sock);

    // Private chat AFK auto-response: if someone DMs the bot owner and
    // the owner has AFK enabled, respond with the AFK message.
    if (!isGroup && sessionId && ownerSettings?.afk_enabled) {
      const ownerJid = (sock as any).user?.id;
      if (ownerJid && senderJid !== ownerJid) {
        const afkMsg = ownerSettings.afk_message || 'I am currently away';
        await sendReply(
          chatJid,
          `I'm currently AFK. ${afkMsg}`,
          sock,
          message.key,
          queue,
        );
      }
    }

    if (!isUserRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else {
      console.log(`User rate limited: ${senderJid}`);
      const response = pickResponse(spamWarnings, { name: pushName });
      await sendReply(chatJid, response, sock, message.key, queue);
    }

    await processAutoReply(context, sock);

    // Track for daily cap + mark group replied + contact frequency (advanced anti-ban)
    if (sessionId) trackMessageSent(sessionId);
    if (isGroup) markGroupReplied(chatJid);
    trackContactReply(senderJid);
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

  if (queue) {
    const messageContent = typeof processedContent === 'string' ? { text: processedContent } : processedContent;
    await queue.enqueue(jid, messageContent);
  } else {
    await humanSend(sock, jid, msgKey, processedContent);
  }
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
!help - Show commands
!ping - Check bot status
!sticker - Create sticker from image
!joke - Random joke
!quote - Inspirational quote

*TOOLS*
!ai [msg] - AI chat (Groq)
!weather [city] - Weather info
!define [word] - Dictionary lookup
!horoscope [sign] - Daily horoscope
!translate [lang] [text] - Translate text
!doc [title] | [content] - Create document
!calc [expr] - Calculator
!note save/list/view/delete - Notes

*PRODUCTIVITY*
!remind [time] [msg] - Set reminder
!schedule [time] [msg] - Schedule message
!stats - Session statistics

*GAMES*
!play [game] - Start a game
!trivia - Trivia questions
!hangman - Word guessing
!wordchain - Chain words
!poll [q] | [opts] - Create poll
!vote [n] - Vote on poll
!leaderboard - Top users

*SOCIAL*
!afk [reason] - Set AFK status
!download [url] - Media download`;

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

async function createSticker(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  try {
    const imageMessage = context.rawMessage.message?.imageMessage ||
      context.rawMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!imageMessage) {
      await sendReply(
        context.chatJid,
        'Send or reply to an image with *!sticker* to convert it!',
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    const imageBuffer = await (sock as any).downloadMediaMessage(context.rawMessage, 'buffer');
    if (!imageBuffer) {
      await sendReply(context.chatJid, 'Could not download image. Try again!', sock, context.rawMessage.key, context.queue);
      return;
    }

    let stickerBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    // Media fingerprint jitter — make every sticker unique at the binary level
    const { jitterMediaBuffer } = await import('../utils/advancedAntiban');
    stickerBuffer = jitterMediaBuffer(stickerBuffer);

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
    console.error('Error creating sticker:', error);
    await sendReply(context.chatJid, 'Error creating sticker. Please try again.', sock, context.rawMessage.key, context.queue);
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

  if (!apiKey) {
    await sendReply(
      context.chatJid,
      `Weather API key not configured. Contact the bot admin.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    const intro = pickResponse(weatherReplies, vars, false);
    await sendReply(context.chatJid, 'Fetching weather...', sock, context.rawMessage.key, context.queue);

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
    );

    const data = response.data;
    const weatherInfo = `${intro}\n\n*${data.name}, ${data.sys.country}*\n\nTemp: ${data.main.temp}°C\nHumidity: ${data.main.humidity}%\nWind: ${data.wind.speed} m/s\nCondition: ${data.weather[0].description}\nFeels like: ${data.main.feels_like}°C`;

    await sendReply(context.chatJid, weatherInfo, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendReply(context.chatJid, `City "${city}" not found.`, sock, context.rawMessage.key, context.queue);
    } else {
      console.error('Weather API error:', error);
      await sendReply(context.chatJid, 'Weather service error.', sock, context.rawMessage.key, context.queue);
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
      gameStates.set(context.chatJid, { target: targetNumber, attempts: 0, userJid: context.senderJid });
      await sendReply(
        context.chatJid,
        "I'm thinking of a number between 1 and 100.\nUse *!answer [number]* to guess!",
        sock,
        context.rawMessage.key,
        context.queue,
      );
      break;
    }
    case 'trivia':
      await sendReply(context.chatJid, `${pickResponse(gameStartReplies, { name: context.senderJid.split('@')[0] })} Trivia mode! Stay tuned for questions.`, sock, context.rawMessage.key, context.queue);
      break;
    case 'hangman':
      await sendReply(context.chatJid, `${pickResponse(gameStartReplies, { name: context.senderJid.split('@')[0] })} Hangman! Guess a letter with !answer [letter]`, sock, context.rawMessage.key, context.queue);
      break;
    case 'wordchain':
      await sendReply(context.chatJid, `${pickResponse(gameStartReplies, { name: context.senderJid.split('@')[0] })} Word Chain! Send a word starting with the last letter of the previous word.`, sock, context.rawMessage.key, context.queue);
      break;
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

  const guess = parseInt(args[0], 10);
  if (isNaN(guess)) {
    await sendReply(context.chatJid, 'Please provide a valid number', sock, context.rawMessage.key, context.queue);
    return;
  }

  game.attempts++;

  if (guess === game.target) {
    gameStates.delete(context.chatJid);
    await sendReply(context.chatJid, `CORRECT! You got it in ${game.attempts} attempts!`, sock, context.rawMessage.key, context.queue);
  } else if (guess < game.target) {
    await sendReply(context.chatJid, 'Too low! Try again', sock, context.rawMessage.key, context.queue);
  } else {
    await sendReply(context.chatJid, 'Too high! Try again', sock, context.rawMessage.key, context.queue);
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
  await sendReply(context.chatJid, `${pickResponse(downloadReplies, { name: context.senderJid.split('@')[0], time: currentTimeStr() })} Media download feature coming soon!`, sock, context.rawMessage.key, context.queue);
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
      'Usage: *!doc [title] | [content]*\n\nExample: !doc Meeting Notes | Today we discussed the project timeline...',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const input = args.join(' ').split('|').map((s) => s.trim());
  const title = input[0] || 'Untitled';
  const content = input.slice(1).join(' ') || input[0];

  try {
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
            new Paragraph({
              children: [
                new TextRun({
                  text: content,
                  size: 24,
                }),
              ],
            }),
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

    await sendReply(
      context.chatJid,
      {
        document: buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
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
    let msg = '*Session Stats*\n\n';

    if (stats.session) {
      msg += `Name: ${stats.session.session_name}\n`;
      msg += `State: ${stats.session.state}\n`;
      msg += `Created: ${new Date(stats.session.created_at).toLocaleDateString()}\n`;
      if (stats.session.last_active) {
        msg += `Last Active: ${new Date(stats.session.last_active).toLocaleString()}\n`;
      }
    }

    msg += `\nTotal Messages: ${stats.totalMessages}\n`;

    if (stats.topUsers.length > 0) {
      msg += '\n*Top Users:*\n';
      stats.topUsers.forEach((u, i) => {
        msg += `${i + 1}. ${u.user_name || u.user_jid.split('@')[0]} — ${u.message_count} msgs\n`;
      });
    }

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
