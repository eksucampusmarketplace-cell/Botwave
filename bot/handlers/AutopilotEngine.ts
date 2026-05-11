// ─── Autopilot Engine — Deep AI Persona Clone ─────────────────────────────────
//
// Learns the owner's messaging DNA and generates replies that sound exactly
// like them.  Every layer is AI-powered (Groq → Gemini fallback).
//
// Core subsystems:
//   1. **Message Collector** — silently records every outgoing owner message
//   2. **Persona Analyzer** — AI builds a multi-dimensional style profile
//   3. **Conversation Memory** — per-contact context window
//   4. **Reply Generator** — AI responds AS the owner using full persona
//   5. **Daily Sync** — periodic deep re-analysis of new messages
//
// Premium only. Gated in the command layer.

import { callAI } from '../../lib/ai-provider';
import { createClient } from '@supabase/supabase-js';
import { isRedisAvailable } from '../redis';
import Redis from 'ioredis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonaProfile {
  // ── Writing Style ─────────────────────────────────────────────
  formality: 'very_casual' | 'casual' | 'neutral' | 'formal' | 'very_formal';
  avgMessageLength: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
  emojiFrequency: 'never' | 'rare' | 'moderate' | 'heavy' | 'extreme';
  favoriteEmojis: string[];
  punctuationStyle: 'none' | 'minimal' | 'standard' | 'expressive';
  capitalization: 'none' | 'lowercase' | 'normal' | 'allcaps_sometimes';
  stickerGifUsage: 'never' | 'rare' | 'moderate' | 'heavy';
  // ── Language Patterns ─────────────────────────────────────────
  primaryLanguage: string;
  languageMixing: string[];
  commonPhrases: string[];
  slangWords: string[];
  fillerWords: string[];
  // ── Personality Core ──────────────────────────────────────────
  humorStyle: string;
  sarcasmLevel: 'never' | 'subtle' | 'moderate' | 'heavy';
  emotionalExpressiveness: 'reserved' | 'moderate' | 'very_expressive';
  trustLevel: 'guarded' | 'open' | 'oversharer';
  confidenceLevel: 'humble' | 'balanced' | 'confident' | 'cocky';
  // ── Messaging Behavior ────────────────────────────────────────
  responseSpeed: 'instant' | 'quick' | 'moderate' | 'slow' | 'very_slow';
  doubleTexting: boolean;
  voiceNotePreference: 'never' | 'sometimes' | 'prefers_voice';
  responseTimingPattern: 'instant_replier' | 'takes_time' | 'reads_then_replies_later';
  groupVsDmDifference: string;
  // ── Conversation Patterns ─────────────────────────────────────
  greetingStyle: string;
  farewellStyle: string;
  agreementPhrases: string[];
  disagreementPhrases: string[];
  excitementExpressions: string[];
  annoyanceExpressions: string[];
  // ── Social Styles ─────────────────────────────────────────────
  complimentStyle: string;
  apologyStyle: string;
  argumentStyle: 'avoids_conflict' | 'calm_logical' | 'passionate' | 'aggressive';
  adviceGivingStyle: 'direct' | 'supportive' | 'tough_love' | 'avoids_giving';
  storytellingStyle: 'brief' | 'detailed' | 'dramatic' | 'humorous';
  questionAnsweringStyle: 'direct' | 'elaborate' | 'deflective';
  gossipTendency: 'never' | 'sometimes' | 'loves_it';
  flirtingStyle: string;
  handleBeingWrong: string;
  // ── Cultural & References ─────────────────────────────────────
  culturalReferences: string[];
  musicEntertainmentRefs: string[];
  religiousSpiritualExpressions: string[];
  moneyTalkStyle: 'private' | 'open' | 'flexer' | 'avoids';
  // ── Topics & Knowledge ────────────────────────────────────────
  knownTopics: string[];
  opinions: string[];
  interests: string[];
}

export interface ContactMemory {
  contactJid: string;
  contactName: string;
  relationship: 'unknown' | 'acquaintance' | 'friend' | 'close_friend' | 'formal';
  toneWithContact: string;
  recentTopics: string[];
  lastMessages: Array<{ role: 'owner' | 'contact'; text: string; ts: number }>;
}

export type AutopilotMode = 'offline' | 'always' | 'manual';

// Per-contact override: 'on' = always autopilot this contact even if global off,
// 'off' = never autopilot this contact even if global on,
// absent = follow global setting
export type ContactOverride = 'on' | 'off';

export interface AutopilotState {
  enabled: boolean;
  mode: AutopilotMode;
  replyDelayMinutes: number;
  inactivityMinutes: number;
  maxDailyReplies: number;
  dailyRepliesUsed: number;
  selfDescription: string;
  styleProfile: PersonaProfile | null;
  sampleCount: number;
  lastSyncAt: string | null;
  contactMemories: Map<string, ContactMemory>;
  contactOverrides: Map<string, ContactOverride>;
}

// ─── In-Memory Caches ───────────────────────────────────────────────────────

const autopilotStates = new Map<string, AutopilotState>();
const pendingReplies = new Map<string, NodeJS.Timeout>();

// Track when the owner last sent a message (per session)
// Used to detect if owner is "offline" / inactive
const ownerLastActive = new Map<string, number>();
const DEFAULT_INACTIVITY_MINUTES = 5;

