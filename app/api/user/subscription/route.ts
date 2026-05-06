import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '@/lib/squad';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/user/subscription
 * Returns the current user's subscription info and reward balance.
 */
export async function GET(request: NextRequest) {
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () =>
            request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        },
      },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (!user) {
      console.warn('[SUBSCRIPTION] Auth failed:', authError?.message || 'No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create subscription (default to free)
    let { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      const freePlan = PLANS.free;
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          quota_limit: freePlan.quotaLimit,
          quota_used: 0,
          session_limit: freePlan.sessionLimit,
          ai_daily_limit: freePlan.aiDailyLimit,
        })
        .select()
        .single();
      subscription = newSub;
    }

    // Check if subscription expired and downgrade
    if (subscription && subscription.plan !== 'free' && subscription.next_renewal) {
      const renewalDate = new Date(subscription.next_renewal as string);
      if (renewalDate < new Date() && subscription.status === 'active') {
        const freePlan = PLANS.free;
        await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'expired',
            quota_limit: freePlan.quotaLimit,
            quota_used: 0,
            session_limit: freePlan.sessionLimit,
            ai_daily_limit: freePlan.aiDailyLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        subscription = { ...subscription, plan: 'free', status: 'expired' };
      }
    }

    // Get reward balance
    let { data: rewards } = await supabase
      .from('reward_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!rewards) {
      const { data: newRewards, error: rewardError } = await supabase
        .from('reward_balances')
        .insert({ user_id: user.id, balance: 0, total_earned: 0, total_cashed_out: 0 })
        .select()
        .single();
      if (rewardError) {
        console.warn('[SUBSCRIPTION] Reward balance creation failed:', rewardError.message);
        rewards = { balance: 0, total_earned: 0, total_cashed_out: 0 };
      } else {
        rewards = newRewards;
      }
    }

    const planConfig = PLANS[subscription?.plan || 'free'] || PLANS.free;

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan_name: planConfig.name,
        plan_price: planConfig.price,
        plan_features: planConfig.features,
      },
      rewards,
      plans: PLANS,
    });
  } catch (err) {
    console.error('[SUBSCRIPTION] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
