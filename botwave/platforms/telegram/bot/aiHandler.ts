/**
 * AI Handler for Telegram Bot
 * 
 * Uses Groq API for fast AI responses in Telegram messages.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function getAIResponse(
  sessionId: string,
  question: string,
  userName: string,
): Promise<string> {
  if (!GROQ_API_KEY) {
    return 'AI is not configured. Please add a GROQ_API_KEY in the environment.';
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are Botwave, a friendly and helpful Telegram bot assistant. ' +
              'Reply in a natural, concise, and helpful way. Use emojis sparingly. ' +
              'Keep responses under 500 words unless the question requires more detail.',
          },
          {
            role: 'user',
            content: `User "${userName}" asks: ${question}`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`[AI:${sessionId}] Groq API error: ${response.status}`);
      return 'AI is temporarily unavailable. Please try again.';
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text || 'I could not generate a response. Try rephrasing your question.';
  } catch (err) {
    console.error(`[AI:${sessionId}] Error:`, err);
    return 'An error occurred while processing your request.';
  }
}
