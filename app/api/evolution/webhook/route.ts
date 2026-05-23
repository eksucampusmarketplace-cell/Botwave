// app/api/evolution/webhook/route.ts
// Receives webhooks from Evolution API and routes them through the existing
// MessageHandler + anti-ban pipeline.
// Includes a retry queue: if message processing fails, the webhook payload is
// enqueued for later retry with exponential backoff.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedSession, cacheSession, invalidateSessionCache } from '@/bot/infrastructure/redisSessionCache';
import { invalidateSessions } from '@/lib/redisApiCache';
import { recordMessageActivity, trigger428Cooldown } from '@/bot/whatsapp/evolution/client';
import { redisMarkWebhookSeen } from '@/bot/infrastructure/redis';
import { PAIRING_CODE_FREEZE_MS } from '@/bot/database';
import crypto from 'crypto';

const SELF_URL = process.env.SELF_URL || '';
const IS_WORKER = process.env.IS_WORKER === 'true';

// Throttle heartbeat/last_active updates - at most once per 60s per session
const lastHeartbeatUpdate = new Map<string, number>();
const HEARTBEAT_THROTTLE_MS = 60_000;
const HEARTBEAT_MAP_MAX_SIZE = 500;

// Periodic cleanup for lastHeartbeatUpdate — prevents unbounded growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (lastHeartbeatUpdate.size <= HEARTBEAT_MAP_MAX_SIZE) return;
    const now = Date.now();
    for (const [k, t] of lastHeartbeatUpdate) {
      if (now - t > HEARTBEAT_THROTTLE_MS * 5) lastHeartbeatUpdate.delete(k);
    }
  }, 300_000); // clean every 5 minutes
}

/**
 * In-memory dedup cache (LRU-style with TTL). Populated alongside Redis so a
 * sync-only fast path can short-circuit duplicate webhook events without any
 * async work. The Redis SETNX still serves cross-worker dedup.
 */
const inMemoryDedupCache = new Map<string, number>();
const DEDUP_TTL_MS = 300_000; // 5 minutes, matches Redis TTL
const DEDUP_MAX_SIZE = 10_000;

function cleanupDedupCache(): void {
  if (inMemoryDedupCache.size <= DEDUP_MAX_SIZE) return;
  const cutoff = Date.now() - DEDUP_TTL_MS;
  for (const [k, t] of inMemoryDedupCache) {
    if (t < cutoff) inMemoryDedupCache.delete(k);
  }
  // If still too big after TTL pass, drop the oldest 25% (Map preserves insertion order)
  if (inMemoryDedupCache.size > DEDUP_MAX_SIZE) {
    const toDrop = Math.floor(DEDUP_MAX_SIZE * 0.25);
    let i = 0;
    for (const k of inMemoryDedupCache.keys()) {
      if (i++ >= toDrop) break;
      inMemoryDedupCache.delete(k);
    }
  }
}

/**
 * Sync-only dedup check. Returns true if EVERY message in the batch is already
 * known locally. Used at the top of POST to skip session lookup + DB work for
 * pure ACK retransmits (DELIVERY_ACK / SERVER_ACK), which make up the bulk of
 * webhook traffic during active WhatsApp use.
 */
interface WebhookMessagePeek {
  key?: { id?: string };
}

function allMessagesAlreadySeen(sessionId: string, messages: readonly WebhookMessagePeek[]): boolean {
  if (messages.length === 0) return false;
  for (const m of messages) {
    const msgId = m?.key?.id;
    if (!msgId) return false; // unknown id → must process to avoid drop
    if (!inMemoryDedupCache.has(`${sessionId}:${msgId}`)) return false;
  }
  return true;
}

/**
 * Mark a message as seen. Uses Redis SETNX for cross-worker dedup and ALWAYS
 * populates the in-memory cache so subsequent ACK retransmits of the same
 * messageId short-circuit synchronously without touching Redis.
 * Returns true if first time seen, false if duplicate.
 */
