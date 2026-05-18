import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initializePayment, PLANS, getPublicKey } from '@/lib/squad';
import { invalidatePaymentHistory } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/payments/initiate
 * Creates a payment record and returns Squad checkout info.
 * Body: { plan: string }
 * Requires auth cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (!user) {
      console.warn('[PAYMENT-INIT] Auth failed:', authError?.message || 'No user session', 'cookies:', request.cookies.getAll().map(c => c.name).join(','));
      return NextResponse.json({ error: 'Unauthorized - please log in again' }, { status: 401 });
    }
    console.log(`[PAYMENT-INIT] User ${user.id.slice(0, 8)} (${user.email}) requesting upgrade`);

    const body = await request.json() as { plan?: string };
    const plan = body.plan;
    console.log(`[PAYMENT-INIT] Requested plan: ${plan}`);

    if (!plan || !PLANS[plan] || plan === 'free') {
      console.warn(`[PAYMENT-INIT] Invalid plan requested: ${plan}`);
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    const transactionRef = `bw-${plan}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for pending payment for same plan
    const { data: existing } = await supabase
      .from('payments')
      .select('id, squad_transaction_ref')
      .eq('user_id', user.id)
      .eq('plan', plan)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      console.log(`[PAYMENT-INIT] Found existing pending payment: ref=${existing.squad_transaction_ref} - re-initializing`);
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?payment=success`;
      const reResult = await initializePayment({
        email: user.email || '',
        amount: planConfig.price,
        transactionRef: existing.squad_transaction_ref,
        customerName: user.user_metadata?.username,
        callbackUrl,
        metadata: { user_id: user.id, plan },
      });
      console.log(`[PAYMENT-INIT] Re-init result: success=${reResult.success} checkoutUrl=${reResult.checkoutUrl || 'NONE'} error=${reResult.error || 'none'}`);

      if (reResult.success) {
        return NextResponse.json({
          success: true,
          transactionRef: existing.squad_transaction_ref,
          checkoutUrl: reResult.checkoutUrl || null,
          publicKey: getPublicKey(),
          amount: planConfig.price,
          email: user.email,
          plan,
        });
      }

      // Re-init failed (e.g. "Duplicate reference") - mark old payment as failed
      // and fall through to create a fresh one
      console.log(`[PAYMENT-INIT] Re-init failed, marking old ref as failed and creating new payment`);
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }

    // Create payment record
    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: planConfig.price,
      plan,
      status: 'pending',
      squad_transaction_ref: transactionRef,
    });
    if (insertError) {
      console.error('[PAYMENT-INIT] DB insert failed:', insertError.message);
    }
    console.log(`[PAYMENT-INIT] Payment created: ref=${transactionRef} plan=${plan} amount=₦${planConfig.price}`);

    // Initialize Squad payment
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?payment=success`;
    const result = await initializePayment({
      email: user.email || '',
      amount: planConfig.price,
      transactionRef,
      customerName: user.user_metadata?.username,
      callbackUrl,
      metadata: { user_id: user.id, plan },
    });

    if (!result.success) {
      console.error(`[PAYMENT-INIT] Squad API FAILED for ref=${transactionRef}: ${result.error}`);
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('squad_transaction_ref', transactionRef);

      return NextResponse.json({ success: false, error: result.error || 'Payment init failed' }, { status: 500 });
    }
    console.log(`[PAYMENT-INIT] Squad payment initialized OK: ref=${transactionRef} checkoutUrl=${result.checkoutUrl || 'NONE'}`);
    await invalidatePaymentHistory(user.id);

    return NextResponse.json({
      success: true,
      transactionRef,
      checkoutUrl: result.checkoutUrl,
      publicKey: getPublicKey(),
      amount: planConfig.price,
      email: user.email,
      plan,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[PAYMENT-INIT] UNHANDLED EXCEPTION: ${errMsg}`, err);
    return NextResponse.json({ success: false, error: `Server error: ${errMsg}` }, { status: 500 });
  }
}