// Per-contact owner activity: tracks when the owner last interacted with a specific contact
// Key: `sessionId:contactJid`, Value: timestamp
// Used so autopilot only backs off for the SPECIFIC chat the owner is engaging with
const ownerActivePerContact = new Map<string, number>();
const OWNER_CONTACT_COOLDOWN_MS = 5 * 60_000; // 5 min after owner engages with a contact

const MAX_SAMPLES = 200;
const MAX_CONTACT_MESSAGES = 30;
const ANALYSIS_MIN_SAMPLES = 15;
const REDIS_AUTOPILOT_TTL = 120; // 2 min cache

// ─── Redis Cache Helpers (bot-side) ─────────────────────────────────────────

let redisRef: Redis | null = null;
function getRedis(): Redis | null {
  if (redisRef) return redisRef;
  if (!isRedisAvailable()) return null;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redisRef = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
    return redisRef;
  } catch {
    return null;
  }
}

async function redisCacheGet(key: string): Promise<Record<string, unknown> | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(`ap:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function redisCacheSet(key: string, data: unknown, ttl = REDIS_AUTOPILOT_TTL): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`ap:${key}`, JSON.stringify(data), 'EX', ttl);
  } catch {
    // non-critical
  }
}

async function redisCacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`ap:${key}`);
  } catch {
    // non-critical
  }
}

// ─── Owner Activity Tracking ────────────────────────────────────────────────

export function markOwnerActive(sessionId: string): void {
  ownerLastActive.set(sessionId, Date.now());
}

/**
 * Mark that the owner sent a message / VN / call to a specific contact.
 * Autopilot will back off for this contact for OWNER_CONTACT_COOLDOWN_MS.
 */
export function markOwnerActiveForContact(sessionId: string, chatJid: string): void {
  ownerLastActive.set(sessionId, Date.now());
  ownerActivePerContact.set(`${sessionId}:${chatJid}`, Date.now());
}

/**
 * Check if the owner recently interacted with a specific contact.
 * Returns true if owner sent a message to this contact within cooldown.
 */
export function isOwnerActiveWithContact(sessionId: string, chatJid: string): boolean {
  const lastActive = ownerActivePerContact.get(`${sessionId}:${chatJid}`);
  if (!lastActive) return false;
  return Date.now() - lastActive < OWNER_CONTACT_COOLDOWN_MS;
}

export function isOwnerInactive(sessionId: string, inactivityMinutes?: number): boolean {
  const lastActive = ownerLastActive.get(sessionId);
  if (!lastActive) return true; // Never sent a message = offline
  const threshold = (inactivityMinutes ?? DEFAULT_INACTIVITY_MINUTES) * 60_000;
  return Date.now() - lastActive > threshold;
}

export function getOwnerLastActiveMinutesAgo(sessionId: string): number | null {
  const lastActive = ownerLastActive.get(sessionId);
  if (!lastActive) return null;
  return Math.round((Date.now() - lastActive) / 60_000);
}

// ─── Database Operations ────────────────────────────────────────────────────

export async function loadAutopilotState(userId: string, sessionId: string): Promise<AutopilotState> {
  const cached = autopilotStates.get(`${userId}:${sessionId}`);
  if (cached) return cached;

  // Try Redis cache first
  const redisKey = `${userId}:${sessionId}`;
  const redisCached = await redisCacheGet(redisKey);
  let data: Record<string, unknown> | null = redisCached as Record<string, unknown> | null;

  if (!data) {
    const { data: dbData } = await supabase
      .from('autopilot_personas')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();
    data = dbData;
    if (data) {
      redisCacheSet(redisKey, data).catch(() => {});
    }
  }

  // Parse contact overrides from DB (stored as JSON object { "jid": "on"|"off" })
  const rawOverrides = (data?.contact_overrides as Record<string, string>) || {};
  const overridesMap = new Map<string, ContactOverride>();
  for (const [jid, val] of Object.entries(rawOverrides)) {
    if (val === 'on' || val === 'off') overridesMap.set(jid, val);
  }

  const state: AutopilotState = {
    enabled: (data?.enabled as boolean) ?? false,
    mode: (data?.mode as AutopilotMode) || 'offline',
    replyDelayMinutes: (data?.reply_delay_minutes as number) ?? 3,
    inactivityMinutes: (data?.inactivity_minutes as number) ?? DEFAULT_INACTIVITY_MINUTES,
    maxDailyReplies: (data?.max_daily_replies as number) ?? 30,
    dailyRepliesUsed: (data?.daily_replies_used as number) ?? 0,
    selfDescription: (data?.self_description as string) ?? '',
    styleProfile: data?.style_profile && Object.keys(data.style_profile as object).length > 0
      ? data.style_profile as PersonaProfile : null,
    sampleCount: Array.isArray(data?.sample_messages) ? (data.sample_messages as unknown[]).length : 0,
    lastSyncAt: (data?.last_sync_at as string) ?? null,
    contactMemories: new Map(),
    contactOverrides: overridesMap,
  };

  autopilotStates.set(`${userId}:${sessionId}`, state);
  return state;
}

async function saveAutopilotState(
  userId: string,
  sessionId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('autopilot_personas')
    .upsert(
      { user_id: userId, session_id: sessionId, updated_at: new Date().toISOString(), ...updates },
      { onConflict: 'user_id,session_id' },
    );
  // Invalidate Redis cache so next read picks up fresh data
  redisCacheDel(`${userId}:${sessionId}`).catch(() => {});
}

// ─── Message Collection (Silent Learning) ───────────────────────────────────

export async function collectOwnerMessage(
  userId: string,
  sessionId: string,
  text: string,
  chatJid: string,
  contactName?: string,
): Promise<void> {
  if (!text || text.startsWith('!')) return;

  try {
    const { data: existing } = await supabase
      .from('autopilot_personas')
      .select('sample_messages')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    const samples: Array<{ text: string; chatJid: string; contactName: string; ts: number }> =
      Array.isArray(existing?.sample_messages) ? existing.sample_messages : [];

    samples.push({
      text: text.substring(0, 500),
      chatJid,
      contactName: contactName || chatJid.split('@')[0],
      ts: Date.now(),
    });

    // Keep only the most recent samples
    while (samples.length > MAX_SAMPLES) samples.shift();

    await saveAutopilotState(userId, sessionId, { sample_messages: samples });

    // Update in-memory state
    const state = autopilotStates.get(`${userId}:${sessionId}`);
    if (state) state.sampleCount = samples.length;

    // Also update contact memory
    await updateContactMemory(userId, sessionId, chatJid, 'owner', text, contactName);
  } catch (err) {
    console.error('[AUTOPILOT] Error collecting message:', (err as Error).message);
  }
}

export async function collectIncomingMessage(
  userId: string,
  sessionId: string,
  text: string,
  chatJid: string,
  contactName?: string,
): Promise<void> {
  if (!text) return;
  try {
    await updateContactMemory(userId, sessionId, chatJid, 'contact', text, contactName);
  } catch (err) {
    console.error('[AUTOPILOT] Error collecting incoming:', (err as Error).message);
  }
}

async function updateContactMemory(
  userId: string,
  sessionId: string,
  chatJid: string,
  role: 'owner' | 'contact',
  text: string,
  contactName?: string,
): Promise<void> {
  const stateKey = `${userId}:${sessionId}`;
  let state = autopilotStates.get(stateKey);
  if (!state) state = await loadAutopilotState(userId, sessionId);

  let memory = state.contactMemories.get(chatJid);
  if (!memory) {
    memory = {
      contactJid: chatJid,
      contactName: contactName || chatJid.split('@')[0],
      relationship: 'unknown',
      toneWithContact: 'neutral',
      recentTopics: [],
      lastMessages: [],
    };
    state.contactMemories.set(chatJid, memory);
  }

  if (contactName) memory.contactName = contactName;
  memory.lastMessages.push({ role, text: text.substring(0, 300), ts: Date.now() });

  while (memory.lastMessages.length > MAX_CONTACT_MESSAGES) {
    memory.lastMessages.shift();
  }
}

// ─── Persona Analysis (AI-Powered) ─────────────────────────────────────────

const PERSONA_ANALYSIS_PROMPT = `You are a linguistic psychologist. Analyze these chat messages from a person and build a detailed personality/writing style profile.

Messages (most recent last):
{MESSAGES}

Self-description provided by the person:
{SELF_DESCRIPTION}

Analyze deeply across ALL dimensions and respond with ONLY valid JSON matching this exact structure:
{
  "formality": "very_casual|casual|neutral|formal|very_formal",
  "avgMessageLength": "very_short|short|medium|long|very_long",
  "emojiFrequency": "never|rare|moderate|heavy|extreme",
  "favoriteEmojis": ["top 5 emojis they use most"],
  "punctuationStyle": "none|minimal|standard|expressive",
  "capitalization": "none|lowercase|normal|allcaps_sometimes",
  "stickerGifUsage": "never|rare|moderate|heavy",
  "primaryLanguage": "english/pidgin/yoruba/igbo/hausa/mixed",
  "languageMixing": ["languages they switch between"],
  "commonPhrases": ["phrases they repeat often, max 10"],
  "slangWords": ["slang/informal words they use, max 10"],
  "fillerWords": ["filler words like 'like', 'hmm', 'sha', 'abeg', max 5"],
  "humorStyle": "brief description of their humor",
  "sarcasmLevel": "never|subtle|moderate|heavy",
  "emotionalExpressiveness": "reserved|moderate|very_expressive",
  "trustLevel": "guarded|open|oversharer",
  "confidenceLevel": "humble|balanced|confident|cocky",
  "responseSpeed": "instant|quick|moderate|slow|very_slow",
  "doubleTexting": true/false,
  "voiceNotePreference": "never|sometimes|prefers_voice",
  "responseTimingPattern": "instant_replier|takes_time|reads_then_replies_later",
  "groupVsDmDifference": "how they behave differently in groups vs DMs",
  "greetingStyle": "how they typically greet",
  "farewellStyle": "how they typically say bye",
  "agreementPhrases": ["how they agree, max 5"],
  "disagreementPhrases": ["how they disagree, max 5"],
  "excitementExpressions": ["how they show excitement, max 5"],
  "annoyanceExpressions": ["how they show annoyance, max 5"],
  "complimentStyle": "how they compliment people",
  "apologyStyle": "how they apologize",
  "argumentStyle": "avoids_conflict|calm_logical|passionate|aggressive",
  "adviceGivingStyle": "direct|supportive|tough_love|avoids_giving",
  "storytellingStyle": "brief|detailed|dramatic|humorous",
  "questionAnsweringStyle": "direct|elaborate|deflective",
  "gossipTendency": "never|sometimes|loves_it",
  "flirtingStyle": "how they flirt or if they don't",
  "handleBeingWrong": "how they react when proven wrong",
  "culturalReferences": ["cultural references they make, max 5"],
  "musicEntertainmentRefs": ["music/movies/shows they reference, max 5"],
  "religiousSpiritualExpressions": ["religious/spiritual phrases they use, max 3"],
  "moneyTalkStyle": "private|open|flexer|avoids",
  "knownTopics": ["topics they talk about, max 10"],
  "opinions": ["strong opinions they hold, max 5"],
  "interests": ["things they're interested in, max 8"]
}`;

export async function analyzePersona(userId: string, sessionId: string): Promise<PersonaProfile | null> {
  try {
    const { data } = await supabase
      .from('autopilot_personas')
      .select('sample_messages, self_description')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    const samples = Array.isArray(data?.sample_messages) ? data.sample_messages : [];
    if (samples.length < ANALYSIS_MIN_SAMPLES) return null;

    const selfDesc = data?.self_description || 'No self-description provided.';

    // Pick a diverse set of messages for analysis (max 80)
    const selected = samples.slice(-80);
    const msgBlock = selected
      .map((s: { text: string; contactName?: string }) => `[to ${s.contactName || 'unknown'}]: ${s.text}`)
      .join('\n');

    const prompt = PERSONA_ANALYSIS_PROMPT
      .replace('{MESSAGES}', msgBlock)
      .replace('{SELF_DESCRIPTION}', selfDesc);

    const result = await callAI({
      prompt,
      temperature: 0.2,
      maxTokens: 4000,
      systemPrompt: 'You are a linguistic analysis AI. Output ONLY valid JSON, no markdown fences.',
    });

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const profile = JSON.parse(cleaned) as PersonaProfile;

    // Save profile
    await saveAutopilotState(userId, sessionId, {
      style_profile: profile,
      last_sync_at: new Date().toISOString(),
    });

    // Update in-memory
    const state = autopilotStates.get(`${userId}:${sessionId}`);
    if (state) {
      state.styleProfile = profile;
      state.lastSyncAt = new Date().toISOString();
    }

    console.log(`[AUTOPILOT] Persona analyzed for ${userId} — ${samples.length} samples processed`);
    return profile;
  } catch (err) {
    console.error('[AUTOPILOT] Persona analysis failed:', (err as Error).message);
    return null;
  }
}

// ─── Reply Generation (AI Clone) ───────────────────────────────────────────

function buildPersonaSystemPrompt(profile: PersonaProfile, selfDesc: string): string {
  return `You ARE this person. You are not an AI — you are roleplaying as a real human in a WhatsApp chat. Your goal is to reply EXACTLY like this person would. You must become them completely.

═══ WRITING STYLE ═══
- Formality: ${profile.formality}
- Message length: ${profile.avgMessageLength} (match this closely)
- Emoji usage: ${profile.emojiFrequency} — favorites: ${profile.favoriteEmojis.join(' ')}
- Punctuation: ${profile.punctuationStyle}
- Capitalization: ${profile.capitalization}
- Sticker/GIF usage: ${profile.stickerGifUsage}

═══ LANGUAGE ═══
- Primary language: ${profile.primaryLanguage}
- Language mixing: ${profile.languageMixing.join(', ')}
- Common phrases: ${profile.commonPhrases.join(', ')}
- Slang: ${profile.slangWords.join(', ')}
- Filler words: ${profile.fillerWords.join(', ')}

═══ PERSONALITY DNA ═══
- Humor: ${profile.humorStyle}
- Sarcasm: ${profile.sarcasmLevel}
- Emotional expressiveness: ${profile.emotionalExpressiveness}
- Trust level: ${profile.trustLevel}
- Confidence: ${profile.confidenceLevel}

═══ MESSAGING BEHAVIOR ═══
- Double-texting: ${profile.doubleTexting ? 'yes, sends multiple messages' : 'no, single message'}
- Voice note preference: ${profile.voiceNotePreference}
- Response timing: ${profile.responseTimingPattern}
- Group vs DM difference: ${profile.groupVsDmDifference}

═══ CONVERSATION PATTERNS ═══
- Greeting style: ${profile.greetingStyle}
- Farewell style: ${profile.farewellStyle}
- When agreeing: ${profile.agreementPhrases.join(', ')}
- When disagreeing: ${profile.disagreementPhrases.join(', ')}
- When excited: ${profile.excitementExpressions.join(', ')}
- When annoyed: ${profile.annoyanceExpressions.join(', ')}

═══ SOCIAL BEHAVIOR ═══
- Complimenting: ${profile.complimentStyle}
- Apologizing: ${profile.apologyStyle}
- Arguments: ${profile.argumentStyle}
- Giving advice: ${profile.adviceGivingStyle}
- Storytelling: ${profile.storytellingStyle}
- Answering questions: ${profile.questionAnsweringStyle}
- Gossip: ${profile.gossipTendency}
- Flirting: ${profile.flirtingStyle}
- When proven wrong: ${profile.handleBeingWrong}

═══ CULTURAL DNA ═══
- Cultural refs: ${profile.culturalReferences.join(', ')}
- Music/entertainment: ${profile.musicEntertainmentRefs.join(', ')}
- Religious/spiritual: ${profile.religiousSpiritualExpressions.join(', ')}
- Money talk: ${profile.moneyTalkStyle}

═══ KNOWLEDGE ═══
- Topics: ${profile.knownTopics.join(', ')}
- Strong opinions: ${profile.opinions.join(', ')}
- Interests: ${profile.interests.join(', ')}

═══ SELF-DESCRIPTION ═══
${selfDesc || 'None provided'}

═══ RULES (NEVER BREAK THESE) ═══
1. Write EXACTLY like this person — match their length, slang, emoji, tone, capitalization
2. NEVER reveal you're an AI, bot, or autopilot. You ARE this person
3. If you don't know something specific, deflect naturally ("I'll check later", "not sure rn", etc.)
4. Match the conversation energy — casual to casual, serious to serious
5. Use the person's ACTUAL phrases and slang, not generic alternatives
6. Keep responses the right length — if they write short, you write short
7. If the language is pidgin/yoruba/igbo, respond in the same language mix
8. Match their sarcasm level, confidence, and emotional expressiveness exactly
9. If they're the type to gossip, gossip. If reserved, stay reserved
10. Output ONLY the reply message text. No quotes, no labels, no explanations`;
}

function buildContactContext(memory: ContactMemory): string {
  if (memory.lastMessages.length === 0) return '';

  const recent = memory.lastMessages.slice(-15);
  const lines = recent.map((m) => `${m.role === 'owner' ? 'You' : memory.contactName}: ${m.text}`);

  let ctx = `\nCONVERSATION HISTORY WITH ${memory.contactName}:\n`;
  ctx += lines.join('\n');

  if (memory.relationship !== 'unknown') {
    ctx += `\n\nYour relationship with ${memory.contactName}: ${memory.relationship}`;
    ctx += `\nYour usual tone with them: ${memory.toneWithContact}`;
  }

  if (memory.recentTopics.length > 0) {
    ctx += `\nRecent topics: ${memory.recentTopics.join(', ')}`;
  }

  return ctx;
}

// Voice/video call request detection
const CALL_REQUEST_PATTERN = /\b(?:call me|can we call|let'?s call|video call|voice note|send voice|voice chat|can you call|wanna call|pick up|answer (?:my )?call|ring me|dial me|facetime|let me call you|i'?ll call|phone me)\b/i;

/**
 * Master gate: should autopilot reply to this message?
 * Called from MessageHandler AFTER NLP / auto-reply / savage have run.
 *
 * Per-contact awareness:
 * - If owner recently replied to THIS contact → skip (they're handling it)
 * - If owner is globally inactive (offline mode) OR always mode → reply
 * - Owner chatting with someone else doesn't block autopilot for this contact
 */
export async function shouldAutopilotReply(
  userId: string,
  sessionId: string,
  isGroup: boolean,
  fromMe: boolean,
  otherHandlerReplied: boolean,
  chatJid?: string,
): Promise<boolean> {
  if (fromMe || isGroup || otherHandlerReplied) return false;

  const state = await loadAutopilotState(userId, sessionId);
  if (!state.styleProfile) return false;
  if (state.dailyRepliesUsed >= state.maxDailyReplies) return false;

  // Per-contact override check (overrides global setting)
  if (chatJid) {
    const override = state.contactOverrides.get(chatJid);
    if (override === 'off') return false;  // explicitly disabled for this contact
    if (override === 'on') {
      // Explicitly enabled for this contact — skip global check
      // But still respect per-contact recent activity
      if (isOwnerActiveWithContact(sessionId, chatJid)) return false;
      return true;
    }
  }

  // No per-contact override → follow global setting
  if (!state.enabled) return false;

  // Per-contact check: if owner recently engaged with this specific contact, back off
  if (chatJid && isOwnerActiveWithContact(sessionId, chatJid)) {
    return false;
  }

  // Mode checks
  if (state.mode === 'offline' && !isOwnerInactive(sessionId, state.inactivityMinutes)) {
    return false; // Owner is globally active — don't reply
  }
  // 'always' mode: reply regardless of global activity
  // 'manual' mode: treated same as 'always' (toggled on/off explicitly)

  return true;
}

export async function generateAutopilotReply(
  userId: string,
  sessionId: string,
  incomingText: string,
  chatJid: string,
  contactName?: string,
): Promise<string | null> {
  try {
    const state = await loadAutopilotState(userId, sessionId);
    if (!state.styleProfile) return null;

    // Check daily limit
    if (state.dailyRepliesUsed >= state.maxDailyReplies) {
      console.log(`[AUTOPILOT] Daily limit reached for ${userId} (${state.dailyRepliesUsed}/${state.maxDailyReplies})`);
      return null;
    }

    const profile = state.styleProfile;
    const isCallRequest = CALL_REQUEST_PATTERN.test(incomingText);
    const mood = detectMood(incomingText);
    const timeHint = getTimePersonalityHint();

    const systemPrompt = buildPersonaSystemPrompt(profile, state.selfDescription);

    // Build contact context with relationship awareness
    const memory = state.contactMemories.get(chatJid);
    const contextBlock = memory ? buildContactContext(memory) : '';

    let extraInstruction = '';
    if (isCallRequest) {
      extraInstruction += `\n\nIMPORTANT: They are asking for a voice/video call. You are NOT available to take calls right now. Decline naturally in your style — say you'll call back later, or that you can't talk right now. Do NOT say you're an AI or on autopilot.`;
    }

    // Mood-adaptive instructions
    if (mood === 'urgent') {
      extraInstruction += `\n\nMOOD: This message sounds URGENT. Reply more quickly/directly than usual. Show concern but stay in character.`;
    } else if (mood === 'angry') {
      extraInstruction += `\n\nMOOD: They seem angry or frustrated. Respond the way this person naturally handles conflict (${profile.argumentStyle}). Don't be overly apologetic unless that's their style.`;
    } else if (mood === 'sad') {
      extraInstruction += `\n\nMOOD: They seem sad or going through something. Be supportive in this person's natural way (advice style: ${profile.adviceGivingStyle}, expressiveness: ${profile.emotionalExpressiveness}).`;
    } else if (mood === 'happy') {
      extraInstruction += `\n\nMOOD: They're sharing good news or are happy. Match their energy with excitement expressions this person would use.`;
    }

    // Time-of-day personality shift
    extraInstruction += `\n\nTIME CONTEXT: ${timeHint}`;

    // Relationship context
    if (memory && memory.relationship !== 'unknown') {
      extraInstruction += `\n\nRELATIONSHIP: You know ${memory.contactName} as a ${memory.relationship}. Your usual tone with them: ${memory.toneWithContact}.`;
    }

    const userPrompt = `${contactBlock(contactName, chatJid)}${contextBlock}

${contactName || 'Someone'} just sent you this message:
"${incomingText}"${extraInstruction}

Reply as yourself. Output ONLY the reply text:`;

    const reply = await callAI({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    if (!reply || reply.length < 1) return null;

    // Clean up — remove any quotes the AI might wrap the reply in
    let cleaned = reply.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }

    // Increment daily counter
    state.dailyRepliesUsed++;
    await saveAutopilotState(userId, sessionId, {
      daily_replies_used: state.dailyRepliesUsed,
    });

    // Record our reply in contact memory
    await updateContactMemory(userId, sessionId, chatJid, 'owner', cleaned, contactName);

    console.log(`[AUTOPILOT] Generated reply for ${userId} → ${chatJid} (${state.dailyRepliesUsed}/${state.maxDailyReplies})`);
    return cleaned;
  } catch (err) {
    console.error('[AUTOPILOT] Reply generation failed:', (err as Error).message);
    return null;
  }
}