async function markSeen(sessionId: string, msgId: string): Promise<boolean> {
  const key = `${sessionId}:${msgId}`;

  // Sync fast-path: if we recently saw this id locally, it's definitely a dup.
  if (inMemoryDedupCache.has(key)) return false;

  const redisResult = await redisMarkWebhookSeen(sessionId, msgId);

  // Always record locally so future ACKs of this message take the sync path.
  inMemoryDedupCache.set(key, Date.now());
  cleanupDedupCache();

  if (redisResult === false) return false; // duplicate per Redis
  return true; // first time (Redis says first OR Redis unavailable)
}

// ── Webhook traffic metrics ─────────────────────────────────────────────────
// Logged once a minute so we can quantify the dedup win in production logs.
let metricsReceived = 0;        // total webhooks received
let metricsFastSkip = 0;        // all-duplicate batches short-circuited
let metricsHandled = 0;         // batches that did real work
let metricsMsgDuplicates = 0;   // duplicate message ids inside batches
let metricsLastFlushMs = Date.now();
const METRICS_FLUSH_INTERVAL_MS = 60_000;

function maybeFlushMetrics(): void {
  const now = Date.now();
  const elapsed = now - metricsLastFlushMs;
  if (elapsed < METRICS_FLUSH_INTERVAL_MS) return;
  if (metricsReceived === 0) {
    metricsLastFlushMs = now;
    return;
  }
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const perSec = (metricsReceived / (elapsed / 1000)).toFixed(1);
  const skipPct = Math.round((metricsFastSkip / metricsReceived) * 100);
  console.log(
    `[EVO-WEBHOOK] metrics window=${Math.round(elapsed / 1000)}s ` +
    `events=${metricsReceived} (${perSec}/s) ` +
    `fast_skip=${metricsFastSkip} (${skipPct}%) ` +
    `handled=${metricsHandled} dup_msgs=${metricsMsgDuplicates} ` +
    `heap=${heapMB}MB dedup_cache=${inMemoryDedupCache.size}`
  );
  metricsReceived = 0;
  metricsFastSkip = 0;
  metricsHandled = 0;
  metricsMsgDuplicates = 0;
  metricsLastFlushMs = now;
}

// ── qrcode.updated rapid-fire throttle ──────────────────────────────────────
// Evolution API fires qrcode.updated repeatedly per session (sometimes
// multiple times per second during reconnect). The existing 2s throttle
// inside the handler only applies when a pairingCode is present, so QR-only
// retransmits still hit two Supabase queries each. Track the last in-memory
// update so we can skip identical retransmits before any DB work.
const lastQrEvent = new Map<string, { ts: number; qrPrefix?: string; pairingCode?: string }>();
const QR_THROTTLE_MS = 1500;
const QR_MAP_MAX_SIZE = 500;

function shouldSkipQrEvent(
  sessionId: string,
  qrCode: string | undefined,
  pairingCode: string | undefined,
): boolean {
  const prev = lastQrEvent.get(sessionId);
  const now = Date.now();
  if (!prev) return false;
  if (now - prev.ts >= QR_THROTTLE_MS) return false;
  // Same QR fingerprint OR same pairing code within window → drop.
  const newQrPrefix = qrCode ? qrCode.slice(0, 32) : undefined;
  if (newQrPrefix && newQrPrefix === prev.qrPrefix) return true;
  if (pairingCode && pairingCode === prev.pairingCode) return true;
  return false;
}

