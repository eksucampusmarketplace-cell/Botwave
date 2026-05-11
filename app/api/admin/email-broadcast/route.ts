import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { sendReengagementEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

// In-memory job tracking (persists across requests in the same process)
const emailJobs: Map<string, EmailJob> = new Map();

// Track which users have been emailed recently to avoid duplicates
// Maps user_id → timestamp of last email sent
const recentlyEmailed: Map<string, number> = new Map();
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // Don't re-email within 24 hours

// Auto-send configuration
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
  // Clean up old entries periodically
  if (recentlyEmailed.size > 10000) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [uid, ts] of recentlyEmailed.entries()) {
      if (ts < cutoff) recentlyEmailed.delete(uid);
    }
  }
}

async function getInactiveUsers(inactiveHours: number) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

  // Get all users with their email and last activity
  const { data: users } = await supabase
    .from('users')
    .select('id, email, username, created_at');

  if (!users || users.length === 0) {
    return { users: [], totalUsers: 0, inactiveUsers: 0, usersWithSessions: 0, enrichedInactive: [] };
  }

  // Get active sessions to know who has linked devices + last activity
  const { data: sessions } = await supabase
    .from('bot_sessions')
    .select('user_id, state, updated_at')
    .in('state', ['active', 'qr_pending', 'disconnected']);

  const sessionsByUser = new Map<string, { hasActive: boolean; lastActivity: string }>();
  for (const s of sessions || []) {
    const existing = sessionsByUser.get(s.user_id);
    const isActive = s.state === 'active';
    if (!existing || isActive) {
      sessionsByUser.set(s.user_id, {
        hasActive: existing?.hasActive || isActive,
        lastActivity: s.updated_at || '',
      });
    }
  }

  // Build user list with activity status
  const enrichedUsers = users.map(u => {
    const session = sessionsByUser.get(u.id);
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      hasLinkedDevice: session?.hasActive || false,
      lastActivity: session?.lastActivity || u.created_at,
      isInactive: !session?.lastActivity || session.lastActivity < cutoff,
    };
  });

  const inactiveUsers = enrichedUsers.filter(u => u.isInactive && u.email);

  return {
    users: enrichedUsers,
    totalUsers: users.length,
    inactiveUsers: inactiveUsers.length,
    usersWithSessions: enrichedUsers.filter(u => u.hasLinkedDevice).length,
    enrichedInactive: inactiveUsers,
  };
}

async function runEmailCampaign(
  targetUsers: Array<{ id: string; email: string; username: string; hasLinkedDevice: boolean }>,
  type: 'reengagement' | 'custom',
  trigger: 'manual' | 'auto',
): Promise<EmailJob> {
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

  // Send emails in background with rate limiting and dedup
  (async () => {
    job.status = 'sending';
    emailJobs.set(jobId, { ...job });

    for (const user of targetUsers) {
      // Smart dedup: skip if already emailed within 24h
      if (wasRecentlyEmailed(user.id)) {
        job.skippedCount++;
        emailJobs.set(jobId, { ...job });
        continue;
      }

      try {
        await sendReengagementEmail(user.email, user.username || 'there', user.hasLinkedDevice);
        job.sentCount++;
        markEmailed(user.id);
      } catch (err) {
        console.error(`[EMAIL-BROADCAST] Failed for ${user.email}:`, err);
        job.failedCount++;
      }

      emailJobs.set(jobId, { ...job });

      // Rate limit: 2-5 second delay between emails
      const delayMs = (Math.random() * 3 + 2) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    job.status = job.failedCount === job.totalRecipients ? 'failed' : 'completed';
    job.completedAt = new Date().toISOString();
    emailJobs.set(jobId, { ...job });
    console.log(`[EMAIL-BROADCAST] Job ${jobId} (${trigger}) completed: ${job.sentCount} sent, ${job.failedCount} failed, ${job.skippedCount} skipped (dedup)`);
  })();

  return job;
}

// Auto-send: runs on interval, finds inactive users and sends re-engagement emails
async function autoSendTick(): Promise<void> {
  try {
    console.log('[EMAIL-BROADCAST] Auto-send tick running...');
    const { enrichedInactive } = await getInactiveUsers(autoSendInactiveHours);

    // Filter out recently emailed users
    const eligibleUsers = enrichedInactive.filter(u => !wasRecentlyEmailed(u.id));

    if (eligibleUsers.length === 0) {
      console.log('[EMAIL-BROADCAST] Auto-send: no eligible users (all recently emailed or active)');
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
    const { totalUsers, inactiveUsers, usersWithSessions, enrichedInactive } = await getInactiveUsers(inactiveHours);

    // Add dedup info to users
    const usersWithDedup = enrichedInactive.slice(0, 100).map(u => ({
      ...u,
      alreadyEmailed: wasRecentlyEmailed(u.id),
      lastEmailedAt: recentlyEmailed.get(u.id) ? new Date(recentlyEmailed.get(u.id)!).toISOString() : null,
    }));

    const jobs = Array.from(emailJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        inactiveUsers,
        usersWithSessions,
        users: usersWithDedup,
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
    const { action, type = 'reengagement', inactiveHours = 12, userIds, intervalHours } = body;

    // Handle auto-send configuration
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get target users
    let query = supabase.from('users').select('id, email, username');
    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds);
    }
    const { data: users } = await query;

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    // Filter to users with email
    const usersWithEmail = users.filter(u => u.email);
    if (usersWithEmail.length === 0) {
      return NextResponse.json({ error: 'No users with email addresses found' }, { status: 400 });
    }

    // Get session info for linked device status
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('user_id, state, updated_at')
      .in('user_id', usersWithEmail.map(u => u.id));

    const activeSessionUsers = new Set(
      (sessions || []).filter(s => s.state === 'active').map(s => s.user_id)
    );

    // If no specific userIds, filter to inactive users only
    let targetUsers = usersWithEmail;
    if (!userIds) {
      const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();
      const sessionActivity = new Map<string, string>();
      for (const s of sessions || []) {
        const existing = sessionActivity.get(s.user_id);
        if (!existing || s.updated_at > existing) {
          sessionActivity.set(s.user_id, s.updated_at);
        }
      }
      targetUsers = usersWithEmail.filter(u => {
        const lastActivity = sessionActivity.get(u.id);
        return !lastActivity || lastActivity < cutoff;
      });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No inactive users found in the specified time window' }, { status: 400 });
    }

    const targets = targetUsers.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hasLinkedDevice: activeSessionUsers.has(u.id),
    }));

    const job = await runEmailCampaign(targets, type, 'manual');

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        totalRecipients: job.totalRecipients,
        message: `Sending re-engagement emails to ${job.totalRecipients} inactive users (skipping recently emailed)`,
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
