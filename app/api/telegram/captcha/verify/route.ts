import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, chatId, userId, turnstileToken } = body;

    if (!sessionId || !chatId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const secret = process.env.TURNSTILE_SECRET_KEY;
      if (!secret) {
        return NextResponse.json({ error: 'Turnstile not configured' }, { status: 503 });
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: turnstileToken,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 403 });
      }
    }

    // Mark user as verified in database
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('telegram_captcha_verifications').upsert({
      session_id: sessionId,
      chat_id: chatId,
      user_id: userId,
      verified_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CAPTCHA-VERIFY] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
