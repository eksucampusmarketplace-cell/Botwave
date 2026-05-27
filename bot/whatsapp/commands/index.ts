// Import all command modules with isolation so one broken module does not hide all commands.
import { getAllCommands as getRegisteredCommands } from './registry';

const COMMAND_MODULES: Array<{ path: string; name: string }> = [
  { path: './general', name: 'general' },
  { path: './fun', name: 'fun' },
  { path: './games', name: 'games' },
  { path: './info', name: 'info' },
  { path: './media', name: 'media' },
  { path: './creative', name: 'creative' },
  { path: './productivity', name: 'productivity' },
  { path: './admin', name: 'admin' },
  { path: './logo', name: 'logo' },
  { path: './chatbot', name: 'chatbot' },
  { path: './smart', name: 'smart' },
  { path: './social', name: 'social' },
  { path: './multiplayerGame', name: 'multiplayerGame' },
  { path: './lang', name: 'lang' },
  { path: './featureRequest', name: 'featureRequest' },
  { path: './autopilot', name: 'autopilot' },
];

let importFailures = 0;
for (const mod of COMMAND_MODULES) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(mod.path);
  } catch (err) {
    importFailures += 1;
    console.error(`[COMMANDS] Failed to import ${mod.name}:`, err);
  }
}

const registeredCount = getRegisteredCommands().length;
console.log(`[COMMANDS] Registered ${registeredCount} command(s) at startup (importFailures=${importFailures})`);

if (registeredCount === 0) {
  throw new Error('[COMMANDS] 0 commands registered at startup - failing fast');
}

// Re-export registry for use by MessageHandler
export { getCommand, getAllCommands, getCommandsByCategory } from './registry';
export type { MessageContext, TemplateVars, CommandHandler, CommandCategory } from './registry';
export { sendUnknownCommand } from './general';
