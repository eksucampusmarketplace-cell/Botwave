import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWebhookSignature, PLANS } from '@/lib/squad';
import { invalidateSubscription, invalidatePaymentHistory, invalidateRewards } from '@/lib/redisApiCache';
import { invalidateRedisKey as invalidateBotRedisKey } from '@/bot/infrastructure/redisSessionCache';
import { sendPaymentConfirmationEmail, sendSubscriptionEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/payments/webhook
 * Receives payment notifications from Squad.
 * Validates signature, updates payment record, and activates subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-squad-encrypted-body') || '';

    if (!validateWebhookSignature(rawBody, signature)) {
      console.warn('[SQUAD-WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventData = body.Body as Record<string, unknown> | undefined;
    if (!eventData) {
      return NextResponse.json({ ok: true });
    }

    const transactionRef = eventData.transaction_ref as string | undefined;
    const transactionStatus = eventData.transaction_status as string | undefined;
    const gatewayRef = eventData.gateway_ref as string | undefined;
    const channel = eventData.payment_type as string | undefined;

    if (!transactionRef) {
      return NextResponse.json({ ok: true });
    }

    console.log(`[SQUAD-WEBHOOK] ref=${transactionRef} status=${transactionStatus} channel=${channel}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('id, user_id, status, plan, amount, squad_transaction_ref')
      .eq('squad_transaction_ref', transactionRef)
      .single();

    if (!payment) {
      console.warn(`[SQUAD-WEBHOOK] No payment found for ref: ${transactionRef}`);
      return NextResponse.json({ ok: true });
    }

    // Already processed
    if (payment.status === 'success') {
      return NextResponse.json({ ok: true });
    }

    if (transactionStatus === 'success') {
      // Update payment to success
      const { error: payUpdateErr } = await supabase
        .from('payments')
        .update({
          status: 'success',
          squad_gateway_ref: gatewayRef,
          payment_channel: channel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (payUpdateErr) {
        console.error(`[SQUAD-WEBHOOK] Failed to update payment ${payment.id}:`, payUpdateErr);
        return NextResponse.json({ error: 'Payment update failed' }, { status: 500 });
      }

      // Activate/upgrade subscription
      const plan = payment.plan as string;
      const planConfig = PLANS[plan];
      if (planConfig) {
        const now = new Date();
        const nextRenewal = new Date(now);
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);

        const { error: subErr } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: payment.user_id,
            plan,
            status: 'active',
            quota_limit: planConfig.quotaLimit,
            quota_used: 0,
            session_limit: planConfig.sessionLimit,
            ai_daily_limit: planConfig.aiDailyLimit,
            billing_start: now.toISOString(),
            next_renewal: nextRenewal.toISOString(),
            squad_transaction_ref: transactionRef,
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' });

        if (subErr) {
          console.error(`[SQUAD-WEBHOOK] Subscription activation failed for user=${payment.user_id}, rolling back payment status:`, subErr);
          await supabase
            .from('payments')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', payment.id);
          return NextResponse.json({ error: 'Subscription activation failed' }, { status: 500 });
        }

        console.log(`[SQUAD-WEBHOOK] Subscription activated: user=${payment.user_id} plan=${plan}`);
        // Two Redis namespaces, two invalidations: `api:sub:*` for the dashboard,
        // `bw:sub:*` for the bot. Without the bot-side delete the bot enforces
        // the old (free) plan quota for up to 5 min after a paid upgrade.
        await invalidateSubscription(payment.user_id);
        await invalidatePaymentHistory(payment.user_id);
        await invalidateBotRedisKey(`sub:${payment.user_id}`);

        // Send payment confirmation + subscription emails
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(payment.user_id);
          if (userData?.user?.email) {
            const uname = userData.user.user_metadata?.username || userData.user.email.split('@')[0];
            const amount = String(payment.amount || planConfig.price || '0');
            sendPaymentConfirmationEmail(userData.user.email, uname, plan, amount, 'NGN').catch((e) =>
              console.error('[SQUAD-WEBHOOK] Payment email failed:', e),
            );
            sendSubscriptionEmail(userData.user.email, uname, plan, 'activated').catch((e) =>
              console.error('[SQUAD-WEBHOOK] Subscription email failed:', e),
            );
          }
        } catch (emailErr) {
          console.error('[SQUAD-WEBHOOK] Email notification failed (non-blocking):', emailErr);
        }

        // Resolve any active dunning
        await supabase
          .from('subscriptions')
          .update({
            dunning_status: null,
            failed_payment_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payment.user_id);

        await supabase
          .from('dunning_attempts')
          .update({ status: 'recovered', resolved_at: new Date().toISOString() })
          .eq('user_id', payment.user_id)
          .in('status', ['notified', 'retry_scheduled']);

        // Credit reward for plan upgrade
        try {
          const { data: rewardBal } = await supabase
            .from('reward_balances')
            .select('balance, total_earned, user_id')
            .eq('user_id', payment.user_id)
            .maybeSingle();

          if (rewardBal) {
            await supabase
              .from('reward_balances')
              .update({
                balance: (rewardBal.balance || 0) + 30,
                total_earned: (rewardBal.total_earned || 0) + 30,
                updated_at: now.toISOString(),
              })
              .eq('user_id', payment.user_id);

            await supabase.from('reward_transactions').insert({
              user_id: payment.user_id,
              amount: 30,
              type: 'earn',
              reason: `Upgraded to ${plan} plan`,
              created_at: now.toISOString(),
            });
            await invalidateRewards(payment.user_id);
            console.log(`[SQUAD-WEBHOOK] Reward credited: user=${payment.user_id} +\u20a630`);
          }
        } catch (rewardErr) {
          console.error('[SQUAD-WEBHOOK] Reward credit failed:', rewardErr);
        }
      }
    } else if (transactionStatus === 'failed') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          squad_gateway_ref: gatewayRef,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Start/continue dunning sequence
      const { data: existingDunning } = await supabase
        .from('dunning_attempts')
        .select('attempt_number')
        .eq('user_id', payment.user_id)
        .eq('payment_id', payment.id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const attemptNumber = existingDunning ? existingDunning.attempt_number + 1 : 1;
      const retryDays = [0, 3, 7];
      const nextRetryDay = retryDays[attemptNumber] || null;
      const nextRetryAt = nextRetryDay
        ? new Date(Date.now() + nextRetryDay * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase.from('dunning_attempts').insert({
        user_id: payment.user_id,
        payment_id: payment.id,
        attempt_number: attemptNumber,
        status: nextRetryAt ? 'retry_scheduled' : 'notified',
        notification_type: attemptNumber >= 3 ? 'final_warning' : attemptNumber === 1 ? 'payment_failed' : 'retry_reminder',
        notified_via: 'whatsapp',
        next_retry_at: nextRetryAt,
      });

      await supabase
        .from('subscriptions')
        .update({
          dunning_status: 'active',
          failed_payment_count: attemptNumber,
          last_payment_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', payment.user_id);

      await invalidateSubscription(payment.user_id);
      await invalidatePaymentHistory(payment.user_id);
      await invalidateBotRedisKey(`sub:${payment.user_id}`);
      console.log(`[SQUAD-WEBHOOK] Payment failed + dunning started: ref=${transactionRef} user=${payment.user_id} attempt=${attemptNumber}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SQUAD-WEBHOOK] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
