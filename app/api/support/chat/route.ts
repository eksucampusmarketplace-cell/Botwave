import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';
import { searchKnowledgeBase, getBotwaveSystemPrompt, detectLanguage } from '@/lib/botwave-knowledge';

export const dynamic = 'force-dynamic';

const HUMAN_KEYWORDS = ['talk to human', 'speak to agent', 'contact support', 'real person', 'human agent', 'speak to someone', 'live agent', 'talk to support'];

// Per-session conversation history (kept in memory for stateless API)
const conversationHistory = new Map<string, { role: string; content: string }[]>();

// Cleanup old conversations every 10 minutes
setInterval(() => {
  if (conversationHistory.size > 500) conversationHistory.clear();
}, 10 * 60 * 1000);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : 'anonymous';

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 },
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Question too long (max 500 characters)' },
        { status: 400 },
      );
    }

    // Human escalation check
    const wantsHuman = HUMAN_KEYWORDS.some(kw => question.toLowerCase().includes(kw));
    if (wantsHuman) {
      return NextResponse.json({
        success: true,
        data: {
          answer: "I'll connect you with a human support agent. Please create a support ticket using the **Tickets** tab — our team typically responds within a few hours.\n\nYou can also describe your issue here and I'll include it in the ticket.",
          confidence: 1,
          related: [],
          wantsHuman: true,
        },
      });
    }

    // Detect language
    const detectedLang = detectLanguage(question);

    // RAG: search knowledge base for relevant context
    const searchResults = searchKnowledgeBase(question, 3);
    const contextText = searchResults.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n');

    // Get conversation history
    const history = conversationHistory.get(sessionId) || [];
    const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    const systemPrompt = getBotwaveSystemPrompt(contextText);
    const langInstruction = detectedLang !== 'en'
      ? `\nIMPORTANT: The user is writing in a non-English language (detected: ${detectedLang}). Respond in the SAME language the user is writing in.`
      : '';

    const userPrompt = historyText
      ? `Previous conversation:\n${historyText}\n\nUser: ${question}\n\nAssistant:`
      : question;

    try {
      const answer = await callAI({
        prompt: userPrompt,
        maxTokens: 300,
        temperature: 0.5,
        systemPrompt: systemPrompt + langInstruction,
      });

      // Store in conversation history
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: answer });
      if (history.length > 20) history.splice(0, history.length - 20);
      conversationHistory.set(sessionId, history);

      // Check if AI is unsure — suggest human escalation
      const unsurePhrases = ["don't know", "not sure", "can't answer", "no information", "i'm unable"];
      const isUnsure = unsurePhrases.some(phrase => answer.toLowerCase().includes(phrase));

      let finalAnswer = answer;
      if (isUnsure) {
        finalAnswer += "\n\nIf you need more help, type **'talk to human'** to connect with our support team.";
      }

      return NextResponse.json({
        success: true,
        data: {
          answer: finalAnswer,
          confidence: searchResults.length > 0 ? 0.8 : 0.5,
          related: searchResults.slice(0, 3).map(r => r.question),
          detectedLanguage: detectedLang !== 'en' ? detectedLang : undefined,
        },
      });
    } catch (aiError) {
      console.error('[SUPPORT-CHAT] AI error:', aiError);

      // Fallback: use knowledge base directly if AI is down
      if (searchResults.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            answer: searchResults[0].answer,
            confidence: 0.6,
            related: searchResults.slice(1).map(r => r.question),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          answer: "I'm having trouble connecting to AI right now. Please try again in a moment, or create a support ticket for help from our team!",
          confidence: 0,
          related: [],
        },
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