function contactBlock(name?: string, jid?: string): string {
  if (name) return `Contact: ${name}`;
  if (jid) return `Contact: ${jid.split('@')[0]}`;
  return '';
}

// ─── Delayed Reply Scheduling ───────────────────────────────────────────────

export function scheduleAutopilotReply(
  userId: string,
  sessionId: string,
  chatJid: string,
  incomingText: string,
  contactName: string | undefined,
  delayMinutes: number,
  sendFn: (text: string) => Promise<void>,
  sock?: { readMessages?: (keys: unknown[]) => Promise<void>; sendPresenceUpdate?: (presence: string, jid: string) => Promise<void> },
  messageKey?: unknown,
): void {
  const key = `${sessionId}:${chatJid}`;

  // Cancel any existing pending reply for this contact (they sent a new msg)
  const existing = pendingReplies.get(key);
  if (existing) clearTimeout(existing);

  // Weighted delay: 1-4 min common (70%), 4-7 min less common (30%)
  let delayMs: number;
  const roll = Math.random();
  if (roll < 0.70) {
    delayMs = (1 + Math.random() * 3) * 60_000;
  } else {
    delayMs = (4 + Math.random() * 3) * 60_000;
  }
  // Add ±15% human jitter
  const jitter = delayMs * (0.85 + Math.random() * 0.30);

  // Simulate "read" receipt after a short natural delay (5-30s)
  const readDelay = 5_000 + Math.random() * 25_000;
  if (sock?.readMessages && messageKey) {
    setTimeout(() => {
      sock.readMessages!([messageKey]).catch(() => {});
    }, readDelay);
  }

  const timeout = setTimeout(async () => {
    pendingReplies.delete(key);
    try {
      // Re-check: owner might have replied while we waited
      if (isOwnerActiveWithContact(sessionId, chatJid)) return;

      const reply = await generateAutopilotReply(userId, sessionId, incomingText, chatJid, contactName);
      if (reply) {
        // Simulate typing indicator before sending (1-4s based on reply length)
        if (sock?.sendPresenceUpdate) {
          try {
            await sock.sendPresenceUpdate('composing', chatJid);
            const typingDuration = Math.min(1000 + reply.length * 30, 4000);
            await new Promise((r) => setTimeout(r, typingDuration));
            await sock.sendPresenceUpdate('paused', chatJid);
          } catch { /* non-critical */ }
        }
        await sendFn(reply);
      }
    } catch (err) {
      console.error('[AUTOPILOT] Scheduled reply failed:', (err as Error).message);
    }
  }, jitter);

  pendingReplies.set(key, timeout);
}

