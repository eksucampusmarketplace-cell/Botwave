import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidateRedisKey as invalidateBotRedisKey } from '@/bot/infrastructure/redisSessionCache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('auto_replies')
      .select('id, user_id, session_id, trigger_keyword, trigger, response_text, response, match_type, category, schedule_enabled, schedule_start, schedule_end, active_days, enabled, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[AUTO-REPLIES] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      session_id,
      trigger_keyword,
      response_text,
      match_type = 'contains',
      category = 'general',
      schedule_enabled = false,
      schedule_start = '09:00',
      schedule_end = '17:00',
      active_days = [1, 2, 3, 4, 5],
    } = body;

    if (!session_id || !trigger_keyword || !response_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('auto_replies')
      .insert({
        user_id: user.id,
        session_id,
        trigger_keyword,
        trigger: trigger_keyword,
        response_text,
        response: response_text,
        match_type,
        category,
        schedule_enabled,
        schedule_start,
        schedule_end,
        active_days,
        enabled: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Without this, the bot serves the stale auto-reply list for up to
    // AUTO_REPLY_TTL (5 min) and new triggers don't fire until the cache
    // expires.
    await invalidateBotRedisKey(`autoreplies:${session_id}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[AUTO-REPLIES] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing reply ID' }, { status: 400 });
    }

    if (updates.trigger_keyword) {
      updates.trigger = updates.trigger_keyword;
    }
    if (updates.response_text) {
      updates.response = updates.response_text;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('auto_replies')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (data?.session_id) {
      await invalidateBotRedisKey(`autoreplies:${data.session_id}`);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[AUTO-REPLIES] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing reply ID' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read session_id before delete so we know which cache to invalidate;
    // after the delete the row is gone.
    const { data: existing } = await supabase
      .from('auto_replies')
      .select('session_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { error } = await supabase
      .from('auto_replies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    if (existing?.session_id) {
      await invalidateBotRedisKey(`autoreplies:${existing.session_id}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AUTO-REPLIES] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
