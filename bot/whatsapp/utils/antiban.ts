/**
 * BotWave Anti-Ban Utilities
 *
 * Human-like response flow, response variation pools, emoji rotation,
 * message humanizer, dynamic variable injection, and time-aware tone.
 */

import { delay } from '../../../lib/utils';
import { getTypingSpeedMultiplier } from './advancedAntiban';

// ─── Emoji Pool ───────────────────────────────────────────────────────────────
const emojiPool = [
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
];

export function randomEmoji(): string {
  return emojiPool[Math.floor(Math.random() * emojiPool.length)];
}

// ─── Human-Like Send Flow ─────────────────────────────────────────────────────
/**
 * Simulates reading + typing before sending a message, exactly as described
 * in the spec:
 *  1. Mark as read (seen)
 *  2. Random seen delay 2-5s
 *  3. Start typing indicator
 *  4. Typing duration based on message length (max 6s)
 *  5. Pause typing
 *  6. Send message
 */
export async function humanSend(
  sock: any,
  jid: string,
  msgKey: any,
  content: any,
): Promise<void> {
  // Step 1 - mark as read (with small natural delay before reading)
  const preReadDelay = 200 + Math.random() * 300; // 0.2-0.5s before even "seeing" it
  await delay(preReadDelay);
  try {
    await sock.readMessages([msgKey]);
  } catch {
    // non-critical
  }

  // Step 2 - "reading" delay - simulate reading the message before responding
  const msgLength = typeof content === 'string' ? content.length : (content?.text?.length ?? 40);
  const incomingLength = 20; // rough average incoming message length
  const readTime = Math.min(500 + incomingLength * 20 + Math.random() * 1000, 2000);
  await delay(readTime);

  // Step 3 - "thinking" pause before typing (humans don't type instantly)
  const thinkTime = 200 + Math.random() * 500;
  await delay(thinkTime);

  // Step 4 - show typing or recording indicator
  const isAudio = content?.audio || content?.mimetype?.includes('audio');
  const presenceType = isAudio ? 'recording' : 'composing';
  try {
    await sock.sendPresenceUpdate(presenceType, jid);
  } catch {
    // non-critical
  }

  // Step 5 - typing duration (based on response length, varies by time of day)
  // Average human types ~40 WPM = ~200 chars/min = ~3.3 chars/sec
  // But on phone it's slower: ~25 WPM = ~125 chars/min = ~2 chars/sec
  const charsPerSecond = 4 + Math.random() * 2; // 4-6 chars/sec (faster typer)
  const baseTypingTime = Math.min((msgLength / charsPerSecond) * 1000, 4000);
  const typingTime = Math.max(400, Math.round(baseTypingTime * getTypingSpeedMultiplier()));
  await delay(typingTime);

  // Step 6 - brief pause after typing (reviewing before send)
  // 10% chance of a shorter "re-read" pause
  if (Math.random() < 0.1) {
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch { /* non-critical */ }
    await delay(300 + Math.random() * 500);
    try {
      await sock.sendPresenceUpdate(presenceType, jid);
    } catch { /* non-critical */ }
    await delay(100 + Math.random() * 200);
  }

  // Step 7 - stop typing
  try {
    await sock.sendPresenceUpdate('paused', jid);
  } catch {
    // non-critical
  }

  // Step 8 - tiny delay before send (finger moving to send button)
  await delay(100 + Math.random() * 300);

  // Step 9 - send
  const messageContent =
    typeof content === 'string' ? { text: content } : content;
  await sock.sendMessage(jid, messageContent);
}

// ─── Dynamic Variable Injection ──────────────────────────────────────────────
export function injectVars(
  template: string,
  vars: { name?: string; time?: string; date?: string; group?: string },
): string {
  let result = template;
  if (vars.name) result = result.replace(/\{name\}/g, vars.name);
  if (vars.time) result = result.replace(/\{time\}/g, vars.time);
  if (vars.date) result = result.replace(/\{date\}/g, vars.date);
  if (vars.group) result = result.replace(/\{group\}/g, vars.group);
  return result;
}

