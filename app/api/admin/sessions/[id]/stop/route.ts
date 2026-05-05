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

    // Fetch session info for audit log before stopping
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('phone_number, session_name, state')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('bot_sessions')
      .update({ state: 'inactive' })
      .eq('id', id);

    if (error) {
      console.error('Error stopping session:', error);
      return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 });
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
