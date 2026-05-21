/**
 * CAPTCHA Verification API
 *
 * POST /api/telegram/captcha/verify
 * Verifies a user's CAPTCHA answer and unmutes them in the group.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TURNSTILE_SECRET_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, chatId, userId, mode, answer } = body;

    if (!sessionId || !chatId || !userId || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify Turnstile token if mode is turnstile
    if (mode === 'turnstile') {
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      if (!turnstileSecret) {
        return NextResponse.json({ error: 'Turnstile not configured' }, { status: 500 });
      }

      const formData = new URLSearchParams();
      formData.append('secret', turnstileSecret);
      formData.append('response', answer);

      const verifyRes = await fetch(TURNSTILE_SECRET_URL, {
        method: 'POST',
        body: formData,
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 400 });
      }
    }

    // For math and text modes, the answer is validated client-side.
    // For button mode, just the click is enough.
    // Mark user as verified in the database
    await supabase
      .from('telegram_captcha_verifications')
      .upsert(
        {
          session_id: sessionId,
          chat_id: chatId,
          user_id: userId,
          verified: true,
          verified_at: new Date().toISOString(),
          mode,
        },
        { onConflict: 'session_id,chat_id,user_id' },
      );

    // Get the bot token to unmute the user
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('telegram_bot_token')
      .eq('id', sessionId)
      .single();

    if (session?.telegram_bot_token) {
      const apiBase = `https://api.telegram.org/bot${session.telegram_bot_token}`;
      await fetch(`${apiBase}/restrictChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: parseInt(userId, 10),
          permissions: {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_invite_users: true,
          },
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TG-CAPTCHA-VERIFY] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