export function cancelPendingAutopilotReply(sessionId: string, chatJid: string): void {
  const key = `${sessionId}:${chatJid}`;
  const existing = pendingReplies.get(key);
  if (existing) {
    clearTimeout(existing);
    pendingReplies.delete(key);
  }
}

// ─── Self-Description ───────────────────────────────────────────────────────

export async function setSelfDescription(
  userId: string,
  sessionId: string,
  description: string,
): Promise<void> {
  await saveAutopilotState(userId, sessionId, {
    self_description: description.substring(0, 2000),
  });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.selfDescription = description.substring(0, 2000);
}

export async function getSelfDescription(userId: string, sessionId: string): Promise<string> {
  const state = await loadAutopilotState(userId, sessionId);
  return state.selfDescription;
}

// ─── Autopilot Toggle ───────────────────────────────────────────────────────

export async function setAutopilotEnabled(
  userId: string,
  sessionId: string,
  enabled: boolean,
): Promise<void> {
  await saveAutopilotState(userId, sessionId, { enabled });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.enabled = enabled;
}

export async function isAutopilotEnabled(userId: string, sessionId: string): Promise<boolean> {
  const state = await loadAutopilotState(userId, sessionId);
  return state.enabled;
}

export async function setReplyDelay(userId: string, sessionId: string, minutes: number): Promise<void> {
  const clamped = Math.max(1, Math.min(30, minutes));
  await saveAutopilotState(userId, sessionId, { reply_delay_minutes: clamped });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.replyDelayMinutes = clamped;
}

