// ─── Savage Mode ─────────────────────────────────────────────────────────────
//
// Auto-detects insults directed at the bot owner and fires back with
// AI-generated roasts. Uses Groq → Gemini fallback for both detection
// and roast generation. Only triggers for messages from OTHER users
// (not fromMe), and only when the user has enabled "savage" mode.

import { getFeatureEnabled } from '../database';

// ─── Insult Detection ────────────────────────────────────────────────────────

// Common insult patterns (English + Nigerian pidgin / slang)
const INSULT_PATTERNS = [
  // Direct insults
  /\b(?:stupid|dumb|idiot|fool|foolish|moron|loser|trash|useless|pathetic|lame|boring|ugly|fat|skinny|weak|dull|slow|clown|joke|fraud|scam|fake|wack|wicked|evil|horrible|terrible|awful|disgusting|nasty|smelly|dirty|crazy|mad|insane|psycho|creep|freak|nerd|geek|noob|simp|cringe|weird|annoying|irritating|retard)\b/i,
  // Profanity
  /\b(?:fuck|shit|bitch|ass|dick|cock|bastard|damn|hell|crap|suck|wtf|stfu|shut up|go away|get lost|piss off|screw you|hate you|die|kill yourself|kys)\b/i,
  // Nigerian pidgin / slang insults
  /\b(?:mumu|olodo|ode|werey|agbaya|olofo|ashawo|alaye|omo ale|oponu|oloriburuku|oniranu|were|arankan|gbegiri|alakoba|jaguda|area boy|agbero|ori e ti daru|efulefu|ewu|anuofia|onye nzuzu|nzuzu|oku|ofeke)\b/i,
  // Insult phrases (pidgin)
  /(?:you (?:be|dey|na)|na you (?:be|dey)) (?:mugu|fool|mumu|mad|crazy|clown|joke|useless|stupid|dumb|olodo|ode|werey)/i,
  /(?:your (?:head|brain|sense|papa|mama)) (?:no |dey |need |is )/i,
  /(?:you no get|you lack|you dey|you too) (?:sense|brain|shame)/i,
  /(?:thunder|God) (?:fire|punish|strike) (?:you|am)/i,
  /(?:go and|go) (?:die|sit down|sleep|rest|disappear)/i,
  // English insult phrases
  /(?:you(?:'re| are)) (?:so |such )?(?:a )?(?:stupid|dumb|idiot|fool|loser|trash|useless|pathetic|lame|boring|ugly|clown|joke|waste|disgrace|disappointment|nobody)/i,
  /(?:nobody|no one) (?:likes|cares about|wants|asked) you/i,
  /(?:shut|close) (?:up|your (?:mouth|trap|face))/i,
];

// Quick regex check before calling AI
export function quickInsultCheck(text: string): boolean {
  return INSULT_PATTERNS.some((re) => re.test(text));
}

// ─── AI-Powered Detection & Response ─────────────────────────────────────────

const DETECT_PROMPT = `You are an insult detector for a WhatsApp bot. The bot owner uses this bot from their personal number. Determine if the incoming message is an insult, disrespect, or verbal attack directed at the person receiving it (the bot owner / the person whose WhatsApp this bot runs on).

Context: This is a message from SOMEONE ELSE to the bot owner's WhatsApp. The bot owner is the recipient.

Consider:
- Direct insults ("you're stupid", "idiot")
- Nigerian pidgin insults ("mumu", "olodo", "ode", "werey", "agbaya")
- Subtle disrespect ("nobody asked you", "you're not that important")
- Aggressive tone ("shut up", "go away", "piss off")
- Sarcastic insults ("oh wow you're sooo smart", "great job genius")

DO NOT flag:
- Friendly banter with obvious humor markers (lol, 😂, jk)
- Self-deprecating statements
- Messages about third parties (not directed at the recipient)
- General complaints not targeting the person
- Curse words used as exclamations, not insults ("shit, I forgot my keys")

Respond with ONLY valid JSON:
{"is_insult": true/false, "severity": "mild|medium|savage", "target": "owner|other|none", "reason": "brief explanation"}

CRITICAL: Only return is_insult=true if the message is CLEARLY targeting the bot owner / recipient.`;

const ROAST_PROMPT = `You are a savage roast generator for a WhatsApp bot. The bot owner has "savage mode" enabled, which means when someone insults them, you fire back with a witty, devastating roast.

Rules:
- Be SAVAGE but keep it clever and witty — think comedy roast, not bullying
- Match the energy: mild insult → mild roast, savage insult → savage roast
- Use Nigerian pidgin/slang when the insult uses pidgin (e.g., "Omo, your head dey there? 😂")
- Keep it SHORT — 1-3 sentences max. WhatsApp messages should be punchy
- Add relevant emoji for flavor (😂, 🔥, 💀, 🤡, etc.)
- NEVER use slurs, racial terms, or genuinely harmful content
- NEVER threaten violence
- Be creative — don't repeat generic "your mama" jokes
- Reference their own insult and flip it on them
- End with something dismissive or confident

Severity guide:
- mild: Light teasing, playful comeback ("That's cute, did you practice that in the mirror? 😂")
- medium: Solid burns ("If I wanted to hear from someone with your IQ, I'd talk to my toaster 🔥")
- savage: Devastating ("You put the 'L' in 'life choices' — and that's the only thing you've ever gotten right 💀")`;

interface InsultAnalysis {
  is_insult: boolean;
  severity: 'mild' | 'medium' | 'savage';
  target: 'owner' | 'other' | 'none';
  reason: string;
}

/**
 * Check if a message is an insult directed at the bot owner and generate
 * a savage roast response if savage mode is enabled.
 *
 * Returns the roast text if triggered, null otherwise.
 */
export async function processSavageMode(
  text: string,
  userId: string,
  fromMe: boolean,
  senderName?: string,
): Promise<string | null> {
  // Only trigger for messages FROM others, not the owner
  if (fromMe) return null;

  // Check if savage mode is enabled
  const enabled = await getFeatureEnabled(userId, 'savage');
  if (!enabled) return null;

  // Quick regex pre-filter — skip obviously non-insult messages
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 500) return null;

  // First pass: quick regex check
  const quickMatch = quickInsultCheck(trimmed);

  // If no quick match, use AI to check (handles subtle insults)
  // But only for messages that look somewhat aggressive (length > 5)
  if (!quickMatch && trimmed.length < 6) return null;

  try {
    const { callAI } = await import('../../lib/ai-provider');

    // Step 1: Detect if it's actually an insult targeting the owner
    const detectResponse = await callAI({
      prompt: `Message from "${senderName || 'Someone'}": "${trimmed}"\n\nIs this an insult directed at the recipient?`,
      systemPrompt: DETECT_PROMPT,
      maxTokens: 100,
      temperature: 0.1,
    });

    const cleanDetect = detectResponse
      .replace(/```json\n?|\n?```/g, '')
      .trim();

    const jsonMatch = cleanDetect.match(/\{[^{}]*\}/);
    if (!jsonMatch) return null;

    const analysis: InsultAnalysis = JSON.parse(jsonMatch[0]);

    if (!analysis.is_insult || analysis.target !== 'owner') return null;

    console.log(`[SAVAGE] Insult detected from ${senderName}: severity=${analysis.severity}, reason=${analysis.reason}`);

    // Step 2: Generate savage roast
    const roastResponse = await callAI({
      prompt: `Someone named "${senderName || 'this person'}" said: "${trimmed}"\n\nInsult severity: ${analysis.severity}\nContext: ${analysis.reason}\n\nGenerate a savage roast response.`,
      systemPrompt: ROAST_PROMPT,
      maxTokens: 150,
      temperature: 0.9,
    });

    const roast = roastResponse.trim();
    if (!roast || roast.length < 5) return null;

    console.log(`[SAVAGE] Roast generated: "${roast.slice(0, 60)}..."`);
    return roast;
  } catch (err) {
    console.error('[SAVAGE] Error:', err);
    return null;
  }
}
