/**
 * Two-level feature toggle system for BotWave.
 *
 * Level 1 - Bot Owner: Controls which features the bot has at all.
 *   Stored in `telegram_bot_configs.owner_features` (JSONB).
 *   If the owner disables a feature, no group can use it.
 *
 * Level 2 - Group Admin: Controls which features are active in their group.
 *   Stored in `telegram_bot_configs.group_features_{chatId}` or a separate table.
 *   Group admins can only enable features the bot owner has enabled.
 *
 * All lookups are in-memory via Maps for maximum speed.
 */

export type FeatureId =
  | 'antiflood'
  | 'antiraid'
  | 'antispam'
  | 'captcha'
  | 'welcome'
  | 'goodbye'
  | 'rules'
  | 'notes'
  | 'filters'
  | 'warns'
  | 'locks'
  | 'blocklist'
  | 'pins'
  | 'purge'
  | 'modlog'
  | 'xp'
  | 'federation'
  | 'language'
  | 'connections'
  | 'topics'
  | 'approval'
  | 'cleancommand'
  | 'cleanservice'
  | 'disabling'
  | 'scheduled'
  | 'silenttime'
  | 'mandatory_membership'
  | 'forced_add'
  | 'prohibitions'
  | 'stats'
  | 'custom_commands'
  | 'ecommerce'
  | 'chatbot_flows'
  | 'channel_management'
  | 'bot_to_bot'
  | 'bot_creation';

export const ALL_FEATURES: { id: FeatureId; label: string; description: string }[] = [
  { id: 'antiflood', label: 'Antiflood', description: 'Limit message flooding' },
  { id: 'antiraid', label: 'Anti-Raid', description: 'Protect against mass joins' },
  { id: 'antispam', label: 'Anti-Spam', description: 'Filter spam messages' },
  { id: 'captcha', label: 'CAPTCHA', description: 'Verify new members' },
  { id: 'welcome', label: 'Welcome Messages', description: 'Greet new members' },
  { id: 'goodbye', label: 'Goodbye Messages', description: 'Farewell leaving members' },
  { id: 'rules', label: 'Rules', description: 'Group rules management' },
  { id: 'notes', label: 'Notes', description: 'Saved notes / FAQs' },
  { id: 'filters', label: 'Filters', description: 'Auto-reply keyword filters' },
  { id: 'warns', label: 'Warnings', description: 'Warning system for violations' },
  { id: 'locks', label: 'Locks', description: 'Lock message types' },
  { id: 'blocklist', label: 'Blocklist', description: 'Blocked words / phrases' },
  { id: 'pins', label: 'Pins', description: 'Pin management' },
  { id: 'purge', label: 'Purge', description: 'Bulk message deletion' },
  { id: 'modlog', label: 'Mod Log', description: 'Log moderation actions' },
  { id: 'xp', label: 'XP / Leveling', description: 'Experience points system' },
  { id: 'federation', label: 'Federation', description: 'Cross-group banlists' },
  { id: 'language', label: 'Language', description: 'Multi-language support' },
  { id: 'connections', label: 'Connections', description: 'Connect groups for remote management' },
  { id: 'topics', label: 'Topics', description: 'Forum topic management' },
  { id: 'approval', label: 'Approval', description: 'Approve users to bypass restrictions' },
  { id: 'cleancommand', label: 'Clean Commands', description: 'Auto-delete command messages' },
  { id: 'cleanservice', label: 'Clean Service', description: 'Auto-delete service messages' },
  { id: 'disabling', label: 'Disable Commands', description: 'Disable specific commands per group' },
  { id: 'scheduled', label: 'Scheduled Messages', description: 'Schedule messages' },
  { id: 'silenttime', label: 'Silent Times', description: 'Scheduled quiet hours' },
  { id: 'mandatory_membership', label: 'Mandatory Membership', description: 'Require channel membership' },
  { id: 'forced_add', label: 'Forced Add', description: 'Require members to invite others' },
  { id: 'prohibitions', label: 'Prohibitions', description: 'Content type restrictions' },
  { id: 'stats', label: 'Statistics', description: 'Group activity stats' },
  { id: 'custom_commands', label: 'Custom Commands', description: 'User-defined bot commands (WhatsApp)' },
  { id: 'ecommerce', label: 'E-Commerce', description: 'Shop and sell products via WhatsApp' },
  { id: 'chatbot_flows', label: 'Chatbot Flows', description: 'Multi-step conversational flows (WhatsApp)' },
  { id: 'channel_management', label: 'Channel Management', description: 'Manage Telegram channels' },
  { id: 'bot_to_bot', label: 'Bot-to-Bot', description: 'Cross-bot communication' },
  { id: 'bot_creation', label: 'Bot Creation', description: 'Create new bots via dashboard' },
];