export async function setMaxDailyReplies(userId: string, sessionId: string, limit: number): Promise<void> {
  const clamped = Math.max(5, Math.min(200, limit));
  await saveAutopilotState(userId, sessionId, { max_daily_replies: clamped });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.maxDailyReplies = clamped;
}

export async function setAutopilotMode(userId: string, sessionId: string, mode: AutopilotMode): Promise<void> {
  await saveAutopilotState(userId, sessionId, { mode });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.mode = mode;
}

export async function setInactivityMinutes(userId: string, sessionId: string, minutes: number): Promise<void> {
  const clamped = Math.max(1, Math.min(60, minutes));
  await saveAutopilotState(userId, sessionId, { inactivity_minutes: clamped });
  const state = autopilotStates.get(`${userId}:${sessionId}`);
  if (state) state.inactivityMinutes = clamped;
}

// ─── Per-Contact Overrides ──────────────────────────────────────────────────

export async function setContactOverride(
  userId: string,
  sessionId: string,
  contactJid: string,
  override: ContactOverride | 'default',
): Promise<void> {
  const state = await loadAutopilotState(userId, sessionId);

  if (override === 'default') {
    state.contactOverrides.delete(contactJid);
  } else {
    state.contactOverrides.set(contactJid, override);
  }

  // Serialize overrides map to plain object for DB storage
  const obj: Record<string, string> = {};
  for (const [jid, val] of state.contactOverrides.entries()) {
    obj[jid] = val;
  }
  await saveAutopilotState(userId, sessionId, { contact_overrides: obj });
}

