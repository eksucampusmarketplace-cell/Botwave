/**
 * In-memory email sender rotation pool.
 *
 * Provides 21 sender identities (6 existing channels + 15 new) that rotate
 * round-robin so no single address is over-used, improving deliverability.
 *
 * All addresses share the same verified Postal domain and SMTP credential.
 * The rotation is entirely in-memory for maximum speed (no DB / Redis hit).
 */

export interface SenderIdentity {
  address: string;
  name: string;
  channel: string;
}

const DOMAIN = 'mail.botwave.online';

/** Pool of 21 sender identities with round-robin rotation */
const SENDER_POOL: SenderIdentity[] = [
  // --- Original 6 ---
  { address: `noreply@${DOMAIN}`, name: 'BotWave Security', channel: 'auth' },
  { address: `alerts@${DOMAIN}`, name: 'BotWave Alerts', channel: 'notify' },
  { address: `billing@${DOMAIN}`, name: 'BotWave Billing', channel: 'billing' },
  { address: `hello@${DOMAIN}`, name: 'BotWave', channel: 'welcome' },
  { address: `alerts@${DOMAIN}`, name: 'BotWave Alerts', channel: 'alerts' },
  { address: `noreply@${DOMAIN}`, name: 'BotWave Mail', channel: 'usermail' },
  // --- 15 new senders ---
  { address: `support@${DOMAIN}`, name: 'BotWave Support', channel: 'support' },
  { address: `team@${DOMAIN}`, name: 'BotWave Team', channel: 'team' },
  { address: `updates@${DOMAIN}`, name: 'BotWave Updates', channel: 'updates' },
  { address: `news@${DOMAIN}`, name: 'BotWave News', channel: 'news' },
  { address: `info@${DOMAIN}`, name: 'BotWave Info', channel: 'info' },
  { address: `system@${DOMAIN}`, name: 'BotWave System', channel: 'system' },
  { address: `bot@${DOMAIN}`, name: 'BotWave Bot', channel: 'bot' },
  { address: `service@${DOMAIN}`, name: 'BotWave Service', channel: 'service' },
  { address: `notify@${DOMAIN}`, name: 'BotWave Notify', channel: 'notify2' },
  { address: `account@${DOMAIN}`, name: 'BotWave Account', channel: 'account' },
  { address: `admin@${DOMAIN}`, name: 'BotWave Admin', channel: 'admin' },
  { address: `delivery@${DOMAIN}`, name: 'BotWave Delivery', channel: 'delivery' },
  { address: `platform@${DOMAIN}`, name: 'BotWave Platform', channel: 'platform' },
  { address: `mailer@${DOMAIN}`, name: 'BotWave Mailer', channel: 'mailer' },
  { address: `outreach@${DOMAIN}`, name: 'BotWave Outreach', channel: 'outreach' },
];

/** In-memory round-robin index - no persistence needed */
let rotationIndex = 0;

/**
 * Get next sender from the pool using round-robin rotation.
 * O(1), zero allocations, fully in-memory.
 */
export function getNextSender(): SenderIdentity {
  const sender = SENDER_POOL[rotationIndex % SENDER_POOL.length];
  rotationIndex = (rotationIndex + 1) % SENDER_POOL.length;
  return sender;
}

/**
 * Get a sender identity for a specific channel (falls back to rotation if not found).
 */
export function getSenderForChannel(channel: string): SenderIdentity {
  const match = SENDER_POOL.find((s) => s.channel === channel);
  return match || getNextSender();
}

/**
 * Get all sender identities in the pool.
 */
export function getAllSenders(): readonly SenderIdentity[] {
  return SENDER_POOL;
}

/**
 * Get current pool size.
 */
export function getPoolSize(): number {
  return SENDER_POOL.length;
}

/**
 * Reset rotation index (useful for testing).
 */
export function resetRotation(): void {
  rotationIndex = 0;
}

/**
 * Get a batch of unique senders for bulk sends.
 * Returns up to `count` senders, cycling through the pool.
 */
export function getSenderBatch(count: number): SenderIdentity[] {
  const batch: SenderIdentity[] = [];
  const len = SENDER_POOL.length;
  const actual = Math.min(count, len);
  for (let i = 0; i < actual; i++) {
    batch.push(SENDER_POOL[(rotationIndex + i) % len]);
  }
  rotationIndex = (rotationIndex + actual) % len;
  return batch;
}
