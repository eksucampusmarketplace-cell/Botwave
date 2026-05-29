import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { PLANS } from '@/lib/flutterwave';

export const dynamic = 'force-dynamic';

const PAYMENTS_SETTING_KEY = 'payments_enabled';

async function getPaymentsEnabled(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', PAYMENTS_SETTING_KEY)
      .maybeSingle();

    if (error) return process.env.PAYMENTS_ENABLED === 'true';

    const enabled = (data?.value as { enabled?: unknown } | null)?.enabled;
    if (typeof enabled === 'boolean') return enabled;
    return process.env.PAYMENTS_ENABLED === 'true';
  } catch {
    return process.env.PAYMENTS_ENABLED === 'true';
  }
}

/**
 * GET /api/admin/monetization
 * Returns monetization stats for admin dashboard.
 */
export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token');
  const tokenValidation = await verifyAdminToken(adminToken?.value);

  if (!tokenValidation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const paymentsEnabled = await getPaymentsEnabled(supabase);

  // Subscription stats
  const { data: subStats } = await supabase
    .from('subscriptions')
    .select('user_id, plan');

  const planCounts: Record<string, number> = { free: 0, lite: 0, standard: 0, boss: 0 };
  for (const s of subStats || []) {
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
  }

  // Payment stats
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, created_at, plan')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(50);

  const totalRevenue = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  // Reward stats
  const { data: rewardStats } = await supabase
    .from('reward_balances')
    .select('balance, total_earned, total_cashed_out');

  const totalEarned = (rewardStats || []).reduce((sum, r) => sum + r.total_earned, 0);
  const totalCashedOut = (rewardStats || []).reduce((sum, r) => sum + r.total_cashed_out, 0);
  const totalPendingBalance = (rewardStats || []).reduce((sum, r) => sum + r.balance, 0);

  // Recent cashouts
  const { data: cashouts } = await supabase
    .from('airtime_cashouts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    success: true,
    subscriptions: planCounts,
    revenue: {
      total: totalRevenue,
      recentPayments: payments || [],
    },
    rewards: {
      totalEarned,
      totalCashedOut,
      totalPendingBalance,
      usersWithBalance: rewardStats?.length || 0,
    },
    cashouts: cashouts || [],
    users: (subStats || []).map((s) => ({
      id: s.user_id,
      username: '',
      plan: s.plan || 'free',
      sessions_limit: PLANS[s.plan || 'free']?.sessionLimit ?? 1,
      commands_limit: PLANS[s.plan || 'free']?.quotaLimit ?? 300,
      created_at: new Date().toISOString(),
      last_login_at: null,
      totalSessions: 0,
    })),
    paymentsEnabled,
  });
}

export async function PUT(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token');
  const tokenValidation = await verifyAdminToken(adminToken?.value);

  if (!tokenValidation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const body = await request.json() as { paymentsEnabled?: boolean; userId?: string; plan?: string };

  // Toggle global payments gate
  if (typeof body.paymentsEnabled === 'boolean') {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: PAYMENTS_SETTING_KEY,
        value: { enabled: body.paymentsEnabled },
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: 'Failed to update payment setting' }, { status: 500 });
    }

    return NextResponse.json({ success: true, paymentsEnabled: body.paymentsEnabled });
  }

  // Existing plan override from admin dashboard
  if (!body.userId || !body.plan || !PLANS[body.plan]) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const planConfig = PLANS[body.plan];
  const now = new Date().toISOString();
  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: body.userId,
      plan: body.plan,
      status: 'active',
      quota_limit: planConfig.quotaLimit,
      quota_used: 0,
      session_limit: planConfig.sessionLimit,
      ai_daily_limit: planConfig.aiDailyLimit,
      billing_start: now,
      next_renewal: nextRenewal.toISOString(),
      updated_at: now,
    }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: 'Failed to update user plan' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
