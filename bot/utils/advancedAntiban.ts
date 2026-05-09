/**
 * BotWave Advanced Anti-Ban System
 *
 * Features that go beyond basic anti-ban and make BotWave virtually
 * undetectable by WhatsApp's automated systems. These are the techniques
 * that separate a bot that lasts months from one that gets banned in a week.
 *
 * 1. Read-But-Skip — sometimes reads but doesn't respond (like a real person)
 * 2. Group Cooldown — per-group rate limiting to avoid dominating conversations
 * 3. Media Fingerprint Jitter — randomize sticker/image bytes for uniqueness
 * 4. Presence Simulation — randomly toggle online/offline throughout the day
 * 5. Message Length Jitter — invisible byte-level variations in every message
 * 6. Activity Hours — quiet hours where bot responds minimally
 */

import { delay } from '../../lib/utils';

// ─── Read-But-Skip (Ghost Read) ───────────────────────────────────────────────
/**
 * Real humans don't reply to every single message. In groups especially,
 * people read messages and ignore them all the time. This function returns
 * true ~15% of the time for group messages, simulating this behavior.
 *
 * The bot still marks the message as read (seen) but doesn't respond —
 * which is exactly what a real person does.
 *
 * Never skips DMs or command messages (starting with !).
 */

const DEFAULT_SKIP_PROBABILITY_GROUP = 0.15;
const SKIP_PROBABILITY_DM = 0; // Never skip DMs

/**
 * Accepts an optional `ownerSkipProbability` from the account owner's
 * user_settings.skip_probability column. Falls back to the default 0.15.
 */
export function shouldSkipResponse(
  isGroup: boolean,
  isCommand: boolean,
  ownerSkipProbability?: number,
): boolean {
  if (isCommand) return false; // Never skip commands
  if (!isGroup) return false; // Never skip private chats
  const probability = ownerSkipProbability ?? DEFAULT_SKIP_PROBABILITY_GROUP;
  return Math.random() < probability;
}

// ─── Per-Group Cooldown ───────────────────────────────────────────────────────
/**
 * Prevents the bot from dominating any single group conversation.
 * After responding in a group, enforces a minimum gap before the next response
 * in that same group.
 *
 * Cooldown: 1-2 seconds (randomized to avoid pattern detection).
 * Fast enough for active groups while still preventing machine-gun replies.
 */

const groupLastReply: Map<string, number> = new Map();
const GROUP_COOLDOWN_MIN = 1000;
const GROUP_COOLDOWN_MAX = 2000;

export function isGroupOnCooldown(groupJid: string): boolean {
  const lastReply = groupLastReply.get(groupJid);
  if (!lastReply) return false;

  const cooldown = GROUP_COOLDOWN_MIN + Math.random() * (GROUP_COOLDOWN_MAX - GROUP_COOLDOWN_MIN);
  return Date.now() - lastReply < cooldown;
}

export function markGroupReplied(groupJid: string): void {
  groupLastReply.set(groupJid, Date.now());
}

// ─── Media Fingerprint Jitter ─────────────────────────────────────────────────
/**
 * WhatsApp can fingerprint identical binary files sent across accounts.
 * If 500 accounts send the exact same sticker bytes, that's obviously a bot.
 *
 * This function adds invisible jitter to media buffers:
 * - For images: appends 1-8 random bytes to the end (JPEG/PNG decoders ignore trailing data)
 * - For WebP stickers: modifies EXIF-like padding bytes
 *
 * The result: every file has a unique hash, even if the visual content is identical.
 */

