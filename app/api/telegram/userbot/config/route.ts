/**
 * Telegram Userbot Config API
 * 
 * GET /api/telegram/userbot/config?sessionId=xxx
 * PUT /api/telegram/userbot/config  { sessionId, ...fields }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const admin = await createAdminClient();

    const { data: session } = await admin
      .from('bot_sessions')
      .select('id, platform')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { data: config } = await admin
      .from('userbot_config')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[UB-CONFIG] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId, ...updates } = body;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const admin = await createAdminClient();

    const { data: session } = await admin
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Remove any unknown fields that might not exist in the table
    delete (updates as Record<string, unknown>).updated_at;

    const { data, error } = await admin
      .from('userbot_config')
      .upsert(
        { session_id: sessionId, ...updates },
        { onConflict: 'session_id' },
      )
      .select()
      .single();

    if (error) {
      console.error('[UB-CONFIG] Upsert error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[UB-CONFIG] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
