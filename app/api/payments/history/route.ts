import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
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

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, plan, amount, status, squad_transaction_ref, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[PAYMENT-HISTORY] Query error:', error.message);
      return NextResponse.json({ success: true, payments: [] });
    }

    return NextResponse.json({ success: true, payments: payments || [] });
  } catch (err) {
    console.error('[PAYMENT-HISTORY] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
