/**
 * Deep humanization layer for Telegram userbot.
 * Simulates human behavior patterns to avoid detection and bans.
 *
 * Key strategies:
 * - Random delays between actions (typing, reading, responding)
 * - Natural typing simulation with variable speed
 * - Read receipt delays (don't mark as read instantly)
 * - Online/offline presence cycling
 * - Rate limiting per action type
 * - Gradual group joining
 * - Jitter on all timings
 */

const actionTimestamps: Map<string, number[]> = new Map();

// Per-action rate limits (max actions per window)
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  message_send: { max: 20, windowMs: 60_000 },
  message_edit: { max: 10, windowMs: 60_000 },
  message_delete: { max: 15, windowMs: 60_000 },
  group_join: { max: 3, windowMs: 300_000 },
  group_action: { max: 10, windowMs: 60_000 },
  ban_action: { max: 5, windowMs: 60_000 },
  api_call: { max: 30, windowMs: 60_000 },
  inline_query: { max: 5, windowMs: 60_000 },
  forward: { max: 10, windowMs: 60_000 },
};

function jitter(baseMs: number, variance = 0.3): number {
  const min = baseMs * (1 - variance);
  const max = baseMs * (1 + variance);
  return Math.floor(min + Math.random() * (max - min));
}

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, Math.round(num * stdDev + mean));
}

export function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise(resolve => setTimeout(resolve, Math.floor(delay)));
}

export function typingDelay(textLength: number): Promise<void> {
  // Average human typing speed: 40-60 WPM = ~200-300ms per character
  // We simulate faster (80-150ms) since userbot users expect some speed
  const msPerChar = gaussianRandom(100, 30);
  const baseDelay = Math.min(textLength * msPerChar, 8000);
  const withJitter = jitter(Math.max(baseDelay, 500), 0.2);
  return new Promise(resolve => setTimeout(resolve, withJitter));
}

export function readDelay(): Promise<void> {
  // Humans don't read messages instantly - 0.5-3s delay
  return humanDelay(500, 3000);
}

export function responseDelay(): Promise<void> {
  // Think time before responding: 1-5s
  return humanDelay(1000, 5000);
}

export function shortPause(): Promise<void> {
  return humanDelay(200, 800);
}

export function mediumPause(): Promise<void> {
  return humanDelay(800, 2500);
}

export function longPause(): Promise<void> {
  return humanDelay(2000, 6000);
}

/**
 * Check if an action is rate-limited. Returns true if allowed, false if blocked.
 */
export function checkRateLimit(action: string): boolean {
  const limit = RATE_LIMITS[action];
  if (!limit) return true;

  const now = Date.now();
  const timestamps = actionTimestamps.get(action) || [];

  // Remove timestamps outside the window
  const recent = timestamps.filter(t => now - t < limit.windowMs);
  actionTimestamps.set(action, recent);

  if (recent.length >= limit.max) {
    console.log(`[HUMANIZER] Rate limited: ${action} (${recent.length}/${limit.max} in ${limit.windowMs}ms)`);
    return false;
  }

  recent.push(now);
  return true;
}

/**
 * Wait until rate limit allows the action, with exponential backoff.
 */
export async function waitForRateLimit(action: string): Promise<void> {
  let attempt = 0;
  while (!checkRateLimit(action)) {
    attempt++;
    const backoff = Math.min(1000 * Math.pow(1.5, attempt), 30_000);
    await humanDelay(backoff * 0.8, backoff * 1.2);
  }
}

/**
 * Simulate natural online/offline presence patterns.
 * Returns intervals (in ms) for online and offline periods.
 */
export function getPresenceCycle(): { onlineMs: number; offlineMs: number } {
  // Humans are online for 2-15 minutes, then offline for 1-10 minutes
  return {
    onlineMs: gaussianRandom(5 * 60_000, 3 * 60_000),
    offlineMs: gaussianRandom(3 * 60_000, 2 * 60_000),
  };
}

/**
 * Calculate delay for joining groups sequentially (anti-ban).
 * Telegram flags accounts that join many groups quickly.
 */
