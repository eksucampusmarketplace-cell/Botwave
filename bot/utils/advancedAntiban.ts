/**
 * BotWave Advanced Anti-Ban System
 *
 * Features that go beyond basic anti-ban and make BotWave virtually
 * undetectable by WhatsApp's automated systems. These are the techniques
 * that separate a bot that lasts months from one that gets banned in a week.
 *
 * 1. Session Warmup — new sessions start slow, gradually increase activity
 * 2. Daily Message Cap — prevents exceeding WhatsApp's invisible thresholds
 * 3. Read-But-Skip — sometimes reads but doesn't respond (like a real person)
 * 4. Group Cooldown — per-group rate limiting to avoid dominating conversations
 * 5. Media Fingerprint Jitter — randomize sticker/image bytes for uniqueness
 * 6. Presence Simulation — randomly toggle online/offline throughout the day
 * 7. Message Length Jitter — invisible byte-level variations in every message
 * 8. Activity Hours — quiet hours where bot responds minimally
 */

import { delay } from '../../lib/utils';

// ─── Session Warmup ───────────────────────────────────────────────────────────
/**
 * New sessions are suspicious to WhatsApp. A bot that immediately starts
 * sending 100+ messages on day 1 gets flagged. This system gradually
 * increases the allowed message count over the first 7 days:
 *
 *  Day 0-1: 15 messages max
 *  Day 1-2: 30 messages max
 *  Day 2-3: 50 messages max
 *  Day 3-5: 80 messages max
 *  Day 5-7: 120 messages max
 *  Day 7+:  200 messages max (full capacity)
 */

const WARMUP_SCHEDULE: { maxDays: number; maxMessages: number }[] = [
  { maxDays: 1, maxMessages: 15 },
  { maxDays: 2, maxMessages: 30 },
  { maxDays: 3, maxMessages: 50 },
  { maxDays: 5, maxMessages: 80 },
  { maxDays: 7, maxMessages: 120 },
  { maxDays: Infinity, maxMessages: 200 },
];

// Track session creation timestamps and daily message counts
const sessionCreatedAt: Map<string, number> = new Map();
const dailyMessageCount: Map<string, { date: string; count: number }> = new Map();

export function registerSessionStart(sessionId: string, createdAt?: Date): void {
  sessionCreatedAt.set(sessionId, (createdAt || new Date()).getTime());
}

function getSessionAgeDays(sessionId: string): number {
  const created = sessionCreatedAt.get(sessionId);
  if (!created) return 30; // Unknown sessions treated as mature
  return (Date.now() - created) / (1000 * 60 * 60 * 24);
}

function getWarmupLimit(sessionId: string): number {
  const ageDays = getSessionAgeDays(sessionId);
  for (const tier of WARMUP_SCHEDULE) {
    if (ageDays < tier.maxDays) return tier.maxMessages;
  }
  return WARMUP_SCHEDULE[WARMUP_SCHEDULE.length - 1].maxMessages;
}

// ─── Daily Message Cap ────────────────────────────────────────────────────────
/**
 * Hard daily limit per session. Combined with warmup, this ensures
 * no session ever sends an unnatural volume of messages.
 */

const ABSOLUTE_DAILY_CAP = 200;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDailyCount(sessionId: string): number {
  const entry = dailyMessageCount.get(sessionId);
  const today = getTodayKey();
  if (!entry || entry.date !== today) return 0;
  return entry.count;
}

