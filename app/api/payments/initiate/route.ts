import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initializePayment, PLANS, getPublicKey } from '@/lib/squad';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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
      console.warn('[PAYMENT-INIT] Auth failed:', authError?.message || 'No user session');
      return NextResponse.json({ error: 'Unauthorized — please log in again' }, { status: 401 });
    }
    console.log(`[PAYMENT-INIT] User ${user.id} (${user.email}) requesting upgrade`);

    const body = await request.json() as { plan?: string };
    const plan = body.plan;

    if (!plan || !PLANS[plan] || plan === 'free') {
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
      // Return existing pending payment
      return NextResponse.json({
        success: true,
        transactionRef: existing.squad_transaction_ref,
        publicKey: getPublicKey(),
        amount: planConfig.price,
        email: user.email,
        plan,
      });
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
      console.error(`[PAYMENT-INIT] Squad API failed: ${result.error}`);
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('squad_transaction_ref', transactionRef);

      return NextResponse.json({ error: result.error || 'Payment init failed' }, { status: 500 });
    }
    console.log(`[PAYMENT-INIT] Squad payment initialized: ref=${transactionRef}`);

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
    console.error('[PAYMENT-INIT] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
