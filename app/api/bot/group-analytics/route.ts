import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits } from '@/lib/planGating';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr');
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })) } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const limits = getPlanLimits(sub?.plan || 'free');
    if (!limits.hasGroupAnalytics) {
      return NextResponse.json({
        error: 'Group analytics requires Standard plan or above.',
      }, { status: 403 });
    }

    const sessionId = request.nextUrl.searchParams.get('session_id');

    // Get message stats for the user's sessions
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_jid, chat_jid, created_at, direction')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          topSenders: [],
          hourlyActivity: Array(24).fill(0),
          dailyMessages: [],
          totalMessages: 0,
          totalGroups: 0,
        },
      });
    }

    // Filter by session if specified
    const filtered = sessionId
      ? messages.filter((m: Record<string, unknown>) => m.session_id === sessionId)
      : messages;

    // Top senders
    const senderCounts: Record<string, number> = {};
    const groupSet = new Set<string>();
    const hourCounts = Array(24).fill(0);
    const dayCounts: Record<string, number> = {};

    for (const msg of filtered) {
      const m = msg as Record<string, string>;
      const sender = m.sender_jid || 'unknown';
      senderCounts[sender] = (senderCounts[sender] || 0) + 1;

      if (m.chat_jid?.includes('@g.us')) {
        groupSet.add(m.chat_jid);
      }

      if (m.created_at) {
        const date = new Date(m.created_at);
        hourCounts[date.getHours()]++;
        const dayKey = date.toISOString().split('T')[0];
        dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
      }
    }

    const topSenders = Object.entries(senderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([jid, count]) => ({
        jid,
        name: jid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        count,
      }));

    const dailyMessages = Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      success: true,
      data: {
        topSenders,
        hourlyActivity: hourCounts,
        dailyMessages,
        totalMessages: filtered.length,
        totalGroups: groupSet.size,
      },
    });
  } catch (err) {
    console.error('[GROUP-ANALYTICS] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
