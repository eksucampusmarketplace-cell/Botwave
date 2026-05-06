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
      .from('custom_commands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[CUSTOM-CMD] GET error:', err);
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

    if (limits.customCommandLimit === 0) {
      return NextResponse.json({
        error: 'Custom commands require Lite plan or above. Upgrade to unlock.',
      }, { status: 403 });
    }

    const { count } = await supabase
      .from('custom_commands')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!isWithinLimit(count || 0, limits.customCommandLimit)) {
      return NextResponse.json({
        error: `Command limit reached (${limits.customCommandLimit}). Upgrade your plan for more.`,
      }, { status: 403 });
    }

    const body = await request.json() as {
      command?: string;
      response?: string;
      match_type?: string;
      enabled?: boolean;
    };

    if (!body.command || !body.response) {
      return NextResponse.json({ error: 'Command trigger and response are required' }, { status: 400 });
    }

    const cmd = body.command.startsWith('!') ? body.command : `!${body.command}`;

    const { data, error } = await supabase
      .from('custom_commands')
      .insert({
        user_id: user.id,
        command: cmd,
        response: body.response,
        match_type: body.match_type || 'exact',
        enabled: body.enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[CUSTOM-CMD] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[CUSTOM-CMD] POST error:', err);
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
    await supabase.from('custom_commands').delete().eq('id', id).eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CUSTOM-CMD] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