export async function getContactOverrides(
  userId: string,
  sessionId: string,
): Promise<Map<string, ContactOverride>> {
  const state = await loadAutopilotState(userId, sessionId);
  return state.contactOverrides;
}

export async function getContactList(
  userId: string,
  sessionId: string,
): Promise<Array<{ jid: string; name: string; override: ContactOverride | 'default'; messageCount: number }>> {
  const state = await loadAutopilotState(userId, sessionId);
  const contacts: Array<{ jid: string; name: string; override: ContactOverride | 'default'; messageCount: number }> = [];

  for (const [jid, memory] of state.contactMemories.entries()) {
    contacts.push({
      jid,
      name: memory.contactName,
      override: state.contactOverrides.get(jid) || 'default',
      messageCount: memory.lastMessages.length,
    });
  }

  // Also include overrides for contacts not yet in memory
  for (const [jid, val] of state.contactOverrides.entries()) {
    if (!state.contactMemories.has(jid)) {
      contacts.push({
        jid,
        name: jid.split('@')[0],
        override: val,
        messageCount: 0,
      });
    }
  }

  return contacts;
}

// ─── Message Batching ───────────────────────────────────────────────────────
// When someone sends multiple messages in a row, wait for them to finish
// before generating ONE combined reply.

const batchBuffers = new Map<string, { messages: string[]; timer: NodeJS.Timeout; contactName?: string }>();
const BATCH_WAIT_MS = 8_000; // Wait 8s of silence before replying to a burst

