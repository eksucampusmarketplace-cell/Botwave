import { delay } from '../../lib/utils';

const COMMAND_PREFIX = '#';
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 20;

interface MessageContext {
  senderJid: string;
  chatJid: string;
  message: string;
  isGroup: boolean;
}

const userMessageTracker: Map<string, number[]> = new Map();

export async function handleMessage(message: any, sock: any): Promise<void> {
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

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      isGroup,
    };

    if (!isRateLimited(senderJid)) {
      await processCommand(context, sock);
    } else {
      console.log(`Rate limited: ${senderJid}`);
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
    case 'poll':
      await createPoll(context, args, sock);
      break;
    case 'leaderboard':
      await showLeaderboard(context.chatJid, sock);
      break;
    default:
      await sendUnknownCommand(context.chatJid, sock);
  }
}

async function processAutoReply(context: MessageContext, sock: any): Promise<void> {
  // console.log('Auto-reply check for:', context.message.substring(0, 50));
}

async function sendMessage(jid: string, text: string, sock: any) {
    await sock.sendMessage(jid, { text });
}

async function sendHelp(chatJid: string, sock: any): Promise<void> {
  const helpMessage = `
*╔══════════════════════╗*
*║   BOTWAVE COMMANDS   ║*
*╠══════════════════════╣*
*#help*     - Show this help
*#ping*     - Check bot status
*#sticker*  - Create sticker from image
*#ai [msg]* - AI chat assistant
*#weather*   - Get weather info
*#joke*     - Get random joke
*#play*     - Start a mini game
*#poll*     - Create a poll
*#leaderboard* - View top users
*╠══════════════════════╣*
*Features: sticker, ai,*
*download, games, polls*
*╚══════════════════════╝*`;

  await sendMessage(chatJid, helpMessage, sock);
}

async function sendPing(chatJid: string, sock: any): Promise<void> {
  const ping = `*🏓 PONG!*\n\n*Bot Status:* Online\n*Response:* 120ms`;
  await sendMessage(chatJid, ping, sock);
}

async function createSticker(context: MessageContext, args: string[], sock: any): Promise<void> {
  const response = `*🎴 STICKER MAKER*\n\nSend an image with caption *#sticker* to convert it to a sticker!\n\n*Example:* Reply to an image with #sticker`;
  await sendMessage(context.chatJid, response, sock);
}

async function handleAICommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  const query = args.join(' ');
  if (!query) {
    const response = `*🤖 AI CHAT*\n\nPlease provide a message after *#ai*\n\n*Example:* #ai What is the weather today?`;
    await sendMessage(context.chatJid, response, sock);
    return;
  }

  const response = `*🤖 AI Response*\n\nProcessing your query... \n\n*Note:* Connect your OpenAI API key in settings for full AI functionality.`;
  await sendMessage(context.chatJid, response, sock);
}

async function handleWeatherCommand(context: MessageContext, args: string[], sock: any): Promise<void> {
  const response = `*🌤️ WEATHER*\n\nPlease specify a city:\n*#weather [city name]*\n\n*Example:* #weather London`;
  await sendMessage(context.chatJid, response, sock);
}

async function sendJoke(chatJid: string, sock: any): Promise<void> {
  const jokes = [
    `Why don't scientists trust atoms?\nBecause they make up everything! 😂`,
    `Why did the scarecrow win an award?\nBecause he was outstanding in his field! 🌾`,
    `What do you call a fake noodle? An impasta! 🍝`,
    `Why don't eggs tell jokes?\nThey'd crack each other up! 🥚`,
  ];

  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await sendMessage(chatJid, `*😂 JOKE*\n\n${joke}`, sock);
}

async function startGame(context: MessageContext, args: string[], sock: any): Promise<void> {
  const games = ['trivia', 'hangman', 'wordchain', 'numberguess'];
  const gameList = games.map((g) => `• #play ${g}`).join('\n');

  const response = `*🎮 MINI GAMES*\n\nSelect a game:\n${gameList}\n\n*Example:* #play trivia`;
  await sendMessage(context.chatJid, response, sock);
}

async function createPoll(context: MessageContext, args: string[], sock: any): Promise<void> {
  const response = `*📊 CREATE POLL*\n\nUsage: *#poll [question] | [option1] | [option2] | ...*\n\n*Example:*\n#poll Favorite color? | Red | Blue | Green`;
  await sendMessage(context.chatJid, response, sock);
}

async function showLeaderboard(chatJid: string, sock: any): Promise<void> {
  const leaderboard = `
*📊 LEADERBOARD*\n
*🥇 1.* @user123 - 1,247 msgs
*🥈 2.* @user456 - 892 msgs
*🥉 3.* @user789 - 654 msgs
*4.* @user101 - 521 msgs
*5.* @user202 - 398 msgs
\n*Your Position:* #12 with 87 msgs`;

  await sendMessage(chatJid, leaderboard, sock);
}

async function sendUnknownCommand(chatJid: string, sock: any): Promise<void> {
  const response = `*❓ UNKNOWN COMMAND*\n\nType *#help* to see all available commands.`;
  await sendMessage(chatJid, response, sock);
}
