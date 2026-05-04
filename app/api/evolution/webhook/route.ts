// app/api/evolution/webhook/route.ts
// Receives webhooks from Evolution API and routes them through the existing
// MessageHandler + anti-ban pipeline.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instance, data, event } = body;

    if (!instance?.instanceName) {
      return NextResponse.json({ ok: true });
    }

    const sessionId = instance.instanceName;
    const supabase = getSupabase();

    // --- Connection state changes ---
    if (event === 'connection.update') {
      const state = data?.state;
      console.log(`[EVO-WEBHOOK] connection.update for ${sessionId}: ${state}`);

      if (state === 'open') {
        await supabase.from('bot_sessions')
          .update({
            state: 'active',
            last_active: new Date().toISOString(),
            qr_code: null,
            qr_expires_at: null,
            qr_generated_at: null,
            pairing_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      } else if (state === 'close' || state === 'refused') {
        await supabase.from('bot_sessions')
          .update({
            state: 'needs_reauth',
            qr_code: null,
            qr_expires_at: null,
            qr_generated_at: null,
            pairing_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      }

      return NextResponse.json({ ok: true });
    }

    // --- Incoming messages ---
    // Evolution API fires 'messages.upsert' for incoming messages.
    // We dynamically import the handler to avoid bundling bot code in Next.js
    // edge runtime. The handler + anti-ban pipeline run in the same process.
    if (event === 'messages.upsert') {
      const messages = data || [];
      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ ok: true });
      }

      // Look up session info for the handler
      const { data: session } = await supabase
        .from('bot_sessions')
        .select('id, user_id, phone_number')
        .eq('id', sessionId)
        .single();

      if (!session) {
        console.warn(`[EVO-WEBHOOK] No session found for instance: ${sessionId}`);
        return NextResponse.json({ ok: true });
      }

      // Lazy-import to avoid circular dependencies and keep Next.js bundle clean
      const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
      const { handleMessage, handleGroupParticipantsUpdate } = await import('@/bot/handlers/MessageHandler');
      const { MessageQueue } = await import('@/bot/utils/MessageQueue');

      const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id);
      const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

      for (const msg of messages) {
        if (msg.key?.fromMe) continue;
        try {
          await handleMessage(msg, sock, queue);
        } catch (err) {
          console.error(`[EVO-WEBHOOK] Error handling message for ${sessionId}:`, err);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Group participant updates ---
    if (event === 'group-participants.update') {
      const { data: session } = await getSupabase()
        .from('bot_sessions')
        .select('id, user_id, phone_number')
        .eq('id', sessionId)
        .single();

      if (session && data) {
        const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
        const { handleGroupParticipantsUpdate } = await import('@/bot/handlers/MessageHandler');
        const { MessageQueue } = await import('@/bot/utils/MessageQueue');

        const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id);
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        try {
          await handleGroupParticipantsUpdate(data, sock, session.id, session.user_id, queue);
        } catch (err) {
          console.error(`[EVO-WEBHOOK] Error handling group update for ${sessionId}:`, err);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[EVO-WEBHOOK] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
