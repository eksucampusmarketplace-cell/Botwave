import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr');
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return request.cookies.get(name)?.value; }, set() {}, remove() {} } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BW-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET: Get user's referral code + stats
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create referral record
    let { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!referral) {
      const code = generateCode();
      const { data: newRef, error: createErr } = await supabase
        .from('referrals')
        .insert({
          user_id: user.id,
          code,
          total_referred: 0,
          total_earned: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        console.warn('[REFERRAL] Failed to create referral record:', createErr.message);
        return NextResponse.json({
          success: true,
          data: { code: null, totalReferred: 0, totalEarned: 0, referrals: [], notSetup: true },
        });
      }
      referral = newRef;
    }

    // Get referral history
    const { data: history } = await supabase
      .from('referral_history')
      .select('id, referred_email, reward_amount, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`[REFERRAL] User ${user.id} fetched referral data: code=${referral.code} referred=${referral.total_referred}`);

    return NextResponse.json({
      success: true,
      data: {
        code: referral.code,
        totalReferred: referral.total_referred || 0,
        totalEarned: referral.total_earned || 0,
        referrals: history || [],
      },
    });
  } catch (err) {
    console.error('[REFERRAL] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Apply a referral code (called during signup or from dashboard)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { code?: string };
    const code = body.code?.trim().toUpperCase();

    if (!code) return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already used a referral code
    const { data: existing } = await supabase
      .from('referral_history')
      .select('id')
      .eq('referred_user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 });
    }

    // Find the referrer
    const { data: referral } = await supabase
      .from('referrals')
      .select('user_id, code')
      .eq('code', code)
      .single();

    if (!referral) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    if (referral.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    }

    const REFERRAL_REWARD = 20; // NGN reward for referrer
    const REFERRED_REWARD = 10; // NGN reward for new user

    // Record referral
    await supabase.from('referral_history').insert({
      referrer_id: referral.user_id,
      referred_user_id: user.id,
      referred_email: user.email || '',
      reward_amount: REFERRAL_REWARD,
      created_at: new Date().toISOString(),
    });

    // Update referrer stats
    await supabase.rpc('increment_referral_stats', {
      p_user_id: referral.user_id,
      p_earned: REFERRAL_REWARD,
    }).then(() => {}).catch(async () => {
      // Fallback if RPC doesn't exist
      const { data: ref } = await supabase
        .from('referrals')
        .select('total_referred, total_earned')
        .eq('user_id', referral.user_id)
        .single();
      if (ref) {
        await supabase.from('referrals').update({
          total_referred: (ref.total_referred || 0) + 1,
          total_earned: (ref.total_earned || 0) + REFERRAL_REWARD,
        }).eq('user_id', referral.user_id);
      }
    });

    // Credit reward to referrer
    await supabase.from('reward_balances').upsert({
      user_id: referral.user_id,
      balance: REFERRAL_REWARD,
      total_earned: REFERRAL_REWARD,
    }, { onConflict: 'user_id' }).then(() => {}).catch(async () => {
      // Try incrementing existing balance
      const { data: bal } = await supabase
        .from('reward_balances')
        .select('balance, total_earned')
        .eq('user_id', referral.user_id)
        .single();
      if (bal) {
        await supabase.from('reward_balances').update({
          balance: (bal.balance || 0) + REFERRAL_REWARD,
          total_earned: (bal.total_earned || 0) + REFERRAL_REWARD,
        }).eq('user_id', referral.user_id);
      }
    });

    // Credit reward to referred user
    await supabase.from('reward_balances').upsert({
      user_id: user.id,
      balance: REFERRED_REWARD,
      total_earned: REFERRED_REWARD,
    }, { onConflict: 'user_id' }).then(() => {}).catch(async () => {
      const { data: bal } = await supabase
        .from('reward_balances')
        .select('balance, total_earned')
        .eq('user_id', user.id)
        .single();
      if (bal) {
        await supabase.from('reward_balances').update({
          balance: (bal.balance || 0) + REFERRED_REWARD,
          total_earned: (bal.total_earned || 0) + REFERRED_REWARD,
        }).eq('user_id', user.id);
      }
    });

    // Log reward transactions
    await supabase.from('reward_transactions').insert([
      {
        user_id: referral.user_id,
        amount: REFERRAL_REWARD,
        type: 'earn',
        action: 'referral',
        reason: `Referred ${user.email || 'a new user'}`,
        created_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        amount: REFERRED_REWARD,
        type: 'earn',
        action: 'referred_bonus',
        reason: `Joined with referral code ${code}`,
        created_at: new Date().toISOString(),
      },
    ]);

    console.log(`[REFERRAL] Code ${code} used: referrer=${referral.user_id} referred=${user.id} rewards=₦${REFERRAL_REWARD}+₦${REFERRED_REWARD}`);

    return NextResponse.json({
      success: true,
      message: `Referral applied! You earned ₦${REFERRED_REWARD} and the referrer earned ₦${REFERRAL_REWARD}.`,
      yourReward: REFERRED_REWARD,
    });
  } catch (err) {
    console.error('[REFERRAL] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
