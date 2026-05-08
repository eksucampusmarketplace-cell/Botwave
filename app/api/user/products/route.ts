import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits } from '@/lib/planGating';
import { getCachedProducts, cacheProducts, invalidateProducts, getCachedUserPlan, cacheUserPlan } from '@/lib/redisApiCache';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cached = await getCachedProducts(user.id);
    if (cached) return NextResponse.json({ success: true, data: cached });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const result = data || [];
    await cacheProducts(user.id, result);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[PRODUCTS] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let plan = (await getCachedUserPlan(user.id))?.plan;
    if (!plan) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();
      plan = sub?.plan || 'free';
      await cacheUserPlan(user.id, plan);
    }

    const limits = getPlanLimits(plan);
    if (!limits.hasEcommerce) {
      return NextResponse.json({
        error: 'E-commerce requires Boss plan. Upgrade to unlock.',
      }, { status: 403 });
    }

    const body = await request.json() as {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      image_url?: string;
    };

    if (!body.name || body.price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || '',
        price: body.price,
        stock: body.stock ?? -1,
        image_url: body.image_url || '',
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[PRODUCTS] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await invalidateProducts(user.id);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[PRODUCTS] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('products').delete().eq('id', id).eq('user_id', user.id);

    await invalidateProducts(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PRODUCTS] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