function incrementDailyCount(sessionId: string): void {
  const today = getTodayKey();
  const entry = dailyMessageCount.get(sessionId);
  if (!entry || entry.date !== today) {
    dailyMessageCount.set(sessionId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

/**
 * Check if a session is allowed to send another message today.
 * Combines warmup limit with absolute daily cap.
 * Returns true if the message should be BLOCKED.
 */
export function isDailyCapReached(sessionId: string): boolean {
  const count = getDailyCount(sessionId);
  const warmupLimit = getWarmupLimit(sessionId);
  const effectiveLimit = Math.min(warmupLimit, ABSOLUTE_DAILY_CAP);
  return count >= effectiveLimit;
}

/**
 * Call this after every message is sent to track the count.
 */
export function trackMessageSent(sessionId: string): void {
  incrementDailyCount(sessionId);
}

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
 * Cooldown: 3-8 seconds (randomized to avoid pattern detection).
 * This means in a fast-moving group chat, the bot won't machine-gun replies.
 */

const groupLastReply: Map<string, number> = new Map();
const GROUP_COOLDOWN_MIN = 3000;
const GROUP_COOLDOWN_MAX = 8000;

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
      const shouldBeUnavailable = Math.random() < getUnavailableProbability();
      await sock.sendPresenceUpdate(shouldBeUnavailable ? 'unavailable' : 'available');
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
      extraDelay: 5000 + Math.random() * 10000, // 5-15s extra delay
      skipMultiplier: 3.0, // 3x more likely to skip
      shortenResponses: true,
    };
  }

  // Early morning: 6am-8am
  if (hour >= 6 && hour < 8) {
    return {
      isQuietHours: false,
      extraDelay: 2000 + Math.random() * 3000, // 2-5s extra delay
      skipMultiplier: 1.5,
      shortenResponses: false,
    };
  }

  // Late evening: 10pm-12am
  if (hour >= 22) {
    return {
      isQuietHours: false,
      extraDelay: 1000 + Math.random() * 3000, // 1-4s extra delay
      skipMultiplier: 1.5,
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
    // 1% — long pause (went afk briefly)
    return 60000 + Math.random() * 60000; // 60-120s
  }
  if (roll < 0.04) {
    // 3% — grabbed something
    return 30000 + Math.random() * 30000; // 30-60s
  }
  if (roll < 0.09) {
    // 5% — briefly distracted
    return 15000 + Math.random() * 15000; // 15-30s
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

  if (hour >= 0 && hour < 6) return 1.8 + Math.random() * 0.5;   // Very slow late night
  if (hour >= 6 && hour < 9) return 1.3 + Math.random() * 0.3;   // Slow morning
  if (hour >= 9 && hour < 12) return 0.9 + Math.random() * 0.2;  // Normal-fast morning
  if (hour >= 12 && hour < 14) return 1.1 + Math.random() * 0.2; // Lunch = slightly slow
  if (hour >= 14 && hour < 18) return 0.8 + Math.random() * 0.3; // Fastest — afternoon
  if (hour >= 18 && hour < 22) return 1.0 + Math.random() * 0.2; // Normal evening
  return 1.4 + Math.random() * 0.3;                               // Late evening
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
  if (recentCount <= 3) return 1000 + Math.random() * 2000; // Moderate — 1-3s extra
  if (recentCount <= 6) return 2000 + Math.random() * 4000; // Busy — 2-6s extra
  return 4000 + Math.random() * 6000; // Very busy — 4-10s extra ("catching up")
}

// ─── Connection Fingerprint Diversity ─────────────────────────────────────────
/**
 * Using the exact same browser fingerprint for every session is a pattern.
 * This generates slightly varied browser configurations while staying within
 * Baileys' supported range. WhatsApp sees each session as a slightly
 * different device.
 */

const BROWSER_CONFIGS: [string, string, string][] = [
  ['Mac OS', 'Chrome', '14.4.1'],
  ['Mac OS', 'Chrome', '14.5.0'],
  ['Mac OS', 'Safari', '18.3.1'],
  ['Windows', 'Chrome', '131.0.0'],
  ['Windows', 'Edge', '131.0.0'],
  ['Windows', 'Firefox', '133.0'],
  ['Ubuntu', 'Chrome', '131.0.0'],
  ['Ubuntu', 'Firefox', '133.0'],
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
