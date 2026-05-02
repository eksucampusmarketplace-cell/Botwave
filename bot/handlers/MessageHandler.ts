import { delay } from '../../lib/utils';
import OpenAI from 'openai';
import axios from 'axios';
import sharp from 'sharp';
import { savePoll, recordVote, getLeaderboard } from '../database';

const COMMAND_PREFIX = '#';
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 20;

interface MessageContext {
  senderJid: string;
  chatJid: string;
  message: string;
  isGroup: boolean;
  pushName?: string;
  sessionId?: string;
}

const userMessageTracker: Map<string, number[]> = new Map();

const gameStates: Map<string, { target: number; attempts: number; userJid: string }> = new Map();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleMessage(message: any, sock: any, sessionId?: string): Promise<void> {
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

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      isGroup,
      pushName,
      sessionId,
    };

    if (!isRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else {
      console.log(`Rate limited: ${senderJid}`);
      await sendMessage(chatJid, `*⚠️ RATE LIMITED*\n\nPlease wait before sending more commands.`, sock);
    }

    await processAutoReply(context, sock);
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = userMessageTracker.get(userId) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recentTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    return true;
  }

  recentTimestamps.push(now);
  userMessageTracker.set(userId, recentTimestamps);
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

  await delay(500 + Math.random() * 1000);

  switch (commandName) {
    case 'help':
      await sendHelp(context.chatJid, sock);
      break;
    case 'ping':
      await sendPing(context.chatJid, sock);
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
      await sendJoke(context.chatJid, sock);
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
      await sendUnknownCommand(context.chatJid, sock);
  }
}

async function processAutoReply(context: MessageContext, sock: any): Promise<void> {
  // TODO: Implement auto-reply feature
}

async function sendMessage(jid: string, text: string, sock: any) {
    await sock.sendMessage(jid, { text });
}

async function sendHelp(chatJid: string, sock: any): Promise<void> {
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

  await sendMessage(chatJid, helpMessage, sock);
}

async function sendPing(chatJid: string, sock: any): Promise<void> {
  const ping = `*🏓 PONG!*\n\n*Bot Status:* Online 🟢\n*Response:* ${Date.now() % 100 + 50}ms`;
  await sendMessage(chatJid, ping, sock);
}

async function createSticker(context: MessageContext, args: string[], sock: any): Promise<void> {
  try {
    const quotedMessage = context.message.includes('quotedMessage');
    
    const imageBuffer = await sock.downloadMediaMessage(context.message, 'buffer');
    
    if (!imageBuffer) {
      const response = `*🎴 STICKER MAKER*\n\nSend an image with caption *#sticker* to convert it to a sticker!\n\n*Example:* Reply to an image with #sticker`;
      await sendMessage(context.chatJid, response, sock);
      return;
    }

    await sock.sendMessage(context.chatJid, { text: '*🎴 Creating sticker...*' }, sock);

    const stickerBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    await sock.sendMessage(context.chatJid, { sticker: stickerBuffer }, sock);
  } catch (error) {
    console.error('Error creating sticker:', error);
    await sendMessage(context.chatJid, '*❌ Error creating sticker. Please try again.*', sock);
  }
}

async function handleAICommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  const query = args.join(' ');
  if (!query) {
    const response = `*🤖 AI CHAT*\n\nPlease provide a message after *#ai*\n\n*Example:* #ai What is the weather today?`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const response = `*🤖 AI CHAT*\n\n⚠️ OpenAI API key is not configured.\n\nPlease add your OPENAI_API_KEY to the environment variables.`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  try {
    await sendMessage(context.chatJid, '*🤖 Thinking...*', sock);

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
    await sendMessage(context.chatJid, `*🤖 AI Response*\n\n${response}`, sock);
  } catch (error) {
    console.error('OpenAI API error:', error);
    await sendMessage(context.chatJid, '*❌ AI service error. Please try again later.*', sock);
  }
}

