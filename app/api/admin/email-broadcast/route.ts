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
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
  type: 'reengagement' | 'custom';
  trigger: 'manual' | 'auto';
}

const emailJobs: Map<string, EmailJob> = new Map();

// In-memory dedup (supplements DB-based dedup for fast checking)
const recentlyEmailed: Map<string, number> = new Map();
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

// Auto-send state
let autoSendEnabled = false;
let autoSendIntervalHours = 12;
let autoSendInactiveHours = 12;
let autoSendTimer: ReturnType<typeof setInterval> | null = null;

function wasRecentlyEmailed(userId: string): boolean {
  const lastSent = recentlyEmailed.get(userId);
  if (!lastSent) return false;
  return Date.now() - lastSent < DEDUP_WINDOW_MS;
}

function markEmailed(userId: string): void {
  recentlyEmailed.set(userId, Date.now());
  if (recentlyEmailed.size > 10000) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [uid, ts] of recentlyEmailed.entries()) {
      if (ts < cutoff) recentlyEmailed.delete(uid);
    }
  }
}

/** Fetch all users with email from auth + profiles + session activity */
async function getEnrichedUsers(inactiveHours: number) {
  const supabase = getSupabase();

  // Get users from auth (has email) - paginate to get all
  const allAuthUsers: { id: string; email: string }[] = [];
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (!batch || batch.length === 0) break;
    for (const u of batch) {
      if (u.email && !u.email.endsWith('@botwave.local')) {
        allAuthUsers.push({ id: u.id, email: u.email });
      }
    }
    if (batch.length < 1000) break;
    page++;
  }

  if (allAuthUsers.length === 0) return { allUsers: [], inactiveUsers: [], usersWithSessions: 0, eligibleUsers: [] };

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

  // Check DB-based email log for recent sends
  const cooldownCutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data: recentSends } = await supabase
    .from('email_broadcast_log')
    .select('user_id')
    .eq('campaign_type', 'reengagement')
    .eq('status', 'sent')
    .gte('sent_at', cooldownCutoff);
  const recentlySentInDb = new Set((recentSends || []).map(s => s.user_id));

  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

  const allUsers = allAuthUsers.map(u => {
    const profile = profileMap.get(u.id);
    const session = sessionsByUser.get(u.id);
    const lastActivity = session?.lastActivity || profile?.last_login_at || '';
    const alreadyEmailed = recentlySentInDb.has(u.id) || wasRecentlyEmailed(u.id);
    return {
      id: u.id,
      email: u.email,
      username: profile?.username || u.email.split('@')[0],
      hasLinkedDevice: session?.hasActive || false,
      lastActivity,
      isInactive: !lastActivity || lastActivity < cutoff,
      alreadyEmailed,
    };
  });

  const inactiveUsers = allUsers.filter(u => u.isInactive);
  const eligibleUsers = inactiveUsers.filter(u => !u.alreadyEmailed);
  const usersWithSessions = allUsers.filter(u => u.hasLinkedDevice).length;

  return { allUsers, inactiveUsers, usersWithSessions, eligibleUsers };
}

async function runEmailCampaign(
  targetUsers: Array<{ id: string; email: string; username: string; hasLinkedDevice: boolean }>,
  type: 'reengagement' | 'custom',
  trigger: 'manual' | 'auto',
): Promise<EmailJob> {
  const supabase = getSupabase();
  const jobId = crypto.randomUUID();
  const job: EmailJob = {
    id: jobId,
    status: 'pending',
    totalRecipients: targetUsers.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    type,
    trigger,
  };
  emailJobs.set(jobId, job);

  // Send emails in background with rate limiting
  (async () => {
    job.status = 'sending';
    emailJobs.set(jobId, { ...job });

    for (const user of targetUsers) {
      // Double-check dedup at send time
      if (wasRecentlyEmailed(user.id)) {
        job.skippedCount++;
        emailJobs.set(jobId, { ...job });
        continue;
      }

      try {
        await sendReengagementEmail(user.email, user.username || 'there', user.hasLinkedDevice);
        job.sentCount++;
        markEmailed(user.id);

        // Log to DB
        try {
          await supabase.from('email_broadcast_log').insert({
            user_id: user.id,
            email: user.email,
            campaign_type: 'reengagement',
            status: 'sent',
            job_id: jobId,
          });
        } catch { /* non-critical */ }
      } catch (err) {
        console.error(`[EMAIL-BROADCAST] Failed for ${user.email}:`, err);
        job.failedCount++;

        try {
          await supabase.from('email_broadcast_log').insert({
            user_id: user.id,
            email: user.email,
            campaign_type: 'reengagement',
            status: 'failed',
            job_id: jobId,
          });
        } catch { /* non-critical */ }
      }

      emailJobs.set(jobId, { ...job });

      // Rate limit: 2-5 second delay between emails to protect IP reputation
      const delayMs = (Math.random() * 3 + 2) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    job.status = job.failedCount === job.totalRecipients ? 'failed' : 'completed';
    job.completedAt = new Date().toISOString();
    emailJobs.set(jobId, { ...job });
    console.log(`[EMAIL-BROADCAST] Job ${jobId} (${trigger}) completed: ${job.sentCount} sent, ${job.failedCount} failed, ${job.skippedCount} skipped`);
  })();

  return job;
}

// Auto-send tick
async function autoSendTick(): Promise<void> {
  try {
    console.log('[EMAIL-BROADCAST] Auto-send tick running...');
    const { eligibleUsers } = await getEnrichedUsers(autoSendInactiveHours);

    if (eligibleUsers.length === 0) {
      console.log('[EMAIL-BROADCAST] Auto-send: no eligible users');
      return;
    }

    const targets = eligibleUsers.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hasLinkedDevice: u.hasLinkedDevice,
    }));

    await runEmailCampaign(targets, 'reengagement', 'auto');
    console.log(`[EMAIL-BROADCAST] Auto-send triggered for ${targets.length} users`);
  } catch (err) {
    console.error('[EMAIL-BROADCAST] Auto-send error:', err);
  }
}

