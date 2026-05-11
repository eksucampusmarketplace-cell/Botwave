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
  // Direct insults (expanded)
  /\b(?:stupid|dumb|idiot|fool|foolish|moron|loser|trash|useless|pathetic|lame|boring|ugly|fat|skinny|weak|dull|slow|clown|joke|fraud|scam|fake|wack|wicked|evil|horrible|terrible|awful|disgusting|nasty|smelly|dirty|crazy|mad|insane|psycho|creep|freak|nerd|geek|noob|simp|cringe|weird|annoying|irritating|retard|dork|dimwit|halfwit|nitwit|bonehead|numbskull|blockhead|dunce|buffoon|imbecile|ignorant|dense|brainless|clueless|worthless|hopeless|incompetent|mediocre|irrelevant|delusional|toxic|embarrassing|ridiculous|laughable|pitiful|disgraceful|shameful)\b/i,
  // Profanity
  /\b(?:fuck|shit|bitch|ass|dick|cock|bastard|damn|hell|crap|suck|wtf|stfu|shut up|go away|get lost|piss off|screw you|hate you|die|kill yourself|kys|foh|gtfo|gfy|pos|sob|mf|smfh)\b/i,
  // Nigerian pidgin / slang insults (expanded)
  /\b(?:mumu|olodo|ode|werey|agbaya|olofo|ashawo|alaye|omo ale|oponu|oloriburuku|oniranu|were|arankan|gbegiri|alakoba|jaguda|area boy|agbero|ori e ti daru|efulefu|ewu|anuofia|onye nzuzu|nzuzu|oku|ofeke|ode buruku|ajebutter|aje baje|gbeborun|amebo|kobokobo|oshi|oloshi|yeye|ogun|anu mpama|idumodu|ihe ojoo|onyeoshi|onye ara|amosu|iberiberism|olodo gang|mumu button|ode pata pata|banza|dan iska|wawa|mahaukaci|dan banza|gwagwarmayu|talaka|karuwai|shege|ubanz|mugu|mugumu|mugun|oga mumu|see finish|poverty|broke|wretched)\b/i,
  // Insult phrases (pidgin — expanded)
  /(?:you (?:be|dey|na)|na you (?:be|dey)) (?:mugu|fool|mumu|mad|crazy|clown|joke|useless|stupid|dumb|olodo|ode|werey|banza|maga|mugumu)/i,
  /(?:your (?:head|brain|sense|papa|mama|face|life|future|existence)) (?:no |dey |need |is |don |get )/i,
  /(?:you no get|you lack|you dey|you too) (?:sense|brain|shame|home training|respect)/i,
  /(?:thunder|God|lightening|rain) (?:fire|punish|strike|flash|flog) (?:you|am|your)/i,
  /(?:go and|go|comot|gerrahere|gerrahia) (?:die|sit down|sleep|rest|disappear|park well|japa)/i,
  // English insult phrases (expanded)
  /(?:you(?:'re| are)) (?:so |such )?(?:a )?(?:stupid|dumb|idiot|fool|loser|trash|useless|pathetic|lame|boring|ugly|clown|joke|waste|disgrace|disappointment|nobody|failure|embarrassment|lost cause|bottom feeder)/i,
  /(?:nobody|no one) (?:likes|cares about|wants|asked|needs|respects|tolerates) you/i,
  /(?:shut|close) (?:up|your (?:mouth|trap|face|beak))/i,
  // Dismissive / belittling patterns
  /(?:you(?:'re| are) (?:not|never)) (?:good enough|smart enough|worth|relevant|important|needed)/i,
  /(?:waste of|you(?:'re| are) a waste of) (?:time|space|oxygen|air|life|resources|bandwidth)/i,
  /(?:get|stay) (?:out of|away from) (?:my|our) (?:face|sight|life|chat|group)/i,
  // Sarcastic insults
  /(?:oh wow|congratulations|bravo|well done|genius|brilliant|einstein|professor),? (?:you|what a|such a)/i,
  // Pidgin dismissals
  /(?:you dey|you don|na you) (?:craze|mad|whine|para|razz|fall my hand|disappoint|shame)/i,
  /(?:who (?:send|ask|tell|invite)) you/i,
  /(?:you (?:dey|no) (?:hear|see|understand)) word/i,
  /(?:person|somebody|someone) (?:wey|that) (?:no|never) (?:get|know|sabi) (?:sense|brain)/i,
];

// Quick regex check before calling AI
export function quickInsultCheck(text: string): boolean {
  return INSULT_PATTERNS.some((re) => re.test(text));
}

// ─── AI-Powered Detection & Response ─────────────────────────────────────────

const DETECT_PROMPT = `You are an advanced insult detector for a WhatsApp bot used primarily by Nigerian users. The bot owner uses this bot from their personal number. Determine if the incoming message is an insult, disrespect, or verbal attack directed at the person receiving it (the bot owner).

Context: This is a message from SOMEONE ELSE to the bot owner's WhatsApp. The bot owner is the recipient.

You MUST understand and detect:
- Direct insults in any language ("you're stupid", "idiot", "you dey craze")
- Nigerian pidgin insults ("mumu", "olodo", "ode", "werey", "agbaya", "omo ale", "oponu", "oloriburuku")
- Hausa insults ("dan banza", "wawa", "mahaukaci", "shege", "ubanz")
- Igbo insults ("onye nzuzu", "anuofia", "ewu", "ofeke", "anu mpama")
- Yoruba insults ("olodo", "ode", "werey", "agbaya", "ori e ti daru", "arankan")
- Subtle disrespect ("nobody asked you", "you're not that important", "who send you")
- Passive-aggressive tone ("okay if you say so genius", "sure buddy", "whatever you say boss")
- Sarcastic insults ("oh wow you're sooo smart", "great job genius", "brilliant observation")
- Backhanded compliments ("you're pretty smart for someone like you", "at least you tried")
- Dismissive language ("who cares what you think", "your opinion doesn't matter")
- Tone escalation (ALL CAPS, excessive punctuation like "!!!", aggressive emoji 🤡💀)

DO NOT flag:
- Friendly banter with obvious humor markers (lol, 😂, jk, haha)
- Self-deprecating statements ("I'm so dumb" — they're talking about themselves)
- Messages about third parties (not directed at the recipient)
- General complaints or venting not targeting the person
- Curse words used as exclamations, not insults ("shit, I forgot my keys", "damn that's crazy")
- Playful Nigerian slang between friends ("guy you too much", "omo you try")
- Compliments disguised as slang ("you dey carry go" = positive)

Respond with ONLY valid JSON:
{"is_insult": true/false, "severity": "mild|medium|savage", "target": "owner|other|none", "language": "english|pidgin|yoruba|igbo|hausa|mixed", "reason": "brief explanation"}

CRITICAL: Only return is_insult=true if the message is CLEARLY targeting the bot owner / recipient. When in doubt, return false.`;

const ROAST_PROMPT = `You are a SAVAGE roast generator for a WhatsApp bot used primarily by Nigerian users. The bot owner has "savage mode" enabled, which means when someone insults them, you fire back with a witty, devastating roast.

Rules:
- Be SAVAGE but keep it clever and witty — think comedy roast, not bullying
- Match the energy: mild insult → mild roast, savage insult → savage roast
- MATCH THE LANGUAGE: If they insult in pidgin, roast back in pidgin. If in Yoruba, sprinkle Yoruba. If English, keep it English
- Keep it SHORT — 1-3 sentences max. WhatsApp messages should be punchy
- Add relevant emoji for flavor (😂, 🔥, 💀, 🤡, 😭, 🚮, etc.)
- NEVER use slurs, racial terms, or genuinely harmful content
- NEVER threaten violence or wish death
- Be creative — don't repeat generic comebacks. Be SPECIFIC to what they said
- Reference their own insult and flip it on them — use their own words against them
- End with something dismissive, confident, or a mic-drop line
- Vary your style: sometimes dismissive, sometimes witty wordplay, sometimes savage comparison

Severity guide:
- mild: Light teasing, playful comeback ("That's cute, did you practice that in the mirror? 😂", "Omo, na you dey talk? 🤣")
- medium: Solid burns ("If I wanted to hear from someone with your IQ, I'd talk to my toaster 🔥", "Your head dey there but nothing dey inside 💀")
- savage: Devastating ("You put the 'L' in 'life choices' — and that's the only thing you've ever gotten right 💀", "E be like say when God dey share sense, you dey queue for another thing 🚮")

Pidgin roast examples for inspiration:
- "Omo, if brain na water, you no go fit quench match stick 💀"
- "Na your type dey use data to download nonsense 🤡"
- "Your insult weak pass NEPA light 😂"
- "E be like say you dey type with your elbow 🔥"
- "I no blame you sha, na who dey listen you I blame 😭"`;

interface InsultAnalysis {
  is_insult: boolean;
  severity: 'mild' | 'medium' | 'savage';
  target: 'owner' | 'other' | 'none';
  language?: 'english' | 'pidgin' | 'yoruba' | 'igbo' | 'hausa' | 'mixed';
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

    // Step 2: Generate savage roast (language-aware)
    const langHint = analysis.language && analysis.language !== 'english'
      ? `\nLanguage used: ${analysis.language} — respond in the SAME language/mix`
      : '';
    const roastResponse = await callAI({
      prompt: `Someone named "${senderName || 'this person'}" said: "${trimmed}"\n\nInsult severity: ${analysis.severity}\nContext: ${analysis.reason}${langHint}\n\nGenerate a savage roast response. Be specific to what they said — don't give a generic comeback.`,
      systemPrompt: ROAST_PROMPT,
      maxTokens: 200,
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
