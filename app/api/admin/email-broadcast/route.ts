import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { sendReengagementEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface EmailJob {
  id: string;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  type: 'reengagement' | 'custom';
}

const emailJobs: Map<string, EmailJob> = new Map();

/** Fetch all users with email from auth + profiles + session activity */
async function getEnrichedUsers(supabase: ReturnType<typeof getSupabase>, inactiveHours: number) {
  // Get users from auth (has email) - paginate to get all
  const allAuthUsers: { id: string; email: string }[] = [];
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (!batch || batch.length === 0) break;
    for (const u of batch) {
      if (u.email) allAuthUsers.push({ id: u.id, email: u.email });
    }
    if (batch.length < 1000) break;
    page++;
  }

  if (allAuthUsers.length === 0) return { allUsers: [], inactiveUsers: [], usersWithSessions: 0 };

  const userIds = allAuthUsers.map(u => u.id);

  // Get profiles for usernames + last_login
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, last_login_at')
    .in('id', userIds);
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Get bot sessions for device linking + last activity
  const { data: sessions } = await supabase
    .from('bot_sessions')
    .select('user_id, state, updated_at');
  const sessionsByUser = new Map<string, { hasActive: boolean; lastActivity: string }>();
  for (const s of sessions || []) {
    const existing = sessionsByUser.get(s.user_id);
    const isActive = s.state === 'active';
    const updatedAt = s.updated_at || '';
    if (!existing || (isActive && !existing.hasActive) || updatedAt > (existing.lastActivity || '')) {
      sessionsByUser.set(s.user_id, {
        hasActive: existing?.hasActive || isActive,
        lastActivity: updatedAt > (existing?.lastActivity || '') ? updatedAt : (existing?.lastActivity || ''),
      });
    }
  }

  // Get recent email broadcast sends to track who was already emailed
  const cooldownCutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: recentSends } = await supabase
    .from('email_broadcast_log')
    .select('user_id')
    .eq('campaign_type', 'reengagement')
    .eq('status', 'sent')
    .gte('sent_at', cooldownCutoff);
  const recentlySent = new Set((recentSends || []).map(s => s.user_id));

  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

  const allUsers = allAuthUsers.map(u => {
    const profile = profileMap.get(u.id);
    const session = sessionsByUser.get(u.id);
    const lastActivity = session?.lastActivity || profile?.last_login_at || '';
    return {
      id: u.id,
      email: u.email,
      username: profile?.username || u.email.split('@')[0],
      hasLinkedDevice: session?.hasActive || false,
      lastActivity,
      isInactive: !lastActivity || lastActivity < cutoff,
      alreadyEmailed: recentlySent.has(u.id),
    };
  });

  const inactiveUsers = allUsers.filter(u => u.isInactive && !u.alreadyEmailed);
  const usersWithSessions = allUsers.filter(u => u.hasLinkedDevice).length;

  return { allUsers, inactiveUsers, usersWithSessions };
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const inactiveHours = parseInt(request.nextUrl.searchParams.get('hours') || '12');
    const { allUsers, inactiveUsers, usersWithSessions } = await getEnrichedUsers(supabase, inactiveHours);

    // Get auto-send config
    const { data: configRows } = await supabase
      .from('email_broadcast_config')
      .select('key, value');
    const config: Record<string, string> = {};
    for (const row of configRows || []) config[row.key] = row.value;

    const jobs = Array.from(emailJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: allUsers.length,
        inactiveUsers: inactiveUsers.length,
        usersWithSessions,
        users: inactiveUsers.slice(0, 100),
        recentJobs: jobs.slice(0, 10),
        autoSendEnabled: config.auto_send_enabled === 'true',
        cooldownHours: parseInt(config.cooldown_hours || '72'),
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const supabase = getSupabase();

    // Toggle auto-send
    if (action === 'toggle-auto-send') {
      const { enabled } = body;
      await supabase
        .from('email_broadcast_config')
        .upsert({ key: 'auto_send_enabled', value: String(!!enabled), updated_at: new Date().toISOString() });
      return NextResponse.json({ success: true, autoSendEnabled: !!enabled });
    }

    // Update config
    if (action === 'update-config') {
      const { cooldownHours, inactiveHours } = body;
      if (cooldownHours !== undefined) {
        await supabase
          .from('email_broadcast_config')
          .upsert({ key: 'cooldown_hours', value: String(cooldownHours), updated_at: new Date().toISOString() });
      }
      if (inactiveHours !== undefined) {
        await supabase
          .from('email_broadcast_config')
          .upsert({ key: 'inactive_hours_threshold', value: String(inactiveHours), updated_at: new Date().toISOString() });
      }
      return NextResponse.json({ success: true });
    }

    // Send re-engagement campaign
    const { inactiveHours = 12 } = body;
    const { inactiveUsers } = await getEnrichedUsers(supabase, inactiveHours);

    if (inactiveUsers.length === 0) {
      return NextResponse.json({ error: 'No eligible inactive users (all recently emailed or active)' }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    const job: EmailJob = {
      id: jobId,
      status: 'pending',
      totalRecipients: inactiveUsers.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      type: 'reengagement',
    };
    emailJobs.set(jobId, job);

    // Send emails in background
    (async () => {
      job.status = 'sending';
      emailJobs.set(jobId, { ...job });

      for (const user of inactiveUsers) {
        try {
          await sendReengagementEmail(user.email, user.username || 'there', user.hasLinkedDevice);
          job.sentCount++;

          // Log the send
          await supabase.from('email_broadcast_log').insert({
            user_id: user.id,
            email: user.email,
            campaign_type: 'reengagement',
            status: 'sent',
            job_id: jobId,
          });
        } catch (err) {
          console.error(`[EMAIL-BROADCAST] Failed for ${user.email}:`, err);
          job.failedCount++;

          await supabase.from('email_broadcast_log').insert({
            user_id: user.id,
            email: user.email,
            campaign_type: 'reengagement',
            status: 'failed',
            job_id: jobId,
          }).catch(() => {});
        }

        emailJobs.set(jobId, { ...job });

        // 2-5 second delay between emails
        const delay = (Math.random() * 3 + 2) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      job.status = job.failedCount === job.totalRecipients ? 'failed' : 'completed';
      job.completedAt = new Date().toISOString();
      emailJobs.set(jobId, { ...job });
      console.log(`[EMAIL-BROADCAST] Job ${jobId} completed: ${job.sentCount} sent, ${job.failedCount} failed`);
    })();

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        totalRecipients: inactiveUsers.length,
        message: `Sending re-engagement emails to ${inactiveUsers.length} inactive users`,
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
