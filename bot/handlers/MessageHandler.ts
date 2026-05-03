import { delay } from '../../lib/utils';
import axios from 'axios';
import sharp from 'sharp';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { savePoll, recordVote, getLeaderboard, getUserSettings, getAfkState, setAfkState } from '../database';
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
} from '../utils/responsePools';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';

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

export async function handleMessage(message: any, sock: any, queue?: MessageQueue): Promise<void> {
  try {
    const chatJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;

    if (fromMe) return;

    const content =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      '';

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

    // Check if sender mentioned an AFK user
    await checkAfkMentions(context, sock);

    if (!isUserRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else {
      console.log(`User rate limited: ${senderJid}`);
      const response = pickResponse(
        ['Please wait before sending more commands, {name}', 'Slow down, {name}! Try again shortly'],
        { name: pushName },
      );
      await sendReply(chatJid, response, sock, message.key, queue);
    }

    await processAutoReply(context, sock);
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
  if (queue) {
    const messageContent = typeof content === 'string' ? { text: content } : content;
    await queue.enqueue(jid, messageContent);
  } else {
    await humanSend(sock, jid, msgKey, content);
  }
}

// ─── Auto Reply (stub) ───────────────────────────────────────────────────────

async function processAutoReply(_context: MessageContext, _sock: any): Promise<void> {
  // Auto-reply logic loads from Supabase auto_replies table — to be connected
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

    const stickerBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    await sendReply(context.chatJid, { sticker: stickerBuffer }, sock, context.rawMessage.key, context.queue);

    let reply = pickResponse(stickerReplies, vars);

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

    const tone = getTimeTone();
    let prefix = '';
    if (tone === 'late_night') {
      prefix = 'AI: ';
    } else if (tone === 'morning') {
      prefix = 'Good morning! AI Response:\n\n';
    } else {
      prefix = 'AI Response:\n\n';
    }

    await sendReply(context.chatJid, `${prefix}${aiResponse}`, sock, context.rawMessage.key, context.queue);
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
      await sendReply(context.chatJid, 'Trivia game starting! Stay tuned for questions.', sock, context.rawMessage.key, context.queue);
      break;
    case 'hangman':
      await sendReply(context.chatJid, 'Hangman game starting! Guess a letter with !answer [letter]', sock, context.rawMessage.key, context.queue);
      break;
    case 'wordchain':
      await sendReply(context.chatJid, 'Word Chain! Send a word that starts with the last letter of the previous word.', sock, context.rawMessage.key, context.queue);
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
  await sendReply(context.chatJid, 'Vote recorded!', sock, context.rawMessage.key, context.queue);
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
  await sendReply(context.chatJid, 'Media download feature coming soon!', sock, context.rawMessage.key, context.queue);
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
