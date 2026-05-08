import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedReferralData, cacheReferralData, invalidateReferralData, invalidateRewards, getCachedReferralByCode, cacheReferralByCode } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const REFERRAL_REWARD = 20;
const REFERRED_REWARD = 10;
const MAX_REFERRALS_PER_DAY = 5;
const MAX_REFERRALS_FROM_SAME_IP = 3;
const MIN_ACCOUNT_AGE_HOURS = 1;
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'tempail.com',
  'maildrop.cc', 'harakirimail.com', '10minutemail.com', 'temp-mail.org',
];

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

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BW-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

// GET: Get user's referral code + stats
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          is_frozen: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        console.warn('[REFERRAL] Failed to create referral record:', createErr.message);
        return NextResponse.json({
          success: true,
          data: { code: null, totalReferred: 0, totalEarned: 0, isFrozen: false, referrals: [], notSetup: true },
        });
      }
      referral = newRef;
    }

    const { data: history } = await supabase
      .from('referral_history')
      .select('id, referred_email, reward_amount, status, flagged_reason, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`[REFERRAL] User ${user.id} fetched data: code=${referral.code} referred=${referral.total_referred} frozen=${referral.is_frozen}`);

    const result = {
      code: referral.code,
      totalReferred: referral.total_referred || 0,
      totalEarned: referral.total_earned || 0,
      isFrozen: referral.is_frozen || false,
      frozenReason: referral.frozen_reason || null,
      referrals: history || [],
    };
    await cacheReferralData(user.id, result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[REFERRAL] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Apply a referral code
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { code?: string };
    const code = body.code?.trim().toUpperCase();
    const clientIp = getClientIp(request);

    if (!code) return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- FRAUD CHECK 1: Account already used a referral ---
    const { data: existing } = await supabase
      .from('referral_history')
      .select('id')
      .eq('referred_user_id', user.id)
      .single();

    if (existing) {
      console.warn(`[REFERRAL-FRAUD] Double use attempt: user=${user.id} code=${code}`);
      return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 });
    }

    // --- Find the referrer (try Redis cache first) ---
    let referral = await getCachedReferralByCode(code) as { user_id: string; code: string; is_frozen: boolean } | null;
    if (!referral) {
      const { data: refData } = await supabase
        .from('referrals')
        .select('user_id, code, is_frozen')
        .eq('code', code)
        .single();
      referral = refData;
      if (referral) await cacheReferralByCode(code, referral);
    }

    if (!referral) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // --- FRAUD CHECK 2: Self-referral ---
    if (referral.user_id === user.id) {
      console.warn(`[REFERRAL-FRAUD] Self-referral attempt: user=${user.id}`);
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    }

    // --- FRAUD CHECK 3: Referrer is frozen ---
    if (referral.is_frozen) {
      console.warn(`[REFERRAL-FRAUD] Frozen referrer code used: code=${code} referrer=${referral.user_id}`);
      return NextResponse.json({ error: 'This referral code is no longer active' }, { status: 400 });
    }

    // --- FRAUD CHECK 4: Account age (prevent fresh throwaway accounts) ---
    const accountCreated = new Date(user.created_at);
    const hoursSinceCreation = (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < MIN_ACCOUNT_AGE_HOURS) {
      console.warn(`[REFERRAL-FRAUD] Account too new: user=${user.id} age=${hoursSinceCreation.toFixed(1)}h`);
      return NextResponse.json({ error: 'Your account is too new to use a referral code. Please try again later.' }, { status: 400 });
    }

    // --- FRAUD CHECK 5: Disposable email ---
    if (user.email && isDisposableEmail(user.email)) {
      console.warn(`[REFERRAL-FRAUD] Disposable email: user=${user.id} email=${user.email}`);
      return NextResponse.json({ error: 'Referral codes cannot be used with disposable email addresses' }, { status: 400 });
    }

    // --- FRAUD CHECK 6: Same email domain as referrer ---
    const { data: referrerUser } = await supabase.auth.admin.getUserById(referral.user_id);
    if (referrerUser?.user?.email && user.email) {
      const referrerDomain = referrerUser.user.email.split('@')[1]?.toLowerCase();
      const userDomain = user.email.split('@')[1]?.toLowerCase();
      if (referrerDomain && userDomain && referrerDomain === userDomain &&
          !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(referrerDomain)) {
        console.warn(`[REFERRAL-FRAUD] Same custom domain: referrer=${referrerUser.user.email} referred=${user.email}`);
        return NextResponse.json({ error: 'Referral not allowed between accounts from the same organization' }, { status: 400 });
      }
    }

    // --- FRAUD CHECK 7: Too many referrals from same IP today ---
    if (clientIp !== 'unknown') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: ipCount } = await supabase
        .from('referral_history')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', clientIp)
        .gte('created_at', todayStart.toISOString());

      if (ipCount && ipCount >= MAX_REFERRALS_FROM_SAME_IP) {
        console.warn(`[REFERRAL-FRAUD] IP limit exceeded: ip=${clientIp} count=${ipCount}`);
        return NextResponse.json({ error: 'Too many referrals from this network today. Try again tomorrow.' }, { status: 429 });
      }
    }

    // --- FRAUD CHECK 8: Referrer daily limit ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: dailyCount } = await supabase
      .from('referral_history')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referral.user_id)
      .gte('created_at', todayStart.toISOString());

    if (dailyCount && dailyCount >= MAX_REFERRALS_PER_DAY) {
      console.warn(`[REFERRAL-FRAUD] Referrer daily limit: referrer=${referral.user_id} count=${dailyCount}`);
      return NextResponse.json({ error: 'This referral code has reached its daily limit. Try again tomorrow.' }, { status: 429 });
    }

    // --- FRAUD CHECK 9: Auto-freeze if referrer gets too many flagged referrals ---
    const { count: flaggedCount } = await supabase
      .from('referral_history')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referral.user_id)
      .eq('status', 'flagged');

    const shouldAutoFreeze = flaggedCount && flaggedCount >= 3;

    if (shouldAutoFreeze) {
      await supabase.from('referrals').update({
        is_frozen: true,
        frozen_reason: `Auto-frozen: ${flaggedCount} flagged referrals detected`,
      }).eq('user_id', referral.user_id);

      console.warn(`[REFERRAL-FRAUD] Auto-frozen referrer: user=${referral.user_id} flagged=${flaggedCount}`);
      return NextResponse.json({ error: 'This referral code is no longer active' }, { status: 400 });
    }

    // --- All checks passed. Process the referral ---
    const now = new Date().toISOString();

    // Record referral with IP
    await supabase.from('referral_history').insert({
      referrer_id: referral.user_id,
      referred_user_id: user.id,
      referred_email: user.email || '',
      reward_amount: REFERRAL_REWARD,
      ip_address: clientIp,
      status: 'credited',
      created_at: now,
    });

    // Update referrer stats (direct update, no RPC needed)
    const { data: refStats } = await supabase
      .from('referrals')
      .select('total_referred, total_earned')
      .eq('user_id', referral.user_id)
      .single();

    if (refStats) {
      await supabase.from('referrals').update({
        total_referred: (refStats.total_referred || 0) + 1,
        total_earned: (refStats.total_earned || 0) + REFERRAL_REWARD,
      }).eq('user_id', referral.user_id);
    }

    // Credit rewards via safe increment
    const { error: rpcErr1 } = await supabase.rpc('increment_reward_balance', {
      p_user_id: referral.user_id,
      p_amount: REFERRAL_REWARD,
    });

    if (rpcErr1) {
      // Fallback: manual increment
      const { data: bal1 } = await supabase.from('reward_balances').select('balance, total_earned').eq('user_id', referral.user_id).single();
      if (bal1) {
        await supabase.from('reward_balances').update({
          balance: (bal1.balance || 0) + REFERRAL_REWARD,
          total_earned: (bal1.total_earned || 0) + REFERRAL_REWARD,
        }).eq('user_id', referral.user_id);
      } else {
        await supabase.from('reward_balances').insert({
          user_id: referral.user_id,
          balance: REFERRAL_REWARD,
          total_earned: REFERRAL_REWARD,
          total_cashed_out: 0,
        });
      }
    }

    const { error: rpcErr2 } = await supabase.rpc('increment_reward_balance', {
      p_user_id: user.id,
      p_amount: REFERRED_REWARD,
    });

    if (rpcErr2) {
      const { data: bal2 } = await supabase.from('reward_balances').select('balance, total_earned').eq('user_id', user.id).single();
      if (bal2) {
        await supabase.from('reward_balances').update({
          balance: (bal2.balance || 0) + REFERRED_REWARD,
          total_earned: (bal2.total_earned || 0) + REFERRED_REWARD,
        }).eq('user_id', user.id);
      } else {
        await supabase.from('reward_balances').insert({
          user_id: user.id,
          balance: REFERRED_REWARD,
          total_earned: REFERRED_REWARD,
          total_cashed_out: 0,
        });
      }
    }

    // Log reward transactions
    await supabase.from('reward_transactions').insert([
      {
        user_id: referral.user_id,
        amount: REFERRAL_REWARD,
        action: 'referral',
        description: `Referred ${user.email || 'a new user'}`,
        created_at: now,
      },
      {
        user_id: user.id,
        amount: REFERRED_REWARD,
        action: 'referred_bonus',
        description: `Joined with referral code ${code}`,
        created_at: now,
      },
    ]);

    console.log(`[REFERRAL] Success: code=${code} referrer=${referral.user_id} referred=${user.id} ip=${clientIp} rewards=₦${REFERRAL_REWARD}+₦${REFERRED_REWARD}`);

    await invalidateReferralData(referral.user_id);
    await invalidateReferralData(user.id);
    await invalidateRewards(referral.user_id);
    await invalidateRewards(user.id);

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