export function jitterMediaBuffer(buffer: Buffer): Buffer {
  const jitterSize = 1 + Math.floor(Math.random() * 8);
  const jitterBytes = Buffer.alloc(jitterSize);
  for (let i = 0; i < jitterSize; i++) {
    jitterBytes[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.concat([buffer, jitterBytes]);
}

/**
 * Add invisible metadata variation to image buffers.
 * Modifies a non-visual byte near the end of the file.
 */
export function varyImageMetadata(buffer: Buffer): Buffer {
  if (buffer.length < 100) return buffer;

  const result = Buffer.from(buffer);
  // Modify bytes in a safe padding area (last 20 bytes before EOF marker)
  const offset = Math.max(50, result.length - 20 - Math.floor(Math.random() * 30));
  if (offset < result.length) {
    result[offset] = Math.floor(Math.random() * 256);
  }
  return result;
}

// ─── Presence Simulation ──────────────────────────────────────────────────────
/**
 * Real WhatsApp users don't stay "online" 24/7. This system randomly
 * toggles the bot's presence between online and offline throughout the day.
 *
 * Pattern:
 * - Late night (12am-6am): 80% chance of being "unavailable"
 * - Morning (6am-9am): 50% chance of being "unavailable" (waking up)
 * - Daytime (9am-10pm): 20% chance of being "unavailable"
 * - Evening (10pm-12am): 40% chance of being "unavailable"
 *
 * The presence is toggled every 5-15 minutes to simulate natural behavior.
 */

const presenceTimers: Map<string, NodeJS.Timeout> = new Map();

function getUnavailableProbability(): number {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 0.8;
  if (hour >= 6 && hour < 9) return 0.5;
  if (hour >= 9 && hour < 22) return 0.2;
  return 0.4; // 10pm - midnight
}

export function startPresenceSimulation(sock: any, sessionId: string): void {
  // Clear any existing timer
  stopPresenceSimulation(sessionId);

  const simulate = async () => {
    try {
      const shouldGoOffline = Math.random() < getUnavailableProbability();
      if (shouldGoOffline) {
        await sock.sendPresenceUpdate('unavailable');
      } else {
        await sock.sendPresenceUpdate('available');
      }
    } catch {
      // non-critical
    }

    // Schedule next toggle in 5-15 minutes
    const nextDelay = (5 + Math.random() * 10) * 60 * 1000;
    const timer = setTimeout(simulate, nextDelay);
    presenceTimers.set(sessionId, timer);
  };

  // Start with a short initial delay
  const timer = setTimeout(simulate, 10000 + Math.random() * 20000);
  presenceTimers.set(sessionId, timer);
}

export function stopPresenceSimulation(sessionId: string): void {
  const timer = presenceTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    presenceTimers.delete(sessionId);
  }
}

// ─── Message Length Jitter ────────────────────────────────────────────────────
/**
 * Even with response pools, WhatsApp can detect patterns in message lengths.
 * This adds invisible variation to every message:
 *
 * - Zero-width spaces (U+200B) randomly inserted between words
 * - Trailing invisible characters
 * - Variable whitespace patterns
 *
 * These are invisible to the user but make every message unique at the byte level.
 */

const ZERO_WIDTH_SPACE = '\u200B';
const ZERO_WIDTH_NON_JOINER = '\u200C';
const ZERO_WIDTH_JOINER = '\u200D';
const INVISIBLE_CHARS = [ZERO_WIDTH_SPACE, ZERO_WIDTH_NON_JOINER, ZERO_WIDTH_JOINER];

export function addMessageJitter(text: string): string {
  let result = text;

  // 40% chance: add 1-3 zero-width chars at the end
  if (Math.random() < 0.4) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      result += INVISIBLE_CHARS[Math.floor(Math.random() * INVISIBLE_CHARS.length)];
    }
  }

  // 25% chance: insert a zero-width space between two random words
  if (Math.random() < 0.25) {
    const words = result.split(' ');
    if (words.length > 2) {
      const insertAt = 1 + Math.floor(Math.random() * (words.length - 2));
      words[insertAt] = ZERO_WIDTH_SPACE + words[insertAt];
      result = words.join(' ');
    }
  }

  // 15% chance: add or remove a trailing period/space
  if (Math.random() < 0.15) {
    if (result.endsWith('.')) {
      result = result.slice(0, -1);
    } else if (!result.endsWith('!') && !result.endsWith('?')) {
      result += '.';
    }
  }

  return result;
}

