import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { getCachedReferralByCode, cacheReferralByCode, invalidateReferralData, invalidateRewards } from '@/lib/redisApiCache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, referralCode } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Validate username format (alphanumeric + underscores, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters (letters, numbers, underscores only)' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 },
      );
    }

    // Create user via Supabase Auth (admin client to bypass email confirmation if needed)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true,
    });

    if (error) {
      // Handle common Supabase auth errors with user-friendly messages
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 },
        );
      }
      if (error.message.includes('invalid') && error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 },
        );
      }
      console.error('[AUTH] Signup error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // Auto-apply referral code if provided
    if (referralCode && data.user?.id) {
      try {
        const code = (referralCode as string).trim().toUpperCase();

        // Try Redis cache first for referral code lookup
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

        if (referral && !referral.is_frozen && referral.user_id !== data.user.id) {
          const REFERRAL_REWARD = 20;
          const REFERRED_REWARD = 10;

          await supabase.from('referral_history').insert({
            referrer_id: referral.user_id,
            referred_user_id: data.user.id,
            referred_email: email,
            referral_code: code,
            reward_amount: REFERRAL_REWARD,
            status: 'credited',
            created_at: new Date().toISOString(),
          });

          await supabase.rpc('increment_referral_stats', {
            p_user_id: referral.user_id,
            p_earned: REFERRAL_REWARD,
          });

          // Credit referrer reward
          const { error: rpcErr1 } = await supabase.rpc('increment_reward_balance', { p_user_id: referral.user_id, p_amount: REFERRAL_REWARD });
          if (rpcErr1) {
            await supabase.from('reward_balances').upsert({
              user_id: referral.user_id,
              balance: REFERRAL_REWARD,
              total_earned: REFERRAL_REWARD,
            }, { onConflict: 'user_id' });
          }

          // Credit referred user reward
          const { error: rpcErr2 } = await supabase.rpc('increment_reward_balance', { p_user_id: data.user.id, p_amount: REFERRED_REWARD });
          if (rpcErr2) {
            await supabase.from('reward_balances').upsert({
              user_id: data.user.id,
              balance: REFERRED_REWARD,
              total_earned: REFERRED_REWARD,
            }, { onConflict: 'user_id' });
          }

          await invalidateReferralData(referral.user_id);
          await invalidateRewards(referral.user_id);
          console.log(`[AUTH] Referral applied: code=${code} referrer=${referral.user_id} new_user=${data.user.id}`);
        }
      } catch (refErr) {
        console.warn('[AUTH] Referral application failed (non-blocking):', refErr);
      }
    }

    return NextResponse.json(
      { message: 'Account created successfully', user: { id: data.user?.id, email: data.user?.email } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[AUTH] Signup exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
