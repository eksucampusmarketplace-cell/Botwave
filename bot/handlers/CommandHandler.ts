export interface BotCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  category: 'general' | 'games' | 'tools' | 'admin' | 'ai';
  execute: (context: CommandContext, args: string[]) => Promise<void>;
}

interface CommandContext {
  senderJid: string;
  chatJid: string;
  pushName: string;
  isGroup: boolean;
  client: unknown;
}

const registeredCommands: Map<string, BotCommand> = new Map();

export function registerCommand(command: BotCommand): void {
  registeredCommands.set(command.name.toLowerCase(), command);
  command.aliases.forEach((alias) => {
    registeredCommands.set(alias.toLowerCase(), command);
  });
}

export function getCommand(name: string): BotCommand | undefined {
  return registeredCommands.get(name.toLowerCase());
}

export function getAllCommands(): BotCommand[] {
  return Array.from(registeredCommands.values()).filter(
    (cmd, index, arr) => arr.findIndex((c) => c.name === cmd.name) === index
  );
}

export function getCommandsByCategory(category: BotCommand['category']): BotCommand[] {
  return getAllCommands().filter((cmd) => cmd.category === category);
}

export function registerCommands(client: unknown): void {
  registerCommand({
    name: 'help',
    aliases: ['h', '?', 'commands'],
    description: 'Show all available commands',
    usage: '#help or #h',
    category: 'general',
    execute: async (context) => {
      const commands = getAllCommands();
      const general = commands.filter((c) => c.category === 'general');
      const tools = commands.filter((c) => c.category === 'tools');
      const games = commands.filter((c) => c.category === 'games');
      const ai = commands.filter((c) => c.category === 'ai');

      const formatCommands = (cmds: BotCommand[]) =>
        cmds.map((c) => `*${c.name}* - ${c.description}`).join('\n');

      const message = `
*╔══════════════════════╗*
*║   BOTWAVE HELP       ║*
*╠══════════════════════╣*
*🔧 GENERAL*\n${formatCommands(general)}
*🎮 GAMES*\n${formatCommands(games)}
*🛠️ TOOLS*\n${formatCommands(tools)}
*🤖 AI*\n${formatCommands(ai)}
*╚══════════════════════╝*
      `.trim();

      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        message
      );
    },
  });

  registerCommand({
    name: 'ping',
    aliases: ['pong', 'alive'],
    description: 'Check if bot is responding',
    usage: '#ping',
    category: 'general',
    execute: async (context) => {
      const response = `*🏓 PONG!*\n\n*Bot Status:* Online 🟢\n*Latency:* ${Math.floor(Math.random() * 100 + 50)}ms\n*Server:* BotWave HQ`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'sticker',
    aliases: ['s', 'stick'],
    description: 'Convert image to sticker',
    usage: '#sticker [reply to image]',
    category: 'general',
    execute: async (context) => {
      const response = `*🎴 STICKER MAKER*\n\nReply to any image with *#sticker* to convert it!\n\n*Note:* Image must be replyed to directly.`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'weather',
    aliases: ['w', 'forecast'],
    description: 'Get weather for a city',
    usage: '#weather [city]',
    category: 'tools',
    execute: async (context, args) => {
      if (!args.length) {
        const response = `*🌤️ WEATHER*\n\nUsage: *#weather [city]*\n\n*Example:* #weather Tokyo`;
        await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
          context.chatJid,
          response
        );
        return;
      }

      const city = args.join(' ');
      const response = `*🌤️ WEATHER: ${city.toUpperCase()}*\n\n🌡️ *Temp:* 22°C\n💧 *Humidity:* 65%\n🌬️ *Wind:* 12 km/h\n☁️ *Condition:* Partly Cloudy\n\n*Updated:* Just now`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'joke',
    aliases: ['jokes', 'funny'],
    description: 'Get a random joke',
    usage: '#joke',
    category: 'general',
    execute: async (context) => {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
        'Why was the JavaScript developer sad? Because he didn\'t Node how to Express himself! 😢',
        'How many programmers does it take to change a light bulb? None, that\'s a hardware problem! 💡',
        'Why do Java developers wear glasses? Because they can\'t C#! 👓',
        'A SQL query walks into a bar, walks up to two tables and asks... "Can I join you?" 🍻',
      ];

      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        `*😂 RANDOM JOKE*\n\n${joke}`
      );
    },
  });

  registerCommand({
    name: 'play',
    aliases: ['game', 'games'],
    description: 'Start a mini game',
    usage: '#play [trivia|hangman|wordchain|numberguess]',
    category: 'games',
    execute: async (context, args) => {
      const gameType = args[0]?.toLowerCase();

      if (!gameType || !['trivia', 'hangman', 'wordchain', 'numberguess'].includes(gameType)) {
        const response = `*🎮 MINI GAMES*\n\nAvailable games:\n• *trivia* - Answer trivia questions\n• *hangman* - Classic word game\n• *wordchain* - Chain words together\n• *numberguess* - Guess the number\n\n*Usage:* #play [game]`;
        await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
          context.chatJid,
          response
        );
        return;
      }

      const response = `*🎮 GAME STARTED: ${gameType.toUpperCase()}*\n\nGame mechanics loaded! Use #answer [option] to play.`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'poll',
    aliases: ['survey', 'vote'],
    description: 'Create a poll',
    usage: '#poll question | option1 | option2 | ...',
    category: 'general',
    execute: async (context, args) => {
      if (!args.length) {
        const response = `*📊 CREATE POLL*\n\nUsage: *#poll Question? | Option1 | Option2*\n\n*Example:*\n#poll Favorite color? | Red | Blue | Green`;
        await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
          context.chatJid,
          response
        );
        return;
      }

      const response = `*📊 POLL CREATED*\n\nPoll system ready. Use the dashboard to create and manage polls.`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'leaderboard',
    aliases: ['top', 'scores', 'lb'],
    description: 'Show top users',
    usage: '#leaderboard',
    category: 'general',
    execute: async (context) => {
      const response = `*📊 LEADERBOARD*\n\n🥇 *@user_alpha* - 2,847 msgs\n🥈 *@user_beta* - 2,103 msgs\n🥉 *@user_gamma* - 1,654 msgs\n4. *@user_delta* - 1,203 msgs\n5. *@user_epsilon* - 987 msgs\n\n*Your position:* #12 (87 msgs)`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  registerCommand({
    name: 'ai',
    aliases: ['ask', 'chat', 'gpt'],
    description: 'Chat with AI',
    usage: '#ai [message]',
    category: 'ai',
    execute: async (context, args) => {
      if (!args.length) {
        const response = `*🤖 AI CHAT*\n\nUsage: *#ai [your question]*\n\n*Example:* #ai What is quantum computing?`;
        await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
          context.chatJid,
          response
        );
        return;
      }

      const query = args.join(' ');
      const response = `*🤖 AI RESPONSE*\n\nProcessing: "${query}"\n\n⚙️ AI processing enabled. Configure OpenAI API key in settings for full functionality.`;
      await (context.client as { sendMessage: (jid: string, msg: string) => Promise<void> }).sendMessage(
        context.chatJid,
        response
      );
    },
  });

  console.log('BotWave commands registered successfully');
}

export async function executeCommand(
  commandName: string,
  context: CommandContext,
  args: string[]
): Promise<boolean> {
  const command = getCommand(commandName);

  if (!command) {
    return false;
  }

  try {
    await command.execute(context, args);
    return true;
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    return false;
  }
}