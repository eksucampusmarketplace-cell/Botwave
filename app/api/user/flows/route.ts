import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits, isWithinLimit } from '@/lib/planGating';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr');
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })) } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[FLOWS] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const limits = getPlanLimits(sub?.plan || 'free');

    if (limits.flowLimit === 0) {
      return NextResponse.json({
        error: 'Chatbot flows require Standard plan or above. Upgrade to unlock.',
      }, { status: 403 });
    }

    const { count } = await supabase
      .from('chatbot_flows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!isWithinLimit(count || 0, limits.flowLimit)) {
      return NextResponse.json({
        error: `Flow limit reached (${limits.flowLimit}). Upgrade your plan for more.`,
      }, { status: 403 });
    }

    const body = await request.json() as {
      name?: string;
      trigger?: string;
      nodes?: Record<string, unknown>[];
      enabled?: boolean;
    };

    if (!body.name || !body.trigger) {
      return NextResponse.json({ error: 'Name and trigger are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chatbot_flows')
      .insert({
        user_id: user.id,
        name: body.name,
        trigger: body.trigger,
        nodes: body.nodes || [],
        enabled: body.enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[FLOWS] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[FLOWS] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      id?: string;
      name?: string;
      trigger?: string;
      nodes?: Record<string, unknown>[];
      enabled?: boolean;
    };

    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.trigger !== undefined) updates.trigger = body.trigger;
    if (body.nodes !== undefined) updates.nodes = body.nodes;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    const { data, error } = await supabase
      .from('chatbot_flows')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[FLOWS] PUT error:', err);
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
    await supabase.from('chatbot_flows').delete().eq('id', id).eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FLOWS] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