export function bufferIncomingForBatch(
  sessionId: string,
  chatJid: string,
  text: string,
  contactName: string | undefined,
  onBatchReady: (combinedText: string, name: string | undefined) => void,
): void {
  const key = `${sessionId}:${chatJid}`;
  const existing = batchBuffers.get(key);

  if (existing) {
    // More messages coming — reset timer, append
    clearTimeout(existing.timer);
    existing.messages.push(text);
    if (contactName) existing.contactName = contactName;
    existing.timer = setTimeout(() => {
      batchBuffers.delete(key);
      const combined = existing.messages.join('\n');
      onBatchReady(combined, existing.contactName);
    }, BATCH_WAIT_MS);
  } else {
    // First message — start buffer
    const timer = setTimeout(() => {
      const buf = batchBuffers.get(key);
      batchBuffers.delete(key);
      if (buf) {
        const combined = buf.messages.join('\n');
        onBatchReady(combined, buf.contactName);
      }
    }, BATCH_WAIT_MS);
    batchBuffers.set(key, { messages: [text], timer, contactName });
  }
}

// ─── Mood Detection ─────────────────────────────────────────────────────────

const URGENT_PATTERN = /\b(?:urgent|emergency|asap|help me|please help|i need you|right now|immediately|quickly|hurry)\b/i;
const ANGRY_PATTERN = /\b(?:wtf|fuck|shit|damn|pissed|angry|annoyed|stupid|idiot|hate you|rubbish|nonsense|useless)\b/i;
const SAD_PATTERN = /\b(?:sad|depressed|crying|cry|miss you|lonely|heartbroken|lost someone|passed away|died|funeral|hurt|pain)\b/i;
const HAPPY_PATTERN = /\b(?:amazing|awesome|great news|congrats|celebrate|happy|excited|love it|perfect|wonderful|blessed)\b/i;

