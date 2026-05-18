// ─── Savage Mode (NLP-Enhanced) ─────────────────────────────────────────────
//
// Auto-detects insults directed at the bot owner and fires back with
// AI-generated roasts. Uses Groq → Gemini fallback (multi-key rotation)
// for both detection and roast generation. Only triggers for messages
// from OTHER users (not fromMe), and only when the user has enabled
// "savage" mode.
//
// NLP enhancements:
//   - Extended pidgin/slang insult patterns (Yoruba, Igbo, Hausa)
//   - Contextual awareness via quoted messages
//   - Tone-adaptive roasting (matches insult language)
//   - Language-matched responses (pidgin insult → pidgin roast)

import { getFeatureEnabled } from '../../database';

// ─── Insult Detection ────────────────────────────────────────────────────────

// Common insult patterns (English + Nigerian pidgin / slang / Yoruba / Igbo / Hausa)
const INSULT_PATTERNS = [
  // Direct insults
  /\b(?:stupid|dumb|idiot|fool|foolish|moron|loser|trash|useless|pathetic|lame|boring|ugly|fat|skinny|weak|dull|slow|clown|joke|fraud|scam|fake|wack|wicked|evil|horrible|terrible|awful|disgusting|nasty|smelly|dirty|crazy|mad|insane|psycho|creep|freak|nerd|geek|noob|simp|cringe|weird|annoying|irritating|retard|dumbass|jackass|dimwit|halfwit|numbskull|dense|braindead|clueless|hopeless|worthless|incompetent)\b/i,
  // Profanity
  /\b(?:fuck|shit|bitch|ass|dick|cock|bastard|damn|hell|crap|suck|wtf|stfu|shut up|go away|get lost|piss off|screw you|hate you|die|kill yourself|kys|foh|gtfo|pos|sob)\b/i,
  // Nigerian pidgin / slang insults
  /\b(?:mumu|olodo|ode|werey|agbaya|olofo|ashawo|alaye|omo ale|oponu|oloriburuku|oniranu|were|arankan|gbegiri|alakoba|jaguda|area boy|agbero|ori e ti daru|efulefu|ewu|anuofia|onye nzuzu|nzuzu|oku|ofeke)\b/i,
  // Extended Yoruba / Igbo / Hausa insults
  /\b(?:oloshi|oshi|yeye|koboko|banza|dan iska|wawa|shegiya|mahaukaci|taurin mutum|barawo|karuwai|uburu|ofe oku|agaba|okoro|ofe nsi|nkakwu|asampete|eranko|oku nla|gboju|olorigbese|anini|alabosi|ayeloja)\b/i,
  // Modern Nigerian internet slang insults
  /\b(?:razz|local|poverty mentality|broke boy|broke girl|nothing person|village person|sapa boy|sapa girl|omo igboro|danfo brain|keke mind|church rat|copy copy|follow follow|bootleg|wannabe|poser|pretender|clout chaser|attention seeker)\b/i,
  // Insult phrases (pidgin)
  /(?:you (?:be|dey|na)|na you (?:be|dey)) (?:mugu|fool|mumu|mad|crazy|clown|joke|useless|stupid|dumb|olodo|ode|werey|razz|local|broke|nothing)/i,
  /(?:your (?:head|brain|sense|papa|mama|family|life|face)) (?:no |dey |need |is |be |na )/i,
  /(?:you no get|you lack|you dey|you too|you just dey) (?:sense|brain|shame|home training|manners)/i,
  /(?:thunder|God|heaven) (?:fire|punish|strike|judge|flog) (?:you|am|una)/i,
  /(?:go and|go|comot|carry yourself) (?:die|sit down|sleep|rest|disappear|away|park well)/i,
  // English insult phrases
  /(?:you(?:'re| are)) (?:so |such )?(?:a )?(?:stupid|dumb|idiot|fool|loser|trash|useless|pathetic|lame|boring|ugly|clown|joke|waste|disgrace|disappointment|nobody)/i,
  /(?:nobody|no one) (?:likes|cares about|wants|asked) you/i,
  /(?:shut|close) (?:up|your (?:mouth|trap|face))/i,
  // Sarcastic insult patterns
  /(?:oh )?(?:wow|wooow|wowww) (?:you're|you are|ur) (?:so|sooo|soooo) (?:smart|clever|brilliant|funny|cool|special)/i,
  /(?:great|fantastic|wonderful|amazing) (?:job|work|effort)[,.]? (?:genius|einstein|professor|mr smart|mrs smart)/i,
  /(?:clap for yourself|give yourself (?:a )?medal|pat yourself)/i,
];

// Detect if the insult uses pidgin/slang (for language-matched roasts)
const PIDGIN_MARKERS = /\b(?:abeg|wetin|na|abi|sef|sha|dey|no be|e be like|wahala|omo|oya|joor|shey|werey|ode|mumu|olodo|sabi|jara|shege|chale|chai|walahi|wallahi|bros|baba|madam|oga|see finish|no cap|on god|e choke)\b/i;

// Quick regex check before calling AI
export function quickInsultCheck(text: string): boolean {
  return INSULT_PATTERNS.some((re) => re.test(text));
}

// ─── AI-Powered Detection & Response ─────────────────────────────────────────

const DETECT_PROMPT = `You are an advanced insult detector for a WhatsApp bot. The bot owner uses this bot from their personal number. Determine if the incoming message is an insult, disrespect, or verbal attack directed at the person receiving it (the bot owner / the person whose WhatsApp this bot runs on).

Context: This is a message from SOMEONE ELSE to the bot owner's WhatsApp. The bot owner is the recipient.

Detect these categories:
- Direct insults ("you're stupid", "idiot", "mumu")
- Nigerian pidgin insults ("mumu", "olodo", "ode", "werey", "agbaya", "ori e ti daru")
- Yoruba insults ("oloshi", "alagbara", "oloriburuku")
- Igbo insults ("onye nzuzu", "anuofia", "efulefu")
- Hausa insults ("banza", "dan iska", "wawa", "shegiya")
- Subtle disrespect ("nobody asked you", "you're not that important", "stay in your lane")
- Sarcastic insults ("oh wow you're sooo smart", "great job genius", "clap for yourself")
- Aggressive tone ("shut up", "go away", "piss off", "comot")
- Backhanded compliments ("you're smart for someone like you")
- Dismissive contempt ("who even are you", "I no send you", "you no reach")

DO NOT flag:
- Friendly banter with obvious humor markers (lol, 😂, jk, 😄, haha)
- Self-deprecating statements
- Messages about third parties (not directed at the recipient)
- General complaints not targeting the person
- Curse words used as exclamations, not insults ("shit, I forgot my keys")
- Quotes or song lyrics that happen to contain strong language

Also detect the LANGUAGE of the insult:
- "english" for standard English
- "pidgin" for Nigerian pidgin / street slang
- "yoruba" for Yoruba-heavy text
- "igbo" for Igbo-heavy text
- "mixed" for a blend

Respond with ONLY valid JSON:
{"is_insult": true/false, "severity": "mild|medium|savage", "target": "owner|other|none", "language": "english|pidgin|yoruba|igbo|mixed", "reason": "brief explanation"}

CRITICAL: Only return is_insult=true if the message is CLEARLY targeting the bot owner / recipient.`;

const ROAST_PROMPT = `You are a savage roast generator for a WhatsApp bot. The bot owner has "savage mode" enabled, which means when someone insults them, you fire back with a witty, devastating roast.

Rules:
- Be SAVAGE but keep it clever and witty - think comedy roast, not bullying
- Match the energy: mild insult → mild roast, savage insult → savage roast
- MATCH THE LANGUAGE: if the insult is in Nigerian pidgin, roast back in pidgin. If English, use English. If Yoruba-heavy, mix Yoruba in.
- Keep it SHORT - 1-3 sentences max. WhatsApp messages should be punchy
- Add relevant emoji for flavor (😂, 🔥, 💀, 🤡, etc.)
- NEVER use slurs, racial terms, or genuinely harmful content
- NEVER threaten violence
- Be creative - don't repeat generic "your mama" jokes
- Reference their own insult and flip it on them
- End with something dismissive or confident

Language-specific style:
- pidgin: "Omo, your head dey there? Na empty room full of echo 😂" / "Abeg close your mouth, your breath dey scatter WiFi 💀"
- yoruba: "Ori e ti daru, oshi. Even your village people don tire for you 😂"
- igbo: "Nwanne, your brain na pure efulefu. Even generator get more sense than you 🔥"
- english: "If I wanted to hear from someone with your IQ, I'd talk to my toaster 🔥"

Severity guide:
- mild: Light teasing, playful comeback ("That's cute, did you practice that in the mirror? 😂")
- medium: Solid burns ("If brains were dynamite, you wouldn't have enough to blow your nose 🔥")
- savage: Devastating ("You put the 'L' in 'life choices' - and that's the only thing you've ever gotten right 💀")`;

interface InsultAnalysis {
  is_insult: boolean;
  severity: 'mild' | 'medium' | 'savage';
  target: 'owner' | 'other' | 'none';
  language: 'english' | 'pidgin' | 'yoruba' | 'igbo' | 'mixed';
  reason: string;
}

/**
 * Check if a message is an insult directed at the bot owner and generate
 * a savage roast response if savage mode is enabled.
 *
 * Supports optional quoted message context for better detection.
 * Returns the roast text if triggered, null otherwise.
 */
export async function processSavageMode(
  text: string,
  userId: string,
  fromMe: boolean,
  senderName?: string,
  quotedText?: string,
): Promise<string | null> {
  // Only trigger for messages FROM others, not the owner
  if (fromMe) return null;

  // Check if savage mode is enabled
  const enabled = await getFeatureEnabled(userId, 'savage');
  if (!enabled) return null;

  // Quick regex pre-filter - skip obviously non-insult messages
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 500) return null;

  // First pass: quick regex check
  const quickMatch = quickInsultCheck(trimmed);

  // If no quick match, use AI to check (handles subtle insults)
  // But only for messages that look somewhat aggressive (length > 5)
  if (!quickMatch && trimmed.length < 6) return null;

  // Detect language for response matching
  const isPidgin = PIDGIN_MARKERS.test(trimmed);

  try {
    const { callAI } = await import('../../../lib/ai-provider');

    // Step 1: Detect if it's actually an insult targeting the owner
    let detectPrompt = `Message from "${senderName || 'Someone'}": "${trimmed}"`;
    if (quotedText) {
      detectPrompt += `\n(Replying to: "${quotedText.slice(0, 150)}")`;
    }
    detectPrompt += '\n\nIs this an insult directed at the recipient?';

    const detectResponse = await callAI({
      prompt: detectPrompt,
      systemPrompt: DETECT_PROMPT,
      maxTokens: 120,
      temperature: 0.1,
    });

    const cleanDetect = detectResponse
      .replace(/```json\n?|\n?```/g, '')
      .trim();

    const jsonMatch = cleanDetect.match(/\{[^{}]*\}/);
    if (!jsonMatch) return null;

    const analysis: InsultAnalysis = JSON.parse(jsonMatch[0]);

    if (!analysis.is_insult || analysis.target !== 'owner') return null;

    // Default language detection from regex if AI didn't specify
    const lang = analysis.language || (isPidgin ? 'pidgin' : 'english');

    console.log(`[SAVAGE] Insult detected from ${senderName}: severity=${analysis.severity}, lang=${lang}, reason=${analysis.reason}`);

    // Step 2: Generate savage roast (language-matched)
    let roastPrompt = `Someone named "${senderName || 'this person'}" said: "${trimmed}"`;
    roastPrompt += `\n\nInsult severity: ${analysis.severity}`;
    roastPrompt += `\nInsult language: ${lang}`;
    roastPrompt += `\nContext: ${analysis.reason}`;
    const langInstructions: Record<string, string> = {
      english: 'English',
      pidgin: 'Nigerian pidgin',
      yoruba: 'Yoruba-flavored pidgin',
      igbo: 'Igbo-flavored pidgin',
      mixed: 'a mix of pidgin and English',
    };
    roastPrompt += `\n\nGenerate a savage roast response in ${langInstructions[lang] || 'English'}.`;

    const roastResponse = await callAI({
      prompt: roastPrompt,
      systemPrompt: ROAST_PROMPT,
      maxTokens: 150,
      temperature: 0.9,
    });

    const roast = roastResponse.trim();
    if (!roast || roast.length < 5) return null;

    console.log(`[SAVAGE] Roast generated (${lang}): "${roast.slice(0, 60)}..."`);
    return roast;
  } catch (err) {
    console.error('[SAVAGE] Error:', err);
    return null;
  }
}
