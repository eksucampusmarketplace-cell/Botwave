import { MessageQueue } from '../utils/MessageQueue';

export interface MessageContext {
  senderJid: string;
  chatJid: string;
  message: string;
  rawMessage: any;
  isGroup: boolean;
  isOwner: boolean;
  pushName?: string;
  sessionId?: string;
  userId?: string;
  queue?: MessageQueue;
}

export interface TemplateVars {
  name: string;
  time: string;
  date: string;
  group?: string;
}

export interface CommandHandler {
  /** The canonical command name (e.g. 'weather') */
  name: string;
  /** All aliases including the canonical name (e.g. ['weather', 'w', 'forecast']) */
  aliases: string[];
  /** Category for help grouping */
  category: CommandCategory;
  /** Short description shown in !help */
  description: string;
  /** If true, only the bot owner (session linked account) can run this command */
  ownerOnly?: boolean;
  /** Execute the command */
  execute: (
    context: MessageContext,
    args: string[],
    sock: any,
    vars: TemplateVars,
    commandName: string,
  ) => Promise<void>;
}

export type CommandCategory =
  | 'general'
  | 'fun'
  | 'games'
  | 'info'
  | 'media'
  | 'creative'
  | 'productivity'
  | 'study'
  | 'social'
  | 'admin'
  | 'utility';

const commands = new Map<string, CommandHandler>();
const allHandlers: CommandHandler[] = [];

export function registerCommand(handler: CommandHandler): void {
  allHandlers.push(handler);
  for (const alias of handler.aliases) {
    const lower = alias.toLowerCase();
    if (commands.has(lower)) {
      console.warn(`Command alias '${lower}' already registered by '${commands.get(lower)!.name}', overwritten by '${handler.name}'`);
    }
    commands.set(lower, handler);
  }
}

export function getCommand(name: string): CommandHandler | undefined {
  return commands.get(name.toLowerCase());
}

export function getAllCommands(): CommandHandler[] {
  return [...allHandlers];
}

export function getCommandsByCategory(category: CommandCategory): CommandHandler[] {
  return allHandlers.filter((h) => h.category === category);
}