export type MoodHint = 'urgent' | 'angry' | 'sad' | 'happy' | 'neutral';

export function detectMood(text: string): MoodHint {
  if (URGENT_PATTERN.test(text)) return 'urgent';
  if (ANGRY_PATTERN.test(text)) return 'angry';
  if (SAD_PATTERN.test(text)) return 'sad';
  if (HAPPY_PATTERN.test(text)) return 'happy';
  return 'neutral';
}

// ─── Time-of-Day Personality ────────────────────────────────────────────────

export function getTimePersonalityHint(): string {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 'It is very late at night/early morning. Reply sleepy, brief, minimal energy. Shorter messages, less emoji.';
  if (hour >= 6 && hour < 9) return 'It is early morning. Reply with morning energy — slightly groggy but warming up.';
  if (hour >= 9 && hour < 12) return 'It is mid-morning. Reply with normal energy.';
  if (hour >= 12 && hour < 14) return 'It is around lunchtime. Reply casually.';
  if (hour >= 14 && hour < 18) return 'It is afternoon. Reply with normal energy.';
  if (hour >= 18 && hour < 21) return 'It is evening. Reply relaxed, winding down.';
  return 'It is late night. Reply more chill, less formal, shorter messages.';
}

// ─── Status / Stats ─────────────────────────────────────────────────────────

export async function getAutopilotStatus(userId: string, sessionId: string): Promise<{
  enabled: boolean;
  mode: AutopilotMode;
  sampleCount: number;
  hasProfile: boolean;
  profileSummary: string;
  selfDescription: string;
  replyDelay: number;
  inactivityMinutes: number;
  maxDailyReplies: number;
  dailyRepliesUsed: number;
  lastSyncAt: string | null;
  contactCount: number;
  ownerLastActiveMinAgo: number | null;
}> {
  const state = await loadAutopilotState(userId, sessionId);
  const profile = state.styleProfile;

  let summary = 'No profile yet. Send more messages and run !autopilot sync.';
  if (profile) {
    summary = `${profile.formality} • ${profile.primaryLanguage} • ${profile.avgMessageLength} msgs • emoji: ${profile.emojiFrequency}`;
    if (profile.commonPhrases.length > 0) {
      summary += `\nPhrases: ${profile.commonPhrases.slice(0, 5).join(', ')}`;
    }
    if (profile.slangWords.length > 0) {
      summary += `\nSlang: ${profile.slangWords.slice(0, 5).join(', ')}`;
    }
    if (profile.interests.length > 0) {
      summary += `\nInterests: ${profile.interests.slice(0, 5).join(', ')}`;
    }
  }

  return {
    enabled: state.enabled,
    mode: state.mode,
    sampleCount: state.sampleCount,
    hasProfile: !!state.styleProfile,
    profileSummary: summary,
    selfDescription: state.selfDescription,
    replyDelay: state.replyDelayMinutes,
    inactivityMinutes: state.inactivityMinutes,
    maxDailyReplies: state.maxDailyReplies,
    dailyRepliesUsed: state.dailyRepliesUsed,
    lastSyncAt: state.lastSyncAt,
    contactCount: state.contactMemories.size,
    ownerLastActiveMinAgo: getOwnerLastActiveMinutesAgo(sessionId),
  };
}

// ─── Preview (Test Clone) ───────────────────────────────────────────────────

export async function previewAutopilotReply(
  userId: string,
  sessionId: string,
  testMessage: string,
): Promise<string | null> {
  const state = await loadAutopilotState(userId, sessionId);
  if (!state.styleProfile) return null;

  const profile = state.styleProfile;
  const systemPrompt = buildPersonaSystemPrompt(profile, state.selfDescription);

  const result = await callAI({
    prompt: `Someone sent you: "${testMessage}"\n\nReply as yourself. Output ONLY the reply text:`,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 500,
  });

  let cleaned = result.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned;
}

// ─── Daily Reset ────────────────────────────────────────────────────────────

export function resetDailyCounters(): void {
  for (const [key, state] of autopilotStates.entries()) {
    if (state.dailyRepliesUsed > 0) {
      state.dailyRepliesUsed = 0;
      const [userId, sessionId] = key.split(':');
      saveAutopilotState(userId, sessionId, { daily_replies_used: 0 }).catch(() => {});
    }
  }
  console.log('[AUTOPILOT] Daily counters reset');
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export function cleanupAutopilot(sessionId: string): void {
  // Cancel all pending replies for this session
  for (const [key, timeout] of pendingReplies.entries()) {
    if (key.startsWith(`${sessionId}:`)) {
      clearTimeout(timeout);
      pendingReplies.delete(key);
    }
  }
  // Clear in-memory states for this session
  for (const key of autopilotStates.keys()) {
    if (key.endsWith(`:${sessionId}`)) {
      autopilotStates.delete(key);
    }
  }
}
