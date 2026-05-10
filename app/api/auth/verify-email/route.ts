import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCode, getPendingSignup, clearPendingSignup } from '@/lib/email/verification-store';
import { getCachedReferralByCode, cacheReferralByCode, invalidateReferralData, invalidateRewards, invalidateReferralByCode } from '@/lib/redisApiCache';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 },
      );
    }

    // Verify the code
    const valid = await verifyCode(email, code);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 },
      );
    }

    // Get pending signup data
    const pending = await getPendingSignup(email);
    if (!pending) {
      return NextResponse.json(
        { error: 'Signup session expired. Please start over.' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    // Create user via Supabase Auth with email already confirmed
    const { data, error } = await supabase.auth.admin.createUser({
      email: pending.email,
      password: pending.password,
      user_metadata: {
        username: pending.username,
        signup_source: pending.signup_source || 'direct',
        signup_referrer: pending.signup_referrer || undefined,
        utm_source: pending.utm_source || undefined,
        utm_medium: pending.utm_medium || undefined,
        utm_campaign: pending.utm_campaign || undefined,
      },
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 },
        );
      }
      console.error('[AUTH] Verify-email create user error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // Apply referral code if provided
    if (pending.referralCode && data.user?.id) {
      try {
        const refCode = pending.referralCode.trim().toUpperCase();

        let referral = await getCachedReferralByCode(refCode) as { user_id: string; code: string; is_frozen: boolean } | null;
        if (!referral) {
          const { data: refData } = await supabase
            .from('referrals')
            .select('user_id, code, is_frozen')
            .eq('code', refCode)
            .single();
          referral = refData;
          if (referral) await cacheReferralByCode(refCode, referral);
        }

        if (referral && !referral.is_frozen && referral.user_id !== data.user.id) {
          const REFERRAL_REWARD = 20;
          const REFERRED_REWARD = 10;

          await supabase.from('referral_history').insert({
            referrer_id: referral.user_id,
            referred_user_id: data.user.id,
            referred_email: email,
            referral_code: refCode,
            reward_amount: REFERRAL_REWARD,
            status: 'credited',
            created_at: new Date().toISOString(),
          });

          await supabase.rpc('increment_referral_stats', {
            p_user_id: referral.user_id,
            p_earned: REFERRAL_REWARD,
          });

          const { error: rpcErr1 } = await supabase.rpc('increment_reward_balance', { p_user_id: referral.user_id, p_amount: REFERRAL_REWARD });
          if (rpcErr1) {
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

          const { error: rpcErr2 } = await supabase.rpc('increment_reward_balance', { p_user_id: data.user.id, p_amount: REFERRED_REWARD });
          if (rpcErr2) {
            await supabase.from('reward_balances').insert({
              user_id: data.user.id,
              balance: REFERRED_REWARD,
              total_earned: REFERRED_REWARD,
              total_cashed_out: 0,
            });
          }

          await invalidateReferralData(referral.user_id);
          await invalidateRewards(referral.user_id);
          await invalidateRewards(data.user.id);
          await invalidateReferralByCode(refCode);
          console.log(`[AUTH] Referral applied: code=${refCode} referrer=${referral.user_id} new_user=${data.user.id}`);
        }
      } catch (refErr) {
        console.warn('[AUTH] Referral application failed (non-blocking):', refErr);
      }
    }

    // Clean up pending signup data
    await clearPendingSignup(email);

    // Send welcome email (fire and forget)
    sendWelcomeEmail(email, pending.username).catch((err) =>
      console.error('[AUTH] Welcome email failed (non-blocking):', err),
    );

    console.log(`[AUTH] User verified and created: ${email} (${pending.username})`);

    return NextResponse.json(
      { message: 'Account created successfully', user: { id: data.user?.id, email: data.user?.email } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[AUTH] Verify-email exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
