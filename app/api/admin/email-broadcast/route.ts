import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { sendReengagementEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

// Auto-send state (in-memory; restored from DB on first request)
let autoSendEnabled = false;
let autoSendIntervalHours = 12;
let autoSendInactiveHours = 12;
let autoSendTimer: ReturnType<typeof setInterval> | null = null;
let autoSendRestored = false;

async function persistAutoSendConfig(): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('system_config').upsert({
      key: 'email_auto_send',
      value: { enabled: autoSendEnabled, intervalHours: autoSendIntervalHours, inactiveHours: autoSendInactiveHours },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[EMAIL-BROADCAST] Failed to persist auto-send config:', err);
  }
}

async function restoreAutoSendConfig(): Promise<void> {
  if (autoSendRestored) return;
  autoSendRestored = true;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'email_auto_send')
      .single();
    if (data?.value) {
      const config = data.value as { enabled?: boolean; intervalHours?: number; inactiveHours?: number };
      autoSendIntervalHours = config.intervalHours ?? 12;
      autoSendInactiveHours = config.inactiveHours ?? 12;
      if (config.enabled && !autoSendEnabled) {
        console.log('[EMAIL-BROADCAST] Restoring auto-send from DB config');
        startAutoSend(true);
      }
    }
  } catch {
    // Table may not exist yet - non-fatal
  }
}

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
  // Only count 'active' sessions for lastActivity - 'needs_reauth' sessions
  // are updated by the system (not the user) and would falsely mark users as active.
  const { data: sessions } = await supabase
    .from('bot_sessions')
    .select('user_id, state, updated_at');
  const sessionsByUser = new Map<string, { hasActive: boolean; lastActivity: string }>();
  for (const s of sessions || []) {
    const existing = sessionsByUser.get(s.user_id);
    const isActive = s.state === 'active';
    const updatedAt = s.updated_at || '';
    // Only use updated_at from active sessions for activity tracking
    const activityTs = isActive ? updatedAt : '';
    if (!existing || (isActive && !existing.hasActive) || activityTs > (existing.lastActivity || '')) {
      sessionsByUser.set(s.user_id, {
        hasActive: existing?.hasActive || isActive,
        lastActivity: activityTs > (existing?.lastActivity || '') ? activityTs : (existing?.lastActivity || ''),
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
  delaySec: number = 3,
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

      // Rate limit: configurable delay + jitter between emails to protect IP reputation
      const jitter = Math.random() * 2;
      const delayMs = (delaySec + jitter) * 1000;
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

async function startAutoSend(skipImmediateTick = false): Promise<void> {
  stopAutoSend();
  autoSendEnabled = true;
  const intervalMs = autoSendIntervalHours * 60 * 60 * 1000;

  if (skipImmediateTick) {
    // On restore after deploy: check last run time from DB to avoid re-sending
    try {
      const supabase = getSupabase();
      const { data: lastRun } = await supabase
        .from('email_broadcast_log')
        .select('created_at')
        .eq('campaign_type', 'reengagement')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastRun?.created_at) {
        const lastRunTime = new Date(lastRun.created_at).getTime();
        const elapsed = Date.now() - lastRunTime;
        if (elapsed < intervalMs) {
          const remainingMs = intervalMs - elapsed;
          console.log(`[EMAIL-BROADCAST] Last auto-send was ${Math.round(elapsed / 60000)}m ago, next in ${Math.round(remainingMs / 60000)}m`);
          setTimeout(() => {
            autoSendTick();
            autoSendTimer = setInterval(autoSendTick, intervalMs);
          }, remainingMs);
          persistAutoSendConfig();
          return;
        }
      }
    } catch {
      // DB check failed - fall through to normal schedule
    }
  }

  // Run first tick immediately (for manual enable or if enough time has passed)
  if (!skipImmediateTick) {
    autoSendTick();
  }
  autoSendTimer = setInterval(autoSendTick, intervalMs);
  console.log(`[EMAIL-BROADCAST] Auto-send enabled: every ${autoSendIntervalHours}h for users inactive ${autoSendInactiveHours}h+`);
  persistAutoSendConfig();
}

function stopAutoSend(): void {
  autoSendEnabled = false;
  if (autoSendTimer) {
    clearInterval(autoSendTimer);
    autoSendTimer = null;
  }
  console.log('[EMAIL-BROADCAST] Auto-send disabled');
  persistAutoSendConfig();
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restore auto-send state from DB after deploy/restart
    await restoreAutoSendConfig();

    const inactiveHours = parseInt(request.nextUrl.searchParams.get('hours') || '12');
    const { allUsers, inactiveUsers, usersWithSessions, eligibleUsers } = await getEnrichedUsers(inactiveHours);

    const jobs = Array.from(emailJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: allUsers.length,
        inactiveUsers: inactiveUsers.length,
        usersWithSessions,
        eligibleUsers: eligibleUsers.length,
        users: eligibleUsers.slice(0, 100),
        recentJobs: jobs.slice(0, 20),
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
    const { action, type = 'reengagement', inactiveHours = 12, userIds, intervalHours, scope = 'inactive', delaySec = 3 } = body;

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
    const { allUsers, eligibleUsers } = await getEnrichedUsers(inactiveHours);

    // scope='all' sends to all users (skipping only recently-emailed), scope='inactive' (default) sends only to inactive
    let targetUsers = scope === 'all'
      ? allUsers.filter(u => !u.alreadyEmailed)
      : eligibleUsers;
    if (userIds && userIds.length > 0) {
      targetUsers = targetUsers.filter(u => userIds.includes(u.id));
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: scope === 'all' ? 'No eligible users (all recently emailed within 24h)' : 'No eligible inactive users (all recently emailed or active)' }, { status: 400 });
    }

    const targets = targetUsers.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hasLinkedDevice: u.hasLinkedDevice,
    }));

    const clampedDelay = Math.max(1, Math.min(delaySec, 30));
    const job = await runEmailCampaign(targets, type, 'manual', clampedDelay);

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        totalRecipients: job.totalRecipients,
        message: `Sending re-engagement emails to ${job.totalRecipients} users (${clampedDelay}-${clampedDelay + 2}s delay between each)`,
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
