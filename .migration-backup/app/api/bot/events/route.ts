import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const cleanup = () => {
      closed = true;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            cleanup();
          }
        };

        sendEvent('connected', { userId: user.id, timestamp: Date.now() });

        intervalId = setInterval(async () => {
          if (closed) return;
          try {
            const [sessRes, statsRes] = await Promise.all([
              supabase.from('bot_sessions').select('id, session_name, phone_number, state, last_active').eq('user_id', user.id),
              supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
            ]);

            sendEvent('update', {
              sessions: sessRes.data || [],
              stats: statsRes.data || { total_messages: 0, total_commands: 0 },
              timestamp: Date.now(),
            });
          } catch {
            sendEvent('heartbeat', { timestamp: Date.now() });
          }
        }, 5000);

        timeoutId = setTimeout(() => {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        }, 5 * 60 * 1000);

        controller.enqueue(encoder.encode(': keepalive\n\n'));
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return NextResponse.json({ error: 'Failed to establish SSE connection' }, { status: 500 });
  }
}