/** In-memory: bot-owner level toggles. sessionId -> Set<FeatureId> of ENABLED features */
const ownerFeatures = new Map<string, Set<FeatureId>>();

/** In-memory: group-admin level toggles. `${sessionId}:${chatId}` -> Set<FeatureId> */
const groupFeatures = new Map<string, Set<FeatureId>>();

// ── Owner-Level (Bot Owner) ──────────────────────────────────────────

/**
 * Initialize owner features - all enabled by default.
 */
export function initOwnerFeatures(sessionId: string, enabled?: FeatureId[]): void {
  if (enabled) {
    ownerFeatures.set(sessionId, new Set(enabled));
  } else {
    ownerFeatures.set(sessionId, new Set(ALL_FEATURES.map(f => f.id)));
  }
}

export function setOwnerFeature(sessionId: string, feature: FeatureId, enabled: boolean): void {
  let set = ownerFeatures.get(sessionId);
  if (!set) {
    set = new Set(ALL_FEATURES.map(f => f.id));
    ownerFeatures.set(sessionId, set);
  }
  if (enabled) {
    set.add(feature);
  } else {
    set.delete(feature);
    // Also disable in all groups when owner disables
    for (const [key, gSet] of groupFeatures) {
      if (key.startsWith(`${sessionId}:`)) {
        gSet.delete(feature);
      }
    }
  }
}

export function isOwnerFeatureEnabled(sessionId: string, feature: FeatureId): boolean {
  const set = ownerFeatures.get(sessionId);
  if (!set) return true; // Default: all enabled
  return set.has(feature);
}

export function getOwnerFeatures(sessionId: string): FeatureId[] {
  const set = ownerFeatures.get(sessionId);
  if (!set) return ALL_FEATURES.map(f => f.id);
  return Array.from(set);
}

// ── Group-Level (Group Admin) ────────────────────────────────────────

function groupKey(sessionId: string, chatId: string): string {
  return `${sessionId}:${chatId}`;
}

/**
 * Initialize group features - inherits all owner-enabled features by default.
 */
export function initGroupFeatures(sessionId: string, chatId: string, enabled?: FeatureId[]): void {
  const key = groupKey(sessionId, chatId);
  if (enabled) {
    const ownerSet = ownerFeatures.get(sessionId);
    const filtered = enabled.filter(f => !ownerSet || ownerSet.has(f));
    groupFeatures.set(key, new Set(filtered));
  } else {
    groupFeatures.set(key, new Set(getOwnerFeatures(sessionId)));
  }
}

export function setGroupFeature(
  sessionId: string,
  chatId: string,
  feature: FeatureId,
  enabled: boolean,
): { success: boolean; reason?: string } {
  // Check owner level first
  if (enabled && !isOwnerFeatureEnabled(sessionId, feature)) {
    return { success: false, reason: 'owner_disabled' };
  }

  const key = groupKey(sessionId, chatId);
  let set = groupFeatures.get(key);
  if (!set) {
    set = new Set(getOwnerFeatures(sessionId));
    groupFeatures.set(key, set);
  }

  if (enabled) {
    set.add(feature);
  } else {
    set.delete(feature);
  }
  return { success: true };
}

/**
 * Check if a feature is active for a specific group.
 * Must be enabled at BOTH owner and group level.
 */
export function isFeatureEnabled(sessionId: string, chatId: string, feature: FeatureId): boolean {
  // Owner must have it enabled
  if (!isOwnerFeatureEnabled(sessionId, feature)) return false;

  // Group level check
  const key = groupKey(sessionId, chatId);
  const set = groupFeatures.get(key);
  if (!set) return true; // Default: all owner-enabled features are active
  return set.has(feature);
}

export function getGroupFeatures(sessionId: string, chatId: string): FeatureId[] {
  const key = groupKey(sessionId, chatId);
  const set = groupFeatures.get(key);
  if (!set) return getOwnerFeatures(sessionId);
  return Array.from(set);
}

/**
 * Get all features with their status for a group (for dashboard display).
 */
export function getFeatureStatusForGroup(
  sessionId: string,
  chatId: string,
): { id: FeatureId; label: string; description: string; ownerEnabled: boolean; groupEnabled: boolean }[] {
  return ALL_FEATURES.map(f => ({
    ...f,
    ownerEnabled: isOwnerFeatureEnabled(sessionId, f.id),
    groupEnabled: isFeatureEnabled(sessionId, chatId, f.id),
  }));
}

export function isValidFeature(id: string): id is FeatureId {
  return ALL_FEATURES.some(f => f.id === id);
}