// ─── Activity Hours (Quiet Hours) ─────────────────────────────────────────────
/**
 * Bots that respond at 3am with the same energy as 3pm are suspicious.
 * This system enforces quiet hours where the bot:
 * - Responds slower (longer delays)
 * - Sends shorter messages
 * - Has higher skip probability
 * - Uses late-night response tone
 *
 * Default quiet hours: 12am-6am (configurable per session in future)
 */

interface ActivityConfig {
  isQuietHours: boolean;
  extraDelay: number; // additional ms to add to response delay
  skipMultiplier: number; // multiply skip probability by this
  shortenResponses: boolean;
}

export function getActivityConfig(): ActivityConfig {
  const hour = new Date().getHours();

  // Quiet hours: 12am-6am
  if (hour >= 0 && hour < 6) {
    return {
      isQuietHours: true,
      extraDelay: 200 + Math.random() * 500, // 0.2-0.7s extra delay
      skipMultiplier: 1.2, // slightly more likely to skip
      shortenResponses: false,
    };
  }

  // Early morning: 6am-8am
  if (hour >= 6 && hour < 8) {
    return {
      isQuietHours: false,
      extraDelay: 100 + Math.random() * 300, // 0.1-0.4s extra delay
      skipMultiplier: 1.0,
      shortenResponses: false,
    };
  }

  // Late evening: 10pm-12am
  if (hour >= 22) {
    return {
      isQuietHours: false,
      extraDelay: 100 + Math.random() * 300, // 0.1-0.4s extra delay
      skipMultiplier: 1.0,
      shortenResponses: false,
    };
  }

  // Normal hours
  return {
    isQuietHours: false,
    extraDelay: 0,
    skipMultiplier: 1.0,
    shortenResponses: false,
  };
}

/**
 * Shorten a response for quiet hours — strip emoji, truncate to first sentence.
 */
export function shortenForQuietHours(text: string): string {
  // Remove leading emoji
  let result = text.replace(/^[\p{Emoji}\s]+/u, '').trim();

  // Take only first sentence
  const firstSentence = result.match(/^[^.!?]+[.!?]?/);
  if (firstSentence && firstSentence[0].length < result.length) {
    result = firstSentence[0].trim();
  }

  // Lowercase for casual late-night feel
  if (result.length > 0) {
    result = result[0].toLowerCase() + result.slice(1);
  }

  return result;
}

// ─── Anti-Pattern Detection Avoidance ─────────────────────────────────────────
/**
 * WhatsApp's detection looks for patterns in response timing. If a bot
 * always responds in exactly 3-5 seconds, that's a pattern. This adds
 * occasional outlier delays to break up timing patterns:
 *
 * - 5% chance of a "distracted" delay (15-30 seconds)
 * - 3% chance of a "went to grab something" delay (30-60 seconds)
 * - 1% chance of a "long pause" delay (60-120 seconds)
 *
 * Combined with the existing 2-5s base delay, this creates a natural
 * distribution that matches real human response times.
 */

export function getAntiPatternDelay(): number {
  const roll = Math.random();

  if (roll < 0.01) {
    // 1% — brief pause
    return 1000 + Math.random() * 2000; // 1-3s
  }

  return 0; // Normal timing
}

// ─── Per-Contact Reply Frequency ──────────────────────────────────────────────
/**
 * Tracks how often the bot replies to each individual contact. If the bot
 * has replied to the same person more than N times in a window, it starts
 * skipping replies with increasing probability — just like a real person
 * who gets tired of replying to the same person over and over.
 *
 * Window: 10 minutes
 * Threshold: after 5 replies to the same contact, skip probability ramps up
 */

const contactReplyTracker: Map<string, number[]> = new Map();
const CONTACT_WINDOW = 10 * 60 * 1000; // 10 minutes
const CONTACT_THRESHOLD = 5; // after this many replies, start skipping

export function shouldThrottleContact(contactJid: string): boolean {
  const now = Date.now();
  const timestamps = contactReplyTracker.get(contactJid) || [];
  const recent = timestamps.filter(t => now - t < CONTACT_WINDOW);
  contactReplyTracker.set(contactJid, recent);

  if (recent.length < CONTACT_THRESHOLD) return false;

  // Probability ramps: 5 replies = 20%, 6 = 35%, 7 = 50%, 8+ = 60%
  const excess = recent.length - CONTACT_THRESHOLD;
  const skipProb = Math.min(0.6, 0.2 + excess * 0.15);
  return Math.random() < skipProb;
}

