import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignWorkerAsync, INTERNAL_SECRET } from '@/bot/scaling/workerConfig';
import { getCachedSessions, cacheSessions, invalidateSessions } from '@/lib/redisApiCache';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const ADMIN_EMAIL = 'christolu994@gmail.com';
const MAX_SESSIONS_PER_USER = 1;

export const dynamic = 'force-dynamic';

/**
 * Normalize a phone number to international E.164 format.
 * Handles common Nigerian local formats (080, 090, 070, 081, etc.)
 * and strips spaces, dashes, parentheses.
 */
function normalizePhoneNumber(raw: string): string {
  // Strip non-digit chars except leading +
  let num = raw.replace(/(?!^\+)\D/g, '');

  // Nigerian local format → international
  // 080x, 081x, 090x, 091x, 070x, 071x → +234...
  if (/^0[789]\d{9}$/.test(num)) {
    num = '+234' + num.slice(1);
  }

  // Ensure leading +
  if (!num.startsWith('+')) {
    num = '+' + num;
  }

  return num;
}

/**
 * Validate phone number using libphonenumber-js for proper international validation.
 * Falls back to basic checks if parsing fails.
 */
function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 15) return false;
  if (digits.startsWith('0')) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed) return false;
  if (!parsed.isValid()) return false;

  return true;
}

const platformEnum = z.enum(['whatsapp', 'telegram_bot', 'telegram_userbot']).default('whatsapp');

