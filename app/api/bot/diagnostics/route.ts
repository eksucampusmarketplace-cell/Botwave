import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - log in first' }, { status: 401 });
    }

    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      checks: {},
    };

    // Check 1: Can we query bot_sessions?
    const { data: sessions, error: sessionsError } = await supabase
      .from('bot_sessions')
      .select('id, session_name, phone_number, state, pairing_code, qr_code, worker_url, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) {
      diagnostics.checks.sessions = { status: 'FAIL', error: sessionsError };
    } else {
      diagnostics.checks.sessions = {
        status: 'OK',
        count: sessions?.length || 0,
        data: sessions?.map(s => ({
          id: s.id,
          name: s.session_name,
          phone: s.phone_number,
          state: s.state,
          hasPairingCode: !!s.pairing_code,
          pairingCode: s.pairing_code || null,
          hasQrCode: !!s.qr_code,
          workerUrl: s.worker_url,
          created: s.created_at,
          updated: s.updated_at,
        })),
      };
    }

    // Check 2: Does the pairing_code column exist?
    const { error: colError } = await supabase
      .from('bot_sessions')
      .select('pairing_code')
      .limit(1);

    diagnostics.checks.pairingCodeColumn = colError
      ? { status: 'MISSING', error: colError.message }
      : { status: 'EXISTS' };

    // Check 3: Does the worker_url column exist?
    const { error: workerColError } = await supabase
      .from('bot_sessions')
      .select('worker_url')
      .limit(1);

    diagnostics.checks.workerUrlColumn = workerColError
      ? { status: 'MISSING', error: workerColError.message }
      : { status: 'EXISTS' };

    // Check 4: Environment vars on web side
    diagnostics.checks.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SELF_URL: process.env.SELF_URL || '(not set)',
      IS_WORKER: process.env.IS_WORKER || '(not set)',
      WORKER_URLS: process.env.WORKER_URLS || '(not set)',
    };

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostics failed',
      message: error?.message,
    }, { status: 500 });
  }
}
