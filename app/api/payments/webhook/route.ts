import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWebhookSignature, PLANS } from '@/lib/squad';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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
      .select('*')
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
      await supabase
        .from('payments')
        .update({
          status: 'success',
          squad_gateway_ref: gatewayRef,
          payment_channel: channel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Activate/upgrade subscription
      const plan = payment.plan as string;
      const planConfig = PLANS[plan];
      if (planConfig) {
        const now = new Date();
        const nextRenewal = new Date(now);
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);

        await supabase
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

        console.log(`[SQUAD-WEBHOOK] Subscription activated: user=${payment.user_id} plan=${plan}`);

        // Credit reward for plan upgrade
        try {
          const { data: rewardBal } = await supabase
            .from('reward_balances')
            .select('*')
            .eq('user_id', payment.user_id)
            .single();

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
      console.log(`[SQUAD-WEBHOOK] Payment failed: ref=${transactionRef} user=${payment.user_id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SQUAD-WEBHOOK] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