const createSessionSchema = z.object({
  phoneNumber: z.string().min(1).transform(normalizePhoneNumber).refine(
    (val) => validatePhoneNumber(val),
    {
      message: 'Invalid phone number. Please enter a real phone number with country code (e.g. +234XXXXXXXXXX, +1XXXXXXXXXX, +44XXXXXXXXXX)',
    },
  ).optional(),
  sessionName: z.string().min(1).max(50),
  platform: platformEnum,
  telegramBotToken: z.string().optional(),
  telegramBotUsername: z.string().optional(),
  telegramApiId: z.number().optional(),
  telegramApiHash: z.string().optional(),
  telegramSessionString: z.string().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Skip cache when any session is in pairing flow (QR codes expire quickly)
    const cached = await getCachedSessions(user.id);
    const hasPairingSession = cached && Array.isArray(cached) &&
      cached.some((s: any) => s.state === 'qr_pending' || s.state === 'pairing_sent');
    if (cached && !hasPairingSession) {
      return NextResponse.json({ success: true, data: cached });
    }

    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('[API] GET sessions: bot_sessions table not found, using empty array');
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      console.error(`[API] GET sessions error: code=${error.code} message=${error.message}`);
      throw error;
    }

    // Log pairing-relevant data for any session in pairing flow
    if (sessions?.length) {
      const pairingSessions = sessions.filter((s: any) => s.state === 'qr_pending' || s.state === 'pairing_sent');
      if (pairingSessions.length > 0) {
        for (const s of pairingSessions) {
          console.log(`[PAIRING-API] Session ${s.id.slice(0, 8)}: state=${s.state} pairing_code=${s.pairing_code ? `"${s.pairing_code}"` : 'null'} updated_at=${s.updated_at}`);
        }
      }
    }

    const result = sessions || [];
    await cacheSessions(user.id, result);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumber, sessionName, platform, telegramBotToken, telegramBotUsername, telegramApiId, telegramApiHash, telegramSessionString } = validation.data;

    // Enforce session limit: check how many sessions this user already has
    const adminClient = await createAdminClient();
    const { data: userRecord } = await adminClient.auth.admin.getUserById(user.id);
    const isAdmin = userRecord?.user?.email === ADMIN_EMAIL;

    if (!isAdmin) {
      const { count } = await supabase
        .from('bot_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count !== null && count >= MAX_SESSIONS_PER_USER) {
        return NextResponse.json(
          { error: `Session limit reached. You can only connect ${MAX_SESSIONS_PER_USER} session${MAX_SESSIONS_PER_USER === 1 ? '' : 's'}. Please delete an existing session first.` },
          { status: 403 }
        );
      }
    }

    const workerUrl = await assignWorkerAsync();
    console.log(`[API] POST session: user=${user.id.slice(0,8)} phone=${phoneNumber} name=${sessionName} assignedWorker=${workerUrl ?? 'main'}`);

    const initialState = platform === 'whatsapp' ? 'qr_pending' : 'active';

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      phone_number: phoneNumber || '',
      session_name: sessionName,
      state: initialState,
      platform,
      worker_url: workerUrl,
    };

    if (platform === 'telegram_bot') {
      insertData.telegram_bot_token = telegramBotToken;
      insertData.telegram_bot_username = telegramBotUsername;
    } else if (platform === 'telegram_userbot') {
      insertData.telegram_api_id = telegramApiId;
      insertData.telegram_api_hash = telegramApiHash;
      insertData.telegram_session_string = telegramSessionString;
    }

    const { data: session, error } = await supabase
      .from('bot_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { 
            error: 'Session creation failed: bot_sessions table not found',
            message: 'Please run the initial schema migrations in your Supabase SQL Editor.',
            action: 'Visit /admin/dashboard and go to System Health to get the SQL.'
          },
          { status: 503 }
        );
      }
      throw error;
    }

    if (workerUrl && INTERNAL_SECRET) {
      try {
        await fetch(`${workerUrl}/api/internal/trigger-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
        });
        console.log(`[API] POST session: notified worker ${workerUrl} to sync immediately`);
      } catch (err) {
        console.error(`[API] POST session: FAILED to notify worker ${workerUrl} for session ${session.id}:`, err);
      }
    }

    await invalidateSessions(user.id);
    console.log(`[API] POST session: created ${session.id} state=qr_pending worker=${workerUrl ?? 'main'}`);
    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error: any) {
    console.error('[API] POST session FAILED:', error);
    const message = error?.message || error?.details || 'Failed to create session';
    const hint = error?.hint || error?.code || undefined;
    return NextResponse.json(
      { error: `Failed to create session: ${message}`, hint },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      console.log(`[API] DELETE all sessions for user ${user.id.slice(0,8)}`);
      // Fetch all sessions first so we can clean up Evolution API instances
      const { data: sessions } = await supabase
        .from('bot_sessions')
        .select('id')
        .eq('user_id', user.id);

      // Clean up Evolution API instances (best-effort)
      if (sessions && sessions.length > 0) {
        const evoUrl = process.env.EVOLUTION_API_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;
        if (evoUrl && evoKey) {
          await Promise.allSettled(
            sessions.map(s =>
              fetch(`${evoUrl}/instance/delete/${s.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', apikey: evoKey },
              }).catch(() => {})
            )
          );
        }
      }

      const { error } = await supabase
        .from('bot_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        if (error.code === 'PGRST205') {
          return NextResponse.json({
            success: true,
            message: 'All sessions deleted successfully (no table found)',
          });
        }
        throw error;
      }

      await invalidateSessions(user.id);
      return NextResponse.json({
        success: true,
        message: 'All sessions deleted successfully',
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Clean up Evolution API instance before deleting from DB
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    if (evoUrl && evoKey) {
      try {
        console.log(`[API] DELETE session: cleaning up Evolution instance ${sessionId}`);
        await fetch(`${evoUrl}/instance/delete/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
        });
      } catch (err) {
        console.log(`[API] DELETE session: Evolution cleanup failed for ${sessionId} (non-critical):`, err);
      }
    }

    const { error } = await supabase
      .from('bot_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          message: 'Session deleted successfully (no table found)',
        });
      }
      throw error;
    }

    await invalidateSessions(user.id);
    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('[API] DELETE session FAILED:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id, state, worker_url, session_name, phone_number')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state === 'inactive') {
      return NextResponse.json({ error: 'Session is already inactive' }, { status: 400 });
    }

    const { error } = await supabase
      .from('bot_sessions')
      .update({
        state: 'inactive',
        locked_by: null,
        locked_at: null,
        heartbeat_at: null,
        auth_state: null,
        pairing_code: null,
        qr_code: null,
        qr_expires_at: null,
        qr_generated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Notify worker to stop the bot process
    const workerUrl = session.worker_url || process.env.SELF_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (workerUrl && INTERNAL_SECRET) {
      try {
        await fetch(`${workerUrl}/api/internal/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
          body: JSON.stringify({ action: 'disconnect', sessionId }),
        });
      } catch {
        // Non-critical - sync loop will handle cleanup
      }
    }

    // Clean up Evolution API instance
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    if (evoUrl && evoKey) {
      try {
        await fetch(`${evoUrl}/instance/delete/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
        });
      } catch {
        // Non-critical
      }
    }

    await invalidateSessions(user.id);
    console.log(`[API] PUT disconnect: session=${sessionId} name=${session.session_name} phone=${session.phone_number}`);

    return NextResponse.json({
      success: true,
      message: `Session ${session.session_name || sessionId} disconnected`,
    });
  } catch (error) {
    console.error('[API] PUT disconnect FAILED:', error);
    return NextResponse.json({ error: 'Failed to disconnect session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('bot_sessions')
      .select('id, state, worker_url, platform')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Reassign to the least-loaded worker instead of keeping the session
    // on its current (potentially overloaded) worker.
    const newWorkerUrl = await assignWorkerAsync();
    console.log(`[API] PATCH reconnect: session=${sessionId} platform=${existing.platform} previousState=${existing.state} oldWorker=${existing.worker_url ?? 'main'} newWorker=${newWorkerUrl ?? 'main'}`);

    let session;
    let error;

    if (existing.platform === 'telegram_bot' || existing.platform === 'telegram_userbot') {
      // Telegram sessions reconnect using stored credentials (bot token or MTProto session).
      // Do NOT reset auth_state or set qr_pending — just mark as connecting and reassign worker.
      const result = await supabase
        .from('bot_sessions')
        .update({
          state: 'connecting',
          locked_by: null,
          locked_at: null,
          heartbeat_at: null,
          worker_url: newWorkerUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();
      session = result.data;
      error = result.error;

      if (!error) {
        console.log(`[API] PATCH reconnect: telegram session=${sessionId} set to connecting, worker=${newWorkerUrl ?? 'main'}`);
      }
    } else {
      // WhatsApp sessions need fresh pairing: clear old auth, QR, pairing code,
      // and the DB-level pairing lock so the new worker doesn't see a stale
      // lock and block the session from starting.
      const result = await supabase
        .from('bot_sessions')
        .update({
          state: 'qr_pending',
          pairing_code: null,
          qr_code: null,
          qr_expires_at: null,
          qr_generated_at: null,
          auth_state: null,
          locked_by: null,
          locked_at: null,
          heartbeat_at: null,
          pairing_lock_acquired_at: null,
          worker_url: newWorkerUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();
      session = result.data;
      error = result.error;

      if (!error) {
        console.log(`[API] PATCH reconnect: whatsapp session=${sessionId} reset to qr_pending with fresh auth, worker=${newWorkerUrl ?? 'main'}`);
      }
    }

    if (error) {
      throw error;
    }

    // Notify the newly assigned worker to pick up the session
    const workerUrl = newWorkerUrl;
    if (workerUrl && INTERNAL_SECRET) {
      console.log(`[API] Notifying worker ${workerUrl} to sync immediately for session ${sessionId}`);
      try {
        await fetch(`${workerUrl}/api/internal/trigger-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
        });
        console.log(`[API] Worker ${workerUrl} notified to sync`);
      } catch (err) {
        console.error(`[API] Failed to notify worker ${workerUrl} for reconnect:`, err);
      }
    } else {
      console.log(`[API] No worker assigned for session ${sessionId} - sync loop will pick it up within 5s`);
    }

    await invalidateSessions(user.id);
    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session reset for reconnection',
    });
  } catch (error: any) {
    console.error(`[API] PATCH reconnect FAILED:`, error);
    return NextResponse.json(
      { error: 'Failed to reconnect session' },
      { status: 500 }
    );
  }
}
