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
  createdAt: string;
  completedAt: string | null;
  type: 'reengagement' | 'custom';
}

const emailJobs: Map<string, EmailJob> = new Map();

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const inactiveHours = parseInt(request.nextUrl.searchParams.get('hours') || '12');
    const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

    // Get all users with their email and last activity
    const { data: users } = await supabase
      .from('users')
      .select('id, email, username, created_at');

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        data: { totalUsers: 0, inactiveUsers: 0, usersWithSessions: 0, users: [], recentJobs: [] },
      });
    }

    // Get active sessions to know who has linked devices
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

    const jobs = Array.from(emailJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: users.length,
        inactiveUsers: inactiveUsers.length,
        usersWithSessions: enrichedUsers.filter(u => u.hasLinkedDevice).length,
        users: inactiveUsers.slice(0, 100),
        recentJobs: jobs.slice(0, 10),
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

    const { type = 'reengagement', inactiveHours = 12, userIds } = await request.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

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

    const jobId = crypto.randomUUID();
    const job: EmailJob = {
      id: jobId,
      status: 'pending',
      totalRecipients: targetUsers.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      type,
    };
    emailJobs.set(jobId, job);

    // Send emails in background
    (async () => {
      job.status = 'sending';
      emailJobs.set(jobId, { ...job });

      for (const user of targetUsers) {
        try {
          const hasLinkedDevice = activeSessionUsers.has(user.id);
          await sendReengagementEmail(user.email, user.username || 'there', hasLinkedDevice);
          job.sentCount++;
        } catch (err) {
          console.error(`[EMAIL-BROADCAST] Failed for ${user.email}:`, err);
          job.failedCount++;
        }

        emailJobs.set(jobId, { ...job });

        // 2-5 second delay between emails to avoid overwhelming Postal
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
        totalRecipients: targetUsers.length,
        message: `Sending re-engagement emails to ${targetUsers.length} inactive users`,
      },
    });
  } catch (error) {
    console.error('[EMAIL-BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