export function groupJoinDelay(index: number): number {
  // First group: 5-10s, then increasing delays
  const base = 5000 + index * 3000;
  return jitter(Math.min(base, 60_000), 0.3);
}

/**
 * Generate a human-like flood wait handler.
 * When Telegram sends FLOOD_WAIT, we wait the required time + random buffer.
 */
export function floodWaitDelay(seconds: number): Promise<void> {
  const bufferMs = jitter(5000, 0.5);
  const totalMs = seconds * 1000 + bufferMs;
  console.log(`[HUMANIZER] Flood wait: ${seconds}s + ${Math.round(bufferMs / 1000)}s buffer = ${Math.round(totalMs / 1000)}s total`);
  return new Promise(resolve => setTimeout(resolve, totalMs));
}

/**
 * Determine if we should simulate "typing" before sending a message.
 * Real humans don't always show typing indicator.
 */
export function shouldShowTyping(): boolean {
  return Math.random() < 0.7; // 70% of the time
}

/**
 * Determine if we should mark a message as read.
 * Humans sometimes don't read all messages.
 */
export function shouldMarkRead(): boolean {
  return Math.random() < 0.85; // 85% of the time
}

/**
 * Get a random device model string for session diversity.
 */
export function getRandomDeviceModel(): string {
  const devices = [
    'Samsung Galaxy S24 Ultra',
    'Samsung Galaxy S23',
    'iPhone 15 Pro Max',
    'iPhone 14 Pro',
    'Google Pixel 8 Pro',
    'OnePlus 12',
    'Xiaomi 14 Pro',
    'Samsung Galaxy A54',
    'iPhone 13',
    'Google Pixel 7a',
    'Samsung Galaxy S22',
    'OnePlus 11',
    'Xiaomi 13',
    'iPhone 15',
    'Samsung Galaxy Z Fold 5',
  ];
  return devices[Math.floor(Math.random() * devices.length)];
}

/**
 * Get a random system version string.
 */
export function getRandomSystemVersion(): string {
  const versions = [
    'Android 14',
    'Android 13',
    'Android 12',
    'iOS 17.4',
    'iOS 17.3',
    'iOS 16.7',
    'Android 14 (SDK 34)',
    'iOS 17.5',
  ];
  return versions[Math.floor(Math.random() * versions.length)];
}

/**
 * Get a random app version string.
 */
export function getRandomAppVersion(): string {
  const major = 10 + Math.floor(Math.random() * 3);
  const minor = Math.floor(Math.random() * 10);
  const patch = Math.floor(Math.random() * 5);
  return `${major}.${minor}.${patch}`;
}

/**
 * Anti-pattern detection: vary message sending patterns.
 * Bots tend to respond at exact intervals. Humans are chaotic.
 */
let lastMessageTime = 0;

export function getMessageSendDelay(): number {
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;
  lastMessageTime = now;

  // If sending messages rapidly, add increasing delays
  if (timeSinceLastMessage < 2000) {
    return jitter(3000, 0.4);
  } else if (timeSinceLastMessage < 5000) {
    return jitter(1500, 0.3);
  }
  return jitter(500, 0.4);
}

/**
 * Session activity hours - reduce activity during sleep hours.
 * Returns a multiplier (0.1 = very slow, 1.0 = normal speed).
 */
export function getActivityMultiplier(timezoneOffset = 0): number {
  const hour = (new Date().getUTCHours() + timezoneOffset + 24) % 24;

  // Late night (1-6 AM): very low activity
  if (hour >= 1 && hour < 6) return 0.1;
  // Early morning (6-8 AM): waking up
  if (hour >= 6 && hour < 8) return 0.4;
  // Morning (8-12 PM): active
  if (hour >= 8 && hour < 12) return 0.9;
  // Afternoon (12-6 PM): peak
  if (hour >= 12 && hour < 18) return 1.0;
  // Evening (6-10 PM): active
  if (hour >= 18 && hour < 22) return 0.8;
  // Late evening (10 PM - 1 AM): winding down
  return 0.5;
}