function recordQrEvent(
  sessionId: string,
  qrCode: string | undefined,
  pairingCode: string | undefined,
): void {
  lastQrEvent.set(sessionId, {
    ts: Date.now(),
    qrPrefix: qrCode ? qrCode.slice(0, 32) : undefined,
    pairingCode: pairingCode || undefined,
  });
  if (lastQrEvent.size > QR_MAP_MAX_SIZE) {
    // Drop oldest ~25% on overflow (Map iteration is insertion order).
    const toDrop = Math.floor(QR_MAP_MAX_SIZE * 0.25);
    let i = 0;
    for (const k of lastQrEvent.keys()) {
      if (i++ >= toDrop) break;
      lastQrEvent.delete(k);
    }
  }
}

function getServerSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getSupabase() {
  return createClient(getServerSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function touchSessionActivity(supabase: ReturnType<typeof getSupabase>, sessionId: string): Promise<void> {
  const now = Date.now();
  const lastUpdate = lastHeartbeatUpdate.get(sessionId) || 0;
  if (now - lastUpdate < HEARTBEAT_THROTTLE_MS) return;
  lastHeartbeatUpdate.set(sessionId, now);

  const nowIso = new Date(now).toISOString();
  await supabase.from('bot_sessions')
    .update({ last_active: nowIso, heartbeat_at: nowIso, updated_at: nowIso } as Record<string, string>)
    .eq('id', sessionId)
    .eq('state', 'active');
}

/**
 * Redis-cached session lookup - checks Redis first, falls back to Supabase.
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
/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
  } catch {
    return false;
  }
}

function resolveSessionId(instance: unknown): string | null {
  if (typeof instance === 'string') return instance;
  if (instance && typeof instance === 'object' && 'instanceName' in instance) {
    return (instance as Record<string, string>).instanceName || null;
  }
  // Some Evolution API events (global error events, malformed payloads) carry
  // no instance at all. `JSON.stringify(undefined)` returns `undefined`, so
  // coerce to a string before slicing to avoid a TypeError that would crash
  // the whole webhook handler.
  const preview = String(JSON.stringify(instance));
  console.warn('[EVO-WEBHOOK] Unrecognized instance format:', preview.slice(0, 100));
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret if configured — use timing-safe comparison
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      const rawSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!rawSecret || !timingSafeCompare(rawSecret, webhookSecret)) {
        console.warn('[EVO-WEBHOOK] Invalid or missing webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json() as Record<string, any>;
    const instance = body.instance;
    const data: Record<string, any> | undefined = body.data;
    const event: string = body.event ?? '';

    const sessionId = resolveSessionId(instance);

    if (!sessionId) {
      // Global error webhooks from Evolution API don't carry an instance field -
      // this is expected and not actionable on the Botwave side.
      if (event !== 'error') {
        console.warn('[EVO-WEBHOOK] No session ID in payload:', JSON.stringify({ event, instance }).slice(0, 200));
      }
      return NextResponse.json({ ok: true });
    }

    // Early-exit for events we don't handle — avoids creating DB connections
    // and holding the deserialized payload in memory unnecessarily
    const HANDLED_EVENTS = new Set([
      'messages.upsert', 'messages.delete', 'messages.edited',
      'group-participants.update', 'qrcode.updated',
      'connection.update', 'logout.instance',
    ]);
    if (!HANDLED_EVENTS.has(event)) {
      return NextResponse.json({ ok: true });
    }

    metricsReceived++;

    // --- Fast-path dedup for messages.upsert ---
    // Evolution API retransmits each message as messages.upsert events with
    // changing status (SERVER_ACK → DELIVERY_ACK → READ). After we've handled
    // the first arrival, every retransmit carries the same message id, so we
    // can short-circuit synchronously without a session lookup or any DB I/O.
    // This is the single biggest CPU win during heavy traffic.
    if (event === 'messages.upsert' && data) {
      const peek = Array.isArray(data) ? data : [data];
      if (peek.length > 0 && allMessagesAlreadySeen(sessionId, peek)) {
        metricsFastSkip++;
        metricsMsgDuplicates += peek.length;
        maybeFlushMetrics();
        return NextResponse.json({ ok: true });
      }
    }

    // --- Fast-path throttle for qrcode.updated ---
    // Evolution can fire this multiple times per second during reconnect; the
    // existing 2 s throttle only catches pairingCode duplicates, so QR-only
    // retransmits still hit two Supabase queries each. Drop identical bursts
    // in-memory before any DB read.
    if (event === 'qrcode.updated') {
      const incomingPairing = data?.pairingCode || data?.pairing_code || data?.code;
      const incomingQr = data?.code || data?.qrcode?.code;
      if (shouldSkipQrEvent(sessionId, incomingQr, incomingPairing)) {
        metricsFastSkip++;
        maybeFlushMetrics();
        return NextResponse.json({ ok: true });
      }
      recordQrEvent(sessionId, incomingQr, incomingPairing);
    }

    metricsHandled++;
    console.log(`[EVO-WEBHOOK] event=${event} session=${sessionId}`);

    const supabase = getSupabase();

    // --- Worker routing guard ---
    // In Docker deployments, only the web container (botwave-web) receives
    // webhooks via the global WEBHOOK_GLOBAL_URL. The bot/worker containers
    // do NOT run Next.js and never receive webhooks directly. So the web
    // container must process ALL events - no routing guard needed.
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
          console.log(`[EVO-WEBHOOK] SKIP ${event} for ${sessionId.slice(0, 8)} - owner=${ownerUrl || 'main'}, self=${SELF_URL || 'main'} (not ours)`);
          return NextResponse.json({ ok: true });
        }
      }
    }

    // --- Connection state changes ---
    if (event === 'connection.update') {
      const state = data?.state;
      const statusCode = data?.statusCode || data?.disconnectionReasonCode;
      console.log(`[EVO-WEBHOOK] connection.update for ${sessionId}: state=${state} statusCode=${statusCode}`);

      // Detect 428 (WhatsApp rate limit) - trigger global cooldown to prevent cascading disconnects
      if (statusCode === 428) {
        trigger428Cooldown(`webhook connection.update for ${sessionId}`);
      }

      // Track activity on connection events - proves the session is alive
      if (state === 'open') {
        recordMessageActivity(sessionId);
      }

      if (state === 'open') {
        // Check if this is a first-time connection (pairing just completed)
        const { data: current } = await supabase
          .from('bot_sessions')
          .select('state, phone_number, user_id')
          .eq('id', sessionId)
          .single();

        const nowIso = new Date().toISOString();
        await supabase.from('bot_sessions')
          .update({
            state: 'active',
            last_active: nowIso,
            heartbeat_at: nowIso,
            qr_code: null,
            qr_expires_at: null,
            qr_generated_at: null,
            pairing_code: null,
            last_pairing_error: null,
            updated_at: nowIso,
          })
          .eq('id', sessionId);
        await invalidateSessionCache(sessionId);
        if (current?.user_id) await invalidateSessions(current.user_id);
        lastHeartbeatUpdate.set(sessionId, Date.now());

        // Send one-time welcome message when pairing/QR scan completes for the first time.
        // Triggers on any pre-active state (pairing_sent, qr_pending, connecting) - not
        // on reconnections from 'inactive' (those are auto-reconnects, not first time).
        const isFirstConnection = current?.state && ['pairing_sent', 'qr_pending', 'connecting'].includes(current.state);
        if (isFirstConnection && current?.phone_number) {
          const dashUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
          const welcomeMessages = [
            `Hey there! 👋 BotWave is now connected to your WhatsApp.\n\n` +
            `Here are a few things to get started:\n` +
            `• Type *!help* in any chat to see all commands\n` +
            `• Add BotWave to your homescreen for quick access: ${dashUrl}\n\n` +
            `⚠️ *Important - Please read:*\n` +
            `1. Don't spam or send excessive automated messages. Other WhatsApp users can report your number, which may lead to account restrictions. We are not responsible for any account loss - use wisely!\n` +
            `2. *Your bot can disconnect* if WhatsApp drops the session or if our server restarts. If your bot stops responding, go to your dashboard at ${dashUrl} and reconnect. You are in control of your session.\n\n` +
            `_Created by BotWave Team_`,

            `Welcome to BotWave! 🚀 Your WhatsApp bot is live.\n\n` +
            `Quick start:\n` +
            `• Send *!help* anywhere to explore commands\n` +
            `• Bookmark the dashboard: ${dashUrl}\n\n` +
            `⚠️ *Things you should know:*\n` +
            `1. Avoid spamming or flooding chats with bot messages. If other users report you, WhatsApp may restrict or ban your number. We're not responsible for any account actions.\n` +
            `2. *Disconnections can happen* - if the bot stops working, visit ${dashUrl} and reconnect your session. The bot doesn't stay online forever on its own.\n\n` +
            `_Powered by BotWave Team_`,

            `You're all set! ✨ BotWave is connected and ready.\n\n` +
            `Get started:\n` +
            `• Try *!help* to see everything your bot can do\n` +
            `• Save the dashboard for easy access: ${dashUrl}\n\n` +
            `⚠️ *Keep in mind:*\n` +
            `1. Don't overuse or spam automated messages - if users report your number, WhatsApp could ban it. We take no responsibility for account loss, so use your bot wisely!\n` +
            `2. *Your bot session may disconnect* sometimes. When it does, just go to ${dashUrl} and click reconnect. You're always in control.\n\n` +
            `_Built by BotWave Team_`,
          ];
          const welcomeText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
          const selfJid = current.phone_number.replace(/\D/g, '');

          try {
            const { sendText } = await import('@/bot/whatsapp/evolution/client');
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
          .select('state, user_id')
          .eq('id', sessionId)
          .single();

        if (statusReason === 401) {
          // 401 = WhatsApp rejected credentials (logged out). Treat as a
          // terminal logout regardless of current session state. Stale auth
          // must be cleared so the next pairing attempt starts fresh instead
          // of reusing rejected credentials in an infinite 401 loop.
          console.log(`[EVO-WEBHOOK] Session ${sessionId} got 401 close (current state: ${current?.state ?? 'unknown'}) - clearing auth and setting needs_reauth`);
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
              last_pairing_error: 'WhatsApp rejected credentials (401). Session needs re-authentication.',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
          await invalidateSessionCache(sessionId);
          if (current?.user_id) await invalidateSessions(current.user_id);
        } else if (current?.state === 'active') {
          // Temporary disconnect - preserve auth state so Evolution API can
          // auto-reconnect without forcing the user to re-pair.  Only clear
          // transient fields (locks, QR) so the sync loop picks this up.
          console.log(`[EVO-WEBHOOK] Session ${sessionId} was active, now ${state} - setting inactive (auth preserved for auto-reconnect)`);
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
          if (current?.user_id) await invalidateSessions(current.user_id);
        } else {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${current?.state ?? 'unknown'} got close/refused - ignoring (handled by sync loop)`);
        }
        } else if (state === 'connecting') {
          // Only update to qr_pending if not already in a pairing or active state.
          // "active" is preserved because the bot may be auto-reconnecting after a
          // redeploy - changing to qr_pending would trigger the sync loop to
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
              // Already qr_pending and updated recently - skip
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
            console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${current?.state} got connecting - preserving state (reconnect in progress)`);
          }
        }

      return NextResponse.json({ ok: true });
    }

    // --- Instance logout (WhatsApp terminated the linked device) ---
    if (event === 'logout.instance') {
      console.log(`[EVO-WEBHOOK] logout.instance for ${sessionId} - clearing all auth data and locks`);
      const { data: logoutSession } = await supabase
        .from('bot_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();
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
          last_pairing_error: 'WhatsApp terminated the linked device (logout). Re-pairing required.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      await invalidateSessionCache(sessionId);
      if (logoutSession?.user_id) await invalidateSessions(logoutSession.user_id);

      return NextResponse.json({ ok: true });
    }

    // --- QR code / pairing code updates ---
    if (event === 'qrcode.updated') {
      const webhookReceivedAt = new Date().toISOString();
      const pairingCode = data?.pairingCode || data?.qrcode?.pairingCode;
      const qrCode = data?.code || data?.qrcode?.code;

      console.log(`[PAIRING-WEBHOOK] ======= qrcode.updated received ======= session=${sessionId} at=${webhookReceivedAt}`);
      const incomingTail = pairingCode ? `***${pairingCode.slice(-2)}` : 'none';
      console.log(`[PAIRING-WEBHOOK] Data: hasPairingCode=${!!pairingCode} codeTail=${incomingTail} codeLen=${pairingCode?.length || 0} hasQR=${!!qrCode}`);

      const { data: current, error: stateErr } = await supabase
        .from('bot_sessions')
        .select('state, pairing_code, qr_generated_at, updated_at, user_id')
        .eq('id', sessionId)
        .single();

      if (stateErr) {
        console.error(`[PAIRING-WEBHOOK] Failed to read current state for ${sessionId}: ${stateErr.message}`);
        // FAIL-CLOSED: if we can't read the row, we can't tell whether
        // it's a deleted session (row was removed by user) or a session
        // with a fresh pairing code we shouldn't overwrite. Either way,
        // accepting the write is unsafe — a deleted session shouldn't be
        // resurrected by an Evolution webhook, and an in-flight code must
        // never be replaced by a rotating one. Bail out instead of risking
        // a fresh-code overwrite via the fallback update path below.
        return NextResponse.json({ ok: true, skipped: 'preread_failed' });
      }
      const existingTail = current?.pairing_code ? `***${current.pairing_code.slice(-2)}` : 'null';
      console.log(`[PAIRING-WEBHOOK] Current DB state: state=${current?.state} existingTail=${existingTail} lastUpdated=${current?.updated_at}`);

      // Never regress an active session back to pairing_sent.
      if (current?.state === 'active') {
        console.log(`[PAIRING-WEBHOOK] BLOCKED - session ${sessionId} is already active. Ignoring stale qrcode.updated (incomingTail=${incomingTail})`);
        return NextResponse.json({ ok: true });
      }

      if (current?.state && !['qr_pending', 'pairing_sent', 'connecting'].includes(current.state)) {
        console.log(`[PAIRING-WEBHOOK] BLOCKED - session ${sessionId} is ${current.state}. Ignoring stale qrcode.updated after logout/reauth.`);
        return NextResponse.json({ ok: true });
      }

      const codeStartedAt = current?.qr_generated_at || current?.updated_at;
      const codeAgeMs = codeStartedAt ? Date.now() - new Date(codeStartedAt).getTime() : 0;
      const incomingCodeIsFrozen = !!(
        pairingCode &&
        current?.pairing_code &&
        current.pairing_code !== pairingCode &&
        codeAgeMs > 0 &&
        codeAgeMs < PAIRING_CODE_FREEZE_MS
      );

      // Always update QR code unconditionally - it rotates every ~20-30s
      // independently of the pairing code. When using an 8-character pair
      // code, do not replace the QR with one tied to a different frozen code.
      if (qrCode) {
        if (incomingCodeIsFrozen) {
          console.log(`[PAIRING-WEBHOOK] QR update skipped for ${sessionId}; incoming QR belongs to a rotating code (freeze guard active).`);
        } else {
          const { error: qrErr } = await supabase.from('bot_sessions').update({
            qr_code: qrCode,
            qr_generated_at: webhookReceivedAt,
            qr_expires_at: new Date(Date.now() + 300_000).toISOString(),
            updated_at: webhookReceivedAt,
          }).eq('id', sessionId).neq('state', 'active');
          if (qrErr) {
            console.error(`[PAIRING-WEBHOOK] QR update FAILED for ${sessionId}: ${qrErr.message}`);
          } else {
            console.log(`[PAIRING-WEBHOOK] QR updated for ${sessionId} (len=${qrCode.length})`);
          }
        }
      }

      // Invalidate the user's sessions list cache so the frontend sees the updated QR/pairing code
      if (current?.user_id) {
        await invalidateSessions(current.user_id);
      }

      // Skip exact duplicate pairing code deliveries (QR already updated above)
      if (pairingCode && current?.pairing_code === pairingCode) {
        console.log(`[PAIRING-WEBHOOK] DUPLICATE pairing code (codeLen=${pairingCode.length}) - QR already updated above. Done.`);
        return NextResponse.json({ ok: true });
      }

      if (pairingCode && current?.pairing_code && current.pairing_code !== pairingCode) {
        if (incomingCodeIsFrozen) {
          console.log(`[PAIRING-WEBHOOK] FROZEN - keeping existing code for ${sessionId}; ignored rotating code at ${Math.round(codeAgeMs / 1000)}s (within ${PAIRING_CODE_FREEZE_MS / 1000}s freeze).`);
          return NextResponse.json({ ok: true });
        }
      }

      // Short-circuit rapid-fire code changes within 2 seconds of the last update.
      if (pairingCode && current?.updated_at) {
        const sinceLastUpdate = Date.now() - new Date(current.updated_at).getTime();
        if (sinceLastUpdate < 2000) {
          console.log(`[PAIRING-WEBHOOK] THROTTLED - code arrived ${sinceLastUpdate}ms after last update. Ignoring rapid-fire event.`);
          return NextResponse.json({ ok: true });
        }
      }

      if (pairingCode) {
        if (current?.pairing_code && current.pairing_code !== pairingCode) {
          console.log(`[PAIRING-WEBHOOK] Pairing code CHANGED for ${sessionId} (freeze window expired — old code was ${Math.round(codeAgeMs / 1000)}s old, reconnect invalidated it)`);
        }
        // Reset qr_generated_at on a legitimate code change so the dashboard
        // countdown anchors to the NEW code's lifetime instead of carrying
        // over the previous code's elapsed time.
        const codeChanged = !!(current?.pairing_code && current.pairing_code !== pairingCode);
        const update: Record<string, unknown> = {
          pairing_code: pairingCode,
          state: 'pairing_sent',
          updated_at: webhookReceivedAt,
        };
        if (codeChanged || !current?.qr_generated_at) {
          update.qr_generated_at = webhookReceivedAt;
        }
        const { error: pairingErr } = await supabase.from('bot_sessions').update(update).eq('id', sessionId);
        if (pairingErr) {
          console.error(`[PAIRING-WEBHOOK] Pairing code update FAILED for ${sessionId}: ${pairingErr.message}`);
        } else {
          console.log(`[PAIRING-WEBHOOK] Pairing code saved for ${sessionId} (codeLen=${pairingCode.length}, codeChanged=${codeChanged})`);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // --- Incoming messages ---
    // Evolution API fires 'messages.upsert' per message (single object),
    // not as an array. Normalize to array for uniform handling.
    if (event === 'messages.upsert') {
      // Track message activity for deaf session detection and activity-based presence.
      // Any messages.upsert event proves the session is alive and receiving data.
      recordMessageActivity(sessionId);

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

      // Update heartbeat/last_active so dashboard shows accurate "Last Active"
      touchSessionActivity(supabase, sessionId).catch(() => {});

      // Auto-correct session state: if we're receiving messages from
      // Evolution API but the DB thinks the session is qr_pending/pairing_sent,
      // the instance is clearly connected - update the state to active.
      if (session.state && session.state !== 'active' && session.state !== 'needs_reauth') {
        const hasFromMe = messages.some((m: any) => m.key?.fromMe);
        if (hasFromMe) {
          console.log(`[EVO-WEBHOOK] Session ${sessionId} in ${String(session.state)} but receiving fromMe messages - auto-correcting to active`);
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
        } catch { /* non-critical - fall back to default */ }
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

        // Cache every message for anti-delete recovery - including ACK
        // re-deliveries.  ACKs still carry the full message content and
        // cacheMessage() deduplicates by msgId internally (Map.set is a
        // no-op for the same key).  This ensures fromMe messages (which
        // arrive only as ACKs, never as a fresh upsert) are cached and
        // available for !recover when someone deletes them.
        cacheMsgs.push(msg);

        // Evolution API always sets a status on messages.upsert (SERVER_ACK,
        // DELIVERY_ACK, READ, PLAYED) - unlike Baileys which separates new
        // messages from status updates. We use timestamp + dedup to determine
        // if a message is recent enough to process.
        const LATE_STATUS = ['READ', 'PLAYED'];
        const LATE_CODES = [4, 5];
        const isLateStatus = msgStatus && (LATE_STATUS.includes(String(msgStatus)) || LATE_CODES.includes(Number(msgStatus)));

        // Always skip READ/PLAYED - these fire long after the message arrived
        if (isLateStatus) {
          console.log(`[EVO-WEBHOOK] SKIP late status ${msgStatus} for msg ${msg.key?.id?.slice(0, 12) || 'unknown'}`);
          continue;
        }

        // Dedup: skip if we already processed this exact message ID for THIS session
        const msgId = msg.key?.id || '';
        if (msgId && !(await markSeen(sessionId, msgId))) {
          metricsMsgDuplicates++;
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
        const { EvolutionSocketAdapter } = await import('@/bot/whatsapp/evolution/socket');
        const { handleMessage } = await import('@/bot/whatsapp/handlers/MessageHandler');
        // Autoview removed entirely
        // const { handleStatusUpdate } = await import('@/bot/handlers/StatusViewer');
        const { MessageQueue } = await import('@/bot/whatsapp/utils/MessageQueue');
        const { cacheMessage } = await import('@/bot/whatsapp/handlers/AntiDeleteHandler');

        const sid = session.id;
        const uid = session.user_id || '';
        const phone = session.phone_number || '';
        const sock = new EvolutionSocketAdapter(sessionId, sid, uid, phone);
        const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, sessionId);

        // Use void to fire-and-forget - do NOT await
        void (async () => {
          // Cache messages for anti-delete recovery (non-blocking)
          for (const msg of cacheMsgs) {
            cacheMessage(sid, msg).catch(() => {});
          }

          // Autoview removed - status broadcasts no longer processed
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
              const { handleMessageRevoke } = await import('@/bot/whatsapp/handlers/AntiDeleteHandler');
              await handleMessageRevoke(revokeMsg, session.id, session.user_id || '');
              console.log(`[EVO-WEBHOOK] Processed message delete for ${sessionId}: msgId=${deletedKey.id}`);
            } catch (err) {
              console.error(`[EVO-WEBHOOK] Error handling message delete for ${sessionId}:`, err);
            }
          })();
        }
      }

      maybeFlushMetrics();
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
              const { handleMessageRevoke } = await import('@/bot/whatsapp/handlers/AntiDeleteHandler');
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
        const { EvolutionSocketAdapter } = await import('@/bot/whatsapp/evolution/socket');
        const { handleGroupParticipantsUpdate } = await import('@/bot/whatsapp/handlers/MessageHandler');
        const { MessageQueue } = await import('@/bot/whatsapp/utils/MessageQueue');

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

    console.log(`[EVO-WEBHOOK] Unhandled event=${event} for session=${sessionId} - ignoring`);
    maybeFlushMetrics();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[EVO-WEBHOOK] CRITICAL ERROR processing webhook:', error);
    maybeFlushMetrics();
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
