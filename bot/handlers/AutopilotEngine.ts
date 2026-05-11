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
}

// ─── In-Memory Caches ───────────────────────────────────────────────────────

const autopilotStates = new Map<string, AutopilotState>();
const pendingReplies = new Map<string, NodeJS.Timeout>();

// Track when the owner last sent a message (per session)
// Used to detect if owner is "offline" / inactive
const ownerLastActive = new Map<string, number>();
const DEFAULT_INACTIVITY_MINUTES = 5;

const MAX_SAMPLES = 200;
const MAX_CONTACT_MESSAGES = 30;
const ANALYSIS_MIN_SAMPLES = 15;

// ─── Owner Activity Tracking ────────────────────────────────────────────────

export function markOwnerActive(sessionId: string): void {
  ownerLastActive.set(sessionId, Date.now());
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

async function loadAutopilotState(userId: string, sessionId: string): Promise<AutopilotState> {
  const cached = autopilotStates.get(`${userId}:${sessionId}`);
  if (cached) return cached;

  const { data } = await supabase
    .from('autopilot_personas')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single();

  const state: AutopilotState = {
    enabled: data?.enabled ?? false,
    mode: (data?.mode as AutopilotMode) || 'offline',
    replyDelayMinutes: data?.reply_delay_minutes ?? 3,
    inactivityMinutes: data?.inactivity_minutes ?? DEFAULT_INACTIVITY_MINUTES,
    maxDailyReplies: data?.max_daily_replies ?? 30,
    dailyRepliesUsed: data?.daily_replies_used ?? 0,
    selfDescription: data?.self_description ?? '',
    styleProfile: data?.style_profile && Object.keys(data.style_profile).length > 0
      ? data.style_profile as PersonaProfile : null,
    sampleCount: Array.isArray(data?.sample_messages) ? data.sample_messages.length : 0,
    lastSyncAt: data?.last_sync_at ?? null,
    contactMemories: new Map(),
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
 */
export async function shouldAutopilotReply(
  userId: string,
  sessionId: string,
  isGroup: boolean,
  fromMe: boolean,
  otherHandlerReplied: boolean,
): Promise<boolean> {
  if (fromMe || isGroup || otherHandlerReplied) return false;

  const state = await loadAutopilotState(userId, sessionId);
  if (!state.enabled || !state.styleProfile) return false;
  if (state.dailyRepliesUsed >= state.maxDailyReplies) return false;

  // Mode checks
  if (state.mode === 'offline' && !isOwnerInactive(sessionId, state.inactivityMinutes)) {
    return false; // Owner is active — don't reply
  }
  // 'always' mode: reply regardless
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
    if (!state.enabled || !state.styleProfile) return null;

    // Check daily limit
    if (state.dailyRepliesUsed >= state.maxDailyReplies) {
      console.log(`[AUTOPILOT] Daily limit reached for ${userId} (${state.dailyRepliesUsed}/${state.maxDailyReplies})`);
      return null;
    }

    const profile = state.styleProfile;
    const isCallRequest = CALL_REQUEST_PATTERN.test(incomingText);

    const systemPrompt = buildPersonaSystemPrompt(profile, state.selfDescription);

    // Build contact context
    const memory = state.contactMemories.get(chatJid);
    const contextBlock = memory ? buildContactContext(memory) : '';

    let extraInstruction = '';
    if (isCallRequest) {
      extraInstruction = `\n\nIMPORTANT: They are asking for a voice/video call. You are NOT available to take calls right now. Decline naturally in your style — say you'll call back later, or that you can't talk right now. Do NOT say you're an AI or on autopilot.`;
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
): void {
  const key = `${sessionId}:${chatJid}`;

  // Cancel any existing pending reply for this contact (they sent a new msg)
  const existing = pendingReplies.get(key);
  if (existing) clearTimeout(existing);

  // Add some human-like jitter to the delay (±30%)
  const jitter = delayMinutes * 60_000 * (0.7 + Math.random() * 0.6);

  const timeout = setTimeout(async () => {
    pendingReplies.delete(key);
    try {
      const reply = await generateAutopilotReply(userId, sessionId, incomingText, chatJid, contactName);
      if (reply) {
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
