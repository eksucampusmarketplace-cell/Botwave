import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function checkSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-internal-secret');
  return !!process.env.INTERNAL_SECRET && secret === process.env.INTERNAL_SECRET;
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, sessionId } = body;

    console.log(`[INTERNAL] Received action="${action}" for session ${sessionId}`);

    switch (action) {
      case 'start': {
        // Verify the session exists and is in a startable state.
        // The bot sync loop (every 5s) will pick it up once the DB
        // state is qr_pending. This endpoint ensures the state is correct.
        const { data: session, error } = await supabase
          .from('bot_sessions')
          .select('id, state, worker_url, phone_number')
          .eq('id', sessionId)
          .single();

        if (error || !session) {
          console.error(`[INTERNAL] Session ${sessionId} not found:`, error);
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        console.log(`[INTERNAL] Session ${sessionId} current state: ${session.state}, worker: ${session.worker_url ?? 'main'}`);

        // If session is already in a startable state, confirm it
        if (session.state === 'qr_pending' || session.state === 'pairing_sent') {
          console.log(`[INTERNAL] Session ${sessionId} already in ${session.state} — worker sync loop will pick it up`);
          return NextResponse.json({
            success: true,
            message: `Session ${sessionId} is in ${session.state} state — bot sync will pick it up within 5s`,
            session: { id: session.id, state: session.state, worker_url: session.worker_url },
          });
        }

        // If stuck in needs_reauth or inactive, reset to qr_pending with fresh auth
        if (session.state === 'needs_reauth' || session.state === 'inactive') {
          console.log(`[INTERNAL] Session ${sessionId} was ${session.state} — resetting to qr_pending with fresh auth`);
          const { error: updateErr } = await supabase
            .from('bot_sessions')
            .update({
              state: 'qr_pending',
              auth_state: null,
              pairing_code: null,
              qr_code: null,
              qr_expires_at: null,
              qr_generated_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

          if (updateErr) {
            console.error(`[INTERNAL] Failed to reset session ${sessionId}:`, updateErr);
            return NextResponse.json({ error: 'Failed to reset session' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: `Session ${sessionId} reset to qr_pending — worker will pick it up within 5s`,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} is in ${session.state} state`,
        });
      }

      case 'status': {
        const { data: session, error } = await supabase
          .from('bot_sessions')
          .select('id, state, worker_url, updated_at')
          .eq('id', sessionId)
          .single();

        if (error || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        console.log(`[INTERNAL] Status check for ${sessionId}: state=${session.state} worker=${session.worker_url ?? 'main'}`);
        return NextResponse.json({
          success: true,
          sessionId,
          state: session.state,
          workerUrl: session.worker_url,
          updatedAt: session.updated_at,
        });
      }

      case 'disconnect': {
        console.log(`[INTERNAL] Disconnect requested for session ${sessionId}`);
        const { error: updateErr } = await supabase
          .from('bot_sessions')
          .update({
            state: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (updateErr) {
          console.error(`[INTERNAL] Failed to disconnect session ${sessionId}:`, updateErr);
          return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} disconnected`,
        });
      }

      default:
        console.warn(`[INTERNAL] Unknown action: ${action}`);
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[INTERNAL] Session route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from('bot_sessions')
    .select('id, state, worker_url, updated_at, phone_number')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  console.log(`[INTERNAL] GET status for ${sessionId}: state=${session.state}`);
  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      state: session.state,
      workerUrl: session.worker_url,
      updatedAt: session.updated_at,
      hasPhone: !!session.phone_number,
    },
  });
}
