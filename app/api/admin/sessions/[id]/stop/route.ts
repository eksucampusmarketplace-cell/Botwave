import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { logAdminAction, getClientIp } from '@/lib/admin-security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch session info for audit log and worker notification
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('phone_number, session_name, state, worker_url')
      .eq('id', id)
      .single();

    // Full cleanup: set inactive AND clear locks, auth state, pairing data.
    // Without clearing locks, the bot process on the worker keeps running
    // and can revert the state back to active/pairing_sent.
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
      .eq('id', id);

    if (error) {
      console.error('Error stopping session:', error);
      return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 });
    }

    // Notify the worker (or self) to stop the bot process in memory.
    // The sync loop will also detect the inactive state, but this is faster.
    const workerUrl = session?.worker_url || process.env.SELF_URL || process.env.NEXT_PUBLIC_APP_URL;
    const internalSecret = process.env.INTERNAL_SECRET;
    if (workerUrl && internalSecret) {
      try {
        await fetch(`${workerUrl}/api/internal/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalSecret,
          },
          body: JSON.stringify({ action: 'disconnect', sessionId: id }),
        });
      } catch {
        // Non-critical — sync loop will handle cleanup
      }
    }

    // Also clean up Evolution API instance
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    if (evoUrl && evoKey) {
      try {
        await fetch(`${evoUrl}/instance/delete/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
        });
      } catch {
        // Non-critical
      }
    }

    const clientIp = getClientIp(request.headers);
    logAdminAction(
      tokenValidation.username,
      'session_stop',
      id,
      `Terminated session ${session?.session_name || 'unknown'} (${session?.phone_number || 'unknown'}) from state=${session?.state || 'unknown'}`,
      clientIp,
    );

    return NextResponse.json({
      success: true,
      message: `Session ${id} terminated`
    });
  } catch (error) {
    console.error('Admin stop session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
