/**
 * Command cooldown system - per-user rate limiting for bot commands.
 * Prevents spam of commands like /joke, /quote, /dice, etc.
 */

const cooldowns = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 3_000; // 3 seconds default

const COMMAND_COOLDOWNS: Record<string, number> = {
  joke: 5_000,
  quote: 5_000,
  dice: 3_000,
  coin: 3_000,
  '8ball': 5_000,
  choose: 3_000,
  roll: 3_000,
  sticker: 10_000,
  ai: 15_000,
  translate: 10_000,
  weather: 10_000,
  define: 5_000,
  horoscope: 10_000,
  imagine: 30_000,
  download: 15_000,
  trivia: 10_000,
  hangman: 10_000,
  wordchain: 10_000,
  feedback: 30_000,
  exportconfig: 60_000,
};

/**
 * Check if a user is on cooldown for a command.
 * Returns remaining cooldown in seconds, or 0 if not on cooldown.
 */
export function checkCooldown(userId: number, command: string): number {
  const key = `${userId}:${command}`;
  const expiresAt = cooldowns.get(key);
  if (!expiresAt) return 0;

  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(key);
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * Set cooldown for a user after executing a command.
 */
export function setCooldown(userId: number, command: string): void {
  const key = `${userId}:${command}`;
  const duration = COMMAND_COOLDOWNS[command] || DEFAULT_COOLDOWN_MS;
  cooldowns.set(key, Date.now() + duration);
}

/**
 * Periodic cleanup of expired cooldown entries.
 */
export function cleanupCooldowns(): void {
  const now = Date.now();
  for (const [key, expiresAt] of cooldowns) {
    if (expiresAt <= now) cooldowns.delete(key);
  }
}

// Cleanup every 60 seconds
setInterval(cleanupCooldowns, 60_000);
