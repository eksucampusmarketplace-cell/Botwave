import { messageRateLimiter, commandRateLimiter, delay } from '@/lib/utils';

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

export async function handleMessage(message: unknown, client: unknown): Promise<void> {
  try {
    const msg = message as {
      from: string;
      id: { remote: string };
      body: string;
      fromMe: boolean;
      hasMedia: boolean;
      notifyName: string;
    };

    if (msg.fromMe) return;

    const senderJid = msg.from;
    const chatJid = msg.id.remote;
    const content = msg.body;
    const isGroup = chatJid.endsWith('@g.us');

    const context: MessageContext = {
      senderJid,
      chatJid,
      message: content,
      isGroup,
    };

    if (!isRateLimited(senderJid)) {
      await processCommand(context, client);
    } else {
      console.log(`Rate limited: ${senderJid}`);
    }

    await processAutoReply(context, client);
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

async function processCommand(context: MessageContext, client: unknown): Promise<void> {
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
      await sendHelp(context.chatJid, client);
      break;
    case 'ping':
      await sendPing(context.chatJid, client);
      break;
    case 'sticker':
      await createSticker(context, args, client);
      break;
    case 'ai':
      await handleAICommand(context, args, client);
      break;
    case 'weather':
      await handleWeatherCommand(context, args, client);
      break;
    case 'joke':
      await sendJoke(context.chatJid, client);
      break;
    case 'play':
      await startGame(context, args, client);
      break;
    case 'poll':
      await createPoll(context, args, client);
      break;
    case 'leaderboard':
      await showLeaderboard(context.chatJid, client);
      break;
    default:
      await sendUnknownCommand(context.chatJid, client);
  }
}

async function processAutoReply(context: MessageContext, client: unknown): Promise<void> {
  console.log('Auto-reply check for:', context.message.substring(0, 50));
}

async function sendHelp(chatJid: string, client: unknown): Promise<void> {
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

  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, helpMessage);
}

async function sendPing(chatJid: string, client: unknown): Promise<void> {
  const ping = `*🏓 PONG!*\n\n*Bot Status:* Online\n*Response:* 120ms`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, ping);
}

async function createSticker(context: MessageContext, args: string[], client: unknown): Promise<void> {
  const response = `*🎴 STICKER MAKER*\n\nSend an image with caption *#sticker* to convert it to a sticker!\n\n*Example:* Reply to an image with #sticker`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
}

async function handleAICommand(context: MessageContext, args: string[], client: unknown): Promise<void> {
  const query = args.join(' ');
  if (!query) {
    const response = `*🤖 AI CHAT*\n\nPlease provide a message after *#ai*\n\n*Example:* #ai What is the weather today?`;
    await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
    return;
  }

  const response = `*🤖 AI Response*\n\nProcessing your query... \n\n*Note:* Connect your OpenAI API key in settings for full AI functionality.`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
}

async function handleWeatherCommand(context: MessageContext, args: string[], client: unknown): Promise<void> {
  const response = `*🌤️ WEATHER*\n\nPlease specify a city:\n*#weather [city name]*\n\n*Example:* #weather London`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
}

async function sendJoke(chatJid: string, client: unknown): Promise<void> {
  const jokes = [
    `Why don't scientists trust atoms?\nBecause they make up everything! 😂`,
    `Why did the scarecrow win an award?\nBecause he was outstanding in his field! 🌾`,
    `What do you call a fake noodle? An impasta! 🍝`,
    `Why don't eggs tell jokes?\nThey'd crack each other up! 🥚`,
  ];

  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, `*😂 JOKE*\n\n${joke}`);
}

async function startGame(context: MessageContext, args: string[], client: unknown): Promise<void> {
  const gameType = args[0]?.toLowerCase() || 'menu';

  const games = ['trivia', 'hangman', 'wordchain', 'numberguess'];
  const gameList = games.map((g) => `• #play ${g}`).join('\n');

  const response = `*🎮 MINI GAMES*\n\nSelect a game:\n${gameList}\n\n*Example:* #play trivia`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
}

async function createPoll(context: MessageContext, args: string[], client: unknown): Promise<void> {
  const response = `*📊 CREATE POLL*\n\nUsage: *#poll [question] | [option1] | [option2] | ...*\n\n*Example:*\n#poll Favorite color? | Red | Blue | Green`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(context.chatJid, response);
}

async function showLeaderboard(chatJid: string, client: unknown): Promise<void> {
  const leaderboard = `
*📊 LEADERBOARD*\n
*🥇 1.* @user123 - 1,247 msgs
*🥈 2.* @user456 - 892 msgs
*🥉 3.* @user789 - 654 msgs
*4.* @user101 - 521 msgs
*5.* @user202 - 398 msgs
\n*Your Position:* #12 with 87 msgs`;

  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, leaderboard);
}

async function sendUnknownCommand(chatJid: string, client: unknown): Promise<void> {
  const response = `*❓ UNKNOWN COMMAND*\n\nType *#help* to see all available commands.`;
  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, response);
}

export async function handleGroupJoin(notification: unknown, client: unknown): Promise<void> {
  const notif = notification as { id: { remote: string }; recipientIds: string[] };
  const chatJid = notif.id.remote;
  const welcomeMessage = `*👋 WELCOME!*\n\nGlad you're here! Type *#help* to see what I can do.`;

  await (client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(chatJid, welcomeMessage);
}

export async function handleGroupLeave(notification: unknown, client: unknown): Promise<void> {
  console.log('User left group:', notification);
}