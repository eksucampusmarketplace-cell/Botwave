// app/api/evolution/webhook/route.ts
// Receives webhooks from Evolution API and routes them through the existing
// MessageHandler + anti-ban pipeline.
// Includes a retry queue: if message processing fails, the webhook payload is
// enqueued for later retry with exponential backoff.

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
      const statusCode = data?.statusCode || data?.disconnectionReasonCode;
      console.log(`[EVO-WEBHOOK] connection.update for ${sessionId}: state=${state} statusCode=${statusCode}`);

      if (state === 'open') {
        // Check if this is a first-time connection (pairing just completed)
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state, phone_number')
          .eq('id', sessionId)
          .single();

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

        // Send one-time welcome message when pairing/QR scan completes for the first time.
        // Triggers on any pre-active state (pairing_sent, qr_pending, connecting) — not
        // on reconnections from 'inactive' (those are auto-reconnects, not first time).
        const isFirstConnection = current?.state && ['pairing_sent', 'qr_pending', 'connecting'].includes(current.state);
        if (isFirstConnection && current?.phone_number) {
          const dashUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
          const welcomeMessages = [
            `Hey there! 👋 BotWave is now connected to your WhatsApp.\n\n` +
            `Here are a few things to get started:\n` +
            `• Type *!help* in any chat to see all commands\n` +
            `• Add BotWave to your homescreen for quick access: ${dashUrl}\n\n` +
            `⚠️ *Important — Please read:*\n` +
            `1. Don't spam or send excessive automated messages. Other WhatsApp users can report your number, which may lead to account restrictions. We are not responsible for any account loss — use wisely!\n` +
            `2. *Your bot can disconnect* if WhatsApp drops the session or if our server restarts. If your bot stops responding, go to your dashboard at ${dashUrl} and reconnect. You are in control of your session.\n\n` +
            `_Created by Decisive Analyst_`,

            `Welcome to BotWave! 🚀 Your WhatsApp bot is live.\n\n` +
            `Quick start:\n` +
            `• Send *!help* anywhere to explore commands\n` +
            `• Bookmark the dashboard: ${dashUrl}\n\n` +
            `⚠️ *Things you should know:*\n` +
            `1. Avoid spamming or flooding chats with bot messages. If other users report you, WhatsApp may restrict or ban your number. We're not responsible for any account actions.\n` +
            `2. *Disconnections can happen* — if the bot stops working, visit ${dashUrl} and reconnect your session. The bot doesn't stay online forever on its own.\n\n` +
            `_Powered by Decisive Analyst_`,

            `You're all set! ✨ BotWave is connected and ready.\n\n` +
            `Get started:\n` +
            `• Try *!help* to see everything your bot can do\n` +
            `• Save the dashboard for easy access: ${dashUrl}\n\n` +
            `⚠️ *Keep in mind:*\n` +
            `1. Don't overuse or spam automated messages — if users report your number, WhatsApp could ban it. We take no responsibility for account loss, so use your bot wisely!\n` +
            `2. *Your bot session may disconnect* sometimes. When it does, just go to ${dashUrl} and click reconnect. You're always in control.\n\n` +
            `_Built by Decisive Analyst_`,
          ];
          const welcomeText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
          const selfJid = current.phone_number.replace(/\D/g, '');

          try {
            const { sendText } = await import('@/bot/evolutionClient');
            await sendText(sessionId, selfJid, welcomeText);
            console.log(`[EVO-WEBHOOK] Sent welcome message to ${selfJid} for session ${sessionId}`);
          } catch (err) {
            console.error(`[EVO-WEBHOOK] Failed to send welcome message for ${sessionId}:`, err);
          }
        }
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
          // Temporary disconnect — preserve auth state so Evolution API can
          // auto-reconnect without forcing the user to re-pair.  Only clear
          // transient fields (locks, QR) so the sync loop picks this up.
          console.log(`[EVO-WEBHOOK] Session ${sessionId} was active, now ${state} — setting inactive (auth preserved for auto-reconnect)`);
          await supabase.from('bot_sessions')
            .update({
              state: 'inactive',
              qr_code: null,
              qr_expires_at: null,
              qr_generated_at: null,
              pairing_code: null,
              locked_by: null,
              locked_at: null,
              heartbeat_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        } else {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${current?.state ?? 'unknown'} got close/refused — ignoring (handled by sync loop)`);
        }
        // If state is qr_pending/pairing_sent/connecting, leave it alone —
        // the BotManager sync loop handles reconnection during pairing.
      } else if (state === 'connecting') {
        // Only update to qr_pending if not already in a pairing or active state.
        // "active" is preserved because the bot may be auto-reconnecting after a
        // redeploy — changing to qr_pending would trigger the sync loop to
        // create a duplicate bot and force a fresh pairing code.
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state')
          .eq('id', sessionId)
          .single();

        if (current?.state !== 'pairing_sent' && current?.state !== 'active') {
          await supabase.from('bot_sessions')
            .update({
              state: 'qr_pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        } else {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${current?.state} got connecting — preserving state (reconnect in progress)`);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Instance logout (WhatsApp terminated the linked device) ---
    if (event === 'logout.instance') {
      console.log(`[EVO-WEBHOOK] logout.instance for ${sessionId} — clearing all auth data and locks`);
      await supabase.from('bot_sessions')
        .update({
          state: 'needs_reauth',
          qr_code: null,
          qr_expires_at: null,
          qr_generated_at: null,
          pairing_code: null,
          auth_state: null,
          locked_by: null,
          locked_at: null,
          heartbeat_at: null,
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
        .select('id, user_id, phone_number, state')
        .eq('id', sessionId)
        .single();

      if (!session) {
        console.warn(`[EVO-WEBHOOK] No session found for instance: ${sessionId}`);
        return NextResponse.json({ ok: true });
      }

      // Auto-correct session state: if we're receiving messages from
      // Evolution API but the DB thinks the session is qr_pending/pairing_sent,
      // the instance is clearly connected — update the state to active.
      if (session.state && session.state !== 'active' && session.state !== 'needs_reauth') {
        const hasFromMe = messages.some((m: any) => m.key?.fromMe);
        if (hasFromMe) {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${session.state} but receiving fromMe messages — auto-correcting to active`);
          await supabase.from('bot_sessions')
            .update({
              state: 'active',
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        }
      }

      // Log and filter messages synchronously, then fire-and-forget the
      // actual processing.  Anti-ban delays inside handleMessage can take
      // 30-120 s, which exceeds Render's 30 s request timeout and causes
      // the handler to be killed before processCommand is reached.
      const commandMsgs: any[] = [];
      const statusMsgs: any[] = [];
      const cacheMsgs: any[] = [];
      for (const msg of messages) {
        const from = msg.key?.remoteJid || 'unknown';
        const fromMe = msg.key?.fromMe;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';
        console.log(`[EVO-WEBHOOK] msg from=${from} fromMe=${fromMe} text="${text.slice(0, 80)}"`);

        // Route status broadcasts to the StatusViewer handler (respects
        // the autoview toggle which defaults to OFF).
        if (from === 'status@broadcast') {
          statusMsgs.push(msg);
          continue;
        }

        // Cache every non-status message for anti-delete recovery
        cacheMsgs.push(msg);

        // Allow fromMe messages that start with command prefix (userbot mode)
        // This lets the bot owner send !help, !ping, etc. from their own number
        if (fromMe && !text.trimStart().startsWith('!')) continue;
        commandMsgs.push(msg);
      }

      // Fire-and-forget: process messages in the background so the webhook
      // response is returned immediately (avoids Render 30 s timeout killing
      // the handler mid-delay).
      if (commandMsgs.length > 0 || statusMsgs.length > 0 || cacheMsgs.length > 0) {
        // Lazy-import to avoid circular dependencies and keep Next.js bundle clean
        const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
        const { handleMessage } = await import('@/bot/handlers/MessageHandler');
        const { handleStatusUpdate } = await import('@/bot/handlers/StatusViewer');
        const { MessageQueue } = await import('@/bot/utils/MessageQueue');
        const { cacheMessage } = await import('@/bot/handlers/AntiDeleteHandler');

        const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id, session.phone_number);
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        // Use void to fire-and-forget — do NOT await
        void (async () => {
          // Cache messages for anti-delete recovery (non-blocking)
          for (const msg of cacheMsgs) {
            cacheMessage(session.id, msg).catch(() => {});
          }

          // Process status broadcasts via StatusViewer (checks autoview toggle)
          for (const msg of statusMsgs) {
            try {
              await handleStatusUpdate(msg, sock, session.id, session.user_id);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling status for ${sessionId}:`, err);
            }
          }

          for (const msg of commandMsgs) {
            try {
              await handleMessage(msg, sock, queue);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling message for ${sessionId}:`, err);
              // Enqueue for retry so the message isn't lost
              try {
                const { enqueueWebhookRetry, logHealthEvent } = await import('@/bot/database');
                await enqueueWebhookRetry(session.id, 'messages.upsert', msg, String(err));
                await logHealthEvent(session.id, 'webhook_retry', `Message processing failed: ${String(err).slice(0, 200)}`);
              } catch { /* retry enqueue itself is non-critical */ }
            }
          }
        })();
      }

      return NextResponse.json({ ok: true });
    }

    // --- Deleted messages (anti-delete) ---
    // Evolution API fires 'messages.delete' when a message is revoked/deleted.
    // The payload contains the message key with status 'DELETED'.
    if (event === 'messages.delete') {
      const deletedKey = data;
      if (deletedKey?.id && deletedKey?.remoteJid) {
        const { data: session } = await supabase
          .from('bot_sessions')
          .select('id, user_id')
          .eq('id', sessionId)
          .single();

        if (session) {
          // Build a synthetic revoke message matching the Baileys protocolMessage format
          // so handleMessageRevoke can process it uniformly.
          const revokeMsg = {
            key: {
              remoteJid: deletedKey.remoteJid,
              fromMe: deletedKey.fromMe ?? false,
              id: `revoke_${deletedKey.id}`,
              participant: deletedKey.participant,
            },
            message: {
              protocolMessage: {
                type: 0,
                key: {
                  remoteJid: deletedKey.remoteJid,
                  fromMe: deletedKey.fromMe ?? false,
                  id: deletedKey.id,
                  participant: deletedKey.participant,
                },
              },
            },
          };

          void (async () => {
            try {
              const { handleMessageRevoke } = await import('@/bot/handlers/AntiDeleteHandler');
              await handleMessageRevoke(revokeMsg, session.id, session.user_id);
              console.log(`[EVO-WEBHOOK] Processed message delete for ${sessionId}: msgId=${deletedKey.id}`);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling message delete for ${sessionId}:`, err);
            }
          })();
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Edited messages (may include revoke protocolMessages) ---
    // Evolution API fires 'messages.edited' for protocolMessages, which
    // includes both edits and revokes (type 0). Handle revokes here as
    // a belt-and-suspenders alongside messages.delete.
    if (event === 'messages.edited') {
      const editedMsg = data;
      if (editedMsg?.type === 0 && editedMsg?.key?.id) {
        const { data: session } = await supabase
          .from('bot_sessions')
          .select('id, user_id')
          .eq('id', sessionId)
          .single();

        if (session) {
          const revokeMsg = {
            key: {
              remoteJid: editedMsg.key.remoteJid,
              fromMe: editedMsg.key.fromMe ?? false,
              id: `revoke_edited_${editedMsg.key.id}`,
              participant: editedMsg.key.participant,
            },
            message: {
              protocolMessage: {
                type: 0,
                key: editedMsg.key,
              },
            },
          };

          void (async () => {
            try {
              const { handleMessageRevoke } = await import('@/bot/handlers/AntiDeleteHandler');
              await handleMessageRevoke(revokeMsg, session.id, session.user_id);
              console.log(`[EVO-WEBHOOK] Processed edited/revoke for ${sessionId}: msgId=${editedMsg.key.id}`);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling edited/revoke for ${sessionId}:`, err);
            }
          })();
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

        const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id, session.phone_number);
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        try {
          await handleGroupParticipantsUpdate(data, sock, session.id, session.user_id, queue);
        } catch (err) {
          console.error(`[EVO-WEBHOOK] Error handling group update for ${sessionId}:`, err);
        }
      }

      return NextResponse.json({ ok: true });
    }

    console.log(`[EVO-WEBHOOK] Unhandled event=${event} for session=${sessionId} — ignoring`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[EVO-WEBHOOK] CRITICAL ERROR processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
