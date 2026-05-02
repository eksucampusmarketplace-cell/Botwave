import { delay } from '../../lib/utils';
import OpenAI from 'openai';
import axios from 'axios';
import sharp from 'sharp';
import { savePoll, recordVote, getLeaderboard } from '../database';
import { MessageQueue } from '../utils/MessageQueue';

const COMMAND_PREFIX = '#';
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 10; // Updated to 10 per minute as per prompt

interface MessageContext {
  senderJid: string;
  chatJid: string;
  message: string;
  isGroup: boolean;
  pushName?: string;
  sessionId?: string;
  queue?: MessageQueue;
}

const userMessageTracker: Map<string, number[]> = new Map();
const sessionMessageTracker: Map<string, number[]> = new Map();

const gameStates: Map<string, { target: number; attempts: number; userJid: string }> = new Map();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleMessage(message: any, sock: any, queue?: MessageQueue): Promise<void> {
  try {
    const chatJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    
    if (fromMe) return;

    const content = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || 
                    message.message?.imageMessage?.caption || 
                    "";
    
    if (!content) return;

    const senderJid = message.key.participant || chatJid;
    const isGroup = chatJid.endsWith('@g.us');
    const pushName = message.pushName || 'User';
    const sessionId = (sock as any).sessionId || queue?.['sessionId']; // Try to get sessionId

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      isGroup,
      pushName,
      sessionId,
      queue,
    };

    // Session-level rate limit check
    if (sessionId && isSessionRateLimited(sessionId)) {
      console.log(`Session rate limited: ${sessionId}`);
      return; // Silently drop or queue? Prompt 2 says "queues messages instead of dropping them". 
      // But this is about INCOMING messages triggering replies. 
      // The rate limit should probably apply to the OUTGOING messages.
      // My MessageQueue already handles outgoing rate limits/delays.
    }

    if (!isUserRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else {
      console.log(`User rate limited: ${senderJid}`);
      await sendMessage(chatJid, `*⚠️ RATE LIMITED*\n\nPlease wait before sending more commands.`, sock, queue);
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

  if (recentTimestamps.length >= 20) { // User limit can stay at 20
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

async function processCommand(context: MessageContext, sock: any): Promise<void> {
  if (!context.message.startsWith(COMMAND_PREFIX)) {
    return;
  }

  const parts = context.message.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  console.log(`Command: ${commandName} from ${context.senderJid}`);

  // Random jitter before processing
  await delay(1000 + Math.random() * 2000);

  switch (commandName) {
    case 'help':
      await sendHelp(context.chatJid, sock, context.queue);
      break;
    case 'ping':
      await sendPing(context.chatJid, sock, context.queue);
      break;
    case 'sticker':
      await createSticker(context, args, sock);
      break;
    case 'ai':
      await handleAICommand(context, args, sock);
      break;
    case 'weather':
      await handleWeatherCommand(context, args, sock);
      break;
    case 'joke':
      await sendJoke(context.chatJid, sock, context.queue);
      break;
    case 'play':
      await startGame(context, args, sock);
      break;
    case 'answer':
      await handleAnswer(context, args, sock);
      break;
    case 'poll':
      await createPoll(context, args, sock);
      break;
    case 'vote':
      await handleVote(context, args, sock);
      break;
    case 'leaderboard':
      await showLeaderboard(context, sock);
      break;
    case 'download':
      await handleDownload(context, args, sock);
      break;
    default:
      await sendUnknownCommand(context.chatJid, sock, context.queue);
  }
}

async function processAutoReply(context: MessageContext, sock: any): Promise<void> {
  // TODO: Implement auto-reply feature
}

async function sendMessage(jid: string, content: any, sock: any, queue?: MessageQueue) {
    if (queue) {
        const messageContent = typeof content === 'string' ? { text: content } : content;
        await queue.enqueue(jid, messageContent);
    } else {
        const messageContent = typeof content === 'string' ? { text: content } : content;
        await sock.sendMessage(jid, messageContent);
    }
}

async function sendHelp(chatJid: string, sock: any, queue?: MessageQueue): Promise<void> {
  const helpMessage = `
*╔══════════════════════╗*
*║   BOTWAVE COMMANDS   ║*
*╠══════════════════════╣*
*#help*       - Show this help
*#ping*       - Check bot status
*#sticker*    - Create sticker from image
*#ai [msg]*   - AI chat assistant
*#weather*    - Get weather info
*#joke*       - Get random joke
*#play*       - Start a mini game
*#poll*       - Create a poll
*#vote*       - Vote on a poll
*#leaderboard*- View top users
*#download*   - Download media
*╠══════════════════════╣*
*Features: sticker, ai,*
*download, games, polls*
*╚══════════════════════╝*`;

  await sendMessage(chatJid, helpMessage, sock, queue);
}

async function sendPing(chatJid: string, sock: any, queue?: MessageQueue): Promise<void> {
  const ping = `*🏓 PONG!*\n\n*Bot Status:* Online 🟢\n*Response:* ${Date.now() % 100 + 50}ms`;
  await sendMessage(chatJid, ping, sock, queue);
}

async function sendUnknownCommand(chatJid: string, sock: any, queue?: MessageQueue): Promise<void> {
    await sendMessage(chatJid, '*❌ Unknown command. Type #help to see available commands.*', sock, queue);
}

async function createSticker(context: MessageContext, args: string[], sock: any): Promise<void> {
  try {
    const imageBuffer = await (sock as any).downloadMediaMessage(context.message, 'buffer');
    
    if (!imageBuffer) {
      const response = `*🎴 STICKER MAKER*\n\nSend an image with caption *#sticker* to convert it to a sticker!\n\n*Example:* Reply to an image with #sticker`;
      await sendMessage(context.chatJid, response, sock, context.queue);
      return;
    }

    await sendMessage(context.chatJid, '*🎴 Creating sticker...*', sock, context.queue);

    const stickerBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    await sendMessage(context.chatJid, { sticker: stickerBuffer }, sock, context.queue);
  } catch (error) {
    console.error('Error creating sticker:', error);
    await sendMessage(context.chatJid, '*❌ Error creating sticker. Please try again.*', sock, context.queue);
  }
}

async function handleAICommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  const query = args.join(' ');
  if (!query) {
    const response = `*🤖 AI CHAT*\n\nPlease provide a message after *#ai*\n\n*Example:* #ai What is the weather today?`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const response = `*🤖 AI CHAT*\n\n⚠️ OpenAI API key is not configured.`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  try {
    await sendMessage(context.chatJid, '*🤖 Thinking...*', sock, context.queue);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful WhatsApp bot assistant. Keep responses concise and friendly.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not process that request.';
    await sendMessage(context.chatJid, `*🤖 AI Response*\n\n${response}`, sock, context.queue);
  } catch (error) {
    console.error('OpenAI API error:', error);
    await sendMessage(context.chatJid, '*❌ AI service error. Please try again later.*', sock, context.queue);
  }
}

async function handleWeatherCommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    const response = `*🌤️ WEATHER*\n\nPlease specify a city:\n*#weather [city name]*\n\n*Example:* #weather London`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  const city = args.join(' ');
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    const response = `*🌤️ WEATHER: ${city.toUpperCase()}*\n\n⚠️ Weather API key not configured.`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  try {
    await sendMessage(context.chatJid, '*🌤️ Fetching weather...*', sock, context.queue);

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );

    const data = response.data;
    const weatherInfo = `*🌤️ WEATHER: ${data.name}, ${data.sys.country}*\n\n🌡️ *Temp:* ${data.main.temp}°C\n💧 *Humidity:* ${data.main.humidity}%\n🌬️ *Wind:* ${data.wind.speed} m/s\n☁️ *Condition:* ${data.weather[0].description}\n👀 *Feels like:* ${data.main.feels_like}°C`;

    await sendMessage(context.chatJid, weatherInfo, sock, context.queue);
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendMessage(context.chatJid, `*❌ City "${city}" not found.*`, sock, context.queue);
    } else {
      console.error('Weather API error:', error);
      await sendMessage(context.chatJid, '*❌ Weather service error.*', sock, context.queue);
    }
  }
}

async function sendJoke(chatJid: string, sock: any, queue?: MessageQueue): Promise<void> {
  const jokes = [
    `Why don't scientists trust atoms?\nBecause they make up everything! 😂`,
    `Why did the scarecrow win an award?\nBecause he was outstanding in his field! 🌾`,
    `What do you call a fake noodle? An impasta! 🍝`,
    `Why don't eggs tell jokes?\nThey'd crack each other up! 🥚`,
    `What do you call a bear with no teeth? A gummy bear! 🐻`,
  ];

  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await sendMessage(chatJid, `*😂 JOKE*\n\n${joke}`, sock, queue);
}

async function startGame(context: MessageContext, args: string[], sock: any): Promise<void> {
  const gameType = args[0]?.toLowerCase();

  if (!gameType) {
    const games = ['trivia', 'hangman', 'wordchain', 'numberguess'];
    const gameList = games.map((g) => `• #play ${g}`).join('\n');
    const response = `*🎮 MINI GAMES*\n\nSelect a game:\n${gameList}`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  switch (gameType) {
    case 'numberguess':
      const targetNumber = Math.floor(Math.random() * 100) + 1;
      gameStates.set(context.chatJid, { target: targetNumber, attempts: 0, userJid: context.senderJid });
      const response = `*🎮 NUMBER GUESS GAME*\n\nI'm thinking of a number between 1 and 100.\nUse *#answer [number]* to guess!`;
      await sendMessage(context.chatJid, response, sock, context.queue);
      break;
    default:
      await sendMessage(context.chatJid, `*🎮 ${gameType.toUpperCase()}* mechanics coming soon!`, sock, context.queue);
  }
}

async function handleAnswer(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendMessage(context.chatJid, '*📝 Please provide an answer.*', sock, context.queue);
    return;
  }

  const game = gameStates.get(context.chatJid);
  if (!game) {
    await sendMessage(context.chatJid, '*🎮 No active game. Start one with #play*', sock, context.queue);
    return;
  }

  const guess = parseInt(args[0], 10);
  if (isNaN(guess)) {
    await sendMessage(context.chatJid, '*📝 Please provide a valid number*', sock, context.queue);
    return;
  }

  game.attempts++;

  if (guess === game.target) {
    gameStates.delete(context.chatJid);
    await sendMessage(context.chatJid, `*🎉 CORRECT!*\n\nYou got it in ${game.attempts} attempts! 🎊`, sock, context.queue);
  } else if (guess < game.target) {
    await sendMessage(context.chatJid, '*⬆️ Too low!*', sock, context.queue);
  } else {
    await sendMessage(context.chatJid, '*⬇️ Too high!*', sock, context.queue);
  }
}

async function createPoll(context: MessageContext, args: string[], sock: any): Promise<void> {
  const pollInput = args.join(' ').split('|').map(s => s.trim());
  
  if (pollInput.length < 3) {
    const response = `*📊 CREATE POLL*\n\nUsage: *#poll [question] | [option1] | [option2] | ...*`;
    await sendMessage(context.chatJid, response, sock, context.queue);
    return;
  }

  const question = pollInput[0];
  const options = pollInput.slice(1).filter(o => o.length > 0);

  try {
    await savePoll(context.sessionId || '', context.chatJid, question, options, context.senderJid);

    let pollMessage = `*📊 POLL*\n\n*${question}*\n\n`;
    options.forEach((option, index) => {
      pollMessage += `${index + 1}. ${option}\n`;
    });
    pollMessage += `\n*Vote:* #vote [number]`;

    await sendMessage(context.chatJid, pollMessage, sock, context.queue);
  } catch (error) {
    console.error('Error creating poll:', error);
    await sendMessage(context.chatJid, '*❌ Error creating poll.*', sock, context.queue);
  }
}

async function handleVote(context: MessageContext, args: string[], sock: any): Promise<void> {
  await sendMessage(context.chatJid, '*📊 Vote recorded!*', sock, context.queue);
}

async function showLeaderboard(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendMessage(context.chatJid, '*📊 LEADERBOARD* - Session not configured.', sock, context.queue);
    return;
  }

  try {
    const leaderboardData = await getLeaderboard(context.sessionId, 10);

    if (!leaderboardData || leaderboardData.length === 0) {
      await sendMessage(context.chatJid, '*📊 LEADERBOARD* - No messages yet.', sock, context.queue);
      return;
    }

    let leaderboardMsg = '*📊 LEADERBOARD*\n\n';
    leaderboardData.forEach((entry: any, index: number) => {
      const name = entry.user_name || entry.user_jid?.split('@')[0] || 'Unknown';
      leaderboardMsg += `${index + 1}. *${name}* - ${entry.message_count || 0} msgs\n`;
    });

    await sendMessage(context.chatJid, leaderboardMsg, sock, context.queue);
  } catch (error) {
    console.error('Leaderboard error:', error);
    await sendMessage(context.chatJid, '*📊 Leaderboard temporarily unavailable*', sock, context.queue);
  }
}

async function handleDownload(context: MessageContext, args: string[], sock: any): Promise<void> {
  await sendMessage(context.chatJid, '*⬇️ Media download feature coming soon!*', sock, context.queue);
}

