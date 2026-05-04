import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignWorker, INTERNAL_SECRET } from '@/bot/workerConfig';

export const dynamic = 'force-dynamic';

const createSessionSchema = z.object({
  phoneNumber: z.string().min(10),
  sessionName: z.string().min(1).max(50),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('bot_sessions table not found, using empty array');
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: sessions || [],
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumber, sessionName } = validation.data;

    const workerUrl = assignWorker();

    const { data: session, error } = await supabase
      .from('bot_sessions')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        session_name: sessionName,
        state: 'qr_pending',
        worker_url: workerUrl,
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { 
            error: 'Session creation failed: bot_sessions table not found',
            message: 'Please run the initial schema migrations in your Supabase SQL Editor.',
            action: 'Visit /admin/dashboard and go to System Health to get the SQL.'
          },
          { status: 503 }
        );
      }
      throw error;
    }

    if (workerUrl && INTERNAL_SECRET) {
      try {
        await fetch(`${workerUrl}/api/internal/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
          body: JSON.stringify({
            action: 'start',
            sessionId: session.id,
          }),
        });
      } catch (err) {
        console.error(`Failed to notify worker ${workerUrl}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    const message = error?.message || error?.details || 'Failed to create session';
    const hint = error?.hint || error?.code || undefined;
    return NextResponse.json(
      { error: `Failed to create session: ${message}`, hint },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      // Fetch all sessions first so we can clean up Evolution API instances
      const { data: sessions } = await supabase
        .from('bot_sessions')
        .select('id')
        .eq('user_id', user.id);

      // Clean up Evolution API instances (best-effort)
      if (sessions && sessions.length > 0) {
        const evoUrl = process.env.EVOLUTION_API_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;
        if (evoUrl && evoKey) {
          await Promise.allSettled(
            sessions.map(s =>
              fetch(`${evoUrl}/instance/delete/${s.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', apikey: evoKey },
              }).catch(() => {})
            )
          );
        }
      }

      const { error } = await supabase
        .from('bot_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        if (error.code === 'PGRST205') {
          return NextResponse.json({
            success: true,
            message: 'All sessions deleted successfully (no table found)',
          });
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'All sessions deleted successfully',
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Clean up Evolution API instance before deleting from DB
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    if (evoUrl && evoKey) {
      try {
        await fetch(`${evoUrl}/instance/delete/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
        });
      } catch {
        // non-critical — instance may not exist on Evolution API
      }
    }

    const { error } = await supabase
      .from('bot_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          message: 'Session deleted successfully (no table found)',
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('bot_sessions')
      .select('id, state, worker_url')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Reset session for fresh pairing: clear old auth, QR, and pairing code
    const { data: session, error } = await supabase
      .from('bot_sessions')
      .update({
        state: 'qr_pending',
        pairing_code: null,
        qr_code: null,
        qr_expires_at: null,
        qr_generated_at: null,
        auth_state: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify the assigned worker to pick up the session
    const workerUrl = existing.worker_url;
    if (workerUrl && INTERNAL_SECRET) {
      try {
        await fetch(`${workerUrl}/api/internal/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
          body: JSON.stringify({
            action: 'start',
            sessionId,
          }),
        });
      } catch (err) {
        console.error(`Failed to notify worker ${workerUrl} for reconnect:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session reset for reconnection',
    });
  } catch (error: any) {
    console.error('Reconnect session error:', error);
    return NextResponse.json(
      { error: 'Failed to reconnect session' },
      { status: 500 }
    );
  }
}