import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionServer } from '@/bot/sessionRouter';

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

    const serverUrl = getSessionServer();

    const { data: session, error } = await supabase
      .from('bot_sessions')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        session_name: sessionName,
        state: 'qr_pending',
        server_url: serverUrl,
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