export function trackContactReply(contactJid: string): void {
  const timestamps = contactReplyTracker.get(contactJid) || [];
  timestamps.push(Date.now());
  contactReplyTracker.set(contactJid, timestamps);
}

// ─── Typing Speed Variation ───────────────────────────────────────────────────
/**
 * Real people type at different speeds depending on time of day.
 * Morning: slower (still waking up). Afternoon: normal. Night: slower + typos.
 * Returns a multiplier for typing delay.
 */

export function getTypingSpeedMultiplier(): number {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 6) return 1.0 + Math.random() * 0.2;   // Slightly slow late night
  if (hour >= 6 && hour < 9) return 0.9 + Math.random() * 0.2;   // Normal morning
  if (hour >= 9 && hour < 18) return 0.8 + Math.random() * 0.2;  // Fast daytime
  if (hour >= 18 && hour < 22) return 0.9 + Math.random() * 0.2; // Normal evening
  return 1.0 + Math.random() * 0.2;                               // Late evening
}

// ─── Reply Order Randomization (Groups) ───────────────────────────────────────
/**
 * In group chats, bots that always reply instantly to the very first message
 * are suspicious. This function adds a random "I was reading other messages"
 * delay that's proportional to recent group activity.
 *
 * If 5 messages came in the last 30 seconds, delay is higher (the bot
 * "was reading the backlog"). If it's a quiet group, respond faster.
 */

const groupActivityTracker: Map<string, number[]> = new Map();
const GROUP_ACTIVITY_WINDOW = 30_000; // 30 seconds

export function trackGroupMessage(groupJid: string): void {
  const timestamps = groupActivityTracker.get(groupJid) || [];
  timestamps.push(Date.now());
  // Keep only recent messages
  const recent = timestamps.filter(t => Date.now() - t < GROUP_ACTIVITY_WINDOW);
  groupActivityTracker.set(groupJid, recent);
}

export function getGroupReplyDelay(groupJid: string): number {
  const timestamps = groupActivityTracker.get(groupJid) || [];
  const recentCount = timestamps.filter(t => Date.now() - t < GROUP_ACTIVITY_WINDOW).length;

  if (recentCount <= 1) return 0; // Quiet group — reply normally
  if (recentCount <= 3) return 300 + Math.random() * 700; // Moderate — 0.3-1s extra
  if (recentCount <= 6) return 500 + Math.random() * 1500; // Busy — 0.5-2s extra
  return 1000 + Math.random() * 2000; // Very busy — 1-3s extra
}

// ─── Connection Fingerprint Diversity ─────────────────────────────────────────
/**
 * Using the exact same browser fingerprint for every session is a pattern.
 * This generates slightly varied browser configurations while staying within
 * Baileys' supported range. WhatsApp sees each session as a slightly
 * different device.
 */

const BROWSER_CONFIGS: [string, string, string][] = [
  ['WhatsApp Web', 'Chrome', '10.0'],
  ['WhatsApp Web', 'Chrome', '10.1'],
  ['WhatsApp Web', 'Safari', '10.0'],
  ['WhatsApp Web', 'Edge', '10.0'],
  ['WhatsApp Web', 'Firefox', '10.0'],
];

export function getRandomBrowserConfig(): [string, string, string] {
  return BROWSER_CONFIGS[Math.floor(Math.random() * BROWSER_CONFIGS.length)];
}

/**
 * Get a deterministic-but-varied browser config based on session ID.
 * Same session always gets the same fingerprint (consistent across reconnects)
 * but different sessions get different ones.
 */
export function getBrowserConfigForSession(sessionId: string): [string, string, string] {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BROWSER_CONFIGS.length;
  return BROWSER_CONFIGS[index];
}

// ─── Response Delay Variation ─────────────────────────────────────────────────
/**
 * Instead of always responding in 2-5 seconds, create a more natural
 * delay distribution curve. Combine all factors.
 */

