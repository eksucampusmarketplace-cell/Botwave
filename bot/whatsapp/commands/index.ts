// Import all command modules - each module self-registers its commands on import
import './general';
import './fun';
import './games';
import './info';
import './media';
import './creative';
import './productivity';
import './admin';
import './logo';
import './chatbot';
import './smart';
import './social';
import './multiplayerGame';
import './lang';
import './featureRequest';

// Re-export registry for use by MessageHandler
export { getCommand, getAllCommands, getCommandsByCategory } from './registry';
export type { MessageContext, TemplateVars, CommandHandler, CommandCategory } from './registry';
export { sendUnknownCommand } from './general';

// Log registered command count at startup for diagnostics
import { getAllCommands as getRegisteredCommands } from './registry';
console.log(`[COMMANDS] Registered ${getRegisteredCommands().length} command(s) at startup`);
