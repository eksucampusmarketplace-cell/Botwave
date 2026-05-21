/**
 * Custom commands handler for WhatsApp.
 * Processes user-defined commands with match_type, cooldown, and random response selection.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CustomCommand {
  id: string;
  command: string;
  response: string;
  match_type: 'exact' | 'contains' | 'startsWith';
  enabled: boolean;
  image_url?: string;
  cooldown: number;
  responses?: string[];
  platform: string;
}

const cooldownStore = new Map<string, number>();

function isCooldownActive(commandId: string, chatJid: string, cooldownSec: number): boolean {
  if (cooldownSec <= 0) return false;
  const key = `${commandId}:${chatJid}`;
  const lastUsed = cooldownStore.get(key);
  const now = Date.now();
  if (lastUsed && now - lastUsed < cooldownSec * 1000) return true;
  cooldownStore.set(key, now);
  return false;
}

function matchesCommand(text: string, command: CustomCommand): boolean {
  const normalized = text.toLowerCase().trim();
  const cmd = command.command.toLowerCase().trim();

  switch (command.match_type) {
    case 'exact':
      return normalized === cmd;
    case 'contains':
      return normalized.includes(cmd);
    case 'startsWith':
      return normalized.startsWith(cmd);
    default:
      return normalized === cmd;
  }
}

function pickResponse(command: CustomCommand): string {
  const pool = command.responses && command.responses.length > 0
    ? command.responses
    : [command.response];
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface CustomCommandResult {
  text: string;
  imageUrl?: string;
}

export async function handleCustomCommand(
  sessionId: string,
  messageText: string,
  chatJid: string
): Promise<CustomCommandResult | null> {
  try {
    const { data: commands, error } = await supabase
      .from('custom_commands')
      .select('*')
      .eq('user_id', sessionId)
      .eq('enabled', true)
      .eq('platform', 'whatsapp');

    if (error || !commands || commands.length === 0) return null;

    for (const cmd of commands as CustomCommand[]) {
      if (!matchesCommand(messageText, cmd)) continue;
      if (isCooldownActive(cmd.id, chatJid, cmd.cooldown)) return null;

      const response = pickResponse(cmd);
      return {
        text: response,
        imageUrl: cmd.image_url || undefined,
      };
    }

    return null;
  } catch (err) {
    console.error(`[WA-CUSTOM-CMD] Error for session ${sessionId}:`, err);
    return null;
  }
}
