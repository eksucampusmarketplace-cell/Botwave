import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

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

  // Subscription stats
  const { data: subStats } = await supabase
    .from('subscriptions')
    .select('plan');

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
  });
}
