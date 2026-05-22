import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    let totalUsers = 0;
    let pairedUsers = 0;
    let activeSessions = 0;
    let totalSessions = 0;
    let totalMessages = 0;
    let totalCommands = 0;
    let needsReauthSessions = 0;
    let ghostSessions = 0;
    let pairRate = 0;
    let activeRate = 0;

    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      totalUsers = userCount || 0;

      const { data: allSessions } = await supabase
        .from('bot_sessions')
        .select('state, last_active, user_id');
      totalSessions = allSessions?.length || 0;
      activeSessions = allSessions?.filter(s => s.state === 'active').length || 0;
      needsReauthSessions = allSessions?.filter(s => s.state === 'needs_reauth').length || 0;
      // Ghost sessions: rows that were created but never connected (no last_active)
      // and are stuck in a non-recoverable terminal-ish state. The auto-recovery
      // loop deliberately skips these, so they sit in the dashboard forever.
      ghostSessions = (allSessions || []).filter(
        s => (s.state === 'needs_reauth' || s.state === 'pairing_failed') && !s.last_active,
      ).length;

      // Funnel metrics — signup → pair, and pair → active. Far more useful
      // for spotting onboarding drop-off than the raw counts.
      const distinctPairedUserIds = new Set(
        (allSessions || [])
          .map((s: { user_id: string | null }) => s.user_id)
          .filter((v): v is string => !!v),
      );
      pairedUsers = distinctPairedUserIds.size;
      pairRate = totalUsers > 0 ? Math.round((pairedUsers / totalUsers) * 1000) / 10 : 0;
      activeRate = totalSessions > 0 ? Math.round((activeSessions / totalSessions) * 1000) / 10 : 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);
      totalMessages = msgCount || 0;

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('total_commands');
      totalCommands = (statsData || []).reduce((sum, s) => sum + (s.total_commands || 0), 0);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }

    // Check Evolution API health
    let evolutionStatus = 'Unknown';
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    if (evoUrl && evoKey) {
      try {
        const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
          signal: AbortSignal.timeout(5000),
        });
        evolutionStatus = evoRes.ok ? 'Connected' : `Error (${evoRes.status})`;
      } catch {
        evolutionStatus = 'Unreachable';
      }
    } else {
      evolutionStatus = 'Not Configured';
    }

    const systemStatus = activeSessions > 0 ? 'Healthy' :
      needsReauthSessions > 0 ? 'Degraded' :
      totalUsers > 0 ? 'Idle' : 'No Data';

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        pairedUsers,
        activeSessions,
        totalSessions,
        needsReauthSessions,
        ghostSessions,
        pairRate,
        activeRate,
        totalMessages,
        totalCommands,
        systemStatus,
        evolutionStatus,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
