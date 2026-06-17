import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { invalidateSessions } from '@/lib/redisApiCache';
import { invalidateSessionCache } from '@/bot/infrastructure/redisSessionCache';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  sessionId: z.string().uuid(),
  commandThrottlingEnabled: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { sessionId, commandThrottlingEnabled } = validation.data;

    const { data: existing } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('bot_sessions')
      .update({
        command_throttling_enabled: commandThrottlingEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('id, command_throttling_enabled')
      .single();

    if (error) {
      if (error.code === 'PGRST204' || error.code === '42703') {
        return NextResponse.json(
          {
            error:
              'Session command throttling column is missing. Run the latest migrations and retry.',
          },
          { status: 503 },
        );
      }
      throw error;
    }

    await invalidateSessions(user.id);
    await invalidateSessionCache(sessionId);

    return NextResponse.json({
      success: true,
      data: updated,
      message: commandThrottlingEnabled
        ? 'Command throttling enabled for this session.'
        : 'Command throttling disabled (free/open mode) for this session.',
    });
  } catch (error) {
    console.error('[API] PUT sessions/command-throttling error:', error);
    return NextResponse.json(
      { error: 'Failed to update session command throttling setting' },
      { status: 500 },
    );
  }
}
