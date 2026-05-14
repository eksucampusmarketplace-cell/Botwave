import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits, isWithinLimit } from '@/lib/planGating';
import { getCachedTemplates, cacheTemplates, invalidateTemplates, getCachedUserPlan, cacheUserPlan } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
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

    const cached = await getCachedTemplates(user.id);
    if (cached) return NextResponse.json({ success: true, data: cached });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const result = data || [];
    await cacheTemplates(user.id, result);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[TEMPLATES] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cachedPlan = await getCachedUserPlan(user.id);
    let plan: string = cachedPlan?.plan || '';
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

    const { count } = await supabase
      .from('message_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!isWithinLimit(count || 0, limits.templateLimit)) {
      return NextResponse.json({
        error: `Template limit reached (${limits.templateLimit}). Upgrade your plan for more.`,
      }, { status: 403 });
    }

    const body = await request.json() as { name?: string; content?: string; variables?: string[] };
    if (!body.name || !body.content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        user_id: user.id,
        name: body.name,
        content: body.content,
        variables: body.variables || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[TEMPLATES] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await invalidateTemplates(user.id);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[TEMPLATES] POST error:', err);
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
    await supabase.from('message_templates').delete().eq('id', id).eq('user_id', user.id);

    await invalidateTemplates(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[TEMPLATES] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
