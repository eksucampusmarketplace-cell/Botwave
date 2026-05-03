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
  sock: any;
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

export function registerCommands(_sock: any): void {
  // Commands are now handled directly by MessageHandler with the ! prefix.
  // This function is kept for backwards compatibility.
  console.log('BotWave commands registered (handled by MessageHandler)');
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
