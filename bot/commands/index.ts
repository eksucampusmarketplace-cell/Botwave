// Import all command modules — each module self-registers its commands on import
import './general';
import './fun';
import './games';
import './info';
import './media';
import './creative';
import './productivity';
import './admin';

// Re-export registry for use by MessageHandler
export { getCommand, getAllCommands, getCommandsByCategory } from './registry';
export type { MessageContext, TemplateVars, CommandHandler, CommandCategory } from './registry';
export { sendUnknownCommand } from './general';
