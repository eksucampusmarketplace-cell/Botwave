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

/**
 * Extract the session/instance name from the webhook payload.
 * Evolution API sends `instance` as a plain string (the instance name),
 * but older integrations may send it as `{ instanceName: "..." }`.
 */
function resolveSessionId(instance: unknown): string | null {
  if (typeof instance === 'string') return instance;
  if (instance && typeof instance === 'object' && 'instanceName' in instance) {
    return (instance as Record<string, string>).instanceName || null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instance, data, event } = body;

    const sessionId = resolveSessionId(instance);

    if (!sessionId) {
      console.warn('[EVO-WEBHOOK] No session ID in payload:', JSON.stringify({ event, instance }).slice(0, 200));
      return NextResponse.json({ ok: true });
    }

    console.log(`[EVO-WEBHOOK] event=${event} session=${sessionId}`);

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
        // Only set needs_reauth if the session was previously active.
        // During pairing/connecting, 'close' events are normal reconnection
        // cycles — don't nuke the session state.
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state')
          .eq('id', sessionId)
          .single();

        if (current?.state === 'active') {
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
        // If state is qr_pending/pairing_sent/connecting, leave it alone —
        // the BotManager sync loop handles reconnection during pairing.
      } else if (state === 'connecting') {
        // Only update to qr_pending if not already in a pairing state
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state')
          .eq('id', sessionId)
          .single();

        if (current?.state !== 'pairing_sent') {
          await supabase.from('bot_sessions')
            .update({
              state: 'qr_pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Instance logout (WhatsApp terminated the linked device) ---
    if (event === 'logout.instance') {
      console.log(`[EVO-WEBHOOK] logout.instance for ${sessionId}`);
      await supabase.from('bot_sessions')
        .update({
          state: 'needs_reauth',
          qr_code: null,
          pairing_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return NextResponse.json({ ok: true });
    }

    // --- QR code / pairing code updates ---
    if (event === 'qrcode.updated') {
      const pairingCode = data?.pairingCode || data?.qrcode?.pairingCode;
      const qrBase64 = data?.base64 || data?.qrcode?.base64;
      const qrCode = data?.code || data?.qrcode?.code;

      console.log(`[EVO-WEBHOOK] qrcode.updated for ${sessionId}: pairing=${!!pairingCode} qr=${!!qrCode}`);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (pairingCode) {
        updates.pairing_code = pairingCode;
        updates.state = 'pairing_sent';
      }
      if (qrCode) {
        updates.qr_code = qrCode;
        updates.qr_generated_at = new Date().toISOString();
        updates.qr_expires_at = new Date(Date.now() + 60_000).toISOString();
      }

      if (Object.keys(updates).length > 1) {
        await supabase.from('bot_sessions').update(updates).eq('id', sessionId);
      }

      return NextResponse.json({ ok: true });
    }

    // --- Incoming messages ---
    // Evolution API fires 'messages.upsert' per message (single object),
    // not as an array. Normalize to array for uniform handling.
    if (event === 'messages.upsert') {
      const messages = Array.isArray(data) ? data : (data ? [data] : []);

      console.log(`[EVO-WEBHOOK] messages.upsert for ${sessionId}: count=${messages.length}`);

      if (messages.length === 0) {
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
      const { handleMessage } = await import('@/bot/handlers/MessageHandler');
      const { MessageQueue } = await import('@/bot/utils/MessageQueue');

      const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id);
      const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

      for (const msg of messages) {
        const from = msg.key?.remoteJid || 'unknown';
        const fromMe = msg.key?.fromMe;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';
        console.log(`[EVO-WEBHOOK] msg from=${from} fromMe=${fromMe} text="${text.slice(0, 80)}"`);

        // Allow fromMe messages that start with command prefix (userbot mode)
        // This lets the bot owner send !help, !ping, etc. from their own number
        if (fromMe && !text.trimStart().startsWith('!')) continue;
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