export function currentTimeStr(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function currentDateStr(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Message Humanizer ────────────────────────────────────────────────────────
/**
 * Occasionally adds realistic typos with corrections, skips capitals randomly,
 * and adds casual phrases.
 */
const casualPhrases = [
  'haha ',
  'lol ',
  'btw ',
  'oh ',
  'hmm ',
  'well ',
  'soo ',
  'yea ',
  'ngl ',
  'tbh ',
];

export function humanize(text: string): string {
  let result = text;

  // ~15% chance to skip first-letter capitalisation
  if (Math.random() < 0.15 && result.length > 0) {
    result = result[0].toLowerCase() + result.slice(1);
  }

  // ~10% chance to add a casual phrase at the start
  if (Math.random() < 0.1) {
    const phrase = casualPhrases[Math.floor(Math.random() * casualPhrases.length)];
    result = phrase + result;
  }

  // ~8% chance to introduce a realistic typo + correction
  if (Math.random() < 0.08 && result.length > 10) {
    const wordBoundaries: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (result[i] === ' ') wordBoundaries.push(i);
    }
    if (wordBoundaries.length > 2) {
      const splitAt =
        wordBoundaries[Math.floor(Math.random() * wordBoundaries.length)];
      const before = result.slice(0, splitAt);
      const after = result.slice(splitAt);
      // Swap two adjacent chars in a word
      const lastWord = before.split(' ').pop() || '';
      if (lastWord.length > 3) {
        const swapIdx = Math.floor(Math.random() * (lastWord.length - 2)) + 1;
        const typo =
          lastWord.slice(0, swapIdx) +
          lastWord[swapIdx + 1] +
          lastWord[swapIdx] +
          lastWord.slice(swapIdx + 2);
        result = before.replace(new RegExp(escapeRegex(lastWord) + '$'), typo) + '*' + after;
      }
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Never-Send-Same-Message-Twice Dedup ──────────────────────────────────────
/**
 * Tracks the last N messages sent per pool key so the same response is never
 * sent consecutively. Uses an LRU-style circular buffer per pool.
 */
const recentResponses = new Map<string, string[]>();
const DEDUP_HISTORY = 10;

function getPoolKey(pool: string[]): string {
  // Use the first element as a stable key for the pool
  return pool.length > 0 ? pool[0].slice(0, 30) : 'unknown';
}

function recordResponse(poolKey: string, response: string): void {
  const history = recentResponses.get(poolKey) || [];
  history.push(response);
  if (history.length > DEDUP_HISTORY) {
    history.shift();
  }
  recentResponses.set(poolKey, history);
}

function wasRecentlySent(poolKey: string, response: string): boolean {
  const history = recentResponses.get(poolKey);
  if (!history) return false;
  return history.includes(response);
}

// ─── Response Variation Pools ─────────────────────────────────────────────────
/**
 * Pick a random entry from a pool and inject dynamic variables + emoji rotation.
 * Never sends the same message twice in a row (tracks last 10 per pool).
 */
export function pickResponse(
  pool: string[],
  vars?: { name?: string; time?: string; date?: string; group?: string },
  addEmoji = true,
): string {
  const poolKey = getPoolKey(pool);

  // Pick a response that hasn't been recently sent
  let response: string;
  let attempts = 0;
  do {
    response = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while (wasRecentlySent(poolKey, response) && attempts < pool.length);

  // Record before variable injection (dedup on template)
  recordResponse(poolKey, response);

  if (vars) {
    response = injectVars(response, vars);
  }

  if (addEmoji && Math.random() < 0.7) {
    const emoji = randomEmoji();
    response = Math.random() < 0.5 ? `${emoji} ${response}` : `${response} ${emoji}`;
  }

  // ~20% chance to humanize
  if (Math.random() < 0.2) {
    response = humanize(response);
  }

  return response;
}

// ─── Time-Based Response Tone ─────────────────────────────────────────────────
export type TimeTone = 'late_night' | 'morning' | 'normal';

export function getTimeTone(): TimeTone {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 'late_night';
  if (hour >= 6 && hour < 12) return 'morning';
  return 'normal';
}

/**
 * Returns a short time-appropriate greeting or wrapper.
 */
export function timeGreeting(): string {
  const tone = getTimeTone();
  switch (tone) {
    case 'late_night':
      return pickResponse(
        ['done', 'here you go', 'got it', 'sent'],
        undefined,
        false,
      );
    case 'morning':
      return pickResponse(
        [
          'Good morning! Here you go',
          'Rise and shine! Done',
          'Morning! Got it',
          'Hey early bird! Here',
        ],
        undefined,
        true,
      );
    default:
      return '';
  }
}
