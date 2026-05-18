import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const BOTWAVE_CONTEXT = `You are BotWave's AI support assistant on the botwave.online website. You help users with questions about BotWave - a WhatsApp bot automation platform.

Key facts about BotWave:
- Users connect their WhatsApp by scanning a QR code on the dashboard
- 50+ bot commands available (prefix: !)
- Commands include: !ai (AI chat), !sticker, !download, !weather, !translate, !trivia, !logo, !poll, !scan (receipt scanner), !digest (group summary), !music, !viewonce, !antidelete, and many more
- AI features are powered by Google Gemini - no API key needed from users
- Anti-ban protection: human-like delays, message variation, rate limiting, session warmup
- Sessions run from the user's own device IP (reduces ban risk)
- Free tier: 300 messages/month, 10 AI queries/day, 1 session
- Study Hub: upload study materials, AI generates summaries, quiz questions, and flashcards
- The bot runs from the user's own WhatsApp - NOT a separate number
- Privacy: BotWave only responds to commands, no messages are stored or shared
- To get started: sign up at botwave.online, go to dashboard, click "Connect WhatsApp", scan QR code

If you don't know the answer, suggest the user create a support ticket through the chat widget or try !help in WhatsApp for a full command guide.

Keep responses concise, friendly, and helpful. Use simple language.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';

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

    try {
      const answer = await callAI({
        prompt: question,
        maxTokens: 300,
        temperature: 0.5,
        systemPrompt: BOTWAVE_CONTEXT,
      });

      return NextResponse.json({
        success: true,
        data: {
          answer,
          confidence: 1,
          related: [],
        },
      });
    } catch (aiError) {
      console.error('[SUPPORT-CHAT] AI error:', aiError);
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