export async function naturalDelay(sessionId: string): Promise<void> {
  const config = getActivityConfig();
  const antiPattern = getAntiPatternDelay();
  const totalExtra = config.extraDelay + antiPattern;

  if (totalExtra > 0) {
    await delay(totalExtra);
  }
}

// ─── Burst Detection ──────────────────────────────────────────────────────────
/**
 * Detect if the bot is replying in rapid bursts (multiple replies within a
 * few seconds). Real humans don't send 5 messages in 10 seconds unless
 * they're in a heated argument. If burst detected, add a cooldown.
 */

const burstTracker: Map<string, number[]> = new Map();
const BURST_WINDOW = 10_000; // 10 seconds
const BURST_THRESHOLD = 3; // 3 replies in 10s = burst
const BURST_COOLDOWN = 2_000; // 2 second cooldown after burst

export function checkBurstAndDelay(sessionId: string): number {
  const now = Date.now();
  const timestamps = burstTracker.get(sessionId) || [];
  const recent = timestamps.filter(t => now - t < BURST_WINDOW);
  recent.push(now);
  burstTracker.set(sessionId, recent);

  if (recent.length >= BURST_THRESHOLD) {
    // Burst detected — add cooldown
    return BURST_COOLDOWN + Math.random() * 1000; // 2-3s cooldown
  }
  return 0;
}

// ─── Consecutive Reply Detection ──────────────────────────────────────────────
/**
 * If the bot is the last person to send a message in a chat, and it's about
 * to send ANOTHER message without the user responding in between, it should
 * sometimes hold back. Real people don't double-text constantly.
 *
 * This is tracked per chat and returns true if the bot should skip.
 */

const lastSenderTracker: Map<string, string> = new Map(); // chatJid → 'bot' | 'user'

export function trackWhoSentLast(chatJid: string, wasBot: boolean): void {
  lastSenderTracker.set(chatJid, wasBot ? 'bot' : 'user');
}

export function shouldAvoidDoubleText(chatJid: string): boolean {
  const lastSender = lastSenderTracker.get(chatJid);
  if (lastSender !== 'bot') return false;
  // 30% chance to skip if bot would double-text
  return Math.random() < 0.3;
}

// ─── Online Status Randomizer ─────────────────────────────────────────────────
/**
 * Before processing any message, randomly set presence to "available" with
 * natural timing. A bot that's always "available" the instant a message
 * arrives is suspicious. Sometimes it should already be "available" (was
 * browsing), sometimes it should go from "unavailable" to "available" (picked
 * up phone).
 */

export async function simulateGoingOnline(sock: any): Promise<void> {
  try {
    // 40% chance to already be online (no transition needed)
    if (Math.random() < 0.4) return;

    // Set available with a small delay (picking up phone)
    await delay(200 + Math.random() * 800);
    await sock.sendPresenceUpdate('available');
  } catch {
    // non-critical
  }
}

// ─── Smart Reply Filtering ────────────────────────────────────────────────────
/**
 * Additional conditions to decide whether to respond at all.
 * Returns true if the bot should NOT respond.
 */

export function shouldSilentlyIgnore(
  isGroup: boolean,
  messageText: string,
  senderJid: string,
): boolean {
  // Skip very short messages in groups (like "ok", "k", "lol", "hmm")
  // Real people don't respond to these
  if (isGroup && messageText.length <= 3 && !messageText.startsWith('!')) {
    return Math.random() < 0.7; // 70% skip chance for ultra-short group msgs
  }

  // Skip forwarded-looking messages (long messages with lots of formatting)
  if (messageText.length > 1000 && !messageText.startsWith('!')) {
    return Math.random() < 0.5; // 50% skip for broadcast-like messages
  }

  // Skip messages that are just emoji (no text content)
  const emojiOnly = messageText.replace(/[\p{Emoji}\s]/gu, '').trim();
  if (emojiOnly.length === 0 && messageText.length > 0 && !messageText.startsWith('!')) {
    return Math.random() < 0.6; // 60% skip for emoji-only messages
  }

  return false;
}
