import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createScheduleSchema = z.object({
  sessionId: z.string().uuid(),
  targetJid: z.string().min(1),
  message: z.string().min(1).max(2000),
  sendAt: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status');

    let query = supabase
      .from('scheduled_messages')
      .select('*, bot_sessions!inner(user_id, session_name)')
      .eq('bot_sessions.user_id', user.id)
      .order('send_at', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    if (status === 'pending') {
      query = query.eq('sent', false);
    } else if (status === 'sent') {
      query = query.eq('sent', true);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createScheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, targetJid, message, sendAt } = validation.data;

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('scheduled_messages')
      .insert({
        session_id: sessionId,
        user_jid: user.id,
        target_jid: targetJid,
        message,
        send_at: sendAt,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create scheduled message error:', error);
    return NextResponse.json({ error: 'Failed to create scheduled message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scheduled_messages')
      .delete()
      .eq('id', id)
      .eq('user_jid', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete scheduled message error:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled message' }, { status: 500 });
  }
}