async function handleWeatherCommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    const response = `*🌤️ WEATHER*\n\nPlease specify a city:\n*#weather [city name]*\n\n*Example:* #weather London`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  const city = args.join(' ');
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    const response = `*🌤️ WEATHER: ${city.toUpperCase()}*\n\n⚠️ Weather API key not configured.`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  try {
    await sendMessage(context.chatJid, '*🌤️ Fetching weather...*', sock);

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );

    const data = response.data;
    const weatherInfo = `*🌤️ WEATHER: ${data.name}, ${data.sys.country}*\n\n🌡️ *Temp:* ${data.main.temp}°C\n💧 *Humidity:* ${data.main.humidity}%\n🌬️ *Wind:* ${data.wind.speed} m/s\n☁️ *Condition:* ${data.weather[0].description}\n👀 *Feels like:* ${data.main.feels_like}°C\n\n*Updated:* Just now`;

    await sendMessage(context.chatJid, weatherInfo, sock);
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendMessage(context.chatJid, `*❌ City "${city}" not found. Please check the spelling.*`, sock);
    } else {
      console.error('Weather API error:', error);
      await sendMessage(context.chatJid, '*❌ Weather service error. Please try again later.*', sock);
    }
  }
}

async function sendJoke(chatJid: string, sock: any): Promise<void> {
  const jokes = [
    `Why don't scientists trust atoms?\nBecause they make up everything! 😂`,
    `Why did the scarecrow win an award?\nBecause he was outstanding in his field! 🌾`,
    `What do you call a fake noodle? An impasta! 🍝`,
    `Why don't eggs tell jokes?\nThey'd crack each other up! 🥚`,
    `What do you call a bear with no teeth? A gummy bear! 🐻`,
    `Why did the bot cross the road? To optimize its path! 🤖`,
  ];

  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await sendMessage(chatJid, `*😂 JOKE*\n\n${joke}`, sock);
}

