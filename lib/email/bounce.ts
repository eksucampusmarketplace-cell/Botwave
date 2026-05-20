/**
 * Email Bounce Handler
 * 
 * Tracks bounced emails and prevents sending to addresses that
 * have hard-bounced. Integrates with Postal webhook events.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface BounceEvent {
  recipient: string;
  bounceType: 'hard' | 'soft';
  reason?: string;
  source?: string;
}

/**
 * Record a bounce event. After a hard bounce, the recipient is blocked.
 */
export async function recordBounce(event: BounceEvent): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('email_bounces').insert({
    recipient: event.recipient.toLowerCase(),
    bounce_type: event.bounceType,
    reason: event.reason,
    source: event.source || 'unknown',
  });
  console.log(`[EMAIL-BOUNCE] Recorded ${event.bounceType} bounce for ${event.recipient}`);
}

/**
 * Check if a recipient has hard-bounced and should be blocked.
 */
export async function isRecipientBounced(email: string): Promise<boolean> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from('email_bounces')
    .select('*', { count: 'exact', head: true })
    .eq('recipient', email.toLowerCase())
    .eq('bounce_type', 'hard');
  return (count || 0) > 0;
}

/**
 * Check if a recipient has unsubscribed.
 */
export async function isRecipientUnsubscribed(email: string): Promise<boolean> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from('email_unsubscribes')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.toLowerCase());
  return (count || 0) > 0;
}

/**
 * Record an unsubscribe request.
 */
export async function recordUnsubscribe(email: string, reason?: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('email_unsubscribes').upsert(
    { email: email.toLowerCase(), reason },
    { onConflict: 'email' },
  );
  console.log(`[EMAIL-UNSUB] Recorded unsubscribe for ${email}`);
}

/**
 * Check if an email should be sent (not bounced and not unsubscribed).
 */
export async function shouldSendEmail(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const bounced = await isRecipientBounced(email);
  if (bounced) return { allowed: false, reason: 'hard_bounced' };

  const unsubscribed = await isRecipientUnsubscribed(email);
  if (unsubscribed) return { allowed: false, reason: 'unsubscribed' };

  return { allowed: true };
}
