import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/bot/webhook-retry
 * Processes pending webhook retries. Called periodically by the bot sync loop
 * or an external cron. Picks up to 10 pending retries, attempts to re-process
 * them, and updates their status accordingly.
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pending } = await supabase
      .from('webhook_retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(10);

    if (!pending || pending.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of pending) {
      await supabase.from('webhook_retry_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      try {
        if (item.event === 'messages.upsert' && item.payload) {
          const { data: session } = await supabase
            .from('bot_sessions')
            .select('id, user_id, phone_number, state')
            .eq('id', item.session_id)
            .single();

          if (session && session.state === 'active') {
            const { EvolutionSocketAdapter } = await import('@/bot/evolutionSocket');
            const { handleMessage } = await import('@/bot/handlers/MessageHandler');
            const { MessageQueue } = await import('@/bot/utils/MessageQueue');

            const sock = new EvolutionSocketAdapter(item.session_id, session.id, session.user_id, session.phone_number);
            const queue = new MessageQueue(sock as unknown as import('@whiskeysockets/baileys').WASocket, item.session_id);

            await handleMessage(item.payload, sock, queue);
          }
        }

        await supabase.from('webhook_retry_queue')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', item.id);
        succeeded++;
      } catch (err) {
        const newAttempts = (item.attempts || 0) + 1;
        const isDeadLetter = newAttempts >= (item.max_attempts || 5);
        const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);

        await supabase.from('webhook_retry_queue')
          .update({
            status: isDeadLetter ? 'dead_letter' : 'pending',
            attempts: newAttempts,
            error_message: String(err).slice(0, 500),
            next_retry_at: isDeadLetter ? null : new Date(Date.now() + backoffMs).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (isDeadLetter) {
          try {
            const { logHealthEvent } = await import('@/bot/database');
            await logHealthEvent(item.session_id, 'webhook_dead_letter', `Exhausted ${newAttempts} retries: ${String(err).slice(0, 200)}`);
          } catch { /* non-critical */ }
        }

        failed++;
      }

      processed++;
    }

    return NextResponse.json({ success: true, processed, succeeded, failed });
  } catch (error) {
    console.error('[WEBHOOK-RETRY] Error:', error);
    return NextResponse.json({ error: 'Failed to process retries' }, { status: 500 });
  }
}