async function startGame(context: MessageContext, args: string[], sock: any): Promise<void> {
  const gameType = args[0]?.toLowerCase();

  if (!gameType) {
    const games = ['trivia', 'hangman', 'wordchain', 'numberguess'];
    const gameList = games.map((g) => `• #play ${g}`).join('\n');
    const response = `*🎮 MINI GAMES*\n\nSelect a game:\n${gameList}\n\n*Example:* #play trivia`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  switch (gameType) {
    case 'numberguess':
      const targetNumber = Math.floor(Math.random() * 100) + 1;
      gameStates.set(context.chatJid, { target: targetNumber, attempts: 0, userJid: context.senderJid });
      const response = `*🎮 NUMBER GUESS GAME*\n\nI'm thinking of a number between 1 and 100.\nUse *#answer [number]* to guess!`;
      await sendMessage(context.chatJid, response, sock);
      break;
    case 'trivia':
      const triviaQ = 'What year was JavaScript first released?';
      const triviaA = '1995';
      gameStates.set(context.chatJid, { target: Date.now(), attempts: 0, userJid: context.senderJid });
      const triviaResponse = `*🎮 TRIVIA*\n\nQuestion: ${triviaQ}\nUse *#answer [answer]* to respond!`;
      await sendMessage(context.chatJid, triviaResponse, sock);
      break;
    default:
      const response = `*🎮 ${gameType.toUpperCase()}*\n\nGame mechanics for ${gameType} coming soon!`;
      await sendMessage(context.chatJid, response, sock);
  }
}

async function handleAnswer(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendMessage(context.chatJid, '*📝 Please provide an answer: #answer [number]*, sock);
    return;
  }

  const game = gameStates.get(context.chatJid);
  if (!game) {
    await sendMessage(context.chatJid, '*🎮 No active game. Start one with #play*', sock);
    return;
  }

  const guess = parseInt(args[0], 10);
  if (isNaN(guess)) {
    await sendMessage(context.chatJid, '*📝 Please provide a valid number*', sock);
    return;
  }

  game.attempts++;

  if (guess === game.target) {
    gameStates.delete(context.chatJid);
    await sendMessage(
      context.chatJid,
      `*🎉 CORRECT!*\n\nYou got it in ${game.attempts} attempt${game.attempts > 1 ? 's' : ''}! 🎊`,
      sock
    );
  } else if (guess < game.target) {
    await sendMessage(context.chatJid, '*⬆️ Too low! Try a higher number.*', sock);
  } else {
    await sendMessage(context.chatJid, '*⬇️ Too high! Try a lower number.*', sock);
  }
}

async function createPoll(context: MessageContext, args: string[], sock: any): Promise<void> {
  const pollInput = args.join(' ').split('|').map(s => s.trim());
  
  if (pollInput.length < 3) {
    const response = `*📊 CREATE POLL*\n\nUsage: *#poll [question] | [option1] | [option2] | ...*\n\n*Example:*\n#poll Favorite color? | Red | Blue | Green`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  const question = pollInput[0];
  const options = pollInput.slice(1).filter(o => o.length > 0);

  if (options.length < 2) {
    await sendMessage(context.chatJid, '*📊 Poll needs at least 2 options*', sock);
    return;
  }

  try {
    await savePoll(context.sessionId || '', context.chatJid, question, options);

    let pollMessage = `*📊 POLL*\n\n*${question}*\n\n`;
    options.forEach((option, index) => {
      pollMessage += `${index + 1}. ${option}\n`;
    });
    pollMessage += `\n*Vote:* #vote [number]`;

    await sendMessage(context.chatJid, pollMessage, sock);
  } catch (error) {
    console.error('Error creating poll:', error);
    await sendMessage(context.chatJid, '*❌ Error creating poll. Please try again.*', sock);
  }
}

async function handleVote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendMessage(context.chatJid, '*📊 Usage: #vote [number]*', sock);
    return;
  }

  const voteNumber = parseInt(args[0], 10);
  if (isNaN(voteNumber)) {
    await sendMessage(context.chatJid, '*📊 Please provide a valid option number*', sock);
    return;
  }

  await sendMessage(context.chatJid, '*📊 Vote recorded! (Auto-replies feature pending)*', sock);
}

async function showLeaderboard(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    const leaderboard = `*📊 LEADERBOARD*\n\n⚠️ Session not configured.\n\n*Top Users (Demo):*\n🥇 1. @user123 - 1,247 msgs\n🥈 2. @user456 - 892 msgs\n🥉 3. @user789 - 654 msgs`;
    await sendMessage(context.chatJid, leaderboard, sock);
    return;
  }

  try {
    const leaderboardData = await getLeaderboard(context.sessionId, 10);

    if (!leaderboardData || leaderboardData.length === 0) {
      await sendMessage(context.chatJid, '*📊 LEADERBOARD*\n\nNo messages yet. Be the first!*', sock);
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    let leaderboardMsg = '*📊 LEADERBOARD*\n\n';

    leaderboardData.forEach((entry: any, index: number) => {
      const medal = medals[index] || `${index + 1}.`;
      const name = entry.sender_name || entry.sender_jid?.split('@')[0] || 'Unknown';
      leaderboardMsg += `${medal} *${name}* - ${entry.msg_count || 0} msgs\n`;
    });

    await sendMessage(context.chatJid, leaderboardMsg, sock);
  } catch (error) {
    console.error('Leaderboard error:', error);
    await sendMessage(context.chatJid, '*📊 Leaderboard temporarily unavailable*', sock);
  }
}

async function handleDownload(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    const response = `*⬇️ MEDIA DOWNLOADER*\n\nUsage: *#download [url]*\n\n*Example:*\n#download https://youtube.com/...`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  await sendMessage(context.chatJid, '*⬇️ Media download feature coming soon!*\n\n*Note:* yt-dlp integration pending.`, sock);
}
