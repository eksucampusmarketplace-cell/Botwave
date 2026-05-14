import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface BroadcastJob {
  id: string;
  message: string;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

const broadcastJobs: Map<string, BroadcastJob> = new Map();

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, session_name, phone_number, state, user_id')
      .eq('state', 'active');

    const jobs = Array.from(broadcastJobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        activeSessions: sessions?.length || 0,
        sessions: sessions || [],
        recentBroadcasts: jobs.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('[BROADCAST] Error:', error);
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

    const { message, sessionId, delayMin = 3, delayMax = 8 } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing message or session' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id, session_name, phone_number')
      .eq('id', sessionId)
      .eq('state', 'active')
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found or not active' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('sender_jid')
      .eq('session_id', sessionId)
      .eq('is_group', false)
      .not('sender_jid', 'is', null);

    const uniqueJids = [...new Set((messages || []).map(m => m.sender_jid))];

    if (uniqueJids.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this session' }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    const job: BroadcastJob = {
      id: jobId,
      message,
      status: 'pending',
      totalRecipients: uniqueJids.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    broadcastJobs.set(jobId, job);

    const botApiUrl = process.env.BOT_API_URL || 'http://localhost:3001';

    (async () => {
      job.status = 'sending';
      broadcastJobs.set(jobId, { ...job });

      for (const jid of uniqueJids) {
        try {
          const res = await fetch(`${botApiUrl}/api/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              jid,
              message,
              type: 'broadcast',
            }),
          });

          if (res.ok) {
            job.sentCount++;
          } else {
            job.failedCount++;
          }
        } catch {
          job.failedCount++;
        }

        broadcastJobs.set(jobId, { ...job });

        const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      job.status = job.failedCount === job.totalRecipients ? 'failed' : 'completed';
      job.completedAt = new Date().toISOString();
      broadcastJobs.set(jobId, { ...job });
    })();

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        totalRecipients: uniqueJids.length,
        message: `Broadcasting to ${uniqueJids.length} recipients with ${delayMin}-${delayMax}s delay`,
      },
    });
  } catch (error) {
    console.error('[BROADCAST] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
