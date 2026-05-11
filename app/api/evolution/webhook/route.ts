// app/api/evolution/webhook/route.ts
// Receives webhooks from Evolution API and routes them through the existing
// MessageHandler + anti-ban pipeline.
// Includes a retry queue: if message processing fails, the webhook payload is
// enqueued for later retry with exponential backoff.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedSession, cacheSession, invalidateSessionCache } from '@/bot/redisSessionCache';

const SELF_URL = process.env.SELF_URL || '';
const IS_WORKER = process.env.IS_WORKER === 'true';

// Dedup cache — prevents processing the same message multiple times when
// Evolution API fires duplicate webhooks (common for ACK re-deliveries).
const seenMsgs = new Map<string, number>();
const SEEN_TTL = 150_000; // 150 seconds (matches 120s timestamp guard + buffer)
function markSeen(msgId: string): boolean {
  const now = Date.now();
  // Prune old entries
  if (seenMsgs.size > 500) {
    for (const [k, t] of seenMsgs) {
      if (now - t > SEEN_TTL) seenMsgs.delete(k);
    }
  }
  if (seenMsgs.has(msgId)) return false; // already seen
  seenMsgs.set(msgId, now);
  return true; // first time
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Redis-cached session lookup — checks Redis first, falls back to Supabase.
 * Avoids hitting Supabase on every single webhook event.
 */
interface WebhookSession {
  id: string;
  user_id?: string;
  phone_number?: string;
  state?: string;
  worker_url?: string | null;
}

async function getCachedOrFetchSession(
  supabase: ReturnType<typeof getSupabase>,
  sessionId: string,
  columns: string = 'id, user_id, phone_number, state, worker_url',
): Promise<WebhookSession | null> {
  // Try Redis first
  const cached = await getCachedSession(sessionId);
  if (cached) return cached as unknown as WebhookSession;

  // Fallback to Supabase
  const { data } = await supabase
    .from('bot_sessions')
    .select(columns)
    .eq('id', sessionId)
    .single();

  if (data) {
    // Cache for next time (30s TTL)
    await cacheSession(sessionId, data as unknown as Record<string, unknown>);
  }
  return data as unknown as WebhookSession | null;
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
      // Global error webhooks from Evolution API don't carry an instance field —
      // this is expected and not actionable on the Botwave side.
      if (event !== 'error') {
        console.warn('[EVO-WEBHOOK] No session ID in payload:', JSON.stringify({ event, instance }).slice(0, 200));
      }
      return NextResponse.json({ ok: true });
    }

    console.log(`[EVO-WEBHOOK] event=${event} session=${sessionId}`);

    const supabase = getSupabase();

    // --- Worker routing guard ---
    // In Docker deployments, only the web container (botwave-web) receives
    // webhooks via the global WEBHOOK_GLOBAL_URL. The bot/worker containers
    // do NOT run Next.js and never receive webhooks directly. So the web
    // container must process ALL events — no routing guard needed.
    //
    // On Render (legacy), both web and bot services could receive the same
    // webhook, requiring deduplication. That's handled by checking SELF_URL:
    // if it matches the session's worker_url, this instance owns the session.
    // When SELF_URL is unset or doesn't correspond to a known worker, this
    // instance is the central webhook receiver and processes everything.
    const IS_CENTRAL_WEBHOOK_RECEIVER = !IS_WORKER && !SELF_URL.includes('worker');

    const ACTION_EVENTS = [
      'messages.upsert',
      'messages.delete',
      'messages.edited',
      'group-participants.update',
      'qrcode.updated',
    ];

    if (!IS_CENTRAL_WEBHOOK_RECEIVER && ACTION_EVENTS.includes(event)) {
      const routeSession = await getCachedOrFetchSession(supabase, sessionId, 'id, worker_url');
      if (routeSession) {
        const ownerUrl = routeSession.worker_url || null;
        const isCorrectInstance =
          ownerUrl
            ? SELF_URL === ownerUrl
            : !IS_WORKER;
        if (!isCorrectInstance) {
          console.log(`[EVO-WEBHOOK] SKIP ${event} for ${sessionId.slice(0, 8)} — owner=${ownerUrl || 'main'}, self=${SELF_URL || 'main'} (not ours)`);
          return NextResponse.json({ ok: true });
        }
      }
    }

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
        await invalidateSessionCache(sessionId);

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
        const statusReason = data?.statusReason || data?.statusCode || data?.disconnectionReasonCode;
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state')
          .eq('id', sessionId)
          .single();

        if (statusReason === 401) {
          // 401 = WhatsApp rejected credentials (logged out). Treat as a
          // terminal logout regardless of current session state. Stale auth
          // must be cleared so the next pairing attempt starts fresh instead
          // of reusing rejected credentials in an infinite 401 loop.
          console.log(`[EVO-WEBHOOK] Session ${sessionId} got 401 close (current state: ${current?.state ?? 'unknown'}) — clearing auth and setting needs_reauth`);
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
              pairing_lock_acquired_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
          await invalidateSessionCache(sessionId);
        } else if (current?.state === 'active') {
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
          await invalidateSessionCache(sessionId);
        } else {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${current?.state ?? 'unknown'} got close/refused — ignoring (handled by sync loop)`);
        }
        } else if (state === 'connecting') {
          // Only update to qr_pending if not already in a pairing or active state.
          // "active" is preserved because the bot may be auto-reconnecting after a
          // redeploy — changing to qr_pending would trigger the sync loop to
          // create a duplicate bot and force a fresh pairing code.
          const { data: current } = await supabase
            .from('bot_sessions')
            .select('state, updated_at')
            .eq('id', sessionId)
            .single();

          if (current?.state !== 'pairing_sent' && current?.state !== 'active') {
            // Debounce: skip the DB write if we already set qr_pending recently
            // (within 30s). Baileys fires connecting events every few seconds
            // while waiting for QR scan, and each write is unnecessary churn.
            const lastUpdate = current?.updated_at ? new Date(current.updated_at).getTime() : 0;
            const debounceMs = 30_000;
            if (current?.state === 'qr_pending' && Date.now() - lastUpdate < debounceMs) {
              // Already qr_pending and updated recently — skip
            } else {
              await supabase.from('bot_sessions')
                .update({
                  state: 'qr_pending',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sessionId);
              await invalidateSessionCache(sessionId);
            }
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
      await invalidateSessionCache(sessionId);

      return NextResponse.json({ ok: true });
    }

    // --- QR code / pairing code updates ---
    if (event === 'qrcode.updated') {
      const webhookReceivedAt = new Date().toISOString();
      const pairingCode = data?.pairingCode || data?.qrcode?.pairingCode;
      const qrCode = data?.code || data?.qrcode?.code;

      console.log(`[PAIRING-WEBHOOK] ======= qrcode.updated received ======= session=${sessionId} at=${webhookReceivedAt}`);
      console.log(`[PAIRING-WEBHOOK] Data: hasPairingCode=${!!pairingCode} pairingCode="${pairingCode || 'none'}" hasQR=${!!qrCode}`);

      const { data: current, error: stateErr } = await supabase
        .from('bot_sessions')
        .select('state, pairing_code, updated_at')
        .eq('id', sessionId)
        .single();

      if (stateErr) {
        console.error(`[PAIRING-WEBHOOK] Failed to read current state for ${sessionId}: ${stateErr.message}`);
      } else {
        console.log(`[PAIRING-WEBHOOK] Current DB state: state=${current?.state} existingCode="${current?.pairing_code || 'null'}" lastUpdated=${current?.updated_at}`);
      }

      // Never regress an active session back to pairing_sent.
      if (current?.state === 'active') {
        console.log(`[PAIRING-WEBHOOK] BLOCKED — session ${sessionId} is already active. Ignoring stale qrcode.updated (code="${pairingCode || 'none'}")`);
        return NextResponse.json({ ok: true });
      }

      // CODE LOCK: If a valid pairing code already exists and is less than
      // 55 seconds old, do NOT overwrite it. Evolution API fires qrcode.updated
      // every ~30s with a NEW code, but the user may already be entering the
      // current one. Overwriting it mid-entry causes "invalid code" errors.
      // WhatsApp pairing codes expire after 60s, so 55s gives a safe margin.
      const CODE_LOCK_WINDOW_MS = 55_000;
      if (pairingCode && current?.pairing_code && current.pairing_code !== pairingCode) {
        const lastUpdated = current.updated_at ? new Date(current.updated_at).getTime() : 0;
        const codeAge = Date.now() - lastUpdated;
        if (codeAge < CODE_LOCK_WINDOW_MS) {
          console.log(`[PAIRING-WEBHOOK] CODE LOCKED — existing code "${current.pairing_code}" is ${Math.round(codeAge / 1000)}s old (< ${CODE_LOCK_WINDOW_MS / 1000}s). Ignoring new code "${pairingCode}".`);
          return NextResponse.json({ ok: true });
        }
        console.log(`[PAIRING-WEBHOOK] Existing code "${current.pairing_code}" expired (${Math.round(codeAge / 1000)}s old). Accepting new code "${pairingCode}".`);
      }

      // Skip exact duplicate deliveries entirely
      if (pairingCode && current?.pairing_code === pairingCode) {
        console.log(`[PAIRING-WEBHOOK] DUPLICATE — code "${pairingCode}" already in DB. Skipping.`);
        return NextResponse.json({ ok: true });
      }

      const updates: Record<string, unknown> = { updated_at: webhookReceivedAt };

      if (pairingCode) {
        updates.pairing_code = pairingCode;
        updates.state = 'pairing_sent';
        console.log(`[PAIRING-WEBHOOK] Will update: pairing_code="${pairingCode}" state=pairing_sent`);
      }
      if (qrCode) {
        updates.qr_code = qrCode;
        updates.qr_generated_at = webhookReceivedAt;
        updates.qr_expires_at = new Date(Date.now() + 60_000).toISOString();
        console.log(`[PAIRING-WEBHOOK] Will update: qr_code (len=${qrCode.length}) qr_generated_at=${webhookReceivedAt}`);
      }

      if (Object.keys(updates).length > 1) {
        const { error: updateErr } = await supabase.from('bot_sessions').update(updates).eq('id', sessionId);
        if (updateErr) {
          console.error(`[PAIRING-WEBHOOK] DB update FAILED for ${sessionId}: ${updateErr.message}`);
        } else {
          console.log(`[PAIRING-WEBHOOK] DB update SUCCESS for ${sessionId}: fields=${Object.keys(updates).join(',')}`);
        }
      } else {
        console.log(`[PAIRING-WEBHOOK] No meaningful updates to apply for ${sessionId}`);
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

      // Look up session info for the handler (Redis-cached)
      const session = await getCachedOrFetchSession(supabase, sessionId);

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
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${String(session.state)} but receiving fromMe messages — auto-correcting to active`);
          await supabase.from('bot_sessions')
            .update({
              state: 'active',
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
          await invalidateSessionCache(sessionId);
        }
      }

      // Load user's command prefix from settings (default '!')
      let cmdPrefix = '!';
      if (session.user_id) {
        try {
          const { getUserSettings } = await import('@/bot/database');
          const settings = await getUserSettings(session.user_id);
          if (settings?.command_prefix) cmdPrefix = settings.command_prefix;
        } catch { /* non-critical — fall back to default */ }
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
        const msgStatus = msg.status;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';
        console.log(`[EVO-WEBHOOK] msg from=${from} fromMe=${fromMe} status=${msgStatus || 'none'} text="${text.slice(0, 80)}"`);

        // Route status broadcasts to the StatusViewer handler (respects
        // the autoview toggle which defaults to OFF).
        if (from === 'status@broadcast') {
          statusMsgs.push(msg);
          continue;
        }

        // Cache every message for anti-delete recovery — including ACK
        // re-deliveries.  ACKs still carry the full message content and
        // cacheMessage() deduplicates by msgId internally (Map.set is a
        // no-op for the same key).  This ensures fromMe messages (which
        // arrive only as ACKs, never as a fresh upsert) are cached and
        // available for !recover when someone deletes them.
        cacheMsgs.push(msg);

        // Evolution API always sets a status on messages.upsert (SERVER_ACK,
        // DELIVERY_ACK, READ, PLAYED) — unlike Baileys which separates new
        // messages from status updates. We use timestamp + dedup to determine
        // if a message is recent enough to process.
        const LATE_STATUS = ['READ', 'PLAYED'];
        const LATE_CODES = [4, 5];
        const isLateStatus = msgStatus && (LATE_STATUS.includes(String(msgStatus)) || LATE_CODES.includes(Number(msgStatus)));

        // Always skip READ/PLAYED — these fire long after the message arrived
        if (isLateStatus) {
          console.log(`[EVO-WEBHOOK] SKIP late status ${msgStatus} for msg ${msg.key?.id?.slice(0, 12) || 'unknown'}`);
          continue;
        }

        // Dedup: skip if we already processed this exact message ID
        const msgId = msg.key?.id || '';
        if (msgId && !markSeen(msgId)) {
          console.log(`[EVO-WEBHOOK] SKIP duplicate msg ${msgId.slice(0, 12)} "${text.slice(0, 40)}"`);
          continue;
        }

        // Timestamp guard: only process messages sent within the last 120s.
        // This prevents processing old DELIVERY_ACKs that arrive during
        // reconnection or batch status updates.
        const msgTs = Number(msg.messageTimestamp || 0);
        const nowSec = Math.floor(Date.now() / 1000);
        const msgAgeSec = nowSec - msgTs;
        if (msgTs > 0 && msgAgeSec > 120) {
          console.log(`[EVO-WEBHOOK] SKIP old msg (${msgAgeSec}s ago) ${msgId.slice(0, 12)} "${text.slice(0, 40)}"`);
          continue;
        }

        // Check if message has actual content worth processing
        const hasContent = text || msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.stickerMessage || msg.message?.documentMessage;

        // fromMe messages: only process commands (userbot mode)
        if (fromMe && !text.trimStart().startsWith(cmdPrefix)) {
          continue;
        }

        // Non-fromMe messages: process if they have content (for savage mode,
        // NLP, autopilot, etc.)
        if (!fromMe && !hasContent) {
          console.log(`[EVO-WEBHOOK] SKIP empty non-fromMe msg ${msgId.slice(0, 12)} from=${from}`);
          continue;
        }

        console.log(`[EVO-WEBHOOK] Processing msg: fromMe=${fromMe} from=${from} "${text.slice(0, 40)}"`);


        commandMsgs.push(msg);
      }

      // Fire-and-forget: process messages in the background so the webhook
      // response is returned immediately (avoids Render 30 s timeout killing
      // the handler mid-delay).
      if (commandMsgs.length > 0 || statusMsgs.length > 0 || cacheMsgs.length > 0) {
        // Lazy-import to avoid circular dependencies and keep Next.js bundle clean
        const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
        const { handleMessage } = await import('@/bot/handlers/MessageHandler');
        // Autoview removed entirely
        // const { handleStatusUpdate } = await import('@/bot/handlers/StatusViewer');
        const { MessageQueue } = await import('@/bot/utils/MessageQueue');
        const { cacheMessage } = await import('@/bot/handlers/AntiDeleteHandler');

        const sid = session.id;
        const uid = session.user_id || '';
        const phone = session.phone_number || '';
        const sock = new EvolutionSocketAdapter(sessionId, sid, uid, phone);
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        // Use void to fire-and-forget — do NOT await
        void (async () => {
          // Cache messages for anti-delete recovery (non-blocking)
          for (const msg of cacheMsgs) {
            cacheMessage(sid, msg).catch(() => {});
          }

          // Autoview removed — status broadcasts no longer processed
          // for (const msg of statusMsgs) {
          //   try {
          //     await handleStatusUpdate(msg, sock, sid, uid);
          //   } catch (err) {
          //     console.error(`[EVO-WEBHOOK] Error handling status for ${sessionId}:`, err);
          //   }
          // }

          for (const msg of commandMsgs) {
            try {
              await handleMessage(msg, sock, queue);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling message for ${sessionId}:`, err);
              // Enqueue for retry so the message isn't lost
              try {
                const { enqueueWebhookRetry, logHealthEvent } = await import('@/bot/database');
                await enqueueWebhookRetry(sid, 'messages.upsert', msg, String(err));
                await logHealthEvent(sid, 'webhook_retry', `Message processing failed: ${String(err).slice(0, 200)}`);
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
        const session = await getCachedOrFetchSession(supabase, sessionId, 'id, user_id');

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
              await handleMessageRevoke(revokeMsg, session.id, session.user_id || '');
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
        const session = await getCachedOrFetchSession(supabase, sessionId, 'id, user_id');

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
              await handleMessageRevoke(revokeMsg, session.id, session.user_id || '');
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
      const session = await getCachedOrFetchSession(supabase, sessionId, 'id, user_id, phone_number');

      if (session && data) {
        const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
        const { handleGroupParticipantsUpdate } = await import('@/bot/handlers/MessageHandler');
        const { MessageQueue } = await import('@/bot/utils/MessageQueue');

        const sock = new EvolutionSocketAdapter(sessionId, session.id, session.user_id || '', session.phone_number || '');
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        try {
          await handleGroupParticipantsUpdate(data, sock, session.id, session.user_id || '', queue);
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