function startAutoSend(): void {
  stopAutoSend();
  autoSendEnabled = true;
  const intervalMs = autoSendIntervalHours * 60 * 60 * 1000;
  autoSendTimer = setInterval(autoSendTick, intervalMs);
  console.log(`[EMAIL-BROADCAST] Auto-send enabled: every ${autoSendIntervalHours}h for users inactive ${autoSendInactiveHours}h+`);
}

function stopAutoSend(): void {
  autoSendEnabled = false;
  if (autoSendTimer) {
    clearInterval(autoSendTimer);
    autoSendTimer = null;
  }
  console.log('[EMAIL-BROADCAST] Auto-send disabled');
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inactiveHours = parseInt(request.nextUrl.searchParams.get('hours') || '12');
    const { allUsers, inactiveUsers, usersWithSessions, eligibleUsers } = await getEnrichedUsers(inactiveHours);

    // Get in-memory jobs
    const memoryJobs = Array.from(emailJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Also get DB log for persistent history
    const supabase = getSupabase();
    const { data: dbLog } = await supabase
      .from('email_broadcast_log')
      .select('job_id, email, status, sent_at')
      .order('sent_at', { ascending: false })
      .limit(100);

    // Aggregate DB log into job summaries (for jobs not in memory)
    const dbJobMap = new Map<string, { sent: number; failed: number; earliest: string; latest: string }>();
    for (const entry of dbLog || []) {
      const jid = entry.job_id || 'unknown';
      const existing = dbJobMap.get(jid) || { sent: 0, failed: 0, earliest: entry.sent_at, latest: entry.sent_at };
      if (entry.status === 'sent') existing.sent++;
      else existing.failed++;
      if (entry.sent_at < existing.earliest) existing.earliest = entry.sent_at;
      if (entry.sent_at > existing.latest) existing.latest = entry.sent_at;
      dbJobMap.set(jid, existing);
    }

    // Build combined jobs list: memory jobs first, then DB jobs not already in memory
    const memoryJobIds = new Set(memoryJobs.map(j => j.id));
    const dbJobs: EmailJob[] = [];
    for (const [jid, summary] of dbJobMap.entries()) {
      if (!memoryJobIds.has(jid)) {
        dbJobs.push({
          id: jid,
          status: 'completed',
          totalRecipients: summary.sent + summary.failed,
          sentCount: summary.sent,
          failedCount: summary.failed,
          skippedCount: 0,
          createdAt: summary.earliest,
          completedAt: summary.latest,
          type: 'reengagement',
          trigger: 'manual',
        });
      }
    }

    const allJobs = [...memoryJobs, ...dbJobs].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: allUsers.length,
        inactiveUsers: inactiveUsers.length,
        usersWithSessions,
        eligibleUsers: eligibleUsers.length,
        users: inactiveUsers.slice(0, 100),
        recentJobs: allJobs.slice(0, 20),
        autoSend: {
          enabled: autoSendEnabled,
          intervalHours: autoSendIntervalHours,
          inactiveHours: autoSendInactiveHours,
        },
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
    const { action, type = 'reengagement', inactiveHours = 12, userIds, intervalHours } = body;

    // Auto-send controls
    if (action === 'enable_auto_send') {
      autoSendInactiveHours = inactiveHours || 12;
      autoSendIntervalHours = intervalHours || 12;
      startAutoSend();
      return NextResponse.json({
        success: true,
        data: { message: `Auto-send enabled: every ${autoSendIntervalHours}h for users inactive ${autoSendInactiveHours}h+` },
      });
    }

    if (action === 'disable_auto_send') {
      stopAutoSend();
      return NextResponse.json({
        success: true,
        data: { message: 'Auto-send disabled' },
      });
    }

    if (action === 'trigger_auto_send') {
      autoSendTick();
      return NextResponse.json({
        success: true,
        data: { message: 'Auto-send triggered manually' },
      });
    }

    // Manual broadcast
    const { eligibleUsers } = await getEnrichedUsers(inactiveHours);

    let targetUsers = eligibleUsers;
    if (userIds && userIds.length > 0) {
      targetUsers = eligibleUsers.filter(u => userIds.includes(u.id));
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No eligible inactive users (all recently emailed or active)' }, { status: 400 });
    }

    const targets = targetUsers.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hasLinkedDevice: u.hasLinkedDevice,
    }));

    const job = await runEmailCampaign(targets, type, 'manual');

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        totalRecipients: job.totalRecipients,
        message: `Sending re-engagement emails to ${job.totalRecipients} inactive users (2-5s delay between each)`,
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
