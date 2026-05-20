import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { invalidateSessions } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

const updateProxySchema = z.object({
  sessionId: z.string().uuid(),
  proxyType: z.enum(['shared', 'custom']),
  proxyHost: z.string().optional(),
  proxyPort: z.string().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
});

/**
 * PUT /api/bot/sessions/proxy
 * Update proxy settings for an existing session.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateProxySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, proxyType, proxyHost, proxyPort, proxyUsername, proxyPassword } = validation.data;

    // Verify ownership
    const { data: existing } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      proxy_type: proxyType,
      updated_at: new Date().toISOString(),
    };

    if (proxyType === 'custom' && proxyHost && proxyPort) {
      updateData.proxy_host = proxyHost;
      updateData.proxy_port = proxyPort;
      updateData.proxy_username = proxyUsername || null;
      updateData.proxy_password = proxyPassword || null;
    } else {
      updateData.proxy_host = null;
      updateData.proxy_port = null;
      updateData.proxy_username = null;
      updateData.proxy_password = null;
    }

    const { data: session, error } = await supabase
      .from('bot_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    await invalidateSessions(user.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: proxyType === 'custom'
        ? 'Custom proxy configured. It will be used on next reconnect.'
        : 'Switched to shared proxy pool.',
    });
  } catch (error) {
    console.error('[API] PUT sessions/proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to update proxy settings' },
      { status: 500 }
    );
  }
}
